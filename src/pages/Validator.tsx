import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus, Clock, Activity, Shield, Zap, BarChart3, Users, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TopStakers from '@/components/validator/TopStakers';
import WizScoreGauge from '@/components/validator/WizScoreGauge';
import { supabase } from '@/integrations/supabase/client';

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

interface StakeSnapshot {
  id: string;
  total_stake: number;
  activating_stake: number;
  deactivating_stake: number;
  activating_count: number;
  deactivating_count: number;
  created_at: string;
}

const Validator = () => {
  const navigate = useNavigate();
  const [validator, setValidator] = useState<ValidatorData | null>(null);
  const [stakeAccounts, setStakeAccounts] = useState<StakeAccounts | null>(null);
  const [stakes, setStakes] = useState<any[]>([]);
  const [cluster, setCluster] = useState<ClusterStats | null>(null);
  const [jitoRank, setJitoRank] = useState<number | null>(null);
  const [epochHistory, setEpochHistory] = useState<EpochStake[]>([]);
  const [snapshots, setSnapshots] = useState<StakeSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'stakers' | 'details'>('overview');

  const fetchData = async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
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
        setEpochHistory(sorted.slice(0, 11));
      }

      if (jitoData?.validators && Array.isArray(jitoData.validators)) {
        const sorted = [...jitoData.validators]
          .filter((v: any) => v.active_stake > 0)
          .sort((a: any, b: any) => b.active_stake - a.active_stake);
        const idx = sorted.findIndex((v: any) => v.vote_account === VOTE_ACCOUNT);
        if (idx !== -1) setJitoRank(idx + 1);
      }

      // Fetch stake snapshots from DB
      const { data: snapshotData } = await supabase
        .from('stake_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(48);

      if (snapshotData) setSnapshots(snapshotData as StakeSnapshot[]);
    } catch (err: any) {
      console.error('Failed to fetch validator data:', err);
      setError(err.message || 'Failed to load validator data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Live epoch countdown
  const [epochRemaining, setEpochRemaining] = useState({ h: 0, m: 0, s: 0, progress: 0, elapsed: 0 });

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!validator?.epoch_slot_height) return;
    const SLOTS_PER_EPOCH = 432000;
    const SLOT_DURATION_MS = 400;
    const initialSlot = validator.epoch_slot_height;
    const fetchedAt = Date.now();

    const tick = () => {
      const elapsedSinceFetch = Date.now() - fetchedAt;
      const estimatedSlot = initialSlot + Math.floor(elapsedSinceFetch / SLOT_DURATION_MS);
      const capped = Math.min(estimatedSlot, SLOTS_PER_EPOCH);
      const remaining = (SLOTS_PER_EPOCH - capped) * SLOT_DURATION_MS;
      setEpochRemaining({
        h: Math.floor(remaining / 3600000),
        m: Math.floor((remaining % 3600000) / 60000),
        s: Math.floor((remaining % 60000) / 1000),
        progress: (capped / SLOTS_PER_EPOCH) * 100,
        elapsed: capped,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [validator?.epoch_slot_height]);

  const v = validator;
  const netDelta = stakeAccounts
    ? (stakeAccounts.activating?.amount || 0) - (stakeAccounts.deactivating?.amount || 0)
    : 0;

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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate snapshot deltas for the activity feed
  const snapshotDeltas = snapshots.length > 1
    ? snapshots.slice(0, -1).map((current, i) => {
        const prev = snapshots[i + 1];
        return {
          time: current.created_at,
          totalStake: current.total_stake,
          delta: current.total_stake - prev.total_stake,
          activating: current.activating_stake,
          deactivating: current.deactivating_stake,
        };
      }).filter(s => s.delta !== 0)
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {v?.image && <img src={v.image} alt="" className="w-12 h-12 rounded-full ring-2 ring-border/50" />}
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-foreground">{v?.name || 'OmegaNode Validator'}</h1>
                    {!v?.delinquent && v && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    )}
                  </div>
                  {v && (
                    <div className="flex items-center gap-2 mt-1">
                      {jitoRank && (
                        <span className="text-[11px] font-mono font-medium text-purple-400 bg-purple-500/10 rounded-full px-2.5 py-0.5">
                          Jito #{jitoRank}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/30 rounded-full px-2.5 py-0.5">
                        SW #{v.rank}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        v{v.version} · {v.ip_city}, {v.ip_country}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <RefreshCw className={`w-3 h-3 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Auto-refreshes every 20s'}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive mb-6 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              {error} <button onClick={() => fetchData()} className="underline ml-1">retry</button>
            </div>
          )}

          {loading && !v ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-muted/20 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : v ? (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 mb-8 bg-muted/20 rounded-lg p-1 w-fit">
                {tabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-sm capitalize px-5 py-2 rounded-md transition-all font-medium ${
                      activeTab === tab
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Primary metrics - large cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card border-border/40">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Stake</span>
                        </div>
                        <p className="text-3xl font-bold font-mono text-foreground">◎ {fmt(v.activated_stake)}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{(v.stake_ratio || 0).toFixed(4)}% of network</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border/40">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">True APY</span>
                        </div>
                        <p className="text-3xl font-bold font-mono text-emerald-400">{v.total_apy.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Base {v.staking_apy?.toFixed(2)}% + Jito {v.jito_apy?.toFixed(2)}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border/40">
                      <CardContent className="p-6 flex items-center justify-center">
                        <WizScoreGauge score={v.wiz_score} size={140} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Epoch Progress - Live */}
                  <Card className="bg-card border-border/40">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Epoch {v.epoch}</span>
                        </div>
                        <span className="text-sm font-mono text-foreground tabular-nums">
                          {String(epochRemaining.h).padStart(2, '0')}:{String(epochRemaining.m).padStart(2, '0')}:{String(epochRemaining.s).padStart(2, '0')}
                          <span className="text-muted-foreground ml-1.5 text-xs">remaining</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-muted/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000"
                          style={{ width: `${epochRemaining.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[11px] font-mono text-muted-foreground/60">{epochRemaining.progress.toFixed(2)}%</span>
                        <span className="text-[11px] font-mono text-muted-foreground/60">
                          {fmt(epochRemaining.elapsed)} / 432,000 slots
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: Zap, label: 'Commission', value: `${v.commission}%`, sub: `Jito ${(v.jito_commission_bps / 100).toFixed(0)}%`, iconColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
                      { icon: Activity, label: 'Skip Rate', value: `${v.skip_rate.toFixed(2)}%`, sub: cluster ? `avg ${cluster.avg_skip_rate.toFixed(2)}%` : '', iconColor: 'text-orange-400', bgColor: 'bg-orange-500/10' },
                      { icon: Shield, label: 'Vote Success', value: `${v.vote_success.toFixed(1)}%`, sub: '', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
                      { icon: Server, label: 'Uptime', value: `${v.uptime.toFixed(2)}%`, sub: '', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10' },
                    ].map(m => (
                      <Card key={m.label} className="bg-card border-border/40">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-md ${m.bgColor} flex items-center justify-center`}>
                              <m.icon className={`w-3 h-3 ${m.iconColor}`} />
                            </div>
                            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</span>
                          </div>
                          <p className="text-xl font-bold font-mono text-foreground">{m.value}</p>
                          {m.sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">{m.sub}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Epoch Stake Change - Current */}
                  {stakeAccounts && (
                    <Card className="bg-card border-border/40">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Activity className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">Epoch {v.epoch} Stake Movement</span>
                              <span className="text-xs text-muted-foreground block">Current epoch changes</span>
                            </div>
                          </div>
                          <span className={`text-2xl font-bold font-mono ${netDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {netDelta >= 0 ? '+' : ''}{fmt(netDelta)} ◎
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs font-medium text-emerald-400">Activating</span>
                            </div>
                            <p className="text-lg font-bold font-mono text-emerald-400">+{fmt(stakeAccounts.activating.amount)} ◎</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{stakeAccounts.activating.count} accounts</p>
                          </div>
                          <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-4">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-xs font-medium text-red-400">Deactivating</span>
                            </div>
                            <p className="text-lg font-bold font-mono text-red-400">-{fmt(stakeAccounts.deactivating.amount)} ◎</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{stakeAccounts.deactivating.count} accounts</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}


                  {/* Epoch History */}
                  {epochDeltas.length > 0 && (
                    <Card className="bg-card border-border/40 overflow-hidden">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b border-border/20">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">Epoch History</span>
                              <span className="text-xs text-muted-foreground block">Last {epochDeltas.length} epochs</span>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y divide-border/10">
                          {epochDeltas.map(e => {
                            const maxDelta = Math.max(...epochDeltas.map(d => Math.abs(d.delta)));
                            const barWidth = maxDelta > 0 ? (Math.abs(e.delta) / maxDelta) * 100 : 0;
                            return (
                              <div key={e.epoch} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/5 transition-colors">
                                <span className="text-xs font-mono text-muted-foreground/50 w-16 flex-shrink-0">#{e.epoch}</span>
                                <span className="text-sm font-mono text-muted-foreground w-28 flex-shrink-0">◎ {fmt(e.stake)}</span>
                                <div className="flex-1 h-5 rounded bg-muted/10 overflow-hidden relative">
                                  <div
                                    className={`h-full rounded transition-all ${e.delta >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                                  />
                                </div>
                                <div className="flex items-center gap-2 w-32 justify-end flex-shrink-0">
                                  {e.delta > 0 ? (
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : e.delta < 0 ? (
                                    <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                  ) : (
                                    <Minus className="w-3.5 h-3.5 text-muted-foreground/30" />
                                  )}
                                  <span className={`text-sm font-mono font-semibold ${
                                    e.delta > 0 ? 'text-emerald-400' : e.delta < 0 ? 'text-red-400' : 'text-muted-foreground/40'
                                  }`}>
                                    {e.delta > 0 ? '+' : ''}{fmt(e.delta)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cluster comparison */}
                  {cluster && (
                    <Card className="bg-card border-border/40 overflow-hidden">
                      <CardContent className="p-0">
                        <div className="px-6 py-4 border-b border-border/20">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-foreground">vs Cluster Average</span>
                              <span className="text-xs text-muted-foreground block">How we compare to the network</span>
                            </div>
                          </div>
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
                              <div key={m.label} className="flex items-center justify-between px-6 py-3.5">
                                <span className="text-sm text-muted-foreground">{m.label}</span>
                                <div className="flex items-center gap-4 font-mono text-sm">
                                  <span className="text-muted-foreground/40 w-16 text-right">{m.avg.toFixed(2)}%</span>
                                  <span className={`font-semibold ${better ? 'text-emerald-400' : 'text-orange-400'}`}>{m.val.toFixed(2)}%</span>
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
                </div>
              )}

              {/* Stakers */}
              {activeTab === 'stakers' && (
                <Card className="bg-card border-border/40">
                  <CardContent className="p-6">
                    <TopStakers stakes={stakes} totalStake={v.activated_stake} />
                  </CardContent>
                </Card>
              )}

              {/* Details */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Performance Stats */}
                  <Card className="bg-card border-border/40 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="px-6 py-4 border-b border-border/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Performance</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border/10">
                        {[
                          { l: 'Epoch Credits', v: fmt(v.epoch_credits || 0) },
                          { l: 'Credit Ratio', v: `${(v.credit_ratio || 0).toFixed(4)}%` },
                          { l: 'Skip Rate', v: `${v.skip_rate.toFixed(2)}%` },
                          { l: 'Leader Slots', v: fmt(v.leader_slots || 0) },
                          { l: 'Skipped Slots', v: fmt(v.skipped_slots || 0) },
                          { l: 'Vote Success', v: `${v.vote_success.toFixed(2)}%` },
                          { l: 'Uptime', v: `${v.uptime.toFixed(2)}%` },
                        ].map(item => (
                          <div key={item.l} className="flex items-center justify-between px-6 py-3.5">
                            <span className="text-sm text-muted-foreground">{item.l}</span>
                            <span className="text-sm text-foreground font-mono">{item.v}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Commission & Rewards */}
                  <Card className="bg-card border-border/40 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="px-6 py-4 border-b border-border/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Commission & Rewards</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border/10">
                        {[
                          { l: 'Validator Commission', v: `${v.commission}%` },
                          { l: 'Jito MEV Commission', v: `${(v.jito_commission_bps / 100).toFixed(0)}%` },
                          { l: 'Staking APY', v: `${v.staking_apy?.toFixed(2) || '—'}%` },
                          { l: 'Jito MEV APY', v: `${v.jito_apy?.toFixed(2) || '—'}%` },
                          { l: 'Total True APY', v: `${v.total_apy?.toFixed(2) || '—'}%` },
                          { l: 'Jito MEV', v: v.is_jito ? 'Enabled' : 'Disabled' },
                        ].map(item => (
                          <div key={item.l} className="flex items-center justify-between px-6 py-3.5">
                            <span className="text-sm text-muted-foreground">{item.l}</span>
                            <span className="text-sm text-foreground font-mono">{item.v}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Infrastructure */}
                  <Card className="bg-card border-border/40 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="px-6 py-4 border-b border-border/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Server className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Infrastructure</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border/10">
                        {[
                          { l: 'Data Center', v: `${v.ip_city}, ${v.ip_country}` },
                          { l: 'ASN', v: `${v.asn}${v.ip_org ? ` — ${v.ip_org}` : ''}` },
                          { l: 'ASN Concentration', v: `${(v.asn_concentration || 0).toFixed(2)}%` },
                          { l: 'City Concentration', v: `${(v.city_concentration || 0).toFixed(2)}%` },
                          { l: 'Version', v: v.version },
                          { l: 'Withdraw Authority Score', v: `${v.withdraw_authority_score || 0}/4` },
                        ].map(item => (
                          <div key={item.l} className="flex items-center justify-between px-6 py-3.5">
                            <span className="text-sm text-muted-foreground">{item.l}</span>
                            <span className="text-sm text-foreground font-mono">{item.v}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Identity */}
                  <Card className="bg-card border-border/40 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="px-6 py-4 border-b border-border/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">Identity & Accounts</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border/10">
                        {[
                          { l: 'Vote Account', v: v.vote_identity, mono: true },
                          { l: 'Identity', v: v.identity, mono: true },
                          { l: 'Wiz Score', v: `${(v.wiz_score / 10).toFixed(1)} / 10` },
                          { l: 'StakeWiz Rank', v: `#${v.rank}` },
                          { l: 'Jito Rank', v: jitoRank ? `#${jitoRank}` : '—' },
                          { l: 'Stake Share', v: `${(v.stake_ratio || 0).toFixed(4)}%` },
                          { l: 'First Epoch', v: `${v.first_epoch_with_stake}` },
                        ].map(item => (
                          <div key={item.l} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 gap-1">
                            <span className="text-sm text-muted-foreground">{item.l}</span>
                            <span className={`text-sm text-foreground font-mono break-all ${(item as any).mono ? 'text-xs' : ''}`}>{item.v}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* External Links */}
                  <Card className="bg-card border-border/40">
                    <CardContent className="p-4 flex flex-wrap gap-3">
                      {[
                        { label: 'StakeWiz', url: `https://stakewiz.com/validator/${VOTE_ACCOUNT}` },
                        { label: 'Jito', url: `https://www.jito.network/validator/${VOTE_ACCOUNT}/` },
                        { label: 'Solana Beach', url: `https://solanabeach.io/validator/${VOTE_ACCOUNT}` },
                        ...(v.website ? [{ label: 'Website', url: v.website }] : []),
                      ].map(link => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 bg-muted/20 rounded-lg px-3 py-2"
                        >
                          {link.label} <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </CardContent>
                  </Card>
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
