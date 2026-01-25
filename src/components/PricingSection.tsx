import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Check, Zap, Cpu, Server, Plus, FlaskConical, HelpCircle, ChevronDown, ChevronUp, Tag, Loader2 } from "lucide-react";
import CryptoPaymentModal from "./CryptoPaymentModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const endpoints = [
  { id: "mainnet", name: "Mainnet", priceModifier: 1.0 },
];

const locations = [
  { id: "newyork", name: "New York", region: "US" },
  { id: "frankfurt", name: "Frankfurt", region: "EU" },
  { id: "amsterdam", name: "Amsterdam", region: "EU" },
];

const serverTypes = [
  { id: "shared", name: "Shared", baseAddition: 0, description: "Shared with other Users" },
  { id: "dedicated", name: "Dedicated", baseAddition: 0, description: "Full control & custom limits" },
];

const dedicatedSpecs = [
  { 
    id: "epyc-9354p", 
    cpu: "AMD EPYC 9354p", 
    memory: "1024GB RAM", 
    originalPrice: 2700,
    price: Math.round(2700 * 0.9)
  },
  { 
    id: "epyc-9374f", 
    cpu: "AMD EPYC 9374F", 
    memory: "1024GB RAM", 
    originalPrice: 2900,
    price: Math.round(2900 * 0.9)
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

interface AppliedDiscount {
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
}

const PricingSection = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState("mainnet");
  const [selectedCommitment, setSelectedCommitment] = useState("monthly");
  const [selectedServerType, setSelectedServerType] = useState("shared");
  const [selectedDedicatedSpec, setSelectedDedicatedSpec] = useState("epyc-9354p");
  const [additionalStakePackages, setAdditionalStakePackages] = useState(0);
  const [rentAccessEnabled, setRentAccessEnabled] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [discordUserId, setDiscordUserId] = useState("");
  const [showDiscordGuide, setShowDiscordGuide] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [isTrialProcessing, setIsTrialProcessing] = useState(false);
  
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const { formatPrice } = useCurrency();
  const { isAdmin, user } = useAuth();

  const isValidDiscordId = /^\d{17,19}$/.test(discordUserId.trim());
  const isDedicated = selectedServerType === "dedicated";

  const { price, originalPrice, discount, rentAccessCost, discountAmount, priceBeforeDiscount } = useMemo(() => {
    let baseTotal = 0;
    let beforeDiscount = 0;
    let discountPercent = 0;

    if (isDedicated) {
      const spec = dedicatedSpecs.find(s => s.id === selectedDedicatedSpec);
      const basePrice = spec?.price || 2700;
      const stakeDiscountPercent = selectedCommitment === "3months" ? 0.10 : 0;
      const stakePerPackage = 350 * (1 - stakeDiscountPercent);
      const stakeAddition = additionalStakePackages * stakePerPackage;
      const commitment = commitments.find(c => c.id === selectedCommitment);
      discountPercent = commitment?.discount || 0;
      const discountedServerPrice = Math.round(basePrice * (1 - discountPercent));
      baseTotal = Math.round(discountedServerPrice + stakeAddition);
      beforeDiscount = basePrice + (additionalStakePackages * 350);
    } else {
      const basePrice = 300;
      const commitment = commitments.find(c => c.id === selectedCommitment);
      discountPercent = commitment?.discount || 0;
      baseTotal = Math.round(basePrice * (1 - discountPercent));
      beforeDiscount = basePrice;
    }

    const rentCost = rentAccessEnabled ? Math.round(baseTotal * 0.15) : 0;
    let finalPrice = baseTotal + rentCost;
    const priceBeforeCodeDiscount = finalPrice;
    const finalOriginal = rentAccessEnabled ? Math.round(beforeDiscount * 1.15) : beforeDiscount;

    let codeDiscountAmount = 0;
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        codeDiscountAmount = Math.round(finalPrice * (appliedDiscount.discount_value / 100));
      } else {
        codeDiscountAmount = Math.min(appliedDiscount.discount_value, finalPrice);
      }
      finalPrice = Math.max(0, finalPrice - codeDiscountAmount);
    }

    return { 
      price: finalPrice, 
      originalPrice: finalOriginal, 
      discount: discountPercent,
      rentAccessCost: rentCost,
      discountAmount: codeDiscountAmount,
      priceBeforeDiscount: priceBeforeCodeDiscount
    };
  }, [selectedCommitment, selectedServerType, selectedDedicatedSpec, additionalStakePackages, isDedicated, rentAccessEnabled, appliedDiscount]);

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) return;
    
    setIsValidatingCode(true);
    setDiscountError("");
    
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setDiscountError("Invalid discount code");
        setAppliedDiscount(null);
        setIsValidatingCode(false);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setDiscountError("This discount code has expired");
        setAppliedDiscount(null);
        setIsValidatingCode(false);
        return;
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        setDiscountError("This discount code has reached its maximum uses");
        setAppliedDiscount(null);
        setIsValidatingCode(false);
        return;
      }

      setAppliedDiscount({
        code: data.code,
        discount_type: data.discount_type as 'percentage' | 'flat',
        discount_value: data.discount_value
      });
      setDiscountError("");
    } catch (err) {
      console.error("Error validating discount code:", err);
      setDiscountError("Failed to validate discount code");
      setAppliedDiscount(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
  };

  const [fingerprint, setFingerprint] = useState<string>("");
  
  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (err) {
        console.error("Failed to load fingerprint:", err);
        const fallback = btoa(
          navigator.userAgent + 
          screen.width + screen.height + 
          navigator.language + 
          new Date().getTimezoneOffset()
        );
        setFingerprint(fallback);
      }
    };
    loadFingerprint();
  }, []);

  const handleTrialOrder = async () => {
    if (!isValidDiscordId) return;
    
    setIsTrialProcessing(true);
    
    try {
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-trial', {
        body: {
          discordId: discordUserId.trim(),
          fingerprint: fingerprint,
          email: user?.email || null,
          userId: user?.id || null
        }
      });

      if (validationError) {
        console.error("Trial validation error:", validationError);
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Validation Error",
          description: "Unable to validate trial request. Please try again.",
          variant: "destructive"
        });
        setIsTrialProcessing(false);
        return;
      }

      if (!validationResult?.allowed) {
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: "Trial Not Available",
          description: validationResult?.message || "You have already used a trial.",
          variant: "destructive"
        });
        setIsTrialProcessing(false);
        return;
      }

      const trialSignature = `TRIAL-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      if (user) {
        try {
          const { error: orderError } = await supabase.from('orders').insert({
            user_id: user.id,
            order_number: "TEMP",
            plan_name: "Trial (30 min)",
            commitment: "trial",
            server_type: "shared",
            location: "all",
            rps: 100,
            tps: 50,
            amount_usd: 0,
            currency_code: "FREE",
            currency_amount: 0,
            payment_method: "trial",
            transaction_signature: trialSignature,
            status: "active",
            expires_at: expiresAt.toISOString(),
            is_test_order: false
          });
          
          if (orderError) {
            console.error("Failed to save trial order:", orderError);
          }
        } catch (dbErr) {
          console.error("Failed to save trial order to database:", dbErr);
        }
      }
      
      try {
        await supabase.functions.invoke('discord-order-notification', {
          body: {
            plan: "Trial (30 min)",
            commitment: "trial",
            serverType: "Shared",
            email: user?.email || "Not logged in",
            discordId: discordUserId.trim() || null,
            discordUsername: null,
            rps: 100,
            tps: 50,
            includeShreds: false,
            swqosTier: null,
            swqosLabel: null,
            swqosStakeAmount: null,
            swqosPrice: null,
            totalAmount: 0,
            transactionSignature: trialSignature,
            isTestMode: false,
            isTrial: true
          }
        });
      } catch (discordErr) {
        console.error("Failed to send Discord notification:", discordErr);
      }
      
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Trial Activated!",
        description: "Your 30-minute trial has been activated. Check Discord for access details.",
      });
      
    } catch (err) {
      console.error("Error creating trial order:", err);
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Error",
        description: "Failed to activate trial. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTrialProcessing(false);
      setIsTrialMode(false);
    }
  };

  return (
    <section id="pricing" className="py-20 relative">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-foreground">
            Configure Your Plan
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Flexible monthly billing. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="max-w-xl mx-auto"
        >
          <div className="p-6 sm:p-8 rounded-lg bg-card/50 border border-border/60 backdrop-blur-sm">
            
            {/* Endpoint Selection - only show for shared */}
            {!isDedicated && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Endpoint
                </label>
                <div className="flex gap-2">
                  {endpoints.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      onClick={() => setSelectedEndpoint(endpoint.id)}
                      className={`flex-1 py-2.5 px-4 rounded text-sm font-medium transition-all ${
                        selectedEndpoint === endpoint.id
                          ? "bg-foreground text-background"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {endpoint.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Regions Note - only show for shared */}
            {!isDedicated && (
              <div className="mb-5 p-3 rounded bg-muted/30 border border-border/40">
                <p className="text-xs text-foreground font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-secondary" />
                  All Regions Included
                </p>
                <p className="text-xs text-muted-foreground mt-1 ml-5">
                  New York, Frankfurt & Amsterdam — one price, full coverage.
                </p>
              </div>
            )}

            {/* Server Type Selection */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Server Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {serverTypes.map((serverType) => (
                  <button
                    key={serverType.id}
                    onClick={() => {
                      setSelectedServerType(serverType.id);
                      if (serverType.id === "dedicated") {
                        setIsTrialMode(false);
                      }
                    }}
                    className={`py-3 px-3 rounded text-sm font-medium transition-all text-left ${
                      selectedServerType === serverType.id
                        ? "bg-foreground text-background"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {serverType.id === "dedicated" && <Server className="w-3.5 h-3.5" />}
                      {serverType.name}
                    </div>
                    <div className="text-xs mt-0.5 opacity-70">{serverType.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Trial Usage Option - Only for Shared */}
            {!isDedicated && (
              <div className="mb-5">
                <button
                  onClick={() => setIsTrialMode(!isTrialMode)}
                  className={`w-full py-3 px-4 rounded text-left transition-all flex items-center justify-between ${
                    isTrialMode
                      ? "bg-secondary/10 border border-secondary/40"
                      : "bg-muted/30 border border-border/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                      isTrialMode ? "bg-secondary border-secondary" : "border-muted-foreground/50"
                    }`}>
                      {isTrialMode && <Check className="w-2.5 h-2.5 text-secondary-foreground" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isTrialMode ? "text-secondary" : "text-foreground"}`}>
                        Trial Usage
                      </p>
                      <p className="text-xs text-muted-foreground">
                        30 min free • No payment required
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isTrialMode ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                    FREE
                  </span>
                </button>
              </div>
            )}

            {/* Dedicated Server Options */}
            <AnimatePresence>
              {isDedicated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Promo Banner */}
                  <div className="mb-5 p-3 rounded bg-secondary/10 border border-secondary/30">
                    <p className="text-xs text-secondary font-medium">
                      Limited Time: 10% off your first dedicated server
                    </p>
                  </div>

                  {/* Warning Note */}
                  <div className="mb-5 p-3 rounded bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-400">
                      <strong>Note:</strong> You control all limits. If the server becomes unstable due to your configuration, you are responsible.
                    </p>
                  </div>

                  {/* Server Specifications */}
                  <div className="mb-5">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      <Cpu className="w-3.5 h-3.5 inline mr-1" />
                      Server Specs
                    </label>
                    <div className="space-y-2">
                      {dedicatedSpecs.map((spec) => (
                        <button
                          key={spec.id}
                          onClick={() => setSelectedDedicatedSpec(spec.id)}
                          className={`relative w-full py-3 px-4 rounded text-left transition-all ${
                            selectedDedicatedSpec === spec.id
                              ? "bg-foreground text-background"
                              : "bg-muted/50 text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground">
                            -10%
                          </span>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{spec.cpu}</p>
                              <p className={`text-xs mt-0.5 ${selectedDedicatedSpec === spec.id ? "opacity-70" : "text-muted-foreground"}`}>
                                {spec.memory}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs line-through ${selectedDedicatedSpec === spec.id ? "opacity-50" : "text-muted-foreground"}`}>
                                ${spec.originalPrice.toLocaleString()}
                              </span>
                              <span className="text-lg font-bold ml-2">
                                ${spec.price.toLocaleString()}
                              </span>
                              <span className={`text-xs ${selectedDedicatedSpec === spec.id ? "opacity-70" : "text-muted-foreground"}`}>/mo</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Different configurations available upon request
                    </p>
                  </div>

                  {/* Additional Stake Packages */}
                  <div className="mb-5">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      SwQoS Stake Service
                    </label>
                    <div className="p-3 rounded bg-muted/30 border border-border/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-foreground">100,000 SOL per package</p>
                          <p className="text-xs text-muted-foreground">$350/mo per package</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAdditionalStakePackages(Math.max(0, additionalStakePackages - 1))}
                            disabled={additionalStakePackages === 0}
                            className="w-7 h-7 rounded bg-muted border border-border flex items-center justify-center text-foreground hover:bg-muted/80 disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="text-base font-bold w-6 text-center">{additionalStakePackages}</span>
                          <button
                            onClick={() => setAdditionalStakePackages(Math.min(10, additionalStakePackages + 1))}
                            disabled={additionalStakePackages >= 10}
                            className="w-7 h-7 rounded bg-foreground text-background flex items-center justify-center hover:opacity-90 disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {additionalStakePackages > 0 && (
                        <div className="pt-2 mt-2 border-t border-border/40 space-y-1">
                          <p className="text-xs text-secondary">
                            Total stake: {(50000 + additionalStakePackages * 100000).toLocaleString()} SOL
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Cost: ${(additionalStakePackages * 350).toLocaleString()}/mo
                            </span>
                            {selectedCommitment === "3months" && (
                              <span className="text-secondary font-medium">10% discount applied</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commitment Selection */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Commitment
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {commitments.map((commitment) => (
                  <button
                    key={commitment.id}
                    onClick={() => setSelectedCommitment(commitment.id)}
                    className={`py-2 px-2 rounded text-xs font-medium transition-all ${
                      selectedCommitment === commitment.id
                        ? "bg-foreground text-background"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <div>{commitment.name}</div>
                    <div className={`text-[10px] mt-0.5 ${
                      commitment.discount > 0 
                        ? selectedCommitment === commitment.id ? "opacity-80" : "text-secondary" 
                        : "opacity-60"
                    }`}>
                      {commitment.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rent Access Option */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Add-ons
              </label>
              <button
                onClick={() => setRentAccessEnabled(!rentAccessEnabled)}
                className={`w-full py-3 px-4 rounded text-left transition-all flex items-center justify-between ${
                  rentAccessEnabled
                    ? "bg-foreground/10 border border-foreground/30"
                    : "bg-muted/30 border border-border/40 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                    rentAccessEnabled ? "bg-foreground border-foreground" : "border-muted-foreground/50"
                  }`}>
                    {rentAccessEnabled && <Check className="w-2.5 h-2.5 text-background" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Rent Access</p>
                    <p className="text-xs text-muted-foreground">
                      Rent unused capacity to others
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">+15%</span>
              </button>
            </div>

            {/* Admin Test Mode Toggle */}
            {!isDedicated && isAdmin && (
              <div className="mb-5">
                <button
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={`w-full flex items-center justify-between p-3 rounded transition-all ${
                    isTestMode
                      ? "bg-yellow-500/10 border border-yellow-500/40"
                      : "bg-muted/30 border border-border/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className={`w-4 h-4 ${isTestMode ? "text-yellow-500" : "text-muted-foreground"}`} />
                    <div className="text-left">
                      <p className={`text-sm font-medium ${isTestMode ? "text-yellow-500" : "text-foreground"}`}>
                        Test Mode
                      </p>
                      <p className="text-xs text-muted-foreground">$0.10 test orders</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors ${isTestMode ? "bg-yellow-500" : "bg-muted"}`}>
                    <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow mt-[3px] transition-transform ${isTestMode ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                  </div>
                </button>
              </div>
            )}

            {/* Discount Code */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <Tag className="w-3.5 h-3.5 inline mr-1" />
                Discount Code
              </label>
              {appliedDiscount ? (
                <div className="p-3 rounded bg-secondary/10 border border-secondary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-secondary" />
                      <span className="font-mono text-sm font-medium text-secondary">{appliedDiscount.code}</span>
                      <span className="text-xs text-muted-foreground">
                        ({appliedDiscount.discount_type === 'percentage' 
                          ? `${appliedDiscount.discount_value}% off` 
                          : `$${appliedDiscount.discount_value} off`})
                      </span>
                    </div>
                    <button onClick={removeDiscount} className="text-xs text-muted-foreground hover:text-foreground">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter code"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountError("");
                    }}
                    className="bg-muted/30 border-border/60 font-mono text-sm h-9"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={validateDiscountCode}
                    disabled={!discountCode.trim() || isValidatingCode}
                    className="h-9 px-4"
                  >
                    {isValidatingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
              {discountError && (
                <p className="text-xs text-destructive mt-1.5">{discountError}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/40 my-6" />

            {/* Price Display */}
            <div className="text-center mb-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Monthly</div>
              <div className="flex items-baseline justify-center gap-2">
                {isTrialMode ? (
                  <>
                    <span className="text-xl text-muted-foreground line-through">{formatPrice(300)}</span>
                    <span className="text-4xl font-bold text-secondary">$0</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </>
                ) : (
                  <>
                    {(discount > 0 || appliedDiscount) && (
                      <span className="text-xl text-muted-foreground line-through">
                        {formatPrice(appliedDiscount ? priceBeforeDiscount : originalPrice)}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-foreground">{formatPrice(price)}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isTrialMode 
                  ? "30-minute free trial • No payment required"
                  : appliedDiscount 
                    ? `Save ${formatPrice(discountAmount)}/mo with ${appliedDiscount.code}`
                    : discount > 0 
                      ? `Save ${formatPrice(originalPrice - price)}/mo`
                      : "Cancel anytime • No commitment"
                }
              </p>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6">
              {(isDedicated ? dedicatedFeatures : sharedFeatures).map((feature) => (
                <div key={feature} className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {/* Discord User ID Input */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline mr-1 text-[#5865F2]">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord User ID
              </label>
              
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="e.g. 123456789012345678"
                  value={discordUserId}
                  onChange={(e) => setDiscordUserId(e.target.value.replace(/\D/g, ''))}
                  className={`bg-muted/30 text-sm h-9 ${
                    discordUserId && !isValidDiscordId 
                      ? "border-destructive" 
                      : isValidDiscordId 
                        ? "border-secondary" 
                        : "border-border/60"
                  }`}
                />
                
                {discordUserId && !isValidDiscordId && (
                  <p className="text-xs text-destructive">Enter a valid Discord User ID (17-19 digits)</p>
                )}
                
                {isValidDiscordId && (
                  <div className="flex items-center gap-1.5 text-secondary text-xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Valid ID</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowDiscordGuide(!showDiscordGuide)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How do I find my Discord User ID?</span>
                  {showDiscordGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {showDiscordGuide && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 rounded bg-muted/50 border border-border/40 space-y-2">
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Open Discord → User Settings (gear icon)</li>
                          <li>Advanced → Enable Developer Mode</li>
                          <li>Click your profile → "Copy User ID"</li>
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CTA Button */}
            {isTrialMode ? (
              <Button 
                size="lg" 
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium"
                disabled={!isValidDiscordId || isTrialProcessing}
                onClick={handleTrialOrder}
              >
                {isTrialProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {isValidDiscordId ? "Start Free Trial" : "Enter Discord ID"}
                  </>
                )}
              </Button>
            ) : (
              <Button 
                size="lg" 
                className="w-full bg-foreground hover:bg-foreground/90 text-background font-medium"
                disabled={!isValidDiscordId}
                onClick={() => setIsPaymentOpen(true)}
              >
                <Zap className="w-4 h-4 mr-2" />
                {isValidDiscordId ? "Subscribe Now" : "Enter Discord ID"}
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground mt-3">
              {isTrialMode ? "No payment required • Instant activation" : "Secure crypto payment • Instant activation"}
            </p>
          </div>
        </motion.div>

        {/* Crypto Payment Modal */}
        <CryptoPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          amount={price}
          commitment={selectedCommitment}
          serverType={selectedServerType}
          rentAccessEnabled={rentAccessEnabled}
          isTestMode={isTestMode}
          discordUserId={discordUserId.trim()}
          appliedDiscount={appliedDiscount}
        />

        {/* Discord CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center mt-10"
        >
          <p className="text-muted-foreground text-sm mb-3">Questions? Join our community</p>
          <a
            href="https://discord.gg/omeganode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#5865F2] text-white text-sm font-medium hover:bg-[#4752C4] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join Discord
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
