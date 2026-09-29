import { apiGet, apiPost, apiDelete } from '@/lib/api';

export const fetchWishlist = async () => apiGet('/wishlist');
export const addToWishlist = async (productId) => apiPost('/wishlist', { product_id: productId });
export const removeFromWishlist = async (productId) => apiDelete(`/wishlist/${productId}`);
