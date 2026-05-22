const TOKEN_KEY = 'accessToken';

const getFromStorage = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

let cachedToken: string | null = getFromStorage();

export const getAccessToken = (): string | null => cachedToken;

export const setAccessToken = (token: string | null): void => {
  cachedToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable
  }
};
