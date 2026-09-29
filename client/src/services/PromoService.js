import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export const validatePromoCode = async (code, subtotal) => apiPost('/promo/validate', { code, subtotal });

// Admin management
export const fetchPromoCodes = async () => apiGet('/promo');
export const createPromoCode = async (data) => apiPost('/promo', data);
export const updatePromoCode = async (id, data) => apiPut(`/promo/${id}`, data);
export const deletePromoCode = async (id) => apiDelete(`/promo/${id}`);
