import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@shared/lib/tokenService';

describe('tokenService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns null initially', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and returns token', () => {
    setAccessToken('test-token');
    expect(getAccessToken()).toBe('test-token');
    expect(localStorage.getItem('accessToken')).toBe('test-token');
  });

  it('clears token when set to null', () => {
    setAccessToken('test-token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('handles localStorage error on get', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage error'); });
    const token = getAccessToken();
    expect(token).toBeNull();
  });

  it('handles localStorage error on set', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage error'); });
    setAccessToken('test-token');
    expect(getAccessToken()).toBe('test-token');
  });

});
