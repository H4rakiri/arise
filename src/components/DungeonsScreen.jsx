import { useState } from 'react';
import Panel from './Panel.jsx';
import { useApp } from '../state/AppContext.jsx';
import { STATS } from '../config.js';

// Данжи (§6.4): многоэтапная цель с шагами и боссом в конце.
function DungeonCard({ dungeon }) {
  const { dispatch } = useApp();
  const totalXP = dungeon.steps.reduce((s, x) => s + x.xp, 0) + dungeon.boss.xp;
  const earned =
    dungeon.steps.filter((s) => s.done).reduce((s, x) => s + x.xp, 0) +
    (dungeon.boss.done ? dungeon.boss.xp : 0);
  const pct = totalXP ? (earned / totalXP) * 100 : 0;
  const stepsDone = dungeon.steps.every((s) => s.done);
  const cleared = dungeon.status === 'cleared';

  return (
    <Panel className={`dungeon ${cleared ? 'cleared' : ''}`} title={`${cleared ? 'ПРОЙДЕН · ' : 'ДАНЖ · '}${dungeon.name}`}>
      <div className="dungeon-meta">
        <span className={`tag stat-${dungeon.stat}`}>{STATS[dungeon.stat]?.label}</span>
        <span className="dim">{earned} / {totalXP} XP</span>
        <button className="icon-btn" title="Удалить данж" onClick={() => dispatch({ type: 'DELETE_DUNGEON', id: dungeon.id })}>
          ✕
        </button>
      </div>
      <div className="xpbar-track dungeon-bar">
        <div className="xpbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="dungeon-steps">
        {dungeon.steps.map((s, i) => (
          <li key={i} className={s.done ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={s.done}
                disabled={cleared}
                onChange={() => dispatch({ type: 'TOGGLE_STEP', id: dungeon.id, index: i })}
              />
              <span>{s.title}</span>
              <span className="dim">+{s.xp} XP</span>
            </label>
          </li>
        ))}
      </ul>
      <div className={`boss-row ${dungeon.boss.done ? 'done' : ''}`}>
        <span className="boss-label">☠ БОСС: {dungeon.boss.title}</span>
        <span className="task-xp">+{dungeon.boss.xp} XP</span>
        {!dungeon.boss.done && (
          <button
            className="btn danger"
            disabled={!stepsDone}
            title={stepsDone ? '' : 'Сначала закрой все шаги'}
            onClick={() => dispatch({ type: 'DEFEAT_BOSS', id: dungeon.id })}
          >
            Победить
          </button>
        )}
      </div>
    </Panel>
  );
}

export default function DungeonsScreen() {
  const { state, dispatch } = useApp();
  const { dungeons } = state.data;
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [stat, setStat] = useState('study');
  const [steps, setSteps] = useState([{ title: '', xp: 80 }]);
  const [bossTitle, setBossTitle] = useState('');
  const [bossXP, setBossXP] = useState(400);

  function create(e) {
    e.preventDefault();
    const validSteps = steps.filter((s) => s.title.trim());
    if (!name.trim() || !bossTitle.trim() || validSteps.length === 0) return;
    dispatch({
      type: 'ADD_DUNGEON',
      name: name.trim(),
      stat,
      steps: validSteps.map((s) => ({ title: s.title.trim(), xp: Number(s.xp) || 0 })),
      boss: { title: bossTitle.trim(), xp: Number(bossXP) || 0 },
    });
    setName('');
    setSteps([{ title: '', xp: 80 }]);
    setBossTitle('');
    setShowForm(false);
  }

  const active = dungeons.filter((d) => d.status === 'active');
  const cleared = dungeons.filter((d) => d.status === 'cleared');

  return (
    <div className="screen">
      {active.length === 0 && !showForm && (
        <p className="empty">Врата закрыты. Открой данж под крупную цель — диплом, длинную игру, большой проект.</p>
      )}
      {active.map((d) => (
        <DungeonCard key={d.id} dungeon={d} />
      ))}

      {showForm ? (
        <Panel title="ОТКРЫТЬ ВРАТА">
          <form className="dungeon-form" onSubmit={create}>
            <div className="task-form-row">
              <input className="input grow" placeholder="Название данжа (напр. «Защита магистерской»)" value={name} onChange={(e) => setName(e.target.value)} />
              <select className="select" value={stat} onChange={(e) => setStat(e.target.value)}>
                {Object.entries(STATS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            {steps.map((s, i) => (
              <div className="task-form-row" key={i}>
                <input
                  className="input grow"
                  placeholder={`Шаг ${i + 1}`}
                  value={s.title}
                  onChange={(e) => setSteps(steps.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
                />
                <input
                  className="input xp-input"
                  type="number"
                  min="0"
                  value={s.xp}
                  onChange={(e) => setSteps(steps.map((x, idx) => (idx === i ? { ...x, xp: e.target.value } : x)))}
                />
                <span className="dim">XP</span>
                {steps.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="link-btn" onClick={() => setSteps([...steps, { title: '', xp: 80 }])}>
              + шаг
            </button>
            <div className="task-form-row boss-form">
              <span className="boss-label">☠</span>
              <input className="input grow" placeholder="Босс (финальный этап)" value={bossTitle} onChange={(e) => setBossTitle(e.target.value)} />
              <input className="input xp-input" type="number" min="0" value={bossXP} onChange={(e) => setBossXP(e.target.value)} />
              <span className="dim">XP</span>
            </div>
            <div className="plan-actions">
              <button className="btn primary" type="submit">Открыть врата</button>
              <button className="btn" type="button" onClick={() => setShowForm(false)}>Отмена</button>
            </div>
          </form>
        </Panel>
      ) : (
        <button className="btn primary big-add" onClick={() => setShowForm(true)}>
          ＋ ДАНЖ
        </button>
      )}

      {cleared.length > 0 && (
        <>
          <h3 className="section-sub">ПРОЙДЕННЫЕ ВРАТА</h3>
          {cleared.map((d) => (
            <DungeonCard key={d.id} dungeon={d} />
          ))}
        </>
      )}
    </div>
  );
}
