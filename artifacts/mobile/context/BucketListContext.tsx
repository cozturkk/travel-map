import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const BUCKET_KEY = "bucket_list_v1";

interface BucketListContextType {
  bucketList: string[];
  addToBucket: (country: string) => void;
  removeFromBucket: (country: string) => void;
  isInBucket: (country: string) => boolean;
}

const BucketListContext = createContext<BucketListContextType | null>(null);

export function BucketListProvider({ children }: { children: React.ReactNode }) {
  const [bucketList, setBucketList] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(BUCKET_KEY).then((v) => {
      if (v) setBucketList(JSON.parse(v));
    });
  }, []);

  const save = useCallback((next: string[]) => {
    setBucketList(next);
    AsyncStorage.setItem(BUCKET_KEY, JSON.stringify(next));
  }, []);

  const addToBucket = useCallback(
    (country: string) => {
      setBucketList((prev) => {
        if (prev.includes(country)) return prev;
        const next = [...prev, country].sort();
        AsyncStorage.setItem(BUCKET_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeFromBucket = useCallback(
    (country: string) => {
      setBucketList((prev) => {
        const next = prev.filter((c) => c !== country);
        AsyncStorage.setItem(BUCKET_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const isInBucket = useCallback(
    (country: string) => bucketList.includes(country),
    [bucketList]
  );

  return (
    <BucketListContext.Provider value={{ bucketList, addToBucket, removeFromBucket, isInBucket }}>
      {children}
    </BucketListContext.Provider>
  );
}

export function useBucketList() {
  const ctx = useContext(BucketListContext);
  if (!ctx) throw new Error("useBucketList must be used within BucketListProvider");
  return ctx;
}
