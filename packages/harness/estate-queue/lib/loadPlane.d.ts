import { emitModifierKinds } from "@melite/comfyui-cordis";
import type { ModelsService } from "@melite/comfyui-cordis";
import type { CardRegistryService } from "./cardsRegistry.ts";
import type { FlowsSeat } from "./flowsData.ts";
import { toolBaseRows } from "./toolProjection.ts";
import type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";
/** A card id → its package dir. The cardPackages rows are package
 *  NAMES ('@melite/<genre>-<card>'); the id is the row's tail past
 *  the genre prefix, which is NOT reparseable from the string alone
 *  (ids carry dashes) — so match rows ending in '-' + id, split the
 *  genre against the LIVE domain tier (readdir packages/), and keep
 *  the ones whose dir carries src/card.ts (the cardUnitDirs guard).
 *  Node resolution is the WRONG tool (pnpm links only dependents —
 *  require.resolve starves); the repo tree is the truth.
 *  Zero hits = unknown id; two = a data bug — both refuse LOUD at
 *  the door, never a silent pick. */
export declare function resolveCardPackageDir(repo: string, cardId: string): string;
/** The card's agents md (src/agents/**, AGENT.md first, sorted,
 *  capped — the cap is the contract: lines route, bodies stay
 *  bounded). */
export declare function cardSkillDocs(pkgDir: string): Array<{
    path: string;
    text: string;
}>;
/** The card's tool-call signature — the /v1/tools row
 *  envelope (ROW_KEYS mirror toolsEmit — one projection, the
 *  emitter imported, the envelope shared by construction). */
export declare function toolRowFor(id: string, def: {
    schemaCarrier?: unknown;
    schema: unknown;
    boarded: readonly string[];
    mods?: Parameters<typeof emitModifierKinds>[0];
}, rows: ReturnType<typeof toolBaseRows>): Record<string, unknown>;
/** The bundle digest (the DSH session-catalog half we CAN own:
 *  their catalog is digest-diffed "stable, never duplicated" — we
 *  don't own the loop so we can't clear the agent's context, but a
 *  stable content hash lets the agent dedupe its own reloads: quote
 *  the digests you hold, skip reload on a match). sha16 of the
 *  canonical bundle JSON (the asset pipeline's sha16 convention). */
export declare function bundleDigest(bundle: Record<string, unknown>): string;
/** Tier-1 skill LINES for one card id (the melite_skill_index truth —
 *  wireSkill rows over the planes buckets, card-skill scope only;
 *  the card's AGENT.md rides full under agents, never as a line).
 *  Merged across engines, id-deduped; unknown cards line nothing
 *  (the walk is the truth — never a refusal). */
export declare function skillLinesForCard(repo: string, cardId: string): Array<Record<string, unknown>>;
/** Tier-1 skill LINES for boarded families (the discover+load
 *  contract, 2026-09-22: ONE melite_load hands the agent the card's
 *  skills AND every boarded family's model skills — the agent
 *  learns model:anima:prompt-enhance from loading image-gen, never
 *  from a second hunt). Entrance rows (scope "model", the family's
 *  AGENT.md) ride when the family authors one, then its skills
 *  (scope "model-skill"), in the boarded order — card skills first
 *  (the caller concatenates), then family by family. A boarded id
 *  with no rows contributes nothing (the walk is the truth — never
 *  a refusal; anima itself ships no AGENT.md, only the skill). */
export declare function skillLinesForFamilies(repo: string, fams: readonly string[]): Array<Record<string, unknown>>;
export declare function flowLeafDocs(repo: string, flowName: string): Array<{
    path: string;
    text: string;
}>;
/** Resolve one skill ref (a card:/model:/flow: sid) to its tier-1
 *  line through the planes registry (the melite_skill_index truth).
 *  Dangling refs line null — visible drift, never a refusal. */
/** @param modelsSeat the context's models service when mounted (the
 *  same seat-threading law the runs doors ride) */
export declare function skillLineForRef(repo: string, ref: string, modelsSeat?: FamilyModelsSeat | null, flowsSeat?: FlowsSeat | null): Record<string, unknown>;
/** The lane's models seat as the CARD arm reads it: the four
 *  disclosure methods (family rows, path/file presence, catalog
 *  artifacts). ModelsService satisfies it structurally; ctx.get
 *  returns the same service, so the card arm discloses from the
 *  lane that serves the run (the lane-seat law). */
export type CardModelsSeat = Pick<ModelsService, "allDecls" | "checkModelPresent" | "checkModelPathPresent" | "resolveCatalogArtifact">;
/** Melite load for a CARD: agents md + tool-call signature +
 *  tier-1 skill lines (the card's own AND every boarded family's
 *  model skills — ONE load hands the agent the whole craft: loading
 *  image-gen serves model:anima:prompt-enhance beside the card
 *  lines, so the prompt guide is read before compose, never hunted
 *  after) + model hints (the boarded families' DECL identity —
 *  presence-marked, never a run-time surprise; LLM-powered enhance
 *  stays the user's ✦ door, never served here). Throws LOUD
 *  on unknown ids (the door maps to 404). */
export declare function loadCard(repo: string, cards: CardRegistryService, modelsSeat: CardModelsSeat | null | undefined, cardId: string): Record<string, unknown>;
/** Melite load for a FLOW: the leaf agents md + the registry
 *  signature (the tool overlay verbatim — ONE spelling, the same
 *  object validate/start enforce; null when the row declares
 *  none) + slim stages + the author's skill refs (verbatim) with
 *  their tier-1 lines. Throws LOUD on unknown flows. */
/** @param modelsSeat the context's models service when mounted — the
 *  flow's skill lines resolve through the seat the runs doors
 *  thread (the lane-seat law); the booted singleton otherwise */
export declare function loadFlow(repo: string, flowName: string, modelsSeat?: FamilyModelsSeat | null, flowsSeat?: FlowsSeat | null): Record<string, unknown>;
/** First-non-blank query value (the catalogs qFirst shape). */
//# sourceMappingURL=loadPlane.d.ts.map