import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Package, Truck, IndianRupee, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, } from 'recharts';
import { fetchAdminDashboard } from '@/services/DashboardService';
const AdminDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [ordersData, setOrdersData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Load real stats from the backend on mount
    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const response = await fetchAdminDashboard();
                if (response.success && response.data) {
                    setDashboard(response.data);
                    const formattedOrders = (response.data.recent_orders || []).map((order) => ({
                        id: order.id,
                        orderNumber: order.order_number,
                        customerName: `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Guest',
                        products: [{ name: '', quantity: 1 }],
                        total: order.total_amount,
                        status: order.status,
                        date: order.created_at,
                    }));
                    setOrdersData(formattedOrders);
                }
                else {
                    setError(response.error || 'Failed to load dashboard');
                }
            }
            catch (err) {
                console.error('Failed to load dashboard data:', err);
                setError(err.message || 'Failed to load dashboard data');
            }
            finally {
                setIsLoading(false);
            }
        };
        loadAnalytics();
    }, []);
    const overview = dashboard || {};
    const revenueChartData = (overview.revenue_by_month || []).map((item) => ({
        month: item.month,
        revenue: parseFloat(item.revenue) || 0,
    }));
    const userDistributionData = [
        { name: 'Farmers', value: Number(overview.users?.total_farmers) || 0, color: 'hsl(142, 50%, 35%)' },
        { name: 'Buyers', value: Number(overview.users?.total_buyers) || 0, color: 'hsl(45, 85%, 55%)' },
        { name: 'Admins', value: Number(overview.users?.total_admins) || 0, color: 'hsl(200, 85%, 45%)' },
    ];
    return (<DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/users">Manage Users</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/analytics">View Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={overview.users?.total_users ?? '0'} icon={Users}/>
          <StatCard title="Total Products" value={overview.products?.total_products ?? '0'} icon={Package}/>
          <StatCard title="Total Orders" value={overview.orders?.total_orders ?? '0'} icon={Truck}/>
          <StatCard title="Total Revenue" value={`৳${(Number(overview.orders?.total_revenue) || 0).toLocaleString()}`} icon={IndianRupee}/>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary"/>
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 50%, 35%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 50%, 35%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted"/>
                    <XAxis dataKey="month" className="text-xs"/>
                    <YAxis className="text-xs" tickFormatter={(value) => `৳${value / 1000}k`}/>
                    <Tooltip formatter={(value) => [`৳${value.toLocaleString()}`, 'Revenue']} contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
        }}/>
                    <Area type="monotone" dataKey="revenue" stroke="hsl(142, 50%, 35%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary"/>
                User Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {userDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color}/>))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center gap-4">
                {userDistributionData.map((item) => (<div key={item.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}/>
                    <span className="text-sm">{item.name}</span>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders and Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/orders">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <OrdersTable orders={ordersData}/>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <RecentActivity activities={ordersData.length === 0 ? [] : []}/>
        </div>

        {/* Alerts Section */}
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5"/>
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(overview.low_stock_products || []).map((product) => (<div key={product.id} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-2xl font-bold text-warning">{product.stock} {product.unit} left</p>
                  <p className="text-xs text-muted-foreground mt-1">by {product.farmer_name}</p>
                </div>))}
              {!(overview.low_stock_products || []).length && (
                <p className="text-sm text-muted-foreground">No low-stock alerts right now.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>);
};
export default AdminDashboard;
