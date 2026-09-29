import { ProductImage } from '@/components/ProductImage';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, CreditCard, Truck, ShieldCheck, ChevronLeft, Plus, Check, Loader2, Smartphone, Landmark, Banknote, } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import * as AddressService from '@/services/AddressService';
import * as OrderService from '@/services/OrderService';
import * as PromoService from '@/services/PromoService';
const paymentMethods = [
    { id: 'bkash', name: 'bKash', description: 'Pay via bKash mobile wallet', icon: Smartphone, color: '#E2136E' },
    { id: 'rocket', name: 'Rocket', description: 'Pay via Rocket mobile wallet', icon: Smartphone, color: '#8C3494' },
    { id: 'nagad', name: 'Nagad', description: 'Pay via Nagad mobile wallet', icon: Smartphone, color: '#F6921E' },
    { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard', icon: CreditCard, color: '#1A56DB' },
    { id: 'bank_transfer', name: 'Bank Transfer', description: 'Direct bank transfer', icon: Landmark, color: '#0F766E' },
    { id: 'cash_on_delivery', name: 'Cash on Delivery', description: 'Pay when you receive', icon: Banknote, color: '#4B5563' },
];
const Checkout = () => {
    const navigate = useNavigate();
    const { items, total, clearCart } = useCart();
    const { toast } = useToast();
    const [addresses, setAddresses] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [selectedPayment, setSelectedPayment] = useState('cash_on_delivery');
    const [mobileWalletNumber, setMobileWalletNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState(null); // { code, discount_amount, description } | null
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        street: '',
        city: '',
        state: '',
    });
    // Load addresses on mount
    useEffect(() => {
        loadAddresses();
    }, []);
    const loadAddresses = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                toast({
                    title: 'Authentication required',
                    description: 'Please log in again',
                    variant: 'destructive',
                });
                navigate('/login');
                return;
            }
            const response = await AddressService.fetchAddresses();
            if (response.success) {
                setAddresses(response.data);
                if (response.data.length > 0) {
                    setSelectedAddress(response.data[0].id);
                }
            }
        }
        catch (error) {
            toast({
                title: 'Error loading addresses',
                description: error.message || 'Unknown error',
                variant: 'destructive',
            });
        }
        finally {
            setIsLoadingAddresses(false);
        }
    };
    const handleAddAddress = async () => {
        try {
            if (!newAddress.street || !newAddress.city || !newAddress.state) {
                toast({
                    title: 'Missing required fields',
                    description: 'Please fill in all required address fields',
                    variant: 'destructive',
                });
                return;
            }
            const token = localStorage.getItem('auth_token');
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await AddressService.createAddress({
                label: newAddress.label,
                full_address: newAddress.street,
                city: newAddress.city,
                state: newAddress.state,
                is_default: addresses.length === 0,
            });
            if (response.success) {
                setAddresses([...addresses, response.data]);
                setSelectedAddress(response.data.id);
                setShowAddAddressDialog(false);
                setNewAddress({ label: 'Home', street: '', city: '', state: '' });
                toast({
                    title: 'Address added',
                    description: 'Your new address has been saved',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Error adding address',
                description: error.message || 'Unknown error',
                variant: 'destructive',
            });
        }
    };
    const deliveryFee = 500; // flat fee — must match DELIVERY_FEE in server/controllers/cartController.js
    const discount = promoApplied ? promoApplied.discount_amount : 0;
    const grandTotal = Math.max(total + deliveryFee - discount, 0);
    if (items.length === 0) {
        return (<DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button asChild>
            <Link to="/buyer/products">Browse Products</Link>
          </Button>
        </div>
      </DashboardLayout>);
    }
    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        try {
            const response = await PromoService.validatePromoCode(promoCode.trim(), total);
            if (response.success) {
                setPromoApplied(response.data);
                toast({
                    title: 'Promo code applied!',
                    description: `You saved ৳${response.data.discount_amount} on this order.`,
                });
            }
            else {
                toast({
                    title: 'Invalid promo code',
                    description: response.error || 'Please enter a valid promo code.',
                    variant: 'destructive',
                });
            }
        }
        catch (error) {
            toast({
                title: 'Invalid promo code',
                description: error.message || 'Please enter a valid promo code.',
                variant: 'destructive',
            });
        }
        finally {
            setIsApplyingPromo(false);
        }
    };
    const handleRemovePromo = () => {
        setPromoApplied(null);
        setPromoCode('');
    };
    const handlePlaceOrder = async () => {
        setIsProcessing(true);
        try {
            // Validate selected address
            if (!selectedAddress) {
                toast({
                    title: 'Address required',
                    description: 'Please select a shipping address',
                    variant: 'destructive',
                });
                setIsProcessing(false);
                return;
            }
            // Get auth token
            const token = localStorage.getItem('auth_token');
            if (!token) {
                toast({
                    title: 'Authentication required',
                    description: 'Please log in again',
                    variant: 'destructive',
                });
                navigate('/login');
                return;
            }
            const address = addresses.find((a) => a.id === selectedAddress);
            const isMobileWallet = ['bkash', 'rocket', 'nagad'].includes(selectedPayment);
            if (isMobileWallet && !mobileWalletNumber.trim()) {
                toast({
                    title: 'Mobile number required',
                    description: `Please enter the ${paymentMethods.find(m => m.id === selectedPayment)?.name} number you'll pay from.`,
                    variant: 'destructive',
                });
                setIsProcessing(false);
                return;
            }
            // The backend derives order items straight from the buyer's cart
            // (not from client-supplied line items) so stock/price can't be spoofed.
            // The promo code is also re-validated server-side — the discount
            // actually applied always comes from that check, not this request.
            const response = await OrderService.createOrder({
                delivery_address: address?.full_address,
                delivery_city: address?.city,
                delivery_state: address?.state,
                payment_method: selectedPayment,
                promo_code: promoApplied ? promoApplied.code : undefined,
                notes: isMobileWallet ? `${paymentMethods.find(m => m.id === selectedPayment)?.name} number: ${mobileWalletNumber}` : undefined,
            });
            if (!response.success) {
                throw new Error(response.error || 'Checkout failed');
            }
            // The order has already emptied the cart server-side; sync local state.
            await clearCart();
            toast({
                title: 'Order placed successfully!',
                description: `Your order ${response.data.order_number} has been confirmed.`,
            });
            navigate('/buyer/orders');
        }
        catch (error) {
            const errorMsg = error.message || 'Failed to place order';
            toast({
                title: 'Order failed',
                description: errorMsg,
                variant: 'destructive',
            });
        }
        finally {
            setIsProcessing(false);
        }
    };
    return (<DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5"/>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">{items.length} items in your order</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Address & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary"/>
                  <CardTitle>Delivery Address</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAddresses ? (<div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                  </div>) : addresses.length === 0 ? (<div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No addresses saved yet. Add one to continue.
                    </p>
                    <Button onClick={() => setShowAddAddressDialog(true)} className="w-full" variant="outline">
                      <Plus className="mr-2 h-4 w-4"/>
                      Add Your First Address
                    </Button>
                  </div>) : (<>
                    <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {addresses.map((address) => (<Label key={address.id} htmlFor={address.id} className={`flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all ${selectedAddress === address.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'}`}>
                            <RadioGroupItem value={address.id} id={address.id} className="sr-only"/>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{address.label}</span>
                                {!!address.is_default && (<Badge variant="secondary" className="text-xs">Default</Badge>)}
                              </div>
                              {selectedAddress === address.id && (<Check className="h-5 w-5 text-primary"/>)}
                            </div>
                            <p className="text-sm text-muted-foreground">{address.full_address}</p>
                            <p className="text-sm text-muted-foreground">
                              {address.city}, {address.state}
                            </p>
                          </Label>))}
                      </div>
                    </RadioGroup>
                    <Button onClick={() => setShowAddAddressDialog(true)} variant="outline" className="mt-4 w-full gap-2">
                      <Plus className="h-4 w-4"/>
                      Add New Address
                    </Button>
                  </>)}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary"/>
                  <CardTitle>Payment Method</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (<Label key={method.id} htmlFor={method.id} className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all ${selectedPayment === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'}`}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={method.id} id={method.id}/>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${method.color}1A` }}>
                            <Icon className="h-4.5 w-4.5" style={{ color: method.color }}/>
                          </div>
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-muted-foreground">{method.description}</p>
                          </div>
                        </div>
                      </Label>);
              })}
                  </div>
                </RadioGroup>
                {['bkash', 'rocket', 'nagad'].includes(selectedPayment) && (
                  <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-4">
                    <Label htmlFor="wallet-number">{paymentMethods.find(m => m.id === selectedPayment)?.name} Account Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
                      <Input id="wallet-number" placeholder="01XXX-XXXXXX" value={mobileWalletNumber} onChange={(e) => setMobileWalletNumber(e.target.value)} className="pl-9"/>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is a demo checkout — no real transaction is processed. Your number is only saved as a note on the order.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => (<div key={item.productId} className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded bg-muted flex-shrink-0">
                        <ProductImage src={item.image || '/placeholder.svg'} alt={item.name} className="h-full w-full object-cover rounded"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × ৳{item.price}
                        </p>
                      </div>
                      <p className="font-medium">৳{item.price * item.quantity}</p>
                    </div>))}
                </div>

                <Separator />

                {/* Promo Code */}
                {promoApplied ? (
                  <div className="flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-3">
                    <div>
                      <p className="font-medium text-sm">{promoApplied.code} applied</p>
                      <p className="text-xs text-muted-foreground">{promoApplied.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemovePromo}>Remove</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="Promo code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} disabled={isApplyingPromo}/>
                    <Button variant="outline" onClick={handleApplyPromo} disabled={isApplyingPromo || !promoCode}>
                      {isApplyingPromo ? 'Checking...' : 'Apply'}
                    </Button>
                  </div>
                )}
                {!promoApplied && (<p className="text-xs text-muted-foreground">Try: AGRI10, WELCOME50, or FARMFRESH20</p>)}

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>৳{total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={deliveryFee === 0 ? 'text-primary' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `৳${deliveryFee}`}
                    </span>
                  </div>
                  {promoApplied && (<div className="flex justify-between text-sm text-primary">
                      <span>Discount ({promoApplied.code})</span>
                      <span>-৳{discount}</span>
                    </div>)}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>৳{grandTotal}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : `Pay ৳${grandTotal}`}
                </Button>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary"/>
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary"/>
                    <span>Fast Delivery</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Address Dialog */}
      <Dialog open={showAddAddressDialog} onOpenChange={setShowAddAddressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <select value={newAddress.label} onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Street Address *</Label>
              <Input placeholder="Street address" value={newAddress.street} onChange={(e) => setNewAddress((prev) => ({ ...prev, street: e.target.value }))}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}/>
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress((prev) => ({ ...prev, state: e.target.value }))}/>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddAddressDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAddress}>
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>);
};
export default Checkout;
