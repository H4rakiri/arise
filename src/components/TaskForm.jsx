import { useState } from 'react';
import { CONFIG, STATS } from '../config.js';
import { taskXP } from '../lib/xp.js';
import { useApp } from '../state/AppContext.jsx';

// Быстрое добавление (§6.1): название + три компактных селектора,
// XP-превью считается на лету.
export default function TaskForm({ onAdded }) {
  const { dispatch } = useApp();
  const [title, setTitle] = useState('');
  const [stat, setStat] = useState('work');
  const [difficulty, setDifficulty] = useState('normal');
  const [time, setTime] = useState('medium');

  const preview = taskXP(difficulty, time);

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    dispatch({ type: 'ADD_TASK', title: t, stat, difficulty, time, source: 'manual' });
    setTitle('');
    onAdded?.();
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <input
        className="input task-title-input"
        placeholder="Новый квест…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <div className="task-form-row">
        <select className="select" value={stat} onChange={(e) => setStat(e.target.value)}>
          {Object.entries(STATS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          {Object.entries(CONFIG.DIFFICULTY).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="select" value={time} onChange={(e) => setTime(e.target.value)}>
          {Object.entries(CONFIG.TIME).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="xp-preview">+{preview} XP</span>
        <button className="btn primary" type="submit" disabled={!title.trim()}>
          Принять
        </button>
      </div>
    </form>
  );
}
