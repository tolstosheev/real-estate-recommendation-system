import React from 'react';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (value: number) => string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ label, min, max, step, value, onChange, formatLabel }) => {
  const fmt = (v: number) => formatLabel ? formatLabel(v) : String(v);

  return (
    <div className="range-slider">
      <label className="range-slider__label">{label}</label>
      <div className="range-slider__values">
        <span>{fmt(value[0])}</span>
        <span>—</span>
        <span>{fmt(value[1])}</span>
      </div>
      <div className="range-slider__inputs">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => {
            const newMin = Math.min(Number(e.target.value), value[1]);
            onChange([newMin, value[1]]);
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => {
            const newMax = Math.max(Number(e.target.value), value[0]);
            onChange([value[0], newMax]);
          }}
        />
      </div>
    </div>
  );
};

export default RangeSlider;
