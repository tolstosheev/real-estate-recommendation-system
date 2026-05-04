import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout, setCredentials } from '@entities/user/model/slice';
import type { UserPreferenceCreate } from '@entities/user/model/types';
import { preferencesService } from '@shared/api/preferences.service';
import { authService } from '@shared/api/auth.service';
import Button from '@shared/ui/Button';
import Input from '@shared/ui/Input';
import Chip from '@shared/ui/Chip';
import './Profile.scss';

const TAG_OPTIONS = [
  'center', 'suburbs', 'quiet', 'modern', 'historic',
  'parks', 'transport', 'schools', 'shops', 'waterfront',
  'new-building', 'renovation', 'luxury', 'budget',
];

const PRIORITY_KEYS = ['price', 'area', 'rooms', 'location'];

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  const [profileDraft, setProfileDraft] = useState({
    full_name: '',
    phone_number: '',
    telegram_handle: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [prefTags, setPrefTags] = useState<string[]>([]);
  const [prefPriority, setPrefPriority] = useState<Record<string, number>>({
    price: 50,
    area: 50,
    rooms: 50,
    location: 50,
  });
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
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
        if (data.tags) setPrefTags(data.tags);
        if (data.priority_weight) setPrefPriority(data.priority_weight);
        if (data.min_price) setMinPrice(String(data.min_price));
        if (data.max_price) setMaxPrice(String(data.max_price));
        if (data.min_area) setMinArea(String(data.min_area));
      })
      .catch(() => {});
  }, [user]);

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

  const toggleTag = (tag: string) => {
    setPrefTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handlePriorityChange = (key: string, value: number) => {
    setPrefPriority(prev => ({ ...prev, [key]: value }));
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
      tags: prefTags.length > 0 ? prefTags : undefined,
      priority_weight: prefPriority,
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
            </div>

            <div className="profile-prefs__group">
              <label className="profile-prefs__label">Atmosphere Tags</label>
              <p className="profile-prefs__hint">Select the atmosphere you prefer</p>
              <div className="profile-prefs__chips">
                {TAG_OPTIONS.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    active={prefTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  />
                ))}
              </div>
            </div>

            <div className="profile-prefs__group">
              <label className="profile-prefs__label">Priority Weights</label>
              <p className="profile-prefs__hint">Adjust what matters most to you</p>
              {PRIORITY_KEYS.map(key => (
                <div key={key} className="profile-prefs__slider-group">
                  <span className="profile-prefs__slider-label">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={prefPriority[key] || 50}
                    onChange={(e) => handlePriorityChange(key, Number(e.target.value))}
                    className="profile-prefs__slider"
                  />
                  <span className="profile-prefs__slider-value">{prefPriority[key] || 50}%</span>
                </div>
              ))}
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
      </div>
    </div>
  );
};

export default Profile;
