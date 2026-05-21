import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout, setCredentials } from '@entities/user/model/slice';
import type { UserPreferenceCreate, Property } from '@shared/api/types';
import { preferencesService } from '@shared/api/preferences.service';
import { authService } from '@shared/api/auth.service';
import { propertyService } from '@shared/api/properties.service';
import RangeSlider from '@shared/ui/RangeSlider';
import CheckboxGroup from '@shared/ui/CheckboxGroup';
import Button from '@shared/ui/Button';
import Input from '@shared/ui/Input';
import PropertyFormModal from './PropertyFormModal';
import './Profile.scss';

type Tab = 'profile' | 'preferences' | 'my-properties';

const WIZARD_STEPS = ['Property Type', 'Parameters', 'Location & Details'];

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [wizardStep, setWizardStep] = useState(0);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [contactWarning, setContactWarning] = useState('');
  const [meta, setMeta] = useState<{
    cities: string[]; materials: string[]; repair_types: string[]; property_types: string[];
  }>({ cities: [], materials: [], repair_types: [], property_types: [] });

  const [profileDraft, setProfileDraft] = useState({
    full_name: '', phone_number: '', telegram_handle: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [prefs, setPrefs] = useState<UserPreferenceCreate>({});
  const [prefError, setPrefError] = useState('');
  const [prefSuccess, setPrefSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [wizardMode, setWizardMode] = useState(false);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  const userLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    propertyService.getMeta().then(data => {
      setMeta({
        cities: data.cities || [],
        materials: data.materials || [],
        repair_types: data.repair_types || [],
        property_types: data.property_types || [],
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || userLoadedRef.current) return;
    userLoadedRef.current = true;

    setProfileDraft({
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      telegram_handle: user.telegram_handle || '',
    });

    preferencesService.getPreferences()
      .then((data) => {
        setPrefs({
          min_price: data.min_price != null ? Number(data.min_price) : undefined,
          max_price: data.max_price != null ? Number(data.max_price) : undefined,
          min_area: data.min_area != null ? Number(data.min_area) : undefined,
          max_area: data.max_area != null ? Number(data.max_area) : undefined,
          preferred_rooms: data.preferred_rooms?.length ? data.preferred_rooms : undefined,
          property_types: data.property_types?.length ? data.property_types : undefined,
          property_purposes: data.property_purposes?.length ? data.property_purposes : undefined,
          cities: data.cities?.length ? data.cities : undefined,
          material: data.material?.length ? data.material : undefined,
          repair_type: data.repair_type?.length ? data.repair_type : undefined,
          min_build_year: data.min_build_year ?? undefined,
          max_build_year: data.max_build_year ?? undefined,
        });
        setHasLoadedPrefs(true);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (activeTab === 'my-properties' && user) { loadMyProperties(); }
  }, [activeTab, user]);

  const loadMyProperties = async () => {
    setLoadingProps(true);
    try {
      const myProps = await propertyService.getMyProperties();
      setMyProperties(myProps);
    } catch { /* ignore */ }
    finally { setLoadingProps(false); }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Delete property?')) return;
    try {
      await propertyService.deleteProperty(id);
      setMyProperties(prev => prev.filter(p => p.id !== id));
    } catch { /* ignore */ }
  };

  const handleAddProperty = () => {
    if (!user?.phone_number && !user?.telegram_handle) {
      setContactWarning('Please add phone number or Telegram in your Profile tab before adding a property');
      return;
    }
    setContactWarning('');
    setEditingProperty(null);
    setIsModalOpen(true);
  };

  const handleEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadMyProperties();
  };

  const getPropertyBadgeClass = (purpose: string | null) => {
    if (purpose === 'rent') return 'badge--rent';
    if (purpose === 'daily_rent') return 'badge--daily';
    return 'badge--sale';
  };

  const getPropertyBadgeLabel = (purpose: string | null) => {
    if (purpose === 'rent') return 'Rent';
    if (purpose === 'daily_rent') return 'Daily';
    return 'Sale';
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M ₽`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K ₽`;
    return `${price} ₽`;
  };

  const getFullImageUrl = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const separator = url.startsWith('/') ? '' : '/';
    return `${baseUrl}${separator}${url}`;
  };

  const getFirstImage = (prop: Property) => {
    if (prop.images && prop.images.length > 0 && prop.images[0]) return prop.images[0];
    return null;
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(''); setProfileSuccess(''); setIsSaving(true);
    if (!profileDraft.full_name.trim()) {
      setProfileError('Full name is required'); setIsSaving(false); return;
    }
    if (profileDraft.phone_number && !/^[+0-9\s\-()]{7,}$/.test(profileDraft.phone_number)) {
      setProfileError('Please enter a valid phone number'); setIsSaving(false); return;
    }
    if (profileDraft.telegram_handle && !/^@[a-zA-Z0-9_]{4,31}$/.test(profileDraft.telegram_handle)) {
      setProfileError('Telegram handle must start with @'); setIsSaving(false); return;
    }
    try {
      const updatedUser = await authService.updateProfile({
        full_name: profileDraft.full_name.trim(),
        phone_number: profileDraft.phone_number || null,
        telegram_handle: profileDraft.telegram_handle || null,
      });
      dispatch(setCredentials({ user: updatedUser, token: localStorage.getItem('accessToken') || '' }));
      setProfileSuccess('Profile updated successfully');
    } catch { setProfileError('Failed to update profile'); }
    finally { setIsSaving(false); }
  };

  const handlePreferencesSave = async () => {
    setPrefError(''); setPrefSuccess(''); setIsSaving(true);
    try {
      await preferencesService.updatePreferences(prefs);
      setPrefSuccess('Preferences saved successfully');
      setWizardMode(false);
      setTimeout(() => navigate('/'), 800);
    } catch { setPrefError('Failed to save preferences'); }
    finally { setIsSaving(false); }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/onboarding');
  };

  const updatePref = useCallback(<K extends keyof UserPreferenceCreate>(
    key: K, value: UserPreferenceCreate[K]
  ) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  if (!isAuthenticated || !user) return null;

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 0: return (
        <div className="wizard-step">
          <div className="wizard-step__icon">🏠</div>
          <h3 className="wizard-step__title">What type of property are you looking for?</h3>

          <CheckboxGroup
            label="Purpose"
            options={[
              { label: 'Sale', value: 'sale' },
              { label: 'Rent', value: 'rent' },
              { label: 'Daily rent', value: 'daily_rent' },
            ]}
            selected={prefs.property_purposes || []}
            onChange={(v) => updatePref('property_purposes', v)}
          />

          {meta.property_types.length > 0 && (
            <CheckboxGroup
              label="Property type"
              options={meta.property_types.map(t => ({ label: t, value: t }))}
              selected={prefs.property_types || []}
              onChange={(v) => updatePref('property_types', v)}
            />
          )}
        </div>
      );

      case 1: return (
        <div className="wizard-step">
          <div className="wizard-step__icon">📐</div>
          <h3 className="wizard-step__title">Set your preferred parameters</h3>
          <p className="wizard-step__hint">Drag the sliders to set your desired range</p>

          <RangeSlider
            label="Price"
            min={0}
            max={50000000}
            step={100000}
            value={[prefs.min_price ?? 0, prefs.max_price ?? 50000000]}
            onChange={([min, max]) => {
              updatePref('min_price', min > 0 ? min : undefined);
              updatePref('max_price', max < 50000000 ? max : undefined);
            }}
            formatLabel={(v) => `${(v / 1000000).toFixed(1)}M ₽`}
          />

          <RangeSlider
            label="Area (m²)"
            min={0}
            max={300}
            step={5}
            value={[prefs.min_area ?? 0, prefs.max_area ?? 300]}
            onChange={([min, max]) => {
              updatePref('min_area', min > 0 ? min : undefined);
              updatePref('max_area', max < 300 ? max : undefined);
            }}
            formatLabel={(v) => `${v} m²`}
          />

          <CheckboxGroup
            label="Rooms"
            options={[
              { label: '1', value: '1' },
              { label: '2', value: '2' },
              { label: '3', value: '3' },
              { label: '4+', value: '4' },
            ]}
            selected={(prefs.preferred_rooms || []).map(String)}
            onChange={(v) => updatePref('preferred_rooms', v.length ? v.map(Number) : undefined)}
          />

          <RangeSlider
            label="Build year"
            min={1960}
            max={2026}
            step={1}
            value={[prefs.min_build_year ?? 1960, prefs.max_build_year ?? 2026]}
            onChange={([min, max]) => {
              updatePref('min_build_year', min > 1960 ? min : undefined);
              updatePref('max_build_year', max < 2026 ? max : undefined);
            }}
          />
        </div>
      );

      case 2: return (
        <div className="wizard-step">
          <div className="wizard-step__icon">📍</div>
          <h3 className="wizard-step__title">Location & Details</h3>
          <p className="wizard-step__hint">Narrow down your search by location and features</p>

          {meta.cities.length > 0 && (
            <CheckboxGroup
              label="City"
              options={meta.cities.map(c => ({ label: c, value: c }))}
              selected={prefs.cities || []}
              onChange={(v) => updatePref('cities', v)}
            />
          )}

          {meta.materials.length > 0 && (
            <CheckboxGroup
              label="Material"
              options={meta.materials.map(m => ({ label: m, value: m }))}
              selected={prefs.material || []}
              onChange={(v) => updatePref('material', v.length ? v : undefined)}
            />
          )}

          {meta.repair_types.length > 0 && (
            <CheckboxGroup
              label="Repair type"
              options={meta.repair_types.map(r => ({ label: r, value: r }))}
              selected={prefs.repair_type || []}
              onChange={(v) => updatePref('repair_type', v.length ? v : undefined)}
            />
          )}
        </div>
      );
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-header__info">
            <h1 className="profile-header__name">{user.full_name || 'User'}</h1>
            <p className="profile-header__email">{user.email}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>Logout</Button>
        </div>

        <div className="profile-tabs">
          <button className={`profile-tab ${activeTab === 'profile' ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}>Profile</button>
          <button className={`profile-tab ${activeTab === 'preferences' ? 'profile-tab--active' : ''}`}
            onClick={() => { setActiveTab('preferences'); setWizardMode(false); setWizardStep(0); }}>AI Preferences</button>
          <button className={`profile-tab ${activeTab === 'my-properties' ? 'profile-tab--active' : ''}`}
            onClick={() => { setActiveTab('my-properties'); setContactWarning(''); }}>My Properties</button>
        </div>

        {activeTab === 'profile' && (
          <form className="profile-section" onSubmit={handleProfileSave}>
            <h2 className="profile-section__title">Contact Information</h2>
            {profileError && <div className="profile-section__error">{profileError}</div>}
            {profileSuccess && <div className="profile-section__success">{profileSuccess}</div>}
            <Input label="Full Name" value={profileDraft.full_name}
              onChange={(e) => setProfileDraft(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="John Doe" />
            <Input label="Phone Number" value={profileDraft.phone_number}
              onChange={(e) => setProfileDraft(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="+79991234567" />
            <Input label="Telegram Handle" value={profileDraft.telegram_handle}
              onChange={(e) => setProfileDraft(prev => ({ ...prev, telegram_handle: e.target.value }))}
              placeholder="@username" />
            <Button type="submit" variant="primary" className="profile-section__submit">Save Changes</Button>
          </form>
        )}

        {activeTab === 'preferences' && !wizardMode && hasLoadedPrefs && (
          <div className="profile-section prefs-summary">
            <div className="prefs-summary__header">
              <h2 className="profile-section__title">AI Preferences</h2>
              <Button variant="primary" onClick={() => setWizardMode(true)}>Edit</Button>
            </div>

            <div className="prefs-summary__grid">
              {prefs.property_purposes && prefs.property_purposes.length > 0 && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Purpose</span>
                  <span className="prefs-summary__value">{prefs.property_purposes.join(', ')}</span>
                </div>
              )}
              {prefs.property_types && prefs.property_types.length > 0 && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Type</span>
                  <span className="prefs-summary__value">{prefs.property_types.join(', ')}</span>
                </div>
              )}
              {(prefs.min_price || prefs.max_price) && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Price</span>
                  <span className="prefs-summary__value">
                    {prefs.min_price && prefs.max_price
                      ? `${(Number(prefs.min_price) / 1000000).toFixed(1)}M – ${(Number(prefs.max_price) / 1000000).toFixed(1)}M`
                      : prefs.min_price
                        ? `from ${(Number(prefs.min_price) / 1000000).toFixed(1)}M`
                        : `up to ${(Number(prefs.max_price) / 1000000).toFixed(1)}M`} ₽
                  </span>
                </div>
              )}
              {(prefs.min_area || prefs.max_area) && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Area</span>
                  <span className="prefs-summary__value">
                    {prefs.min_area && prefs.max_area
                      ? `${prefs.min_area} – ${prefs.max_area} m²`
                      : prefs.min_area
                        ? `from ${prefs.min_area} m²`
                        : `up to ${prefs.max_area} m²`}
                  </span>
                </div>
              )}
              {prefs.preferred_rooms && prefs.preferred_rooms.length > 0 && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Rooms</span>
                  <span className="prefs-summary__value">{prefs.preferred_rooms.join(', ')}</span>
                </div>
              )}
              {(prefs.min_build_year || prefs.max_build_year) && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Build Year</span>
                  <span className="prefs-summary__value">
                    {prefs.min_build_year && prefs.max_build_year
                      ? `${prefs.min_build_year} – ${prefs.max_build_year}`
                      : prefs.min_build_year
                        ? `from ${prefs.min_build_year}`
                        : `up to ${prefs.max_build_year}`}
                  </span>
                </div>
              )}
              {prefs.cities && prefs.cities.length > 0 && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Cities</span>
                  <span className="prefs-summary__value">{prefs.cities.join(', ')}</span>
                </div>
              )}
              {prefs.material && prefs.material.length > 0 && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Material</span>
                  <span className="prefs-summary__value">{prefs.material.join(', ')}</span>
                </div>
              )}
              {prefs.repair_type && prefs.repair_type.length > 0 && (
                <div className="prefs-summary__item">
                  <span className="prefs-summary__label">Repair</span>
                  <span className="prefs-summary__value">{prefs.repair_type.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (wizardMode || !hasLoadedPrefs) && (
          <div className="profile-section preferences-wizard">
            <div className="preferences-wizard__header">
              <div className="preferences-wizard__header-top">
                <h2 className="profile-section__title">AI Preferences</h2>
                {hasLoadedPrefs && (
                  <Button variant="secondary" onClick={() => setWizardMode(false)}>Cancel</Button>
                )}
              </div>
              <p className="preferences-wizard__subtitle">
                {WIZARD_STEPS[wizardStep]} — Step {wizardStep + 1} of {WIZARD_STEPS.length}
              </p>
            </div>

            <div className="wizard-progress">
              {WIZARD_STEPS.map((_, i) => (
                <div key={i}
                  className={`wizard-progress__dot ${i <= wizardStep ? 'wizard-progress__dot--active' : ''} ${i === wizardStep ? 'wizard-progress__dot--current' : ''}`}
                  onClick={() => i <= wizardStep && setWizardStep(i)} />
              ))}
            </div>

            {prefError && <div className="profile-section__error">{prefError}</div>}
            {prefSuccess && <div className="profile-section__success">{prefSuccess}</div>}

            {renderWizardStep()}

            <div className="wizard-actions">
              {wizardStep > 0 && (
                <Button variant="secondary" onClick={() => setWizardStep(wizardStep - 1)}>Back</Button>
              )}
              <div className="wizard-actions__right">
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <Button variant="primary" onClick={() => setWizardStep(wizardStep + 1)}>Next</Button>
                ) : (
                  <Button variant="primary" disabled={isSaving} onClick={handlePreferencesSave}>
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-properties' && (
          <div className="profile-section">
            <div className="profile-section__header">
              <h2 className="profile-section__title">
                My Properties
                {myProperties.length > 0 && (
                  <span className="my-props-count">{myProperties.length}</span>
                )}
              </h2>
              <Button variant="primary" onClick={handleAddProperty}>Add Property</Button>
            </div>
            {contactWarning && <div className="profile-section__error">{contactWarning}</div>}
            {loadingProps ? (
              <div className="my-props-loading">Loading...</div>
            ) : myProperties.length === 0 ? (
              <div className="my-props-empty">
                <div className="my-props-empty__icon">🏠</div>
                <h3>No properties yet</h3>
                <p>Add your first property listing to get started</p>
                <Button variant="primary" onClick={handleAddProperty}>Add Property</Button>
              </div>
            ) : (
              <div className="my-props-grid">
                {myProperties.map(prop => {
                  const img = getFirstImage(prop);
                  return (
                    <div key={prop.id} className="mp-card">
                      <div className="mp-card__image" onClick={() => navigate(`/property/${prop.id}`)}>
                        {img ? (
                          <img src={getFullImageUrl(img)} alt={prop.title} />
                        ) : (
                          <div className="mp-card__placeholder">🏠</div>
                        )}
                        <span className={`mp-card__badge ${getPropertyBadgeClass(prop.property_purpose)}`}>
                          {getPropertyBadgeLabel(prop.property_purpose)}
                        </span>
                        {prop.property_purpose === 'sale' && prop.price >= 1000000 && (
                          <span className="mp-card__mortgage">Mortgage available</span>
                        )}
                      </div>
                      <div className="mp-card__body">
                        <h3 className="mp-card__title" onClick={() => navigate(`/property/${prop.id}`)}>
                          {prop.title}
                        </h3>
                        <div className="mp-card__price">{formatPrice(prop.price)}</div>
                        <div className="mp-card__specs">
                          {prop.rooms && <div className="mp-card__spec"><span>🛏</span> {prop.rooms} rooms</div>}
                          {prop.area && <div className="mp-card__spec"><span>📐</span> {prop.area} m²</div>}
                          {prop.floor && <div className="mp-card__spec"><span>🏗</span> Floor {prop.floor}{prop.total_floors ? `/${prop.total_floors}` : ''}</div>}
                          {prop.build_year && <div className="mp-card__spec"><span>📅</span> {prop.build_year}</div>}
                        </div>
                        <div className="mp-card__tags">
                          {prop.property_type && <span className="mp-card__tag">{prop.property_type}</span>}
                          {prop.city && <span className="mp-card__tag">{prop.city}</span>}
                          {prop.material && <span className="mp-card__tag">{prop.material}</span>}
                          {prop.repair_type && <span className="mp-card__tag">{prop.repair_type}</span>}
                          {prop.balcony === 'yes' && <span className="mp-card__tag mp-card__tag--green">Balcony</span>}
                          {prop.parking && prop.parking !== 'no' && <span className="mp-card__tag mp-card__tag--green">{prop.parking === 'paid' ? 'Paid parking' : 'Parking'}</span>}
                        </div>
                        <div className="mp-card__actions">
                          <Button variant="secondary" onClick={() => handleEditProperty(prop)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Edit
                          </Button>
                          <Button variant="secondary" onClick={() => handleDeleteProperty(prop.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <PropertyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        property={editingProperty}
      />
    </div>
  );
};

export default Profile;
