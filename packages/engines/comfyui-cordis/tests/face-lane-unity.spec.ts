// face-lane-unity.spec.ts — THE RENDERED FACE/LANE UNITY WALL.
//
// HISTORY (the operator's hatch burn, 2026-10-21): this wall judged
// the FROZEN DICT (the schema carrier's keys) against each boarding
// family's declared surface and carried REGISTERED_DIVERGENCES — a
// skip table whose rows the assertion ignored. Typing a row
// converted a red to green; the voice_name brick was silenced that
// way and reported green. The register is DEAD (this file, 2026-10-
// 21): no skip table, no pin, no exception rows. The operator's
// words: "How is red, when all tests are green?"
//
// THE LAW (renderer-true, the ghost-name lesson): the face a family
// renders is fieldsOfEnvelope(schema, family) filtered by the lane
// surface the active variant resolves — never the raw dict (the
// dict carries hidden legacy seats by contract). A knob is
// DIVERGENT when the RENDERED face shows it on a lane whose DECL
// (family params, or the resolving variant's/cell's params) does
// not declare it — the UI is offering a slot the model does not
// have, and every write to it is a refused run waiting to happen.
//
// No register: every divergence is RED until the DECL declares the
// knob or the face stops rendering it on that lane.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "../src/cardDefs.ts";
import { cascadeInit, getModel } from "../src/models/models.ts";
import {
  fieldsOfEnvelope,
  activeRowId,
  fieldOnLane,
  fieldVisible,
} from "../../../../packages/web/card-base/src/spec.ts";
import type { FormSpecDoc, SpecValues, SpecField } from "../../../../packages/web/card-base/src/spec.ts";
import { laneContractOf } from "@melite/contracts/laneRelations";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";

await cascadeInit();

process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

interface VariantDecl {
  id: string;
  params?: string[];
  cells?: Array<{ quant?: string; params?: string[] }>;
}

interface FamilyDecl {
  params?: string[];
  variants?: VariantDecl[];
}

const CARD_DEFS = await loadCardDefs();

describe("THE FACE-LANE UNITY WALL (the rendered face equals the declared backend)", () => {
  for (const [cardId, def] of CARD_DEFS) {
    it(`card '${cardId}' renders only knobs its lanes declare`, async () => {
      const doc = (await formSpecArm(cardId)) as FormSpecDoc | null;
      if (doc === null || doc.schema === undefined) return;
      const divergent: string[] = [];
      for (const fam of def.boarded) {
        let decl: FamilyDecl;
        try {
          decl = getModel(fam) as FamilyDecl;
        } catch {
          continue; // a retired address contributes nothing (the loadPlane stand-down)
        }
        if (!Array.isArray(decl.params)) continue; // the undeclared-surface class rides its own census wall
        // the lane this family's face resolves: the Variant axis'
        // model-aware seed (activeRowId over the family id)
        const variantId = activeRowId(doc, { model: fam }, "Variant", {});
        const variant = decl.variants?.find((v) => v.id === variantId) ?? decl.variants?.[0];
        const surface = new Set<string>(decl.params);
        for (const p of variant?.params ?? []) surface.add(p);
        // THE CELL AXIS: the resolving cell's params join the surface
        for (const c of variant?.cells ?? []) for (const p of c.params ?? []) surface.add(p);
        // THE RENDERED-SET LAW (operator 2026-10-22 — correct by
        // design, never a fallback): the judged set is the face a
        // family can SHOW — the envelope filtered by the SAME two
        // gates the face rides. (1) fieldVisible, the one
        // visible_when grammar (spec.ts:675, form.tsx's own
        // interpreter): a knob whose guards hide it on this family
        // is one no gesture on this face can state. (2) fieldOnLane
        // against THIS family's lane contract — the served doc
        // carries the CARD-DEFAULT family's lanes (the music card
        // serves music3's base for its yue2 iteration too), so the
        // wall re-resolves the contract per family with the same
        // pure laneContractOf the serve itself rides (discovery.ts:
        // sharedLaneContractOf) — the exact projection a model pick
        // re-serves. No cross-lane mirrors, no skip tables; the
        // DECL surface below stays the judge.
        const laneState: SpecValues = variantId === undefined
          ? { model: fam }
          : { model: fam, variant: variantId };
        const familyDoc: FormSpecDoc = { ...doc, lanes: laneContractOf(decl as never) };
        // the RENDERED face on this family: the envelope's
        // families-bag filter is the family gate, visible_when is
        // the state gate, the lane contract is the surface gate —
        // all three gates the face itself rides
        for (const f of fieldsOfEnvelope(doc.schema, fam) as SpecField[]) {
          if (!fieldVisible(f, laneState)) continue;
          if (!fieldOnLane(familyDoc, f.name, laneState)) continue;
          if (!surface.has(f.name)) {
            divergent.push(`${fam} renders '${f.name}' — the lane declares no such knob`);
          }
        }
      }
      assert.deepEqual(
        divergent,
        [],
        `THE UI IS RENDERING SLOTS THE MODELS DO NOT HAVE (card '${cardId}'):\n` +
        divergent.join("\n"),
      );
    });
  }
});
