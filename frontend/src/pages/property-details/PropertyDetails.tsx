import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import Button from '@shared/ui/Button';
import './PropertyDetails.scss';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await api.get(`/api/properties/${id}`);
        setProperty(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

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
              </div>
              <div className="content-price">
                {Number(property.price).toLocaleString()} ₽
              </div>
            </div>
            <div className="content-address">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {property.address}
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
                  <span className="spec-card__value">{property.area}</span>
                  <span className="spec-card__label">m² area</span>
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
                  <span className="spec-card__label">rooms</span>
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
                  <span className="spec-card__label">floor</span>
                </div>
              </div>
            )}
          </div>

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
