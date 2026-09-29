import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, Banknote, Hourglass, Send } from 'lucide-react';
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

const FarmerWallet = () => {
    const { toast } = useToast();
    const [wallet, setWallet] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [accountDetails, setAccountDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadWallet = async () => {
        try {
            setIsLoading(true);
            const response = await WithdrawalService.fetchFarmerWallet();
            if (response.success && response.data) {
                setWallet(response.data);
            }
        } catch (err) {
            toast({ title: 'Could not load wallet', description: err.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadWallet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!method) {
            toast({ title: 'Select a method', description: 'Pick bKash, Nagad or bank transfer.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            await WithdrawalService.requestWithdrawal({ amount: Number(amount), method, account_details: accountDetails });
            toast({ title: 'Withdrawal requested', description: 'Your request is now pending admin approval.' });
            setAmount('');
            setAccountDetails('');
            setMethod('');
            await loadWallet();
        } catch (err) {
            toast({ title: 'Request failed', description: err.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const methodInputHint = method === 'bank'
        ? 'Bank name, account name and account number'
        : `${methodLabels[method] || 'Number'} mobile number`;

    return (<DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Wallet</h1>
            <p className="text-muted-foreground">Track your earnings and request payouts</p>
          </div>
        </div>

        {isLoading ? (<div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
          </div>) : !wallet ? (<Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Wallet is unavailable right now.</p>
            </CardContent>
          </Card>) : (<>
          {/* Balance Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-2xl font-bold">{formatBDT(wallet.balance.total_earned, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Banknote className="h-5 w-5 text-primary"/>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                    <p className="text-2xl font-bold">{formatBDT(wallet.balance.pending_withdrawals, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                    <Hourglass className="h-5 w-5 text-accent-foreground"/>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/40">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-primary">{formatBDT(wallet.balance.available_balance, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary"/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Withdraw Form */}
            <Card>
              <CardHeader>
                <CardTitle>Request Withdrawal</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount (৳)</Label>
                    <Input id="withdraw-amount" type="number" min="1" step="0.01" placeholder="e.g. 1000" value={amount} onChange={(e) => setAmount(e.target.value)} required/>
                    <p className="text-xs text-muted-foreground">
                      Maximum you can withdraw now: {formatBDT(wallet.balance.available_balance, { maximumFractionDigits: 0 })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose payout method"/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-details">Account Details</Label>
                    <Input id="account-details" placeholder={methodInputHint} value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} required/>
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting || Number(amount) <= 0}>
                    <Send className="h-4 w-4"/>
                    {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
              </CardHeader>
              <CardContent>
                {(wallet.withdrawals || []).length === 0 ? (<p className="text-sm text-muted-foreground py-6 text-center">
                  No withdrawal requests yet.
                </p>) : (<Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(wallet.withdrawals || []).map((w) => (<TableRow key={w.id}>
                      <TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{methodLabels[w.method] || w.method}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBDT(w.amount)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[w.status] || 'bg-gray-100 text-gray-800'}>{w.status}</Badge>
                      </TableCell>
                    </TableRow>))}
                  </TableBody>
                </Table>)}
              </CardContent>
            </Card>
          </div>
        </>)}
      </div>
    </DashboardLayout>);
};

export default FarmerWallet;