import { useState } from 'react';
import { CONFIG, STATS } from '../config.js';
import { taskXP } from '../lib/xp.js';
import { useApp } from '../state/AppContext.jsx';
import TimeInput from './TimeInput.jsx';

// Быстрое добавление (§6.1): название, стат, сложность, время вручную
// (минуты/часы) и опциональный дедлайн. XP-превью считается на лету.
export default function TaskForm({ onAdded }) {
  const { dispatch } = useApp();
  const [title, setTitle] = useState('');
  const [stat, setStat] = useState('work');
  const [difficulty, setDifficulty] = useState('normal');
  const [minutes, setMinutes] = useState(30);
  const [deadline, setDeadline] = useState('');

  const preview = taskXP(difficulty, minutes);

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    dispatch({ type: 'ADD_TASK', title: t, stat, difficulty, time: minutes, deadline, source: 'manual' });
    setTitle('');
    setDeadline('');
    onAdded?.();
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <input
        className="input task-title-input"
        placeholder="Новый квест…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
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
        <TimeInput minutes={minutes} onChange={setMinutes} />
      </div>
      <div className="task-form-row">
        <label className="deadline-field">
          <span className="dim">Дедлайн</span>
          <input
            className="input"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>
        <span className="xp-preview">+{preview} XP</span>
        <button className="btn primary" type="submit" disabled={!title.trim()}>
          Принять
        </button>
      </div>
    </form>
  );
}
