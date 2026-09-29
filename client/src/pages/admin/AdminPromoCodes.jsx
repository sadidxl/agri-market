import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Tag, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as PromoService from '@/services/PromoService';

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  max_uses: '',
};

const AdminPromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      setIsLoading(true);
      const response = await PromoService.fetchPromoCodes();
      if (response.success) {
        setPromoCodes(response.data || []);
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to load promo codes', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) {
      toast({ title: 'Missing fields', description: 'Code and discount value are required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await PromoService.createPromoCode({
        code: form.code,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount) || 0,
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : undefined,
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
      });
      if (!response.success) throw new Error(response.error || 'Failed to create promo code');
      toast({ title: 'Promo code created', description: `${form.code.toUpperCase()} is now active.` });
      setIsDialogOpen(false);
      setForm(emptyForm);
      loadPromoCodes();
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to create promo code', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      const response = await PromoService.updatePromoCode(promo.id, { is_active: !promo.is_active });
      if (response.success) {
        setPromoCodes(promoCodes.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)));
        toast({ title: promo.is_active ? 'Promo deactivated' : 'Promo activated' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to update promo code', variant: 'destructive' });
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete promo code ${promo.code}? This can't be undone.`)) return;
    try {
      const response = await PromoService.deletePromoCode(promo.id);
      if (response.success) {
        setPromoCodes(promoCodes.filter((p) => p.id !== promo.id));
        toast({ title: 'Promo code deleted' });
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to delete promo code', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tag className="h-6 w-6 text-primary" />
              Promo Codes
            </h1>
            <p className="text-muted-foreground">Create and manage discount codes for checkout.</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Promo Code
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Promo Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : promoCodes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No promo codes yet. Create one to get started.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Min Order</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell>
                          <p className="font-mono font-medium">{promo.code}</p>
                          {promo.description && <p className="text-xs text-muted-foreground">{promo.description}</p>}
                        </TableCell>
                        <TableCell>
                          {promo.discount_type === 'percentage' ? `${Number(promo.discount_value)}%` : `৳${Number(promo.discount_value)}`}
                          {promo.max_discount_amount && <span className="text-xs text-muted-foreground"> (max ৳{Number(promo.max_discount_amount)})</span>}
                        </TableCell>
                        <TableCell>৳{Number(promo.min_order_amount)}</TableCell>
                        <TableCell>
                          {promo.times_used}{promo.max_uses ? ` / ${promo.max_uses}` : ''}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!promo.is_active} onCheckedChange={() => handleToggleActive(promo)} />
                            <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(promo)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input placeholder="e.g. SUMMER25" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Shown to buyers at checkout" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value *</Label>
                <Input type="number" placeholder={form.discount_type === 'percentage' ? '10' : '50'} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order Amount (৳)</Label>
                <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Discount (৳, optional)</Label>
                <Input type="number" placeholder="No cap" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max Total Uses (optional)</Label>
              <Input type="number" placeholder="Unlimited" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Promo Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminPromoCodes;
