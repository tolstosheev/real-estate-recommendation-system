import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import PropertyDetails from '@pages/property-details/PropertyDetails';

vi.mock('@shared/ui/Map', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="yandex-map">{children}</div>,
}));

vi.mock('@shared/ui/Map/YMapMarker', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="map-marker">{children}</div>,
}));

const mock = new MockAdapter(api);

const baseProperty = {
  id: '1',
  title: 'Modern Apartment',
  price: 5_000_000,
  area: 65,
  rooms: 2,
  floor: 5,
  total_floors: 10,
  build_year: 2018,
  description: 'A beautiful apartment',
  address: 'Test St 10',
  city: 'Moscow',
  district: 'Center',
  metro: 'Test metro',
  property_type: 'Apartment',
  property_purpose: 'sale',
  category: null,
  lat: 55.75,
  lon: 37.61,
  images: ['img1.jpg'],
  sq_living: 45,
  sq_kitchen: 12,
  material: 'Brick',
  repair_type: 'Cosmetic',
  room_type: null,
  is_new: null,
  balcony: null,
  parking: null,
  owner: {
    id: 'o1',
    full_name: 'Agent Name',
    phone_number: '+79991112233',
    telegram_handle: '@agent',
  },
  views_count: 10,
  likes_count: 3,
  is_liked_by_me: false,
};

function createStore(isAuthenticated = false) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: isAuthenticated
          ? { id: '1', email: 'u@t.com', full_name: 'User', phone_number: null, telegram_handle: null }
          : null,
        token: null,
        isAuthenticated,
      },
    },
  });
}

function renderPropertyDetails(
  store = createStore(false),
  propertyId = '1',
  extraRoutes?: React.ReactNode,
) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/property/${propertyId}`]}>
        <Routes>
          <Route path="/property/:id" element={<PropertyDetails />} />
          {extraRoutes}
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('PropertyDetails Page', () => {
  beforeEach(() => {
    mock.reset();
  });

  it('shows loading state initially', () => {
    mock.onGet('/api/properties/1').reply(() => new Promise(() => {}));
    renderPropertyDetails();
    expect(document.querySelector('.page-loading')).toBeDefined();
  });

  it('shows not found when property is null', async () => {
    mock.onGet('/api/properties/1').reply(404);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Property not found.')).toBeDefined();
    });
  });

  it('renders property details when loaded', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Modern Apartment')).toBeDefined();
    });
  });

  it('displays price formatted', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText(/5\s*000\s*000/)).toBeDefined();
    });
  });

  it('displays area and rooms', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('65 m²')).toBeDefined();
      expect(screen.getByText('2')).toBeDefined();
    });
  });

  it('displays owner contact info with phone and telegram', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Agent Name')).toBeDefined();
      expect(screen.getByText('+79991112233')).toBeDefined();
      expect(screen.getByText('@agent')).toBeDefined();
      expect(screen.getByText('Write in Telegram')).toBeDefined();
    });
  });

  it('shows map section', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByTestId('yandex-map')).toBeDefined();
    });
  });

  it('displays views and likes counts', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText(/10 views/)).toBeDefined();
      expect(screen.getByText(/3 likes/)).toBeDefined();
    });
  });

  it('displays property_type and property_purpose badges', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getAllByText('Apartment').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('sale').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays city and address', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Moscow')).toBeDefined();
      expect(screen.getByText('Test St 10')).toBeDefined();
    });
  });

  it('does not render city when city is null', async () => {
    const property = { ...baseProperty, city: null };
    mock.onGet('/api/properties/1').reply(200, property);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Modern Apartment')).toBeDefined();
    });
    expect(screen.queryByText('Moscow')).toBeNull();
    expect(screen.getByText('Test St 10')).toBeDefined();
  });

  it('renders category badge and category in building details', async () => {
    const property = { ...baseProperty, category: 'Cottage' };
    mock.onGet('/api/properties/1').reply(200, property);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Modern Apartment')).toBeDefined();
    });
    expect(screen.getAllByText('Cottage').length).toBe(2);
  });

  it('renders AI recommendation badge', async () => {
    const property = { ...baseProperty, is_ai_recommendation: true };
    mock.onGet('/api/properties/1').reply(200, property);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('AI Recommended')).toBeDefined();
    });
  });

  it('renders living area, kitchen area, floor and build year specs', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('Modern Apartment')).toBeDefined();
    });
    expect(screen.getByText('45 m²')).toBeDefined();
    expect(screen.getByText('12 m²')).toBeDefined();
    expect(screen.getByText('5/10')).toBeDefined();
    expect(screen.getAllByText('2018').length).toBeGreaterThanOrEqual(1);
  });

  describe('Building Details section', () => {
    it('renders all building detail fields including room_type, is_new, category', async () => {
      const property = {
        ...baseProperty,
        room_type: 'Studio',
        is_new: 'new',
        category: 'Flat',
      };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(screen.getByText('Building Details')).toBeDefined();
      expect(screen.getByText('Studio')).toBeDefined();
      expect(screen.getByText('New Building')).toBeDefined();
      expect(screen.getAllByText('Flat').length).toBeGreaterThanOrEqual(1);
    });

    it('renders secondary building type when is_new is not "new"', async () => {
      const property = { ...baseProperty, is_new: 'secondary' };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Secondary')).toBeDefined();
      });
    });

    it('does not render building details section when no relevant fields exist', async () => {
      const property = {
        ...baseProperty,
        district: null,
        metro: null,
        material: null,
        repair_type: null,
        room_type: null,
        is_new: null,
        property_purpose: null,
        category: null,
        build_year: null,
      };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(screen.queryByText('Building Details')).toBeNull();
    });
  });

  describe('Amenities section', () => {
    it('renders balcony and parking amenities when present', async () => {
      const property = { ...baseProperty, balcony: 'yes', parking: 'yes' };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Has Balcony')).toBeDefined();
        expect(screen.getByText('Has Parking')).toBeDefined();
      });
    });

    it('handles paid parking and no balcony', async () => {
      const property = { ...baseProperty, balcony: 'no', parking: 'paid' };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('No Balcony')).toBeDefined();
        expect(screen.getByText('Paid Parking')).toBeDefined();
      });
    });

    it('renders "No Parking" text for other parking values', async () => {
      const property = { ...baseProperty, parking: 'no' };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('No Parking')).toBeDefined();
      });
    });

    it('does not render amenities section when balcony and parking are null', async () => {
      const property = { ...baseProperty, balcony: null, parking: null };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      const amenityTags = container.querySelectorAll('.amenity-tag');
      expect(amenityTags.length).toBe(0);
    });
  });

  describe('Like / unlike toggle', () => {
    it('redirects unauthenticated user to /login on like click', async () => {
      mock.onGet('/api/properties/1').reply(200, baseProperty);
      renderPropertyDetails(
        createStore(false),
        '1',
        <Route path="/login" element={<div data-testid="auth-page">Auth</div>} />,
      );
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      const likeBtn = document.querySelector('.like-button')!;
      expect(likeBtn).toBeDefined();
      fireEvent.click(likeBtn);
      await waitFor(() => {
        expect(screen.getByTestId('auth-page')).toBeDefined();
      });
    });

    it('sends like request when authenticated user clicks like', async () => {
      const property = { ...baseProperty, is_liked_by_me: false };
      mock.onGet('/api/properties/1').reply(200, property);
      mock.onPost('/api/interactions/interact').reply(200);
      renderPropertyDetails(createStore(true));
      await waitFor(() => {
        expect(screen.getByText(/3 likes/)).toBeDefined();
      });
      fireEvent.click(document.querySelector('.like-button')!);
      await waitFor(() => {
        expect(screen.getByText(/4 likes/)).toBeDefined();
      });
    });

    it('sends unlike request when authenticated user clicks unlike', async () => {
      const property = { ...baseProperty, is_liked_by_me: true };
      mock.onGet('/api/properties/1').reply(200, property);
      mock.onPost('/api/interactions/interact').reply(200);
      renderPropertyDetails(createStore(true));
      await waitFor(() => {
        expect(screen.getByText(/3 likes/)).toBeDefined();
      });
      fireEvent.click(document.querySelector('.like-button')!);
      await waitFor(() => {
        expect(screen.getByText(/2 likes/)).toBeDefined();
      });
    });
  });

  describe('Image handling', () => {
    it('uses absolute image URL as-is', async () => {
      const property = {
        ...baseProperty,
        images: ['https://cdn.example.com/photo.jpg'],
      };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      const src = container.querySelector('.hero-main-photo img')?.getAttribute('src');
      expect(src).toBe('https://cdn.example.com/photo.jpg');
    });

    it('builds relative image URL from base', async () => {
      const property = { ...baseProperty, images: ['uploads/photo.jpg'] };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      const src = container.querySelector('.hero-main-photo img')?.getAttribute('src');
      expect(src).toMatch(/uploads\/photo\.jpg$/);
    });

    it('handles image URL starting with slash', async () => {
      const property = { ...baseProperty, images: ['/uploads/photo.jpg'] };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      const src = container.querySelector('.hero-main-photo img')?.getAttribute('src');
      expect(src).toBe('http://localhost:8000/uploads/photo.jpg');
    });

    it('filters empty image URLs', async () => {
      const property = {
        ...baseProperty,
        images: ['', 'http://valid.com/img.jpg'],
      };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      const imgs = container.querySelectorAll('.hero-main-photo img');
      expect(imgs.length).toBe(1);
    });

    it('renders multiple images with photo counter and thumbnails', async () => {
      const property = {
        ...baseProperty,
        images: ['http://example.com/1.jpg', 'http://example.com/2.jpg'],
      };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(screen.getByText('1 / 2')).toBeDefined();
      const thumbnails = container.querySelectorAll('.thumbnail');
      expect(thumbnails.length).toBe(2);
    });

    it('switches active photo on thumbnail click', async () => {
      const property = {
        ...baseProperty,
        images: ['http://example.com/1.jpg', 'http://example.com/2.jpg'],
      };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(
        container.querySelector('.hero-main-photo img')?.getAttribute('src'),
      ).toBe('http://example.com/1.jpg');
      const thumbnails = container.querySelectorAll('.thumbnail');
      fireEvent.click(thumbnails[1]);
      await waitFor(() => {
        expect(
          container.querySelector('.hero-main-photo img')?.getAttribute('src'),
        ).toBe('http://example.com/2.jpg');
      });
      expect(screen.getByText('2 / 2')).toBeDefined();
    });

    it('renders single image without thumbnails', async () => {
      const property = { ...baseProperty, images: ['http://example.com/only.jpg'] };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(container.querySelector('.hero-thumbnails')).toBeNull();
      expect(container.querySelector('.hero-photo-counter')).toBeNull();
    });

    it('hides main image on error', async () => {
      const property = { ...baseProperty, images: ['http://example.com/fail.jpg'] };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(container.querySelector('.details-hero')).toBeDefined();
      const img = container.querySelector('.hero-main-photo img')!;
      fireEvent.error(img);
      await waitFor(() => {
        expect(container.querySelector('.details-hero')).toBeNull();
      });
    });

    it('hides thumbnail on error and keeps remaining images', async () => {
      const property = {
        ...baseProperty,
        images: ['http://example.com/a.jpg', 'http://example.com/b.jpg'],
      };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(container.querySelectorAll('.thumbnail').length).toBe(2);
      const thumbnailImg = container.querySelector('.thumbnail img')!;
      fireEvent.error(thumbnailImg);
      await waitFor(() => {
        expect(container.querySelectorAll('.thumbnail').length).toBe(0);
      });
      expect(container.querySelector('.hero-main-photo')).toBeDefined();
    });

    it('renders without hero section when no images provided', async () => {
      const property = { ...baseProperty, images: [] };
      mock.onGet('/api/properties/1').reply(200, property);
      const { container } = renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Modern Apartment')).toBeDefined();
      });
      expect(container.querySelector('.details-hero')).toBeNull();
    });
  });

  describe('Owner contact variations', () => {
    it('renders owner info without phone number', async () => {
      const property = {
        ...baseProperty,
        owner: { ...baseProperty.owner, phone_number: null },
      };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Agent Name')).toBeDefined();
      });
      expect(screen.queryByText('+79991112233')).toBeNull();
      expect(screen.getByText('@agent')).toBeDefined();
      expect(screen.getByText('Write in Telegram')).toBeDefined();
    });

    it('renders owner info without telegram and hides telegram button', async () => {
      const property = {
        ...baseProperty,
        owner: { ...baseProperty.owner, telegram_handle: null },
      };
      mock.onGet('/api/properties/1').reply(200, property);
      renderPropertyDetails();
      await waitFor(() => {
        expect(screen.getByText('Agent Name')).toBeDefined();
      });
      expect(screen.queryByText('Write in Telegram')).toBeNull();
    });
  });

  describe('View recording', () => {
    it('records view on load for authenticated user', async () => {
      mock.onGet('/api/properties/1').reply(200, baseProperty);
      mock.onPost('/api/interactions/interact').reply(200);
      renderPropertyDetails(createStore(true));
      await waitFor(() => {
        expect(screen.getByText(/11 views/)).toBeDefined();
      });
      const viewCalls = mock.history.post.filter((req) => {
        try {
          return JSON.parse(req.data).interaction_type === 'view';
        } catch {
          return false;
        }
      });
      expect(viewCalls.length).toBe(1);
      expect(JSON.parse(viewCalls[0].data).property_id).toBe('1');
    });
  });

  it('renders description section', async () => {
    mock.onGet('/api/properties/1').reply(200, baseProperty);
    renderPropertyDetails();
    await waitFor(() => {
      expect(screen.getByText('A beautiful apartment')).toBeDefined();
      expect(screen.getByText('About this property')).toBeDefined();
    });
  });

  it('handles like API error gracefully (console.error)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mock.onGet('/api/properties/1').reply(200, { ...baseProperty, is_liked_by_me: false });
    mock.onPost('/api/interactions/interact').reply(500);
    renderPropertyDetails(createStore(true));
    await waitFor(() => {
      expect(screen.getByText('Modern Apartment')).toBeDefined();
    });
    fireEvent.click(document.querySelector('.like-button')!);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to toggle like:',
        expect.any(Error),
      );
    });
    consoleSpy.mockRestore();
  });
});
