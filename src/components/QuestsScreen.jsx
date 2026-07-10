import { useState } from 'react';
import Panel from './Panel.jsx';
import TaskForm from './TaskForm.jsx';
import PlanInput from './PlanInput.jsx';
import { useApp } from '../state/AppContext.jsx';
import { getStatsMeta } from '../lib/stats.js';
import { deadlineInfo } from '../lib/util.js';

const SOURCE_MARK = { manual: '', heuristic: '·H', llm: '·AI' };

// Бейдж дедлайна: «⌛ 15.07 · 3 дн.», подсветка «сегодня» и просрочки
function DeadlineBadge({ deadline }) {
  const info = deadlineInfo(deadline);
  if (!info) return null;
  const cls = info.left < 0 ? 'overdue' : info.left <= 1 ? 'soon' : '';
  const note = info.left < 0 ? `просрочен ${-info.left} дн.` : info.left === 0 ? 'сегодня' : info.left === 1 ? 'завтра' : `${info.left} дн.`;
  return (
    <span className={`deadline-badge ${cls}`} title={`Дедлайн: ${deadline}`}>
      ⌛ {info.label} · {note}
    </span>
  );
}

// Просроченные и горящие — выше, дальше по близости дедлайна
function sortByDeadline(a, b) {
  if (!a.deadline && !b.deadline) return 0;
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return a.deadline.localeCompare(b.deadline);
}

export default function QuestsScreen() {
  const { state, dispatch } = useApp();
  const [showDone, setShowDone] = useState(false);
  const META = getStatsMeta(state.data);
  const todo = state.data.tasks.filter((t) => t.status === 'todo').sort(sortByDeadline);
  const done = state.data.tasks.filter((t) => t.status === 'done');

  return (
    <div className="screen">
      <Panel title="НОВЫЙ КВЕСТ">
        <TaskForm />
      </Panel>

      <Panel title="ПЛАН ДНЯ">
        <PlanInput />
      </Panel>

      <Panel title={`ЖУРНАЛ КВЕСТОВ · ${todo.length}`}>
        {todo.length === 0 ? (
          <p className="empty">Активных квестов нет. Добавь первый.</p>
        ) : (
          <ul className="task-list">
            {todo.map((t) => (
              <li className="task-item" key={t.id}>
                <button
                  className="task-complete"
                  title="Завершить"
                  onClick={() => dispatch({ type: 'COMPLETE_TASK', id: t.id })}
                >
                  ◇
                </button>
                <span className="task-title">{t.title}</span>
                <DeadlineBadge deadline={t.deadline} />
                <span className={`tag stat-${t.stat}`}>{META[t.stat]?.label ?? t.stat}</span>
                <span className="task-xp">+{t.xp} XP</span>
                <span className="dim">{SOURCE_MARK[t.source]}</span>
                <button className="icon-btn" title="Удалить" onClick={() => dispatch({ type: 'DELETE_TASK', id: t.id })}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {done.length > 0 && (
        <Panel title={`ВЫПОЛНЕНО · ${done.length}`} className="cleared-panel">
          <button className="link-btn" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'скрыть' : 'показать'}
          </button>
          {showDone && (
            <ul className="task-list done-list">
              {done.map((t) => (
                <li className="task-item done" key={t.id}>
                  <span className="task-complete done">◆</span>
                  <span className="task-title">{t.title}</span>
                  <span className={`tag stat-${t.stat}`}>{META[t.stat]?.label ?? t.stat}</span>
                  <span className="task-xp">+{t.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
