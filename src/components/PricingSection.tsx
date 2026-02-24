import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Check, Zap, Cpu, Server, Plus, FlaskConical, HelpCircle, ChevronDown, ChevronUp, Tag, Loader2, Gift, Clock, Shield, Sparkles, Lock, LogIn, MapPin } from "lucide-react";
import CryptoPaymentModal from "./CryptoPaymentModal";
import AuthModal from "./AuthModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const serverTypes = [
  { id: "shared", name: "Shared", description: "Multi-tenant infrastructure" },
  { id: "dedicated", name: "Dedicated", description: "Your own hardware" },
  { id: "shreds", name: "Shreds", description: "Standalone shred access" },
];

const dedicatedSpecs = [
  { 
    id: "epyc-9354p", 
    cpu: "AMD EPYC 9354p", 
    memory: "1024GB RAM", 
    price: 1500
  },
  { 
    id: "epyc-9374f", 
    cpu: "AMD EPYC 9374F", 
    memory: "1024GB RAM", 
    price: 1650
  },
];

const commitments = [
  { id: "daily", name: "Daily", months: 0, discount: 0, label: "Trial only", trialOnly: true },
  { id: "monthly", name: "Monthly", months: 1, discount: 0, label: "" },
  { id: "3months", name: "3 Months", months: 3, discount: 0.08, label: "8% off" },
  { id: "6months", name: "6 Months", months: 6, discount: 0.15, label: "15% off" },
  { id: "1year", name: "1 Year", months: 12, discount: 0.23, label: "23% off" },
];

const dedicatedFeatures = [
  "JITO Shredstream, various other shred sources & in-house Omega improvements",
  "Yellowstone gRPC included",
  "Arbitrage friendly limits",
  "Dedicated staked connection",
  "Base stake: 50,000 SOL",
];

const sharedFeatures = [
  "RPC included",
  "gRPC included",
  "WebSocket included",
  "All 3 regions included",
  "99.99% uptime guarantee",
  "Priority Discord support",
];

interface AppliedDiscount {
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  applicable_to: 'shared' | 'dedicated' | 'both';
}

const dedicatedLocations = [
  { id: "frankfurt", name: "Frankfurt", flag: "🇩🇪" },
  { id: "amsterdam", name: "Amsterdam", flag: "🇳🇱" },
  { id: "newyork", name: "New York", flag: "🇺🇸" },
];

const PricingSection = () => {
  const [selectedCommitment, setSelectedCommitment] = useState<string>("monthly");
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
  
  // Dedicated server location selection
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState("");
  const [isCustomLocationMode, setIsCustomLocationMode] = useState(false);
  
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // Unified code input (discount or trial)
  const [unifiedCode, setUnifiedCode] = useState("");
  
  // Trial code redemption state
  const [trialCode, setTrialCode] = useState("");
  const [isRedeemingTrialCode, setIsRedeemingTrialCode] = useState(false);
  const [trialCodeError, setTrialCodeError] = useState("");
  const [redeemedTrial, setRedeemedTrial] = useState<{ duration_type: string; access_expires_at: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Referral code from localStorage (set via /ref/:code link)
  const [storedReferralCode, setStoredReferralCode] = useState<string | null>(null);
  const [referralBanner, setReferralBanner] = useState<{ username: string; code: string } | null>(null);

  const { formatPrice } = useCurrency();
  const { isAdmin, user } = useAuth();

  const isValidDiscordId = /^\d{17,19}$/.test(discordUserId.trim());
  const isDedicated = selectedServerType === "dedicated";
  
  // Check if commitment discount is active (any commitment other than monthly or daily)
  const hasCommitmentDiscount = selectedCommitment !== "monthly" && selectedCommitment !== "daily";
  
  // Get the final location for dedicated servers
  const getFinalLocation = () => {
    if (isCustomLocationMode && customLocation.trim()) {
      return customLocation.trim();
    }
    if (selectedLocation) {
      const loc = dedicatedLocations.find(l => l.id === selectedLocation);
      return loc ? loc.name : null;
    }
    return null;
  };
  
  // Check if dedicated location is valid
  const hasValidLocation = !isDedicated || (isCustomLocationMode ? customLocation.trim().length > 0 : selectedLocation !== null);

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

  // Auto-apply referral code from localStorage (set by /ref/:code)
  useEffect(() => {
    const code = localStorage.getItem('referral_code');
    if (code) {
      setStoredReferralCode(code);
      // Validate the referral code to show the banner
      const validateRef = async () => {
        try {
          const { data, error } = await supabase.rpc('validate_referral_code', { p_code: code });
          if (!error && data?.[0]?.is_valid) {
            setReferralBanner({ username: data[0].referrer_username, code });
          }
        } catch (err) {
          console.error('Failed to validate stored referral code:', err);
        }
      };
      validateRef();
    }
  }, []);

  // Clear discount code when switching to a commitment with discount, or when switching to daily
  useEffect(() => {
    if ((hasCommitmentDiscount || selectedCommitment === "daily") && appliedDiscount) {
      setAppliedDiscount(null);
      setDiscountCode("");
      setDiscountError("");
    }
    // Also turn off trial mode when switching to daily
    if (selectedCommitment === "daily" && isTrialMode) {
      setIsTrialMode(false);
    }
  }, [hasCommitmentDiscount, selectedCommitment]);

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

    const rentPercent = isDedicated ? 0.20 : 0.10;
    const rentCost = rentAccessEnabled ? Math.round((serverPrice + addOnsPrice) * rentPercent) : 0;
    const totalBeforeCodeDiscount = serverPrice + addOnsPrice + rentCost;
    const finalOriginal = rentAccessEnabled ? Math.round(beforeDiscount * (1 + rentPercent)) : beforeDiscount;

    // Discount codes only apply to server price, not add-ons
    let codeDiscountAmount = 0;
    let discountableAmount = serverPrice + (rentAccessEnabled ? Math.round(serverPrice * rentPercent) : 0);
    
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        codeDiscountAmount = Math.round(discountableAmount * (appliedDiscount.discount_value / 100));
      } else {
        codeDiscountAmount = Math.min(appliedDiscount.discount_value, discountableAmount);
      }
    }

    // Apply referral discount (10% off the total)
    let referralDiscountAmount = 0;
    if (referralBanner) {
      referralDiscountAmount = Math.round((totalBeforeCodeDiscount - codeDiscountAmount) * 0.10);
    }
    
    const finalPrice = Math.max(0, totalBeforeCodeDiscount - codeDiscountAmount - referralDiscountAmount);

    return { 
      price: finalPrice, 
      originalPrice: finalOriginal, 
      discount: discountPercent,
      discountAmount: codeDiscountAmount,
      referralDiscountAmount,
      priceBeforeDiscount: totalBeforeCodeDiscount
    };
  }, [selectedCommitment, selectedServerType, selectedDedicatedSpec, additionalStakePackages, privateShredsEnabled, isDedicated, rentAccessEnabled, appliedDiscount, referralBanner]);

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
    setUnifiedCode("");
    setDiscountError("");
  };

  const handleUnifiedCodeApply = async () => {
    const code = unifiedCode.trim().toUpperCase();
    if (!code) return;
    
    // Check if it looks like a trial code (starts with TRIAL-)
    if (code.startsWith('TRIAL-')) {
      setTrialCode(code);
      setUnifiedCode("");
      // Trigger trial redemption
      if (!user) {
        setTrialCodeError("Login required to redeem trial codes");
        return;
      }
      if (!isValidDiscordId) {
        setTrialCodeError("Enter Discord ID first");
        return;
      }
      setIsRedeemingTrialCode(true);
      setTrialCodeError("");
      try {
        const { data, error } = await supabase.rpc('redeem_access_code', {
          p_code: code,
          p_discord_id: discordUserId.trim()
        });
        if (error) throw error;
        const result = data as { success: boolean; error?: string; duration_type?: string; expires_at?: string; transaction_signature?: string };
        if (!result.success) {
          setTrialCodeError(result.error || "Invalid or already redeemed code");
          return;
        }
        await supabase.functions.invoke('discord-order-notification', {
          body: {
            plan: `Trial (${TRIAL_DURATION_LABELS[result.duration_type || '1_day']})`,
            commitment: "trial", serverType: "Shared", email: user.email,
            discordId: discordUserId.trim(), totalAmount: 0,
            transactionSignature: result.transaction_signature, isTestMode: false, isTrial: true
          }
        });
        setRedeemedTrial({ duration_type: result.duration_type || '1_day', access_expires_at: result.expires_at || new Date().toISOString() });
        const { toast } = await import("@/hooks/use-toast");
        toast({ title: '🎉 Trial Code Redeemed!', description: `You now have ${TRIAL_DURATION_LABELS[result.duration_type || '1_day']} of free shared server access` });
      } catch (error) {
        console.error('Error redeeming trial code:', error);
        setTrialCodeError("Failed to redeem code. Please try again.");
      } finally {
        setIsRedeemingTrialCode(false);
      }
    } else {
      // Treat as discount code
      setDiscountCode(code);
      setIsValidatingCode(true);
      setDiscountError("");
      try {
        const { data, error } = await supabase.rpc('validate_discount_code', {
          code_to_validate: code,
          server_type: selectedServerType
        });
        if (error) { setDiscountError("Failed to validate code"); setAppliedDiscount(null); return; }
        const result = data?.[0];
        if (!result || !result.is_valid) { setDiscountError(result?.error_message || "Invalid code"); setAppliedDiscount(null); return; }
        setAppliedDiscount({
          code: result.code,
          discount_type: result.discount_type as 'percentage' | 'flat',
          discount_value: result.discount_value,
          applicable_to: result.applicable_to as 'shared' | 'dedicated' | 'both'
        });
        setDiscountError("");
        setUnifiedCode("");
      } catch (err) {
        setDiscountError("Failed to validate code");
        setAppliedDiscount(null);
      } finally {
        setIsValidatingCode(false);
      }
    }
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

  const TRIAL_DURATION_LABELS: Record<string, string> = {
    '1_hour': '1 Hour',
    '1_day': '1 Day',
    '1_week': '1 Week',
    '1_month': '1 Month',
  };

  const handleRedeemTrialCode = async () => {
    if (!trialCode.trim() || !user || !isValidDiscordId) return;
    
    setIsRedeemingTrialCode(true);
    setTrialCodeError("");
    
    try {
      // Use secure server-side RPC function to validate and redeem
      const { data, error } = await supabase.rpc('redeem_access_code', {
        p_code: trialCode.trim(),
        p_discord_id: discordUserId.trim()
      });

      if (error) throw error;
      
      const result = data as { 
        success: boolean; 
        error?: string; 
        duration_type?: string; 
        expires_at?: string;
        transaction_signature?: string;
      };
      
      if (!result.success) {
        setTrialCodeError(result.error || "Invalid or already redeemed code");
        return;
      }

      // Send Discord notification
      await supabase.functions.invoke('discord-order-notification', {
        body: {
          plan: `Trial (${TRIAL_DURATION_LABELS[result.duration_type || '1_day']})`,
          commitment: "trial",
          serverType: "Shared",
          email: user.email,
          discordId: discordUserId.trim(),
          totalAmount: 0,
          transactionSignature: result.transaction_signature,
          isTestMode: false,
          isTrial: true
        }
      });

      setRedeemedTrial({
        duration_type: result.duration_type || '1_day',
        access_expires_at: result.expires_at || new Date().toISOString(),
      });

      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: '🎉 Trial Code Redeemed!',
        description: `You now have ${TRIAL_DURATION_LABELS[result.duration_type || '1_day']} of free shared server access`,
      });
      
    } catch (error) {
      console.error('Error redeeming trial code:', error);
      setTrialCodeError("Failed to redeem code. Please try again.");
    } finally {
      setIsRedeemingTrialCode(false);
    }
  };

  const handleFreeOrder = async () => {
    if (!isValidDiscordId || !user || !hasValidLocation) return;
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
        location: isDedicated ? (getFinalLocation() || "custom") : "all",
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
          location: isDedicated ? getFinalLocation() : "all",
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
    <section id="pricing" className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-primary mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Choose your <span className="text-gradient-omega">Service</span>
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>No hidden fees</span>
            <span>•</span>
            <span>Cancel anytime</span>
            <span>•</span>
            <span>Enterprise ready</span>
          </div>
        </motion.div>

        {/* Server Type Toggle */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex p-1 rounded-lg bg-card border border-border w-full sm:w-auto">
            {serverTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedServerType(type.id);
                  if (type.id === "dedicated") setIsTrialMode(false);
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  selectedServerType === type.id
                    ? "bg-gradient-omega text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type.id === "shared" ? <Shield className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : type.id === "shreds" ? <Zap className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Server className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto relative">
          {/* Shreds Coming Soon */}
          {selectedServerType === "shreds" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-12 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Shreds Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Standalone shred access is currently in development. Join our Discord to be notified when it launches.
              </p>
              <Button variant="omegaOutline" asChild>
                <a href="https://discord.gg/omeganodes" target="_blank" rel="noopener noreferrer">
                  Join Discord for Updates
                </a>
              </Button>
            </motion.div>
          ) : (
          <>
          {/* Login Required Overlay */}
          {!user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-start justify-center pt-16"
            >
              <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl" />
              <div className="relative z-10 text-center p-6 max-w-sm">
                <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Account Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to view pricing and place orders.
                </p>
                <Button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-gradient-omega hover:opacity-90"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Top row: Billing + Price */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-card p-4 sm:p-6 mb-4"
          >
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              {/* Left: Billing Period */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Billing Period
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {commitments
                    .filter(c => !c.trialOnly || !isDedicated) // Hide trial-only options for dedicated
                    .map((c) => {
                      const isTrialOnlyCommitment = c.trialOnly === true;
                      const isDisabled = isTrialOnlyCommitment && isDedicated;
                      
                      return (
                        <button
                          key={c.id}
                          onClick={() => !isDisabled && setSelectedCommitment(c.id)}
                          disabled={isDisabled}
                          className={`relative py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg text-center transition-all ${
                            selectedCommitment === c.id
                              ? "bg-primary text-white"
                              : isTrialOnlyCommitment
                                ? "bg-muted/50 border border-dashed border-border text-muted-foreground"
                                : "bg-muted border border-border hover:border-primary/40"
                          } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <div className="text-sm font-medium">{c.name}</div>
                          {c.label && (
                            <div className={`text-xs mt-0.5 ${
                              selectedCommitment === c.id ? "text-white/80" : isTrialOnlyCommitment ? "text-amber-500" : "text-secondary"
                            }`}>{c.label}</div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
              
              {/* Right: Price Display */}
              <div className="text-center lg:text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  {isDedicated ? "Dedicated Server" : "Shared Infrastructure"}
                </p>
                {isTrialMode ? (
                  <div>
                    <div className="text-lg text-muted-foreground line-through">{formatPrice(300)}</div>
                    <div className="text-4xl font-bold text-foreground">$0</div>
                    <p className="text-sm text-secondary mt-1">30-minute free trial</p>
                  </div>
                ) : selectedCommitment === "daily" ? (
                  <div>
                    <div className="text-lg text-muted-foreground line-through">{formatPrice(300)}</div>
                    <div className="text-4xl font-bold text-foreground">$0</div>
                    <p className="text-sm text-amber-500 mt-1">Redeem trial code</p>
                  </div>
                ) : (
                  <div>
                    {(discount > 0 || appliedDiscount || referralBanner) && (
                      <div className="text-lg text-muted-foreground line-through">
                        {formatPrice(appliedDiscount ? priceBeforeDiscount : (referralBanner ? priceBeforeDiscount : originalPrice))}
                      </div>
                    )}
                    <div className="flex items-baseline justify-center lg:justify-end gap-1">
                      <span className="text-4xl font-bold text-foreground">{formatPrice(price)}</span>
                      <span className="text-lg text-muted-foreground">/mo</span>
                    </div>
                    {referralBanner && (
                      <div className="flex items-center justify-center lg:justify-end gap-1.5 mt-1.5">
                        <Gift className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-xs font-medium text-secondary">10% referral discount applied</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Bottom grid: Options + Features + Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Column: Options */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-3"
            >
              {/* Free Trial - Shared Only (only show if trials are enabled) */}
              {!isDedicated && trialsEnabled && selectedCommitment !== "daily" && (
                <div 
                  onClick={() => setIsTrialMode(!isTrialMode)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isTrialMode 
                      ? "border-secondary bg-secondary/5" 
                      : "border-border bg-card hover:border-secondary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isTrialMode ? "bg-secondary" : "bg-secondary/10"
                      }`}>
                        <Gift className={`w-4 h-4 ${isTrialMode ? "text-white" : "text-secondary"}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Free Trial</h3>
                        <p className="text-xs text-muted-foreground">30 minutes, no payment required</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isTrialMode ? "border-secondary bg-secondary" : "border-muted-foreground/30"
                    }`}>
                      {isTrialMode && <Check className="w-3 h-3 text-white" />}
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
                    className="space-y-3"
                  >
                    {/* Deployment Notice */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-1.5">
                      <p>
                        <Clock className="w-3.5 h-3.5 text-primary inline mr-1.5" />
                        Dedicated servers take <strong className="text-foreground">1-3 working days</strong> to deploy.
                      </p>
                      <p>
                        <MapPin className="w-3.5 h-3.5 text-primary inline mr-1.5" />
                        Custom locations available on request.
                      </p>
                    </div>

                    {/* Hardware Selection */}
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        Hardware
                      </h3>
                      <div className="space-y-2">
                        {dedicatedSpecs.map((spec) => (
                          <button
                            key={spec.id}
                            onClick={() => setSelectedDedicatedSpec(spec.id)}
                            className={`w-full p-3 rounded-lg border flex items-center justify-between transition-all ${
                              selectedDedicatedSpec === spec.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium">{spec.cpu}</p>
                              <p className="text-xs text-muted-foreground">{spec.memory}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-semibold">${spec.price}</span>
                              <span className="text-xs text-muted-foreground">/mo</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location Selection */}
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Server Location
                      </h3>
                      
                      {!isCustomLocationMode ? (
                        <div className="space-y-2">
                          {dedicatedLocations.map((loc) => (
                            <button
                              key={loc.id}
                              onClick={() => setSelectedLocation(loc.id)}
                              className={`w-full p-2.5 rounded-lg border flex items-center gap-2.5 transition-all ${
                                selectedLocation === loc.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <span className="text-lg">{loc.flag}</span>
                              <span className="text-sm font-medium">{loc.name}</span>
                              {selectedLocation === loc.id && (
                                <Check className="w-4 h-4 text-primary ml-auto" />
                              )}
                            </button>
                          ))}
                          
                          <button
                            onClick={() => {
                              setIsCustomLocationMode(true);
                              setSelectedLocation(null);
                            }}
                            className="w-full p-2.5 rounded-lg border border-dashed border-border hover:border-primary/40 flex items-center gap-2.5 transition-all text-muted-foreground hover:text-foreground text-sm"
                          >
                            <span className="text-lg">🌍</span>
                            <span>Other location</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="e.g., Tokyo, Singapore..."
                            value={customLocation}
                            onChange={(e) => setCustomLocation(e.target.value)}
                            className={`text-sm ${customLocation.trim() ? "border-secondary" : ""}`}
                          />
                          {customLocation.trim() && (
                            <p className="text-xs text-secondary flex items-center gap-1">
                              <Check className="w-3 h-3" /> Custom location selected
                            </p>
                          )}
                          <button
                            onClick={() => {
                              setIsCustomLocationMode(false);
                              setCustomLocation("");
                            }}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            ← Standard locations
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SwQoS Stake */}
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        Additional Stake
                      </h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">100,000 SOL per package</p>
                          <p className="text-xs text-muted-foreground">$350/month each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAdditionalStakePackages(Math.max(0, additionalStakePackages - 1))}
                            disabled={additionalStakePackages === 0}
                            className="w-10 h-10 sm:w-8 sm:h-8 rounded-md bg-muted flex items-center justify-center font-medium hover:bg-muted/80 disabled:opacity-40"
                          >−</button>
                          <span className="w-6 text-center font-semibold">{additionalStakePackages}</span>
                          <button
                            onClick={() => setAdditionalStakePackages(Math.min(10, additionalStakePackages + 1))}
                            className="w-10 h-10 sm:w-8 sm:h-8 rounded-md bg-primary text-white flex items-center justify-center font-medium hover:bg-primary/90"
                          >+</button>
                        </div>
                      </div>
                      {additionalStakePackages > 0 && (
                        <p className="text-xs text-secondary mt-2">
                          Total stake: {(50000 + additionalStakePackages * 100000).toLocaleString()} SOL
                        </p>
                      )}
                    </div>

                    {/* Private Shreds - Coming Soon */}
                    <div className="p-4 rounded-lg border border-border bg-card relative overflow-hidden">
                      <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Coming Soon</span>
                      </div>
                      
                      <div className="flex items-center justify-between opacity-50">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Private Shreds
                          </p>
                          <p className="text-xs text-muted-foreground">$800/month</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                onClick={() => setRentAccessEnabled(!rentAccessEnabled)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  rentAccessEnabled 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      rentAccessEnabled ? "bg-primary" : "bg-primary/10"
                    }`}>
                      <Zap className={`w-4 h-4 ${rentAccessEnabled ? "text-white" : "text-primary"}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{isDedicated ? "Earn By Sharing" : "Rent Access"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {isDedicated ? "Share your endpoint" : "Earn by sharing unused endpoints"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">
                      +{isDedicated ? "20" : "10"}%
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      rentAccessEnabled ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {rentAccessEnabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral discount is applied silently - no banner shown */}

              {/* Discount / Trial Codes */}
              <div className={`p-4 rounded-lg border border-border bg-card ${hasCommitmentDiscount && !redeemedTrial ? 'opacity-60' : ''}`}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Discount / Trial Codes
                </h3>
                
                {redeemedTrial ? (
                  <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-secondary" />
                      <div>
                        <p className="text-sm font-medium text-secondary">Trial Activated!</p>
                        <p className="text-xs text-muted-foreground">
                          {TRIAL_DURATION_LABELS[redeemedTrial.duration_type]} until {new Date(redeemedTrial.access_expires_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : hasCommitmentDiscount ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Discount codes cannot be combined with commitment discounts.
                    </p>
                    {!isDedicated && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Trial codes still work:</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter code (discount or trial)"
                            value={unifiedCode}
                            onChange={(e) => { setUnifiedCode(e.target.value.toUpperCase()); setDiscountError(""); setTrialCodeError(""); }}
                            className="font-mono text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleUnifiedCodeApply}
                            disabled={!unifiedCode.trim() || isRedeemingTrialCode || isValidatingCode}
                          >
                            {(isRedeemingTrialCode || isValidatingCode) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                        {trialCodeError && <p className="text-xs text-destructive mt-1">{trialCodeError}</p>}
                        {discountError && <p className="text-xs text-destructive mt-1">{discountError}</p>}
                      </div>
                    )}
                  </>
                ) : appliedDiscount ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/10 border border-secondary/20">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-secondary" />
                      <span className="font-mono text-sm font-medium text-secondary">{appliedDiscount.code}</span>
                      <span className="text-xs text-muted-foreground">
                        ({appliedDiscount.discount_type === 'percentage' ? `${appliedDiscount.discount_value}%` : `$${appliedDiscount.discount_value}`} off)
                      </span>
                    </div>
                    <button onClick={removeDiscount} className="text-xs text-muted-foreground hover:text-foreground">Remove</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code (discount or trial)"
                        value={unifiedCode}
                        onChange={(e) => { setUnifiedCode(e.target.value.toUpperCase()); setDiscountError(""); setTrialCodeError(""); }}
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={handleUnifiedCodeApply} disabled={!unifiedCode.trim() || isValidatingCode || isRedeemingTrialCode}>
                        {(isValidatingCode || isRedeemingTrialCode) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {discountError && <p className="text-xs text-destructive">{discountError}</p>}
                    {trialCodeError && <p className="text-xs text-destructive">{trialCodeError}</p>}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right: Action Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-1"
            >
              <div className="sticky top-20 space-y-3">
                {/* Features Card */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">What's Included</h4>
                  <div className="space-y-2">
                    {(isDedicated ? dedicatedFeatures : sharedFeatures).map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                        <span className="text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regions */}
                {!isDedicated && (
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border text-center">
                    <span className="text-xs">🇺🇸 NY • 🇩🇪 Frankfurt • 🇳🇱 Amsterdam</span>
                  </div>
                )}

                {/* Discord ID Input Card */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#5865F2">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord User ID
                  </label>
                  <Input
                    placeholder="123456789012345678"
                    value={discordUserId}
                    onChange={(e) => setDiscordUserId(e.target.value.replace(/\D/g, ''))}
                    className={`text-sm ${discordUserId && !isValidDiscordId ? "border-destructive" : isValidDiscordId ? "border-secondary" : ""}`}
                  />
                  {isValidDiscordId && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid
                    </p>
                  )}
                  
                  <button
                    onClick={() => setShowDiscordGuide(!showDiscordGuide)}
                    className="text-xs text-muted-foreground hover:text-primary mt-2 flex items-center gap-1"
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
                        <div className="mt-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                          <ol className="list-decimal list-inside space-y-0.5">
                            <li>Discord Settings → Advanced</li>
                            <li>Enable Developer Mode</li>
                            <li>Right-click profile → Copy ID</li>
                          </ol>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CTA Button */}
                {selectedCommitment === "daily" ? (
                  <div className="p-4 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 text-center">
                    <Gift className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Trial Code Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Daily access is only available by redeeming a trial code above
                    </p>
                  </div>
                ) : (
                  <Button
                    className={`w-full text-sm font-medium ${
                      isTrialMode || price === 0
                        ? "bg-secondary hover:bg-secondary/90"
                        : "bg-gradient-omega hover:opacity-90"
                    }`}
                    disabled={!isValidDiscordId || !hasValidLocation || isTrialProcessing || isFreeOrderProcessing || (price === 0 && !user)}
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
                        Processing...
                      </>
                    ) : (
                      <>
                        {!isValidDiscordId 
                          ? "Enter Discord ID" 
                          : !hasValidLocation
                            ? "Select Location"
                            : isTrialMode 
                              ? "Start Free Trial" 
                              : price === 0 
                                ? (user ? "Get Free Access" : "Login to Continue")
                                : "Continue to Payment"}
                      </>
                    )}
                  </Button>
                )}
                
                <p className="text-xs text-center text-muted-foreground">
                  {isTrialMode 
                    ? "No payment required" 
                    : price === 0 
                      ? "100% discount applied"
                      : "USDC/USDT payment"
                  }
                </p>
              </div>
            </motion.div>
          </div>
          </>
          )}
        </div>

        {/* Discord Support CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground mb-3">Have questions?</p>
          <a
            href="https://discord.gg/omeganode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#5865F2] text-white text-sm font-medium hover:bg-[#4752C4] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
        location={isDedicated ? getFinalLocation() : "all"}
        rentAccessEnabled={rentAccessEnabled}
        isTestMode={isTestMode}
        discordUserId={discordUserId.trim()}
        appliedDiscount={appliedDiscount}
        includeShredsFromPricing={privateShredsEnabled}
        additionalStakePackages={additionalStakePackages}
        initialReferralCode={storedReferralCode || undefined}
      />

      {/* Auth Modal */}
      <AuthModal 
        open={isAuthModalOpen} 
        onOpenChange={setIsAuthModalOpen} 
      />
    </section>
  );
};

export default PricingSection;
