import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import { useAppSelector } from '@app/store/hooks';
import './PropertyCard.scss';

interface PropertyCardProps {
  property: Property;
  variant?: 'horizontal' | 'vertical';
  showActions?: boolean;
  onLikeToggle?: (propertyId: string, isLiked: boolean) => void;
}

const getFullImageUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const separator = url.startsWith('/') ? '' : '/';
  return `${baseUrl}${separator}${url}`;
};

const PropertyCard: React.FC<PropertyCardProps> = ({ property, variant = 'vertical', showActions = false, onLikeToggle }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [imgError, setImgError] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;

    const previousLikedState = property.is_liked_by_me ?? false;
    const newLikedState = !previousLikedState;

    try {
      await api.post('/api/interactions/', {
        property_id: property.id,
        interaction_type: 'like'
      });
      if (onLikeToggle) {
        onLikeToggle(property.id, newLikedState);
      }
    } catch (err) {
      console.error('Failed to like property:', err);
      if (onLikeToggle) {
        onLikeToggle(property.id, previousLikedState);
      }
    }
  };

  const handleClick = () => {
    navigate(`/property/${property.id}`);
  };

  const handleImgError = () => {
    if (!imgError) {
      setImgError(true);
    }
  };

  const validImages = (property.images || []).filter(url => url && url.trim().length > 0);
  const imageSrc = validImages.length > 0 && !imgError ? getFullImageUrl(validImages[0].trim()) : null;

  return (
    <div
      className={cn('property-card', {
        'property-card--horizontal': variant === 'horizontal',
        'property-card--vertical': variant === 'vertical',
      })}
      onClick={handleClick}
    >
      <div className="property-card__image-wrapper">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={property.title}
            className="property-card__image"
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          <div className="property-card__placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <span>No Photo</span>
          </div>
        )}

        {property.property_type && (
          <span className="property-card__badge">
            {property.property_type}
          </span>
        )}
        {property.property_purpose && (
          <span className="property-card__badge property-card__badge--purpose">
            {property.property_purpose}
          </span>
        )}
        {property.category && (
          <span className="property-card__badge property-card__badge--category">
            {property.category}
          </span>
        )}

        {showActions && property.is_ai_recommendation && (
          <span className="property-card__ai-badge property-card__ai-badge--center">AI</span>
        )}

        {!showActions && property.is_ai_recommendation && (
          <span className="property-card__ai-badge property-card__ai-badge--right">AI</span>
        )}

        {showActions && isAuthenticated && (
           <button
             className={cn('property-card__like-btn', { 'property-card__like-btn--active': property.is_liked_by_me ?? false })}
             onClick={handleLike}
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill={property.is_liked_by_me ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
               <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
             </svg>
           </button>
        )}
      </div>

      <div className="property-card__body">
        <h3 className="property-card__title">{property.title}</h3>
        <p className="property-card__address">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {property.address}
        </p>

        {(property.district || property.metro) && (
          <div className="property-card__location-tags">
            {property.district && (
              <span className="property-card__location-tag">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10m14 11V10"/>
                </svg>
                {property.district}
              </span>
            )}
            {property.metro && (
              <span className="property-card__location-tag property-card__location-tag--metro">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {property.metro}
              </span>
            )}
          </div>
        )}

        <div className="property-card__features">
          {property.area && (
            <div className="property-card__feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <span>{property.area} m²</span>
            </div>
          )}
          {property.rooms && (
            <div className="property-card__feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>{property.rooms} rm</span>
            </div>
          )}
          {property.floor && property.total_floors && (
            <div className="property-card__feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="4" y1="10" x2="20" y2="10"/>
              </svg>
              <span>{property.floor}/{property.total_floors} fl</span>
            </div>
          )}
          {property.material && (
            <div className="property-card__feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              <span>{property.material}</span>
            </div>
          )}
          {property.repair_type && (
            <div className="property-card__feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>{property.repair_type}</span>
            </div>
          )}
          {property.build_year && (
            <div className="property-card__feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{property.build_year} г.</span>
            </div>
          )}
        </div>

        {variant === 'vertical' && (
          <button
            className="property-card__cta"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
