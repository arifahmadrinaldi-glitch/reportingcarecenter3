import { STARLINK_DEMO_TERMINALS, type StarlinkSnapshot, type StarlinkTerminal } from "./starlink";

/** Implement with the approved Starlink service-account contract, server-side only.
 * The adapter must handle auth, paginate every service line, join kit identities,
 * and explicitly map provider connectivity/service states to StarlinkStatus.
 * A timeout/provider failure must throw: never silently replace live data with demo.
 */
export interface StarlinkServiceAccountAdapter {
  listTerminals(): Promise<StarlinkTerminal[]>;
}

export async function readStarlinkSnapshot(adapter?: StarlinkServiceAccountAdapter): Promise<StarlinkSnapshot> {
  return {
    terminals: adapter ? await adapter.listTerminals() : STARLINK_DEMO_TERMINALS.map((row) => ({ ...row })),
    source: adapter ? "live" : "demo",
    fetchedAt: new Date().toISOString(),
  };
}