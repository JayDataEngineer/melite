// prompt-gate.spec.ts — THE PROMPT GATE (the VID GEN handoff,
// operator 2026-11-12): fresh sessions wrote caption-grade calls,
// dialogue in prose, and the reference-audio rail armed for timing;
// the card doc and the vendor guides teach the opposite, but no
// door carried the law. This file ports the handoff's reference
// oracle: the dictionary's own eight acceptance cases run through
// the SAME checkPress the compose door calls (the oracle printed
// 8/8 before the port; these arms are its contract), and the
// compose-door arms prove the gate rides the real card — a thin
// call refuses with the rule id and the dictionary's message
// VERBATIM (the message is the teaching), a named waiver passes
// and is recorded, and the good call composes a film.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { checkPress, checkPressParams, refusePress, promptAdmissionWarns, DICTIONARY } from "../src/promptGate.ts";
import type { PressVerdict } from "../src/promptGate.ts";
import { LAWFUL_TEXT } from "./lawfulText.ts";
import { readFileSync } from "node:fs";

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
  model = facts.models["h3"]!;
});

/** The oracle's own judging (gate-reference.py main()): verdict,
 * rule presence, and receipt_records as WAIVED findings. */
const oracleOk = (got: PressVerdict, want: Record<string, unknown>): boolean => {
  let ok = got.verdict === want.verdict;
  if (typeof want.rule === "string") {
    ok = ok && got.findings.some((f) => f.rule === want.rule);
  }
  const records = want.receipt_records;
  if (Array.isArray(records)) {
    ok = ok && records.every((r) =>
      got.findings.some((f) => f.rule === r && f.waived === true));
  }
  return ok;
};

describe("the oracle's contract (the dictionary's eight acceptance cases, 8/8)", () => {
  it("every acceptance case judges exactly as the oracle judged it", () => {
    let bad = 0;
    const names: string[] = [];
    for (const c of DICTIONARY.acceptance_cases) {
      const got = checkPress(c.input as Record<string, unknown>);
      if (!oracleOk(got, c.expect)) {
        bad += 1;
        names.push(`${c.name} -> ${got.verdict}`);
      }
    }
    assert.deepEqual(names, []);
    assert.equal(bad, 0);
    assert.equal(DICTIONARY.acceptance_cases.length, 8, "the dictionary ships eight cases");
  });

  it("the thin call of the handoff's acceptance §4.3 refuses DENSITY-FLOOR with the message verbatim", () => {
    const got = checkPressParams({
      calls: [{ text: "A woman stands on a beach.", start_frame: 0, end_frame: 124 }],
    });
    assert.equal(got.verdict, "refused");
    const density = got.findings.find((f) => f.rule === "DENSITY-FLOOR");
    assert.ok(density, "DENSITY-FLOOR fired");
    assert.equal(density.messages?.[0],
      "call 0 has 6 words. H3 needs at least 90 (target 95-128): state style, scene + subject, pose/motion continuity, and camera + ambient sound. Under 90 the model invents the missing detail.",
      "the dictionary's message rides verbatim — the message is the teaching");
  });

  it("the inflection arm: 'pushes in' satisfies CAMERA-VERB and a bare verb without rate refuses with the why", () => {
    const good = checkPressParams({
      calls: [{ text: "The camera pushes in with small amplitude at slow speed toward her face." + " She stands on wet sand at dusk in a pale blue bikini, hair loose and salt drying on her shoulders, both feet planted with her weight on the left, the right knee soft, arms low and open away from her sides. Live-action, cinematic, shallow depth of field. Beyond her the waterline keeps its slow rhythm. Breakers roll behind her, wind moves the loose strands, and wet sand gives slightly under the balls of her feet." }],
    });
    assert.ok(!good.findings.some((f) => f.rule === "CAMERA-VERB"), "inflected 'pushes in' hits the verb");
    const bare = checkPressParams({
      calls: [{ text: "The camera pans right across the scene. " + "x".repeat(200) }],
    });
    const cam = bare.findings.find((f) => f.rule === "CAMERA-VERB");
    assert.ok(cam?.messages?.[0].endsWith("(pan right without amplitude/speed)"), cam?.messages?.[0]);
  });

  it("word counts are python-split semantics (whitespace runs, no empties)", () => {
    const got = checkPressParams({ calls: [{ text: "  a\n\n b   c  " }] });
    assert.equal(got.findings.find((f) => f.rule === "DENSITY-FLOOR")?.messages?.[0],
      "call 0 has 3 words. H3 needs at least 90 (target 95-128): state style, scene + subject, pose/motion continuity, and camera + ambient sound. Under 90 the model invents the missing detail.");
    // a non-string text row is not authored (the schema walk owns shape)
    const shape = checkPressParams({ calls: [{ text: 7 }] });
    assert.equal(shape.verdict, "pass", "a non-string row is not authored text");
    assert.equal(shape.findings.length, 0, "no rule fires on a row nobody wrote text for");
  });

  it("a waived rule rides as a waived finding even when it would have passed (never silent)", () => {
    const got = checkPressParams({
      calls: [{ text: "Live-action, cinematic, shallow depth of field. She stands on wet sand at dusk in a pale blue bikini, hair loose and salt drying on her shoulders, both feet planted with her weight on the left, the right knee soft, arms low and open away from her sides. The camera pushes in with small amplitude at slow speed toward her face, holding as the light comes through the spray. Beyond her the waterline keeps its slow rhythm. Breakers roll behind her, wind moves the loose strands, and wet sand gives slightly under the balls of her feet.", start_frame: 0, end_frame: 124 }],
      prompt_waivers: ["DENSITY-FLOOR"],
    });
    assert.equal(got.verdict, "pass");
    const waived = got.findings.find((f) => f.rule === "DENSITY-FLOOR");
    assert.equal(waived?.severity, "waived");
    assert.equal(waived?.waived, true);
  });

  it("refusePress throws the teaching refusal; a pass or warn never throws", () => {
    const refused = checkPressParams({ calls: [{ text: "A woman stands on a beach." }] });
    assert.throws(() => refusePress(refused), /prompt gate refused this press \(DENSITY-FLOOR/);
    const warned = checkPressParams({
      calls: [{ text: "She stands on wet sand at dusk in a pale blue bikini, hair loose and salt drying on her shoulders, both feet planted with her weight on the left, the right knee soft, arms low and open away from her sides. The camera pushes in with small amplitude at slow speed toward her face, holding as the light comes through the spray. Beyond her the waterline keeps its slow rhythm. Breakers roll behind her, wind moves the loose strands, and wet sand gives slightly under the balls of her feet." }],
    });
    assert.equal(warned.verdict, "warned");
    refusePress(warned);
  });
});

describe("the gate rides the real compose door", () => {
  it("§4.3: composing the thin call refuses at the card door with DENSITY-FLOOR verbatim", () => {
    const g = new GraphBuilder();
    const doc = def.schema({
      calls: [{ text: "A woman stands on a beach.", start_frame: 0, end_frame: 124 }],
      length: 124,
    });
    assert.throws(
      () => def.compose(doc, model, g, "run_prompt_gate_thin"),
      (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        return msg.includes("DENSITY-FLOOR: call 0 has 6 words.") &&
          msg.includes("H3 needs at least 90 (target 95-128)");
      },
      "the compose door refuses with the dictionary's message verbatim");
  });

  it("§4.4: the dictionary's good call composes a film graph", () => {
    const good = DICTIONARY.acceptance_cases.find((c) => c.name === "good call passes")!;
    const g = new GraphBuilder();
    def.compose(def.schema({ ...good.input, length: 124 }), model, g, "run_prompt_gate_good");
    const graph = g.toJSON() as Record<string, { class_type: string }>;
    assert.ok(Object.values(graph).some((n) => n.class_type === "SaveVideo"), "the film graph landed");
  });

  it("the waiver passes the press at the door and the receipt line records it", () => {
    const g = new GraphBuilder();
    const doc = def.schema({
      calls: [{ text: "A woman stands on a beach.", start_frame: 0, end_frame: 124 }],
      length: 124,
      prompt_waivers: ["DENSITY-FLOOR", "CAMERA-VERB", "STYLE-LINE"],
    });
    def.compose(doc, model, g, "run_prompt_gate_waived");
    const lines = promptAdmissionWarns(doc);
    assert.ok(lines.some((l) => l.startsWith("prompt waiver: DENSITY-FLOOR") && l.includes("never silent")), lines.join("\n"));
    assert.ok(lines.length >= 3, "every named waiver records a line");
  });

  it("the admission warns carry the craft warns too (STYLE-LINE, never a refusal)", () => {
    const lines = promptAdmissionWarns({
      calls: [{ text: "A woman stands on a beach.", start_frame: 0, end_frame: 124 }],
    });
    assert.ok(lines.some((l) => l.startsWith("prompt warn: STYLE-LINE: call 0 never states the medium")), lines.join("\n"));
    assert.ok(!lines.some((l) => l.startsWith("prompt warn: DENSITY-FLOOR")), "refuse severities are not warn lines");
  });

  it("the fresh-press admission: ABSENT text is never judged (M5, the 2026-09-17 fresh-press law)", () => {
    // the one-window shape's text owner is p.prompt; a call row with
    // no authored text conditions EMPTY and composes — the gate
    // judges authored craft only. A BLANK string is authored and
    // refuses; undefined is the admission. card.spec M5 pins the
    // compose side; this arm pins the gate's own judgment.
    const absent = checkPress({ calls: [{ start_frame: 0, end_frame: 90 }] });
    assert.equal(absent.verdict, "pass", "absent text = fresh-press admission, never a refusal");
    assert.equal(absent.findings.length, 0, "no rule fires on a row nobody wrote text for");
    const blank = checkPress({ calls: [{ text: "", start_frame: 0, end_frame: 90 }] });
    assert.equal(blank.verdict, "refused", "a written blank is authored craft and refuses");
    const mixed = checkPress({ calls: [{ start_frame: 0, end_frame: 90 }, { text: LAWFUL_TEXT, start_frame: 90, end_frame: 180 }] });
    assert.equal(mixed.verdict, "pass", "a lawful authored call beside an admission row passes");
  });
});

describe("the dictionary and the skill agree (one source, the rendering)", () => {
  it("the skill's §5 mode table renders every mode reference.json carries", () => {
    const skill = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents", "skills", "prompt-writing", "SKILL.md"), "utf-8");
    const dict = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents", "references", "h3", "reference.json"), "utf-8")) as {
      modes: Array<{ id: string; rides: string[]; derived_by: string }>;
    };
    assert.equal(dict.modes.length, 4);
    for (const m of dict.modes) {
      assert.ok(skill.includes(`\`${m.id}\``), `the skill's table renders mode ${m.id}`);
      for (const ride of m.rides) assert.ok(skill.includes(ride), `mode ${m.id} names its ride ${ride}`);
      const row = skill.split("\n").find((l) => l.includes(`\`${m.id}\``));
      assert.ok(row?.toLowerCase().includes(m.derived_by.split(" ")[0]), `mode ${m.id} carries its derivation`);
    }
  });
});
