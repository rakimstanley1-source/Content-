import { Card, SectionHeading, Badge } from "@/components/ui/primitives";
import { GoalsManager } from "@/components/settings/GoalsManager";

export default function SettingsPage() {
  const checks = [
    { label: "Composio API key", ok: Boolean(process.env.COMPOSIO_API_KEY) },
    { label: "Anthropic API key (AI generation)", ok: Boolean(process.env.ANTHROPIC_API_KEY) },
    { label: "Instagram account override", ok: Boolean(process.env.COMPOSIO_INSTAGRAM_ACCOUNT_ID) },
    { label: "Email provider", ok: Boolean(process.env.COMPOSIO_EMAIL_PROVIDER) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-3xl text-ink">Settings</h1>

      <Card>
        <SectionHeading title="Server configuration" subtitle="Read-only — set these as environment variables, never in the UI." />
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between text-sm text-ink">
              <span>{c.label}</span>
              <Badge tone={c.ok ? "good" : "bad"}>{c.ok ? "Set" : "Missing"}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <GoalsManager />
    </div>
  );
}
