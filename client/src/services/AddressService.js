import { apiGet, apiPost, apiDelete } from '@/lib/api';

export const fetchAddresses = async () => apiGet('/addresses');
export const createAddress = async (data) => apiPost('/addresses', data);
export const deleteAddress = async (addressId) => apiDelete(`/addresses/${addressId}`);
