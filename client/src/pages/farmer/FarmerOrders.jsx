import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as OrderService from '@/services/OrderService';
const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
};
const FarmerOrders = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('all');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadOrders(activeTab);
    }, [activeTab]);
    const loadOrders = async (statusFilter) => {
        setLoading(true);
        try {
            const response = await OrderService.fetchOrders({ status: statusFilter !== 'all' ? statusFilter : undefined });
            if (response.success && response.data) {
                setOrders(response.data);
            }
            else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to load orders',
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
            setLoading(false);
        }
    };
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const response = await OrderService.updateOrderStatus(orderId, newStatus);
            if (response.success) {
                setOrders(orders.map(o => o.id === orderId
                    ? { ...o, status: newStatus }
                    : o));
                toast({
                    title: 'Order Updated',
                    description: `Order status has been updated to ${newStatus}.`,
                });
            }
            else {
                toast({
                    title: 'Error',
                    description: response.error || 'Failed to update order',
                    variant: 'destructive',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update order',
                variant: 'destructive',
            });
        }
    };
    const filtered = orders; // Orders are already filtered by the API based on activeTab
    return (<DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Manage Orders</h1><p className="text-muted-foreground">{orders.length} total orders</p></div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="confirmed">Confirmed</TabsTrigger><TabsTrigger value="processing">Processing</TabsTrigger><TabsTrigger value="shipped">Shipped</TabsTrigger></TabsList>
          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {loading ? (<div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              </div>) : filtered.length === 0 ? (<div className="text-center p-8 text-muted-foreground">
                No orders found
              </div>) : (<>
                {filtered.map((order) => (<Card key={order.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2"><h3 className="font-semibold">{order.order_number}</h3><Badge className={statusColors[order.status]}>{order.status}</Badge></div>
                          <p className="text-sm text-muted-foreground">{order.customer_name} • {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold">৳{order.total_amount}</p>
                          <Select defaultValue={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="shipped">Shipped</SelectItem><SelectItem value="delivered">Delivered</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>))}
              </>)}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>);
};
export default FarmerOrders;
