import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OmegaNode wallet addresses for receiving payments
const WALLET_ADDRESSES: Record<string, string> = {
  sol: "8b6cCUhEYL2B7UMC15phYkf9y9GEs3cUV2UQ4zECHroA",
  usdc: "8b6cCUhEYL2B7UMC15phYkf9y9GEs3cUV2UQ4zECHroA",
  usdt: "8b6cCUhEYL2B7UMC15phYkf9y9GEs3cUV2UQ4zECHroA",
};

const TEST_WALLET = "vpVbwh9bWRJcur5xSfpEHnAzQ74XeTpG9XDWVvzzSR8";

// Token mint addresses on Solana mainnet
const TOKEN_MINTS: Record<string, string> = {
  usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  usdt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

// Time window for valid transactions (2 minutes in seconds)
const TX_TIME_WINDOW_SECONDS = 120;

interface VerifyPaymentRequest {
  tokenType: string;
  expectedAmount: number;
  walletAddress?: string;
  isTestMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenType, expectedAmount, isTestMode } = await req.json() as VerifyPaymentRequest;
    
    console.log(`Verifying payment: ${tokenType}, expected amount: $${expectedAmount}, test mode: ${isTestMode}`);
    
    if (!tokenType || !expectedAmount) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Use test wallet if in test mode, otherwise use production wallet
    const receiverAddress = isTestMode ? TEST_WALLET : WALLET_ADDRESSES[tokenType.toLowerCase()];
    if (!receiverAddress || receiverAddress.includes("OMEGA_")) {
      console.log("Wallet address not configured; cannot verify on-chain payment.");
      return new Response(
        JSON.stringify({
          success: true,
          detected: false,
          message: "Payment verification is not configured yet. Please try again later."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Solana RPC for recent transactions
    const rpcUrl = "https://api.mainnet-beta.solana.com";
    
    if (tokenType.toLowerCase() === 'sol') {
      // For native SOL transfers, get recent signatures
      const signaturesResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [
            receiverAddress,
            { limit: 10 }
          ]
        })
      });

      const signaturesData = await signaturesResponse.json();
      console.log("Recent signatures:", JSON.stringify(signaturesData.result?.slice(0, 3)));

      if (signaturesData.result && signaturesData.result.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        
        // Check recent transactions for matching amount
        for (const sig of signaturesData.result) {
          // Skip transactions older than 2 minutes
          if (sig.blockTime && (now - sig.blockTime) > TX_TIME_WINDOW_SECONDS) {
            console.log(`Skipping old transaction: ${sig.signature}, age: ${now - sig.blockTime}s`);
            continue;
          }

          const txResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]
            })
          });

          const txData = await txResponse.json();
          
          if (txData.result) {
            const meta = txData.result.meta;
            if (meta && !meta.err) {
              // Calculate SOL received (in lamports, 1 SOL = 1e9 lamports)
              const preBalance = meta.preBalances[0] || 0;
              const postBalance = meta.postBalances[0] || 0;
              const received = (postBalance - preBalance) / 1e9;
              
              console.log(`Transaction found: received ${received} SOL, age: ${now - sig.blockTime}s`);
              
              // Check if amount matches (with small tolerance for fees)
              if (received > 0) {
                return new Response(
                  JSON.stringify({ 
                    success: true, 
                    detected: true,
                    signature: sig.signature,
                    amount: received,
                    blockTime: sig.blockTime,
                    message: "Payment detected and verified"
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
        }
      }
    } else {
      // For SPL tokens (USDC/USDT), check token account transactions
      const tokenMint = TOKEN_MINTS[tokenType.toLowerCase()];
      
      if (tokenMint) {
        const tokenAccountsResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
              receiverAddress,
              { mint: tokenMint },
              { encoding: "jsonParsed" }
            ]
          })
        });

        const tokenAccountsData = await tokenAccountsResponse.json();
        
        if (tokenAccountsData.result?.value?.length > 0) {
          const tokenAccount = tokenAccountsData.result.value[0].pubkey;
          
          // Get recent signatures for token account
          const signaturesResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getSignaturesForAddress",
              params: [tokenAccount, { limit: 10 }]
            })
          });

          const signaturesData = await signaturesResponse.json();
          const now = Math.floor(Date.now() / 1000);
          
          if (signaturesData.result && signaturesData.result.length > 0) {
            // Filter to only recent transactions (within 2 minutes)
            const recentTxs = signaturesData.result.filter((sig: { blockTime?: number }) => 
              sig.blockTime && (now - sig.blockTime) <= TX_TIME_WINDOW_SECONDS
            );

            if (recentTxs.length > 0) {
              const mostRecent = recentTxs[0];
              console.log(`Found ${recentTxs.length} recent token transactions within ${TX_TIME_WINDOW_SECONDS}s`);
              
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  detected: true,
                  signature: mostRecent.signature,
                  blockTime: mostRecent.blockTime,
                  message: "Token payment detected"
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    // No matching payment found
    console.log("No matching payment found in recent transactions");
    return new Response(
      JSON.stringify({ 
        success: true, 
        detected: false,
        message: "Payment not detected yet. Please ensure you've sent the correct amount."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to verify payment";
    console.error("Error verifying payment:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
