import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const scrollToPricing = () => {
  const pricingSection = document.getElementById('pricing');
  if (pricingSection) {
    pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Minimal background - no floating orbs */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content - asymmetric layout */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Simple label */}
              <p className="text-primary font-mono text-sm tracking-wide mb-6">
                SOLANA RPC INFRASTRUCTURE
              </p>

              {/* Bold headline - editorial style */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
                Fast nodes.
                <br />
                <span className="text-muted-foreground">No compromises.</span>
              </h1>

              {/* Short, punchy description */}
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
                Enterprise Solana infrastructure across 3 regions. 
                Sub-millisecond latency. 700k+ SOL staked.
              </p>

              {/* CTAs - clean, simple */}
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-foreground text-background hover:bg-foreground/90 gap-2 group"
                  onClick={scrollToPricing}
                >
                  View Plans
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <a
                  href="https://discord.gg/omeganode"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="lg" className="gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Join Discord
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>

          {/* Right: Stats panel - clean data display */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="bg-card border border-border rounded-2xl p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="text-sm text-muted-foreground font-mono">LIVE NETWORK STATUS</span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight">&lt;1ms</p>
                  <p className="text-sm text-muted-foreground">Avg. latency</p>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight">99.9%</p>
                  <p className="text-sm text-muted-foreground">Uptime SLA</p>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight">4000</p>
                  <p className="text-sm text-muted-foreground">Requests/sec</p>
                </div>
                <div className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight">3</p>
                  <p className="text-sm text-muted-foreground">Global regions</p>
                </div>
              </div>

              {/* Locations */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3 font-mono">REGIONS</p>
                <div className="flex gap-4">
                  <span className="text-sm">🇺🇸 New York</span>
                  <span className="text-sm">🇩🇪 Frankfurt</span>
                  <span className="text-sm">🇳🇱 Amsterdam</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile stats - simple row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:hidden mt-12 grid grid-cols-2 gap-4"
        >
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold">&lt;1ms</p>
            <p className="text-xs text-muted-foreground">Latency</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-2xl font-bold">99.9%</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
