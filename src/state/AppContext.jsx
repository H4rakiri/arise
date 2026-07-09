import { createContext, useContext, useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { reducer } from './reducer.js';
import { defaultData } from '../lib/defaultData.js';
import { loadCachedData, saveCachedData, loadToken, saveToken, loadSha, saveSha } from '../lib/storage.js';
import { fetchRemoteData, fetchRemoteSha, pushRemoteData } from '../lib/github.js';
import { CONFIG } from '../config.js';
import { playSound } from '../lib/sound.js';

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    data: loadCachedData() || defaultData(),
    events: [],
    dirty: 0,
  }));
  // idle | syncing | synced | error | local (нет токена/репо)
  const [syncStatus, setSyncStatus] = useState('local');
  const [token, setTokenState] = useState(loadToken);
  const shaRef = useRef(loadSha());
  const timerRef = useRef(null);
  const pushingRef = useRef(false);
  const dataRef = useRef(state.data);
  dataRef.current = state.data;

  const setToken = useCallback((t) => {
    setTokenState(t);
    saveToken(t);
  }, []);

  // Обслуживание серии/заморозок при старте
  useEffect(() => {
    dispatch({ type: 'INIT_DATA', data: dataRef.current, markDirty: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Локальный кеш — при каждом изменении (§3.2)
  useEffect(() => {
    saveCachedData(state.data);
  }, [state.data]);

  // Звуки событий (§11, опционально)
  useEffect(() => {
    const last = state.events[state.events.length - 1];
    if (!last) return;
    const enabled = state.data.settings.soundEnabled;
    const map = {
      xp: 'xp', 'new-quest': 'quest', levelup: 'levelup', rankup: 'rankup',
      card: 'card', freeze: 'freeze', streak: 'xp', 'dungeon-clear': 'levelup',
      drop: 'card', identified: 'quest',
    };
    if (map[last.kind]) playSound(map[last.kind], enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.events.length]);

  const repo = state.data.settings.githubRepo;
  const canSync = Boolean(repo && token);

  // --- pull при загрузке (§3.1): удалёнка — источник истины между машинами ---
  useEffect(() => {
    if (!canSync) {
      setSyncStatus('local');
      return;
    }
    let cancelled = false;
    (async () => {
      setSyncStatus('syncing');
      try {
        const remote = await fetchRemoteData(repo, token);
        if (cancelled) return;
        if (remote) {
          shaRef.current = remote.sha;
          saveSha(remote.sha);
          // Сохраняем локальные настройки соединения, если на удалёнке пусто
          if (!remote.data.settings.githubRepo) remote.data.settings.githubRepo = repo;
          dispatch({ type: 'REMOTE_DATA', data: remote.data });
        } else {
          // Файла ещё нет — создаём первым коммитом
          const sha = await pushRemoteData(repo, token, dataRef.current, null, 'arise: init data.json');
          shaRef.current = sha;
          saveSha(sha);
        }
        setSyncStatus('synced');
      } catch (e) {
        if (!cancelled) {
          setSyncStatus('error');
          dispatch({ type: 'PUSH_EVENT', event: { kind: 'sync-error', message: String(e.message || e) } });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, token]);

  // --- push с дебаунсом при изменениях (§3.3) ---
  useEffect(() => {
    if (state.dirty === 0 || !canSync) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (pushingRef.current) return;
      pushingRef.current = true;
      setSyncStatus('syncing');
      try {
        // Защита от конфликтов (§3.4): pull-before-write.
        // Если на удалёнке версия новее — last-write-wins с предупреждением.
        const remoteSha = await fetchRemoteSha(repo, token);
        if (remoteSha && shaRef.current && remoteSha !== shaRef.current) {
          dispatch({
            type: 'PUSH_EVENT',
            event: { kind: 'sync-conflict', message: 'На удалёнке была более новая версия — перезаписана (last-write-wins)' },
          });
        }
        const newSha = await pushRemoteData(repo, token, dataRef.current, remoteSha);
        shaRef.current = newSha;
        saveSha(newSha);
        setSyncStatus('synced');
      } catch (e) {
        setSyncStatus('error');
        dispatch({ type: 'PUSH_EVENT', event: { kind: 'sync-error', message: String(e.message || e) } });
      } finally {
        pushingRef.current = false;
      }
    }, CONFIG.SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dirty]);

  const value = { state, dispatch, syncStatus, token, setToken, canSync };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
