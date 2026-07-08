import { useState } from 'react';

// Ручной ввод времени: число + единица (минуты/часы) → onChange(минуты)
export default function TimeInput({ minutes, onChange }) {
  const [unit, setUnit] = useState(minutes >= 60 ? 'h' : 'm');
  const value = unit === 'h' ? minutes / 60 : minutes;

  function update(val, u) {
    const n = Math.max(0, Number(val) || 0);
    onChange(Math.round(u === 'h' ? n * 60 : n));
  }

  return (
    <span className="time-input">
      <input
        className="input time-value"
        type="number"
        min="0"
        step={unit === 'h' ? 0.5 : 5}
        value={Number.isInteger(value) ? value : value.toFixed(1)}
        onChange={(e) => update(e.target.value, unit)}
      />
      <select
        className="select time-unit"
        value={unit}
        onChange={(e) => {
          setUnit(e.target.value);
          update(value, e.target.value);
        }}
      >
        <option value="m">мин</option>
        <option value="h">ч</option>
      </select>
    </span>
  );
}
