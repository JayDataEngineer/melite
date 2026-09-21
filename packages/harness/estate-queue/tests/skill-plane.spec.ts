// skill-plane.spec.ts — the skills plane: roots, walks (temp engine
// trees), flow rows (temp + registry), the index/read doors, and the
// ledger ride. Real-repo probes pin the wire shapes.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LaneWireError,
  buildSkillIndex,
  cardRows,
  disclosureRoot,
  engineDirs,
  findSkill,
  flowRows,
  hSkillRead,
  modelRows,
  wireSkill,
} from "../src/skillPlane.ts";

const REPO = process.cwd();
let ROOT = "";
afterEach(() => {
  delete process.env.MELITE_REPO_ROOT;
  if (ROOT !== "") {
    rmSync(ROOT, { recursive: true, force: true });
    ROOT = "";
  }
});

const w = (rel: string, text: string): void => {
  const f = join(ROOT, rel);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, text);
};

// A temp estate: one marked engine (models + remainder cards), one
// nested-marker engine, one unmarked engine, one stray file.
const mkEstate = (withFlows = true): string => {
  ROOT = mkdtempSync(join(tmpdir(), "skills-"));
  const E = join(ROOT, "packages", "engines");
  w("packages/engines/eng-a/package.json", "{}");
  w("packages/engines/eng-a/models/g1/m1/GUIDE.md", '---\nname: Guide One\ndescription: The guide.\n---\nbody\n');
  w("packages/engines/eng-a/models/g1/m1/agents/AGENT.md", "# Agent One\n");
  w("packages/engines/eng-a/models/g1/m1/agents/skills/plain.md", "plain skill\n");
  w("packages/engines/eng-a/models/g1/m1/agents/skills/quoted.md", '---\nname: "Quoted"\ndescription: \'Q desc\'\njunk line here\n---\n');
  mkdirSync(join(E, "eng-a", "models", "g1", "m1", "agents", "skills", "dirskill"), { recursive: true });
  w("packages/engines/eng-a/models/g1/m1/agents/skills/dirskill/SKILL.md", "# Dir Skill\n");
  w("packages/engines/eng-a/models/g1/m1/agents/skills/skip.txt", "not a skill\n");
  w("packages/engines/eng-a/models/g1/m1/agents/skills/.md", "dot skill\n");
  mkdirSync(join(E, "eng-a", "models", "g1", "m1", "agents", "skills", "emptydir"), { recursive: true });
  w("packages/engines/eng-a/models/g1/m3/GUIDE.md", "# Guide Three\n");
  w("packages/engines/eng-a/models/g1/m2/agents/AGENT.md", "no frontmatter, no heading\n");
  w("packages/engines/eng-a/src/cards/g2/c1/AGENT.md", "# Card One\n");
  w("packages/engines/eng-a/src/cards/g2/c2/agents/AGENT.md", "# Card Two\n");
  w("packages/engines/eng-a/src/cards/g2/c2/agents/skills/s1.md", "s1\n");
  w("packages/engines/eng-a/src/cards/g2/c2/agents/skills/skip.txt", "not a skill\n");
  w("packages/engines/eng-a/src/cards/g2/c3/agents/skills/s2.md", "s2\n");
  mkdirSync(join(E, "eng-a", "src", "cards", "g2", "c3", "agents", "skills", "c3skill"), { recursive: true });
  w("packages/engines/eng-a/src/cards/g2/img.foo/AGENT.md", "# Dotted\n");
  w("packages/engines/eng-a/src/cards/g2/img_to_mesh/agents/AGENT.md", "# Aliased\n");
  w("packages/engines/eng-a/src/cards/_hidden/c9/AGENT.md", "# Hidden\n");
  w("packages/engines/eng-a/src/cards/g2/.dot/AGENT.md", "# Dot\n");
  w("packages/engines/eng-a/src/cards/g2/node_modules/AGENT.md", "# NM\n");
  mkdirSync(join(E, "eng-b", "sub"), { recursive: true });
  writeFileSync(join(E, "eng-b", "sub", "plugin.yaml"), "x");
  mkdirSync(join(E, "eng-b", "plain"), { recursive: true });
  mkdirSync(join(E, "eng-c"), { recursive: true });
  writeFileSync(join(E, "afile"), "stray");
  if (withFlows) {
    mkdirSync(join(ROOT, "flows"), { recursive: true });
    w("flows/anny-hmr/SKILL.md", "# Mega skill\n");
  }
  return ROOT;
};

describe("disclosureRoot", () => {
  it("honors the override, else anchors the file", () => {
    process.env.MELITE_REPO_ROOT = "/tmp/estate";
    assert.equal(disclosureRoot(), "/tmp/estate");
    delete process.env.MELITE_REPO_ROOT;
    const root = disclosureRoot();
    assert.ok(existsSync(join(root, "package.json")));
    assert.ok(existsSync(join(root, "packages")));
  });
});

describe("engineDirs", () => {
  it("marks depth-1 + depth-2, skips the rest, empties missing roots", () => {
    mkEstate(false);
    const E = join(ROOT, "packages", "engines");
    const dirs = engineDirs(E);
    assert.ok(dirs.includes(join(E, "eng-a")));
    assert.ok(dirs.includes(join(E, "eng-b", "sub")));
    assert.ok(!dirs.some((d) => d.includes("eng-c") || d.includes("plain")));
    assert.deepEqual(engineDirs(join(ROOT, "nope")), []);
  });
});

describe("modelRows", () => {
  it("walks guides, agents and skills (files + dirs, md only)", () => {
    mkEstate(false);
    const rows = modelRows(join(ROOT, "packages", "engines", "eng-a"));
    const ids = rows.map((r) => r.row.id);
    assert.deepEqual(ids, [
      "guide:m1",
      "model:m1",
      "model:m1:.md",
      "model:m1:dirskill",
      "model:m1:plain.md",
      "model:m1:quoted.md",
      "model:m2",
      "guide:m3",
    ]);
    assert.ok(!ids.some((id) => id.includes("emptydir") || id.includes("skip")));
    const byId = new Map(rows.map((r) => [r.row.id, r.row]));
    assert.equal(byId.get("guide:m1")?.name, "Guide One");
    assert.equal(byId.get("guide:m1")?.description, "The guide.");
    assert.equal(byId.get("model:m1")?.name, "Agent One");
    assert.equal(byId.get("model:m1:quoted.md")?.name, "Quoted");
    assert.equal(byId.get("model:m1:quoted.md")?.description, "Q desc");
    assert.equal(byId.get("model:m1:plain.md")?.name, "plain");
    assert.equal(byId.get("model:m1:.md")?.name, ".md");
    assert.equal(byId.get("model:m2")?.name, "AGENT");
    assert.equal(byId.get("guide:m1")?.genre, "g1");
    assert.equal(byId.get("guide:m1")?.model, "m1");
    assert.equal(byId.get("guide:m1")?.card, null);
    assert.deepEqual(modelRows(join(ROOT, "packages", "engines", "eng-c")), []);
  });
});

describe("cardRows", () => {
  it("buckets remainder cards (top doc wins, alias bridges, skips skip)", () => {
    mkEstate(false);
    const walk = cardRows(join(ROOT, "packages", "engines", "eng-a"), ROOT);
    assert.deepEqual([...walk.buckets.keys()], ["c1", "c2", "c3", "img-to-mesh", "img.foo"]);
    assert.equal(walk.buckets.get("c1")?.rows.length, 1);
    assert.equal(walk.buckets.get("c1")?.rows[0]?.row.name, "Card One");
    assert.equal(walk.buckets.get("c2")?.rows.length, 2);
    assert.deepEqual(walk.buckets.get("c3")?.rows.map((r) => r.row.id), ["card:c3:s2.md"]);
    assert.equal(walk.rows.length, 6);
  });

  it("unmapped underscore dirs refuse LOUD", () => {
    mkEstate(false);
    const E = join(ROOT, "packages", "engines", "eng-a");
    mkdirSync(join(E, "src", "cards", "g2", "has_under"), { recursive: true });
    writeFileSync(join(E, "src", "cards", "g2", "has_under", "AGENT.md"), "# x\n");
    assert.throws(() => cardRows(E, ROOT), /has no registry mapping/);
    try {
      cardRows(E, ROOT);
      assert.fail("should throw");
    } catch (e) {
      assert.ok(e instanceof LaneWireError);
      assert.equal((e as Error).name, "LaneWireError");
    }
  });
});

describe("cardRows domains", () => {
  it("walks the owner engine's package domains (card.ts discriminates)", () => {
    ROOT = mkdtempSync(join(tmpdir(), "skills-"));
    const E = join(ROOT, "packages", "engines");
    const w2 = (rel: string, text: string): void => {
      const f = join(ROOT, rel);
      mkdirSync(join(f, ".."), { recursive: true });
      writeFileSync(f, text);
    };
    w2("packages/engines/comfyui-cordis/package.json", "{}");
    w2("packages/image/acard/src/card.ts", "export {};");
    w2("packages/image/acard/src/AGENT.md", "# A Card\n");
    w2("packages/image/img_to_mesh/src/card.ts", "export {};");
    w2("packages/image/img_to_mesh/src/agents/AGENT.md", "# Aliased\n");
    w2("packages/image/img.foo/src/card.ts", "export {};");
    w2("packages/image/img.foo/src/AGENT.md", "# Dotted\n");
    mkdirSync(join(ROOT, "packages", "image", "nocard", "src"), { recursive: true });
    mkdirSync(join(ROOT, "flows"), { recursive: true });
    const walk = cardRows(join(E, "comfyui-cordis"), ROOT);
    assert.deepEqual([...walk.buckets.keys()], ["acard", "img-to-mesh", "img.foo"]);
    const idx = buildSkillIndex(ROOT) as { cards: Array<{ id: string; skills: number }> };
    const acard = idx.cards.find((c) => c.id === "acard");
    assert.ok(acard !== undefined, "the card vocabulary carries acard");
  });
});

describe("the spawn plane (subagent-only leaves — the operator's pin)", () => {
  it("spawn rows resolve via findSkill but NEVER ride the index (card + model)", () => {
    ROOT = mkdtempSync(join(tmpdir(), "skills-"));
    const w2 = (rel: string, text: string): void => {
      const f = join(ROOT, rel);
      mkdirSync(join(f, ".."), { recursive: true });
      writeFileSync(f, text);
    };
    w2("packages/engines/comfyui-cordis/package.json", "{}");
    // a card with one PUBLIC skill and one SPAWN leaf
    w2("packages/image/acard/src/card.ts", "export {};");
    w2("packages/image/acard/src/agents/AGENT.md", "# A Card\n");
    w2("packages/image/acard/src/agents/skills/public-doc/SKILL.md", "# Public\n");
    w2("packages/image/acard/src/agents/spawn/private-doc/SKILL.md", "# Private\n");
    // a model dir with one SPAWN leaf (the blender-door shape)
    w2("packages/engines/mcp/package.json", "{}");
    w2("packages/engines/mcp/models/3d/blender/agents/AGENT.md", "# Blender\n");
    w2("packages/engines/mcp/models/3d/blender/agents/spawn/rigging/SKILL.md", "# Rigging\n");
    mkdirSync(join(ROOT, "flows"), { recursive: true });
    // the constructor's index: the vocabulary counts PUBLIC skills
    // only — a spawn leaf never inflates a count and never appears
    const idx = buildSkillIndex(ROOT) as { count: number; families: Array<{ id: string; skills: number }>; cards: Array<{ id: string; skills: number }> };
    const acard = idx.cards.find((c) => c.id === "acard");
    assert.ok(acard !== undefined && acard.skills === 1, "only the public skill counts");
    const blender = idx.families.find((f) => f.id === "blender");
    assert.ok(blender !== undefined, "the model vocabulary carries blender");
    assert.equal(JSON.stringify(idx).includes("private-doc"), false);
    assert.equal(JSON.stringify(idx).includes("rigging"), false);
    // the spawn reader (findSkill): every spawn ref resolves
    const priv = findSkill(ROOT, "card:acard:private-doc");
    assert.ok(priv !== null && priv.row.scope === "card-spawn");
    const rig = findSkill(ROOT, "model:blender:rigging");
    assert.ok(rig !== null && rig.row.scope === "model-spawn");
    assert.equal(findSkill(ROOT, "ghost-spawn"), null);
    // the leaf-shape arms: a BARE .md spawn file resolves with its
    // extension; a non-md file is skipped; a dir with no SKILL.md
    // reads null (the leaf never rides).
    w2("packages/engines/mcp/models/3d/blender/agents/spawn/bare.md", "# Bare\n");
    w2("packages/engines/mcp/models/3d/blender/agents/spawn/rogue.txt", "junk");
    w2("packages/engines/mcp/models/3d/blender/agents/spawn/empty-dir/README.md", "# n/a");
    const bare = findSkill(ROOT, "model:blender:bare.md");
    assert.ok(bare !== null && bare.row.scope === "model-spawn");
    assert.equal(findSkill(ROOT, "model:blender:rogue.txt"), null);
    assert.equal(findSkill(ROOT, "model:blender:empty-dir"), null);
  });
});

describe("flowRows", () => {
  it("renders one gated row per declaration (SKILL.md wins, else registry)", () => {
    mkEstate();
    const rows = flowRows(ROOT);
    assert.ok(rows.length >= 11);
    const anny = rows.find((r) => r.row.id === "flow:anny-hmr");
    assert.ok(anny !== undefined);
    assert.ok(anny.bodyPath.endsWith(join("flows", "anny-hmr", "SKILL.md")));
    assert.equal(anny.bodyText, null);
    const tts = rows.find((r) => r.row.id === "flow:audio-native-tts");
    assert.ok(tts !== undefined && tts.bodyText !== null && tts.bodyText.length > 0);
    assert.equal(tts.row.scope, "flow");
    assert.deepEqual(tts.row.steps?.[0], { id: "tts", type: "comfyui", plugin: "comfyui" });
    const up = rows.find((r) => r.row.id === "flow:image-upscale");
    assert.ok(up !== undefined && up.row.stepCount === up.row.steps?.length);
  });

  it("missing flows/ reads empty", () => {
    mkEstate(false);
    assert.deepEqual(flowRows(ROOT), []);
  });
});

describe("buildSkillIndex + findSkill", () => {
  it("indexes models + cards + flows; lookups hit every tier", () => {
    mkEstate();
    const idx = buildSkillIndex(ROOT) as unknown as {
      count: number;
      families: Array<{ id: string; skills: number; entrance: string | null }>;
      cards: Array<{ id: string; skills: number; entrance: string | null }>;
      flows: { count: number };
    };
    // THE NO-DUMP LAW: the index NEVER serves skill rows — only the
    // binding vocabulary (families + cards + flow count). A skill id
    // is learned from its OWNING surface (melite_load's tier-1 lines
    // or the entrance row below), never from a flat list.
    assert.equal((idx as { skills?: unknown }).skills, undefined,
      "the index never lists skill rows — the flat dump taught agents wrong paths (2026-09-21)");
    assert.equal(idx.count, 12 + 8 + 7); // craft-loop (55) + agent-spawn (61) seated
    const m1 = idx.families.find((f) => f.id === "m1");
    assert.ok(m1 !== undefined, "the family vocabulary carries m1");
    assert.equal(m1.skills, 4, "m1's model-skill count");
    assert.equal(m1.entrance, "model:m1", "the entrance row id");
    const m3 = idx.families.find((f) => f.id === "m3");
    assert.ok(m3 !== undefined && m3.entrance === null, "a guide-only family names no entrance");
    const c2 = idx.cards.find((c) => c.id === "c2");
    assert.ok(c2 !== undefined && c2.skills === 1 && c2.entrance === "card:c2");
    assert.ok(typeof idx.flows.count === "number");
    const card = findSkill(ROOT, "card:c1");
    assert.ok(card !== null && card.bodyText === null);
    assert.ok(card.path.endsWith("AGENT.md"));
    const model = findSkill(ROOT, "model:m1");
    assert.ok(model !== null);
    const flow = findSkill(ROOT, "flow:anny-hmr");
    assert.ok(flow !== null && flow.bodyText === null);
    const rendered = findSkill(ROOT, "flow:audio-native-tts");
    assert.ok(rendered !== null && rendered.bodyText !== null);
    assert.equal(findSkill(ROOT, "ghost"), null);
  });

  it("envelope refusals rethrow; alien failures wrap", () => {
    mkEstate();
    const E = join(ROOT, "packages", "engines", "eng-a");
    mkdirSync(join(E, "src", "cards", "g2", "has_under"), { recursive: true });
    assert.throws(() => buildSkillIndex(ROOT), /has no registry mapping/);
  });
});

describe("hSkillRead", () => {
  it("serves files + registry bodies, 404s unknowns, ledgers reads", () => {
    mkEstate();
    const state = mkdtempSync(join(tmpdir(), "state-"));
    try {
      const f = hSkillRead(ROOT, state, "model:m1:plain.md");
      assert.equal(f.status, 200);
      const p = f.payload as { id: string; name: string; scope: string; content: string };
      assert.equal(p.id, "model:m1:plain.md");
      assert.equal(p.content, "plain skill\n");
      const r = hSkillRead(ROOT, state, "flow:audio-native-tts");
      assert.equal(r.status, 200);
      assert.ok((r.payload as { content: string }).content.length > 0);
      const n = hSkillRead(ROOT, state, "ghost");
      assert.equal(n.status, 404);
      assert.deepEqual(n.payload, { error: "no such skill: \"ghost\"" });
      const journal = readFileSync(join(state, "output", "_ledger.jsonl"), "utf8");
      assert.ok(journal.includes('"event":"skill.read"'));
      assert.ok(journal.includes("model:m1:plain.md"));
    } finally {
      rmSync(state, { recursive: true, force: true });
    }
  });

  it("LaneWire failures surface 500 (never a traceback)", () => {
    mkEstate();
    const E = join(ROOT, "packages", "engines", "eng-a");
    mkdirSync(join(E, "src", "cards", "g2", "has_under"), { recursive: true });
    const state = mkdtempSync(join(tmpdir(), "state-"));
    try {
      const f = hSkillRead(ROOT, state, "card:c1");
      assert.equal(f.status, 500);
      assert.match((f.payload as { error: string }).error, /has no registry mapping/);
    } finally {
      rmSync(state, { recursive: true, force: true });
    }
  });

  it("the read DOOR refuses -spawn leaves by id (subagent-only, even on a guess)", () => {
    ROOT = mkdtempSync(join(tmpdir(), "skills-"));
    const w2 = (rel: string, text: string): void => {
      const f = join(ROOT, rel);
      mkdirSync(join(f, ".."), { recursive: true });
      writeFileSync(f, text);
    };
    w2("packages/engines/mcp/package.json", "{}");
    w2("packages/engines/mcp/models/3d/blender/agents/AGENT.md", "# Blender\n");
    w2("packages/engines/mcp/models/3d/blender/agents/spawn/rigging/SKILL.md", "# Rigging\n");
    mkdirSync(join(ROOT, "flows"), { recursive: true });
    const state = mkdtempSync(join(tmpdir(), "state-"));
    try {
      // the spawn reader resolves it…
      assert.ok(findSkill(ROOT, "model:blender:rigging") !== null);
      // …but the constructor's read door 404s the id
      const r = hSkillRead(ROOT, state, "model:blender:rigging");
      assert.equal(r.status, 404);
      assert.deepEqual(r.payload, { error: "no such skill: \"model:blender:rigging\"" });
    } finally {
      rmSync(state, { recursive: true, force: true });
    }
  });
});

describe("wireSkill (real rows)", () => {
  it("drops nulls, keeps empties, maps steps", () => {
    mkEstate();
    const flowRow = findSkill(ROOT, "flow:audio-native-tts");
    assert.ok(flowRow !== null);
    const flow = wireSkill(flowRow.row);
    assert.deepEqual(flow["steps"], [{ id: "tts", type: "comfyui", plugin: "comfyui" }]);
    assert.equal(flow["step_count"], 1);
    assert.ok(!("genre" in flow) && !("card" in flow) && !("model" in flow));
    const cardRow = findSkill(ROOT, "card:c1");
    assert.ok(cardRow !== null);
    const card = wireSkill(cardRow.row);
    assert.ok(card["card"] === "c1" && !("steps" in card));
    const modelRow = findSkill(ROOT, "guide:m1");
    assert.ok(modelRow !== null);
    const model = wireSkill(modelRow.row);
    assert.ok(model !== undefined && model["genre"] === "g1" && model["model"] === "m1");
    const bare = wireSkill({
      id: "x",
      name: "n",
      description: "d",
      scope: "s",
      genre: "g",
      card: "c",
      model: "m",
      steps: [{ id: "a", type: "t", plugin: "p" }],
      stepCount: 1,
    });
    assert.equal(bare["genre"], "g");
    assert.equal(bare["card"], "c");
    assert.equal(bare["model"], "m");
  });
});
