import { CONFIG, STAT_KEYS } from '../config.js';

// Структура повторяет §7 ТЗ. Токен GitHub здесь НЕ хранится — только в localStorage.
export function defaultData() {
  const stats = {};
  for (const key of STAT_KEYS) stats[key] = { xp: 0, level: 1 };
  return {
    profile: {
      name: 'Артём',
      title: 'Пробуждённый',
      createdAt: new Date().toISOString(),
      totalXP: 0,
      level: 1,
      rank: 'E',
    },
    stats,
    tasks: [],
    dailies: [],
    streak: {
      current: 0,
      best: 0,
      freezes: CONFIG.FREEZES_PER_MONTH,
      lastCompletedDate: null,
      lastFreezeRefill: null,
    },
    dungeons: [],
    cards: {
      games: [],
      cars: [],
    },
    settings: {
      githubRepo: '',
      llmEnabled: false,
      llmModel: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      theme: 'arise-dark',
      soundEnabled: false,
    },
  };
}
