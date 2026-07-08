export default function XPBar({ into, need, label, cool = false }) {
  const pct = Math.min(100, (into / need) * 100);
  return (
    <div className={`xpbar ${cool ? 'cool' : ''}`} title={cool ? 'Стат остывает — давно не было активности' : undefined}>
      <div className="xpbar-track">
        <div className="xpbar-fill" style={{ width: `${pct}%` }} />
      </div>
      {label && <span className="xpbar-label">{label}</span>}
    </div>
  );
}
