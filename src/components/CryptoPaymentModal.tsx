import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, XCircle, CheckCircle, ExternalLink, Zap, Shield, Activity, Info } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number; // Amount in USD
  commitment: string;
  rps?: number;
  tps?: number;
  serverType?: string;
  rentAccessEnabled?: boolean;
}

const PRODUCTION_WALLET = "8b6cCUhEYL2B7UMC15phYkf9y9GEs3cUV2UQ4zECHroA";
const TEST_WALLET = "vpVbwh9bWRJcur5xSfpEHnAzQ74XeTpG9XDWVvzzSR8";

const getCryptoOptions = (isTestMode: boolean) => {
  const wallet = isTestMode ? TEST_WALLET : PRODUCTION_WALLET;
  return [
    { id: "sol", name: "Solana", symbol: "SOL", icon: "◎", address: wallet },
    { id: "usdc", name: "USDC", symbol: "USDC", icon: "$", address: wallet, subtext: "SPL Token" },
    { id: "usdt", name: "USDT", symbol: "USDT", icon: "₮", address: wallet, subtext: "SPL Token" },
  ];
};

// swQoS pricing tiers (USD)
const SWQOS_TIERS = [
  { stake: 100000, label: "100K", price: 380 },
  { stake: 200000, label: "200K", price: 760 },
  { stake: 300000, label: "300K", price: 1140 },
  { stake: 400000, label: "400K", price: 1520 },
  { stake: 500000, label: "500K", price: 1900 },
  { stake: 600000, label: "600K", price: 2280 },
  { stake: 700000, label: "700K", price: 2660 },
  { stake: 800000, label: "800K", price: 3040 },
  { stake: 900000, label: "900K", price: 3420 },
  { stake: 1000000, label: "1M", price: 3800 },
];

const SHREDS_PRICE = 5435; // USD per month (~5000 EUR)

type PaymentStep = "select" | "processing" | "success" | "failed";

const CryptoPaymentModal = ({ isOpen, onClose, amount, commitment, rps = 100, tps = 50, serverType = "shared", rentAccessEnabled = false }: CryptoPaymentModalProps) => {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("select");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [isTestMode, setIsTestMode] = useState(false);
  const [includeShreds, setIncludeShreds] = useState(false);
  const [swqosTier, setSwqosTier] = useState<number | null>(null);

  const { formatPrice } = useCurrency();
  const { user, isAdmin } = useAuth();

  const cryptoOptions = getCryptoOptions(isTestMode);
  const TEST_AMOUNT = 0.1;

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTotalMonths = () => {
    switch (commitment) {
      case "3months": return 3;
      case "6months": return 6;
      case "1year": return 12;
      default: return 1;
    }
  };

  const getTotalAmount = () => {
    if (isTestMode) return TEST_AMOUNT;
    
    const months = getTotalMonths();
    const baseTotal = amount * months;
    const shredsTotal = includeShreds ? SHREDS_PRICE * months : 0;
    const swqosTotal = swqosTier !== null ? SWQOS_TIERS[swqosTier].price : 0;
    
    return baseTotal + shredsTotal + swqosTotal;
  };

  const handlePaymentSent = async () => {
    if (!selectedCrypto) return;
    
    setPaymentStep("processing");
    
    try {
      const totalAmount = getTotalAmount();
      const walletAddress = isTestMode ? TEST_WALLET : PRODUCTION_WALLET;
      
      const { data, error } = await supabase.functions.invoke('verify-solana-payment', {
        body: {
          tokenType: selectedCrypto,
          expectedAmount: totalAmount,
          walletAddress: walletAddress,
          isTestMode: isTestMode
        }
      });

      if (error) {
        console.error("Error verifying payment:", error);
        setPaymentStep("failed");
        return;
      }

      if (data?.detected) {
        const signature = data.signature || `OMG-${Date.now().toString(36).toUpperCase()}`;
        setTransactionRef(signature);
        
        // Send Discord notification
        try {
          await supabase.functions.invoke('discord-order-notification', {
            body: {
              plan: getCommitmentLabel(),
              commitment: commitment,
              serverType: serverType === "dedicated" ? "Dedicated" : "Shared",
              email: user?.email || "Not logged in",
              rps: rps,
              tps: tps,
              includeShreds: includeShreds,
              swqosTier: swqosTier,
              swqosLabel: swqosTier !== null ? SWQOS_TIERS[swqosTier].label : null,
              totalAmount: totalAmount,
              transactionSignature: signature,
              isTestMode: isTestMode,
              rentAccessEnabled: rentAccessEnabled
            }
          });
        } catch (discordErr) {
          console.error("Failed to send Discord notification:", discordErr);
          // Don't fail the payment flow if Discord notification fails
        }
        
        setPaymentStep("success");
      } else {
        setPaymentStep("failed");
      }
    } catch (err) {
      console.error("Error calling verification:", err);
      setPaymentStep("failed");
    }
  };

  const handleRetry = () => {
    setPaymentStep("select");
  };

  const handleClose = () => {
    setPaymentStep("select");
    setSelectedCrypto(null);
    setTransactionRef("");
    setIsTestMode(false);
    setIncludeShreds(false);
    setSwqosTier(null);
    onClose();
  };

  const getCommitmentLabel = () => {
    switch (commitment) {
      case "3months": return "3 Months";
      case "6months": return "6 Months";
      case "1year": return "1 Year";
      default: return "Monthly";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        {paymentStep === "processing" && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-xl font-bold mb-2">Verifying Payment</h3>
            <p className="text-muted-foreground">Checking the Solana blockchain for your transaction...</p>
          </div>
        )}

        {paymentStep === "success" && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Confirmed!</h3>
            <p className="text-muted-foreground mb-6">
              Your payment has been verified on-chain. Your subscription is now active!
            </p>
            <div className="p-4 rounded-lg bg-muted/30 border border-border mb-4">
              <div className="text-sm text-muted-foreground mb-1">Transaction Signature</div>
              <code className="text-xs font-mono text-primary break-all">{transactionRef}</code>
            </div>
            <a
              href={`https://solscan.io/tx/${transactionRef}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
            >
              View on Solscan <ExternalLink className="w-4 h-4" />
            </a>
            <Button variant="omega" onClick={handleClose} className="w-full">
              Done
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Check your email for subscription details.
            </p>
          </div>
        )}

        {paymentStep === "failed" && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Not Detected</h3>
            <p className="text-muted-foreground mb-6">
              We couldn't detect your payment on the Solana blockchain. 
              Please ensure you've sent the correct amount to the correct address.
            </p>
            <div className="p-4 rounded-lg bg-muted/30 border border-border mb-6 text-left">
              <div className="text-sm font-medium mb-2">Troubleshooting tips:</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Wait a few minutes for the transaction to confirm</li>
                <li>• Verify you sent to the correct wallet address</li>
                <li>• Ensure you sent the exact amount required</li>
                <li>• Check that you used the Solana network</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button variant="omega" onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Need help? Join our <a href="https://discord.gg/omeganode" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord</a> for support.
            </p>
          </div>
        )}

        {paymentStep === "select" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Complete Your Payment</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Pay with Solana or SPL tokens on the Solana network
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Test Mode Toggle - Admin Only */}
              {isAdmin && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-sm font-medium">🧪 Test Mode (Admin)</span>
                    <span className="text-xs text-muted-foreground">($0.10)</span>
                  </div>
                  <button
                    onClick={() => setIsTestMode(!isTestMode)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isTestMode ? "bg-yellow-500" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        isTestMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Add-ons Section */}
              {!isTestMode && (
                <div className="space-y-4">
                  <label className="text-sm font-medium">Add-ons (Optional)</label>
                  
                  {/* Shreds Add-on */}
                  <div 
                    onClick={() => setIncludeShreds(!includeShreds)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      includeShreds 
                        ? "bg-primary/10 border-primary" 
                        : "bg-muted/30 border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">🔥 Private Shreds</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium">
                            +{formatPrice(SHREDS_PRICE)}/mo
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                            <span>Faster gRPC connection</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            <span>Faster transaction landing</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span>More stable connection</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        includeShreds ? "border-primary bg-primary" : "border-muted-foreground/50"
                      }`}>
                        {includeShreds && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* swQoS Add-on */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">⚡ swQoS Service</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          €350 per 100K stake (up to 1M)
                        </p>
                      </div>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        <div className="absolute right-0 top-6 w-48 p-2 rounded bg-popover border border-border text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Staked Weighted Quality of Service for priority transaction processing
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2">
                      {SWQOS_TIERS.slice(0, 5).map((tier, index) => (
                        <button
                          key={tier.stake}
                          onClick={() => setSwqosTier(swqosTier === index ? null : index)}
                          className={`py-2 px-1 rounded text-xs font-medium transition-all ${
                            swqosTier === index
                              ? "bg-primary/10 border border-primary text-primary"
                              : "bg-muted/50 border border-transparent text-muted-foreground hover:border-muted-foreground/30"
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {SWQOS_TIERS.slice(5, 10).map((tier, index) => (
                        <button
                          key={tier.stake}
                          onClick={() => setSwqosTier(swqosTier === index + 5 ? null : index + 5)}
                          className={`py-2 px-1 rounded text-xs font-medium transition-all ${
                            swqosTier === index + 5
                              ? "bg-primary/10 border border-primary text-primary"
                              : "bg-muted/50 border border-transparent text-muted-foreground hover:border-muted-foreground/30"
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                    {swqosTier !== null && (
                      <div className="mt-3 text-sm text-center text-secondary font-medium">
                        +€{SWQOS_TIERS[swqosTier].price.toLocaleString()} one-time
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="text-sm font-medium">
                    {isTestMode ? "Test Payment" : getCommitmentLabel()}
                  </span>
                </div>
                {!isTestMode && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Monthly Rate</span>
                      <span className="text-sm font-medium">{formatPrice(amount)}/mo</span>
                    </div>
                    {includeShreds && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Private Shreds</span>
                        <span className="text-sm font-medium">+{formatPrice(SHREDS_PRICE)}/mo</span>
                      </div>
                    )}
                    {swqosTier !== null && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">swQoS ({SWQOS_TIERS[swqosTier].label} stake)</span>
                        <span className="text-sm font-medium">+{formatPrice(SWQOS_TIERS[swqosTier].price)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="border-t border-border my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Due</span>
                  <span className="text-lg font-bold text-gradient-omega">
                    {isTestMode ? `$${TEST_AMOUNT.toFixed(2)}` : formatPrice(getTotalAmount())}
                  </span>
                </div>
              </div>

              {/* Crypto Options */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Select Payment Token</label>
                <div className="grid grid-cols-3 gap-3">
                  {cryptoOptions.map((crypto) => (
                    <button
                      key={crypto.id}
                      onClick={() => setSelectedCrypto(crypto.id)}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        selectedCrypto === crypto.id
                          ? "bg-primary/10 border-primary"
                          : "bg-muted/30 border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{crypto.icon}</span>
                      <span className="font-medium text-sm block">{crypto.symbol}</span>
                      {crypto.subtext && (
                        <span className="text-xs text-muted-foreground">{crypto.subtext}</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">All payments on Solana network only</p>
              </div>

              {/* Payment Address */}
              {selectedCrypto && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <label className="text-sm font-medium">Send payment to:</label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <code className="flex-1 text-xs sm:text-sm font-mono text-foreground truncate">
                      {cryptoOptions.find(c => c.id === selectedCrypto)?.address}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => handleCopy(cryptoOptions.find(c => c.id === selectedCrypto)?.address || "")}
                    >
                      {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send exactly <span className="font-semibold text-foreground">
                      {isTestMode ? `$${TEST_AMOUNT.toFixed(2)}` : formatPrice(getTotalAmount())}
                    </span> worth of {cryptoOptions.find(c => c.id === selectedCrypto)?.symbol}. 
                    Your subscription will activate after on-chain confirmation.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="omega" 
                  className="flex-1"
                  disabled={!selectedCrypto}
                  onClick={handlePaymentSent}
                >
                  I've Sent Payment
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CryptoPaymentModal;
