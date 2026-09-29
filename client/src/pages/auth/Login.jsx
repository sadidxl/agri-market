import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Leaf, User, Tractor, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const roleIcons = {
    buyer: User,
    farmer: Tractor,
    admin: ShieldCheck,
};
const roleDescriptions = {
    buyer: 'Browse and purchase fresh products',
    farmer: 'Sell your farm products directly',
    admin: 'Manage the marketplace',
};
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('buyer');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const loggedInUser = await login(email, password);
            toast({
                title: 'Welcome back!',
                description: `Successfully logged in`,
            });
            navigate(`/${loggedInUser.role}`);
        }
        catch (error) {
            console.error('Login error:', error);
            toast({
                title: 'Login failed',
                description: error.message || 'Please check your credentials',
                variant: 'destructive',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl gradient-primary shadow-lg">
            <Leaf className="h-8 w-8 text-primary-foreground"/>
          </div>
          <h1 className="mt-4 text-2xl font-bold">AgriMarket</h1>
          <p className="text-muted-foreground">Farm Fresh, Direct to You</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Choose your role and sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Role Selection */}
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v)} className="mb-6">
              <TabsList className="grid h-auto w-full grid-cols-3">
                {['buyer', 'farmer', 'admin'].map((role) => {
            const Icon = roleIcons[role];
            return (<TabsTrigger key={role} value={role} className="flex-col gap-1 py-3">
                      <Icon className="h-4 w-4"/>
                      <span className="capitalize">{role}</span>
                    </TabsTrigger>);
        })}
              </TabsList>
              {['buyer', 'farmer', 'admin'].map((role) => (<TabsContent key={role} value={role} className="mt-4">
                  <p className="text-center text-sm text-muted-foreground px-2">{roleDescriptions[role]}</p>
                </TabsContent>))}
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder={`${selectedRole}@demo.com`} value={email} onChange={(e) => setEmail(e.target.value)} required/>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
};
export default Login;
