import { motion } from "framer-motion";
import { Check } from "lucide-react";

const performanceItems = [
  {
    title: "Guaranteed Uptime",
    description: "Zero compromises on reliability with our fault-tolerant infrastructure, keeping you connected to Solana 24/7.",
    checks: ["99.9% Uptime over the last weeks", "Instant failover protection"],
  },
  {
    title: "Ultra-wide Network Coverage",
    description: "Strategic server placement across key global regions ensures optimal performance wherever you are.",
    checks: ["3 Locations supported", "Smart routing for lowest latency"],
  },
  {
    title: "Lightning Fast Response Times",
    description: "Every millisecond counts. Our optimized infrastructure delivers responses at breakthrough speeds.",
    checks: ["Sub 1ms average response time", "Consistent performance guaranteed"],
  },
  {
    title: "High-Limit Request Capacity",
    description: "Built to handle intense workloads with a robust infrastructure that scales with your needs.",
    checks: ["Run up to 4000 requests/s", "Run up to 2000 transactions/s"],
  },
];

const PerformanceSection = () => {
  return (
    <section id="performance" className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider mb-3 block">
            Performance
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Next-Gen Infrastructure<br />Built for Solana's Future
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Experience enterprise-grade performance with our globally distributed infrastructure.
          </p>
        </motion.div>

        {/* Performance Grid */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {performanceItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-card border border-border"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{item.description}</p>
              
              <div className="space-y-2">
                {item.checks.map((check) => (
                  <div key={check} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-secondary" />
                    </div>
                    <span className="text-sm text-foreground">{check}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PerformanceSection;
