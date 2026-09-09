// storage/store.ts — the persistence seam: doors read/write the DSH
// storage domains through here, never around it.
//
// SHAPE (the pilot's honestly-scoped contract):
//   - READS stay scan-derived this stroke (the assets/uploads parity
//     walls pin served bytes, and the ledger wall rewrites the journal
//     file out-of-band post-boot — a domain-served read would go stale.
//     The read cutover is the named next step, second stroke).
//   - WRITES converge the domains: the assets index door reconciles its
//     replica on every prod-tree read (drift-only writes — steady state
//     is a pure in-memory diff), the uploads door writes through on
//     every staged file, and first use backfills from disk when empty.
//     Every durable write emits `domain/changed` via the facility
//     (post-durability, in write order) — that emission IS the sidebar's
//     future feed (see domains.ts for the subscription seam).
//   - The seam NEVER throws: any storage failure degrades to disk-only
//     (the scan is the truth this stroke), mirroring the journal's
//     "never takes the gateway down" discipline. Served bytes cannot
//     change through here — callers compute bytes first, converge after.
//
// LIFECYCLE: one open per domain per storage root per process (the
// domain write chain serializes concurrent puts, so sharing the handle
// is correct). Storage is process-boot-scoped like the single-writer
// lock; request roots scope READS. A second root on the same facility
// degrades to disk-only (never cross-writes another root's units).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "@deepseek-ai/cordis";
import type {
  Domain,
  DomainFacility,
} from "@deepseek-ai/dsh-storage-domain";

/** The domain handle types re-exported at the seam: doors reach
 *  storage through this package, never by depending on the
 *  facility package directly. */
export type { Domain, DomainFacility } from "@deepseek-ai/dsh-storage-domain";
import type { AssetRoots } from "./scan.ts";
import { resolveInputDir, scanRun } from "./scan.ts";
import {
  assetsDomainSpec,
  draftsDomainSpec,
  presetsDomainSpec,
  uploadsDomainSpec,
} from "./domains.ts";
import type {
  ArtifactRow,
  AssetsDomainSpec,
  DraftRecord,
  DraftsDomainSpec,
  PresetRecord,
  PresetsDomainSpec,
  RegistryRow,
  RunRow,
  UploadFile,
  UploadsDomainSpec,
} from "./domains.ts";

/** Env override for the unit-file root (the MELITE_* family — an env
 *  seam, never a hardcode; QUEUE LANE LAW). */
export const STORAGE_ROOT_ENV: string = "MELITE_STORAGE_ROOT";


/** The json backend's unit-file root: the union of both doors'
 *  resolution (state root for the assets tree, repo root for the input
 *  dir) — scratch-pinned in every wall via MELITE_STATE_ROOT /
 *  MELITE_REPO_ROOT, <stateRoot>/storage in production. */
export function resolveStorageRoot(): string {
  const override: string = process.env[STORAGE_ROOT_ENV] ?? "";
  if (override !== "") return override;
  const repo: string = resolveRepoRoot();
  const state: string =
    process.env["MELITE_STATE_ROOT"] ?? join(repo, "data", "runs");
  return join(state, "storage");
}

/** Open handles, cached per storage root. */
export interface StorageHandles {
  readonly assets: Domain<AssetsDomainSpec>;
  readonly uploads: Domain<UploadsDomainSpec>;
  readonly drafts: Domain<DraftsDomainSpec>;
  readonly presets: Domain<PresetsDomainSpec>;
}

interface CacheEntry {
  readonly facility: DomainFacility;
  readonly root: string;
  readonly ready: Promise<StorageHandles>;
}

let cached: CacheEntry | null = null;

/** Canonical JSON (sorted keys) — immune to key-order drift between
 *  scan-built rows and domain round-trips, so steady state writes
 *  nothing. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const record = value as Record<string, unknown>;
  const keys: string[] = Object.keys(record).sort();
  return (
    "{" +
    keys
      .map((k: string): string => JSON.stringify(k) + ":" + stableStringify(record[k]))
      .join(",") +
    "}"
  );
}

/** base64url of a natural key — the path-safe domain key for keys that
 *  carry filename/path characters (per-record layout keys become path
 *  segments; the backend's SAFE_KEY_RE admits [a-zA-Z0-9_-] only).
 *  Applied per TABLE as a uniform policy (never per-key branching, so
 *  a table's key map stays injective): runs keys are path-safe hex and
 *  ride identity; artifact keys `<run>/<name>` and upload filename keys
 *  always encode. */
const b64uKey = (key: string): string =>
  Buffer.from(key, "utf8").toString("base64url");

/** Converge one table to its scanned rows (put-if-changed,
 *  delete-if-absent). Sequential awaits ride the domain write chain.
 *  `encode` maps natural keys to domain keys (see b64uKey). */
async function convergeTable<V>(
  table: {
    get(key: string): V | undefined;
    keys(): Iterable<string>;
    put(key: string, value: V): Promise<void>;
    delete(key: string): Promise<boolean>;
  },
  scanned: ReadonlyMap<string, V>,
  encode: (key: string) => string = (k: string): string => k,
): Promise<void> {
  const scannedKeys = new Set<string>();
  for (const [key, value] of scanned) {
    const domainKey = encode(key);
    scannedKeys.add(domainKey);
    if (stableStringify(table.get(domainKey)) !== stableStringify(value)) {
      await table.put(domainKey, value);
    }
  }
  for (const domainKey of [...table.keys()]) {
    if (!scannedKeys.has(domainKey)) await table.delete(domainKey);
  }
}

/** Scan the prod tree into domain rows (mirrors hAssetsIndex's loop:
 *  reverse-sorted `run-` entries, scanRun owns the row shape — the
 *  single source, imported not duplicated. Test-flagged sidecars ARE
 *  stored (the flag rides the record); the test TREE
 *  (test-output/?include_test) is never persisted — wall-only). */
function scanProdTree(
  runsRoot: string,
  kindsPath: string,
): { runs: Map<string, RunRow>; artifacts: Map<string, ArtifactRow> } {
  const runs = new Map<string, RunRow>();
  const artifacts = new Map<string, ArtifactRow>();
  let entries: string[];
  try {
    entries = readdirSync(runsRoot).sort().reverse();
  } catch {
    entries = [];
  }
  for (const ent of entries) {
    if (!ent.startsWith("run-")) continue;
    const row = scanRun(runsRoot, ent, kindsPath);
    runs.set(ent, {
      run_id: row.run_id,
      name: row.name,
      status: row.status,
      created_at: row.created_at,
      test: row.test,
    });
    for (const art of row.artifacts) {
      const name: string = String(art["name"] ?? "");
      artifacts.set(row.run_id + "/" + name, {
        run_id: row.run_id,
        name,
        kind: String(art["kind"] ?? ""),
        bytes: Number(art["bytes"] ?? 0),
        sha256: String(art["sha256"] ?? ""),
        url: String(art["url"] ?? ""),
      });
    }
  }
  return { runs, artifacts };
}

/** Backfill the uploads index from the input dir when empty (flat
 *  regular files only; MIME rides the ext exactly like the door's
 *  allowlist, unknown exts fall back to octet-stream exactly like
 *  content_type_of does). */
async function backfillUploadsIfEmpty(
  uploads: Domain<UploadsDomainSpec>,
): Promise<void> {
  const files = uploads.table("files");
  if (files.size !== 0) return;
  let entries: string[];
  const dir: string = resolveInputDir();
  try {
    entries = readdirSync(dir).sort();
  } catch {
    entries = [];
  }
  for (const name of entries) {
    const full: string = join(dir, name);
    try {
      const st = statSync(full);
      if (!st.isFile()) continue;
      const lower: string = name.toLowerCase();
      const mime: string = lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : lower.endsWith(".webp")
            ? "image/webp"
            : "application/octet-stream";
      await files.put(b64uKey(name), {
        name,
        path: "data/input/" + name,
        bytes: st.size,
        mime,
        created_at: Math.floor(st.mtimeMs / 1000),
      });
    } catch {
      /* a vanishing file backfills on the next pass */
    }
  }
}

/** Open (or reuse) both domains for this process's storage root, then
 *  backfill the uploads index when empty. Rejects on any failure —
 *  callers degrade to disk-only. */
async function getHandles(
  ctx: Context,
  root: string,
): Promise<StorageHandles> {
  const facility = ctx.storageDomain as DomainFacility | undefined;
  if (facility === undefined || facility === null) {
    throw new Error("[gateway-ts] storage domain facility not mounted");
  }
  if (cached !== null) {
    if (cached.root === root && cached.facility === facility) {
      return cached.ready;
    }
    if (cached.facility === facility) {
      // Same facility, foreign root: disk-only, never cross-write
      // another root's units (storage is process-boot-scoped, like
      // the lock; request roots scope READS, which stay scan-derived).
      throw new Error("[gateway-ts] storage serves the boot root only");
    }
    // A new facility (a rebuilt context): drain the stale open, then
    // reopen below.
    const stale: Promise<StorageHandles> = cached.ready;
    cached = null;
    await stale.then(
      async (handles: StorageHandles): Promise<void> => {
        try {
          await handles.assets.close();
        } catch {
          /* best-effort */
        }
        try {
          await handles.uploads.close();
        } catch {
          /* best-effort */
        }
        try {
          await handles.drafts.close();
        } catch {
          /* best-effort */
        }
        try {
          await handles.presets.close();
        } catch {
          /* best-effort */
        }
      },
      (): void => {
        /* a failed open holds nothing */
      },
    );
  }
  const ready: Promise<StorageHandles> = (async (): Promise<StorageHandles> => {
    const assets = await facility.open(assetsDomainSpec);
    const uploads = await facility.open(uploadsDomainSpec);
    const drafts = await facility.open(draftsDomainSpec);
    const presets = await facility.open(presetsDomainSpec);
    await backfillUploadsIfEmpty(uploads);
    await importLegacyDrafts(drafts);
    await importLegacyPresets(presets);
    return { assets, uploads, drafts, presets };
  })();
  cached = { facility, root, ready };
  try {
    return await ready;
  } catch (exc: unknown) {
    if (cached !== null && cached.ready === ready) cached = null;
    throw exc;
  }
}

/** The assets persistence seam: converge the replica to the prod tree.
 *  Called AFTER the door computes its bytes (bytes never wait on, nor
 *  change through, here). Never throws. */
export async function reconcileAssetsTier(
  ctx: Context,
  roots: AssetRoots,
): Promise<void> {
  try {
    const handles: StorageHandles = await getHandles(
      ctx,
      resolveStorageRoot(),
    );
    const scanned = scanProdTree(roots.runsRoot, roots.mediaKindsPath);
    await convergeTable(handles.assets.table("runs"), scanned.runs);
    await convergeTable(
      handles.assets.table("artifacts"),
      scanned.artifacts,
      b64uKey,
    );
  } catch {
    /* the scan remains the truth; the domain converges on a later pass */
  }
}

/** One staged upload (the door's 200 payload, MIME + second attached).
 *  Never throws. */
export async function noteUploadStaged(
  ctx: Context,
  rec: UploadFile,
): Promise<void> {
  try {
    const handles: StorageHandles = await getHandles(
      ctx,
      resolveStorageRoot(),
    );
    await handles.uploads.table("files").put(b64uKey(rec.name), rec);
  } catch {
    /* the staged file is the truth; the index catches up on backfill */
  }
}

/** The one-time legacy-drafts import (the py-era STATE_ROOT/drafts
 *  tree → the drafts domain). Guarded by the domain's global slot:
 *  runs only while it serves the initial 0, then stamps the epoch —
 *  a later wiped/empty unit NEVER re-imports frozen legacy ghosts.
 *  Unparseable/non-object legacy files skip (their drafts were
 *  unreadable in the old door too — the corrupt-on-disk class);
 *  keys collide-safe (draft ids are path-safe by DRAFT_ID_RE).
 *  The legacy files stay untouched on disk — evidence, never truth. */
async function importLegacyDrafts(drafts: Domain<DraftsDomainSpec>): Promise<void> {
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

/** The drafts door's domain handle (opens through the shared cache;
 *  callers own request-scope, never the handle's lifetime). */
export async function getDraftsDomain(
  ctx: Context,
): Promise<Domain<DraftsDomainSpec>> {
  const handles: StorageHandles = await getHandles(ctx, resolveStorageRoot());
  return handles.drafts;
}

/** The one-time legacy-presets import (the repo data/tenants tree →
 *  the presets domain). Same marker law as drafts: runs only while
 *  the global serves the initial 0, then stamps the epoch. Poison
 *  FILES skip whole (no domain row exists to quarantine — the file
 *  era's whole-ledger refusal becomes per-row/per-file absence);
 *  rows failing the seam schema skip individually (the door
 *  re-validates depth per served row). Keys are the uniform b64u of
 *  `<tenant>\n<row-id>`. */
async function importLegacyPresets(
  presets: Domain<PresetsDomainSpec>,
): Promise<void> {
  const marker = presets.global;
  if (marker.get() !== 0) return;
  const rows = presets.table("rows");
  const tenantsDir = join(resolveRepoRoot(), "data", "tenants");
  let lanes: string[];
  try {
    lanes = readdirSync(tenantsDir);
  } catch {
    lanes = [];
  }
  for (const lane of lanes.sort()) {
    let names: string[];
    try {
      names = readdirSync(join(tenantsDir, lane));
    } catch {
      continue;
    }
    for (const name of names.sort()) {
      const tenant = lane + "/" + name;
      let doc: unknown;
      try {
        doc = JSON.parse(
          readFileSync(join(tenantsDir, lane, name, "presets.json"), "utf8"),
        );
      } catch {
        continue;
      }
      if (
        typeof doc !== "object" ||
        doc === null ||
        Array.isArray(doc) ||
        !Array.isArray((doc as Record<string, unknown>)["presets"])
      ) {
        continue;
      }
      for (const row of (doc as { presets: unknown[] })["presets"]) {
        if (typeof row !== "object" || row === null || Array.isArray(row)) {
          continue;
        }
        const rec = row as Record<string, unknown>;
        if (typeof rec["id"] !== "string") continue;
        const key = b64uKey(tenant + "\n" + (rec["id"] as string));
        if (rows.get(key) !== undefined) continue;
        try {
          await rows.put(key, {
            tenant,
            row: rec as unknown as PresetRecord["row"],
          });
        } catch {
          /* a seam-failing legacy row skips; the rest import */
        }
      }
    }
  }
  await marker.set(Date.now());
}

/** The studios door's domain handle (opens through the shared cache). */
export async function getPresetsDomain(
  ctx: Context,
): Promise<Domain<PresetsDomainSpec>> {
  const handles: StorageHandles = await getHandles(ctx, resolveStorageRoot());
  return handles.presets;
}

/** The runs-list door's handle onto the assets domain (its registry
 *  table; the runs/artifacts reconcilers share the handle, never the
 *  table). */
export async function getAssetsDomain(
  ctx: Context,
): Promise<Domain<AssetsDomainSpec>> {
  const handles: StorageHandles = await getHandles(ctx, resolveStorageRoot());
  return handles.assets;
}
