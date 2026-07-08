import { useRef, useState } from 'react';
import Panel from './Panel.jsx';
import HoloCard from './HoloCard.jsx';
import { useApp } from '../state/AppContext.jsx';
import { RARITY_LABELS } from '../config.js';
import { gameRarity } from '../lib/xp.js';
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

export default function CollectionScreen() {
  const [tab, setTab] = useState('games');
  return (
    <div className="screen">
      <Panel title="КОЛЛЕКЦИЯ">
        <div className="tabs">
          <button className={`tab-btn ${tab === 'games' ? 'active' : ''}`} onClick={() => setTab('games')}>
            Игры
          </button>
          <button className={`tab-btn ${tab === 'cars' ? 'active' : ''}`} onClick={() => setTab('cars')}>
            Тачки
          </button>
        </div>
        {tab === 'games' ? <GamesTab /> : <CarsTab />}
      </Panel>
    </div>
  );
}
