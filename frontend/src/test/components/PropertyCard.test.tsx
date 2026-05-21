import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PropertyCard from '@entities/property/ui/PropertyCard';
import type { Property } from '@shared/api/types';
import api from '@shared/api/api';

vi.mock('@shared/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const baseProperty: Property = {
  id: '1',
  title: 'Test Apartment',
  description: 'A nice test apartment',
  price: 5000000,
  area: 65,
  rooms: 2,
  floor: 5,
  total_floors: 12,
  property_type: 'Apartment',
  property_purpose: 'sale',
  category: '2-к квартира',
  address: 'Test Street 123',
  city: 'Moscow',
  district: 'Центр',
  metro: 'Пушкинская',
  lat: 55.7558,
  lon: 37.6173,
  images: ['https://example.com/image1.jpg'],
  sq_living: 40.5,
  sq_kitchen: 12.0,
  build_year: 2015,
  material: 'кирпич',
  repair_type: 'евро',
  room_type: 'изолированные',
  is_new: 'новостройка',
  balcony: 'есть',
  parking: 'есть',
  owner: {
    id: 'owner-1',
    full_name: 'Test Owner',
    phone_number: '+1234567890',
    telegram_handle: '@testowner',
  },
  views_count: 0,
  likes_count: 0,
};

function renderCard(overrides: Partial<Property> = {}, props: Record<string, unknown> = {}) {
  return render(
    <BrowserRouter>
      <PropertyCard property={{ ...baseProperty, ...overrides }} {...props} />
    </BrowserRouter>
  );
}

describe('PropertyCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Basic rendering', () => {
    it('renders price, title and address', () => {
      renderCard();
      expect(screen.getByText('5 000 000 ₽')).toBeDefined();
      expect(screen.getByText('Test Apartment')).toBeDefined();
      expect(screen.getByText('Test Street 123')).toBeDefined();
    });

    it('formats price with locale separators', () => {
      renderCard({ price: 1234567 });
      expect(screen.getByText('1 234 567 ₽')).toBeDefined();
    });

    it('formats zero price', () => {
      renderCard({ price: 0 });
      expect(screen.getByText('0 ₽')).toBeDefined();
    });
  });

  describe('Variant classes', () => {
    it('renders vertical variant by default', () => {
      renderCard();
      const card = screen.getByText('Test Street 123').closest('.property-card');
      expect(card?.classList.contains('property-card--vertical')).toBe(true);
      expect(card?.classList.contains('property-card--horizontal')).toBe(false);
    });

    it('renders horizontal variant', () => {
      renderCard({}, { variant: 'horizontal' });
      const card = screen.getByText('Test Street 123').closest('.property-card');
      expect(card?.classList.contains('property-card--horizontal')).toBe(true);
      expect(card?.classList.contains('property-card--vertical')).toBe(false);
    });
  });

  describe('Image rendering', () => {
    it('renders image with absolute URL', () => {
      renderCard();
      const img = screen.getByRole('img');
      expect(img).toBeDefined();
      expect(img.getAttribute('src')).toBe('https://example.com/image1.jpg');
      expect(img.getAttribute('alt')).toBe('Test Apartment');
      expect(img.getAttribute('loading')).toBe('lazy');
    });

    it('prepends base URL to relative image path', () => {
      vi.stubEnv('VITE_API_URL', 'http://test-api.com');
      renderCard({ images: ['/uploads/photo.jpg'] });
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('http://test-api.com/uploads/photo.jpg');
    });

    it('prepends base URL with separator when path lacks leading slash', () => {
      vi.stubEnv('VITE_API_URL', 'http://test-api.com');
      renderCard({ images: ['uploads/photo.jpg'] });
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('http://test-api.com/uploads/photo.jpg');
    });

    it('falls back to localhost default when VITE_API_URL is not set', () => {
      renderCard({ images: ['/uploads/photo.jpg'] });
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('http://localhost:8000/uploads/photo.jpg');
    });

    it('shows placeholder when images array is empty', () => {
      renderCard({ images: [] });
      expect(screen.getByText('No Photo')).toBeDefined();
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('shows placeholder when images array contains only empty strings', () => {
      renderCard({ images: ['', '  ', ''] });
      expect(screen.getByText('No Photo')).toBeDefined();
    });

    it('shows first valid image when array has mixed content', () => {
      renderCard({ images: ['', 'https://example.com/valid.jpg', ''] });
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://example.com/valid.jpg');
    });

    it('falls back to placeholder on image error', () => {
      renderCard();
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(screen.getByText('No Photo')).toBeDefined();
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('does not render image again after error', () => {
      renderCard();
      const img = screen.getByRole('img');
      fireEvent.error(img);
      fireEvent.error(img);
      expect(screen.getByText('No Photo')).toBeDefined();
    });
  });

  describe('Badges', () => {
    it('renders property_type badge', () => {
      renderCard();
      expect(screen.getByText('Apartment')).toBeDefined();
    });

    it('renders property_purpose badge', () => {
      renderCard();
      expect(screen.getByText('sale')).toBeDefined();
    });

    it('renders category badge', () => {
      renderCard();
      expect(screen.getByText('2-к квартира')).toBeDefined();
    });

    it('hides badges when values are null', () => {
      renderCard({ property_type: null, property_purpose: null, category: null });
      expect(screen.queryByText('Apartment')).toBeNull();
      expect(screen.queryByText('sale')).toBeNull();
      expect(screen.queryByText('2-к квартира')).toBeNull();
    });
  });

  describe('AI recommendation badge', () => {
    it('renders AI badge when is_ai_recommendation is true', () => {
      renderCard({ is_ai_recommendation: true });
      expect(screen.getByText('AI')).toBeDefined();
    });

    it('does not render AI badge when is_ai_recommendation is false', () => {
      renderCard({ is_ai_recommendation: false });
      expect(screen.queryByText('AI')).toBeNull();
    });

    it('does not render AI badge when is_ai_recommendation is undefined', () => {
      renderCard();
      expect(screen.queryByText('AI')).toBeNull();
    });

    it('positions AI badge to right when showActions is false', () => {
      renderCard({ is_ai_recommendation: true }, { showActions: false });
      const aiBadge = screen.getByText('AI');
      expect(aiBadge.classList.contains('property-card__ai-badge--right')).toBe(true);
      expect(aiBadge.classList.contains('property-card__ai-badge--center')).toBe(false);
    });

    it('positions AI badge to center when showActions is true', () => {
      renderCard({ is_ai_recommendation: true }, { showActions: true });
      const aiBadge = screen.getByText('AI');
      expect(aiBadge.classList.contains('property-card__ai-badge--center')).toBe(true);
      expect(aiBadge.classList.contains('property-card__ai-badge--right')).toBe(false);
    });
  });

  describe('Like button', () => {
    it('renders like button even when isAuthenticated is false', () => {
      const { container } = renderCard({}, { showActions: true, isAuthenticated: false });
      expect(container.querySelector('.property-card__like-btn')).not.toBeNull();
    });

    it('does not render like button when showActions is false', () => {
      const { container } = renderCard({}, { showActions: false, isAuthenticated: true });
      expect(container.querySelector('.property-card__like-btn')).toBeNull();
    });

    it('renders like button when both showActions and isAuthenticated are true', () => {
      const { container } = renderCard({}, { showActions: true, isAuthenticated: true });
      expect(container.querySelector('.property-card__like-btn')).not.toBeNull();
    });

    it('shows active class when is_liked_by_me is true', () => {
      const { container } = renderCard({ is_liked_by_me: true }, { showActions: true, isAuthenticated: true });
      const btn = container.querySelector('.property-card__like-btn');
      expect(btn?.classList.contains('property-card__like-btn--active')).toBe(true);
    });

    it('shows inactive class when is_liked_by_me is false', () => {
      const { container } = renderCard({ is_liked_by_me: false }, { showActions: true, isAuthenticated: true });
      const btn = container.querySelector('.property-card__like-btn');
      expect(btn?.classList.contains('property-card__like-btn--active')).toBe(false);
    });

    it('shows inactive class when is_liked_by_me is undefined', () => {
      const { container } = renderCard({}, { showActions: true, isAuthenticated: true });
      const btn = container.querySelector('.property-card__like-btn');
      expect(btn?.classList.contains('property-card__like-btn--active')).toBe(false);
    });

    it('calls api.post and onLikeToggle on like click', async () => {
      const onLikeToggle = vi.fn();
      const mockPost = vi.mocked(api.post).mockResolvedValue({});
      const { container } = renderCard({ is_liked_by_me: false }, { showActions: true, isAuthenticated: true, onLikeToggle });

      fireEvent.click(container.querySelector('.property-card__like-btn')!);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/interactions/interact', {
          property_id: '1',
          interaction_type: 'like',
        });
      });
      expect(onLikeToggle).toHaveBeenCalledWith('1', true);
    });

    it('toggles from liked to unliked', async () => {
      const onLikeToggle = vi.fn();
      vi.mocked(api.post).mockResolvedValue({});
      const { container } = renderCard({ is_liked_by_me: true }, { showActions: true, isAuthenticated: true, onLikeToggle });

      fireEvent.click(container.querySelector('.property-card__like-btn')!);

      await waitFor(() => {
        expect(onLikeToggle).toHaveBeenCalledWith('1', false);
      });
    });

    it('reverts to previous liked state on API error', async () => {
      const onLikeToggle = vi.fn();
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));
      const { container } = renderCard({ is_liked_by_me: false }, { showActions: true, isAuthenticated: true, onLikeToggle });

      fireEvent.click(container.querySelector('.property-card__like-btn')!);

      await waitFor(() => {
        expect(onLikeToggle).toHaveBeenCalledWith('1', false);
      });
    });

    it('does not call api.post when not authenticated', () => {
      const { container } = renderCard({}, { showActions: true, isAuthenticated: false });
      fireEvent.click(container.querySelector('.property-card__like-btn')!);
      expect(vi.mocked(api.post)).not.toHaveBeenCalled();
    });

    it('stops click propagation from card click', () => {
      const onClick = vi.fn();
      const onLikeToggle = vi.fn();
      vi.mocked(api.post).mockResolvedValue({});
      const { container } = renderCard({}, { showActions: true, isAuthenticated: true, onClick, onLikeToggle });

      fireEvent.click(container.querySelector('.property-card__like-btn')!);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('adds no-hover class to card on mouse enter and removes on leave', () => {
      const { container } = renderCard({}, { showActions: true, isAuthenticated: true });
      const btn = container.querySelector('.property-card__like-btn')!;
      const card = screen.getByText('Test Street 123').closest('.property-card');

      fireEvent.mouseEnter(btn);
      expect(card?.classList.contains('property-card--no-hover')).toBe(true);

      fireEvent.mouseLeave(btn);
      expect(card?.classList.contains('property-card--no-hover')).toBe(false);
    });
  });

  describe('Click handling', () => {
    it('calls onClick prop when provided', () => {
      const onClick = vi.fn();
      renderCard({}, { onClick });
      fireEvent.click(screen.getByText('Test Street 123').closest('.property-card')!);
      expect(onClick).toHaveBeenCalledWith('1');
    });

    it('navigates to property page when no onClick', () => {
      renderCard();
      fireEvent.click(screen.getByText('Test Street 123').closest('.property-card')!);
      expect(mockNavigate).toHaveBeenCalledWith('/property/1');
    });

    it('does not call navigate when onClick is provided', () => {
      const onClick = vi.fn();
      renderCard({}, { onClick });
      fireEvent.click(screen.getByText('Test Street 123').closest('.property-card')!);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Specs display', () => {
    it('renders area with m² suffix', () => {
      renderCard();
      expect(screen.getByText('65 m²')).toBeDefined();
    });

    it('renders rooms with rm suffix', () => {
      renderCard();
      expect(screen.getByText('2 rm')).toBeDefined();
    });

    it('renders floor out of total floors', () => {
      renderCard();
      expect(screen.getByText('5/12 fl')).toBeDefined();
    });

    it('renders build year with г suffix', () => {
      renderCard();
      expect(screen.getByText('2015 г.')).toBeDefined();
    });

    it('hides area when null', () => {
      renderCard({ area: null });
      expect(screen.queryByText(/m²/)).toBeNull();
    });

    it('hides rooms when null', () => {
      renderCard({ rooms: null });
      expect(screen.queryByText(/rm/)).toBeNull();
    });

    it('hides floor when floor is null', () => {
      renderCard({ floor: null, total_floors: 12 });
      expect(screen.queryByText(/fl/)).toBeNull();
    });

    it('hides floor when total_floors is null', () => {
      renderCard({ floor: 5, total_floors: null });
      expect(screen.queryByText(/fl/)).toBeNull();
    });

    it('hides build_year when null', () => {
      renderCard({ build_year: null });
      expect(screen.queryByText(/г\./)).toBeNull();
    });

    it('renders all specs simultaneously', () => {
      renderCard();
      expect(screen.getByText('65 m²')).toBeDefined();
      expect(screen.getByText('2 rm')).toBeDefined();
      expect(screen.getByText('5/12 fl')).toBeDefined();
      expect(screen.getByText('2015 г.')).toBeDefined();
    });
  });

  describe('Location tags', () => {
    it('renders district tag', () => {
      renderCard();
      expect(screen.getByText('Центр')).toBeDefined();
    });

    it('renders metro tag', () => {
      renderCard();
      expect(screen.getByText('Пушкинская')).toBeDefined();
    });

    it('hides district when null', () => {
      renderCard({ district: null });
      expect(screen.queryByText('Центр')).toBeNull();
    });

    it('hides metro when null', () => {
      renderCard({ metro: null });
      expect(screen.queryByText('Пушкинская')).toBeNull();
    });

    it('hides location section when both district and metro are null', () => {
      renderCard({ district: null, metro: null });
      expect(screen.queryByText('Центр')).toBeNull();
      expect(screen.queryByText('Пушкинская')).toBeNull();
      expect(document.querySelector('.property-card__location-tags')).toBeNull();
    });
  });

  describe('CTA button', () => {
    it('renders View Details button in vertical variant', () => {
      renderCard({}, { variant: 'vertical' });
      expect(screen.getByText('View Details')).toBeDefined();
    });

    it('does not render View Details button in horizontal variant', () => {
      renderCard({}, { variant: 'horizontal' });
      expect(screen.queryByText('View Details')).toBeNull();
    });

    it('calls handleClick on CTA button click', () => {
      const onClick = vi.fn();
      renderCard({}, { onClick });
      fireEvent.click(screen.getByText('View Details'));
      expect(onClick).toHaveBeenCalledWith('1');
    });

    it('stops CTA click propagation from card click', () => {
      const onClick = vi.fn();
      const cardOnClick = vi.fn();
      renderCard({}, { onClick: cardOnClick });
      fireEvent.click(screen.getByText('View Details'));
      expect(cardOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('handles minimal property with all nullable fields set to null', () => {
      const minimal: Property = {
        id: '2',
        title: 'Minimal',
        description: null,
        price: 3000000,
        area: null,
        rooms: null,
        floor: null,
        total_floors: null,
        property_type: null,
        property_purpose: null,
        category: null,
        address: 'Some address',
        city: null,
        district: null,
        metro: null,
        lat: 55.0,
        lon: 37.0,
        images: [],
        sq_living: null,
        sq_kitchen: null,
        build_year: null,
        material: null,
        repair_type: null,
        room_type: null,
        is_new: null,
        balcony: null,
        parking: null,
        owner: {
          id: 'owner-x',
          full_name: 'X',
          phone_number: null,
          telegram_handle: null,
        },
        views_count: 0,
        likes_count: 0,
      };
      render(
        <BrowserRouter>
          <PropertyCard property={minimal} />
        </BrowserRouter>
      );
      expect(screen.getByText('3 000 000 ₽')).toBeDefined();
      expect(screen.getByText('Minimal')).toBeDefined();
      expect(screen.getByText('No Photo')).toBeDefined();
      expect(screen.queryByText(/m²/)).toBeNull();
      expect(screen.queryByText(/rm/)).toBeNull();
      expect(screen.queryByText(/fl/)).toBeNull();
      expect(screen.queryByText(/г\./)).toBeNull();
    });

    it('renders property with images containing empty string', () => {
      renderCard({ images: ['https://valid.com/img.jpg'] });
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('https://valid.com/img.jpg');
    });

    it('handles very large price value', () => {
      renderCard({ price: 99999999999 });
      expect(screen.getByText('99 999 999 999 ₽')).toBeDefined();
    });

    it('handles like click without onLikeToggle', async () => {
      vi.mocked(api.post).mockResolvedValue({});
      const { container } = renderCard({ is_liked_by_me: false }, { showActions: true, isAuthenticated: true });

      fireEvent.click(container.querySelector('.property-card__like-btn')!);

      await waitFor(() => {
        expect(vi.mocked(api.post)).toHaveBeenCalled();
      });
    });

    it('handles API error without onLikeToggle', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));
      const { container } = renderCard({ is_liked_by_me: false }, { showActions: true, isAuthenticated: true });

      fireEvent.click(container.querySelector('.property-card__like-btn')!);

      await waitFor(() => {
        expect(vi.mocked(api.post)).toHaveBeenCalled();
      });
      expect(console.error).toHaveBeenCalledWith('Failed to like property:', expect.any(Error));
      vi.restoreAllMocks();
    });

    it('handles images being undefined at runtime', () => {
      const propertyWithoutImages = { ...baseProperty, images: undefined as unknown as string[] };
      render(
        <BrowserRouter>
          <PropertyCard property={propertyWithoutImages} />
        </BrowserRouter>
      );
      expect(screen.getByText('No Photo')).toBeDefined();
    });


  });
});
