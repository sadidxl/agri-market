/**
 * API Service - Base configuration and utilities for backend communication
 */

// Base URL of the Express API. Configure with VITE_API_URL in client/.env
// Defaults to same-origin /api; Vite proxies it to the local Express server.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Generic API request handler
export const apiRequest = async (endpoint, options = {}) => {
  const { method = 'GET', body, ...restOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: getHeaders(true),
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      ...restOptions,
    });
  } catch (networkError) {
    // The API/DB is unreachable — surface a friendly, catchable error
    // instead of letting the raw fetch rejection bubble up.
    const error = new Error('Unable to reach the server. Please check your connection and try again.');
    error.status = 0;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`
    );
    error.status = response.status;
    error.data = data;

    if (response.status === 401) {
      // Session expired/invalid — clear stale credentials so the UI
      // consistently falls back to "logged out" state.
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }

    throw error;
  }

  return data;
};

export const apiGet = (endpoint) => apiRequest(endpoint, { method: 'GET' });
export const apiPost = (endpoint, body) => apiRequest(endpoint, { method: 'POST', body });
export const apiPut = (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body });
export const apiDelete = (endpoint) => apiRequest(endpoint, { method: 'DELETE' });

/**
 * Upload a file (multipart/form-data) — used for product image uploads.
 * Does not set a Content-Type header manually so the browser can attach
 * the correct multipart boundary itself.
 */
export const apiUpload = async (endpoint, file) => {
  const formData = new FormData();
  formData.append('image', file);

  const token = localStorage.getItem('auth_token');
  const url = `${API_BASE_URL}${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  } catch (networkError) {
    const error = new Error('Unable to reach the server. Please check your connection and try again.');
    error.status = 0;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  return data;
};

/**
 * Build query string from object
 */
export const buildQueryString = (params) => {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return filtered ? `?${filtered}` : '';
};
