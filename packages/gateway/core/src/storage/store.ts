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
import { readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "@deepseek-ai/cordis";
import type {
  Domain,
  DomainFacility,
} from "@deepseek-ai/dsh-storage-domain";
import type { AssetRoots } from "./scan.ts";
import { resolveInputDir, scanRun } from "./scan.ts";
import {
  assetsDomainSpec,
  uploadsDomainSpec,
} from "./domains.ts";
import type {
  ArtifactRow,
  AssetsDomainSpec,
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
}

interface CacheEntry {
  readonly facility: DomainFacility;
  readonly root: string;
  readonly ready: Promise<StorageHandles>;
}

let cached: CacheEntry | null = null;

/** Stable-contract code of a thrown error (DomainError/StorageError
 *  carry `code` as their switchable contract — structural read, never
 *  instanceof, so a second package copy cannot fool the switch). */
function errorCode(exc: unknown): string {
  if (
    typeof exc === "object" &&
    exc !== null &&
    "code" in exc &&
    typeof (exc as { code: unknown }).code === "string"
  ) {
    return (exc as { code: string }).code;
  }
  return "";
}

/** Quarantine a poisoned unit file aside (derived data → backup-and-skip:
 *  the domain re-opens empty and backfills; the .bak file keeps the
 *  evidence). Never throws. */
function quarantineUnitFile(root: string, unit: string): void {
  try {
    renameSync(
      join(root, unit + ".json"),
      join(root, unit + ".json.bak-" + Date.now()),
    );
  } catch {
    /* absent or locked — the reopen decides */
  }
}

/** Open one domain, quarantining poisoned units (invalid-record /
 *  malformed-medium) for backfill. version-mismatch and anything else
 *  propagate — the caller degrades to disk-only. */
async function openDomain<S extends AssetsDomainSpec | UploadsDomainSpec>(
  facility: DomainFacility,
  root: string,
  spec: S,
): Promise<Domain<S>> {
  try {
    return await facility.open(spec);
  } catch (exc: unknown) {
    const code: string = errorCode(exc);
    if (code !== "invalid-record" && code !== "malformed-medium") throw exc;
    quarantineUnitFile(root, spec.name);
    return await facility.open(spec);
  }
}

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

/** Converge one table to its scanned rows (put-if-changed,
 *  delete-if-absent). Sequential awaits ride the domain write chain. */
async function convergeTable<V>(
  table: {
    get(key: string): V | undefined;
    keys(): Iterable<string>;
    put(key: string, value: V): Promise<void>;
    delete(key: string): Promise<boolean>;
  },
  scanned: ReadonlyMap<string, V>,
): Promise<void> {
  for (const [key, value] of scanned) {
    if (stableStringify(table.get(key)) !== stableStringify(value)) {
      await table.put(key, value);
    }
  }
  for (const key of [...table.keys()]) {
    if (!scanned.has(key)) await table.delete(key);
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
      await files.put(name, {
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
      },
      (): void => {
        /* a failed open holds nothing */
      },
    );
  }
  const ready: Promise<StorageHandles> = (async (): Promise<StorageHandles> => {
    const assets = await openDomain(facility, root, assetsDomainSpec);
    const uploads = await openDomain(facility, root, uploadsDomainSpec);
    await backfillUploadsIfEmpty(uploads);
    return { assets, uploads };
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
    await handles.uploads.table("files").put(rec.name, rec);
  } catch {
    /* the staged file is the truth; the index catches up on backfill */
  }
}
