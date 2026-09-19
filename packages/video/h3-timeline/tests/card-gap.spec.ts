// @melite/video-h3-timeline — card gate + renderer gap rows (2026-09-19).
//
// DRIVES (through the registered card's own doors — def.schema for the
// gate, def.compose for the renderer): the wire-boolean coercion, the
// absent-input starter, hole-row refusal, unknown-family refusal, the
// explicit-shift law, both family-admission throws, the merged-film
// arms (carry snap, seam wires, prompt fallback, refs/guide windows,
// lora-steps layering, per-window length pins), the refs-imply-t4r
// force, the t4r bundle arms (anchor/ref/video/audio lanes, explicit
// sla_switch), the standalone-chain convention, the single-window
// lora-steps block, the null-length delete, the calls-less door, the
// t4r anchor guard (throw + refs admit), and the interp fps
// compensation. Every row asserts graph truth (node classes/inputs)
// or refusal text — never expect(true).
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);
const scoped = (out: Record<string, Node>, scope: string, cls: string): [string, Node][] =>
  Object.entries(out).filter(([id, n]) => id.startsWith(scope) && n.class_type === cls);

describe("the schema gate arms", () => {
  it("wire-string booleans coerce (the bench add-door literal)", () => {
    assert.equal((def.schema({ interpolate_enabled: "true" }) as Record<string, unknown>).interpolate_enabled, true);
    assert.equal((def.schema({ interpolate_enabled: "false" }) as Record<string, unknown>).interpolate_enabled, false);
    expect((def.schema({ interpolate_enabled: "true" }) as Record<string, unknown>).interpolate_enabled).toBe(true);
  });

  it("an absent input composes the fresh-press starter (never a crash)", () => {
    const out = def.schema(undefined) as Record<string, unknown>;
    assert.equal(out.variant, "t4_open");
    assert.deepEqual(out.calls, [{ start_frame: 0, end_frame: 90 }]);
  });

  it("a hole row refuses loud (the shot laws name the missing span)", () => {
    assert.throws(
      () => def.schema({ calls: [undefined as never] }),
      /calls\[0\]: start_frame is required/,
    );
  });

  it("an unknown window family refuses loud", () => {
    assert.throws(
      () => def.schema({ variant: "bogus", calls: [SHOT()] }),
      /unknown window family 'bogus'/,
    );
  });

  it("an explicit shift_video survives the walk (no normalization)", () => {
    const out = def.schema({ shift_video: 8, calls: [SHOT()] }) as Record<string, unknown>;
    assert.equal(out.shift_video, 8);
  });

  it("t4r openers refuse the post-ladder leaves", () => {
    assert.throws(
      () => def.schema({ variant: "t4r", calls: [SHOT()], sharpen_switch: true }),
      /h3_window\(t4r\): unsanctioned inject keys: sharpen_switch/,
    );
  });

  it("non-chain windows refuse the chaining rail", () => {
    assert.throws(
      () => def.schema({ variant: "t4_open", calls: [SHOT()], motion_context_length: "39" }),
      /h3_window\(t4_open\): unsanctioned inject keys: motion_context_length/,
    );
  });
});

describe("the merged film (carry, seams, prompt fallback)", () => {
  it("a cut+prev_sec seam snaps the carry and wires the raw tail (cut-frames)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124, first_frame_prev_sec: 2, transition: "cut" })],
      }),
      model, g, "run_cut_seam",
    );
    const out = graphOf(g);
    const mc = scoped(out, "window2_", "MiniMaxH3MotionContext");
    assert.equal(mc.length, 1, "the chained window mounts the seam block");
    // 2s × 24fps = 48 frames → snapped to the legal 56-step carry
    assert.equal(mc[0]![1].inputs.context_length, "56");
    assert.equal(mc[0]![1].inputs.audio_context_length, 48);
    // cut-frames = the previous window's RAW decode (never the latent)
    assert.ok(Array.isArray(mc[0]![1].inputs.context_frames), "the video-tail opener wires decoded frames");
    assert.ok(mc[0]![1].inputs.context_audio !== undefined, "the video-tail opener wires decoded audio");
    assert.equal(mc[0]![1].inputs.context_latent, undefined, "a cut never chains the latent");
  });

  it("an extend seam chains the previous latent (no decode round-trip)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      }),
      model, g, "run_extend_seam",
    );
    const out = graphOf(g);
    const mc = scoped(out, "window2_", "MiniMaxH3MotionContext");
    assert.equal(mc.length, 1);
    assert.ok(Array.isArray(mc[0]![1].inputs.context_latent), "extend chains the sampler-output latent");
    assert.equal(mc[0]![1].inputs.context_frames, undefined);
    expect(ofClass(out, "MiniMaxH3FilmConcat").length).toBe(1);
  });

  it("a blank call text falls back to the run prompt (never an empty window)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "the run prompt",
        calls: [SHOT(), SHOT({ text: "   ", start_frame: 56, end_frame: 124 })],
      }),
      model, g, "run_blank_text",
    );
    const out = graphOf(g);
    const r2v = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo");
    assert.equal(r2v[0]![1].inputs.prompt, "the run prompt");
  });

  it("a cut without prev_sec is a true fresh window (no seam block)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "a hard cut", start_frame: 56, end_frame: 124, transition: "cut" })],
      }),
      model, g, "run_hard_cut",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3MotionContext").length, 0, "a hard cut mounts no seam");
    assert.equal(ofClass(out, "MiniMaxH3FilmConcat").length, 1, "the film still concats both windows");
  });
});

describe("the film's per-window stanza (guides, refs, lora steps, length pins)", () => {
  it("guides + the refs bundle ride; lora steps layer under knob pins; length pins hold", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        loras: [
          { name: "distill-8.safetensors", strength: 0.6, steps: 8 },
          { name: "plain.safetensors", strength: 0.5 },
          { name: "junk.safetensors", strength: 0.5, steps: "lots" },
        ],
        calls: [
          SHOT({ image: "/m/a.png" }),
          SHOT({ text: "a held wide", start_frame: 56, end_frame: 124, knobs: { length: 90, steps: 20 } }),
          SHOT({
            text: "then a turn", start_frame: 124, end_frame: 192,
            refs: { images: ["r1.png", "", 42 as never], videos: "v1.mp4, , v2.mp4" },
          }),
        ],
      }),
      model, g, "run_stanza",
    );
    const out = graphOf(g);
    // the guide window renders its anchor bundle; the refs window its own
    assert.ok(scoped(out, "window1_", "PlagueKindBundleIn").length >= 1, "the guide window bundles its anchor");
    assert.ok(scoped(out, "window3_", "PlagueKindBundleIn").length >= 1, "the refs window bundles its references");
    // the distill's married count rides where no knob pins it; the pin wins
    const sched1 = scoped(out, "window1_", "BasicScheduler")[0]![1].inputs.steps;
    const sched2 = scoped(out, "window2_", "BasicScheduler")[0]![1].inputs.steps;
    assert.equal(sched1, 8, "the lora entry's steps ride the unpinned window");
    assert.equal(sched2, 20, "the call's own knob beats the lora entry");
    // the per-window length pin holds its span (the chain window renders the literal)
    const r2v2 = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.length;
    assert.equal(r2v2, 90);
    expect(sched1).toBe(8);
  });

  it("a null length deletes before the walk (the multi-call span rider)", () => {
    const gated = def.schema({
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
    }) as Record<string, unknown>;
    assert.equal(gated.length, null, "multi-call docs keep null through the gate");
    const g = new GraphBuilder();
    def.compose(gated, model, g, "run_null_length");
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3FilmConcat").length, 1, "the film composes after the delete");
  });
});

describe("the single-window doors", () => {
  it("a refs-only call forces the r2v lane (the bundle IS the input)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ refs: { images: ["r1.png", "r2.png"] } })] }),
      model, g, "run_refs_force",
    );
    const out = graphOf(g);
    assert.ok(ofClass(out, "PlagueKindBundleIn").length >= 1, "the refs bundle mounts without an anchor");
    assert.ok(ofClass(out, "MiniMaxH3ReferenceToVideo").length >= 1, "refs imply the r2v lane");
  });

  it("a videos/audios-only bundle composes anchorless (geometry falls to literals)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ refs: { videos: ["v.mp4"], audios: ["a.mp3"] } })] }),
      model, g, "run_bundle_av",
    );
    const out = graphOf(g);
    assert.ok(ofClass(out, "LoadVideo").length >= 1, "the video lane loads");
    assert.ok(ofClass(out, "LoadAudio").length >= 1, "the audio lane loads");
    assert.ok(ofClass(out, "MiniMaxH3ReferenceToVideo").length >= 1);
  });

  it("anchor + ref images share the 9-slot bus", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ ref_image: "/m/a.png", refs: { images: ["r1.png"] } })] }),
      model, g, "run_bus",
    );
    const out = graphOf(g);
    assert.ok(ofClass(out, "LoadImage").length >= 2, "anchor + ref both load");
  });

  it("an explicit sla_switch replaces the SLA bool node (inject severs the link)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ ref_image: "/m/a.png" })], sla_switch: false }),
      model, g, "run_sla_sw",
    );
    const out = graphOf(g);
    const switches = ofClass(out, "ComfySwitchNode").filter(([, n]) => n.inputs.switch === false);
    assert.ok(switches.length >= 1, "the explicit scalar rides the SLA switch");
  });

  it("the distill bag's steps ride the single window; step-less bags hold the default", () => {
    const g1 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }] }),
      model, g1, "run_lora_steps",
    );
    assert.equal(scoped(graphOf(g1), "", "BasicScheduler")[0]![1].inputs.steps, 8);
    const g2 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], loras: [{ name: "plain.safetensors", strength: 0.5 }] }),
      model, g2, "run_lora_plain",
    );
    assert.equal(scoped(graphOf(g2), "", "BasicScheduler")[0]![1].inputs.steps, 12);
    expect(scoped(graphOf(g2), "", "BasicScheduler")[0]![1].inputs.steps).toBe(12);
  });

  it("an empty loras bag falls back to the frozen gold pair", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ calls: [SHOT()], loras: [] }), model, g, "run_lora_empty");
    const stacks = ofClass(graphOf(g), "LTX_lora_loader");
    assert.ok(stacks.length >= 1);
    assert.ok(String(stacks[0]![1].inputs.stack_data).includes("dareties"), "the gold pair rides");
  });

  it("interpolate_enabled doubles the playout fps (the V9 compensation)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], interpolate_enabled: true }),
      model, g, "run_interp",
    );
    const created = ofClass(graphOf(g), "CreateVideo");
    assert.ok(created.some(([, n]) => n.inputs.fps === 48), "interp-on windows play at 24×2");
  });

  it("a calls-less door composes the frozen single window", () => {
    const g = new GraphBuilder();
    def.compose({ prompt: "a slow push in", variant: "t4_open" }, model, g, "run_nocalls");
    const saves = ofClass(graphOf(g), "SaveVideo");
    assert.ok(saves.some(([, n]) => n.inputs.filename_prefix === "h3_t4_w1"));
  });

  it("a bogus variant refuses at the window door (never a silent family)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose({ prompt: "x", variant: "bogus", calls: [SHOT()] }, model, g, "run_bogus"),
      /unknown window family 'bogus'/,
    );
  });

  it("t4r without an anchor refuses — unless the refs bundle carries it", () => {
    const g1 = new GraphBuilder();
    assert.throws(
      () => def.compose({ prompt: "x", variant: "t4r", calls: [SHOT()] }, model, g1, "run_bare_t4r"),
      /without a staged guide image/,
    );
    const g2 = new GraphBuilder();
    def.compose(
      { prompt: "x", variant: "t4r", refs: { images: ["r1.png"] }, calls: [SHOT()] },
      model, g2, "run_refs_t4r",
    );
    assert.ok(ofClass(graphOf(g2), "PlagueKindBundleIn").length >= 1, "the bundle admits the anchorless t4r");
  });
});

describe("the standalone chain stanza (the cross-prompt convention)", () => {
  it("k≥2 without a path names the previous window's save (frozen shape)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ variant: "t4_chain", calls: [SHOT()], k: 2 }),
      model, g, "run_standalone",
    );
    const loads = ofClass(graphOf(g), "MiniMaxH3MotionContextLoadLatent");
    assert.equal(loads.length, 1);
    assert.deepEqual(loads[0]![1].inputs.latent_path, ["window1_MiniMaxH3MotionContextSaveLatent.0", 0]);
    assert.equal(loads[0]![1].inputs.clip_index, 0);
  });

  it("an explicit latent path + clip index ride verbatim", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        variant: "t4_chain", calls: [SHOT()],
        ctx_load_latent_path: "/tmp/x.latent", ctx_load_clip_index: 3,
      }),
      model, g, "run_standalone_path",
    );
    const loads = ofClass(graphOf(g), "MiniMaxH3MotionContextLoadLatent");
    assert.equal(loads[0]![1].inputs.latent_path, "/tmp/x.latent");
    assert.equal(loads[0]![1].inputs.clip_index, 3);
    expect(loads[0]![1].inputs.clip_index).toBe(3);
  });
});
