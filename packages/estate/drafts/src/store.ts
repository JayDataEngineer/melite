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
import { Service, type Context } from "@deepseek-ai/cordis";
import type {
  Domain,
  DomainFacility,
} from "@deepseek-ai/dsh-storage-domain";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isPurelyUnstatedRequiredVoice } from "@melite/contracts/laneRelations";
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

/** The per-row heal of replayed-refusal rows: the terminal-failure
 *  carry (2026-09-14) wrote an UNSTATED-required refusal onto bench
 *  stage rows as runStatus 'failed' — a refusal for a word the
 *  operator had not typed YET, replayed at every drill open long
 *  after the state was cured. The incomplete-draft law (2026-10-10)
 *  seats that class as bench state, never a run outcome; the run
 *  seat codes it now (card_compose_incomplete), so no NEW row
 *  matches. Idempotent and rewrite-only-on-match: rows without the
 *  class never touch disk; a healed row reads as never-ran (the
 *  empty status word folds to the no-information face).
 * @param drafts the drafts domain to heal
 */
async function healReplayedRefusals(
  drafts: Domain<DraftsDomainSpec>,
): Promise<void> {
  const docs = drafts.table("docs");
  for (const [did, rec] of docs.entries()) {
    // persisted rows are a durable boundary: a record without a doc
    // object (or without stages) carries no bench row to heal
    const doc = typeof rec === "object" && rec !== null ? rec.doc : undefined;
    if (typeof doc !== "object" || doc === null) continue;
    const stages = Array.isArray(doc.stages) ? doc.stages : [];
    let changed = false;
    for (const stage of stages) {
      if (typeof stage !== "object" || stage === null) continue;
      const row = stage as Record<string, unknown>;
      const runStatus = row["runStatus"];
      if (runStatus !== "failed" && runStatus !== "error") continue;
      const result = row["result"];
      const error =
        typeof result === "object" && result !== null
          ? (result as Record<string, unknown>)["error"]
          : undefined;
      // PURELY the class (the mixed-carry guard): a composite
      // refusal can join the stem with a stated-wrong half — that
      // row keeps its failed face, only whole-stem texts heal
      if (typeof error !== "string" || !isPurelyUnstatedRequiredVoice(error)) {
        continue;
      }
      row["runStatus"] = "";
      row["result"] = {};
      changed = true;
    }
    if (changed) await docs.put(did, rec);
  }
}

/** The fiber-scoped seat owning the drafts domain handles (id
 *  `meliteDraftsDomain` — the estate-seat prefix law, cf.
 *  skillRegistry.ts:20-28): one instance per mounting fiber, so the
 *  cached opens die with the fiber instead of living at module
 *  scope. Fields are TS-`private`, never `#private` — cordis
 *  `ctx.get` returns a proxy and private class fields die through
 *  it ("Cannot read private member ... whose class did not declare
 *  it"; the flows seat, flowsData.ts, is the measured precedent). */
export class DraftsDomainSeatService extends Service {
  static readonly inject = { optional: [] } as const;

  /** Per-facility open handles, keyed by the facility object (one
   *  slot per provider; GC-bounded, fiber-lifetime). */
  private cached = new WeakMap<
    object,
    { root: string; ready: Promise<Domain<DraftsDomainSpec>> }
  >();

  constructor(ctx: Context) {
    // the estate-seat id: dsh core may own the bare name
    super(ctx, "meliteDraftsDomain");
  }

  /** Open (or reuse) the drafts domain for this process's storage
   *  root. Throws LOUD when the host provides no storage facility —
   *  misconfiguration fails at the earliest resolvable point.
   *  @returns the ready domain handle (cached per facility). */
  async open(): Promise<Domain<DraftsDomainSpec>> {
    const root: string = resolveStorageRoot();
    // OPTIONAL-dependency probe per the tutorial's documented pattern
    // (cordis-tutorial/03-services.md: "skip inject and probe at the
    // use site" — property reads demand inject on loader-mounted
    // fibers; ctx.get returns the active provider or undefined).
    const facility = this.ctx.get("storageDomain") as DomainFacility | undefined;
    if (facility === undefined || facility === null) {
      throw new Error(
        "[estate-drafts] storage domain facility not mounted (ctx.storageDomain)",
      );
    }
    const hit = this.cached.get(facility);
    if (hit !== undefined && hit.root === root) return hit.ready;
    // A foreign root never cross-writes another root's units.
    if (hit !== undefined && hit.root !== root) {
      throw new Error("[estate-drafts] storage serves the boot root only");
    }
    const ready: Promise<Domain<DraftsDomainSpec>> = (async () => {
      const drafts = await facility.open(draftsDomainSpec);
      await importLegacyDrafts(drafts);
      await healReplayedRefusals(drafts);
      return drafts;
    })();
    this.cached.set(facility, { root, ready });
    try {
      return await ready;
    } catch (error: unknown) {
      // Unconditional: one slot per facility exists at a time (a
      // foreign root refuses above), so this rejection owns the slot.
      this.cached.delete(facility);
      throw error;
    }
  }
}

/** Open (or reuse) the drafts domain through the mounted seat. The
 *  apply mounts `DraftsDomainSeatService` before the remote
 *  services; tests mount it on their own Context.
 *  @param ctx - the Context whose fiber carries the seat.
 *  @returns the ready domain handle. */
export async function openDraftsDomain(
  ctx: Context,
): Promise<Domain<DraftsDomainSpec>> {
  const seat = ctx.get("meliteDraftsDomain") as DraftsDomainSeatService | undefined;
  if (seat === undefined || seat === null) {
    throw new Error(
      "[estate-drafts] drafts domain seat not mounted (new DraftsDomainSeatService(ctx))",
    );
  }
  return seat.open();
}
