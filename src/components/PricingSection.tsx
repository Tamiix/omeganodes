import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Check, Zap, Calendar, Cpu, Server, Plus, FlaskConical } from "lucide-react";
import CryptoPaymentModal from "./CryptoPaymentModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";

const endpoints = [
  { id: "mainnet", name: "Mainnet", priceModifier: 1.0 },
];

const locations = [
  { id: "newyork", name: "New York", region: "US" },
  { id: "frankfurt", name: "Frankfurt", region: "EU" },
  { id: "amsterdam", name: "Amsterdam", region: "EU" },
];

const serverTypes = [
  { id: "shared", name: "Shared", baseAddition: 0, description: "Shared with members" },
  { id: "dedicated", name: "Dedicated", baseAddition: 0, description: "Full control & custom limits" },
];

const dedicatedSpecs = [
  { 
    id: "epyc-9354p", 
    cpu: "AMD EPYC 9354p", 
    memory: "1024GB RAM", 
    price: 2700 
  },
  { 
    id: "epyc-9374f", 
    cpu: "AMD EPYC 9374F", 
    memory: "1024GB RAM", 
    price: 2900 
  },
];

const commitments = [
  { id: "monthly", name: "Monthly", months: 1, discount: 0, label: "No commitment" },
  { id: "3months", name: "3 Months", months: 3, discount: 0.15, label: "Save 15%" },
  { id: "6months", name: "6 Months", months: 6, discount: 0.22, label: "Save 22%" },
  { id: "1year", name: "1 Year", months: 12, discount: 0.30, label: "Save 30%" },
];

const dedicatedFeatures = [
  "JITO Shredstream & Omega in-house improvements",
  "Yellowstone gRPC included",
  "Arbitrage friendly limits applied",
  "Dedicated staked connection from our validator pool",
  "Base stake allocation: 50,000 SOL",
];

const sharedFeatures = [
  "Full RPC node access",
  "Priority support via Discord",
  "99.99% uptime SLA",
  "All 3 regions included",
  "Real-time monitoring",
  "Dedicated endpoint",
];

const PricingSection = () => {
  const [rps, setRps] = useState(100);
  const [tps, setTps] = useState(50);
  const [pubkeys, setPubkeys] = useState(20);
  const [selectedEndpoint, setSelectedEndpoint] = useState("mainnet");
  const [selectedLocation, setSelectedLocation] = useState("newyork");
  const [selectedCommitment, setSelectedCommitment] = useState("monthly");
  const [selectedServerType, setSelectedServerType] = useState("shared");
  const [selectedDedicatedSpec, setSelectedDedicatedSpec] = useState("epyc-9354p");
  const [additionalStakePackages, setAdditionalStakePackages] = useState(0);
  const [rentAccessEnabled, setRentAccessEnabled] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  const { formatPrice } = useCurrency();
  const { isAdmin } = useAuth();

  const isDedicated = selectedServerType === "dedicated";

  const { price, originalPrice, discount, rentAccessCost } = useMemo(() => {
    let baseTotal = 0;
    let beforeDiscount = 0;
    let discountPercent = 0;

    if (isDedicated) {
      // Dedicated server pricing
      const spec = dedicatedSpecs.find(s => s.id === selectedDedicatedSpec);
      const basePrice = spec?.price || 2700;
      
      // Additional stake packages ($350 each) - monthly recurring
      // Apply 10% discount on stake if 3-month commitment
      const stakeDiscountPercent = selectedCommitment === "3months" ? 0.10 : 0;
      const stakePerPackage = 350 * (1 - stakeDiscountPercent);
      const stakeAddition = additionalStakePackages * stakePerPackage;
      
      // Get commitment discount for base server price
      const commitment = commitments.find(c => c.id === selectedCommitment);
      discountPercent = commitment?.discount || 0;
      
      // Apply server discount to base price only, stake discount is separate
      const discountedServerPrice = Math.round(basePrice * (1 - discountPercent));
      baseTotal = Math.round(discountedServerPrice + stakeAddition);
      beforeDiscount = basePrice + (additionalStakePackages * 350);
    } else {
      // Shared server pricing - flat 30% markup, all locations same price
      const basePrice = 125 * 1.30; // 30% increase
      const maxPrice = 950 * 1.30; // 30% increase
      
      const rpsPercent = (rps - 100) / (4000 - 100);
      const tpsPercent = (tps - 50) / (2000 - 50);
      const combinedPercent = (rpsPercent * 0.55) + (tpsPercent * 0.45);
      
      const endpoint = endpoints.find(e => e.id === selectedEndpoint);
      const endpointModifier = endpoint?.priceModifier || 1;
      
      const commitment = commitments.find(c => c.id === selectedCommitment);
      discountPercent = commitment?.discount || 0;
      
      const calculatedPrice = basePrice + (combinedPercent * (maxPrice - basePrice));
      const baseWithModifiers = Math.round(calculatedPrice * endpointModifier);
      
      // PubKeys extra cost: $0 at 20, $50 at 2000 (linear scale)
      const pubkeysExtra = Math.round(((pubkeys - 20) / (2000 - 20)) * 50);
      
      baseTotal = Math.round((baseWithModifiers + pubkeysExtra) * (1 - discountPercent));
      beforeDiscount = baseWithModifiers + pubkeysExtra;
    }

    // Apply Rent Access 15% premium
    const rentCost = rentAccessEnabled ? Math.round(baseTotal * 0.15) : 0;
    const finalPrice = baseTotal + rentCost;
    const finalOriginal = rentAccessEnabled ? Math.round(beforeDiscount * 1.15) : beforeDiscount;

    return { 
      price: finalPrice, 
      originalPrice: finalOriginal, 
      discount: discountPercent,
      rentAccessCost: rentCost
    };
  }, [rps, tps, pubkeys, selectedEndpoint, selectedLocation, selectedCommitment, selectedServerType, selectedDedicatedSpec, additionalStakePackages, isDedicated, rentAccessEnabled]);

  // Calculate pubkeys extra cost for display
  const pubkeysExtraCost = Math.round(((pubkeys - 20) / (2000 - 20)) * 50);

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
              {/* Endpoint Selection - only show for shared */}
              {!isDedicated && (
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
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Regions Included Note - only show for shared */}
              {!isDedicated && (
                <div className="mb-6 p-4 rounded-xl bg-secondary/10 border border-secondary/30">
                  <p className="text-sm text-secondary font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    All Regions Included
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Access from New York (US), Frankfurt (EU) & Amsterdam (EU) — one price, full coverage.
                  </p>
                </div>
              )}

              {/* Server Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Server Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {serverTypes.map((serverType) => (
                    <button
                      key={serverType.id}
                      onClick={() => setSelectedServerType(serverType.id)}
                      className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                        selectedServerType === serverType.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {serverType.id === "dedicated" && <Server className="w-4 h-4" />}
                        {serverType.name}
                      </div>
                      <div className="text-xs mt-1 opacity-70">{serverType.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dedicated Server Options */}
              <AnimatePresence>
                {isDedicated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Warning/Info Note */}
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <p className="text-sm text-amber-400 font-medium mb-2">⚠️ Important Notice</p>
                      <p className="text-xs text-amber-400/90">
                        With dedicated servers, you have <span className="font-semibold">complete control over your limits</span>. 
                        You can configure RPS, TPS, and other parameters to your exact requirements. 
                        However, <span className="font-semibold">if the server becomes unstable or crashes due to the limits you configure, 
                        you are fully responsible</span>. We recommend starting conservative and scaling up gradually.
                      </p>
                    </div>

                    {/* Server Specifications */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-foreground mb-3">
                        <Cpu className="w-4 h-4 inline mr-2" />
                        Server Specifications
                      </label>
                      <div className="space-y-3">
                        {dedicatedSpecs.map((spec) => (
                          <button
                            key={spec.id}
                            onClick={() => setSelectedDedicatedSpec(spec.id)}
                            className={`w-full py-4 px-5 rounded-lg border text-left transition-all ${
                              selectedDedicatedSpec === spec.id
                                ? "bg-primary/10 border-primary"
                                : "bg-muted/30 border-border hover:border-muted-foreground/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-medium ${selectedDedicatedSpec === spec.id ? "text-primary" : "text-foreground"}`}>
                                  {spec.cpu}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">{spec.memory}</p>
                              </div>
                              <div className={`text-lg font-bold ${selectedDedicatedSpec === spec.id ? "text-primary" : "text-foreground"}`}>
                                ${spec.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Different configurations available upon request
                      </p>
                    </div>

                    {/* Additional Stake Packages - SwQoS Monthly Service */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-foreground mb-3">
                        <Plus className="w-4 h-4 inline mr-2" />
                        SwQoS Stake Service (Monthly)
                      </label>
                      <div className="p-4 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm text-foreground">100,000 SOL stake per package</p>
                            <p className="text-xs text-muted-foreground">$350/month per stake package • Billed monthly</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAdditionalStakePackages(Math.max(0, additionalStakePackages - 1))}
                              disabled={additionalStakePackages === 0}
                              className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="text-lg font-bold text-primary w-8 text-center">{additionalStakePackages}</span>
                            <button
                              onClick={() => setAdditionalStakePackages(Math.min(10, additionalStakePackages + 1))}
                              disabled={additionalStakePackages >= 10}
                              className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        {/* Stake commitment info */}
                        {additionalStakePackages > 0 && (
                          <div className="pt-3 border-t border-border space-y-2">
                            <p className="text-sm text-secondary">
                              Total stake: {(50000 + additionalStakePackages * 100000).toLocaleString()} SOL
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Stake cost: ${(additionalStakePackages * 350).toLocaleString()}/mo
                              </span>
                              {selectedCommitment === "3months" && (
                                <span className="text-secondary font-semibold">
                                  10% stake discount applied!
                                </span>
                              )}
                            </div>
                            {selectedCommitment !== "3months" && additionalStakePackages > 0 && (
                              <p className="text-xs text-amber-400/80">
                                💡 Tip: Choose 3-month commitment to save 10% on stake packages
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Commitment Selection */}
              <div className="mb-6">
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

              {/* Rent Access Option */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Add-ons
                </label>
                <button
                  onClick={() => setRentAccessEnabled(!rentAccessEnabled)}
                  className={`w-full py-4 px-5 rounded-lg border text-left transition-all ${
                    rentAccessEnabled
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        rentAccessEnabled ? "bg-primary border-primary" : "border-muted-foreground"
                      }`}>
                        {rentAccessEnabled && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <p className={`font-medium ${rentAccessEnabled ? "text-primary" : "text-foreground"}`}>
                          Rent Access
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Rent out your unused location capacity to other users
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${rentAccessEnabled ? "text-primary" : "text-muted-foreground"}`}>
                      +15%
                    </div>
                  </div>
                </button>
                {rentAccessEnabled && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/10 border border-secondary/30">
                    <p className="text-xs text-secondary">
                      💡 With Rent Access enabled, you can earn passive income by renting out your server location when you're not using it. 
                      Perfect for maximizing ROI during off-peak hours.
                    </p>
                  </div>
                )}
              </div>

              {/* RPS/TPS Sliders - only show for shared */}
              <AnimatePresence>
                {!isDedicated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* RPS and PubKeys Row */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      {/* RPS Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-medium text-foreground">
                            Requests per Second
                          </label>
                          <span className="text-sm font-mono font-semibold text-primary">{rps.toLocaleString()}</span>
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

                      {/* PubKeys Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-sm font-medium text-foreground">
                            PubKeys
                          </label>
                          <span className="text-sm font-mono font-semibold text-primary">
                            {pubkeys.toLocaleString()}
                            {pubkeysExtraCost > 0 && (
                              <span className="text-secondary ml-1">(+${pubkeysExtraCost})</span>
                            )}
                          </span>
                        </div>
                        <Slider
                          value={[pubkeys]}
                          onValueChange={(value) => setPubkeys(value[0])}
                          min={20}
                          max={2000}
                          step={20}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>20 ($0)</span>
                          <span>2,000 (+$50)</span>
                        </div>
                      </div>
                    </div>

                    {/* TPS Slider */}
                    <div className="mb-8">
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

                    {/* Admin Test Mode Toggle */}
                    {isAdmin && (
                      <div className="mb-10">
                        <button
                          onClick={() => setIsTestMode(!isTestMode)}
                          className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                            isTestMode
                              ? "bg-yellow-500/10 border-yellow-500/50"
                              : "bg-muted/30 border-border hover:border-muted-foreground/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FlaskConical className={`w-5 h-5 ${isTestMode ? "text-yellow-500" : "text-muted-foreground"}`} />
                            <div className="text-left">
                              <p className={`font-medium ${isTestMode ? "text-yellow-500" : "text-foreground"}`}>
                                Test Mode (Admin Only)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Create test orders at $0.10 for verification testing
                              </p>
                            </div>
                          </div>
                          <div className={`relative w-11 h-6 rounded-full transition-colors ${
                            isTestMode ? "bg-yellow-500" : "bg-muted"
                          }`}>
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                                isTestMode ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </div>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

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
                {(isDedicated ? dedicatedFeatures : sharedFeatures).map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
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
          rps={rps}
          tps={tps}
          serverType={selectedServerType}
          rentAccessEnabled={rentAccessEnabled}
          isTestMode={isTestMode}
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
