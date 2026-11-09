// @contract gates-timeline-craft-skill-truth
// timeline-craft-skill-truth.spec.ts — THE CRAFT DOC'S DERIVED HALF
// (friction gap audit 2026-11-13, item 4).
//
// THE BURN: `timeline-craft` is the doc an agent reads before composing
// a multi-window film, and it taught a retired world — a 90 s
// "challenge cap" the engine never had, a dead python parity receipt
// path, a two-LoRA chain, SigmaShift 8/5 and SLA 0.9, "NEVER send
// lora", `stitch_video_0.mp4` artifacts, dead seam-probe scripts, a
// 15.5 s duration that the carry arithmetic contradicts, and a worked
// example that sent `intent`/`continuity` — params that do not exist.
// Its worked example refused on the first press.
//
// THE LAW: the doc's numbers and names are the code's own, read at
// wall time; its worked example parses, names only served knobs, tiles,
// and lands on the grid. A doc that drifts must red here.
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GRID_BASE_FRAMES, GRID_MAX_FRAMES, GRID_STEP_FRAMES, isGridLength } from "../../../../packages/models/h3/src/timelineContract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const DOC = join(ROOT, "packages/engines/comfyui-cordis/models/video/h3-timeline/agents/skills/timeline-craft/SKILL.md");
const SCHEMA = join(ROOT, "packages/models/h3/src/schema.ts");
const ACTIONS = join(ROOT, "packages/models/h3/src/actions.ts");
const AGENT = join(ROOT, "packages/engines/comfyui-cordis/models/video/h3-timeline/agents/AGENT.md");

const doc = readFileSync(DOC, "utf8");
const schemaSrc = readFileSync(SCHEMA, "utf8");
const actionsSrc = readFileSync(ACTIONS, "utf8");

/** The declared default of one schema knob, read off the schema source
 *  (`.default(<value>)` inside the knob's own line). */
function schemaDefault(knob: string): string {
  const line = schemaSrc.split("\n").find((l) => l.trimStart().startsWith(`${knob}:`));
  assert.ok(line !== undefined, `schema.ts declares ${knob}`);
  const m = /\.default\(([^)]*)\)/u.exec(line);
  assert.ok(m !== null, `schema.ts gives ${knob} a default`);
  return m[1]!.replace(/^['"]|['"]$/gu, "");
}

/** Every served top-level knob name (the schema's own keys). */
function servedKnobs(): Set<string> {
  const out = new Set<string>();
  const body = schemaSrc.slice(schemaSrc.indexOf("export const paramSchema"));
  const end = body.indexOf("\nexport ");
  const region = end === -1 ? body : body.slice(0, end);
  for (const m of region.matchAll(/^ {2}([a-z][a-z0-9_]*):/gmu)) out.add(m[1]!);
  // the JSON-ARRAY params are served too, though they ride the
  // prevalidation belt rather than the zod object (`calls` above all).
  const arrays = /export const JSON_ARRAY_PARAMS = \[([^\]]*)\]/u.exec(schemaSrc);
  assert.ok(arrays !== null, "schema.ts declares the JSON-array params");
  for (const m of arrays[1]!.matchAll(/'([a-z_]+)'/gu)) out.add(m[1]!);
  return out;
}

describe("the timeline-craft doc is the engine's law, derived", () => {
  it("ARM 1 — the recipe numbers are the schema's own defaults", () => {
    for (const knob of ["shift_video", "sla_sparsity"]) {
      const value = schemaDefault(knob);
      assert.ok(doc.includes(`${knob}\` default **${value}**`) || doc.includes(`\`${knob}\` default **${value}**`),
        `the doc states ${knob}'s served default (${value})`);
    }
    assert.equal(schemaDefault("sla_enabled"), "true");
    assert.ok(doc.includes("`sla_enabled` default **true**"), "the doc states SLA on-by-default");
    const rate = /export const FILM_AUDIO_RATE = (\d+)/u.exec(actionsSrc);
    assert.ok(rate !== null, "actions.ts owns the joined-film audio rate");
    assert.ok(doc.includes(`**${(Number(rate[1]!) / 1000).toFixed(0)} kHz**`),
      `the doc states the film's ${rate[1]} Hz join rate`);
    assert.ok(doc.includes("crf 19"), "the doc states the encoder's crf");
    assert.ok(doc.includes("1344×768"), "the doc states the carrier geometry");
  });

  it("ARM 2 — the retired world is gone (cap, dead receipts, two-LoRA chain, retired knobs)", () => {
    for (const lie of [
      "challenge cap is 90s",
      "test_h3_renderer_parity.py",
      "SigmaShift 8/5",
      "NEVER send lora",
      "stitch_video_0.mp4",
      "tests/timeline/seam_probe.py",
      "tests/timeline/freeze_detect.py",
      "32kHz",
      "15.5s",
      "\"intent\": \"film\"",
      "\"continuity\": \"chain\"",
      "aac 32kHz",
    ]) {
      expect(doc.includes(lie), `the doc still teaches the retired fact: ${lie}`).toBe(false);
    }
  });

  it("ARM 3 — the artifact names are the composition's own prefixes", () => {
    const prefixes = [...actionsSrc.matchAll(/`\$\{runId\}\/(h3_t4_[a-z]+)/gu)].map((m) => m[1]!);
    expect(prefixes.includes("h3_t4_w"), "actions.ts saves per-window clips").toBe(true);
    expect(prefixes.includes("h3_t4_film"), "actions.ts saves the assembled film").toBe(true);
    for (const prefix of new Set(prefixes)) {
      assert.ok(doc.includes(prefix), `the doc names the real artifact prefix ${prefix}`);
    }
  });

  it("ARM 4 — the worked example parses, names only served knobs, tiles, and lands on the grid", () => {
    const block = /```\n(\{[\s\S]*?\})\n```/u.exec(doc);
    assert.ok(block !== null, "the doc carries one worked compose example");
    const example = JSON.parse(block[1]!) as { params?: Record<string, unknown> };
    assert.ok(example.params !== undefined, "the example composes params");
    const knobs = servedKnobs();
    for (const key of Object.keys(example.params)) {
      expect(knobs.has(key), `the example sends \`${key}\`, which the schema does not serve`).toBe(true);
    }
    const calls = example.params.calls as Array<{ start_frame?: number; end_frame?: number }>;
    assert.ok(Array.isArray(calls) && calls.length >= 2, "the example is a film, not one window");
    let prev = 0;
    calls.forEach((call, i) => {
      assert.equal(call.start_frame, prev, `call ${i} starts exactly where call ${i - 1} ended`);
      const span = (call.end_frame ?? 0) - (call.start_frame ?? 0);
      assert.ok(span > 0, `call ${i} has a positive span`);
      // the first call is a fresh window: 22+17k. Every carried call is
      // 17k, and its stanza (span + the 22 f seam) must be a legal
      // engine window.
      if (i === 0) {
        assert.ok(isGridLength(span), `call 0's span ${span}f is not 22+17k`);
      } else {
        assert.equal(span % GRID_STEP_FRAMES, 0, `carried call ${i} authors 17k, got ${span}f`);
        assert.ok(isGridLength(span + GRID_BASE_FRAMES), `carried call ${i}'s stanza ${span + GRID_BASE_FRAMES}f is not 22+17k`);
      }
      assert.ok(span + 22 <= GRID_MAX_FRAMES, `call ${i} stays under the ${GRID_MAX_FRAMES}f window cap`);
      prev = call.end_frame ?? 0;
    });
    assert.ok(doc.includes("328 f") && doc.includes("13.67"), "the doc's duration arithmetic is the carry law's (3×124 f = 328 f = 13.67 s)");
  });

  it("ARM 5 — the leaf is served: the family's AGENT.md names it and the doc exists", () => {
    const agent = readFileSync(AGENT, "utf8");
    assert.match(agent, /timeline-craft/u, "the h3-timeline AGENT.md points at the craft skill");
    assert.match(doc, /^---[\s\S]*?name: timeline-craft/um, "the leaf carries its own frontmatter");
  });
});

// THE MODS-RECIPE FOLD (§0.6 of the timeline plan): the recipe
// grammar an agent reads — the six checkable sections, the
// ingredient slots with their file kinds, the variant dial, the
// split verb. Every arm DERIVES its truth from the card's own
// source at wall time: a doc that drifts from the served card
// reds here, and a card that changes without its doc reds too.
const RECIPE = join(ROOT, "packages/engines/comfyui-cordis/models/video/h3-timeline/agents/skills/mods-recipe/SKILL.md");
const CARD = join(ROOT, "packages/video/h3-timeline/src/card.ts");
const recipeDoc = readFileSync(RECIPE, "utf8");
const cardSrc = readFileSync(CARD, "utf8");

/** The EDIT_MOD block of card.ts (the edit card's own declaration). */
function editModBlock(): string {
  const start = cardSrc.indexOf("const EDIT_MOD");
  assert.ok(start !== -1, "card.ts declares EDIT_MOD");
  const end = cardSrc.indexOf("const DECLARED_MOD_KINDS", start);
  assert.ok(end !== -1, "card.ts closes EDIT_MOD before the kinds list");
  return cardSrc.slice(start, end);
}

/** The section ids the card serves on the edit door. */
function servedSectionIds(): string[] {
  const block = editModBlock();
  const sec = block.indexOf("sections: [");
  assert.ok(sec !== -1, "EDIT_MOD declares its sections");
  const region = block.slice(sec, block.indexOf("]", sec));
  return [...region.matchAll(/\{ id: '([a-z0-9-]+)'/gu)].map((m) => m[1]!);
}

/** One field's declaration line off the edit door's declared
 *  fields. The fields SEAT in the client-safe leaf editDecl.ts
 *  (EDIT_FIELDS — moved out of card.ts's EDIT_MOD at the rail
 *  cure; the leaf is the declaration's truth home, imported
 *  verbatim by EDIT_MOD.fields). */
const editDeclSrc = readFileSync(
  join(ROOT, "packages/video/h3-timeline/src/editDecl.ts"), "utf8");

function fieldLine(name: string): string {
  const block = editDeclSrc;
  const line = block.split("\n").find((l) => l.includes(`name: '${name}'`));
  assert.ok(line !== undefined, `the edit door's declared fields include the ${name} field`);
  return line!;
}

describe("the mods-recipe doc is the edit card's grammar, derived", () => {
  it("ARM 6 — the doc's six sections are the card's own served ids", () => {
    const ids = servedSectionIds();
    assert.equal(ids.length, 6, "the edit door serves six sections");
    for (const id of ids) {
      expect(recipeDoc.includes(`\`${id}\``), `the recipe doc names the served section ${id}`).toBe(true);
    }
  });

  it("ARM 7 — the slot kind laws match the declared field types", () => {
    const laws: Array<[string, string]> = [
      ["mask", "PNG"],
      ["still", "PNG"],
      ["mannequin", "VIDEO"],
      ["source_clip", "VIDEO"],
      ["chain_run", "chain-run"],
    ];
    for (const [slot, kindWord] of laws) {
      const line = fieldLine(slot);
      expect(recipeDoc.includes(`\`${slot}\``), `the doc names the ${slot} slot`).toBe(true);
      expect(recipeDoc.includes(kindWord), `the doc names the ${kindWord} kind`).toBe(true);
      if (kindWord === "PNG") expect(line.includes("type: 'image'"), `${slot} is an image field`).toBe(true);
      if (kindWord === "VIDEO") expect(line.includes("media: 'video'"), `${slot} is a video field`).toBe(true);
      if (kindWord === "chain-run") expect(line.includes("type: 'chain-run'"), `${slot} is a chain-run field`).toBe(true);
    }
  });

  it("ARM 8 — the split verb states the cut law whole (identity carries, no chaining, refusal)", () => {
    for (const phrase of [
      "carries WHOLE into BOTH halves",
      "states `cut`",
      "NO chaining",
      "no chain_run",
      "REFUSES",
      "22-frame cut price",
    ]) {
      expect(recipeDoc.includes(phrase), `the split prose states: ${phrase}`).toBe(true);
    }
    // the cut law's own truth home states the seam word the doc teaches
    const mutations = readFileSync(join(ROOT, "packages/video/h3-timeline/src/ui/studio/useCallMutations.ts"), "utf8");
    expect(mutations.includes('transition: "cut"'), "the split branch still writes the cut seam").toBe(true);
  });

  it("ARM 9 — the fold is served: frontmatter gates use-when and AGENT.md points at both skills", () => {
    assert.match(recipeDoc, /^---[\s\S]*?name: mods-recipe/um, "the recipe doc carries its frontmatter");
    assert.match(recipeDoc, /^---[\s\S]*?description:[^\n]*use when/um, "the description gates use-when");
    const agent = readFileSync(AGENT, "utf8");
    assert.match(agent, /timeline-craft/u, "AGENT.md still points at the craft skill");
    assert.match(agent, /mods-recipe/u, "AGENT.md points at the mods-recipe skill");
  });
});
