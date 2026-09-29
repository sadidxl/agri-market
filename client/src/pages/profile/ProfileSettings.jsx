import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { User, MapPin, Shield, Bell, Camera, CheckCircle, AlertCircle, Save, Eye, EyeOff, } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as AuthService from '@/services/AuthService';
import * as AddressService from '@/services/AddressService';
const ProfileSettings = () => {
    const { user, refreshUser } = useAuth();
    const { toast } = useToast();
    // Personal Info State
    const [personalInfo, setPersonalInfo] = useState({
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });
    // Address State (loaded from the server)
    const [addresses, setAddresses] = useState([]);
    const [newAddress, setNewAddress] = useState({
        type: 'Home',
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
    });
    // Security State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    // Notification Settings
    const [notifications, setNotifications] = useState({
        emailOrders: true,
        emailPromotions: false,
        smsOrders: true,
        smsPromotions: false,
        pushNotifications: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showAddAddress, setShowAddAddress] = useState(false);
    // Real KYC status from the backend (set by an admin) — was previously
    // hardcoded to 'verified' for every user, which is misleading.
    const kycStatus = user?.kyc_status || 'pending';
    useEffect(() => {
        AddressService.fetchAddresses()
            .then((res) => {
                if (res.success) setAddresses(res.data);
            })
            .catch(() => {});
    }, []);
    const handleSavePersonalInfo = async () => {
        setIsLoading(true);
        try {
            await AuthService.updateProfile({
                first_name: personalInfo.firstName,
                last_name: personalInfo.lastName,
                phone: personalInfo.phone,
            });
            await refreshUser();
            toast({
                title: 'Profile updated',
                description: 'Your personal information has been saved',
            });
        }
        catch (error) {
            toast({
                title: 'Update failed',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleAddAddress = async () => {
        setIsLoading(true);
        try {
            const response = await AddressService.createAddress({
                label: newAddress.type,
                full_address: [newAddress.line1, newAddress.line2].filter(Boolean).join(', '),
                city: newAddress.city,
                state: newAddress.state,
                is_default: addresses.length === 0,
            });
            if (response.success) {
                setAddresses([...addresses, response.data]);
                setNewAddress({ type: 'Home', line1: '', line2: '', city: '', state: '', pincode: '' });
                setShowAddAddress(false);
                toast({
                    title: 'Address added',
                    description: 'Your new address has been saved',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Failed to add address',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            toast({
                title: 'Passwords do not match',
                description: 'New password and confirmation must match',
                variant: 'destructive',
            });
            return;
        }
        if (passwords.new.length < 6) {
            toast({
                title: 'Password too short',
                description: 'Password must be at least 6 characters',
                variant: 'destructive',
            });
            return;
        }
        setIsLoading(true);
        try {
            await AuthService.changePassword(passwords.current, passwords.new);
            setPasswords({ current: '', new: '', confirm: '' });
            toast({
                title: 'Password changed',
                description: 'Your password has been updated successfully',
            });
        }
        catch (error) {
            toast({
                title: 'Password change failed',
                description: error.message || 'Please check your current password',
                variant: 'destructive',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSaveNotifications = async () => {
        // NOTE: There is no notification-preferences endpoint on the backend
        // yet, so these toggles are local-only for now and reset on reload.
        // Being explicit about that here rather than showing a false
        // "saved" confirmation.
        toast({
            title: 'Not saved to your account yet',
            description: 'Notification preferences are a local preview only — this needs a backend endpoint to persist across sessions.',
        });
    };
    return (<DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="flex flex-col md:flex-row items-center gap-6 pt-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/placeholder.svg"/>
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full">
                <Camera className="h-4 w-4"/>
              </Button>
            </div>
            <div className="text-center md:text-left space-y-1">
              <h2 className="text-xl font-semibold">{user?.first_name} {user?.last_name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Badge variant="outline" className="capitalize">
                  {user?.role}
                </Badge>
                {kycStatus === 'verified' ? (<Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                    <CheckCircle className="mr-1 h-3 w-3"/>
                    KYC Verified
                  </Badge>) : kycStatus === 'submitted' ? (<Badge variant="secondary">
                    <AlertCircle className="mr-1 h-3 w-3"/>
                    KYC Under Review
                  </Badge>) : kycStatus === 'rejected' ? (<Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3"/>
                    KYC Rejected
                  </Badge>) : (<Badge variant="secondary">
                    <AlertCircle className="mr-1 h-3 w-3"/>
                    KYC Pending
                  </Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4"/>
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="gap-2">
              <MapPin className="h-4 w-4"/>
              <span className="hidden sm:inline">Address</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4"/>
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4"/>
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={personalInfo.firstName} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, firstName: e.target.value }))}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={personalInfo.lastName} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, lastName: e.target.value }))}/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={personalInfo.email} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, email: e.target.value }))}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" value={personalInfo.phone} onChange={(e) => setPersonalInfo((prev) => ({ ...prev, phone: e.target.value }))}/>
                </div>
                <Button onClick={handleSavePersonalInfo} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4"/>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Tab */}
          <TabsContent value="address">
            <Card>
              <CardHeader>
                <CardTitle>Saved Addresses</CardTitle>
                <CardDescription>Manage your delivery addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.map((address) => (<div key={address.id} className="flex items-start justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{address.label}</span>
                        {!!address.is_default && (<Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {address.full_address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}, {address.state}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Delete
                      </Button>
                    </div>
                  </div>))}

                <Separator />

                {showAddAddress ? (<div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium">Add New Address</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Address Type</Label>
                        <Input placeholder="Home, Office, etc." value={newAddress.type} onChange={(e) => setNewAddress((prev) => ({ ...prev, type: e.target.value }))}/>
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input placeholder="Street address" value={newAddress.line1} onChange={(e) => setNewAddress((prev) => ({ ...prev, line1: e.target.value }))}/>
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 2</Label>
                        <Input placeholder="Apartment, suite, etc." value={newAddress.line2} onChange={(e) => setNewAddress((prev) => ({ ...prev, line2: e.target.value }))}/>
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}/>
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress((prev) => ({ ...prev, state: e.target.value }))}/>
                      </div>
                      <div className="space-y-2">
                        <Label>PIN Code</Label>
                        <Input placeholder="PIN Code" value={newAddress.pincode} onChange={(e) => setNewAddress((prev) => ({ ...prev, pincode: e.target.value }))}/>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddAddress} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Address'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddAddress(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>) : (<Button variant="outline" onClick={() => setShowAddAddress(true)}>
                    <MapPin className="mr-2 h-4 w-4"/>
                    Add New Address
                  </Button>)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input id="currentPassword" type={showPasswords.current ? 'text' : 'password'} value={passwords.current} onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}/>
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}>
                      {showPasswords.current ? (<EyeOff className="h-4 w-4"/>) : (<Eye className="h-4 w-4"/>)}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showPasswords.new ? 'text' : 'password'} value={passwords.new} onChange={(e) => setPasswords((prev) => ({ ...prev, new: e.target.value }))}/>
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}>
                      {showPasswords.new ? (<EyeOff className="h-4 w-4"/>) : (<Eye className="h-4 w-4"/>)}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showPasswords.confirm ? 'text' : 'password'} value={passwords.confirm} onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}/>
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}>
                      {showPasswords.confirm ? (<EyeOff className="h-4 w-4"/>) : (<Eye className="h-4 w-4"/>)}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={isLoading}>
                  <Shield className="mr-2 h-4 w-4"/>
                  {isLoading ? 'Updating...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Email Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about your orders
                      </p>
                    </div>
                    <Switch checked={notifications.emailOrders} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailOrders: checked }))}/>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Promotions & Offers</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified about deals and discounts
                      </p>
                    </div>
                    <Switch checked={notifications.emailPromotions} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, emailPromotions: checked }))}/>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">SMS Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Receive SMS for order status
                      </p>
                    </div>
                    <Switch checked={notifications.smsOrders} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, smsOrders: checked }))}/>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Promotions & Offers</p>
                      <p className="text-sm text-muted-foreground">
                        Get SMS about special offers
                      </p>
                    </div>
                    <Switch checked={notifications.smsPromotions} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, smsPromotions: checked }))}/>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Push Notifications</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive in-app notifications
                      </p>
                    </div>
                    <Switch checked={notifications.pushNotifications} onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, pushNotifications: checked }))}/>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4"/>
                  {isLoading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>);
};
export default ProfileSettings;
