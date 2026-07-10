import { useRef, useState } from 'react';
import Panel from './Panel.jsx';
import { useApp } from '../state/AppContext.jsx';
import { ITEM_TYPES, RARITY_LABELS } from '../config.js';
import { getStatsMeta } from '../lib/stats.js';
import { localLore } from '../lib/loot.js';
import { SLOT_ICONS, Silhouette } from './SlotIcons.jsx';
import { isWebGPUAvailable, generateItemLore, cancelLLM } from '../llm/planner.js';

// Инвентарь: предметы падают с задач неопознанными; опознание генерирует
// лор (нейронкой, если включена, иначе локальными таблицами).
// Экипировка — окно EQUIPMENT: силуэт охотника и 7 слотов вокруг.

function Slot({ type, item, onUnequip, statsMeta }) {
  const meta = ITEM_TYPES[type];
  return (
    <div className={`equip-slot ${item ? `rarity-${item.rarity}` : 'empty'}`}>
      <div className="equip-slot-box">{SLOT_ICONS[type]}</div>
      <div className="equip-slot-info">
        <span className="equip-slot-type">{meta.label}</span>
        {item ? (
          <>
            <span className="equip-item-name">{item.name}</span>
            <span className="equip-item-bonus">{statsMeta[item.bonus.stat]?.label ?? item.bonus.stat} +{item.bonus.value}</span>
            <button className="link-btn equip-off" onClick={() => onUnequip(item.id)}>снять</button>
          </>
        ) : (
          <span className="dim small">— пусто —</span>
        )}
      </div>
    </div>
  );
}

function EquipmentWindow() {
  const { state, dispatch } = useApp();
  const statsMeta = getStatsMeta(state.data);
  const items = state.data.inventory?.items ?? [];
  const byType = (t) => items.find((i) => i.equipped && i.type === t);
  const unequip = (id) => dispatch({ type: 'UNEQUIP_ITEM', id });

  return (
    <Panel title="EQUIPMENT" className="equip-panel">
      <div className="equip-window">
        <div className="equip-col">
          {['weapon', 'armor', 'gloves'].map((t) => (
            <Slot key={t} type={t} item={byType(t)} onUnequip={unequip} statsMeta={statsMeta} />
          ))}
        </div>
        <div className="equip-figure">
          <Silhouette />
        </div>
        <div className="equip-col right">
          {['helmet', 'necklace', 'ring'].map((t) => (
            <Slot key={t} type={t} item={byType(t)} onUnequip={unequip} statsMeta={statsMeta} />
          ))}
        </div>
      </div>
      <div className="equip-bottom">
        <Slot type="boots" item={byType('boots')} onUnequip={unequip} statsMeta={statsMeta} />
      </div>
    </Panel>
  );
}

function ItemCard({ item }) {
  const { state, dispatch } = useApp();
  const { llmEnabled, llmModel } = state.data.settings;
  const statsMeta = getStatsMeta(state.data);
  const bonusLabel = statsMeta[item.bonus.stat]?.label ?? item.bonus.stat;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const runRef = useRef(0); // отменённый запуск не должен опознать предмет позже
  const unidentified = item.state === 'unidentified';

  async function identify() {
    if (busy) return;
    const runId = ++runRef.current;
    let lore = null;
    if (llmEnabled && isWebGPUAvailable()) {
      setBusy(true);
      setProgress('Загрузка модели…');
      try {
        lore = await generateItemLore(item, bonusLabel, llmModel, (p) => {
          if (runId === runRef.current) setProgress(p);
        });
      } catch {
        lore = null; // нейронка не справилась — молча падаем на таблицы
      } finally {
        if (runId === runRef.current) {
          setBusy(false);
          setProgress('');
        }
      }
    }
    if (runId !== runRef.current) return; // отменили
    if (!lore) lore = localLore(item, bonusLabel);
    dispatch({ type: 'IDENTIFY_ITEM', id: item.id, name: lore.name, desc: lore.desc });
  }

  function cancel() {
    runRef.current += 1;
    cancelLLM();
    setBusy(false);
    setProgress('');
  }

  return (
    <div className={`item-card rarity-${item.rarity} ${item.equipped ? 'equipped' : ''}`}>
      <div className="item-head">
        <span className="item-icon">{unidentified ? <span className="item-unknown">?</span> : item.kind === 'consumable' ? <span className="item-consumable">{item.ctype === 'freeze' ? '❄' : '⚗'}</span> : SLOT_ICONS[item.type]}</span>
        <span className={`card-rarity r-${item.rarity}`}>{RARITY_LABELS[item.rarity]}</span>
      </div>
      {unidentified ? (
        <>
          <div className="item-name dim">Неопознанный предмет</div>
          <div className="item-desc dim">Выпал за: {item.sourceTask}</div>
          <div className="item-actions">
            {busy ? (
              <>
                <button className="btn mini danger" onClick={cancel}>Отмена</button>
                <span className="dim small">{progress}</span>
              </>
            ) : (
              <button className="btn mini primary" onClick={identify}>Опознать</button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="item-name">{item.name}</div>
          <div className="item-desc dim">{item.desc}</div>
          <div className="item-bonus">
            {item.kind === 'consumable' ? (
              item.ctype === 'freeze' ? <span className="dim small">расходник</span> : <>+{item.bonus.value} XP <span className={`tag stat-${item.bonus.stat}`}>{bonusLabel}</span></>
            ) : (
              <>+{item.bonus.value} <span className={`tag stat-${item.bonus.stat}`}>{bonusLabel}</span> <span className="dim small">· {ITEM_TYPES[item.type]?.label}</span></>
            )}
          </div>
          <div className="item-actions">
            {item.kind === 'consumable' ? (
              <button className="btn mini primary" onClick={() => dispatch({ type: 'USE_ITEM', id: item.id })}>Использовать</button>
            ) : item.equipped ? (
              <button className="btn mini" onClick={() => dispatch({ type: 'UNEQUIP_ITEM', id: item.id })}>Снять</button>
            ) : (
              <button className="btn mini primary" onClick={() => dispatch({ type: 'EQUIP_ITEM', id: item.id })}>Экипировать</button>
            )}
            <button className="btn mini danger" title="Выбросить" onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}>✕</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function LootScreen() {
  const { state } = useApp();
  const items = state.data.inventory?.items ?? [];

  return (
    <div className="screen">
      <EquipmentWindow />

      <Panel title={`ИНВЕНТАРЬ · ${items.length}`}>
        {items.length === 0 ? (
          <p className="empty">
            Пусто. Закрывай квесты — с шансом выпадает добыча. Чем сложнее задача и выше уровень, тем лучше лут.
          </p>
        ) : (
          <div className="item-grid">
            {items.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
