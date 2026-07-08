import { useState } from 'react';
import { useApp } from './state/AppContext.jsx';
import StatusWindow from './components/StatusWindow.jsx';
import QuestsScreen from './components/QuestsScreen.jsx';
import DailiesScreen from './components/DailiesScreen.jsx';
import DungeonsScreen from './components/DungeonsScreen.jsx';
import CollectionScreen from './components/CollectionScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import Notifications from './components/Notifications.jsx';

const SCREENS = [
  { id: 'status', label: 'СТАТУС', component: StatusWindow },
  { id: 'quests', label: 'КВЕСТЫ', component: QuestsScreen },
  { id: 'dailies', label: 'ДЕЙЛИКИ', component: DailiesScreen },
  { id: 'dungeons', label: 'ДАНЖИ', component: DungeonsScreen },
  { id: 'collection', label: 'КАРТЫ', component: CollectionScreen },
  { id: 'settings', label: 'СИСТЕМА', component: SettingsScreen },
];

const SYNC_LABELS = {
  local: 'LOCAL',
  syncing: 'SYNC…',
  synced: 'SYNCED',
  error: 'SYNC ERR',
  idle: '',
};

export default function App() {
  const [screen, setScreen] = useState('status');
  const { syncStatus } = useApp();
  const Active = SCREENS.find((s) => s.id === screen)?.component || StatusWindow;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-logo glitch" data-text="「ARISE」">「ARISE」</h1>
        <span className={`sync-badge sync-${syncStatus}`}>{SYNC_LABELS[syncStatus]}</span>
      </header>
      <nav className="app-nav">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            className={`nav-btn ${screen === s.id ? 'active' : ''}`}
            onClick={() => setScreen(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <main className="app-main" key={screen}>
        <Active goTo={setScreen} />
      </main>
      <Notifications />
    </div>
  );
}
