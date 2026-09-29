/**
 * Order Service - API calls for checkout & order management
 */

import { apiGet, apiPost, apiPut, buildQueryString } from '@/lib/api';

export const createOrder = async (data) => {
  return apiPost('/orders', data);
};

export const fetchOrders = async (params = {}) => {
  const queryString = buildQueryString({ status: params.status || '' });
  return apiGet(`/orders${queryString}`);
};

export const fetchOrderDetails = async (orderId) => {
  return apiGet(`/orders/${orderId}`);
};

export const updateOrderStatus = async (orderId, status) => {
  return apiPut(`/orders/${orderId}/status`, { status });
};
