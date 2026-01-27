import { motion } from "framer-motion";
import { Zap, Shield, Clock, Server, Globe, Cpu } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Sub-Millisecond Speed",
    description: "Optimized routing that actually delivers. Fast enough for the bots, reliable enough for production.",
    gradient: "from-[#5B4EE4] to-[#7B6FE8]",
  },
  {
    icon: Shield,
    title: "99.9% Uptime SLA",
    description: "Automatic failover keeps you online. We've been through the worst congestion — still standing.",
    gradient: "from-[#E8A5A5] to-[#D89595]",
  },
  {
    icon: Clock,
    title: "2-Minute Setup",
    description: "Join Discord, whitelist your IP, done. No config files, no waiting on approvals.",
    gradient: "from-[#8B7EE8] to-[#A89AEC]",
  },
  {
    icon: Server,
    title: "Dedicated Hardware",
    description: "AMD EPYC servers with JITO Shredstream and Yellowstone gRPC. Your own box, your own rules.",
    gradient: "from-[#5B4EE4] to-[#E8A5A5]",
  },
  {
    icon: Globe,
    title: "Global Network",
    description: "Nodes in NYC, Frankfurt, and Amsterdam. Pick the closest, or use all three.",
    gradient: "from-[#9B8FEC] to-[#5B4EE4]",
  },
  {
    icon: Cpu,
    title: "700k+ SOL Staked",
    description: "High stake weight = better transaction priority. Land more, miss less.",
    gradient: "from-[#E8A5A5] to-[#8B7EE8]",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[#5B4EE4]/8 blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#F5B5B5]/8 blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Why Choose Omega
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
            Built for <span className="text-gradient-omega">Builders</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Enterprise infrastructure that scales from your first dApp to millions of users.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 rounded-2xl glass-card hover:border-primary/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
