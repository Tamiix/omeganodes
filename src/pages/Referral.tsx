import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Gift, DollarSign, Users, TrendingUp, Clock, Send, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Referral {
  id: string;
  order_amount_usd: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

const Referral = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<string>('none');
  const [customCode, setCustomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState({ totalEarnings: 0, totalReferrals: 0, pendingEarnings: 0 });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('referral_code, pending_referral_code, referral_code_status')
      .eq('user_id', user!.id)
      .single();

    if (profileData) {
      setReferralCode(profileData.referral_code);
      setPendingCode(profileData.pending_referral_code);
      setCodeStatus(profileData.referral_code_status || 'none');
    }

    const { data: referralsData } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user!.id)
      .order('created_at', { ascending: false });

    if (referralsData) {
      setReferrals(referralsData as Referral[]);
      const confirmed = referralsData.filter(r => r.status === 'confirmed');
      const pending = referralsData.filter(r => r.status === 'pending');
      setStats({
        totalEarnings: confirmed.reduce((sum, r) => sum + Number(r.commission_amount), 0),
        totalReferrals: referralsData.length,
        pendingEarnings: pending.reduce((sum, r) => sum + Number(r.commission_amount), 0),
      });
    }
  };

  const requestCustomCode = async () => {
    if (!customCode.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('request_referral_code', { p_code: customCode.trim() });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; code?: string };
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Submitted!', description: 'Your custom code is pending admin approval.' });
        setPendingCode(result.code || customCode.trim().toLowerCase());
        setCodeStatus('pending');
        setCustomCode('');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit code', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Referral Program
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Earn 10% commission on every referral purchase
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Referral Code Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Current active code */}
            {referralCode && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Code</p>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <code className="flex-1 text-sm sm:text-base font-mono text-foreground font-bold text-center break-all">
                    omeganodes.io/ref/{referralCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`https://omeganodes.io/ref/${referralCode}`, 'code')}
                    className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                  >
                    {copiedId === 'code' ? (
                      <Check className="w-5 h-5 text-secondary" />
                    ) : (
                      <Copy className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Pending code status */}
            {codeStatus === 'pending' && pendingCode && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Pending approval: <span className="font-mono">{pendingCode}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">An admin will review your custom code request.</p>
                </div>
              </div>
            )}

            {codeStatus === 'rejected' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Your last custom code request was rejected.</p>
                  <p className="text-xs text-muted-foreground">You can submit a new one below.</p>
                </div>
              </div>
            )}

            {/* Request custom code */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {referralCode ? 'Request Custom Code' : 'Choose Your Referral Code'}
              </p>
              <p className="text-xs text-muted-foreground">
                Pick a custom name for your referral link (e.g. "omega", "omeganode"). 3-20 characters, letters, numbers, and hyphens.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0 flex-1 min-w-0">
                  <span className="text-xs sm:text-sm text-muted-foreground font-mono shrink-0 bg-muted px-3 py-2.5 rounded-l-md border border-r-0 border-border">
                    omeganodes.io/ref/
                  </span>
                  <Input
                    type="text"
                    placeholder="your-name"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    maxLength={20}
                    className="rounded-l-none bg-card border-border"
                    disabled={codeStatus === 'pending'}
                  />
                </div>
                <Button
                  onClick={requestCustomCode}
                  disabled={isSubmitting || !customCode.trim() || customCode.trim().length < 3 || codeStatus === 'pending'}
                  size="icon"
                  variant="omega"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              {codeStatus === 'pending' && (
                <p className="text-xs text-yellow-400">You already have a pending request. Wait for admin review.</p>
              )}
            </div>

            {!referralCode && codeStatus !== 'pending' && (
              <p className="text-xs text-muted-foreground text-center">
                Submit a custom code above. Once approved by an admin, your referral link will be active.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.totalReferrals}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <DollarSign className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                </div>
                <p className="text-3xl font-bold text-secondary">${stats.totalEarnings.toFixed(2)}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Pending Earnings</p>
                </div>
                <p className="text-3xl font-bold text-foreground">${stats.pendingEarnings.toFixed(2)}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Referral History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Referral History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share your code to start earning commissions
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral, index) => (
                  <motion.div
                    key={referral.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Order: ${Number(referral.order_amount_usd).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-secondary">
                        +${Number(referral.commission_amount).toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        referral.status === 'confirmed'
                          ? 'bg-secondary/20 text-secondary border-secondary/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {referral.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Referral;
