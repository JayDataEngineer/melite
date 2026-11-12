// @melite/video-h3-timeline — THE EXTEND NAME (slice 4 of the
// collapse: THE DELETION). The name left the DECLARED roster and
// lives on as the edit bag's CONTINUATION posture: blank mask, self
// anchors, full denoise, the forced seam, the joined film. The
// suite drives the card's own doors and pins the surviving laws the
// extend arm always carried (the seam, the grid, the solver's
// refusal voice) through the alias.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
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
import { serializeCalls } from "../src/ui/studio/docCalls.ts";
import { LAWFUL_TEXT, LAWFUL_TEXT_CARRIED } from "./lawfulText.ts";

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

const compose = (doc: Record<string, unknown>, runId: string): Record<string, Node> => {
  const walked = def.schema(doc) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, runId);
  return graphOf(g);
};

const EXTEND_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  extend_prompt: "she keeps walking toward the door, the door opens",
  extend_seconds: 3.75,
});

const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "she keeps walking toward the door, the door opens",
  continuation: true,
  mask_source: "whole-frame",
  reference: "self",
  denoise: 1,
  extend_seconds: 3.75,
});

describe("the Extend name — the continuation posture of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: no extend peer bag is served", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"], "the survivor roster");
    assert.equal(kinds.includes("extend"), false);
  });

  it("THE NAME STILL COMPOSES: the forced seam + the joined film through the one door", () => {
    const out = compose({ extend: [EXTEND_ENTRY()] }, "run_extend_alias");
    const guides = ofClass(out, "MiniMaxH3AddGuide");
    assert.equal(guides.length, 1, "the forced seam pins the prior's last frame");
    assert.equal(guides[0][1].inputs.frame_idx, 0, "the seam lands at the first appended frame");
    assert.match(JSON.stringify(out), /extend_film/, "the join delivers the one-film grammar");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the stated continuation entry", () => {
    const viaAlias = compose({ extend: [EXTEND_ENTRY()] }, "run_extend_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_extend_equiv");
    assert.deepEqual(viaAlias, viaEdit, "blank mask + self anchors + full denoise: the same posture, node for node");
    // THE ROSTER RIDES BOTH SPELLINGS IDENTICALLY (D-03 R4b): the
    // per-window seat passes the legacy cell verbatim, so a roster
    // through the alias and the same roster through the edit bag
    // compose the same graph.
    const roster = ["she keeps walking toward the door", "the door opens and she steps through"];
    const viaAliasRoster = compose(
      { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24, window_prompts: roster.join("\n") }] },
      "run_extend_equiv_roster");
    const viaEditRoster = compose(
      { edit: [{ ...EDIT_EQUIVALENT(), extend_seconds: 379 / 24, window_prompts: roster.join("\n") }] },
      "run_extend_equiv_roster");
    assert.deepEqual(viaAliasRoster, viaEditRoster, "the roster composes identically through both spellings");
  });

  // THE WINDOW ROSTER (friction-2-infra D-03 R4b): extend had no
  // per-segment roster, so figure count and scale drift were
  // structurally unreachable — one prompt minted every window ("the
  // same girl twice at two scales"). The roster is a text seat, one
  // prompt per line, one line per composed window; window i rides
  // line i. The arms read the composed PLAN's own shots (the real
  // door — MiniMaxH3ChainPlanModern's literal plan_json), never a
  // re-derived count.
  const shotsOf = (out: Record<string, Node>): Array<{ id: string; prompt: string }> => {
    const plan = Object.values(out).find((n) => n.class_type === "MiniMaxH3ChainPlanModern");
    assert.ok(plan, "the chain plan node composes");
    const parsed = JSON.parse(String(plan.inputs["plan_json"])) as { shots: Array<{ id: string; prompt: string }> };
    return parsed.shots;
  };

  it("THE WINDOW ROSTER (D-03): line i rides window i on the composed plan, and absent roster keeps the one-prompt law", () => {
    // learn N from the composed plan itself (never a copied literal)
    const base = compose({ extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24 }] }, "run_roster_base");
    const n = shotsOf(base).length;
    assert.ok(n >= 2, `379f composes a multi-window extend (saw ${n})`);
    // THE ONE-PROMPT LAW: absent roster, every window rides the one prompt
    for (const shot of shotsOf(base)) {
      assert.equal(shot.prompt, EXTEND_ENTRY().extend_prompt, `window ${shot.id} mints from the one extend_prompt`);
    }
    // THE ROSTER: exact count, line for line, window i = line i
    const roster = Array.from({ length: n }, (_k, i): string => `window ${i + 1}: one girl with the sign, one scale — she keeps walking`);
    const out = compose(
      { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24, window_prompts: roster.join("\n") }] },
      "run_roster_exact");
    const shots = shotsOf(out);
    assert.equal(shots.length, n);
    shots.forEach((shot, i) => {
      assert.equal(shot.prompt, roster[i], `window ${i} rides roster line ${i}`);
    });
    // ONE trailing newline is the textarea's own artifact — admits
    const trailing = compose(
      { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24, window_prompts: `${roster.join("\n")}\n` }] },
      "run_roster_trailing");
    assert.equal(shotsOf(trailing).length, n, "a single trailing newline is not a blank window");
  });

  it("the roster refuses LOUD on a wrong line count, a blank line, and a wrong type", () => {
    const base = compose({ extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24 }] }, "run_roster_count");
    const n = shotsOf(base).length;
    assert.throws(
      () => compose(
        { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24,
          window_prompts: Array.from({ length: n - 1 }, (_k, i): string => `line ${i}`).join("\n") }] },
        "run_roster_short"),
      new RegExp(`window_prompts states ${n - 1} lines? but the composition serves ${n} windows.*one extend_prompt serves every window`, "s"),
      "a short roster refuses naming both numbers");
    assert.throws(
      () => compose(
        { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24,
          window_prompts: ["first window keeps walking", "  ", "third window turns"].join("\n") }] },
        "run_roster_blank"),
      /window_prompts line 2 is blank.*never silently falls to extend_prompt/s,
      "a blank middle line refuses naming the line");
    assert.throws(
      () => compose({ extend: [{ ...EXTEND_ENTRY(), window_prompts: 3 }] }, "run_roster_typed"),
      /'window_prompts' is stated as 3.*a text seat carries text/s,
      "a wrong-typed roster refuses at the no-fallback law");
  });

  it("a single-window extend with a one-line roster composes — the roster is not multi-window-only", () => {
    const out = compose(
      { extend: [{ ...EXTEND_ENTRY(), window_prompts: "one window, one girl, one scale" }] },
      "run_roster_single");
    const shots = shotsOf(out);
    assert.equal(shots.length, 1);
    assert.equal(shots[0]!.prompt, "one window, one girl, one scale");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    const out = compose({}, "run_extend_empty");
    assert.equal(ofClass(out, "MiniMaxH3AddGuide").length, 0, "the empty-arm film composes no forced seam");
    assert.equal(JSON.stringify(out).includes("extend_film"), false, "no join vocabulary on the film path");
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the film still delivers");
  });

  it("an EMPTY legacy bag is the unused arm", () => {
    assert.deepEqual(
      compose({ extend: [] }, "run_extend_empty_bag"),
      compose({}, "run_extend_empty_bag"),
      "an empty array still composes the film",
    );
  });

  it("a continuation with NO prompt refuses at the edit door's prompt law", () => {
    const { extend_prompt: _p, ...noPrompt } = EXTEND_ENTRY();
    assert.throws(
      () => compose({ extend: [noPrompt] }, "run_extend_no_prompt"),
      /'edit_prompt' names no action/,
    );
  });

  it("an OFF-GRID extension still refuses through the solver, naming its neighbors", () => {
    assert.throws(
      () => compose({ extend: [{ ...EXTEND_ENTRY(), extend_seconds: 20 }] }, "run_extend_offgrid"),
      /composes nowhere exactly/,
    );
  });

  it("a MULTI-WINDOW extension under a stated non-39 carry refuses the composition law (MED-1)", () => {
    // 90 is AV-legal (resolveCarryOverlap accepts it) — so this arm
    // reaches the composition door itself: the solver always carries
    // the policy's 39f overlap; a stated knob never rides seam math
    // in a multi-window composition.
    assert.throws(
      () => compose(
        { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24, overlap_frames: 90 }] },
        "run_extend_multi_carry",
      ),
      /multi-window composition law carries the policy's 39f context overlap.*re-state overlap_frames 39/s,
    );
  });

  // THE RAIL ADMISSION LAW (friction-2-infra D-01): the extend arm's
  // anchors are DERIVED (prior last frame + whole clip); the one
  // stated rail it reads is ref_images (P0-1's identity sheet, slot 1
  // after the anchor). The film-lane rails ref_videos/ref_audios
  // reach no conditioning on this arm — the audit's silent-no-op
  // class — and refuse LOUD, teaching the recipe-of-record. Each rail
  // refuses in its own voice (its own firing assertion).
  it("THE RAIL ADMISSION LAW (D-01): the film-lane rails refuse on an extend-armed doc, teaching the recipe-of-record", () => {
    for (const [rail, voice] of [
      ["ref_videos", /ref_videos is stated \(motion guides\).*one stated image rail it reads is ref_images.*Leave ref_videos unstated/s],
      ["ref_audios", /ref_audios is stated \(voice references\).*reaches no conditioning.*Leave ref_audios unstated/s],
    ] as const) {
      assert.throws(
        () => compose({ extend: [EXTEND_ENTRY()], [rail]: ["refs/guide.mp4"] }, `run_extend_rail_${rail}`),
        voice,
        `${rail} refuses in its own voice`,
      );
    }
  });

  it("the rail law is scoped: ref_images on extend IS the sheet (slot 1 after the derived anchor), and the film lane still rides its rails", () => {
    // ref_images does NOT refuse on extend — it is the identity
    // sheet P0-1 serves (the anchor owns slot 0, the sheet follows
    // at 1; edit-sheet-seat's extend arm pins the slot wiring —
    // this arm pins the ADMISSION: a stated sheet composes).
    const out = compose(
      { extend: [EXTEND_ENTRY()], ref_images: ["refs/sheet.png"] },
      "run_extend_sheet_alive",
    );
    assert.ok(Object.keys(out).length > 0, "a stated sheet on extend composes");
    // the film path composes with LIVE rails — they stay served
    // where they live; only the extend arm's dead rails refuse.
    assert.doesNotThrow(() =>
      compose({
        calls: serializeCalls([{ text: LAWFUL_TEXT, start_frame: 0, end_frame: 22 }]),
        ref_images: ["refs/sheet.png"],
        ref_videos: ["refs/guide.mp4"],
      }, "run_film_rail_live"));
    // an empty dead rail is unstated — admission never judges a
    // vacuous array (the schema's own default fill).
    assert.doesNotThrow(() =>
      compose({ extend: [EXTEND_ENTRY()], ref_videos: [] }, "run_extend_rail_empty"));
  });

  it("ONE DOOR: extend beside an armed edit bag refuses", () => {
    assert.throws(
      () => compose({ extend: [EXTEND_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_extend_race"),
      /Video edit and extend are both armed/,
    );
  });

  it("ONE DOOR PER DOC: extend beside upscale refuses", () => {
    assert.throws(
      () => compose({
        extend: [EXTEND_ENTRY()],
        upscale: [{ chain_run: "run_prior" }],
      }, "run_extend_pair"),
      /extend and upscale are both armed — one door per doc/,
    );
  });
});
