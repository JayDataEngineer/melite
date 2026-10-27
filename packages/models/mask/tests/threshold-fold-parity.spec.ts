// @melite/models-mask — THE THRESHOLD FOLD PARITY WALL (audit 015
// C5, finding F5): every detector family's threshold seat applies
// the SAME tune/default fold. The burn: the SAM2 impact detectors
// folded tune → param → 0.5 while the RT-DETR proposal seat took the
// raw cast with neither — one graph carried two effective thresholds
// (an unstated param read 0.5 on SAM2, undefined on RT-DETR). The
// cure is ONE derivation home in actions.ts (detectorThreshold) that
// both seats reference; these arms ride the REAL composed graph and
// compare the two families' seats — the asymmetric-fold toggle reds
// the default-fold arm by name (the receipt's verbatim red).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { select as maskLane } from "../src/actions.ts";

const FACTS: ModelFacts = {
  id: "mask", family: "mask-select", card: "mask",
  defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [],
};

const maskBase = {
  input_image: "/m/p.png", sam_threshold: 0.93, sam_dilation: 0,
  export_boxes: false, primary_via_rtdetr: false,
};

// ONE GRAPH, BOTH DETECTOR FAMILIES: the RT-DETR proposal rides the
// primary (via_rtdetr) and a sam2 export composes the impact
// detector — the exact shape the burn lived in (two detector
// families spelling their thresholds in one serialized graph).
const bothDetectorGraph = (extra: Record<string, unknown>, runId: string):
  Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder();
  instantiateAction(maskLane, {
    ...maskBase, primary_via_rtdetr: true,
    exports: [["hands", "hand"]],
    export_kind: ["sam2"],
    ...extra,
  }, FACTS, g, runId);
  return g.toJSON() as never;
};

const seatOf = (
  row: Record<string, { class_type: string; inputs: Record<string, unknown> }>,
  classType: string,
): Record<string, unknown> => {
  const seat = Object.values(row).find((n) => n.class_type === classType);
  assert.ok(seat, `${classType} composes (the graph carries both detector families)`);
  return seat!.inputs;
};

describe("THE THRESHOLD FOLD PARITY (audit 015 C5: one fold for every detector seat)", () => {
  it("THE DEFAULT-FOLD ARM: with detection_threshold unstated, BOTH detector seats resolve the same 0.5 fold — never a raw undefined cast", () => {
    const row = bothDetectorGraph({}, "r_fold_default");
    const sam2 = seatOf(row, "BboxDetectorSEGS");
    assert.equal(sam2.threshold, 0.5, "the SAM2 detector's unstated fold is the pack's 0.5 default");
    const rtdetr = seatOf(row, "RTDETR_detect");
    assert.equal(
      rtdetr.threshold, sam2.threshold,
      "the RT-DETR seat resolves the SAME effective threshold as the SAM2 fold — a second fold spelling put two thresholds in one graph (0.5 vs undefined)",
    );
  });

  it("THE STATED-PARAM ARM: a stated detection_threshold reaches BOTH seats verbatim through the one fold", () => {
    const row = bothDetectorGraph({ detection_threshold: 0.35 }, "r_fold_stated");
    const sam2 = seatOf(row, "BboxDetectorSEGS");
    assert.equal(sam2.threshold, 0.35, "the stated param rides the SAM2 fold");
    const rtdetr = seatOf(row, "RTDETR_detect");
    assert.equal(rtdetr.threshold, 0.35, "the stated param rides the RT-DETR fold — a seat ignoring the param splits the families again");
  });

  it("THE TUNE-LEG ARM: a per-entry tune narrows ONLY its own sam2 entry — the RT-DETR seat keeps the lane-flat fold", () => {
    const row = bothDetectorGraph({
      exports: [["hands", "hand", undefined, { detection_threshold: 0.2 }]],
    }, "r_fold_tune");
    const tuned = seatOf(row, "BboxDetectorSEGS");
    assert.equal(tuned.threshold, 0.2, "the export's own tune threads its detector through the fold");
    const rtdetr = seatOf(row, "RTDETR_detect");
    assert.equal(rtdetr.threshold, 0.5, "the tune never leaks across families — the RT-DETR seat keeps the unstated 0.5 fold");
  });
});
