import { apiGet, buildQueryString } from '@/lib/api';

export const fetchInventoryHistory = async (params = {}) => {
  const qs = buildQueryString({ product_id: params.product_id || '' });
  return apiGet(`/inventory/history${qs}`);
};
