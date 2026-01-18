import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Sparkles } from "lucide-react";

const PricingSection = () => {
  return (
    <section id="pricing" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-cosmic" />
      
      {/* Glow Effects */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]"
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
            Simple Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">One Payment. </span>
            <span className="text-gradient-omega">Lifetime Access.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No subscriptions, no hidden fees. Get full access to OmegaNode with a single purchase.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-lg mx-auto"
        >
          <div className="relative group">
            {/* Card Glow */}
            <div className="absolute -inset-1 bg-gradient-omega rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            
            {/* Main Card */}
            <div className="relative p-10 rounded-3xl bg-card border border-border/50 backdrop-blur-xl">
              {/* Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-omega">
                  <Crown className="w-4 h-4 text-primary-foreground" />
                  <span className="text-sm font-semibold text-primary-foreground">Lifetime Access</span>
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8 pt-4">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">OmegaNode Pass</h3>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl sm:text-6xl font-bold text-gradient-omega">$499</span>
                  <span className="text-muted-foreground">one-time</span>
                </div>
                <p className="text-muted-foreground mt-3">Full access forever. No recurring fees.</p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {[
                  "Unlimited RPC access across all regions",
                  "Priority routing & lowest latency",
                  "Auto-scaling up to 5000 RPS",
                  "Dedicated support channel",
                  "Early access to new features",
                  "Exclusive Discord community",
                  "API key management dashboard",
                  "Real-time analytics & monitoring",
                ].map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <Button variant="omega" size="xl" className="w-full gap-2">
                <Zap className="w-5 h-5" />
                Get OmegaNode Access
              </Button>

              {/* Footer Note */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                Secure payment via crypto or card. Instant activation.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
