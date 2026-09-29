import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as PasswordService from '@/services/PasswordService';
const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [devResetLink, setDevResetLink] = useState(null);
    const { toast } = useToast();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await PasswordService.requestPasswordReset(email);
            setIsSubmitted(true);
            // This project has no email service configured, so the backend
            // returns the reset token directly for local testing. In a real
            // deployment the backend would email this link instead.
            if (response.data?.reset_token) {
                setDevResetLink(`/reset-password?token=${response.data.reset_token}`);
            }
            toast({
                title: 'Reset link generated',
                description: response.message || 'Check the instructions below',
            });
        }
        catch (error) {
            toast({
                title: 'Failed to send reset link',
                description: error.message || 'Please try again later',
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
          <p className="text-muted-foreground">Reset your password</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>
              {isSubmitted
            ? 'Check your email for reset instructions'
            : 'Enter your email to receive a reset link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (<div className="text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary"/>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to:
                  </p>
                  <p className="font-medium">{email}</p>
                </div>
                {devResetLink && (
                  <div className="rounded-lg bg-muted/50 p-3 text-left text-xs">
                    <p className="font-medium text-muted-foreground mb-1">
                      Dev mode (no email service configured):
                    </p>
                    <Link to={devResetLink} className="text-primary hover:underline break-all">
                      {devResetLink}
                    </Link>
                  </div>
                )}
                <div className="pt-4 space-y-3">
                  <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                    <Mail className="mr-2 h-4 w-4"/>
                    Try a different email
                  </Button>
                  <Link to="/login">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4"/>
                      Back to login
                    </Button>
                  </Link>
                </div>
              </div>) : (<>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="Enter your registered email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Link to="/login" className="inline-flex items-center text-sm text-primary hover:underline">
                    <ArrowLeft className="mr-1 h-4 w-4"/>
                    Back to login
                  </Link>
                </div>
              </>)}
          </CardContent>
        </Card>
      </div>
    </div>);
};
export default ForgotPassword;
