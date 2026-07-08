import { useState } from 'react';
import Panel from './Panel.jsx';
import { useApp } from '../state/AppContext.jsx';
import { isWebGPUAvailable } from '../llm/planner.js';

export default function SettingsScreen() {
  const { state, dispatch, token, setToken, syncStatus } = useApp();
  const { settings, profile } = state.data;
  const [repoInput, setRepoInput] = useState(settings.githubRepo);
  const [tokenInput, setTokenInput] = useState(token);

  function saveSync(e) {
    e.preventDefault();
    dispatch({ type: 'UPDATE_SETTINGS', patch: { githubRepo: repoInput.trim() } });
    setToken(tokenInput.trim());
  }

  return (
    <div className="screen">
      <Panel title="ОХОТНИК">
        <div className="settings-row">
          <label>Имя</label>
          <input
            className="input"
            value={profile.name}
            onChange={(e) => dispatch({ type: 'UPDATE_PROFILE', patch: { name: e.target.value } })}
          />
        </div>
        <div className="settings-row">
          <label>Титул</label>
          <input
            className="input"
            value={profile.title}
            onChange={(e) => dispatch({ type: 'UPDATE_PROFILE', patch: { title: e.target.value } })}
          />
        </div>
      </Panel>

      <Panel title="СИНХРОНИЗАЦИЯ">
        <p className="dim small">
          Данные живут в одном <code>data.json</code> приватного репозитория. Каждое сохранение — коммит
          через GitHub API: полная история как в git. Токен хранится только в localStorage этой машины.
        </p>
        <form onSubmit={saveSync}>
          <div className="settings-row">
            <label>Репозиторий</label>
            <input className="input" placeholder="user/arise-data" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} />
          </div>
          <div className="settings-row">
            <label>Токен (PAT)</label>
            <input className="input" type="password" placeholder="github_pat_… (scope: contents этого репо)" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
          </div>
          <div className="plan-actions">
            <button className="btn primary" type="submit">Подключить</button>
            <span className={`sync-badge sync-${syncStatus}`}>{syncStatus}</span>
          </div>
        </form>
      </Panel>

      <Panel title="НЕЙРОСЕТЬ">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.llmEnabled}
            onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', patch: { llmEnabled: e.target.checked } })}
          />
          <span>Нейронка в браузере (WebLLM + WebGPU)</span>
        </label>
        <p className="dim small">
          {isWebGPUAvailable()
            ? 'WebGPU доступен ✓ Модель (~1 ГБ) скачается один раз при первом разборе и закешируется.'
            : 'WebGPU недоступен в этом браузере — разбор плана работает на эвристике.'}
        </p>
        <div className="settings-row">
          <label>Модель</label>
          <input
            className="input"
            value={settings.llmModel}
            onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', patch: { llmModel: e.target.value } })}
          />
        </div>
      </Panel>

      <Panel title="ЗВУК И ТЕМА">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={!!settings.soundEnabled}
            onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', patch: { soundEnabled: e.target.checked } })}
          />
          <span>Звуки Системы (level-up, new quest, card drop)</span>
        </label>
        <div className="settings-row">
          <label>Тема</label>
          <select
            className="select"
            value={settings.theme}
            onChange={(e) => dispatch({ type: 'UPDATE_SETTINGS', patch: { theme: e.target.value } })}
          >
            <option value="arise-dark">arise-dark</option>
          </select>
        </div>
      </Panel>
    </div>
  );
}
