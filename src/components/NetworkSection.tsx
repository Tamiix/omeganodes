import { motion } from "framer-motion";

const regions = [
  { name: "New York", code: "NY", region: "US East", flag: "🇺🇸", status: "online" },
  { name: "Frankfurt", code: "FRA", region: "Europe Central", flag: "🇩🇪", status: "online" },
  { name: "Tokyo", code: "TYO", region: "Asia Pacific", flag: "🇯🇵", status: "online" },
  { name: "Singapore", code: "SG", region: "Asia Southeast", flag: "🇸🇬", status: "online" },
  { name: "London", code: "LDN", region: "UK", flag: "🇬🇧", status: "online" },
  { name: "Amsterdam", code: "AMS", region: "Europe West", flag: "🇳🇱", status: "online" },
];

const NetworkSection = () => {
  return (
    <section id="network" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-cosmic" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at center, hsl(270 80% 60% / 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
            Global Infrastructure
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">Multiple Regions. </span>
            <span className="text-gradient-omega">One Network.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Strategically positioned nodes across the globe ensure optimal performance 
            no matter where you or your users are located.
          </p>
        </motion.div>

        {/* Region Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {regions.map((region, index) => (
            <motion.div
              key={region.code}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{region.flag}</span>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{region.name}</h3>
                    <p className="text-sm text-muted-foreground">{region.code} • {region.region}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-500 uppercase font-semibold">Live</span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Uptime</span>
                  <p className="font-semibold text-foreground">99.99%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Latency</span>
                  <p className="font-semibold text-foreground">&lt;10ms</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nodes</span>
                  <p className="font-semibold text-foreground">50+</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-omega rounded-2xl blur opacity-20" />
          <div className="relative grid sm:grid-cols-3 gap-8 p-8 sm:p-12 rounded-2xl bg-card border border-border/50">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-gradient-omega mb-2">10+</div>
              <p className="text-muted-foreground">Global Regions</p>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-gradient-omega mb-2">5000+</div>
              <p className="text-muted-foreground">Active Nodes</p>
            </div>
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold text-gradient-omega mb-2">1M+</div>
              <p className="text-muted-foreground">Requests/Day</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NetworkSection;
