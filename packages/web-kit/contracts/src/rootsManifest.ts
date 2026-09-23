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
