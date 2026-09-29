import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as ReviewService from '@/services/ReviewService';
const FarmerReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [productRatings, setProductRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [averageRating, setAverageRating] = useState(0);
    const [fiveStarPercentage, setFiveStarPercentage] = useState(0);
    const { toast } = useToast();
    useEffect(() => {
        fetchReviews();
    }, []);
    const fetchReviews = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await ReviewService.fetchFarmerReviews();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch reviews');
            }
            const data = response.data || [];
            setReviews(data);
            // Derive per-product rating summary from the reviews themselves
            // (no separate ratings endpoint is needed for this).
            const byProduct = {};
            data.forEach((r) => {
                if (!byProduct[r.product_id]) {
                    byProduct[r.product_id] = { id: r.product_id, name: r.product_name, ratings: [] };
                }
                byProduct[r.product_id].ratings.push(r.rating);
            });
            const ratingsSummary = Object.values(byProduct)
                .map((p) => ({
                    id: p.id,
                    name: p.name,
                    avg_rating: p.ratings.reduce((s, r) => s + r, 0) / p.ratings.length,
                    review_count: p.ratings.length,
                }))
                .sort((a, b) => b.avg_rating - a.avg_rating);
            setProductRatings(ratingsSummary);
            // Calculate statistics
            if (data.length > 0) {
                const avgRating = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
                setAverageRating(Math.round(avgRating * 10) / 10);
                const fiveStarCount = data.filter((r) => r.rating === 5).length;
                const percentage = Math.round((fiveStarCount / data.length) * 100);
                setFiveStarPercentage(percentage);
            }
        }
        catch (err) {
            const errorMessage = err.message || 'Failed to load reviews';
            setError(errorMessage);
            toast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        }
        finally {
            setLoading(false);
        }
    };
    const formatDate = (dateString) => {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };
    const renderStars = (rating) => {
        return [1, 2, 3, 4, 5].map((star) => (<Star key={star} className={`h-4 w-4 ${star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'}`}/>));
    };
    if (loading) {
        return (<DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
      </DashboardLayout>);
    }
    return (<DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Customer Reviews</h1>
          <p className="text-muted-foreground">
            {reviews.length} reviews on your products
          </p>
        </div>

        {error && (<Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"/>
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>)}

        {/* Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {averageRating}
              </div>
              <div className="flex justify-center mt-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Average Rating
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{reviews.length}</div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {fiveStarPercentage}%
              </div>
              <p className="text-sm text-muted-foreground">5-Star Reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Product Ratings Summary */}
        {productRatings.length > 0 && (<Card>
            <CardHeader>
              <CardTitle>Top Rated Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {productRatings.slice(0, 4).map((product) => (<div key={product.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                    <p className="font-medium text-sm">{product.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex">
                        {renderStars(Math.round(product.avg_rating))}
                      </div>
                      <span className="text-sm font-semibold">
                        {parseFloat(product.avg_rating).toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({product.review_count} reviews)
                      </span>
                    </div>
                  </div>))}
              </div>
            </CardContent>
          </Card>)}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (<Card>
              <CardContent className="pt-6 text-center text-muted-foreground py-12">
                No reviews yet. Keep up the great work!
              </CardContent>
            </Card>) : (reviews.map((review) => (<Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {review.buyer_first_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {review.buyer_first_name} {review.buyer_last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            on {review.product_name}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {review.comment}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>)))}
        </div>
      </div>
    </DashboardLayout>);
};
export default FarmerReviews;
