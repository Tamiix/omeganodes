import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
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

const Row = ({ label, val, sub }: { label: string; val: string; sub?: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
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
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">

          {/* Header */}
          <div className="mb-10">
            <button onClick={() => navigate('/')} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
            <div className="flex items-center gap-3 mb-1">
              {v?.image && <img src={v.image} alt="" className="w-7 h-7 rounded-full" />}
              <h1 className="text-xl font-medium text-foreground">{v?.name || 'OmegaNode Validator'}</h1>
              {v && !v.delinquent && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Online" />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60 font-mono">
              <span>{VOTE_ACCOUNT.slice(0, 20)}…</span>
              <span>·</span>
              <a href={`https://stakewiz.com/validator/${VOTE_ACCOUNT}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground flex items-center gap-1">
                stakewiz <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>·</span>
              <button onClick={fetchData} disabled={loading} className="hover:text-foreground flex items-center gap-1">
                <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
                {lastUpdated && <span>{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive mb-6 p-3 rounded bg-destructive/5 border border-destructive/15">
              {error} <button onClick={fetchData} className="underline ml-1">retry</button>
            </div>
          )}

          {loading && !v ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-muted/20 rounded animate-pulse" />
              ))}
            </div>
          ) : v ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-transparent p-0 h-auto gap-4 border-b border-border/20 rounded-none w-full justify-start">
                {['overview', 'performance', 'stakers', 'identity'].map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="text-xs text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-foreground pb-2 px-0 capitalize bg-transparent"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { l: 'Stake', v: `◎ ${v.activated_stake.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
                    { l: 'APY', v: `${v.total_apy.toFixed(2)}%` },
                    { l: 'Score', v: `${v.wiz_score.toFixed(1)}` },
                    { l: 'Commission', v: `${v.commission}%` },
                  ].map(item => (
                    <div key={item.l}>
                      <div className="text-[11px] text-muted-foreground/50 mb-0.5">{item.l}</div>
                      <div className="text-lg font-mono tabular-nums font-medium">{item.v}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <Row label="Staking APY" val={`${v.staking_apy.toFixed(2)}%`} sub={cluster ? `avg ${cluster.avg_apy.toFixed(2)}%` : undefined} />
                  <Row label="Jito APY" val={`${v.jito_apy.toFixed(2)}%`} />
                  <Row label="Jito Commission" val={`${(v.jito_commission_bps / 100).toFixed(2)}%`} />
                  <Row label="Skip Rate" val={`${v.skip_rate.toFixed(2)}%`} sub={cluster ? `avg ${cluster.avg_skip_rate.toFixed(2)}%` : undefined} />
                  <Row label="Vote Success" val={`${v.vote_success.toFixed(2)}%`} />
                  <Row label="Uptime" val={`${v.uptime.toFixed(2)}%`} />
                  <Row label="Epoch Credits" val={v.epoch_credits.toLocaleString()} />
                  <Row label="Credit Ratio" val={`${v.credit_ratio.toFixed(2)}%`} />
                  <Row label="Epoch" val={`${v.epoch}`} />
                </div>

                {stakeAccounts && (
                  <div className="pt-2">
                    <div className="text-[11px] text-muted-foreground/50 mb-2">Epoch Stake Change</div>
                    <div className="font-mono tabular-nums">
                      <span className={`text-xl font-medium ${netDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {netDelta >= 0 ? '+' : ''}{netDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎
                      </span>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground/60">
                        <span>+{stakeAccounts.activating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({stakeAccounts.activating.count})</span>
                        <span>-{stakeAccounts.deactivating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({stakeAccounts.deactivating.count})</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Performance */}
              <TabsContent value="performance" className="space-y-6 mt-6">
                {cluster && (
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-3">vs Cluster</div>
                    {[
                      { label: 'Vote Success', val: v.credit_ratio, avg: cluster.avg_credit_ratio, higher: true },
                      { label: 'Skip Rate', val: v.skip_rate, avg: cluster.avg_skip_rate, higher: false },
                      { label: 'APY', val: v.total_apy, avg: cluster.avg_apy, higher: true },
                      { label: 'Commission', val: v.commission, avg: cluster.avg_commission, higher: false },
                    ].map(m => {
                      const better = m.higher ? m.val >= m.avg : m.val <= m.avg;
                      const diff = m.val - m.avg;
                      return (
                        <div key={m.label} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
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

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">Leader Slots</div>
                    <div className="text-lg font-mono font-medium tabular-nums">{(v.leader_slots || 0).toLocaleString()}</div>
                    <div className="text-xs font-mono text-muted-foreground/50 mt-1">
                      {((v.leader_slots || 0) - (v.skipped_slots || 0)).toLocaleString()} produced · {(v.skipped_slots || 0).toLocaleString()} skipped
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground/50 mb-1">Epoch Credits</div>
                    <div className="text-lg font-mono font-medium tabular-nums">{(v.epoch_credits || 0).toLocaleString()}</div>
                    <div className="text-xs font-mono text-muted-foreground/50 mt-1">
                      {(v.credit_ratio || 0).toFixed(2)}% ratio
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Stakers */}
              <TabsContent value="stakers" className="mt-6">
                <TopStakers stakes={stakes} totalStake={v.activated_stake} />
              </TabsContent>

              {/* Identity */}
              <TabsContent value="details" className="mt-6">
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
                  <div key={item.l} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/10 last:border-0">
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
