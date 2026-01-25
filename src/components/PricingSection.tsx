import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Check, Zap, Cpu, Server, Plus, FlaskConical, HelpCircle, ChevronDown, ChevronUp, Tag, Loader2, Gift } from "lucide-react";
import CryptoPaymentModal from "./CryptoPaymentModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const serverTypes = [
  { id: "shared", name: "Shared", description: "Shared with other users" },
  { id: "dedicated", name: "Dedicated", description: "Full control & custom limits" },
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
  { id: "monthly", name: "Monthly", months: 1, discount: 0, label: "Flexible" },
  { id: "3months", name: "3 Months", months: 3, discount: 0.15, label: "-15%" },
  { id: "6months", name: "6 Months", months: 6, discount: 0.22, label: "-22%" },
  { id: "1year", name: "1 Year", months: 12, discount: 0.30, label: "-30%" },
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
}

const PricingSection = () => {
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

  const { price, originalPrice, discount, discountAmount, priceBeforeDiscount } = useMemo(() => {
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
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setDiscountError("This discount code has expired");
        setAppliedDiscount(null);
        return;
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        setDiscountError("This discount code has reached its maximum uses");
        setAppliedDiscount(null);
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

  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground">
            No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="max-w-4xl mx-auto grid lg:grid-cols-5 gap-6">
          
          {/* Left: Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3 space-y-5"
          >
            {/* Server Type */}
            <div className="p-5 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-semibold mb-3">Server Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {serverTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedServerType(type.id);
                      if (type.id === "dedicated") setIsTrialMode(false);
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedServerType === type.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {type.id === "dedicated" && <Server className="w-4 h-4 text-primary" />}
                      <span className="font-medium">{type.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Trial Option - Shared Only */}
            {!isDedicated && (
              <button
                onClick={() => setIsTrialMode(!isTrialMode)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isTrialMode ? "border-secondary bg-secondary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isTrialMode ? "border-secondary bg-secondary" : "border-muted-foreground/40"
                    }`}>
                      {isTrialMode && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-secondary" />
                        <span className="font-medium">Free Trial</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">30 minutes, no payment needed</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-secondary">FREE</span>
                </div>
              </button>
            )}

            {/* Dedicated Options */}
            <AnimatePresence>
              {isDedicated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5"
                >
                  {/* Deployment Notice */}
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm text-amber-400">
                      <strong>⏱ Deployment Time:</strong> Dedicated servers typically take 1-3 working days to be deployed and configured.
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="p-5 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Hardware</h3>
                      <span className="ml-auto text-xs font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded">10% OFF</span>
                    </div>
                    <div className="space-y-2">
                      {dedicatedSpecs.map((spec) => (
                        <button
                          key={spec.id}
                          onClick={() => setSelectedDedicatedSpec(spec.id)}
                          className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                            selectedDedicatedSpec === spec.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm">{spec.cpu}</p>
                            <p className="text-xs text-muted-foreground">{spec.memory}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground line-through">${spec.originalPrice}</span>
                            <span className="text-lg font-bold ml-2">${spec.price}</span>
                            <span className="text-xs text-muted-foreground">/mo</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stake Packages */}
                  <div className="p-5 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Plus className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">SwQoS Stake</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">100,000 SOL per package</p>
                        <p className="text-xs text-muted-foreground">$350/mo each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAdditionalStakePackages(Math.max(0, additionalStakePackages - 1))}
                          disabled={additionalStakePackages === 0}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-40"
                        >−</button>
                        <span className="w-8 text-center font-bold">{additionalStakePackages}</span>
                        <button
                          onClick={() => setAdditionalStakePackages(Math.min(10, additionalStakePackages + 1))}
                          className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                        >+</button>
                      </div>
                    </div>
                    {additionalStakePackages > 0 && (
                      <p className="text-xs text-secondary mt-2">
                        Total: {(50000 + additionalStakePackages * 100000).toLocaleString()} SOL
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Commitment */}
            <div className="p-5 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-semibold mb-3">Billing Period</h3>
              <div className="grid grid-cols-4 gap-2">
                {commitments.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCommitment(c.id)}
                    className={`py-2.5 px-2 rounded-lg text-center transition-all ${
                      selectedCommitment === c.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className={`text-xs mt-0.5 ${
                      c.discount > 0 
                        ? selectedCommitment === c.id ? "text-primary-foreground/80" : "text-secondary font-semibold" 
                        : "opacity-60"
                    }`}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rent Access */}
            <button
              onClick={() => setRentAccessEnabled(!rentAccessEnabled)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                rentAccessEnabled ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    rentAccessEnabled ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}>
                    {rentAccessEnabled && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <span className="font-medium">Rent Access</span>
                    <p className="text-xs text-muted-foreground">Earn by sharing unused capacity</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">+15%</span>
              </div>
            </button>

            {/* Admin Test Mode */}
            {!isDedicated && isAdmin && (
              <button
                onClick={() => setIsTestMode(!isTestMode)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isTestMode ? "border-yellow-500 bg-yellow-500/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FlaskConical className={`w-5 h-5 ${isTestMode ? "text-yellow-500" : "text-muted-foreground"}`} />
                  <div>
                    <span className={`font-medium ${isTestMode ? "text-yellow-500" : ""}`}>Test Mode (Admin)</span>
                    <p className="text-xs text-muted-foreground">Create $0.10 test orders</p>
                  </div>
                </div>
              </button>
            )}

            {/* Discount Code */}
            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Discount Code</h3>
              </div>
              {appliedDiscount ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-secondary" />
                    <span className="font-mono font-bold text-secondary">{appliedDiscount.code}</span>
                    <span className="text-xs text-muted-foreground">
                      ({appliedDiscount.discount_type === 'percentage' ? `${appliedDiscount.discount_value}%` : `$${appliedDiscount.discount_value}`} off)
                    </span>
                  </div>
                  <button onClick={removeDiscount} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(""); }}
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={validateDiscountCode} disabled={!discountCode.trim() || isValidatingCode}>
                    {isValidatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
              {discountError && <p className="text-xs text-destructive mt-2">{discountError}</p>}
            </div>
          </motion.div>

          {/* Right: Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="sticky top-24 p-6 rounded-xl bg-card border border-border">
              {/* Price */}
              <div className="text-center mb-6 pb-6 border-b border-border">
                {isTrialMode ? (
                  <>
                    <div className="text-2xl text-muted-foreground line-through mb-1">{formatPrice(300)}</div>
                    <div className="text-5xl font-bold text-secondary">$0</div>
                    <p className="text-sm text-muted-foreground mt-1">30-min free trial</p>
                  </>
                ) : (
                  <>
                    {(discount > 0 || appliedDiscount) && (
                      <div className="text-xl text-muted-foreground line-through mb-1">
                        {formatPrice(appliedDiscount ? priceBeforeDiscount : originalPrice)}
                      </div>
                    )}
                    <div className="text-5xl font-bold">{formatPrice(price)}</div>
                    <p className="text-muted-foreground mt-1">/month</p>
                    {discount > 0 && !appliedDiscount && (
                      <p className="text-sm text-secondary mt-2">Save {formatPrice(originalPrice - price)}/mo</p>
                    )}
                    {appliedDiscount && (
                      <p className="text-sm text-secondary mt-2">Code saves {formatPrice(discountAmount)}/mo</p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {(isDedicated ? dedicatedFeatures : sharedFeatures).map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>

              {/* Regions Badge */}
              {!isDedicated && (
                <div className="p-3 rounded-lg bg-muted/50 mb-6">
                  <p className="text-xs text-center">
                    <span className="font-medium">All regions:</span>{" "}
                    <span className="text-muted-foreground">🇺🇸 NY • 🇩🇪 Frankfurt • 🇳🇱 Amsterdam</span>
                  </p>
                </div>
              )}

              {/* Discord ID */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Discord User ID
                </label>
                <Input
                  placeholder="123456789012345678"
                  value={discordUserId}
                  onChange={(e) => setDiscordUserId(e.target.value.replace(/\D/g, ''))}
                  className={`${discordUserId && !isValidDiscordId ? "border-destructive" : isValidDiscordId ? "border-secondary" : ""}`}
                />
                {isValidDiscordId && <p className="text-xs text-secondary mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Valid</p>}
                
                <button
                  onClick={() => setShowDiscordGuide(!showDiscordGuide)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  How to find ID?
                  {showDiscordGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                <AnimatePresence>
                  {showDiscordGuide && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Discord Settings → Advanced</li>
                          <li>Enable Developer Mode</li>
                          <li>Click profile → Copy User ID</li>
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* CTA */}
              <Button
                size="lg"
                className={`w-full ${isTrialMode ? "bg-secondary hover:bg-secondary/90" : ""}`}
                variant={isTrialMode ? "default" : "omega"}
                disabled={!isValidDiscordId || isTrialProcessing}
                onClick={isTrialMode ? handleTrialOrder : () => setIsPaymentOpen(true)}
              >
                {isTrialProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> {isValidDiscordId ? (isTrialMode ? "Start Trial" : "Subscribe") : "Enter Discord ID"}</>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-3">
                {isTrialMode ? "No payment required" : "Crypto payment • Instant access"}
              </p>
            </div>
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
        />

        {/* Discord CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground text-sm mb-3">Questions?</p>
          <a
            href="https://discord.gg/omeganode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#5865F2] text-white text-sm font-medium hover:bg-[#4752C4] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join Discord
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
