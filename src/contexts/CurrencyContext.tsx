import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Rate to USD
}

// Major world currencies with approximate rates to USD
export const currencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1 },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 149.5 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", rate: 0.88 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.36 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.53 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.24 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.12 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", rate: 1320 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.34 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", rate: 7.82 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", rate: 1.67 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", rate: 10.42 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", rate: 10.65 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", rate: 6.87 },
  { code: "MXN", name: "Mexican Peso", symbol: "$", rate: 17.15 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 4.97 },
  { code: "ZAR", name: "South African Rand", symbol: "R", rate: 18.65 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", rate: 92.5 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", rate: 32.1 },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", rate: 3.98 },
  { code: "THB", name: "Thai Baht", symbol: "฿", rate: 35.2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rate: 15650 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rate: 4.72 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", rate: 55.8 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", rate: 22.8 },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", rate: 3.65 },
  { code: "CLP", name: "Chilean Peso", symbol: "$", rate: 875 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75 },
  { code: "TWD", name: "Taiwan Dollar", symbol: "NT$", rate: 31.5 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", rate: 355 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", rate: 4.58 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", rate: 1.8 },
  { code: "HRK", name: "Croatian Kuna", symbol: "kn", rate: 6.93 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", rate: 278 },
  { code: "EGP", name: "Egyptian Pound", symbol: "£", rate: 30.9 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate: 770 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 153 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", rate: 24500 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", rate: 110 },
  { code: "ARS", name: "Argentine Peso", symbol: "$", rate: 350 },
  { code: "COP", name: "Colombian Peso", symbol: "$", rate: 3950 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", rate: 3.72 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", rate: 37.5 },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", rate: 3.64 },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", rate: 0.31 },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", rate: 0.38 },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", rate: 0.38 },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertFromUSD: (amountUSD: number) => number;
  formatPrice: (amountUSD: number, showDecimals?: boolean) => string;
  showSelector: boolean;
  setShowSelector: (show: boolean) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "omega_currency";

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(currencies[0]); // USD default
  const [showSelector, setShowSelector] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = currencies.find(c => c.code === stored);
      if (found) {
        setCurrencyState(found);
      }
    } else {
      // First visit - show selector
      setShowSelector(true);
    }
    setInitialized(true);
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_KEY, newCurrency.code);
  };

  const convertFromUSD = (amountUSD: number): number => {
    return Math.round(amountUSD * currency.rate);
  };

  const formatPrice = (amountUSD: number, showDecimals = false): string => {
    const converted = amountUSD * currency.rate;
    const formatted = showDecimals 
      ? converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : Math.round(converted).toLocaleString();
    return `${currency.symbol}${formatted}`;
  };

  if (!initialized) {
    return null;
  }

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      convertFromUSD, 
      formatPrice,
      showSelector,
      setShowSelector
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
