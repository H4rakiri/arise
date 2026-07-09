import { useMemo, useState } from 'react';
import Panel from './Panel.jsx';
import XPBar from './XPBar.jsx';
import TaskForm from './TaskForm.jsx';
import { useApp } from '../state/AppContext.jsx';
import { CONFIG, STATS } from '../config.js';
import { levelFromXP } from '../lib/xp.js';
import { todayKey, daysBetween } from '../lib/util.js';

// Дни с последней активности по стату — для «остывания» полоски (§4.1).
// Считается из выполненных задач и дейликов — без отдельного поля в data.json.
function lastActivityDays(data, statKey) {
  let last = null;
  for (const t of data.tasks) {
    if (t.stat === statKey && t.completedAt) {
      const d = t.completedAt.slice(0, 10);
      if (!last || d > last) last = d;
    }
  }
  for (const daily of data.dailies) {
    if (daily.stat !== statKey) continue;
    for (const day of Object.keys(daily.history)) {
      if (!last || day > last) last = day;
    }
  }
  if (!last) return null;
  return daysBetween(last, todayKey());
}

export default function StatusWindow({ goTo }) {
  const { state, dispatch } = useApp();
  const { data } = state;
  const { profile, stats, streak } = data;
  const [showForm, setShowForm] = useState(false);

  const overall = levelFromXP(profile.totalXP);
  const today = todayKey();
  // Суммарные бонусы экипированных предметов по статам — «(+n)» в атрибутах
  const equipBonuses = useMemo(() => {
    const sums = {};
    for (const item of data.inventory?.items ?? []) {
      if (item.equipped) sums[item.bonus.stat] = (sums[item.bonus.stat] || 0) + item.bonus.value;
    }
    return sums;
  }, [data]);
  const coolDays = useMemo(() => {
    const map = {};
    for (const key of Object.keys(STATS)) map[key] = lastActivityDays(data, key);
    return map;
  }, [data]);

  return (
    <div className="screen status-screen">
      <Panel title="СТАТУС" className="profile-panel">
        <div className="profile-head">
          <div className="level-block">
            <span className="level-caption">LEVEL</span>
            <span className="level-num">{profile.level}</span>
          </div>
          <div className="profile-info">
            <div className="profile-name">{profile.name}</div>
            <div className="profile-title">{profile.title}</div>
            <div className="profile-sub dim">{profile.totalXP.toLocaleString('ru')} XP всего</div>
          </div>
          <div className={`rank-badge rank-${profile.rank}`}>
            <span className="rank-caption">RANK</span>
            <span className="rank-letter">{profile.rank}</span>
          </div>
        </div>
        <div className="exp-row">
          <span className="exp-label">EXP</span>
          <XPBar into={overall.into} need={overall.need} />
          <span className="exp-nums">{overall.into.toLocaleString('ru')} / {overall.need.toLocaleString('ru')}</span>
        </div>
      </Panel>

      <Panel title="АТРИБУТЫ">
        <div className="stats-list">
          {Object.entries(STATS).map(([key, meta]) => {
            const s = stats[key];
            const lv = levelFromXP(s.xp);
            const days = coolDays[key];
            const cool = days === null || days > CONFIG.STAT_COOL_DAYS;
            const bonus = equipBonuses[key] || 0;
            return (
              <div className="stat-row" key={key}>
                <span className="stat-name">
                  {meta.label} <span className="stat-kanji">{meta.jp}</span>
                </span>
                <XPBar into={lv.into} need={lv.need} cool={cool} />
                <span className="stat-level">
                  {s.level}
                  {bonus > 0 && <em className="stat-bonus" title="Бонус экипировки">+{bonus}</em>}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="ЕЖЕДНЕВНЫЕ КВЕСТЫ">
        {data.dailies.length === 0 ? (
          <p className="empty">Ежедневных квестов нет. Система ждёт.</p>
        ) : (
          <ul className="daily-mini">
            {data.dailies.map((d) => (
              <li key={d.id} className={d.history[today] ? 'done' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!d.history[today]}
                    onChange={() => dispatch({ type: 'TOGGLE_DAILY', id: d.id })}
                  />
                  <span>{d.title}</span>
                  <span className="dim">+{d.xp} XP</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="streak-line">
          Серия: <b>{streak.current}</b> дн. · рекорд {streak.best} · заморозки ×{streak.freezes}
        </div>
      </Panel>

      {showForm ? (
        <Panel title="НОВЫЙ КВЕСТ">
          <TaskForm onAdded={() => setShowForm(false)} />
        </Panel>
      ) : (
        <button className="btn primary big-add" onClick={() => setShowForm(true)}>
          ＋ КВЕСТ
        </button>
      )}

      <button className="link-btn" onClick={() => goTo('quests')}>
        все квесты →
      </button>
    </div>
  );
}
