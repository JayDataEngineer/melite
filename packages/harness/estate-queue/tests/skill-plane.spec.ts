// skill-plane.spec.ts — the skills plane: roots, walks (temp engine
// trees), flow rows (temp + registry), the index/read doors, and the
// ledger ride. Real-repo probes pin the wire shapes.
import "../../../../tests/helpers/boot-models.ts";
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
import { flowDecls } from "../src/skillRows.ts";

const REPO = process.cwd();
let ROOT = "";
const tmpDirs: string[] = [];
afterEach(() => {
  delete process.env.MELITE_REPO_ROOT;
  if (ROOT !== "") {
    rmSync(ROOT, { recursive: true, force: true });
    ROOT = "";
  }
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
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
  // A family that ships ONLY skills — the anima shape: the compose
  // refusal names `model:<family>`, and no file row carries that id.
  w(
    "packages/engines/eng-a/models/g1/m4/agents/skills/prompt-enhance/SKILL.md",
    '---\nname: prompt-enhance\ndescription: M4 prompt rules — comma tags, NOT prose (read before writing an m4 prompt)\n---\nbody\n',
  );
  w("packages/engines/eng-a/models/g1/m4/agents/skills/extra/SKILL.md", "---\nname: extra\ndescription: second lane\n---\nbody\n");
  // A family with no docs at all, and a skill whose frontmatter
  // carries no description — both arms of the lane builder.
  w("packages/engines/eng-a/models/g1/m5/agents/README.md", "nothing to teach\n");
  w("packages/engines/eng-a/models/g1/m6/agents/skills/bare.md", "# bare\n");
  // m7 keeps an EMPTY skills dir: the walk reaches the lane builder
  // with no rows, which must build no lane rather than announce zero.
  mkdirSync(join(E, "eng-a", "models", "g1", "m7", "agents", "skills"), { recursive: true });
  // A family whose agents/spawn is a FILE: the readdir fails with
  // ENOTDIR, which is not the tolerated ENOENT — the walker must name
  // the unreadable surface instead of degrading silently.
  w("packages/engines/eng-a/models/g1/m8/agents/spawn", "not a directory\n");
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
    w("flows/anny-hmr-estimator/SKILL.md", "# Mega skill\n");
  }
  return ROOT;
};


// THE SELECTION LAW (2026-09-21): buildSkillIndex serves the LIVE
// BENCH only. Tests seed a bench doc in the WRITER's tree (audit
// 004/C1: <repoRoot>/data/runs/storage/drafts/docs — the one root,
// never the DSH home) and get a restore fn; an UNSEEDED call pins
// the empty-bench law.
function seedBench(stages: Array<{ card?: string; model?: string }>): () => void {
  const docsDir = join(ROOT, "data", "runs", "storage", "drafts", "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(
    join(docsDir, "bench-session-test.json"),
    JSON.stringify({ record: { doc: { stages: stages.map((x) => ({ card: x.card ?? null, params: x.model ? { model: x.model } : {} })) } } }),
  );
  return () => {
    rmSync(join(docsDir, "bench-session-test.json"), { force: true });
  };
}

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
      "model:m4:extra",
      "model:m4:prompt-enhance",
      "model:m4",
      "model:m6:bare.md",
      "model:m6",
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

  // THE FAMILY LANE: a family that ships only skills had no
  // `model:<mid>` row, and the compose refusal voice sends the agent
  // to exactly that id — so the announcement 404ed (the anima defect).
  it("synthesizes the family lane when the family ships only skills", () => {
    mkEstate(false);
    const rows = modelRows(join(ROOT, "packages", "engines", "eng-a"));
    const lane = rows.find((r) => r.row.id === "model:m4");
    assert.ok(lane, "model:m4 must resolve");
    assert.equal(lane.row.scope, "model-lane");
    assert.equal(lane.row.model, "m4");
    assert.equal(lane.row.card, null);
    assert.match(lane.row.description, /2 skill row\(s\)/);
    // The body is inline — no file, so the read door serves the text.
    assert.equal(typeof lane.bodyText, "string");
    const body = lane.bodyText as string;
    assert.match(body, /model:m4:prompt-enhance/);
    assert.match(body, /model:m4:extra/);
    // The tier-1 line each skill already serves rides the lane: the
    // comma-tag rule is what the agent was told to go read.
    assert.match(body, /comma tags, NOT prose/);
  });

  it("never synthesizes a lane over an authored row", () => {
    mkEstate(false);
    const rows = modelRows(join(ROOT, "packages", "engines", "eng-a"));
    const lanes = rows.filter((r) => r.row.scope === "model-lane");
    // m1 authors agents/AGENT.md and m3 a GUIDE.md: both keep theirs.
    assert.deepEqual(lanes.map((r) => r.row.id), ["model:m4", "model:m6"]);
    assert.equal(rows.filter((r) => r.row.id === "model:m1").length, 1);
  });

  it("a family with nothing to say gets no lane", () => {
    mkEstate(false);
    const rows = modelRows(join(ROOT, "packages", "engines", "eng-a"));
    // m5 ships no GUIDE, no AGENT.md and no skills dir; m7 keeps an
    // EMPTY skills dir. Neither gets a lane: an invented lane would
    // announce zero rows and teach the agent to read nothing.
    assert.equal(rows.some((r) => r.row.model === "m5"), false);
    assert.equal(rows.some((r) => r.row.model === "m7"), false);
    assert.equal(rows.filter((r) => r.row.scope === "model-lane").length, 2);
  });

  it("an unreadable surface names itself (never a silent empty walk)", () => {
    mkEstate(false);
    const errors: string[] = [];
    const realError = console.error;
    console.error = (msg: string): void => { errors.push(msg); };
    try {
      modelRows(join(ROOT, "packages", "engines", "eng-a"));
      // m8's agents/spawn is a file: ENOTDIR is not the tolerated ENOENT.
      assert.ok(
        errors.some((m) => m.includes("spawn dir unreadable") && m.includes("m8")),
        `the spawn surface must name itself: ${JSON.stringify(errors)}`,
      );
      engineDirs(join(ROOT, "packages", "engines", "afile"));
      assert.ok(
        errors.some((m) => m.includes("engines root unreadable")),
        `the engines root must name itself: ${JSON.stringify(errors)}`,
      );
    } finally {
      console.error = realError;
    }
  });

  it("a skill with no description still names its read id", () => {
    mkEstate(false);
    const rows = modelRows(join(ROOT, "packages", "engines", "eng-a"));
    const lane = rows.find((r) => r.row.id === "model:m6");
    assert.ok(lane);
    const body = lane.bodyText as string;
    assert.match(body, /- `model:m6:bare\.md` — bare/);
    assert.ok(!body.includes("bare:"), "an empty description adds no colon tail");
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
    const restore = seedBench([{ card: "acard" }]);
    try {
        const idx = buildSkillIndex(ROOT) as { cards: Array<{ id: string; skills: number }> };
        const acard = idx.cards.find((c) => c.id === "acard");
        assert.ok(acard !== undefined, "the selection carries the benched acard");
    } finally {
      restore();
    }
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
    const restore = seedBench([{ card: "acard" }, { model: "blender" }]);
    let idx: { count: number; families: Array<{ id: string; skills: number }>; cards: Array<{ id: string; skills: number }> };
    try {
        idx = buildSkillIndex(ROOT) as { count: number; families: Array<{ id: string; skills: number }>; cards: Array<{ id: string; skills: number }> };
    } finally {
      restore();
    }
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
    assert.ok(rows.length >= 8); // the eight-flow registry (template cut, 2026-10-13)
    const anny = rows.find((r) => r.row.id === "flow:anny-hmr-estimator");
    assert.ok(anny !== undefined);
    assert.ok(anny.bodyPath !== null && anny.bodyPath.endsWith(join("flows", "anny-hmr-estimator", "SKILL.md")));
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

  it("a flow that cannot load is SKIPPED, not thrown over every other row", () => {
    mkEstate();
    // The seat answers, and the answer is a table holding no family
    // the registry's family stages name — one condition, named. The
    // rows for every OTHER flow must still be served: the projection
    // walks the whole registry, and a refusal here used to travel
    // out as a lane-wide skill-read failure.
    const bare = { allDecls: () => [] };
    const rows = flowRows(ROOT, bare);
    // A flow with no family stage composes byte-identically (zero
    // lookups), so it still serves; the family-carrying ones drop out
    // with their refusal carried on the row. THAT is the isolation:
    // the broken subset is skipped, the rest of the lane is intact.
    assert.ok(
      rows.some((r) => r.row.id === "flow:craft-loop"),
      "a family-free flow still serves on a bare seat",
    );
    assert.equal(
      rows.find((r) => r.row.id === "flow:anny-hmr-estimator"),
      undefined,
      "the family-carrying flow is skipped, not thrown over the rest",
    );
    // The contrast: this spec's first import boots the real table, so
    // the un-seated read composes every family stage and serves every
    // flow row. The skip is per-flow, never lane-wide.
    const served = flowRows(ROOT);
    assert.ok(served.length >= 8, "a seated table serves every flow row again");
  });

  // A NON-ERROR THROW (the coverage queue's skillRows batch,
  // 2026-10-16): the loadError fold must voice a bare throw through
  // String(e), not crash the fold itself — the seat is a structural
  // seam, and a hostile shape there cannot take the lane down.
  it("a non-Error throw from the models seat names the flow's loadError via String(e)", () => {
    mkEstate();
    const hostile = {
      allDecls: (): never => {
        throw "models seat offline";
      },
    };
    const decls = flowDecls(ROOT, hostile);
    const anny = decls.find((d) => d.id === "anny-hmr-estimator");
    assert.ok(anny !== undefined, "the family-carrying flow is present with its refusal");
    assert.equal(anny.loadError, "models seat offline");
    assert.deepEqual(anny.stages, []);
    assert.equal(anny.tool, null);
    // the fold is per-flow: every row answers, none throws
    assert.ok(decls.length >= 8, "the hostile seat refuses flows, never the walk");
  });
});

describe("buildSkillIndex + findSkill", () => {
  it("serves the SELECTION (the live bench) — empty bench lists nothing", () => {
    mkEstate();
    // THE SELECTION LAW (operator 2026-09-21): an empty bench serves
    // NOTHING — the vocabulary door is melite_discover, never this
    // index. The full dump below was the last leak.
    // EMPTY-BENCH LAW (C1's shape): ROOT is this spec's own temp
    // repo — its writer tree holds no bench docs, so the reader's
    // one root (<repo>/data/runs/storage/drafts/docs) is empty by
    // construction. The old DSH-home env pin died with the seam:
    // the reader no longer looks there at all.
    const empty = buildSkillIndex(ROOT) as unknown as { count: number; cards: unknown[]; families: unknown[]; flows: { count: number } };
    assert.equal(empty.count, 0, "the empty bench lists nothing");
    assert.deepEqual(empty.cards, []);
    assert.deepEqual(empty.families, []);
    assert.equal(empty.flows.count, 0);
    const restore = seedBench([{ model: "m1" }, { model: "m3" }, { model: "m4" }, { card: "c2" }]);
    let idx: { count: number; families: Array<{ id: string; skills: number; entrance: string | null }>; cards: Array<{ id: string; skills: number; entrance: string | null }>; flows: { count: number } };
    try {
      idx = buildSkillIndex(ROOT) as typeof idx;
    } finally {
      restore();
    }
    assert.equal((idx as { skills?: unknown }).skills, undefined,
      "the index never lists skill rows — the flat dump taught agents wrong paths (2026-09-21)");
    assert.ok(idx.count > 0, "the benched selection serves");
    const m1 = idx.families.find((f) => f.id === "m1");
    assert.ok(m1 !== undefined, "the selection carries benched m1");
    assert.equal(m1.skills, 4, "m1's model-skill count");
    assert.equal(m1.entrance, "model:m1", "the entrance row id");
    const m3 = idx.families.find((f) => f.id === "m3");
    assert.ok(m3 !== undefined && m3.entrance === null, "a guide-only family names no entrance");
    // A benched skills-only family: the lane IS its entrance, and the
    // lane row itself is not a counted skill (count stays at 2).
    const m4 = idx.families.find((f) => f.id === "m4");
    assert.ok(m4 !== undefined, "the benched selection carries m4");
    assert.equal(m4.entrance, "model:m4", "the synthesized lane names the entrance");
    assert.equal(m4.skills, 2, "the lane row is not counted as a skill");
    const c2 = idx.cards.find((c) => c.id === "c2");
    assert.ok(c2 !== undefined && c2.skills === 1 && c2.entrance === "card:c2");
    const unbenched = idx.cards.find((c) => c.id === "c1");
    assert.ok(unbenched === undefined, "an UNBENCHED card never rides the index");
    assert.equal(idx.flows.count, 0, "flows ride only when the bench holds them");
    assert.ok(typeof idx.flows.count === "number");
    const card = findSkill(ROOT, "card:c1");
    assert.ok(card !== null && card.bodyText === null);
    assert.ok(card.path !== null && card.path.endsWith("AGENT.md"));
    const model = findSkill(ROOT, "model:m1");
    assert.ok(model !== null);
    // THE FAMILY LANE (operator 2026-10-03): the synthesized row
    // resolves by the id the compose refusal names, and the read door
    // serves its inline body — path null, bodyText the lane text.
    const lane = findSkill(ROOT, "model:m4");
    assert.ok(lane !== null && lane.path === null && typeof lane.bodyText === "string");
    assert.match(lane.bodyText as string, /comma tags, NOT prose/);
    const flow = findSkill(ROOT, "flow:anny-hmr-estimator");
    assert.ok(flow !== null && flow.bodyText === null);
    const rendered = findSkill(ROOT, "flow:audio-native-tts");
    assert.ok(rendered !== null && rendered.bodyText !== null);
    assert.equal(findSkill(ROOT, "ghost"), null);
  });

  it("orders selected family and card vocabulary by id", () => {
    mkEstate();
    const restore = seedBench([
      { model: "m3" }, { model: "m1" }, { card: "c2" }, { card: "c1" },
    ]);
    try {
      const idx = buildSkillIndex(ROOT) as {
        families: Array<{ id: string }>;
        cards: Array<{ id: string }>;
      };
      assert.deepEqual(idx.families.map((row) => row.id), ["m1", "m3"]);
      assert.deepEqual(idx.cards.map((row) => row.id), ["c1", "c2"]);
    } finally {
      restore();
    }
  });

  it("envelope refusals rethrow; alien failures wrap", () => {
    mkEstate();
    const E = join(ROOT, "packages", "engines", "eng-a");
    mkdirSync(join(E, "src", "cards", "g2", "has_under"), { recursive: true });
    const restore = seedBench([{ card: "c1" }]);
    try {
        assert.throws(() => buildSkillIndex(ROOT), /has no registry mapping/);
    } finally {
      restore();
    }
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
        // THE FAMILY LANE: the id the compose refusal names answers
        // 200 with the family's prompt rules — the anima case, where
        // `melite_skill_read model:anima` used to 404 while
        // `model:anima:prompt-enhance` held the comma-tag rule.
        const lane = hSkillRead(ROOT, state, "model:m4");
        assert.equal(lane.status, 200);
        const laneBody = lane.payload as { id: string; scope: string; content: string };
        assert.equal(laneBody.id, "model:m4");
        assert.equal(laneBody.scope, "model-lane");
        assert.match(laneBody.content, /comma tags, NOT prose/);
        assert.match(laneBody.content, /melite_skill_read/);
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
        // …but the constructor's read door refuses the id IN ITS OWN
        // VOICE: the row exists and this reader may not have it. The
        // absent-skill text used to answer here, claiming a row the
        // spawn reader had just resolved.
        const r = hSkillRead(ROOT, state, "model:blender:rigging");
        assert.equal(r.status, 404);
        const refusal = (r.payload as { error: string }).error;
        assert.match(refusal, /is scoped "model-spawn"/);
        assert.match(refusal, /spawned subagent's own brief/);
        // A genuine miss still answers as a miss.
        const missing = hSkillRead(ROOT, state, "model:blender:no-such-skill");
        assert.deepEqual(missing.payload, {
          error: 'no such skill: "model:blender:no-such-skill"',
        });
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
