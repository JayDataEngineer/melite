import { z } from "zod";
/** One drafts-domain record: the doc plus the recency column the
 *  list arm orders by (the file-mtime equivalent — seconds). */
declare const DraftRecordSchema: z.ZodObject<{
    updated_at: z.ZodNumber;
    doc: z.ZodObject<{
        draft_id: z.ZodString;
        status: z.ZodString;
        createdAt: z.ZodNumber;
        completedAt: z.ZodUnion<readonly [z.ZodNumber, z.ZodNull]>;
        intent: z.ZodString;
        stages: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
        }, z.core.$loose>>;
    }, z.core.$loose>;
}, z.core.$strip>;
export type DraftRecord = z.infer<typeof DraftRecordSchema>;
/** The draft-id law (editor_runs.818-822 heritage): 1..96 chars,
 *  [A-Za-z0-9_-] ASCII only, path-safe. THE SSOT — the queue's
 *  submit gate and the drafts remote both test this one address
 *  (the queue re-exports it; gateway-core's copy is dead). */
export declare const DRAFT_ID_RE: RegExp;
/** The id's PATTERN and its bound, published so every gate that
 *  admits a draft id enforces the SAME rule (the census's H13: the
 *  queue's copy had no cap, so a long id passed one door and was
 *  refused by the next with a different voice). */
export declare const DRAFT_ID_PATTERN: RegExp;
export declare const DRAFT_ID_MAX_LEN = 96;
/** draft_id_ok (the doors' hand-loop drop-in): the law, one voice. */
export declare function draftIdOk(draftId: string): boolean;
/** The drafts domain (unit dir `drafts/`, version 1). */
export declare const draftsDomainSpec: {
    name: string;
    version: number;
    layout: "per-record";
    invalidRecords: "backup-and-skip";
    global: {
        schema: z.ZodNumber;
        initial: number;
    };
    tables: {
        docs: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, {
            updated_at: number;
            doc: {
                [x: string]: unknown;
                draft_id: string;
                status: string;
                createdAt: number;
                completedAt: number | null;
                intent: string;
                stages: {
                    [x: string]: unknown;
                    id: string;
                }[];
            };
        }>;
    };
};
export type DraftsDomainSpec = typeof draftsDomainSpec;
export {};
//# sourceMappingURL=spec.d.ts.map