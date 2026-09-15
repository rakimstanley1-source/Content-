"use client";

import { useState } from "react";
import { ChevronDown, Moon, Sun, Plus } from "lucide-react";
import { useBrand } from "@/components/providers/BrandProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import Link from "next/link";

export function Topbar() {
  const { brands, activeBrand, setActiveBrandId, loading } = useBrand();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="hairline-b flex items-center justify-between px-6 py-4 md:px-10">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-sm text-ink"
        >
          <span className="tabular">{loading ? "Loading…" : activeBrand?.name ?? "No brand yet"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-card border border-hairline bg-canvas-raised p-1 shadow-none">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setActiveBrandId(brand.id);
                  setOpen(false);
                }}
                className="block w-full rounded px-3 py-2 text-left text-sm text-ink hover:bg-accent-soft hover:text-accent"
              >
                {brand.name}
              </button>
            ))}
            <Link
              href="/brands"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-1.5 rounded px-3 py-2 text-left text-sm text-ink-dim hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" /> Manage brands
            </Link>
          </div>
        )}
      </div>

      <button onClick={toggle} className="rounded-full border border-hairline p-2 text-ink-dim hover:text-ink" aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
