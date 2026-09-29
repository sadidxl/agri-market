import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Leaf, ShoppingCart, Tractor, ShieldCheck, ArrowRight, Star, Users, Package, TrendingUp, Sprout, LayoutDashboard, } from 'lucide-react';
const features = [
    {
        icon: Tractor,
        title: 'For Farmers',
        description: 'List your products, manage inventory, and reach customers directly',
        color: 'bg-primary/10 text-primary',
    },
    {
        icon: ShoppingCart,
        title: 'For Buyers',
        description: 'Browse fresh products, compare prices, and order from local farms',
        color: 'bg-accent/20 text-accent-foreground',
    },
    {
        icon: ShieldCheck,
        title: 'Quality Assured',
        description: 'Verified farmers, KYC compliance, and secure transactions',
        color: 'bg-info/10 text-info',
    },
];
const stats = [
    { value: '2,000+', label: 'Active Users', icon: Users },
    { value: '850+', label: 'Products', icon: Package },
    { value: '98%', label: 'Satisfaction', icon: Star },
    { value: '45%', label: 'Cost Savings', icon: TrendingUp },
];
const Index = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();

    // "Sell Your Product": existing farmers land on their dashboard, anyone
    // else is sent to the farmer sign-up flow so they land with the right
    // role preselected.
    const handleSellYourProduct = () => {
        if (isAuthenticated && user?.role === 'farmer') {
            navigate('/farmer');
        } else {
            navigate('/register?role=farmer');
        }
    };

    return (<div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Leaf className="h-5 w-5 text-primary-foreground"/>
            </div>
            <span className="text-xl font-bold">AgriMarket</span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (<Button asChild>
                <Link to={`/${user?.role}`}>
                  <LayoutDashboard className="h-4 w-4"/>
                  Go to Dashboard
                </Link>
              </Button>) : (<>
              <Button variant="ghost" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </>)}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 gradient-hero opacity-5"/>
        <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 gap-1" variant="secondary">
              <Sprout className="h-3.5 w-3.5"/>
              Farm Fresh Marketplace
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-6xl">
              Connect Directly with{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Local Farmers
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
              A digital marketplace bridging the gap between farmers and consumers. 
              Fresh products, fair prices, and sustainable agriculture.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/shop">
                  Start Shopping <ArrowRight className="h-4 w-4"/>
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={handleSellYourProduct}>
                Sell Your Product
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
            const Icon = stat.icon;
            return (<div key={stat.label} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary"/>
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>);
        })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground">
            Simple, transparent, and beneficial for everyone in the agricultural supply chain
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (<Card key={feature.title} className="group transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}>
                    <Icon className="h-6 w-6"/>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>);
        })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 text-primary-foreground/80">
            Join thousands of farmers and buyers already using AgriMarket
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary"/>
              <span className="font-semibold">AgriMarket</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AgriMarket. Connecting farms to tables.
            </p>
          </div>
        </div>
      </footer>
    </div>);
};
export default Index;
