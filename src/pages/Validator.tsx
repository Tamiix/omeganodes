import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Server, Shield, Zap, Clock, Award, RefreshCw, Activity, Percent, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TopStakers from '@/components/validator/TopStakers';

const VOTE_ACCOUNT = 'EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6';
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const fetchEndpoint = async (endpoint: string) => {
  const url = `https://${PROJECT_ID}.supabase.co/functions/v1/validator-stats?endpoint=${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
};

interface ValidatorData {
  name: string;
  image: string;
  vote_identity: string;
  identity: string;
  description: string;
  website: string;
  commission: number;
  jito_commission_bps: number;
  activated_stake: number;
  wiz_score: number;
  skip_rate: number;
  credit_ratio: number;
  version: string;
  delinquent: boolean;
  uptime: number;
  apy_estimate: number;
  staking_apy: number;
  jito_apy: number;
  total_apy: number;
  asn: string;
  asn_concentration: number;
  city_concentration: number;
  epoch_credits: number;
  epoch: number;
  epoch_slot_height: number;
  leader_slots: number;
  skipped_slots: number;
  ip_city: string;
  ip_country: string;
  withdraw_authority_score: number;
  first_epoch_with_stake: number;
  rank: number;
  stake_ratio: number;
  vote_success: number;
  is_jito: boolean;
  [key: string]: any;
}

interface StakeAccounts {
  activating: { amount: number; count: number };
  deactivating: { amount: number; count: number };
}

interface ClusterStats {
  avg_credit_ratio: number;
  avg_activated_stake: number;
  avg_commission: number;
  avg_skip_rate: number;
  avg_apy: number;
}

const StatCard = ({ icon: Icon, label, value, subValue, trend }: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
          </div>
          {trend && trend !== 'neutral' && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend === 'up' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
        {subValue && <div className="text-xs text-muted-foreground mt-1">{subValue}</div>}
      </CardContent>
    </Card>
  </motion.div>
);

const ComparisonBar = ({ label, value, avg, unit = '%', higherIsBetter = true }: {
  label: string;
  value: number;
  avg: number;
  unit?: string;
  higherIsBetter?: boolean;
}) => {
  const max = Math.max(value, avg) * 1.2 || 1;
  const valuePct = (value / max) * 100;
  const avgPct = (avg / max) * 100;
  const isBetter = higherIsBetter ? value >= avg : value <= avg;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${isBetter ? 'text-emerald-400' : 'text-orange-400'}`}>
          {value.toFixed(2)}{unit}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`absolute h-full rounded-full transition-all duration-700 ${isBetter ? 'bg-emerald-500/80' : 'bg-orange-500/80'}`}
          style={{ width: `${valuePct}%` }}
        />
        <div
          className="absolute h-full w-0.5 bg-muted-foreground/50 top-0"
          style={{ left: `${avgPct}%` }}
          title={`Cluster avg: ${avg.toFixed(2)}${unit}`}
        />
      </div>
      <div className="text-[10px] text-muted-foreground">
        Cluster avg: {avg.toFixed(2)}{unit}
      </div>
    </div>
  );
};

const Validator = () => {
  const navigate = useNavigate();
  const [validator, setValidator] = useState<ValidatorData | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccounts | null>(null);
  const [stakes, setStakes] = useState<any[]>([]);
  const [cluster, setCluster] = useState<ClusterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [valData, stakeData, clusterData, stakesData] = await Promise.all([
        fetchEndpoint('validator'),
        fetchEndpoint('epoch_stake_accounts'),
        fetchEndpoint('cluster_stats'),
        fetchEndpoint('stakes'),
      ]);

      setValidator(valData);
      setStakeAccounts(stakeData);
      setCluster(clusterData);
      setStakes(Array.isArray(stakesData) ? stakesData : []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch validator data:', err);
      setError(err.message || 'Failed to load validator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const netStakeDelta = stakeAccounts
    ? (stakeAccounts.activating?.amount || 0) - (stakeAccounts.deactivating?.amount || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  {validator?.image && (
                    <img src={validator.image} alt="Validator" className="w-10 h-10 rounded-full ring-2 ring-primary/30" />
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                      {validator?.name || 'OmegaNode Validator'}
                      {validator?.rank && (
                        <Badge variant="outline" className="text-xs font-normal">Rank #{validator.rank}</Badge>
                      )}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      {validator?.description || 'Enterprise-grade Solana infrastructure'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <a href={`https://stakewiz.com/validator/${VOTE_ACCOUNT}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    StakeWiz
                  </Button>
                </a>
              </div>
            </div>

            {validator && (
              <div className="flex flex-wrap gap-2 ml-0 sm:ml-14">
                <Badge className={validator.delinquent ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}>
                  {validator.delinquent ? '⚠ Delinquent' : '● Online'}
                </Badge>
                {validator.is_jito && (
                  <Badge variant="outline" className="text-primary border-primary/30">Jito MEV</Badge>
                )}
                <Badge variant="outline" className="text-muted-foreground">v{validator.version}</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  {validator.ip_city}, {validator.ip_country}
                </Badge>
                {lastUpdated && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {error && (
            <Card className="bg-destructive/10 border-destructive/30 mb-6">
              <CardContent className="p-4 text-center text-destructive">
                {error}
                <Button variant="ghost" size="sm" onClick={fetchData} className="ml-2">Retry</Button>
              </CardContent>
            </Card>
          )}

          {loading && !validator ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="bg-card/50 border-border/30 animate-pulse">
                  <CardContent className="p-5 h-28" />
                </Card>
              ))}
            </div>
          ) : validator ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-muted/50 w-full sm:w-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="stakers">Stakers</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    icon={Activity}
                    label="Total Stake"
                    value={`◎ ${validator.activated_stake.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    subValue={`${netStakeDelta >= 0 ? '+' : ''}${netStakeDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎ next epoch`}
                    trend={netStakeDelta >= 0 ? 'up' : 'down'}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="True APY"
                    value={`${validator.total_apy.toFixed(2)}%`}
                    subValue={`Staking ${validator.staking_apy.toFixed(2)}% + Jito ${validator.jito_apy.toFixed(2)}%`}
                  />
                  <StatCard
                    icon={Award}
                    label="Wiz Score"
                    value={`${validator.wiz_score.toFixed(1)}%`}
                    subValue={`Rank #${validator.rank}`}
                  />
                  <StatCard
                    icon={Percent}
                    label="Commission"
                    value={`${validator.commission}%`}
                    subValue={`Jito: ${validator.jito_commission_bps / 100}%`}
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    icon={Zap}
                    label="Skip Rate"
                    value={`${validator.skip_rate.toFixed(2)}%`}
                    subValue={cluster ? `Cluster avg: ${cluster.avg_skip_rate.toFixed(2)}%` : ''}
                    trend={validator.skip_rate <= (cluster?.avg_skip_rate || 5) ? 'up' : 'down'}
                  />
                  <StatCard
                    icon={Shield}
                    label="Vote Success"
                    value={`${validator.vote_success.toFixed(2)}%`}
                    subValue={`${validator.epoch_credits.toLocaleString()} credits`}
                  />
                  <StatCard
                    icon={Clock}
                    label="Uptime (30d)"
                    value={`${validator.uptime.toFixed(2)}%`}
                  />
                  <StatCard
                    icon={Server}
                    label="Epoch"
                    value={`#${validator.epoch}`}
                  />
                </div>

                {/* Stake Change Highlight */}
                <Card className="bg-card/60 border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      {netStakeDelta >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                      Epoch Stake Change
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-3">
                      <span className={`text-3xl font-bold ${netStakeDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {netStakeDelta >= 0 ? '+' : ''}{netStakeDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎
                      </span>
                      <span className="text-muted-foreground text-sm">
                        net stake {netStakeDelta >= 0 ? 'incoming' : 'leaving'} next epoch
                      </span>
                    </div>
                    {stakeAccounts && (
                      <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
                        <span>Activating: <span className="text-emerald-400 font-medium">+{stakeAccounts.activating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎</span> ({stakeAccounts.activating.count} accounts)</span>
                        <span>Deactivating: <span className="text-red-400 font-medium">-{stakeAccounts.deactivating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎</span> ({stakeAccounts.deactivating.count} accounts)</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-6">
                {cluster && (
                  <Card className="bg-card/60 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        vs Cluster Average
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ComparisonBar label="Vote Success Rate" value={validator.credit_ratio} avg={cluster.avg_credit_ratio} higherIsBetter={true} />
                      <ComparisonBar label="Skip Rate" value={validator.skip_rate} avg={cluster.avg_skip_rate} higherIsBetter={false} />
                      <ComparisonBar label="Estimated APY" value={validator.total_apy} avg={cluster.avg_apy} higherIsBetter={true} />
                      <ComparisonBar label="Commission" value={validator.commission} avg={cluster.avg_commission} higherIsBetter={false} />
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-card/60 border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Leader Slots</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(validator.leader_slots || 0).toLocaleString()}</div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Produced</span>
                          <span>{((validator.leader_slots || 0) - (validator.skipped_slots || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Skipped</span>
                          <span className="text-orange-400">{(validator.skipped_slots || 0).toLocaleString()}</span>
                        </div>
                        <Progress value={100 - (validator.skip_rate || 0)} className="h-1.5 mt-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/60 border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Epoch Credits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(validator.epoch_credits || 0).toLocaleString()}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Credit ratio: <span className="text-foreground font-medium">{(validator.credit_ratio || 0).toFixed(2)}%</span>
                      </div>
                      <Progress value={validator.credit_ratio || 0} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card className="bg-card/60 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Validator Identity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'Vote Account', value: validator.vote_identity },
                      { label: 'Identity', value: validator.identity },
                      { label: 'Version', value: validator.version },
                      { label: 'Website', value: validator.website, isLink: true },
                      { label: 'Data Center', value: `${validator.ip_city}, ${validator.ip_country}` },
                      { label: 'ASN', value: `${validator.asn} — ${validator.ip_org || ''}` },
                      { label: 'ASN Concentration', value: `${(validator.asn_concentration || 0).toFixed(2)}%` },
                      { label: 'City Concentration', value: `${(validator.city_concentration || 0).toFixed(2)}%` },
                      { label: 'Stake Share', value: `${(validator.stake_ratio || 0).toFixed(4)}%` },
                      { label: 'First Epoch', value: `#${validator.first_epoch_with_stake}` },
                      { label: 'Jito MEV', value: validator.is_jito ? '✓ Enabled' : '✗ Disabled' },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/30 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        {item.isLink ? (
                          <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                            {item.value} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-foreground font-mono break-all">{item.value}</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Validator;
