import React from 'react';
import cn from 'classnames';
import './Button.scss';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, disabled, ...props }) => {
  return (
    <button 
      className={cn('btn', {
        'btn--primary': variant === 'primary',
        'btn--secondary': variant === 'secondary',
        'btn--disabled': disabled,
      }, className)}
      disabled={disabled}
      {...props}
    />
  );
};

export default Button;
