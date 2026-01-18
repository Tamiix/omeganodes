import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, X, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { currencies, Currency, useCurrency } from "@/contexts/CurrencyContext";

interface CurrencySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstVisit?: boolean;
}

const CurrencySelector = ({ open, onOpenChange, isFirstVisit = false }: CurrencySelectorProps) => {
  const { currency, setCurrency } = useCurrency();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Currency>(currency);

  const filteredCurrencies = useMemo(() => {
    if (!search.trim()) return currencies;
    const query = search.toLowerCase();
    return currencies.filter(
      c => c.code.toLowerCase().includes(query) || 
           c.name.toLowerCase().includes(query)
    );
  }, [search]);

  const handleSave = () => {
    setCurrency(selected);
    onOpenChange(false);
    setSearch("");
  };

  const handleClose = () => {
    if (!isFirstVisit) {
      onOpenChange(false);
      setSearch("");
    }
  };

  // Popular currencies to show at top
  const popularCodes = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"];
  const popularCurrencies = currencies.filter(c => popularCodes.includes(c.code));

  return (
    <Dialog open={open} onOpenChange={isFirstVisit ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50" onInteractOutside={isFirstVisit ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {isFirstVisit ? "Select Your Currency" : "Change Currency"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Popular currencies (only when not searching) */}
          {!search.trim() && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Popular</p>
              <div className="flex flex-wrap gap-2">
                {popularCurrencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setSelected(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selected.code === c.code
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background"
                    }`}
                  >
                    {c.symbol} {c.code}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All currencies */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {search.trim() ? `Results (${filteredCurrencies.length})` : "All Currencies"}
            </p>
            <ScrollArea className="h-[280px] rounded-lg border border-border/50 bg-background/30">
              <div className="p-2 space-y-1">
                <AnimatePresence mode="popLayout">
                  {filteredCurrencies.map((c) => (
                    <motion.button
                      key={c.code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => setSelected(c)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                        selected.code === c.code
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-background/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 text-left font-mono text-sm font-medium">
                          {c.symbol}
                        </span>
                        <div className="text-left">
                          <p className="text-sm font-medium">{c.code}</p>
                          <p className="text-xs text-muted-foreground">{c.name}</p>
                        </div>
                      </div>
                      {selected.code === c.code && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>

                {filteredCurrencies.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No currencies found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Selected preview & Save */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-sm">
              <span className="text-muted-foreground">Selected: </span>
              <span className="font-medium">{selected.symbol} {selected.code}</span>
            </div>
            <Button onClick={handleSave} variant="omega" size="sm">
              Save Currency
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencySelector;
