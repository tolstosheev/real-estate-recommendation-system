import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import YandexMap from '@shared/ui/Map';
import YMapMarker from '@shared/ui/Map/YMapMarker';
import type { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import Button from '@shared/ui/Button';
import './PropertyDetails.scss';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23E5E7EB"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" fill="%239CA3AF" text-anchor="middle" dy=".3em" font-size="16"%3ENo Photo%3C/text%3E%3C/svg%3E';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

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

  if (isLoading) return <div className="page-loading">Loading...</div>;
  if (!property) return <div className="page-empty">Property not found.</div>;

  const validImages = (property.images || []).filter(url => url && url.length > 0);
  const displayImages = validImages.length > 0 ? validImages : [PLACEHOLDER_IMG];
  const mainImage = !imgErrors[0] ? displayImages[0] : PLACEHOLDER_IMG;
  const sideImages = displayImages.slice(1, 3);

  return (
    <div className="details-page">
      <div className="details-main">
        <div className="details-gallery">
          <img
            src={mainImage}
            className="gallery-main"
            alt={property.title}
            onError={() => setImgErrors(prev => ({ ...prev, 0: true }))}
          />
          <div className="gallery-side">
            {sideImages.map((photo, i) => (
              <img
                key={i}
                src={!imgErrors[i + 1] ? photo : PLACEHOLDER_IMG}
                alt={property.title}
                onError={() => setImgErrors(prev => ({ ...prev, [i + 1]: true }))}
              />
            ))}
          </div>
        </div>

        <div className="details-info">
          <div className="details-info__header">
            <h1 className="details-info__title">{property.title}</h1>
            <div className="details-info__price">{Number(property.price).toLocaleString()} ₽</div>
          </div>

          {property.property_type && (
            <div className="details-info__type-badge">{property.property_type}</div>
          )}

          <div className="details-info__specs">
            {property.area && (
              <div className="details-info__spec-item">
                <span className="details-info__spec-label">Area</span>
                <span className="details-info__spec-value">{property.area} m²</span>
              </div>
            )}
            {property.rooms && (
              <div className="details-info__spec-item">
                <span className="details-info__spec-label">Rooms</span>
                <span className="details-info__spec-value">{property.rooms}</span>
              </div>
            )}
            {property.floor && property.total_floors && (
              <div className="details-info__spec-item">
                <span className="details-info__spec-label">Floor</span>
                <span className="details-info__spec-value">{property.floor}/{property.total_floors}</span>
              </div>
            )}
          </div>

          {property.description && (
            <div className="details-info__description">
              <h3 className="details-info__description-title">Description</h3>
              <p className="details-info__description-text">{property.description}</p>
            </div>
          )}
        </div>
      </div>

      <aside className="details-sidebar">
        <div className="details-map-widget">
          <YandexMap 
            center={[property.lat, property.lon]} 
            zoom={15}
          >
            <YMapMarker coordinates={[property.lat, property.lon]}>
              <div className="map-marker-label">Property Location</div>
            </YMapMarker>
          </YandexMap>
        </div>
        <div className="details-contact-card">
          <h3 className="details-contact-card__title">Contact Agent</h3>
          <div className="details-contact-card__agent">
            <p className="details-contact-card__agent-name">{property.owner.full_name}</p>
            {property.owner.phone_number && (
              <p className="details-contact-card__agent-info">{property.owner.phone_number}</p>
            )}
            {property.owner.telegram_handle && (
              <p className="details-contact-card__agent-info">{property.owner.telegram_handle}</p>
            )}
          </div>
          <Button variant="primary" className="details-contact-card__button">
            Send Message
          </Button>
        </div>
      </aside>
    </div>
  );
};

export default PropertyDetails;
