import { useState } from 'react';
import { useApp } from '../state/AppContext.jsx';
import { CONFIG, STATS } from '../config.js';
import { taskXP } from '../lib/xp.js';
import { parsePlanHeuristic } from '../lib/heuristic.js';
import { isWebGPUAvailable, parsePlanLLM } from '../llm/planner.js';

// «План дня» (Фаза 5): свободный текст → черновик задач → просмотр/правка → принять.
// LLM — надстройка: выключена или недоступна → эвристика, всё работает.
export default function PlanInput() {
  const { state, dispatch } = useApp();
  const { llmEnabled, llmModel } = state.data.settings;
  const [text, setText] = useState('');
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState('heuristic');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  async function parse() {
    const input = text.trim();
    if (!input) return;
    if (llmEnabled && isWebGPUAvailable()) {
      setBusy(true);
      setProgress('Загрузка модели…');
      try {
        const tasks = await parsePlanLLM(input, llmModel, setProgress);
        setDraft(tasks);
        setSource('llm');
        return;
      } catch (e) {
        dispatch({ type: 'PUSH_EVENT', event: { kind: 'sync-error', message: `LLM: ${e.message}. Использую эвристику.` } });
      } finally {
        setBusy(false);
        setProgress('');
      }
    }
    setDraft(parsePlanHeuristic(input));
    setSource('heuristic');
  }

  function patchDraft(i, field, value) {
    setDraft(draft.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  function accept() {
    const tasks = draft.filter((t) => t.title.trim());
    if (tasks.length === 0) return;
    dispatch({ type: 'ADD_TASKS_BULK', tasks, source });
    setDraft(null);
    setText('');
  }

  return (
    <div className="plan-input">
      <textarea
        className="input plan-textarea"
        rows={3}
        placeholder={'План дня в свободной форме…\nнапр.: «с утра созвон, 30 минут японского, вечером баскетбол»'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="plan-actions">
        <button className="btn" onClick={parse} disabled={busy || !text.trim()}>
          {busy ? 'РАЗБОР…' : llmEnabled && isWebGPUAvailable() ? '⚡ Разобрать (LLM)' : 'Разобрать'}
        </button>
        {progress && <span className="dim plan-progress">{progress}</span>}
      </div>

      {draft && (
        <div className="plan-draft">
          <div className="plan-draft-head">
            Черновик ({source === 'llm' ? 'нейронка' : 'эвристика'}) — проверь и прими:
          </div>
          {draft.map((t, i) => (
            <div className="plan-draft-row" key={i}>
              <input
                className="input"
                value={t.title}
                onChange={(e) => patchDraft(i, 'title', e.target.value)}
              />
              <select className="select" value={t.stat} onChange={(e) => patchDraft(i, 'stat', e.target.value)}>
                {Object.entries(STATS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select className="select" value={t.difficulty} onChange={(e) => patchDraft(i, 'difficulty', e.target.value)}>
                {Object.entries(CONFIG.DIFFICULTY).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select className="select" value={t.time} onChange={(e) => patchDraft(i, 'time', e.target.value)}>
                {Object.entries(CONFIG.TIME).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <span className="xp-preview">+{taskXP(t.difficulty, t.time)}</span>
              <button className="icon-btn" title="Убрать" onClick={() => setDraft(draft.filter((_, idx) => idx !== i))}>
                ✕
              </button>
            </div>
          ))}
          <div className="plan-actions">
            <button className="btn primary" onClick={accept}>Принять квесты ({draft.length})</button>
            <button className="btn" onClick={() => setDraft(null)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
