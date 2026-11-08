import { type FormSpecDoc } from './spec.js';
/** THE SERVED-SPEC HOOK (the DRY extraction, 2026-09-13): four
 *  consumers (mask-studio's TuneSection, h3's RunAdvancedPanels,
 *  img-to-mesh's client, ideogram4's client) each hand-copied the
 *  same fetch-once + abort dance. One spelling now: fetches
 *  /v1/form-spec?model=<id> when the id is non-empty, aborts the
 *  in-flight fetch on unmount or id change, and hands back the doc
 *  (null until it lands) + the refusal message (null unless the door
 *  refused — loud consumers render it, silent ones ignore it).
 *  Consumer-specific derivations (field filters, value seeding) stay
 *  at the call site as reactions to `spec`. */
export declare function useFormSpec(modelId: string | null | undefined): {
    spec: FormSpecDoc | null;
    error: string | null;
    /** THE SAME-SESSION REFRESH (2026-11-15, the lora upload leaf):
     *  stale-while-revalidate — re-fetches the served spec WITHOUT
     *  clearing the current one, so the form never blanks mid-edit and
     *  the next paint swaps the options (a landed lora row serves in
     *  the SAME session). A refusal leaves the standing spec in place
     *  and reports through `error`. Superseded flights (an id change
     *  or a later refresh) never land — the shared token orphans them. */
    refresh: () => Promise<void>;
};
//# sourceMappingURL=use-form-spec.d.ts.map