import { apiGet, apiPost, apiPut } from '@/lib/api';

/** Farmer: full wallet snapshot (balance + earnings breakdown + withdrawals) */
export const fetchFarmerWallet = async () => apiGet('/farmer/wallet');

/** Farmer: request a withdrawal */
export const requestWithdrawal = async (payload) => apiPost('/farmer/wallet/withdraw', payload);

/** Admin: list withdrawal requests, optionally filtered by status */
export const fetchWithdrawals = async (status = '') =>
  apiGet(status ? `/admin/withdrawals?status=${status}` : '/admin/withdrawals');

/** Admin: update a withdrawal's status / admin note */
export const updateWithdrawal = async (id, payload) => apiPut(`/admin/withdrawals/${id}`, payload);