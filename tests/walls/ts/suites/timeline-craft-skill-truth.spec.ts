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
