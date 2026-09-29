import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Search, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ProductCard } from '@/components/dashboard/ProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchProducts, fetchCategories } from '@/services/ProductService';
import { categories as defaultCategories } from '@/data/mockProducts';
import { useCart } from '@/contexts/CartContext';
import { getImageUrl } from '@/lib/imageUrl';

const Shop = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { addItem } = useCart();
    const { toast } = useToast();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState(defaultCategories);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [sortBy, setSortBy] = useState('newest');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [selectedFarmers, setSelectedFarmers] = useState([]);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const maxPrice = useMemo(() => {
        if (products.length === 0) return 500;
        return Math.ceil(Math.max(...products.map((p) => p.price)) / 100) * 100 || 500;
    }, [products]);

    useEffect(() => {
        setPriceRange((prev) => [prev[0], maxPrice]);
    }, [maxPrice]);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const response = await fetchProducts({ page: 1, limit: 100, sort: 'newest' });
                const productsData = Array.isArray(response.data)
                    ? response.data
                    : response.data?.products || [];
                setProducts(productsData.map((p) => ({
                    id: p.id,
                    name: p.name,
                    description: p.description || `${p.name} - Fresh from farm`,
                    price: parseFloat(p.price) || 0,
                    unit: p.unit || 'kg',
                    category: p.category_name || 'Uncategorized',
                    stock: p.stock || 0,
                    rating: p.avg_rating ? parseFloat(p.avg_rating) : 0,
                    reviewCount: p.review_count || 0,
                    farmerId: p.farmer_id || '',
                    farmerName: `${p.farmer_first_name || ''} ${p.farmer_last_name || ''}`.trim(),
                    image: getImageUrl(p.image_url),
                })));
                const catResponse = await fetchCategories({ includeCount: true });
                if (catResponse.success && catResponse.data?.length) {
                    setCategories(['All', ...catResponse.data.map((c) => c.name)]);
                }
            } catch (err) {
                toast({ title: 'Could not load products', description: 'Please try again shortly.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const farmers = useMemo(() => {
        const farmerSet = new Set(products.map((p) => p.farmerName).filter(Boolean));
        return Array.from(farmerSet);
    }, [products]);

    const filteredProducts = useMemo(() => {
        let result = [...products];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.farmerName.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            );
        }
        if (selectedCategory !== 'All') {
            result = result.filter((p) => p.category === selectedCategory);
        }
        result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
        if (inStockOnly) {
            result = result.filter((p) => p.stock > 0);
        }
        if (selectedFarmers.length > 0) {
            result = result.filter((p) => selectedFarmers.includes(p.farmerName));
        }
        switch (sortBy) {
            case 'price_low':
                result.sort((a, b) => a.price - b.price);
                break;
            case 'price_high':
                result.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                result.sort((a, b) => b.rating - a.rating);
                break;
            default:
                break;
        }
        return result;
    }, [products, searchQuery, selectedCategory, priceRange, sortBy, inStockOnly, selectedFarmers]);

    const requireAuth = (action) => {
        toast({
            title: 'Sign in to continue',
            description: `Create a free account or sign in to ${action}.`,
        });
        navigate('/register');
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('All');
        setPriceRange([0, maxPrice]);
        setInStockOnly(false);
        setSelectedFarmers([]);
        setSortBy('newest');
    };

    const toggleFarmer = (farmer) => {
        setSelectedFarmers((prev) =>
            prev.includes(farmer) ? prev.filter((f) => f !== farmer) : [...prev, farmer]
        );
    };

    const FilterContent = () => (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label className="text-sm font-medium">Price Range</Label>
                <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value)}
                    max={maxPrice}
                    step={10}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>৳{priceRange[0]}</span>
                    <span>৳{priceRange[1]}</span>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox id="shop-in-stock" checked={inStockOnly} onCheckedChange={(checked) => setInStockOnly(!!checked)} />
                <Label htmlFor="shop-in-stock" className="text-sm cursor-pointer">
                    In stock only
                </Label>
            </div>

            {farmers.length > 0 && (
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Farmers</Label>
                    {farmers.map((farmer) => (
                        <div key={farmer} className="flex items-center space-x-2">
                            <Checkbox
                                id={`shop-${farmer}`}
                                checked={selectedFarmers.includes(farmer)}
                                onCheckedChange={() => toggleFarmer(farmer)}
                            />
                            <Label htmlFor={`shop-${farmer}`} className="text-sm cursor-pointer">
                                {farmer}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            <Button variant="outline" className="w-full" onClick={clearFilters}>
                Clear Filters
            </Button>
        </div>
    );

    return (<div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground"/>
            </div>
            <span className="text-xl font-bold">AgriMarket</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (<Button asChild><Link to="/buyer">Go to Dashboard</Link></Button>) : (<>
              <Button variant="ghost" asChild><Link to="/login">Sign In</Link></Button>
              <Button asChild><Link to="/register">Get Started</Link></Button>
            </>)}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Browse Products</h1>
          <p className="text-muted-foreground">Fresh products from local farmers — sign in when you're ready to buy.</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input placeholder="Search products, farmers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9"/>
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4"/>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2">
                  <SlidersHorizontal className="h-4 w-4"/>
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="flex-wrap h-auto justify-start">
            {categories.map((c) => (<TabsTrigger key={c} value={c}>{c}</TabsTrigger>))}
          </TabsList>
        </Tabs>

        {isLoading ? (<div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
          </div>) : (
          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="hidden lg:block h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <FilterContent />
              </CardContent>
            </Card>

            <div className="lg:col-span-3">
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground mb-4">No products found matching your criteria.</p>
                  <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onView={() => navigate(`/shop/products/${product.id}`)}
                      onAddToCart={async product => {
                        if (!isAuthenticated) return requireAuth('add items to your cart');
                        if (user.role !== 'buyer') return toast({ title: 'Buyer account required', variant: 'destructive' });
                        try {
                          await addItem({ productId: product.id, quantity: 1 });
                          toast({ title: 'Added to cart', description: product.name });
                        } catch (error) { toast({ title: 'Could not add to cart', description: error.message, variant: 'destructive' }); }
                      }}
                      
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>);
};

export default Shop;
