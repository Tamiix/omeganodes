import { motion } from "framer-motion";
import { Zap, Shield, Smile, Check } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience industry-leading response times with our optimized infrastructure. Advanced load balancing ensures your requests are processed at unprecedented speeds.",
    stat: "avg. speed: <1ms",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Shield,
    title: "Reliability",
    description: "Built with multiple redundancy layers and active failover systems, our infrastructure ensures your applications stay online when it matters most.",
    stat: "99.9% uptime",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: Smile,
    title: "Easy to Use",
    description: "Get started in minutes with our simple Discord-based setup. Just join our server, add your IP with a quick command, and you're ready to go.",
    stat: "Setup in 2 min",
    gradient: "from-primary/20 to-secondary/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
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
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Explore Omega's Features
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
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5`}>
                <feature.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{feature.description}</p>
              
              {/* Stat */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
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
