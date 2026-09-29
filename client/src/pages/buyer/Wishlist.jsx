import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/hooks/use-toast';
import { ProductImage } from '@/components/ProductImage';

export default function Wishlist() {
  const { items, isLoading, error, refresh, remove, isPending } = useWishlist();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [addingId, setAddingId] = useState(null);
  // Load full product details for items saved from any product card.
  useEffect(() => { refresh(); }, [refresh]);
  const available = item => item.is_active !== false && item.is_active !== 0 && Number(item.stock_quantity ?? item.stock) > 0;
  const addToCart = async item => {
    setAddingId(item.product_id);
    try {
      await addItem({ productId: item.product_id, quantity: 1 });
      toast({ title: 'Added to cart', description: item.name });
    } catch (err) {
      toast({ title: 'Could not add to cart', description: err.message, variant: 'destructive' });
    } finally { setAddingId(null); }
  };
  const addAll = async () => {
    setAddingId('all');
    let added = 0, failed = 0;
    const eligible = items.filter(available);
    // Cart responses contain the complete cart: sequential requests avoid stale UI totals.
    for (const item of eligible) {
      try { await addItem({ productId: item.product_id, quantity: 1 }); added++; }
      catch { failed++; }
    }
    setAddingId(null);
    toast({ title: added ? `${added} item(s) added to cart` : 'No items added',
      description: `${failed} failed; ${items.length - eligible.length} unavailable. Saved items remain in your wishlist.`,
      variant: failed || !added ? 'destructive' : 'default' });
  };
  const removeItem = async item => {
    try {
      await remove(item.product_id);
      toast({ title: 'Removed from wishlist', description: item.name });
    } catch (err) { toast({ title: 'Could not remove item', description: err.message, variant: 'destructive' }); }
  };
  return <DashboardLayout><div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6 text-red-500"/>My Wishlist</h1>
        <p className="text-muted-foreground">{items.length} items saved for later</p></div>
      {!!items.length && <Button onClick={addAll} disabled={!!addingId || isLoading || !items.some(available)}><ShoppingCart className="mr-2 h-4 w-4"/>Add All to Cart</Button>}
    </div>
    {error && <div role="alert" className="rounded-lg border border-destructive p-4"><p>{error}</p><Button variant="outline" onClick={refresh}>Retry</Button></div>}
    {isLoading ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin"/>Loading your wishlist...</p>
      : !error && !items.length ? <Card><CardContent className="py-12 text-center">
        <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground"/><h2 className="text-lg font-semibold">Your wishlist is empty</h2>
        <p className="my-4 text-muted-foreground">Save products with the heart button.</p><Button asChild><Link to="/buyer/products">Browse Products</Link></Button>
      </CardContent></Card> : <div className="grid gap-4">{items.map(item => <Card key={item.product_id}>
        <CardContent className="flex flex-col sm:flex-row gap-4 p-4">
          <Link to={`/buyer/products/${item.product_id}`} className="sm:w-40 aspect-square bg-muted shrink-0"><ProductImage src={item.image || item.image_url} alt={item.name} className="h-full w-full object-cover rounded"/></Link>
          <div className="flex-1 space-y-3"><Badge variant="secondary">{item.category_name || item.category}</Badge>
            <Link className="block text-lg font-semibold hover:text-primary" to={`/buyer/products/${item.product_id}`}>{item.name}</Link>
            <p className="text-sm text-muted-foreground">{item.farm_name || item.farmerName}</p>
            <p className="text-xl font-bold text-primary">৳{item.price}<span className="text-sm font-normal">/{item.unit_abbr || item.unit}</span></p>
            <Badge variant={available(item) ? 'default' : 'destructive'}>{available(item) ? 'In Stock' : 'Unavailable'}</Badge>
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
            <div className="flex gap-3"><Button disabled={!available(item) || !!addingId} onClick={() => addToCart(item)}><ShoppingCart className="mr-2 h-4 w-4"/>{addingId === item.product_id ? 'Adding...' : 'Add to Cart'}</Button>
              <Button variant="outline" size="icon" aria-label={`Remove ${item.name} from wishlist`} disabled={isPending(item.product_id)} onClick={() => removeItem(item)}><Trash2 className="h-4 w-4"/></Button></div>
          </div>
        </CardContent>
      </Card>)}</div>}
  </div></DashboardLayout>;
}
