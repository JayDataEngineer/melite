/** §23 THE CROSS-ROOTS MANIFEST (2026-09-23): every run-resolving
 *  door (status/view/ledger/list — and, since the operator's law
 *  of the same night ("the agent maker and the user share
 *  EVERYTHING, THAT IS THE WHOLE POINT"), the ENGINE'S chained-
 *  input resolver too) searches the manifest IN ORDER — own root
 *  first (the fast path; own writes win), then the
 *  MELITE_STATE_ROOTS extras. The extras ride the same per-process
 *  env seam as MELITE_STATE_ROOT (the queue boot law refuses to
 *  guess from cwd — roots are named, never inferred):
 *  colon-separated, explicit per lane. Dedup keeps the first
 *  occurrence (own root always leads); blanks drop. Pure (env
 *  injectable) for the walls.
 *
 *  HOSTED IN CONTRACTS (the one package every plane sees): the
 *  estate queue reads it for its run doors, the ComfyUI engine
 *  reads it when staging a chained input — the maker lane's runs
 *  resolve on the user's lane and back. One law, one spelling. */
export function rootsManifest(
  ownRoot: string,
  env: Record<string, string | undefined> = process.env,
): string[] {
  const extras: string[] = (env["MELITE_STATE_ROOTS"] ?? "")
    .split(":")
    .map((s: string): string => s.trim())
    .filter((s: string): boolean => s !== "");
  return [...new Set([ownRoot, ...extras])];
}

/** The miss voice names every searched tree (the NAME-THE-ROOT
 *  law, extended across the manifest — a two-roots box stays
 *  debuggable on a miss, never a bare unknown). */
export function searchedVoice(roots: string[]): string {
  return "(searched " + roots.join(", ") + ")";
}

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
export function crossRootOrder(ownTree: string, roots: readonly string[]): string[] {
  const out: string[] = []
  for (const tree of [ownTree, ...roots]) {
    if (tree === '') continue
    if (!out.includes(tree)) out.push(tree)
  }
  return out
}
