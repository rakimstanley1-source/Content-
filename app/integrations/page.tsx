"use client";

import { useEffect, useState } from "react";
import { Card, SectionHeading, Badge, Button } from "@/components/ui/primitives";
import { CheckCircle2, XCircle } from "lucide-react";

type Integration = {
  toolkit: string;
  label: string;
  category: "content" | "email";
  connected: boolean;
  accounts: Array<{ id: string; status: string; alias?: string; username?: string }>;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((json) => setIntegrations(json.integrations ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function connect(toolkit: string) {
    setConnecting(toolkit);
    const res = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolkit }),
    });
    const json = await res.json();
    setConnecting(null);
    if (json.redirectUrl) window.open(json.redirectUrl, "_blank");
    else window.alert(json.error ?? "Couldn't start connection.");
  }

  const categories: Array<{ key: Integration["category"]; label: string }> = [
    { key: "content", label: "Content platforms" },
    { key: "email", label: "Email marketing" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl text-ink">Integrations</h1>
        <p className="mt-1 text-sm text-ink-dim">Every external app connects through Composio — add or remove one here without touching the rest of the dashboard.</p>
      </div>

      {categories.map((cat) => (
        <div key={cat.key}>
          <SectionHeading title={cat.label} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter((i) => i.category === cat.key)
              .map((integration) => (
                <Card key={integration.toolkit}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg text-ink">{integration.label}</h3>
                    {integration.connected ? <CheckCircle2 className="h-4 w-4 text-good" /> : <XCircle className="h-4 w-4 text-ink-faint" />}
                  </div>
                  <Badge tone={integration.connected ? "good" : "neutral"}>{integration.connected ? "Connected" : "Not connected"}</Badge>
                  {integration.connected && integration.accounts.length > 0 && (
                    <p className="mt-2 text-xs text-ink-faint">
                      {integration.accounts.length} account{integration.accounts.length > 1 ? "s" : ""}: {integration.accounts.map((a) => a.username ?? a.alias ?? a.id).join(", ")}
                    </p>
                  )}
                  {!integration.connected && (
                    <Button variant="outline" onClick={() => connect(integration.toolkit)} disabled={connecting === integration.toolkit} className="mt-3">
                      {connecting === integration.toolkit ? "Opening…" : "Connect"}
                    </Button>
                  )}
                </Card>
              ))}
          </div>
        </div>
      ))}

      {!loading && integrations.length === 0 && <p className="text-sm text-ink-dim">Set COMPOSIO_API_KEY to see live connection status.</p>}
    </div>
  );
}
