/** Thrown when a Composio call fails for a reason a UI card should surface
 * (not connected, action error, rate limited after retries). Kept distinct
 * from programmer errors so API routes can turn it into a per-card error
 * state instead of a 500. */
export class ComposioSourceError extends Error {
  readonly toolkit: string;
  readonly kind: "not_connected" | "action_failed" | "rate_limited" | "config_missing";

  constructor(message: string, opts: { toolkit: string; kind: ComposioSourceError["kind"] }) {
    super(message);
    this.name = "ComposioSourceError";
    this.toolkit = opts.toolkit;
    this.kind = opts.kind;
  }
}
