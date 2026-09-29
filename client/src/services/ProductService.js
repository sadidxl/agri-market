/**
 * Product Service - API calls for product-related operations
 */

import { apiGet, apiPost, apiPut, apiDelete, buildQueryString } from '@/lib/api';

/** Fetch products list with filters */
export const fetchProducts = async (params = {}) => {
  const queryString = buildQueryString({
    page: params.page || 1,
    limit: params.limit || 12,
    search: params.search || '',
    category: params.category || '',
    min_price: params.min_price,
    max_price: params.max_price,
    sort: params.sort || 'newest',
    farmer_id: params.farmer_id || '',
    status: params.status || '',
  });

  return apiGet(`/products${queryString}`);
};

/** Fetch single product details */
export const fetchProductDetails = async (productId) => {
  return apiGet(`/products/${productId}`);
};

/** Fetch all categories */
export const fetchCategories = async (options = {}) => {
  const queryString = buildQueryString({
    include_count: options.includeCount ? '1' : '',
  });
  return apiGet(`/categories${queryString}`);
};

/** Fetch single category */
export const fetchCategory = async (categoryId) => {
  return apiGet(`/categories/${categoryId}`);
};

/** Check product stock */
export const checkStock = async (productId, quantity) => {
  return apiGet(`/products/${productId}/stock?quantity=${quantity}`);
};

/** Submit product review (buyer, must have purchased the product) */
export const submitReview = async (productId, data) => {
  return apiPost(`/products/${productId}/reviews`, data);
};

/** Fetch reviews for a product */
export const fetchProductReviews = async (productId) => {
  return apiGet(`/products/${productId}/reviews`);
};

/** Fetch farmer inventory / own products (farmer only) */
export const fetchFarmerInventory = async (params = {}) => {
  const queryString = buildQueryString({
    page: params.page || 1,
    limit: params.limit || 50,
    farmer_id: params.farmer_id,
  });
  return apiGet(`/products${queryString}`);
};

/** Create product (farmer/admin) */
export const createProduct = async (productData) => {
  return apiPost('/products', productData);
};

/** Update product (farmer/admin) */
export const updateProduct = async (productId, productData) => {
  return apiPut(`/products/${productId}`, productData);
};

/** Delete product (farmer/admin) */
export const deleteProduct = async (productId) => {
  return apiDelete(`/products/${productId}`);
};
