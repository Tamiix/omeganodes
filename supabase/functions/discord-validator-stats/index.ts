import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function formatSol(lamports: number | null | undefined): string {
  if (lamports == null) return '0';
  return (lamports / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return `${n.toFixed(2)}%`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!DISCORD_WEBHOOK_URL) {
      throw new Error('DISCORD_VALIDATOR_WEBHOOK_URL not configured');
    }

    // Fetch all data in parallel
    const [validator, stakeAccounts, clusterStats] = await Promise.all([
      fetchJSON(`https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`),
      fetchJSON(`https://api.stakewiz.com/validator_epoch_stake_accounts/${VOTE_ACCOUNT}`),
      fetchJSON(`https://api.stakewiz.com/cluster_stats`),
    ]);

    // --- Parse data (API returns SOL, not lamports) ---
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

    // --- Build embed ---
    const statusColor = delinquent ? 0xEF4444 : 0x22C55E; // red if delinquent, green otherwise
    const statusText = delinquent ? '🔴 DELINQUENT' : '🟢 Active';

    const overviewLines = [
      `**Status:** ${statusText}`,
      `**Total Stake:** ◎ ${formatNumber(totalStakeSol)}`,
      `**Epoch Delta:** ${deltaEmoji} ${deltaSign}◎ ${formatNumber(netDelta)}`,
      `  ↳ Incoming: +◎ ${formatNumber(activatingSOL)} | Leaving: -◎ ${formatNumber(deactivatingSOL)}`,
      `**Wiz Score:** ${formatNumber(wizScore, 1)} / 10`,
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
      title: '⚡ OmegaNode Validator Report',
      color: statusColor,
      fields: [
        { name: '📊 Overview', value: overviewLines.join('\n'), inline: false },
        { name: '🏆 Performance', value: performanceLines.join('\n'), inline: false },
        { name: '🔧 Technical', value: technicalLines.join('\n'), inline: false },
      ],
      footer: {
        text: `OmegaNode Validator • Epoch ${validator.epoch_credits ? 'active' : 'N/A'}`,
      },
      timestamp: new Date().toISOString(),
    };

    // Alert content if delinquent
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

    console.log('Validator stats posted to Discord');

    return new Response(
      JSON.stringify({ success: true }),
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
