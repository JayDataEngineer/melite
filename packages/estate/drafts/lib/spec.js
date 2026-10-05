// spec.ts — the drafts storage domain (re-homed, gateway kill 2026-09-10).
//
// The domain truth for draft docs: table `docs` keyed by draft id
// (DRAFT_ID_RE admits path-safe chars only, so the identity codec
// holds — no b64u here), one record per draft (large, sparse,
// individually disposable), schema-failing records backed up and
// skipped by the facility (`invalidRecords: 'backup-and-skip'`).
// The global slot is the one-time legacy-import marker: 0 until the
// legacy drafts tree has been imported, the import epoch (ms) after.
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";
/** One draft doc — the composer's shape: six contract keys plus
 *  caller extras verbatim. THE SERVE READ IS DELIBERATELY LOOSE
 *  (the write doors are strict; this read hands the composer's own
 *  extras back, pinned by bench-coverage's "extras ride the loose
 *  schema" row) — a looseObject needs no .passthrough() on top. */
const DraftDocSchema = z.looseObject({
    draft_id: z.string(),
    status: z.string(),
    createdAt: z.number(),
    completedAt: z.union([z.number(), z.null()]),
    intent: z.string(),
    stages: z.array(z.looseObject({ id: z.string() })),
});
/** One drafts-domain record: the doc plus the recency column the
 *  list arm orders by (the file-mtime equivalent — seconds). */
const DraftRecordSchema = z.object({
    updated_at: z.number().int(),
    doc: DraftDocSchema,
});
/** The draft-id law (editor_runs.818-822 heritage): 1..96 chars,
 *  [A-Za-z0-9_-] ASCII only, path-safe. THE SSOT — the queue's
 *  submit gate and the drafts remote both test this one address
 *  (the queue re-exports it; gateway-core's copy is dead). */
export const DRAFT_ID_RE = /^[A-Za-z0-9_-]{1,96}$/;
/** The id's PATTERN and its bound, published so every gate that
 *  admits a draft id enforces the SAME rule (the census's H13: the
 *  queue's copy had no cap, so a long id passed one door and was
 *  refused by the next with a different voice). */
export const DRAFT_ID_PATTERN = DRAFT_ID_RE;
export const DRAFT_ID_MAX_LEN = 96;
/** draft_id_ok (the doors' hand-loop drop-in): the law, one voice. */
export function draftIdOk(draftId) {
    return DRAFT_ID_RE.test(draftId);
}
/** The drafts domain (unit dir `drafts/`, version 1). */
export const draftsDomainSpec = defineDomain({
    name: "drafts",
    version: 1,
    layout: "per-record",
    invalidRecords: "backup-and-skip",
    global: { schema: z.number().int(), initial: 0 },
    tables: {
        docs: domainTable(DraftRecordSchema),
    },
});
//# sourceMappingURL=spec.js.map
