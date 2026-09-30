// cardsCompose.ts — the registry's compose core (extracted from
// cardsRegistry.ts, the god-file cut): param preparation (steps
// 2-6) and the in-process compose (steps 7-9). Explicit seat
// deps; no Service state beyond the accessors the seat passes.
import { ComfyUIService, resolveEngineBaseUrl, composeCards, ComposeRefusal, checkModelPresent, owningAtom } from "@melite/comfyui-cordis";
import { EngineContext, composeModPlane, loadFacts, theService } from "@melite/comfyui-cordis";
import type { FactsReads } from "@melite/comfyui-cordis";
import type { PreparedCard } from "./cardsRegistry.ts";
import { CardArmError, phaseRefusal } from "./cardsArmError.ts";
import { findCardDangling } from "./cardsDangling.ts";
import { selectCardVariant, stampCardOverlay, liftCardParams, type VariantSelection } from "./cardsVariant.ts";
import { factsPath, type CardDeclRow, type ModelFactsRow } from "./cardsFacts.ts";
import { FLOW_ID_RE } from "./runsGates.ts";

// The seat accessors the compose core needs — the CardRegistry
// passes itself; nothing else may.
export interface ComposeSeat {
  cardDecls(facts?: Record<string, ModelFactsRow>): Record<string, CardDeclRow>;
  modelFacts(): Record<string, import("./cardsFacts.ts").ModelFactsRow>;
  modelMids(): Set<string>;
  objectInfo(): Record<string, unknown> | null;
  primeObjectInfo(): Promise<boolean>;
  readsSync(): FactsReads;
  resolveCardFamily(mid: string, facts?: Record<string, import("./cardsFacts.ts").ModelFactsRow>): string;
}


  /** In-process compose (the core: steps 7-9) — per-call throwaway
   *  Context + ComfyUIService (owned by the call, never shared). */
/** THE NESTED STANZA UNWRAP (cli.ts:82-91, one function two seats):
 *  a `params` dict key in the incoming params IS the stanza;
 *  siblings merge over it. Exported so the phase-1 admission seat
 *  gates the LIFTED body, never the raw stanza shell. */
export function liftStanza(params: Record<string, unknown>): Record<string, unknown> {
  const inner: unknown = params["params"];
  if (typeof inner === "object" && inner !== null && !Array.isArray(inner)) {
    return {
      ...(inner as Record<string, unknown>),
      ...Object.fromEntries(Object.entries(params).filter(([k]) => k !== "params")),
    };
  }
  return params;
}

export async function composeOnce(
    deps: ComposeSeat,
    card: string,
    fam: string,
    params: Record<string, unknown>,
    runId: string,
    phase: string,
  ): Promise<Record<string, unknown>> {
    // R3 (live): the engine's own node set arms the gate — an
    // unreachable engine refuses CLOSED, never composes blind.
    if (!(await deps.primeObjectInfo())) {
      throw phaseRefusal(
        phase,
        "comfyui engine unreachable for live object_info (" +
          resolveEngineBaseUrl() +
          ") — refusing closed (EXTENSION LAW: never compose unauthenticated)",
      );
    }
    const oi: Record<string, unknown> | null = deps.objectInfo();
    if (oi === null) {
      throw phaseRefusal(
        phase,
        "comfyui live object_info primed empty — refusing closed (EXTENSION LAW: never compose unauthenticated)",
      );
    }
    const ctx = new EngineContext();
    await ctx.plugin({
      apply(c: EngineContext): void {
        new ComfyUIService(c);
      },
    });
    // THE CARD PACKAGES (the card sweep, 2026-09-09): the compose
    // boot rides the SAME composition table as loadCardDefs —
    // composeCards (exported from @melite/comfyui; the engine
    // src/cards readdir glob died with the sweep). A card lands by
    // adding its package + one table row; no shared-file edit.
    await composeCards(ctx);
    // THE MOD PLANE (2026-09-10 — the flavorless compose): this fresh
    // service composed cards ONLY, so flavor rows were absent and
    // every mod id refused at compose. Same composeModPlane as
    // loadCardDefs — one composition, two riders.
    await composeModPlane(ctx);
    ctx.comfyui.setFacts(loadFacts(factsPath(), deps.readsSync()));
    ctx.comfyui.setObjectInfo(oi);
    // THE ARM-WEIGHT READER (the silent-truncation law, 2026-10-09):
    // the compose door checks the run's touched provision rows
    // against the models tree BEFORE composing — the module-level
    // presence read (runtime tree + the endpoint mount leg, the
    // manage door's own spelling). An absent weight refuses loud
    // with its fetch URL, never a silent downstream death.
    ctx.comfyui.setWeightPresent((relativePath, name) => checkModelPresent(relativePath, name) !== null);
    // THE NESTED STANZA UNWRAP (cli.ts:82-91): a `params` dict key in
    // the incoming params IS the stanza; siblings merge over it.
    const lifted: Record<string, unknown> = liftStanza(params);
    // THE ADMISSION CONTRACT GATE (cli.ts admission verbatim voice):
    // every param key must be a declared knob or ride the admits row.
    // (THE REFUSAL-ORDER LAW, 2026-09-21: admission is a BODY-SHAPE
    // question — phase1Card runs this gate BEFORE the lane-presence
    // ENVIRONMENT gate, so the voice is box-independent; composeOnce
    // re-runs the same function, never a divergent copy.)
    admissionRefusal(deps, card, fam, lifted, phase)
    try {
      return ctx.comfyui.compose(card, fam, lifted, runId) as Record<string, unknown>
    } catch (e) {
      if (e instanceof ComposeRefusal) {
        throw phaseRefusal(phase, e.code + ": " + e.message)
      }
      throw phaseRefusal(
        phase,
        e instanceof Error
          ? e.message
          : /* v8 ignore next -- compose throws Errors: the String
               fallback never fires (2026-09-12) */ String(e),
      )
    }

  }

/** THE ADMISSION CONTRACT GATE (one function, two seats — the
 *  phase-1 pre-compose seat and composeOnce's own re-run). Every
 *  param key must be a declared knob or ride the admits row; the
 *  absorbed mod surface counts (the interlock, 2026-09-08). */
export function admissionRefusal(
    deps: ComposeSeat,
    card: string,
    fam: string,
    lifted: Record<string, unknown>,
    phase: string,
  ): void {
    const decls: Record<string, CardDeclRow> = deps.cardDecls()
    // (prepareCardParams guarantees a registered card — its
    // unknown-card arm refuses first — so the lookup never misses.)
    const decl: CardDeclRow = decls[card] as CardDeclRow
    const knobs: Set<string> = new Set(decl.schemaNames)
    const admits: readonly string[] = decl.admits
    // THE ABSORBED MOD SURFACE (the interlock, 2026-09-08):
    // admission is the declared surface — and the mod fields a
    // family ABSORBS are part of that surface (registerMod through
    // the service; scope = declaring ∩ boarded, filtered to THIS
    // run's family exactly as the emission scopes).
    let modNames: Set<string> = new Set()
    // THE PACK-NAME HINTS (023's self-critique #2, 2026-09-24): an
    // unknown key that NAMES a mod pack gets a pointed refusal
    // naming the flat fields (the maker burned a refusal-oracle
    // turn on `qvoice_save` — the pack rides fields, never its own
    // key). Pack → its family-scoped field names, same fold.
    const packFields = new Map<string, string[]>()
    /* v8 ignore start -- theService() boots in the engine fiber, never
       the test fiber (always throws here): the mod surface stays empty
       in tests; knobs+admits still gate (2026-09-12) */
    try {
      // THE ROUTE→ATOM FOLD (qvoice across ALL qwen3-tts, operator
      // 2026-09-23 — the same fold the spec door rides, discovery.ts
      // specBody): flavors register for the FAMILY ATOM; a run at a
      // VARIANT ROUTE address (qwen3-tts-base) asks with its owning
      // atom or the absorbed surface drops and every mod param
      // refuses as unknown (verified live by the maker: voice_name
      // refused at the base route pre-fold). Atoms pass through
      // unchanged (owningAtom: routes.get(id)?.modelId ?? id).
      const envelopeAtom: string = owningAtom(fam)
      for (const a of theService().cardModFields(card)) {
        if (!a.families.includes(envelopeAtom)) continue
        const names = Object.keys(a.fields.dict ?? {})
        for (const n of names) modNames.add(n)
        if (!packFields.has(a.pack)) packFields.set(a.pack, names)
      }
      /* v8 ignore stop */
    } catch {
      // card defs not booted in this fiber — the mod surface is
      // empty here; the knobs+admits rows still gate.
    }
    const admitted = (key: string): boolean =>
      knobs.has(key) ||
      modNames.has(key) ||
      admits.some((a) => a === key || (a.endsWith("*") && key.startsWith(a.slice(0, -1))))
    const unknown: string[] = Object.keys(lifted).filter((k) => !admitted(k)).sort()
    if (unknown.length > 0) {
      const hints = unknown
        .filter((k) => packFields.has(k))
        .map((k) => " '" + k + "' is the '" + k + "' mod pack — it takes no key of its own; its fields ride flat top-level: " + packFields.get(k)!.join(", "))
      throw phaseRefusal(
        phase,
        "compose-door: unknown param(s) on the " + card + " card: " + unknown.join(", ") +
          " (admission is the declared surface — knobs + contract admits; see the card's TS definition)" +
          (hints.length > 0 ? " Mod-pack keys:" + hints.join(";") : ""),
      )
    }
  }

/** Resolve + sweep + select + overlay + lift (steps 2-6):
   *  everything before compose. Throws CardArmError (the door maps
   *  it to the refusal envelope). `phase` stamps the phase-N voice
   *  on R1 selection refusals ("1" for validate/phase-1). Order
   *  mirrors resolve_card_model + the validate modelArm: artifact
   *  sweep FIRST (fail fast — a sloppy compose never runs), then
   *  legality, existence, the non-cordis arm check, selection,
   *  overlay, lift.
   *
   * @param factsArg a caller-resolved facts table. The validate
   *  door passes its degraded read (it answers from the catalog
   *  alone when the facts file is absent); omitted by every other
   *  seat, which takes the strict read here (`deps.modelFacts()`).
   */
export function prepareCardParams(
    deps: ComposeSeat,
    body: Record<string, unknown>,
    mid: string,
    phase: string,
    factsArg?: Record<string, ModelFactsRow>,
  ): PreparedCard {
    const facts: Record<string, ModelFactsRow> = factsArg ?? deps.modelFacts();
    const dangling = findCardDangling(body);
    if (dangling !== null) {
      const [location, ref, why] = dangling;
      throw new CardArmError(
        400,
        "dangling artifact ref at " + JSON.stringify(location) + ": " + ref + " (" + why + ")",
        "invalid_request",
      );
    }
    if (!FLOW_ID_RE.test(mid)) {
      throw new CardArmError(
        400,
        "model id " + JSON.stringify(mid) + " is not a legal identifier",
        "invalid_request",
      );
    }
    const resolves: boolean =
      mid in facts || deps.resolveCardFamily(mid, facts) in facts || deps.modelMids().has(mid);
    if (!resolves) {
      // THE CARD-UNIT COMPOSE (2026-10-08 second pass — the
      // Run-press law, the operator's wall): the bench's Run press
      // addresses a family-less card by its OWN id — runCardStage's
      // documented fallback, defaultFamilyForCard returning the
      // card id when no family stands behind the card. The {model:}
      // door therefore COMPOSES the card the press names (the GUI's
      // shape is the contract), params verbatim: no family row, so
      // no variant selection and no model-defaults overlay — the
      // card's own declaration owns every default. The refusal
      // below stays for ids that are neither family nor card.
      const decls: Record<string, CardDeclRow> = deps.cardDecls(facts);
      if (Object.prototype.hasOwnProperty.call(decls, mid)) {
        const decl: CardDeclRow = decls[mid] as CardDeclRow;
        return {
          mid,
          // fam '' IS the model-less marker: the engine's compose
          // lanes family-less cards on requiresModel===false +
          // modelId==='' (service.ts:617) — a card id here would
          // hit the not-boarded gate instead.
          fam: "",
          card: mid,
          // the familyless compose lanes on modelId==='' (the
          // engine's requiresModel===false arm) — the field the
          // li-ak fix added to every OTHER constructor.
          modelId: "",
          skeleton: decl.skeleton !== "" ? decl.skeleton : mid,
          decl,
          params: liftCardParams(body),
          familyless: true,
        };
      }
      throw new CardArmError(
        400,
        "no model unit for model: " + mid +
          " (no .catalog.models row " + mid + " in the frozen discovery catalog and no family declares route " + mid +
          " in its variants' cells — checked the class tree's _routes map)",
        "invalid_request",
      );
    }
    const fam: string = deps.resolveCardFamily(mid, facts);
    const famRow: ModelFactsRow | undefined = facts[fam];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (famRow === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": model " + JSON.stringify(mid) +
          " composes outside the cordis plane (no family row — the model resolves but the facts file declares nothing for it)",
        "card_compose",
      );
    }
    const decls: Record<string, CardDeclRow> = deps.cardDecls(facts);
    const decl: CardDeclRow | undefined = decls[famRow.card];
    /* v8 ignore next -- the frozen catalog covers every facts family+card today (probe 2026-09-12): the skew fence never fires */
    if (decl === undefined) {
      throw new CardArmError(
        400,
        "card_compose phase " + phase + ": unknown card " + JSON.stringify(famRow.card) +
          " (no registered card definition for the card model " + JSON.stringify(mid) + " names)",
        "card_compose",
      );
    }
    const sel: VariantSelection = selectCardVariant(mid, famRow, body, phase);
    const stamped: Record<string, unknown> = stampCardOverlay(body, famRow, decl, sel, phase);
    return {
      mid,
      fam,
      // THE RESOLVED ADDRESS (the BROKEN-C fix): the variant's own
      // re-point when it declares one, else the address the caller
      // named. The engine resolves ITS facts row from this, so a base
      // route composes the CLONE lane rather than the head's — the
      // difference between a lawful bench state that runs and one
      // that refuses at the door.
      modelId: sel.variantRoute !== "" ? sel.variantRoute : mid,
      card: famRow.card,
      skeleton: decl.skeleton !== "" ? decl.skeleton : /* v8 ignore next -- every real decl carries a skeleton (probe 2026-09-12) */ mid,
      decl,
      params: liftCardParams(stamped),
    };
  }
