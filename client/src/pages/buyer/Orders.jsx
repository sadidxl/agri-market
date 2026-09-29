import { ProductImage } from '@/components/ProductImage';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Package, Truck, CheckCircle, Clock, XCircle, Search, ChevronRight, MapPin, Star, Loader2, } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as OrderService from '@/services/OrderService';
import { useCart } from '@/contexts/CartContext';
const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Confirmed', icon: Package, color: 'bg-blue-100 text-blue-800' },
    processing: { label: 'Processing', icon: Package, color: 'bg-blue-100 text-blue-800' },
    shipped: { label: 'Shipped', icon: Truck, color: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
};
const Orders = () => {
    const navigate = useNavigate();
    const { addItem } = useCart();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const { toast } = useToast();
    useEffect(() => {
        loadOrders();
    }, []);
    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('auth_token');
            if (!token) {
                toast({
                    title: 'Authentication required',
                    description: 'Please log in again',
                    variant: 'destructive',
                });
                return;
            }
            const response = await OrderService.fetchOrders();
            if (response.success && response.data) {
                setOrders(response.data);
            }
            else {
                toast({
                    title: 'Failed to load orders',
                    description: response.error || 'Unable to load your orders',
                    variant: 'destructive',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load orders',
                variant: 'destructive',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCancelOrder = async (order) => {
        if (!window.confirm(`Cancel order ${order.order_number || ''}? This cannot be undone.`)) return;
        try {
            setActionLoading(order.id);
            const response = await OrderService.updateOrderStatus(order.id, 'cancelled');
            if (!response.success) {
                throw new Error(response.error || 'Unable to cancel this order');
            }
            setOrders((prev) =>
                prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o))
            );
            toast({ title: 'Order cancelled', description: `Order ${order.order_number || ''} was cancelled.` });
        } catch (error) {
            toast({
                title: 'Failed to cancel order',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(null);
        }
    };

    // Reorder needs the full line items, which the list endpoint doesn't send —
    // fetch the order detail, then push each product back into the cart.
    const handleReorder = async (order) => {
        try {
            setActionLoading(order.id);
            const response = await OrderService.fetchOrderDetails(order.id);
            const items = response.data?.items || [];
            if (!items.length) {
                toast({ title: 'Nothing to reorder', description: 'This order has no items.', variant: 'destructive' });
                return;
            }
            let added = 0;
            for (const item of items) {
                if (!item.product_id) continue;
                await addItem({
                    productId: item.product_id,
                    name: item.product_name,
                    price: Number(item.unit_price),
                    quantity: item.quantity,
                    unit: '',
                    image: item.image || '',
                    farmerId: item.farmer_id,
                    farmerName: '',
                });
                added += 1;
            }
            if (!added) {
                toast({
                    title: 'Products unavailable',
                    description: 'The products from this order are no longer listed.',
                    variant: 'destructive',
                });
                return;
            }
            toast({ title: 'Added to cart', description: `${added} item(s) from ${order.order_number || 'your order'} added to your cart.` });
            navigate('/buyer/cart');
        } catch (error) {
            toast({
                title: 'Failed to reorder',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredOrders = orders.filter((order) => {
        const orderNumber = order.order_number || order.orderNumber || '';
        const matchesSearch = orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const status = (order.status || 'pending');
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'active' && ['pending', 'confirmed', 'processing', 'shipped'].includes(status)) ||
            (activeTab === 'completed' && status === 'delivered') ||
            (activeTab === 'cancelled' && status === 'cancelled');
        return matchesSearch && matchesTab;
    });
    return (<DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
            <Input placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9"/>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (<Card className="py-12">
                <CardContent className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4"/>
                  <p className="text-muted-foreground">Loading your orders...</p>
                </CardContent>
              </Card>) : filteredOrders.length === 0 ? (<Card className="py-12">
                <CardContent className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                  <h3 className="text-lg font-semibold mb-2">No orders found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                ? 'Try a different search term'
                : "You haven't placed any orders yet"}
                  </p>
                  <Button asChild>
                    <Link to="/buyer/products">Start Shopping</Link>
                  </Button>
                </CardContent>
              </Card>) : (<div className="space-y-4">
                {filteredOrders.map((order) => {
                const orderNumber = order.order_number || order.orderNumber || 'N/A';
                let orderStatus = order.status || 'pending';
                // Validate status is in statusConfig, default to pending if not
                if (!statusConfig[orderStatus]) {
                    console.warn(`Unknown order status: ${orderStatus}, defaulting to pending`);
                    orderStatus = 'pending';
                }
                const StatusIcon = statusConfig[orderStatus].icon;
                const orderDate = order.created_at || order.date || new Date().toISOString();
                return (<Card key={order.id}>
                      <CardContent className="pt-6">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{orderNumber}</h3>
                              <Badge className={statusConfig[orderStatus].color}>
                                <StatusIcon className="h-3 w-3 mr-1"/>
                                {statusConfig[orderStatus].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Placed on {new Date(orderDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">৳{order.total_amount || order.total || 0}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.item_count || order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} items
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        {order.items && order.items.length > 0 ? (<div className="flex gap-3 overflow-x-auto pb-2">
                            {order.items.map((item) => (<div key={item.id} className="flex items-center gap-3 min-w-fit border rounded-lg p-2">
                                <div className="h-12 w-12 bg-muted rounded flex-shrink-0">
                                  <ProductImage src={item.image || '/placeholder.svg'} alt={item.name || 'Product'} className="h-full w-full object-cover rounded"/>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{item.name || 'Product'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} {item.unit || 'unit'} × ৳{item.price}
                                  </p>
                                </div>
                              </div>))}
                          </div>) : (<p className="text-sm text-muted-foreground">{order.item_count || 0} items in this order</p>)}

                        {/* Delivery Address */}
                        <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5"/>
                          <span>{order.delivery_address}{order.delivery_city ? `, ${order.delivery_city}` : ''}{order.delivery_state ? `, ${order.delivery_state}` : ''}</span>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/buyer/orders/${order.id}`}>
                              View Details
                              <ChevronRight className="h-4 w-4 ml-1"/>
                            </Link>
                          </Button>
                          {orderStatus === 'delivered' && (<Button variant="outline" size="sm" className="gap-1" asChild>
                              <Link to={`/buyer/orders/${order.id}`}>
                                <Star className="h-4 w-4"/>
                                Rate Order
                              </Link>
                            </Button>)}
                          {orderStatus === 'delivered' && (<Button variant="outline" size="sm" onClick={() => handleReorder(order)} disabled={actionLoading === order.id}>
                              {actionLoading === order.id ? (<>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin"/>
                                  Adding...
                                </>) : ('Reorder')}
                            </Button>)}
                          {orderStatus === 'pending' && (<Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleCancelOrder(order)} disabled={actionLoading === order.id}>
                              {actionLoading === order.id ? (<>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin"/>
                                  Cancelling...
                                </>) : ('Cancel Order')}
                            </Button>)}
                        </div>
                      </CardContent>
                    </Card>);
            })}
              </div>)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>);
};
export default Orders;
