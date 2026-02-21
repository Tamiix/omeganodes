import { motion } from "framer-motion";
import { Check } from "lucide-react";

const stats = [
  { value: "<1ms", label: "Response Time" },
  { value: "1000", label: "Requests/sec" },
  { value: "300", label: "TPS Capacity" },
  { value: "99.9%", label: "Uptime SLA" },
];

const highlights = [
  "Instant automatic failover protection",
  "Smart load balancing across nodes",
  "Real-time health monitoring 24/7",
  "DDoS protection included",
  "Shared staked connections",
  "Priority Discord support",
];

const PerformanceSection = () => {
  return (
    <section id="performance" className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-sm font-medium text-secondary mb-3">Performance Metrics</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient-omega">Production</span> Ready
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Real metrics from our production infrastructure. No asterisks.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12"
        >
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="rounded-lg border border-border bg-card p-4 sm:p-6 text-center"
            >
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Features list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border border-border rounded-lg bg-card p-5 sm:p-8 max-w-3xl mx-auto"
        >
          <h3 className="text-lg font-semibold mb-4 sm:mb-6 text-center">What's Included</h3>
          
          <div className="grid sm:grid-cols-2 gap-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-6">
            Need higher limits? Dedicated servers offer fully customizable RPS & TPS.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PerformanceSection;
