import { motion } from "framer-motion";

const features = [
  {
    label: "01",
    title: "Sub-millisecond latency",
    description: "Every request optimized. Load-balanced across our network for the fastest possible response times.",
  },
  {
    label: "02", 
    title: "99.9% uptime guarantee",
    description: "Multiple redundancy layers with automatic failover. Your applications stay online.",
  },
  {
    label: "03",
    title: "Setup in 2 minutes",
    description: "Join Discord, run a command, start building. No complex configuration required.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 border-t border-border">
      <div className="container mx-auto px-6">
        {/* Section header - left aligned, editorial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="text-primary font-mono text-sm tracking-wide mb-4">FEATURES</p>
          <h2 className="text-3xl sm:text-4xl font-bold max-w-lg">
            Built for performance. Designed for developers.
          </h2>
        </motion.div>

        {/* Features - horizontal list layout */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              {/* Number label */}
              <p className="text-5xl font-bold text-muted/50 mb-4 font-mono">
                {feature.label}
              </p>
              
              {/* Content */}
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
