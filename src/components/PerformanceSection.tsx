import { motion } from "framer-motion";

const metrics = [
  { value: "<1ms", label: "Response time" },
  { value: "4000", label: "Requests/second" },
  { value: "2000", label: "Transactions/second" },
  { value: "99.9%", label: "Uptime guarantee" },
];

const PerformanceSection = () => {
  return (
    <section id="performance" className="py-24 bg-card border-y border-border">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-primary font-mono text-sm tracking-wide mb-4">PERFORMANCE</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Infrastructure that scales with you
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
              Our globally distributed network spans 3 strategic locations with 700k+ SOL in stake. 
              Whether you're running a trading bot or building the next DeFi protocol, 
              we have the capacity you need.
            </p>
            
            {/* Highlights */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-1 h-full bg-primary rounded-full" />
                <div>
                  <p className="font-medium">Instant failover protection</p>
                  <p className="text-sm text-muted-foreground">Automatic routing to healthy nodes</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1 h-full bg-primary rounded-full" />
                <div>
                  <p className="font-medium">Smart load balancing</p>
                  <p className="text-sm text-muted-foreground">Requests distributed for optimal performance</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1 h-full bg-primary rounded-full" />
                <div>
                  <p className="font-medium">Real-time monitoring</p>
                  <p className="text-sm text-muted-foreground">24/7 infrastructure health tracking</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Metrics grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {metrics.map((metric, index) => (
              <div 
                key={metric.label}
                className="p-6 rounded-xl bg-background border border-border"
              >
                <p className="text-3xl sm:text-4xl font-bold mb-1">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PerformanceSection;
