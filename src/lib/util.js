export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Локальная дата в формате YYYY-MM-DD (ключ истории дейликов)
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(dateKeyA, dateKeyB) {
  const a = new Date(`${dateKeyA}T00:00:00`);
  const b = new Date(`${dateKeyB}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 90 → «1.5 ч», 45 → «45 мин»
export function formatMinutes(min) {
  if (min >= 60) {
    const h = min / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} ч`;
  }
  return `${min} мин`;
}

// «12.07» + сколько осталось; отрицательное = просрочено
export function deadlineInfo(deadline) {
  if (!deadline) return null;
  const today = todayKey();
  const left = daysBetween(today, deadline);
  const [, m, d] = deadline.split('-');
  return { label: `${d}.${m}`, left };
}
