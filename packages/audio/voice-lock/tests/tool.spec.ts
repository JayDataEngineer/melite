// tool.spec.ts — the voice-lock tool face pins (the image-gen pattern).
// The executor's gateway doors are the LIVE system's (smoke covers
// them); these pin the tool's OWN laws: the name, the presentation
// projection, and the completed-card intent.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { buildVoiceLockTool, TOOL_NAME } from "../src/tool.ts";

const REFUSING_CALL = async (): Promise<never> => { throw new Error("face tests never call the seam") }

const tool = buildVoiceLockTool(REFUSING_CALL);

describe("the voice-lock tool face", () => {
  it("names itself on the tool plane (plain id, no _card suffix)", () => {
    assert.equal(TOOL_NAME, "voice_lock");
    assert.equal(tool.name, "voice_lock");
  });

  it("carries the identity prose (the ring's spelling)", () => {
    assert.ok(typeof tool.description === "string" && tool.description.length > 10);
  });

  it("presentationMeta projects the run arm, empty keys omitted", () => {
    const out = tool.output.presentationMeta?.(undefined, {
      flow: "voice-lock", model: "qwen3-tts-voicedesign", run_id: "r1", draft_id: "d1", status: "queued",
    });
    assert.deepEqual(out, {
      flow: "voice-lock", model: "qwen3-tts-voicedesign", run_id: "r1", draft_id: "d1", status: "queued",
    });
  });

  it("presentationMeta projects the refusal arm (error rides, no ids)", () => {
    const out = tool.output.presentationMeta?.(undefined, {
      flow: "voice-lock", model: "qwen3-tts-voicedesign", error: "no_such_model",
    });
    assert.deepEqual(out, { flow: "voice-lock", model: "qwen3-tts-voicedesign", error: "no_such_model" });
  });

  it("presentResult: meta-less result → undefined (the raw arm); run arm titles the label", () => {
    // (the defineTool wrapper validates args before the presenter runs —
    // invalid args → undefined, the same arm)
    const ARGS = {"voice_name": "x", "style_instruction": "x"};
    assert.equal(tool.presentResult?.(ARGS, {} as never), undefined);
    const view = tool.presentResult?.(ARGS, {
      content: [], isError: false,
      meta: { flow: "voice-lock", model: "qwen3-tts-voicedesign", run_id: "r9" },
    });
    assert.equal(view?.title, "Voice Lock [qwen3-tts-voicedesign] → r9");
    assert.ok(view?.card === "generic", "the generic card view");
    assert.equal((view as { content?: unknown }).content, undefined, "content omitted — the raw result renders");
  });
});
