import React from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import type { Property } from '@entities/property/model/types';
import './PropertyCard.scss';

interface PropertyCardProps {
  property: Property;
  variant?: 'horizontal' | 'vertical';
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, variant = 'vertical' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/property/${property.id}`);
  };

  return (
    <div className={cn('property-card', {
      'property-card--horizontal': variant === 'horizontal',
      'property-card--vertical': variant === 'vertical',
    })} onClick={handleClick}>
      <div className="property-card__image-container">
        <div className="property-card__badge">AI Match {Math.round(property.ai_relevance * 100)}%</div>
        <img src={property.photos[0]} alt={property.title} className="property-card__image" />
      </div>
      
      <div className="property-card__content">
        <div className="property-card__price">{property.price.toLocaleString()} ₽</div>
        <div className="property-card__address">{property.address}</div>
        
        <div className="property-card__params">
          <div className="property-card__param-item">
            <span>{property.rooms} rooms</span>
          </div>
          <div className="property-card__param-item">
            <span>{property.area} m²</span>
          </div>
          <div className="property-card__param-item">
            <span>{property.floor}/{property.total_floors} fl.</span>
          </div>
        </div>

        <div className="property-card__footer">
          <button className="property-card__details-btn">Details</button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
