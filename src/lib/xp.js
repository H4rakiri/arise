import { CONFIG } from '../config.js';

// §5.1: XP = BASE × mult_difficulty × mult_time
export function taskXP(difficulty, time) {
  const d = CONFIG.DIFFICULTY[difficulty]?.mult ?? 1;
  const t = CONFIG.TIME[time]?.mult ?? 1;
  return Math.round(CONFIG.BASE_XP * d * t);
}

// §5.2: xp_to_next(L) = round(100 × L^1.5)
export function xpToNext(level) {
  return Math.round(CONFIG.LEVEL_BASE * Math.pow(level, CONFIG.LEVEL_EXP));
}

// Уровень из суммарного XP (применяется и к персонажу, и к каждому стату).
// Возвращает уровень, XP внутри текущего уровня и стоимость следующего.
export function levelFromXP(totalXP) {
  let level = 1;
  let rest = totalXP;
  let need = xpToNext(level);
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = xpToNext(level);
  }
  return { level, into: rest, need };
}

// §5.3: ранг по общему уровню
export function rankForLevel(level) {
  for (const { rank, minLevel } of CONFIG.RANKS) {
    if (level >= minLevel) return rank;
  }
  return 'E';
}

// §5.4: редкость карты игры по hoursWeight
export function gameRarity(hoursWeight) {
  for (const { max, rarity } of CONFIG.GAME_RARITY) {
    if (hoursWeight < max) return rarity;
  }
  return 'legendary';
}
