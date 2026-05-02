import { describe, it, expect } from 'vitest';
import { authReducer, setCredentials, logout } from '@entities/user/model/slice';

describe('auth slice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
  };

  it('should handle setCredentials', () => {
    const payload = { user: { id: 1, name: 'Test User' }, token: 'test-token' };
    const state = authReducer(initialState, setCredentials(payload));
    
    expect(state.user).toEqual(payload.user);
    expect(state.token).toBe(payload.token);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const stateWithUser = {
      user: { id: 1, name: 'Test User' },
      token: 'test-token',
      isAuthenticated: true,
    };
    const state = authReducer(stateWithUser, logout());
    
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
