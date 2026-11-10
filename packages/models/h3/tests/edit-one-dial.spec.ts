// @melite/models-h3 — THE ONE-DIAL DISSOLUTION (§-1 of the timeline
// plan; the operator's burn 2026-11-17: "I am tired of needing to
// break patterns for the refine flow"). Until this cure, a video-in
// 2x demanded the SEVEN-KEY PATTERN — whole-frame mask + self
// reference + denoise 0.32 + refine + scale 2 + clip_seconds ≤2.33
// + keep_audio — each seat a refusal lesson waiting for a missing
// key. The law this spec pins: under `refine: true` the compose
// DERIVES the pattern's unstated seats (blank prompt lawful, denoise
// 0.32, the 56 f decree window at scale ≥ 2) while every STATED
// seat rides and every guard still fires. The chip-shrink and the
// mask derivation are walled card-side (edit-refine.spec.ts,
// edit-presets.spec.ts); this file owns the compose door's own law
// through the REAL renderH3Edit over a real GraphBuilder.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Edit } from "../src/index.ts";

const FACTS = {
  unet: "minimax_h3_t2v_bf16.safetensors",
  clip: "clip.safetensors",
  vae_video: "vae_video.safetensors",
  vae_audio: "vae_audio.safetensors",
} as Parameters<typeof renderH3Edit>[4];

const WHOLE_FRAME = { source: "whole-frame" } as const;
const SELF = { mode: "self" } as const;

type Node = { class_type: string; inputs: Record<string, unknown> };
const out = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as unknown as Record<string, Node>;
const ofClass = (o: Record<string, Node>, cls: string): Array<[string, Node]> =>
  Object.entries(o).filter(([, n]) => n.class_type === cls);

/** THE ONE-DIAL PRESS: everything the old pattern had to author,
 * authored by nothing — only the switch, the source, and the
 * probe stamp the compose door itself puts there (the belt case —
 * no stamp — is walled in carry-split.spec.ts, D-5's own arm). */
const ONE_DIAL = (): Record<string, unknown> => ({
  source_clip: "uploads/client-delivery.mp4",
  edit_prompt: "",
  refine: true,
  __source_frames: 56,
});

describe("THE ONE-DIAL 2x (the pattern dissolves; the guards stay)", () => {
  it("THE ONE-DIAL COMPOSE: {refine, source} alone — blank prompt, unstated denoise/window — reaches the learned pass at the DERIVED posture", () => {
    const g = new GraphBuilder();
    assert.doesNotThrow(
      () => renderH3Edit(ONE_DIAL(), WHOLE_FRAME, SELF, {}, FACTS, g, "run_one_dial"),
      "no refusal on the blank prompt, the unstated denoise, the unstated window",
    );
    const o = out(g);
    const handoffs = ofClass(o, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.equal(handoffs.length, 1, "exactly one learned handoff serves the chain tail");
    assert.equal(handoffs[0]![1].inputs.scale, 2, "scale default-fills the 2x press");
    const sigmas = ofClass(o, "BasicScheduler");
    assert.ok(
      sigmas.some(([, n]) => n.inputs.denoise === 0.32),
      "denoise DERIVES the 0.32 design window — never the 1 default the partial law refuses",
    );
    const plan = ofClass(o, "MiniMaxH3ChainPlanModern");
    assert.ok(plan.length >= 1, "the plan node serves");
    // THE WINDOW NEEDS NO DERIVATION (the D-5 law owns it): the
    // probe-capped plan slice composes every ≤141 f film unstated —
    // min(144, probed) — and the unprobed belt keeps its
    // conservative voice; walled in carry-split.spec.ts.
    assert.equal(ofClass(o, "SAM3_VideoTrack").length, 0, "whole-frame: no region tracker rides");
  });

  it("THE BLANK-PROMPT LAW KEEPS ITS OTHER FACE: blank without refine still refuses (an edit asks an action)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(
        { source_clip: "clips/take.mp4", edit_prompt: "" },
        WHOLE_FRAME, SELF, {}, FACTS, g, "run_blank",
      ),
      /'edit_prompt' names no action/,
      "only a second pass may compose promptless",
    );
  });

  it("STATED SEATS RIDE (presence is authorship): a stated denoise overrides the derivation; a stated window rides the D-5 judge", () => {
    const g = new GraphBuilder();
    renderH3Edit(
      { ...ONE_DIAL(), denoise: 0.5, clip_seconds: 2.5 },
      WHOLE_FRAME, SELF, {}, FACTS, g, "run_stated",
    );
    const o = out(g);
    assert.ok(
      ofClass(o, "BasicScheduler").some(([, n]) => n.inputs.denoise === 0.5),
      "the stated 0.5 rides the scheduler, not the derived 0.32",
    );
  });

  it("THE OOM GUARD STILL FIRES on authored windows: 7 s at scale 2 over a film that outlives it refuses naming the 141 f ceiling and both cures", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(
        { ...ONE_DIAL(), clip_seconds: 7, __source_frames: 1000 },
        WHOLE_FRAME, SELF, {}, FACTS, g, "run_oom",
      ),
      /168 f window at refine 2x is TOO LONG.*141 f.*Cut the window .* or lower scale below 2/s,
      "the derivation dissolved the PATTERN, never the ceiling",
    );
  });

  it("THE LONG-FILM LAW PINS THE ENGINE'S OWN TRUTH: a film past the plan slice refuses the multi-window refine guard (the 1x-join/2x-latent geometry death), naming the measured posture", () => {
    // 685 f = 2 windows of 362 f under the 39 f overlap — exactly
    // tileable, so the SOLVER passes and the GEOMETRY guard itself
    // has the word (a stated 2.5 s window keeps the OOM judge
    // quiet; the tiling is what dies). The one-dial dissolution
    // dissolved the PATTERN, never the engine law: same-run 2x is
    // one window per press; the full-film tile owes the assembler
    // its own door.
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(
        { ...ONE_DIAL(), clip_seconds: 2.5, __source_frames: 685 },
        WHOLE_FRAME, SELF, {}, FACTS, g, "run_long",
      ),
      /refine 2x over a 2-window plan cannot tile.*geometry differs.*Refine ONE window per press/s,
      "the guard still names the geometry death and the measured posture",
    );
  });

  it("THE MEASURED POSTURE COMPOSES: a 56 f film composes unstated — the D-5 judge reads the film (min(144, 56)), the single-window press the guard permits", () => {
    const g = new GraphBuilder();
    assert.doesNotThrow(
      () => renderH3Edit(
        { ...ONE_DIAL(), __source_frames: 56 },
        WHOLE_FRAME, SELF, {}, FACTS, g, "run_rung",
      ),
      "a 56 f film composes unstated — the probe judges, no window owed",
    );
  });

  it("THE RESUME DOOR UNTOUCHED: chain_run still routes the deferred loop, and the competing second pass still refuses", () => {
    const g = new GraphBuilder();
    renderH3Edit(
      { source_clip: "", edit_prompt: "", chain_run: "run-prior", denoise: 0.24, steps: 20 },
      WHOLE_FRAME, SELF, {}, FACTS, g, "run_resume",
    );
    const o = out(g);
    assert.equal(ofClass(o, "MiniMaxH3ChainUpscaleAdapter").length, 1,
      "the loop posture still composes through the checkpoint resume");
    assert.equal(ofClass(o, "MiniMaxH3ChainAssemble")[0]![1].inputs.filename, "run_resume/upscale",
      "the loop's assemble name rides untouched");
    const g2 = new GraphBuilder();
    assert.throws(
      () => renderH3Edit(
        { source_clip: "", edit_prompt: "", chain_run: "run-prior", refine: true },
        WHOLE_FRAME, SELF, {}, FACTS, g2, "run_both",
      ),
      /the refine switch under an upscale — two second-pass arms on the ONE second-pass seat/,
      "refine beside chain_run still refuses the competing pass",
    );
  });
});
