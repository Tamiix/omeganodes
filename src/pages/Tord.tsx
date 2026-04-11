import { motion } from "framer-motion";
import { Rainbow, Frown } from "lucide-react";

const Tord = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-500/20 to-pink-500/20 animate-pulse" />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 1.2, bounce: 0.5 }}
        className="text-center z-10 p-8 space-y-12"
      >
        {/* Chelsea section */}
        <div>
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Frown className="w-20 h-20 mx-auto mb-4 text-blue-500" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl md:text-7xl font-black text-blue-500 mb-2"
          >
            Chelsea Suger
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-lg text-muted-foreground"
          >
            ⚽ Bekreftet fakta ⚽
          </motion.p>
        </div>

        {/* Tord section */}
        <div>
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Rainbow className="w-20 h-20 mx-auto mb-4 text-pink-500" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-5xl md:text-7xl font-black bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent"
          >
            Tord er Gay
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-lg text-muted-foreground"
          >
            🌈 Også bekreftet 🌈
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default Tord;
