import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import Profile from '@pages/profile/Profile';
import type { Property } from '@shared/api/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mocks = vi.hoisted(() => ({
  mockGetMeta: vi.fn().mockResolvedValue({ cities: ['Moscow'], materials: ['Brick', 'Panel'], repair_types: ['Cosmetic', 'Euro'], property_types: ['Apartment', 'House'] }),
  mockGetMyProperties: vi.fn().mockResolvedValue([]),
  mockDeleteProperty: vi.fn().mockResolvedValue(undefined),
  mockGetPreferences: vi.fn().mockResolvedValue({}),
  mockUpdatePreferences: vi.fn().mockResolvedValue({}),
  mockUpdateProfile: vi.fn().mockResolvedValue({}),
}));

vi.mock('@shared/api/properties.service', () => ({
  propertyService: {
    getMeta: mocks.mockGetMeta,
    getMyProperties: mocks.mockGetMyProperties,
    deleteProperty: mocks.mockDeleteProperty,
  },
}));

vi.mock('@shared/api/preferences.service', () => ({
  preferencesService: {
    getPreferences: mocks.mockGetPreferences,
    updatePreferences: mocks.mockUpdatePreferences,
  },
}));

vi.mock('@shared/api/auth.service', () => ({
  authService: {
    updateProfile: mocks.mockUpdateProfile,
  },
}));

vi.mock('@pages/profile/PropertyFormModal', () => ({
  default: ({ isOpen, onClose, onSuccess, property }: any) =>
    isOpen ? (
      <div data-testid="property-form-modal">
        <button data-testid="pf-close" onClick={onClose}>Close</button>
        <button data-testid="pf-success" onClick={onSuccess}>Success</button>
        <span data-testid="pf-mode">{property ? `edit:${property.id}` : 'create'}</span>
      </div>
    ) : null,
}));

const mockUser = {
  id: '1',
  email: 'test@test.com',
  full_name: 'Test User',
  phone_number: '+79991234567',
  telegram_handle: '@testuser',
};

const createStore = (isAuthenticated = true, user: typeof mockUser | null = mockUser) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { user, token: isAuthenticated ? 'token123' : null, isAuthenticated },
    },
  });

function renderProfile(store = createStore()) {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    </Provider>
  );
}

const mockProperties: Property[] = [
  {
    id: 'p1', title: 'Luxury Apartment', description: 'Nice place', price: 5000000,
    area: 80, rooms: 3, floor: 5, total_floors: 12,
    property_type: 'Apartment', property_purpose: 'sale', category: null,
    address: 'Tverskaya 1', city: 'Moscow', district: 'Central', metro: null,
    lat: 55.76, lon: 37.62,
    images: ['https://example.com/img1.jpg'],
    sq_living: null, sq_kitchen: null, build_year: 2020,
    material: 'Brick', repair_type: 'Cosmetic', room_type: null, is_new: null,
    balcony: 'yes', parking: 'no',
    owner: { id: 'o1', full_name: 'Owner', phone_number: null, telegram_handle: null },
    views_count: 10, likes_count: 2,
  },
  {
    id: 'p2', title: 'Studio Rent', description: null, price: 80000,
    area: null, rooms: null, floor: null, total_floors: null,
    property_type: null, property_purpose: 'rent', category: null,
    address: 'Arbat 5', city: null, district: null, metro: null,
    lat: 0, lon: 0,
    images: [],
    sq_living: null, sq_kitchen: null, build_year: null,
    material: null, repair_type: null, room_type: null, is_new: null,
    balcony: null, parking: null,
    owner: { id: 'o1', full_name: 'Owner', phone_number: null, telegram_handle: null },
    views_count: 5, likes_count: 0,
  },
  {
    id: 'p3', title: 'Daily Rental', description: 'Cozy', price: 1500000,
    area: 45, rooms: 1, floor: 3, total_floors: 9,
    property_type: 'Studio', property_purpose: 'daily_rent', category: null,
    address: 'Garden Ring', city: 'Moscow', district: null, metro: null,
    lat: 55.77, lon: 37.61,
    images: [],
    sq_living: null, sq_kitchen: null, build_year: 2018,
    material: 'Panel', repair_type: 'Euro', room_type: null, is_new: null,
    balcony: 'no', parking: 'paid',
    owner: { id: 'o1', full_name: 'Owner', phone_number: null, telegram_handle: null },
    views_count: 3, likes_count: 0,
  },
  {
    id: 'p4', title: 'Budget Studio', description: null, price: 500,
    area: null, rooms: null, floor: null, total_floors: null,
    property_type: null, property_purpose: 'sale', category: null,
    address: 'Outskirts', city: 'Moscow', district: null, metro: null,
    lat: 0, lon: 0,
    images: ['/uploads/budget.jpg'],
    sq_living: null, sq_kitchen: null, build_year: null,
    material: null, repair_type: null, room_type: null, is_new: null,
    balcony: null, parking: 'yes',
    owner: { id: 'o1', full_name: 'Owner', phone_number: null, telegram_handle: null },
    views_count: 1, likes_count: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockGetMeta.mockResolvedValue({ cities: ['Moscow'], materials: ['Brick', 'Panel'], repair_types: ['Cosmetic', 'Euro'], property_types: ['Apartment', 'House'] });
  mocks.mockGetMyProperties.mockResolvedValue([]);
  mocks.mockDeleteProperty.mockResolvedValue(undefined);
  mocks.mockGetPreferences.mockResolvedValue({});
  mocks.mockUpdatePreferences.mockResolvedValue({});
  mocks.mockUpdateProfile.mockResolvedValue(mockUser);
});

describe('Profile Page', () => {
  describe('Authentication', () => {
    it('redirects to /login when not authenticated', () => {
      renderProfile(createStore(false, null));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('renders nothing and returns null when not authenticated', () => {
      const { container } = renderProfile(createStore(false, null));
      expect(container.innerHTML).toBeFalsy();
    });
  });

  describe('Header', () => {
    it('renders user name and email', () => {
      renderProfile();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@test.com')).toBeInTheDocument();
    });

    it('shows fallback User when full_name is empty', () => {
      renderProfile(createStore(true, { ...mockUser, full_name: '' }));
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('renders Logout button', () => {
      renderProfile();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('dispatches logout and navigates to /onboarding on click', () => {
      renderProfile();
      fireEvent.click(screen.getByText('Logout'));
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
    });
  });

  describe('Tabs', () => {
    it('renders all three tabs', () => {
      renderProfile();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('AI Preferences')).toBeInTheDocument();
      expect(screen.getByText('My Properties')).toBeInTheDocument();
    });

    it('has Profile tab active by default', () => {
      renderProfile();
      expect(screen.getByText('Profile').closest('button')!.className).toContain('profile-tab--active');
    });

    it('switches to AI Preferences tab and shows Edit button', async () => {
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
      expect(screen.getAllByText('AI Preferences')[0].closest('button')!.className).toContain('profile-tab--active');
    });

    it('switches to My Properties tab and shows empty state', async () => {
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      expect(await screen.findByText('No properties yet')).toBeInTheDocument();
      expect(screen.getByText(/Add your first property listing/)).toBeInTheDocument();
    });

    it('clears contact warning when switching to My Properties tab', async () => {
      renderProfile(createStore(true, { ...mockUser, phone_number: '', telegram_handle: '' }));
      fireEvent.click(screen.getByText('My Properties'));
      fireEvent.click(screen.getAllByText('Add Property')[0]);
      expect(screen.getByText(/Please add phone number/)).toBeInTheDocument();
      fireEvent.click(screen.getAllByText('My Properties')[0]);
      expect(screen.queryByText(/Please add phone number/)).not.toBeInTheDocument();
    });
  });

  describe('Profile form', () => {
    it('pre-fills form fields from user data', () => {
      renderProfile();
      expect((screen.getByPlaceholderText('John Doe') as HTMLInputElement).value).toBe('Test User');
      expect((screen.getByPlaceholderText('+79991234567') as HTMLInputElement).value).toBe('+79991234567');
      expect((screen.getByPlaceholderText('@username') as HTMLInputElement).value).toBe('@testuser');
    });

    it('updates input values on typing', () => {
      renderProfile();
      const input = screen.getByPlaceholderText('John Doe') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Name' } });
      expect(input.value).toBe('New Name');
    });

    it('shows error when full name is empty on submit', () => {
      renderProfile();
      fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: '' } });
      fireEvent.click(screen.getByText('Save Changes'));
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
    });

    it('shows error for invalid phone number format', () => {
      renderProfile();
      fireEvent.change(screen.getByPlaceholderText('+79991234567'), { target: { value: 'abc' } });
      fireEvent.click(screen.getByText('Save Changes'));
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });

    it('accepts empty phone number', () => {
      renderProfile(createStore(true, { ...mockUser, phone_number: '' }));
      fireEvent.click(screen.getByText('Save Changes'));
      expect(screen.queryByText('Please enter a valid phone number')).not.toBeInTheDocument();
    });

    it('shows error for invalid telegram handle without @', () => {
      renderProfile();
      fireEvent.change(screen.getByPlaceholderText('@username'), { target: { value: 'badhandle' } });
      fireEvent.click(screen.getByText('Save Changes'));
      expect(screen.getByText('Telegram handle must start with @')).toBeInTheDocument();
    });

    it('shows error for telegram handle too short', () => {
      renderProfile();
      fireEvent.change(screen.getByPlaceholderText('@username'), { target: { value: '@ab' } });
      fireEvent.click(screen.getByText('Save Changes'));
      expect(screen.getByText('Telegram handle must start with @')).toBeInTheDocument();
    });

    it('accepts empty telegram handle', () => {
      renderProfile(createStore(true, { ...mockUser, telegram_handle: '' }));
      fireEvent.click(screen.getByText('Save Changes'));
      expect(screen.queryByText('Telegram handle must start with @')).not.toBeInTheDocument();
    });

    it('shows success on profile update', async () => {
      const updatedUser = { ...mockUser, full_name: 'Updated' };
      mocks.mockUpdateProfile.mockResolvedValue(updatedUser);
      renderProfile();
      fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { value: 'Updated' } });
      fireEvent.click(screen.getByText('Save Changes'));
      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      });
      expect(mocks.mockUpdateProfile).toHaveBeenCalledWith({
        full_name: 'Updated',
        phone_number: '+79991234567',
        telegram_handle: '@testuser',
      });
    });

    it('shows error on profile update failure', async () => {
      mocks.mockUpdateProfile.mockRejectedValue(new Error('fail'));
      renderProfile();
      fireEvent.click(screen.getByText('Save Changes'));
      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
      });
    });
  });

  describe('AI Preferences tab - summary', () => {
    it('renders all preference fields in summary', async () => {
      mocks.mockGetPreferences.mockResolvedValue({
        min_price: 1000000, max_price: 5000000, min_area: 30, max_area: 100,
        preferred_rooms: [1, 2, 3], property_types: ['Apartment'],
        property_purposes: ['sale', 'rent'], cities: ['Moscow'],
        material: ['Brick'], repair_type: ['Cosmetic'],
        min_build_year: 2000, max_build_year: 2026,
      });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText('Edit')).toBeInTheDocument(); });
      expect(screen.getByText(/1\.0M/)).toBeInTheDocument();
      expect(screen.getByText('1, 2, 3')).toBeInTheDocument();
      expect(screen.getByText('sale, rent')).toBeInTheDocument();
      expect(screen.getByText('Brick')).toBeInTheDocument();
    });

    it('shows min-only price', async () => {
      mocks.mockGetPreferences.mockResolvedValue({ min_price: 2000000 });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText(/from 2\.0M/)).toBeInTheDocument(); });
    });

    it('shows max-only price', async () => {
      mocks.mockGetPreferences.mockResolvedValue({ max_price: 3000000 });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText(/up to 3\.0M/)).toBeInTheDocument(); });
    });

    it('shows min-only area', async () => {
      mocks.mockGetPreferences.mockResolvedValue({ min_area: 50 });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText(/from 50/)).toBeInTheDocument(); });
    });

    it('shows max-only area', async () => {
      mocks.mockGetPreferences.mockResolvedValue({ max_area: 150 });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText(/up to 150/)).toBeInTheDocument(); });
    });

    it('shows min-only build year', async () => {
      mocks.mockGetPreferences.mockResolvedValue({ min_build_year: 2010 });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText(/from 2010/)).toBeInTheDocument(); });
    });

    it('shows max-only build year', async () => {
      mocks.mockGetPreferences.mockResolvedValue({ max_build_year: 2023 });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText(/up to 2023/)).toBeInTheDocument(); });
    });
  });

  describe('AI Preferences tab - wizard', () => {
    beforeEach(async () => {
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { fireEvent.click(screen.getByText('Edit')); });
    });

    it('shows step 1 with checkboxes', () => {
      expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
      expect(screen.getByText('Purpose')).toBeInTheDocument();
      expect(screen.getByText('Property type')).toBeInTheDocument();
    });

    it('navigates to step 2', () => {
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Rooms')).toBeInTheDocument();
    });

    it('navigates to step 3', () => {
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(/Step 3 of 3/)).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
    });

    it('navigates back from step 2', () => {
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
    });

    it('navigates back from step 3', () => {
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
    });

    it('saves preferences on final step', async () => {
      mocks.mockUpdatePreferences.mockResolvedValue({});
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Save Preferences'));
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
      expect(mocks.mockUpdatePreferences).toHaveBeenCalled();
    });

    it('shows error on preferences save failure', async () => {
      mocks.mockUpdatePreferences.mockRejectedValue(new Error('fail'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Save Preferences'));
      await waitFor(() => {
        expect(screen.getByText('Failed to save preferences')).toBeInTheDocument();
      });
    });

    it('toggles a checkbox in step 1 to cover updatePref', () => {
      const saleCheckbox = screen.getByText('Sale').closest('label')!.querySelector('input')!;
      fireEvent.click(saleCheckbox);
      expect(saleCheckbox).toBeChecked();
    });

    it('clicks progress dot to navigate back', () => {
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      const dots = document.querySelectorAll('.wizard-progress__dot');
      fireEvent.click(dots[0]);
      expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
    });

    it('shows Saving text while submitting', async () => {
      mocks.mockUpdatePreferences.mockImplementation(() => new Promise(() => {}));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Save Preferences'));
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('cancel returns to summary', () => {
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('wizard progress dots are rendered', () => {
      const dots = document.querySelectorAll('.wizard-progress__dot');
      expect(dots.length).toBe(3);
    });

  });

  describe('AI Preferences tab - edge cases', () => {
    it('handles getMeta rejection gracefully', async () => {
      mocks.mockGetMeta.mockRejectedValue(new Error('fail'));
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText('Edit')).toBeInTheDocument(); });
      expect(screen.queryByText('Property type')).not.toBeInTheDocument();
    });

    it('handles getPreferences rejection gracefully', async () => {
      mocks.mockGetPreferences.mockRejectedValue(new Error('fail'));
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { expect(screen.getByText('Next')).toBeInTheDocument(); });
    });
  });

  describe('AI Preferences tab - meta filtering', () => {
    it('hides property type checkbox when meta is empty', async () => {
      mocks.mockGetMeta.mockResolvedValue({ cities: [], materials: [], repair_types: [], property_types: [] });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { fireEvent.click(screen.getByText('Edit')); });
      expect(screen.queryByText('Property type')).not.toBeInTheDocument();
    });

    it('hides location checkboxes when meta is empty in step 3', async () => {
      mocks.mockGetMeta.mockResolvedValue({ cities: [], materials: [], repair_types: [], property_types: ['Apartment'] });
      renderProfile();
      fireEvent.click(screen.getByText('AI Preferences'));
      await waitFor(() => { fireEvent.click(screen.getByText('Edit')); });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      expect(screen.queryByText('City')).not.toBeInTheDocument();
      expect(screen.queryByText('Material')).not.toBeInTheDocument();
      expect(screen.queryByText('Repair type')).not.toBeInTheDocument();
    });
  });

  describe('My Properties tab', () => {
    it('shows loading state', () => {
      mocks.mockGetMyProperties.mockImplementation(() => new Promise(() => {}));
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows empty state when no properties', async () => {
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      expect(await screen.findByText('No properties yet')).toBeInTheDocument();
    });

    it('shows property count badge', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });
    });

    it('renders property cards with all specs', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Luxury Apartment');
      expect(screen.getByText('5.0M ?')).toBeInTheDocument();
      expect(screen.getByText('3 rooms')).toBeInTheDocument();
      expect(screen.getByText('80 m?')).toBeInTheDocument();
      expect(screen.getByText('Floor 5/12')).toBeInTheDocument();
      expect(screen.getByText('2020')).toBeInTheDocument();
      expect(screen.getByText('Apartment')).toBeInTheDocument();
      expect(screen.getAllByText('Moscow').length).toBeGreaterThan(0);
      expect(screen.getByText('Brick')).toBeInTheDocument();
      expect(screen.getByText('Cosmetic')).toBeInTheDocument();
      expect(screen.getByText('Balcony')).toBeInTheDocument();
    });

    it('renders rent property without image', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Studio Rent');
      expect(screen.getByText('80K ?')).toBeInTheDocument();
      expect(screen.getByText('Rent')).toBeInTheDocument();
    });

    it('renders daily_rent badge', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Daily');
    });

    it('handles loadMyProperties rejection gracefully', async () => {
      mocks.mockGetMyProperties.mockRejectedValue(new Error('fail'));
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('navigates to property page on card image click', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Luxury Apartment');
      const images = document.querySelectorAll('.mp-card__image');
      fireEvent.click(images[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/property/p1');
    });

    it('shows Mortgage badge for sale >= 1M', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Mortgage available');
    });

    it('formats price below 1000 correctly', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Budget Studio');
      expect(screen.getByText('500 ?')).toBeInTheDocument();
    });

    it('renders relative image URL with full path', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Budget Studio');
      const imgs = document.querySelectorAll('.mp-card__image img');
      const budgetImg = imgs[imgs.length - 1] as HTMLImageElement;
      expect(budgetImg.src).toContain('/uploads/budget.jpg');
    });

    it('renders image for property with image', async () => {
      mocks.mockGetMyProperties.mockResolvedValue([mockProperties[0]]);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Luxury Apartment');
      const img = screen.getByAltText('Luxury Apartment') as HTMLImageElement;
      expect(img.src).toBe('https://example.com/img1.jpg');
    });

    it('deletes property with confirmation', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Luxury Apartment');
      fireEvent.click(screen.getAllByText('Delete')[0]);
      fireEvent.click(screen.getByText('Confirm'));
      await waitFor(() => {
        expect(mocks.mockDeleteProperty).toHaveBeenCalledWith('p1');
      });
    });

    it('cancels delete when Cancel clicked', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Luxury Apartment');
      fireEvent.click(screen.getAllByText('Delete')[0]);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mocks.mockDeleteProperty).not.toHaveBeenCalled();
    });

    it('opens edit modal when Edit button clicked', async () => {
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Luxury Apartment');
      fireEvent.click(screen.getAllByText('Edit')[0]);
      expect(screen.getByTestId('property-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('pf-mode').textContent).toBe('edit:p1');
    });

    it('opens create modal via Add Property button', async () => {
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('No properties yet');
      fireEvent.click(screen.getAllByText('Add Property')[0]);
      expect(screen.getByTestId('property-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('pf-mode').textContent).toBe('create');
    });

    it('shows contact warning when adding property without phone/telegram', () => {
      renderProfile(createStore(true, { ...mockUser, phone_number: '', telegram_handle: '' }));
      fireEvent.click(screen.getByText('My Properties'));
      fireEvent.click(screen.getAllByText('Add Property')[0]);
      expect(screen.getByText(/Please add phone number or Telegram/)).toBeInTheDocument();
    });

    it('closes modal via onClose', async () => {
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('No properties yet');
      fireEvent.click(screen.getAllByText('Add Property')[0]);
      expect(screen.getByTestId('property-form-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('pf-close'));
      expect(screen.queryByTestId('property-form-modal')).not.toBeInTheDocument();
    });

    it('reloads properties on modal success', async () => {
      mocks.mockGetMyProperties.mockResolvedValue([]);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('No properties yet');
      fireEvent.click(screen.getAllByText('Add Property')[0]);
      mocks.mockGetMyProperties.mockResolvedValue(mockProperties);
      fireEvent.click(screen.getByTestId('pf-success'));
      await waitFor(() => {
        expect(screen.getByText('Luxury Apartment')).toBeInTheDocument();
      });
    });

    it('shows parking tag for paid parking', async () => {
      mocks.mockGetMyProperties.mockResolvedValue([mockProperties[2]]);
      renderProfile();
      fireEvent.click(screen.getByText('My Properties'));
      await screen.findByText('Paid parking');
    });
  });
});
