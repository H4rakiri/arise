import { STATS } from '../config.js';

// Метаданные атрибутов: 5 базовых из конфига + пользовательские правки
// и созданные атрибуты из data.statsMeta. Итерируется по data.stats,
// чтобы порядок и состав всегда совпадали с реальными данными.
export function getStatsMeta(data) {
  const merged = {};
  for (const key of Object.keys(data.stats || {})) {
    merged[key] = { jp: '', ...(STATS[key] || {}), ...(data.statsMeta?.[key] || {}) };
    if (!merged[key].label) merged[key].label = key;
  }
  return merged;
}

// Подпись стата даже для удалённых/неизвестных ключей
export function statLabel(data, key) {
  return getStatsMeta(data)[key]?.label ?? STATS[key]?.label ?? key;
}
