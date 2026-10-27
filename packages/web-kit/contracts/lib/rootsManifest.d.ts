/** §23 THE CROSS-ROOTS MANIFEST (2026-09-23): every run-resolving
 *  door (status/view/ledger/list — and, since the operator's law
 *  of the same night ("the agent maker and the user share
 *  EVERYTHING, THAT IS THE WHOLE POINT"), the ENGINE'S chained-
 *  input resolver too) searches the manifest IN ORDER — own root
 *  first (the fast path; own writes win), then the extras in
 *  their declared order. Extras are a CONFIG field (the J12
 *  conversion, 2026-10-19: the retired MELITE_STATE_ROOTS env
 *  seam was the only colon-spelling reader — roots are named in
 *  the queue/estate/engine config, never read from the process
 *  env). Dedup keeps the first occurrence (own root always
 *  leads). Pure for the walls.
 *
 *  HOSTED IN CONTRACTS (the one package every plane sees): the
 *  estate queue reads it for its run doors, the ComfyUI engine
 *  reads it when staging a chained input — the maker lane's runs
 *  resolve on the user's lane and back. One law, one spelling. */
export declare function rootsManifest(ownRoot: string, extras?: readonly string[]): string[];
/** The miss voice names every searched tree (the NAME-THE-ROOT
 *  law, extended across the manifest — a two-roots box stays
 *  debuggable on a miss, never a bare unknown). */
export declare function searchedVoice(roots: string[]): string;
/**
 * THE CROSS-ROOT ORDER, ONCE (the MCP/media audit's H4).
 *
 * Two readers resolve a run id across the manifest's roots and each
 * built its own list: the media list (own root first) and the gallery
 * artifact route (its own flow tree, then the manifest roots). With
 * a run id present in two trees they could disagree about which
 * bytes answer — the list serving one file while the artifact route
 * serves another for the SAME run id.
 *
 * This is the order both readers take: the caller's own tree first
 * (its own writes win), then the manifest roots in their declared
 * order, de-duplicated. `ownTree` is the caller's own CONFIGURED
 * tree and is a string at every seat — the gallery answers
 * `config.flowDir ?? DEFAULT_FLOW_DIR` — so the parameter declares no
 * null (the re-audit, 2026-10-16).
 */
export declare function crossRootOrder(ownTree: string, roots: readonly string[]): string[];
//# sourceMappingURL=rootsManifest.d.ts.map