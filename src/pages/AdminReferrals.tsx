import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Gift, DollarSign, Users, TrendingUp, CheckCircle, Clock, XCircle, Banknote, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AdminHeader from '@/components/admin/AdminHeader';

interface ReferralEntry {
  id: string;
  referrer_id: string;
  referred_id: string;
  order_id: string | null;
  order_amount_usd: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
  referrer_username?: string;
  referrer_email?: string;
  referred_username?: string;
  referred_email?: string;
}

const AdminReferrals = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommissions: 0,
    confirmedCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    uniqueReferrers: 0,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) navigate('/');
      else if (!isAdmin) {
        navigate('/dashboard');
        toast({ title: 'Access Denied', description: 'You do not have permission.', variant: 'destructive' });
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (user && isAdmin) fetchReferrals();
  }, [user, isAdmin]);

  const fetchReferrals = async () => {
    setIsLoading(true);
    try {
      // Fetch all referrals
      const { data: referralsData, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (refError) throw refError;

      // Fetch all profiles for username/email mapping
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, email');

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { username: p.username, email: p.email }])
      );

      const enriched: ReferralEntry[] = (referralsData || []).map(r => ({
        ...r,
        referrer_username: profileMap.get(r.referrer_id)?.username || 'Unknown',
        referrer_email: profileMap.get(r.referrer_id)?.email || '',
        referred_username: profileMap.get(r.referred_id)?.username || 'Unknown',
        referred_email: profileMap.get(r.referred_id)?.email || '',
      }));

      setReferrals(enriched);

      // Calculate stats
      const uniqueReferrers = new Set(enriched.map(r => r.referrer_id)).size;
      const confirmed = enriched.filter(r => r.status === 'confirmed');
      const pending = enriched.filter(r => r.status === 'pending');
      const paid = enriched.filter(r => r.status === 'paid');

      setStats({
        totalReferrals: enriched.length,
        totalCommissions: enriched.reduce((sum, r) => sum + Number(r.commission_amount), 0),
        confirmedCommissions: confirmed.reduce((sum, r) => sum + Number(r.commission_amount), 0),
        pendingCommissions: pending.reduce((sum, r) => sum + Number(r.commission_amount), 0),
        paidCommissions: paid.reduce((sum, r) => sum + Number(r.commission_amount), 0),
        uniqueReferrers,
      });
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({ title: 'Error', description: 'Failed to fetch referrals', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Updated', description: `Referral marked as ${newStatus}` });
      fetchReferrals();
    } catch (error) {
      console.error('Error updating referral:', error);
      toast({ title: 'Error', description: 'Failed to update referral status', variant: 'destructive' });
    }
  };

  const filteredReferrals = referrals.filter(r => {
    const matchesSearch =
      (r.referrer_username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.referrer_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.referred_username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.referred_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalReferrals}</p>
                </div>
                <Users className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Referrers</p>
                  <p className="text-3xl font-bold text-foreground">{stats.uniqueReferrers}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed Payouts</p>
                  <p className="text-3xl font-bold text-secondary">${stats.confirmedCommissions.toFixed(2)}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-secondary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payouts</p>
                  <p className="text-3xl font-bold text-yellow-400">${stats.pendingCommissions.toFixed(2)}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by referrer or referred username/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {['all', 'pending', 'confirmed', 'paid', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  statusFilter === status
                    ? (status === 'confirmed' ? 'bg-secondary/20 text-secondary border border-secondary/30'
                      : status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : status === 'paid' ? 'bg-primary/20 text-primary border border-primary/30'
                      : status === 'rejected' ? 'bg-destructive/20 text-destructive border border-destructive/30'
                      : 'bg-primary text-primary-foreground')
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-1 opacity-70">
                    ({referrals.filter(r => r.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Referrals List */}
        <div className="space-y-3">
          {filteredReferrals.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No referrals yet</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search query' : 'Referrals will appear here when users share their codes'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReferrals.map((referral) => (
              <Card key={referral.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="py-4 px-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-6">
                      {/* Referrer */}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Referrer</p>
                        <p className="text-sm font-medium text-foreground truncate">{referral.referrer_username}</p>
                        <p className="text-xs text-muted-foreground truncate hidden sm:block">{referral.referrer_email}</p>
                      </div>

                      <div className="text-muted-foreground shrink-0">→</div>

                      {/* Referred */}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Referred</p>
                        <p className="text-sm font-medium text-foreground truncate">{referral.referred_username}</p>
                        <p className="text-xs text-muted-foreground truncate hidden sm:block">{referral.referred_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6 justify-between sm:justify-end">
                      {/* Order Amount */}
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-muted-foreground">Order</p>
                        <p className="text-sm font-medium text-foreground">${Number(referral.order_amount_usd).toFixed(2)}</p>
                      </div>

                      {/* Commission */}
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-muted-foreground">Commission</p>
                        <p className="text-sm font-bold text-secondary">${Number(referral.commission_amount).toFixed(2)}</p>
                      </div>

                      {/* Status */}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                        referral.status === 'confirmed'
                          ? 'bg-secondary/20 text-secondary border-secondary/30'
                          : referral.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : referral.status === 'paid'
                          ? 'bg-primary/20 text-primary border-primary/30'
                          : referral.status === 'rejected'
                          ? 'bg-destructive/20 text-destructive border-destructive/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {referral.status}
                      </span>

                      {/* Date */}
                      <div className="text-right hidden sm:block min-w-[80px]">
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {referral.status !== 'confirmed' && (
                            <DropdownMenuItem onClick={() => updateStatus(referral.id, 'confirmed')}>
                              <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                              Confirm
                            </DropdownMenuItem>
                          )}
                          {referral.status !== 'paid' && referral.status !== 'rejected' && (
                            <DropdownMenuItem onClick={() => updateStatus(referral.id, 'paid')}>
                              <Banknote className="w-4 h-4 mr-2 text-primary" />
                              Mark Paid
                            </DropdownMenuItem>
                          )}
                          {referral.status !== 'pending' && (
                            <DropdownMenuItem onClick={() => updateStatus(referral.id, 'pending')}>
                              <Clock className="w-4 h-4 mr-2 text-yellow-400" />
                              Set Pending
                            </DropdownMenuItem>
                          )}
                          {referral.status !== 'rejected' && (
                            <DropdownMenuItem onClick={() => updateStatus(referral.id, 'rejected')} className="text-destructive">
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminReferrals;
