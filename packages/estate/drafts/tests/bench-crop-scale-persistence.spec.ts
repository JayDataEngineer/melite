// bench-crop-scale-persistence.spec.ts — THE DOC-DEPTH STITCH for the
// input-prep transform keys (image-3d wave-2 cure 1: the studio's only
// patch judge was a mock owner, so a drafts/patch that dropped crop_*/
// scale_* failed nothing above component depth — hop [2] had no judge
// on the transform keys). The wall derives the key set from the REAL
// served card def (the def's own schema dict, card-definition.ts:99),
// patches a real bench stage through the real drafts door with every
// derived key, and judges the SAVED row key-for-key — a merge that
// drops, renames, or rewrites a transform key reds here.
import { test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench } from "../src/bench.ts";
import { boot } from "./bench-helpers.ts";
import "../../../../tests/helpers/boot-models.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";

test("THE TRANSFORM KEYS SURVIVE THE DOOR: every crop_*/scale_* param the served card declares lands in the saved row", async () => {
  // THE DERIVED ROSTER (never a retyped list beside the truth): the
  // input-prep card's transform params as the SERVED schema spells
  // them — a card that gains or renames a transform param is judged
  // here by derivation, not by a hand-bumped pin.
  const def = (await loadCardDefs()).get("input-prep");
  assert.ok(def, "the composition root serves the input-prep card");
  // the callable IS the carrier (card-definition.ts:99): .dict is
  // the raw knob map the served emitter projects from
  const transformKeys = Object.keys(def.schema.dict ?? {}).filter(
    (k) => k.startsWith("crop_") || k.startsWith("scale_"),
  );
  assert.ok(
    transformKeys.includes("crop_x") && transformKeys.includes("scale_height"),
    `the derivation found the transform plane (got: ${transformKeys.join(", ")})`,
  );

  const frame: Record<string, unknown> = {
    source: "upload.png",
    media_type: "image",
    ...Object.fromEntries(transformKeys.map((k) => [k, -1])),
  };
  // one REAL gesture's numbers on the crop half (the studio's atomic
  // commit shape: the -1 sentinels ride the untouched keys)
  frame["crop_x"] = 50;
  frame["crop_y"] = 20;
  frame["crop_width"] = 100;
  frame["crop_height"] = 150;

  const drafts = await boot();
  await ensureBench(drafts, {
    session: "croppersist",
    stages: [{ id: "s_0", card: "input-prep", params: { source: "upload.png" } }],
  });
  await patchBench(drafts, "croppersist", { stage: "s_0", params: frame, expect_rev: 0 });

  const row = (getBench(drafts, "croppersist").stages as Array<{ id: string; params: Record<string, unknown> }>).find(
    (s) => s.id === "s_0",
  )!;
  const dropped = transformKeys.filter((k) => row.params[k] !== frame[k]);
  assert.deepEqual(
    dropped,
    [],
    `the drafts door's saved row dropped or rewrote transform params the studio committed: ${dropped.join(", ")} — hop [2] has no other judge on these keys`,
  );
  assert.equal(row.params["crop_x"], 50, "the committed gesture number survives verbatim");
});
