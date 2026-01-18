import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Check, Zap, Calendar } from "lucide-react";
import CryptoPaymentModal from "./CryptoPaymentModal";
import { useCurrency } from "@/contexts/CurrencyContext";

const endpoints = [
  { id: "mainnet", name: "Mainnet", priceModifier: 1.0 },
  { id: "testnet", name: "Testnet", priceModifier: 0.5 },
];

const locations = [
  { id: "newyork", name: "New York", region: "US", priceModifier: 1.0 },
  { id: "frankfurt", name: "Frankfurt", region: "EU", priceModifier: 1.12 },
  { id: "amsterdam", name: "Amsterdam", region: "EU", priceModifier: 1.18 },
];

const commitments = [
  { id: "monthly", name: "Monthly", months: 1, discount: 0, label: "No commitment" },
  { id: "3months", name: "3 Months", months: 3, discount: 0.15, label: "Save 15%" },
  { id: "6months", name: "6 Months", months: 6, discount: 0.22, label: "Save 22%" },
  { id: "1year", name: "1 Year", months: 12, discount: 0.30, label: "Save 30%" },
];

const PricingSection = () => {
  const [rps, setRps] = useState(100);
  const [tps, setTps] = useState(50);
  const [selectedEndpoint, setSelectedEndpoint] = useState("mainnet");
  const [selectedLocation, setSelectedLocation] = useState("newyork");
  const [selectedCommitment, setSelectedCommitment] = useState("monthly");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const { formatPrice } = useCurrency();

  const { price, originalPrice, discount } = useMemo(() => {
    // USD pricing (base)
    const basePrice = 125;
    const maxPrice = 950;
    
    // Calculate RPS contribution (100-4000 range)
    const rpsPercent = (rps - 100) / (4000 - 100);
    
    // Calculate TPS contribution (50-2000 range)
    const tpsPercent = (tps - 50) / (2000 - 50);
    
    // Weighted average (RPS has slightly more weight)
    const combinedPercent = (rpsPercent * 0.55) + (tpsPercent * 0.45);
    
    // Get endpoint modifier
    const endpoint = endpoints.find(e => e.id === selectedEndpoint);
    const endpointModifier = endpoint?.priceModifier || 1;
    
    // Get location modifier
    const location = locations.find(l => l.id === selectedLocation);
    const locationModifier = location?.priceModifier || 1;
    
    // Get commitment discount
    const commitment = commitments.find(c => c.id === selectedCommitment);
    const discountPercent = commitment?.discount || 0;
    
    // Calculate final price in USD
    const calculatedPrice = basePrice + (combinedPercent * (maxPrice - basePrice));
    const originalPrice = Math.round(calculatedPrice * endpointModifier * locationModifier);
    const discountedPrice = Math.round(originalPrice * (1 - discountPercent));
    
    return { 
      price: discountedPrice, 
      originalPrice, 
      discount: discountPercent 
    };
  }, [rps, tps, selectedEndpoint, selectedLocation, selectedCommitment]);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[150px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            <Calendar className="w-4 h-4" />
            Monthly Access
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Configure Your <span className="text-gradient-omega">Monthly Plan</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Customize your RPC access based on your needs. Flexible monthly billing, cancel anytime.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 bg-gradient-omega rounded-2xl blur-lg opacity-20" />
            
            <div className="relative p-8 sm:p-10 rounded-2xl bg-card border border-border">
              {/* Endpoint Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Endpoint
                </label>
                <div className="flex gap-3">
                  {endpoints.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      onClick={() => setSelectedEndpoint(endpoint.id)}
                      className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                        selectedEndpoint === endpoint.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      {endpoint.name}
                      {endpoint.priceModifier < 1 && (
                        <span className="ml-2 text-xs text-secondary">50% off</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Location
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                        selectedLocation === location.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      <div>{location.name}</div>
                      <div className="text-xs mt-1 opacity-70">{location.region}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Commitment Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Commitment Period
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {commitments.map((commitment) => (
                    <button
                      key={commitment.id}
                      onClick={() => setSelectedCommitment(commitment.id)}
                      className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all ${
                        selectedCommitment === commitment.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      <div>{commitment.name}</div>
                      <div className={`text-xs mt-1 ${commitment.discount > 0 ? "text-secondary font-semibold" : "opacity-70"}`}>
                        {commitment.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* RPS Slider */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-foreground">
                    Requests per Second (RPS)
                  </label>
                  <span className="text-sm font-mono font-semibold text-primary">{rps.toLocaleString()} RPS</span>
                </div>
                <Slider
                  value={[rps]}
                  onValueChange={(value) => setRps(value[0])}
                  min={100}
                  max={4000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>100</span>
                  <span>4,000</span>
                </div>
              </div>

              {/* TPS Slider */}
              <div className="mb-10">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-foreground">
                    Transactions per Second (TPS)
                  </label>
                  <span className="text-sm font-mono font-semibold text-primary">{tps.toLocaleString()} TPS</span>
                </div>
                <Slider
                  value={[tps]}
                  onValueChange={(value) => setTps(value[0])}
                  min={50}
                  max={2000}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>50</span>
                  <span>2,000</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border my-8" />

              {/* Price Display */}
              <div className="text-center mb-8">
                <div className="text-sm text-muted-foreground mb-2">Monthly payment</div>
                <div className="flex items-baseline justify-center gap-2">
                  {discount > 0 && (
                    <span className="text-2xl text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
                  )}
                  <span className="text-5xl sm:text-6xl font-bold text-gradient-omega">{formatPrice(price)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {discount > 0 ? (
                  <div className="text-sm text-secondary mt-2">
                    You save {formatPrice(originalPrice - price)}/mo with {commitments.find(c => c.id === selectedCommitment)?.name} commitment
                  </div>
                ) : (
                  <div className="text-sm text-secondary mt-2">Cancel anytime • No long-term commitment</div>
                )}
              </div>

              {/* Features List */}
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {[
                  "Full RPC node access",
                  "Priority support via Discord",
                  "99.99% uptime SLA",
                  "All 3 regions included",
                  "Real-time monitoring",
                  "Dedicated endpoint",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-secondary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button 
                variant="omega" 
                size="lg" 
                className="w-full gap-2"
                onClick={() => setIsPaymentOpen(true)}
              >
                <Zap className="w-4 h-4" />
                Subscribe Now
              </Button>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Secure payment via crypto • Instant activation
              </p>
            </div>
          </div>
        </motion.div>

        {/* Crypto Payment Modal */}
        <CryptoPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          amount={price}
          commitment={selectedCommitment}
        />

        {/* Discord CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">Have questions? Join our community!</p>
          <a
            href="https://discord.gg/omeganode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join Our Discord
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
