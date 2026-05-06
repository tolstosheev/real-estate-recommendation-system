import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '@shared/api/properties.service';
import { geocodeAddress } from '@shared/api/geocoder.service';
import type { Property } from '@entities/property/model/types';
import styles from './AddPropertyPage.module.css';

const MATERIALS = ['Panel', 'Brick', 'Monolith', 'Brick-Monolith', 'Wood', 'Block'];
const REPAIR_TYPES = ['Cosmetic', 'Euro', 'Design', 'Rough'];
const ROOM_TYPES = ['Adjacent', 'Separated', 'Both'];
const PROPERTY_TYPES = ['Apartment', 'Studio', 'House', 'Townhouse'];
const PROPERTY_PURPOSES = [
  { value: 'sale', label: 'Sale' },
  { value: 'rent', label: 'Rent' },
];
const NEW_BUILDING_OPTIONS = [
  { value: 'new', label: 'New Building' },
  { value: 'secondary', label: 'Secondary' },
];
const BALCONY_OPTIONS = [
  { value: 'yes', label: 'Has Balcony' },
  { value: 'no', label: 'No Balcony' },
];
const PARKING_OPTIONS = [
  { value: 'yes', label: 'Has Parking' },
  { value: 'no', label: 'No Parking' },
  { value: 'paid', label: 'Paid Parking' },
];

export const AddPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    rooms: '',
    area: '',
    floor: '',
    total_floors: '',
    property_type: 'Apartment',
    property_purpose: 'sale',
    category: '',
    address: '',
    district: '',
    metro: '',
    lat: '',
    lon: '',
    images: '',
    sq_living: '',
    sq_kitchen: '',
    build_year: '',
    material: 'Brick',
    repair_type: 'Cosmetic',
    room_type: 'Separated',
    is_new: 'secondary',
    balcony: 'yes',
    parking: 'no',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Auto-fill coordinates via geocoder
  useEffect(() => {
    if (!formData.address || formData.address.length < 5) return;

    const timer = setTimeout(async () => {
      try {
        const result = await geocodeAddress(formData.address);
        if (result) {
          setFormData(prev => ({
            ...prev,
            lat: result.lat.toString(),
            lon: result.lon.toString(),
            address: result.formattedAddress || prev.address,
          }));
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData.address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: Partial<Property> = {
        ...formData,
        price: parseFloat(formData.price),
        rooms: formData.rooms ? parseInt(formData.rooms) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
        lat: formData.lat ? parseFloat(formData.lat) : 0,
        lon: formData.lon ? parseFloat(formData.lon) : 0,
        images: formData.images ? formData.images.split(',').map(s => s.trim()) : [],
        sq_living: formData.sq_living ? parseFloat(formData.sq_living) : null,
        sq_kitchen: formData.sq_kitchen ? parseFloat(formData.sq_kitchen) : null,
        build_year: formData.build_year ? parseInt(formData.build_year) : null,
      };

      await propertyService.createProperty(data);
      navigate('/');
    } catch (err) {
      setError('Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Add New Property</h1>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <input name="title" placeholder="Title" value={formData.title} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
        <input name="price" type="number" placeholder="Price" value={formData.price} onChange={handleChange} required />
        <input name="rooms" type="number" placeholder="Rooms" value={formData.rooms} onChange={handleChange} />
        <input name="area" type="number" placeholder="Area" value={formData.area} onChange={handleChange} />
        <input name="floor" type="number" placeholder="Floor" value={formData.floor} onChange={handleChange} />
        <input name="total_floors" type="number" placeholder="Total Floors" value={formData.total_floors} onChange={handleChange} />
        <select name="property_type" value={formData.property_type} onChange={handleChange}>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="property_purpose" value={formData.property_purpose} onChange={handleChange}>
          {PROPERTY_PURPOSES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <input name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
        <input name="address" placeholder="Address" value={formData.address} onChange={handleChange} required />
        <input name="district" placeholder="District" value={formData.district} onChange={handleChange} />
        <input name="metro" placeholder="Metro Station" value={formData.metro} onChange={handleChange} />
        <input name="lat" type="number" step="any" placeholder="Latitude" value={formData.lat} onChange={handleChange} />
        <input name="lon" type="number" step="any" placeholder="Longitude" value={formData.lon} onChange={handleChange} />
        <input name="images" placeholder="Image URLs (comma separated)" value={formData.images} onChange={handleChange} />
        <input name="sq_living" type="number" placeholder="Living Area" value={formData.sq_living} onChange={handleChange} />
        <input name="sq_kitchen" type="number" placeholder="Kitchen Area" value={formData.sq_kitchen} onChange={handleChange} />
        <input name="build_year" type="number" placeholder="Build Year" value={formData.build_year} onChange={handleChange} />
        <select name="material" value={formData.material} onChange={handleChange}>
          {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select name="repair_type" value={formData.repair_type} onChange={handleChange}>
          {REPAIR_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="room_type" value={formData.room_type} onChange={handleChange}>
          {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="is_new" value={formData.is_new} onChange={handleChange}>
          {NEW_BUILDING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select name="balcony" value={formData.balcony} onChange={handleChange}>
          {BALCONY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select name="parking" value={formData.parking} onChange={handleChange}>
          {PARKING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Submit Property'}</button>
      </form>
    </div>
  );
};
