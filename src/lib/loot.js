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
  const type = pick(['weapon', 'weapon', 'armor', 'accessory']); // оружие чуть чаще
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
  weapon: ['Клинок', 'Катана', 'Копьё', 'Кинжал', 'Лук', 'Коса', 'Молот'],
  armor: ['Доспех', 'Плащ', 'Мантия', 'Наплечники', 'Латы', 'Капюшон'],
  accessory: ['Кольцо', 'Амулет', 'Талисман', 'Серьга', 'Печать', 'Подвеска'],
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

// Приводим склонение: «Катана Мудреца» ок, префикс подстроим по роду грубо
function agreePrefix(prefix, base) {
  const fem = /а$|ь$/.test(base) && !/ель$|мот$/.test(base);
  const neu = /о$|ьё$|е$/.test(base);
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
