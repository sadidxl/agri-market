import { apiGet } from '@/lib/api';

export const fetchAdminDashboard = async (period = 30) => apiGet(`/admin/dashboard?period=${period}`);
export const fetchFarmerDashboard = async () => apiGet('/farmer/dashboard');
export const fetchBuyerDashboard = async () => apiGet('/buyer/dashboard');
