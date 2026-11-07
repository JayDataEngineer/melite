import "@melite/comfyui-cordis";
import "@melite/comfyui-card-kit/params-emit";
import { LlmRuntime } from "@deepseek-ai/dsh-llm";
import "@melite/comfyui-card-kit/card-definition";
import "@melite/comfyui-card-kit/model-contract";
import "@melite/contracts/formSpec";
//#region src/llm-complete.d.ts
/** The runtime seat this core exercises — a structural Pick of the
 *  REAL LlmRuntime contract (@deepseek-ai/dsh-llm). */
type LlmStreamSeam = Pick<LlmRuntime, "stream" | "listProviders" | "listModels">;
/** One enhancement request — a recipe system prompt + the user's words. */
interface EnhanceRequest {
  system: string;
  prompt: string;
  temperature?: number;
  signal?: AbortSignal;
  /**
   * The caller's chosen harness route (2026-09-06, operator order:
   * the ✦ button must serve the USER'S model, never silently
   * DeepSeek): "provider/model" exact, or a bare "model" that must
   * match exactly one advertised route. Honored FIRST; the walk
   * below stays behind it (ordered preference, never a silent
   * wrong-model answer — the response echoes `via`).
   */
  llm?: string;
}
/** One route on the harness model plane. */
interface HarnessRoute {
  provider: string;
  model: string;
}
/** "provider/model" — the only spelling a route is ever named by. */
declare function routeName(r: HarnessRoute): string;
/**
 * Resolve the harness model routes with ZERO configuration: every
 * registered provider route × its advertised models — INTERLEAVED
 * round-robin across providers (2026-09-05 fix: registration order
 * let ONE keyless provider with many advertised models eat the entire
 * attempt budget — observed live: six deepseek-official routes burned
 * before the credentialed xiaomi/zai/openrouter providers were ever
 * tried). The interleave order stays; the attempt budget that shaped
 * it is GONE with the walk it bounded (burn e, operator 2026-10-26:
 * the enhance dropdown "IS MISSING MANY MODELS" — the retire-the-walk
 * stroke left the 12-route slice behind as its only effect, and the
 * card's model picker + the matcher both read this list): a provider
 * with 50 advertised models showed 12. The list is COMPLETE now —
 * every route every provider advertises, nothing sliced.
 */
declare function resolveHarnessRoutes(llm: LlmStreamSeam): Promise<HarnessRoute[]>;
/**
 * Match a caller-named route against the live list. Exact
 * "provider/model" wins; a bare "model" must be unambiguous (two
 * providers advertising it is a 400 naming both — guessing between
 * providers is how silent-DeepSeek happens). Unknown → throw with
 * the live list (the route turns it into a 400, never a walk).
 *
 * `{ quiet: true }` (the preference arm): an unresolvable or
 * ambiguous name returns undefined instead of throwing — a
 * preference is an ordered candidate, so the caller skips to its
 * next arm; every resolve rule above is unchanged.
 *
 * Version-tail tolerance (2026-09-06, live-caught): the settings
 * default names glm-5.3 while the provider advertises glm-4.7 —
 * a newer default than the live provider list carries. The named
 * model is RESOLVED, never walked: same provider, its NEWEST
 * advertised model below the named one in the family line. If the
 * provider itself is absent, or nothing matches, the failure stays
 * loud with the live list. This is resolution of the user's own
 * default, not a fallback to a DIFFERENT provider's model.
 */
declare function matchHarnessRoute(routes: HarnessRoute[], want: string, opts?: {
  quiet?: boolean;
}): HarnessRoute | undefined;
/**
 * Recipe + prompt in, {positive, negative, via} out. THE one enhance
 * call. NO WALK, NO FALLBACKS (queue lane law, operator 2026-09-06:
 * "No fallbacks. Ever." — the first-breathing walk is what served
 * DeepSeek/minimax by luck of registration order and provider
 * health):
 *
 *   - explicit req.llm names the route, else defaultLlm (the
 *     agentDefaultModel service's live selection — the user's own
 *     default) names it. Explicit wins; NEITHER walks.
 *   - preference (operator order, "muse-spark-1.3-contributor i
 *     want to use over glm-5v-turbo"): a route name the door
 *     prefers BETWEEN explicit and the host default. An ordered
 *     candidate, not a contract — a name that does not resolve
 *     against the live list is SKIPPED (the default arm serves);
 *     a named-live preference that fails to complete is still the
 *     honest 502 (no step-past, ever).
 *   - unresolvable name → throw naming the live routes (the route
 *     maps explicit→400, stale default→502).
 *   - the ONE route completes; its failure is the honest error
 *     (502 naming route + cause) — never a silent other model.
 *
 * `via` echoes the serving route. This is the keystore era's shape
 * (one configured model, loud otherwise) with the model resolved
 * from the host default instead of the retired keystore.
 */
declare function harnessEnhance(llm: LlmStreamSeam, req: EnhanceRequest, defaultLlm?: string, preference?: string): Promise<{
  positive: string;
  negative: string;
  via: string;
}>;
//#endregion
//#region src/discovery.d.ts
/** The modifier-pack table (the subcard packs). controlnet waits
 *  unboarded (the phantom-capability gate). kind/label/cardinality
 *  are UI strings with no other live source — one row per pack,
 *  stated once.
 *  EXPORTED (022's self-critique #3, 2026-09-24): the load bundle's
 *  mods line serves the SAME grammar for DECL-boarded packs (the
 *  qvoice seats) — one table, two consumers, never a copy. */
declare const MODIFIER_PACKS: Record<string, {
  kind: string;
  label: string;
  cardinality: string;
  max_stack?: number;
  param_key?: string;
  /** THE ENTRY MODE (pack vocabulary, same status as kind/label:
   *  option = the entry is { id, strength } against the served
   *  catalog; hybrid = the entry is the bag element object with
   *  its option_key field bound to the catalog; field = the entry
   *  IS the contract object, no catalog. The leaf switches on the
   *  SERVED value, never the kind name). */
  entry?: string;
  option_key?: string;
  /** THE SCALAR DIAL (the bag element's weight field): strength
   *  for lora/controlnet, weight for ip_adapter — served so the
   *  leaf never guesses off the kind name. */
  scalar_key?: string;
  /** THE ENTRY SHAPE (friction-report #4, 2026-10-28): the doc line
   *  `entries: {...}` names the ENTRY shape, never the pack's field
   *  names — the old `entries: {loras}` read as an entry shaped
   *  `{loras: ...}` and burned three refusals. A pack whose entries
   *  are catalog picks states the pick shape here. */
  entry_shape?: string;
  /** THE FLAT LAW (the qvoice_save burn, 2026-10-22): true = the
   *  pack's fields are the card's own knobs — commits ride the
   *  root, no bag forms (modCommitWrite, @melite/contracts). */
  flat?: true;
}>;
/** /v1/boot-facts — the boot caches' staleness signal (HMR audit
 *  009 F2, 2026-10-24): the card-defs and model-facts caches are
 *  boot snapshots with no re-read — an edit on a live host served
 *  stale with ZERO signal, and the operator could not tell "edit
 *  not served" from "edit wrong". This door is the signal: both
 *  caches' prime times against their on-disk truths, with a stale
 *  verdict each. The registry half carries the caller's
 *  ctx.cardRegistry; a fiber without it (the provider unmounted)
 *  reports that fact by name — the door's own law is visibility,
 *  never a silent empty and never a crash.
 *  @param registry the host fiber's card registry, if mounted. */
declare function bootFactsArm(registry: {
  factsStaleness(): {
    primed_at: string | null;
    source: string;
    source_mtime: string;
    stale: boolean;
  };
} | null | undefined): Record<string, unknown>;
//#endregion
export { matchHarnessRoute as a, harnessEnhance as i, bootFactsArm as n, resolveHarnessRoutes as o, LlmStreamSeam as r, routeName as s, MODIFIER_PACKS as t };