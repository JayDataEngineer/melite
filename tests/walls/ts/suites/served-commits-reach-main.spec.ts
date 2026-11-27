// @contract infra-served-commits-reach-main
/**
 * SERVED COMMITS REACH MAIN (T2, 2026-11-27 — benchgen's
 * MELITE-UPSTREAM-ISSUES: a landed fix was rewritten in place).
 *
 * THE BURN: `1fd12eb25` and `d61b20875` share a parent, an author, a
 * second and a title — the lane served the first at 01:47:24 EST, main
 * holds the second, and the first sat on no branch. EP01's receipts
 * named a hash that no longer resolved. An amend after a lane has
 * SERVED the commit rewrites history a receipt already cites.
 *
 * THE LAW (AGENTS.md, commit history law): a commit a lane has served
 * is never amended — the change lands as the next commit. A served
 * commit already displaced is pinned on `archive/served-<sha>` so the
 * receipt resolves forever. This wall judges the join on the box that
 * owns the lanes: every lane tree's HEAD is reachable from main or an
 * archive ref, and every archive ref resolves to a commit that is NOT
 * on main (a pinned commit that main already carries is a ref to
 * retire, not keep — the arm says which).
 *
 * THE ARMS:
 *   1. THE LANE TREES (dev box only; skipped where no lane tree
 *      exists — CI and a fresh clone carry none): every
 *      `<home>/lane*-tree` with a .git — its HEAD is an ancestor of
 *      main or of some `archive/served-*` ref. A miss names the sha and
 *      the cure.
 *   2. THE ARCHIVE REFS: every `refs/heads/archive/served-*` resolves
 *      to a commit; the ref's sha matches its name (the name IS the
 *      receipt's hash — a mismatched pin is a lie); the pinned commit is
 *      NOT an ancestor of main (if main carries it, the pin is redundant
 *      and the ref is retired deliberately).
 *   3. THE LAW FIRES: the judge, fed a synthetic lane tree at an
 *      unreachable sha, reds naming the sha and the cure; fed a tree on
 *      main, it is silent. (Injection — the tree's refs are never
 *      moved.)
 *
 * Run: npx vitest run tests/walls/ts/suites/served-commits-reach-main.spec.ts
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** A lane tree: a checkout under the home dir named `lane<N>-tree`
 *  that carries a .git. The lane refresh fetches main into it; its
 *  HEAD is what the lane SERVES. */
function laneTrees(home: string = homedir()): string[] {
  if (!existsSync(home)) return [];
  const out: string[] = [];
  for (const e of readdirSync(home)) {
    const p = join(home, e);
    if (/^lane\d+-tree$/.test(e) && existsSync(join(p, ".git"))) out.push(p);
  }
  return out;
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Every `refs/heads/archive/served-*` ref of THIS repo → its sha. */
function archiveRefs(): Map<string, string> {
  const out = new Map<string, string>();
  const list = git(ROOT, ["for-each-ref", "--format=%(refname:short) %(objectname)", "refs/heads/archive/served-*"]);
  if (list === "") return out;
  for (const line of list.split("\n")) {
    const [name, sha] = line.split(" ");
    if (name !== undefined && sha !== undefined) out.set(name, sha);
  }
  return out;
}

/** THE JUDGE: is `sha` reachable from main or an archive ref? */
function reachable(sha: string, archive: ReadonlyMap<string, string>): boolean {
  const probes = ["main", ...archive.keys()];
  for (const ref of probes) {
    const r = spawnSync("git", ["merge-base", "--is-ancestor", sha, ref], { cwd: ROOT, encoding: "utf8" });
    if (r.status === 0) return true;
  }
  return false;
}

/** The lane-tree verdict, one home: each tree's HEAD reaches main or an
 *  archive ref, or the row names the sha and the cure. Reads are
 *  injectable so the firing arm never moves a real ref. */
function judgeLaneTrees(
  trees: readonly string[],
  reads: { headOf: (tree: string) => string; archive: ReadonlyMap<string, string> },
): string[] {
  const rows: string[] = [];
  for (const tree of trees) {
    const sha = reads.headOf(tree);
    if (!reachable(sha, reads.archive)) {
      rows.push(tree + " serves " + sha + " which main and every archive/served-* ref cannot reach" +
        " — a lane served a commit that was later rewritten (the " + sha.slice(0, 9) + " amend class)." +
        " Cure: git branch archive/served-" + sha.slice(0, 9) + " " + sha + " so the receipt resolves, and land the change as the NEXT commit (AGENTS.md: a served commit is never amended)");
    }
  }
  return rows;
}

describe("SERVED COMMITS REACH MAIN (T2)", () => {
  const trees = laneTrees();

  it.skipIf(trees.length === 0)("every lane tree's HEAD is reachable from main or an archive/served-* ref (dev box: the lane trees live under $HOME)", () => {
    const rows = judgeLaneTrees(trees, { headOf: (t) => git(t, ["rev-parse", "HEAD"]), archive: archiveRefs() });
    assert.deepEqual(rows, [], "SERVED COMMITS LOST — a lane tree serves a commit no ref can reach:\n" + rows.join("\n"));
    console.info("[served-commits] judged " + String(trees.length) + " lane tree(s): " + trees.join(", "));
  });

  it("every archive/served-* ref resolves, matches its name, and pins a commit main does NOT carry", () => {
    const archive = archiveRefs();
    for (const [name, sha] of archive) {
      assert.match(name, /^archive\/served-[0-9a-f]{9,40}$/, "an archive ref's name IS the receipt's hash: " + name);
      const named = name.slice("archive/served-".length);
      assert.ok(sha.startsWith(named), "the ref " + name + " resolves to " + sha + " — the pin does not match its own name");
      // the object resolves
      assert.equal(git(ROOT, ["cat-file", "-t", sha]), "commit", "the pinned object is a commit");
      // a pin main already carries is retired, not kept
      const onMain = spawnSync("git", ["merge-base", "--is-ancestor", sha, "main"], { cwd: ROOT }).status === 0;
      assert.equal(onMain, false, "archive/served-" + named + " is already on main — retire the ref deliberately (git branch -D " + name + "), do not keep a redundant pin");
    }
    // the burn's own pin: the ref class exists on this repo (a fresh
    // clone carries it as a branch once pushed; until then the arm is
    // vacuous and says so rather than demanding history)
    console.info("[served-commits] archive refs: " + String(archive.size));
  });

  it("the judge FIRES: an unreachable lane HEAD reds naming the sha and the cure; a HEAD on main is silent", () => {
    const archive = archiveRefs();
    const mainSha = git(ROOT, ["rev-parse", "main"]);
    // a synthetic tree at a sha no ref reaches: an orphan commit in a temp repo
    const tmp = mkdtempSync(join(tmpdir(), "served-commits-arm-"));
    try {
      git(tmp, ["init", "-q"]);
      git(tmp, ["-c", "user.name=arm", "-c", "user.email=arm@example.invalid", "commit", "-q", "--allow-empty", "-m", "orphan"]);
      const orphan = git(tmp, ["rev-parse", "HEAD"]);
      assert.equal(reachable(orphan, archive), false, "the orphan is unreachable by construction");
      const red = judgeLaneTrees(["/synthetic/lane9-tree"], { headOf: () => orphan, archive });
      assert.equal(red.length, 1);
      assert.match(red[0] ?? "", new RegExp("serves " + orphan));
      assert.match(red[0] ?? "", /later rewritten/);
      assert.match(red[0] ?? "", /git branch archive\/served-[0-9a-f]{9} /);
      assert.match(red[0] ?? "", /never amended/);
      // a lane on main is silent
      const green = judgeLaneTrees(["/synthetic/lane8-tree"], { headOf: () => mainSha, archive });
      assert.deepEqual(green, [], "a lane tree on main owes nothing");
      // a lane on an archive ref is silent (the pinned commit is reachable)
      const first = [...archive.values()][0];
      if (first !== undefined) {
        assert.deepEqual(judgeLaneTrees(["/synthetic/lane7-tree"], { headOf: () => first, archive }), [], "a lane tree on a pinned commit is reachable");
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("the lane-tree walker FIRES: a `lane<N>-tree` with a .git is found; a sibling without .git or the name is not", () => {
    const tmp = mkdtempSync(join(tmpdir(), "served-commits-home-"));
    try {
      mkdirSync(join(tmp, "lane3089-tree", ".git"), { recursive: true });
      mkdirSync(join(tmp, "lane3090-tree"), { recursive: true });
      mkdirSync(join(tmp, "lane-tree", ".git"), { recursive: true });
      writeFileSync(join(tmp, "lane3091-tree"), "not a dir");
      assert.deepEqual(laneTrees(tmp), [join(tmp, "lane3089-tree")], "only a lane<N>-tree with a .git is a lane tree");
      assert.deepEqual(laneTrees(join(tmp, "absent")), [], "an absent home has no lanes");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
