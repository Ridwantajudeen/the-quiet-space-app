const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

const buildUrl = (path) => `${API_URL}${path}`;

export const apiRequest = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = 'Something went wrong.';
    try {
      const error = await response.json();
      message = error?.error || message;
    } catch (_) {
      // ignore parse errors
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return response.json();
};
