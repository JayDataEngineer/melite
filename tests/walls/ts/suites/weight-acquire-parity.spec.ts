// weight-acquire-parity.spec.ts — THE WEIGHT-OFFER PARITY WALL,
// estate + DECL planes (operator 2026-10-22: "IF THE GATE EXISTED,
// THE TESTING PIPELINE WOULD NOT PASS, THERE WOULD BE RED" — the
// burn: the run failed on 'Qwen3-TTS-12Hz-1.7B-Base-merged', the face
// offered Download, the door refused item-not-found — the file is a
// HAND-PLACED tree (no upstream repo exists for an operator merge),
// and every tier between the DECL and the button was green while the
// button lied).
//
// JOURNEY MAP (§2), the burn's hops and where each arm rides:
//   [1] UI seat      ← THE FIRING ARM lives here, rendered-true:
//                       packages/web/melite-card-view/tests/
//                       run-rescue-hand-only.spec.tsx (dom project,
//                       CI-gating) — the REAL face with the REAL
//                       parsed rescue: a fetch-less wire row renders
//                       NO Download press. Toggle: the fetchable gate
//                       in run-rescue.tsx.
//   [4] compose door ← Arm A: the estate's lane-presence refusal
//                       carries no fetch anchor for a hand-only tree
//                       (real qwen3-tts DECL, real builder).
//   [1]←[4] wire     ← Arm B: the parse keeps the estate's
//                       provenance (fetchable:false from a fetch-less
//                       row/sentence) — the seam the cure rides.
//   DECL plane       ← Arm D: the provenance census — every weight
//                       tree named by any booted family is
//                       classified (fetchable-single /
//                       fetchable-snapshot / hand-only); the
//                       item-not-found class (an unclassified weight)
//                       cannot merge.
//
// The provenance law: every weight tree a DECL names is classified by
// the DECL itself — a `provisions` row (fetchable-single), a
// `snapshot_provisions` row (fetchable-snapshot), or neither
// (hand-only). The estate emits fetch_url ONLY for a provisions-
// backed weight; the client face offers Download ONLY for an
// all-fetchable rescue. A GATE PREVENTS THE ERROR.
//
// Toggle proof (2026-10-22): gate out run-rescue.tsx's offer law →
// the dom firing arm reds: expected 'Missing model file
// "Qwen3-TTS-12Hz-1.7B-Base-merged" …' to match /hand-placed|place
// the file/i — the burn's sentence verbatim. Receipt:
// dev_docs/contracts/receipts/2026-10-22-weight-offer-parity.md
//
// Run: npx vitest run tests/walls/ts/suites/weight-acquire-parity.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { getModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { lanePresenceMiss } from "../../../../packages/harness/estate-queue/src/cardsLanes.ts";
import { parseRescue } from "../../../../packages/web/melite-card-view/src/client/run-rescue-core.ts";
import type { ModelDecl } from "../../../../packages/engines/comfyui-card-kit/src/model-contract.ts";

/** The hand-only set of one family, derived from the DECL's own rows
 *  (never hand-maintained): hand_placed_weights minus every name a
 *  provisions or snapshot_provisions row covers. */
function handOnlyWeights(decl: ModelDecl): string[] {
  const fetchable = new Set<string>([
    ...(decl.provisions ?? []).map((p) => p.name),
    ...(decl.snapshot_provisions ?? []).map((p) => p.name),
  ]);
  return (decl.hand_placed_weights ?? []).map((w) => w.name).filter((name) => !fetchable.has(name));
}

describe("THE WEIGHT-OFFER PARITY WALL — a Download button may exist only where a fetch exists", () => {
  it("Arm A — the lane presence refusal carries no fetch anchor for a hand-only tree (real qwen3-tts DECL)", () => {
    const decl = getModel("qwen3-tts");
    assert.ok(decl, "the qwen3-tts DECL is booted — the wall has no subject without it");
    const handOnly = handOnlyWeights(decl as ModelDecl);
    assert.ok(
      handOnly.includes("Qwen3-TTS-12Hz-1.7B-Base-merged"),
      "the burned tree must classify hand-only (provisions/snapshot rows cover it) — got: " +
        JSON.stringify(handOnly),
    );
    const miss = lanePresenceMiss("qwen3-tts", {
      model: "base",
      variant: "customvoice",
      quant: "1_7b",
    });
    if (miss === null) {
      // the bytes are on THIS machine's store — the sentence cannot
      // fire here; the classification above already pinned the law.
      return;
    }
    const sentence = miss.message;
    assert.ok(
      sentence.includes("Qwen3-TTS-12Hz-1.7B-Base-merged"),
      "the refusal names the missing tree — got: " + sentence,
    );
    assert.ok(
      !/fetch it:/.test(sentence),
      "a hand-only tree's refusal offers NO fetch (the estate may never voice a fetch that does not exist) — got: " +
        sentence,
    );
  });

  it("Arm B — the parse keeps the estate's provenance: a hand-only sentence parses fetchable:false", () => {
    // the prose lane anchor judges FILE-shaped weights (the merged
    // TREE rides the structured row path — the dom firing arm's
    // fixture); the anchor's own fetch suffix is the verdict either way
    const handSentence =
      "lane presence: family 'qwen3-tts' declares model_path 'Qwen3-TTS-12Hz-0.6B-CustomVoice-merged.safetensors' " +
      "but no store copy exists (folders checked: audio/qwen3-tts/hf)";
    const rescue = parseRescue(handSentence);
    assert.ok(rescue, "the hand-only sentence parses to a model rescue");
    assert.equal(rescue.kind, "model");
    const fetched = rescue as { fetchable?: boolean };
    assert.equal(
      fetched.fetchable,
      false,
      "the parse may never lose the estate's honesty: no fetch anchor in the sentence ⇒ fetchable:false " +
        "(the burn: the popup offered Download for a tree with no upstream repo)",
    );
    const fetchSentence =
      "lane presence: family 'qwen3-tts' declares model_path 'Qwen3-TTS-12Hz-0.6B-Base.safetensors' " +
      "but no store copy exists (folders checked: audio/qwen3-tts/hf) — fetch it: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base";
    const fetchedRescue = parseRescue(fetchSentence);
    assert.ok(fetchedRescue, "the fetch sentence parses");
    const fetchedFace = fetchedRescue as { fetchable?: boolean };
    assert.notEqual(
      fetchedFace.fetchable,
      false,
      "a provisions-backed miss stays offerable (the law gates hand-only, never the fetchable class)",
    );
  });

  it("Arm D — THE PROVENANCE CENSUS: every named weight tree is classified across every booted family", () => {
    const unclassified: string[] = [];
    const handOffered: string[] = [];
    for (const id of modelIds()) {
      const decl = getModel(id) as ModelDecl | null;
      if (decl === null || decl === undefined) continue;
      const fetchable = new Set<string>([
        ...(decl.provisions ?? []).map((p) => p.name),
        ...(decl.snapshot_provisions ?? []).map((p) => p.name),
      ]);
      const hand = new Set(decl.hand_placed_weights ?? []);
      // every lane's model_path leaf must land in a class
      const lanes = (decl as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {};
      for (const [lane, inputs] of Object.entries(lanes)) {
        const row = inputs as { model_path?: string };
        const leaf = row.model_path?.split("/").pop();
        if (leaf === undefined || leaf === "") continue;
        if (!fetchable.has(leaf) && !hand.has(leaf) && ![...fetchable, ...hand].some((n) => leaf.startsWith(n))) {
          unclassified.push(id + "/" + lane + " names '" + leaf + "'");
        }
      }
      // a hand-only tree must carry NO fetch row that names it (a
      // provisions row for an operator merge would be a lie)
      for (const w of handOnlyWeights(decl)) {
        if ((decl.provisions ?? []).some((p) => p.name === w)) {
          handOffered.push(id + " carries a fetch row for hand-only '" + w + "'");
        }
      }
    }
    assert.deepEqual(
      unclassified,
      [],
      "UNCLASSIFIED WEIGHTS — the item-not-found class: a tree the lanes load that no provision row and no hand placement declares (the operator is told to download a thing no fetch can fetch):\n" +
        unclassified.join("\n"),
    );
    assert.deepEqual(
      handOffered,
      [],
      "HAND-ONLY TREES WITH FETCH ROWS — the DECL voices a fetch for a merge no repo serves:\n" +
        handOffered.join("\n"),
    );
  });
});
