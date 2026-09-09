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

/** One served run card — the hRunsList row dict VERBATIM (the door
 *  builds it with its own byte-scan law; the table stores what the
 *  door built, keyed by run_id). `media` + `created` ride alongside
 *  as the sort keys so the serve path never re-reads disk. */
const RegistryRowSchema = z.object({
  run_id: z.string(),
  media: z.boolean(),
  created: z.number().int(),
  card: z.looseObject({ run_id: z.string() }).passthrough(),
});

export type RegistryRow = z.infer<typeof RegistryRowSchema>;

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
    // The runs registry (the ALL stroke's third cutover, 2026-09-09):
    // the runs-list door's served cards, converged-then-served per
    // request. Owned EXCLUSIVELY by that door — the runs/artifacts
    // reconcilers never touch this table (no shared rows, no clobber).
    registry: domainTable<string, RegistryRow>(RegistryRowSchema),
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

/** One draft doc — the composer's shape (composeDraftDoc): six
 *  contract keys + caller extras verbatim (loose: extras ride).
 *  Domain truth since the storage stroke; the legacy drafts dir
 *  imports once (the global importedAt marker guards). */
const DraftDocSchema = z.looseObject({
  draft_id: z.string(),
  status: z.string(),
  createdAt: z.number(),
  completedAt: z.union([z.number(), z.null()]),
  intent: z.string(),
  stages: z.array(z.looseObject({ id: z.string() }).passthrough()),
});

/** One drafts-domain record: the doc plus the recency column the
 *  list arm orders by (the file-mtime equivalent; save and patch
 *  stamp it — seconds, matching the py index's int(mtime)). */
const DraftRecordSchema = z.object({
  updated_at: z.number().int(),
  doc: DraftDocSchema,
});

export type DraftRecord = z.infer<typeof DraftRecordSchema>;

/** The drafts domain (unit dir `drafts/`, version 1). Keys are
 *  draft ids — DRAFT_ID_RE ≡ the backend's SAFE_KEY_RE, so the
 *  identity codec holds (no b64u here). The global slot is the
 *  one-time legacy-import marker: 0 until the STATE_ROOT/drafts
 *  tree has been imported, the import epoch (ms) after — a wiped
 *  unit never re-imports frozen legacy ghosts. */
export const draftsDomainSpec = defineDomain({
  name: "drafts",
  version: 1,
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  global: { schema: z.number().int(), initial: 0 },
  tables: {
    docs: domainTable<string, DraftRecord>(DraftRecordSchema),
  },
});

/** One preset-ledger row at the seam: identity + tenant routing
 *  are zod-checked here; DEPTH stays the door's (validCharacterPreset
 *  re-validates every served row — per-row quarantine replaces the
 *  file era's whole-ledger refusal). */
const PresetRowSchema = z.looseObject({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  origin: z.string(),
});

const PresetRecordSchema = z.object({
  tenant: z.string(),
  row: PresetRowSchema.passthrough(),
});

export type PresetRecord = z.infer<typeof PresetRecordSchema>;

/** The presets domain (unit dir `presets/`, version 1) — the studios
 *  user-preset ledgers (the ALL stroke, 2026-09-09). Table `rows`,
 *  keyed by the composite `<tenant>\n<row-id>` under the uniform
 *  b64u codec (tenants carry `/`, illegal as a path segment; the
 *  newline separator is unambiguous — TENANT_RE + PRESET_ID_RE
 *  admit no newline, and the per-table codec never branches). The
 *  global slot is the one-time legacy-import marker (0 until the
 *  repo data/tenants tree has been imported). */
export const presetsDomainSpec = defineDomain({
  name: "presets",
  version: 1,
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  global: { schema: z.number().int(), initial: 0 },
  tables: {
    rows: domainTable<string, PresetRecord>(PresetRecordSchema),
  },
});

/** Spec types for Domain<S> handles (store.ts owns the open cache). */
export type AssetsDomainSpec = typeof assetsDomainSpec;
export type UploadsDomainSpec = typeof uploadsDomainSpec;
export type DraftsDomainSpec = typeof draftsDomainSpec;
export type PresetsDomainSpec = typeof presetsDomainSpec;
