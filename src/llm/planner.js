// Фаза 5: план дня в свободной форме → задачи через WebLLM (WebGPU, Qwen ~1.5B).
// JSON просим промптом и валидируем сами: строгий response_format (грамматика)
// в WebLLM зависает на Apple GPU, поэтому structured output обеспечиваем
// few-shot примерами + робастным извлечением JSON из ответа.
// XP сайт считает сам по §5.1 — модель его не выдумывает.

import { CONFIG, STAT_KEYS } from '../config.js';

let enginePromise = null;
let loadedModel = null;
let workerRef = null;

// Аварийный стоп: убить воркер нейронки (зависшая загрузка/генерация)
// и сбросить движок — следующий запуск начнёт с чистого листа.
export function cancelLLM() {
  try {
    workerRef?.terminate();
  } catch {
    /* воркер уже мёртв */
  }
  workerRef = null;
  enginePromise = null;
  loadedModel = null;
}

const SYSTEM_PROMPT = `Ты — модуль Системы ARISE. Разбей план дня пользователя на отдельные задачи.
Ответь ТОЛЬКО валидным JSON-объектом вида {"tasks":[{"title":"...","stat":"...","difficulty":"...","time":"..."}]} — без пояснений, без markdown.

Правила категоризации (stat):
- work — рабочие задачи, митинги, код, отчёты
- body — баскетбол, тренировки, спорт, физическая активность
- study — магистратура, перколяция, курсы, статьи, учёба
- jp — японский язык: хирагана, катакана, лексика, чтение
- home — уборка, быт, покупки, домашняя рутина

difficulty: trivial | normal | hard | epic. time: short (~5 мин) | medium (~30 мин) | long (~пара часов) | day (день+).

Примеры:
Вход: "с утра созвон, потом 30 минут японского и вынести мусор"
Выход: {"tasks":[{"title":"Созвон","stat":"work","difficulty":"normal","time":"medium"},{"title":"30 минут японского","stat":"jp","difficulty":"normal","time":"medium"},{"title":"Вынести мусор","stat":"home","difficulty":"trivial","time":"short"}]}
Вход: "разобрать статью по перколяции, вечером баскетбол"
Выход: {"tasks":[{"title":"Разобрать статью по перколяции","stat":"study","difficulty":"hard","time":"long"},{"title":"Баскетбол","stat":"body","difficulty":"normal","time":"long"}]}`;

const GENERATION_TIMEOUT_MS = 180000;

export function isWebGPUAvailable() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

// Ленивая инициализация движка в воркере; модель качается один раз и кешируется.
async function getEngine(model, onProgress) {
  if (enginePromise && loadedModel === model) return enginePromise;
  loadedModel = model;
  enginePromise = (async () => {
    const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    workerRef = worker;
    return CreateWebWorkerMLCEngine(worker, model, {
      initProgressCallback: (p) => onProgress?.(p.text || ''),
    });
  })();
  try {
    return await enginePromise;
  } catch (e) {
    // Не кешируем упавшую инициализацию — дать шанс повторить
    enginePromise = null;
    loadedModel = null;
    throw e;
  }
}

// Вытащить JSON из ответа модели: чистый JSON, ```json …```, либо первый {…}
function extractJSON(raw) {
  const stripped = raw.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/) || stripped.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('в ответе модели нет JSON');
    return JSON.parse(match[0]);
  }
}

export async function parsePlanLLM(text, model, onProgress) {
  const engine = await getEngine(model, onProgress);
  onProgress?.('Система анализирует план…');

  // Стрим со счётчиком токенов: видно, что модель жива (первая генерация
  // после загрузки дополнительно компилирует шейдеры и может думать долго).
  const request = (async () => {
    const chunks = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: 700,
      stream: true,
    });
    let raw = '';
    let n = 0;
    for await (const chunk of chunks) {
      raw += chunk.choices[0]?.delta?.content || '';
      n += 1;
      if (n % 8 === 0) onProgress?.(`Генерация… ${n} токенов`);
    }
    return raw;
  })();

  const raw = await Promise.race([
    request,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('таймаут генерации (3 мин)')), GENERATION_TIMEOUT_MS)
    ),
  ]);

  const parsed = extractJSON(raw);
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  if (!Array.isArray(tasks)) throw new Error('LLM вернула не массив задач');
  // Валидация схемы — недоверенный вывод модели приводим к допустимым значениям
  // Модель отдаёт категорию времени (стабильнее для few-shot),
  // сайт конвертирует её в минуты — дальше всё в минутах.
  return tasks
    .filter((t) => t && typeof t.title === 'string' && t.title.trim())
    .map((t) => ({
      title: t.title.trim(),
      stat: STAT_KEYS.includes(t.stat) ? t.stat : 'work',
      difficulty: ['trivial', 'normal', 'hard', 'epic'].includes(t.difficulty) ? t.difficulty : 'normal',
      time: CONFIG.LEGACY_TIME_MINUTES[t.time] ?? 30,
    }));
}
