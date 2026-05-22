import React, { useState, useEffect } from 'react';
import Modal from '@shared/ui/Modal';
import Button from '@shared/ui/Button';
import { propertyService } from '@shared/api/properties.service';
import { ImageUploader } from '@features/property/upload-images';
import {
  PROPERTY_TYPES, PROPERTY_PURPOSES, MATERIALS, REPAIR_TYPES, ROOM_TYPES,
  NEW_BUILDING_OPTIONS, BALCONY_OPTIONS, PARKING_OPTIONS, EMPTY_FORM, validatePropertyForm,
  useAddressAutocomplete,
} from '@features/property/propertyForm';
import { useAppSelector } from '@app/store/hooks';
import type { Property } from '@shared/api/types';
import type { GeocoderResult } from '@shared/api/geocoder.service';
import './PropertyFormModal.scss';

interface PropertyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property?: Property | null;
}

type FormData = typeof EMPTY_FORM;

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ isOpen, onClose, onSuccess, property }) => {
  const isEdit = !!property;
  const { user } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [metroOptions, setMetroOptions] = useState<string[]>([]);

  const { addressSuggestions, showSuggestions, suggestionsRef, handleAddressChange, selectAddressSuggestion } = useAddressAutocomplete();

  useEffect(() => {
    propertyService.getMeta().then(data => {
      setMetroOptions(data.metro || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (property) {
        setFormData({
          title: property.title || '',
          description: property.description || '',
          price: property.price ? String(property.price) : '',
          rooms: property.rooms ? String(property.rooms) : '',
          area: property.area ? String(property.area) : '',
          floor: property.floor ? String(property.floor) : '',
          total_floors: property.total_floors ? String(property.total_floors) : '',
          property_type: property.property_type || 'Apartment',
          property_purpose: property.property_purpose || 'sale',
          address: property.address || '',
          district: property.district || '',
          metro: property.metro || '',
          city: property.city || '',
          lat: property.lat ? String(property.lat) : '',
          lon: property.lon ? String(property.lon) : '',
          images: property.images || [],
          sq_living: property.sq_living ? String(property.sq_living) : '',
          sq_kitchen: property.sq_kitchen ? String(property.sq_kitchen) : '',
          build_year: property.build_year ? String(property.build_year) : '',
          material: property.material || 'Brick',
          repair_type: property.repair_type || 'Cosmetic',
          room_type: property.room_type || 'Separated',
          is_new: property.is_new || 'secondary',
          balcony: property.balcony || 'yes',
          parking: property.parking || 'no',
        });
      } else {
        setFormData(EMPTY_FORM);
      }
      setStep(1);
      setError('');
      setLoading(false);
    }
  }, [isOpen, property]);

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

  const buildPayload = () => ({
    title: formData.title,
    description: formData.description || undefined,
    price: parseFloat(formData.price),
    rooms: formData.rooms ? parseInt(formData.rooms) : null,
    area: formData.area ? parseFloat(formData.area) : null,
    floor: formData.floor ? parseInt(formData.floor) : null,
    total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
    property_type: formData.property_type,
    property_purpose: formData.property_purpose,
    address: formData.address,
    district: formData.district || undefined,
    metro: formData.metro || undefined,
    city: formData.city || undefined,
    lat: formData.lat ? parseFloat(formData.lat) : 0,
    lon: formData.lon ? parseFloat(formData.lon) : 0,
    images: formData.images,
    sq_living: formData.sq_living ? parseFloat(formData.sq_living) : null,
    sq_kitchen: formData.sq_kitchen ? parseFloat(formData.sq_kitchen) : null,
    build_year: formData.build_year ? parseInt(formData.build_year) : null,
    material: formData.material,
    repair_type: formData.repair_type,
    room_type: formData.room_type,
    is_new: formData.is_new,
    balcony: formData.balcony,
    parking: formData.parking,
  });

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
      const payload = buildPayload();
      if (isEdit && property) {
        await propertyService.updateProperty(property.id, payload);
      } else {
        await propertyService.createProperty(payload);
      }
      onSuccess();
      onClose();
    } catch {
      setError(isEdit ? 'Failed to update property. Check that all required fields are valid.' : 'Failed to create property. Check that all required fields are valid.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Property' : 'Add New Property'}>
      <div className="property-form-modal">
        <div className="pf-stepper">
          <div className={`pf-step ${step >= 1 ? 'pf-step--active' : ''}`}>1. Basic</div>
          <div className={`pf-step ${step >= 2 ? 'pf-step--active' : ''}`}>2. Details</div>
          <div className={`pf-step ${step >= 3 ? 'pf-step--active' : ''}`}>3. Location</div>
        </div>

        {error && <div className="pf-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="pf-fields">
              <div className="pf-field pf-field--wide">
                <label>Title <span className="pf-required">*</span></label>
                <input name="title" placeholder="Modern Apartment" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="pf-field">
                <label>Price (₽) <span className="pf-required">*</span></label>
                <input name="price" type="number" placeholder="5000000" value={formData.price} onChange={handleChange} required />
              </div>
              <div className="pf-field">
                <label>Rooms</label>
                <input name="rooms" type="number" placeholder="2" value={formData.rooms} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label>Area (m²)</label>
                <input name="area" type="number" step="0.1" placeholder="65.5" value={formData.area} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label>Property Type</label>
                <select name="property_type" value={formData.property_type} onChange={handleChange}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Purpose</label>
                <select name="property_purpose" value={formData.property_purpose} onChange={handleChange}>
                  {PROPERTY_PURPOSES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="pf-field pf-field--wide">
                <label>Description</label>
                <textarea name="description" placeholder="Describe your property..." value={formData.description} onChange={handleChange} />
              </div>
              <div className="pf-actions">
                <Button variant="primary" onClick={nextStep} type="button">Next</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pf-fields">
              <div className="pf-field">
                <label>Floor</label>
                <input name="floor" type="number" placeholder="5" value={formData.floor} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label>Total Floors</label>
                <input name="total_floors" type="number" placeholder="10" value={formData.total_floors} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label>Build Year</label>
                <input name="build_year" type="number" placeholder="2015" value={formData.build_year} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label>Material</label>
                <select name="material" value={formData.material} onChange={handleChange}>
                  {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Repair Type</label>
                <select name="repair_type" value={formData.repair_type} onChange={handleChange}>
                  {REPAIR_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Room Type</label>
                <select name="room_type" value={formData.room_type} onChange={handleChange}>
                  {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Building Type</label>
                <select name="is_new" value={formData.is_new} onChange={handleChange}>
                  {NEW_BUILDING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Balcony</label>
                <select name="balcony" value={formData.balcony} onChange={handleChange}>
                  {BALCONY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label>Parking</label>
                <select name="parking" value={formData.parking} onChange={handleChange}>
                  {PARKING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="pf-field pf-field--wide">
                <label>Images</label>
                <ImageUploader images={formData.images} onChange={(urls) => setFormData(prev => ({ ...prev, images: urls }))} />
              </div>
              <div className="pf-field">
                <label>Living Area (m²)</label>
                <input name="sq_living" type="number" step="0.1" placeholder="40.5" value={formData.sq_living} onChange={handleChange} />
              </div>
              <div className="pf-field">
                <label>Kitchen Area (m²)</label>
                <input name="sq_kitchen" type="number" step="0.1" placeholder="12.0" value={formData.sq_kitchen} onChange={handleChange} />
              </div>
              <div className="pf-actions">
                <Button variant="secondary" onClick={prevStep} type="button">Back</Button>
                <Button variant="primary" onClick={nextStep} type="button">Next</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="pf-fields">
              <div className="pf-field pf-field--wide" ref={suggestionsRef}>
                <label>Address <span className="pf-required">*</span></label>
                <div className="pf-address-wrapper">
                  <input name="address" placeholder="Start typing address..." value={formData.address} onChange={handleAddressChangeEvent} required />
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="pf-suggestions">
                      {addressSuggestions.map((s, i) => (
                        <div key={i} className="pf-suggestion-item" onClick={() => handleSelectSuggestion(s)}>
                          {s.formattedAddress || s.address}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="pf-field">
                <label>Metro</label>
                <input name="metro" list="pf-metro-list" placeholder="Metro Station" value={formData.metro} onChange={handleChange} />
                <datalist id="pf-metro-list">
                  {metroOptions.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div className="pf-actions">
                <Button variant="secondary" onClick={prevStep} type="button">Back</Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (isEdit ? 'Update Property' : 'Create Property')}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};

export default PropertyFormModal;
