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
    <section className="relative min-h-[90vh] flex items-center justify-center pt-20">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Solana RPC Infrastructure</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6"
          >
            <span className="text-foreground">Enterprise RPC</span>
            <br />
            <span className="text-gradient-omega">Built for Speed</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-10"
          >
            Sub-millisecond latency, 700k+ SOL staked, 3 global regions. 
            Built by serious botters.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20"
          >
            <Button 
              size="lg" 
              className="bg-gradient-omega hover:opacity-90 text-base h-12 px-6 gap-2 group"
              onClick={scrollToPricing}
            >
              Start Building
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <a
              href="https://discord.gg/omeganode"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base h-12 px-6 gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Join Discord
              </Button>
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border border-border rounded-xl p-6 sm:p-8 bg-card/50"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">&lt;1ms</p>
                <p className="text-sm text-muted-foreground mt-1">Latency</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">99.9%</p>
                <p className="text-sm text-muted-foreground mt-1">Uptime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">700k+</p>
                <p className="text-sm text-muted-foreground mt-1">SOL Staked</p>
              </div>
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">3</p>
                <p className="text-sm text-muted-foreground mt-1">Regions</p>
              </div>
            </div>

            {/* Region flags */}
            <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🇺🇸</span> New York
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🇩🇪</span> Frankfurt
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🇳🇱</span> Amsterdam
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
