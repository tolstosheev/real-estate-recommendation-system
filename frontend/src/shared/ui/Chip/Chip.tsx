import React from 'react';
import cn from 'classnames';
import './Chip.scss';

interface ChipProps {
  label: string | number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const Chip: React.FC<ChipProps> = ({ label, active, onClick, className }) => {
  return (
    <div 
      className={cn('chip', { 'chip--active': active }, className)} 
      onClick={onClick}
    >
      {label}
    </div>
  );
};

export default Chip;
