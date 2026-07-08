import { useState } from 'react';
import Panel from './Panel.jsx';
import TaskForm from './TaskForm.jsx';
import PlanInput from './PlanInput.jsx';
import { useApp } from '../state/AppContext.jsx';
import { STATS } from '../config.js';

const SOURCE_MARK = { manual: '', heuristic: '·H', llm: '·AI' };

export default function QuestsScreen() {
  const { state, dispatch } = useApp();
  const [showDone, setShowDone] = useState(false);
  const todo = state.data.tasks.filter((t) => t.status === 'todo');
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
                <span className={`tag stat-${t.stat}`}>{STATS[t.stat]?.label}</span>
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
                  <span className={`tag stat-${t.stat}`}>{STATS[t.stat]?.label}</span>
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
