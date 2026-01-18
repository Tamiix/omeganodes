import { motion } from "framer-motion";
import { Zap, Shield, Smile, Check } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience industry-leading response times with our optimized infrastructure. Advanced load balancing ensures your requests are processed at unprecedented speeds.",
    stat: "avg. speed: <1ms",
  },
  {
    icon: Shield,
    title: "Reliability",
    description: "Built with multiple redundancy layers and active failover systems, our infrastructure ensures your applications stay online when it matters most.",
    stat: "99.9% uptime",
  },
  {
    icon: Smile,
    title: "Easy to Use",
    description: "Get started in minutes with our simple Discord-based setup. Just join our server, add your IP with a quick command, and you're ready to go.",
    stat: "Setup in 2 min",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      {/* Background glow */}
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider mb-3 block">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Explore <span className="text-gradient-omega">Omega's Features</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Experience enterprise-grade RPC infrastructure built for developers and traders who demand excellence.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/40 transition-all duration-300"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-gradient-omega flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
              
              {/* Stat */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Check className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-medium text-foreground">{feature.stat}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
