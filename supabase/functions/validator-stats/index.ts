const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VOTE_ACCOUNT = 'EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'validator';

    let apiUrl: string;

    switch (endpoint) {
      case 'validator':
        apiUrl = `https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`;
        break;
      case 'epoch_stake_accounts':
        apiUrl = `https://api.stakewiz.com/validator_epoch_stake_accounts/${VOTE_ACCOUNT}`;
        break;
      case 'delinquencies':
        apiUrl = `https://api.stakewiz.com/validator_delinquencies/${VOTE_ACCOUNT}`;
        break;
      case 'stakes':
        apiUrl = `https://api.stakewiz.com/validator_stakes/${VOTE_ACCOUNT}`;
        break;
      case 'cluster_stats':
        apiUrl = `https://api.stakewiz.com/cluster_stats`;
        break;
      case 'jito_validators':
        apiUrl = `https://kobe.mainnet.jito.network/api/v1/validators`;
        break;
      default:
        apiUrl = `https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`;
    }

    console.log(`Fetching: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`StakeWiz API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching validator stats:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
