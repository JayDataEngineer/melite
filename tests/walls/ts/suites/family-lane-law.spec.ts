// family-lane-law.spec.ts — the FAMILY LANE (operator 2026-10-03).
//
// The compose refusal tells the agent one thing about where a model's
// prompt rules live: "Read the family lane: melite_skill_read
// model:<family>." Every family that ships prompt knowledge must
// therefore resolve that id. A family whose knowledge sat only in
// agents/skills/ (anima, z-image, ltx-director-distilled, qwen3-tts,
// moss-sfx, music3, trellis2-native) had no such row: the refusal
// 404ed and the rule it was announcing never reached the agent that
// had just picked that model.
//
// The wall walks the committed tree through the door's own row walker,
// so the census and the served rows cannot drift. Pure fs over the
// tracked tree; no boot, no network.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { modelRows } from "../../../../packages/harness/estate-queue/src/skillRows.ts";

const REPO = join(import.meta.dirname, "..", "..", "..", "..");
const ENGINES_ROOT = join(REPO, "packages", "engines");

/** The skill leaves a family's agents/skills/ carries (dir/SKILL.md or a .md file). */
function skillLeaves(modelDir: string): string[] {
  const skillsDir = join(modelDir, "agents", "skills");
  if (!existsSync(skillsDir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(skillsDir).sort()) {
    const p = join(skillsDir, entry);
    if (statSync(p).isDirectory()) {
      if (existsSync(join(p, "SKILL.md"))) out.push(entry);
      continue;
    }
    if (entry.endsWith(".md")) out.push(entry);
  }
  return out;
}

/** Every family in the tree, with the rows its engine's walker publishes. */
function census(): Array<{ engine: string; genre: string; mid: string; dir: string; skills: string[]; ids: string[] }> {
  const out: Array<{ engine: string; genre: string; mid: string; dir: string; skills: string[]; ids: string[] }> = [];
  for (const engine of existsSync(ENGINES_ROOT) ? readdirSync(ENGINES_ROOT).sort() : []) {
    const modelsRoot = join(ENGINES_ROOT, engine, "models");
    if (!existsSync(modelsRoot)) continue;
    const rows = modelRows(join(ENGINES_ROOT, engine));
    for (const genre of readdirSync(modelsRoot).sort()) {
      const genreDir = join(modelsRoot, genre);
      if (!statSync(genreDir).isDirectory()) continue;
      for (const mid of readdirSync(genreDir).sort()) {
        const dir = join(genreDir, mid);
        if (!statSync(dir).isDirectory()) continue;
        out.push({
          engine,
          genre,
          mid,
          dir,
          skills: skillLeaves(dir),
          ids: rows.filter((r) => r.row.model === mid).map((r) => r.row.id),
        });
      }
    }
  }
  return out;
}

const FAMILIES = census();

test("the tree carries model families to judge", () => {
  expect(FAMILIES.length).toBeGreaterThan(20);
});

test("every family that ships skills resolves model:<family>", () => {
  const broken = FAMILIES
    .filter((f) => f.skills.length > 0 && !f.ids.includes("model:" + f.mid))
    .map((f) => `${f.genre}/${f.mid}`);
  expect(
    broken,
    `prompt rules unreachable by the id the refusal names: ${broken.join(", ")}`,
  ).toEqual([]);
});

test("the families the defect shipped on now resolve", () => {
  const pinned = [
    ["image", "anima"],
    ["image", "z-image"],
    ["video", "ltx-director-distilled"],
    ["audio", "qwen3-tts"],
    ["audio", "moss-sfx"],
    ["audio", "music3"],
    ["3d", "trellis2-native"],
  ] as const;
  for (const [genre, mid] of pinned) {
    const f = FAMILIES.find((x) => x.genre === genre && x.mid === mid);
    expect(f, `${genre}/${mid} must exist in the tree`).toBeDefined();
    expect(f?.ids, `${genre}/${mid} must resolve model:${mid}`).toContain("model:" + mid);
  }
});

test("an authored row is never displaced by the lane", () => {
  const authored = FAMILIES.filter(
    (f) => f.skills.length > 0 && existsSync(join(f.dir, "agents", "AGENT.md")),
  );
  expect(authored.length, "the tree keeps authored family rows").toBeGreaterThan(0);
  for (const f of authored) {
    expect(
      f.ids.filter((id) => id === "model:" + f.mid).length,
      `${f.genre}/${f.mid} publishes one entrance row`,
    ).toBe(1);
  }
});

test("the anima lane body carries the prompt rule the family hides in a skill", () => {
  const rows = modelRows(join(ENGINES_ROOT, "comfyui-cordis"));
  const lane = rows.find((r) => r.row.id === "model:anima");
  expect(lane).toBeDefined();
  expect(lane?.row.scope).toBe("model-lane");
  expect(lane?.row.card).toBeNull();
  const body = lane?.bodyText ?? "";
  // The read id is the door the agent must call.
  expect(body).toContain("model:anima:prompt-enhance");
  // The rule itself — the comma-tag law — rides the lane, or the agent
  // still does not know it before writing a prompt.
  expect(body.toLowerCase()).toContain("comma");
  // No file stands behind a synthesized row: the read door serves text,
  // so the path is the skills directory the body was built from.
  expect(lane?.path.endsWith("agents/skills")).toBe(true);
  // Tier-1 descriptions stay clamped like every other row.
  expect((lane?.row.description ?? "").length).toBeLessThanOrEqual(200);
  // anima has no GUIDE.md, so no guide row may be claimed.
  expect(rows.find((r) => r.row.id === "guide:anima")).toBeUndefined();
});

test("a lane row is not counted as a skill", () => {
  // The vocabulary index counts model-skill rows; a synthesized lane
  // must not inflate the family's count (it is an entrance, not a doc).
  const rows = modelRows(join(ENGINES_ROOT, "comfyui-cordis"));
  const forAnima = rows.filter((r) => r.row.model === "anima");
  expect(forAnima.filter((r) => r.row.scope === "model-skill").length).toBe(
    forAnima.filter((r) => r.row.id.startsWith("model:anima:")).length,
  );
  expect(forAnima.filter((r) => r.row.scope === "model-lane").length).toBe(1);
});
