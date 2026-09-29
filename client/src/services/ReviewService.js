import { apiGet, apiDelete } from '@/lib/api';

export const fetchMyReviews = async () => apiGet('/reviews/mine');
export const fetchFarmerReviews = async () => apiGet('/reviews/farmer');
export const deleteReview = async (reviewId) => apiDelete(`/reviews/${reviewId}`);
