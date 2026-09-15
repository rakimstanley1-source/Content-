"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Brand } from "@prisma/client";

type BrandContextValue = {
  brands: Brand[];
  activeBrand: Brand | null;
  activeBrandId: string | null;
  setActiveBrandId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
};

const BrandContext = createContext<BrandContextValue>({
  brands: [],
  activeBrand: null,
  activeBrandId: null,
  setActiveBrandId: () => {},
  loading: true,
  refresh: async () => {},
});

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/brands");
    const { brands: fetched } = await res.json();
    setBrands(fetched);
    setLoading(false);
    return fetched;
  }, []);

  useEffect(() => {
    refresh().then((fetched: Brand[]) => {
      const stored = window.localStorage.getItem("content-os-active-brand");
      const valid = fetched.find((b) => b.id === stored);
      setActiveBrandIdState(valid ? valid.id : fetched[0]?.id ?? null);
    });
  }, [refresh]);

  function setActiveBrandId(id: string) {
    setActiveBrandIdState(id);
    window.localStorage.setItem("content-os-active-brand", id);
  }

  const activeBrand = brands.find((b) => b.id === activeBrandId) ?? null;

  return (
    <BrandContext.Provider value={{ brands, activeBrand, activeBrandId, setActiveBrandId, loading, refresh }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
