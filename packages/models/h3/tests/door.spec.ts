// @melite/models-h3 — the film action's facts door: the resolved
// lane_inputs parse into the closed engine shape, and drift (a
// missing lane file, a blank string, a non-string) refuses loud at
// instantiate — never a silent route to a stock lane.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { film, parseH3Facts } from "../src/actions.ts";
import { schema as h3schema } from "../src/schema.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { assertWiringAgainst, deriveWiringDoc } from "@melite/comfyui-cordis/comfyui-wiring";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

// THE DMAD-LESS CATALOG (the absent-bag default's load refusal):
// the default stack derives from the family's own lora catalog, so
// a catalog that lost the DMAD row must refuse loud. The filter
// keeps every other row — only the default's source is gone.
vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_dmad_4step") };
});

// The window driver's model row — the interpreter's own contract
// (facts door + seed mint + segment factory, the production path).
// No variants/groups/outputs: the film window routes by lane_inputs
// alone, and the interpreter reads no variant cell on this path.
const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
};

const LANE = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
};

describe("the h3 film action's facts door", () => {
  it("parses the row's unet + the package const's three lane files into the closed engine shape", () => {
    const facts = parseH3Facts(LANE);
    expect(facts).toEqual({
      unet: LANE.unet,
      clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
      vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
      vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
    });
  });

  it("a missing unet refuses loud, naming the key", () => {
    expect(() => parseH3Facts({ ...LANE, unet: undefined }))
      .toThrow(/lane_inputs\.unet = undefined .* non-empty string/);
  });

  it("a blank lane filename refuses loud (an empty weight is no weight)", () => {
    expect(() => parseH3Facts({ ...LANE, unet: "   " })).toThrow(/lane_inputs\.unet = "   ".*non-empty string/);
  });

  it("a non-string lane value refuses loud (never coerced)", () => {
    expect(() => parseH3Facts({ ...LANE, unet: 42 })).toThrow(/lane_inputs\.unet = 42.*non-empty string/);
  });

  it("an absent lane row refuses loud (a family that ships no lane_inputs parses no facts)", () => {
    expect(() => parseH3Facts(undefined)).toThrow(/lane_inputs\.unet = undefined .* non-empty string/);
  });

  it("the film action declares the seed sentinel (GATE S) and the video output", () => {
    expect(film.id).toBe("film");
    expect(film.inputs).toEqual([]);
    expect(film.outputs).toEqual([{ name: "video", kind: "VIDEO" }]);
    // THE DECLARED SURFACE (phase 2): the full write plane — the
    // seed row keeps the sentinel rule, the timeline's own JSON row
    // params stay off it (their validators own them).
    const seedRow = film.params.find((row) => row.name === "seed");
    expect(seedRow).toEqual({ name: "seed", type: "number", rule: "seed-sentinel" });
    expect(film.params.length).toBeGreaterThan(40);
    expect(film.params.find((row) => row.name === "steps")).toEqual({ name: "steps", type: "number", bounds: [4, 30] });
    expect(film.params.find((row) => row.name === "sla_enabled")).toEqual({ name: "sla_enabled", type: "boolean" });
    expect(film.facts).toBe(parseH3Facts);
  });
});

describe("the film build's single-window arms (no calls wrapper)", () => {
  it("THE EMPTY-BAG LAW (J1): an explicit [] composes an EMPTY stack — no loras load, no default resurrection", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42, loras: [] },
      WINDOW_MODEL, g, "run_empty_bag",
    );
    const loaders = Object.entries(g.toJSON()).filter(([, n]) => n.class_type === "LTX_lora_loader");
    expect(loaders.length).toBeGreaterThan(0);
    // the wire carries an empty stack — the catalog's default row is
    // NEVER consulted for an explicit empty bag (the mock strips the
    // catalog: reaching for the default would refuse right here)
    expect(loaders[0]![1].inputs.stack_data).toBe("[]");
  });

  it("THE ABSENT-BAG POLE: unset loras rides the family default (no catalog row refuses loud — the default has no source)", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      { variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42 },
      WINDOW_MODEL, g, "run_no_turbo",
    )).toThrow(/the lora catalog has no 'h3_dmad_4step' row/);
  });

  it("a calls-less window marries the bag's steps (no call knobs to consult, the doc face reads the bag)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }],
      },
      WINDOW_MODEL, g, "run_nocalls_steps",
    );
    const schedulers = Object.entries(g.toJSON()).filter(([, n]) => n.class_type === "BasicScheduler");
    expect(schedulers.length).toBeGreaterThan(0);
    expect(schedulers[0]![1].inputs.steps).toBe(8);
  });
});

describe("the two-clocks law (2026-10-16 — 'the timeline bar says 5 seconds, the result is 10 seconds of mush')", () => {
  const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];

  it("a stale pinned fps_seconds never outlives the span — the render clock derives from the bar, every compose", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_chain",
        calls: [
          { text: "a slow push in", start_frame: 0, end_frame: 124, image: "anchor.png", knobs: { fps_seconds: 10 } },
          { text: "the crowd turns", start_frame: 124, end_frame: 243, image: "turn.png", knobs: { fps_seconds: 10 } },
        ],
        loras: BAG, seed: 42,
      },
      WINDOW_MODEL, g, "run_stale_clock",
    );
    const doc = g.toJSON() as Record<string, { class_type: string, inputs: Record<string, unknown> }>;
    // THE RENDER CLOCK, judged where it feeds the generation: every
    // ComfyMathExpression's values.a is a PrimitiveFloat link — its
    // value must state the span's own seconds (124f first window
    // = 5.167s; carried 119f + 22f seam = 141f = 5.875s),
    // never the stale 10s pin the knob carried
    const exprs = Object.entries(doc).filter(([, n]) => n.class_type === "ComfyMathExpression");
    expect(exprs.length, "one expression per window").toBe(2);
    // ORDER-BOUND (tautology sweep, 2026-10-16): the old 2-value
    // allowlist could not see a SWAP — window 1 booked at the seam's
    // seconds stayed green. Node insertion follows render order, so
    // the feeds pin per-window: first window 5.167, seam 5.875.
    const orderedFeeds = exprs.map(([, n]) => {
      const link = n.inputs["values.a"] as [string, number];
      const feed = doc[String(link[0])];
      expect(feed.class_type).toBe("PrimitiveFloat");
      return feed.inputs.value;
    });
    expect(orderedFeeds).toEqual([5.167, 5.875]);
    // NO STALE CLOCK NODE EXISTS AT ALL — a 10-second PrimitiveFloat
    // anywhere in the film is the operator's mush, refused at zero GPU
    const stale = Object.values(doc).filter(
      (n) => n.class_type === "PrimitiveFloat" && n.inputs.value === 10,
    );
    expect(stale).toEqual([]);
  });

  it("an UNSTATED fps_seconds never seeds the old schema default — the derivation owns the row for knob-less docs too", () => {
    // THE SECOND TOOTH, its own firing arm: the old schema row
    // carried .default(10) — every knob-less doc seeded a 10-second
    // clock the render obeyed (the operator's uniform-10s mush under
    // a 5-second bar). The default is dead and the compose derives
    // the row from the actual window length — this arm composes the
    // same film with NO fps_seconds knob anywhere and judges the
    // same render clock.
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_chain",
        calls: [
          { text: "a slow push in", start_frame: 0, end_frame: 124, image: "anchor.png" },
          { text: "the crowd turns", start_frame: 124, end_frame: 243, image: "turn.png" },
        ],
        loras: BAG, seed: 42,
      },
      WINDOW_MODEL, g, "run_unstated_clock",
    );
    const doc = g.toJSON() as Record<string, { class_type: string, inputs: Record<string, unknown> }>;
    const exprs = Object.entries(doc).filter(([, n]) => n.class_type === "ComfyMathExpression");
    expect(exprs.length).toBe(2);
    const feeds = exprs.map(([, n]) => {
      const link = n.inputs["values.a"] as [string, number];
      return doc[String(link[0])]!.inputs.value;
    });
    expect(feeds).toEqual([5.167, 5.875]);
  });
});

describe("ONE CLOCK, BOTH ARMS (2026-10-16 — the single-call burn: 'it works without a keyframe, breaks when I add one' + 'the call was 90 frames, only 4 seconds came out')", () => {
  const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];
  type Doc = Record<string, { class_type: string, inputs: Record<string, unknown> }>;

  // THE ESTATE'S REAL SHAPE: the door's schema() walk runs BEFORE the
  // action (fills declared defaults, stamps the explicit-keys facts)
  // — the wall rides the same sequence the run does, never the raw
  // unwalked doc (a raw doc has no default fill; judging it would
  // test a path no run ever takes).
  const composeSingle = (extra: Record<string, unknown>): Doc => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({
        variant: undefined,
        calls: [
          { text: "the courier steps in", start_frame: 0, end_frame: 90, ...("image" in extra ? { image: "anchor.png" } : {}) },
        ],
        loras: BAG, seed: 42,
        ...extra,
      }),
      WINDOW_MODEL, g, "run_single",
    );
    return g.toJSON() as Doc;
  };

  it("THE 400 CURE: a single-call t4r doc with NO fps_seconds composes — the clock derives at the render seat, never undefined on the wire", () => {
    // The removed .default(10) left the frozen single-window arm
    // serializing PrimitiveFloat{value: undefined} — the engine's
    // 400 Bad Request on every keyframed/guided single-call doc
    // (works without the guide: t4_open never builds the seconds
    // node). The derivation now lives at renderH3Window's own head —
    // BOTH arms, one owner.
    const doc = composeSingle({ image: "anchor.png" });
    const exprs = Object.entries(doc).filter(([, n]) => n.class_type === "ComfyMathExpression");
    expect(exprs.length, "the t4r arm builds the seconds expression").toBe(1);
    const link = exprs[0]![1].inputs["values.a"] as [string, number];
    const feed = doc[String(link[0])];
    expect(feed.class_type).toBe("PrimitiveFloat");
    expect(feed.inputs.value, "90 frames = 3.75s — the span's own seconds").toBe(3.75);
    // THE 400-KILLER CLASS, judged graph-wide: no PrimitiveFloat
    // anywhere carries undefined — that value IS the engine's refusal
    const undef = Object.values(doc).filter(
      (n) => n.class_type === "PrimitiveFloat" && typeof n.inputs.value !== "number",
    );
    expect(undef).toEqual([]);
  });

  it("FRAMES ARE LAYER B: a stale doc-level length never outrides the single call's span (t4r seat)", () => {
    // The operator's screen: header 5.6s (the authored 90-frame span)
    // vs a stale Layer-A length knob tied to nothing. Before the
    // sole-call span lift, the frozen arm rendered the doc's length
    // — 56 here (stale but grid-legal, so it RAN): the clock feed
    // would state 2.333s. The span owns the window: 90f = 3.75s.
    const doc = composeSingle({ image: "anchor.png", length: 56 });
    const exprs = Object.entries(doc).filter(([, n]) => n.class_type === "ComfyMathExpression");
    const link = exprs[0]![1].inputs["values.a"] as [string, number];
    expect(doc[String(link[0])]!.inputs.value).toBe(3.75);
  });

  it("FRAMES ARE LAYER B, the non-reference seat: the generator's length input rides the span, not the doc row", () => {
    // t4_open (no guide, no refs): the length rides the generator
    // node directly — judged at that seat, 90 (the span's snap),
    // never the stale 56.
    const doc = composeSingle({ length: 56 });
    const gens = Object.values(doc).filter(
      (n) => /ImageToVideo|ReferenceToVideo/.test(n.class_type),
    );
    expect(gens.length).toBe(1);
    expect(gens[0]!.inputs.length).toBe(90);
  });

  it("FPS IS LAYER A: the doc's stated fps rides every output container — and the declared default fills unstated docs", () => {
    // The old hardcoded 24 played a 90-frame window at 3.75s under a
    // 5.6s bar (the operator's 'only 4 seconds came out'). The
    // container clock is the PROJECT's — stated 16 rides 16.
    const stated = composeSingle({ image: "anchor.png", fps: 16 });
    const cv16 = Object.values(stated).filter((n) => n.class_type === "CreateVideo");
    // LENGTH GUARD (tautology sweep, 2026-10-16): an unguarded for-loop
    // over an empty filter is the vacuous-truth class — the arm would
    // pass green while judging nothing if CreateVideo ever stopped
    // riding this path
    expect(cv16.length, "the single-call compose emits output containers").toBeGreaterThan(0);
    for (const n of cv16) {
      const f = n.inputs.fps;
      if (Array.isArray(f)) {
        const src = stated[String(f[0])];
        expect(src.class_type).toBe("PrimitiveFloat");
        expect(src.inputs.value).toBe(16);
      } else {
        expect(f).toBe(16);
      }
    }
    // THE BAR-CLOCK LAW (audit f1cc1197): the seconds seat derives at
    // THE DOC'S OWN CLOCK — /24 under a stated 16 booked 3.75s while
    // the clip PLAYED 5.625s (the '4 seconds came out' burn's second
    // face). This t4r window: 90 frames at 16 = 5.625s exactly. A
    // reverted divisor reds here with the stale 3.75.
    const secs16 = Object.values(stated)
      .filter((n) => n.class_type === "PrimitiveFloat")
      .map((n) => (n.inputs as Record<string, unknown>).value);
    expect(secs16).toContain(5.625);
    // unstated: the DECLARED default (24) — the walk fills it, never
    // a silent ?? in the compose
    const unstated = composeSingle({ image: "anchor.png" });
    const cvU = Object.values(unstated).filter((m) => m.class_type === "CreateVideo");
    expect(cvU.length, "the unstated arm's container census").toBeGreaterThan(0);
    for (const n of cvU) {
      const f = n.inputs.fps;
      if (Array.isArray(f)) {
        expect(unstated[String(f[0])].inputs.value).toBe(24);
      } else {
        expect(f).toBe(24);
      }
    }
    // THE NON-REFERENCE SEAT (audit f1cc1197, 2026-10-16 — the
    // dead-store lie): a text-only window rides the ELSE arm's
    // CreateVideo, whose fps was a hardcoded 24 while the
    // `fpsInput = p.fps` "cure" sat two blocks above it, never read
    // on this path. This arm burns on that revert — the container
    // rides the doc's 16, scalar seat included.
    const textOnly = composeSingle({ prompt: "a text window", fps: 16 });
    const cvT = Object.values(textOnly).filter((m) => m.class_type === "CreateVideo");
    expect(cvT.length, "the text-only arm's container census").toBeGreaterThan(0);
    for (const n of cvT) {
      const f = n.inputs.fps;
      if (Array.isArray(f)) {
        expect(textOnly[String(f[0])].inputs.value).toBe(16);
      } else {
        expect(f).toBe(16);
      }
    }
  });

  it("THE USER'S STEPS NEVER LOSES TO THE BAG (the marriage consults the pin, BOTH arms)", () => {
    // Operator 2026-10-16: "I SET STEPS TO SIX. IT STILL DOES ONLY
    // FOUR STEPS." The distill bag carries steps:4; the marriage
    // exists to apply it when the user stated NOTHING. The
    // single-window arm consulted the walk's __steps_pinned stamp;
    // the film loop did not — every multi-call film stomped the
    // doc-level steps. One law, both arms: a stated steps (doc or
    // per-call knob) wins; the bag applies only to the unstated.
    const schedSteps = (doc: Doc): Array<unknown> =>
      Object.values(doc)
        .filter((n) => n.class_type === "BasicScheduler")
        .map((n) => n.inputs.steps);
    // film: doc-level 6, bag 4 — every window's scheduler rides 6
    const g = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({
        variant: undefined, steps: 6,
        calls: [
          { text: "a slow push in", start_frame: 0, end_frame: 90 },
          { text: "the crowd turns", start_frame: 90, end_frame: 175 },
        ],
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 4 }], seed: 1,
      }),
      WINDOW_MODEL, g, "run_steps_film",
    );
    expect(schedSteps(g.toJSON() as Doc)).toEqual([6, 6]);
    // single-call: doc-level 6 — the sole-call shape, same law
    const gs = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({
        variant: undefined, steps: 6,
        calls: [{ text: "a slow push in", start_frame: 0, end_frame: 90 }],
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 4 }], seed: 1,
      }),
      WINDOW_MODEL, gs, "run_steps_single",
    );
    expect(schedSteps(gs.toJSON() as Doc)).toEqual([6]);
    // UNSTATED: the bag applies (the marriage's lawful arm — the
    // distill's count is the point of boarding it)
    const gu = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({
        variant: undefined,
        calls: [{ text: "a slow push in", start_frame: 0, end_frame: 90 }],
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 4 }], seed: 1,
      }),
      WINDOW_MODEL, gu, "run_steps_unstated",
    );
    expect(schedSteps(gu.toJSON() as Doc)).toEqual([4]);
    // THE THIRD SHAPE (journey audit 72b1d88a finding 1, the
    // second-burn rule): the k-marked frozen multi-call doc renders
    // window k on the doc surface — its row is calls[k-1]. Before
    // the cure the row's knobs and span died unread and the bag
    // stomped a knob-pinned 6; unwalled only because no studio
    // gesture authors the shape (the agent plane does).
    const gk = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({
        variant: undefined, k: 2,
        calls: [
          { text: "a slow push in", start_frame: 0, end_frame: 90 },
          { text: "the crowd turns", start_frame: 90, end_frame: 175, knobs: { steps: 6 } },
        ],
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 4 }], seed: 1,
      }),
      WINDOW_MODEL, gk, "run_steps_kmarked",
    );
    expect(schedSteps(gk.toJSON() as Doc)).toEqual([6], "the frozen window's OWN knob steps wins over the bag");
    // the inverse-cheat guard: no knob steps on the row → the bag's
    // 4 applies (the marriage's lawful arm holds on this shape too)
    const gki = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({
        variant: undefined, k: 2,
        calls: [
          { text: "a slow push in", start_frame: 0, end_frame: 90 },
          { text: "the crowd turns", start_frame: 90, end_frame: 175 },
        ],
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 4 }], seed: 1,
      }),
      WINDOW_MODEL, gki, "run_steps_kmarked_unstated",
    );
    expect(schedSteps(gki.toJSON() as Doc)).toEqual([4]);
    // and the row's SPAN owns the window length (the lift runs for
    // the frozen window's row, same as the sole call): window 2's
    // 90→180 = 90 frames
    const gens = Object.values(gk.toJSON() as Doc)
      .filter((n) => /ImageToVideo|ReferenceToVideo/.test(n.class_type));
    expect(gens[0]!.inputs.length).toBe(90);
  });

  // THE STATED-FAMILY BYPASS (calls-stanza audit #2, 2026-10-16): a
  // doc stating variant verbatim skips the schema walk's ENTIRE
  // shot-law sweep (every row/span law guards on variant ===
  // undefined), and the film loop's old ef > sf guard then SILENTLY
  // skipped assertSpanGrid and the length lift for a reversed span —
  // the window rendered at the doc length with a span the manifest
  // booked backwards. The loop's floor now refuses LOUD: a stated
  // pair that does not advance never composes.
  it("THE STATED-FAMILY BYPASS'S LOUD FLOOR: a reversed span under a stated variant refuses — never the silent skip", () => {
    // 2+ calls rides the FILM LOOP (isFilm) — the arm whose old
    // ef > sf guard silently skipped the span laws
    expect(() => {
      const g = new GraphBuilder();
      instantiateAction(
        film,
        h3schema({
          variant: "t4_open",
          calls: [
            { text: "a slow push in", start_frame: 0, end_frame: 90 },
            { text: "the crowd turns", start_frame: 175, end_frame: 90 },
          ],
          loras: BAG, seed: 1,
        }),
        WINDOW_MODEL, g, "run_reversed_stated",
      );
    }).toThrow(/window 2: reversed span \(end_frame 90 <= start_frame 175\)/);
    // the equal-span pole (an empty window) refuses under the same
    // floor — the walk's own "reversed/empty" law, one voice
    expect(() => {
      const g = new GraphBuilder();
      instantiateAction(
        film,
        h3schema({
          variant: "t4_chain",
          calls: [
            { text: "a slow push in", start_frame: 0, end_frame: 90 },
            { text: "the crowd turns", start_frame: 45, end_frame: 45 },
          ],
          loras: BAG, seed: 1,
        }),
        WINDOW_MODEL, g, "run_empty_stated",
      );
    }).toThrow(/window 2: reversed span \(end_frame 45 <= start_frame 45\)/);
  });
});

describe("the refmod seat (audit 010/R1, 2026-10-18)", () => {
  const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];

  it("THE BOOLEAN FLIP (2026-10-16, upstream parity F1): H3SLAAttention.reference_protection rides BOOLEAN on the wire — both poles, never the enum string", () => {
    // The upstream input turned BOOLEAN (verified LIVE at the engine
    // door — optional.reference_protection: ["BOOLEAN", ...]) while
    // our schema served the three-string enum: every DEFAULT
    // compose fed 'Heavy Enforcement' into the boolean input, a
    // phase-1 refusal with the card dead on lane and every suite
    // green (no wall fixture carried H3SLAAttention — this arm is
    // that fixture). The UI vocabulary stays the enum; the compose
    // translates at the node seat: only 'Off' is false. (The bag
    // rides without a steps override — this spec's catalog mock
    // removes the absent-bag default row BY DESIGN (the loud
    // refusal arm above), and the steps arm below must see the
    // WALK's default, never a bag marriage.)
    const NO_STEPS_BAG = [{ name: "distill-8.safetensors", strength: 0.6 }];
    const slaInput = (doc: Record<string, unknown>): unknown => {
      const g = new GraphBuilder();
      instantiateAction(film, h3schema(doc), WINDOW_MODEL, g, "run_sla_bool");
      const node = Object.values(g.toJSON() as Doc).find((n) => n.class_type === "H3SLAAttention");
      if (node === undefined) throw new Error("H3SLAAttention did not compose");
      return node.inputs.reference_protection;
    };
    // unstated: the walk fills the declared default 'Heavy
    // Enforcement' — the wire speaks TRUE
    expect(slaInput({ variant: "t4_open", length: 124, prompt: "p", seed: 42, loras: NO_STEPS_BAG })).toBe(true);
    // explicit Off — the only false
    expect(slaInput({ variant: "t4_open", length: 124, prompt: "p", seed: 42, loras: NO_STEPS_BAG, sla_reference_protection: "Off" })).toBe(false);
    // Light protects (the engine's own tooltip: ON (Light))
    expect(slaInput({ variant: "t4_open", length: 124, prompt: "p", seed: 42, loras: NO_STEPS_BAG, sla_reference_protection: "Light" })).toBe(true);
    // AND the type itself — a string on this input is the burn
    const val = slaInput({ variant: "t4_open", length: 124, prompt: "p", seed: 42, loras: NO_STEPS_BAG });
    expect(typeof val).toBe("boolean");
    // THE STEPS REGOLD rides the same receipt: the walk's declared
    // default is the engine kernel's calibrated 6 (the parity
    // audit's unreceipted-drift finding; bag-less steps docs
    // compose 6 — the bag above carries NO steps row, so nothing
    // marries over the walk default)
    const g6 = new GraphBuilder();
    instantiateAction(
      film,
      h3schema({ variant: "t4_open", length: 124, prompt: "p", seed: 42, loras: NO_STEPS_BAG }),
      WINDOW_MODEL, g6, "run_steps_regold",
    );
    const sched = Object.values(g6.toJSON() as Doc).find((n) => n.class_type === "BasicScheduler");
    expect(sched!.inputs.steps).toBe(6);
  });

  it("ref_mods compose the loader→apply chain, stems out, wired into the guider's conditioning", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["refmods/vanellope_example.safetensors"],
      },
      WINDOW_MODEL, g, "run_refmod",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loader = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(loader, "the loader composes").toBeDefined();
    expect(apply, "the apply composes").toBeDefined();
    expect(guider).toBeDefined();
    // stems out: the combo eats models/refmods/ stems, '(none)' fills
    expect(loader![1].inputs.mod_1).toBe("vanellope_example");
    expect(loader![1].inputs.mod_2).toBe("(none)");
    expect(loader![1].inputs.mod_8).toBe("(none)");
    expect(loader![1].inputs.show_info).toBe(false);
    // paper parity: every filled slot rides strength 1 / copies 1
    expect(loader![1].inputs.strength_1).toBe(1);
    expect(loader![1].inputs.copies_1).toBe(1);
    expect(apply![1].inputs.retention).toBe(1);
    expect(apply![1].inputs.curve_direction).toBe("constant");
    // the wiring: loader.out(0) → apply.mods; apply.out(0) → the
    // guider's conditioning — the seat is IN the sampled chain, not
    // an orphan (the I2V marker law: orphans serialize, this runs)
    expect(apply![1].inputs.mods).toEqual([loader![0], 0]);
    expect(guider![1].inputs.conditioning).toEqual([apply![0], 0]);
  });

  it("ANY MEDIA composes the creator chain — the system bakes the pack (operator, 2026-11-06)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: ["/melite-media/runs/hero/vanellope.png", "/melite-media/runs/hero/turn.mp4"],
      },
      WINDOW_MODEL, g, "run_refmod_media",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const extract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(extract, "the creator node composes").toBeDefined();
    expect(apply, "the apply composes").toBeDefined();
    // no .safetensors stem in the list ⇒ no loader at all
    expect(entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader")).toBeUndefined();
    // name from the first visual ref's basename; save rides true so
    // the baked pack lands in the loader dropdown for reuse
    expect(extract![1].inputs.name).toBe("vanellope");
    expect(extract![1].inputs.save).toBe(true);
    // the still rides LoadImage → refs_image.ref_image_0; the video
    // rides LoadVideo → GetVideoComponents → refs_video.ref_video_0
    // (frame batch). DOTTED container.slot addressing — the autogrow
    // grammar of the r2v ref_images.ref_image_0 receipt; a BARE
    // ref_image_1 key is an undeclared input and phase 1 refused it
    // live (the 2026-10-16 boot-death burn).
    const loadImg = entries.find(([, n]) => n.class_type === "LoadImage")!;
    expect(loadImg![1].inputs.image).toBe("/melite-media/runs/hero/vanellope.png");
    expect(extract![1].inputs["refs_image.ref_image_0"]).toEqual([loadImg![0], 0]);
    const comps = entries.find(([, n]) => n.class_type === "GetVideoComponents")!;
    const loadVid = entries.find(([, n]) => n.class_type === "LoadVideo")!;
    expect(loadVid![1].inputs.file).toBe("/melite-media/runs/hero/turn.mp4");
    expect(comps![1].inputs.video).toEqual([loadVid![0], 0]);
    expect(extract![1].inputs["refs_video.ref_video_0"]).toEqual([comps![0], 0]);
    // the wiring: extract.mods → apply → the guider's conditioning
    expect(apply![1].inputs.mods).toEqual([extract![0], 0]);
    expect(guider![1].inputs.conditioning).toEqual([apply![0], 0]);
    // THE DECLARED-INPUT SWEEP (the tooth the live burn proved
    // missing, 2026-10-16): the refmod family's subgraph is judged
    // against the boot fixture's declarations — the four classes are
    // authored there from the live doc, so a bare grown-slot key
    // (ref_image_1), an invented input, or a wiring drift reds HERE,
    // hermetically, instead of at the operator's next run.
    const refModFamily = new Set([
      "MiniMaxH3RefModExtract", "MiniMaxH3RefModsLoader",
      "MiniMaxH3RefModApply", "MiniMaxH3RefModAudioExtract",
    ]);
    const subgraph = Object.fromEntries(
      entries.filter(([, n]) => refModFamily.has(n.class_type)).map(([id, n]) => [id, n]),
    );
    const fixture = JSON.parse(
      readFileSync(new URL("../../../../tests/walls/fixtures/object_info.boot.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
    const doc = deriveWiringDoc(Object.fromEntries(
      Object.entries(fixture).filter(([name]) => refModFamily.has(name)),
    ));
    expect(() => assertWiringAgainst(doc.nodes, doc.inputs, "h3-timeline", subgraph)).not.toThrow();
  });

  it("a bare grown-slot key on the creator node is refused by the declared-input sweep (the 2026-10-16 live burn, hermetic)", () => {
    // RED-PROOF SEAT: the wiring the card shipped before the cure —
    // ref_image_1 bare, no container base — is run through the same
    // wall the lane rides at phase 1, and it must refuse with the
    // operator's exact error class. If the wall ever stops refusing
    // this, the hermetic tier has gone deaf to the live grammar.
    const g = new GraphBuilder();
    g.node("MiniMaxH3RefModExtract", {
      name: "vanellope", mode: "Compressed Reference", concept_type: "generic", save: true,
      ref_image_1: g.node("LoadImage", { image: "/melite-media/runs/hero/vanellope.png", upload: "image" }).out(0),
    });
    const refModFamily = new Set([
      "MiniMaxH3RefModExtract", "MiniMaxH3RefModsLoader",
      "MiniMaxH3RefModApply", "MiniMaxH3RefModAudioExtract",
    ]);
    const fixture = JSON.parse(
      readFileSync(new URL("../../../../tests/walls/fixtures/object_info.boot.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
    const doc = deriveWiringDoc(Object.fromEntries(
      Object.entries(fixture).filter(([name]) => refModFamily.has(name)),
    ));
    // judge the family subgraph only (the loader's LoadImage helper
    // nodes ride the full fixture's class set on the lane, not this
    // four-class doc — the unknown-input tooth is the Extract wiring)
    const subgraph = Object.fromEntries(
      Object.entries(g.toJSON() as Record<string, { class_type: string }>)
        .filter(([, n]) => refModFamily.has(n.class_type)),
    );
    expect(() => assertWiringAgainst(doc.nodes, doc.inputs, "h3-timeline", subgraph))
      .toThrow(/card 'h3-timeline' wired 'MiniMaxH3RefModExtract\.ref_image_1' .* the node declares no such input .* the card's compose is stale against the engine build/);
  });

  it("audio media rides its own extractor (MiniMaxH3RefModAudioExtract) on the audio VAE", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["/melite-media/runs/voice/kid.wav"],
      },
      WINDOW_MODEL, g, "run_refmod_audio",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const audioExtract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModAudioExtract");
    const apply = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    expect(audioExtract, "the audio extractor composes").toBeDefined();
    expect(audioExtract![1].inputs.name).toBe("kid");
    expect(audioExtract![1].inputs.save).toBe(true);
    const loadAudio = entries.find(([, n]) => n.class_type === "LoadAudio")!;
    expect(loadAudio![1].inputs.audio).toBe("/melite-media/runs/voice/kid.wav");
    expect(audioExtract![1].inputs.audio).toEqual([loadAudio![0], 0]);
    // the extractor rides the graph's OWN audio VAE — the VAELoader
    // pinned to the family's vae_audio lane (video VAE is the twin)
    const vaeLoaders = entries.filter(([, n]) => n.class_type === "VAELoader");
    const audioVae = vaeLoaders.find(([, n]) => n.inputs.vae_name === "minimax_h3_audio_vae_fp32.safetensors")!;
    expect(audioVae, "the audio VAE loader composes").toBeDefined();
    expect(audioExtract![1].inputs.audio_vae).toEqual([audioVae![0], 0]);
    expect(apply![1].inputs.mods).toEqual([audioExtract![0], 0]);
  });

  it("mixed currency chains: stems (loader) then media (creator) through two Applies", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: ["refmods/vanellope_example.safetensors", "/melite-media/runs/hero/sheet.png"],
      },
      WINDOW_MODEL, g, "run_refmod_mixed",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loaders = entries.filter(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
    const applies = entries.filter(([, n]) => n.class_type === "MiniMaxH3RefModApply");
    const extract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    const guider = entries.find(([, n]) => n.class_type === "BasicGuider");
    expect(loaders.length).toBe(1);
    expect(loaders[0][1].inputs.mod_1).toBe("vanellope_example");
    expect(applies.length).toBe(2);
    // both Applies wire mods from their own source; the SECOND rides
    // the first's conditioning; the guider eats the chain's tail
    expect(applies[0][1].inputs.mods).toEqual([loaders[0][0], 0]);
    expect(applies[1][1].inputs.mods).toEqual([extract![0], 0]);
    expect(applies[1][1].inputs.conditioning).toEqual([applies[0][0], 0]);
    expect(guider![1].inputs.conditioning).toEqual([applies[1][0], 0]);
  });

  it("a non-media, non-safetensors entry refuses loud, naming the entry", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG, ref_mods: ["vanellope.xyz"],
      },
      WINDOW_MODEL, g, "run_refmod_bad",
    )).toThrow(/ref_mods entries are ANY media \(image\/video\/audio — the system bakes the pack\) or pre-baked \.safetensors stems under models\/refmods\/ \(saw 'vanellope\.xyz'\)/);
  });

  it("more than the loader's 8 slots refuses loud, naming the cap", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: Array.from({ length: 9 }, (_, i) => `mod_${String(i)}.safetensors`),
      },
      WINDOW_MODEL, g, "run_refmod_over",
    )).toThrow(/ref_mods exceeds the loader's 8 slots \(saw 9\)/);
  });

  it("backslash, padded, and query-suffixed paths still arrive as clean stems", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: BAG,
        ref_mods: [
          "nested\\vanellope_example.safetensors",
          "  refmods/padded_example.safetensors  ",
          "refmods/queried_example.safetensors?v=2",
        ],
      },
      WINDOW_MODEL, g, "run_refmod_paths",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loader = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
    expect(loader, "the loader composes").toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("vanellope_example");
    expect(loader![1].inputs.mod_2).toBe("padded_example");
    expect(loader![1].inputs.mod_3).toBe("queried_example");
  });

  it("a mod-only film stays open: ref_mods never fires the refs-imply-r2v law", () => {
    // The schema's variant derivation (schema.ts:425): a mod spends
    // no bundle-bus slot, so ref_mods rides OUTSIDE the hasGuide
    // OR-chain — a mod-only doc derives t4_open where a
    // picture-reference doc derives t4r.
    const modOnly = h3schema({ prompt: "a slow push in", ref_mods: ["refmods/vanellope_example.safetensors"] });
    expect(modOnly.variant).toBe("t4_open");
    const picRef = h3schema({ prompt: "a slow push in", ref_images: ["ref1.png"] });
    expect(picRef.variant).toBe("t4r");
  });
});

describe("the per-call mods seat (the operator's compound report, 2026-10-24)", () => {
  const BAG = [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }];
  const loaderOf = (g: GraphBuilder) => {
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    return entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader");
  };

  it("a mods-only call carries its bag: the loader wires even with zero run-level ref_mods (the bag gate)", () => {
    // THE BAG GATE: stanza.refs rides when ANY lane rides — mods
    // included. Pre-fix this stanza lost its whole bag (hasRefs
    // counted only bus lanes), the packs silently died, and the
    // operator saw "the reference seat ignored".
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_only",
    );
    const loader = loaderOf(g);
    expect(loader, "the per-call mod reaches the loader").toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("call_pack");
    expect(loader![1].inputs.mod_2).toBe("(none)");
  });

  it("the canon's replace arm: a stated call lane rides INSTEAD of the declared lane; absent inherits", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        ref_mods: ["refmods/run_level.safetensors"],
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_replace",
    );
    const loader = loaderOf(g);
    expect(loader, "the loader composes").toBeDefined();
    // REPLACE: the call's lane rides, run_level does NOT append
    expect(loader![1].inputs.mod_1).toBe("call_pack");
    expect(loader![1].inputs.mod_2).toBe("(none)");
  });

  it("the canon's replace arm, images lane: a stated call lane rides INSTEAD of the declared lane (film path)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_chain", prompt: "a courier crosses the city", seed: 42, loras: BAG,
        ref_images: ["declared_one.png"],
        calls: [
          { text: "she steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { images: "call_one.png" } },
          { text: "the crowd closes behind her", start_frame: 90, end_frame: 175 },
        ],
      },
      WINDOW_MODEL, g, "run_call_images_replace",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const loads = entries.filter(([, n]) => n.class_type === "LoadImage");
    const stems = loads.map(([, n]) => String(n.inputs.image));
    // window 1: the call's lane REPLACES — call_one rides, declared_one does not.
    // window 2: no call lane stated — the declared lane INHERITS.
    // One load each, per-window truth.
    expect(stems.filter((s) => s.includes("call_one"))).toHaveLength(1);
    expect(stems.filter((s) => s.includes("declared_one"))).toHaveLength(1);
  });

  it("the sole-call unpack: a single-call doc's row seats reach the window (the split-brain twin)", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, image: "anchor_one.png", refs: { images: "call_one.png", mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, g, "run_sole_call_unpack",
    );
    const graph = JSON.stringify(g.toJSON());
    // text, anchor, and both refs lanes ride the single window
    expect(graph.includes("anchor_one")).toBe(true);
    expect(graph.includes("call_one")).toBe(true);
    const loader = loaderOf(g);
    expect(loader, "the sole call's mods reach the loader").toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("call_pack");
  });

  it("the bag gate on the FILM path: a multi-call doc's mods-only window carries its bag (the sole-call unpack cannot mask it)", () => {
    // THE GATE'S OWN RED PROOF: narrowing the film loop's gate back
    // to bus-lanes-only (hasRefs) is invisible to single-call docs —
    // the sole-call unpack sets p.refs unconditionally. This wall is
    // the one that goes red when the gate narrows again.
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_chain", prompt: "a courier crosses the city", seed: 42, loras: BAG,
        calls: [
          { text: "she steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } },
          { text: "the crowd closes behind her", start_frame: 90, end_frame: 175 },
        ],
      },
      WINDOW_MODEL, g, "run_film_gate_mods",
    );
    const loaders = Object.values(g.toJSON()).filter((n) => n.class_type === "MiniMaxH3RefModsLoader");
    expect(loaders).toHaveLength(1);
    expect((loaders[0]!.inputs as Record<string, unknown>).mod_1).toBe("call_pack");
  });

  it("the canon's inherit arm: a call stating no mods lane inherits the declared ref_mods", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        ref_mods: ["refmods/run_level.safetensors"],
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90 }],
      },
      WINDOW_MODEL, g, "run_call_mods_inherit",
    );
    const loader = loaderOf(g);
    expect(loader).toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("run_level");
  });

  it("the cap guards the EFFECTIVE list: 9 stated call mods refuse loud; 8 declared + 1 call mod do not (replace)", () => {
    const over = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: Array.from({ length: 9 }, (_, i) => `call_${String(i)}.safetensors`).join(", ") } }],
      },
      WINDOW_MODEL, over, "run_call_mods_over",
    )).toThrow(/ref_mods exceeds the loader's 8 slots \(saw 9\)/);

    // REPLACE, not merge: the call's one mod rides INSTEAD of the
    // declared eight — the effective list is one, the door stays open.
    const inherit = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        ref_mods: Array.from({ length: 8 }, (_, i) => `run_${String(i)}.safetensors`),
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
      },
      WINDOW_MODEL, inherit, "run_call_mods_replace_under_cap",
    );
    const loader = loaderOf(inherit);
    expect(loader).toBeDefined();
    expect(loader![1].inputs.mod_1).toBe("call_pack");
    expect(loader![1].inputs.mod_2).toBe("(none)");
  });

  it("per-call ANY MEDIA boards: the bag seat carries media through the creator chain too", () => {
    const g = new GraphBuilder();
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_sheet.png" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_media",
    );
    const entries = Object.entries(g.toJSON()) as Array<[string, { class_type: string, inputs: Record<string, unknown> }]>;
    const extract = entries.find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    expect(extract, "the per-call bag's media composes the creator").toBeDefined();
    expect(extract![1].inputs.name).toBe("call_sheet");
    expect(entries.find(([, n]) => n.class_type === "MiniMaxH3RefModsLoader")).toBeUndefined();
  });

  it("a non-media per-call entry refuses loud, naming the entry", () => {
    const g = new GraphBuilder();
    expect(() => instantiateAction(
      film,
      {
        variant: "t4_open", length: 90, prompt: "a slow push in", seed: 42, loras: BAG,
        calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.xyz" } }],
      },
      WINDOW_MODEL, g, "run_call_mods_bad",
    )).toThrow(/ref_mods entries are ANY media \(image\/video\/audio — the system bakes the pack\) or pre-baked \.safetensors stems under models\/refmods\/ \(saw 'refmods\/call_pack\.xyz'\)/);
  });

  it("per-call mods never flip the arm: a mods-only call derives t4_open (no bundle-bus slot spent)", () => {
    // The derivation's own tier law: the schema reads the per-call
    // GUIDE aliases and the DECLARED surface — never the refs bag
    // (the compose owns each window's family). Mods ride the bag's
    // conditioning lane, so they flip nothing here either.
    const doc = h3schema({
      prompt: "a slow push in",
      calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { mods: "refmods/call_pack.safetensors" } }],
    });
    expect(doc.variant).toBe("t4_open");
    const bagImages = h3schema({
      prompt: "a slow push in",
      calls: [{ text: "the courier steps into the lantern glow", start_frame: 0, end_frame: 90, refs: { images: "ref1.png" } }],
    });
    expect(bagImages.variant).toBe("t4_open");
  });
});
