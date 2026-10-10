// bump-collision.spec.ts — THE E5 WALL (audit 005, 2026-10-22): a
// pin hop onto a provisioned tree must reach the checkout without an
// abort. The disease, reproduced with real git: `layDownloadPointers`
// consumes ComfyUI's tracked `models/<cat>/put_*_here` placeholders
// (the self-heal moves them into the store) and leaves symlinks over
// the tracked dirs — a later `git checkout` of a pin that changes
// those placeholders refuses, and one that recreates their parent
// dirs writes THROUGH the link into the model store. The cure:
// `detachModelPointers` before the checkout, `--force` for the
// pinned-surface law (the pin is the truth), pointers re-laid after.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detachModelPointers, layDownloadPointers } from "../scripts/provision-instance-layout.ts";

/** One scratch rig: a git repo with a tracked placeholder, the
 *  pointer layer laid over it, and a second commit where the
 *  placeholder CHANGED (the pin hop's target tree). */
function riggedRuntime(): { rt: string; store: string; pinB: string } {
  const rt = mkdtempSync(join(tmpdir(), "bump-collision-"));
  onTestFinished(() => rmSync(rt, { recursive: true, force: true }));
  const git = (args: string[]): void => {
    execFileSync("git", args, { cwd: rt, stdio: "pipe" });
  };
  git(["init", "--quiet"]);
  git(["config", "user.email", "wall@melite"]);
  git(["config", "user.name", "bump-collision wall"]);
  // the pin's tracked placeholder (ComfyUI ships one per category)
  mkdirSync(join(rt, "models", "checkpoints"), { recursive: true });
  writeFileSync(join(rt, "models", "checkpoints", "put_checkpoints_here"), "pin A\n");
  writeFileSync(join(rt, "main.py"), "# core A\n");
  git(["add", "."]);
  git(["commit", "--quiet", "-m", "pin A"]);
  // the layout consumes the placeholder (self-heal moves it to the
  // store) and lays the pointer — the tree is now DIRTY exactly the
  // way a provisioned runtime is
  const store = join(rt, "store");
  layDownloadPointers(store, { checkpoints: "checkpoints" }, join(rt, "models"));
  assert.ok(existsSync(join(store, "checkpoints", "put_checkpoints_here")),
    "the rig's placeholder moved into the store (the provisioned shape)");
  // the target pin: the placeholder's content CHANGED between pins
  execFileSync("git", ["checkout", "--quiet", "--force", "HEAD"], { cwd: rt, stdio: "pipe" });
  writeFileSync(join(rt, "models", "checkpoints", "put_checkpoints_here"), "pin B\n");
  writeFileSync(join(rt, "main.py"), "# core B\n");
  git(["add", "."]);
  git(["commit", "--quiet", "-m", "pin B"]);
  const pinB = execFileSync("git", ["rev-parse", "HEAD"],
    { cwd: rt, encoding: "utf8" }).trim();
  // back to pin A (detached): the runtime's steady state after its
  // LAST provision, pointer re-laid over the older pin's tree
  execFileSync("git", ["checkout", "--quiet", "--force", "HEAD~1"], { cwd: rt, stdio: "pipe" });
  layDownloadPointers(store, { checkpoints: "checkpoints" }, join(rt, "models"));
  return { rt, store, pinB };
}

describe("the bump collision (audit 005/E5)", () => {
  it("the disease is real: a plain checkout onto the pointed tree aborts", () => {
    const { rt, pinB } = riggedRuntime();
    // pin B is FETCH_HEAD's shape; the placeholder is locally
    // deleted (consumed) and CHANGED between the pins — plain
    // checkout refuses, which is exactly the aborted `provision
    // sync` the audit names
    let aborted = false;
    try {
      execFileSync("git", ["checkout", "--quiet", pinB],
        { cwd: rt, stdio: "pipe" });
    } catch {
      aborted = true;
    }
    assert.ok(aborted,
      "plain checkout succeeded — the rig no longer reproduces the collision");
  });

  it("the cure: detach the pointers, force the checkout, re-lay", () => {
    const { rt, store, pinB } = riggedRuntime();
    const detached = detachModelPointers(join(rt, "models"));
    assert.deepEqual(detached, ["checkpoints"]);
    // the pinned-surface law: --force restores the changed
    // placeholder instead of aborting on the deletion
    execFileSync("git", ["checkout", "--quiet", "--force", pinB],
      { cwd: rt, stdio: "pipe" });
    // the store never lost anything, and the pointer is re-laid
    // onto the checked-out core exactly as `paths` does after
    layDownloadPointers(store, { checkpoints: "checkpoints" }, join(rt, "models"));
    assert.equal(readlinkSync(join(rt, "models", "checkpoints")), join(store, "checkpoints"),
      "the pointer is re-laid over the new pin's tree");
    assert.ok(existsSync(join(store, "checkpoints", "put_checkpoints_here")),
      "the store's content survived the hop untouched");
  });

  it("detach is a no-op on a fresh clone (no pointers laid yet)", () => {
    const rt = mkdtempSync(join(tmpdir(), "bump-fresh-"));
    onTestFinished(() => rmSync(rt, { recursive: true, force: true }));
    mkdirSync(join(rt, "models", "checkpoints"), { recursive: true });
    writeFileSync(join(rt, "models", "checkpoints", "put_checkpoints_here"), "x");
    assert.deepEqual(detachModelPointers(join(rt, "models")), [],
      "a fresh checkout has plain dirs — nothing to detach");
  });
});
