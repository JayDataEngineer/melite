// @melite/comfyui-cordis — the prompt-enhance recipe loader battery.
//
// SEAM: the declaration tree is STATIC per process (the package's own
// models/ dir — self-locating, never env-seamed by design), so the
// loader's ONLY inputs are real SKILL.md files. Positive arms pin the
// real tree's served table (route grammar, alias copies, shared merge,
// exact/family/null lookup); error arms ride EPHEMERAL fixture genres
// (zz-cov-<pid>/ — one genre at a time, created and removed inside the
// test, so the sweep reads them for real and no residue can poison the
// tree or a later run). No mocks, no network: real fs, real parser,
// loud refusals matched by shape.
import { beforeEach, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enhanceRecipeFor, enhanceRecipes } from "../src/models/enhanceRecipes.ts";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsRoot = join(pkgRoot, "models");
const GENRE = `zz-cov-${process.pid}`;
const genreDir = join(modelsRoot, GENRE);

const skillPath = (fam: string): string =>
  join(genreDir, fam, "agents", "skills", "prompt-enhance", "SKILL.md");

/** Lay fixture skills, run fn, always remove the genre (residue would
 *  poison every later sweep — the finally owns the removal, the
 *  onTestFinished owns the crash path). */
const withSkills = (rows: Array<[string, string]>, fn: () => void): void => {
  onTestFinished(() => rmSync(genreDir, { recursive: true, force: true }));
  try {
    for (const [fam, text] of rows) {
      mkdirSync(dirname(skillPath(fam)), { recursive: true });
      writeFileSync(skillPath(fam), text);
    }
    fn();
  } finally {
    rmSync(genreDir, { recursive: true, force: true });
  }
};

beforeEach(() => {
  // a crashed run must never poison this one — drop stale fixtures first
  rmSync(genreDir, { recursive: true, force: true });
});

describe("enhanceRecipes (the served table over the real tree)", () => {
  it("serves every route key with the old composer's grammar", () => {
    const table = enhanceRecipes();
    for (const key of ["krea-2", "krea-2-raw", "z-image", "z-image-base"]) {
      assert.equal(typeof table[key], "string", `${key} serves`);
      assert.ok((table[key] as string).endsWith("\n"), "the old composer's final newline");
    }
    assert.equal(table["krea-2-raw"], table["krea-2"], "the alias copies the anchored row");
    // the grammar order: role, dash-notes, shared[base], shared[base_json]
    const krea = table["krea-2"] as string;
    assert.ok(krea.startsWith("You are a Krea 2 prompting expert."), "the role leads");
    const iNote = krea.indexOf("- This is for Krea 2");
    const iShared = krea.indexOf("Write the prompt as continuous descriptive prose");
    const iJson = krea.indexOf("## Output format");
    assert.ok(iNote > 0 && iNote < iShared && iShared < iJson, "role, notes, shared, shared_json compose in order");
  });

  it("a stray file at the tree root is skipped (genres are dirs)", () => {
    const stray = join(modelsRoot, `zz-stray-${process.pid}.txt`);
    onTestFinished(() => rmSync(stray, { force: true }));
    try {
      writeFileSync(stray, "not a genre");
      const table = enhanceRecipes();
      assert.equal(table["krea-2-raw"], table["krea-2"], "the sweep rides past the stray file");
    } finally {
      rmSync(stray, { force: true });
    }
  });

  it("a dangling entry never breaks the sweep (stat failures read as not-a-dir)", () => {
    const link = join(modelsRoot, `zz-dangle-${process.pid}`);
    onTestFinished(() => rmSync(link, { force: true }));
    try {
      symlinkSync(join(modelsRoot, "no-such-target"), link);
      const table = enhanceRecipes();
      assert.equal(table["krea-2-raw"], table["krea-2"], "the sweep rides past the dangling entry");
    } finally {
      rmSync(link, { force: true });
    }
  });

  it("a missing declaration tree serves the empty table (the no-file law)", () => {
    const hidden = `${modelsRoot}.hidden-${process.pid}`;
    onTestFinished(() => {
      try {
        renameSync(hidden, modelsRoot);
      } catch {
        /* the finally already restored */
      }
    });
    renameSync(modelsRoot, hidden);
    try {
      assert.deepEqual(enhanceRecipes(), {});
      assert.equal(enhanceRecipeFor("krea-2", "krea-2"), null);
    } finally {
      renameSync(hidden, modelsRoot);
    }
    assert.ok(existsSync(join(modelsRoot, "image")), "the tree is restored");
  });
});

describe("enhanceRecipeFor (exact, family head, null)", () => {
  it("the exact route wins, else the family head, else null", () => {
    const table = enhanceRecipes();
    assert.equal(enhanceRecipeFor("krea-2", "krea-2"), table["krea-2"]);
    assert.equal(enhanceRecipeFor("krea-2-raw", "krea-2"), table["krea-2"]);
    assert.equal(
      enhanceRecipeFor("krea-2-turbo-variant", "krea-2"),
      table["krea-2"],
      "an unknown variant falls to the family head",
    );
    assert.equal(enhanceRecipeFor("ghost-model", "ghost-family"), null, "the caller's stub stands");
  });
});

describe("parseSkillFile (the constrained grammar over fixture files)", () => {
  it("a minimal file composes role + notes with the final newline (no frontmatter, no base)", () => {
    withSkills([["zz-fam", `zz-one:
  role: "Be brief."
  notes:
    - "Keep it short."
`]], () => {
      assert.equal(enhanceRecipes()["zz-one"], "Be brief.\n\n- Keep it short.\n");
    });
  });

  it("frontmatter, comments, services, shared, anchors, and escapes compose", () => {
    withSkills([["zz-fam", `---
name: zz
---
# a comment

services:
  whatever: |
    served elsewhere

shared:
  # shared comment

  zz_base: |
    Line one.

    Line two here.

  zz_solo: |


    Solo body.

zz-first: &zzanchor
  role: "First \\"role\\" here.\\nSecond line."
  notes:
    - "Note one."
    - "Note two \\\\ done."
  # trailing comment in block

  base: zz_base

zz-second: *zzanchor

zz-third:
  role: "Third."
  base: zz_missing
`]], () => {
      const table = enhanceRecipes();
      assert.equal(
        table["zz-first"],
        "First \"role\" here.\nSecond line.\n\n- Note one.\n- Note two \\ done.\n\nLine one.\n\nLine two here.\n",
      );
      assert.equal(table["zz-second"], table["zz-first"], "the alias copies the anchored row");
      assert.equal(table["zz-third"], "Third.\n\n\n", "a base naming no shared block appends nothing");
      assert.equal(table["services" as string], undefined, "the reserved map never serves as a route");
    });
  });

  it("a trailing services block is skipped to EOF (the block runs out, not into a key)", () => {
    withSkills([["zz-fam", `zz-solo:
  role: "Solo."
services:
  x: |
    y
`]], () => {
      assert.equal(enhanceRecipes()["zz-solo"], "Solo.\n\n\n");
    });
  });

  it("a family dir without the skill is skipped (the ENOENT law)", () => {
    const emptySkillDir = join(genreDir, "zz-empty", "agents", "skills", "prompt-enhance");
    onTestFinished(() => rmSync(genreDir, { recursive: true, force: true }));
    try {
      mkdirSync(emptySkillDir, { recursive: true });
      const table = enhanceRecipes();
      assert.equal(table["krea-2-raw"], table["krea-2"], "the sweep rides past the skill-less family");
      assert.equal(table["zz-empty"], undefined, "no skill, no routes");
    } finally {
      rmSync(genreDir, { recursive: true, force: true });
    }
  });

  it("an identical shared body merges silent; a conflicting one refuses loud", () => {
    withSkills([
      ["zz-fam-a", `shared:
  zz_dup: |
    Same body.
zz-a:
  role: "A."
`],
      ["zz-fam-b", `shared:
  zz_dup: |
    Same body.
zz-b:
  role: "B."
`],
    ], () => {
      const table = enhanceRecipes();
      assert.equal(table["zz-a"], "A.\n\n\n");
      assert.equal(table["zz-b"], "B.\n\n\n");
    });
    withSkills([
      ["zz-fam-a", `shared:
  zz_dup: |
    Body A.
zz-a:
  role: "A."
`],
      ["zz-fam-b", `shared:
  zz_dup: |
    Body B.
zz-b:
  role: "B."
`],
    ], () => {
      assert.throws(() => enhanceRecipes(), /shared block 'zz_dup' declared twice with different bodies/);
    });
  });
});

describe("parseSkillFile (every malformed shape refuses loud)", () => {
  it("an unterminated frontmatter leaves the dashes to refuse as an unexpected line", () => {
    withSkills([["zz-fam", `---
name: zz
`]], () => {
      assert.throws(() => enhanceRecipes(), /unexpected line '---'/);
    });
  });

  it("an indented top-level line refuses (top-level entries only)", () => {
    withSkills([["zz-fam", `  indented: x
`]], () => {
      assert.throws(() => enhanceRecipes(), /unexpected line 'indented: x'/);
    });
  });

  it("a shared entry that is not 'name: |' refuses named", () => {
    withSkills([["zz-fam", `shared:
  oops
`]], () => {
      assert.throws(() => enhanceRecipes(), /shared block must be 'name: \|' \(got 'oops'\)/);
    });
  });

  it("an alias with no anchor refuses named", () => {
    withSkills([["zz-fam", `zz-a: *ghost
`]], () => {
      assert.throws(() => enhanceRecipes(), /alias '\*ghost' has no anchor/);
    });
  });

  it("an unknown nested line refuses named", () => {
    withSkills([["zz-fam", `zz-a:
  role: "R."
  bogus line here
`]], () => {
      assert.throws(() => enhanceRecipes(), /unknown nested line 'bogus line here'/);
    });
  });

  it("an unquoted role refuses (roles are double-quoted)", () => {
    withSkills([["zz-fam", `zz-a:
  role: bare
`]], () => {
      assert.throws(() => enhanceRecipes(), /role must be double-quoted/);
    });
  });

  it("a notes entry that is not a dash list refuses", () => {
    withSkills([["zz-fam", `zz-a:
  role: "R."
  notes: x
`]], () => {
      assert.throws(() => enhanceRecipes(), /notes must be a dash list/);
    });
  });

  it("an unknown nested field refuses named", () => {
    withSkills([["zz-fam", `zz-a:
  role: "R."
  size: 1
`]], () => {
      assert.throws(() => enhanceRecipes(), /unknown field 'size'/);
    });
  });

  it("an entry without a role refuses named", () => {
    withSkills([["zz-fam", `zz-a:
  base: zz_base
`]], () => {
      assert.throws(() => enhanceRecipes(), /entry 'zz-a' has no role/);
    });
  });
});
