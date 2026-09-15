import { Suspense } from "react";
import { AnalyticsTabs } from "@/components/controls/AnalyticsTabs";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-ink-dim">Account-wide, sourced live via Composio</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Analytics</h1>
      </div>
      <Suspense fallback={null}>
        <AnalyticsTabs />
      </Suspense>
      {children}
    </div>
  );
}
