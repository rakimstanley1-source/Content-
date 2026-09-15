"use client";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { BrandProvider } from "@/components/providers/BrandProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrandProvider>{children}</BrandProvider>
    </ThemeProvider>
  );
}
