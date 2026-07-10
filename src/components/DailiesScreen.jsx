import { useState } from 'react';
import Panel from './Panel.jsx';
import TimeInput from './TimeInput.jsx';
import { useApp } from '../state/AppContext.jsx';
import { CONFIG } from '../config.js';
import { getStatsMeta } from '../lib/stats.js';
import { taskXP } from '../lib/xp.js';
import { todayKey } from '../lib/util.js';

// Ежедневные квесты (§6.2) + серия с заморозками (§6.3)
export default function DailiesScreen() {
  const { state, dispatch } = useApp();
  const { dailies, streak } = state.data;
  const META = getStatsMeta(state.data);
  const today = todayKey();
  const [title, setTitle] = useState('');
  const [stat, setStat] = useState('jp');
  const [difficulty, setDifficulty] = useState('normal');
  const [minutes, setMinutes] = useState(30);

  const doneCount = dailies.filter((d) => d.history[today]).length;

  function addDaily(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    dispatch({ type: 'ADD_DAILY', title: t, stat, difficulty, time: minutes });
    setTitle('');
  }

  // Последние 7 дней — мини-история выполнения
  const week = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return todayKey(d);
  });

  return (
    <div className="screen">
      <Panel title="СЕРИЯ" className="streak-panel">
        <div className="streak-big">
          <span className="streak-num">{streak.current}</span>
          <span className="streak-unit">дн. серии</span>
        </div>
        <div className="streak-meta">
          <span>Рекорд: <b>{streak.best}</b></span>
          <span title="«Отпускные дни», которые не рвут серию. Восстанавливаются каждый месяц.">
            Заморозки: <b>{'❄'.repeat(streak.freezes) || '—'}</b>
          </span>
          <span className={doneCount === dailies.length && dailies.length > 0 ? 'ok' : ''}>
            Сегодня: {doneCount}/{dailies.length}
          </span>
        </div>
      </Panel>

      <Panel title={`ЕЖЕДНЕВНЫЕ КВЕСТЫ · ${today}`}>
        {dailies.length === 0 ? (
          <p className="empty">Добавь 2–3 обязательных квеста в день — та самая механика Системы.</p>
        ) : (
          <ul className="task-list">
            {dailies.map((d) => (
              <li className={`task-item ${d.history[today] ? 'done' : ''}`} key={d.id}>
                <input
                  type="checkbox"
                  checked={!!d.history[today]}
                  onChange={() => dispatch({ type: 'TOGGLE_DAILY', id: d.id })}
                />
                <span className="task-title">{d.title}</span>
                <span className={`tag stat-${d.stat}`}>{META[d.stat]?.label ?? d.stat}</span>
                <span className="task-xp">+{d.xp} XP</span>
                <span className="daily-week">
                  {week.map((day) => (
                    <i key={day} className={`week-dot ${d.history[day] ? 'on' : ''} ${day === today ? 'today' : ''}`} />
                  ))}
                </span>
                <button className="icon-btn" title="Удалить дейлик" onClick={() => dispatch({ type: 'DELETE_DAILY', id: d.id })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="НОВЫЙ ДЕЙЛИК">
        <form className="task-form" onSubmit={addDaily}>
          <input
            className="input task-title-input"
            placeholder="Например: 30 минут японского"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="task-form-row">
            <select className="select" value={stat} onChange={(e) => setStat(e.target.value)}>
              {Object.entries(META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {Object.entries(CONFIG.DIFFICULTY).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <TimeInput minutes={minutes} onChange={setMinutes} />
            <span className="xp-preview">+{taskXP(difficulty, minutes)} XP/день</span>
            <button className="btn primary" type="submit" disabled={!title.trim()}>
              Добавить
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
