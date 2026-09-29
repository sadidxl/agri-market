import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useToast } from '@/hooks/use-toast';

export function useWishlistAction() {
  const { user } = useAuth();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const { toast } = useToast();
  const toggleWishlist = async product => {
    if (!user) {
      toast({ title: 'Sign in to save products', description: 'Use a buyer account to keep your wishlist.' });
      navigate('/login');
      return;
    }
    if (user.role !== 'buyer') {
      toast({ title: 'Buyer account required', description: 'Wishlists are available to buyers.', variant: 'destructive' });
      return;
    }
    try {
      const saved = await wishlist.toggle(product);
      if (saved !== null) toast({ title: saved ? 'Added to wishlist' : 'Removed from wishlist', description: product.name });
    } catch (error) {
      toast({ title: 'Could not update wishlist', description: error.message, variant: 'destructive' });
    }
  };
  return { ...wishlist, toggleWishlist };
}
