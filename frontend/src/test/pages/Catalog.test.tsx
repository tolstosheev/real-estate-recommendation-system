import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import Catalog from '@pages/catalog/Catalog';

vi.mock('@shared/ui/RangeSlider/RangeSlider', () => ({
  default: ({ label, onChange }: { label: string; onChange?: (v: [number, number]) => void }) => (
    <div data-testid="range-slider">
      <span>{label}</span>
      <button data-testid={`range-change-${label}`} onClick={() => onChange?.([1000000, 8000000])}>
        Change
      </button>
    </div>
  ),
}));

vi.mock('@shared/ui/CheckboxGroup/CheckboxGroup', () => ({
  default: ({ label, onChange, options }: { label: string; onChange?: (v: string[]) => void; options?: { label: string; value: string }[] }) => (
    <div data-testid="checkbox-group">
      <span>{label}</span>
      {options?.map(opt => (
        <button key={opt.value} data-testid={`check-${label}-${opt.value}`} onClick={() => onChange?.([opt.value])}>
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@entities/property/ui/PropertyCard', () => ({
  default: ({ property, onLikeToggle }: { property: { id: string; title: string; is_ai_recommendation?: boolean }; onLikeToggle?: (id: string, liked: boolean) => void }) => (
    <div data-testid="property-card" data-ai={!!property.is_ai_recommendation}>
      <span>{property.title}</span>
      <button data-testid={`like-${property.id}`} onClick={() => onLikeToggle?.(property.id, true)}>Like</button>
      <button data-testid={`unlike-${property.id}`} onClick={() => onLikeToggle?.(property.id, false)}>Unlike</button>
    </div>
  ),
}));

const mockApi = new MockAdapter(api);

let observerCallback: IntersectionObserverCallback = () => {};

class MockedObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).IntersectionObserver = MockedObserver;
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).IntersectionObserver;
});

const defaultMeta = {
  districts: ['Center'],
  metro: ['Park'],
  materials: ['Brick'],
  repair_types: ['Cosmetic'],
  property_types: ['Apartment'],
  cities: ['Moscow'],
};

const createStore = (isAuthenticated = false) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: {
    auth: {
      user: isAuthenticated ? { id: '1', email: 'u@t.com', full_name: 'User', phone_number: null, telegram_handle: null } : null,
      token: null,
      isAuthenticated,
    },
  },
});

const createMockProperty = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: `Property ${id}`,
  price: 5000000,
  area: 65,
  rooms: 2,
  floor: 5,
  total_floors: 10,
  build_year: 2018,
  description: 'A nice property',
  address: 'Test St 10',
  city: 'Moscow',
  district: 'Center',
  metro: 'Park',
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
  owner: { id: 'o1', full_name: 'Owner', phone_number: '+79991112233', telegram_handle: '@owner' },
  views_count: 10,
  likes_count: 3,
  is_liked_by_me: false,
  ...overrides,
});

const createManyProperties = (count: number, startId = 1) =>
  Array.from({ length: count }, (_, i) => createMockProperty(String(i + startId)));

const renderCatalog = (store = createStore(false)) => render(
  <Provider store={store}>
    <BrowserRouter>
      <Catalog />
    </BrowserRouter>
  </Provider>
);

describe('Catalog Page', () => {
  beforeEach(() => {
    mockApi.reset();
    vi.clearAllMocks();
    observerCallback = () => {};
    mockApi.onGet('/api/properties/meta').reply(200, defaultMeta);
    mockApi.onGet('/api/recommendations').reply(200, []);
  });

  it('shows loading state while fetching properties', async () => {
    mockApi.onGet('/api/properties/').reply(() => new Promise(() => {}));

    renderCatalog();

    expect(await screen.findByText('Loading...')).toBeDefined();
  });

  it('shows empty state when no properties exist', async () => {
    mockApi.onGet('/api/properties/').reply(200, []);

    renderCatalog();

    expect(await screen.findByText('No properties found.')).toBeDefined();
  });

  it('renders property cards when data is loaded', async () => {
    const properties = createManyProperties(3);
    mockApi.onGet('/api/properties/').reply(200, properties);

    renderCatalog();

    await waitFor(() => {
      expect(screen.getAllByTestId('property-card')).toHaveLength(3);
    });
    expect(screen.getByText('Property 1')).toBeDefined();
    expect(screen.getByText('Property 2')).toBeDefined();
    expect(screen.getByText('Property 3')).toBeDefined();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.onGet('/api/properties/').reply(500);

    renderCatalog();

    await waitFor(() => {
      expect(screen.getByText('No properties found.')).toBeDefined();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('switches between tabs and loads corresponding data', async () => {
    const authStore = createStore(true);
    mockApi.onGet('/api/properties/').reply(200, [createMockProperty('1')]);
    mockApi.onGet('/api/interactions/history').reply(200, [createMockProperty('2')]);

    renderCatalog(authStore);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Viewed'));

    await waitFor(() => {
      expect(screen.getByText('Property 2')).toBeDefined();
    });
  });

  it('shows empty state for viewed tab when authenticated', async () => {
    const authStore = createStore(true);
    mockApi.onGet('/api/properties/').reply(200, []);
    mockApi.onGet('/api/interactions/history').reply(200, []);

    renderCatalog(authStore);

    await screen.findByText('No properties found.');

    fireEvent.click(screen.getByText('Viewed'));

    expect(await screen.findByText('No viewed properties yet.')).toBeDefined();
  });

  it('shows empty state for liked tab when authenticated', async () => {
    const authStore = createStore(true);
    mockApi.onGet('/api/properties/').reply(200, []);
    mockApi.onGet('/api/interactions/favorites').reply(200, []);

    renderCatalog(authStore);

    await screen.findByText('No properties found.');

    fireEvent.click(screen.getByText('Liked'));

    expect(await screen.findByText('No liked properties yet.')).toBeDefined();
  });

  it('applies filters when Apply Filters button is clicked', async () => {
    let callCount = 0;
    mockApi.onGet('/api/properties/').reply(() => {
      callCount++;
      return [200, [createMockProperty('1')]];
    });

    renderCatalog();

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    const applyBtn = screen.getByText('Apply Filters');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  it('updates search input value on typing', async () => {
    mockApi.onGet('/api/properties/').reply(200, []);

    renderCatalog();

    await screen.findByText('No properties found.');

    const searchInput = screen.getByPlaceholderText('Search by title or address...');
    fireEvent.change(searchInput, { target: { value: 'apartment' } });

    expect(searchInput).toHaveValue('apartment');
  });

  it('triggers search via debounce and refetches', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    mockApi.onGet('/api/properties/').reply(() => {
      callCount++;
      return [200, [createMockProperty('1')]];
    });

    renderCatalog();

    await vi.waitFor(() => {
      expect(screen.queryByText('Property 1')).toBeTruthy();
    }, { timeout: 5000, interval: 50 });

    const searchInput = screen.getByPlaceholderText('Search by title or address...');
    fireEvent.change(searchInput, { target: { value: 'apartment' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await vi.waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2);
    }, { timeout: 5000, interval: 50 });

    vi.useRealTimers();
  });

  it('toggles like on a property card', async () => {
    const property = createMockProperty('1', { is_liked_by_me: false, likes_count: 3 });
    mockApi.onGet('/api/properties/').reply(200, [property]);

    renderCatalog();

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('like-1'));
  });

  it('removes property from liked tab on unlike', async () => {
    const authStore = createStore(true);
    const property = createMockProperty('1', { is_liked_by_me: true, likes_count: 3 });
    mockApi.onGet('/api/properties/').reply(200, []);
    mockApi.onGet('/api/interactions/favorites').reply(200, [property]);

    renderCatalog(authStore);

    await screen.findByText('No properties found.');

    fireEvent.click(screen.getByText('Liked'));

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('unlike-1'));

    await waitFor(() => {
      expect(screen.queryByText('Property 1')).toBeNull();
    });
    expect(screen.getByText('No liked properties yet.')).toBeDefined();
  });

  it('renders AI recommendations when authenticated on all tab', async () => {
    const authStore = createStore(true);
    const aiProperty = createMockProperty('ai-1', { title: 'AI Recommended' });
    const regularProperty = createMockProperty('2', { title: 'Regular Property' });

    mockApi.onGet('/api/properties/').reply(200, [regularProperty]);
    mockApi.onGet('/api/recommendations').reply(200, [aiProperty]);

    renderCatalog(authStore);

    await waitFor(() => {
      const cards = screen.getAllByTestId('property-card');
      expect(cards).toHaveLength(2);
    });
    expect(screen.getByText('AI Recommended')).toBeDefined();
    expect(screen.getByText('Regular Property')).toBeDefined();
  });

  it('expands and collapses filter sections', async () => {
    mockApi.onGet('/api/properties/').reply(200, []);

    renderCatalog();

    await screen.findByText('No properties found.');

    const arrows = screen.getAllByText('▶');
    expect(arrows.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(arrows[0]);

    expect(screen.getAllByText('▼').length).toBeGreaterThanOrEqual(1);
  });

  it('loads more properties on infinite scroll', async () => {
    const firstPage = createManyProperties(12);
    const secondPage = createManyProperties(3, 13).map(p => ({
      ...p,
      title: `Extra ${p.id}`,
    }));

    mockApi.onGet('/api/properties/').reply((config) => {
      const offset = (config.params?.offset as number) || 0;
      if (offset === 0) {
        return [200, firstPage];
      }
      return [200, secondPage];
    });

    renderCatalog();

    await waitFor(() => {
      expect(screen.getAllByTestId('property-card')).toHaveLength(12);
    });

    await waitFor(() => {
      expect(document.querySelector('.catalog-loader')).toBeTruthy();
    });

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => {
      const cards = screen.getAllByTestId('property-card');
      expect(cards).toHaveLength(15);
    });
  });

  it('hides loader when hasMore is false', async () => {
    const properties = createManyProperties(5);
    mockApi.onGet('/api/properties/').reply(200, properties);

    renderCatalog();

    await waitFor(() => {
      expect(screen.getAllByTestId('property-card')).toHaveLength(5);
    });

    expect(document.querySelector('.catalog-loader')).toBeNull();
  });

  it('does not show AI recs when not authenticated', async () => {
    mockApi.onGet('/api/properties/').reply(200, [createMockProperty('1')]);

    renderCatalog();

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    const cards = screen.getAllByTestId('property-card');
    cards.forEach(card => {
      expect(card.getAttribute('data-ai')).toBe('false');
    });
  });

  it('renders sidebar with filters and tabs', async () => {
    mockApi.onGet('/api/properties/').reply(200, []);

    renderCatalog();

    expect(await screen.findByText('Filters')).toBeDefined();
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Viewed')).toBeDefined();
    expect(screen.getByText('Liked')).toBeDefined();
  });

  it('renders apply filters button only on all tab', async () => {
    const authStore = createStore(true);
    mockApi.onGet('/api/properties/').reply(200, []);
    mockApi.onGet('/api/interactions/history').reply(200, []);

    renderCatalog(authStore);

    await screen.findByText('No properties found.');
    expect(screen.getByText('Apply Filters')).toBeDefined();

    fireEvent.click(screen.getByText('Viewed'));
    await screen.findByText('No viewed properties yet.');

    expect(screen.queryByText('Apply Filters')).toBeNull();
  });

  it('changes filter values in the Details section', async () => {
    let callCount = 0;
    mockApi.onGet('/api/properties/').reply(() => {
      callCount++;
      return [200, [createMockProperty('1')]];
    });

    renderCatalog();

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('range-change-Build year'));
    fireEvent.click(screen.getByTestId('check-Material-Brick'));
    fireEvent.click(screen.getByTestId('check-Repair type-Cosmetic'));
    fireEvent.click(screen.getByTestId('check-Building type-new building'));

    fireEvent.click(screen.getByText('Apply Filters'));

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  it('switches back to All tab after switching to another tab', async () => {
    const authStore = createStore(true);
    mockApi.onGet('/api/properties/').reply(200, [createMockProperty('1')]);
    mockApi.onGet('/api/interactions/history').reply(200, [createMockProperty('2')]);

    renderCatalog(authStore);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Viewed'));

    await waitFor(() => {
      expect(screen.getByText('Property 2')).toBeDefined();
    });

    fireEvent.click(screen.getByText('All'));

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeDefined();
    });
  });
});
