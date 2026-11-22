// skill-parity.spec.ts — THE MUSIC SKILL-PARITY WALL (2026-11-21, the
// docs/skills audit's L-1/L-2/M-2 cures): the audio twin of
// h3-timeline's reshoot-skill-parity.spec.ts, and its law verbatim —
// every recipe number, band, default, section name, and knob fact the
// gamekit-music skill teaches is DERIVED from the code's own home,
// never a prose copy. The audit found the caption section names drifted
// from the card tooltip's own homes, the long-form formula teaching the
// 360s regime without the OOM cure the duration tooltip carries, and
// nothing pinning any of it; this suite is that wall.
//
// Arms:
//   1. the Recipe rows teach the music3 DECL's own stamped durations,
//      which sit at the served card's floor/ceiling, and the iterate
//      number is the served default — the declared action's own bounds
//      row agrees
//   2. the caption contract names the card tooltip's own three
//      sections, and the drifted names stay dead
//   3. the long-form OOM cure names tiled_decode — the knob the
//      duration tooltip carries, default-less by design, whose
//      derivation flips past the size ceiling (probed live through the
//      compose door)
//   4. the no-preset law rides the served schema: no preset key exists
//
// Run: npx vitest run --project node packages/audio/music/tests/
//   (this spec — the gitleaks path-run law keeps the long path off one line)
import "../../../../tests/helpers/boot-models.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts, type ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import {
  DECL as music3Decl, compose as music3Compose,
  TILED_DURATION_CEIL_S, deriveDecodeTier,
} from "@melite/models-music3";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { primeFamilySeats } from "../src/family-seats.ts";
import { schema } from "../src/card.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(HERE, "..", "src", "agents", "skills", "gamekit-music", "SKILL.md");
const readSkill = (): string => readFileSync(SKILL_PATH, "utf-8");

/** The card schema's field dict — asserted, so every arm reads a
 *  present row instead of an optional-chain drift. */
const fields = () => {
  const dict = schema.dict;
  assert.ok(dict, "the music card schema serves its field dict");
  return dict;
};

/** A schema meta's number — asserted, so band math is a number, never
 *  an undefined drift. */
const num = (v: number | undefined, what: string): number => {
  assert.equal(typeof v, "number", `${what} serves a number`);
  return v as number;
};

const FACTS_PATH = join(
  HERE, "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let music3: ModelFacts;

beforeAll(async () => {
  // THE SEATS, PRIMED EXPLICITLY (the plugin law's test shape, as in
  // card.spec.ts): the compose door dispatches the family's declared
  // action through the guarded dynamic seat.
  await primeFamilySeats();
  def = (await loadCardDefs()).get("music")!;
  assert.ok(def, "the composition root serves the music card");
  music3 = facts.models["music3"]!;
  assert.ok(music3, "the music3 facts row serves");
});

describe("the gamekit-music skill agrees with the code's own homes", () => {
  it("ARM 1 — the Recipe rows teach the DECL's own stamped durations, which sit at the served floor/ceiling; the iterate number is the served default (M-2)", () => {
    const md = readSkill();
    // THE HOME: the music3 DECL's Recipe rows (the family index).
    const recipes = music3Decl.variants.filter((v) => v.group === "Recipe" && v.id !== "default");
    assert.equal(recipes.length, 2, "two taught recipe rows — a third forces the skill to name it");
    const durationOf = (id: string): number => {
      const row = recipes.find((r) => r.id === id);
      assert.ok(row, `the DECL carries the ${id} recipe row`);
      const d = row.wire_defaults?.["duration"];
      assert.equal(typeof d, "number", `the ${id} recipe stamps a duration`);
      return d as number;
    };
    const short = durationOf("short-sting");
    const full = durationOf("full-length");
    // THE HINTS' OWN CLAIM, JUDGED: the recipes stamp the served card's
    // own floor and ceiling.
    const servedMeta = fields().duration.meta;
    const min = num(servedMeta.min, "duration floor");
    const max = num(servedMeta.max, "duration ceiling");
    const servedDefault = num(servedMeta.default, "duration default");
    assert.equal(short, min, "short-sting stamps the served floor");
    assert.equal(full, max, "full-length stamps the served ceiling");
    // THE WRITE PLANE AGREES: the declared compose action's own bounds
    // row is the served card's band (one truth, two faces).
    const boundsRow = music3Compose.params.find((p) => p.name === "duration");
    assert.ok(boundsRow, "the declared action declares the duration row");
    assert.deepEqual(boundsRow.bounds, [min, max],
      "the action's declared bounds are the served card's band");
    // The skill's front-matter speaks the derived numbers.
    assert.ok(md.includes(`short-sting (${short}s)`), `the skill names short-sting's ${String(short)}s`);
    assert.ok(md.includes(`full-length (${full}s)`), `the skill names full-length's ${String(full)}s`);
    // The iterate number IS the served default.
    assert.ok(md.includes(`duration: ${servedDefault}`),
      `the skill's iterate number is the served default ${String(servedDefault)}`);
  });

  it("ARM 2 — the caption contract names the card tooltip's own three sections; the drifted names stay dead (L-1)", () => {
    const md = readSkill();
    // THE HOME: the prompt knob's own tooltip (the card schema).
    const tooltip = fields().prompt.meta.extra?.tooltip ?? "";
    const sections = tooltip.match(/three sections: (.+?) \+ (.+?) \+ (.+?)\./);
    assert.ok(sections, "the served tooltip names the three caption sections");
    const nameOf = (s: string): string => s.split(" (")[0]!.trim();
    for (const raw of [sections[1]!, sections[2]!, sections[3]!]) {
      const name = nameOf(raw);
      assert.ok(md.includes(name), `the skill names the tooltip's ${name} section`);
    }
    // THE DRIFTED NAMES STAY DEAD: "Genre" as the first section and bpm
    // living in Arrangement are the pre-cure prose — no seat teaches
    // them.
    assert.doesNotMatch(md, /three sections:\s*Genre/);
    assert.doesNotMatch(md, /Arrangement \(instrumentation timeline/);
  });

  it("ARM 3 — the long-form OOM cure names tiled_decode, the default-less knob the duration tooltip carries; the derivation flips past the size ceiling, probed live (L-2)", () => {
    const md = readSkill();
    // THE HOME: the duration knob's own tooltip carries the cure.
    const durTooltip = fields().duration.meta.extra?.tooltip ?? "";
    assert.match(durTooltip, /Long track \(>2min\) \+ CUDA OOM: state tiled_decode/,
      "the duration tooltip carries the OOM cure");
    assert.ok(md.includes("tiled_decode"), "the skill names the tiled_decode seat");
    assert.ok(md.includes("CUDA OOM"), "the skill names the OOM regime");
    assert.ok(md.includes("2min"), "the skill carries the tooltip's >2min threshold");
    // THE KNOB IS DEFAULT-LESS: absence is the derivation's seat — a
    // stamped literal would be the second default home.
    const tiledMeta = fields().tiled_decode.meta;
    assert.ok(!("default" in tiledMeta), "tiled_decode declares no default — the derivation decides");
    // THE DERIVATION'S OWN FLIP (decode.ts): past the size ceiling it
    // tiles; at the served default's regime it stays plain. The ceiling
    // sits under the taught ~2min, so past ~2min the tier is always
    // tiled.
    const servedDefault = num(fields().duration.meta.default, "duration default");
    const servedMax = num(fields().duration.meta.max, "duration ceiling");
    assert.equal(deriveDecodeTier(null, servedMax), "tiled", "the ceiling-length track tiles");
    assert.equal(deriveDecodeTier(null, servedDefault), "plain", "the default-length track decodes plain");
    assert.ok(TILED_DURATION_CEIL_S <= 120, "the derivation's ceiling sits under the taught ~2min");
    // THE LIVE DOOR: composing at the derived ceiling lands the tiled
    // node; the unstated compose lands plain and the encode rides the
    // served default.
    const caption = "funk-pop soul at 105 BPM; instrumental, no vocals; clean guitar riff, brass stabs";
    const gTiled = new GraphBuilder();
    def.compose({ prompt: caption, duration: servedMax }, music3, gTiled, "skill-parity-tiled");
    assert.ok("VAEDecodeAudioTiled.0" in gTiled.toJSON(),
      "the ceiling-length compose lands the tiled decode");
    const gPlain = new GraphBuilder();
    def.compose({ prompt: caption }, music3, gPlain, "skill-parity-plain");
    const plain = gPlain.toJSON();
    assert.ok(!("VAEDecodeAudioTiled.0" in plain), "the unstated compose decodes plain");
    const encode = plain["MiniMaxMusic3TextEncode.0"];
    assert.ok(encode, "the plain compose carries the text encode");
    assert.equal(encode.inputs.max_duration, servedDefault,
      "the unstated duration arrives as the served default");
  });

  it("ARM 4 — the no-preset law rides the served schema: no preset key exists (M-2)", () => {
    const md = readSkill();
    assert.ok(!("preset" in fields()), "the served card declares no preset knob");
    assert.match(md, /no `preset` knob exists/);
  });
});
