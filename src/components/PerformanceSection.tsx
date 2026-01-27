import { motion } from "framer-motion";
import { Check, TrendingUp } from "lucide-react";

const stats = [
  { value: "<1ms", label: "Response Time", description: "Average latency across all regions" },
  { value: "4000", label: "Requests/sec", description: "Maximum throughput per endpoint" },
  { value: "2000", label: "TPS Capacity", description: "Transactions per second supported" },
  { value: "99.9%", label: "Uptime SLA", description: "Guaranteed availability" },
];

const highlights = [
  "Instant automatic failover protection",
  "Smart load balancing across nodes",
  "Real-time health monitoring 24/7",
  "DDoS protection included",
  "Dedicated staked connections",
  "Priority Discord support",
];

const PerformanceSection = () => {
  return (
    <section id="performance" className="py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card to-background" />
      
      {/* Glowing orbs */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full bg-[#F5B5B5]/10 blur-[120px]" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] rounded-full bg-[#5B4EE4]/10 blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-sm font-medium mb-4">
            Performance Metrics
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
            <span className="text-gradient-omega">Numbers</span> Don't Lie
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Real metrics from our production infrastructure. No asterisks, no exceptions.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="glass-card rounded-2xl p-6 text-center hover:border-secondary/30 transition-all"
            >
              <p className="text-4xl sm:text-5xl font-black text-gradient-omega mb-2">{stat.value}</p>
              <p className="font-semibold text-foreground mb-1">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </motion.div>

        {/* Features list */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-8 max-w-4xl mx-auto glow-omega"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-omega flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">What You Get</h3>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PerformanceSection;
