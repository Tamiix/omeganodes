import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import xLogo from "@/assets/x-logo.png";
import stakewizLogo from "@/assets/stakewiz-logo.png";

const links = [
  {
    name: "Discord",
    description: "Join our community for support, updates, and discussions.",
    url: "https://discord.gg/omeganode",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    color: "bg-[#5865F2]",
  },
  {
    name: "Twitter / X",
    description: "Follow us for the latest announcements and news.",
    url: "https://x.com/omeganetworksio",
    iconUrl: xLogo,
    color: "bg-foreground",
  },
  {
    name: "Validator",
    description: "View our Solana validator on StakeWiz.",
    url: "https://stakewiz.com/validator/EMVmh5hF6LT1sZM9G7dEX1bykRYEymWY2vtE7QHBBAW6",
    iconUrl: stakewizLogo,
    color: "bg-[#1a1a2e]",
  },
];

const OfficialLinks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-8 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Official Links</h1>
          <p className="text-muted-foreground mb-8">
            All verified Omega links in one place.
          </p>

          <div className="space-y-4">
            {links.map((link, i) => (
              <motion.a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden">
                  {'iconUrl' in link && link.iconUrl ? (
                    <img src={link.iconUrl} alt={link.name} className="w-12 h-12 object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg ${link.color} flex items-center justify-center text-white`}>{link.icon}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{link.name}</div>
                  <div className="text-sm text-muted-foreground">{link.description}</div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OfficialLinks;
