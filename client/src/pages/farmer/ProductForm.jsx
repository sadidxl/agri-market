import { ProductImage } from '@/components/ProductImage';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Upload, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchProductDetails, createProduct, updateProduct } from '@/services/ProductService';
import { fetchCategories } from '@/services/ProductService';
import { uploadImage, validateImageFile } from '@/services/UploadService';
import { getImageUrl } from '@/lib/imageUrl';
const units = ['kg', 'litre', 'dozen', 'bunch', 'piece', 'bag', 'tuber', 'crate'];
const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEditing = !!id;
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        unit: 'kg',
        stock: '',
        image_url: '',
        location: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validationError = validateImageFile(file);
        if (validationError) {
            setUploadError(validationError);
            toast({ title: 'Invalid file', description: validationError, variant: 'destructive' });
            return;
        }
        setUploadError('');
        setIsUploading(true);
        try {
            const response = await uploadImage(file);
            if (response.success) {
                setFormData((prev) => ({ ...prev, image_url: response.data.url }));
                toast({ title: 'Image uploaded', description: 'Your product photo is ready.' });
            }
            else {
                throw new Error(response.error || 'Upload failed');
            }
        }
        catch (err) {
            toast({ title: 'Upload failed', description: err.message || 'Could not upload image', variant: 'destructive' });
        }
        finally {
            setIsUploading(false);
        }
    };
    React.useEffect(() => {
        fetchCategories().then((res) => {
            if (res.success) setCategories(res.data);
        }).catch(() => {});
    }, []);
    React.useEffect(() => {
        const loadProduct = async () => {
            if (!isEditing || !id)
                return;
            try {
                const res = await fetchProductDetails(id);
                if (!res.success)
                    throw new Error(res.error || 'Failed to load product');
                const p = res.data;
                setFormData({
                    name: p.name || '',
                    description: p.description || '',
                    price: String(p.price || ''),
                    category_id: p.category_id || '',
                    unit: p.unit_abbr || p.unit || 'kg',
                    stock: String(p.stock_quantity ?? p.stock ?? ''),
                    image_url: p.image_url || p.primary_image || '',
                    location: p.location || '',
                });
            }
            catch (err) {
                console.error('Load product error', err);
                toast({ title: 'Error', description: 'Unable to load product', variant: 'destructive' });
            }
        };
        loadProduct();
    }, [isEditing, id]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price || !formData.stock || !formData.category_id) {
            toast({
                title: 'Validation error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                price: Number(formData.price),
                stock: Number(formData.stock),
                category_id: formData.category_id,
                unit: formData.unit,
                image_url: formData.image_url || null,
                location: formData.location || null,
            };
            const response = isEditing ? await updateProduct(id, payload) : await createProduct(payload);
            if (!response.success) {
                throw new Error(response.error || `Failed to ${isEditing ? 'update' : 'add'} product`);
            }
            toast({
                title: isEditing ? 'Product updated' : 'Product added',
                description: `${formData.name} has been ${isEditing ? 'updated' : 'added'} successfully.`,
            });
            navigate('/farmer/products');
        }
        catch (error) {
            toast({
                title: 'Error',
                description: error.message || `Failed to ${isEditing ? 'update' : 'add'} product`,
                variant: 'destructive',
            });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5"/>
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}/>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category"/></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (৳) *</Label>
                  <Input id="price" type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input id="stock" type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required/>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Farm Location</Label>
                <Input id="location" placeholder="e.g. Savar, Dhaka" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}/>
              </div>
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center transition-colors border-muted-foreground/30 hover:border-primary hover:bg-muted/50">
                  {formData.image_url ? (
                    <div className="space-y-3">
                      <ProductImage src={getImageUrl(formData.image_url)} alt="Preview" className="h-32 w-32 object-cover rounded-lg mx-auto"/>
                      <Button type="button" variant="destructive" size="sm" onClick={() => setFormData({ ...formData, image_url: '' })} className="gap-2">
                        <X className="h-4 w-4"/>
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2"/>
                      <p className="text-sm font-medium mb-1">{isUploading ? 'Uploading…' : 'Click to upload a photo'}</p>
                      <p className="text-xs text-muted-foreground mb-3">JPEG, PNG, WEBP, or GIF (Max 5MB)</p>
                      <Input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={handleFileSelect} className="hidden" id="image-input" disabled={isUploading}/>
                      <label htmlFor="image-input">
                        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('image-input')?.click();
                        }} className="gap-2">
                          <Upload className="h-4 w-4"/>
                          {isUploading ? 'Uploading…' : 'Choose Image'}
                        </Button>
                      </label>
                    </>
                  )}
                </div>
                {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                <div className="pt-2">
                  <Label htmlFor="image_url" className="text-xs text-muted-foreground">Or paste an image URL instead</Label>
                  <Input id="image_url" placeholder="https://..." value={formData.image_url.startsWith('/uploads/') ? '' : formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}/>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                  <Save className="h-4 w-4"/>{isSubmitting ? 'Saving...' : 'Save Product'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>);
};
export default ProductForm;
