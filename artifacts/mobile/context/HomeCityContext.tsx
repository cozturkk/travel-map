import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface HomeCity {
  country: string;
  city: string;
}

interface HomeCityContextType {
  homeCity: HomeCity | null;
  setHomeCity: (city: HomeCity | null) => Promise<void>;
}

const HomeCityContext = createContext<HomeCityContextType | null>(null);
const HOME_CITY_KEY = "home_city_v1";

export function HomeCityProvider({ children }: { children: React.ReactNode }) {
  const [homeCity, setHomeCityState] = useState<HomeCity | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HOME_CITY_KEY)
      .then((v) => {
        if (v) setHomeCityState(JSON.parse(v) as HomeCity);
      })
      .catch(() => {});
  }, []);

  const setHomeCity = useCallback(async (city: HomeCity | null) => {
    setHomeCityState(city);
    if (city) {
      await AsyncStorage.setItem(HOME_CITY_KEY, JSON.stringify(city));
    } else {
      await AsyncStorage.removeItem(HOME_CITY_KEY);
    }
  }, []);

  return (
    <HomeCityContext.Provider value={{ homeCity, setHomeCity }}>
      {children}
    </HomeCityContext.Provider>
  );
}

export function useHomeCity() {
  const ctx = useContext(HomeCityContext);
  if (!ctx) throw new Error("useHomeCity must be used within HomeCityProvider");
  return ctx;
}
