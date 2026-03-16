import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
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

// Simple metric row for the data table
const MetricRow = ({ label, value, compare, unit = '', lowerBetter = false }: {
  label: string;
  value: string | number;
  compare?: { avg: number; unit?: string };
  unit?: string;
  lowerBetter?: boolean;
}) => {
  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const isBetter = compare
    ? lowerBetter ? numVal <= compare.avg : numVal >= compare.avg
    : null;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right flex items-center gap-3">
        {compare && (
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            avg {compare.avg.toFixed(2)}{compare.unit || unit}
          </span>
        )}
        <span className={`text-sm font-mono tabular-nums ${
          isBetter === true ? 'text-emerald-400' : isBetter === false ? 'text-orange-400' : 'text-foreground'
        }`}>
          {typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value}{unit}
        </span>
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

  const v = validator;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">

          {/* Minimal header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0 -ml-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                {v?.image && (
                  <img src={v.image} alt="" className="w-8 h-8 rounded-full" />
                )}
                <div>
                  <h1 className="text-lg font-semibold text-foreground">{v?.name || 'OmegaNode Validator'}</h1>
                  <p className="text-xs text-muted-foreground font-mono">{VOTE_ACCOUNT.slice(0, 16)}…</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <a href={`https://stakewiz.com/validator/${VOTE_ACCOUNT}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-7">
                    StakeWiz <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </div>

            {v && (
              <div className="flex flex-wrap gap-1.5 ml-10">
                <Badge className={`text-[10px] ${v.delinquent ? 'bg-destructive/20 text-destructive border-destructive/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'}`}>
                  {v.delinquent ? 'DELINQUENT' : 'ONLINE'}
                </Badge>
                {v.is_jito && <Badge variant="outline" className="text-[10px] text-muted-foreground">Jito</Badge>}
                <Badge variant="outline" className="text-[10px] text-muted-foreground">v{v.version}</Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">{v.ip_city}, {v.ip_country}</Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">#{v.rank}</Badge>
                {lastUpdated && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground/50">{lastUpdated.toLocaleTimeString()}</Badge>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive mb-6 p-3 border border-destructive/20 rounded-md bg-destructive/5">
              {error}
              <button onClick={fetchData} className="ml-2 underline text-xs">retry</button>
            </div>
          )}

          {loading && !v ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : v ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-transparent border border-border/50 h-8">
                <TabsTrigger value="overview" className="text-xs h-6 data-[state=active]:bg-muted">Stats</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs h-6 data-[state=active]:bg-muted">Performance</TabsTrigger>
                <TabsTrigger value="stakers" className="text-xs h-6 data-[state=active]:bg-muted">Stakers</TabsTrigger>
                <TabsTrigger value="details" className="text-xs h-6 data-[state=active]:bg-muted">Identity</TabsTrigger>
              </TabsList>

              {/* Stats */}
              <TabsContent value="overview" className="space-y-0">
                {/* Key numbers - compact grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30 rounded-lg overflow-hidden mb-6">
                  {[
                    { label: 'Total Stake', val: `◎ ${v.activated_stake.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
                    { label: 'True APY', val: `${v.total_apy.toFixed(2)}%` },
                    { label: 'Wiz Score', val: `${v.wiz_score.toFixed(1)}` },
                    { label: 'Commission', val: `${v.commission}%` },
                  ].map(item => (
                    <div key={item.label} className="bg-card p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</div>
                      <div className="text-lg font-semibold font-mono tabular-nums">{item.val}</div>
                    </div>
                  ))}
                </div>

                {/* Detailed metrics table */}
                <div className="border border-border/30 rounded-lg p-4 bg-card/50">
                  <MetricRow label="Staking APY" value={v.staking_apy} unit="%" compare={cluster ? { avg: cluster.avg_apy } : undefined} />
                  <MetricRow label="Jito APY" value={v.jito_apy} unit="%" />
                  <MetricRow label="Jito Commission" value={v.jito_commission_bps / 100} unit="%" />
                  <MetricRow label="Skip Rate" value={v.skip_rate} unit="%" lowerBetter compare={cluster ? { avg: cluster.avg_skip_rate } : undefined} />
                  <MetricRow label="Vote Success" value={v.vote_success} unit="%" compare={cluster ? { avg: cluster.avg_credit_ratio } : undefined} />
                  <MetricRow label="Uptime (30d)" value={v.uptime} unit="%" />
                  <MetricRow label="Epoch Credits" value={v.epoch_credits} />
                  <MetricRow label="Credit Ratio" value={v.credit_ratio} unit="%" />
                  <MetricRow label="Epoch" value={`#${v.epoch}`} />
                </div>

                {/* Epoch stake delta */}
                {stakeAccounts && (
                  <div className="mt-4 border border-border/30 rounded-lg p-4 bg-card/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Epoch Stake Change</div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-2xl font-mono font-bold tabular-nums ${netStakeDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {netStakeDelta >= 0 ? '+' : ''}{netStakeDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎
                      </span>
                      <span className="text-xs text-muted-foreground">net</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                      <span>
                        <span className="text-emerald-400">+{stakeAccounts.activating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        {' '}({stakeAccounts.activating.count})
                      </span>
                      <span>
                        <span className="text-red-400">-{stakeAccounts.deactivating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                        {' '}({stakeAccounts.deactivating.count})
                      </span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Performance */}
              <TabsContent value="performance" className="space-y-4">
                {cluster && (
                  <div className="border border-border/30 rounded-lg p-4 bg-card/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">vs Cluster Average</div>
                    {[
                      { label: 'Vote Success', val: v.credit_ratio, avg: cluster.avg_credit_ratio, higher: true },
                      { label: 'Skip Rate', val: v.skip_rate, avg: cluster.avg_skip_rate, higher: false },
                      { label: 'APY', val: v.total_apy, avg: cluster.avg_apy, higher: true },
                      { label: 'Commission', val: v.commission, avg: cluster.avg_commission, higher: false },
                    ].map(m => {
                      const better = m.higher ? m.val >= m.avg : m.val <= m.avg;
                      const diff = m.val - m.avg;
                      return (
                        <div key={m.label} className="flex items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                          <span className="text-sm text-muted-foreground">{m.label}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">avg {m.avg.toFixed(2)}%</span>
                            <span className={`text-sm font-mono tabular-nums ${better ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {m.val.toFixed(2)}%
                            </span>
                            <span className={`text-[10px] font-mono tabular-nums ${better ? 'text-emerald-400/60' : 'text-orange-400/60'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-border/30 rounded-lg p-4 bg-card/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Leader Slots</div>
                    <div className="text-xl font-mono font-semibold tabular-nums">{(v.leader_slots || 0).toLocaleString()}</div>
                    <div className="flex gap-4 mt-2 text-xs font-mono text-muted-foreground">
                      <span>produced <span className="text-foreground">{((v.leader_slots || 0) - (v.skipped_slots || 0)).toLocaleString()}</span></span>
                      <span>skipped <span className="text-orange-400">{(v.skipped_slots || 0).toLocaleString()}</span></span>
                    </div>
                  </div>
                  <div className="border border-border/30 rounded-lg p-4 bg-card/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Epoch Credits</div>
                    <div className="text-xl font-mono font-semibold tabular-nums">{(v.epoch_credits || 0).toLocaleString()}</div>
                    <div className="mt-2 text-xs font-mono text-muted-foreground">
                      ratio <span className="text-foreground">{(v.credit_ratio || 0).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Stakers */}
              <TabsContent value="stakers">
                <TopStakers stakes={stakes} totalStake={v.activated_stake} />
              </TabsContent>

              {/* Identity */}
              <TabsContent value="details">
                <div className="border border-border/30 rounded-lg p-4 bg-card/50">
                  {[
                    { label: 'Vote Account', value: v.vote_identity },
                    { label: 'Identity', value: v.identity },
                    { label: 'Version', value: v.version },
                    { label: 'Website', value: v.website, isLink: true },
                    { label: 'Data Center', value: `${v.ip_city}, ${v.ip_country}` },
                    { label: 'ASN', value: `${v.asn}${v.ip_org ? ` — ${v.ip_org}` : ''}` },
                    { label: 'ASN Concentration', value: `${(v.asn_concentration || 0).toFixed(2)}%` },
                    { label: 'City Concentration', value: `${(v.city_concentration || 0).toFixed(2)}%` },
                    { label: 'Stake Share', value: `${(v.stake_ratio || 0).toFixed(4)}%` },
                    { label: 'First Epoch', value: `#${v.first_epoch_with_stake}` },
                    { label: 'Jito MEV', value: v.is_jito ? 'Enabled' : 'Disabled' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      {item.isLink ? (
                        <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 font-mono">
                          {item.value} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-foreground font-mono break-all tabular-nums">{item.value}</span>
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
