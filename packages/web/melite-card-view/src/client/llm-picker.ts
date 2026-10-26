/**
 * llm-picker.ts — the enhance model picker's pure filter (burn e,
 * operator 2026-10-26: the dropdown for enhance LLM selection "HAS NO
 * SEARCH"). Extracted from the zoom bar's dropdown so the wall judges
 * the filtering law itself, not a copy of it: the full route list
 * (every provider × every advertised model, uncapped since the same
 * burn) is hundreds long — a scroll-only panel is not a picker.
 *
 * The law: case-insensitive substring over the FULL route spelling
 * ("provider/model"). The model segment is a substring of the route,
 * so "glm" finds "zai/glm-5.3" and "spark" finds
 * "opencode-go/muse-spark" through the one comparison — no second
 * arm. Empty/whitespace query = the whole list, order preserved.
 */

/** Filter the live route list down to the query's matches.
 *
 * @param routes - the live "provider/model" routes off the catalog
 * door (never a restated copy).
 * @param query - the operator's search text; blank keeps everything.
 * @returns the matching routes, original order preserved.
 */
export function filterLlmRoutes(routes: readonly string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (q === '') return [...routes]
  return routes.filter((r) => r.toLowerCase().includes(q))
}
