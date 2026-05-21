import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@entities/user/model/slice';
import Home from '@pages/home/Home';

vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: { children: React.ReactNode }) => <div data-testid="swiper-slide">{children}</div>,
}));

vi.mock('swiper/modules', () => ({
  Pagination: {},
  Navigation: {},
}));

const mockGetRecommendations = vi.fn();
vi.mock('@shared/api/recommendations.service', () => ({
  recommendationsService: {
    getRecommendations: (...args: unknown[]) => mockGetRecommendations(...args),
  },
}));

const createStore = (isAuthenticated = false) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: {
    auth: { user: null, token: null, isAuthenticated },
  },
});

const renderHome = (isAuthenticated = false) => render(
  <Provider store={createStore(isAuthenticated)}>
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  </Provider>
);

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero section', () => {
    renderHome();
    expect(screen.getByText(/Find Your Dream Home/i)).toBeDefined();
  });

  it('shows loading state initially', () => {
    mockGetRecommendations.mockReturnValue(new Promise(() => {}));
    renderHome(true);
    expect(screen.getByText('Loading recommendations...')).toBeDefined();
  });

  it('shows sign-in prompt when fetch fails', async () => {
    mockGetRecommendations.mockRejectedValue(new Error('fail'));
    renderHome(true);
    expect(await screen.findByText('Sign in to get personalized recommendations')).toBeDefined();
  });

  it('shows empty state when no recommendations', async () => {
    mockGetRecommendations.mockResolvedValue([]);
    renderHome(true);
    expect(await screen.findByText(/No recommendations yet/i)).toBeDefined();
  });

  it('renders swiper when recommendations are available', async () => {
    mockGetRecommendations.mockResolvedValue([
      { id: '1', title: 'Test', price: 5000000, images: ['img.jpg'], address: 'Addr', lat: 55, lon: 37, owner: { id: 'o1', full_name: 'Owner' }, property_type: null, property_purpose: null, city: null, area: null, rooms: null, floor: null, total_floors: null, description: null, district: null, metro: null, sq_living: null, sq_kitchen: null, build_year: null, material: null, repair_type: null, room_type: null, is_new: null, balcony: null, parking: null, views_count: 0, likes_count: 0 },
    ]);
    renderHome(true);
    expect(await screen.findByTestId('swiper')).toBeDefined();
    expect(screen.getByText(/AI-Powered Recommendations/i)).toBeDefined();
  });
});
