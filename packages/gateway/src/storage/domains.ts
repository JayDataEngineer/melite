// storage/domains.ts — the gateway persistence tier: DSH storage domains.
//
// THE PILOT (operator order, "Do the pilot" — the DSH storage-subsystem
// pilot for the media sidebar's data layer): the assets + uploads indexes
// become DSH storage domains over the json backend. The runs registry is
// OUT OF SCOPE (byte-wall-pinned, second stroke).
//
// Decision context: docs/dsh-homolog/README.md (the win-win law — prefer
// the DSH shape, even at small local cost). The sidebar itself
// (@infer-media/dsh-media) stays untouched — this stroke is the GATEWAY's
// persistence tier only.
//
// DOMAINS (version 1):
//   - `assets` — replica of the derived asset index. Tables `runs`
//     (key: run_id) + `artifacts` (key: `<run_id>/<name>`). Rows are
//     large (hundreds per estate), sparse (empty-artifact runs ARE rows —
//     scanRun lists every `run-` entry, including the non-directory
//     empty-row pin), and individually disposable (one record per
//     artifact; a delete removes exactly one row).
//   - `uploads` — the staged-input index (data/input has NO list door;
//     this domain IS its index). Table `files` (key: staged filename).
//
// ZOD AT THIS SEAM (canon'd in docs/patterns/cordis-core.md): record
// schemas are ZOD — the DSH-native shape per the win-win law
// (@deepseek-ai/dsh-storage-domain src/spec.ts: record schemas are zod,
// `z.infer` keeps types un-duplicated, the same schemas later project to
// RPC wire schemas; plugin `Config` stays schemastery). Schemastery
// remains the estate's door/card schema tool (src/core/params.ts,
// card-decls); it does not cross this seam.
//
// INVALID-RECORD POLICY (rc-tier surprise, named for the canon): neither
// 0.0.1-rc.1 nor the estate-pinned 0.1.0-rc.8 facility offers an
// invalidRecords knob — `DomainFacility.open` fails LOUD with
// `invalid-record` (or the backend's `malformed-medium`) on any stored
// record that misses its schema. The estate-side policy (derived data →
// backup-and-skip) lives in src/storage/store.ts: on those two codes the
// unit file is quarantined aside (`<unit>.json.bak-<epochMs>`) and the
// domain re-opens empty for backfill. `version-mismatch` is NEVER
// auto-wiped (a version bump needs a conscious migration) — the tier
// degrades to disk-only and the second stroke owns the migration.
//
// THE SIDEBAR'S FUTURE SUBSCRIPTION SEAM (no web/* changes this stroke):
// every durable write emits `domain/changed` on the gateway context
// ({domain, table, key, operation: 'put'|'deleted', value?} — the facility
// emits post-durability, in write order, per domain). A future sidebar
// lane subscribes with `ctx.on('domain/changed', …)` on the gateway root
// context (`{global: true}` bypasses context-filter scoping; the
// storage-domain invariant companion in the DSH package uses exactly that
// option) and re-pulls the affected table. Reads stay scan-derived this
// stroke; the read cutover is the named next step (second stroke, with
// the runs registry — cutting reads over before the runs lane owns
// artifact lifecycle would serve stale rows).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";

/** One run row — the shape scanRun (doors/assets.ts) builds per `run-`
 *  entry, stored verbatim so a future read cutover serves identical JSON. */
const RunRowSchema = z.object({
  run_id: z.string(),
  name: z.string(),
  status: z.string(),
  created_at: z.number().int(),
  test: z.boolean(),
});

/** One artifact row — the shape scanRun pushes per indexed file. */
const ArtifactRowSchema = z.object({
  run_id: z.string(),
  name: z.string(),
  kind: z.string(),
  bytes: z.number().int(),
  sha256: z.string(),
  url: z.string(),
});

/** One staged upload — the uploads door's 200 payload plus the MIME
 *  the ext rode in on and the staging second. */
const UploadFileSchema = z.object({
  name: z.string(),
  path: z.string(),
  bytes: z.number().int(),
  mime: z.string(),
  created_at: z.number().int(),
});

/** Inferred row types (z.infer keeps types un-duplicated — the spec.ts
 *  rationale for zod at this seam). */
export type RunRow = z.infer<typeof RunRowSchema>;
export type ArtifactRow = z.infer<typeof ArtifactRowSchema>;
export type UploadFile = z.infer<typeof UploadFileSchema>;

/** The assets index domain (unit file `assets.json`, version 1). */
export const assetsDomainSpec = defineDomain({
  name: "assets",
  version: 1,
  tables: {
    runs: domainTable<string, RunRow>(RunRowSchema),
    artifacts: domainTable<string, ArtifactRow>(ArtifactRowSchema),
  },
});

/** The staged-upload index domain (unit file `uploads.json`, version 1). */
export const uploadsDomainSpec = defineDomain({
  name: "uploads",
  version: 1,
  tables: {
    files: domainTable<string, UploadFile>(UploadFileSchema),
  },
});

/** Spec types for Domain<S> handles (store.ts owns the open cache). */
export type AssetsDomainSpec = typeof assetsDomainSpec;
export type UploadsDomainSpec = typeof uploadsDomainSpec;
