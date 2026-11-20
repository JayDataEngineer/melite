// queue-sidecar-receipt-arms.spec.ts — the graph receipt's own
// uncovered arms (the 2026-11-20 conformance sweep's ratchet cure):
// the stems-loader bake record (§7 item 2's loader half), the
// resolved roster (promgen B4 — selector coordinates never drop),
// and the bake-rides-the-fold seam. These arms rode only
// cross-package incidental coverage before; the ratchet's
// shrink-only law now owns them here, at the real door —
// graphReceiptOf/graphReceiptFoldOf over real workflow envelopes,
// never a frozen literal of their output.
import { describe, it, expect } from "vitest";
import { graphReceiptOf, graphReceiptFoldOf } from "../src/queueSidecar.ts";
import type { GraphReceiptStageRow } from "../src/queueSidecar.ts";

describe("the stems-loader bake record (study §7 item 2, the loader half)", () => {
  it("counts the mod_N slots that are not (none) — the pack count, off the graph's own node", () => {
    const receipt = graphReceiptOf(
      {},
      {
        workflow: {
          "1": { class_type: "MiniMaxH3RefModsLoader", inputs: { mod_0: "krea2_raw_int8_convrot.safetensors", mod_1: "(none)", mod_2: "second.safetensors" } },
          "2": { class_type: "SamplerCustomAdvanced", inputs: { seed: 7 } },
        },
      },
    );
    // The record reads the graph, never the doc: two loaded packs,
    // one film window, the stems price string.
    expect(receipt.bake).toMatchObject({ source: "stems", stems: 2, windows: 1 });
    expect(receipt.bake?.price).toBe("bake: 2 stems × 1 window");
  });

  it("renders the singular grammar when exactly one stem and one window ride", () => {
    const receipt = graphReceiptOf(
      {},
      { workflow: { "1": { class_type: "MiniMaxH3RefModsLoader", inputs: { mod_0: "only.safetensors" } }, "2": { class_type: "SamplerCustomAdvanced", inputs: {} } } },
    );
    expect(receipt.bake?.price).toBe("bake: 1 stem × 1 window");
  });
});

describe("the resolved roster (promgen B4, 2026-11-17)", () => {
  it("names the selector coordinates the door consumed — they never read as dropped knobs", () => {
    const receipt = graphReceiptOf(
      // The run body stated variant/quant; the workflow below
      // marries neither literally (the variant door folded them
      // into the loader's weight filename server-side).
      { variant: "raw", quant: "int8", steps: 30 },
      { workflow: { "1": { class_type: "KSampler", inputs: { steps: 30 } } } },
    );
    // The roster reads sorted (every judged roster sorts).
    expect(receipt.resolved).toEqual(["quant", "variant"]);
    expect(receipt.dropped).toEqual([]);
    expect(receipt.verdict).toBe("complete");
  });

  it("absent when no selector rode — the roster is not an always-present key", () => {
    const receipt = graphReceiptOf(
      { steps: 30 },
      { workflow: { "1": { class_type: "KSampler", inputs: { steps: 30 } } } },
    );
    expect(receipt.resolved).toBeUndefined();
  });
});

describe("the bake rides the fold (the first seat that carries one)", () => {
  const plainRow: GraphReceiptStageRow = {
    stage: "qwen3-tts",
    nodes: 1,
    populated: ["voice"],
    carried: ["voice"],
    dropped: [],
    verdict: "complete",
  };
  const bakedRow: GraphReceiptStageRow = {
    stage: "h3",
    nodes: 2,
    populated: [],
    carried: [],
    dropped: [],
    verdict: "complete",
    bake: { source: "stems", stems: 1, windows: 1, price: "bake: 1 stem × 1 window" },
  };

  it("carries the first bake-carrying stage's record to the flow-level receipt", () => {
    const fold = graphReceiptFoldOf([plainRow, bakedRow]);
    expect(fold.bake).toEqual(bakedRow.bake);
  });

  it("no bake key when no stage composed a seat", () => {
    const fold = graphReceiptFoldOf([plainRow]);
    expect(fold.bake).toBeUndefined();
  });

  it("the prompt id rides only when stated (minted engine-side, absent at queue time)", () => {
    expect(graphReceiptFoldOf([plainRow]).prompt_id).toBeUndefined();
    expect(graphReceiptFoldOf([plainRow], "").prompt_id).toBeUndefined();
    expect(graphReceiptFoldOf([plainRow], "p-1").prompt_id).toBe("p-1");
  });
});
