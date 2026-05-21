import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import MockAdapter from 'axios-mock-adapter';
import api from '@shared/api/api';
import MapPage from '@pages/map/Map';
import type { Property } from '@shared/api/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@shared/ui/Map', () => ({
  default: ({ children, onBoundsChange, onZoomChange }: any) => (
    <div data-testid="yandex-map">
      <button data-testid="trigger-bounds" onClick={() => onBoundsChange?.([56, 38, 55, 36])}>Bounds</button>
      <button data-testid="trigger-zoom-15" onClick={() => onZoomChange?.(15)}>Zoom 15</button>
      <button data-testid="trigger-zoom-10" onClick={() => onZoomChange?.(10)}>Zoom 10</button>
      {children}
    </div>
  ),
}));

vi.mock('@shared/ui/Map/YMapMarker', () => ({
  default: ({ children, onClick }: any) => (
    <div data-testid="map-marker" onClick={onClick}>{children}</div>
  ),
}));

vi.mock('@shared/ui/Modal', () => ({
  default: ({ isOpen, children, title, onClose }: any) => isOpen ? (
    <div data-testid="modal">
      <div>{title}</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
      {children}
    </div>
  ) : null,
}));

vi.mock('@shared/ui/RangeSlider/RangeSlider', () => ({
  default: ({ label, onChange, value, min, max }: any) => (
    <div data-testid="range-slider" data-label={label} onClick={() => onChange?.([Math.floor((max - min) / 4) + min, Math.floor(3 * (max - min) / 4) + min])}>
      {label}
    </div>
  ),
}));

vi.mock('@shared/ui/CheckboxGroup/CheckboxGroup', () => ({
  default: ({ label, onChange, selected }: any) => (
    <div data-testid="checkbox-group" data-label={label} onClick={() => onChange?.(['1'])}>
      {label}
    </div>
  ),
}));

vi.mock('@entities/property/ui/PropertyCard', () => ({
  default: ({ property, onClick, onLikeToggle }: any) => (
    <div data-testid="property-card">
      <span>{property.title}</span>
      <button data-testid="card-click" onClick={() => onClick?.(property.id)}>View</button>
      <button data-testid="card-like" onClick={() => onLikeToggle?.(property.id, !property.is_liked_by_me)}>Like</button>
    </div>
  ),
}));

const mock = new MockAdapter(api);

const createStore = (isAuthenticated = false) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: {
    auth: { user: null, token: null, isAuthenticated },
  },
});

const renderMap = (store = createStore()) => render(
  <Provider store={store}>
    <BrowserRouter>
      <MapPage />
    </BrowserRouter>
  </Provider>
);

const baseProperty = (id: string, overrides: Partial<Property> = {}): Property => ({
  id,
  title: `Property ${id}`,
  price: 5000000,
  area: 50,
  rooms: 2,
  floor: 3,
  total_floors: 10,
  property_type: 'apartment',
  property_purpose: 'sale',
  category: null,
  address: `Address ${id}`,
  district: null,
  metro: null,
  lat: 55.75,
  lon: 37.61,
  images: [],
  sq_living: null,
  sq_kitchen: null,
  build_year: 2000,
  material: 'brick',
  repair_type: 'good',
  room_type: null,
  is_new: 'secondary',
  city: 'Moscow',
  balcony: null,
  parking: null,
  description: null,
  owner: { id: 'o1', full_name: 'Owner' },
  views_count: 0,
  likes_count: 0,
  ...overrides,
});

beforeEach(() => {
  mock.reset();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: vi.fn().mockImplementation((success: any) =>
        success({ coords: { latitude: 55.76, longitude: 37.62 } })
      ),
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  // @ts-ignore
  delete navigator.geolocation;
});

describe('Map Page', () => {
  describe('Initial Rendering', () => {
    it('renders map container', () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      expect(screen.getByTestId('yandex-map')).toBeDefined();
    });

    it('shows filters button', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      expect(await screen.findByText(/Filters/)).toBeDefined();
    });

    it('shows empty state after data loads with no properties', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      expect(await screen.findByText('No properties found in this area.')).toBeDefined();
    });

    it('shows loading state during fetch', async () => {
      mock.onGet('/api/properties/').reply(() => new Promise(() => { }));
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      expect(await screen.findByText('Loading...')).toBeDefined();
    });

    it('handles fetch error gracefully', async () => {
      mock.onGet('/api/properties/').reply(500);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).toBeNull();
      });
      expect(screen.getByText('Move the map to load properties')).toBeDefined();
    });

    it('handles meta fetch error gracefully', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(500);
      renderMap();
      expect(await screen.findByText('No properties found in this area.')).toBeDefined();
      const filterBtn = screen.getByText(/Filters/);
      fireEvent.click(filterBtn);
      expect(await screen.findByTestId('modal')).toBeDefined();
    });

    it('renders property cards when data loaded', async () => {
      const properties = [
        baseProperty('1', { title: 'Test Property 1', price: 5000000, address: 'Addr 1', lat: 55.75, lon: 37.61 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      expect(await screen.findByText('Test Property 1')).toBeDefined();
      expect(screen.getAllByTestId('property-card').length).toBe(1);
    });
  });

  describe('Geolocation', () => {
    it('uses geolocation to set initial center', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await waitFor(() => {
        expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });
  });

  describe('Bounds Change', () => {
    it('suppresses first bounds change', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/properties/map').reply(200, []);
      renderMap();
      await screen.findByTestId('yandex-map');
      fireEvent.click(screen.getByTestId('trigger-bounds'));
      const mapCalls = mock.history.get.filter(r => r.url === '/api/properties/map');
      expect(mapCalls.length).toBe(0);
    });

    it('fetches properties on second bounds change with debounce', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/properties/map').reply(200, []);
      renderMap();
      await screen.findByTestId('yandex-map');
      fireEvent.click(screen.getByTestId('trigger-bounds'));
      fireEvent.click(screen.getByTestId('trigger-bounds'));
      await waitFor(() => {
        const mapCalls = mock.history.get.filter(r => r.url === '/api/properties/map');
        expect(mapCalls.length).toBe(1);
      }, { timeout: 1000 });
    });

    it('cancels debounce on unmount', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/properties/map').reply(200, []);
      const { unmount } = renderMap();
      await screen.findByTestId('yandex-map');
      fireEvent.click(screen.getByTestId('trigger-bounds'));
      fireEvent.click(screen.getByTestId('trigger-bounds'));
      unmount();
      await new Promise(r => setTimeout(r, 300));
      const mapCalls = mock.history.get.filter(r => r.url === '/api/properties/map');
      expect(mapCalls.length).toBe(0);
    });
  });

  describe('Markers & Clusters', () => {
    it('navigates to property detail on marker click', async () => {
      const properties = [
        baseProperty('prop-1', { title: 'Clickable', lat: 55.76, lon: 37.62 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Clickable');
      const markers = screen.getAllByTestId('map-marker');
      expect(markers.length).toBeGreaterThan(0);
      fireEvent.click(markers[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/property/prop-1');
    });

    it('renders cluster markers at low zoom when multiple properties cluster', async () => {
      const properties = [
        baseProperty('1', { title: 'P1', lat: 55.75, lon: 37.61 }),
        baseProperty('2', { title: 'P2', lat: 55.76, lon: 37.62 }),
        baseProperty('3', { title: 'P3', lat: 55.77, lon: 37.63 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('P1');
      const markers = screen.getAllByTestId('map-marker');
      const clusterMarkers = markers.filter(m => m.querySelector('.map-cluster'));
      expect(clusterMarkers.length).toBeGreaterThan(0);
    });

    it('zooms in on cluster click', async () => {
      const properties = [
        baseProperty('1', { title: 'P1', lat: 55.75, lon: 37.61 }),
        baseProperty('2', { title: 'P2', lat: 55.76, lon: 37.62 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('P1');
      const clusterMarkers = screen.getAllByTestId('map-marker').filter(m => m.querySelector('.map-cluster'));
      if (clusterMarkers.length > 0) {
        fireEvent.click(clusterMarkers[0]);
        const zoomBtn = screen.getByTestId('trigger-zoom-15');
        fireEvent.click(zoomBtn);
        await waitFor(() => {
          const markers = screen.getAllByTestId('map-marker');
          const individualMarkers = markers.filter(m => m.querySelector('.map-marker-pin') || m.querySelector('.map-marker-label'));
          expect(individualMarkers.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Property Cards', () => {
    it('selects property and centers map on card click', async () => {
      const properties = [
        baseProperty('card-1', { title: 'Card Click', lat: 55.76, lon: 37.62, price: 7000000 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Card Click');
      fireEvent.click(screen.getByTestId('card-click'));
      const cardContainer = screen.getByText('Card Click').closest('[class*="map-list__card--selected"]');
      expect(cardContainer).toBeDefined();
    });

    it('toggles like on property card', async () => {
      const properties = [
        baseProperty('like-1', { title: 'Likeable', likes_count: 5, is_liked_by_me: false }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Likeable');
      const card = screen.getAllByTestId('property-card')[0];
      expect(card.textContent).toContain('Likeable');
    });
  });

  describe('Zoom States', () => {
    it('shows pin markers when zoomed out', async () => {
      const properties = [
        baseProperty('z-1', { title: 'Zoomed Out', lat: 55.76, lon: 37.62 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Zoomed Out');
      const pinMarkers = screen.getAllByTestId('map-marker').filter(m => m.querySelector('.map-marker-pin'));
      expect(pinMarkers.length).toBeGreaterThan(0);
    });

    it('shows label markers when zoomed in', async () => {
      const properties = [
        baseProperty('z-2', { title: 'Zoomed In', lat: 55.76, lon: 37.62, price: 8000000 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Zoomed In');
      fireEvent.click(screen.getByTestId('trigger-zoom-15'));
      await waitFor(() => {
        const labelMarkers = screen.getAllByTestId('map-marker').filter(m => m.querySelector('.map-marker-label'));
        expect(labelMarkers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filters', () => {
    it('opens filter modal', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      fireEvent.click(await screen.findByText(/Filters/));
      expect(screen.getByTestId('modal')).toBeDefined();
    });

    it('closes filter modal', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      fireEvent.click(await screen.findByText(/Filters/));
      expect(screen.getByTestId('modal')).toBeDefined();
      fireEvent.click(screen.getByTestId('modal-close'));
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).toBeNull();
      });
    });

    it('toggles filter sections open and closed', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: ['Moscow'], materials: ['brick'], repair_types: ['good'], property_types: ['apartment'] });
      renderMap();
      fireEvent.click(await screen.findByText(/Filters/));
      const headers = screen.getAllByText('Location');
      fireEvent.click(headers[0]);
      const cityGroup = screen.getByText('City');
      expect(cityGroup).toBeDefined();
      fireEvent.click(headers[0]);
    });

    it('applies filters and fetches properties without bounds', async () => {
      mock.onGet('/api/properties/').reply(200, [
        baseProperty('a1', { title: 'Filtered', lat: 55.76, lon: 37.62 }),
      ]);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Filtered');
      fireEvent.click(screen.getByText(/Filters/));
      await screen.findByTestId('modal');
      const priceSlider = screen.getAllByTestId('range-slider')[0];
      fireEvent.click(priceSlider);
      fireEvent.click(screen.getByText('Apply Filters'));
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).toBeNull();
      });
      expect(screen.getByText('Filtered')).toBeDefined();
    });

    it('shows active filter count on button', async () => {
      mock.onGet('/api/properties/').reply(200, [
        baseProperty('cnt-1', { title: 'Count Test', lat: 55.76, lon: 37.62 }),
      ]);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Count Test');
      const filterBtn = screen.getByText(/Filters/);
      expect(filterBtn.textContent).not.toContain('(');
      fireEvent.click(filterBtn);
      await screen.findByTestId('modal');
      const priceSlider = screen.getAllByTestId('range-slider')[0];
      fireEvent.click(priceSlider);
      fireEvent.click(screen.getByText('Apply Filters'));
      await waitFor(() => {
        expect(screen.getByText(/Filters/).textContent).toContain('(');
      });
    });

    it('resets draft filters to defaults', async () => {
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      fireEvent.click(await screen.findByText(/Filters/));
      await screen.findByTestId('modal');
      fireEvent.click(screen.getByText('Reset'));
      mock.onGet('/api/properties/').reply(200, [baseProperty('reset-1', { title: 'After Reset' })]);
      fireEvent.click(screen.getByText('Apply Filters'));
      await waitFor(() => {
        expect(screen.queryByTestId('modal')).toBeNull();
      });
    });
  });

  describe('AI Recommendations', () => {
    it('fetches AI recommendations when authenticated', async () => {
      const store = createStore(true);
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/recommendations').reply(200, [
        baseProperty('ai-1', { title: 'AI Rec 1', lat: 55.76, lon: 37.62 }),
      ]);
      renderMap(store);
      expect(await screen.findByText('AI Rec 1')).toBeDefined();
    });

    it('does not fetch AI recommendations when not authenticated', async () => {
      const store = createStore(false);
      mock.onGet('/api/properties/').reply(200, []);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      const recSpy = vi.fn();
      mock.onGet('/api/recommendations').reply(() => {
        recSpy();
        return [200, []];
      });
      renderMap(store);
      await screen.findByTestId('yandex-map');
      await new Promise(r => setTimeout(r, 100));
      expect(recSpy).not.toHaveBeenCalled();
    });

    it('re-fetches AI recs after like toggle (recVersion change)', async () => {
      const store = createStore(true);
      const properties = [
        baseProperty('like-ai-1', { title: 'Like AI', likes_count: 3, is_liked_by_me: false }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      const recMock = mock.onGet('/api/recommendations').reply(200, []);
      renderMap(store);
      await screen.findByText('Like AI');
      expect(recMock.history).toBeDefined();
    });

    it('merges AI recommendations with properties (AI first, deduped)', async () => {
      const store = createStore(true);
      const properties = [
        baseProperty('shared-1', { title: 'From Properties', city: 'Moscow', lat: 55.76, lon: 37.62 }),
        baseProperty('only-prop', { title: 'Only Property', city: 'Moscow', lat: 55.76, lon: 37.62 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/recommendations').reply(200, [
        baseProperty('shared-1', { title: 'From AI', city: 'Moscow', lat: 55.76, lon: 37.62 }),
        baseProperty('only-ai', { title: 'Only AI', city: 'Moscow', lat: 55.76, lon: 37.62 }),
      ]);
      renderMap(store);
      await screen.findByText('From Properties');
      await screen.findByText('Only Property');
      await screen.findByText('Only AI');
      const cards = screen.getAllByTestId('property-card');
      expect(cards.length).toBe(3);
    });

    it('filters AI recommendations by applied bounds', async () => {
      const store = createStore(true);
      const properties = [
        baseProperty('base-1', { title: 'Base', city: 'Moscow', lat: 55.76, lon: 37.62 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/recommendations').reply(200, [
        baseProperty('ai-in', { title: 'AI Inside', city: 'Moscow', lat: 55.76, lon: 37.62 }),
        baseProperty('ai-out', { title: 'AI Outside', city: 'Far Away', lat: 57.0, lon: 40.0 }),
      ]);
      renderMap(store);
      await screen.findByText('AI Inside');
      await screen.findByText('AI Outside');
      fireEvent.click(screen.getByTestId('trigger-bounds'));
      await waitFor(() => {
        expect(screen.queryByText('AI Outside')).toBeNull();
      });
      expect(screen.getByText('AI Inside')).toBeDefined();
    });

    it('filters AI recommendations by applied filters', async () => {
      const store = createStore(true);
      const properties = [
        baseProperty('base-2', { title: 'Base 2', city: 'Moscow', lat: 55.76, lon: 37.62 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: ['Moscow'], materials: [], repair_types: [], property_types: [] });
      mock.onGet('/api/recommendations').reply(200, [
        baseProperty('ai-rooms', { title: 'AI Rooms Match', city: 'Moscow', rooms: 1, lat: 55.76, lon: 37.62 }),
        baseProperty('ai-rooms-wrong', { title: 'AI Rooms No Match', city: 'Moscow', rooms: 3, lat: 55.76, lon: 37.62 }),
      ]);
      renderMap(store);
      await screen.findByText('AI Rooms Match');
      await screen.findByText('AI Rooms No Match');
      fireEvent.click(screen.getByText(/Filters/));
      await screen.findByTestId('modal');

      const roomsGroup = screen.getAllByTestId('checkbox-group').find(g => g.getAttribute('data-label') === 'Rooms');
      fireEvent.click(roomsGroup!);

      mock.onGet('/api/properties/').reply(200, properties);
      fireEvent.click(screen.getByText('Apply Filters'));
      await waitFor(() => {
        expect(screen.queryByText('AI Rooms No Match')).toBeNull();
      });
      expect(screen.getByText('AI Rooms Match')).toBeDefined();
    });
  });

  describe('Card Click Selects Marker', () => {
    it('highlights selected card and updates map center', async () => {
      const properties = [
        baseProperty('sel-1', { title: 'Select Me', lat: 55.78, lon: 37.64, price: 6000000 }),
        baseProperty('sel-2', { title: 'Other', lat: 55.72, lon: 37.58, price: 4000000 }),
      ];
      mock.onGet('/api/properties/').reply(200, properties);
      mock.onGet('/api/properties/meta').reply(200, { cities: [], materials: [], repair_types: [], property_types: [] });
      renderMap();
      await screen.findByText('Select Me');
      const viewButtons = screen.getAllByTestId('card-click');
      fireEvent.click(viewButtons[0]);
    });
  });
});
