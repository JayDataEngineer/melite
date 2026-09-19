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

  it("the chaining rail vocabulary is retired — the seam is automatic, never authored", () => {
    // (2026-09-20: the MotionContext seam is forgotten; the
    // drift-control continuation owns the chaining. The old carry
    // knobs ride INERT — no admission gate, no node, nothing read)
    const walked = def.schema({
      variant: "t4_open", calls: [SHOT()],
      motion_context_length: "39", ctx_load_latent_path: "/tmp/x.latent",
    }) as Record<string, unknown>;
    assert.equal(walked.motion_context_length, "39", "lenient walk, inert key");
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_retired_vocab");
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3MotionContext").length, 0, "the retired seam never mounts");
    assert.equal(ofClass(out, "MiniMaxH3MotionContextLoadLatent").length, 0, "no cross-prompt load");
  });
});

describe("the merged film (the drift-control seam, automatic)", () => {
  it("a carried seam rides the drift-control continuation (previous sampled latent + patched model)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      }),
      model, g, "run_carry_seam",
    );
    const out = graphOf(g);
    const cont = scoped(out, "window2_", "MiniMaxH3FiniteLatentContinuation");
    assert.equal(cont.length, 1, "window 2 mounts the drift-control seam");
    const cin = cont[0]![1].inputs;
    assert.equal(cin.iteration, 1, "window 2 is segment 2 of the film");
    assert.equal(cin.overlap_frames, 22, "the director's proven default, automatic");
    assert.equal(cin.continue_audio_latent, true, "Soft AV audio release on");
    // the carried latent IS window 1's sampler output — straight out,
    // never a decode round-trip
    const w1Sampled = scoped(out, "window1_", "SamplerCustomAdvanced")[0]!;
    assert.deepEqual(cin.previous_latent, [w1Sampled[0], 0], "the previous RAW latent feeds the seam");
    // the opener never mounts the block (a true fresh window)
    assert.equal(scoped(out, "window1_", "MiniMaxH3FiniteLatentContinuation").length, 0);
    // the guider rebinds to the PATCHED model (drift control wraps it)
    const w2Guiders = scoped(out, "window2_", "BasicGuider");
    const patched = w2Guiders.find(([, n]) => Array.isArray(n.inputs.model)
      && (n.inputs.model as [string, number])[0] === cont[0]![0]);
    assert.ok(patched, "window 2's guider carries the drift-controlled model");
  });

  it("the seam's overlap leaves the window's own clip (finalize) and the film joins soft", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      }),
      model, g, "run_seam_dedup",
    );
    const out = graphOf(g);
    // the window's OWN clip: the carried overlap trimmed off picture
    // AND sound (their finalize, hard audio trim)
    const fin = scoped(out, "window2_", "MiniMaxH3FiniteSegmentFinalize");
    assert.equal(fin.length, 1);
    assert.equal(fin[0]![1].inputs.overlap_frames, 22);
    assert.equal(fin[0]![1].inputs.trim_audio_head, true, "a clip never replays its seam");
    // THE FILM: no FilmConcat anywhere — accumulation through their
    // finalize (video) + the soft audio join (tail yields, incoming head owns)
    assert.equal(ofClass(out, "MiniMaxH3FilmConcat").length, 0, "the old concat is forgotten");
    const acc = ofClass(out, "MiniMaxH3FiniteSegmentFinalize").filter(([id]) => !id.startsWith("window"));
    assert.equal(acc.length, 1, "the film accumulates at the prompt's top level");
    assert.equal(acc[0]![1].inputs.overlap_frames, 0, "video dedup already happened in-window");
    const tail = ofClass(out, "MiniMaxH3FiniteAudioTrimTail");
    assert.equal(tail.length, 1, "the previous film audio yields its overlap");
    assert.equal(tail[0]![1].inputs.overlap_frames, 22);
    const joins = ofClass(out, "AudioConcat");
    assert.equal(joins.length, 1, "the film's audio joins after the trimmed tail");
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

  it("a cut call is the director's overlap-0 arm (independent windows, a true butt)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "a hard cut", start_frame: 56, end_frame: 124, transition: "cut" })],
      }),
      model, g, "run_hard_cut",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3FiniteLatentContinuation").length, 0, "a cut carries nothing");
    assert.equal(scoped(out, "window2_", "MiniMaxH3FiniteSegmentFinalize").length, 0, "nothing to dedup");
    // the film still joins — video accumulates, audio butts whole
    const acc = ofClass(out, "MiniMaxH3FiniteSegmentFinalize").filter(([id]) => !id.startsWith("window"));
    assert.equal(acc.length, 1, "the film accumulates both windows");
    assert.equal(ofClass(out, "MiniMaxH3FiniteAudioTrimTail").length, 0, "no tail yields at a true cut");
    assert.equal(ofClass(out, "AudioConcat").length, 1, "the audio joins whole");
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

  it("multi-call length stands INERT at the walked default (no nulls — spans own the film)", () => {
    const gated = def.schema({
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
    }) as Record<string, unknown>;
    assert.equal(gated.length, 56, "no null through the gate — the walked default stands (the doc-level length is a WINDOW knob; chains have no doc-level window)");
    const g = new GraphBuilder();
    def.compose(gated, model, g, "run_null_length");
    const out = graphOf(g);
    const acc = ofClass(out, "MiniMaxH3FiniteSegmentFinalize").filter(([id]) => !id.startsWith("window"));
    assert.equal(acc.length, 1, "the film accumulates (per-window stanza lengths come from each call's span)");
    const r2v1 = scoped(out, "window1_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.length;
    const r2v2 = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.length;
    assert.notEqual(r2v2, 56, "window 2 never renders the inert doc-level default");
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

  it("an empty loras bag falls back to the frozen gold solo (turbo 0.6 — plaguekind 1:1, never a pair)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ calls: [SHOT()], loras: [] }), model, g, "run_lora_empty");
    const stacks = ofClass(graphOf(g), "LTX_lora_loader");
    assert.ok(stacks.length >= 1);
    const rows = JSON.parse(String(stacks[0]![1].inputs.stack_data)) as Array<{ on?: boolean, lora?: string, str?: number }>;
    const on = rows.filter((r) => r.on === true);
    assert.equal(on.length, 1, "ONE lora rides — never a pair, never a fallback stack");
    assert.ok(String(on[0]!.lora).includes("lightx2v_turbo"), "the solo turbo rides");
    assert.equal(on[0]!.str, 0.6, "at plaguekind's 0.6");
  });

  // ── THE T3 REFINE RIDER (roadmap item 2): the service-resolved
  // refine row mounts a CLOSING pass — the refiner on its OWN
  // loader (primary stack untouched), short full-denoise schedule
  // from the row's marriage, riding the doc's own solver. Absent
  // row = absent rider (one sampler, the graph exactly as before). ──
  it("the refine rider mounts a closing pass (own loader, the row's marriage, the doc's solver)", () => {
    const g = new GraphBuilder();
    def.compose(
      { ...def.schema({ calls: [SHOT()] }), refine: { name: "taomate.safetensors", strength: 0.7, steps: 3 } },
      model, g, "run_refine",
    );
    const stacks = ofClass(graphOf(g), "LTX_lora_loader");
    const refineStack = stacks.find(([, n]) => String((n.inputs as Record<string, unknown>).stack_data).includes("taomate"));
    assert.ok(refineStack !== undefined, "the rider's own loader carries the refiner row");
    const rows = JSON.parse(String(refineStack![1].inputs.stack_data)) as Array<{ on?: boolean, lora?: string, str?: number }>;
    assert.equal(rows.filter((r) => r.on === true).length, 1, "ONE refiner row on the rider's loader");
    assert.equal(rows[0]!.str, 0.7, "at the row's 0.7");
    const scheds = scoped(graphOf(g), "", "BasicScheduler");
    assert.ok(scheds.some(([, n]) => n.inputs.steps === 3 && n.inputs.denoise === 1.0), "the closing schedule: the row's 3 steps, full denoise");
    assert.equal(scoped(graphOf(g), "", "SamplerCustomAdvanced").length, 2, "pass A + pass B");
  });

  it("no refine row, no rider (one sampler, the graph exactly as before)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ calls: [SHOT()] }), model, g, "run_norefine");
    assert.equal(scoped(graphOf(g), "", "SamplerCustomAdvanced").length, 1, "pass A only");
    const stacks = ofClass(graphOf(g), "LTX_lora_loader").filter(([, n]) => String((n.inputs as Record<string, unknown>).stack_data).length > 0 && String((n.inputs as Record<string, unknown>).stack_data) !== "[]");
    assert.ok(stacks.every(([, n]) => !String((n.inputs as Record<string, unknown>).stack_data).includes("taomate")), "no refiner row anywhere");
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
  it("a standalone chain stanza composes FRESH (the cross-prompt Save/Load convention is retired)", () => {
    // (2026-09-20: with no previous window IN the prompt there is
    // nothing to carry — cross-run continuity is the FL2VA anchor:
    // set the first-frame square to the previous film's last frame)
    const g = new GraphBuilder();
    def.compose(
      def.schema({ variant: "t4_chain", calls: [SHOT()], k: 2 }),
      model, g, "run_standalone",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3MotionContextLoadLatent").length, 0, "no cross-prompt load");
    assert.equal(ofClass(out, "MiniMaxH3MotionContextSaveLatent").length, 0, "no cross-prompt save");
    assert.equal(ofClass(out, "MiniMaxH3FiniteLatentContinuation").length, 0, "nothing carried, nothing continued");
  });

  it("the retired ctx_load keys ride inert (dead vocabulary, never a node)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        variant: "t4_chain", calls: [SHOT()],
        ctx_load_latent_path: "/tmp/x.latent", ctx_load_clip_index: 3,
      }),
      model, g, "run_standalone_path",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3MotionContextLoadLatent").length, 0, "the retired loader never mounts");
  });
});

// THE OVERLAY LAW (2026-09-19, the operator's order: the schema
// gates EVERY hop — nothing goes around Schemaster). The
// single-call lift and the film per-window stanza merge
// user-authored knobs AFTER the compose gate walked the entry doc;
// these rows prove the carrier's refusals reach every overlay —
// out-of-bounds and wrong-typed knobs refuse LOUD at the lift and
// per window, bounded knobs ride the graph verbatim, and unknown
// keys stay inert (the lenient-object design, declared).
describe("the overlays cannot go around Schemaster", () => {
  it("an out-of-bounds knob in the single-call lift refuses loud (width 448–1344 declared)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        { calls: [{ text: "a push in", knobs: { width: 9999 } }] },
        model, g, "run_lift_oob",
      ),
      /single-call lift.*width.*1344/,
    );
  });

  it("a wrong-typed knob in the single-call lift refuses loud (width declared a number)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        { calls: [{ text: "a push in", knobs: { width: "wide" } }] },
        model, g, "run_lift_type",
      ),
      /single-call lift.*width.*number/,
    );
  });

  it("a bounded knob in the single-call lift rides the anchor window verbatim", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [{ text: "a push in", start_frame: 0, end_frame: 90, knobs: { width: 896 } }] }),
      model, g, "run_lift_ok",
    );
    const out = graphOf(g);
    const r2v = ofClass(out, "MiniMaxH3ReferenceToVideo");
    assert.ok(r2v.length > 0, "the lifted image-anchor window renders the r2v lane");
    assert.equal(r2v[0]![1].inputs.width, 896);
  });

  it("an out-of-bounds knob on a film window refuses loud and names the window (steps 4–30 declared)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        { calls: [SHOT(), SHOT({ text: "a second push", start_frame: 56, end_frame: 124, knobs: { steps: 999 } })] },
        model, g, "run_stanza_oob",
      ),
      /window 2 knobs.*steps.*30/,
    );
  });

  it("a bounded knob on a film window rides that window's scheduler verbatim", () => {
    const g = new GraphBuilder();
    def.compose(
      { calls: [SHOT(), SHOT({ text: "a second push", start_frame: 56, end_frame: 124, knobs: { steps: 8 } })] },
      model, g, "run_stanza_ok",
    );
    const out = graphOf(g);
    const sched = scoped(out, "window2_", "BasicScheduler");
    assert.ok(sched.length > 0, "window 2 owns a scheduler");
    assert.equal(sched[0]![1].inputs.steps, 8);
  });

  it("an unknown knob rides inert (the lenient-object law — it never reaches a node input)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [{ text: "a push in", start_frame: 0, end_frame: 90, knobs: { bogus_knob: 1 } }] }),
      model, g, "run_lift_unknown",
    );
    const json = JSON.stringify(graphOf(g));
    assert.ok(!json.includes("bogus_knob"), "the unknown key never lands on a node input");
  });

  it("the post-process knobs ride EXPLICIT and DECLARED (one owner each — the legacy switch aliases are retired)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT()],
        interpolate_enabled: true, interp_model: "rife47.pth", interp_multiplier: 3,
        sr_switch: true, sr_model: "seedvr2_ema_3b_fp16.safetensors",
        sharpen_enabled: true,
      }),
      model, g, "run_legacy_aliases",
    );
    const out = graphOf(g);
    const film = ofClass(out, "FrameInterpolationModelLoader")[0]![1].inputs.model_name;
    assert.equal(film, "rife47.pth", "the explicit interp_model rides (no floor)");
    assert.equal(ofClass(out, "FrameInterpolate")[0]![1].inputs.multiplier, 3, "the explicit multiplier rides");
    const sr = ofClass(out, "SeedVR2VideoUpscaler");
    assert.ok(sr.length > 0, "the sr_switch alias arms the upscaler");
    assert.equal(sr[0]![1].inputs.resolution, 1080, "the walked sr_resolution default rides (no floor)");
    const cv = ofClass(out, "CreateVideo")[0]![1].inputs;
    assert.equal(cv.fps, 72, "interp ON pays the V9 compensation (24 × 3)");
  });

  it("a non-string call text falls to the run prompt (the film str() coercion, never a crash)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        prompt: "the carry",
        calls: [
          { text: "first push", start_frame: 0, end_frame: 56 },
          { text: 123, start_frame: 56, end_frame: 124 },
        ],
      }),
      model, g, "run_junk_text",
    );
    const out = graphOf(g);
    const r2v2 = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.prompt;
    assert.equal(r2v2, "the carry", "junk text in the film loop coerces empty and the run prompt carries the window");
  });

  it("a stanza-pinned fps_seconds advances the bed clock by the window's OWN duration", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        bed_audio: "/inputs/bed.wav",
        calls: [
          { text: "first push", start_frame: 0, end_frame: 90, knobs: { fps_seconds: 4 } },
          { text: "second push", start_frame: 90, end_frame: 180 },
        ],
      }),
      model, g, "run_bed_pin",
    );
    const out = graphOf(g);
    const slices = ofClass(out, "MeliteAudioSlice");
    assert.ok(slices.length >= 2, "both windows slice the bed");
    const starts = slices.map(([, n]) => Number(n.inputs.start_seconds)).sort((a, b) => a - b);
    assert.equal(starts[1] - starts[0], 4, "the pinned fps_seconds (4s) advanced the bed clock exactly");
  });

  it("a non-finite frame number skips the stanza length pin (num() refuses NaN, never crashes)", () => {
    const g = new GraphBuilder();
    // DIRECT compose (pre-walked doc shape): schema()'s own shot laws
    // refuse NaN LOUD for authored docs — this arm is the film
    // renderer's fence for hand-built docs that skipped the walk
    def.compose(
      {
        prompt: "a push",
        calls: [
          { text: "first push", start_frame: 0, end_frame: 56 },
          { text: "junk frames", start_frame: Number.NaN, end_frame: 124 },
        ],
      },
      model, g, "run_nan_frames",
    );
    const out = graphOf(g);
    const r2v2 = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs;
    assert.ok(typeof r2v2.length === "object" || typeof r2v2.length === "number", "window 2 composes (the NaN pin skipped, the length node rides)");
  });

  it("an explicit null length REFUSES at the card gate (no silent delete-and-refill)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose({ ...def.schema({ calls: [SHOT()] }), length: null }, model, g, "run_null_len"),
      /length is null — send a real frame count or omit the key/,
    );
  });
});

