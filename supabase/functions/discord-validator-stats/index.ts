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
      { key: 'last_validator_state', value: state, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
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

async function postEpochReport(validator: any, stakeAccounts: any, clusterStats: any, previousStake: number | undefined) {
  const totalStakeSol = validator.activated_stake || 0;
  
  // Calculate epoch delta from previous state if available
  const epochDelta = previousStake != null ? totalStakeSol - previousStake : 0;
  const deltaSign = epochDelta >= 0 ? '+' : '';
  const deltaEmoji = epochDelta > 0 ? '📈' : epochDelta < 0 ? '📉' : '➡️';

  // Parse activating/deactivating from stake accounts response
  const activatingSOL = sumStakeAccounts(stakeAccounts?.activating);
  const deactivatingSOL = sumStakeAccounts(stakeAccounts?.deactivating);
  const activatingCount = countStakeAccounts(stakeAccounts?.activating);
  const deactivatingCount = countStakeAccounts(stakeAccounts?.deactivating);

  const wizScore = validator.wiz_score;
  const wizDisplay = wizScore != null ? `${(wizScore / 10).toFixed(1)} / 10` : 'N/A';
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
  const statusColor = delinquent ? 0xEF4444 : 0x5B4EE4;
  const statusText = delinquent ? '🔴 DELINQUENT' : '🟢 Active';
  const epoch = validator.epoch;

  const embed = {
    title: `⚡ OmegaNode Validator — Epoch ${epoch}`,
    url: `https://omeganodes.io/epochreport/${epoch}`,
    color: statusColor,
    fields: [
      {
        name: 'Status',
        value: statusText,
        inline: true,
      },
      {
        name: 'Total Stake',
        value: `◎ ${fmt(totalStakeSol)}`,
        inline: true,
      },
      {
        name: 'Epoch Delta',
        value: `${deltaEmoji} ${deltaSign}◎ ${fmt(epochDelta)}`,
        inline: true,
      },
      {
        name: 'Incoming',
        value: `+◎ ${fmt(activatingSOL)} (${activatingCount})`,
        inline: true,
      },
      {
        name: 'Leaving',
        value: `-◎ ${fmt(deactivatingSOL)} (${deactivatingCount})`,
        inline: true,
      },
      {
        name: 'Wiz Score',
        value: wizDisplay,
        inline: true,
      },
      {
        name: 'Rank',
        value: `#${validator.rank || 'N/A'}`,
        inline: true,
      },
      {
        name: 'Commission',
        value: commission != null ? `${commission}%` : 'N/A',
        inline: true,
      },
      {
        name: 'True APY',
        value: `${pct(totalApy)}\n↳ ${pct(stakingApy)} + ${pct(jitoApy)} MEV`,
        inline: true,
      },
      {
        name: 'Skip Rate',
        value: `${pct(skipRate)}\n↳ cluster: ${pct(clusterSkipRate)}`,
        inline: true,
      },
      {
        name: 'Vote Success',
        value: `${pct(voteSuccess)}\n↳ cluster: ${pct(clusterVoteSuccess)}`,
        inline: true,
      },
      {
        name: 'Version',
        value: `\`${version}\``,
        inline: true,
      },
      {
        name: 'Data Center',
        value: datacenter,
        inline: true,
      },
      {
        name: 'Vote Account',
        value: `\`${VOTE_ACCOUNT.slice(0, 8)}…${VOTE_ACCOUNT.slice(-8)}\``,
        inline: true,
      },
    ],
    footer: {
      text: `OmegaNode • Epoch ${epoch} • Uptime ${pct(validator.uptime)}`,
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
    body: JSON.stringify({
      content: content || undefined,
      embeds: [embed],
    }),
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
      { name: 'Previous', value: `◎ ${fmt(previousStake)}`, inline: true },
      { name: 'Current', value: `◎ ${fmt(currentStake)}`, inline: true },
      { name: 'Change', value: `${deltaSign}◎ ${fmt(delta)}`, inline: true },
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
      const nextEntry = sorted.find((e: any) => e.epoch === targetEpoch + 1);

      if (!targetEntry) throw new Error(`Epoch ${targetEpoch} not found in history`);

      const stakeAtEpoch = targetEntry.stake || 0;
      const delta = nextEntry ? nextEntry.stake - targetEntry.stake : 0;

      // Override validator fields for the historical report
      const historicalValidator = { ...validator, epoch: targetEpoch, activated_stake: stakeAtEpoch };
      await postEpochReport(historicalValidator, null, clusterStats, stakeAtEpoch - delta);

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

    if (!currentEpoch) {
      throw new Error('Could not determine current epoch from API');
    }

    const actions: string[] = [];

    const epochChanged = !lastState.epoch || lastState.epoch !== currentEpoch;
    if (force || epochChanged) {
      const [stakeAccounts, clusterStats] = await Promise.all([
        fetchJSON(`https://api.stakewiz.com/validator_epoch_stake_accounts/${VOTE_ACCOUNT}`),
        fetchJSON(`https://api.stakewiz.com/cluster_stats`),
      ]);
      await postEpochReport(validator, stakeAccounts, clusterStats, lastState.stake);
      actions.push(`epoch_report:${currentEpoch}`);
      console.log(`Epoch report posted for epoch ${currentEpoch}`);
    }

    if (!epochChanged && lastState.stake != null) {
      const stakeChanged = Math.abs(currentStake - lastState.stake) >= 1;
      if (stakeChanged) {
        await postStakeChangeAlert(currentStake, lastState.stake, currentEpoch);
        actions.push(`stake_change:${lastState.stake}->${currentStake}`);
        console.log(`Stake change alert: ${lastState.stake} → ${currentStake}`);
      }
    }

    await saveLastState(supabase, {
      epoch: currentEpoch,
      stake: currentStake,
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
