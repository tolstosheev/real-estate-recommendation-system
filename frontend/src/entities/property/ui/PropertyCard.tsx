import React from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import type { Property } from '@entities/property/model/types';
import './PropertyCard.scss';

interface PropertyCardProps {
  property: Property;
  variant?: 'horizontal' | 'vertical';
}

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23E5E7EB"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" fill="%239CA3AF" text-anchor="middle" dy=".3em" font-size="16"%3ENo Photo%3C/text%3E%3C/svg%3E';

const PropertyCard: React.FC<PropertyCardProps> = ({ property, variant = 'vertical' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/property/${property.id}`);
  };

  const imageSrc = property.images && property.images.length > 0 ? property.images[0] : PLACEHOLDER_IMG;

  return (
    <div className={cn('property-card', {
      'property-card--horizontal': variant === 'horizontal',
      'property-card--vertical': variant === 'vertical',
    })} onClick={handleClick}>
      <div className="property-card__image-container">
        <img src={imageSrc} alt={property.title} className="property-card__image" />
      </div>
      
      <div className="property-card__content">
        <div className="property-card__price">{Number(property.price).toLocaleString()} ₽</div>
        <div className="property-card__address">{property.address}</div>
        
        <div className="property-card__params">
          {property.rooms && (
            <div className="property-card__param-item">
              <span>{property.rooms} rooms</span>
            </div>
          )}
          {property.area && (
            <div className="property-card__param-item">
              <span>{property.area} m²</span>
            </div>
          )}
          {property.floor && property.total_floors && (
            <div className="property-card__param-item">
              <span>{property.floor}/{property.total_floors} fl.</span>
            </div>
          )}
        </div>

        <div className="property-card__footer">
          <button className="property-card__details-btn">Details</button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
