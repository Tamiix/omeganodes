import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Check, Zap } from "lucide-react";

const endpoints = [
  { id: "mainnet", name: "Mainnet", priceModifier: 1.0 },
  { id: "testnet", name: "Testnet", priceModifier: 0.5 },
];

const PricingSection = () => {
  const [rps, setRps] = useState(100);
  const [tps, setTps] = useState(50);
  const [selectedEndpoint, setSelectedEndpoint] = useState("mainnet");

  const price = useMemo(() => {
    const basePrice = 100;
    const maxPrice = 750;
    
    // Calculate RPS contribution (100-4000 range)
    const rpsPercent = (rps - 100) / (4000 - 100);
    
    // Calculate TPS contribution (50-2000 range)
    const tpsPercent = (tps - 50) / (2000 - 50);
    
    // Weighted average (RPS has slightly more weight)
    const combinedPercent = (rpsPercent * 0.55) + (tpsPercent * 0.45);
    
    // Get endpoint modifier
    const endpoint = endpoints.find(e => e.id === selectedEndpoint);
    const modifier = endpoint?.priceModifier || 1;
    
    // Calculate final price
    const calculatedPrice = basePrice + (combinedPercent * (maxPrice - basePrice));
    
    return Math.round(calculatedPrice * modifier);
  }, [rps, tps, selectedEndpoint]);

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider mb-3 block">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Configure Your Plan
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Customize your RPC access based on your needs. Pay once, get lifetime access.
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
          <div className="p-8 sm:p-10 rounded-2xl bg-card border border-border">
            {/* Endpoint Selection */}
            <div className="mb-8">
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
              <div className="text-sm text-muted-foreground mb-2">One-time payment</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl sm:text-6xl font-bold text-foreground">${price}</span>
                <span className="text-muted-foreground">USD</span>
              </div>
              <div className="text-sm text-secondary mt-2">Lifetime access included</div>
            </div>

            {/* Features List */}
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                "Unlimited API calls",
                "Priority support",
                "99.99% uptime SLA",
                "All future updates",
                "Discord community access",
                "Real-time monitoring",
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
            <Button variant="omega" size="lg" className="w-full gap-2">
              <Zap className="w-4 h-4" />
              Purchase Access
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Secure payment via crypto or card
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
