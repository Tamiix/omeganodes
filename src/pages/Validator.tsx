import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, Shield, Zap, TrendingUp, Server, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-foreground' }: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) => (
  <Card className="bg-card border-border/50">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-semibold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{sub}</p>}
    </CardContent>
  </Card>
);

const Validator = () => {
  const navigate = useNavigate();
  const [validator, setValidator] = useState<ValidatorData | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccounts | null>(null);
  const [stakes, setStakes] = useState<any[]>([]);
  const [cluster, setCluster] = useState<ClusterStats | null>(null);
  const [jitoRank, setJitoRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stakers' | 'details'>('overview');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [valData, stakeData, clusterData, stakesData, jitoData] = await Promise.all([
        fetchEndpoint('validator'),
        fetchEndpoint('epoch_stake_accounts'),
        fetchEndpoint('cluster_stats'),
        fetchEndpoint('stakes'),
        fetchEndpoint('jito_validators').catch(() => null),
      ]);
      setValidator(valData);
      setStakeAccounts(stakeData);
      setCluster(clusterData);
      setStakes(Array.isArray(stakesData) ? stakesData : []);

      if (jitoData?.validators && Array.isArray(jitoData.validators)) {
        const sorted = [...jitoData.validators]
          .filter((v: any) => v.active_stake > 0)
          .sort((a: any, b: any) => b.active_stake - a.active_stake);
        const idx = sorted.findIndex((v: any) => v.vote_account === VOTE_ACCOUNT);
        if (idx !== -1) setJitoRank(idx + 1);
      }
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

  const tabs = ['overview', 'stakers', 'details'] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {v?.image && <img src={v.image} alt="" className="w-10 h-10 rounded-full border border-border/50" />}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-foreground">{v?.name || 'OmegaNode Validator'}</h1>
                    {!v?.delinquent && v && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
                    )}
                  </div>
                  {v && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {jitoRank && (
                        <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded px-1.5 py-0.5">
                          Jito #{jitoRank}
                        </span>
                      )}
                      {v.rank && (
                        <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                          SW #{v.rank}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        v{v.version} · {v.ip_city}, {v.ip_country}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive mb-6 p-3 rounded-md bg-destructive/5 border border-destructive/10">
              {error} <button onClick={fetchData} className="underline ml-1">retry</button>
            </div>
          )}

          {loading && !v ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted/30 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : v ? (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 mb-6 border-b border-border/30">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-sm capitalize px-4 py-2.5 transition-colors relative ${
                      activeTab === tab
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground/70'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Primary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <StatCard
                      icon={Shield}
                      label="Total Stake"
                      value={`◎ ${v.activated_stake.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="True APY"
                      value={`${v.total_apy.toFixed(2)}%`}
                      sub={`${v.staking_apy.toFixed(2)}% base + ${v.jito_apy.toFixed(2)}% jito`}
                      color="text-emerald-400"
                    />
                    <StatCard
                      icon={Zap}
                      label="Wiz Score"
                      value={`${(v.wiz_score / 10).toFixed(1)} / 10`}
                    />
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard icon={Activity} label="Commission" value={`${v.commission}%`} sub={`Jito ${(v.jito_commission_bps / 100).toFixed(0)}%`} />
                    <StatCard icon={Activity} label="Skip Rate" value={`${v.skip_rate.toFixed(2)}%`} sub={cluster ? `avg ${cluster.avg_skip_rate.toFixed(2)}%` : undefined} />
                    <StatCard icon={Activity} label="Vote Success" value={`${v.vote_success.toFixed(2)}%`} />
                    <StatCard icon={Server} label="Uptime" value={`${v.uptime.toFixed(2)}%`} />
                  </div>

                  {/* Epoch Stake Change */}
                  {stakeAccounts && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Epoch #{v.epoch} Stake Change</span>
                        </div>
                        <p className={`text-xl font-semibold font-mono mb-2 ${netDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {netDelta >= 0 ? '+' : ''}{netDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} ◎
                        </p>
                        <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                          <span>
                            <span className="text-emerald-400/80">+{stakeAccounts.activating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> activating ({stakeAccounts.activating.count})
                          </span>
                          <span>
                            <span className="text-red-400/80">-{stakeAccounts.deactivating.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> deactivating ({stakeAccounts.deactivating.count})
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cluster Comparison */}
                  {cluster && (
                    <Card className="bg-card border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">vs Cluster Average</span>
                        </div>
                        <div className="space-y-0">
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
                                <div className="flex items-center gap-4 font-mono text-sm">
                                  <span className="text-muted-foreground/40 w-16 text-right">{m.avg.toFixed(2)}%</span>
                                  <span className={better ? 'text-emerald-400' : 'text-orange-400'}>{m.val.toFixed(2)}%</span>
                                  <span className={`text-xs w-14 text-right ${better ? 'text-emerald-400/50' : 'text-orange-400/50'}`}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Epoch Performance */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={Server}
                      label="Leader Slots"
                      value={(v.leader_slots || 0).toLocaleString()}
                      sub={`${((v.leader_slots || 0) - (v.skipped_slots || 0)).toLocaleString()} produced · ${(v.skipped_slots || 0).toLocaleString()} skipped`}
                    />
                    <StatCard
                      icon={Zap}
                      label="Epoch Credits"
                      value={(v.epoch_credits || 0).toLocaleString()}
                      sub={`${(v.credit_ratio || 0).toFixed(2)}% ratio`}
                    />
                  </div>
                </div>
              )}

              {/* Stakers */}
              {activeTab === 'stakers' && (
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <TopStakers stakes={stakes} totalStake={v.activated_stake} />
                  </CardContent>
                </Card>
              )}

              {/* Details */}
              {activeTab === 'details' && (
                <Card className="bg-card border-border/50">
                  <CardContent className="p-4">
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
                      <div key={item.l} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-border/20 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.l}</span>
                        {item.link ? (
                          <a href={item.v} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 font-mono">
                            {item.v} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-foreground font-mono break-all">{item.v}</span>
                        )}
                      </div>
                    ))}

                    <div className="pt-4 mt-2">
                      <a
                        href={`https://stakewiz.com/validator/${VOTE_ACCOUNT}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        View on StakeWiz <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Validator;
