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
// INVALID-RECORD POLICY (alpha-native since 0.1.5-alpha.2): both specs
// declare `invalidRecords: 'backup-and-skip'` over the per-record layout —
// the facility backs a schema-failing record's document aside
// (`<key>.json.bak.<stamp>`, the backend's own backupRecord), logs the
// cause, and the open continues with that record absent; a record file
// stamped outside the accepted versions reads as absent with no backup.
// Derived replicas backfill from the disk scan, so an absent record is
// the correct recovery. The rc-era estate-side quarantine wrapper in
// store.ts is deleted — the facility owns this now. `version-mismatch`
// no longer has a unit-file trigger under per-record layout (version is
// scoped per record); anything else the facility throws propagates and
// the tier degrades to disk-only.
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

/** The assets index domain (unit dir `assets/`, version 1). Per-record
 *  layout: rows are large, sparse, and individually disposable — one bad
 *  or stale record file reads as absent and never bricks the unit; a
 *  schema-failing record is backed up and skipped (the facility's
 *  invalidRecords path, native since 0.1.5-alpha). */
export const assetsDomainSpec = defineDomain({
  name: "assets",
  version: 1,
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  tables: {
    runs: domainTable<string, RunRow>(RunRowSchema),
    artifacts: domainTable<string, ArtifactRow>(ArtifactRowSchema),
  },
});

/** The staged-upload index domain (unit dir `uploads/`, version 1). Same
 *  per-record + backup-and-skip shape as assets. */
export const uploadsDomainSpec = defineDomain({
  name: "uploads",
  version: 1,
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  tables: {
    files: domainTable<string, UploadFile>(UploadFileSchema),
  },
});

/** Spec types for Domain<S> handles (store.ts owns the open cache). */
export type AssetsDomainSpec = typeof assetsDomainSpec;
export type UploadsDomainSpec = typeof uploadsDomainSpec;
