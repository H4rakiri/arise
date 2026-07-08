import { useEffect } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { STATS, RARITY_LABELS } from '../config.js';

// Всплывающие окна Системы (§8.1): появление с лёгким глитчем и fade-in.
// Мелкие события гаснут сами, крупные (level-up, ранг) ждут клика.

const AUTO_DISMISS_MS = 3200;
const STICKY = new Set(['levelup', 'rankup', 'dungeon-clear', 'sync-error', 'sync-conflict', 'streak-broken']);

function render(e) {
  switch (e.kind) {
    case 'xp':
      return { title: '「XP」', body: `+${e.amount} XP → ${STATS[e.stat]?.label ?? e.stat}` };
    case 'new-quest':
      return {
        title: '「NOTIFICATION」',
        body: e.count > 1 ? `You have ${e.count} new quests` : 'You have a new quest',
      };
    case 'levelup':
      return { title: '「LEVEL UP」', body: `Уровень ${e.level}. Ты стал сильнее.` };
    case 'stat-levelup':
      return { title: '「STAT UP」', body: `${STATS[e.stat]?.label ?? e.stat} → уровень ${e.level}` };
    case 'rankup':
      return { title: '「RANK UP」', body: `Новый ранг: ${e.rank}` };
    case 'card':
      return { title: '「CARD DROP」', body: `${e.title} — ${RARITY_LABELS[e.rarity] ?? e.rarity}` };
    case 'streak':
      return { title: '「STREAK」', body: `Серия: ${e.current} дн.` };
    case 'streak-broken':
      return { title: '「DEBUFF」', body: `Серия прервана (было ${e.was} дн.). Начни заново.` };
    case 'freeze':
      return { title: '「FREEZE」', body: `Заморозка спасла серию (−${e.used}, осталось ${e.left})` };
    case 'dungeon-open':
      return { title: '「DUNGEON」', body: `Врата открыты: ${e.name}` };
    case 'dungeon-clear':
      return { title: '「DUNGEON CLEAR」', body: `${e.name} — босс повержен!` };
    case 'sync-conflict':
      return { title: '「WARNING」', body: e.message };
    case 'sync-error':
      return { title: '「SYNC ERROR」', body: e.message };
    default:
      return { title: '「SYSTEM」', body: e.message || e.kind };
  }
}

function Toast({ event, onDismiss }) {
  const sticky = STICKY.has(event.kind);
  useEffect(() => {
    if (sticky) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [sticky, onDismiss]);
  const { title, body } = render(event);
  return (
    <div className={`toast toast-${event.kind} ${sticky ? 'sticky' : ''}`} onClick={onDismiss}>
      <div className="toast-title glitch" data-text={title}>{title}</div>
      <div className="toast-body">{body}</div>
      {sticky && <div className="toast-hint">[ нажми, чтобы закрыть ]</div>}
    </div>
  );
}

export default function Notifications() {
  const { state, dispatch } = useApp();
  const visible = state.events.slice(-4);
  return (
    <div className="toasts">
      {visible.map((e) => (
        <Toast key={e.id} event={e} onDismiss={() => dispatch({ type: 'DISMISS_EVENT', id: e.id })} />
      ))}
    </div>
  );
}
