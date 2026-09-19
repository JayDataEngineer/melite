// @melite/comfyui-cordis — the prompt-enhance recipe loader battery.
//
// SEAM: the loader's ONLY inputs are real SKILL.md files. Positive
// arms pin the real tree's served table (route grammar, alias
// copies, shared merge, exact/family/null lookup); every error arm
// rides an EPHEMERAL fixture root (zz-er-<pid>-<seq>/ — created and
// removed inside the test, so the sweep reads real files and no
// residue or production-tree write can poison the tree, a later
// run, or a parallel worker). No mocks, no network: real fs, real
// parser, loud refusals matched by shape.
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
// THE ROOT SEAM (the cross-process poison window, killed): every
// fixture arm sweeps its OWN root under this spec's directory —
// real files, real parser, ZERO writes to the production tree (a
// parallel worker's sweep can never read a broken fixture
// mid-test).
const tmp = dirname(fileURLToPath(import.meta.url));
let rootSeq = 0;
const fixtureRoot = (): string => join(tmp, `.zz-er-${process.pid}-${(rootSeq += 1)}`);

const skills = (root: string, fam: string): string =>
  join(root, "zz-genre", fam, "agents", "skills", "prompt-enhance", "SKILL.md");

/** Lay fixture skills, run fn, always remove the genre (residue would
 *  poison every later sweep — the finally owns the removal, the
 *  onTestFinished owns the crash path). */
const withSkills = (
  rows: Array<[string, string]>,
  fn: (root: string) => void,
): void => {
  const root = fixtureRoot();
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  try {
    for (const [fam, text] of rows) {
      mkdirSync(dirname(skills(root, fam)), { recursive: true });
      writeFileSync(skills(root, fam), text);
    }
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

beforeEach(() => {
  // a crashed run must never poison this one — drop stale fixture roots
  rmSync(join(tmp, `.zz-er-${process.pid}`), { recursive: true, force: true });
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

  it("a stray file and a dangling entry at the fixture root are skipped (genres are dirs)", () => {
    withSkills([[`zz-fam`, `zz-one:
  role: "Be brief."
  notes:
    - "Keep it short."
`]], (root) => {
      writeFileSync(join(root, "zz-stray.txt"), "not a genre");
      symlinkSync(join(root, "no-such-target"), join(root, "zz-dangle"));
      const table = enhanceRecipes(root);
      assert.equal(table["zz-one"], "Be brief.\n\n- Keep it short.\n", "the sweep rides past the non-genre entries");
    });
  });

  it("a missing declaration tree serves the empty table (the no-file law)", () => {
    // THE ROOT SEAM: an absent root is a fixture-root call away —
    // the production tree is never renamed out from under parallel
    // workers (the poison window, killed at the seam)
    assert.deepEqual(enhanceRecipes(join(tmp, `.zz-er-absent-${process.pid}`)), {});
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
`]], (root) => {
      assert.equal(enhanceRecipes(root)["zz-one"], "Be brief.\n\n- Keep it short.\n");
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
`]], (root) => {
      const table = enhanceRecipes(root);
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
`]], (root) => {
      assert.equal(enhanceRecipes(root)["zz-solo"], "Solo.\n\n\n");
    });
  });

  it("a family dir without the skill is skipped (the ENOENT law)", () => {
    const root = fixtureRoot();
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    try {
      mkdirSync(join(root, "zz-genre", "zz-empty", "agents", "skills", "prompt-enhance"), { recursive: true });
      const table = enhanceRecipes(root);
      assert.equal(table["zz-empty"], undefined, "no skill, no routes");
    } finally {
      rmSync(root, { recursive: true, force: true });
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
    ], (root1) => {
      const table = enhanceRecipes(root1);
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
    ], (root2) => {
      assert.throws(() => enhanceRecipes(root2), /shared block 'zz_dup' declared twice with different bodies/);
    });
  });
});

describe("parseSkillFile (every malformed shape refuses loud)", () => {
  it("an unterminated frontmatter leaves the dashes to refuse as an unexpected line", () => {
    withSkills([["zz-fam", `---
name: zz
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /unexpected line '---'/);
    });
  });

  it("an indented top-level line refuses (top-level entries only)", () => {
    withSkills([["zz-fam", `  indented: x
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /unexpected line 'indented: x'/);
    });
  });

  it("a shared entry that is not 'name: |' refuses named", () => {
    withSkills([["zz-fam", `shared:
  oops
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /shared block must be 'name: \|' \(got 'oops'\)/);
    });
  });

  it("an alias with no anchor refuses named", () => {
    withSkills([["zz-fam", `zz-a: *ghost
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /alias '\*ghost' has no anchor/);
    });
  });

  it("an unknown nested line refuses named", () => {
    withSkills([["zz-fam", `zz-a:
  role: "R."
  bogus line here
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /unknown nested line 'bogus line here'/);
    });
  });

  it("an unquoted role refuses (roles are double-quoted)", () => {
    withSkills([["zz-fam", `zz-a:
  role: bare
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /role must be double-quoted/);
    });
  });

  it("a notes entry that is not a dash list refuses", () => {
    withSkills([["zz-fam", `zz-a:
  role: "R."
  notes: x
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /notes must be a dash list/);
    });
  });

  it("an unknown nested field refuses named", () => {
    withSkills([["zz-fam", `zz-a:
  role: "R."
  size: 1
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /unknown field 'size'/);
    });
  });

  it("an entry without a role refuses named", () => {
    withSkills([["zz-fam", `zz-a:
  base: zz_base
`]], (root) => {
      assert.throws(() => enhanceRecipes(root), /entry 'zz-a' has no role/);
    });
  });
});
