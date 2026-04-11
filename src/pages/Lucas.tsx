import { motion } from "framer-motion";
import { Rainbow } from "lucide-react";

const Lucas = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Rainbow gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-yellow-500/20 to-purple-500/20 animate-pulse" />
      
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 1.2, bounce: 0.5 }}
        className="text-center z-10 p-8"
      >
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Rainbow className="w-24 h-24 mx-auto mb-8 text-pink-500" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-6xl md:text-8xl font-black bg-gradient-to-r from-red-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent mb-4"
        >
          Lucas er Gay
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-xl text-muted-foreground mt-4"
        >
          🌈 Bekræftet 🌈
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Lucas;
