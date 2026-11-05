// @contract cards-h3-refine-arm
// @melite/video-h3-timeline — the refine arm rows (the fifth mod
// bag). Drives the registered card's own doors (def.mods for the
// served kind, def.compose for the branch, resolveFlowOutputs for
// the terminal): the kind is served verbatim with the arm-gated
// packs, an absent or EMPTY bag leaves the film path byte-identical
// (zero handoff classes), a bound arm refuses LOUD — missing seats
// name the seat, full denoise names the sigmas law — and the
// complete entry composes the standalone second pass (VHS source →
// split-stream encode → the RefineHandoff at 2x → decode → the
// refine SaveVideo, no loop lineage). Every cross-arm pair refuses
// LOUD naming the silently-dropped arm. Every row asserts served
// truth or refusal text — never expect(true).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs, resolveCardFlowOutputs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { deriveCommissions } from "../src/ui/studio/commissions.ts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS, refineArmed } from "../../../models/h3/src/refine.ts";
import { MAX_COMPOSED_WINDOWS, SEAM_OVERLAP_FRAMES } from "../../../models/h3/src/timelineContract.ts";

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

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);
const refOf = (v: unknown): string => (Array.isArray(v) ? String(v[0]) : String(v));
const nodeOf = (out: Record<string, Node>, ref: unknown): Node => out[refOf(ref)]!;

// The refine-only classes (the handoff + the split-stream audio
// encode — zero of these may ever appear in a disarmed film graph:
// the film's handoff mounts only under upscale_route latent_2x and
// the film never encodes audio through VAEEncodeAudio).
const REFINE_CLASSES = [
  'MinimaxH3LatentUpscaler3DRefineHandoff',
  'VAEEncodeAudio',
];

const REFINE_ENTRY = (): Record<string, unknown> => ({
  source_clip: 'swap_film_v1.mp4',
  refine_prompt: 'the same scene, sharper fabric weave and cleaner edges',
});

const kind = () =>
  ((def as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === 'refine');

describe("the refine kind (the fifth mod bag)", () => {
  it("is served verbatim with the arm-gated packs and the refine seats", () => {
    const refine = kind();
    assert.ok(refine, "the h3-timeline card serves the refine kind on the modifiers channel");
    assert.equal(refine.param_key, 'refine', "the bag rides param_key 'refine'");
    assert.equal(refine.schema_key, 'refine', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution)");
    assert.equal(refine.max_stack, MAX_COMPOSED_WINDOWS, "the bag stacks to the film's composed-window ceiling (GAPS-19: the entries ARE the windows, the same window count that caps one extend press caps one refine press)");
    assert.deepEqual(refine.requires, [
      'ComfyUI-VideoHelperSuite',
      'ComfyUI-KJNodes',
      'ComfyUI-MiniMaxH3Mod',
      'Comfyui_Minimax_h3_latent_Upscaler-Plus',
      'melite-utility-nodes',
    ], "the arm-gated packs: the VHS loader, the plane, the handoff, the resample tail");
    const names = ((refine as { fields?: Array<{ name?: string }> }).fields ?? []).map((f) => f.name);
    assert.deepEqual(names, [
      'source_clip', 'refine_prompt', 'denoise', 'steps', 'seed',
      // THE WINDOW (F24, round 6): the pass refines a window, not the
      // whole clip — the length and where it starts
      'clip_seconds', 'start_seconds',
      // THE CAPACITY SEATS (F24, 2026-10-30): the node's own sizing
      // mode + multiplier — a ≤1x pass fits clips the 2x OOMs
      'mode', 'scale',
      // THE AUTO-TILE (F67, 2026-11-15 — the operator: "the AI can
      // make windows, but the human operator can't"): one entry
      // tiles ITSELF — a SIZE and a COUNT instead of hand-tiled
      // entries with frame-exact starts
      'windows', 'overlap_frames',
    ], "exactly the refine seats — no mask seat (no masked edit), no keep_audio (the soundtrack is the source's own, fixed)");
  });

  it("THE AUTO-TILE SEATS (F67): windows defaults to the single-window walk, overlap to the film's own token-exact seam", () => {
    const refine = kind();
    assert.ok(refine, "the refine kind serves");
    const fields = ((refine as { fields?: Array<Record<string, unknown>> }).fields ?? []);
    const windows = fields.find((f) => f.name === 'windows');
    const overlap = fields.find((f) => f.name === 'overlap_frames');
    assert.ok(windows !== undefined && overlap !== undefined, "both auto-tile seats serve");
    assert.equal(windows.default, 1, "windows defaults to the single-window walk posture");
    assert.equal(windows.min, 1, "windows never tiles zero");
    assert.equal(windows.max, MAX_COMPOSED_WINDOWS, "windows tiles at most the composed-window ceiling (the bag's own max_stack)");
    assert.equal(overlap.default, SEAM_OVERLAP_FRAMES, "overlap defaults to the film's own seam (DERIVED from the family contract — never a hand-typed 22)");
    assert.equal(overlap.min, 0, "a zero overlap is the lawful hard-cut walk");
  });

  it("is admitted on the card door — the stated bag is not an undeclared param", () => {
    assert.ok(((def as { admits?: string[] }).admits ?? []).includes('refine'), "the card admits the refine bag");
  });

  it("leaves the film path byte-identical with the arm empty — zero handoff classes", () => {
    for (const bag of [undefined, []]) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        ...(bag === undefined ? {} : { refine: bag }),
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, 'run_rfmod_disarmed');
      const out = graphOf(g);
      for (const cls of REFINE_CLASSES) {
        assert.equal(ofClass(out, cls).length, 0, `a disarmed film carries no ${cls}`);
      }
    }
  });

  it("THE ONE-FILM LAW (GAPS-19): a bag naming TWO staged leaves refuses LOUD — the tiling joins windows of one timeline", () => {
    // The historic two-entry refusal (the silent-drop class, max_stack
    // 1) re-aimed by the same fixture: two entries are now LEGAL —
    // windows of ONE film — so the crime this arm judges is the mixed
    // source, not the second entry.
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [REFINE_ENTRY(), { ...REFINE_ENTRY(), source_clip: 'other.mp4' }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_rfmod_two'),
      /ONE FILM PER BAG: a multi-entry refine tiles windows of ONE staged leaf into one film/,
      'a two-source join refuses naming the one-film law',
    );
  });

  it("THE STACK GUARD'S OWN ARM (GAPS-19): a bag past the composed-window ceiling refuses at the card door", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: Array.from({ length: MAX_COMPOSED_WINDOWS + 1 }, () => REFINE_ENTRY()),
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_rfmod_stack'),
      new RegExp(`max_stack is the film's composed-window ceiling \\(${MAX_COMPOSED_WINDOWS} windows\\)`),
      'the ceiling fires at the door on its own arm, never downstream',
    );
  });

  it("THE SEQUENTIAL-PRESS LAW at the card door (GAPS-19): a ONE-entry bag composes the single-window emission — no boundary, no concat, no finalize", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [REFINE_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_rfmod_one');
    const out = graphOf(g);
    assert.equal(ofClass(out, 'SaveVideo').length, 1, 'one save — the window itself, no per-window saves');
    assert.equal(String(ofClass(out, 'SaveVideo')[0]![1].inputs['filename_prefix']), 'run_rfmod_one/refine', 'at the arm\'s own prefix');
    assert.equal(ofClass(out, 'MeliteUnload').length, 0, 'no boundary — the single window orders nothing');
    assert.equal(ofClass(out, 'MeliteConcatVideos').length, 0, 'no concat — one window joins nothing');
    assert.equal(ofClass(out, 'MiniMaxH3FiniteSegmentFinalize').length, 0, 'no carried head on the first window');
    assert.equal(ofClass(out, 'MiniMaxH3FiniteLatentContinuation').length, 0, 'no carry node on the refine path');
  });

  it("THE CARRY STAND-DOWN AT THE CARD DOOR (F3-14): a 2-entry carried bag refuses before any node, naming the engine failure and the hard-cut cure", () => {
    // THE FILM PATH (the proven skeleton): one press, two windows,
    // per-window saves, the boundary chain, the in-graph concat.
    const filmG = new GraphBuilder();
    def.compose(def.schema({
      calls: [
        { text: 'a slow push in', start_frame: 0, end_frame: 56 },
        { text: 'then a turn', start_frame: 56, end_frame: 124 },
      ],
      length: 124,
    }) as Record<string, unknown>, model, filmG, 'run_rfmod_film2');
    const film = graphOf(filmG);
    // THE REFINE BAG (the F3-14 stand-down): two entries of ONE staged
    // leaf — 90 f windows, the second starting 68 f in, the carried
    // overlap deriving to 0 + 90 − 68 = 22 f, the film's own
    // token-exact seam. The compose mounts that carry correctly, but
    // the engine dies at window 1's handoff, so the CARD DOOR refuses
    // the shape before a node exists — the parity this arm judges is
    // the film path's own skeleton plus the refine door's exact voice.
    const bagG = new GraphBuilder();
    assert.throws(
      () => def.compose(def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [REFINE_ENTRY(), { ...REFINE_ENTRY(), start_seconds: 68 / 24 }],
      }) as Record<string, unknown>, model, bagG, 'run_rfmod_bag2'),
      /the carried join \(window 0→1 carries 22 f\) would carry the film's own continuation between windows — and that carry is DEAD in the engine today \(F3-14/,
      'the card door refuses the carried tiling, naming the engine failure and the hard-cut cure',
    );
    assert.deepEqual(graphOf(bagG), {},
      'no node emitted — the refusal precedes every save, so nothing can bill');

    // THE FILM PATH'S OWN SKELETON still holds (the carry it mounts is
    // the normal gen's, which the engine serves):
    const filmWins = ['run_rfmod_film2/h3_t4_w1', 'run_rfmod_film2/h3_t4_w2'];
    const filmTerminal = 'run_rfmod_film2/h3_t4_film';
    const saves = ofClass(film, 'SaveVideo').map(([, n]) => String(n.inputs['filename_prefix']));
    assert.deepEqual([...saves].sort(), [filmTerminal, ...filmWins].sort(),
      'N window saves + the one terminal');
    assert.equal(ofClass(film, 'MeliteUnload').length, filmWins.length,
      'one unload boundary per window');
    const concats = ofClass(film, 'MeliteConcatVideos');
    assert.equal(concats.length, 1, 'the plain concat joins the files');
    assert.equal(concats[0]![1].inputs['videos'], filmWins.join(','),
      'the join consumes the N window prefixes in film order');
    assert.equal(ofClass(film, 'MiniMaxH3FiniteLatentContinuation').length, 1,
      'one continuation at the one carried join');
    assert.equal(ofClass(film, 'MiniMaxH3FiniteSegmentFinalize').length, 1,
      'one head-trim on the carried window');
    const chainsOrderEverySave = (out: ReturnType<typeof graphOf>, wins: string[]): void => {
      const boundaries = ofClass(out, 'MeliteUnload');
      const finalBoundary = boundaries[boundaries.length - 1]!;
      const joinNode = ofClass(out, 'MeliteConcatVideos')[0]!;
      assert.equal(refOf(joinNode[1].inputs['after']), finalBoundary[0],
        'the join waits on the FINAL boundary token');
      for (const [, b] of boundaries) {
        const saveNode = nodeOf(out, b.inputs['video']);
        assert.equal(saveNode.class_type, 'SaveVideo', 'each boundary consumes its own window save');
        assert.ok(wins.includes(String(saveNode.inputs['filename_prefix'])), 'the boundary map covers the window set');
      }
    };
    chainsOrderEverySave(film, filmWins);
  });


  it("THE RAIL PROJECTS ONE ROW PER WINDOW (GAPS-19, the F29 precedent): a stacked refine bag shows every entry, never just the first", () => {
    // THE INVISIBILITY CLASS (the loras burn, generalized): a rail
    // that names bag[0] hides the second window — the operator sees
    // one commission where the run will tile two.
    const rows = deriveCommissions({ refine: [
      REFINE_ENTRY(),
      { ...REFINE_ENTRY(), start_seconds: 2.5, refine_prompt: 'the tail, sharper' },
    ] });
    assert.equal(rows.length, 2, 'one row per window entry');
    // the head omits its origin (rides the window's own 0 start); the
    // tail states 2.5s — each row carries the seats its entry stated
    assert.deepEqual(rows[0]!.seats.map((s) => s.key).sort(), ['refine_prompt', 'source_clip']);
    assert.equal(rows[1]!.seats.find((s) => s.key === 'start_seconds')!.value, '2.5',
      'the tail row carries its own window origin');
    assert.deepEqual(rows.map((r) => r.seats.find((s) => s.key === 'refine_prompt')!.value),
      ['the same scene, sharper fabric weave and cleaner edges', 'the tail, sharper'],
      'each row carries its own prompt');
    // the one-entry bag stays one row (the sequential-press face)
    assert.equal(deriveCommissions({ refine: [REFINE_ENTRY()] }).length, 1, 'one entry is one row');
  });

  it("the arm predicate is bag presence — armed only on a non-empty array", () => {
    assert.equal(refineArmed({}), false, 'no bag is disarmed');
    assert.equal(refineArmed({ refine: [] }), false, 'an empty bag is disarmed');
    assert.equal(refineArmed({ refine: [REFINE_ENTRY()] }), true, 'one entry is armed');
  });

  it("an armed bag refuses LOUD naming the empty seat", () => {
    for (const [entry, re] of [
      [{ refine_prompt: 'x' }, /h3-timeline refine: 'source_clip' names no media/],
      [{ source_clip: 'c.mp4' }, /h3-timeline refine: 'refine_prompt' names no media/],
    ] as Array<[Record<string, unknown>, RegExp]>) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [entry],
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      assert.throws(
        () => def.compose(walked, model, g, 'run_rfmod_seat'),
        re,
        'the refusal names the empty seat',
      );
    }
  });

  it("a full-denoise refine refuses LOUD naming the handoff sigmas law", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [{ ...REFINE_ENTRY(), denoise: 1 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_rfmod_denoise'),
      /h3-timeline refine: denoise 1 >= 1 — a second pass is a refine, never a re-render/,
      'denoise 1 is the reshoot door, never this arm',
    );
  });

  it("a bound arm composes the standalone second pass — the handoff at 2x on the family plane", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [REFINE_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_rfmod_armed');
    const out = graphOf(g);
    // the loader law: one force-rate-24 VHS read of the staged leaf.
    const loaders = ofClass(out, 'VHS_LoadVideo');
    assert.equal(loaders.length, 1, 'exactly one shared VHS loader');
    assert.equal(loaders[0]![1].inputs['video'], 'swap_film_v1.mp4', 'the loader reads the staged source clip');
    assert.equal(loaders[0]![1].inputs['force_rate'], 24, 'the film clock, never a private cadence');
    // THE JOINT AV TARGET (round 27): the estate's one source→nested-AV
    // constructor — white mask → FantasticVideoEditLatent (source frames
    // + source audio, keep_audio) → ContexMaskedTarget. It replaces the
    // split VAEEncode pair the handoff used to receive, because the
    // FILM'S OWN MiniMaxH3FiniteLatentContinuation (a joint-AV node) must
    // be able to carry the window.
    assert.equal(ofClass(out, 'GetImageSizeAndCount').length, 1, 'one size probe sizes the mask');
    assert.equal(ofClass(out, 'SolidMask').length, 1, 'one everywhere-generate mask');
    const edit = ofClass(out, 'MiniMaxH3FantasticVideoEditLatent');
    assert.equal(edit.length, 1, 'the frames + soundtrack encode through the joint edit latent');
    assert.equal(edit[0]![1].inputs['keep_audio'], true, 'the source soundtrack is held, never re-generated');
    assert.equal(nodeOf(out, edit[0]![1].inputs['images']).class_type, 'VHS_LoadVideo', 'the edit latent reads the windowed FRAMES');
    assert.deepEqual(edit[0]![1].inputs['audio'], [loaders[0]![0], 2], 'the edit latent reads the loader\'s windowed AUDIO slot');
    const targets = ofClass(out, 'MiniMaxH3ContexMaskedTarget');
    assert.equal(targets.length, 1, 'the masked target is the handoff\'s joint latent');
    assert.deepEqual(targets[0]![1].inputs['mask'], [ofClass(out, 'SolidMask')[0]![0], 0],
      'its mask seat is a LINK (F10 — a bare handle dies at reshape)');
    const cond = ofClass(out, 'CLIPTextEncode');
    assert.ok(cond.some(([, n]) => n.inputs['text'] === 'the same scene, sharper fabric weave and cleaner edges'), 'the refine prompt rides the positive seat');
    // THE HANDOFF (the one-variant law): single node, 2x, locked
    // audio, the learned weights, the partial-denoise schedule.
    const hands = ofClass(out, 'MinimaxH3LatentUpscaler3DRefineHandoff');
    assert.equal(hands.length, 1, 'exactly one handoff — no external guider or second sampler');
    const h = hands[0]![1].inputs;
    assert.equal(h['model_name'], 'minimax_h3_latent_upscaler_3d_bf16.safetensors', 'the learned 3D-conv weights');
    assert.equal(h['mode'], 'scale by multiplier', 'the film handoff spelling');
    // F23 (2026-10-30): the combo's CHILD rides the DOTTED path — the
    // THIS node's own declaration: flat `mode` + a REQUIRED top-level
    // `scale` (production /object_info; the dotted spelling belongs to
    // the DynamicCombo node chainUpscale mounts, never here)
    assert.equal(h['scale'], 2.0, 'the default variant: 2x');
    assert.equal(h['mode.scale'], undefined, 'never the dynamic-combo spelling');
    assert.equal(h['lock_audio'], true, 'the soundtrack is the source\'s own, fixed');
    assert.equal(h['precision'], 'bf16', 'the film handoff precision');
    assert.equal(h['device'], 'cuda', 'the film handoff device');
    const sched = ofClass(out, 'BasicScheduler');
    assert.ok(sched.some(([, n]) => n.inputs?.['denoise'] === 0.32), 'the refinement window (default 0.32) rides the schedule');
    // decode + the film tail's file law, no loop lineage.
    assert.equal(ofClass(out, 'VAEDecode').length, 1, 'the upscaled latent decodes');
    assert.equal(ofClass(out, 'VAEDecodeAudio').length, 1, 'the refined soundtrack decodes');
    const saves = ofClass(out, 'SaveVideo');
    assert.equal(saves.length, 1, 'a single terminal SaveVideo');
    assert.equal(String(saves[0]![1].inputs['filename_prefix']), 'run_rfmod_armed/refine', 'the refine prefix rides the run id');
    assert.equal(ofClass(out, 'MiniMaxH3ChainAssemble').length, 0, 'no ChainAssemble — a refine has no loop lineage to assemble');
  });

  it("THE WINDOW (F24, round 6): the loader reads ONE window — clip_seconds as frame_load_cap, start_seconds as skip_first_frames", () => {
    // The burn: the arm loaded the WHOLE staged clip, so the 2x
    // handoff died on anything past the measured ceiling (141 f OOM,
    // §13.2). The cure is the loader's own two seats — nothing else
    // in the graph may carry the film's full length.
    const compose1 = (entry: Record<string, unknown>, runId: string) => {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [entry],
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, runId);
      return graphOf(g);
    };
    // the shipped default: 3.75 s = 90 f, from the first frame
    const dflt = compose1(REFINE_ENTRY(), 'run_rfmod_window_default');
    const ld = ofClass(dflt, 'VHS_LoadVideo')[0]![1].inputs;
    assert.equal(ld['frame_load_cap'], 90, 'the default window is 90 f (3.75 s at the film clock) — the widest measured-green 2x window, never 0 (the whole clip)');
    assert.equal(ld['skip_first_frames'], 0, 'the default window starts at the clip head');
    const prev = ofClass(dflt, 'ModelPreviewOverrideKJ');
    assert.equal(prev.length, 1, 'the plane still carries its preview override');
    assert.equal(prev[0]![1].inputs['preview_frames'], 90, 'the preview budget frames the same window the pass reads');
    // a moved window: 2 s from 5 s
    const moved = compose1({ ...REFINE_ENTRY(), clip_seconds: 2, start_seconds: 5 }, 'run_rfmod_window_moved');
    const ld2 = ofClass(moved, 'VHS_LoadVideo')[0]![1].inputs;
    assert.equal(ld2['frame_load_cap'], 48, '2 s at 24 fps = 48 f read');
    assert.equal(ld2['skip_first_frames'], 120, '5 s at 24 fps = 120 f skipped (VHS offsets the soundtrack by the same skip)');
  });

  it("THE WINDOW refuses LOUD where the measured 2x OOM sits — and a same-size pass keeps its wider window", () => {
    const walk = (entry: Record<string, unknown>) =>
      def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [entry],
      }) as Record<string, unknown>;
    for (const [entry, re] of [
      [{ ...REFINE_ENTRY(), clip_seconds: 0 }, /clip_seconds 0 — a refine window needs frames/],
      [{ ...REFINE_ENTRY(), start_seconds: -1 }, /start_seconds -1 — a window starts at or after the clip's first frame/],
      [{ ...REFINE_ENTRY(), clip_seconds: 6 },
        /a 144 f window at 2x — the 2x pass was measured OOM at 141 f and green at 90 f/],
    ] as Array<[Record<string, unknown>, RegExp]>) {
      assert.throws(() => def.compose(walk(entry), model, new GraphBuilder(), 'run_rfmod_window_guard'), re,
        'the window guard names the measured ceiling, never a silent OOM');
    }
    // the same window at the same-size pass sizes its own: no refusal
    const same = walk({ ...REFINE_ENTRY(), clip_seconds: 6, scale: 1 });
    const g = new GraphBuilder();
    def.compose(same, model, g, 'run_rfmod_window_flat');
    assert.equal(ofClass(graphOf(g), 'VHS_LoadVideo')[0]![1].inputs['frame_load_cap'], 144,
      'a ≤1x pass reads the stated window — the 2x ceiling is a 2x law, not a clip law');
  });

  it("THE WINDOW'S SOUNDTRACK (refine-window audit C2): the loader's audio slot feeds VAEEncodeAudio, whose latent is the handoff's audio_latent — with select_every_nth pinned at 1", () => {
    // THE BURN CLASS this arm closes: the soundtrack half of the window
    // had no judge. VHS derives its audio window as
    // `frame_load_cap × target_frame_time × select_every_nth`
    // (load_video_nodes.py:400-403, utils.py:224-230) — so an nth move
    // desyncs A/V while every wall stays green, and a re-wire that fed
    // the handoff the FULL clip's soundtrack would refine windowed
    // frames against unwindowed audio with no refusal anywhere.
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [{ ...REFINE_ENTRY(), clip_seconds: 2.33, start_seconds: 1.5 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_rfmod_audio_window');
    const out = graphOf(g);
    const loaders = ofClass(out, 'VHS_LoadVideo');
    assert.equal(loaders.length, 1, 'one shared loader (the film\'s own law)');
    const [loaderId, loader] = loaders[0]!;
    assert.equal(loader.inputs['frame_load_cap'], Math.round(2.33 * 24), 'the window is the loader\'s cap (56 f)');
    assert.equal(loader.inputs['skip_first_frames'], Math.round(1.5 * 24), 'the window start is the loader\'s skip (36 f)');
    assert.equal(loader.inputs['select_every_nth'], 1, 'VHS audio duration = cap × tft × nth: nth 1 is the window law');
    const edit = ofClass(out, 'MiniMaxH3FantasticVideoEditLatent');
    assert.equal(edit.length, 1, 'the window encodes once, as ONE joint AV latent');
    assert.equal(nodeOf(out, edit[0]![1].inputs['images']).class_type, 'VHS_LoadVideo', 'the frames seat reads the loader');
    assert.deepEqual(edit[0]![1].inputs['audio'], [loaderId, 2], 'the audio seat reads the loader\'s AUDIO slot, never its frames');
    const hands = ofClass(out, 'MinimaxH3LatentUpscaler3DRefineHandoff');
    assert.equal(hands.length, 1);
    const target = ofClass(out, 'MiniMaxH3ContexMaskedTarget')[0]!;
    assert.deepEqual(hands[0]![1].inputs['latent'], [target[0], 0], 'the handoff\'s latent is the window\'s JOINT masked target');
    assert.equal(hands[0]![1].inputs['audio_latent'], undefined,
      'no split audio_latent — a joint-AV latent rides one wire (the continuation can only carry that shape)');
    assert.equal(ofClass(out, 'VAEEncode').length, 0, 'no split video encode on the refine path');
    assert.equal(ofClass(out, 'VAEEncodeAudio').length, 0, 'no split audio encode on the refine path');
  });

  it("THE CEILING IS THE WINDOW'S (refine-window audit C1): a target-dimensions or megapixels window past the measured frame ceiling refuses loud — only a same-size multiplier pass is exempt", () => {
    const walk = (entry: Record<string, unknown>) =>
      def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [entry],
      }) as Record<string, unknown>;
    for (const mode of ['target dimensions', 'megapixels']) {
      assert.throws(() => def.compose(walk({ ...REFINE_ENTRY(), clip_seconds: 6, mode }), model, new GraphBuilder(), 'run_rfmod_upsize_ceiling'),
        /a 144 f window at target dimensions|a 144 f window at megapixels/,
        `the ${mode} mode upsizes on its own budget — the window ceiling is not the multiplier's private law`);
    }
    // a same-size pass keeps the wider window (the capacity cure)
    const flat = walk({ ...REFINE_ENTRY(), clip_seconds: 6, scale: 1 });
    const g = new GraphBuilder();
    def.compose(flat, model, g, 'run_rfmod_flat_ceiling');
    assert.equal(ofClass(graphOf(g), 'VHS_LoadVideo')[0]![1].inputs['frame_load_cap'], 144,
      'a 1x pass reads the wider window — its upscaler is the identity');
  });

  it("THE CAPACITY SEATS (F24): a stated scale ≤ 1 rides the handoff verbatim — the same-size refine fits what the 2x pass OOMs", () => {
    const entry = { source_clip: 'swap_film_v1.mp4', refine_prompt: 'the same scene', denoise: 0.32, steps: 6, mode: 'scale by multiplier', scale: 1 };
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [entry],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_rfmod_scale1');
    const hands = ofClass(graphOf(g), 'MinimaxH3LatentUpscaler3DRefineHandoff');
    assert.equal(hands.length, 1);
    const h = hands[0]![1].inputs;
    assert.equal(h['scale'], 1, 'the stated capacity lever rides verbatim (the flat seat)');
    assert.equal(h['mode.scale'], undefined, 'never the dynamic-combo spelling');
    assert.equal(h['mode'], 'scale by multiplier', 'the stated mode rides verbatim');
    // a target-dimensions pass is the other served capacity route
    const exact = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [{ ...entry, mode: 'target dimensions' }],
    }) as Record<string, unknown>;
    const g2 = new GraphBuilder();
    def.compose(exact, model, g2, 'run_rfmod_dims');
    assert.equal(ofClass(graphOf(g2), 'MinimaxH3LatentUpscaler3DRefineHandoff')[0]![1].inputs['mode'], 'target dimensions');
  });

  it("the card's measured window numbers are DERIVED from the model's constants (refine-window audit D1): a ceiling move re-words the served face", () => {
    // The burn class: the served tooltip and section named "90 f" /
    // "141 f" as hand-typed prose while the model package exported
    // REFINE_DEFAULT_CLIP_SECONDS and REFINE_2X_OOM_FRAMES. Move the
    // ceiling and the card lies about what the door enforces — and no
    // arm would notice, because tooltips had no judge anywhere. The
    // cure is derivation (card.ts interpolates the constants) and this
    // arm judges it: the served numbers equal the exported ones.
    const kind = (def.mods ?? []).find((m) => m.param_key === 'refine');
    assert.ok(kind, 'the card declares the refine bag');
    const green = String(REFINE_DEFAULT_CLIP_SECONDS * 24);
    const ceiling = String(REFINE_2X_OOM_FRAMES);
    type SeatRow = { name: string; tooltip?: string; default?: unknown };
    const clip = ((kind!.fields ?? []) as SeatRow[]).find((f) => f.name === 'clip_seconds');
    assert.ok(clip?.tooltip?.includes(`${green} f`), `the served tooltip names the green window derived from the constant (${green} f)`);
    assert.ok(clip?.tooltip?.includes(`${ceiling} f`), `and the OOM ceiling derived from the constant (${ceiling} f)`);
    assert.equal(typeof clip?.default, 'number');
    assert.equal(clip!.default, REFINE_DEFAULT_CLIP_SECONDS, 'the served default IS the constant');
    assert.ok(kind!.section?.includes(`${green} f`) && kind!.section?.includes(`${ceiling} f`),
      'the section states the same measured pair');
  });

  it("an armed refine resolves its default output to the refine SaveVideo", () => {
    const compose = (refine: Record<string, unknown>[], runId: string) => {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine,
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, runId);
      return { walked, g };
    };
    // THE ONE-ENTRY FACE (unchanged by the carrier): the window save
    // IS the terminal.
    const one = compose([REFINE_ENTRY()], 'run_rfmod_out');
    const flow = resolveCardFlowOutputs(def, one.walked, graphOf(one.g));
    assert.deepEqual(flow.outputs, { default: 'video' }, 'the refine still serves the video channel');
    const out = graphOf(one.g);
    const node = out[flow.outputNodes.default!];
    assert.ok(node, 'the resolved output node exists in the composed graph');
    assert.equal(node.class_type, 'SaveVideo', 'the armed refine resolves to a SaveVideo');
    assert.equal(node.inputs.filename_prefix, 'run_rfmod_out/refine', 'the refine terminal, never a film save');
    // THE N FACE (GAPS-19): a carried bag used to resolve the JOINED
    // film's terminal (never a window save) — but the carried join is
    // DEAD in the engine (F3-14), so the card door refuses the shape
    // before any node (the stand-down wall owns the sentence).
    assert.throws(
      () => compose([REFINE_ENTRY(), { ...REFINE_ENTRY(), start_seconds: 68 / 24 }], 'run_rfmod_out_n'),
      /Drift-Control AV packed mask does not match its audio stream/,
      'the tiled refine refuses at the card door instead of billing window 0',
    );
  });

  it("every cross-arm pair refuses LOUD naming the silently-dropped arm", () => {
    const edges: Array<[string, Record<string, unknown>, RegExp]> = [
      ['replace', { replace: [{ source_clip: 'c.mp4', still: 's.png', mannequin: 'm.mp4', mask: 'k.png', swap_prompt: 'x' }] }, /Replace and Refine are both armed — one door per doc \(the refine branch never enters the film action; two armed bags would race for one emission\)\. Empty the Replace arm for a refine/],
      ['repair', { repair: [{ source_clip: 'c.mp4', repair_prompt: 'x', region_prompt: 'hands' }] }, /Repair and Refine are both armed — one door per doc \(the refine branch never enters the film action; two armed bags would race for one emission\)\. Empty the Repair arm for a refine/],
      ['extend', { extend: [{ source_clip: 'c.mp4', extend_prompt: 'x', extend_seconds: 3.75 }] }, /Extend and Refine are both armed — one door per doc \(the refine branch never enters the film action; two armed bags would race for one emission\)\. Empty the Extend arm for a refine/],
      ['reshoot', { reshoot: [{ source_clip: 'c.mp4', orbit: 12 }] }, /Refine and Reshoot are both armed — the refine branch never enters the film action.*empty the Refine arm for a reshoot/],
    ];
    for (const [name, arm, re] of edges) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [REFINE_ENTRY()],
        ...arm,
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      assert.throws(
        () => def.compose(walked, model, g, `run_rfmod_${name}`),
        re,
        `refine + ${name} refuses naming the silently-dropped arm`,
      );
    }
  });
});
