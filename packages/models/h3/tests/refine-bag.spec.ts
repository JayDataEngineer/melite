// @melite/models-h3 — THE REFINE BAG CARRIER (GAPS-19, 2026-11-01
// plan §1/§3): N stated entries ARE N windows of ONE film — the film
// tail's own tiling, entry-driven. Every arm composes through the
// REAL family renderer (renderH3RefineBag over a GraphBuilder, class/
// value censuses over the serialized graph, never literals). The laws
// it pins:
//   ARM B1 — the SEQUENTIAL-PRESS LAW: a one-entry bag composes the
//     single-window emission BYTE-IDENTICALLY (no boundary, no
//     concat — the walk posture stays lawful and byte-cheap).
//   ARM B2 — THE TILING PARITY: a two-entry bag rides the film tail's
//     own skeleton (per-window saves + the boundary chain + the file
//     concat), and the k≥2 carried head is the FILM'S OWN
//     MiniMaxH3FiniteLatentContinuation over the estate's joint-AV
//     constructor + the finalize head-trim (round 27: the context
//     carry is the film's, never a refine-only divergence).
//   ARM B3/B4/B5 — the bag laws refuse LOUD, each its own arm:
//     one film per bag, no gaps, no full overlap / out-of-order, the
//     32-entry ceiling.
//   ARM B6 — per-entry seats stay per-entry (prompt/dials/scale per
//     row; a missing seat refuses at the window's own door).
//   ARM B7 — the 141 f window ceiling still judges THROUGH the bag.
//   ARM B20 — THE ONE-ENTRY AUTO-TILE (F67): a lone entry stating
//     windows > 1 tiles ITSELF through the F24 loop — derived
//     starts, the default overlap taking the film's carry face.
//   ARM B21 — the auto-tile lives on a LONE entry: a multi-entry bag
//     stating windows > 1 refuses (two tilings stated).
//   ARM B22 — a lone single window ignores the overlap seat (no join)
//     and stays byte-identical to the walk emission.
//   ARM B23 — the auto-tile's own seats refuse LOUD: a fractional or
//     out-of-range windows, a fractional or negative overlap.
//   ARM B26 — THE ORIGIN SEATS REFUSE LOUD on BOTH doors the origin
//     owner serves: a length that books no frames and a start before
//     the first frame refuse identically at the single-window arm and
//     in the bag's own origins walk, naming the design window.
//   ARM B27 — the stand-down names EVERY carried join: a three-window
//     carried bag refuses in the plural, all spans listed, before any
//     node.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import {
  MAX_COMPOSED_WINDOWS,
  REFINE_2X_OOM_FRAMES,
  REFINE_DEFAULT_CLIP_SECONDS,
  refineArmed,
  renderH3Refine,
  renderH3RefineBag,
  renderH3RefineCarry,
  nextTokenExact,
  lawfulCarryStart,
  tokenExactCarry,
} from "../src/index.ts";

const FPS = 24;

type Nodes = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

const facts = {
  unet: "minimax_h3_t2v_bf16.safetensors",
  clip: "clip.safetensors",
  vae_video: "vae_video.safetensors",
  vae_audio: "vae_audio.safetensors",
};

const entry = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  source_clip: "staged/source.mp4",
  refine_prompt: "sharper detail, unchanged motion",
  clip_seconds: 2,
  start_seconds: 0,
  ...over,
});

const walk = (g: GraphBuilder): Nodes => g.toJSON() as unknown as Nodes;

const ofClass = (nodes: Nodes, cls: string): Array<[string, Nodes[string]]> =>
  Object.entries(nodes).filter(([, n]) => n.class_type === cls);

const refOf = (v: unknown): string => (Array.isArray(v) ? String(v[0]) : String(v));

const nodeOf = (nodes: Nodes, ref: unknown): Nodes[string] => nodes[refOf(ref)]!;

/** The transitive `after` closure of one node (the split-brain
 *  lesson: judge the LOOP GATE, never one wire). */
const upstream = (nodes: Nodes, id: string): Set<string> => {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const n = nodes[cur];
    if (n === undefined) continue;
    for (const v of Object.values(n.inputs)) {
      if (Array.isArray(v)) stack.push(String(v[0]));
    }
  }
  return seen;
};

describe("the refine bag carrier (GAPS-19: N entries tile ONE film)", () => {
  it("ARM B1 — THE SEQUENTIAL-PRESS LAW: a one-entry bag IS the single-window emission, byte-identical (no boundary, no concat)", () => {
    const e = entry();
    const single = new GraphBuilder();
    renderH3Refine(e, {}, facts, single, "run-b1");
    const carried = new GraphBuilder();
    renderH3RefineBag([e], {}, facts, carried, "run-b1");
    assert.deepEqual(walk(carried), walk(single),
      "the one-entry bag delegates to the arm's own emission — the walk posture (press, judge, press) composes the same bytes");
    const nodes = walk(carried);
    assert.deepEqual(
      ofClass(nodes, "SaveVideo").map(([, n]) => n.inputs.filename_prefix),
      ["run-b1/refine"],
      "one save at the arm's own prefix — no per-window saves",
    );
    assert.equal(ofClass(nodes, "MeliteUnload").length, 0, "no boundary — the single window orders nothing");
    assert.equal(ofClass(nodes, "MeliteConcatVideos").length, 0, "no concat — one window joins nothing");
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize").length, 0, "no carried head on the first window");
  });

  it("ARM B2 — THE CARRY, RE-ARMED (F3-14 engine cure, 2026-11-15): a carried two-entry bag COMPOSES through the film's own continuation", () => {
    // 48 f windows, the second starting 26 f in — the DERIVED carry is
    // 0 + 48 − 26 = 22 f, the film's own token-exact seam. The engine
    // death (the Drift-Control AV mask split at the handoff) is cured
    // in the vendored handoff — the refinement clone-strips the
    // foreign dynamic denoise-mask patch before its second pass
    // (tests/test_h3_refine_handoff_strip.py judges that cure live).
    // The door now composes the carried join: one continuation over
    // the predecessor's joint target, per-window saves, one concat.
    const g = new GraphBuilder();
    const out = renderH3RefineBag(
      [entry(), entry({ start_seconds: 26 / 24 })],
      {}, facts, g, "run-b2",
    );
    assert.ok(out, "the carried bag composes — the stand-down is lifted");
    const nodes = walk(g);
    const conts = ofClass(nodes, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 1, "one continuation per carried join");
    const prev = nodeOf(nodes, conts[0]![1].inputs.previous_latent);
    assert.equal(prev.class_type, "MiniMaxH3ContexMaskedTarget",
      "the join carries the predecessor's joint target");
    assert.equal(ofClass(nodes, "MiniMaxH3ContexMaskedTarget").length, 2,
      "one joint target per window");
    assert.equal(ofClass(nodes, "VHS_LoadVideo").length, 2, "two windows, two loaders");
    assert.equal(ofClass(nodes, "MeliteConcatVideos").length, 1,
      "the carried film assembles through the plain concat");
  });

  it("ARM B3 — LAW 1, ONE FILM PER BAG: entries naming different staged leaves refuse LOUD", () => {
    // The historic two-entry refusal fixture (the silent-drop class)
    // re-aimed: the same shape now names the one-film law.
    assert.throws(
      () => renderH3RefineBag([entry(), entry({ source_clip: "other.mp4" })], {}, facts, new GraphBuilder(), "run-b3"),
      /ONE FILM PER BAG: a multi-entry refine tiles windows of ONE staged leaf into one film/,
      "the tiling joins windows of one timeline; two sources are two films",
    );
  });

  it("ARM B4 — LAW 2, NO GAPS NO FULL OVERLAP: a hole, a full cover, and an out-of-order entry each refuse LOUD", () => {
    // the gap: window 0 ends at 48 f, window 1 starts at 72 f — 24 f
    // of source would silently drop
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: 3 })], {}, facts, new GraphBuilder(), "run-b4-gap",
      ),
      /a 24 f gap silently drops source seconds \(the no-drop law: consecutive windows overlap, never a hole/,
      "a gap drops source seconds — refuse naming the span",
    );
    // the full overlap: window 1 starts AT window 0's start — it fully
    // covers (re-plays) the previous window
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: 0 })], {}, facts, new GraphBuilder(), "run-b4-cover",
      ),
      /out of order and fully covering the previous window \(the compose never silently sorts/,
      "the compose never silently sorts — stated order is film order",
    );
    // out of order: a negative start BEFORE the first window
    assert.throws(
      () => renderH3RefineBag(
        [entry({ start_seconds: 2 }), entry({ start_seconds: 1 })], {}, facts, new GraphBuilder(), "run-b4-order",
      ),
      /starts at frame 24, at or before window 0's start \(frame 48\)/,
      "each pair its own refusal voice",
    );
  });

  it("ARM B5 — LAW 3, THE CEILING: past the composed-window ceiling the bag refuses LOUD; the ceiling itself still composes", () => {
    // 12 f windows, ABUTTING (start k × 12 f): a zero-carry join has
    // nothing to carry, so the concat face composes at the ceiling
    // (the off-grid 6 f carry these fixtures used to state now
    // refuses — ARM B13).
    const bag = (n: number): Array<Record<string, unknown>> =>
      Array.from({ length: n }, (_, k) => entry({ clip_seconds: 0.5, start_seconds: k * 0.5 }));
    assert.throws(
      () => renderH3RefineBag(bag(MAX_COMPOSED_WINDOWS + 1), {}, facts, new GraphBuilder(), "run-b5"),
      new RegExp(`the bag carries ${MAX_COMPOSED_WINDOWS + 1} entries — the film's composed-window ceiling is ${MAX_COMPOSED_WINDOWS}`),
      "the ceiling names the number and the window arithmetic",
    );
    assert.equal(MAX_COMPOSED_WINDOWS, 32, "the ceiling is the extend solver's own (timelineContract)");
    // at the ceiling the bag composes: 32 minimal windows + the tail
    const g = new GraphBuilder();
    renderH3RefineBag(bag(MAX_COMPOSED_WINDOWS), {}, facts, g, "run-b5-full");
    const nodes = walk(g);
    assert.equal(ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff").length, MAX_COMPOSED_WINDOWS,
      "32 windows compose — the ceiling is inclusive");
    assert.equal(ofClass(nodes, "MeliteUnload").length, MAX_COMPOSED_WINDOWS,
      "one boundary per window even at the ceiling (the memory law holds at scale)");
    assert.equal(REFINE_2X_OOM_FRAMES, 141, "and the per-window ceiling stays the measured 141 f");
    assert.equal(Math.round(REFINE_DEFAULT_CLIP_SECONDS * FPS), 56, "the default window is the DESIGN 56 f (the 2 s class's rung — W-7: the door teaches the carry-joined design, not the widest-green workaround)");
    assert.equal(tokenExactCarry(Math.round(REFINE_DEFAULT_CLIP_SECONDS * FPS)), true, "the design default lands on the engine's 22+17k token grid, so the default window can carry");
  });

  it("ARM B6 — PER-ENTRY SEATS STAY PER-ENTRY: on the abutting concat face dials ride verbatim per row, a missing seat refuses at the window's own door", () => {
    // ABUTTING windows (carry 0): differing conditioning is lawful here
    // — each window is its own independent render, joined by the hard
    // cut. On a CARRIED bag the same disagreement refuses (ARM B12).
    const g = new GraphBuilder();
    renderH3RefineBag(
      [
        entry({ refine_prompt: "weave of the fabric", denoise: 0.3, steps: 5, seed: 7, scale: 2 }),
        entry({ start_seconds: 2, refine_prompt: "the leaf edges", denoise: 0.4, steps: 8, seed: 9, scale: 1 }),
      ],
      {}, facts, g, "run-b6",
    );
    const nodes = walk(g);
    const cond = ofClass(nodes, "CLIPTextEncode").map(([, n]) => n.inputs.text);
    assert.deepEqual([...cond].sort(), ["the leaf edges", "weave of the fabric"],
      "each window's positive seat reads its OWN entry's prompt (no doc-level fallback)");
    const scheds = ofClass(nodes, "BasicScheduler").map(([, n]) => ({
      denoise: n.inputs.denoise, steps: n.inputs.steps,
    }));
    assert.deepEqual(scheds, [
      { denoise: 0.3, steps: 5 },
      { denoise: 0.4, steps: 8 },
    ], "per-entry dials ride verbatim");
    const hands = ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.deepEqual(hands.map(([, n]) => n.inputs.scale), [2, 1], "per-entry capacity seats ride verbatim");
    // a seatless SECOND entry refuses at the same door the first would
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: 1, refine_prompt: " " })], {}, facts, new GraphBuilder(), "run-b6-seat",
      ),
      /'refine_prompt' names no media/,
      "REQUIRED_SEATS judges every window unchanged",
    );
  });

  it("ARM B7 — the 141 f WINDOW CEILING judges THROUGH the bag: a past-OOM entry refuses, the tiling never multiplies past it", () => {
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: 26 / 24, clip_seconds: 6 })], {}, facts, new GraphBuilder(), "run-b7",
      ),
      /a 144 f window at 2x is TOO LONG — the 2x pass was measured OOM at 141 f/,
      "the too-long window refuses by name, whichever door composed it",
    );
  });

  it("ARM B7b — W-7: the ceiling refusal teaches the DESIGN window, never the workaround's numbers", () => {
    // FRICTION_3 W-7 (operator: "for the refine flow it is two
    // seconds, not five bro"): the door taught the hard-cut
    // workaround's numbers (90 f green default, cut to 5.88 s) as the
    // law. The design is the ~2 s window joined by the context carry,
    // so the refusal names the design window and never the 5.88 s
    // workaround number.
    let voice = "";
    try {
      renderH3RefineBag(
        [entry(), entry({ start_seconds: 26 / 24, clip_seconds: 6 })], {}, facts, new GraphBuilder(), "run-b7b",
      );
    } catch (e) {
      voice = (e as Error).message;
    }
    assert.match(voice, /a 144 f window at 2x is TOO LONG — the 2x pass was measured OOM at 141 f/,
      "the refusal still fires at the measured too-long line");
    assert.match(voice,
      /design is the ~2 s window \(2\.33 s = 56 f, the 2 s class's rung of the 22\+17k token grid\)/,
      "the refusal teaches the carry-joined design window by name and rung");
    assert.ok(!voice.includes("5.88"),
      "the workaround's cut-to number is gone from the door's voice");
  });

  it("ARM B8 — THE EMPTY BAG REFUSES LOUD: no windows is a compose-wiring bug, never a doc to fix", () => {
    // the card door arms on bag presence (refineArmed) — an empty
    // bag here mistakes the carrier for the doc. The seam refuses
    // naming the wiring bug instead of tiling nothing.
    assert.throws(
      () => renderH3RefineBag([], {}, facts, new GraphBuilder(), "run-b8"),
      /the bag arrived empty at the family carrier — the card door arms on a non-empty refine bag, so this is a compose-wiring bug/,
      "empty is not a film — refuse, never tile zero windows",
    );
  });

  it("ARM B9 — AN UNNAMED ENTRY SKIPS THE ONE-FILM COMPARISON: the window's own seat refusal owns the missing leaf, never the census", () => {
    // the third entry names NO staged leaf (seats present, leaf
    // absent): the leaves census skips it on purpose and still
    // catches the two NAMED leaves disagreeing — the missing seat
    // is the window renderer's REQUIRED_SEATS voice, not a mixed
    // source.
    assert.throws(
      () => renderH3RefineBag(
        [
          entry(),
          entry({ source_clip: "other.mp4" }),
          { refine_prompt: "the tail, sharper", clip_seconds: 2, start_seconds: 1 },
        ],
        {}, facts, new GraphBuilder(), "run-b9",
      ),
      /ONE FILM PER BAG/,
      "the unnamed entry joins no census — the two named leaves still refuse",
    );
  });

  // ARM B10 (re-pinned round 27): the join face is decided by the
  // carries. A CARRIED bag rides the film's continuation + finalize +
  // concat (ARM B2); an ABUTTING bag (a join with ZERO carry — window k
  // starts exactly at window k−1's end) has nothing to carry and keeps
  // the plain concat face: no continuation, no finalize trim.
  it("ARM B10 — THE ZERO-CARRY BAG KEEPS THE CONCAT FACE: an abutting join carries nothing, the plain concat owns it", () => {
    const g = new GraphBuilder();
    renderH3RefineBag(
      [entry(), entry({ start_seconds: 2, refine_prompt: "the next beat" })],
      {}, facts, g, "run-b10",
    );
    const nodes = walk(g);
    assert.equal(ofClass(nodes, "MeliteOverlapJoinVideos").length, 0,
      "no blend — a zero-carry join is the concat's own seat");
    const concat = ofClass(nodes, "MeliteConcatVideos")[0]!;
    assert.equal(concat[1].inputs.videos, "run-b10/refine_w0,run-b10/refine_w1",
      "the abutting bag joins through the plain file concat");
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize").length, 0,
      "no carried span, no trim");
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteLatentContinuation").length, 0,
      "no carry, no continuation — the independent walk");
    assert.equal(ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 2,
      "each abutting window is its own refine sample");
  });

  // ARM B11 (re-pinned round 27, operator order: "ZERO DIFFERENCE
  // BETWEEN THE CONTEXT CARRY FROM THE NORMAL GENS AND THE REFINE
  // GENS"): THE JOINT CARRY CHAIN. Every join mounts the film's own
  // MiniMaxH3FiniteLatentContinuation, and each continuation's
  // previous_latent is the IMMEDIATELY PRECEDING window's joint
  // target — not a list of chunks, not a per-bag latch. The carried
  // head is trimmed by the film's finalize and the tail is the plain
  // file concat.
  it("ARM B11 — THE JOINT CARRY CHAIN: every join mounts the film's continuation over the PREDECESSOR's target", () => {
    // three 48 f windows at 26 f steps: joins of 22 f each (the film's
    // own token-exact seam), so windows 1 and 2 both carry.
    // THE CARRIER'S OWN SHAPE: the bag door refuses the carry shape
    // (F3-14 stand-down, ARM B2), so this arm judges the harness the
    // engine cure will re-wire — the origins/carries the bag derives
    // for 48 f windows at 26 f steps (0 + 48 − 26 = 22 f each).
    const g = new GraphBuilder();
    renderH3RefineCarry(
      [entry(), entry({ start_seconds: 26 / 24 }), entry({ start_seconds: 52 / 24 })],
      {}, facts, g,
      [
        { cap: Math.round(2 * FPS), skip: 0 },
        { cap: Math.round(2 * FPS), skip: 26 },
        { cap: Math.round(2 * FPS), skip: 52 },
      ],
      [22, 22],
      "run-b11",
    );
    const nodes = walk(g);
    const conts = ofClass(nodes, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 2, "one continuation per join");
    const targets = ofClass(nodes, "MiniMaxH3ContexMaskedTarget");
    assert.equal(targets.length, 3, "one joint target per window");
    const loaders = ofClass(nodes, "VHS_LoadVideo");
    const loaderOfTarget = (targetId: string): string => {
      const edit = nodeOf(nodes, nodes[targetId]!.inputs.target_latent);
      return refOf(edit.inputs.images);
    };
    for (let k = 0; k < conts.length; k += 1) {
      const prevRef = refOf(conts[k]![1].inputs.previous_latent);
      assert.equal(nodes[prevRef]!.class_type, "MiniMaxH3ContexMaskedTarget",
        `join ${k + 1} carries a masked target`);
      // the predecessor is the window IMMEDIATELY before this join,
      // film order — the chain is k−1, never window 0 repeatedly.
      assert.equal(loaderOfTarget(prevRef), loaders[k]![0],
        `join ${k + 1} carries window ${k}'s own joint target`);
    }
    // each continuation's own target belongs to the window AFTER it —
    // three loaders, three distinct target nodes, two distinct carries.
    const loads = ofClass(nodes, "VHS_LoadVideo").map(([, n]) => ({
      cap: n.inputs.frame_load_cap, skip: n.inputs.skip_first_frames,
    }));
    assert.deepEqual(loads, [
      { cap: Math.round(2 * FPS), skip: 0 },
      { cap: Math.round(2 * FPS), skip: 26 },
      { cap: Math.round(2 * FPS), skip: 52 },
    ], "hand-tiled entries ride the loader verbatim at 24 fps");
    const prevRefs = conts.map(([, n]) => refOf(n.inputs.previous_latent));
    assert.equal(new Set(prevRefs).size, 2, "the two joins carry two DIFFERENT predecessors");
    const finalize = ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize");
    assert.equal(finalize.length, 2, "windows 1 and 2 trim their carried heads");
    assert.deepEqual(finalize.map(([, n]) => n.inputs.overlap_frames), [22, 22],
      "each trim states its join's carried span");
    const concat = ofClass(nodes, "MeliteConcatVideos")[0]!;
    assert.equal(concat[1].inputs.videos, "run-b11/refine_w0,run-b11/refine_w1,run-b11/refine_w2",
      "the film tail is the plain concat of every member, film order");
    assert.equal(ofClass(nodes, "MeliteOverlapJoinVideos").length, 0,
      "no crossfade — the carry is the latent");
    assert.equal(ofClass(nodes, "MeliteCollectLatents").length, 0, "no list door");
    assert.equal(ofClass(nodes, "MeliteListAt").length, 0, "no list split");
  });

  it("ARM B12 — PER-ENTRY CONDITIONING IS LAWFUL ON THE CARRIED FACE: each window composes its own prompt", () => {
    // Round 27: the F62 carry fed ONE CLIPTextEncode for the whole
    // list, so a second prompt had to refuse. The film's own
    // continuation is latent-level (it wraps the sampler's model, not
    // its text): each window may state its own prompt and dials, and
    // the carry threads the previous window's joint target only.
    const g = new GraphBuilder();
    renderH3RefineBag(
      [entry(), entry({ start_seconds: 26 / 24, refine_prompt: "a different pass" })],
      {}, facts, g, "run-b12",
    );
    const doorNodes = walk(g);
    assert.equal(ofClass(doorNodes, "MiniMaxH3FiniteLatentContinuation").length, 1,
      "the carried face composes through the bag door — per-entry conditioning rides it");
    // THE CARRIER'S OWN SHAPE (the harness the engine cure re-wires):
    // the same two entries compose per-window conditioning on the carry.
    const carry = new GraphBuilder();
    renderH3RefineCarry(
      [entry(), entry({ start_seconds: 26 / 24, refine_prompt: "a different pass" })],
      {}, facts, carry,
      [{ cap: Math.round(2 * FPS), skip: 0 }, { cap: Math.round(2 * FPS), skip: 26 }],
      [22],
      "run-b12",
    );
    const nodes = walk(carry);
    const texts = ofClass(nodes, "CLIPTextEncode").map(([, n]) => n.inputs.text);
    assert.deepEqual([...texts].sort(), ["a different pass", "sharper detail, unchanged motion"],
      "each window's own prompt reaches its own encode");
    const conts = ofClass(nodes, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 1, "the join still carries");
    // the continuation's positive is window 1's OWN encode, and the
    // handoff it feeds samples under it
    assert.equal(nodeOf(nodes, conts[0]![1].inputs.positive).inputs.text, "a different pass",
      "the continuation binds the carrying window's own conditioning");
    const hands = ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.equal(hands.length, 2, "one handoff per window");
    assert.equal(nodeOf(nodes, hands[0]![1].inputs.positive).inputs.text,
      "sharper detail, unchanged motion", "window 0 samples under its own prompt");
    assert.equal(nodeOf(nodes, hands[1]![1].inputs.positive).class_type,
      "MiniMaxH3FiniteLatentContinuation", "window 1 samples under the continuation's positive");
  });

  it("ARM B13 — a NON-token-exact carry REFUSES, naming the measured span, the grid, and the start that lands 22 f", () => {
    // 12 f carry ((12 - 5) % 17 !== 0): the operator's own measured
    // burn shape — a hand-placed start that silently selected the
    // crossfade before FRICTION F26. It refuses, and the lawful fix is
    // one edited number: window 1 at frame 26 carries 22 f.
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: 1.5 })],
        {}, facts, new GraphBuilder(), "run-b13",
      ),
      /the join between windows 0 and 1 carries 12 f \(derived: 0 \+ 48 − 36\) — not token-exact/,
      "the refusal names the measured carry and its derivation",
    );
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: 1.5 })],
        {}, facts, new GraphBuilder(), "run-b13-fix",
      ),
      /State window 1 at frame 26 \(1\.083 s\) for a 22 f carry/,
      "the fix is a stated frame — the film's own seam",
    );
    // and the refusal is about the JOIN, not the seatless voice: a bag
    // that states one prompt still refuses, nothing composed.
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3RefineBag([entry(), entry({ start_seconds: 1.5 })], {}, facts, g, "run-b13-graph"),
      /not served/,
      "nothing lands on the builder — the refusal precedes composition",
    );
    assert.deepEqual(g.toJSON(), {}, "an empty graph is the refusal's proof");
  });

  it("ARM B24 — THE REFUSAL'S OTHER DOORS: a window too short for any carried join, and every differing tiling seat named", () => {
    // a 5 f window can hold no token-exact carry (the grid starts at
    // 5 f and a carry must still ADVANCE the window): the refusal names
    // the zero-carry alternative instead of a start that cannot exist.
    assert.throws(
      () => renderH3RefineBag(
        [entry({ clip_seconds: 5 / 24 }), entry({ clip_seconds: 5 / 24, start_seconds: 1 / 24 })],
        {}, facts, new GraphBuilder(), "run-b24-short",
      ),
      /This window is too short for any carried join — state zero carry/,
      "no lawful start exists — the door says abutting or auto-tile",
    );
    // THE SEATS THE JOIN BINDS ARE THE MEMBER GEOMETRY: mode + scale.
    // Each is named with both stated values when they disagree.
    for (const [seat, value, re] of [
      ["scale", 1, /scale \(2 vs 1\)/],
      ["mode", "target dimensions", /mode \('scale by multiplier' vs 'target dimensions'\)/],
    ] as const) {
      assert.throws(
        () => renderH3RefineBag(
          [entry(), entry({ start_seconds: 26 / 24, [seat]: value })],
          {}, facts, new GraphBuilder(), `run-b24-${seat}`,
        ),
        re,
        `the refusal names ${seat} and both values`,
      );
    }
    // …while prompts, seeds and dials are PER-WINDOW (ARM B12): the
    // film's continuation wraps the model, not the text or the sampler
    // seats, so differing steps/seed compose window by window.
    const lawful = new GraphBuilder();
    renderH3RefineCarry(
      [entry(), entry({ start_seconds: 26 / 24, steps: 7, seed: 9 })],
      {}, facts, lawful,
      [{ cap: Math.round(2 * FPS), skip: 0 }, { cap: Math.round(2 * FPS), skip: 26 }],
      [22],
      "run-b24-dials",
    );
    const nodes = walk(lawful);
    assert.deepEqual(ofClass(nodes, "BasicScheduler").map(([, n]) => n.inputs.steps).sort(), [6, 7],
      "each window's own step count composes");
    assert.deepEqual(ofClass(nodes, "RandomNoise").map(([, n]) => n.inputs.noise_seed).sort(), [0, 9],
      "each window's own seed composes");
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteLatentContinuation").length, 1,
      "and the join still carries the latent");
    // the grid's own arithmetic: the nearest rung at and around a span
    assert.equal(nextTokenExact(4), 5, "below the first pair the floor is 5");
    assert.equal(nextTokenExact(5), 5, "a token-exact span is its own rung");
    assert.equal(nextTokenExact(12), 22, "12 f sits between 5 and 22");
    assert.equal(nextTokenExact(22), 22, "22 is the film's own seam");
    assert.equal(nextTokenExact(23), 39, "past a rung the next one is +17");
    assert.equal(lawfulCarryStart({ cap: 90, skip: 0 }), 68, "a 90 f window lands its 22 f seam at frame 68");
    assert.equal(lawfulCarryStart({ cap: 20, skip: 0 }), 15, "a window too short for 22 falls to the 5 f rung");
    assert.equal(lawfulCarryStart({ cap: 4, skip: 0 }), null, "no rung fits — the caller names the alternative");
  });

  it("ARM B14 — THE CARRY FACE REFUSES A NON-TILING SHAPE: fewer than two windows, or a join count that matches no tiling", () => {
    // the guards own the carry door (one window is the single-window
    // arm's seat; a join count that matches no window count is a wiring
    // bug) — both refuse naming the shape, never an index slip.
    const pair = [
      { cap: Math.round(2 * FPS), skip: 0 },
      { cap: Math.round(2 * FPS), skip: 26 },
    ];
    assert.throws(
      () => renderH3RefineCarry([entry()], {}, facts, new GraphBuilder(), [pair[0]!], [], "run-b14"),
      /at least two windows and one carried join each/,
      "one window is the single-window arm's seat, never the carry's",
    );
    assert.throws(
      () => renderH3RefineCarry([entry(), entry()], {}, facts, new GraphBuilder(), pair, [], "run-b14-mismatch"),
      /at least two windows and one carried join each/,
      "every join carries exactly one overlap — the counts agree or the face refuses",
    );
    assert.throws(
      () => renderH3RefineCarry([entry()], {}, facts, new GraphBuilder(), pair, [22], "run-b14-entries"),
      /the carry face names 1 entries over 2 windows/,
      "one entry per window, film order",
    );
  });

  it("ARM B15 — THE CARRY FACE CARRIES TOKEN-EXACT ONLY: a non-exact join refuses naming the spans, never snaps", () => {
    // 12 f renders fine (ARM B13's face) but carries nothing — the
    // direct carry door refuses it naming the spans.
    const windows = [
      { cap: Math.round(2 * FPS), skip: 0 },
      { cap: Math.round(2 * FPS), skip: Math.round(1.5 * FPS) },
    ];
    assert.throws(
      () => renderH3RefineCarry([entry(), entry()], {}, facts, new GraphBuilder(), windows, [12], "run-b15"),
      /the carry face carries 12 f — every join must be token-exact/,
      "12 f refuses at the carry door too — no silent crossfade, no silent snap",
    );
  });

  it("ARM B24 — THE CARRY FACE REFUSES A WINDOW THE CARRY SWALLOWS: a carried head at or past the window's own cap re-renders nothing", () => {
    // 22 f carry into a 20 f window: token-exact, counts agree, skips
    // lawful — and the carry would own MORE than the whole window.
    // The guard fires naming both spans before any plane is built.
    const windows = [
      { cap: 48, skip: 0 },
      { cap: 20, skip: 26 },
    ];
    assert.throws(
      () => renderH3RefineCarry([entry(), entry()], {}, facts, new GraphBuilder(), windows, [22], "run-b17"),
      /window 1 carries 22 f of its 20 f — the carried head must leave frames of its own to refine/,
      "a window at or below the carried span re-renders nothing — the face refuses",
    );
  });

  it("ARM B25 — THE CARRY FACE REFUSES A CARRY ITS SOURCE CANNOT FILL: a join that claims more than the window it comes from", () => {
    // 39 f carry (token-exact) into a 56 f window from a 35 f one:
    // the window keeps frames of its own (B17's guard passes) but
    // the carry exceeds the source window's whole length — the
    // second guard fires naming the source's cap.
    const windows = [
      { cap: 35, skip: 10 },
      { cap: 56, skip: 6 },
    ];
    assert.throws(
      () => renderH3RefineCarry([entry(), entry()], {}, facts, new GraphBuilder(), windows, [39], "run-b18"),
      /the join into window 1 carries 39 f but window 0 holds only 35 f/,
      "a carry cannot exceed the window it comes from",
    );
  });

  it("ARM B16 — THE CARRY FACE'S OWN SEAT + SIGMAS DOORS: a seatless bag refuses at the seat door, a full-denoise entry refuses", () => {
    // both entries name the leaf but no prompt: the carry face is
    // entered and its own REQUIRED_SEATS door refuses.
    const seatless = (start: number): Record<string, unknown> => ({
      source_clip: "staged/source.mp4", clip_seconds: 2, start_seconds: start,
    });
    assert.throws(
      () => renderH3RefineBag([seatless(0), seatless(26 / 24)], {}, facts, new GraphBuilder(), "run-b16-seat"),
      /'refine_prompt' names no media/,
      "no prompt anywhere is a missing seat",
    );
    // a full-denoise entry is the reshoot door at the carry's own gate
    const windows = [
      { cap: Math.round(2 * FPS), skip: 0 },
      { cap: Math.round(2 * FPS), skip: 26 },
    ];
    assert.throws(
      () => renderH3RefineCarry([entry({ denoise: 1 }), entry({ denoise: 1 })], {}, facts,
        new GraphBuilder(), windows, [22], "run-b16-denoise"),
      /denoise 1 >= 1 — a second pass is a refine, never a re-render/,
      "the sigmas law guards the carry face unchanged",
    );
  });

  it("ARM B17 — THE CARRY FACE'S WINDOW GUARDS: a bad cap, a bad skip, and a past-OOM window each refuse naming the window", () => {
    const pair = (cap: number, skip: number): Array<{ cap: number; skip: number }> =>
      [{ cap, skip }, { cap: Math.round(2 * FPS), skip: 26 }];
    const two = [entry(), entry()];
    assert.throws(
      () => renderH3RefineCarry(two, {}, facts, new GraphBuilder(), pair(0, 0), [22], "run-b17-cap"),
      /the carry face's window 0 carries cap 0 f — a whole frame count at or above one/,
      "a window with no frames is no window",
    );
    assert.throws(
      () => renderH3RefineCarry(two, {}, facts, new GraphBuilder(), pair(Math.round(2 * FPS), -1), [22], "run-b17-skip"),
      /the carry face's window 0 starts at skip -1 — a whole frame offset at or above zero/,
      "a window starts at or after the clip's first frame",
    );
    // a 158 f window at 2x is past the measured 141 f OOM point (the
    // 22 f join is token-exact, so the ceiling — not the carry — refuses)
    const wide = [
      { cap: 158, skip: 0 },
      { cap: Math.round(2 * FPS), skip: 136 },
    ];
    assert.throws(
      () => renderH3RefineCarry(two, {}, facts, new GraphBuilder(), wide, [22], "run-b17-oom"),
      /a 158 f window at 2x is TOO LONG — the 2x pass was measured OOM at 141 f/,
      "the too-long window refuses by name on the carry face too",
    );
    // … and a non-multiplier sizing mode names itself in the same refusal
    assert.throws(
      () => renderH3RefineCarry([entry({ mode: "target dimensions" }), entry({ mode: "target dimensions" })],
        {}, facts, new GraphBuilder(), wide, [22], "run-b17-oom-mode"),
      /a 158 f window at target dimensions is TOO LONG — the 2x pass was measured OOM at 141 f/,
      "the too-long line judges whichever sizing mode upsizes",
    );
  });

  it("ARM B18 — THE NUMERIC SEATS ARE PER-WINDOW: a carried bag whose entries state different denoise schedules", () => {
    // 0.32 vs 0.4 is lawful now (round 27): the continuation wraps the
    // SAMPLER's model per window, and each window's own BasicScheduler
    // feeds both its continuation and its handoff. The old carry fed
    // one schedule to a whole list, which is exactly the divergence the
    // film's own carry deleted.
    // The bag door refuses the carried shape (F3-14 stand-down, ARM
    // B2): per-window schedules stay a carrier law until the engine cure.
    const g = new GraphBuilder();
    renderH3RefineBag(
      [entry(), entry({ start_seconds: 26 / 24, denoise: 0.4 })],
      {}, facts, g, "run-b18",
    );
    assert.deepEqual(ofClass(walk(g), "BasicScheduler").map(([, n]) => n.inputs.denoise), [0.32, 0.4],
      "each window's own denoise schedule composes through the bag door, film order");
    const carrier = new GraphBuilder();
    renderH3RefineCarry(
      [entry(), entry({ start_seconds: 26 / 24, denoise: 0.4 })],
      {}, facts, carrier,
      [{ cap: Math.round(2 * FPS), skip: 0 }, { cap: Math.round(2 * FPS), skip: 26 }],
      [22],
      "run-b18",
    );
    const nodes = walk(carrier);
    assert.deepEqual(ofClass(nodes, "BasicScheduler").map(([, n]) => n.inputs.denoise), [0.32, 0.4],
      "each window's own denoise schedule composes, film order");
    const cont = ofClass(nodes, "MiniMaxH3FiniteLatentContinuation")[0]!;
    assert.equal(nodeOf(nodes, cont[1].inputs.sigmas).inputs.denoise, 0.4,
      "the continuation reads the schedule of the window it opens");
  });

  it("ARM B19 — THE SEATLESS-SECOND-ENTRY CARRY: a token-exact carry whose second entry names no prompt refuses at the window's own door", () => {
    // the second entry names no prompt at all: the bag's seat loop
    // owns the refusal (missing seat), whichever join it would take.
    assert.throws(
      () => renderH3RefineBag(
        [entry(), { source_clip: "staged/source.mp4", clip_seconds: 2, start_seconds: 26 / 24 }],
        {}, facts, new GraphBuilder(), "run-b19",
      ),
      /'refine_prompt' names no media/,
      "an absent prompt is never a per-window conditioning — the window's seat door owns the refusal",
    );
  });

  it("ARM B20 — THE ONE-ENTRY AUTO-TILE (F67): a lone entry stating windows > 1 tiles ITSELF — derived starts, the default overlap taking the film's carry face", () => {
    // 48 f windows, the DEFAULT 22 f overlap: step = 26 f, starts
    // 0/26/52 — the frame math the human states as TWO dials. The
    // overlap is token-exact, so the loop takes the carry face: one
    // continuation per join, one handoff per window, a head-trim per
    // carried window and the plain file concat (renderH3RefineCarry
    // through the bag door).
    const g = new GraphBuilder();
    renderH3RefineBag([entry({ windows: 3 })], {}, facts, g, "run-b20");
    const doorNodes = walk(g);
    assert.equal(ofClass(doorNodes, "MiniMaxH3FiniteLatentContinuation").length, 2,
      "the auto-tile's carried loop composes through the bag door — one continuation per join");
    // the carrier's own arithmetic for the same seats (starts 0/26/52)
    const carrier = new GraphBuilder();
    renderH3RefineCarry(
      [entry(), entry(), entry()],
      {}, facts, carrier,
      [
        { cap: Math.round(2 * FPS), skip: 0 },
        { cap: Math.round(2 * FPS), skip: 26 },
        { cap: Math.round(2 * FPS), skip: 52 },
      ],
      [22, 22],
      "run-b20",
    );
    const nodes = walk(carrier);
    const loads = ofClass(nodes, "VHS_LoadVideo")
      .map(([, n]) => ({ cap: n.inputs.frame_load_cap, skip: n.inputs.skip_first_frames }));
    assert.deepEqual(loads, [
      { cap: Math.round(2 * FPS), skip: 0 },
      { cap: Math.round(2 * FPS), skip: 26 },
      { cap: Math.round(2 * FPS), skip: 52 },
    ], "window k starts at start_seconds + k × (cap − overlap) — the compose does the tiling math");
    assert.deepEqual(
      ofClass(nodes, "SaveVideo").map(([, n]) => n.inputs.filename_prefix),
      ["run-b20/refine_w0", "run-b20/refine_w1", "run-b20/refine_w2", "run-b20/refine"],
      "three per-window member saves + the one terminal film",
    );
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteLatentContinuation").length, 2,
      "one continuation per join — the film's own carry, never a list");
    assert.equal(ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 3,
      "one handoff per window — each member re-renders under its carry");
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize").length, 2,
      "windows 1 and 2 trim their carried heads");
    assert.equal(ofClass(nodes, "MeliteCollectLatents").length, 0, "no list door");
    const concat = ofClass(nodes, "MeliteConcatVideos")[0]!;
    assert.equal(concat[1].inputs.videos, "run-b20/refine_w0,run-b20/refine_w1,run-b20/refine_w2",
      "the concat consumes the member prefixes in film order");
    assert.equal(ofClass(nodes, "MeliteOverlapJoinVideos").length, 0, "no crossfade — the carry is the latent");
  });

  it("ARM B21 — THE AUTO-TILE LIVES ON A LONE ENTRY: a multi-entry bag stating windows > 1 refuses (two tilings stated)", () => {
    assert.throws(
      () => renderH3RefineBag(
        [entry({ windows: 2 }), entry({ start_seconds: 1.5 })],
        {}, facts, new GraphBuilder(), "run-b21",
      ),
      /a multi-entry bag states windows above 1 — the bag already IS the tiling/,
      "a bag entry and a windows seat never tile twice — the hand-tiled bag is its own tiling",
    );
  });

  it("ARM B22 — A LONE SINGLE WINDOW IGNORES THE OVERLAP SEAT: no join, the walk emission byte-identical", () => {
    // overlap_frames with windows = 1 is a join seat on a joinless
    // press — it rides along unused (the seat's own tooltip says so),
    // never a second meaning and never a refusal. The law is judged
    // against the seatless bag: stating the seat changes NOTHING.
    const plain = new GraphBuilder();
    renderH3RefineBag([entry()], {}, facts, plain, "run-b22");
    const seated = new GraphBuilder();
    renderH3RefineBag([entry({ overlap_frames: 5 })], {}, facts, seated, "run-b22");
    assert.deepEqual(walk(seated), walk(plain),
      "a stated overlap on a lone window changes no byte — the seat rides only with Windows above 1");
    assert.equal(ofClass(walk(seated), "MeliteCollectLatents").length, 0, "no list door on a lone window");
    assert.equal(ofClass(walk(seated), "MeliteOverlapJoinVideos").length, 0, "no join on a lone window");
  });

  it("ARM B23 — THE AUTO-TILE'S OWN SEATS REFUSE LOUD: fractional or out-of-range windows, fractional or negative overlap", () => {
    assert.throws(
      () => renderH3RefineBag([entry({ windows: 2.5 })], {}, facts, new GraphBuilder(), "run-b23-frac"),
      /windows 2\.5 — one entry auto-tiles a whole number of windows/,
      "a fractional window count refuses naming the seat",
    );
    assert.throws(
      () => renderH3RefineBag([entry({ windows: 0 })], {}, facts, new GraphBuilder(), "run-b23-zero"),
      /windows 0 — one entry auto-tiles a whole number of windows/,
      "zero windows refuses (1 is the walk posture, never 0)",
    );
    assert.throws(
      () => renderH3RefineBag([entry({ windows: MAX_COMPOSED_WINDOWS + 1 })], {}, facts, new GraphBuilder(), "run-b23-max"),
      new RegExp(`windows ${MAX_COMPOSED_WINDOWS + 1} — one entry auto-tiles a whole number of windows from 2 to ${MAX_COMPOSED_WINDOWS}`),
      "past the composed-window ceiling refuses at the entry's own door",
    );
    assert.throws(
      () => renderH3RefineBag([entry({ windows: 2, overlap_frames: 2.5 })], {}, facts, new GraphBuilder(), "run-b23-overlap"),
      /overlap_frames 2\.5 — the carried overlap is whole frames/,
      "a fractional overlap refuses naming the seat",
    );
    assert.throws(
      () => renderH3RefineBag([entry({ windows: 2, overlap_frames: -1 })], {}, facts, new GraphBuilder(), "run-b23-neg"),
      /overlap_frames -1 — the carried overlap is whole frames at or above zero/,
      "a negative overlap refuses naming the seat",
    );
    // the ceiling still judges each DERIVED window: 6 s windows at
    // 2x are 144 f — past the measured 141 f OOM point
    assert.throws(
      () => renderH3RefineBag([entry({ windows: 2, clip_seconds: 6 })], {}, facts, new GraphBuilder(), "run-b23-oom"),
      /a 144 f window at 2x is TOO LONG — the 2x pass was measured OOM at 141 f/,
      "the auto-tile never multiplies past the too-long line — each derived window refuses by name",
    );
    // and an overlap at least as long as the window walks nowhere
    assert.throws(
      () => renderH3RefineBag([entry({ windows: 2, clip_seconds: 0.5 })], {}, facts, new GraphBuilder(), "run-b23-step"),
      /overlap 22 f against a 12 f window — a carried overlap shorter than the window is the only walk that advances/,
      "window ≤ overlap refuses — the step must advance",
    );
  });

  it("ARM B26 — THE ORIGIN SEATS REFUSE LOUD: a length that books no frames and a start before the first frame refuse on BOTH doors the origin owner serves", () => {
    // refineWindowOrigin is ONE owner for the single-window arm and
    // the bag carrier, so a stated length/start judges identically
    // whichever door binds it — and the refusal teaches the design
    // window (W-7: 2.33 s = 56 f), never a bare number.
    // the length: 0 s books no frames at the film clock
    const singleClip = new GraphBuilder();
    assert.throws(
      () => renderH3RefineBag([entry({ clip_seconds: 0 })], {}, facts, singleClip, "run-b26-single-clip"),
      /h3-timeline refine: clip_seconds 0 — a refine window needs frames .*the design window is 2\.33 s = 56 f/,
      "the single-window arm refuses a length that books no frames, naming the design window",
    );
    assert.deepEqual(walk(singleClip), {}, "the refusal lands BEFORE any node");
    const bagClip = new GraphBuilder();
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ clip_seconds: 0, start_seconds: 2 })], {}, facts, bagClip, "run-b26-bag-clip",
      ),
      /h3-timeline refine: clip_seconds 0 — a refine window needs frames/,
      "the bag's own origins walk judges the second entry's stated length identically",
    );
    assert.deepEqual(walk(bagClip), {}, "no node emitted");
    // the start: before the clip's first frame
    const singleStart = new GraphBuilder();
    assert.throws(
      () => renderH3RefineBag([entry({ start_seconds: -1 })], {}, facts, singleStart, "run-b26-single-start"),
      /h3-timeline refine: start_seconds -1 — a window starts at or after the clip's first frame/,
      "the single-window arm refuses a start before the clip's first frame",
    );
    assert.deepEqual(walk(singleStart), {}, "no node emitted");
    const bagStart = new GraphBuilder();
    assert.throws(
      () => renderH3RefineBag(
        [entry(), entry({ start_seconds: -1 })], {}, facts, bagStart, "run-b26-bag-start",
      ),
      /h3-timeline refine: start_seconds -1 — a window starts at or after the clip's first frame/,
      "the bag's origins walk refuses the negative start before any join judgment",
    );
    assert.deepEqual(walk(bagStart), {}, "no node emitted");
  });

  it("ARM B27 — THE CARRY MOUNTS EVERY JOIN: a three-window carried bag composes one continuation per join, chained window-to-window", () => {
    // ARM B2 judges the singular face (one join); a hand-tiled
    // three-window bag states TWO carried joins — both token-exact —
    // and the re-armed door mounts the film's continuation for EACH,
    // each over the IMMEDIATELY PRECEDING window's joint target (the
    // round-27 chain, judged here through the bag door).
    const g = new GraphBuilder();
    const out = renderH3RefineBag(
      [entry(), entry({ start_seconds: 26 / 24 }), entry({ start_seconds: 52 / 24 })],
      {}, facts, g, "run-b27",
    );
    assert.ok(out, "the three-window carried bag composes");
    const nodes = walk(g);
    const conts = ofClass(nodes, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 2, "one continuation per carried join — the plural face");
    assert.equal(ofClass(nodes, "MiniMaxH3ContexMaskedTarget").length, 3,
      "one joint target per window");
    assert.equal(ofClass(nodes, "VHS_LoadVideo").length, 3, "three windows, three loaders");
    assert.equal(ofClass(nodes, "MeliteConcatVideos").length, 1, "the one terminal film");
  });

  it("the arm predicate is bag presence (the same law as the replace/repair/extend arms — the coverage-arm law, 2026-11-07)", () => {
    // a commission is armed when its bag is a NON-EMPTY ARRAY: an
    // absent or empty bag leaves the compose byte-stable on the
    // film path (the card's own gating). The predicate is exported
    // because the card door and the collapse's compose-through both
    // read it — this is its own firing arm.
    assert.equal(refineArmed({}), false, "an absent bag never arms");
    assert.equal(refineArmed({ refine: [] }), false, "an empty bag is the explicit off — never armed");
    assert.equal(refineArmed({ refine: [entry()] }), true, "a non-empty bag arms the commission");
  });

  it("THE SEAT LAW refuses an unbound seat naming both seats (a refine rides no empty seat)", () => {
    // both seats bound is the reshoot idiom the refine shares: the
    // source clip is the window's own prior and the prompt is the
    // pass's text; a blank either composes a silent half, so the
    // window's own door refuses loud naming the seat.
    assert.throws(
      () => renderH3Refine(entry({ source_clip: "" }), {}, facts, new GraphBuilder(), "run-seat-src"),
      /refine: 'source_clip' names no media.*a refine needs both seats bound/s,
      "a blank source_clip refuses naming both seats",
    );
    assert.throws(
      () => renderH3Refine(entry({ refine_prompt: " " }), {}, facts, new GraphBuilder(), "run-seat-prm"),
      /refine: 'refine_prompt' names no media.*a refine needs both seats bound/s,
      "a whitespace prompt refuses naming both seats",
    );
  });
});
