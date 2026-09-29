import { apiGet, apiPost, apiPut, apiDelete, buildQueryString } from '@/lib/api';

export const fetchAllUsers = async (params = {}) => {
  const qs = buildQueryString({ role: params.role || '', search: params.search || '' });
  return apiGet(`/users${qs}`);
};
export const updateUser = async (userId, data) => apiPut(`/users/${userId}`, data);
export const deleteUser = async (userId) => apiDelete(`/users/${userId}`);

export const fetchAllProducts = async (params = {}) => {
  const qs = buildQueryString({
    page: params.page || 1,
    limit: params.limit || 100,
    search: params.search || '',
  });
  return apiGet(`/products${qs}`);
};

export const fetchPayments = async () => apiGet('/admin/payments');
export const updatePaymentStatus = async (paymentId, status) => apiPut(`/admin/payments/${paymentId}`, { status });
