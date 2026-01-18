import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, Clock } from "lucide-react";
import { useState } from "react";

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  commitment: string;
}

const cryptoOptions = [
  { id: "sol", name: "Solana", symbol: "SOL", icon: "◎", address: "omegaNodeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { id: "usdc", name: "USDC", symbol: "USDC", icon: "$", address: "omegaNodeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", subtext: "SPL Token" },
  { id: "usdt", name: "USDT", symbol: "USDT", icon: "₮", address: "omegaNodeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", subtext: "SPL Token" },
];

type PaymentStep = "select" | "processing" | "pending";

const CryptoPaymentModal = ({ isOpen, onClose, amount, commitment }: CryptoPaymentModalProps) => {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("select");

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentSent = () => {
    setPaymentStep("processing");
    // Simulate processing delay
    setTimeout(() => {
      setPaymentStep("pending");
    }, 2000);
  };

  const handleClose = () => {
    setPaymentStep("select");
    setSelectedCrypto(null);
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
            <p className="text-muted-foreground">Please wait while we confirm your transaction...</p>
          </div>
        )}

        {paymentStep === "pending" && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Pending</h3>
            <p className="text-muted-foreground mb-6">
              Your payment is being processed. You'll receive a confirmation email once verified.
              This usually takes 1-10 minutes.
            </p>
            <div className="p-4 rounded-lg bg-muted/30 border border-border mb-6">
              <div className="text-sm text-muted-foreground mb-1">Transaction Reference</div>
              <code className="text-sm font-mono text-primary">OMG-{Date.now().toString(36).toUpperCase()}</code>
            </div>
            <Button variant="omega" onClick={handleClose} className="w-full">
              Done
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Questions? Join our <a href="https://discord.gg/omeganode" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord</a> for support.
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
              {/* Order Summary */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="text-sm font-medium">{getCommitmentLabel()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Monthly Rate</span>
                  <span className="text-sm font-medium">${amount}/mo</span>
                </div>
                <div className="border-t border-border my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Due</span>
                  <span className="text-lg font-bold text-gradient-omega">${getTotalAmount()}</span>
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
                    Send exactly <span className="font-semibold text-foreground">${getTotalAmount()}</span> worth of {cryptoOptions.find(c => c.id === selectedCrypto)?.symbol}. 
                    Your subscription will activate within 10 minutes after confirmation.
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
