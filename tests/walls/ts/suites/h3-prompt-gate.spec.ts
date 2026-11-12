// h3-prompt-gate.spec.ts — THE PROMPT-GATE WALL (2026-11-12, the
// VID GEN handoff, operator deliverance: "in fresh melite sessions,
// the AI can use H3 video like an expert, and not flop around").
//
// The lesion it kills: a fresh session wrote caption-grade call
// text ("a slow push in") and the card composed it silently — the
// vendor guides taught the opposite but NO DOOR carried the law, so
// the model invented the missing detail and the film flopped. The
// gate (src/promptGate.ts, the handoff's reference oracle ported)
// now judges every authored call at the compose door; this wall
// pins that the door actually fires, that the refusal TEACHES (the
// dictionary's message verbatim), that a named waiver passes WITH a
// receipt (never silent), and that the skill the agent reads and
// the dictionary the door judges are ONE SOURCE (the served
// rendering cannot drift from the enforced law).
//
// The M5 seam rides here too (the operator's 2026-09-17 fresh-press
// law): ABSENT text is the fresh-press admission — the one-window
// shape's text owner is p.prompt, and a row nobody wrote text for
// conditions EMPTY, never refused. A BLANK string is authored craft
// and refuses. The gate judges authored text only.
//
// Depth: every arm composes through the REAL card door
// (loadCardDefs → h3-timeline def.compose on the walked schema), or
// reads the REAL served files (SKILL.md, reference.json, the
// dictionary JSON) from src/agents — no frozen literals.
//
// Run: npx vitest run tests/walls/ts/suites/h3-prompt-gate.spec.ts
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import "../../../helpers/boot-models.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { checkPress, DICTIONARY, promptAdmissionWarns } from "../../../../packages/video/h3-timeline/src/promptGate.ts";

const here = dirname(fileURLToPath(import.meta.url));
const FACTS_PATH = join(
  here, "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const agents = join(here, "../../../../packages/video/h3-timeline/src/agents");
const read = (rel: string): string => readFileSync(join(agents, rel), "utf8");

describe("THE H3 PROMPT GATE (the VID GEN handoff — the door judges call text)", () => {
  let def: CardDefinition;
  let model: ModelFacts;

  beforeAll(async () => {
    const defs = await loadCardDefs();
    const found = defs.get("h3-timeline");
    assert.ok(found, "the h3-timeline card is boarded");
    def = found;
    const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
    model = facts.models["h3-timeline"]!;
    assert.ok(model, "the h3-timeline family facts row serves");
  });

  const compose = (doc: Record<string, unknown>, runId: string) =>
    def.compose(def.schema(doc) as Record<string, unknown>, model, new GraphBuilder(), runId);

  it("the door REFUSES a thin call with the dictionary's message verbatim (never 'invalid prompt')", () => {
    // §4.3 of the handoff: the six-word call — the exact text a
    // fresh session writes. The refusal names the rule and carries
    // the dictionary's teaching word for word, both rules.
    assert.throws(
      () => compose({ calls: [{ text: "A woman dancing in the rain.", start_frame: 0, end_frame: 90 }] }, "run_gate_thin"),
      (e: unknown) => {
        if (!(e instanceof Error) || !String((e as { code?: unknown }).code ?? "").includes("prompt-gate")) return false;
        const msg = e.message;
        assert.match(msg, /DENSITY-FLOOR: call 0 has 6 words\./, "the word count is measured, not assumed");
        assert.match(msg, /H3 needs at least 90/, "the density floor teaches its band");
        assert.match(msg, /CAMERA-VERB: call 0 has no camera move/, "the missing verb is named");
        assert.match(msg, /fix the call text or name a waiver in params\.prompt_waivers/, "the cure is named");
        return true;
      },
      "the thin call refuses as a prompt-gate ComposeRefusal",
    );
  });

  it("the dictionary's own good call composes a real film graph through the door", () => {
    // the oracle's "good call passes" case IS the fixture — if the
    // door ever refuses its own dictionary's good call, this reds;
    // and the composed graph DELIVERS (SaveVideo rides — shape
    // alone never proves the film)
    const good = DICTIONARY.acceptance_cases.find((c) => c.name === "good call passes");
    assert.ok(good, "the dictionary ships its good call");
    const calls = good.input.calls as Array<{ text?: unknown }>;
    const g = new GraphBuilder();
    def.compose(def.schema({ calls: [{ text: calls[0]!.text, start_frame: 0, end_frame: 124 }] }) as Record<string, unknown>, model, g, "run_gate_good");
    const out = g.toJSON() as Record<string, { class_type: string }>;
    assert.ok(Object.values(out).some((n) => n.class_type === "SaveVideo"), "the good call's film delivers its SaveVideo");
  });

  it("a NAMED WAIVER passes the door and the receipt records it (never silent)", () => {
    const thin = [{ text: "too thin", start_frame: 0, end_frame: 90 }];
    // without the waiver the door refuses; with it, composes
    assert.throws(() => compose({ calls: thin }, "run_gate_no_waiver"));
    const walked = def.schema({ calls: thin, prompt_waivers: ["DENSITY-FLOOR", "CAMERA-VERB", "STYLE-LINE"] }) as Record<string, unknown>;
    def.compose(walked, model, new GraphBuilder(), "run_gate_waived");
    // the receipt channel: the def's own admissionWarns hook (the
    // same hook the runs registry stamps beside the film admission)
    const lines = promptAdmissionWarns(walked);
    assert.ok(
      lines.some((l) => l.startsWith("prompt waiver: DENSITY-FLOOR") && l.includes("waived by this press")),
      `the waiver records its receipt line (got: ${lines.join(" | ")})`,
    );
    assert.ok(lines.some((l) => l.includes("recorded, never silent")), "the receipt states the never-silent law");
  });

  it("a craft WARN never blocks and rides the same receipt channel (STYLE-LINE)", () => {
    // dense, camera'd, but no style line — the gate warns, the door
    // composes, the warn line rides admissionWarns
    const noStyle = "She stands on wet sand at dusk in a pale blue bikini, hair loose and salt drying on her shoulders, both feet planted with her weight on the left, the right knee soft, arms low and open away from her sides. The camera pushes in with small amplitude at slow speed toward her face, holding as the light comes through the spray. Beyond her the waterline keeps its slow rhythm. Breakers roll behind her, wind moves the loose strands, and wet sand gives slightly under the balls of her feet.";
    const walked = def.schema({ calls: [{ text: noStyle, start_frame: 0, end_frame: 124 }] }) as Record<string, unknown>;
    def.compose(walked, model, new GraphBuilder(), "run_gate_warn");
    const lines = promptAdmissionWarns(walked);
    assert.ok(lines.some((l) => l.startsWith("prompt warn: STYLE-LINE")), `the warn rides the receipt (got: ${lines.join(" | ")})`);
  });

  it("the M5 seam through the real door: ABSENT text composes empty, a BLANK string refuses", () => {
    // the operator's 2026-09-17 fresh-press law, pinned at the door:
    // the one-window shape's text owner is p.prompt — a row nobody
    // wrote text for conditions EMPTY (admission), while a written
    // blank is authored craft and refuses.
    compose({ calls: [{ start_frame: 0, end_frame: 90 }] }, "run_gate_m5_absent");
    assert.throws(
      () => compose({ calls: [{ text: "", start_frame: 0, end_frame: 90 }] }, "run_gate_m5_blank"),
      /DENSITY-FLOOR: call 0 has 0 words/,
      "the authored blank refuses at the floor",
    );
  });

  it("the skill and the dictionary are ONE SOURCE: every enforced rule's substance is documented in prose", () => {
    // the pack's prose never used the rule IDS — the agreement is
    // SUBSTANCE: each rule's distinguishing marker (drawn from the
    // dictionary's own check data or the skill's documented
    // vocabulary) must appear in the served skill. A new rule the
    // skill does not document reds here (the rendering cannot
    // drift from the enforced law); a deleted craft section reds
    // too.
    const skill = read("skills/prompt-writing/SKILL.md");
    const markers: Record<string, RegExp> = {
      "DENSITY-FLOOR": /90/i,
      "CAMERA-VERB": /Push In/i,
      "STYLE-LINE": /style line/i,
      "PAN-UP": /Pan up/i,
      "SPOKEN-FORM": /<d>/,
      "ROW-IS-THE-VOICE": /rows/i,
      "REF-AUDIO-WITH-ROWS": /ref_audios/,
      "NO-VENDOR-SCAFFOLDING": /\[Shot/,
    };
    const known = new Set(Object.keys(markers));
    for (const rule of DICTIONARY.rules) {
      const marker = markers[rule.id];
      assert.ok(marker !== undefined, `rule ${rule.id} has no skill-marker — document its substance in the skill and add the marker here`);
      assert.ok(marker.test(skill), `the skill documents rule ${rule.id}'s substance (${String(marker)})`);
    }
    // a marker whose rule was deleted from the dictionary is stale
    for (const id of known) {
      assert.ok(DICTIONARY.rules.some((r) => r.id === id), `marker ${id} is stale — its rule left the dictionary`);
    }
    // the §5 mode table renders every mode reference.json carries
    const reference = read("references/h3/reference.json");
    const modes = (JSON.parse(reference) as { modes: Array<{ id: string }> }).modes;
    assert.equal(modes.length, 4, "the reference's mode table is the four-mode table");
    for (const m of modes) {
      assert.ok(skill.includes(`\`${m.id}\``), `the skill's §5 table renders mode ${m.id}`);
    }
  });

  it("the oracle's acceptance cases still hold against the shipped dictionary (8/8)", () => {
    // the port's own regression: every case's expected verdict (and
    // its named rule, when the case fires one) matches checkPress's
    // judgment on the SAME input — the oracle's 8/8, continuous
    for (const c of DICTIONARY.acceptance_cases) {
      const verdict = checkPress(c.input as { calls?: readonly unknown[] });
      assert.equal(verdict.verdict, c.expect.verdict, `case '${c.name}' verdict`);
      if (typeof c.expect.rule === "string") {
        assert.ok(
          verdict.findings.some((f) => f.rule === c.expect.rule),
          `case '${c.name}' fires rule ${String(c.expect.rule)} (got: ${verdict.findings.map((f) => f.rule).join(",")})`,
        );
      }
    }
    assert.equal(DICTIONARY.acceptance_cases.length, 8, "the eight acceptance cases ride");
  });

  it("the do-not-ship sweep: no run ids, repo paths, or finding numbers in the seated handoff files", () => {
    // handoff §5: the pack spoke VID GEN's paths, run ids, and
    // finding tags — the served files carry the LAW, never the
    // expedition's coordinates
    const files = [
      "skills/prompt-writing/SKILL.md",
      "references/h3/reference.json",
      "h3-prompt-dictionary.json",
      "AGENT.md",
    ];
    for (const rel of files) {
      const text = read(rel);
      assert.ok(!/F-\d{1,4}/.test(text), `${rel}: finding tags do not ship`);
      assert.ok(!/\/home\/[a-z]/.test(text), `${rel}: repo paths do not ship`);
      assert.ok(!/vidgen/i.test(text), `${rel}: the source project's paths do not ship`);
      assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/.test(text), `${rel}: run ids do not ship`);
    }
  });
});
