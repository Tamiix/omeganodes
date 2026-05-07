import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_VALIDATOR_WEBHOOK_URL') || '';
const DISCORD_LINK_WEBHOOK_URL = Deno.env.get('DISCORD_VALIDATOR_LINK_WEBHOOK_URL') || '';
const VOTE_ACCOUNT = 'EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6';

async function fetchJSON(url: string) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`API ${url} returned ${res.status}`);
  return res.json();
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function pct(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return `${n.toFixed(2)}%`;
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

interface ValidatorState {
  epoch?: number;
  stake?: number;
  // Cached validator metrics for accurate epoch reports
  wiz_score?: number;
  rank?: number;
  commission?: number;
  staking_apy?: number;
  jito_apy?: number;
  total_apy?: number;
  skip_rate?: number;
  vote_success?: number;
  uptime?: number;
  version?: string;
  ip_city?: string;
  ip_country?: string;
  ip_org?: string;
  ip_asn?: string;
  delinquent?: boolean;
}

async function getLastState(supabase: any): Promise<ValidatorState> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'last_validator_state')
    .maybeSingle();
  return data?.value || {};
}

async function saveLastState(supabase: any, state: ValidatorState & { posted_at: string }) {
  await supabase
    .from('app_settings')
    .upsert(
      { key: 'last_validator_state', value: state, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
}

/** Extract the fields we want to cache from the validator API response */
function extractValidatorMetrics(validator: any): Omit<ValidatorState, 'epoch' | 'stake'> {
  return {
    wiz_score: validator.wiz_score,
    rank: validator.rank,
    commission: validator.commission,
    staking_apy: validator.staking_apy || validator.apy_estimate,
    jito_apy: validator.jito_apy,
    total_apy: validator.total_apy || ((validator.staking_apy || validator.apy_estimate || 0) + (validator.jito_apy || 0)),
    skip_rate: validator.skip_rate ?? validator.wiz_skip_rate,
    vote_success: validator.vote_success,
    uptime: validator.uptime,
    version: validator.version,
    ip_city: validator.ip_city,
    ip_country: validator.ip_country,
    ip_org: validator.ip_org,
    ip_asn: validator.ip_asn,
    delinquent: validator.delinquent === true,
  };
}

function sumStakeAccounts(accounts: any): number {
  if (!accounts) return 0;
  if (typeof accounts === 'number') return accounts;
  if (accounts.amount != null) return accounts.amount;
  if (Array.isArray(accounts)) {
    return accounts.reduce((sum: number, a: any) => sum + (a.stake || a.lamports || a.amount || 0), 0);
  }
  return 0;
}

function countStakeAccounts(accounts: any): number {
  if (!accounts) return 0;
  if (typeof accounts === 'number') return accounts;
  if (accounts.count != null) return accounts.count;
  if (Array.isArray(accounts)) return accounts.length;
  return 0;
}

/**
 * Build and post the epoch report embed.
 * `reportData` contains the metrics to display — either from cached state (epoch change)
 * or from the live API (force/manual).
 */
async function postEpochReport(
  reportData: {
    epoch: number;
    totalStakeSol: number;
    previousStake?: number;
    wiz_score?: number;
    rank?: number;
    commission?: number;
    staking_apy?: number;
    jito_apy?: number;
    total_apy?: number;
    skip_rate?: number;
    vote_success?: number;
    uptime?: number;
    version?: string;
    ip_city?: string;
    ip_country?: string;
    ip_org?: string;
    ip_asn?: string;
    delinquent?: boolean;
  },
  stakeAccounts: any,
  clusterStats: any,
) {
  const { epoch, totalStakeSol, previousStake } = reportData;

  const epochDelta = previousStake != null ? totalStakeSol - previousStake : 0;
  const deltaSign = epochDelta > 0 ? '+' : epochDelta < 0 ? '-' : '';
  const deltaEmoji = epochDelta > 0 ? '📈' : epochDelta < 0 ? '📉' : '➡️';

  const activatingSOL = sumStakeAccounts(stakeAccounts?.activating);
  const deactivatingSOL = sumStakeAccounts(stakeAccounts?.deactivating);
  const activatingCount = countStakeAccounts(stakeAccounts?.activating);
  const deactivatingCount = countStakeAccounts(stakeAccounts?.deactivating);

  const wizScore = reportData.wiz_score;
  const wizDisplay = wizScore != null ? `${(wizScore / 10).toFixed(1)} / 10` : 'N/A';
  const commission = reportData.commission;
  const skipRate = reportData.skip_rate;
  const clusterSkipRate = clusterStats?.avg_skip_rate;
  const voteSuccess = reportData.vote_success;
  const clusterVoteSuccess = clusterStats?.avg_credit_ratio;
  const stakingApy = reportData.staking_apy;
  const jitoApy = reportData.jito_apy;
  const totalApy = reportData.total_apy || ((stakingApy || 0) + (jitoApy || 0));
  const version = reportData.version || 'Unknown';
  const datacenter = reportData.ip_city && reportData.ip_country
    ? `${reportData.ip_city}, ${reportData.ip_country} (${reportData.ip_org || reportData.ip_asn || ''})`
    : 'Unknown';
  const delinquent = reportData.delinquent === true;
  const statusColor = delinquent ? 0xEF4444 : 0x5B4EE4;
  const statusText = delinquent ? '🔴 DELINQUENT' : '🟢 Active';

  const embed = {
    title: `⚡ OmegaNode Validator — Epoch ${epoch}`,
    url: `https://omeganodes.io/epochreport/${epoch}`,
    color: statusColor,
    fields: [
      { name: 'Status', value: statusText, inline: true },
      { name: 'Total Stake', value: `◎ ${fmt(totalStakeSol)}`, inline: true },
      { name: 'Epoch Delta', value: `${deltaEmoji} ${deltaSign}◎ ${fmt(Math.abs(epochDelta))}`, inline: true },
      { name: 'Incoming', value: `+◎ ${fmt(activatingSOL)} (${activatingCount})`, inline: true },
      { name: 'Leaving', value: `-◎ ${fmt(deactivatingSOL)} (${deactivatingCount})`, inline: true },
      { name: 'Wiz Score', value: wizDisplay, inline: true },
      { name: 'Rank', value: `#${reportData.rank || 'N/A'}`, inline: true },
      { name: 'Commission', value: commission != null ? `${commission}%` : 'N/A', inline: true },
      { name: 'True APY', value: `${pct(totalApy)}\n↳ ${pct(stakingApy)} + ${pct(jitoApy)} MEV`, inline: true },
      { name: 'Skip Rate', value: `${pct(skipRate)}\n↳ cluster: ${pct(clusterSkipRate)}`, inline: true },
      { name: 'Vote Success', value: `${pct(voteSuccess)}\n↳ cluster: ${pct(clusterVoteSuccess)}`, inline: true },
      { name: 'Version', value: `\`${version}\``, inline: true },
      { name: 'Data Center', value: datacenter, inline: true },
      { name: 'Vote Account', value: `\`${VOTE_ACCOUNT.slice(0, 8)}…${VOTE_ACCOUNT.slice(-8)}\``, inline: true },
    ],
    footer: { text: `OmegaNode • Epoch ${epoch} • Uptime ${pct(reportData.uptime)}` },
    timestamp: new Date().toISOString(),
  };

  let content = '';
  if (delinquent) {
    content = '⚠️ **VALIDATOR DELINQUENT** — Immediate attention required!\n||<@404356986340114442> <@545046451219070980>||';
  }

  const fullPayload = JSON.stringify({ content: content || undefined, embeds: [embed] });

  // Compact link embed for second webhook
  const wizDisplay2 = wizScore != null ? `${(wizScore / 10).toFixed(1)}` : 'N/A';
  const reportUrl = `https://omeganodes.io/epochreport/${epoch}`;
  const linkEmbed = {
    title: `⚡ Epoch ${epoch} — Validator Report`,
    color: 0x5B4EE4,
    fields: [
      { name: 'Total Stake', value: `◎ ${fmt(totalStakeSol)}`, inline: true },
      { name: 'Delta', value: `${deltaEmoji} ${deltaSign}◎ ${fmt(Math.abs(epochDelta))}`, inline: true },
      { name: 'APY', value: `${pct(totalApy)}`, inline: true },
      { name: 'Wiz Score', value: `${wizDisplay2}/10`, inline: true },
      { name: 'Rank', value: `#${reportData.rank || 'N/A'}`, inline: true },
      { name: 'Commission', value: `${reportData.commission ?? 0}%`, inline: true },
      { name: '🔗 Full Report', value: `[View on OmegaNodes](${reportUrl})`, inline: false },
    ],
    footer: { text: 'OmegaNode Validator' },
    timestamp: new Date().toISOString(),
  };
  const linkPayload = JSON.stringify({ embeds: [linkEmbed] });

  const results = await Promise.allSettled([
    fetch(DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: fullPayload }),
    DISCORD_LINK_WEBHOOK_URL
      ? fetch(DISCORD_LINK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: linkPayload })
      : Promise.resolve(null),
  ]);

  const mainRes = results[0];
  if (mainRes.status === 'rejected' || (mainRes.status === 'fulfilled' && mainRes.value && !mainRes.value.ok)) {
    throw new Error('Discord main webhook failed');
  }
}

async function postStakeChangeAlert(currentStake: number, previousStake: number, epoch: number) {
  const delta = currentStake - previousStake;
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const emoji = delta > 0 ? '📈' : '📉';

  const embed = {
    title: `${emoji} Stake Change Detected`,
    color: delta > 0 ? 0x22C55E : 0xF59E0B,
    fields: [
      { name: 'Previous', value: `◎ ${fmt(previousStake)}`, inline: true },
      { name: 'Current', value: `◎ ${fmt(currentStake)}`, inline: true },
      { name: 'Change', value: `${deltaSign}◎ ${fmt(Math.abs(delta))}`, inline: true },
    ],
    footer: { text: `OmegaNode • Epoch ${epoch} • Stake Monitor` },
    timestamp: new Date().toISOString(),
  };

  const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!discordRes.ok) {
    const errText = await discordRes.text();
    console.error('Discord stake alert error:', errText);
    throw new Error(`Discord stake alert failed: ${discordRes.status}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!DISCORD_WEBHOOK_URL) {
      throw new Error('DISCORD_VALIDATOR_WEBHOOK_URL not configured');
    }

    let force = false;
    let targetEpoch: number | null = null;
    try {
      const body = await req.json();
      force = body?.force === true;
      if (body?.target_epoch) targetEpoch = Number(body.target_epoch);
    } catch {
      // No body or not JSON
    }

    // Historical epoch report mode
    if (targetEpoch) {
      const [epochHistory, validator, clusterStats] = await Promise.all([
        fetchJSON(`https://api.stakewiz.com/validator_total_stakes/${VOTE_ACCOUNT}`),
        fetchJSON(`https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`),
        fetchJSON(`https://api.stakewiz.com/cluster_stats`),
      ]);

      if (!Array.isArray(epochHistory)) throw new Error('Could not fetch epoch history');

      const sorted = [...epochHistory].sort((a: any, b: any) => b.epoch - a.epoch);
      const targetEntry = sorted.find((e: any) => e.epoch === targetEpoch);
      const prevEntry = sorted.find((e: any) => e.epoch === targetEpoch - 1);

      if (!targetEntry) throw new Error(`Epoch ${targetEpoch} not found in history`);

      const stakeAtEpoch = targetEntry.stake || 0;
      const previousStake = prevEntry?.stake;

      await postEpochReport(
        {
          epoch: targetEpoch,
          totalStakeSol: stakeAtEpoch,
          previousStake,
          ...extractValidatorMetrics(validator),
        },
        null,
        clusterStats,
      );

      return new Response(
        JSON.stringify({ success: true, actions: [`epoch_report:${targetEpoch}`], epoch: targetEpoch, stake: stakeAtEpoch }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const supabase = getSupabaseClient();
    const lastState = await getLastState(supabase);

    const validator = await fetchJSON(`https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`);
    const currentEpoch = validator.epoch;
    const currentStake = validator.activated_stake || 0;
    const currentMetrics = extractValidatorMetrics(validator);

    if (!currentEpoch) {
      throw new Error('Could not determine current epoch from API');
    }

    const actions: string[] = [];

    const epochChanged = !lastState.epoch || lastState.epoch !== currentEpoch;
    if (force || epochChanged) {
      // Stake delegated DURING epoch N activates at the boundary N→N+1.
      // StakeWiz's history endpoint records the stake at the START of each epoch,
      // so `stake[N+1] - stake[N]` = activations that happened during epoch N.
      // We label the report under epoch N (when the delegation actually occurred),
      // using stake[N+1] as the resulting total.
      // After the chain transitions from epoch X-1 → X (currentEpoch=X), we report
      // for reportEpoch = X-1, with delta = stake[X] - stake[X-1].
      const reportEpoch = epochChanged && lastState.epoch ? currentEpoch - 1 : currentEpoch;
      const stakeReadEpoch = reportEpoch + 1; // epoch whose start-of-epoch stake reflects the activations

      const [stakeAccounts, clusterStats, epochHistory] = await Promise.all([
        fetchJSON(`https://api.stakewiz.com/validator_epoch_stake_accounts/${VOTE_ACCOUNT}`),
        fetchJSON(`https://api.stakewiz.com/cluster_stats`),
        fetchJSON(`https://api.stakewiz.com/validator_total_stakes/${VOTE_ACCOUNT}`).catch(() => null),
      ]);

      // CRITICAL: When epoch just changed, use CACHED metrics from the previous poll
      // because the API now returns incomplete/zero data for the brand-new epoch.
      // For forced reports (same epoch), use fresh API data.
      const metricsForReport = (epochChanged && lastState.wiz_score != null)
        ? {
            wiz_score: lastState.wiz_score,
            rank: lastState.rank,
            commission: lastState.commission,
            staking_apy: lastState.staking_apy,
            jito_apy: lastState.jito_apy,
            total_apy: lastState.total_apy,
            skip_rate: lastState.skip_rate,
            vote_success: lastState.vote_success,
            uptime: lastState.uptime,
            version: lastState.version,
            ip_city: lastState.ip_city,
            ip_country: lastState.ip_country,
            ip_org: lastState.ip_org,
            ip_asn: lastState.ip_asn,
            delinquent: lastState.delinquent,
          }
        : currentMetrics;

      // Use authoritative historical stake values from StakeWiz so the delta is correct.
      // The history endpoint records the END-OF-EPOCH stake for each epoch.
      let reportStake = epochChanged ? (lastState.stake || currentStake) : currentStake;
      let previousStakeForReport: number | undefined = lastState.stake;

      if (Array.isArray(epochHistory) && epochHistory.length > 0) {
        const sorted = [...epochHistory].sort((a: any, b: any) => b.epoch - a.epoch);
        const reportEntry = sorted.find((e: any) => e.epoch === reportEpoch);
        const prevEntry = sorted.find((e: any) => e.epoch === reportEpoch - 1);
        if (reportEntry?.stake) reportStake = reportEntry.stake;
        if (prevEntry?.stake) previousStakeForReport = prevEntry.stake;
      }

      await postEpochReport(
        {
          epoch: reportEpoch,
          totalStakeSol: reportStake,
          previousStake: previousStakeForReport,
          ...metricsForReport,
        },
        stakeAccounts,
        clusterStats,
      );
      actions.push(`epoch_report:${reportEpoch}`);
      console.log(`Epoch report posted for epoch ${reportEpoch} stake=${reportStake} prev=${previousStakeForReport} (metrics: ${epochChanged && lastState.wiz_score != null ? 'cached' : 'live'})`);
    }

    if (!epochChanged && lastState.stake != null) {
      const stakeChanged = Math.abs(currentStake - lastState.stake) >= 1;
      if (stakeChanged) {
        await postStakeChangeAlert(currentStake, lastState.stake, currentEpoch);
        actions.push(`stake_change:${lastState.stake}->${currentStake}`);
        console.log(`Stake change alert: ${lastState.stake} → ${currentStake}`);
      }
    }

    // Save current state WITH all metrics for next epoch-change report
    await saveLastState(supabase, {
      epoch: currentEpoch,
      stake: currentStake,
      ...currentMetrics,
      posted_at: new Date().toISOString(),
    });

    const skipped = actions.length === 0;
    if (skipped) {
      console.log(`No changes detected (epoch ${currentEpoch}, stake ◎${fmt(currentStake)})`);
    }

    return new Response(
      JSON.stringify({ success: true, skipped, actions, epoch: currentEpoch, stake: currentStake }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
