import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import AddPropertyPage from '@pages/add-property/AddPropertyPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGeocodeAddress = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock('@shared/api/geocoder.service', () => ({
  geocodeAddress: mockGeocodeAddress,
}));

const mockCreateProperty = vi.hoisted(() => vi.fn());
vi.mock('@shared/api/properties.service', () => ({
  propertyService: {
    createProperty: (...args: unknown[]) => mockCreateProperty(...args),
    getMeta: vi.fn().mockResolvedValue({ metro: [] }),
  },
}));

vi.mock('@features/property/upload-images/ui/ImageUploader', () => ({
  ImageUploader: (props: { images: string[]; onChange: (urls: string[]) => void }) => (
    <div data-testid="image-uploader" onClick={() => props.onChange(['http://example.com/img.jpg'])}>Upload Image</div>
  ),
}));

const mockUser = {
  id: '1',
  email: 'test@test.com',
  full_name: 'Test User',
  phone_number: '+79991234567',
  telegram_handle: null,
};

const createStore = (user = mockUser) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: {
    auth: { user, token: 'token123', isAuthenticated: true },
  },
});

const renderAddProperty = (store = createStore()) => render(
  <Provider store={store}>
    <BrowserRouter>
      <AddPropertyPage />
    </BrowserRouter>
  </Provider>
);

function getSelectByName(name: string): HTMLSelectElement {
  const el = document.querySelector(`select[name="${name}"]`);
  if (!el) throw new Error(`Select with name "${name}" not found`);
  return el as HTMLSelectElement;
}

describe('AddPropertyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeocodeAddress.mockResolvedValue(null);
  });

  it('renders the form with stepper', () => {
    renderAddProperty();
    expect(screen.getByText('Add New Property')).toBeInTheDocument();
    expect(screen.getByText('1. Basic')).toBeInTheDocument();
    expect(screen.getByText('2. Details')).toBeInTheDocument();
    expect(screen.getByText('3. Location')).toBeInTheDocument();
  });

  it('renders basic info fields on step 1', () => {
    renderAddProperty();
    expect(screen.getByPlaceholderText('Modern Apartment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('5000000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('2')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('65.5')).toBeInTheDocument();
  });

  it('navigates to step 2 on Next click', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('10')).toBeInTheDocument();
  });

  it('shows error when required fields are empty on submit', async () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Test Address' } });
    fireEvent.click(screen.getByText('Submit Property'));
    await waitFor(() => {
      expect(screen.getByText(/Please fill required fields/i)).toBeInTheDocument();
    });
  });

  it('shows error when user has no contact info', async () => {
    const userNoContact = { ...mockUser, phone_number: null, telegram_handle: null };
    renderAddProperty(createStore(userNoContact));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Test Address' } });
    fireEvent.click(screen.getByText('Submit Property'));
    await waitFor(() => {
      expect(screen.getByText(/add phone number or Telegram/i)).toBeInTheDocument();
    });
  });

  it('renders location fields on step 3', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByPlaceholderText('Start typing address...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Metro Station')).toBeInTheDocument();
  });

  it('goes back to previous step on Back click', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByPlaceholderText('Modern Apartment')).toBeInTheDocument();
  });

  it('submits form and navigates home on success', async () => {
    mockCreateProperty.mockResolvedValue({ id: '1' });
    renderAddProperty();
    fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test Property' } });
    fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Test Address' } });
    fireEvent.click(screen.getByText('Submit Property'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows property type, purpose, and description on step 1', () => {
    renderAddProperty();
    expect(screen.getByPlaceholderText('Describe your property...')).toBeInTheDocument();
    expect(getSelectByName('property_type')).toHaveValue('Apartment');
    expect(getSelectByName('property_purpose')).toHaveValue('sale');
  });

  it('changes property type and purpose select values', () => {
    renderAddProperty();
    const typeSelect = getSelectByName('property_type');
    const purposeSelect = getSelectByName('property_purpose');
    fireEvent.change(typeSelect, { target: { value: 'House' } });
    expect(typeSelect).toHaveValue('House');
    fireEvent.change(purposeSelect, { target: { value: 'rent' } });
    expect(purposeSelect).toHaveValue('rent');
  });

  it('renders all step 2 detail fields', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('10')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('2015')).toBeInTheDocument();
    expect(getSelectByName('material')).toHaveValue('Brick');
    expect(getSelectByName('repair_type')).toHaveValue('Cosmetic');
    expect(getSelectByName('room_type')).toHaveValue('Separated');
    expect(getSelectByName('is_new')).toHaveValue('secondary');
    expect(getSelectByName('balcony')).toHaveValue('yes');
    expect(getSelectByName('parking')).toHaveValue('no');
    expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('40.5')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('12.0')).toBeInTheDocument();
  });

  it('fills step 2 fields and navigates to step 3', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '7' } });
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '14' } });
    fireEvent.change(screen.getByPlaceholderText('2015'), { target: { value: '2020' } });
    fireEvent.change(getSelectByName('material'), { target: { value: 'Monolith' } });
    expect(getSelectByName('material')).toHaveValue('Monolith');
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByPlaceholderText('Start typing address...')).toBeInTheDocument();
  });

  it('navigates back from step 3 to step 2', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('10')).toBeInTheDocument();
  });

  it('shows address suggestions when geocodeAddress succeeds', async () => {
    mockGeocodeAddress.mockResolvedValue({
      lat: 55.7558,
      lon: 37.6173,
      address: 'Moscow, Red Square',
      formattedAddress: 'Moscow, Red Square, Russia',
    });
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Red Square' } });
    await waitFor(() => {
      expect(screen.getByText('Moscow, Red Square, Russia')).toBeInTheDocument();
    });
  });

  it('selects an address suggestion and updates lat/lon', async () => {
    mockGeocodeAddress.mockResolvedValue({
      lat: 55.7558,
      lon: 37.6173,
      address: 'Moscow, Red Square',
      formattedAddress: 'Moscow, Red Square, Russia',
    });
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    const addressInput = screen.getByPlaceholderText('Start typing address...');
    fireEvent.change(addressInput, { target: { value: 'Red Square' } });
    await waitFor(() => {
      expect(screen.getByText('Moscow, Red Square, Russia')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Moscow, Red Square, Russia'));
    await waitFor(() => {
      expect(addressInput).toHaveValue('Moscow, Red Square, Russia');
    });
  });

  it('hides address suggestions on click outside', async () => {
    mockGeocodeAddress.mockResolvedValue({
      lat: 55.7558,
      lon: 37.6173,
      address: 'Moscow, Red Square',
      formattedAddress: 'Moscow, Red Square, Russia',
    });
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Red Square' } });
    await waitFor(() => {
      expect(screen.getByText('Moscow, Red Square, Russia')).toBeInTheDocument();
    });
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Moscow, Red Square, Russia')).toBeNull();
    });
  });

  it('shows API error on createProperty failure', async () => {
    mockCreateProperty.mockRejectedValue(new Error('API Error'));
    renderAddProperty();
    fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test Property' } });
    fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Test Address' } });
    fireEvent.click(screen.getByText('Submit Property'));
    await waitFor(() => {
      expect(screen.getByText(/Failed to create property/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockCreateProperty.mockReturnValue(promise);
    renderAddProperty();
    fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test Property' } });
    fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Test Address' } });
    fireEvent.click(screen.getByText('Submit Property'));
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    resolvePromise!({ id: '1' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('selects different step 2 dropdown values', () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    const materialSelect = getSelectByName('material');
    const repairSelect = getSelectByName('repair_type');
    const roomSelect = getSelectByName('room_type');
    const isNewSelect = getSelectByName('is_new');
    const parkingSelect = getSelectByName('parking');
    const balconySelect = getSelectByName('balcony');

    fireEvent.change(materialSelect, { target: { value: 'Panel' } });
    expect(materialSelect).toHaveValue('Panel');
    fireEvent.change(repairSelect, { target: { value: 'Euro' } });
    expect(repairSelect).toHaveValue('Euro');
    fireEvent.change(roomSelect, { target: { value: 'Adjacent' } });
    expect(roomSelect).toHaveValue('Adjacent');
    fireEvent.change(isNewSelect, { target: { value: 'new' } });
    expect(isNewSelect).toHaveValue('new');
    fireEvent.change(parkingSelect, { target: { value: 'paid' } });
    expect(parkingSelect).toHaveValue('paid');
    fireEvent.change(balconySelect, { target: { value: 'no' } });
    expect(balconySelect).toHaveValue('no');
  });

  it('does not call geocodeAddress for short address input', async () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'ab' } });
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it('handles geocodeAddress rejection gracefully', async () => {
    mockGeocodeAddress.mockRejectedValue(new Error('Network error'));
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Some Address' } });
    await waitFor(() => {
      expect(mockGeocodeAddress).toHaveBeenCalledWith('Some Address');
    });
  });

  it('handles image upload via ImageUploader onChange', async () => {
    mockCreateProperty.mockResolvedValue({ id: '1' });
    renderAddProperty();
    fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test Property' } });
    fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByTestId('image-uploader'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Test Address' } });
    fireEvent.click(screen.getByText('Submit Property'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(mockCreateProperty).toHaveBeenCalledWith(expect.objectContaining({
      images: ['http://example.com/img.jpg'],
    }));
  });

  it('does not show suggestions when geocodeAddress returns null', async () => {
    renderAddProperty();
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Some Address' } });
    await waitFor(() => {
      expect(mockGeocodeAddress).toHaveBeenCalledWith('Some Address');
    });
  });

  it('fills all fields and submits successfully', async () => {
    mockCreateProperty.mockResolvedValue({ id: '1' });
    mockGeocodeAddress.mockResolvedValue({
      lat: 55.7558,
      lon: 37.6173,
      address: 'Moscow, Red Square',
      formattedAddress: 'Moscow, Red Square, Russia',
    });
    renderAddProperty();

    fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Luxury Apartment' } });
    fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '10000000' } });
    fireEvent.change(screen.getByPlaceholderText('2'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('65.5'), { target: { value: '80.5' } });
    fireEvent.change(getSelectByName('property_type'), { target: { value: 'Studio' } });
    fireEvent.change(getSelectByName('property_purpose'), { target: { value: 'rent' } });
    fireEvent.change(screen.getByPlaceholderText('Describe your property...'), { target: { value: 'Beautiful studio in the city center' } });
    fireEvent.click(screen.getByText('Next'));

    fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '12' } });
    fireEvent.change(screen.getByPlaceholderText('2015'), { target: { value: '2022' } });
    fireEvent.change(getSelectByName('material'), { target: { value: 'Monolith' } });
    fireEvent.change(getSelectByName('repair_type'), { target: { value: 'Design' } });
    fireEvent.change(getSelectByName('room_type'), { target: { value: 'Both' } });
    fireEvent.change(getSelectByName('is_new'), { target: { value: 'new' } });
    fireEvent.change(getSelectByName('parking'), { target: { value: 'paid' } });
    fireEvent.change(getSelectByName('balcony'), { target: { value: 'no' } });
    fireEvent.change(screen.getByPlaceholderText('40.5'), { target: { value: '50.0' } });
    fireEvent.change(screen.getByPlaceholderText('12.0'), { target: { value: '15.0' } });
    fireEvent.click(screen.getByText('Next'));

    const addressInput = screen.getByPlaceholderText('Start typing address...');
    fireEvent.change(addressInput, { target: { value: 'Red Square' } });
    await waitFor(() => {
      expect(screen.getByText('Moscow, Red Square, Russia')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Moscow, Red Square, Russia'));
    await waitFor(() => {
      expect(addressInput).toHaveValue('Moscow, Red Square, Russia');
    });

    fireEvent.change(screen.getByPlaceholderText('Metro Station'), { target: { value: 'Okhotny Ryad' } });
    fireEvent.click(screen.getByText('Submit Property'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    expect(mockCreateProperty).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Luxury Apartment',
      price: 10000000,
      rooms: 3,
      area: 80.5,
      property_type: 'Studio',
      property_purpose: 'rent',
      description: 'Beautiful studio in the city center',
      floor: 3,
      total_floors: 12,
      build_year: 2022,
      material: 'Monolith',
      repair_type: 'Design',
      room_type: 'Both',
      is_new: 'new',
      balcony: 'no',
      parking: 'paid',
      address: 'Moscow, Red Square, Russia',
      metro: 'Okhotny Ryad',
      lat: 55.7558,
      lon: 37.6173,
      sq_living: 50.0,
      sq_kitchen: 15.0,
    }));
  });

  describe('Validation', () => {
    it('rejects area less than living + kitchen', async () => {
      renderAddProperty();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
      fireEvent.change(screen.getByPlaceholderText('65.5'), { target: { value: '50' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '3' } });
      fireEvent.change(screen.getByPlaceholderText('40.5'), { target: { value: '40' } });
      fireEvent.change(screen.getByPlaceholderText('12.0'), { target: { value: '20' } });
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Start typing address...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Addr' } });
        expect(input.value).toBe('Addr');
      });
      fireEvent.click(screen.getByText('Submit Property'));
      await waitFor(() => {
        expect(screen.getByText(/total area must be at least/i)).toBeInTheDocument();
      });
    });

    it('rejects floor exceeding total floors', async () => {
      renderAddProperty();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '10' } });
      fireEvent.change(screen.getByPlaceholderText('10'), { target: { value: '5' } });
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Start typing address...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Addr' } });
        expect(input.value).toBe('Addr');
      });
      fireEvent.click(screen.getByText('Submit Property'));
      await waitFor(() => {
        expect(screen.getByText(/floor cannot exceed/i)).toBeInTheDocument();
      });
    });

    it('rejects negative or zero price', async () => {
      renderAddProperty();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '0' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Start typing address...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Addr' } });
        expect(input.value).toBe('Addr');
      });
      fireEvent.click(screen.getByText('Submit Property'));
      await waitFor(() => {
        expect(screen.getByText(/Price must be greater than 0/i)).toBeInTheDocument();
      });
    });
  });
});
