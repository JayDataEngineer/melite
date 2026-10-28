// qwen-edit-21-agent-docs.spec.ts — THE qwen-img-edit-21 FAMILY DOC
// WALL (the Tier-1 skill batch, 2026-11). The family's agent face
// (agents/AGENT.md + ten craft skills) teaches the CURRENT lane's
// law: the edit-instruction doctrine, the density law, the canvas
// rule, the geometry law — and the design-sheet skill carries the
// drafting contract VERBATIM (the community architect instruction,
// the operator's order: "make sure the reddit character sheet one
// makes it verbatim as well"). Retired spellings must not ride
// these docs at all (the legacy-edit-family name, lora seats, the
// dead resolution knob), and no machine-specific token may appear
// (the genericity law — skills run on any deployment).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FAMILY_DIR = join(import.meta.dirname, "..", "models", "image", "qwen-img-edit-21");
const AGENT_MD = join(FAMILY_DIR, "agents", "AGENT.md");

/** The skill dirs the discovery walk publishes (dir/SKILL.md only). */
function skillDirs(): string[] {
  const root = join(FAMILY_DIR, "agents", "skills");
  return readdirSync(root)
    .filter((e) => statSync(join(root, e)).isDirectory())
    .sort();
}

/** Front-matter field of a doc (the walk's own key: value parse). */
function fm(text: string, key: string): string {
  const m = text.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return m === null ? "" : m[1].replace(/^"|"$/g, "").trim();
}

const SKILL_READ_IDS = [
  "model:qwen-img-edit-21:design-sheet",
  "model:qwen-img-edit-21:headshot",
  "model:qwen-img-edit-21:product-shot",
  "model:qwen-img-edit-21:poster",
  "model:qwen-img-edit-21:try-on",
  "model:qwen-img-edit-21:outfit-swap",
  "model:qwen-img-edit-21:relight",
  "model:qwen-img-edit-21:zooms",
  "model:qwen-img-edit-21:angles",
  "model:qwen-img-edit-21:whats-next",
];

// the retired law, banned from every doc this family serves
const RETIRED: Array<[string, RegExp]> = [
  ["the legacy edit family", /qwen-img-edit-2511/],
  ["lora seats", /\bloras?\b/i],
  ["the dead resolution knob", /match_input_resolution|\bresolution:\s/],
  ["machine tokens", /3088|33081|dsh-melite|systemctl|127\.0\.0\.1|localhost|\/home\/user/],
];

describe("the qwen-img-edit-21 family doc wall", () => {
  it("the entrance exists with front-matter and carries the edit law", () => {
    const md = readFileSync(AGENT_MD, "utf8");
    expect(fm(md, "name")).toBe("qwen-img-edit-21");
    expect(fm(md, "description").length).toBeGreaterThan(0);
    expect(fm(md, "description").length).toBeLessThanOrEqual(200);
    // the instruction law: change, not scene; both failure modes
    expect(md).toMatch(/INSTRUCTION, not a scene description/);
    expect(md).toMatch(/\*\*Leakage\*\*/);
    expect(md).toMatch(/\*\*Under-editing\*\*/);
    // identity: by reference, never verbal description
    expect(md).toMatch(/hardest invariant/);
    expect(md).toMatch(/never\s+describe the (face|features)/i);
    // the density law (the 2.1 lesson: spec-grade prompts compose)
    expect(md).toMatch(/Density is the lever/);
    expect(md).toMatch(/failure mode[\s\S]{0,80}vagueness, never length/);
    // rendered-text doctrine: literal, one language, priority order
    expect(md).toMatch(/literal/);
    expect(md).toMatch(/dominant\s+language of (the )?text already in the image/);
  });

  it("the entrance teaches the seats: canvas rule, citations, geometry", () => {
    const md = readFileSync(AGENT_MD, "utf8");
    expect(md).toMatch(/`input_images`/);
    expect(md).toMatch(/FIRST image is the canvas/);
    expect(md).toMatch(/`<image2>`/);
    expect(md).toMatch(/geometry law/i);
    expect(md).toMatch(/no resolution seat/i);
    expect(md).toMatch(/crop the anchor[\s\S]{0,60}first/i);
  });

  it("every skill's read id rides the entrance (the family lane reaches them)", () => {
    const md = readFileSync(AGENT_MD, "utf8");
    for (const id of SKILL_READ_IDS) {
      expect(md, `entrance must list ${id}`).toContain(id);
    }
  });

  it("every shipped skill dir is front-matter lawed and read-id indexed", () => {
    const dirs = skillDirs();
    expect([...dirs].sort()).toEqual(
      [...SKILL_READ_IDS].map((id) => id.split(":").pop() as string).sort(),
    );
    for (const dir of dirs) {
      const md = readFileSync(join(FAMILY_DIR, "agents", "skills", dir, "SKILL.md"), "utf8");
      expect(fm(md, "name"), `${dir}: name matches the dir`).toBe(dir);
      expect(fm(md, "model"), `${dir}: rides this family`).toBe("qwen-img-edit-21");
      const desc = fm(md, "description");
      expect(desc.length, `${dir}: description present`).toBeGreaterThan(40);
      expect(desc.length, `${dir}: tier-1 line stays clamped (the anima row law)`).toBeLessThanOrEqual(200);
    }
  });

  it("every skill teaches the real seats — and none teaches a retired one", () => {
    for (const dir of skillDirs()) {
      const md = readFileSync(join(FAMILY_DIR, "agents", "skills", dir, "SKILL.md"), "utf8");
      expect(md, `${dir}: names the card`).toMatch(/image-edit card/);
      expect(md, `${dir}: teaches the input list`).toMatch(/`input_images`/);
      for (const [name, re] of RETIRED) {
        expect(md, `${dir}: retired ${name}`).not.toMatch(re);
      }
    }
    const entrance = readFileSync(AGENT_MD, "utf8");
    for (const [name, re] of RETIRED) {
      expect(entrance, `entrance: retired ${name}`).not.toMatch(re);
    }
  });

  it("the design-sheet skill carries the drafting contract VERBATIM", () => {
    const md = readFileSync(join(FAMILY_DIR, "agents", "skills", "design-sheet", "SKILL.md"), "utf8");
    // the contract's own scaffold, word for word
    expect(md).toContain("# ROLE");
    expect(md).toContain("You are a Character Sheet Prompt Architect.");
    expect(md).toContain("## OUTPUT CONTRACT");
    expect(md).toContain("Density: 60–180 words per section, 900–1600 words total.");
    expect(md).toContain("STEP 0 — VISUAL AUDIT");
    expect(md).toContain("STEP 1 — IDENTITY LOCKS");
    expect(md).toContain("STEP 2 — DESIGN SYSTEM");
    expect(md).toContain("STEP 3 — ZONE MAP (always these coordinates)");
    expect(md).toContain("Zone A LEFT METADATA COLUMN: x 0–18%.");
    expect(md).toContain("Zone G BOTTOM-RIGHT DETAIL GRID: remaining lower-right area.");
    expect(md).toContain("## SECTION-BY-SECTION SPEC");
    expect(md).toContain("10. IDENTITY PRESERVATION CONSTRAINTS");
    expect(md).toContain("Preserve the exact visible design of <Name> from the reference image across all views and tiles:");
    expect(md).toContain("## GOVERNING RULES");
    expect(md).toContain("## FINAL SELF-CHECK (internal, then output)");
    expect(md).toContain("Entity name: {{name}}");
    // the estate glue: the draft's destination, the geometry translation
    expect(md).toMatch(/ten sections go into `prompt`/);
    expect(md).toMatch(/crop the reference to 3:2/i);
    expect(md).toMatch(/input-prep/);
    // routing: the plain-subject arm points at the OTHER sheet skill
    expect(md).toMatch(/character-sheet` skill on the qwen-img-21/);
  });
});
