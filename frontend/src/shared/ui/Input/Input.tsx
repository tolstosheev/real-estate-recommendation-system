import React from 'react';
import cn from 'classnames';
import './Input.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className={cn('input-group')}>
      {label && <label className="input-label">{label}</label>}
      <input className={cn('input-field', className)} {...props} />
    </div>
  );
};

export default Input;
