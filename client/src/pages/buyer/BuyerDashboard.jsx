import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProductCard } from '@/components/dashboard/ProductCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Package, Heart, Truck, AlertCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { fetchProducts } from '@/services/ProductService';
import { fetchBuyerDashboard } from '@/services/DashboardService';
import { useWishlist } from '@/contexts/WishlistContext';
const categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Leafy Greens', 'Dairy'];
const BuyerDashboard = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [products, setProducts] = useState([]);
    const [categories_list, setCategories] = useState(categories);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingActivities, setIsLoadingActivities] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        cartItems: 0,
        wishlistItems: 0,
        totalOrders: 0,
        pendingDelivery: 0,
    });
    const [activities, setActivities] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const { addItem, itemCount, total } = useCart();
    const { toast } = useToast();
    const { items: savedItems } = useWishlist();
    // Fetch featured products on mount
    useEffect(() => {
        const loadProducts = async () => {
            try {
                setIsLoadingProducts(true);
                setError(null);
                const response = await fetchProducts({ limit: 8, sort: 'newest' });
                if (response.success && response.data) {
                    // Transform API response to Product format
                    const transformedProducts = response.data.map((p) => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        unit: p.unit_abbr || p.unit,
                        category: p.category_name,
                        stock: p.stock_quantity,
                        rating: parseFloat(p.avg_rating) || 0,
                        reviewCount: p.review_count || 0,
                        farmerId: p.farmer_id,
                        farmerName: p.farm_name,
                        image: p.image_url || p.primary_image,
                    }));
                    setProducts(transformedProducts);
                }
            }
            catch (err) {
                console.error('Failed to fetch products:', err);
                setError('Failed to load products');
            }
            finally {
                setIsLoadingProducts(false);
            }
        };
        loadProducts();
    }, []);
    // Auto-refresh stats every 5 seconds and listen for wishlist updates
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey(prev => prev + 1);
        }, 5000);
        // Listen for wishlist_updated custom event (when items are added/removed in the same tab)
        const handleWishlistUpdate = () => {
            console.log('Wishlist updated event received, refreshing stats...');
            setRefreshKey(prev => prev + 1);
        };
        // Also listen for storage changes (when wishlist is added from another tab/window)
        const handleStorageChange = (e) => {
            if (e.key === 'wishlist_updated' || e.key === 'auth_token') {
                console.log('Storage event received, refreshing stats...');
                setRefreshKey(prev => prev + 1);
            }
        };
        window.addEventListener('wishlist_updated', handleWishlistUpdate);
        window.addEventListener('storage', handleStorageChange);
        return () => {
            clearInterval(interval);
            window.removeEventListener('wishlist_updated', handleWishlistUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);
    // Fetch buyer stats
    useEffect(() => {
        const loadStats = async () => {
            try {
                setIsLoadingStats(true);
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    console.warn('No auth token found');
                    setIsLoadingStats(false);
                    return;
                }
                const response = await fetchBuyerDashboard();
                if (response.success && response.data) {
                    setStats({
                        cartItems: itemCount || response.data.cartItems || 0,
                        wishlistItems: response.data.wishlistItems || 0,
                        totalOrders: response.data.totalOrders || 0,
                        pendingDelivery: response.data.pendingDelivery || 0,
                    });
                    if (response.data.recentActivities) {
                        const formattedActivities = response.data.recentActivities.map((activity) => ({
                            id: activity.id || Math.random(),
                            type: activity.type,
                            message: activity.message,
                            time: activity.time,
                        }));
                        setActivities(formattedActivities);
                    }
                }
            }
            catch (err) {
                console.error('Failed to fetch stats:', err);
            }
            finally {
                setIsLoadingStats(false);
                setIsLoadingActivities(false);
            }
        };
        loadStats();
    }, [itemCount, total, refreshKey]);
    const filteredProducts = selectedCategory === 'All'
        ? products
        : products.filter((p) => p.category === selectedCategory);
    const handleAddToCart = async (product) => {
        try {
            await addItem({ productId: product.id, quantity: 1 });
            toast({ title: 'Added to cart', description: product.name });
        } catch (error) {
            toast({ title: 'Could not add to cart', description: error.message, variant: 'destructive' });
        }
    };


    return (<DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back!</h1>
            <p className="text-muted-foreground">Discover fresh products from local farmers</p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/buyer/cart">
              <ShoppingCart className="h-4 w-4"/>
              Cart ({itemCount}) - ৳{total}
            </Link>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (<Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-red-900 font-medium">Error loading dashboard</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>)}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoadingStats ? (<>
              <Card className="animate-pulse">
                <CardContent className="p-4 h-20 bg-muted"/>
              </Card>
              <Card className="animate-pulse">
                <CardContent className="p-4 h-20 bg-muted"/>
              </Card>
              <Card className="animate-pulse">
                <CardContent className="p-4 h-20 bg-muted"/>
              </Card>
              <Card className="animate-pulse">
                <CardContent className="p-4 h-20 bg-muted"/>
              </Card>
            </>) : (<>
              <StatCard title="Items in Cart" value={itemCount.toString()} icon={ShoppingCart}/>
              <StatCard title="Wishlist Items" value={savedItems.length.toString()} icon={Heart}/>
              <StatCard title="Total Orders" value={stats.totalOrders.toString()} icon={Package}/>
              <StatCard title="Pending Delivery" value={stats.pendingDelivery.toString()} icon={Truck}/>
            </>)}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Products Section */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Featured Products</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/buyer/products">View All Products</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Category Tabs */}
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
                  <TabsList className="flex-wrap h-auto gap-2">
                    {categories.map((cat) => (<TabsTrigger key={cat} value={cat} className="px-4">
                        {cat}
                      </TabsTrigger>))}
                  </TabsList>
                </Tabs>

                {/* Products Grid */}
                {isLoadingProducts ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (<Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-40 bg-muted rounded mb-3"/>
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"/>
                          <div className="h-4 bg-muted rounded w-1/2"/>
                        </CardContent>
                      </Card>))}
                  </div>) : (<>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProducts.map((product) => (<ProductCard key={product.id} product={product} onAddToCart={handleAddToCart}/>))}
                    </div>

                    {filteredProducts.length === 0 && (<div className="py-12 text-center text-muted-foreground">
                        No products found in this category
                      </div>)}
                  </>)}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            {isLoadingActivities ? (<Card>
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse"/>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (<div key={i} className="h-4 bg-muted rounded animate-pulse"/>))}
                  </div>
                </CardContent>
              </Card>) : (<RecentActivity activities={activities.length > 0 ? activities : [
                { id: '1', type: 'order', message: 'No recent activities', time: 'Just now' }
            ]} title="Your Activity"/>)}

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start" asChild>
                  <Link to="/buyer/orders">
                    <Truck className="mr-2 h-4 w-4"/>
                    Track Orders
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link to="/buyer/reviews">
                    <Star className="mr-2 h-4 w-4"/>
                    My Reviews
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link to="/buyer/wishlist">
                    <Heart className="mr-2 h-4 w-4"/>
                    View Wishlist
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>);
};
export default BuyerDashboard;
