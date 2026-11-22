// skill-parity.spec.ts — THE TTS SKILL-PARITY WALL (2026-11-21, the
// docs/skills audit's M-1/M-2/L-3/L-4 cures): the audio twin of
// h3-timeline's reshoot-skill-parity.spec.ts, and its law verbatim —
// every bounded dial, band, default, roster, address row, and quoted
// refusal the skills teach is DERIVED from the code's own home, never
// a prose copy. The audit found qvoice-cycle quoting a refusal string
// no seat emits ("fires nothing on this lane") and NOTHING pinning any
// audio skill's taught numbers to their homes; this suite is that wall.
//
// Arms:
//   1. qvoice-cycle's refusal table quotes the card's REAL refusal
//      words per seat — every quote read out of the compose door's own
//      throw, and the stale paraphrase gone
//   2. the voice_strength dial line carries QvoiceFields' own band and
//      default
//   3. the address table's rows are selectCardVariant's own
//      resolutions over the REAL qwen3-tts facts row (the B3
//      route-namesake trap included)
//   4. the Recipe rows teach the DECL's stamped temperatures, which
//      sit at the served schema's own floor/ceiling
//   5. the preset roster is PRESET_SPEAKERS: character-vo's wire
//      spellings, the count word derived from the roster's length, and
//      the live union refusal's expected-set
//   6. gamekit-vo's delivery face is FLAC-only: the audio tail wires
//      no format, and the skill carries no WAV half
//
// Run: npx vitest run --project node packages/audio/tts/tests/skill-parity.spec.ts
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
import { QvoiceFields } from "@melite/comfyui-card-kit/pack-fields";
import { DECL as qwenDecl, PRESET_SPEAKERS } from "@melite/models-qwen3-tts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { selectCardVariant } from "../../../harness/estate-queue/src/cardsVariant.ts";
import { primeFamilySeats } from "../src/family-seats.ts";
import { schema } from "../src/card.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const SKILLS = join(HERE, "..", "src", "agents", "skills");
const readSkill = (name: string): string =>
  readFileSync(join(SKILLS, name, "SKILL.md"), "utf-8");
/** Multi-word probes run whitespace-flat: the docs' one-physical-line
 *  prose law wraps phrases across lines. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

/** The card schema's field dict — asserted, so every arm reads a
 *  present row instead of an optional-chain drift. */
const fields = () => {
  const dict = schema.dict;
  assert.ok(dict, "the tts card schema serves its field dict");
  return dict;
};

/** The qvoice pack's field dict — same law, the pack's own schema. */
const qvoiceFields = () => {
  const dict = QvoiceFields.dict;
  assert.ok(dict, "the qvoice pack serves its field dict");
  return dict;
};

/** A schema meta's number — asserted, so band math is a number, never
 *  an undefined drift. */
const num = (v: number | undefined, what: string): number => {
  assert.equal(typeof v, "number", `${what} serves a number`);
  return v as number;
};

const FACTS_PATH = join(REPO, "packages", "engines", "comfyui-cordis", "data", "model-facts.json");
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;

beforeAll(async () => {
  // THE SEAT, PRIMED EXPLICITLY (the plugin law's test shape, as in
  // card.spec.ts): the compose door dispatches the family's declared
  // action through the guarded dynamic seat.
  await primeFamilySeats();
  def = (await loadCardDefs()).get("tts")!;
  assert.ok(def, "the composition root serves the tts card");
});

/** A compose-door refusal: compose the doc against a facts row and
 *  return the thrown sentence — the door's own voice, never a copy. */
const refusalOf = (doc: Record<string, unknown>, model: ModelFacts): string => {
  try {
    def.compose(def.schema(doc), model, new GraphBuilder(), "skill-parity");
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("the seat refused nothing — the arm judged no refusal");
};

describe("the qvoice-cycle skill agrees with the code's own homes", () => {
  it("ARM 1 — the refusal table quotes the card's REAL refusal words, per seat (M-1)", () => {
    const md = readSkill("qvoice-cycle");
    // The three instruction-control seats (src/card.ts), each probed
    // live: the quote the skill carries is the refusal's own head
    // clause, read out of the throw.
    const seats: Array<[Record<string, unknown>, ModelFacts, string]> = [
      // the resolved TTS lane — the family head lands the 0.6B cell,
      // the size cell with no instruction control
      [{ text: "hello", style_instruction: "warmly" }, facts.models["qwen3-tts"]!, "resolved TTS lane"],
      // the VoiceDesign lane — the design lane's instruct IS the persona
      [{ text: "hello", style_instruction: "warmly" }, facts.models["qwen3-tts-voicedesign-design"]!, "VoiceDesign lane"],
      // the Base variant — the clone lane styles nothing
      [{ text: "hello", style_instruction: "warmly" }, facts.models["qwen3-tts-base"]!, "Base variant"],
    ];
    for (const [doc, model, seat] of seats) {
      const message = refusalOf(doc, model);
      assert.ok(message.includes(seat), `the live ${seat} refusal names its seat`);
      const head = message.split(" (")[0]!.trim();
      assert.ok(flat(md).includes(head),
        `SKILL.md quotes the ${seat} refusal's own head clause — the seat says "${head}"`);
    }
    // THE STALE PARAPHRASE STAYS DEAD: "fires nothing on this lane" is
    // the quote M-1 found drifting — no seat emits it, so the skill
    // must never carry it again.
    assert.doesNotMatch(md, /fires nothing on this lane/);
  });

  it("ARM 2 — the voice_strength dial line carries QvoiceFields' own band and default (M-2)", () => {
    const md = readSkill("qvoice-cycle");
    // THE HOME: the qvoice pack's live field declaration.
    const meta = qvoiceFields().voice_strength.meta;
    const servedDefault = num(meta.default, "voice_strength default");
    const servedMin = num(meta.min, "voice_strength floor");
    const servedMax = num(meta.max, "voice_strength ceiling");
    const line = md.match(/`voice_strength` IS the identity scale \(default ([\d.]+), range ([\d.]+)[–-]([\d.]+)\)/);
    assert.ok(line, "SKILL.md states the voice_strength dial line");
    assert.equal(Number(line[1]), servedDefault,
      `SKILL.md's default ${line[1]} == QvoiceFields' ${String(servedDefault)}`);
    assert.deepEqual([Number(line[2]), Number(line[3])], [servedMin, servedMax],
      `SKILL.md's range ${line[2]}–${line[3]} == QvoiceFields' [${String(servedMin)}, ${String(servedMax)}]`);
  });

  it("ARM 3 — the address table's rows are selectCardVariant's own resolutions (M-2, the B3 trap included)", () => {
    const md = readSkill("qvoice-cycle");
    const ttsRow = facts.models["qwen3-tts"] as never;
    const customvoice = qwenDecl.variants.find((v) => v.id === "customvoice")!;
    const designRow = qwenDecl.variants.find((v) => v.id === "voicedesign")!;
    // THE POOL ORDER IS THE DECL'S: first declared cell = pool-first
    // (the DECL-walk law the resolver itself rides).
    const largeCell = customvoice.cells[0]!;
    // THE NAMESAKE IS THE SMALL CELL'S DEFINING FACT: its route IS the
    // family head id — the B3 trap the 2026-11-12 cure closed.
    const smallCell = customvoice.cells.find((c) => c.route === qwenDecl.id);
    assert.ok(smallCell, "the customvoice ladder carries the route-namesake cell");

    // Row B, head arm: the family head, unstated, lands pool-first —
    // the LARGE cell, never its route-namesake.
    const selHead = selectCardVariant(qwenDecl.id, ttsRow, {}, "compose", undefined, qwenDecl.id);
    assert.equal(selHead.quant, largeCell.quant);
    assert.equal(selHead.cellRoute, largeCell.route);
    assert.notEqual(selHead.cellRoute, smallCell.route,
      "the head does not steal its namesake cell (the B3 cure)");
    // Row B, explicit-route arm: the route address resolves the same cell.
    const selRoute = selectCardVariant(largeCell.route!, ttsRow, {}, "compose", undefined, qwenDecl.id);
    assert.equal(selRoute.cellRoute, selHead.cellRoute);
    // The small-cell arm: the stated quant lands the namesake cell,
    // whose surface carries no instruction control — the table's
    // "no style control" is this surface fact, not prose.
    const selSmall = selectCardVariant(qwenDecl.id, ttsRow, { variant: customvoice.id, quant: smallCell.quant }, "compose", undefined, qwenDecl.id);
    assert.equal(selSmall.cellRoute, smallCell.route);
    assert.ok(selHead.cellParams?.includes("style_instruction"), "the large cell carries the instruct");
    assert.ok(!selSmall.cellParams?.includes("style_instruction"), "the small cell carries no instruct");
    // Row A: the design lane — one cell only, and it is the large rung
    // (the design lane ships no small checkpoint).
    const selDesign = selectCardVariant(qwenDecl.id, ttsRow, { variant: designRow.id }, "compose", undefined, qwenDecl.id);
    assert.equal(selDesign.variantRoute, designRow.route);
    assert.equal(designRow.cells.length, 1, "the design ladder carries one cell");
    assert.equal(designRow.cells[0]!.quant, largeCell.quant, "the design cell is the large rung");

    // THE TABLE SPEAKS THE DECL'S OWN SPELLINGS AND LABELS — every
    // probe below is built from the rows read above, never a hand
    // literal, so a DECL edit that outdates the table reds here.
    assert.ok(md.includes(`quant: "${smallCell.quant}"`), "the table names the small cell's quant spelling");
    assert.ok(md.includes(`"${designRow.id}"`), "the table names the design variant");
    assert.ok(md.includes(`"${customvoice.id}"`), "the table names the perform variant");
    assert.ok(md.includes(largeCell.route!), "the table names the explicit route address");
    assert.ok(flat(md).includes(`${largeCell.label} ${customvoice.label}`), "the resolved-to column names the large CustomVoice cell");
    assert.ok(flat(md).includes(`${designRow.cells[0]!.label} ${designRow.label}`), "the resolved-to column names the VoiceDesign lane");
    assert.ok(flat(md).includes(`${smallCell.label} ${customvoice.label}`), "the resolved-to column names the small CustomVoice cell");
  });

  it("ARM 4 — the Recipe rows teach the DECL's stamped temperatures, which sit at the served schema's own floor/ceiling (L-3)", () => {
    const md = readSkill("qvoice-cycle");
    const recipes = qwenDecl.variants.filter((v) => v.group === "Recipe" && v.id !== "default");
    assert.equal(recipes.length, 2, "two taught recipe rows — a third forces the skill to name it");
    const tempOf = (id: string): number => {
      const row = recipes.find((r) => r.id === id);
      assert.ok(row, `the DECL carries the ${id} recipe row`);
      const t = row.wire_defaults?.["temperature"];
      assert.equal(typeof t, "number", `the ${id} recipe stamps a temperature`);
      return t as number;
    };
    const steady = tempOf("steady-read");
    const expressive = tempOf("expressive-read");
    // THE HINTS' OWN CLAIM, JUDGED: the recipes stamp the card schema's
    // floor and ceiling — the marriage rides the served schema.
    const tempMeta = fields().temperature.meta;
    assert.equal(steady, num(tempMeta.min, "temperature floor"), "steady-read stamps the served floor");
    assert.equal(expressive, num(tempMeta.max, "temperature ceiling"), "expressive-read stamps the served ceiling");
    // The skill names both rows with their derived numbers.
    assert.ok(md.includes("Steady Read") && md.includes("`steady-read`"), "the skill names the steady-read row");
    assert.ok(md.includes("Expressive Read") && md.includes("`expressive-read`"), "the skill names the expressive-read row");
    assert.ok(md.includes(`temperature: ${steady}`), `the skill stamps steady-read's ${String(steady)}`);
    assert.ok(md.includes(`temperature: ${expressive}`), `the skill stamps expressive-read's ${String(expressive)}`);
    assert.ok(md.includes("Default"), "the skill names the stamping-default row");
  });

  it("ARM 5 — the preset roster is PRESET_SPEAKERS: character-vo's spellings, the count word, and the live union refusal", () => {
    const charMd = flat(readSkill("character-vo"));
    const qvoiceMd = readSkill("qvoice-cycle");
    // THE ROSTER IS THE ACTION PLANE'S OWN LIST (actions.ts): every
    // wire spelling character-vo teaches is a member, and the count
    // word follows the roster's length — a new preset forces both.
    const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
    assert.ok(PRESET_SPEAKERS.length < WORDS.length, "the roster fits the count-word table");
    const countWord = WORDS[PRESET_SPEAKERS.length]!;
    for (const preset of PRESET_SPEAKERS) {
      assert.ok(charMd.includes(`\`${preset}\``), `character-vo names the ${preset} wire spelling`);
    }
    assert.ok(charMd.includes(`The ${countWord} presets`),
      `character-vo states the roster count (${countWord} == PRESET_SPEAKERS.length)`);
    // qvoice-cycle's union row quotes the schema walk's own prefix —
    // built from the roster's order, never a hand literal.
    assert.ok(qvoiceMd.includes(`$.voice expected "${PRESET_SPEAKERS[0]}" | "${PRESET_SPEAKERS[1]}"`),
      "qvoice-cycle's refusal row quotes the union's own head");
    // THE LIVE WALK: a Title-Case spelling refuses with the expected
    // set — the roster, verbatim, in the served schema's own voice.
    let message = "";
    try {
      schema({ text: "hello", voice: "Ryan" });
    } catch (e) {
      message = (e as Error).message;
    }
    assert.match(message, /but got "Ryan"/, "a Title-Case spelling refuses live");
    const expected = `expected ${PRESET_SPEAKERS.map((p) => `"${p}"`).join(" | ")}`;
    assert.ok(message.includes(expected), "the live union refusal offers exactly the PRESET_SPEAKERS roster");
  });
});

describe("the gamekit-vo skill agrees with the audio tail's own home", () => {
  it("ARM 6 — the delivery face is FLAC-only: the estate tail wires no format, the skill carries no WAV half (L-4)", () => {
    const voMd = readSkill("gamekit-vo");
    // THE HOME: the audio lane's SaveAudio tail (blocks/audio-kit.ts).
    // The node row declares audio + prefix and NO format — the engine
    // node's own default is the only face the estate serves.
    const audioKit = readFileSync(join(REPO, "packages", "engines", "comfyui-card-kit", "src", "blocks", "audio-kit.ts"), "utf-8");
    const row = audioKit.match(/g\.node\('SaveAudio', \{[^}]*\}\)/);
    assert.ok(row, "the audio tail's SaveAudio seat exists");
    assert.ok(!/format/.test(row[0]), "the estate's SaveAudio tail wires NO format");
    // The skill speaks the FLAC face and the WAV half stays dead.
    assert.ok(voMd.includes("FLAC ->"), "gamekit-vo teaches the FLAC delivery");
    assert.doesNotMatch(voMd, /WAV/);
  });
});
