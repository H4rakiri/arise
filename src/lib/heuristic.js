// Эвристический разбор «плана дня» без нейронки — фолбэк Фазы 5 и
// источник `heuristic` для задач (§6.1). Работает всегда, LLM — надстройка.

const STAT_PATTERNS = {
  body:  /баскет|трениров|зал|спорт|бег|пробеж|разминк|отжим|воркаут/i,
  study: /учеб|учёб|магистр|диплом|перколя|курс|лекци|статья|конспект|экзамен|семинар/i,
  jp:    /япон|хираган|катакан|кандзи|anki|анки|日本語|лексик/i,
  home:  /убор|уборк|посуд|стирк|быт|магазин|продукт|готовк|квартир|мусор/i,
  work:  /работ|митинг|созвон|таск|тикет|релиз|код-?ревью|деплой|отчёт|отчет/i,
};

const TIME_PATTERNS = [
  { re: /день|весь день|целый день/i, time: 'day' },
  { re: /час[а-я]*|2\s*ч|пару часов|полтора/i, time: 'long' },
  { re: /30\s*мин|полчас/i, time: 'medium' },
  { re: /5\s*мин|10\s*мин|быстро|мелоч/i, time: 'short' },
];

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
      const time = TIME_PATTERNS.find((p) => p.re.test(title))?.time || 'medium';
      const difficulty = DIFF_PATTERNS.find((p) => p.re.test(title))?.difficulty || 'normal';
      return { title, stat: guessStat(title), difficulty, time };
    });
}
