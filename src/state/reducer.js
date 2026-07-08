import { CONFIG } from '../config.js';
import { taskXP, levelFromXP, rankForLevel, gameRarity } from '../lib/xp.js';
import { uuid, todayKey, daysBetween, monthKey } from '../lib/util.js';

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
    if (p.level > beforeLevel) events.push({ kind: 'levelup', level: p.level });
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
      data = clone(action.data);
      maintainStreak(data, events);
      dirty = action.markDirty ?? false;
      break;
    }

    case 'REMOTE_DATA': {
      data = clone(action.data);
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
      data = clone(data);
      const task = data.tasks.find((t) => t.id === action.id);
      if (!task || task.status === 'done') return state;
      task.status = 'done';
      task.completedAt = new Date().toISOString();
      awardXP(data, task.stat, task.xp, events);
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
        history: {},
      });
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
      data = clone(data);
      const dungeon = data.dungeons.find((d) => d.id === action.id);
      const step = dungeon?.steps[action.index];
      if (!step) return state;
      step.done = !step.done;
      awardXP(data, dungeon.stat, step.done ? step.xp : -step.xp, events);
      break;
    }

    case 'DEFEAT_BOSS': {
      data = clone(data);
      const dungeon = data.dungeons.find((d) => d.id === action.id);
      if (!dungeon || dungeon.boss.done) return state;
      dungeon.boss.done = true;
      dungeon.status = 'cleared';
      awardXP(data, dungeon.stat, dungeon.boss.xp, events);
      events.push({ kind: 'dungeon-clear', name: dungeon.name });
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
