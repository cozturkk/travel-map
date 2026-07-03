import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Home is a CITY, not a country: excluding only the home city from trips lets
// every other city in the same country still show up in the timeline.
export interface HomeCity {
  city: string;
  country: string;
}

interface HomeCityContextType {
  homeCity: HomeCity | null;
  setHomeCity: (city: HomeCity | null) => Promise<void>;
}

const HomeCityContext = createContext<HomeCityContextType | null>(null);
// v2: value is { city, country }. The old home_country_v1 (country only) can't
// be mapped to a city automatically, so it is simply ignored; the user picks
// their home city once in Profile.
const HOME_CITY_KEY = "home_city_v2";

export function HomeCityProvider({ children }: { children: React.ReactNode }) {
  const [homeCity, setHomeCityState] = useState<HomeCity | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(HOME_CITY_KEY)
      .then((v) => {
        if (v) {
          const parsed = JSON.parse(v) as HomeCity;
          if (parsed?.city && parsed?.country) setHomeCityState(parsed);
        }
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
