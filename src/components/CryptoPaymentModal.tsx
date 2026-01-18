import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  commitment: string;
}

const cryptoOptions = [
  { id: "sol", name: "Solana", symbol: "SOL", icon: "◎", address: "omega...node" },
  { id: "eth", name: "Ethereum", symbol: "ETH", icon: "Ξ", address: "0xomega...node" },
  { id: "btc", name: "Bitcoin", symbol: "BTC", icon: "₿", address: "bc1omega...node" },
  { id: "usdc", name: "USDC", symbol: "USDC", icon: "$", address: "0xomega...usdc" },
];

const CryptoPaymentModal = ({ isOpen, onClose, amount, commitment }: CryptoPaymentModalProps) => {
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Complete Your Payment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select your preferred cryptocurrency to complete the subscription
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
            <label className="text-sm font-medium">Select Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              {cryptoOptions.map((crypto) => (
                <button
                  key={crypto.id}
                  onClick={() => setSelectedCrypto(crypto.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedCrypto === crypto.id
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{crypto.icon}</span>
                    <span className="font-medium">{crypto.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{crypto.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Address */}
          {selectedCrypto && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <label className="text-sm font-medium">Send payment to:</label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <code className="flex-1 text-sm font-mono text-foreground truncate">
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
                Send exactly ${getTotalAmount()} worth of {cryptoOptions.find(c => c.id === selectedCrypto)?.symbol}. 
                Your subscription will activate within 10 minutes after confirmation.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="omega" 
              className="flex-1"
              disabled={!selectedCrypto}
            >
              I've Sent Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoPaymentModal;
