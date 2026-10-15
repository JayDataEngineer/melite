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
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { gridSnap } from "../src/card.ts";
import { computeFilmMix, parseFilmMixClips, stanzaSecs } from '@melite/models-h3/filmMix';

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

  it("call spans must tile without gaps or overlaps", () => {
    assert.throws(
      () => def.schema({ calls: [SHOT(), SHOT({ text: "gap", start_frame: 57, end_frame: 124 })] }),
      /calls\[1\]: start_frame 57 must equal previous end_frame 56/,
    );
    assert.throws(
      () => def.schema({ calls: [SHOT(), SHOT({ text: "overlap", start_frame: 39, end_frame: 124 })] }),
      /calls\[1\]: start_frame 39 must equal previous end_frame 56/,
    );
  });

  it("unknown per-call keys refuse instead of riding inert", () => {
    assert.throws(
      () => def.schema({ calls: [SHOT({ unexpected: true })] }),
      /calls\[0\]: unknown per-call key\(s\): unexpected/,
    );
  });

  // The SEAT-NAMED twins of the arm above (2026-10-26 contracts audit,
  // §3.4 loras + width/height/fps/sampler rows): the generic arm proves
  // the unknown-key class, but neither row's law is NAMED by it — a
  // per-call loras payload (film-level config, CALL_KEYS admits no
  // loras key) and a per-call render-family knob (Layer A only) both
  // refuse, named for their seat, never silently merged.
  it("a per-call loras payload refuses NAMED — loras is film-level config, a call cannot even state one", () => {
    assert.throws(
      () => def.schema({ calls: [SHOT({ loras: [{ name: "distill-8.safetensors", strength: 0.6 }] })] }),
      /calls\[0\]: unknown per-call key\(s\): loras/,
    );
  });

  it("per-call render-family knobs (width/height/fps/sampler) refuse NAMED — the family is Layer A only", () => {
    assert.throws(
      () => def.schema({ calls: [SHOT({ width: 1920, height: 1080, fps: 30, sampler: "euler" })] }),
      /calls\[0\]: unknown per-call key\(s\): (.*width|.*fps)/,
    );
  });

  it("wire-stringified call spans restore (the 035/009 stop-law receipt — calls is undeclared, the card owns the int law)", () => {
    const out = def.schema({
      calls: [
        { text: "morning roll", start_frame: "0", end_frame: "141" },
        { text: "sign-on", start_frame: "141", end_frame: "294" },
      ],
    }) as Record<string, unknown>;
    assert.deepEqual(out.calls, [
      { text: "morning roll", start_frame: 0, end_frame: 141 },
      { text: "sign-on", start_frame: 141, end_frame: 294 },
    ]);
  });

  it("a non-numeric span string still refuses (never a reinterpretation)", () => {
    assert.throws(
      () => def.schema({ calls: [{ text: "x", start_frame: "soon", end_frame: 90 }] }),
      /calls\[0\]: start_frame is required/,
    );
  });

  it("a bogus variant is NOT a family claim — the door derives the family and never throws (the axis filter)", () => {
    // (2026-10-27, the variant:'timeline' break) `variant` on the
    // wire carries two vocabularies — the model AXIS ('timeline')
    // and the window FAMILY (t4r/t4_open/t4_chain). An unknown
    // string is simply not a family claim: the doc's own seats
    // derive the family (single text call → t4_open), model
    // metadata never picks a render lane, and the old throw fired
    // on every axis-stamped fresh stage.
    const out = def.schema({ variant: "bogus", calls: [SHOT()] }) as Record<string, unknown>;
    assert.equal(out.variant, "t4_open");
  });

  it("an explicit shift_video survives the walk (no normalization)", () => {
    const out = def.schema({ shift_video: 8, calls: [SHOT()] }) as Record<string, unknown>;
    assert.equal(out.shift_video, 8);
  });

  it("the sampling knobs share the kit's layout (the generic seam — sampler beside scheduler)", () => {
    const carrier = def.schemaCarrier as unknown as {
      dict: Record<string, { meta?: { extra?: Record<string, unknown> } }>;
    };
    assert.ok(carrier?.dict !== undefined, "the registered carrier exposes its declared field extras");
    const layout = (name: string): Record<string, unknown> => {
      const extra = carrier.dict[name]?.meta?.extra ?? {};
      return {
        order: extra["order"], group: extra["group"], columns: extra["columns"],
        width: extra["width"], zone: extra["zone"], wtype: extra["wtype"],
      };
    };
    // steps/sampler/scheduler ride the kit helper (canonical orders
    // 0/2/3); the h3-only denoise/shifts declare the same facts
    // inline (orders 4/5/6) — one 2-column sampling grid everywhere.
    assert.deepEqual(layout("steps"), { order: 0, group: "sampling", columns: 2, width: 1, zone: "params", wtype: "number" });
    assert.deepEqual(layout("sampler_name"), { order: 2, group: "sampling", columns: 2, width: 1, zone: "params", wtype: "select" });
    assert.deepEqual(layout("sched_name"), { order: 3, group: "sampling", columns: 2, width: 1, zone: "params", wtype: "select" });
    assert.deepEqual(layout("denoise"), { order: 4, group: "sampling", columns: 2, width: 1, zone: "params", wtype: "number" });
    assert.deepEqual(layout("shift_video"), { order: 5, group: "sampling", columns: 2, width: 1, zone: "params", wtype: "number" });
    assert.deepEqual(layout("shift_audio"), { order: 6, group: "sampling", columns: 2, width: 1, zone: "params", wtype: "number" });
  });

  it("t4r openers refuse the post-ladder leaves", () => {
    assert.throws(
      () => def.schema({ variant: "t4r", calls: [SHOT()], sharpen_switch: true }),
      /h3_window\(t4r\): unsanctioned inject keys: sharpen_switch/,
    );
  });

  it("the chaining rail vocabulary is retired — ctx rides inert, motion_* is gone outright", () => {
    // (2026-09-20: the MotionContext seam is forgotten; the
    // drift-control continuation owns the chaining. The ctx_*
    // carry knobs ride INERT — no node, nothing read — because the
    // compat law at schema.ts names the class. motion_context_length
    // lost its admit the same day it lost its last reader: no
    // document ever carried one (measured over data/), so the T6
    // gate now refuses it named, like every other unknown word —
    // changed with the behavior 2026-10-12, when the h3 conformance
    // row's dead-admit ask landed.)
    const walked = def.schema({
      variant: "t4_open", calls: [SHOT()],
      ctx_load_latent_path: "/tmp/x.latent",
    }) as Record<string, unknown>;
    assert.equal(walked.ctx_load_latent_path, "/tmp/x.latent", "lenient walk, inert key (the verification receipt's D2: the walked doc still carries the word)");
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_retired_vocab");
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3MotionContext").length, 0, "the retired seam never mounts");
    assert.equal(ofClass(out, "MiniMaxH3MotionContextLoadLatent").length, 0, "no cross-prompt load");
    assert.throws(
      () => def.compose(
        def.schema({ variant: "t4_open", calls: [SHOT()], motion_context_length: "39" } as never),
        model, g, "run_motion_gone",
      ),
      /motion_context_length/,
    );
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

  it("the seam's overlap leaves the window's own clip (finalize); with clips the film still joins on disk (windows only)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        // a positioned clip no longer closes a valve: the overlay
        // seats moved to filmMix.ts, so even a clips-carrying doc
        // emits windows only (the estate joins from disk).
        audio_clips: [{ src: "/a/line.flac", start_frame: 10, dur_frames: 40, text: "words" }],
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
    // THE FILM: no FilmConcat anywhere — and no top-level
    // accumulation either (the windows tile from disk; the estate
    // mux owns the join, with or without positioned clips)
    assert.equal(ofClass(out, "MiniMaxH3FilmConcat").length, 0, "the old concat is forgotten");
    const acc = ofClass(out, "MiniMaxH3FiniteSegmentFinalize").filter(([id]) => !id.startsWith("window"));
    assert.equal(acc.length, 0, "no top-level accumulation — positioned clips ride the disk-side manifest");
    const tail = ofClass(out, "MiniMaxH3FiniteAudioTrimTail");
    assert.equal(tail.length, 0, "no previous-film tail yields in-graph");
    const joins = ofClass(out, "AudioConcat");
    assert.equal(joins.length, 0, "no in-graph audio join — the estate concats the window files");
  });

  it("a blank call text REFUSES at the door — a call owns its text, the film prompt is not a fallback (the no-fallbacks law, 2026-09-21)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        // (re-pin 2026-11-06, c7bc662b7) the film-level prompt knob
        // is GONE — a prompt key at this door is itself refused
        // (unknown-param); the no-fallback law judges the blank CALL
        // text alone now.
        def.schema({
          calls: [SHOT(), SHOT({ text: "   ", start_frame: 56, end_frame: 124 })],
        }),
        model, g, "run_blank_text",
      ),
      /a call needs its own text — the film-level prompt is not a fallback/,
    );
  });

  it("THE STANDING SEAM PROBE (roadmap §32a, 2026-09-24): a no-cut film mounts continuation + finalize on EVERY carried window, chained through the film — not memory, the compose itself", () => {
    // The 2-window arm above proves window 2 once; this probe walks
    // a FOUR-window no-cut film and asserts the chain per carried
    // window: k=2,3,4 each mount the drift-control continuation fed
    // by the PREVIOUS window's own sampler (the accumulation — the
    // film builds window-to-window, never all-from-the-opener), each
    // trims its own carried head (per-window finalize), the opener
    // stays fresh, and the file tail gives every save its own
    // MeliteUnload boundary (the §20 ordering law).
    const g = new GraphBuilder();
    // THE UNIFORM SPAN GATE, legal authored geometry: window 1 is
    // 22+17k (56f), every carried window is 17k (68f, 153f, 119f) so
    // its generated span+carry lands on 22+17k.
    const CHAIN: ReadonlyArray<readonly [number, number]> = [[0, 56], [56, 124], [124, 277], [277, 396]];
    const shot = (i: number): Record<string, unknown> =>
      SHOT({ text: `window ${i + 1} of the film`, start_frame: CHAIN[i]![0], end_frame: CHAIN[i]![1] });
    def.compose(
      def.schema({ calls: [shot(0), shot(1), shot(2), shot(3)] }),
      model, g, "run_standing_seam",
    );
    const out = graphOf(g);
    for (let k = 2; k <= 4; k++) {
      const scope = `window${k}_`;
      const cont = scoped(out, scope, "MiniMaxH3FiniteLatentContinuation");
      assert.equal(cont.length, 1, `window ${k} mounts the drift-control seam`);
      const cin = cont[0]![1].inputs;
      assert.equal(cin.iteration, k - 1, `window ${k} is segment ${k} of the film`);
      assert.equal(cin.overlap_frames, 22, `window ${k} carries the director's default overlap`);
      // the carried latent is the IMMEDIATELY PREVIOUS window's
      // sampler output — the accumulation walks the film, window to
      // window (a chain fed from the opener would silently restart
      // drift control every seam).
      const prevSampled = scoped(out, `window${k - 1}_`, "SamplerCustomAdvanced")[0]!;
      assert.deepEqual(
        cin.previous_latent, [prevSampled[0], 0],
        `window ${k} continues window ${k - 1}'s raw latent`,
      );
      // per-window finalize: the carried head trimmed off picture
      // AND sound — every carried window, never just the last
      const fin = scoped(out, scope, "MiniMaxH3FiniteSegmentFinalize");
      assert.equal(fin.length, 1, `window ${k} finalizes its own clip`);
      assert.equal(fin[0]![1].inputs.overlap_frames, 22, `window ${k}'s finalize trims the carry`);
      assert.equal(fin[0]![1].inputs.trim_audio_head, true, `window ${k}'s audio head never replays`);
    }
    // the opener stays a true fresh window
    assert.equal(scoped(out, "window1_", "MiniMaxH3FiniteLatentContinuation").length, 0,
      "the opener carries nothing");
    assert.equal(scoped(out, "window1_", "MiniMaxH3FiniteSegmentFinalize").length, 0,
      "the opener trims nothing");
    // the file tail's ordering law: one boundary PER window save
    // (4 windows → 4 MeliteUnload boundaries, token-chained)
    assert.equal(ofClass(out, "MeliteUnload").length, 4,
      "every window save owns its own unload boundary");
    // and the film assembles from the saved files, never tensors
    const concat = ofClass(out, "MeliteConcatVideos");
    assert.equal(concat.length, 1, "one file-decoding tail assembles the film");
    assert.match(String(concat[0]![1].inputs.videos), /h3_t4_w1,h3_t4_w2,h3_t4_w3,h3_t4_w4/,
      "the concat names every saved window in order");
  });

  it("a cut call is the director's overlap-0 arm (independent windows, a true butt)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "a hard cut", start_frame: 56, end_frame: 129, transition: "cut" })],
      }),
      model, g, "run_hard_cut",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MiniMaxH3FiniteLatentContinuation").length, 0, "a cut carries nothing");
    assert.equal(scoped(out, "window2_", "MiniMaxH3FiniteSegmentFinalize").length, 0, "nothing to dedup");
    // THE DISK-STITCH VALVE (F-6c, 2026-09-22): clips-free → the film
    // joins on DISK (the estate mux butts the window files whole) —
    // no accumulation, no in-graph audio join, nothing resident
    const acc = ofClass(out, "MiniMaxH3FiniteSegmentFinalize").filter(([id]) => !id.startsWith("window"));
    assert.equal(acc.length, 0, "the film does not accumulate in-graph — the estate mux owns the butt");
    assert.equal(ofClass(out, "MiniMaxH3FiniteAudioTrimTail").length, 0, "no tail yields at a true cut");
    assert.equal(ofClass(out, "AudioConcat").length, 0, "the audio joins on disk (concat demuxer), not in-graph");
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
    // the disk-stitch valve (F-6c): clips-free chains have no film
    // node — but the per-window stanza STILL renders its own span
    // (each window's r2v length below IS the evidence the spans own
    // the film; the estate mux owns the join from the window files)
    const acc = ofClass(out, "MiniMaxH3FiniteSegmentFinalize").filter(([id]) => !id.startsWith("window"));
    assert.equal(acc.length, 0, "no in-graph accumulation for a clips-free chain (disk stitch)");
    const r2v1 = scoped(out, "window1_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.length;
    const r2v2 = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.length;
    assert.notEqual(r2v2, 56, "window 2 never renders the inert doc-level default");
  });
});

describe("the render grid gate (roadmap §26 — zero-GPU refusal, never a sampler death)", () => {
  it("gridSnap names the nearest legal length", () => {
    assert.equal(gridSnap(124), 124);
    assert.equal(gridSnap(136), 141);
    assert.equal(gridSnap(10), 22);
    assert.equal(gridSnap(400), 362);
  });

  it("a knob-pinned off-grid length refuses at the walk (the 136f death, caught at validate)", () => {
    assert.throws(
      () => def.schema({ calls: [SHOT({ knobs: { length: 136 } })] }),
      /calls\[0\]\.knobs\.length: length 136f is off-grid.*nearest legal: 141f/,
    );
  });

  it("an on-grid pin rides the walk untouched", () => {
    const out = def.schema({ calls: [SHOT({ knobs: { length: 124 } })] }) as Record<string, unknown>;
    assert.equal(((out.calls as Array<Record<string, unknown>>)[0]!.knobs as Record<string, unknown>).length, 124);
  });

  it("a legal carried multi-call span keeps its authored end and grid length", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT({ end_frame: 124 }), SHOT({ text: "then a turn", start_frame: 124, end_frame: 277 })],
      }),
      model, g, "run_grid_legal_carried",
    );
    const out = graphOf(g);
    assert.equal(scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.length, 175);
    assert.equal(scoped(out, "window2_", "MiniMaxH3FiniteSegmentFinalize")[0]![1].inputs.overlap_frames, 22);
  });

  it("an illegal carried multi-call span refuses at schema with the exact range and neighbors", () => {
    assert.throws(
      () => def.schema({
        calls: [SHOT({ end_frame: 124 }), SHOT({ text: "then a turn", start_frame: 124, end_frame: 282 })],
      }),
      /calls\[1\]: authored range 124→282 cannot land on the 22\+17k carried grid; generated snapped range 102→277; legal neighboring end frames 277 and 294/,
    );
  });

  it("the renderer repeats the carried-grid refusal when a walked document is stale", () => {
    const walked = def.schema({
      calls: [SHOT({ end_frame: 124 }), SHOT({ text: "then a turn", start_frame: 124, end_frame: 277 })],
    }) as Record<string, unknown>;
    ((walked.calls as Array<Record<string, unknown>>)[1]!.end_frame) = 282;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_grid_illegal_carried"),
      /h3-timeline window 2: authored range 124→282 cannot land on the 22\+17k carried grid; generated snapped range 102→277; legal neighboring end frames 277 and 294/,
    );
  });

  it("the uniform span gate: single and cut windows refuse off-grid spans like carried ones", () => {
    // THE TWO-LAW GAP, CLOSED: 282f was silently snapped to 277f for a
    // first/cut window while a carried window refused. One law now.
    assert.throws(
      () => def.schema({ calls: [SHOT({ start_frame: 0, end_frame: 282 })] }),
      /calls\[0\]: authored range 0→282 has length 282f, which cannot land on the 22\+17k grid \(nearest legal: 277f\)/,
    );
    const onGrid = def.schema({ calls: [SHOT({ start_frame: 0, end_frame: 277 })] }) as Record<string, unknown>;
    assert.equal(onGrid.length, 277, "an admitted single window keeps its authored length, unsnapped");
    const cut = def.schema({
      calls: [SHOT({ end_frame: 124 }), SHOT({ start_frame: 124, end_frame: 282, transition: "cut" })],
    }) as Record<string, unknown>;
    assert.equal(cut.variant, "t4_chain");
    // the cut span 158f IS 22+17k, so the refusal above was about the
    // single window's 282f span, not about cut geometry
    assert.throws(
      () => def.schema({
        calls: [SHOT({ end_frame: 124 }), SHOT({ start_frame: 124, end_frame: 268, transition: "cut" })],
      }),
      /calls\[1\]: authored range 124→268 has length 144f, which cannot land on the 22\+17k grid/,
    );
  });

  it("the compose carrier repeats the uniform span refusal for a stale opener", () => {
    // the film door re-rides the same law the walk admitted under:
    // a mutated opener span refuses before any node is built
    const walked = def.schema({ calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })] }) as Record<string, unknown>;
    ((walked.calls as Array<Record<string, unknown>>)[0]!).end_frame = 68;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_grid_illegal_opener"),
      /h3-timeline window 1: authored range 0→68 has length 68f, which cannot land on the 22\+17k grid/,
    );
  });

  it("an off-grid pin smuggled past the walk refuses at the film loop with the span voice", () => {
    // a stale or direct caller bypassing the walk — the compose door
    // still refuses before any node builds (zero GPU)
    const walked = def.schema({
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
    }) as Record<string, unknown>;
    ((walked.calls as Array<Record<string, unknown>>)[1]!.knobs as Record<string, unknown>) = { length: 136 };
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_grid_smuggled"),
      /h3-timeline window 2 \(span 56→124\): length 136f is off-grid.*doc-proven geometry is 0→124→243→362/,
    );
  });

  it("an off-grid pin on a single-call doc refuses at the compose carrier (the single-call lift)", () => {
    const walked = def.schema({ calls: [SHOT()] }) as Record<string, unknown>;
    ((walked.calls as Array<Record<string, unknown>>)[0]!.knobs as Record<string, unknown>) = { length: 136 };
    const g = new GraphBuilder();
    // the carrier walk enforces the grid step on the lifted length —
    // the renderer's own gate stands behind it as defense in depth
    assert.throws(
      () => def.compose(walked, model, g, "run_grid_single"),
      /single-call lift: ValidationError: \$\.length expected number multiple of 17 but got 136/,
    );
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

  // ── L3 (007-H3-LoRA-PLANE L3): ONE STEPS LAW for both window
  // paths — the single-window marriage fires only when the caller
  // pinned no steps of their own. A doc-level pin (the schema's
  // __steps_pinned stamp) or a single-call knob pin (the film
  // path's own precedence) keeps the document's steps over the
  // bag's distill default; an unpinned doc still marries. ──
  it("L3 — a single-window doc with explicit steps keeps them over the bag's marriage", () => {
    const bag = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];
    // doc-level pin.
    const g1 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], steps: 20, loras: bag }),
      model, g1, "run_l3_pinned",
    );
    assert.equal(scoped(graphOf(g1), "", "BasicScheduler")[0]![1].inputs.steps, 20,
      "the doc's explicit steps survive the bagged distill");
    // single-call knob pin (the film path's own precedence).
    const g2 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ knobs: { steps: 20 } })], loras: bag }),
      model, g2, "run_l3_knob",
    );
    assert.equal(scoped(graphOf(g2), "", "BasicScheduler")[0]![1].inputs.steps, 20,
      "the call's knob steps survive the bagged distill");
    // unpinned: the marriage still fires (default behavior stands).
    const g3 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], loras: bag }),
      model, g3, "run_l3_unpinned",
    );
    assert.equal(scoped(graphOf(g3), "", "BasicScheduler")[0]![1].inputs.steps, 8,
      "an unpinned doc still takes the bag's steps");
  });

  it("an empty loras bag rides the catalog's DMAD solo (the operator's 2026-10-12 default — 4-step ByteDance distill at 1, never a pair)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ calls: [SHOT()], loras: [] }), model, g, "run_lora_empty");
    const stacks = ofClass(graphOf(g), "LTX_lora_loader");
    assert.ok(stacks.length >= 1);
    const rows = JSON.parse(String(stacks[0]![1].inputs.stack_data)) as Array<{ on?: boolean, lora?: string, str?: number }>;
    const on = rows.filter((r) => r.on === true);
    assert.equal(on.length, 1, "ONE lora rides — never a pair, never a fallback stack");
    assert.ok(String(on[0]!.lora).includes("dmad_minimax_h3_4step"), "the DMAD solo rides (built from the family catalog's h3_dmad_4step row, one owner)");
    assert.equal(on[0]!.str, 1, "at the catalog's default_strength 1");
  });

  // ── THE T3 REFINE RIDER (roadmap item 2): the service-resolved
  // refine row mounts a CLOSING pass — the refiner on its OWN
  // loader (primary stack untouched), short full-denoise schedule
  // from the row's marriage, riding the doc's own solver. Absent
  // row = absent rider (one sampler, the graph exactly as before). ──
  it("the refine rider mounts a closing pass (own loader, the row's marriage, the doc's solver)", () => {
    const g = new GraphBuilder();
    def.compose(
      { ...def.schema({ calls: [SHOT()], second_pass_enabled: true }), refine: { name: "taomate.safetensors", strength: 0.7, steps: 3 } },
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

  // ── THE ATTENTION BACKEND KNOB (roadmap item 3): the non-SLA
  // arm's ModelAttentionBackend follows the declared knob — the
  // estate-proven kitchen literal by default, the engine's
  // enumerated pytorch literal when pinned. (The sage/sol folklore
  // never existed — no knob, no served value; this is the ONE
  // owner of that input now.) ──
  it("attention_backend owns the non-SLA arm's ModelAttentionBackend input", () => {
    const g1 = new GraphBuilder();
    def.compose(
      def.schema({ variant: "t4_open", calls: [SHOT()], sla_switch: false }),
      model, g1, "run_att_default",
    );
    const mab1 = scoped(graphOf(g1), "", "ModelAttentionBackend");
    assert.equal(mab1.length, 1, "the non-SLA arm mounts the backend node");
    assert.equal(mab1[0]![1].inputs.attention, "comfy kitchen attention", "the default is the estate-proven literal");
    const g2 = new GraphBuilder();
    def.compose(
      def.schema({ variant: "t4_open", calls: [SHOT()], sla_switch: false, attention_backend: "pytorch attention" }),
      model, g2, "run_att_pinned",
    );
    const mab2 = scoped(graphOf(g2), "", "ModelAttentionBackend");
    assert.equal(mab2[0]![1].inputs.attention, "pytorch attention", "a pinned value rides verbatim");
  });

  // ── L1 (007-H3-LoRA-PLANE L1): the SLA/attention switch rides
  // ABOVE the LoRA loader on BOTH arms — the old t4 order stacked
  // the loader under the chunked branch only, so the default
  // sla_enabled=true picked the bare SLA model and every bagged
  // LoRA silently did nothing. The loader samples the switch pick
  // (its model input IS the switch output) and feeds the fix-up →
  // shift chain, so the bagged turbo provably reaches the sampler
  // on either arm. (The charter's gate words this "loader upstream
  // of the switch" — the topology it prescribes, and pins here, is
  // the t4r mirror: switch selects, loader samples the pick.) ──
  it("L1 — no arm bypasses the LoRA loader (switch above loader, turbo reaches the sampler)", () => {
    const bag = [{ name: "turbo-8.safetensors", strength: 0.6, steps: 8 }];
    const linkSource = (out: Record<string, Node>, id: string, input: string): string => {
      const link = out[id]!.inputs[input] as [string, number];
      assert.ok(Array.isArray(link), `${id}.${input} is a wire link`);
      return link[0];
    };
    const checkArm = (label: string, out: Record<string, Node>): void => {
      const loaders = ofClass(out, "LTX_lora_loader")
        .filter(([, n]) => String(n.inputs.stack_data ?? "").includes("turbo-8"));
      assert.equal(loaders.length, 1, `${label}: exactly one loader carries the bagged turbo`);
      const loaderId = loaders[0]![0];
      const feeder = out[linkSource(out, loaderId, "model")]!;
      assert.equal(feeder.class_type, "ComfySwitchNode", `${label}: the loader samples the switch pick (switch above loader)`);
      // the fix-up rides the loaded model, the shift rides the
      // fix-up, the scheduler rides the shift — the turbo's wire to
      // the sampler is unbroken.
      const adalns = ofClass(out, "H3AdaLNLoRAFix");
      assert.equal(adalns.length, 1, `${label}: one adaln fix-up rides`);
      const adalnId = adalns[0]![0];
      if (label === "t4r") {
        const previews = ofClass(out, "ModelPreviewOverrideKJ");
        assert.equal(previews.length, 1, "t4r: the preview override rides between loader and fix-up");
        assert.equal(linkSource(out, previews[0]![0], "model"), loaderId, "t4r: the preview rides the loaded model");
        assert.equal(linkSource(out, adalnId, "model"), previews[0]![0], "t4r: the fix-up rides the preview");
      } else {
        assert.equal(linkSource(out, adalnId, "model"), loaderId, "t4: the fix-up rides the loaded model");
      }
      const shifts = ofClass(out, "MiniMaxH3SigmaShift");
      assert.equal(shifts.length, 1, `${label}: one sigma shift rides`);
      assert.equal(linkSource(out, shifts[0]![0], "model"), adalnId, `${label}: the shift rides the fix-up`);
      const scheds = scoped(out, "", "BasicScheduler");
      assert.ok(scheds.some(([id]) => linkSource(out, id, "model") === shifts[0]![0]),
        `${label}: the sampler schedule rides the shifted (loaded) model`);
    };
    // t4 arm at the DEFAULT sla (on) — the defect's own seat.
    const g1 = new GraphBuilder();
    def.compose(def.schema({ calls: [SHOT()], loras: bag }), model, g1, "run_l1_t4");
    checkArm("t4", graphOf(g1));
    // t4r arm (guide + refs imply t4r).
    const g2 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ ref_image: "/m/a.png", refs: { images: ["r1.png"] } })], loras: bag }),
      model, g2, "run_l1_t4r",
    );
    checkArm("t4r", graphOf(g2));
  });

  it("interpolate_enabled doubles the playout fps (the V9 compensation)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], second_pass_enabled: true, interpolate_enabled: true }),
      model, g, "run_interp",
    );
    const created = ofClass(graphOf(g), "CreateVideo");
    assert.ok(created.some(([, n]) => n.inputs.fps === 48), "interp-on windows play at 24×2");
  });

  it("a calls-less door composes the frozen single window", () => {
    const g = new GraphBuilder();
    // (re-pin 2026-11-06, c7bc662b7) calls own prompts — the film-level
    // prompt key is dead at this door; the sole call carries the text.
    def.compose({ variant: "t4_open", calls: [SHOT({ text: "a slow push in" })] }, model, g, "run_nocalls");
    const saves = ofClass(graphOf(g), "SaveVideo");
    assert.ok(saves.some(([, n]) => n.inputs.filename_prefix === "h3_t4_w1"));
  });

  it("a bogus variant at the window door derives its lane (the DERIVED family rides, never a throw)", () => {
    // Same law as the schema arm: an unknown variant string is not
    // a family claim; the single text call derives t4_open and the
    // compose builds THAT lane into the graph (the old throw fired
    // on axis strings like 'timeline').
    const g = new GraphBuilder();
    def.compose({ variant: "bogus", calls: [SHOT()] }, model, g, "run_bogus");
    assert.ok(ofClass(graphOf(g), "PlagueKindBundleIn").length === 0, "no anchor lane (text-only opener)");
  });

  it("t4r without an anchor refuses — unless the refs bundle carries it", () => {
    const g1 = new GraphBuilder();
    assert.throws(
      () => def.compose({ variant: "t4r", calls: [SHOT()] }, model, g1, "run_bare_t4r"),
      /without a staged guide image/,
    );
    const g2 = new GraphBuilder();
    def.compose(
      { variant: "t4r", refs: { images: ["r1.png"] }, calls: [SHOT()] },
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

  it("T6: a doc-level typo REFUSES unknown-param (the entry doc is admitted, not merged silent)", () => {
    // The nested row above is the per-window strictness (schema.ts's
    // CALL_KEYS). The DOC-level law is T6's: a key that is neither
    // a declared knob nor a declared rider (the studio shot vocab,
    // the lora bag, the derive keys, the ctx_* prefix class)
    // refuses, named. The motion_* prefix class is gone (2026-10-12:
    // no reader, no producer, no draft carries one) — its keys
    // refuse like any other unknown word.
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        def.schema({ calls: [{ text: "a push in", start_frame: 0, end_frame: 90 }], motion_prompt: "a retired rail's ghost" } as never),
        model, g, "run_motion_refuses",
      ),
      /motion_prompt/,
    );
    assert.throws(
      () => def.compose(
        def.schema({ calls: [{ text: "a push in", start_frame: 0, end_frame: 90 }], promptt: "typo of prompt" }),
        model, g, "run_doc_typo",
      ),
      /promptt/,
    );
    assert.throws(
      () => def.compose(
        def.schema({ calls: [{ text: "a push in", start_frame: 0, end_frame: 90 }], widht: 9999 }),
        model, g, "run_doc_typo2",
      ),
      /widht/,
    );
    // the riders still serve (a stated variant composes)
    def.compose(
      def.schema({ calls: [{ text: "a push in", start_frame: 0, end_frame: 90 }], variant: "t4_open" }),
      model, new GraphBuilder(), "run_doc_rider",
    );
  });

  it("the post-process knobs ride EXPLICIT and DECLARED (one owner each — the legacy switch aliases are retired)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT()],
        second_pass_enabled: true,
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

  it("a non-string call text REFUSES at the door — type-honest, never a silent coercion onto the run prompt (the no-fallbacks law)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        def.schema({
          calls: [
            { text: "first push", start_frame: 0, end_frame: 56 },
            { text: 123, start_frame: 56, end_frame: 124 },
          ],
        }),
        model, g, "run_junk_text",
      ),
      /a call needs its own text — the film-level prompt is not a fallback/,
    );
  });

  it("THE BED IS GONE (2026-09-22): no MeliteAudioSlice without an audio clip — the rail's fps_seconds gates on its own", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [
          { text: "first push", start_frame: 0, end_frame: 90, knobs: { fps_seconds: 4 } },
          { text: "second push", start_frame: 90, end_frame: 192 },
        ],
      }),
      model, g, "run_nobed_pin",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MeliteAudioSlice").length, 0,
      "a clipless doc wires no slice — the bed exited the card with it");
  });

  it("a non-finite frame number skips the stanza length pin (num() refuses NaN, never crashes)", () => {
    const g = new GraphBuilder();
    // DIRECT compose (pre-walked doc shape): schema()'s own shot laws
    // refuse NaN LOUD for authored docs — this arm is the film
    // renderer's fence for hand-built docs that skipped the walk
    def.compose(
      {
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


// ── THE CLIPS-STITCH (2026-09-21 — the Music row's lost consumer
// restored; 2026-09-24 — the valve's second arm: positioned clips
// ride ONE post-generation MeliteFilmAudioMix, never the in-graph
// stitch). The READ-TRUTH WALL: audio_clips is not merely declared +
// serialized (the ledger's old lie) — the compose CONSUMES it, and
// absent clips leave a byte-identical graph. ──

describe("the clips-stitch (positioned clips land in the post-generation mix node)", () => {
  const CLIP = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "c1", name: "line1.wav", src: "data:audio/wav;base64,AAA", start_frame: 100, dur_frames: 48, ...over,
  });

  it("a clip mixes over the film at its doc seat POST-GENERATION (owner map, no carry — the film clock)", () => {
    const rawClips = [CLIP()];
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: rawClips,
      }),
      model, g, "run_clips_mix",
    );
    const out = graphOf(g);
    // THE VALVE'S SECOND ARM (2026-09-24, the VRAM-leak fix; GAP 1
    // CLOSED same night — the arm delivers the film mp4): the graph
    // keeps the window's conditioning stamp (MeliteAudioSlice → pin)
    // AND renders the film-time mix through ONE MeliteFilmAudioMix
    // (torch, ComfyUI-only — never ffmpeg) fed by the saved window
    // files — no in-graph audio stitch; the VIDEO join is the
    // clips-free arm's own file-tail machinery with the mixed audio
    // wired into CreateVideo → SaveVideo h3_t4_film.
    assert.ok(
      Object.values(out).some((n) => n.class_type === "SaveVideo" && String(n.inputs.filename_prefix) === "h3_t4_film"),
      "the film mp4 saves in-graph (GAP 1 — the video join rides the clips arm)",
    );
    assert.equal(ofClass(out, "MeliteAudioDuck").length, 0, "no in-graph duck — the duck matrix rides the mix node");
    assert.equal(ofClass(out, "MeliteAudioMix").length, 0, "no in-graph mix chain");
    assert.equal(ofClass(out, "MeliteAudioDelay").filter(([id]) => !id.startsWith("window")).length, 0, "no film-level delay");
    assert.equal(ofClass(out, "LoadAudio").filter(([id]) => !id.startsWith("window")).length, 0, "no film-level load");
    // FILM TIME (corrected 2026-09-22 — the D-M-E proof measured
    // the old carry-head formula landing takes 22f late: a take at
    // film f96 overlaid at 4.917s, r=0.85 at the wrong seat, ~0 at
    // the right one). The clip at doc frame 100 rides 100/24 ≈
    // 4.167s with a 2s fit. NO window accounting on the film seat —
    // the conditioning path carries its own window-scoped delay;
    // the film-level seat is unscoped (clip.start IS film time
    // through the owner map).
    const manifest = computeFilmMix({
      spans: [{ start: 0, end: 56 }, { start: 56, end: 124 }],
      clips: parseFilmMixClips(rawClips),
      windowSecs: [56 / 24, 73 / 24],
    });
    assert.deepEqual(manifest.placements.map((p) => [p.filmSec, p.durSec]), [[4.167, 2]]);
    assert.equal(manifest.duckSpanString, "4.167:6.167");
    assert.equal(manifest.musicDuckSpanString, "", "a lone music span never ducks the music bus");
    const mixes = ofClass(out, "MeliteFilmAudioMix");
    assert.equal(mixes.length, 1, "exactly one post-generation mix node");
    assert.equal(mixes[0]![1].inputs.videos, "h3_t4_w1,h3_t4_w2", "the mix names the window files in film order");
    assert.deepEqual(
      JSON.parse(String(mixes[0]![1].inputs.clips_json)),
      [{ src: "data:audio/wav;base64,AAA", start_sec: 4.167, dur_sec: 2, class: "music" }],
      "the clip's own src + the manifest's film seat, fit, and class — verbatim",
    );
    assert.equal(String(mixes[0]![1].inputs.duck_spans), "4.167:6.167", "the duck spans the clip's true film seat");
    assert.equal(String(mixes[0]![1].inputs.music_duck_spans), "", "no voice spans, no music-bus duck");
    assert.equal(mixes[0]![1].inputs.duck_db, -14, "the duck rides the declared default depth");
    const saves = ofClass(out, "SaveAudio");
    assert.equal(saves.length, 1, "the film's audio saves once");
    assert.equal(saves[0]![1].inputs.filename_prefix, "h3_t4_film_audio", "under the film-audio name");
    // THE METER TAP (§39, 2026-09-25): a passthrough MeliteLoudness
    // sits between the mix and its consumers — the save (and the
    // film mux below) carry the METER's output, which is the mix's
    // AUDIO unchanged plus the loudness_lufs reading in the UI dict.
    const meters = ofClass(out, "MeliteLoudness");
    assert.equal(meters.length, 1, "exactly one loudness meter");
    assert.deepEqual(meters[0]![1].inputs.audio, [mixes[0]![0], 0], "the meter taps the mix");
    assert.deepEqual(saves[0]![1].inputs.audio, [meters[0]![0], 0], "the save carries the meter's passthrough (the mix's audio)");
  });

  it("two clips ride one mix node in doc order (clips_json keeps doc order, seats verbatim)", () => {
    const rawClips = [CLIP(), CLIP({ id: "c2", name: "line2.wav", src: "data:audio/mpeg;base64,BBB", start_frame: 0, dur_frames: 24 })];
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: rawClips,
      }),
      model, g, "run_clips_chain",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MeliteFilmAudioMix").length, 1, "one mix node, however many clips");
    assert.equal(ofClass(out, "MeliteAudioMix").length, 0, "no chained in-graph mixes");
    assert.equal(ofClass(out, "MeliteAudioDelay").filter(([id]) => !id.startsWith("window")).length, 0, "no film-level delay per clip");
    assert.equal(ofClass(out, "LoadAudio").filter(([id]) => !id.startsWith("window")).length, 0, "no film-level load per clip");
    // clip 2 at doc frame 0 → 0s seat; clip 1 at doc frame
    // 100 → 100/24 (the corrected clock — never the old 5.083)
    const manifest = computeFilmMix({
      spans: [{ start: 0, end: 56 }, { start: 56, end: 124 }],
      clips: parseFilmMixClips(rawClips),
      windowSecs: [56 / 24, 73 / 24],
    });
    assert.deepEqual(manifest.placements.map((p) => p.filmSec), [4.167, 0]);
    assert.deepEqual(manifest.placements.map((p) => p.filmSec).sort((a, b) => a - b), [0, 4.167]);
    const rows = JSON.parse(String(ofClass(out, "MeliteFilmAudioMix")[0]![1].inputs.clips_json)) as Array<Record<string, unknown>>;
    assert.deepEqual(rows.map((r) => r.start_sec), [4.167, 0], "clips_json keeps doc order at the manifest's film seats");
    assert.deepEqual(rows.map((r) => r.src), ["data:audio/wav;base64,AAA", "data:audio/mpeg;base64,BBB"], "each row carries its own src");
  });

  it("NO clips = NO nodes (absent clips leave a byte-identical graph)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      }),
      model, g, "run_clips_absent",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "LoadAudio").length, 0);
    assert.equal(ofClass(out, "MeliteAudioDelay").length, 0);
    assert.equal(ofClass(out, "MeliteAudioMix").length, 0);
    assert.equal(ofClass(out, "MeliteFilmAudioMix").length, 0, "no mix node without clips");
    assert.equal(ofClass(out, "SaveAudio").length, 0, "no film-audio save without clips");
    // the clips-free arm stays frozen: the file tail assembles the
    // film in-graph (the 27-film precedent — never OOM'd)
    assert.equal(ofClass(out, "MeliteConcatVideos").length, 1, "the file-tail loader still assembles clips-free films");
    assert.ok(
      Object.values(out).some((n) => n.class_type === "SaveVideo" && String(n.inputs.filename_prefix) === "h3_t4_film"),
      "the clips-free film still saves in-graph",
    );
  });

  it("a positioned source-less row refuses at the mix door; a src without start_frame refuses loud", () => {
    assert.throws(
      () => def.compose(
        def.schema({
          calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
          audio_clips: [{ id: "junk", name: "", src: "", start_frame: 10 }],
        }),
        model, new GraphBuilder(), "run_clips_positioned_junk",
      ),
      /audio_clips: a positioned clip row has no src/,
    );
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: [{ noSrc: true }],
      }),
      model, g, "run_clips_junk",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "LoadAudio").length, 0, "an unpositioned junk row rides nowhere");
    assert.equal(ofClass(out, "MeliteAudioSlice").length, 0);
    const g2 = new GraphBuilder();
    assert.throws(
      () => def.compose(
        def.schema({
          calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
          audio_clips: [{ id: "c", name: "x", src: "data:audio/wav;base64,AAA" }],
        }),
        model, g2, "run_clips_no_start",
      ),
      /audio_clips: a clip with src but no numeric start_frame/,
    );
  });

  it("a SINGLE-WINDOW doc with clips REFUSES loud (the mix is a film-path consumer — never a silent skip)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(
        def.schema({
          calls: [SHOT()],
          audio_clips: [CLIP({ start_frame: 0 })],
        }),
        model, g, "run_clips_single",
      ),
      /audio clips ride the FILM path/,
    );
  });
});

// ── THE VALVE'S SECOND ARM (2026-09-24, the VRAM-leak fix; GAP 1
// CLOSED same night — the arm delivers the film mp4): an
// audio-clips doc (a) no longer composes the in-graph film AUDIO
// stitch but DOES emit the file-tail video join, (b) DOES compose
// one post-generation MeliteFilmAudioMix with the clips' spans +
// duck depth wired, (c) windows still free per-window, (d) the film
// mp4 carries the MIXED audio (not the raw concat audio), (e) no
// accumulation node returns. ──

describe("the valve's second arm (audio-carrying films free per-window)", () => {
  const CLIP = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "c1", name: "line1.wav", src: "data:audio/wav;base64,AAA", start_frame: 100, dur_frames: 48, text: "get down, now.", ...over,
  });
  const FILM = {
    calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
  };

  it("(a) the in-graph AUDIO stitch is GONE for audio-clips docs (the video join stays)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ ...FILM, audio_clips: [CLIP()] }), model, g, "run_valve_absent");
    const out = graphOf(g);
    assert.equal(ofClass(out, "MeliteAudioDuck").length, 0, "no in-graph duck");
    assert.equal(ofClass(out, "MeliteAudioMix").length, 0, "no in-graph mix");
    assert.equal(ofClass(out, "MeliteAudioDelay").filter(([id]) => !id.startsWith("window")).length, 0, "no film-level delay");
    assert.equal(ofClass(out, "LoadAudio").filter(([id]) => !id.startsWith("window")).length, 0, "no film-level load");
    // GAP 1: the file-tail VIDEO join rides this arm — one loader,
    // one film-level CreateVideo, the h3_t4_film save.
    assert.equal(ofClass(out, "MeliteConcatVideos").length, 1, "exactly one file-tail video join");
    assert.equal(ofClass(out, "CreateVideo").filter(([id]) => !id.startsWith("window")).length, 1, "exactly one film-level CreateVideo");
    assert.ok(
      Object.values(out).some((n) => n.class_type === "SaveVideo" && String(n.inputs.filename_prefix) === "h3_t4_film"),
      "the film mp4 saves in-graph",
    );
    // the windows themselves still render + save (the valve's law)
    assert.equal(scoped(out, "window1_", "CreateVideo").length, 1, "window 1 still renders");
    assert.equal(scoped(out, "window2_", "CreateVideo").length, 1, "window 2 still renders");
    const saves = Object.entries(out).filter(([, n]) => n.class_type === "SaveVideo");
    assert.deepEqual(
      saves.map(([, n]) => String(n.inputs.filename_prefix)).sort(),
      ["h3_t4_film", "h3_t4_w1", "h3_t4_w2"],
      "the window files + the film mp4 save as video — nothing else",
    );
    const audioSaves = ofClass(out, "SaveAudio");
    assert.equal(audioSaves.length, 1, "exactly one film-audio save");
    assert.equal(audioSaves[0]![1].inputs.filename_prefix, "h3_t4_film_audio", "under the film-audio name");
  });

  it("(b) the mix node carries the clips' spans + duck depth, ordered after every save", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ ...FILM, audio_clips: [CLIP()], duck_depth_db: -22 }), model, g, "run_valve_wired");
    const out = graphOf(g);
    const mixes = ofClass(out, "MeliteFilmAudioMix");
    assert.equal(mixes.length, 1, "exactly one post-generation mix node");
    const manifest = computeFilmMix({
      spans: [{ start: 0, end: 56 }, { start: 56, end: 124 }],
      clips: parseFilmMixClips([CLIP()]),
      windowSecs: stanzaSecs([{ start: 0, end: 56 }, { start: 56, end: 124 }]),
    });
    assert.equal(String(mixes[0]![1].inputs.duck_spans), manifest.duckSpanString, "duck spans verbatim from the manifest");
    assert.equal(String(mixes[0]![1].inputs.music_duck_spans), manifest.musicDuckSpanString, "music-bus spans verbatim");
    assert.equal(mixes[0]![1].inputs.duck_db, -22, "the knob wires the mix node's depth verbatim");
    assert.equal(mixes[0]![1].inputs.film_seconds, manifest.filmSec, "output length = the manifest's film length");
    const rows = JSON.parse(String(mixes[0]![1].inputs.clips_json)) as Array<Record<string, unknown>>;
    assert.equal(rows.length, 1, "one row per clip");
    assert.equal(rows[0]!.start_sec, manifest.placements[0]!.filmSec, "the seat is the manifest's seat");
    // the ordering wire: the mix waits for the chained boundaries
    const afterRef = mixes[0]![1].inputs.after as [string, number];
    assert.ok(Array.isArray(afterRef), "the mix wires the boundary token");
    assert.equal(out[afterRef[0]]!.class_type, "MeliteUnload", "…which is the unload chain's end");
  });

  it("(c) windows still free per-window behind the chained boundaries", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ ...FILM, audio_clips: [CLIP()] }), model, g, "run_valve_free");
    const out = graphOf(g);
    const unloads = ofClass(out, "MeliteUnload");
    assert.equal(unloads.length, 2, "one boundary per window save");
    for (const [, n] of unloads) {
      assert.equal(n.inputs.unload_models, false, "every boundary keeps weights resident (the reload law)");
    }
    // the chain: exactly one head, the mix's loader provably last
    const afterOf = (n: { class_type: string; inputs: Record<string, unknown> }): string | undefined =>
      (n.inputs.after as [string, number] | undefined)?.[0];
    assert.equal(unloads.filter(([, n]) => afterOf(n) === undefined).length, 1, "exactly one chain head");
    const mixAfter = afterOf(ofClass(out, "MeliteFilmAudioMix")[0]![1]);
    const byId = new Map(Object.entries(out));
    let walked = 0;
    let cursor: string | undefined = mixAfter;
    while (cursor !== undefined) {
      assert.equal((byId.get(cursor) as { class_type: string }).class_type, "MeliteUnload", "the mix waits on boundaries only");
      walked += 1;
      cursor = afterOf(byId.get(cursor) as { class_type: string; inputs: Record<string, unknown> });
    }
    assert.equal(walked, unloads.length, "the mix provably waits for EVERY window save");
  });

  it("(d) the film mp4 carries the MIXED audio (GAP 1 — join shape per the clips-free arm)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ ...FILM, audio_clips: [CLIP()] }), model, g, "run_valve_join");
    const out = graphOf(g);
    const mixes = ofClass(out, "MeliteFilmAudioMix");
    assert.equal(mixes.length, 1, "exactly one mix node");
    const joins = ofClass(out, "MeliteConcatVideos");
    assert.equal(joins.length, 1, "exactly one file-tail join");
    assert.equal(joins[0]![1].inputs.videos, "h3_t4_w1,h3_t4_w2", "the join names the window files in film order");
    // the join waits on the same chained boundary token as the mix
    assert.deepEqual(joins[0]![1].inputs.after, mixes[0]![1].inputs.after, "join + mix share the boundary token");
    const created = ofClass(out, "CreateVideo").filter(([id]) => !id.startsWith("window"));
    assert.equal(created.length, 1, "exactly one film-level CreateVideo");
    assert.deepEqual(created[0]![1].inputs.images, [joins[0]![0], 0], "the picture is the join's decoded images");
    const meters = ofClass(out, "MeliteLoudness");
    assert.equal(meters.length, 1, "one passthrough loudness meter rides the mix arm");
    assert.deepEqual(meters[0]![1].inputs.audio, [mixes[0]![0], 0], "the meter taps the mix's output");
    assert.deepEqual(created[0]![1].inputs.audio, [meters[0]![0], 0], "the film's audio is the METER's passthrough (the mix's audio) — never the raw concat audio");
    assert.deepEqual(created[0]![1].inputs.fps, [joins[0]![0], 2], "the clock is the join's fps");
    assert.equal(created[0]![1].inputs.bit_depth, 8, "8-bit, per the clips-free arm");
    const filmSaves = Object.entries(out).filter(
      ([, n]) => n.class_type === "SaveVideo" && String(n.inputs.filename_prefix) === "h3_t4_film",
    );
    assert.equal(filmSaves.length, 1, "exactly one film save");
    assert.deepEqual(filmSaves[0]![1].inputs.video, [created[0]![0], 0], "the save carries the film CreateVideo");
    assert.equal(filmSaves[0]![1].inputs.format, "mp4", "mp4 container");
    assert.equal(filmSaves[0]![1].inputs.codec, "h264", "h264 codec");
  });

  it("(e) no accumulation node returns for audio-clips docs", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ ...FILM, audio_clips: [CLIP()] }), model, g, "run_valve_noaccum");
    const out = graphOf(g);
    const accumulators = Object.entries(out).filter(
      ([, n]) =>
        n.class_type === "MiniMaxH3FiniteSegmentFinalize" &&
        (n.inputs as Record<string, unknown>).accumulated_images !== undefined,
    );
    assert.equal(accumulators.length, 0, "no live-tensor accumulation — windows exist only during generation");
  });
});

// ── THE DIALOGUE HALF (2026-09-21, the second half of the clips
// law): a clip spanning a window CONDITIONS that window — the model
// hears the dialogue (lip sync), the overlay stays the audible
// authority, and the mix DUCKS the generated voice under the real
// clip. The bus is 3 lanes and overflows REFUSE loud. ──

describe("the dialogue conditioning (a clip's window hears it)", () => {
  const CLIP = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "c1", name: "line1.wav", src: "data:audio/wav;base64,AAA", start_frame: 100, dur_frames: 48, ...over,
  });

  it("THE NO-SPEECH INDICATOR (2026-09-24, the operator's gibberish law): a window with no dialogue stamp and no live ref audios carries the card's own 'no speech' marking — model memory is not a seat", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: [CLIP({ text: "finish it, please." })],
      }),
      model, g, "run_no_speech",
    );
    const out = graphOf(g);
    const w1 = scoped(out, "window1_", "MiniMaxH3ReferenceToVideo")[0]!;
    const w2 = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]!;
    const p1 = String(w1[1].inputs.prompt);
    const p2 = String(w2[1].inputs.prompt);
    // window 1: no dialogue reaches it (the clip starts at 100) — the
    // card stamps the indicator itself.
    assert.ok(/No speech or dialogue in this shot/.test(p1), "the speechless window carries the indicator");
    assert.ok(p1.includes("overall_soundscape:"), "it rides the soundscape field");
    // window 2: dialogue-conditioned — the <d> tag, NEVER the marker.
    assert.ok(p2.includes("<d>"), "the dialogue window keeps its tag");
    assert.ok(!/No speech or dialogue in this shot/.test(p2), "the conditioned window is not marked speechless");
  });

  it("an authored indication is honored, never doubled; live ref audios count as audio input", () => {
    // authored spelling → no second stamp
    const g1 = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ text: "a quiet street, no dialogue, wind only" }), SHOT({ start_frame: 56, end_frame: 124 })] }),
      model, g1, "run_no_speech_authored",
    );
    const out1 = graphOf(g1);
    const pr1 = String(scoped(out1, "window1_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.prompt);
    assert.equal(pr1.match(/No speech or dialogue/g)?.length ?? 0, 0, "an authored 'no dialogue' is never doubled");
    // ref audios live on the unstamped window → audio input provided
    const g2 = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ start_frame: 56, end_frame: 124 })],
        ref_audios: ["data:audio/wav;base64,REF"],
      }),
      model, g2, "run_no_speech_refs",
    );
    const out2 = graphOf(g2);
    const pr2 = String(scoped(out2, "window1_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.prompt);
    assert.ok(!/No speech or dialogue in this shot/.test(pr2), "a ref-audio window hears speech input — no marker");
  });

  it("the owning window HEARS the clip: a generation-time slice rides its ref_audios lane (carry-aware)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: [CLIP({ text: "finish it, please." })],
      }),
      model, g, "run_dialogue_cond",
    );
    const out = graphOf(g);
    // window 2 (56-124) owns frames 100-124 of the clip. The window's
    // generation render starts at doc 56 - 22 carry = 34: the clip
    // SOUNDS 2.75s into the window from its own source offset 0 — so
    // the stamp slices source [0, 1.0s) and DELAYS it 2.75s, fitted
    // to the window's generation length (22 + 17*3 = 73f = 3.042s).
    // (corrected 2026-09-22: the first cut sliced the source AT 2.75 —
    // the wrong part of the clip, played immediately)
    const slices = scoped(out, "window2_", "MeliteAudioSlice");
    assert.equal(slices.length, 1, "window 2 carries the dialogue slice");
    assert.equal(slices[0]![1].inputs.start_seconds, 0, "the clip's true head (its source starts at the slice)");
    assert.equal(slices[0]![1].inputs.duration_seconds, 1, "the intersection only");
    assert.equal(slices[0]![1].inputs.audio, "data:audio/wav;base64,AAA", "src verbatim (the walk stages it)");
    // THE DIALOGUE TAG WALL (2026-09-22, the guide's section-8 law):
    // a clip carrying text puts the EXACT words into the window's
    // PROMPT as a timed <d>[English] tag — the mouth's conditioning
    // lives in the prompt (the audio ref supplies the voice); a
    // textless clip never grows a tag.
    {
      const r2v = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]!;
      const pr = String(r2v[1].inputs.prompt);
      assert.ok(pr.includes('<d>[English] finish it, please.</d>'), "the exact words ride the prompt verbatim");
      assert.ok(pr.includes("overall_soundscape:"), "the guide's soundscape field carries the speech note");
      assert.ok(/At 00:02\.750,/.test(pr), "timed at the stamp's local clock (delay 2.75s)");
      const w1r2v = scoped(out, "window1_", "MiniMaxH3ReferenceToVideo")[0]!;
      assert.ok(!String(w1r2v[1].inputs.prompt).includes("<d>"), "window1 (no stamp) carries no tag");
    }
    // THE ONE-CLOCK LAW (2026-09-24, the BRIEF9 cosmetic): an authored
    // sfx text that opens with its own "At MM:SS.mmm," clock must never
    // ride doubled — the stamp's clock is canonical, the authored one
    // is trimmed at the seam.
    {
      const gs = new GraphBuilder();
      def.compose(
        def.schema({
          calls: [SHOT(), SHOT({ start_frame: 56, end_frame: 124 })],
          audio_clips: [CLIP({
            class: "sfx",
            text: "At 00:09.500, the crane horn blasts twice across the yard",
          })],
        }),
        model, gs, "run_one_clock",
      );
      const outs = graphOf(gs);
      const r2v = scoped(outs, "window2_", "MiniMaxH3ReferenceToVideo")[0]!;
      const prompt = String(r2v[1].inputs.prompt);
      const soundscape = prompt.slice(prompt.indexOf("overall_soundscape:"));
      assert.ok(/At 00:02\.750, the crane horn blasts twice/.test(soundscape),
        "the stamp's clock leads the trimmed authored text");
      assert.ok(!soundscape.includes("At 00:09.500"), "the authored clock never doubles");
      assert.equal((soundscape.match(/At 00:/g) ?? []).length, 1, "exactly one clock in the field");
    }
    // THE ONE-FIELD LAW (finding 11, Commission 17, 2026-10-13): a
    // window carrying BOTH a dialogue stamp and an sfx stamp once
    // composed TWO overall_soundscape fields with separate clocks —
    // the format admits one. Both sentences ride a single field,
    // dialogue lane first, each with its own lane clock.
    {
      const gs = new GraphBuilder();
      def.compose(
        def.schema({
          calls: [SHOT(), SHOT({ start_frame: 56, end_frame: 124 })],
          audio_clips: [
            CLIP({ text: "finish it, please." }),
            CLIP({ id: "c2", name: "blast.wav", class: "sfx", text: "a sudden explosion rocks the room", start_frame: 60, dur_frames: 24 }),
          ],
        }),
        model, gs, "run_one_field",
      );
      const outs = graphOf(gs);
      const prompt = String(scoped(outs, "window2_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.prompt);
      assert.equal((prompt.match(/overall_soundscape:/g) ?? []).length, 1,
        "both lanes ride ONE overall_soundscape field (never two)");
      assert.ok(prompt.includes('<d>[English] finish it, please.</d>'), "the dialogue sentence rides the field");
      assert.ok(/overall_soundscape:[\s\S]*At [\d:.]+, the on-screen speaker says/.test(prompt),
        "the dialogue sentence leads the field");
      assert.ok(/At [\d:.]+, a sudden explosion rocks the room/.test(prompt),
        "the sfx sentence rides the same field at its own lane clock");
      const field = prompt.slice(prompt.indexOf("overall_soundscape:"));
      assert.equal((field.match(/At \d{2}:/g) ?? []).length, 2,
        "two lane clocks inside the one field (the one-clock law bounds a text, not the field)");
    }
    // THE PINNED GUIDE (rewired 2026-09-22): the slice rides an
    // audio-only MiniMaxH3AddGuide keyframe at the clip's
    // generation-frame index (delay 2.75s = frame 66) — the model's
    // own timeline holds the speech; the ref lanes are free.
    const guides = scoped(out, "window2_", "MiniMaxH3AddGuide");
    assert.equal(guides.length, 1, "the stamped window pins its dialogue as a keyframe");
    assert.equal(guides[0]![1].inputs.frame_idx, 66, "anchored at the clip's generation-frame index");
    assert.deepEqual(
      guides[0]![1].inputs.audio,
      [slices[0]![0], 0],
      "the guide carries the true source segment",
    );
    assert.equal(scoped(out, "window2_", "MeliteAudioDelay").length, 0, "no dialogue delay node — the pin places it, not silence");
    const r2v = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]!;
    const lane0 = JSON.stringify(r2v[1].inputs["ref_audios.ref_audio_0"] ?? null);
    assert.ok(!lane0.includes("MeliteAudioSlice") && !lane0.includes("MeliteAudioDelay"), "no dialogue artifact rides a ref lane anymore");
    // window 1 never hears it (the clip starts at 100, window 1 ends at 56)
    assert.equal(scoped(out, "window1_", "MeliteAudioSlice").length, 0);
  });

  it("THE STAMPED SEAM WALL (2026-09-22): a stamped window still chains — t4r films keep the drift-control continuation AND the carried-head trim (the film join moved to disk)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: [CLIP()],
      }),
      model, g, "run_dialogue_seam",
    );
    const out = graphOf(g);
    // the stamp routes window 2 to t4r — the seam must NOT care
    // (the regression this wall pins: the gate was t4_chain-only and
    // a stamped film silently rendered independent windows, hard-
    // concatenated — the operator caught it on the proof film)
    const cont = scoped(out, "window2_", "MiniMaxH3FiniteLatentContinuation");
    assert.equal(cont.length, 1, "the stamped window still anchors on window 1's latent");
    assert.equal(cont[0]![1].inputs.overlap_frames, 22, "the drift-control carry at its proven default");
    assert.equal(cont[0]![1].inputs.continue_audio_latent, true, "the audio latent rides the soft release");
    const fin = scoped(out, "window2_", "MiniMaxH3FiniteSegmentFinalize");
    assert.equal(fin.length, 1, "the window's own clip finalize (the head trim)");
    assert.equal(fin[0]![1].inputs.overlap_frames, 22, "the carried head leaves picture and sound");
    assert.equal(fin[0]![1].inputs.trim_audio_head, true, "a clip never replays the seam it grew from");
    // the film level yields nothing in-graph: the carried overlap
    // already left the window's own clip, and the estate joins the
    // window files from disk (windows only, even stamped)
    const tail = ofClass(out, "MiniMaxH3FiniteAudioTrimTail");
    assert.equal(tail.length, 0, "no previous-film tail yields in-graph");
    assert.equal(ofClass(out, "AudioConcat").length, 0, "no in-graph audio join");
    // AND the stamp itself survives the family routing (both halves
    // of the interaction, one graph)
    assert.equal(scoped(out, "window2_", "MeliteAudioSlice").length, 1, "the dialogue slice still rides");
    assert.equal(scoped(out, "window2_", "MiniMaxH3ReferenceToVideo").length, 1, "the r2v arm still renders it");
  });

  it("the generated voice DUCKS under the conditioned clip at film time (the doubling fix lives in the manifest)", () => {
    const rawClips = [CLIP()];
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: rawClips,
      }),
      model, g, "run_dialogue_duck",
    );
    const out = graphOf(g);
    // THE DOUBLING FIX, POST-GENERATION (2026-09-24): the mix node's
    // duck_spans ride the film track — the generated voice yields
    // under the take the window was conditioned on. No in-graph
    // duck node exists; the edge shape (20ms attack / 350ms release
    // — the console law) is node-owned (film_mix.py's docstring).
    assert.equal(ofClass(out, "MeliteAudioDuck").length, 0, "no in-graph duck — the matrix rides the mix node");
    // the clip's FULL film span ducks (100/24 ≈ 4.167s for 2s =
    // 48 frames — the corrected clock; the old 5.083 carried the
    // phantom +22f and ducked the wrong seat)
    const manifest = computeFilmMix({
      spans: [{ start: 0, end: 56 }, { start: 56, end: 124 }],
      clips: parseFilmMixClips(rawClips),
      windowSecs: [56 / 24, 73 / 24],
    });
    assert.equal(manifest.duckSpanString, "4.167:6.167");
    assert.equal(manifest.duckDb, -14, "the declared default rides when the knob is unset");
    const mix = ofClass(out, "MeliteFilmAudioMix")[0]!;
    assert.equal(String(mix[1].inputs.duck_spans), "4.167:6.167", "the mix ducks the clip's true film seat");
    assert.equal(mix[1].inputs.duck_db, -14, "the mix rides the declared default depth");
  });

  it("duck depth is a KNOB (roadmap §14): duck_depth_db rides the manifest, the declared default −14 (never a pinned literal)", () => {
    const rawClips = [CLIP()];
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: rawClips,
        duck_depth_db: -22,
      }),
      model, g, "run_duck_knob",
    );
    assert.equal(ofClass(graphOf(g), "MeliteFilmAudioMix")[0]![1].inputs.duck_db, -22, "the knob wires the mix node's depth verbatim");
    const gated = def.schema({
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      audio_clips: rawClips,
      duck_depth_db: -22,
    }) as Record<string, unknown>;
    const manifest = computeFilmMix({
      spans: [{ start: 0, end: 56 }, { start: 56, end: 124 }],
      clips: parseFilmMixClips(rawClips),
      windowSecs: [56 / 24, 73 / 24],
      duckDb: gated.duck_depth_db as number,
    });
    assert.equal(manifest.duckDb, -22, "the knob's value rides the manifest verbatim");
    // the knob is DECLARED on the schema (the studio-contract law: no
    // UI fiction the door would drop)
    const spec = def.schema({}) as Record<string, unknown>;
    assert.ok(
      Object.keys(spec).includes("duck_depth_db"),
      "duck_depth_db normalizes through the schema door",
    );
  });

  it("a MUSIC-ONLY clip no window hears still overlays POST-GENERATION (never a duck — nothing doubles)", () => {
    const rawClips = [CLIP({ start_frame: 500, dur_frames: 100 })];
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: rawClips,
      }),
      model, g, "run_music_only",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MeliteAudioDuck").length, 0, "no doubling case, no duck");
    assert.equal(ofClass(out, "MeliteAudioSlice").length, 0, "no window hears it");
    assert.equal(ofClass(out, "MeliteAudioMix").length, 0, "no in-graph mix — the overlay rides the mix node");
    const mixes = ofClass(out, "MeliteFilmAudioMix");
    assert.equal(mixes.length, 1, "the mix node still overlays it — a graph output, not a side-effect");
    assert.equal(String(mixes[0]![1].inputs.duck_spans), "", "an unheard clip never ducks");
    const rows = JSON.parse(String(mixes[0]![1].inputs.clips_json)) as Array<Record<string, unknown>>;
    assert.equal(rows.length, 1, "the unheard clip still loads at film time — through clips_json");
    const manifest = computeFilmMix({
      spans: [{ start: 0, end: 56 }, { start: 56, end: 124 }],
      clips: parseFilmMixClips(rawClips),
      windowSecs: [56 / 24, 73 / 24],
    });
    assert.equal(manifest.placements.length, 1, "the overlay still places it");
    assert.ok(manifest.placements[0]!.durSec > 0, "its own length rides");
    assert.equal(manifest.duckSpans.length, 0, "an unheard clip never ducks");
  });

  it("dur-0 clips are overlay-only: no window hears them, no duration fit — both classes ride the node's unfitted arm", () => {
    const rawClips = [
      CLIP({ dur_frames: 0, text: "get down, now." }),
      CLIP({ id: "m0", src: "data:audio/mpeg;base64,CCC", dur_frames: 0 }),
    ];
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        audio_clips: rawClips,
      }),
      model, g, "run_dur0",
    );
    const out = graphOf(g);
    assert.equal(ofClass(out, "MeliteAudioSlice").length, 0, "a dur-0 clip cannot size a slice — no stamp, no pin");
    assert.equal(ofClass(out, "MeliteAudioDuck").length, 0, "nothing conditioned, nothing doubles, no duck");
    const mixes = ofClass(out, "MeliteFilmAudioMix");
    assert.equal(mixes.length, 1, "both classes still place at film time — through the one mix node");
    const rows = JSON.parse(String(mixes[0]![1].inputs.clips_json)) as Array<Record<string, unknown>>;
    assert.equal(rows.length, 2, "both classes ride clips_json");
    for (const r of rows) {
      assert.equal(r.dur_sec, 0, "dur_sec 0 = the unfitted arm (full length, never a fit)");
    }
    assert.equal(String(mixes[0]![1].inputs.duck_spans), "", "dur-0 never conditions, never ducks");
  });

  it("sla_enabled=false forces the chunked path: the t4r SLA selector rides the literal true", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [
          SHOT({ image: "/m/guide.png" }),
          SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 }),
        ],
        sla_enabled: false,
      }),
      model, g, "run_sla_off",
    );
    const sel = ofClass(graphOf(g), "ComfySwitchNode")
      .filter(([, n]) => n.inputs.switch === true);
    assert.equal(sel.length, 1, "exactly one switch rides the scalar true — the t4r SLA-off (chunked) selector; the t4 arm's master switch rides false (the dense arm)");
  });

  it("the wire-literal wall: a junk interpolate_enabled string refuses loud at the schema door", () => {
    assert.throws(
      () => def.schema({ interpolate_enabled: "junk" }),
      /interpolate_enabled must be a boolean or the wire literal "true"\/"false"/,
    );
  });

  it("THE GRID GATE on a non-numeric pin: refuses with the neutral 124 as the nearest legal length", () => {
    assert.throws(
      () => def.compose(
        def.schema({
          calls: [SHOT(), SHOT({ text: "pinned", start_frame: 56, end_frame: 124, knobs: { length: "forever" } })],
        }),
        model, new GraphBuilder(), "run_grid_junk",
      ),
      /nearest legal: 124f/,
    );
  });

  it("THE DOOR GUARD ON THE BUS (2026-09-22, the operator's overlap law; the bed arm retired with the bed): a dialogue-stamped window mutes the user audios — the guide owns the dialogue", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({
          text: "then a turn", start_frame: 56, end_frame: 124,
          refs: { audios: ["a.mp3", "b.mp3"] },
        })],
        audio_clips: [CLIP({ text: "get down, now." })],
      }),
      model, g, "run_bus_fits",
    );
    const out = graphOf(g);
    const r2v = scoped(out, "window2_", "MiniMaxH3ReferenceToVideo")[0]!;
    const slices = scoped(out, "window2_", "MeliteAudioSlice");
    // only the dialogue slice; the user audios are MUTED on
    // this voice-pinned window (their lanes revert to the bundle's
    // own outputs — the door guard, never a silent fourth lane)
    assert.equal(slices.length, 1, "the dialogue slice, and nothing else — no bed exists to cut");
    const dialogueSlice = slices.find(([, n]) => n.inputs.audio === "data:audio/wav;base64,AAA")!;
    const guides = scoped(out, "window2_", "MiniMaxH3AddGuide");
    assert.equal(guides.length, 1, "the dialogue rides the pinned guide");
    assert.deepEqual(guides[0]![1].inputs.audio, [dialogueSlice[0], 0], "the guide carries the dialogue slice");
    const w2Loads = scoped(out, "window2_", "LoadAudio")
      .filter(([, n]) => String(n.inputs.audio) === "a.mp3" || String(n.inputs.audio) === "b.mp3");
    assert.equal(w2Loads.length, 0, "the user audios stand down on the pinned window (the stanza declared them; the guard stripped them)");
  });
});
