import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wallet, CheckCircle, Clock, Landmark, Smartphone, Eye, Search, X, ArrowUpDown, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as WithdrawalService from '@/services/WithdrawalService';
import { formatBDT } from '@/lib/currency';

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};
const methodLabels = { bkash: 'bKash', nagad: 'Nagad', bank: 'Bank Transfer' };
const methodIcons = {
    bkash: <Smartphone className="h-4 w-4 text-pink-600"/>,
    nagad: <Smartphone className="h-4 w-4 text-orange-500"/>,
    bank: <Landmark className="h-4 w-4"/>,
};
const nextStatuses = {
    pending: ['approved', 'rejected'],
    approved: ['completed'],
    rejected: [],
    completed: [],
};
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'highest', label: 'Highest Amount' },
    { value: 'lowest', label: 'Lowest Amount' },
];
const DATE_RANGES = [
    { value: 'all', label: 'All dates' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 days' },
    { value: '30days', label: 'Last 30 days' },
];
const AMOUNT_PRESETS = [
    { value: 'all', label: 'All amounts' },
    { value: 'under1000', label: 'Under ৳1,000' },
    { value: '1000-5000', label: '৳1,000 – ৳5,000' },
    { value: '5000-10000', label: '৳5,000 – ৳10,000' },
    { value: 'over10000', label: '৳10,000+' },
];

function parseDateRange(range) {
    const now = new Date();
    const start = new Date(now);
    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            return start;
        case '7days':
            start.setDate(now.getDate() - 7);
            return start;
        case '30days':
            start.setDate(now.getDate() - 30);
            return start;
        default:
            return null;
    }
}

function matchesAmountPreset(amount, preset) {
    switch (preset) {
        case 'under1000': return amount < 1000;
        case '1000-5000': return amount >= 1000 && amount <= 5000;
        case '5000-10000': return amount >= 5000 && amount <= 10000;
        case 'over10000': return amount > 10000;
        default: return true;
    }
}

const AdminWithdrawals = () => {
    const { toast } = useToast();
    const [withdrawals, setWithdrawals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [dateRange, setDateRange] = useState('all');
    const [amountPreset, setAmountPreset] = useState('all');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [selected, setSelected] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [adminNote, setAdminNote] = useState('');

    const loadWithdrawals = async () => {
        try {
            setIsLoading(true);
            const response = await WithdrawalService.fetchWithdrawals('');
            if (response.success) {
                setWithdrawals(response.data.map((w) => ({
                    ...w,
                    amount: parseFloat(w.amount) || 0,
                })));
            }
        } catch (err) {
            toast({ title: 'Could not load withdrawals', description: err.message || 'Please try again.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWithdrawals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredWithdrawals = useMemo(() => {
        let result = [...withdrawals];

        if (statusFilter !== 'all') {
            result = result.filter((w) => w.status === statusFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((w) =>
                (w.farmer_name || '').toLowerCase().includes(q) ||
                (w.farmer_email || '').toLowerCase().includes(q) ||
                (w.id || '').toLowerCase().includes(q) ||
                (w.account_details || '').toLowerCase().includes(q)
            );
        }

        const dateStart = parseDateRange(dateRange);
        if (dateStart) {
            result = result.filter((w) => new Date(w.created_at) >= dateStart);
        }

        if (!matchesAmountPreset(0, amountPreset) || amountPreset !== 'all') {
            result = result.filter((w) => matchesAmountPreset(w.amount, amountPreset));
        }

        const min = minAmount !== '' ? parseFloat(minAmount) : null;
        const max = maxAmount !== '' ? parseFloat(maxAmount) : null;
        if (min !== null && !isNaN(min)) {
            result = result.filter((w) => w.amount >= min);
        }
        if (max !== null && !isNaN(max)) {
            result = result.filter((w) => w.amount <= max);
        }

        switch (sortBy) {
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'highest':
                result.sort((a, b) => b.amount - a.amount);
                break;
            case 'lowest':
                result.sort((a, b) => a.amount - b.amount);
                break;
            case 'newest':
            default:
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        return result;
    }, [withdrawals, statusFilter, searchQuery, dateRange, amountPreset, minAmount, maxAmount, sortBy]);

    const stats = useMemo(() => ({
        total: withdrawals.length,
        pending: withdrawals.filter((w) => w.status === 'pending').length,
        approved: withdrawals.filter((w) => w.status === 'approved').length,
        completed: withdrawals.filter((w) => w.status === 'completed').reduce((s, w) => s + w.amount, 0),
    }), [withdrawals]);

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setSortBy('newest');
        setDateRange('all');
        setAmountPreset('all');
        setMinAmount('');
        setMaxAmount('');
    };

    const hasActiveFilters = searchQuery || statusFilter !== 'all' || dateRange !== 'all' || amountPreset !== 'all' || minAmount !== '' || maxAmount !== '';

    const handleUpdateClick = (w) => {
        setSelected(w);
        setNewStatus(w.status);
        setAdminNote(w.admin_note || '');
        setIsUpdateOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selected || !newStatus) return;
        try {
            const response = await WithdrawalService.updateWithdrawal(selected.id, { status: newStatus, admin_note: adminNote });
            if (response.success) {
                toast({ title: 'Withdrawal updated', description: `Status changed to ${newStatus}.` });
                setIsUpdateOpen(false);
                loadWithdrawals();
            }
        } catch (err) {
            toast({ title: 'Update failed', description: err.message || 'Unable to update withdrawal status.', variant: 'destructive' });
        }
    };

    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Farmer Withdrawals</h1>
            <p className="text-muted-foreground">Review and approve farmer payout requests</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600"/>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatBDT(stats.completed, { maximumFractionDigits: 0 })}</p>
                <p className="text-sm text-muted-foreground">Paid Out</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input placeholder="Search by farmer, email, ID, or account..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9"/>
              {searchQuery && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}>
                  <X className="h-4 w-4"/>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2"/>
                  <SelectValue placeholder="Date"/>
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2"/>
                  <SelectValue placeholder="Sort"/>
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((a) => (
                <Button key={a.value} variant={amountPreset === a.value ? 'default' : 'outline'} size="sm" onClick={() => setAmountPreset(a.value)}>
                  {a.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">or</span>
              <Input type="number" placeholder="Min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-24"/>
              <span className="text-muted-foreground">–</span>
              <Input type="number" placeholder="Max" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-24"/>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3"/>
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (<div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
              </div>) : filteredWithdrawals.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground mb-2">No withdrawal requests found.</p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                )}
              </div>
            ) : (<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Account Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.map((w) => (<TableRow key={w.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{w.farmer_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{w.farmer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {methodIcons[w.method]}
                      <span className="text-sm">{methodLabels[w.method] || w.method}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{w.account_details}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatBDT(w.amount)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[w.status]}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelected(w); setIsViewOpen(true); }}>
                        <Eye className="h-4 w-4"/>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleUpdateClick(w)} disabled={w.status === 'completed' || w.status === 'rejected'}>
                        <CheckCircle className="h-4 w-4"/>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>))}
              </TableBody>
            </Table>)}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Withdrawal Details</DialogTitle>
            </DialogHeader>
            {selected && (<div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Farmer</p>
                  <p className="font-medium">{selected.farmer_name}</p>
                  <p className="text-sm text-muted-foreground">{selected.farmer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selected.farmer_phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold text-primary">{formatBDT(selected.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Method</p>
                  <div className="flex items-center gap-2 mt-1">
                    {methodIcons[selected.method]}
                    <span>{methodLabels[selected.method] || selected.method}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Account Details</p>
                  <p className="font-mono font-medium">{selected.account_details}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[selected.status]} mt-1`}>{selected.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested</p>
                  <p className="font-medium">{new Date(selected.created_at).toLocaleString()}</p>
                </div>
                {selected.admin_note && (<div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Admin Note</p>
                    <p className="font-medium">{selected.admin_note}</p>
                  </div>)}
              </div>)}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Dialog */}
        <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Withdrawal Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Request: {selected?.farmer_name} — {selected ? formatBDT(selected.amount) : ''}</p>
              </div>
              <div>
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(nextStatuses[selected?.status] || []).map((s) => (<SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Admin Note</Label>
                <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Optional note for the farmer"/>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateStatus} className="gap-2" disabled={!newStatus || newStatus === selected?.status}>
                <CheckCircle className="h-4 w-4"/>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>);
};

export default AdminWithdrawals;
