import { apiPost, apiPut } from '@/lib/api';

export const requestPasswordReset = async (email) => apiPost('/auth/forgot-password', { email });
export const resetPassword = async (token, newPassword) =>
  apiPut('/auth/reset-password', { token, new_password: newPassword });
