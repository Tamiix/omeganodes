import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Check, Zap, Cpu, Server, Plus, FlaskConical, HelpCircle, ChevronDown, ChevronUp, Tag, Loader2, Gift, Clock, Shield, Sparkles } from "lucide-react";
import CryptoPaymentModal from "./CryptoPaymentModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const serverTypes = [
  { id: "shared", name: "Shared", description: "Multi-tenant infrastructure" },
  { id: "dedicated", name: "Dedicated", description: "Your own hardware" },
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
  { id: "monthly", name: "Monthly", months: 1, discount: 0, label: "" },
  { id: "3months", name: "3 Months", months: 3, discount: 0.15, label: "15% off" },
  { id: "6months", name: "6 Months", months: 6, discount: 0.22, label: "22% off" },
  { id: "1year", name: "1 Year", months: 12, discount: 0.30, label: "30% off" },
];

const dedicatedFeatures = [
  "JITO Shredstream & Omega improvements",
  "Yellowstone gRPC included",
  "Arbitrage friendly limits",
  "Dedicated staked connection",
  "Base stake: 50,000 SOL",
];

const sharedFeatures = [
  "Full RPC node access",
  "Priority Discord support",
  "99.99% uptime SLA",
  "All 3 regions included",
  "Real-time monitoring",
  "Dedicated endpoint",
];

interface AppliedDiscount {
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  applicable_to: 'shared' | 'dedicated' | 'both';
}

const PricingSection = () => {
  const [selectedCommitment, setSelectedCommitment] = useState("monthly");
  const [selectedServerType, setSelectedServerType] = useState("shared");
  const [selectedDedicatedSpec, setSelectedDedicatedSpec] = useState("epyc-9354p");
  const [additionalStakePackages, setAdditionalStakePackages] = useState(0);
  const [privateShredsEnabled, setPrivateShredsEnabled] = useState(false);
  const [rentAccessEnabled, setRentAccessEnabled] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [discordUserId, setDiscordUserId] = useState("");
  const [showDiscordGuide, setShowDiscordGuide] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [isTrialProcessing, setIsTrialProcessing] = useState(false);
  const [isFreeOrderProcessing, setIsFreeOrderProcessing] = useState(false);
  const [trialsEnabled, setTrialsEnabled] = useState(false);
  
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const { formatPrice } = useCurrency();
  const { isAdmin, user } = useAuth();

  const isValidDiscordId = /^\d{17,19}$/.test(discordUserId.trim());
  const isDedicated = selectedServerType === "dedicated";
  
  // Check if commitment discount is active (any commitment other than monthly)
  const hasCommitmentDiscount = selectedCommitment !== "monthly";

  // Fetch trials enabled setting from database
  useEffect(() => {
    const fetchTrialSetting = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'trials_enabled')
        .maybeSingle();
      
      if (data?.value && typeof data.value === 'object' && 'enabled' in data.value) {
        setTrialsEnabled((data.value as { enabled: boolean }).enabled);
      }
    };
    fetchTrialSetting();
  }, []);

  // Clear discount code when switching to a commitment with discount
  useEffect(() => {
    if (hasCommitmentDiscount && appliedDiscount) {
      setAppliedDiscount(null);
      setDiscountCode("");
      setDiscountError("");
    }
  }, [hasCommitmentDiscount]);

  // Clear discount code when switching server type if code doesn't apply
  useEffect(() => {
    if (appliedDiscount && appliedDiscount.applicable_to !== 'both' && appliedDiscount.applicable_to !== selectedServerType) {
      setAppliedDiscount(null);
      setDiscountCode("");
      setDiscountError(`Code was removed - only valid for ${appliedDiscount.applicable_to} servers`);
    }
  }, [selectedServerType]);

  const { price, originalPrice, discount, discountAmount, priceBeforeDiscount } = useMemo(() => {
    let serverPrice = 0;
    let addOnsPrice = 0;
    let beforeDiscount = 0;
    let discountPercent = 0;

    if (isDedicated) {
      const spec = dedicatedSpecs.find(s => s.id === selectedDedicatedSpec);
      const basePrice = spec?.price || 2700;
      const stakeDiscountPercent = selectedCommitment === "3months" ? 0.10 : 0;
      const stakePerPackage = 350 * (1 - stakeDiscountPercent);
      const stakeAddition = additionalStakePackages * stakePerPackage;
      const shredsAddition = privateShredsEnabled ? 800 : 0;
      const commitment = commitments.find(c => c.id === selectedCommitment);
      discountPercent = commitment?.discount || 0;
      
      // Server price with commitment discount
      serverPrice = Math.round(basePrice * (1 - discountPercent));
      // Add-ons are NOT discounted by commitment or discount codes
      addOnsPrice = stakeAddition + shredsAddition;
      beforeDiscount = basePrice + (additionalStakePackages * 350) + shredsAddition;
    } else {
      const basePrice = 300;
      const commitment = commitments.find(c => c.id === selectedCommitment);
      discountPercent = commitment?.discount || 0;
      serverPrice = Math.round(basePrice * (1 - discountPercent));
      addOnsPrice = 0;
      beforeDiscount = basePrice;
    }

    const rentCost = rentAccessEnabled ? Math.round((serverPrice + addOnsPrice) * 0.15) : 0;
    const totalBeforeCodeDiscount = serverPrice + addOnsPrice + rentCost;
    const finalOriginal = rentAccessEnabled ? Math.round(beforeDiscount * 1.15) : beforeDiscount;

    // Discount codes only apply to server price, not add-ons
    let codeDiscountAmount = 0;
    let discountableAmount = serverPrice + (rentAccessEnabled ? Math.round(serverPrice * 0.15) : 0);
    
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        codeDiscountAmount = Math.round(discountableAmount * (appliedDiscount.discount_value / 100));
      } else {
        codeDiscountAmount = Math.min(appliedDiscount.discount_value, discountableAmount);
      }
    }
    
    const finalPrice = Math.max(0, totalBeforeCodeDiscount - codeDiscountAmount);

    return { 
      price: finalPrice, 
      originalPrice: finalOriginal, 
      discount: discountPercent,
      discountAmount: codeDiscountAmount,
      priceBeforeDiscount: totalBeforeCodeDiscount
    };
  }, [selectedCommitment, selectedServerType, selectedDedicatedSpec, additionalStakePackages, privateShredsEnabled, isDedicated, rentAccessEnabled, appliedDiscount]);

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) return;
    setIsValidatingCode(true);
    setDiscountError("");
    
    try {
      // Use secure RPC function instead of direct table access
      const { data, error } = await supabase
        .rpc('validate_discount_code', {
          code_to_validate: discountCode.trim().toUpperCase(),
          server_type: selectedServerType
        });

      if (error) {
        console.error("Error validating discount code:", error);
        setDiscountError("Failed to validate discount code");
        setAppliedDiscount(null);
        return;
      }

      const result = data?.[0];
      
      if (!result || !result.is_valid) {
        setDiscountError(result?.error_message || "Invalid discount code");
        setAppliedDiscount(null);
        return;
      }

      setAppliedDiscount({
        code: result.code,
        discount_type: result.discount_type as 'percentage' | 'flat',
        discount_value: result.discount_value,
        applicable_to: result.applicable_to as 'shared' | 'dedicated' | 'both'
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
        const fallback = btoa(navigator.userAgent + screen.width + screen.height + navigator.language + new Date().getTimezoneOffset());
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
        body: { discordId: discordUserId.trim(), fingerprint, email: user?.email || null, userId: user?.id || null }
      });

      if (validationError || !validationResult?.allowed) {
        const { toast } = await import("@/hooks/use-toast");
        toast({
          title: validationError ? "Validation Error" : "Trial Not Available",
          description: validationError ? "Unable to validate trial request." : validationResult?.message || "You have already used a trial.",
          variant: "destructive"
        });
        setIsTrialProcessing(false);
        return;
      }

      const trialSignature = `TRIAL-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      if (user) {
        await supabase.from('orders').insert({
          user_id: user.id, order_number: "TEMP", plan_name: "Trial (30 min)", commitment: "trial",
          server_type: "shared", location: "all", rps: 100, tps: 50, amount_usd: 0,
          currency_code: "FREE", currency_amount: 0, payment_method: "trial",
          transaction_signature: trialSignature, status: "active", expires_at: expiresAt.toISOString(), is_test_order: false
        });
      }
      
      await supabase.functions.invoke('discord-order-notification', {
        body: {
          plan: "Trial (30 min)", commitment: "trial", serverType: "Shared", email: user?.email || "Not logged in",
          discordId: discordUserId.trim(), totalAmount: 0, transactionSignature: trialSignature, isTestMode: false, isTrial: true
        }
      });
      
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Trial Activated!", description: "Check Discord for access details." });
    } catch (err) {
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Error", description: "Failed to activate trial.", variant: "destructive" });
    } finally {
      setIsTrialProcessing(false);
      setIsTrialMode(false);
    }
  };

  const handleFreeOrder = async () => {
    if (!isValidDiscordId || !user) return;
    setIsFreeOrderProcessing(true);
    
    try {
      const commitment = commitments.find(c => c.id === selectedCommitment);
      const months = commitment?.months || 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      
      const freeSignature = `FREE-${Date.now().toString(36).toUpperCase()}`;
      const planName = isDedicated 
        ? `Dedicated (${dedicatedSpecs.find(s => s.id === selectedDedicatedSpec)?.cpu || 'Custom'})`
        : 'Shared';

      // Create the order
      await supabase.from('orders').insert({
        user_id: user.id,
        order_number: "TEMP",
        plan_name: planName,
        commitment: selectedCommitment,
        server_type: selectedServerType,
        location: isDedicated ? "custom" : "all",
        rps: 100,
        tps: 50,
        amount_usd: 0,
        currency_code: "FREE",
        currency_amount: 0,
        payment_method: "discount_code",
        transaction_signature: freeSignature,
        status: "active",
        expires_at: expiresAt.toISOString(),
        is_test_order: false
      });

      // Note: Discount code usage increment would be handled by the backend
      // For now, we'll skip the increment since there's no RPC function set up

      // Send Discord notification
      await supabase.functions.invoke('discord-order-notification', {
        body: {
          plan: planName,
          commitment: commitment?.name || 'Monthly',
          serverType: isDedicated ? 'Dedicated' : 'Shared',
          email: user.email,
          discordId: discordUserId.trim(),
          totalAmount: 0,
          transactionSignature: freeSignature,
          isTestMode: false,
          isTrial: false,
          discountCode: appliedDiscount?.code,
          additionalStakePackages: isDedicated ? additionalStakePackages : 0,
          privateShredsEnabled: isDedicated ? privateShredsEnabled : false,
          rentAccessEnabled: rentAccessEnabled
        }
      });

      const { toast } = await import("@/hooks/use-toast");
      toast({ 
        title: "Order Successful!", 
        description: "Your free order has been processed. Check Discord for access details." 
      });
      
      // Reset discount
      setAppliedDiscount(null);
      setDiscountCode("");
    } catch (err) {
      console.error("Error processing free order:", err);
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Error", description: "Failed to process order.", variant: "destructive" });
    } finally {
      setIsFreeOrderProcessing(false);
    }
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Vibrant gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/15 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[120px]" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple & Transparent</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Choose Your <span className="text-gradient-omega">Plan</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            No hidden fees. Enterprise infrastructure at your fingertips.
          </p>
        </motion.div>

        {/* Server Type Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-2xl bg-card/80 backdrop-blur border border-border shadow-lg">
            {serverTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedServerType(type.id);
                  if (type.id === "dedicated") setIsTrialMode(false);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                  selectedServerType === type.id
                    ? "bg-gradient-omega text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {type.id === "shared" ? <Shield className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            
            {/* Left: Options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3 space-y-4"
            >
              {/* Free Trial - Shared Only (only show if trials are enabled) */}
              {!isDedicated && trialsEnabled && (
                <div 
                  onClick={() => setIsTrialMode(!isTrialMode)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    isTrialMode 
                      ? "border-secondary bg-gradient-to-r from-secondary/10 to-secondary/5 shadow-secondary/20 shadow-lg" 
                      : "border-border bg-card/50 backdrop-blur hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isTrialMode ? "bg-secondary text-white" : "bg-secondary/10"
                      }`}>
                        <Gift className={`w-5 h-5 ${isTrialMode ? "text-white" : "text-secondary"}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          Free Trial
                          {isTrialMode && <span className="text-xs bg-secondary text-white px-2 py-0.5 rounded-full">Active</span>}
                        </h3>
                        <p className="text-sm text-muted-foreground">30 minutes, no payment required</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isTrialMode ? "border-secondary bg-secondary" : "border-muted-foreground/30"
                    }`}>
                      {isTrialMode && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </div>
              )}

              {/* Dedicated Server Options */}
              <AnimatePresence>
                {isDedicated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Deployment Notice */}
                    <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          Dedicated servers take <strong className="text-foreground">1-3 working days</strong> to deploy and configure.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-muted-foreground">
                          Need a specific location? We can deploy in <strong className="text-foreground">almost any region</strong> on request.
                        </p>
                      </div>
                    </div>

                    {/* Hardware Selection */}
                    <div className="p-5 rounded-2xl bg-card/50 backdrop-blur border border-border">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-omega flex items-center justify-center">
                          <Cpu className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold">Hardware</h3>
                      </div>
                      <div className="space-y-2">
                        {dedicatedSpecs.map((spec) => (
                          <button
                            key={spec.id}
                            onClick={() => setSelectedDedicatedSpec(spec.id)}
                            className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                              selectedDedicatedSpec === spec.id
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-transparent bg-muted/30 hover:bg-muted/50 hover:border-border"
                            }`}
                          >
                            <div>
                              <p className="font-medium">{spec.cpu}</p>
                              <p className="text-sm text-muted-foreground">{spec.memory}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-bold text-primary">${spec.price}</span>
                              <span className="text-sm text-muted-foreground">/mo</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SwQoS Stake */}
                    <div className="p-5 rounded-2xl bg-card/50 backdrop-blur border border-border">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-omega flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold">Additional Stake</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">100,000 SOL per package</p>
                          <p className="text-sm text-muted-foreground">$350/month each</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setAdditionalStakePackages(Math.max(0, additionalStakePackages - 1))}
                            disabled={additionalStakePackages === 0}
                            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 transition-all"
                          >−</button>
                          <span className="w-8 text-center text-xl font-bold">{additionalStakePackages}</span>
                          <button
                            onClick={() => setAdditionalStakePackages(Math.min(10, additionalStakePackages + 1))}
                            className="w-10 h-10 rounded-xl bg-gradient-omega text-white flex items-center justify-center text-lg font-medium hover:opacity-90 transition-all"
                          >+</button>
                        </div>
                      </div>
                      {additionalStakePackages > 0 && (
                        <p className="text-sm text-secondary mt-3 font-medium">
                          Total stake: {(50000 + additionalStakePackages * 100000).toLocaleString()} SOL
                        </p>
                      )}
                    </div>

                    {/* Private Shreds */}
                    <div className="p-5 rounded-2xl bg-card/50 backdrop-blur border border-border">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-omega flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold">Private Shreds</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Faster gRPC & transaction landing</p>
                          <p className="text-sm text-muted-foreground">$800/month</p>
                        </div>
                        <button
                          onClick={() => setPrivateShredsEnabled(!privateShredsEnabled)}
                          className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                            privateShredsEnabled 
                              ? "bg-gradient-omega text-white shadow-md" 
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {privateShredsEnabled ? "Added" : "Add"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Billing Period */}
              <div className="p-5 rounded-2xl bg-card/50 backdrop-blur border border-border">
                <h3 className="font-semibold mb-4">Billing Period</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {commitments.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCommitment(c.id)}
                      className={`relative py-3 px-3 rounded-xl text-center transition-all ${
                        selectedCommitment === c.id
                          ? "bg-gradient-omega text-white shadow-md"
                          : "bg-muted/30 hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className="font-medium text-sm">{c.name}</div>
                      {c.label && (
                        <div className={`text-xs mt-0.5 ${
                          selectedCommitment === c.id ? "text-white/80" : "text-secondary font-medium"
                        }`}>{c.label}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rent Access */}
              <div 
                onClick={() => setRentAccessEnabled(!rentAccessEnabled)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  rentAccessEnabled 
                    ? "border-primary bg-gradient-to-r from-primary/10 to-accent/5 shadow-primary/20 shadow-lg" 
                    : "border-border bg-card/50 backdrop-blur hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      rentAccessEnabled ? "bg-gradient-omega" : "bg-primary/10"
                    }`}>
                      <Zap className={`w-5 h-5 ${rentAccessEnabled ? "text-white" : "text-primary"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Rent Access</h3>
                      <p className="text-sm text-muted-foreground">Earn by sharing unused endpoints</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">+15%</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      rentAccessEnabled ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {rentAccessEnabled && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Discount Code */}
              <div className={`p-5 rounded-2xl bg-card/50 backdrop-blur border border-border transition-opacity ${hasCommitmentDiscount ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Tag className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Discount Code</h3>
                  {hasCommitmentDiscount && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      Not available with commitment discounts
                    </span>
                  )}
                </div>
                {hasCommitmentDiscount ? (
                  <p className="text-sm text-muted-foreground">
                    Discount codes cannot be combined with commitment discounts. Switch to monthly billing to use a code.
                  </p>
                ) : appliedDiscount ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      <span className="font-mono font-bold text-secondary">{appliedDiscount.code}</span>
                      <span className="text-sm text-muted-foreground">
                        ({appliedDiscount.discount_type === 'percentage' ? `${appliedDiscount.discount_value}%` : `$${appliedDiscount.discount_value}`} off)
                      </span>
                    </div>
                    <button onClick={removeDiscount} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(""); }}
                      className="font-mono bg-background/50"
                    />
                    <Button variant="outline" onClick={validateDiscountCode} disabled={!discountCode.trim() || isValidatingCode} className="hover:bg-primary hover:text-white hover:border-primary">
                      {isValidatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {discountError && <p className="text-sm text-destructive mt-2">{discountError}</p>}
              </div>

              {/* Admin Test Mode */}
              {!isDedicated && isAdmin && (
                <div 
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isTestMode 
                      ? "border-yellow-500 bg-gradient-to-r from-yellow-500/10 to-orange-500/5" 
                      : "border-border bg-card/50 backdrop-blur hover:border-yellow-500/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isTestMode ? "bg-yellow-500 text-black" : "bg-yellow-500/10"
                    }`}>
                      <FlaskConical className={`w-5 h-5 ${isTestMode ? "" : "text-yellow-500"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Test Mode (Admin)</h3>
                      <p className="text-sm text-muted-foreground">Create $0.10 test orders</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right: Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="sticky top-24 p-6 rounded-2xl bg-gradient-to-b from-card to-card/80 backdrop-blur border border-border shadow-xl">
                {/* Price Display */}
                <div className="text-center pb-6 mb-6 border-b border-border">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 mb-4">
                    <span className="text-xs font-medium text-primary">
                      {isDedicated ? "Dedicated Server" : "Shared Infrastructure"}
                    </span>
                  </div>
                  
                  {isTrialMode ? (
                    <>
                      <div className="text-2xl text-muted-foreground line-through mb-1">{formatPrice(300)}</div>
                      <div className="text-5xl font-bold text-gradient-omega">$0</div>
                      <p className="text-sm text-secondary mt-2 font-medium">30-minute free trial</p>
                    </>
                  ) : (
                    <>
                      {(discount > 0 || appliedDiscount) && (
                        <div className="text-xl text-muted-foreground line-through mb-1">
                          {formatPrice(appliedDiscount ? priceBeforeDiscount : originalPrice)}
                        </div>
                      )}
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold text-gradient-omega">{formatPrice(price)}</span>
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                      {discount > 0 && !appliedDiscount && (
                        <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-secondary/10">
                          <Sparkles className="w-3 h-3 text-secondary" />
                          <span className="text-sm text-secondary font-medium">
                            Saving {formatPrice(originalPrice - price)}/month
                          </span>
                        </div>
                      )}
                      {appliedDiscount && (
                        <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-secondary/10">
                          <Tag className="w-3 h-3 text-secondary" />
                          <span className="text-sm text-secondary font-medium">
                            Code saves {formatPrice(discountAmount)}/month
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {(isDedicated ? dedicatedFeatures : sharedFeatures).map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-omega flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Regions */}
                {!isDedicated && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 mb-6 text-center">
                    <span className="text-sm font-medium">🇺🇸 NY • 🇩🇪 Frankfurt • 🇳🇱 Amsterdam</span>
                  </div>
                )}

                {/* Discord ID Input */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#5865F2">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord User ID
                  </label>
                  <Input
                    placeholder="123456789012345678"
                    value={discordUserId}
                    onChange={(e) => setDiscordUserId(e.target.value.replace(/\D/g, ''))}
                    className={`bg-background/50 ${discordUserId && !isValidDiscordId ? "border-destructive" : isValidDiscordId ? "border-secondary" : ""}`}
                  />
                  {isValidDiscordId && (
                    <p className="text-xs text-secondary mt-1.5 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" /> Valid Discord ID
                    </p>
                  )}
                  
                  <button
                    onClick={() => setShowDiscordGuide(!showDiscordGuide)}
                    className="text-xs text-muted-foreground hover:text-primary mt-2 flex items-center gap-1 transition-colors"
                  >
                    <HelpCircle className="w-3 h-3" />
                    How to find your ID?
                    {showDiscordGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  
                  <AnimatePresence>
                    {showDiscordGuide && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: "auto" }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Open Discord Settings → Advanced</li>
                            <li>Enable Developer Mode</li>
                            <li>Right-click your profile → Copy User ID</li>
                          </ol>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CTA Button */}
                <Button
                  size="lg"
                  className={`w-full text-base font-semibold ${
                    isTrialMode 
                      ? "bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/25" 
                      : price === 0
                        ? "bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/25"
                        : "bg-gradient-omega hover:opacity-90 shadow-lg shadow-primary/25"
                  }`}
                  disabled={!isValidDiscordId || isTrialProcessing || isFreeOrderProcessing || (price === 0 && !user)}
                  onClick={() => {
                    if (isTrialMode) {
                      handleTrialOrder();
                    } else if (price === 0) {
                      handleFreeOrder();
                    } else {
                      setIsPaymentOpen(true);
                    }
                  }}
                >
                  {isTrialProcessing || isFreeOrderProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isFreeOrderProcessing ? "Processing..." : "Activating..."}
                    </>
                  ) : (
                    <>
                      {!isValidDiscordId 
                        ? "Enter Discord ID" 
                        : isTrialMode 
                          ? "Start Free Trial" 
                          : price === 0 
                            ? (user ? "Get Free Access" : "Login to Continue")
                            : "Continue to Payment"}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  {isTrialMode 
                    ? "No payment required • Instant access" 
                    : price === 0 
                      ? "100% discount applied • No payment required"
                      : "Secure crypto payment • USDC/USDT"
                  }
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Discord Support CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-4">Have questions? We're here to help.</p>
          <a
            href="https://discord.gg/omeganode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-all shadow-lg shadow-[#5865F2]/25"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join Discord
          </a>
        </motion.div>
      </div>

      {/* Payment Modal */}
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
        includeShredsFromPricing={privateShredsEnabled}
        additionalStakePackages={additionalStakePackages}
      />
    </section>
  );
};

export default PricingSection;
