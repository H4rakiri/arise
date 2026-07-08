// Эвристический разбор «плана дня» без нейронки — фолбэк Фазы 5 и
// источник `heuristic` для задач (§6.1). Работает всегда, LLM — надстройка.

const STAT_PATTERNS = {
  body:  /баскет|трениров|зал|спорт|бег|пробеж|разминк|отжим|воркаут/i,
  study: /учеб|учёб|магистр|диплом|перколя|курс|лекци|статья|конспект|экзамен|семинар/i,
  jp:    /япон|хираган|катакан|кандзи|anki|анки|日本語|лексик/i,
  home:  /убор|уборк|посуд|стирк|быт|магазин|продукт|готовк|квартир|мусор/i,
  work:  /работ|митинг|созвон|таск|тикет|релиз|код-?ревью|деплой|отчёт|отчет/i,
};

// Оценка времени в минутах из текста строки
function guessMinutes(title) {
  let m = title.match(/(\d+([.,]\d+)?)\s*час|(\d+([.,]\d+)?)\s*ч\b/i);
  if (m) return Math.round(parseFloat((m[1] || m[3]).replace(',', '.')) * 60);
  m = title.match(/(\d+)\s*мин/i);
  if (m) return parseInt(m[1], 10);
  if (/весь день|целый день|день\b/i.test(title)) return 480;
  if (/пару часов|полтора/i.test(title)) return 120;
  if (/час/i.test(title)) return 60;
  if (/полчас/i.test(title)) return 30;
  if (/быстро|мелоч|5\s*мин/i.test(title)) return 10;
  return 30;
}

const DIFF_PATTERNS = [
  { re: /эпик|огромн|важнейш|защит/i, difficulty: 'epic' },
  { re: /сложн|тяжел|тяжёл|разобрать|написать главу/i, difficulty: 'hard' },
  { re: /быстро|мелоч|простая?|тривиал/i, difficulty: 'trivial' },
];

export function guessStat(title) {
  for (const [stat, re] of Object.entries(STAT_PATTERNS)) {
    if (re.test(title)) return stat;
  }
  return 'work';
}

// Свободный текст плана → массив { title, stat, difficulty, time }
export function parsePlanHeuristic(text) {
  return text
    .split(/\n|;|·|•/)
    .map((line) => line.replace(/^\s*(?:[-*—]|\d+[.)\]])\s*/, '').trim())
    .filter((line) => line.length > 1)
    .map((title) => {
      const difficulty = DIFF_PATTERNS.find((p) => p.re.test(title))?.difficulty || 'normal';
      return { title, stat: guessStat(title), difficulty, time: guessMinutes(title) };
    });
}
