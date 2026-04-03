import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

interface EpochStake {
  epoch: number;
  stake: number;
}

const Validator = () => {
  const navigate = useNavigate();
  const [validator, setValidator] = useState<ValidatorData | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccounts | null>(null);
  const [stakes, setStakes] = useState<any[]>([]);
  const [cluster, setCluster] = useState<ClusterStats | null>(null);
  const [jitoRank, setJitoRank] = useState<number | null>(null);
  const [epochHistory, setEpochHistory] = useState<EpochStake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stakers' | 'details'>('overview');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [valData, stakeData, clusterData, stakesData, jitoData, epochData] = await Promise.all([
        fetchEndpoint('validator'),
        fetchEndpoint('epoch_stake_accounts'),
        fetchEndpoint('cluster_stats'),
        fetchEndpoint('stakes'),
        fetchEndpoint('jito_validators').catch(() => null),
        fetchEndpoint('epoch_history').catch(() => []),
      ]);
      setValidator(valData);
      setStakeAccounts(stakeData);
      setCluster(clusterData);
      setStakes(Array.isArray(stakesData) ? stakesData : []);

      if (Array.isArray(epochData) && epochData.length > 0) {
        const sorted = [...epochData].sort((a: EpochStake, b: EpochStake) => b.epoch - a.epoch);
        setEpochHistory(sorted.slice(0, 11)); // 11 to calculate 10 deltas
      }

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

  // Calculate epoch deltas from history
  const epochDeltas = epochHistory.length > 1
    ? epochHistory.slice(0, -1).map((current, i) => {
        const prev = epochHistory[i + 1];
        return {
          epoch: current.epoch,
          stake: current.stake,
          delta: current.stake - prev.stake,
        };
      })
    : [];

  const tabs = ['overview', 'stakers', 'details'] as const;

  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString('en-US', { maximumFractionDigits: decimals });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {v?.image && <img src={v.image} alt="" className="w-9 h-9 rounded-full" />}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold text-foreground">{v?.name || 'OmegaNode Validator'}</h1>
                    {!v?.delinquent && v && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Online" />
                    )}
                  </div>
                  {v && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {jitoRank && (
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 rounded px-1.5 py-0.5">
                          Jito #{jitoRank}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        v{v.version} · {v.ip_city}, {v.ip_country}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading} className="h-8 w-8 text-muted-foreground hover:text-foreground">
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
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/20 rounded animate-pulse" />
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
                    className={`text-xs capitalize px-3 py-2 transition-colors relative ${
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
                  {/* Key metrics row */}
                  <div className="grid grid-cols-3 gap-px bg-border/30 rounded-lg overflow-hidden">
                    {[
                      { label: 'Total Stake', value: `◎ ${fmt(v.activated_stake)}`, color: '' },
                      { label: 'True APY', value: `${v.total_apy.toFixed(2)}%`, color: 'text-emerald-400' },
                      { label: 'Wiz Score', value: `${(v.wiz_score / 10).toFixed(1)}/10`, color: '' },
                    ].map(m => (
                      <div key={m.label} className="bg-card p-4">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1">{m.label}</span>
                        <span className={`text-lg font-mono font-semibold ${m.color || 'text-foreground'}`}>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Performance metrics */}
                  <div className="grid grid-cols-4 gap-px bg-border/30 rounded-lg overflow-hidden">
                    {[
                      { label: 'Commission', value: `${v.commission}%`, sub: `Jito ${(v.jito_commission_bps / 100).toFixed(0)}%` },
                      { label: 'Skip Rate', value: `${v.skip_rate.toFixed(2)}%`, sub: cluster ? `avg ${cluster.avg_skip_rate.toFixed(2)}%` : '' },
                      { label: 'Vote Success', value: `${v.vote_success.toFixed(1)}%` },
                      { label: 'Uptime', value: `${v.uptime.toFixed(2)}%` },
                    ].map(m => (
                      <div key={m.label} className="bg-card p-3">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 block mb-1">{m.label}</span>
                        <span className="text-sm font-mono font-medium text-foreground">{m.value}</span>
                        {m.sub && <span className="text-[10px] text-muted-foreground/50 block mt-0.5 font-mono">{m.sub}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Current epoch stake change */}
                  {stakeAccounts && (
                    <div className="rounded-lg border border-border/30 bg-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Epoch {v.epoch} · Stake Change</span>
                        <span className={`text-sm font-mono font-semibold ${netDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {netDelta >= 0 ? '+' : ''}{fmt(netDelta)} ◎
                        </span>
                      </div>
                      <div className="flex gap-4 text-[11px] font-mono text-muted-foreground/60">
                        <span><span className="text-emerald-400/70">+{fmt(stakeAccounts.activating.amount)}</span> ({stakeAccounts.activating.count})</span>
                        <span><span className="text-red-400/70">-{fmt(stakeAccounts.deactivating.amount)}</span> ({stakeAccounts.deactivating.count})</span>
                      </div>
                    </div>
                  )}

                  {/* Epoch History */}
                  {epochDeltas.length > 0 && (
                    <div className="rounded-lg border border-border/30 bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/20">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Stake History · Last {epochDeltas.length} Epochs</span>
                      </div>
                      <div className="divide-y divide-border/10">
                        {epochDeltas.map(e => (
                          <div key={e.epoch} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/5 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-muted-foreground/50 w-16">#{e.epoch}</span>
                              <span className="text-xs font-mono text-muted-foreground">◎ {fmt(e.stake)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {e.delta > 0 ? (
                                <TrendingUp className="w-3 h-3 text-emerald-400/70" />
                              ) : e.delta < 0 ? (
                                <TrendingDown className="w-3 h-3 text-red-400/70" />
                              ) : (
                                <Minus className="w-3 h-3 text-muted-foreground/30" />
                              )}
                              <span className={`text-xs font-mono ${
                                e.delta > 0 ? 'text-emerald-400' : e.delta < 0 ? 'text-red-400' : 'text-muted-foreground/40'
                              }`}>
                                {e.delta > 0 ? '+' : ''}{fmt(e.delta)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cluster comparison */}
                  {cluster && (
                    <div className="rounded-lg border border-border/30 bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/20">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">vs Cluster Average</span>
                      </div>
                      <div className="divide-y divide-border/10">
                        {[
                          { label: 'Vote Success', val: v.credit_ratio, avg: cluster.avg_credit_ratio, higher: true },
                          { label: 'Skip Rate', val: v.skip_rate, avg: cluster.avg_skip_rate, higher: false },
                          { label: 'APY', val: v.total_apy, avg: cluster.avg_apy, higher: true },
                          { label: 'Commission', val: v.commission, avg: cluster.avg_commission, higher: false },
                        ].map(m => {
                          const better = m.higher ? m.val >= m.avg : m.val <= m.avg;
                          const diff = m.val - m.avg;
                          return (
                            <div key={m.label} className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-xs text-muted-foreground">{m.label}</span>
                              <div className="flex items-center gap-3 font-mono text-xs">
                                <span className="text-muted-foreground/30 w-14 text-right">{m.avg.toFixed(2)}%</span>
                                <span className={better ? 'text-emerald-400' : 'text-orange-400'}>{m.val.toFixed(2)}%</span>
                                <span className={`text-[10px] w-12 text-right ${better ? 'text-emerald-400/40' : 'text-orange-400/40'}`}>
                                  {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stakers */}
              {activeTab === 'stakers' && (
                <div className="rounded-lg border border-border/30 bg-card p-4">
                  <TopStakers stakes={stakes} totalStake={v.activated_stake} />
                </div>
              )}

              {/* Details */}
              {activeTab === 'details' && (
                <div className="rounded-lg border border-border/30 bg-card overflow-hidden">
                  <div className="divide-y divide-border/10">
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
                      <div key={item.l} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-muted-foreground">{item.l}</span>
                        {item.link ? (
                          <a href={item.v} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 font-mono">
                            {item.v} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-foreground font-mono break-all">{item.v}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-border/20">
                    <a
                      href={`https://stakewiz.com/validator/${VOTE_ACCOUNT}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      View on StakeWiz <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
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
