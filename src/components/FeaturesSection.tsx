import { motion } from "framer-motion";
import { Zap, Shield, Clock, Server, Globe, Cpu } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Sub-Millisecond Speed",
    description: "Routes optimized for speed. Built for bots, trusted in production.",
  },
  {
    icon: Shield,
    title: "99.9% Uptime SLA",
    description: "Auto failover keeps you online. Survived every congestion spike so far.",
  },
  {
    icon: Clock,
    title: "2-Minute Setup",
    description: "Join Discord, whitelist your IP, you're live. No config files needed.",
  },
  {
    icon: Server,
    title: "Dedicated Hardware",
    description: "AMD EPYC with JITO Shredstream and Yellowstone gRPC. Your box, your rules.",
  },
  {
    icon: Globe,
    title: "Global Network",
    description: "Nodes in NYC, Frankfurt, and Amsterdam. Pick one or use all three.",
  },
  {
    icon: Cpu,
    title: "700k+ SOL Staked",
    description: "More stake weight means better tx priority. Land more, miss less.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-sm font-medium text-primary mb-3">Why Choose Omega</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Built for <span className="text-gradient-omega">Builders</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Top tier gRPC & transaction service. Enterprise infrastructure that scales.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group p-5 sm:p-6 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
