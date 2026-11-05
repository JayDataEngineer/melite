// install-ref-law.spec.ts — THE DOCUMENTED INSTALL PIN IS AN
// INSTALLABLE TAG.
//
// Burn: CI run 42016860068's cold-start job (2026-11-05). The README's
// first command — `dsh plugin add github:JayDataEngineer/melite#v0.2.0-alpha`
// — died inside pnpm with ERR_PNPM_MISSING_PACKAGE_NAME: the v0.2.0-alpha
// tag predates the root package.json's `name` field, and pnpm cannot
// read a package name off that git tarball. The release existed, the
// docs were "pinned", and the user's first command still failed.
//
// THE LAW: every install face names ONE tag — README, the install
// guide, the CI cold-start lane, and the proof's own example — the
// tag is a v-prefixed release tag (never a branch), and the tag's
// ROOT manifest carries a package name (the exact field pnpm needs;
// judged from the tag itself, not from HEAD, because the install
// reads the tag's tree).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const GITHUB_FACES = [
  "README.md",
  "docs/guide/install.md",
  ".github/workflows/tests.yml",
  "tools/cold-start-proof.mjs",
];
const REF_RE = /github:JayDataEngineer\/melite#([A-Za-z0-9._-]+)/gu;

/** Every ref the face's own text names (the docs are the truth here;
 *  the wall derives, it does not hold a literal). */
function refsIn(rel: string): string[] {
  const text = readFileSync(join(ROOT, rel), "utf8");
  return [...text.matchAll(REF_RE)].map((m) => m[1]!);
}

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // shallow clone / no tags fetched — the caller decides
  }
}

describe("the install pin (one tag, a real tag, a named manifest)", () => {
  it("every install face names exactly one ref, and they all agree", () => {
    const byFace = GITHUB_FACES.map((f) => ({ f, refs: refsIn(f) }));
    for (const { f, refs } of byFace) {
      expect(refs.length, `${f} names no github:JayDataEngineer/melite#<ref>`).toBeGreaterThan(0);
    }
    const distinct = [...new Set(byFace.flatMap(({ refs }) => refs))];
    expect(distinct, `the install faces disagree on the pin: ${byFace.map(({ f, refs }) => `${f}=${refs.join(",")}`).join(" | ")}`)
      .toHaveLength(1);
  });

  it("the pin is a v-prefixed release tag, never a branch", () => {
    const ref = refsIn("README.md")[0]!;
    expect(ref).toMatch(/^v\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?$/u);
    expect(ref).not.toBe("main");
  });

  it("the tag's ROOT manifest carries the package name pnpm reads", (ctx) => {
    const ref = refsIn("README.md")[0]!;
    const commit = git(["rev-parse", "--verify", `refs/tags/${ref}^{commit}`]);
    if (commit === null) {
      ctx.skip(true, `tag ${ref} is not in this clone (shallow / no tags fetched) — the CI cold-start lane is the executable judge; the pin-agreement arms above still judged the docs`);
      return;
    }
    const manifest = git(["show", `${ref}:package.json`]);
    expect(manifest, `${ref}:package.json is unreadable at the tag`).not.toBeNull();
    const parsed = JSON.parse(manifest!) as { name?: unknown };
    // The exact failure pnpm reports when this field is absent:
    // ERR_PNPM_MISSING_PACKAGE_NAME — the user's first command dies.
    expect(String(parsed.name ?? ""), `${ref}'s root package.json carries no name — pnpm refuses this github: ref (ERR_PNPM_MISSING_PACKAGE_NAME); pin a tag cut after the root manifest was named`)
      .toMatch(/^[a-z0-9][a-z0-9._-]*$/u);
  });
});
