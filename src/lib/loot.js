// Дроп и генерация предметов инвентаря.
// Механика (шанс, редкость, бонус) считается локально и детерминированно
// при выпадении; нейронка (или локальные таблицы) добавляет только «лор» —
// название и описание — в момент опознания.

import { CONFIG, STAT_KEYS, STATS } from '../config.js';

const RARITIES = ['common', 'rare', 'epic', 'legendary'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Бросок редкости: веса растут со сложностью задачи и уровнем персонажа
export function rollRarity(difficulty, level) {
  const { rarityWeights, diffBoost, levelBoost } = CONFIG.DROP;
  const boost = diffBoost[difficulty] ?? 0;
  const w = {
    common: rarityWeights.common,
    rare: rarityWeights.rare * (1 + 0.15 * boost + levelBoost.rare * level),
    epic: rarityWeights.epic * (1 + 0.3 * boost + levelBoost.epic * level),
    legendary: rarityWeights.legendary * (1 + 0.5 * boost + levelBoost.legendary * level),
  };
  const total = RARITIES.reduce((s, r) => s + w[r], 0);
  let roll = Math.random() * total;
  for (const r of RARITIES) {
    roll -= w[r];
    if (roll <= 0) return r;
  }
  return 'common';
}

// Пытается выбить предмет за закрытую задачу. null — не повезло.
export function rollDrop(difficulty, level, taskStat) {
  if (Math.random() >= (CONFIG.DROP.chance[difficulty] ?? 0)) return null;
  const rarity = rollRarity(difficulty, level);
  // оружие чуть чаще остальных слотов
  const type = pick(['weapon', 'weapon', 'helmet', 'armor', 'gloves', 'necklace', 'ring', 'boots']);
  const stat =
    Math.random() < CONFIG.DROP.sameStatChance && STAT_KEYS.includes(taskStat)
      ? taskStat
      : pick(STAT_KEYS);
  return {
    rarity,
    type,
    bonus: { stat, value: CONFIG.DROP.bonusByRarity[rarity] },
  };
}

// ---- локальный генератор лора (фолбэк без нейронки) ----

const BASES = {
  weapon: ['Клинок', 'Катана', 'Копьё', 'Кинжал', 'Меч', 'Коса', 'Молот'],
  helmet: ['Шлем', 'Капюшон', 'Корона', 'Маска', 'Диадема'],
  armor: ['Доспех', 'Кираса', 'Мантия', 'Плащ', 'Латы'],
  gloves: ['Перчатки', 'Рукавицы', 'Наручи'],
  necklace: ['Амулет', 'Ожерелье', 'Кулон', 'Подвеска', 'Талисман'],
  ring: ['Кольцо', 'Перстень', 'Печать'],
  boots: ['Сапоги', 'Ботинки', 'Поножи'],
};

const PREFIXES = {
  common: ['Потёртый', 'Простой', 'Ученический', 'Ржавый'],
  rare: ['Закалённый', 'Лунный', 'Рунный', 'Стальной'],
  epic: ['Демонический', 'Призрачный', 'Кровавый', 'Астральный'],
  legendary: ['Монарший', 'Теневой', 'Первозданный', 'Пробуждённый'],
};

const SUFFIXES = {
  work: 'Трудоголика',
  body: 'Атлета',
  study: 'Мудреца',
  jp: 'Лингвиста',
  home: 'Хранителя Очага',
};

const DESCS = {
  common: 'Ничем не примечателен, но своё дело знает.',
  rare: 'Слабое свечение выдаёт скрытую в нём ману.',
  epic: 'Добыт в глубинах врат высокого ранга.',
  legendary: 'Реликвия Монарха. Система признаёт его силу.',
};

// Приводим склонение префикса по роду/числу основы (грубо, но хватает)
function agreePrefix(prefix, base) {
  const plural = /[иы]$/.test(base); // Перчатки, Сапоги, Латы…
  const fem = /[ая]$|ь$/.test(base) && !/ень$/.test(base);
  const neu = /[ое]$|ьё$/.test(base);
  if (plural) return prefix.replace(/ый$|ий$/, (m) => (m === 'ий' ? 'ие' : 'ые'));
  if (fem) return prefix.replace(/ый$|ий$/, (m) => (m === 'ий' ? 'яя' : 'ая'));
  if (neu) return prefix.replace(/ый$|ий$/, (m) => (m === 'ий' ? 'ее' : 'ое'));
  return prefix;
}

export function localLore(item) {
  const base = pick(BASES[item.type] || BASES.weapon);
  const prefix = agreePrefix(pick(PREFIXES[item.rarity]), base);
  return {
    name: `${prefix} ${base} ${SUFFIXES[item.bonus.stat] || ''}`.trim(),
    desc: `${DESCS[item.rarity]} Усиливает: ${STATS[item.bonus.stat]?.label}.`,
  };
}
