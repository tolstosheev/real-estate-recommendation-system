import React from 'react';

interface CheckboxOption {
  label: string;
  value: string;
}

interface CheckboxGroupProps {
  label: string;
  options: CheckboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, options, selected, onChange }) => {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <fieldset className="checkbox-group">
      <legend className="checkbox-group__label">{label}</legend>
      <div className="checkbox-group__options">
        {options.map(opt => (
          <label key={opt.value} className="checkbox-group__option">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => handleToggle(opt.value)}
            />
            <span className="checkbox-group__text">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

export default CheckboxGroup;
