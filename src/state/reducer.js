import { CONFIG } from '../config.js';
import { taskXP, levelFromXP, rankForLevel, gameRarity } from '../lib/xp.js';
import { uuid, todayKey, daysBetween, monthKey } from '../lib/util.js';
import { rollDrop, diffForXP } from '../lib/loot.js';

// Миграция данных, созданных до появления инвентаря / расширения слотов
function ensureShape(data) {
  if (!data.inventory) data.inventory = { items: [] };
  if (!data.statsMeta) data.statsMeta = {};
  if (!data.steam) data.steam = { overlay: {}, stat: '' };
  if (!data.steam.overlay) data.steam.overlay = {};
  if (data.steam.stat === undefined) data.steam.stat = '';
  for (const d of data.dailies || []) {
    if (d.at === undefined) d.at = null; // дейлики без привязки ко времени
  }
  for (const item of data.inventory.items) {
    if (item.type === 'accessory') item.type = 'ring'; // старый тип → слот кольца
    if (!item.kind) item.kind = 'equipment';
  }
  return data;
}

// В какой атрибут капает опыт за пройденную игру Steam:
// явно выбранный → «хобби/игры» по подписи → первый доступный.
function steamStatKey(data) {
  const keys = Object.keys(data.stats || {});
  if (data.steam?.stat && data.stats[data.steam.stat]) return data.steam.stat;
  const hobby = keys.find((k) => /хобб|hobby|игр|game/i.test(data.statsMeta?.[k]?.label || ''));
  return hobby || keys[0] || null;
}

// Кладёт дескриптор дропа в инвентарь и создаёт событие.
// reason — за что награда: null (обычный дроп) | 'levelup' | 'daily' | 'boss' | 'step'
function pushDrop(data, drop, events, reason = null, source = '') {
  if (!drop) return;
  if (!data.inventory) data.inventory = { items: [] };
  const base = {
    id: uuid(),
    kind: drop.kind,
    rarity: drop.rarity,
    bonus: drop.bonus,
    equipped: false,
    obtainedAt: new Date().toISOString(),
    sourceTask: source,
  };
  if (drop.kind === 'consumable') {
    data.inventory.items.unshift({ ...base, ctype: drop.ctype, type: null, state: 'identified', name: drop.name, desc: drop.desc });
  } else {
    data.inventory.items.unshift({ ...base, type: drop.type, state: 'unidentified', name: null, desc: null });
  }
  events.push({
    kind: 'drop',
    rarity: drop.rarity,
    reason,
    itemName: drop.kind === 'consumable' ? drop.name : null,
  });
}

// ---------- начисление XP: общий уровень + уровень стата (§4.1, §5.2) ----------

function awardXP(data, statKey, amount, events) {
  const stat = data.stats[statKey];
  if (stat) {
    const before = stat.level;
    stat.xp = Math.max(0, stat.xp + amount);
    stat.level = levelFromXP(stat.xp).level;
    if (amount > 0 && stat.level > before) {
      events.push({ kind: 'stat-levelup', stat: statKey, level: stat.level });
    }
  }
  const p = data.profile;
  const beforeLevel = p.level;
  const beforeRank = p.rank;
  p.totalXP = Math.max(0, p.totalXP + amount);
  p.level = levelFromXP(p.totalXP).level;
  p.rank = rankForLevel(p.level);
  if (amount > 0) {
    events.push({ kind: 'xp', amount, stat: statKey });
    if (p.level > beforeLevel) {
      events.push({ kind: 'levelup', level: p.level });
      // награда за новый уровень: гарантированный дроп с «эпической» таблицей
      pushDrop(
        data,
        rollDrop('epic', p.level, statKey, Object.keys(data.stats), true),
        events,
        'levelup',
        `Уровень ${p.level}`
      );
    }
    if (p.rank !== beforeRank) events.push({ kind: 'rankup', rank: p.rank });
  }
}

// ---------- серия с защитой заморозками (§6.3) ----------

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

// Обслуживание при загрузке/смене дня: месячный рефилл заморозок и
// покрытие пропущенных дней заморозками (или мягкий разрыв серии).
function maintainStreak(data, events) {
  const s = data.streak;
  const mk = monthKey();
  if (s.lastFreezeRefill !== mk) {
    s.freezes = CONFIG.FREEZES_PER_MONTH;
    s.lastFreezeRefill = mk;
  }
  if (!s.lastCompletedDate || s.current === 0) return;
  const missed = daysBetween(s.lastCompletedDate, todayKey()) - 1;
  if (missed <= 0) return;
  if (missed <= s.freezes) {
    s.freezes -= missed;
    s.lastCompletedDate = yesterdayKey();
    events.push({ kind: 'freeze', used: missed, left: s.freezes });
  } else {
    events.push({ kind: 'streak-broken', was: s.current });
    s.current = 0;
    s.lastCompletedDate = null;
  }
}

function allDailiesDone(data, day) {
  return data.dailies.length > 0 && data.dailies.every((d) => d.history[day]);
}

// Вызывается после каждого изменения дейликов за сегодня
function updateStreakAfterDailies(data, events) {
  const today = todayKey();
  const s = data.streak;
  if (allDailiesDone(data, today)) {
    if (s.lastCompletedDate !== today) {
      s.current = s.lastCompletedDate === yesterdayKey() ? s.current + 1 : 1;
      s.lastCompletedDate = today;
      if (s.current > s.best) s.best = s.current;
      events.push({ kind: 'streak', current: s.current });
      // награда за полностью закрытый день — гарантированный дроп (раз в день)
      pushDrop(
        data,
        rollDrop('normal', data.profile.level, null, Object.keys(data.stats), true),
        events,
        'daily',
        'Все дейлики дня'
      );
    }
  } else if (s.lastCompletedDate === today) {
    // День «раззавершили» — откатываем сегодняшний инкремент
    s.current = Math.max(0, s.current - 1);
    s.lastCompletedDate = s.current > 0 ? yesterdayKey() : null;
  }
}

// ---------- reducer ----------

export const initialUI = { events: [], dirty: 0 };

function clone(data) {
  return structuredClone(data);
}

export function reducer(state, action) {
  const events = [];
  let data = state.data;
  let dirty = true;

  switch (action.type) {
    case 'INIT_DATA': {
      data = ensureShape(clone(action.data));
      maintainStreak(data, events);
      dirty = action.markDirty ?? false;
      break;
    }

    case 'REMOTE_DATA': {
      data = ensureShape(clone(action.data));
      maintainStreak(data, events);
      dirty = false;
      break;
    }

    case 'ADD_TASK': {
      data = clone(data);
      const { title, stat, difficulty, time, deadline, source } = action;
      data.tasks.unshift({
        id: uuid(),
        title,
        stat,
        difficulty,
        time, // минуты
        deadline: deadline || null, // YYYY-MM-DD
        xp: taskXP(difficulty, time),
        status: 'todo',
        createdAt: new Date().toISOString(),
        completedAt: null,
        source: source || 'manual',
      });
      events.push({ kind: 'new-quest', count: 1 });
      break;
    }

    case 'ADD_TASKS_BULK': {
      data = clone(data);
      for (const t of action.tasks) {
        data.tasks.unshift({
          id: uuid(),
          title: t.title,
          stat: t.stat,
          difficulty: t.difficulty,
          time: t.time,
          deadline: t.deadline || null,
          xp: taskXP(t.difficulty, t.time),
          status: 'todo',
          createdAt: new Date().toISOString(),
          completedAt: null,
          source: action.source,
        });
      }
      events.push({ kind: 'new-quest', count: action.tasks.length });
      break;
    }

    case 'COMPLETE_TASK': {
      data = ensureShape(clone(data));
      const task = data.tasks.find((t) => t.id === action.id);
      if (!task || task.status === 'done') return state;
      task.status = 'done';
      task.completedAt = new Date().toISOString();
      awardXP(data, task.stat, task.xp, events);
      // Дроп предмета: шанс по сложности, редкость — по сложности и уровню.
      // Экипировка падает «неопознанной», расходники — готовыми.
      pushDrop(
        data,
        rollDrop(task.difficulty, data.profile.level, task.stat, Object.keys(data.stats)),
        events,
        null,
        task.title
      );
      break;
    }

    case 'USE_ITEM': {
      data = ensureShape(clone(data));
      const item = data.inventory.items.find((i) => i.id === action.id);
      if (!item || item.kind !== 'consumable') return state;
      if (item.ctype === 'freeze') {
        if (data.streak.freezes >= CONFIG.DROP.freezeCap) {
          events.push({ kind: 'system', message: `Запас заморозок уже полон (${CONFIG.DROP.freezeCap}). Кристалл сохранён.` });
          break;
        }
        data.streak.freezes = Math.min(CONFIG.DROP.freezeCap, data.streak.freezes + item.bonus.value);
        events.push({ kind: 'freeze-gain', left: data.streak.freezes });
      } else {
        awardXP(data, item.bonus.stat, item.bonus.value, events);
      }
      data.inventory.items = data.inventory.items.filter((i) => i.id !== action.id);
      break;
    }

    case 'IDENTIFY_ITEM': {
      data = ensureShape(clone(data));
      const item = data.inventory.items.find((i) => i.id === action.id);
      if (!item || item.state === 'identified') return state;
      item.state = 'identified';
      item.name = action.name;
      item.desc = action.desc;
      events.push({ kind: 'identified', name: action.name, rarity: item.rarity });
      break;
    }

    case 'EQUIP_ITEM': {
      data = ensureShape(clone(data));
      const item = data.inventory.items.find((i) => i.id === action.id);
      if (!item || item.state !== 'identified') return state;
      // один предмет на слот (тип)
      for (const other of data.inventory.items) {
        if (other.type === item.type) other.equipped = false;
      }
      item.equipped = true;
      break;
    }

    case 'UNEQUIP_ITEM': {
      data = ensureShape(clone(data));
      const item = data.inventory.items.find((i) => i.id === action.id);
      if (!item) return state;
      item.equipped = false;
      break;
    }

    case 'DELETE_ITEM': {
      data = ensureShape(clone(data));
      data.inventory.items = data.inventory.items.filter((i) => i.id !== action.id);
      break;
    }

    case 'DELETE_TASK': {
      data = clone(data);
      data.tasks = data.tasks.filter((t) => t.id !== action.id);
      break;
    }

    case 'ADD_DAILY': {
      data = clone(data);
      data.dailies.push({
        id: uuid(),
        title: action.title,
        stat: action.stat,
        xp: taskXP(action.difficulty || 'normal', action.time || 'medium'),
        at: action.at || null, // «HH:MM» — во сколько напоминать (бот), null = без привязки
        history: {},
      });
      break;
    }

    // Привязка дейлика ко времени: бот пришлёт напоминание в этот час
    case 'SET_DAILY_TIME': {
      data = clone(data);
      const daily = data.dailies.find((d) => d.id === action.id);
      if (!daily) return state;
      daily.at = action.at || null;
      break;
    }

    case 'TOGGLE_DAILY': {
      data = clone(data);
      const daily = data.dailies.find((d) => d.id === action.id);
      if (!daily) return state;
      const today = todayKey();
      if (daily.history[today]) {
        delete daily.history[today];
        awardXP(data, daily.stat, -daily.xp, events);
      } else {
        daily.history[today] = true;
        awardXP(data, daily.stat, daily.xp, events);
      }
      updateStreakAfterDailies(data, events);
      break;
    }

    case 'DELETE_DAILY': {
      data = clone(data);
      data.dailies = data.dailies.filter((d) => d.id !== action.id);
      break;
    }

    case 'ADD_DUNGEON': {
      data = clone(data);
      data.dungeons.push({
        id: uuid(),
        name: action.name,
        stat: action.stat,
        status: 'active',
        steps: action.steps.map((s) => ({ title: s.title, done: false, xp: s.xp })),
        boss: { title: action.boss.title, xp: action.boss.xp, done: false },
      });
      events.push({ kind: 'dungeon-open', name: action.name });
      break;
    }

    case 'TOGGLE_STEP': {
      data = ensureShape(clone(data));
      const dungeon = data.dungeons.find((d) => d.id === action.id);
      const step = dungeon?.steps[action.index];
      if (!step) return state;
      step.done = !step.done;
      awardXP(data, dungeon.stat, step.done ? step.xp : -step.xp, events);
      // добыча из данжа: шанс по «весу» шага
      if (step.done) {
        pushDrop(
          data,
          rollDrop(diffForXP(step.xp), data.profile.level, dungeon.stat, Object.keys(data.stats)),
          events,
          'step',
          `${dungeon.name}: ${step.title}`
        );
      }
      break;
    }

    case 'DEFEAT_BOSS': {
      data = ensureShape(clone(data));
      const dungeon = data.dungeons.find((d) => d.id === action.id);
      if (!dungeon || dungeon.boss.done) return state;
      dungeon.boss.done = true;
      dungeon.status = 'cleared';
      awardXP(data, dungeon.stat, dungeon.boss.xp, events);
      events.push({ kind: 'dungeon-clear', name: dungeon.name });
      // трофей с босса — гарантированный дроп с «эпической» таблицей
      pushDrop(
        data,
        rollDrop('epic', data.profile.level, dungeon.stat, Object.keys(data.stats), true),
        events,
        'boss',
        `Босс: ${dungeon.boss.title}`
      );
      break;
    }

    case 'ADD_STEP': {
      data = clone(data);
      const dungeon = data.dungeons.find((d) => d.id === action.id);
      if (!dungeon || dungeon.status === 'cleared') return state;
      dungeon.steps.push({ title: action.title, done: false, xp: action.xp });
      break;
    }

    case 'REMOVE_STEP': {
      data = clone(data);
      const dungeon = data.dungeons.find((d) => d.id === action.id);
      const step = dungeon?.steps[action.index];
      if (!step || dungeon.status === 'cleared') return state;
      // выполненный шаг при удалении откатывает свой XP
      if (step.done) awardXP(data, dungeon.stat, -step.xp, events);
      dungeon.steps.splice(action.index, 1);
      break;
    }

    case 'DELETE_DUNGEON': {
      data = clone(data);
      data.dungeons = data.dungeons.filter((d) => d.id !== action.id);
      break;
    }

    case 'ADD_GAME_CARD': {
      data = clone(data);
      const rarity = gameRarity(action.hoursWeight);
      data.cards.games.unshift({
        id: uuid(),
        title: action.title,
        rarity,
        hoursWeight: action.hoursWeight,
        obtainedAt: new Date().toISOString(),
        image: action.image || null,
      });
      events.push({ kind: 'card', title: action.title, rarity });
      break;
    }

    case 'ADD_CAR_CARD': {
      data = clone(data);
      data.cards.cars.unshift({
        id: uuid(),
        car: action.car,
        build: action.build,
        sim: action.sim,
        rarity: action.rarity,
        obtainedAt: new Date().toISOString(),
        image: action.image || null,
      });
      events.push({ kind: 'card', title: action.car, rarity: action.rarity });
      break;
    }

    case 'SET_CARD_IMAGE': {
      data = clone(data);
      const card = data.cards[action.collection].find((c) => c.id === action.id);
      if (!card) return state;
      card.image = action.image;
      break;
    }

    case 'DELETE_CARD': {
      data = clone(data);
      data.cards[action.collection] = data.cards[action.collection].filter((c) => c.id !== action.id);
      break;
    }

    // Отметка «пройдена» у игры Steam: карта получает голо-статус + начисляется опыт.
    // Снятие галочки откатывает опыт (как повторное снятие дейлика).
    case 'TOGGLE_STEAM_COMPLETE': {
      data = ensureShape(clone(data));
      const { appid, hours = 0 } = action;
      const ov = data.steam.overlay[appid] || {};
      const rarity = gameRarity(hours);
      const xp = CONFIG.STEAM_COMPLETE_XP[rarity] ?? CONFIG.STEAM_COMPLETE_XP.common;
      const statKey = steamStatKey(data);
      if (ov.completed) {
        ov.completed = false;
        ov.completedAt = null;
        if (statKey) awardXP(data, statKey, -(ov.xp || xp), events);
        ov.xp = 0;
      } else {
        ov.completed = true;
        ov.completedAt = new Date().toISOString();
        ov.xp = xp; // фиксируем начисленное, чтобы корректно откатить при снятии
        if (statKey) awardXP(data, statKey, xp, events);
        events.push({ kind: 'card', title: action.name || 'Игра пройдена', rarity: 'holo' });
      }
      data.steam.overlay[appid] = ov;
      break;
    }

    // Своя обложка поверх авто-арта Steam
    case 'SET_STEAM_IMAGE': {
      data = ensureShape(clone(data));
      const ov = data.steam.overlay[action.appid] || {};
      ov.image = action.image || null;
      data.steam.overlay[action.appid] = ov;
      break;
    }

    // Спрятать игру из библиотеки (мусор из бандлов)
    case 'TOGGLE_STEAM_HIDDEN': {
      data = ensureShape(clone(data));
      const ov = data.steam.overlay[action.appid] || {};
      ov.hidden = !ov.hidden;
      data.steam.overlay[action.appid] = ov;
      break;
    }

    // Выбор атрибута, в который капает опыт за пройденные игры
    case 'SET_STEAM_STAT': {
      data = ensureShape(clone(data));
      data.steam.stat = action.key || '';
      break;
    }

    case 'ADD_STAT': {
      data = ensureShape(clone(data));
      const label = action.label.trim();
      if (!label) return state;
      const key = 'cs_' + uuid().slice(0, 8);
      data.stats[key] = { xp: 0, level: 1 };
      data.statsMeta[key] = { label };
      events.push({ kind: 'system', message: `Новый атрибут: ${label}` });
      break;
    }

    case 'RENAME_STAT': {
      data = ensureShape(clone(data));
      const label = action.label.trim();
      if (!label || !data.stats[action.key]) return state;
      data.statsMeta[action.key] = { ...(data.statsMeta[action.key] || {}), label };
      break;
    }

    case 'DELETE_STAT': {
      // удалять можно только созданные пользователем атрибуты (cs_*)
      if (!action.key.startsWith('cs_')) return state;
      data = ensureShape(clone(data));
      const removedXP = data.stats[action.key]?.xp ?? 0;
      delete data.stats[action.key];
      delete data.statsMeta[action.key];
      // общий XP персонажа уменьшается на вклад удалённого атрибута
      data.profile.totalXP = Math.max(0, data.profile.totalXP - removedXP);
      data.profile.level = levelFromXP(data.profile.totalXP).level;
      data.profile.rank = rankForLevel(data.profile.level);
      break;
    }

    case 'UPDATE_SETTINGS': {
      data = clone(data);
      Object.assign(data.settings, action.patch);
      break;
    }

    case 'UPDATE_PROFILE': {
      data = clone(data);
      Object.assign(data.profile, action.patch);
      break;
    }

    case 'PUSH_EVENT': {
      return { ...state, events: [...state.events, { id: uuid(), ...action.event }] };
    }

    case 'DISMISS_EVENT': {
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    }

    default:
      return state;
  }

  return {
    ...state,
    data,
    dirty: dirty ? state.dirty + 1 : state.dirty,
    events: [...state.events, ...events.map((e) => ({ id: uuid(), ...e }))],
  };
}
