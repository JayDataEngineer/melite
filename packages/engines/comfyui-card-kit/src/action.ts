// action.ts — the ComfyUI instance of the action contract (the atom
// vocabulary's interpreter, stroke-1 pilot). A family declares a
// ComfyActionSpec — the facts door (the resolved lane_inputs merge
// parsed into the closed typed shape; drift refuses loud here, never
// silently routes to a stock lane) plus the segment factory over the
// shared GraphBuilder. The card binds the action and delegates here.
// Byte-stability: the factory composes through the same builder in
// the same creation order (the recipe law), so the serialized prompt
// matches the legacy lane arm wire-for-wire.
import type { ActionSpec } from "@melite/engine-contract/vocabulary";
import type { GraphBuilder, OutputHandle } from "./graph.ts";
import type { LaneInputsFacts, ModelFacts } from "./facts.ts";
import { mintSeed } from "./graph-helpers.ts";

/** The context the interpreter hands a segment factory: the gated
 *  params doc (typed by the action — a same-process typed boundary),
 *  the family's typed engine facts, the resolved model row (the mod
 *  plane rides it), the shared builder, and the run id. */
export interface ComfyActionContext<P, F> {
  readonly p: P;
  readonly facts: F;
  readonly model: ModelFacts;
  readonly g: GraphBuilder;
  readonly runId: string;
}

/** The atom's offer on the ComfyUI engine. `facts` is the family
 *  door: the raw resolved lane_inputs (family ⊕ variant) parsed into
 *  the closed shape the factory reads — an off-set member (an
 *  unknown text_encode_node) refuses at instantiate. */
export interface ComfyActionSpec<P, F> extends ActionSpec<ComfyActionContext<P, F>, OutputHandle> {
  readonly facts: (raw: LaneInputsFacts) => F;
}

/** Instantiate a bound action on the shared builder: parse the
 *  resolved facts through the action's door, execute the declared
 *  managed affairs (the seed-sentinel rule mints through the ONE
 *  minter — GATE S), then run the segment factory.
 *  @param action the family-declared action the card bound
 *  @param p the card's gated params doc (the schema walk validated
 *   types and bounds; the action's P is the typed read of it)
 *  @param model the resolved family row (lane_inputs, mods)
 *  @param g the shared builder the segment composes on
 *  @param runId the run id (the save prefix namespace)
 *  @returns the terminal handle (the save node's output) */
export function instantiateAction<P, F>(
  action: ComfyActionSpec<P, F>,
  p: Record<string, unknown>,
  model: ModelFacts,
  g: GraphBuilder,
  runId: string,
): OutputHandle {
  const facts = action.facts(model.lane_inputs);
  const doc: Record<string, unknown> = { ...p };
  for (const spec of action.params) {
    if (spec.rule === "seed-sentinel") {
      if (spec.name !== "seed") {
        throw new Error(
          `action '${action.id}': the seed-sentinel rule fires on the 'seed' param, not '${spec.name}'`,
        );
      }
      doc.seed = mintSeed(doc);
    }
  }
  return action.build({ p: doc as P, facts, model, g, runId });
}

/** The DECL seam's read shape: any family declaration carrying
 *  actions (the ModelDecl's erasure — structural, so the kit owes
 *  no dependency on the models contract for one type). */
interface DeclaresActions {
  readonly id: string;
  readonly actions?: ReadonlyArray<{
    readonly id: string;
    readonly outputs: ReadonlyArray<{ readonly name: string; readonly kind: string }>;
    readonly params: ReadonlyArray<{ readonly name: string; readonly rule?: string }>;
    readonly facts: (raw: Record<string, unknown>) => unknown;
    readonly build: (...args: never[]) => unknown;
  }>;
}

/** Resolve the action a card binds off the family's own DECL —
 *  the RULE 5 interlock's only door. The card boards the DECL and
 *  names the action id; the hand-imported action list (one import
 *  per family, retyped per card) dies here. The DECL's actions
 *  array is the erased DeclaredAction contract; this helper owns
 *  the ONE cast back to the kit's spec type (the same erasure the
 *  DECL accepts concrete specs through, inverted at a single
 *  seam — registration validated the action's facts door at boot,
 *  so the runtime object is the family's concrete spec).
 *  @param decl the family DECL the card already boards
 *  @param actionId the declared action id the binding targets
 *  @returns the family's declared action, unmodified
 *  @throws when the family declares no action under that id — the
 *   card's binding refused at boarding, never at first compose */
export function declaredAction(decl: DeclaresActions, actionId: string): ComfyActionSpec<Record<string, unknown>, unknown> {
  const found = decl.actions?.find((a) => a.id === actionId);
  if (found === undefined) {
    const owned = decl.actions?.map((a) => a.id).join(", ") ?? "none";
    throw new Error(
      `family '${decl.id}' declares no action '${actionId}' (declared: ${owned}) — the card's binding refused at boarding`,
    );
  }
  return found as ComfyActionSpec<Record<string, unknown>, unknown>;
}
