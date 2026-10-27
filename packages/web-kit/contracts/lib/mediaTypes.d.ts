/** Wire shape of a run summary from GET /v1/flows/runs (list_runs).
 *  The contract returns loose Records; the derived module casts. */
export interface MediaRun {
    run_id: string;
    status?: string;
    prompt?: string;
    thumbnail?: string;
    created_at?: number;
    params?: Record<string, unknown>;
    artifacts?: Array<{
        url: string;
        type?: string;
        size?: number;
    }>;
    /** Distinct brick families that executed (provenance, 2026-08-09).
     *  Absent on pre-provenance runs — consumers treat [] as "no trace". */
    families?: string[];
}
//# sourceMappingURL=mediaTypes.d.ts.map