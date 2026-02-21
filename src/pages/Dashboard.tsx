import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Package, 
  Link2, 
  Receipt, 
  Copy, 
  Check,
  ExternalLink,
  Clock,
  Server,
  MapPin,
  Settings,
  ChevronDown,
  Gift,
  DollarSign,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/contexts/CurrencyContext';
import CurrencySelector from '@/components/CurrencySelector';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import RedeemAccessCode from '@/components/RedeemAccessCode';

interface Order {
  id: string;
  order_number: string;
  plan_name: string;
  commitment: string;
  server_type: string;
  location: string;
  rps: number;
  tps: number;
  amount_usd: number;
  currency_code: string;
  currency_amount: number;
  payment_method: string;
  transaction_signature: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
}

interface ConnectionUrl {
  id: string;
  order_id: string;
  endpoint_type: string;
  url: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

// Location-based endpoint URLs (static configuration)
const locationEndpoints = {
  "🇩🇪 Frankfurt V2": {
    rpc: "http://frav2.omeganetworks.io:8899",
    ws: "ws://frav2.omeganetworks.io:8900",
    grpc: "http://frav2.omeganetworks.io:9898"
  },
  "🇳🇱 Amsterdam V2": {
    rpc: "http://amsv2.omeganetworks.io:8899",
    ws: "ws://amsv2.omeganetworks.io:8900",
    grpc: "http://amsv2.omeganetworks.io:9898"
  },
  "🇺🇸 New York": {
    rpc: "http://newyork.omeganetworks.io",
    ws: "ws://newyork.omeganetworks.io:8900",
    grpc: "http://newyork.omeganetworks.io:10000"
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [connections, setConnections] = useState<ConnectionUrl[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'connections' | 'settings'>('orders');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [isGeneratingReferral, setIsGeneratingReferral] = useState(false);
  const [referralStats, setReferralStats] = useState<{ totalEarnings: number; totalReferrals: number }>({ totalEarnings: 0, totalReferrals: 0 });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchReferralData();
    }
  }, [user]);

  const fetchUserData = async () => {
    // Fetch orders
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ordersData) {
      setOrders(ordersData as Order[]);
    }

    // Fetch connection URLs
    const { data: connectionsData } = await supabase
      .from('connection_urls')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (connectionsData) {
      setConnections(connectionsData as ConnectionUrl[]);
    }
  };

  const fetchReferralData = async () => {
    // Get referral code from profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', user!.id)
      .single();
    
    if (profileData?.referral_code) {
      setReferralCode(profileData.referral_code);
    }

    // Get referral stats
    const { data: referralsData } = await supabase
      .from('referrals')
      .select('commission_amount')
      .eq('referrer_id', user!.id);
    
    if (referralsData) {
      setReferralStats({
        totalEarnings: referralsData.reduce((sum, r) => sum + Number(r.commission_amount), 0),
        totalReferrals: referralsData.length
      });
    }
  };

  const generateReferralCode = async () => {
    setIsGeneratingReferral(true);
    try {
      const { data, error } = await supabase.rpc('generate_referral_code');
      if (error) throw error;
      setReferralCode(data as string);
    } catch (err) {
      console.error('Failed to generate referral code:', err);
    } finally {
      setIsGeneratingReferral(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'expired':
        return 'bg-muted text-muted-foreground border-border';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
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
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {profile?.username}
                </p>
              </div>
            </div>
            <RedeemAccessCode />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'connections'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="w-4 h-4" />
            🔗 Endpoints
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by purchasing a plan from our pricing section.
                  </p>
                  <Button variant="omega" onClick={() => navigate('/#pricing')}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            ) : (
              orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {order.order_number}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">
                            {formatPrice(order.amount_usd, true)}/mo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${order.amount_usd.toFixed(2)} USD
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Server</p>
                            <p className="font-medium text-foreground capitalize">{order.server_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium text-foreground">{order.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Commitment</p>
                            <p className="font-medium text-foreground capitalize">{order.commitment}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Performance</p>
                          <p className="font-medium text-foreground">{order.rps} RPS / {order.tps} TPS</p>
                        </div>
                      </div>

                      {order.transaction_signature && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Transaction</p>
                          <a
                            href={`https://solscan.io/tx/${order.transaction_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {order.transaction_signature.slice(0, 20)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Endpoints Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            {/* Discord Auth Note */}
            <Card className="bg-[#5865F2]/10 border-[#5865F2]/30">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[#5865F2] flex-shrink-0 mt-0.5">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-foreground">🔐 Authentication Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You need to authenticate yourself in our Discord server to use these endpoints. 
                      If you need help, just open a ticket!
                    </p>
                    <a 
                      href="https://discord.gg/omeganode" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#5865F2] hover:underline mt-2"
                    >
                      Join Discord Server →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {orders.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No endpoints yet</h3>
                  <p className="text-muted-foreground">
                    Your endpoint URLs will appear here after your order is activated.
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(locationEndpoints).map(([location, endpoints], index) => (
                <motion.div
                  key={location}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {location}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* RPC Link */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">RPC Link</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <code className="flex-1 text-sm text-foreground font-mono truncate">
                            {endpoints.rpc}
                          </code>
                          <button
                            onClick={() => copyToClipboard(endpoints.rpc, `rpc-${location}`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedId === `rpc-${location}` ? (
                              <Check className="w-4 h-4 text-secondary" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* WS Link */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">WS Link</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <code className="flex-1 text-sm text-foreground font-mono truncate">
                            {endpoints.ws}
                          </code>
                          <button
                            onClick={() => copyToClipboard(endpoints.ws, `ws-${location}`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedId === `ws-${location}` ? (
                              <Check className="w-4 h-4 text-secondary" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* gRPC Link */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">gRPC Link</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <code className="flex-1 text-sm text-foreground font-mono truncate">
                            {endpoints.grpc}
                          </code>
                          <button
                            onClick={() => copyToClipboard(endpoints.grpc, `grpc-${location}`)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            {copiedId === `grpc-${location}` ? (
                              <Check className="w-4 h-4 text-secondary" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currency Setting */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Currency</p>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred display currency
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrencyOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-all"
                  >
                    <span className="text-lg">{currency.symbol}</span>
                    <span className="font-medium text-foreground">{currency.code}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Referral Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share your referral code with friends. You earn <span className="font-semibold text-secondary">10%</span> of their total payment amount!
                </p>
                
                {referralCode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <code className="flex-1 text-sm font-mono text-foreground font-semibold tracking-wider">
                        {referralCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(referralCode, 'referral-code')}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        {copiedId === 'referral-code' ? (
                          <Check className="w-4 h-4 text-secondary" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-primary" />
                          <p className="text-xs text-muted-foreground">Total Referrals</p>
                        </div>
                        <p className="text-lg font-bold text-foreground">{referralStats.totalReferrals}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-secondary" />
                          <p className="text-xs text-muted-foreground">Total Earnings</p>
                        </div>
                        <p className="text-lg font-bold text-secondary">${referralStats.totalEarnings.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="omega" 
                    onClick={generateReferralCode}
                    disabled={isGeneratingReferral}
                    className="w-full"
                  >
                    {isGeneratingReferral ? 'Generating...' : 'Generate Referral Code'}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium text-foreground">{profile?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium text-foreground">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Currency Selector Modal */}
        <CurrencySelector 
          open={currencyOpen} 
          onOpenChange={setCurrencyOpen}
          isFirstVisit={false}
        />
      </main>
    </div>
  );
};

export default Dashboard;
