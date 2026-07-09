// Line-art иконки слотов экипировки (stroke = currentColor) + силуэт охотника.
// Стиль — тонкий «голографический» контур, как в окне EQUIPMENT Системы.

const p = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const SLOT_ICONS = {
  weapon: (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M5 19L16 8l2.5-5.5L13 5 5 13" />
      <path d="M4 20l2-2M7 15l2 2" />
      <path d="M3 21l1.5-1.5" strokeWidth="2.2" />
    </svg>
  ),
  helmet: (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M5 14v-3a7 7 0 0 1 14 0v3" />
      <path d="M5 14h14v3l-3 3h-8l-3-3z" />
      <path d="M9 17h6" />
      <path d="M12 4v3" />
    </svg>
  ),
  armor: (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3-2 2h-4z" />
      <path d="M12 8v12" />
      <path d="M9 14h6" />
    </svg>
  ),
  gloves: (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M8 21v-6L5 9l2-1 2 3V4.5a1.2 1.2 0 0 1 2.4 0V10" />
      <path d="M11.4 10V3.8a1.2 1.2 0 0 1 2.4 0V10" />
      <path d="M13.8 10V4.8a1.2 1.2 0 0 1 2.4 0V12l1-1.5 1.8 1-3 5.5v4" />
      <path d="M8 18h8" />
    </svg>
  ),
  necklace: (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M4 4c0 6 4 8 8 9 4-1 8-3 8-9" />
      <path d="M12 13v2" />
      <path d="M12 15l2.5 3-2.5 3-2.5-3z" />
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 24 24" {...p}>
      <circle cx="12" cy="14" r="6" />
      <path d="M9.5 8.5L12 4l2.5 4.5" />
      <path d="M10.5 6.2h3" />
    </svg>
  ),
  boots: (
    <svg viewBox="0 0 24 24" {...p}>
      <path d="M8 3h6v9l5 5v3H8l-1-3V3z" />
      <path d="M8 12h6" />
      <path d="M12 17h7" />
    </svg>
  ),
};

// Силуэт охотника — сегментированный контур в духе окна Системы
export function Silhouette() {
  return (
    <svg viewBox="0 0 120 260" {...p} strokeWidth="1.4" className="silhouette-svg">
      {/* голова и шея */}
      <ellipse cx="60" cy="24" rx="13" ry="16" />
      <path d="M54 40l1 8h10l1-8" />
      {/* торс */}
      <path d="M42 52c5-3 31-3 36 0l4 26-6 26H44l-6-26z" />
      <path d="M48 58l12 10 12-10M60 68v34" />
      {/* таз */}
      <path d="M45 108h30l-3 18H48z" />
      {/* левая рука */}
      <path d="M42 54l-10 8-4 26 2 22" />
      <path d="M30 110l-2 18-4 10" />
      <path d="M24 138l-3 10 3 6 4-5" />
      {/* правая рука */}
      <path d="M78 54l10 8 4 26-2 22" />
      <path d="M90 110l2 18 4 10" />
      <path d="M96 138l3 10-3 6-4-5" />
      {/* левая нога */}
      <path d="M48 126l-3 34 3 30" />
      <path d="M48 190l-2 34-4 14" />
      <path d="M42 238l-2 12 12 2 1-10" />
      {/* правая нога */}
      <path d="M72 126l3 34-3 30" />
      <path d="M72 190l2 34 4 14" />
      <path d="M78 238l2 12-12 2-1-10" />
      {/* сочленения */}
      <circle cx="32" cy="62" r="2.5" />
      <circle cx="88" cy="62" r="2.5" />
      <circle cx="30" cy="110" r="2.5" />
      <circle cx="90" cy="110" r="2.5" />
      <circle cx="48" cy="160" r="2.5" />
      <circle cx="72" cy="160" r="2.5" />
    </svg>
  );
}
