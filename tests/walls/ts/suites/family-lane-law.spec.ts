// family-lane-law.spec.ts — the FAMILY LANE (operator 2026-10-03).
//
// The compose refusal tells the agent one thing about where a model's
// prompt rules live: "Read the family lane: melite_skill_read
// model:<family>." Every family that ships prompt knowledge must
// therefore resolve that id. A family whose knowledge sat only in
// agents/skills/ (anima, z-image, ltx-director-distilled, qwen3-tts,
// moss-sfx, music3, trellis2-native) had no such row: the refusal
// 404ed and the rule it was announcing never reached the agent that
// had just picked that model. ltx-director-distilled left the
// roster (2026-10-12, the operator's five-family kill).
//
// The wall walks the committed tree through the door's own row walker,
// so the census and the served rows cannot drift. Pure fs over the
// tracked tree; no boot, no network.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
    // video/ltx-director-distilled left the roster (2026-10-12,
    // the operator's five-family kill — the family is gone)
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

test("the anima lane is an authored entrance carrying the prompt rule the family hides in a skill", () => {
  const rows = modelRows(join(ENGINES_ROOT, "comfyui-cordis"));
  const lane = rows.find((r) => r.row.id === "model:anima");
  expect(lane).toBeDefined();
  // A2 (features/001, 2026-10-22): the family authored agents/AGENT.md,
  // so the entrance is the authored row — the synthesized model-lane
  // row exists only for families with skills and NO authored entrance.
  expect(lane?.row.scope).toBe("model");
  expect(lane?.row.card).toBeNull();
  expect(lane?.path.endsWith(join("agents", "AGENT.md"))).toBe(true);
  // bodyText is the synthesized-lane channel only (DocRow: "Absent
  // means the file is the body") — the authored row's body is its file.
  const body = lane?.bodyText ?? readFileSync(lane?.path ?? "", "utf8");
  // The read id is the door the agent must call — BOTH skills now.
  expect(body).toContain("model:anima:anima-prompt-writing");
  expect(body).toContain("model:anima:prompt-enhance");
  // The rule itself — the comma-tag law — rides the lane, or the agent
  // still does not know it before writing a prompt.
  expect(body.toLowerCase()).toContain("comma");
  // Tier-1 descriptions stay clamped like every other row.
  expect((lane?.row.description ?? "").length).toBeLessThanOrEqual(200);
  // anima has no GUIDE.md, so no guide row may be claimed.
  expect(rows.find((r) => r.row.id === "guide:anima")).toBeUndefined();
});

test("an authored entrance replaces the synthesized lane row", () => {
  // A2's other half: the authored AGENT.md must not leave a SECOND
  // entrance behind — one family, one entrance row, whichever shape.
  const rows = modelRows(join(ENGINES_ROOT, "comfyui-cordis"));
  const forAnima = rows.filter((r) => r.row.model === "anima");
  expect(forAnima.filter((r) => r.row.scope === "model-lane").length).toBe(0);
  // The skill census stays 1:1 with the model-skill rows — an
  // entrance is not a counted skill (buildSkillIndex skips it).
  expect(forAnima.filter((r) => r.row.scope === "model-skill").length).toBe(
    forAnima.filter((r) => r.row.id.startsWith("model:anima:") && !r.row.id.endsWith(".md")).length,
  );
  expect(forAnima.filter((r) => r.row.scope === "model").length).toBe(1);
});
