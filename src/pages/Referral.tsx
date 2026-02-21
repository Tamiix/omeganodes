import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Gift, DollarSign, Users, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
      .select('referral_code')
      .eq('user_id', user!.id)
      .single();

    if (profileData?.referral_code) {
      setReferralCode(profileData.referral_code);
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

  const generateReferralCode = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_referral_code');
      if (error) throw error;
      setReferralCode(data as string);
    } catch (err) {
      console.error('Failed to generate referral code:', err);
    } finally {
      setIsGenerating(false);
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Referral Program
              </h1>
              <p className="text-sm text-muted-foreground">
                Earn 10% commission on every referral purchase
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Referral Code Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            {referralCode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <code className="flex-1 text-lg font-mono text-foreground font-bold tracking-widest text-center">
                    {referralCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(referralCode, 'code')}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {copiedId === 'code' ? (
                      <Check className="w-5 h-5 text-secondary" />
                    ) : (
                      <Copy className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Share this code with friends. When they use it during checkout, you earn 10% of their payment.
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Generate your unique referral code to start earning commissions.
                </p>
                <Button variant="omega" onClick={generateReferralCode} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Referral Code'}
                </Button>
              </div>
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
