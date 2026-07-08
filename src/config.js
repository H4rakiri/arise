// Все константы формул вынесены сюда для тюнинга (§5 ТЗ).

export const CONFIG = {
  // §5.1 — опыт за задачу: XP = BASE × mult_difficulty × mult_time
  BASE_XP: 10,
  DIFFICULTY: {
    trivial: { label: 'Тривиально', mult: 1.0 },
    normal:  { label: 'Обычно',     mult: 1.5 },
    hard:    { label: 'Сложно',     mult: 2.5 },
    epic:    { label: 'Эпик',       mult: 4.0 },
  },
  TIME: {
    short:  { label: '~5 мин',      mult: 1.0 },
    medium: { label: '~30 мин',     mult: 1.5 },
    long:   { label: '~пара часов', mult: 2.5 },
    day:    { label: 'день+',       mult: 4.0 },
  },

  // §5.2 — кривая уровней: xp_to_next(L) = round(LEVEL_BASE × L^LEVEL_EXP)
  LEVEL_BASE: 100,
  LEVEL_EXP: 1.5,

  // §5.3 — ранги по общему уровню персонажа
  RANKS: [
    { rank: 'S', minLevel: 80 },
    { rank: 'A', minLevel: 55 },
    { rank: 'B', minLevel: 35 },
    { rank: 'C', minLevel: 20 },
    { rank: 'D', minLevel: 10 },
    { rank: 'E', minLevel: 1 },
  ],

  // §5.4 — редкость карт игр по «весу» (часы/масштаб)
  GAME_RARITY: [
    { max: 10, rarity: 'common' },
    { max: 30, rarity: 'rare' },
    { max: 70, rarity: 'epic' },
    { max: Infinity, rarity: 'legendary' },
  ],

  // §6.3 — защита серии: запас заморозок с восстановлением раз в месяц
  FREEZES_PER_MONTH: 2,

  // Стат «остывает» (полоска тускнеет), если по нему нет активности N дней (§4.1)
  STAT_COOL_DAYS: 5,

  // §3 — дебаунс записи data.json через GitHub API, мс
  SYNC_DEBOUNCE_MS: 3000,
};

// §4.1 — пять прокачиваемых сфер
export const STATS = {
  work:  { label: 'Работа',   jp: '仕事' },
  body:  { label: 'Тело',     jp: '肉体' },
  study: { label: 'Учёба',    jp: '学業' },
  jp:    { label: 'Японский', jp: '日本語' },
  home:  { label: 'Быт',      jp: '生活' },
};

export const STAT_KEYS = Object.keys(STATS);

export const RARITY_LABELS = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпик',
  legendary: 'Легендарка',
  holo: 'Холо',
};
