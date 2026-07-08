import { useRef, useCallback } from 'react';

// Холо-карточка (§8.3). Чистый CSS + минимальный JS.
// pointermove пишет в CSS-переменные позицию (--mx/--my в долях) и
// расстояние от центра (--hyp) — фольга и блик считаются в CSS слоями
// с color-dodge/soft-light, как на цифровых покемон-картах.
export default function HoloCard({ rarity = 'common', image = null, children, actions = null }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width;
    const my = (e.clientY - r.top) / r.height;
    const hyp = Math.min(1, Math.hypot(mx - 0.5, my - 0.5) / 0.7);
    el.style.setProperty('--mx', mx.toFixed(3));
    el.style.setProperty('--my', my.toFixed(3));
    el.style.setProperty('--hyp', hyp.toFixed(3));
    el.classList.add('hover');
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', '0.5');
    el.style.setProperty('--my', '0.5');
    el.style.setProperty('--hyp', '0');
    el.classList.remove('hover');
  }, []);

  return (
    <div className={`holo-card rarity-${rarity}`} ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="holo-tilt">
        <div className="holo-frame">
          <div className={`holo-art ${image ? 'has-image' : ''}`}>
            {image && <img src={image} alt="" draggable="false" />}
            <div className="holo-foil" />
            <div className="holo-sparkle" />
          </div>
          <div className="holo-body">{children}</div>
          <div className="holo-glare" />
        </div>
        {actions && <div className="holo-actions">{actions}</div>}
      </div>
    </div>
  );
}
