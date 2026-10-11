// flowsParamsOverlay.ts — the flow params overlay, the one law both
// doors ride (cut out of runsRegistry so the validate door can ride
// it without a runsRegistry cycle; round-21 flows audit F1).
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { owningAtom, theService } from "@melite/comfyui-cordis";
import { cardAdmits } from "./cardsCompose.ts";
import type { CardRegistryService } from "./cardsRegistry.ts";

/**
 * The overlay's mod-fold scoping decision (round-22 compose audit
 * Q3a): which family scopes the absorbed mod surface for a stage's
 * card. The request's model seat wins outright; with no seat, the
 * card's sole boarded family scopes it; a multi-family card with no
 * seat stays unscoped ("" — the union, compose's own selector to
 * refuse). Pure so the walls can pin the routing; the route→atom map
 * itself rides the engine-fiber fold (`owningAtom`, never booted in
 * the test fiber).
 *
 * @param boarded the card decl's boarded families
 * @param fam the request's family seat ("" when none)
 * @returns the scoping family, "" for unscoped
 */
export function overlayAtomFor(boarded: readonly string[], fam: string): string {
  if (fam !== "") return fam;
  return boarded.length === 1 ? boarded[0] : "";
}

/** THE FLOW PARAMS OVERLAY — the one law both doors ride (round-21
 *  flows audit F1): the request's `params` overlays the expansion's
 *  fresh rows. A primitive value targets the single stage whose card
 *  admits the key (zero: unknown-key refusal; several: ambiguous —
 *  the operator names the stage); an object value targets one stage
 *  by id, every key admitted by that stage's card. Admission reads
 *  the SHARED surface (knobs ∪ absorbed mod fields ∪ admits — audit
 *  J-E2), and every refusal is runs/invalid-request BEFORE either
 *  door proceeds: validate answering green while start refused 400
 *  was the F1 divergence. Mutates the rows in place (the expansion's
 *  own containers — flowsData's TEMPLATE DETACH keeps the registry's
 *  rows shared and untouched); the stage list is copied, never the
 *  rows.
 *
 * @param flowName the flow id, named in every refusal
 * @param stages the expansion's stage rows (mutated in place)
 * @param overrideRaw the request body's raw `params` value
 * @param decls the card registry's declared rows (the admission read)
 * @param fam the request's family seat (`body.model`, "" when the
 *   request names none) — scopes the absorbed mod surface to the
 *   owning atom, the same fold compose and variant judge with
 */
export function applyFlowParamsOverride(
  flowName: string,
  stages: ReadonlyArray<unknown>,
  overrideRaw: unknown,
  decls: ReturnType<CardRegistryService["cardDecls"]>,
  fam: string,
): void {
  if (typeof overrideRaw !== "object" || overrideRaw === null || Array.isArray(overrideRaw)) {
    throw new RemoteError(
      "runs/invalid-request",
      "flow params must be an object ({key: value} or {stage_id: {key: value}}), got " +
        JSON.stringify(overrideRaw),
      { loc: "params" },
    );
  }
  const override = overrideRaw as Record<string, unknown>;
  const stageRows: Array<Record<string, unknown>> = [...(stages as Array<Record<string, unknown>>)];
  const paramsOf = (row: Record<string, unknown>): Record<string, unknown> => {
    if (typeof row["params"] !== "object" || row["params"] === null || Array.isArray(row["params"])) {
      row["params"] = {};
    }
    return row["params"] as Record<string, unknown>;
  };
  // THE SHARED ADMISSION SURFACE (audit J-E2): the override door
  // judges with the SAME predicate compose's admission gate judges
  // with — knobs ∪ absorbed mod fields ∪ admits (wildcard rows
  // included), the mod fold scoped to the row's owning atom
  // (OVERLAY-ATOM-FOLD, round-22 compose audit Q3a: an unfiltered
  // fold admitted a family A mod key on a run at family B — the
  // overlay greened what compose refuses, two refusals for one body).
  // The atom resolves from the request's model seat, falling back to
  // the card's sole boarded family; a multi-family card with no seat
  // keeps the union (compose resolves its own selector there, and the
  // door cannot know it — the residual over-admission is compose's
  // own to refuse, at the same 400 class).
  const modNamesOf = (card: string): Set<string> => {
    const names = new Set<string>();
    try {
      // The routing is pure (the walls pin it); the route→atom map
      // rides the booted models service — "" stays unscoped.
      const scoped = overlayAtomFor(decls[card]?.boarded ?? [], fam);
      const envelopeAtom: string = scoped === "" ? "" : owningAtom(scoped);
      for (const a of theService().cardModFields(card)) {
        if (envelopeAtom !== "" && !a.families.includes(envelopeAtom)) continue;
        for (const n of Object.keys(a.fields.dict ?? {})) names.add(n);
      }
    } catch (modFoldError) {
      // modFoldError: card defs not booted in this fiber — the
      // mod surface is empty here; the knobs+admits rows still
      // gate (the door can only over-admit into compose's own
      // refusal, never under-admit what compose takes).
    }
    return names;
  };
  const admitsParam = (row: Record<string, unknown>, key: string): boolean => {
    const card = typeof row["card"] === "string" ? row["card"] : "";
    return cardAdmits(decls[card], modNamesOf(card), key);
  };
  // the refusal message names the SHARED surface (knobs ride it
  // since J-E2 — the admits row alone would understate it)
  const admitOf = (row: Record<string, unknown>): readonly string[] => {
    const card = typeof row["card"] === "string" ? row["card"] : "";
    const decl = decls[card];
    return [
      ...new Set([
        ...(decl?.schemaNames ?? []),
        ...modNamesOf(card),
        ...(decl?.admits ?? []),
      ]),
    ];
  };
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // THE STAGE-TARGETED SHAPE: the key names a stage, the
      // object rides that stage's params verbatim-overlaid.
      const target = stageRows.find((r) => r["id"] === key);
      if (target === undefined) {
        throw new RemoteError(
          "runs/invalid-request",
          "flow params stage " + JSON.stringify(key) +
            " names no stage of flow " + flowName +
            " (stages: " + stageRows.map((r) => JSON.stringify(r["id"])).join(", ") + ")",
          { loc: "params" },
        );
      }
      const admits = admitOf(target);
      for (const [pk, pv] of Object.entries(value as Record<string, unknown>)) {
        if (!admitsParam(target, pk)) {
          throw new RemoteError(
            "runs/invalid-request",
            "card " + JSON.stringify(target["card"]) +
              " does not admit param " + JSON.stringify(pk) +
            " (admitted: " + JSON.stringify(admits) + ")",
            { loc: "params" },
          );
        }
        paramsOf(target)[pk] = pv;
      }
      continue;
    }
    // THE FLAT SHAPE: exactly one admitting stage, or refuse.
    const targets = stageRows.filter((r) => admitsParam(r, key));
    if (targets.length === 0) {
      throw new RemoteError(
        "runs/invalid-request",
        "no stage of flow " + flowName + " admits param " + JSON.stringify(key) +
          " — a flat params value needs exactly one admitting stage; " +
          "target a stage with {stage_id: {" + key + ": …}} or drop the key",
        { loc: "params" },
      );
    }
    if (targets.length > 1) {
      throw new RemoteError(
        "runs/invalid-request",
        "param " + JSON.stringify(key) + " is admitted by " + targets.length +
          " stages of flow " + flowName + " (" +
          targets.map((r) => JSON.stringify(r["id"])).join(", ") +
          ") — ambiguous; target one stage with {stage_id: {" + key + ": …}}",
        { loc: "params" },
      );
    }
    const row = targets[0] as Record<string, unknown>;
    paramsOf(row)[key] = value;
  }
}
