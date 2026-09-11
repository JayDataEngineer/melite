// store.ts — open the drafts domain through the host's facility.
//
// The facility seat (`ctx.storageDomain`) is provided by the HOST's
// storage rows (json backend + domain facility); this package never
// bundles them. The open is lazy and process-scoped (one open per
// storage root — the domain write chain serializes concurrent puts,
// so sharing the handle is correct), cached on first use.
//
// First open runs the one-time legacy import (the pre-domain
// STATE_ROOT/drafts tree → the domain), guarded by the global slot:
// runs only while it serves the initial 0, then stamps the epoch —
// a wiped unit never re-imports frozen ghosts. The legacy files stay
// untouched on disk — evidence, never truth.
import type { Context } from "@deepseek-ai/cordis";
import type {
  Domain,
  DomainFacility,
} from "@deepseek-ai/dsh-storage-domain";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { draftsDomainSpec } from "./spec.js";
import type { DraftRecord, DraftsDomainSpec } from "./spec.js";

/** Env override for the unit-file root (an env seam, never a hardcode). */
export const STORAGE_ROOT_ENV: string = "MELITE_STORAGE_ROOT";

/** Env seam for the state root the legacy drafts tree hangs under. */
const STATE_ROOT_ENV: string = "MELITE_STATE_ROOT";

/** The json backend's unit-file root: `<stateRoot>/storage`. */
export function resolveStorageRoot(): string {
  const override: string = process.env[STORAGE_ROOT_ENV] ?? "";
  if (override !== "") return override;
  const state: string = process.env[STATE_ROOT_ENV] ?? "data/runs";
  return join(state, "storage");
}

/** The one-time legacy-drafts import (the pre-domain drafts tree →
 *  the drafts domain). Unparseable/non-object legacy files skip;
 *  schema-failing rows skip individually; the rest import. */
async function importLegacyDrafts(
  drafts: Domain<DraftsDomainSpec>,
): Promise<void> {
  const marker = drafts.global;
  if (marker.get() !== 0) return;
  const docs = drafts.table("docs");
  const legacyDir = join(resolveStorageRoot(), "..", "drafts");
  let names: string[];
  try {
    names = readdirSync(legacyDir);
  } catch {
    names = [];
  }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const did = name.slice(0, -5);
    if (docs.get(did) !== undefined) continue;
    let doc: unknown;
    try {
      doc = JSON.parse(readFileSync(join(legacyDir, name), "utf8"));
    } catch {
      continue;
    }
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) continue;
    const rec = doc as Record<string, unknown>;
    if (typeof rec["draft_id"] !== "string") rec["draft_id"] = did;
    let updated = Math.floor(Date.now() / 1000);
    try {
      updated = Math.floor(statSync(join(legacyDir, name)).mtimeMs / 1000);
    } catch {
      /* unstatable imports as now — ordering stays total */
    }
    try {
      await docs.put(did, {
        updated_at: updated,
        doc: rec as unknown as DraftRecord["doc"],
      });
    } catch {
      /* a schema-failing legacy row skips; the rest import */
    }
  }
  await marker.set(Date.now());
}

let cached: WeakMap<
  object,
  { root: string; ready: Promise<Domain<DraftsDomainSpec>> }
> = new WeakMap();

/** Open (or reuse) the drafts domain for this process's storage
 *  root. Throws LOUD when the host provides no storage facility —
 *  misconfiguration fails at the earliest resolvable point. */
export async function openDraftsDomain(
  ctx: Context,
): Promise<Domain<DraftsDomainSpec>> {
  const root: string = resolveStorageRoot();
  // OPTIONAL-dependency probe per the tutorial's documented pattern
  // (cordis-tutorial/03-services.md: "skip inject and probe at the
  // use site" — property reads demand inject on loader-mounted
  // fibers; ctx.get returns the active provider or undefined).
  const facility = ctx.get("storageDomain") as DomainFacility | undefined;
  if (facility === undefined || facility === null) {
    throw new Error(
      "[estate-drafts] storage domain facility not mounted (ctx.storageDomain)",
    );
  }
  const hit = cached.get(facility);
  if (hit !== undefined && hit.root === root) return hit.ready;
  // A foreign root never cross-writes another root's units.
  if (hit !== undefined && hit.root !== root) {
    throw new Error("[estate-drafts] storage serves the boot root only");
  }
  const ready: Promise<Domain<DraftsDomainSpec>> = (async () => {
    const drafts = await facility.open(draftsDomainSpec);
    await importLegacyDrafts(drafts);
    return drafts;
  })();
  cached.set(facility, { root, ready });
  try {
    return await ready;
  } catch (error: unknown) {
    // Unconditional: one slot per facility exists at a time (a
    // foreign root refuses above), so this rejection owns the slot.
    cached.delete(facility);
    throw error;
  }
}
