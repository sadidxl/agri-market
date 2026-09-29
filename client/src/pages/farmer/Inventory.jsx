import { ProductImage } from '@/components/ProductImage';
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, TrendingUp, TrendingDown, AlertCircle, Loader2, RefreshCw, History as HistoryIcon, ArrowUpCircle, ArrowDownCircle, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchFarmerInventory } from '@/services/ProductService';
import { fetchInventoryHistory } from '@/services/InventoryService';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
const LOW_STOCK_THRESHOLD = 10;
const CHANGE_TYPE_LABELS = {
    initial: { label: 'Initial stock', icon: Package, color: 'text-muted-foreground' },
    restock: { label: 'Restocked', icon: ArrowUpCircle, color: 'text-primary' },
    sale: { label: 'Sold', icon: ArrowDownCircle, color: 'text-destructive' },
    cancellation_restock: { label: 'Order cancelled — restocked', icon: ArrowUpCircle, color: 'text-primary' },
    adjustment: { label: 'Manual adjustment', icon: Settings2, color: 'text-warning' },
};
const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('stock');
    const { toast } = useToast();
    const { user } = useAuth();
    useEffect(() => {
        fetchInventory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (activeTab === 'history' && history.length === 0) {
            loadHistory();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);
    const loadHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const response = await fetchInventoryHistory();
            if (response.success) {
                setHistory(response.data || []);
            }
        }
        catch (err) {
            toast({ title: 'Error', description: err.message || 'Failed to load history', variant: 'destructive' });
        }
        finally {
            setIsHistoryLoading(false);
        }
    };
    const fetchInventory = async (showRefreshMessage = false) => {
        try {
            if (showRefreshMessage) {
                setIsRefreshing(true);
            }
            else {
                setIsLoading(true);
            }
            setError(null);
            const response = await fetchFarmerInventory({ farmer_id: user?.id });
            if (response.success) {
                const transformedInventory = (response.data || []).map((item) => ({
                    ...item,
                    product_id: item.id,
                    product_name: item.name,
                    current_stock: Number(item.stock_quantity ?? item.stock ?? 0),
                    min_stock: LOW_STOCK_THRESHOLD,
                    unit_name: item.unit_abbr || item.unit,
                    price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                }));
                setInventory(transformedInventory);
            }
            else {
                setInventory([]);
            }
            if (showRefreshMessage) {
                toast({
                    title: 'Success',
                    description: 'Inventory refreshed',
                });
            }
        }
        catch (err) {
            const errorMsg = err.message || 'Failed to fetch inventory';
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
        fetchInventory(true);
    };
    const getLowStockItems = () => inventory.filter(item => item.current_stock <= item.min_stock);
    const getOutOfStockItems = () => inventory.filter(item => item.current_stock === 0);
    const lowStockCount = getLowStockItems().length;
    const outOfStockCount = getOutOfStockItems().length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.price), 0);
    return (<DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Inventory Management</h1>
                        <p className="text-muted-foreground">Track and manage product stock levels</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}/>
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total Items</p>
                                <p className="text-3xl font-bold mt-2">{inventory.length}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Stock Value</p>
                                <p className="text-3xl font-bold mt-2 text-green-600">৳{totalValue.toFixed(0)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Low Stock</p>
                                <p className={`text-3xl font-bold mt-2 ${lowStockCount > 0 ? 'text-orange-600' : ''}`}>
                                    {lowStockCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Out of Stock</p>
                                <p className={`text-3xl font-bold mt-2 ${outOfStockCount > 0 ? 'text-red-600' : ''}`}>
                                    {outOfStockCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Alerts */}
                {outOfStockCount > 0 && (<Alert variant="destructive">
                        <AlertCircle className="h-4 w-4"/>
                        <AlertDescription>
                            You have {outOfStockCount} product{outOfStockCount !== 1 ? 's' : ''} out of stock. Consider restocking them soon!
                        </AlertDescription>
                    </Alert>)}

                {lowStockCount > 0 && outOfStockCount === 0 && (<Alert>
                        <AlertCircle className="h-4 w-4"/>
                        <AlertDescription>
                            You have {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} with low stock levels.
                        </AlertDescription>
                    </Alert>)}

                {/* Loading State */}
                {isLoading ? (<Card>
                        <CardContent className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </CardContent>
                    </Card>) : error ? (<Card>
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
                    </Card>) : inventory.length === 0 ? (<Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                                <p className="text-muted-foreground">No inventory items yet</p>
                            </div>
                        </CardContent>
                    </Card>) : (<>
                        {/* Tabs */}
                        <div className="flex gap-2 border-b">
                            <Button variant={activeTab === 'stock' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('stock')}>
                                Current Stock
                            </Button>
                            <Button variant={activeTab === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('history')} className="gap-2">
                                <HistoryIcon className="h-4 w-4"/>
                                History
                            </Button>
                        </div>

                        {/* Current Stock View */}
                        {activeTab === 'stock' && (<div className="space-y-4">
                                {/* Out of Stock Items */}
                                {getOutOfStockItems().length > 0 && (<div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5"/>
                                            Out of Stock ({outOfStockCount})
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {getOutOfStockItems().map((item) => (<Card key={item.product_id} className="border-red-200">
                                                    <div className="aspect-video bg-muted overflow-hidden relative">
                                                        <ProductImage src={getImageUrl(item.primary_image)} alt={item.product_name} className="h-full w-full object-cover"/>
                                                        <div className="absolute top-2 right-2">
                                                            <Badge variant="destructive">Out of Stock</Badge>
                                                        </div>
                                                    </div>
                                                    <CardContent className="pt-4">
                                                        <h4 className="font-semibold">{item.product_name}</h4>
                                                        <div className="mt-2 space-y-1 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Category:</span>
                                                                <span>{item.category_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Current Stock:</span>
                                                                <span className="font-bold text-red-600">0 {item.unit_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-muted-foreground">Price:</span>
                                                                <span className="font-semibold">৳{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>))}
                                        </div>
                                    </div>)}

                                {/* Low Stock Items */}
                                {getLowStockItems().length > 0 && outOfStockCount < getLowStockItems().length && (<div>
                                        <h3 className="text-lg font-semibold mb-3 text-orange-600 flex items-center gap-2">
                                            <TrendingDown className="h-5 w-5"/>
                                            Low Stock ({lowStockCount - outOfStockCount})
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {getLowStockItems()
                        .filter(item => item.current_stock > 0)
                        .map((item) => (<Card key={item.product_id} className="border-orange-200">
                                                        <div className="aspect-video bg-muted overflow-hidden relative">
                                                            <ProductImage src={getImageUrl(item.primary_image)} alt={item.product_name} className="h-full w-full object-cover"/>
                                                            <div className="absolute top-2 right-2">
                                                                <Badge variant="secondary">Low Stock</Badge>
                                                            </div>
                                                        </div>
                                                        <CardContent className="pt-4">
                                                            <h4 className="font-semibold">{item.product_name}</h4>
                                                            <div className="mt-2 space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Category:</span>
                                                                    <span>{item.category_name}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Current Stock:</span>
                                                                    <span className="font-bold text-orange-600">
                                                                        {item.current_stock} {item.unit_name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Min. Stock:</span>
                                                                    <span>{item.min_stock} {item.unit_name}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Price:</span>
                                                                    <span className="font-semibold">৳{typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>))}
                                        </div>
                                    </div>)}

                                {/* Normal Stock Items */}
                                {inventory.filter(item => item.current_stock > item.min_stock).length > 0 && (<div>
                                        <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5"/>
                                            Healthy Stock ({inventory.filter(item => item.current_stock > item.min_stock).length})
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {inventory
                        .filter(item => item.current_stock > item.min_stock)
                        .map((item) => (<Card key={item.product_id}>
                                                        <div className="aspect-video bg-muted overflow-hidden relative">
                                                            <ProductImage src={getImageUrl(item.primary_image)} alt={item.product_name} className="h-full w-full object-cover"/>
                                                            <div className="absolute top-2 right-2">
                                                                <Badge>In Stock</Badge>
                                                            </div>
                                                        </div>
                                                        <CardContent className="pt-4">
                                                            <h4 className="font-semibold">{item.product_name}</h4>
                                                            <div className="mt-2 space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Category:</span>
                                                                    <span>{item.category_name}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Current Stock:</span>
                                                                    <span className="font-bold text-green-600">
                                                                        {item.current_stock} {item.unit_name}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-muted-foreground">Stock Value:</span>
                                                                    <span className="font-semibold">
                                                                        ৳{typeof item.price === 'number' ? (item.current_stock * item.price).toFixed(0) : '0'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>))}
                                        </div>
                                    </div>)}
                        </div>)}

                        {/* History View */}
                        {activeTab === 'history' && (<Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HistoryIcon className="h-5 w-5"/>
                                    Inventory Change History
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isHistoryLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                                    </div>
                                ) : history.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">No inventory changes recorded yet</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left text-muted-foreground">
                                                    <th className="py-2 pr-4">Date</th>
                                                    <th className="py-2 pr-4">Product</th>
                                                    <th className="py-2 pr-4">Change</th>
                                                    <th className="py-2 pr-4">Quantity</th>
                                                    <th className="py-2 pr-4">Stock After</th>
                                                    <th className="py-2">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.map((log) => {
                                                    const meta = CHANGE_TYPE_LABELS[log.change_type] || CHANGE_TYPE_LABELS.adjustment;
                                                    const Icon = meta.icon;
                                                    return (
                                                        <tr key={log.id} className="border-b last:border-0">
                                                            <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                                                                {new Date(log.created_at).toLocaleString()}
                                                            </td>
                                                            <td className="py-2 pr-4 font-medium">{log.product_name}</td>
                                                            <td className={`py-2 pr-4 flex items-center gap-1.5 ${meta.color}`}>
                                                                <Icon className="h-4 w-4"/>
                                                                {meta.label}
                                                            </td>
                                                            <td className={`py-2 pr-4 font-medium ${log.quantity_change > 0 ? 'text-primary' : 'text-destructive'}`}>
                                                                {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} {log.unit}
                                                            </td>
                                                            <td className="py-2 pr-4">{log.new_stock} {log.unit}</td>
                                                            <td className="py-2 text-muted-foreground">{log.reason || '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>)}
                    </>)}
            </div>
        </DashboardLayout>);
};
export default Inventory;
