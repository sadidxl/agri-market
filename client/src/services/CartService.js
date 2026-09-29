/**
 * Cart Service - API calls for cart operations
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export const getCart = async () => {
  return apiGet('/cart');
};

export const addToCart = async (productId, quantity) => {
  return apiPost('/cart/items', { product_id: productId, quantity });
};

export const updateCartItem = async (productId, quantity) => {
  return apiPut(`/cart/items/${productId}`, { quantity });
};

export const removeFromCart = async (productId) => {
  return apiDelete(`/cart/items/${productId}`);
};

export const clearCart = async () => {
  return apiDelete('/cart');
};
