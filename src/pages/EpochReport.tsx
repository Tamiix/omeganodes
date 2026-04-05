import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Shield, Cpu, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const VOTE_ACCOUNT = 'EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6';

interface EpochData {
  epoch: number;
  stake: number;
  delta: number;
}

interface ValidatorData {
  commission?: number;
  version?: string;
  ip_city?: string;
  ip_country?: string;
  ip_org?: string;
  wiz_score?: number;
  rank?: number;
  staking_apy?: number;
  apy_estimate?: number;
  jito_apy?: number;
  total_apy?: number;
  skip_rate?: number;
  wiz_skip_rate?: number;
  vote_success?: number;
  uptime?: number;
  delinquent?: boolean;
  activated_stake?: number;
  epoch?: number;
}

const EpochReport = () => {
  const { epochNumber } = useParams<{ epochNumber: string }>();
  const epoch = Number(epochNumber);
  const [epochData, setEpochData] = useState<EpochData | null>(null);
  const [validator, setValidator] = useState<ValidatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, valRes] = await Promise.all([
          supabase.functions.invoke('validator-stats', { body: {}, headers: {}, method: 'GET' } as any),
          supabase.functions.invoke('validator-stats', { body: {}, headers: {}, method: 'GET' } as any),
        ]);

        // Fetch epoch history
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validator-stats?endpoint=epoch_history`;
        const valUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validator-stats?endpoint=validator`;

        const [epochRes, validatorRes] = await Promise.all([
          fetch(url, { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }),
          fetch(valUrl, { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }),
        ]);

        if (!epochRes.ok || !validatorRes.ok) throw new Error('Failed to fetch data');

        const epochHistory = await epochRes.json();
        const valData = await validatorRes.json();

        setValidator(valData);

        if (Array.isArray(epochHistory)) {
          const sorted = [...epochHistory].sort((a: any, b: any) => b.epoch - a.epoch);
          const entry = sorted.find((e: any) => e.epoch === epoch);
          const nextEntry = sorted.find((e: any) => e.epoch === epoch + 1);

          if (entry) {
            setEpochData({
              epoch: entry.epoch,
              stake: entry.stake,
              delta: nextEntry ? nextEntry.stake - entry.stake : 0,
            });
          } else {
            setError(`Epoch ${epoch} not found`);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load epoch data');
      } finally {
        setLoading(false);
      }
    };

    if (!isNaN(epoch)) fetchData();
    else { setError('Invalid epoch number'); setLoading(false); }
  }, [epoch]);

  const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });
  const pct = (n: number | undefined | null) => n != null ? `${n.toFixed(2)}%` : 'N/A';

  const v = validator;
  const wizScore = v?.wiz_score != null ? (v.wiz_score / 10).toFixed(1) : null;
  const totalApy = v?.total_apy || ((v?.staking_apy || v?.apy_estimate || 0) + (v?.jito_apy || 0));
  const stakingApy = v?.staking_apy || v?.apy_estimate;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !epochData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Epoch Not Found</h1>
        <p className="text-muted-foreground">{error || 'No data available for this epoch'}</p>
        <Link to="/validator" className="text-primary hover:underline">← Back to Validator</Link>
      </div>
    );
  }

  const isGain = epochData.delta >= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link to="/validator" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Validator
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Epoch {epochData.epoch}
            </h1>
            <Badge variant={isGain ? "default" : "destructive"} className="text-sm px-3 py-1">
              {isGain ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {isGain ? '+' : ''}{fmt(epochData.delta)} SOL
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">OmegaNode Validator Report</p>
        </div>

        {/* Stake Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Stake</p>
              <p className="text-2xl font-bold text-foreground">◎ {fmt(epochData.stake, 2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Epoch Delta</p>
              <p className={`text-2xl font-bold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                {isGain ? '+' : ''}{fmt(epochData.delta, 2)} SOL
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Growth</p>
              <p className={`text-2xl font-bold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                {epochData.stake > 0 ? `${((epochData.delta / (epochData.stake)) * 100).toFixed(2)}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Validator Details */}
        {v && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">True APY</span>
                  <span className="text-foreground font-medium">{pct(totalApy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staking APY</span>
                  <span className="text-foreground">{pct(stakingApy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jito MEV</span>
                  <span className="text-foreground">{pct(v.jito_apy)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skip Rate</span>
                  <span className="text-foreground">{pct(v.skip_rate ?? v.wiz_skip_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vote Success</span>
                  <span className="text-foreground">{pct(v.vote_success)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Validator Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wiz Score</span>
                  <span className="text-foreground font-medium">{wizScore ? `${wizScore} / 10` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rank</span>
                  <span className="text-foreground">#{v.rank || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="text-foreground">{v.commission != null ? `${v.commission}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="text-foreground font-mono text-xs">{v.version || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Center</span>
                  <span className="text-foreground text-xs">
                    {v.ip_city && v.ip_country ? `${v.ip_city}, ${v.ip_country}` : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Vote Account: <span className="font-mono">{VOTE_ACCOUNT.slice(0, 12)}…{VOTE_ACCOUNT.slice(-8)}</span></p>
          <p className="mt-1">
            <a href="https://stakewiz.com/validator/EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View on StakeWiz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EpochReport;
