import { useRef, useState } from 'react';
import Panel from './Panel.jsx';
import { useApp } from '../state/AppContext.jsx';
import { ITEM_TYPES, RARITY_LABELS, STATS } from '../config.js';
import { localLore } from '../lib/loot.js';
import { isWebGPUAvailable, generateItemLore, cancelLLM } from '../llm/planner.js';

// Инвентарь: предметы падают с задач неопознанными; опознание генерирует
// лор (нейронкой, если включена, иначе локальными таблицами). Экипировка —
// один предмет на слот (оружие/броня/аксессуар), бонусы видны в СТАТУС.

function ItemCard({ item }) {
  const { state, dispatch } = useApp();
  const { llmEnabled, llmModel } = state.data.settings;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const runRef = useRef(0); // отменённый запуск не должен опознать предмет позже
  const unidentified = item.state === 'unidentified';
  const typeMeta = ITEM_TYPES[item.type] || ITEM_TYPES.weapon;

  async function identify() {
    if (busy) return;
    const runId = ++runRef.current;
    let lore = null;
    if (llmEnabled && isWebGPUAvailable()) {
      setBusy(true);
      setProgress('Загрузка модели…');
      try {
        lore = await generateItemLore(item, STATS[item.bonus.stat]?.label || item.bonus.stat, llmModel, (p) => {
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
    if (!lore) lore = localLore(item);
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
        <span className="item-icon">{unidentified ? '❔' : typeMeta.icon}</span>
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
            +{item.bonus.value} <span className={`tag stat-${item.bonus.stat}`}>{STATS[item.bonus.stat]?.label}</span>
          </div>
          <div className="item-actions">
            {item.equipped ? (
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
  const equipped = items.filter((i) => i.equipped);

  return (
    <div className="screen">
      <Panel title="ЭКИПИРОВКА">
        <div className="equip-slots">
          {Object.entries(ITEM_TYPES).map(([type, meta]) => {
            const item = equipped.find((i) => i.type === type);
            return (
              <div className={`equip-slot ${item ? `rarity-${item.rarity}` : 'empty'}`} key={type}>
                <span className="equip-slot-type">{meta.icon} {meta.label}</span>
                {item ? (
                  <>
                    <span className="item-name">{item.name}</span>
                    <span className="item-bonus">+{item.bonus.value} {STATS[item.bonus.stat]?.label}</span>
                  </>
                ) : (
                  <span className="dim">— пусто —</span>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

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
