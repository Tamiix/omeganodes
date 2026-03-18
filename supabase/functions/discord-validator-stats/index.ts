import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_VALIDATOR_WEBHOOK_URL') || '';
const VOTE_ACCOUNT = 'EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6';

async function fetchJSON(url: string) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`API ${url} returned ${res.status}`);
  return res.json();
}

function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return `${n.toFixed(2)}%`;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

async function getLastState(supabase: any): Promise<{ epoch?: number; stake?: number }> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'last_validator_state')
    .maybeSingle();
  return data?.value || {};
}

async function saveLastState(supabase: any, state: { epoch: number; stake: number; posted_at: string }) {
  await supabase
    .from('app_settings')
    .upsert(
      {
        key: 'last_validator_state',
        value: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
}

async function postEpochReport(validator: any, stakeAccounts: any, clusterStats: any) {
  const totalStakeSol = validator.activated_stake || 0;
  const activatingSOL = stakeAccounts?.activating?.amount || 0;
  const deactivatingSOL = stakeAccounts?.deactivating?.amount || 0;
  const netDelta = activatingSOL - deactivatingSOL;
  const deltaSign = netDelta >= 0 ? '+' : '';
  const deltaEmoji = netDelta > 0 ? '📈' : netDelta < 0 ? '📉' : '➡️';

  const wizScore = validator.wiz_score;
  const commission = validator.commission;
  const skipRate = validator.skip_rate ?? validator.wiz_skip_rate;
  const clusterSkipRate = clusterStats?.avg_skip_rate;
  const voteSuccess = validator.vote_success;
  const clusterVoteSuccess = clusterStats?.avg_credit_ratio;

  const stakingApy = validator.staking_apy || validator.apy_estimate;
  const jitoApy = validator.jito_apy;
  const totalApy = validator.total_apy || ((stakingApy || 0) + (jitoApy || 0));

  const version = validator.version || 'Unknown';
  const datacenter = validator.ip_city && validator.ip_country
    ? `${validator.ip_city}, ${validator.ip_country} (${validator.ip_org || validator.ip_asn || ''})`
    : 'Unknown';
  const delinquent = validator.delinquent === true;

  const statusColor = delinquent ? 0xEF4444 : 0x22C55E;
  const statusText = delinquent ? '🔴 DELINQUENT' : '🟢 Active';

  // Wiz score is 0-100 from API, display as X.X / 10
  const wizDisplay = wizScore != null ? `${(wizScore / 10).toFixed(1)} / 10` : 'N/A';

  const overviewLines = [
    `**Status:** ${statusText}`,
    `**Total Stake:** ◎ ${formatNumber(totalStakeSol)}`,
    `**Epoch Delta:** ${deltaEmoji} ${deltaSign}◎ ${formatNumber(netDelta)}`,
    `  ↳ Incoming: +◎ ${formatNumber(activatingSOL)} | Leaving: -◎ ${formatNumber(deactivatingSOL)}`,
    `**Wiz Score:** ${wizDisplay}`,
    `**Rank:** #${validator.rank || 'N/A'}`,
    `**Commission:** ${commission != null ? `${commission}%` : 'N/A'}`,
  ];

  const performanceLines = [
    `**True APY:** ${formatPct(totalApy)}`,
    `  ↳ Staking: ${formatPct(stakingApy)} + Jito MEV: ${formatPct(jitoApy)}`,
    `**Skip Rate:** ${formatPct(skipRate)} (cluster avg: ${formatPct(clusterSkipRate)})`,
    `**Vote Success:** ${formatPct(voteSuccess)} (cluster avg: ${formatPct(clusterVoteSuccess)})`,
  ];

  const technicalLines = [
    `**Version:** \`${version}\``,
    `**Data Center:** ${datacenter}`,
    `**Vote Account:** \`${VOTE_ACCOUNT.slice(0, 8)}...${VOTE_ACCOUNT.slice(-8)}\``,
  ];

  const embed = {
    title: `⚡ OmegaNode Validator Report — Epoch ${validator.epoch}`,
    color: statusColor,
    fields: [
      { name: '📊 Overview', value: overviewLines.join('\n'), inline: false },
      { name: '🏆 Performance', value: performanceLines.join('\n'), inline: false },
      { name: '🔧 Technical', value: technicalLines.join('\n'), inline: false },
    ],
    footer: {
      text: `OmegaNode Validator • Epoch ${validator.epoch} • Uptime ${formatPct(validator.uptime)}`,
    },
    timestamp: new Date().toISOString(),
  };

  let content = '';
  if (delinquent) {
    content = '⚠️ **VALIDATOR DELINQUENT** — Immediate attention required!\n||<@404356986340114442> <@545046451219070980>||';
  }

  const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content || undefined, embeds: [embed] }),
  });

  if (!discordRes.ok) {
    const errText = await discordRes.text();
    console.error('Discord webhook error:', errText);
    throw new Error(`Discord webhook failed: ${discordRes.status}`);
  }
}

async function postStakeChangeAlert(currentStake: number, previousStake: number, epoch: number) {
  const delta = currentStake - previousStake;
  const deltaSign = delta >= 0 ? '+' : '';
  const emoji = delta > 0 ? '📈' : '📉';

  const embed = {
    title: `${emoji} Stake Change Detected`,
    color: delta > 0 ? 0x22C55E : 0xF59E0B,
    fields: [
      {
        name: 'Stake Update',
        value: [
          `**Previous:** ◎ ${formatNumber(previousStake)}`,
          `**Current:** ◎ ${formatNumber(currentStake)}`,
          `**Change:** ${deltaSign}◎ ${formatNumber(delta)}`,
          `**Epoch:** ${epoch}`,
        ].join('\n'),
        inline: false,
      },
    ],
    footer: { text: 'OmegaNode Validator • Stake Monitor' },
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
    try {
      const body = await req.json();
      force = body?.force === true;
    } catch {
      // No body or not JSON
    }

    const supabase = getSupabaseClient();
    const lastState = await getLastState(supabase);

    // Fetch validator data
    const validator = await fetchJSON(`https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`);
    const currentEpoch = validator.epoch;
    const currentStake = validator.activated_stake || 0;

    if (!currentEpoch) {
      throw new Error('Could not determine current epoch from API');
    }

    const actions: string[] = [];

    // Check for epoch change → full report
    const epochChanged = !lastState.epoch || lastState.epoch !== currentEpoch;
    if (force || epochChanged) {
      const [stakeAccounts, clusterStats] = await Promise.all([
        fetchJSON(`https://api.stakewiz.com/validator_epoch_stake_accounts/${VOTE_ACCOUNT}`),
        fetchJSON(`https://api.stakewiz.com/cluster_stats`),
      ]);
      await postEpochReport(validator, stakeAccounts, clusterStats);
      actions.push(`epoch_report:${currentEpoch}`);
      console.log(`Epoch report posted for epoch ${currentEpoch}`);
    }

    // Check for stake change → stake alert (only if not already posting epoch report)
    if (!epochChanged && lastState.stake != null) {
      // Round to avoid noise from tiny fluctuations (< 1 SOL)
      const stakeChanged = Math.abs(currentStake - lastState.stake) >= 1;
      if (stakeChanged) {
        await postStakeChangeAlert(currentStake, lastState.stake, currentEpoch);
        actions.push(`stake_change:${lastState.stake}->${currentStake}`);
        console.log(`Stake change alert: ${lastState.stake} → ${currentStake}`);
      }
    }

    // Save current state
    await saveLastState(supabase, {
      epoch: currentEpoch,
      stake: currentStake,
      posted_at: new Date().toISOString(),
    });

    const skipped = actions.length === 0;
    if (skipped) {
      console.log(`No changes detected (epoch ${currentEpoch}, stake ◎${formatNumber(currentStake)})`);
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
