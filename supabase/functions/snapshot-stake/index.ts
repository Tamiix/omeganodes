import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch current validator data and epoch stake accounts
    const [valRes, stakeRes] = await Promise.all([
      fetch(`https://api.stakewiz.com/validator/${VOTE_ACCOUNT}`, { headers: { Accept: 'application/json' } }),
      fetch(`https://api.stakewiz.com/validator_epoch_stake_accounts/${VOTE_ACCOUNT}`, { headers: { Accept: 'application/json' } }),
    ]);

    if (!valRes.ok || !stakeRes.ok) {
      throw new Error('Failed to fetch from StakeWiz');
    }

    const valData = await valRes.json();
    const stakeData = await stakeRes.json();

    const snapshot = {
      total_stake: valData.activated_stake || 0,
      activating_stake: stakeData.activating?.amount || 0,
      deactivating_stake: stakeData.deactivating?.amount || 0,
      activating_count: stakeData.activating?.count || 0,
      deactivating_count: stakeData.deactivating?.count || 0,
      stake_accounts_count: valData.num_stake_accounts || 0,
    };

    const { error } = await supabase.from('stake_snapshots').insert(snapshot);

    if (error) throw error;

    console.log('Stake snapshot saved:', snapshot.total_stake);

    return new Response(JSON.stringify({ success: true, snapshot }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Snapshot error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
