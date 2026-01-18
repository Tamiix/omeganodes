import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Clock, XCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  commitment: string;
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

type PaymentStep = "select" | "processing" | "success" | "failed";

const CryptoPaymentModal = ({ isOpen, onClose, amount, commitment }: CryptoPaymentModalProps) => {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("select");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [isTestMode, setIsTestMode] = useState(false);

  const cryptoOptions = getCryptoOptions(isTestMode);
  const TEST_AMOUNT = 0.1;

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentSent = async () => {
    if (!selectedCrypto) return;
    
    setPaymentStep("processing");
    
    try {
      const totalAmount = isTestMode ? TEST_AMOUNT : getTotalAmount();
      const walletAddress = isTestMode ? TEST_WALLET : PRODUCTION_WALLET;
      
      // Call the edge function to verify payment on-chain
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
        // Payment was detected
        setTransactionRef(data.signature || `OMG-${Date.now().toString(36).toUpperCase()}`);
        setPaymentStep("success");
      } else {
        // Payment not detected
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

  const getTotalAmount = () => {
    switch (commitment) {
      case "3months": return amount * 3;
      case "6months": return amount * 6;
      case "1year": return amount * 12;
      default: return amount;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
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
            <div className="p-4 rounded-lg bg-muted/30 border border-border mb-6">
              <div className="text-sm text-muted-foreground mb-1">Transaction Reference</div>
              <code className="text-xs font-mono text-primary break-all">{transactionRef}</code>
            </div>
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

            <div className="space-y-6 py-4">
              {/* Test Mode Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-sm font-medium">🧪 Test Mode</span>
                  <span className="text-xs text-muted-foreground">(0.1 USD)</span>
                </div>
                <button
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isTestMode ? "bg-yellow-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isTestMode ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Order Summary */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="text-sm font-medium">
                    {isTestMode ? "Test Payment" : getCommitmentLabel()}
                  </span>
                </div>
                {!isTestMode && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Monthly Rate</span>
                    <span className="text-sm font-medium">${amount}/mo</span>
                  </div>
                )}
                <div className="border-t border-border my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Due</span>
                  <span className="text-lg font-bold text-gradient-omega">
                    ${isTestMode ? TEST_AMOUNT.toFixed(2) : getTotalAmount()}
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
                      ${isTestMode ? TEST_AMOUNT.toFixed(2) : getTotalAmount()}
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
