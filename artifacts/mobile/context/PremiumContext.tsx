import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Free tier scans only the most recent photos; Premium scans the whole library.
export const FREE_PHOTO_LIMIT = 500;

const PREMIUM_KEY = "premium_v1";

interface PremiumContextType {
  // null while the stored flag is still loading
  isPremium: boolean | null;
  unlock: () => Promise<void>;
  deactivate: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_KEY)
      .then((v) => setIsPremium(v === "1"))
      .catch(() => setIsPremium(false));
  }, []);

  // NOTE: this is a local unlock used while the app is distributed through
  // Expo Go / TestFlight previews. Before App Store release, replace the body
  // of unlock() with a real StoreKit purchase (e.g. react-native-purchases)
  // and keep the AsyncStorage flag as the entitlement cache.
  const unlock = useCallback(async () => {
    setIsPremium(true);
    try {
      await AsyncStorage.setItem(PREMIUM_KEY, "1");
    } catch {}
  }, []);

  const deactivate = useCallback(async () => {
    setIsPremium(false);
    try {
      await AsyncStorage.removeItem(PREMIUM_KEY);
    } catch {}
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, unlock, deactivate }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}

// Non-hook accessor for code paths that run outside the React tree
// (TravelContext reads this through a ref instead).
export async function readPremiumFlag(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREMIUM_KEY)) === "1";
  } catch {
    return false;
  }
}
