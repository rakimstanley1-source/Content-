"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/content", label: "Content" },
  { href: "/analytics/email", label: "Email" },
];

export function AnalyticsTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  return (
    <div className="flex gap-5 hairline-b pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={qs ? `${tab.href}?${qs}` : tab.href}
            className={cn("text-sm transition-colors", active ? "text-ink" : "text-ink-dim hover:text-ink")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
