/**
 * Auth Service - API calls for authentication
 */

import { apiGet, apiPost, apiPut } from '@/lib/api';

export const register = async (data) => {
  return apiPost('/auth/register', {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role: data.role,
  });
};

export const login = async (data) => {
  return apiPost('/auth/login', data);
};

export const logout = async () => {
  return apiPost('/auth/logout', {});
};

export const getCurrentUser = async () => {
  return apiGet('/auth/me');
};

export const updateProfile = async (data) => {
  return apiPut('/auth/profile', data);
};

export const changePassword = async (currentPassword, newPassword) => {
  return apiPut('/auth/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
};
