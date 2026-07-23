import { useRef, useState } from 'react';
import Panel from './Panel.jsx';
import HoloCard from './HoloCard.jsx';
import { useApp } from '../state/AppContext.jsx';
import { RARITY_LABELS } from '../config.js';
import { gameRarity } from '../lib/xp.js';
import { getStatsMeta } from '../lib/stats.js';
import { fileToCardImage } from '../lib/image.js';

// Коллекции (§4.2, §6.5): хобби — награда, а не обязаловка.
// Карты не дают XP статам (по умолчанию, §11).

// Кнопка-обёртка над скрытым file input: выбор → сжатие → dataURL
function ImagePick({ onImage, label = 'Арт…', className = '' }) {
  const inputRef = useRef(null);
  const { dispatch } = useApp();

  async function handle(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onImage(await fileToCardImage(file));
    } catch (err) {
      dispatch({ type: 'PUSH_EVENT', event: { kind: 'sync-error', message: err.message } });
    }
  }

  return (
    <>
      <button type="button" className={`btn ${className}`} onClick={() => inputRef.current?.click()}>
        {label}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handle} />
    </>
  );
}

function CardActions({ collection, card }) {
  const { dispatch } = useApp();
  return (
    <>
      <ImagePick
        className="mini"
        label={card.image ? 'Сменить арт' : '+ Арт'}
        onImage={(image) => dispatch({ type: 'SET_CARD_IMAGE', collection, id: card.id, image })}
      />
      <button
        className="btn mini danger"
        title="Удалить карту"
        onClick={() => dispatch({ type: 'DELETE_CARD', collection, id: card.id })}
      >
        ✕
      </button>
    </>
  );
}

function GamesTab() {
  const { state, dispatch } = useApp();
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState(20);
  const [image, setImage] = useState(null);

  function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    dispatch({ type: 'ADD_GAME_CARD', title: title.trim(), hoursWeight: Number(hours) || 0, image });
    setTitle('');
    setImage(null);
  }

  return (
    <>
      <form className="task-form-row card-add" onSubmit={add}>
        <input className="input grow" placeholder="Пройденная игра…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input xp-input" type="number" min="0" value={hours} onChange={(e) => setHours(e.target.value)} title="«Вес» игры — часы/масштаб" />
        <span className="dim">ч ≈ {RARITY_LABELS[gameRarity(Number(hours) || 0)]}</span>
        <ImagePick label={image ? 'Арт ✓' : 'Арт…'} onImage={setImage} />
        <button className="btn primary" type="submit" disabled={!title.trim()}>Дроп!</button>
      </form>
      <div className="card-grid">
        {state.data.cards.games.map((c) => (
          <HoloCard key={c.id} rarity={c.rarity} image={c.image} actions={<CardActions collection="games" card={c} />}>
            <div className="card-name">{c.title}</div>
            <div className="card-meta">
              <span className="card-sub">{c.hoursWeight} ч</span>
              <span className={`card-rarity r-${c.rarity}`}>{RARITY_LABELS[c.rarity]}</span>
            </div>
          </HoloCard>
        ))}
        {state.data.cards.games.length === 0 && <p className="empty">Пройди игру — получи карту.</p>}
      </div>
    </>
  );
}

function CarsTab() {
  const { state, dispatch } = useApp();
  const [car, setCar] = useState('');
  const [build, setBuild] = useState('');
  const [sim, setSim] = useState('');
  const [rarity, setRarity] = useState('rare');
  const [image, setImage] = useState(null);

  function add(e) {
    e.preventDefault();
    if (!car.trim()) return;
    dispatch({ type: 'ADD_CAR_CARD', car: car.trim(), build: build.trim(), sim: sim.trim(), rarity, image });
    setCar('');
    setBuild('');
    setSim('');
    setImage(null);
  }

  return (
    <>
      <form className="task-form car-add" onSubmit={add}>
        <div className="task-form-row">
          <input className="input grow" placeholder="Машина (напр. Nissan GT-R R35)" value={car} onChange={(e) => setCar(e.target.value)} />
          {/* Редкость для тачек задаётся вручную (§5.4) */}
          <select className="select" value={rarity} onChange={(e) => setRarity(e.target.value)}>
            {Object.entries(RARITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="task-form-row">
          <input className="input grow" placeholder="Билд/сетап" value={build} onChange={(e) => setBuild(e.target.value)} />
          <input className="input grow" placeholder="Симулятор" value={sim} onChange={(e) => setSim(e.target.value)} />
          <ImagePick label={image ? 'Арт ✓' : 'Арт…'} onImage={setImage} />
          <button className="btn primary" type="submit" disabled={!car.trim()}>Дроп!</button>
        </div>
      </form>
      <div className="card-grid">
        {state.data.cards.cars.map((c) => (
          <HoloCard key={c.id} rarity={c.rarity} image={c.image} actions={<CardActions collection="cars" card={c} />}>
            <div className="card-name">{c.car}</div>
            <div className="card-sub">{c.build}</div>
            <div className="card-meta">
              <span className="card-sub dim">{c.sim}</span>
              <span className={`card-rarity r-${c.rarity}`}>{RARITY_LABELS[c.rarity]}</span>
            </div>
          </HoloCard>
        ))}
        {state.data.cards.cars.length === 0 && <p className="empty">Доведи сетап — получи карту.</p>}
      </div>
    </>
  );
}

// Обложка игры Steam: портретный капсюль → иконка (fallback внутри HoloCard)
const steamArt = (appid) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;

const fmtHours = (h) => (h >= 1 ? `${Math.round(h)} ч` : h > 0 ? `${Math.round(h * 60)} мин` : '—');

function SteamTab() {
  const { state, dispatch, steamLibrary, canSync } = useApp();
  const META = getStatsMeta(state.data);
  const overlay = state.data.steam?.overlay || {};
  const steamStat = state.data.steam?.stat || '';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | completed | played
  const [showHidden, setShowHidden] = useState(false);
  const [limit, setLimit] = useState(60);

  if (!steamLibrary) {
    return (
      <p className="empty">
        {canSync
          ? 'Библиотека Steam ещё не загружена. Настрой синхронизацию Steam в разделе СИСТЕМА — бот создаст steam.json, и игры появятся здесь.'
          : 'Подключи синхронизацию с GitHub во вкладке СИСТЕМА, затем настрой Steam — и библиотека подтянется сюда.'}
      </p>
    );
  }

  const games = steamLibrary.games || [];
  const q = query.trim().toLowerCase();
  const shown = games.filter((g) => {
    const ov = overlay[g.appid] || {};
    if (ov.hidden && !showHidden) return false;
    if (filter === 'completed' && !ov.completed) return false;
    if (filter === 'played' && !(g.hours > 0)) return false;
    if (q && !g.name.toLowerCase().includes(q)) return false;
    return true;
  });
  const completedCount = games.filter((g) => overlay[g.appid]?.completed).length;
  const visible = shown.slice(0, limit);

  const updated = steamLibrary.updatedAt
    ? new Date(steamLibrary.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : '';

  return (
    <>
      <div className="steam-toolbar">
        <input
          className="input grow"
          placeholder="Поиск по названию…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(60);
          }}
        />
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Все ({games.length})</option>
          <option value="played">С наигранными</option>
          <option value="completed">Пройденные ({completedCount})</option>
        </select>
        <label className="steam-check" title="Показывать скрытые игры">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
          скрытые
        </label>
      </div>
      <div className="steam-meta-row">
        <span className="dim">
          Пройдено <b>{completedCount}</b> из {games.length}
          {updated && ` · обновлено ${updated}`}
        </span>
        <label className="steam-stat-pick" title="В какой атрибут идёт опыт за пройденные игры">
          Опыт →
          <select className="select mini" value={steamStat} onChange={(e) => dispatch({ type: 'SET_STEAM_STAT', key: e.target.value })}>
            <option value="">авто (Хобби)</option>
            {Object.entries(META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card-grid">
        {visible.map((g) => {
          const ov = overlay[g.appid] || {};
          const rarity = gameRarity(g.hours);
          return (
            <HoloCard
              key={g.appid}
              rarity={rarity}
              className={ov.completed ? 'steam-done' : 'steam-todo'}
              image={ov.image || steamArt(g.appid)}
              fallbackImage={g.icon || null}
              actions={
                <>
                  <button
                    className={`btn mini ${ov.completed ? 'primary' : ''}`}
                    title="Отметить прохождение (+опыт)"
                    onClick={() => dispatch({ type: 'TOGGLE_STEAM_COMPLETE', appid: g.appid, name: g.name, hours: g.hours })}
                  >
                    {ov.completed ? '✓ Пройдена' : 'Пройдена?'}
                  </button>
                  <button
                    className="btn mini"
                    title={ov.hidden ? 'Вернуть в библиотеку' : 'Скрыть игру'}
                    onClick={() => dispatch({ type: 'TOGGLE_STEAM_HIDDEN', appid: g.appid })}
                  >
                    {ov.hidden ? '↺' : '⊘'}
                  </button>
                </>
              }
            >
              <div className="card-name">{g.name}</div>
              <div className="card-meta">
                <span className="card-sub">{fmtHours(g.hours)}</span>
                <span className={`card-rarity r-${rarity}`}>{RARITY_LABELS[rarity]}</span>
              </div>
            </HoloCard>
          );
        })}
      </div>
      {shown.length === 0 && <p className="empty">Ничего не найдено.</p>}
      {shown.length > limit && (
        <button className="btn" style={{ margin: '14px auto 0', display: 'block' }} onClick={() => setLimit((n) => n + 60)}>
          Показать ещё ({shown.length - limit})
        </button>
      )}
    </>
  );
}

export default function CollectionScreen() {
  const [tab, setTab] = useState('games');
  return (
    <div className="screen">
      <Panel title="КОЛЛЕКЦИЯ">
        <div className="tabs">
          <button className={`tab-btn ${tab === 'games' ? 'active' : ''}`} onClick={() => setTab('games')}>
            Игры
          </button>
          <button className={`tab-btn ${tab === 'steam' ? 'active' : ''}`} onClick={() => setTab('steam')}>
            Steam
          </button>
          <button className={`tab-btn ${tab === 'cars' ? 'active' : ''}`} onClick={() => setTab('cars')}>
            Тачки
          </button>
        </div>
        {tab === 'games' && <GamesTab />}
        {tab === 'steam' && <SteamTab />}
        {tab === 'cars' && <CarsTab />}
      </Panel>
    </div>
  );
}
