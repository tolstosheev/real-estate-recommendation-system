import { describe, it, expect } from 'vitest';
import { store } from '@app/store/store';

describe('store', () => {
  it('creates the Redux store', () => {
    expect(store).toBeDefined();
    expect(store.getState()).toHaveProperty('auth');
    expect(store.getState()).toHaveProperty('property');
    expect(store.getState()).toHaveProperty('preferences');
  });
});
