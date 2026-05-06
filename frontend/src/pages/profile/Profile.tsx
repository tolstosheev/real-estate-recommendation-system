import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout, setCredentials } from '@entities/user/model/slice';
import type { UserPreferenceCreate } from '@entities/user/model/types';
import type { Property } from '@entities/property/model/types';
import { preferencesService } from '@shared/api/preferences.service';
import { authService } from '@shared/api/auth.service';
import { propertyService } from '@shared/api/properties.service';
import Button from '@shared/ui/Button';
import Input from '@shared/ui/Input';
import './Profile.scss';

const DISTRICT_OPTIONS = [
  'CAO', 'SAO', 'SVAO', 'VAO', 'YVAO', 'YUAO', 'YZAO', 'ZAO', 'SZAO', 'NAO',
];

const METRO_OPTIONS = [
  'Tverskaya', 'Pushkinskaya', 'Chekhovskaya', 'Kurskaya', 'Belorusskaya',
  'Prospekt Mira', 'Novoslobodskaya', 'Kievskaya', 'Smolenskaya',
];

const MATERIAL_OPTIONS = ['Brick', 'Panel', 'Monolith', 'Brick-Monolith', 'Wood', 'Block'];

const REPAIR_TYPE_OPTIONS = ['Cosmetic', 'Euro', 'Design', 'Rough'];

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'my-properties'>('profile');
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);

  const [profileDraft, setProfileDraft] = useState({
    full_name: '',
    phone_number: '',
    telegram_handle: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [prefDistrict, setPrefDistrict] = useState('');
  const [prefMetro, setPrefMetro] = useState('');
  const [prefMaterial, setPrefMaterial] = useState('');
  const [prefRepairType, setPrefRepairType] = useState('');
  const [prefMinBuildYear, setPrefMinBuildYear] = useState('');
  const [prefMaxBuildYear, setPrefMaxBuildYear] = useState('');
  const [prefError, setPrefError] = useState('');
  const [prefSuccess, setPrefSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userLoadedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!user || userLoadedRef.current) return;

    userLoadedRef.current = true;

    const newDraft = {
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      telegram_handle: user.telegram_handle || '',
    };

    setProfileDraft(newDraft);

    preferencesService.getPreferences()
      .then((data) => {
        if (data.min_price) setMinPrice(String(data.min_price));
        if (data.max_price) setMaxPrice(String(data.max_price));
        if (data.min_area) setMinArea(String(data.min_area));
        if (data.district) setPrefDistrict(data.district);
        if (data.metro) setPrefMetro(data.metro);
        if (data.material) setPrefMaterial(data.material);
        if (data.repair_type) setPrefRepairType(data.repair_type);
        if (data.min_build_year) setPrefMinBuildYear(String(data.min_build_year));
        if (data.max_build_year) setPrefMaxBuildYear(String(data.max_build_year));
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (activeTab === 'my-properties' && user) {
      loadMyProperties();
    }
  }, [activeTab, user]);

  const loadMyProperties = async () => {
    setLoadingProps(true);
    try {
      const allProps = await propertyService.getProperties();
      const myProps = allProps.filter(p => p.owner?.id === user?.id);
      setMyProperties(myProps);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoadingProps(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Удалить объект?')) return;
    try {
      await propertyService.deleteProperty(id);
      setMyProperties(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsSaving(true);

    if (!profileDraft.full_name.trim()) {
      setProfileError('Full name is required');
      setIsSaving(false);
      return;
    }

    if (profileDraft.phone_number && !/^[+0-9\s\-()]{7,}$/.test(profileDraft.phone_number)) {
      setProfileError('Please enter a valid phone number (e.g. +79991234567)');
      setIsSaving(false);
      return;
    }

    if (profileDraft.telegram_handle && !/^@[a-zA-Z0-9_]{4,31}$/.test(profileDraft.telegram_handle)) {
      setProfileError('Telegram handle must start with @ and be 4-31 characters (e.g. @username)');
      setIsSaving(false);
      return;
    }

    try {
      const updatedUser = await authService.updateProfile({
        full_name: profileDraft.full_name.trim(),
        phone_number: profileDraft.phone_number || undefined,
        telegram_handle: profileDraft.telegram_handle || undefined,
      });
      dispatch(setCredentials({ user: updatedUser, token: localStorage.getItem('accessToken') || '' }));
      setProfileSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      setProfileError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferencesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefError('');
    setPrefSuccess('');
    setIsSaving(true);

    const data: UserPreferenceCreate = {
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      min_area: minArea ? Number(minArea) : undefined,
      district: prefDistrict || undefined,
      metro: prefMetro || undefined,
      material: prefMaterial || undefined,
      repair_type: prefRepairType || undefined,
      min_build_year: prefMinBuildYear ? Number(prefMinBuildYear) : undefined,
      max_build_year: prefMaxBuildYear ? Number(prefMaxBuildYear) : undefined,
    };

    try {
      await preferencesService.updatePreferences(data);
      setPrefSuccess('Preferences saved successfully');
    } catch {
      setPrefError('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/onboarding');
  };

  if (!isAuthenticated || !user) return null;

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
          <button
            className={`profile-tab ${activeTab === 'profile' ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`profile-tab ${activeTab === 'preferences' ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            AI Preferences
          </button>
          <button
            className={`profile-tab ${activeTab === 'my-properties' ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab('my-properties')}
          >
            My Properties
          </button>
        </div>

        {activeTab === 'profile' && (
          <form className="profile-section" onSubmit={handleProfileSave}>
            <h2 className="profile-section__title">Contact Information</h2>
            {profileError && <div className="profile-section__error">{profileError}</div>}
            {profileSuccess && <div className="profile-section__success">{profileSuccess}</div>}
            <Input
              label="Full Name"
              value={profileDraft.full_name}
              onChange={(e) => setProfileDraft(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="John Doe"
            />
            <Input
              label="Phone Number"
              value={profileDraft.phone_number}
              onChange={(e) => setProfileDraft(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="+79991234567"
            />
            <Input
              label="Telegram Handle"
              value={profileDraft.telegram_handle}
              onChange={(e) => setProfileDraft(prev => ({ ...prev, telegram_handle: e.target.value }))}
              placeholder="@username"
            />
            <Button type="submit" variant="primary" className="profile-section__submit">
              Save Changes
            </Button>
          </form>
        )}

        {activeTab === 'preferences' && (
          <form className="profile-section" onSubmit={handlePreferencesSave}>
            <h2 className="profile-section__title">Search Filters</h2>
            {prefError && <div className="profile-section__error">{prefError}</div>}
            {prefSuccess && <div className="profile-section__success">{prefSuccess}</div>}

            <div className="profile-prefs__grid">
              <Input
                label="Min Price (₽)"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="100000"
              />
              <Input
                label="Max Price (₽)"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="500000"
              />
              <Input
                label="Min Area (m²)"
                type="number"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder="50"
              />
              <Input
                label="Min Build Year"
                type="number"
                value={prefMinBuildYear}
                onChange={(e) => setPrefMinBuildYear(e.target.value)}
                placeholder="2000"
              />
              <Input
                label="Max Build Year"
                type="number"
                value={prefMaxBuildYear}
                onChange={(e) => setPrefMaxBuildYear(e.target.value)}
                placeholder="2023"
              />
              <select
                className="profile-prefs__select"
                value={prefDistrict}
                onChange={(e) => setPrefDistrict(e.target.value)}
              >
                <option value="">Any district</option>
                {DISTRICT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                className="profile-prefs__select"
                value={prefMetro}
                onChange={(e) => setPrefMetro(e.target.value)}
              >
                <option value="">Any metro</option>
                {METRO_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                className="profile-prefs__select"
                value={prefMaterial}
                onChange={(e) => setPrefMaterial(e.target.value)}
              >
                <option value="">Any material</option>
                {MATERIAL_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                className="profile-prefs__select"
                value={prefRepairType}
                onChange={(e) => setPrefRepairType(e.target.value)}
              >
                <option value="">Any repair type</option>
                {REPAIR_TYPE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="profile-section__submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        )}

        {activeTab === 'my-properties' && (
          <div className="profile-section">
            <div className="profile-section__header">
              <h2 className="profile-section__title">My Properties</h2>
              <Button variant="primary" onClick={() => navigate('/add-property')}>
                Add Property
              </Button>
            </div>
            {loadingProps ? (
              <p>Loading...</p>
            ) : (
              <div className="my-properties-list">
                {myProperties.length === 0 ? (
                  <p>You have no properties yet.</p>
                ) : (
                  myProperties.map(prop => (
                    <div key={prop.id} className="my-property-card">
                      <div className="my-property-card__info">
                        <h3>{prop.title}</h3>
                        <p>{prop.price.toLocaleString()} ₽ • {prop.area} m²</p>
                        <p className="my-property-card__address">{prop.address}</p>
                      </div>
                      <div className="my-property-card__actions">
                        <Button variant="secondary" onClick={() => handleDeleteProperty(prop.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
