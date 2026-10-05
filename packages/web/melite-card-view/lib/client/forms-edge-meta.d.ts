/** forms-edge-meta.ts — the /v1/forms edge-meta session cache
 * (extracted from CardsTab.tsx hour 15: one seam, one file). */
export declare function loadFormsEdgeMeta(): Promise<Record<string, {
    inputs?: Record<string, string>;
    outputs?: Record<string, string>;
}>>;
/** THE TEST RESET (the same seam the pick cell exports): the
 *  session cache is module state — a wall that needs the failed
 *  arm (or a fresh fetch) resets it between mounts. */
export declare function resetFormsEdgeMetaForTests(): void;
//# sourceMappingURL=forms-edge-meta.d.ts.map
