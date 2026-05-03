import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import YandexMap from '@shared/ui/Map';
import { YMapMarker } from '@shared/api/ymaps3';
import { Property } from '@entities/property/model/types';
import api from '@shared/api/api';
import Button from '@shared/ui/Button';
import './PropertyDetails.scss';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  if (!property) return <div style={{ textAlign: 'center', padding: '40px' }}>Property not found.</div>;

  return (
    <div className="details-page">
      <div className="details-main">
        <div className="details-gallery">
          <img src={property.photos[0]} className="gallery-main" alt={property.title} />
          <div className="gallery-side">
            {property.photos.slice(1, 3).map((photo, i) => (
              <img key={i} src={photo} alt={property.title} />
            ))}
          </div>
        </div>

        <div className="details-info">
          <div className="details-info__header">
            <h1 className="details-info__title">{property.title}</h1>
            <div className="details-info__price">{property.price.toLocaleString()} ₽</div>
          </div>

          <div className="details-info__specs">
            <div className="details-info__spec-item">
              <span className="details-info__spec-label">Area</span>
              <span className="details-info__spec-value">{property.area} m²</span>
            </div>
            <div className="details-info__spec-item">
              <span className="details-info__spec-label">Rooms</span>
              <span className="details-info__spec-value">{property.rooms}</span>
            </div>
            <div className="details-info__spec-item">
              <span className="details-info__spec-label">Floor</span>
              <span className="details-info__spec-value">{property.floor}/{property.total_floors}</span>
            </div>
          </div>

          <div className="details-info__description">
            <h3 style={{ marginBottom: '12px' }}>Description</h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>{property.description}</p>
          </div>
        </div>
      </div>

      <aside className="details-sidebar">
        <div className="details-map-widget">
          <YandexMap 
            center={property.coordinates} 
            zoom={15}
          >
            <YMapMarker coordinates={property.coordinates}>
              <div className="map-marker-label">Property Location</div>
            </YMapMarker>
          </YandexMap>
        </div>
        <div className="details-contact-card">
          <h3 className="details-contact-card__title">Contact Agent</h3>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px' }}>
            Interested in this property? Contact our agent for more details.
          </p>
          <Button variant="primary" style={{ width: '100%' }}>
            Send Message
          </Button>
        </div>
      </aside>
    </div>
  );
};

export default PropertyDetails;
