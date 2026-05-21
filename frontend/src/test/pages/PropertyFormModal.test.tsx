import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import PropertyFormModal from '@pages/profile/PropertyFormModal';
import type { Property } from '@shared/api/types';

const mocks = vi.hoisted(() => ({
  mockCreateProperty: vi.fn().mockResolvedValue({}),
  mockUpdateProperty: vi.fn().mockResolvedValue({}),
  mockGeocodeAddress: vi.fn().mockResolvedValue([]),
}));

vi.mock('@shared/api/properties.service', () => ({
  propertyService: {
    createProperty: mocks.mockCreateProperty,
    updateProperty: mocks.mockUpdateProperty,
    getMeta: vi.fn().mockResolvedValue({ metro: [] }),
  },
}));

vi.mock('@shared/api/geocoder.service', () => ({
  geocodeAddress: (...args: any[]) => mocks.mockGeocodeAddress(...args),
}));

vi.mock('@features/property/upload-images/ui/ImageUploader', () => {
  return {
    ImageUploader: ({ images, onChange }: any) => {
      return React.createElement('div', { 'data-testid': 'image-uploader' }, [
        ...images.map((url: string, i: number) => React.createElement('img', { key: i, src: url, alt: `Upload ${i + 1}` })),
        React.createElement('input', {
          'data-testid': 'image-uploader-input',
          onChange: (e: any) => onChange([e.target.value]),
        }),
      ]);
    },
  };
});

vi.mock('@shared/ui/Modal', () => ({
  default: ({ isOpen, onClose, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close-btn" onClick={onClose}>×</button>
        {children}
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

const createStore = (user = mockUser) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { user, token: 'token123', isAuthenticated: true },
    },
  });

const onClose = vi.fn();
const onSuccess = vi.fn();

const renderModal = (props: Partial<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property: Property | null;
}> = {}) => {
  const defaultProps = {
    isOpen: true,
    onClose,
    onSuccess,
    property: null as Property | null,
  };
  return render(
    <Provider store={createStore()}>
      <PropertyFormModal {...defaultProps} {...props} />
    </Provider>
  );
};

const editProperty: Property = {
  id: 'p1', title: 'Edit Apt', description: 'Existing', price: 5000000,
  area: 65, rooms: 2, floor: 5, total_floors: 12,
  property_type: 'Apartment', property_purpose: 'sale', category: null,
  address: 'Moscow St', city: 'Moscow', district: 'Center', metro: 'Park',
  lat: 55.75, lon: 37.62,
  images: ['https://img.jpg'],
  sq_living: 40, sq_kitchen: 10, build_year: 2020,
  material: 'Brick', repair_type: 'Cosmetic', room_type: 'Separated',
  is_new: 'secondary', balcony: 'yes', parking: 'no',
  owner: { id: 'o1', full_name: 'O', phone_number: null, telegram_handle: null },
  views_count: 0, likes_count: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockCreateProperty.mockResolvedValue({});
  mocks.mockUpdateProperty.mockResolvedValue({});
  mocks.mockGeocodeAddress.mockResolvedValue(null);
});

describe('PropertyFormModal', () => {
  describe('Modal states', () => {
    it('does not render when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      renderModal();
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('shows Add New Property title in create mode', () => {
      renderModal();
      expect(screen.getByTestId('modal-title').textContent).toBe('Add New Property');
    });

    it('shows Edit Property title in edit mode', () => {
      renderModal({ property: editProperty });
      expect(screen.getByTestId('modal-title').textContent).toBe('Edit Property');
    });
  });

  describe('Stepper', () => {
    it('shows three steps with correct labels', () => {
      renderModal();
      expect(screen.getByText('1. Basic')).toBeInTheDocument();
      expect(screen.getByText('2. Details')).toBeInTheDocument();
      expect(screen.getByText('3. Location')).toBeInTheDocument();
    });

    it('activates current and previous steps', () => {
      renderModal();
      const step1 = screen.getByText('1. Basic').closest('.pf-step')!;
      expect(step1.className).toContain('pf-step--active');
      const step2 = screen.getByText('2. Details').closest('.pf-step')!;
      expect(step2.className).not.toContain('pf-step--active');
    });
  });

  describe('Create mode - default form', () => {
    it('renders empty form with defaults', () => {
      renderModal();
      expect((screen.getByPlaceholderText('Modern Apartment') as HTMLInputElement).value).toBe('');
      expect((screen.getByPlaceholderText('5000000') as HTMLInputElement).value).toBe('');
      expect((screen.getByDisplayValue('Apartment') as HTMLSelectElement).value).toBe('Apartment');
      expect((screen.getByDisplayValue('Sale') as HTMLSelectElement).value).toBe('sale');
    });
  });

  describe('Edit mode - pre-fill', () => {
    it('pre-fills step 1 fields from property data', () => {
      renderModal({ property: editProperty });
      expect((screen.getByPlaceholderText('Modern Apartment') as HTMLInputElement).value).toBe('Edit Apt');
      expect((screen.getByPlaceholderText('5000000') as HTMLInputElement).value).toBe('5000000');
      expect((screen.getByPlaceholderText('2') as HTMLInputElement).value).toBe('2');
      expect((screen.getByPlaceholderText('65.5') as HTMLInputElement).value).toBe('65');
    });

    it('pre-fills material on step 2', () => {
      renderModal({ property: editProperty });
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByDisplayValue('Brick')).toBeInTheDocument();
    });

    it('pre-fills images on step 2', () => {
      renderModal({ property: editProperty });
      fireEvent.click(screen.getByText('Next'));
      const images = screen.getAllByRole('img');
      expect(images.some(img => (img as HTMLImageElement).src.includes('https://img.jpg'))).toBe(true);
    });

    it('handles minimal/null property gracefully', () => {
      const minimal: Property = {
        id: 'p2', title: 'Min', description: null, price: 0,
        area: null, rooms: null, floor: null, total_floors: null,
        property_type: null, property_purpose: null, category: null,
        address: '', city: null, district: null, metro: null,
        lat: 0, lon: 0, images: [],
        sq_living: null, sq_kitchen: null, build_year: null,
        material: null, repair_type: null, room_type: null,
        is_new: null, balcony: null, parking: null,
        owner: { id: 'o1', full_name: 'O', phone_number: null, telegram_handle: null },
        views_count: 0, likes_count: 0,
      };
      renderModal({ property: minimal });
      expect((screen.getByPlaceholderText('Modern Apartment') as HTMLInputElement).value).toBe('Min');
      expect((screen.getByDisplayValue('Apartment') as HTMLSelectElement).value).toBe('Apartment');
    });
  });

  describe('Step navigation', () => {
    it('shows step 1 by default', () => {
      renderModal();
      expect(screen.getByPlaceholderText('Modern Apartment')).toBeInTheDocument();
      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('advances to step 2 on Next', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('advances to step 3 on Next', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByPlaceholderText('Start typing address...')).toBeInTheDocument();
      expect(screen.getByText('Create Property')).toBeInTheDocument();
    });

    it('goes back from step 2 to step 1', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByPlaceholderText('Modern Apartment')).toBeInTheDocument();
    });

    it('goes back from step 3 to step 2', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Back'));
      expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
    });
  });

  describe('Step 1 fields', () => {
    it('renders all step 1 fields', () => {
      renderModal();
      expect(screen.getByPlaceholderText('Modern Apartment')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('5000000')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('2')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('65.5')).toBeInTheDocument();
      expect(screen.getByText('Property Type')).toBeInTheDocument();
      expect(screen.getByText('Purpose')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe your property...')).toBeInTheDocument();
    });

    it('updates title field on change', () => {
      renderModal();
      const input = screen.getByPlaceholderText('Modern Apartment') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'New Title' } });
      expect(input.value).toBe('New Title');
    });
  });

  describe('Step 2 fields', () => {
    it('renders all step 2 fields with defaults', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByPlaceholderText('5')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('10')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('2015')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Repair Type')).toBeInTheDocument();
      expect(screen.getByText('Room Type')).toBeInTheDocument();
      expect(screen.getByText('Building Type')).toBeInTheDocument();
      expect(screen.getByText('Balcony')).toBeInTheDocument();
      expect(screen.getByText('Parking')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('40.5')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('12.0')).toBeInTheDocument();
    });
  });

  describe('Step 3 fields', () => {
    it('renders all step 3 fields', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByPlaceholderText('Start typing address...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Metro Station')).toBeInTheDocument();
    });
  });

  describe('Address suggestions', () => {
    it('shows suggestions when geocodeAddress returns result', async () => {
      mocks.mockGeocodeAddress.mockResolvedValue([{
        lat: 55.75, lon: 37.62,
        address: 'Moscow, Red Square',
        formattedAddress: 'Moscow, Red Square, 1',
        district: null,
        metro: null,
      }]);
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Moscow' } });
      await waitFor(() => {
        expect(screen.getByText('Moscow, Red Square, 1')).toBeInTheDocument();
      });
    });

    it('selects suggestion on click', async () => {
      mocks.mockGeocodeAddress.mockResolvedValue([{
        lat: 55.75, lon: 37.62,
        address: 'Moscow, Red Square',
        formattedAddress: 'Moscow, Red Square, 1',
        district: null,
        metro: null,
      }]);
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      const addressInput = screen.getByPlaceholderText('Start typing address...');
      fireEvent.change(addressInput, { target: { value: 'Moscow' } });
      await screen.findByText('Moscow, Red Square, 1');
      fireEvent.click(screen.getByText('Moscow, Red Square, 1'));
      expect((addressInput as HTMLInputElement).value).toBe('Moscow, Red Square, 1');
    });

    it('does not call geocodeAddress for short input', () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Mo' } });
      expect(mocks.mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it('hides suggestions on outside click', async () => {
      mocks.mockGeocodeAddress.mockResolvedValue([{
        lat: 55.75, lon: 37.62,
        address: 'Moscow',
        formattedAddress: 'Moscow, Russia',
        district: null,
        metro: null,
      }]);
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Moscow' } });
      await screen.findByText('Moscow, Russia');
      fireEvent.mouseDown(document.body);
      await waitFor(() => {
        expect(screen.queryByText('Moscow, Russia')).not.toBeInTheDocument();
      });
    });

    it('handles geocodeAddress returning empty array', async () => {
      mocks.mockGeocodeAddress.mockResolvedValue([]);
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Nowhere' } });
      await waitFor(() => {
        expect(mocks.mockGeocodeAddress).toHaveBeenCalledWith('Nowhere');
      });
    });

    it('handles geocodeAddress throwing error', async () => {
      mocks.mockGeocodeAddress.mockRejectedValue(new Error('fail'));
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Moscow' } });
      await waitFor(() => {
        expect(mocks.mockGeocodeAddress).toHaveBeenCalledWith('Moscow');
      });
    });
  });

  describe('Validation', () => {
    const submitForm = () => {
      const form = document.querySelector('form');
      if (!form) throw new Error('Form not found');
      fireEvent.submit(form);
    };

    it('requires title, price and address on submit', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      submitForm();
      await waitFor(() => {
        expect(screen.getByText(/Please fill required fields: Title, Price, Address/)).toBeInTheDocument();
      });
    });

    it('requires only Address when title and price are filled', async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'My Apt' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '5000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      submitForm();
      await waitFor(() => {
        expect(screen.getByText(/Please fill required fields: Address/)).toBeInTheDocument();
      });
    });

    it('requires contact info when user has no phone or telegram', async () => {
      const noContactUser = { ...mockUser, phone_number: '', telegram_handle: '' };
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: {
          auth: { user: noContactUser, token: 'token123', isAuthenticated: true },
        },
      });
      render(
        <Provider store={store}>
          <PropertyFormModal isOpen={true} onClose={onClose} onSuccess={onSuccess} property={null} />
        </Provider>
      );
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      submitForm();
      await waitFor(() => {
        expect(screen.getByText(/Please add phone number or Telegram/)).toBeInTheDocument();
      });
    });
  });

  describe('Field validation', () => {
    it('rejects area less than living + kitchen', async () => {
      renderModal();
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
      const form = document.querySelector('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/total area must be at least/i)).toBeInTheDocument();
      });
    });

    it('rejects floor exceeding total floors', async () => {
      renderModal();
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
      const form = document.querySelector('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        expect(screen.getByText(/floor cannot exceed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form submission - Create', () => {
    it('calls createProperty with correct payload', async () => {
      mocks.mockCreateProperty.mockResolvedValue({});
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'New Apt' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '7000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Moscow St' } });
      fireEvent.click(screen.getByText('Create Property'));
      await waitFor(() => {
        expect(mocks.mockCreateProperty).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Apt',
            price: 7000000,
            address: 'Moscow St',
            property_type: 'Apartment',
            property_purpose: 'sale',
          })
        );
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('includes optional fields when provided', async () => {
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '3000000' } });
      fireEvent.change(screen.getByPlaceholderText('Describe your property...'), { target: { value: 'Nice place' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('5'), { target: { value: '3' } });
      fireEvent.change(screen.getByPlaceholderText('2015'), { target: { value: '2020' } });
      fireEvent.change(screen.getByTestId('image-uploader-input'), { target: { value: 'https://img.jpg' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Addr' } });
      fireEvent.click(screen.getByText('Create Property'));
      await waitFor(() => {
        expect(mocks.mockCreateProperty).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test', price: 3000000, address: 'Addr',
            description: 'Nice place', floor: 3, build_year: 2020,
            images: ['https://img.jpg'],
          })
        );
      });
    });

    it('shows error on create failure', async () => {
      mocks.mockCreateProperty.mockRejectedValue(new Error('fail'));
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '1000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Addr' } });
      fireEvent.click(screen.getByText('Create Property'));
      await waitFor(() => {
        expect(screen.getByText(/Failed to create property/)).toBeInTheDocument();
      });
    });
  });

  describe('Form submission - Update', () => {
    it('calls updateProperty with correct payload', async () => {
      mocks.mockUpdateProperty.mockResolvedValue({});
      renderModal({ property: editProperty });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Update Property'));
      await waitFor(() => {
        expect(mocks.mockUpdateProperty).toHaveBeenCalledWith(
          'p1',
          expect.objectContaining({
            title: 'Edit Apt',
            price: 5000000,
            address: 'Moscow St',
          })
        );
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('shows error on update failure', async () => {
      mocks.mockUpdateProperty.mockRejectedValue(new Error('fail'));
      renderModal({ property: editProperty });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Update Property'));
      await waitFor(() => {
        expect(screen.getByText(/Failed to update property/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('shows Saving... text while submitting', async () => {
      mocks.mockCreateProperty.mockImplementation(() => new Promise(() => {}));
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '1000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Addr' } });
      fireEvent.click(screen.getByText('Create Property'));
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('disables submit button while loading', async () => {
      mocks.mockCreateProperty.mockImplementation(() => new Promise(() => {}));
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '1000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Addr' } });
      fireEvent.click(screen.getByText('Create Property'));
      const submitBtn = screen.getByText('Saving...').closest('button')!;
      expect(submitBtn.disabled).toBe(true);
    });
  });

  describe('Error display', () => {
    it('shows error message in pf-error element', async () => {
      mocks.mockCreateProperty.mockRejectedValue(new Error('fail'));
      renderModal();
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('5000000'), { target: { value: '1000000' } });
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));
      fireEvent.change(screen.getByPlaceholderText('Start typing address...'), { target: { value: 'Addr' } });
      fireEvent.click(screen.getByText('Create Property'));
      await waitFor(() => {
        const errorEl = document.querySelector('.pf-error');
        expect(errorEl).toBeInTheDocument();
        expect(errorEl!.textContent).toContain('Failed to create property');
      });
    });

    it('clears error and form on re-open modal', () => {
      const store = createStore();
      const { rerender } = render(
        <Provider store={store}>
          <PropertyFormModal isOpen={true} onClose={onClose} onSuccess={onSuccess} property={null} />
        </Provider>
      );
      fireEvent.change(screen.getByPlaceholderText('Modern Apartment'), { target: { value: 'Test' } });
      rerender(
        <Provider store={store}>
          <PropertyFormModal isOpen={false} onClose={onClose} onSuccess={onSuccess} property={null} />
        </Provider>
      );
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
      rerender(
        <Provider store={store}>
          <PropertyFormModal isOpen={true} onClose={onClose} onSuccess={onSuccess} property={null} />
        </Provider>
      );
      expect((screen.getByPlaceholderText('Modern Apartment') as HTMLInputElement).value).toBe('');
    });
  });
});
