import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, Award, Percent, Zap, Circle, Clock, Hash, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  ip_org?: string;
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

const StatCard = ({ icon: Icon, label, value, sub, iconColor }: { icon: any; label: string; value: string; sub?: string; iconColor?: string }) => (
  <div className="border border-border/30 rounded-lg p-4 bg-card/50">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor || 'text-primary'}`} />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
    </div>
    <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{value}</div>
    {sub && <div className="text-[11px] text-muted-foreground/60 mt-1 font-mono">{sub}</div>}
  </div>
);

const Row = ({ label, val, sub }: { label: string; val: string; sub?: string }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/10 last:border-0">
    <span className="text-[13px] text-muted-foreground">{label}</span>
    <div className="text-right">
      <span className="text-[13px] font-mono tabular-nums text-foreground">{val}</span>
      {sub && <span className="text-[11px] text-muted-foreground/50 ml-2 font-mono">{sub}</span>}
    </div>
  </div>
);

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

  useEffect(() => { fetchData(); }, []);

  const v = validator;
  const netDelta = stakeAccounts
    ? (stakeAccounts.activating?.amount || 0) - (stakeAccounts.deactivating?.amount || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {v?.image && <img src={v.image} alt="" className="w-10 h-10 rounded-full" />}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-foreground">{v?.name || 'OmegaNode Validator'}</h1>
                    {v?.rank && (
                      <span className="text-[11px] font-mono border border-primary/40 text-primary rounded px-1.5 py-0.5">
                        Rank #{v.rank}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Enterprise-grade Solana infrastructure provider · Mainnet</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5 text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                  <a href={`https://stakewiz.com/validator/${VOTE_ACCOUNT}`} target="_blank" rel="noopener noreferrer">
                    StakeWiz <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Status pills */}
            {v && (
              <div className="flex items-center gap-2 ml-[68px] flex-wrap">
                {!v.delinquent && (
                  <span className="text-[11px] font-medium border border-emerald-500/30 text-emerald-400 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
                  </span>
                )}
                {v.is_jito && (
                  <span className="text-[11px] font-medium border border-purple-500/30 text-purple-400 rounded-full px-2.5 py-0.5">
                    Jito MEV
                  </span>
                )}
                <span className="text-[11px] font-mono border border-border/30 text-muted-foreground rounded-full px-2.5 py-0.5">
                  v{v.version}
                </span>
                <span className="text-[11px] border border-border/30 text-muted-foreground rounded-full px-2.5 py-0.5">
                  {v.ip_city}, {v.ip_country}
                </span>
                {lastUpdated && (
                  <span className="text-[11px] border border-border/30 text-muted-foreground rounded-full px-2.5 py-0.5">
                    Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive mb-6 p-3 rounded bg-destructive/5 border border-destructive/15">
              {error} <button onClick={fetchData} className="underline ml-1">retry</button>
            </div>
          )}

          {loading && !v ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-muted/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : v ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-card/50 border border-border/30 p-1 h-auto rounded-lg">
                {['overview', 'performance', 'stakers', 'details'].map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="text-xs capitalize px-4 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    icon={TrendingUp}
                    label="Total Stake"
                    value={`◎ ${v.activated_stake.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    sub={netDelta !== 0 ? `${netDelta >= 0 ? '+' : ''}${netDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎ next epoch` : undefined}
                    iconColor="text-emerald-400"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="True APY"
                    value={`${v.total_apy.toFixed(2)}%`}
                    sub={`Staking ${v.staking_apy.toFixed(2)}% + Jito ${v.jito_apy.toFixed(2)}%`}
                    iconColor="text-purple-400"
                  />
                  <StatCard
                    icon={Award}
                    label="Wiz Score"
                    value={`${(v.wiz_score / 10).toFixed(1)} / 10`}
                    sub={v.rank ? `Rank #${v.rank}` : undefined}
                    iconColor="text-cyan-400"
                  />
                  <StatCard
                    icon={Percent}
                    label="Commission"
                    value={`${v.commission}%`}
                    sub={`Jito: ${(v.jito_commission_bps / 100).toFixed(0)}%`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    icon={Zap}
                    label="Skip Rate"
                    value={`${v.skip_rate.toFixed(2)}%`}
                    sub={cluster ? `Cluster avg: ${cluster.avg_skip_rate.toFixed(2)}%` : undefined}
                    iconColor="text-yellow-400"
                  />
                  <StatCard
                    icon={Circle}
                    label="Vote Success"
                    value={`${v.vote_success.toFixed(2)}%`}
                    sub={`${v.epoch_credits.toLocaleString()} credits`}
                  />
                  <StatCard
                    icon={Clock}
                    label="Uptime (30D)"
                    value={`${v.uptime.toFixed(2)}%`}
                    iconColor="text-emerald-400"
                  />
                  <StatCard
                    icon={Hash}
                    label="Epoch"
                    value={`#${v.epoch}`}
                  />
                </div>

                {/* Epoch Stake Change */}
                {stakeAccounts && (
                  <div className="border border-border/30 rounded-lg p-5 bg-card/50 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-[13px] font-medium text-foreground">Epoch Stake Change</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-2xl font-bold font-mono tabular-nums ${netDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {netDelta >= 0 ? '+' : ''}{netDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎
                      </span>
                      <span className="text-xs text-muted-foreground/60">net stake incoming next epoch</span>
                    </div>
                    <div className="flex gap-6 mt-2 text-xs font-mono text-muted-foreground/60">
                      <span>Activating: <span className="text-emerald-400/80">+{stakeAccounts.activating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎</span> ({stakeAccounts.activating.count} accounts)</span>
                      <span>Deactivating: <span className="text-red-400/80">-{stakeAccounts.deactivating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎</span> ({stakeAccounts.deactivating.count} accounts)</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Performance */}
              <TabsContent value="performance" className="space-y-6 mt-4">
                {cluster && (
                  <div className="border border-border/30 rounded-lg p-5 bg-card/50">
                    <span className="text-[13px] font-medium text-foreground mb-4 block">vs Cluster Average</span>
                    {[
                      { label: 'Vote Success', val: v.credit_ratio, avg: cluster.avg_credit_ratio, higher: true },
                      { label: 'Skip Rate', val: v.skip_rate, avg: cluster.avg_skip_rate, higher: false },
                      { label: 'APY', val: v.total_apy, avg: cluster.avg_apy, higher: true },
                      { label: 'Commission', val: v.commission, avg: cluster.avg_commission, higher: false },
                    ].map(m => {
                      const better = m.higher ? m.val >= m.avg : m.val <= m.avg;
                      const diff = m.val - m.avg;
                      return (
                        <div key={m.label} className="flex items-center justify-between py-2.5 border-b border-border/10 last:border-0">
                          <span className="text-[13px] text-muted-foreground">{m.label}</span>
                          <div className="flex items-center gap-3 font-mono tabular-nums text-[13px]">
                            <span className="text-muted-foreground/40">{m.avg.toFixed(2)}%</span>
                            <span className={better ? 'text-emerald-400' : 'text-orange-400'}>{m.val.toFixed(2)}%</span>
                            <span className={`text-[11px] ${better ? 'text-emerald-400/50' : 'text-orange-400/50'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={Hash}
                    label="Leader Slots"
                    value={(v.leader_slots || 0).toLocaleString()}
                    sub={`${((v.leader_slots || 0) - (v.skipped_slots || 0)).toLocaleString()} produced · ${(v.skipped_slots || 0).toLocaleString()} skipped`}
                  />
                  <StatCard
                    icon={Award}
                    label="Epoch Credits"
                    value={(v.epoch_credits || 0).toLocaleString()}
                    sub={`${(v.credit_ratio || 0).toFixed(2)}% ratio`}
                    iconColor="text-cyan-400"
                  />
                </div>
              </TabsContent>

              {/* Stakers */}
              <TabsContent value="stakers" className="mt-4">
                <TopStakers stakes={stakes} totalStake={v.activated_stake} />
              </TabsContent>

              {/* Details */}
              <TabsContent value="details" className="mt-4">
                <div className="border border-border/30 rounded-lg p-5 bg-card/50">
                  {[
                    { l: 'Vote Account', v: v.vote_identity },
                    { l: 'Identity', v: v.identity },
                    { l: 'Version', v: v.version },
                    { l: 'Website', v: v.website, link: true },
                    { l: 'Data Center', v: `${v.ip_city}, ${v.ip_country}` },
                    { l: 'ASN', v: `${v.asn}${v.ip_org ? ` — ${v.ip_org}` : ''}` },
                    { l: 'ASN Concentration', v: `${(v.asn_concentration || 0).toFixed(2)}%` },
                    { l: 'City Concentration', v: `${(v.city_concentration || 0).toFixed(2)}%` },
                    { l: 'Stake Share', v: `${(v.stake_ratio || 0).toFixed(4)}%` },
                    { l: 'First Epoch', v: `${v.first_epoch_with_stake}` },
                    { l: 'Jito MEV', v: v.is_jito ? 'Enabled' : 'Disabled' },
                  ].map(item => (
                    <div key={item.l} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border/10 last:border-0">
                      <span className="text-[13px] text-muted-foreground">{item.l}</span>
                      {item.link ? (
                        <a href={item.v} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary hover:underline flex items-center gap-1 font-mono">
                          {item.v} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[13px] text-foreground font-mono break-all tabular-nums">{item.v}</span>
                      )}
                    </div>
                  ))}
                </div>
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
