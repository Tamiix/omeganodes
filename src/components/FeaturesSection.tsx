import { motion } from "framer-motion";
import { Zap, Shield, Clock, Server, Globe, Cpu } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Sub-Millisecond Speed",
    description: "Industry-leading response times with optimized routing. Your requests hit the network faster than the competition.",
    gradient: "from-[#9945FF] to-[#7B3FE4]",
  },
  {
    icon: Shield,
    title: "99.9% Uptime SLA",
    description: "Enterprise-grade reliability with automatic failover. Your applications stay online when it matters most.",
    gradient: "from-[#14F195] to-[#0AC77B]",
  },
  {
    icon: Clock,
    title: "2-Minute Setup",
    description: "Join Discord, add your IP, start building. No complex configuration, no waiting. Just pure speed.",
    gradient: "from-[#00D4FF] to-[#0099CC]",
  },
  {
    icon: Server,
    title: "Dedicated Hardware",
    description: "Get your own AMD EPYC servers with JITO Shredstream and Yellowstone gRPC. Built for high-frequency trading.",
    gradient: "from-[#9945FF] to-[#14F195]",
  },
  {
    icon: Globe,
    title: "Global Network",
    description: "Strategic presence in New York, Frankfurt, and Amsterdam. Smart routing ensures optimal latency worldwide.",
    gradient: "from-[#FF6B6B] to-[#9945FF]",
  },
  {
    icon: Cpu,
    title: "700k+ SOL Staked",
    description: "Massive stake weight for priority transaction landing. Your transactions get the attention they deserve.",
    gradient: "from-[#14F195] to-[#00D4FF]",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[#9945FF]/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#14F195]/10 blur-[100px]" />

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
