import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import Button from '@shared/ui/Button';
import './PropertyDetails.scss';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [activePhoto, setActivePhoto] = useState(0);

  const handleLikeToggle = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    try {
      if (property?.is_liked_by_me) {
        await api.delete(`/api/interactions/like/${id}`);
        setProperty(prev => prev ? {
          ...prev,
          is_liked_by_me: false,
          likes_count: prev.likes_count - 1,
        } : null);
      } else {
        await api.post('/api/interactions/', {
          property_id: id,
          interaction_type: 'like',
        });
        setProperty(prev => prev ? {
          ...prev,
          is_liked_by_me: true,
          likes_count: prev.likes_count + 1,
        } : null);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  }, [id, isAuthenticated, property?.is_liked_by_me, navigate]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await api.get(`/api/properties/${id}`);
        setProperty(response.data);

        if (isAuthenticated) {
          try {
            await api.post('/api/interactions/', {
              property_id: id,
              interaction_type: 'view'
            });
            setProperty(prev => prev ? { ...prev, views_count: (prev.views_count || 0) + 1 } : null);
          } catch (err) {
            console.error('Failed to record view:', err);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [id, isAuthenticated]);

  if (isLoading) return <div className="page-loading"><div className="loader"></div></div>;
  if (!property) return <div className="page-empty">Property not found.</div>;

  const validImages = (property.images || []).filter(url => url && url.length > 0);
  const displayImages = validImages.filter((_, i) => !imgErrors[i]);

  return (
    <div className="details-page">
      {displayImages.length > 0 && (
        <section className="details-hero">
          <div className="hero-main-photo">
            <img
              src={displayImages[activePhoto]}
              alt={`${property.title} - photo ${activePhoto + 1}`}
              onError={() => setImgErrors(prev => ({ ...prev, [activePhoto]: true }))}
            />
            {displayImages.length > 1 && (
              <div className="hero-photo-counter">
                {activePhoto + 1} / {displayImages.length}
              </div>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="hero-thumbnails">
              {displayImages.map((img, i) => (
                <button
                  key={i}
                  className={`thumbnail ${i === activePhoto ? 'thumbnail--active' : ''}`}
                  onClick={() => setActivePhoto(i)}
                >
                  <img
                    src={img}
                    alt=""
                    onError={() => setImgErrors(prev => ({ ...prev, [i]: true }))}
                  />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="details-body">
        <main className="details-content">
          <div className="content-header">
            <div className="content-header__top">
              <div>
                <h1 className="content-title">{property.title}</h1>
                {property.property_type && (
                  <span className="content-badge">{property.property_type}</span>
                )}
                {property.property_purpose && (
                  <span className="content-badge content-badge--purpose">{property.property_purpose}</span>
                )}
              </div>
              <div className="content-header__right">
                <div className="content-price">
                  {Number(property.price).toLocaleString()} ₽
                </div>
                <button
                  className={`like-button ${property.is_liked_by_me ? 'like-button--active' : ''}`}
                  onClick={handleLikeToggle}
                  title={property.is_liked_by_me ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={property.is_liked_by_me ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="content-address">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {property.address}
            </div>
            <div className="content-stats">
              <span className="content-stat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {property.views_count || 0} views
              </span>
              <span className="content-stat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {property.likes_count || 0} likes
              </span>
              {property.is_ai_recommendation && (
                <span className="content-stat content-stat--ai">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  AI Recommended
                </span>
              )}
            </div>
          </div>

          <div className="content-specs">
            {property.area && (
              <div className="spec-card">
                <div className="spec-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                </div>
                <div className="spec-card__info">
                  <span className="spec-card__value">{property.area} m²</span>
                  <span className="spec-card__label">Total Area</span>
                </div>
              </div>
            )}
            {property.sq_living && (
              <div className="spec-card">
                <div className="spec-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                </div>
                <div className="spec-card__info">
                  <span className="spec-card__value">{property.sq_living} m²</span>
                  <span className="spec-card__label">Living Area</span>
                </div>
              </div>
            )}
            {property.sq_kitchen && (
              <div className="spec-card">
                <div className="spec-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8h-1V6c0-2.21-1.79-4-4-4S9 3.79 9 6v2H8c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-8H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2z"/>
                  </svg>
                </div>
                <div className="spec-card__info">
                  <span className="spec-card__value">{property.sq_kitchen} m²</span>
                  <span className="spec-card__label">Kitchen Area</span>
                </div>
              </div>
            )}
            {property.rooms && (
              <div className="spec-card">
                <div className="spec-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="spec-card__info">
                  <span className="spec-card__value">{property.rooms}</span>
                  <span className="spec-card__label">Rooms</span>
                </div>
              </div>
            )}
            {property.floor && property.total_floors && (
              <div className="spec-card">
                <div className="spec-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2"/>
                    <line x1="4" y1="10" x2="20" y2="10"/>
                    <line x1="12" y1="10" x2="12" y2="22"/>
                  </svg>
                </div>
                <div className="spec-card__info">
                  <span className="spec-card__value">{property.floor}/{property.total_floors}</span>
                  <span className="spec-card__label">Floor</span>
                </div>
              </div>
            )}
            {property.build_year && (
              <div className="spec-card">
                <div className="spec-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </div>
                <div className="spec-card__info">
                  <span className="spec-card__value">{property.build_year}</span>
                  <span className="spec-card__label">Build Year</span>
                </div>
              </div>
            )}
          </div>

          {(property.district || property.metro || property.material || property.repair_type || property.room_type || property.is_new !== null) && (
            <div className="content-section">
              <h2 className="content-section__title">Building Details</h2>
              <div className="content-details-grid">
                {property.district && (
                  <div className="detail-item">
                    <span className="detail-item__label">District</span>
                    <span className="detail-item__value">{property.district}</span>
                  </div>
                )}
                {property.metro && (
                  <div className="detail-item">
                    <span className="detail-item__label">Metro</span>
                    <span className="detail-item__value detail-item__value--metro">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="8"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      {property.metro}
                    </span>
                  </div>
                )}
                {property.build_year && (
                  <div className="detail-item">
                    <span className="detail-item__label">Build Year</span>
                    <span className="detail-item__value">{property.build_year}</span>
                  </div>
                )}
                {property.material && (
                  <div className="detail-item">
                    <span className="detail-item__label">Material</span>
                    <span className="detail-item__value">{property.material}</span>
                  </div>
                )}
                {property.repair_type && (
                  <div className="detail-item">
                    <span className="detail-item__label">Repair Type</span>
                    <span className="detail-item__value">{property.repair_type}</span>
                  </div>
                )}
                {property.room_type && (
                  <div className="detail-item">
                    <span className="detail-item__label">Room Type</span>
                    <span className="detail-item__value">{property.room_type}</span>
                  </div>
                )}
                {property.is_new !== null && (
                  <div className="detail-item">
                    <span className="detail-item__label">Building Type</span>
                    <span className="detail-item__value">{property.is_new === 'new' ? 'New Building' : 'Secondary'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {(property.balcony || property.parking) && (
            <div className="content-section">
              <h2 className="content-section__title">Amenities</h2>
              <div className="content-amenities">
                {property.balcony && (
                  <div className="amenity-tag">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                    </svg>
                    {property.balcony === 'yes' ? 'Has Balcony' : 'No Balcony'}
                  </div>
                )}
                {property.parking && (
                  <div className="amenity-tag">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5v14M12 5C8 5 5 8 5 12s3 7 7 7 7-3 7-7-3-7-7-7z"/>
                    </svg>
                    {property.parking === 'yes' ? 'Has Parking' : property.parking === 'paid' ? 'Paid Parking' : 'No Parking'}
                  </div>
                )}
              </div>
            </div>
          )}

          {property.description && (
            <div className="content-section">
              <h2 className="content-section__title">About this property</h2>
              <p className="content-description">{property.description}</p>
            </div>
          )}

          <div className="content-section">
            <h2 className="content-section__title">Location</h2>
            <div className="content-map">
              <YandexMap center={[property.lat, property.lon]} zoom={15}>
                <YMapMarker coordinates={[property.lat, property.lon]}>
                  <div className="map-marker">📍</div>
                </YMapMarker>
              </YandexMap>
            </div>
          </div>
        </main>

        <aside className="details-sidebar">
          <div className="sidebar-card contact-card">
            <h3 className="sidebar-card__title">Contact Agent</h3>
            <div className="contact-card__agent">
              <div className="contact-card__avatar">
                {property.owner.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="contact-card__info">
                <p className="contact-card__name">{property.owner.full_name}</p>
                {property.owner.phone_number && (
                  <p className="contact-card__detail">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {property.owner.phone_number}
                  </p>
                )}
                {property.owner.telegram_handle && (
                  <p className="contact-card__detail">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                    </svg>
                    {property.owner.telegram_handle}
                  </p>
                )}
              </div>
            </div>
            <Button variant="primary" className="contact-card__button">
              Send Message
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PropertyDetails;
