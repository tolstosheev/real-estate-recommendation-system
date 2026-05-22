import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import { propertyService } from '@shared/api/properties.service';
import type { GeocoderResult } from '@shared/api/geocoder.service';
import { ImageUploader } from '@features/property/upload-images';
import {
  PROPERTY_TYPES, PROPERTY_PURPOSES, MATERIALS, REPAIR_TYPES, ROOM_TYPES,
  NEW_BUILDING_OPTIONS, BALCONY_OPTIONS, PARKING_OPTIONS, validatePropertyForm,
  useAddressAutocomplete,
} from '@features/property/propertyForm';
import type { Property } from '@shared/api/types';
import styles from './AddPropertyPage.module.css';

export const AddPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState(1);
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
    city: '',
    lat: '',
    lon: '',
    images: [] as string[],
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
  
  const [metroOptions, setMetroOptions] = useState<string[]>([]);

  const { addressSuggestions, showSuggestions, suggestionsRef, handleAddressChange, selectAddressSuggestion } = useAddressAutocomplete();

  useEffect(() => {
    propertyService.getMeta().then(data => {
      setMetroOptions(data.metro || []);
    }).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAddressChange(e.target.value, (address) => {
      setFormData(prev => ({ ...prev, address }));
    });
  };

  const handleSelectSuggestion = (result: GeocoderResult) => {
    selectAddressSuggestion(result, (selected) => {
      setFormData(prev => ({
        ...prev,
        address: selected.formattedAddress || selected.address,
        lat: selected.lat.toString(),
        lon: selected.lon.toString(),
        district: selected.district || prev.district,
        metro: selected.metro || prev.metro,
        city: selected.city || prev.city,
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!user?.phone_number && !user?.telegram_handle) {
      setError('Please add phone number or Telegram in your profile before adding a property');
      setLoading(false);
      return;
    }

    const validation = validatePropertyForm(formData);
    if (!validation.valid) {
      setError(validation.errors.join('. '));
      setLoading(false);
      return;
    }

    try {
      const data: Partial<Property> = {
        ...formData,
        district: formData.district || undefined,
        metro: formData.metro || undefined,
        city: formData.city || undefined,
        price: parseFloat(formData.price),
        rooms: formData.rooms ? parseInt(formData.rooms) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
        lat: formData.lat ? parseFloat(formData.lat) : 0,
        lon: formData.lon ? parseFloat(formData.lon) : 0,
        images: formData.images,
        sq_living: formData.sq_living ? parseFloat(formData.sq_living) : null,
        sq_kitchen: formData.sq_kitchen ? parseFloat(formData.sq_kitchen) : null,
        build_year: formData.build_year ? parseInt(formData.build_year) : null,
      };

      await propertyService.createProperty(data);
      navigate('/');
    } catch {
      setError('Failed to create property. Check that all required fields are valid.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className={styles.container}>
      <h1>Add New Property</h1>
      
      <div className={styles.stepper}>
        <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>1. Basic</div>
        <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>2. Details</div>
        <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>3. Location</div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        {step === 1 && (
          <div className={styles.stepContent}>
            <div className={styles.formGroup}>
              <label className={styles.required}>Title</label>
              <input name="title" placeholder="Modern Apartment" value={formData.title} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.required}>Price (₽)</label>
              <input name="price" type="number" placeholder="5000000" value={formData.price} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Rooms</label>
              <input name="rooms" type="number" placeholder="2" value={formData.rooms} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Area (m²)</label>
              <input name="area" type="number" placeholder="65.5" value={formData.area} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Property Type</label>
              <select name="property_type" value={formData.property_type} onChange={handleChange}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Purpose</label>
              <select name="property_purpose" value={formData.property_purpose} onChange={handleChange}>
                {PROPERTY_PURPOSES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea name="description" placeholder="Describe your property..." value={formData.description} onChange={handleChange} />
            </div>
            <button type="button" onClick={nextStep} className={styles.nextBtn}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.formGroup}>
              <label>Floor</label>
              <input name="floor" type="number" placeholder="5" value={formData.floor} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Total Floors</label>
              <input name="total_floors" type="number" placeholder="10" value={formData.total_floors} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Build Year</label>
              <input name="build_year" type="number" placeholder="2015" value={formData.build_year} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Material</label>
              <select name="material" value={formData.material} onChange={handleChange}>
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Repair Type</label>
              <select name="repair_type" value={formData.repair_type} onChange={handleChange}>
                {REPAIR_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Room Type</label>
              <select name="room_type" value={formData.room_type} onChange={handleChange}>
                {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Building Type</label>
              <select name="is_new" value={formData.is_new} onChange={handleChange}>
                {NEW_BUILDING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Balcony</label>
              <select name="balcony" value={formData.balcony} onChange={handleChange}>
                {BALCONY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Parking</label>
              <select name="parking" value={formData.parking} onChange={handleChange}>
                {PARKING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
              <label>Images</label>
              <ImageUploader
                images={formData.images}
                onChange={(urls) => setFormData(prev => ({ ...prev, images: urls }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Living Area (m²)</label>
              <input name="sq_living" type="number" step="0.1" placeholder="40.5" value={formData.sq_living} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Kitchen Area (m²)</label>
              <input name="sq_kitchen" type="number" step="0.1" placeholder="12.0" value={formData.sq_kitchen} onChange={handleChange} />
            </div>
            <div className={styles.navBtns}>
              <button type="button" onClick={prevStep}>Back</button>
              <button type="button" onClick={nextStep} className={styles.nextBtn}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.formGroup} ref={suggestionsRef}>
              <label className={styles.required}>Address</label>
              <div className={styles.addressWrapper}>
                <input name="address" placeholder="Start typing address..." value={formData.address} onChange={handleAddressChangeEvent} required />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className={styles.suggestions}>
                    {addressSuggestions.map((s, i) => (
                      <div key={i} className={styles.suggestionItem} onClick={() => handleSelectSuggestion(s)}>
                        {s.formattedAddress || s.address}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Metro</label>
              <input name="metro" list="metro-list" placeholder="Metro Station" value={formData.metro} onChange={handleChange} />
              <datalist id="metro-list">
                {metroOptions.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className={styles.formGroup}>
              <label>Latitude</label>
              <input name="lat" type="number" step="any" placeholder="Latitude" value={formData.lat} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Longitude</label>
              <input name="lon" type="number" step="any" placeholder="Longitude" value={formData.lon} onChange={handleChange} />
            </div>
            <div className={styles.navBtns}>
              <button type="button" onClick={prevStep}>Back</button>
              <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Submit Property'}</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AddPropertyPage;