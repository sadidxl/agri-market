import { ProductImage } from '@/components/ProductImage';
import { useState } from 'react';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Star, Ban, CheckCircle, Package, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as AdminService from '@/services/AdminService';
import { updateProduct as updateProductApi } from '@/services/ProductService';
import { formatBDT } from '@/lib/currency';
const AdminProducts = () => {
    const { toast } = useToast();
    const [products, setProducts] = useState([]);
    const [isUsingMockData, setIsUsingMockData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Load products from API on mount
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const response = await AdminService.fetchAllProducts({ limit: 100 });
                if (response.success && response.data && response.data.length > 0) {
                    const mappedProducts = response.data.map((item) => ({
                        id: item.id,
                        name: item.name,
                        category: item.category_name || 'Uncategorized',
                        farmer: `${item.farmer_first_name || ''} ${item.farmer_last_name || ''}`.trim(),
                        farmName: item.farm_name || '',
                        price: parseFloat(item.price) || 0,
                        unit: item.unit_abbr || 'kg',
                        stock: parseInt(item.stock_quantity) || 0,
                        isActive: !!item.is_active,
                        isApproved: !!item.is_approved,
                        isFeatured: !!item.is_featured,
                        rating: parseFloat(item.avg_rating) || 0,
                        totalOrders: 0,
                        createdAt: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                        image: item.primary_image || item.image_url || '/placeholder.svg',
                    }));
                    setProducts(mappedProducts);
                    setIsUsingMockData(false);
                }
                else {
                    setProducts([]);
                    setIsUsingMockData(false);
                }
            }
            catch (error) {
                console.log('Failed to load products from API:', error);
                setIsUsingMockData(true);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadProducts();
    }, []);
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.farmer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && product.isActive) ||
            (statusFilter === 'inactive' && !product.isActive) ||
            (statusFilter === 'featured' && product.isFeatured) ||
            (statusFilter === 'out-of-stock' && product.stock === 0);
        return matchesSearch && matchesCategory && matchesStatus;
    });
    const stats = {
        total: products.length,
        active: products.filter(p => p.isActive).length,
        featured: products.filter(p => p.isFeatured).length,
        outOfStock: products.filter(p => p.stock === 0).length,
    };
    const categories = [...new Set(products.map(p => p.category))];
    const handleViewProduct = (product) => {
        setSelectedProduct(product);
        setIsViewDialogOpen(true);
    };
    const handleToggleActive = async (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product)
            return;
        if (isUsingMockData) {
            toast({
                title: 'Demo Mode',
                description: 'Product activation requires real API connection. Log in to use this feature.',
                variant: 'default',
            });
            return;
        }
        try {
            const response = await updateProductApi(productId, { is_active: !product.isActive });
            if (response.success) {
                setProducts(products.map(p => p.id === productId ? { ...p, isActive: !p.isActive } : p));
                toast({
                    title: product.isActive ? 'Product Deactivated' : 'Product Activated',
                    description: `${product.name} has been ${product.isActive ? 'deactivated' : 'activated'}.`,
                });
            }
            else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to update product status',
                    variant: 'destructive',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update product status',
                variant: 'destructive',
            });
        }
    };
    const handleToggleFeatured = async (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product)
            return;
        if (isUsingMockData) {
            toast({
                title: 'Demo Mode',
                description: 'Featured status changes require real API connection. Log in to use this feature.',
                variant: 'default',
            });
            return;
        }
        try {
            const response = await updateProductApi(productId, { is_featured: !product.isFeatured });
            if (response.success) {
                setProducts(products.map(p => p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p));
                toast({
                    title: product.isFeatured ? 'Removed from Featured' : 'Added to Featured',
                    description: `${product.name} has been ${product.isFeatured ? 'removed from' : 'added to'} featured products.`,
                });
            }
            else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to update featured status',
                    variant: 'destructive',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update featured status',
                variant: 'destructive',
            });
        }
    };
    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Moderation</h1>
            <p className="text-muted-foreground">Manage products, feature listings, and monitor inventory</p>
          </div>
          {isUsingMockData && (<Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              Demo Mode - Real Data Unavailable
            </Badge>)}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-yellow-600"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.featured}</p>
                <p className="text-sm text-muted-foreground">Featured</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.outOfStock}</p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search products or farmers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Category"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (<TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductImage src={product.image} alt={product.name} className="w-10 h-10 rounded object-cover bg-muted"/>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.farmer}</p>
                        <p className="text-sm text-muted-foreground">{product.farmName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatBDT(product.price)}</span>
                      <span className="text-muted-foreground">/{product.unit}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.stock > 0 ? 'outline' : 'destructive'}>
                        {product.stock > 0 ? `${product.stock} ${product.unit}` : 'Out of Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                        <span>{product.rating}</span>
                        <span className="text-muted-foreground">({product.totalOrders})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.isFeatured && (<Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Featured</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewProduct(product)}>
                          <Eye className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleFeatured(product.id)} className={product.isFeatured ? 'text-yellow-600' : ''}>
                          <Sparkles className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleActive(product.id)} className={product.isActive ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}>
                          {product.isActive ? <Ban className="h-4 w-4"/> : <CheckCircle className="h-4 w-4"/>}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Product Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {selectedProduct && (<div className="space-y-4">
                <div className="flex gap-4">
                  <ProductImage src={selectedProduct.image} alt={selectedProduct.name} className="w-24 h-24 rounded-lg object-cover bg-muted"/>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                    <p className="text-muted-foreground">{selectedProduct.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                      <span>{selectedProduct.rating}</span>
                      <span className="text-muted-foreground">({selectedProduct.totalOrders} orders)</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Farmer</p>
                    <p className="font-medium">{selectedProduct.farmer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Farm</p>
                    <p className="font-medium">{selectedProduct.farmName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">{formatBDT(selectedProduct.price)} / {selectedProduct.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock</p>
                    <p className="font-medium">{selectedProduct.stock} {selectedProduct.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={selectedProduct.isActive ? 'default' : 'secondary'}>
                        {selectedProduct.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {selectedProduct.isFeatured && (<Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Listed On</p>
                    <p className="font-medium">{selectedProduct.createdAt}</p>
                  </div>
                </div>
              </div>)}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>);
};
export default AdminProducts;
