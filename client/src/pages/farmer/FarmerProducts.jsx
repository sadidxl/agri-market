import { ProductImage } from '@/components/ProductImage';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchFarmerInventory, deleteProduct as deleteProductApi } from '@/services/ProductService';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
const FarmerProducts = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState(null);
    const { toast } = useToast();
    const { user } = useAuth();
    useEffect(() => {
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const fetchProducts = async (showRefreshMessage = false) => {
        try {
            if (showRefreshMessage) {
                setIsRefreshing(true);
            }
            else {
                setIsLoading(true);
            }
            setError(null);
            const response = await fetchFarmerInventory({ farmer_id: user?.id });
            if (response.success && Array.isArray(response.data)) {
                setProducts(response.data);
            }
            else {
                setProducts([]);
            }
            if (showRefreshMessage) {
                toast({
                    title: 'Success',
                    description: 'Products list refreshed',
                });
            }
        }
        catch (err) {
            const errorMsg = err.message || 'Failed to fetch products';
            setError(errorMsg);
            toast({
                title: 'Error',
                description: errorMsg,
                variant: 'destructive',
            });
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    const handleRefresh = () => {
        fetchProducts(true);
    };
    const handleDelete = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product?')) {
            return;
        }
        setDeletingId(productId);
        try {
            const response = await deleteProductApi(productId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to delete product');
            }
            toast({
                title: 'Success',
                description: response.message || 'Product deleted successfully',
            });
            await fetchProducts();
        }
        catch (err) {
            toast({
                title: 'Error',
                description: err.message || 'Failed to delete product',
                variant: 'destructive',
            });
        }
        finally {
            setDeletingId(null);
        }
    };
    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Products</h1>
            <p className="text-muted-foreground">{products.length} products listed</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}/>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button asChild className="gap-2">
              <Link to="/farmer/products/new">
                <Plus className="h-4 w-4"/>
                Add Product
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (<div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
          </div>) : error ? (<Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleRefresh} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4"/>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>) : products.length === 0 ? (<Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                <p className="text-muted-foreground">No products yet. Add your first product!</p>
                <Button asChild className="mt-4 gap-2">
                  <Link to="/farmer/products/new">
                    <Plus className="h-4 w-4"/>
                    Add Product
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>) : (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (<Card key={product.id}>
                <div className="aspect-video bg-muted overflow-hidden relative">
                  <ProductImage src={getImageUrl(product.primary_image)} alt={product.name} className="h-full w-full object-cover"/>
                  <div className="absolute top-2 right-2">
                      <Badge variant={product.is_approved ? (product.is_active ? 'default' : 'destructive') : 'secondary'}>
                        {product.is_approved ? (product.is_active ? 'Active' : 'Inactive') : 'Pending Approval'}
                      </Badge>
                    </div>
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-2">{product.category_name}</Badge>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-primary font-bold">৳{parseFloat(product.price).toFixed(2)}/{product.unit_abbr}</p>
                    </div>
                    <Badge variant={product.stock_quantity > 10 ? 'default' : product.stock_quantity > 0 ? 'secondary' : 'destructive'}>
                      {product.stock_quantity} in stock
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" asChild>
                      <Link to={`/farmer/products/${product.id}/edit`}>
                        <Edit className="h-3 w-3"/>
                        Edit
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id}>
                      {deletingId === product.id ? (<>
                          <Loader2 className="h-3 w-3 animate-spin mr-1"/>
                          Deleting...
                        </>) : (<>
                          <Trash2 className="h-3 w-3"/>
                        </>)}
                    </Button>
                  </div>
                </CardContent>
              </Card>))}
          </div>)}
      </div>
    </DashboardLayout>);
};
export default FarmerProducts;
