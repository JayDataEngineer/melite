// build-plane-tree-lock.spec.ts — THE FRESH-TREE LOCK LAW (CI run
// 44495761895, 2026-11-19: five push-gated jobs — the three unit legs,
// the coverage gate and the tiers job — died at `pnpm run build` in
// 30-60 seconds while every developer box stayed green). The cure is
// the one-writer build lock committed hours earlier: `mkdirSync(lock,
// { recursive: false })` under `data/tmp/`, a directory that is
// UNTRACKED RUNTIME STATE and therefore absent from every fresh clone.
// The bare `catch` read ENOENT as contention, found no pid file, and
// re-ran the same non-recursive mkdir — which threw, uncaught, before
// a single package built:
//
//   Error: ENOENT: no such file or directory, mkdir
//     '.../data/tmp/build-plane.lock'
//       at file:///.../tools/build-plane.mjs:1043:5
//
// The local seat never saw it because the box's data/tmp predates the
// lock (the fixture-leak class this wall closes: a gate whose PASS
// depends on machine state no clone carries).
//
// Arms, each on a synthetic root the test owns:
//   1. FRESH ROOT — no data/ at all: acquire succeeds, parent chain
//      created, pid stamped, and the lock dir is the documented path.
//   2. THE BURN, FROZEN — the first cut's shape (bare non-recursive
//      mkdir under the missing parent) throws ENOENT on the same fresh
//      root: the CI red is reproduceable, so the cure is judged against
//      the exact defect rather than a paraphrase.
//   3. CONTENTION — a live holder is refused via TreeLockHeld with its
//      pid, and the loser does NOT steal the lock (pid file unmoved).
//   4. CORPSE RECLAIM — a dead holder's lock directory is reclaimed by
//      the next acquirer (the killed-sentry class).
//   5. NO SILENT PASS-THROUGH — an errno that is not EEXIST (parent is
//      a FILE) surfaces; the lock never reads a filesystem fault as a
//      held lock.
//   6. THE RECYCLED CORPSE (2026-11-27, artifact-plane-law W4 red: the
//      sandbox spawner handed the dead holder's pid number to an
//      unrelated live process) — a live pid number whose argv does not
//      match the holder stamp is a DIFFERENT process, not a holder:
//      reclaimed, never refused forever.
import { describe, expect, it } from "vitest";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireTreeLock, releaseTreeLock, TreeLockHeld } from "../../../../tools/build-plane.mjs";

const ROOTS: string[] = [];

/** A synthetic repo root with NO runtime state — the fresh-clone shape. */
function freshRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "build-plane-lock-"));
  ROOTS.push(root);
  return root;
}

function cleanup(): void {
  for (const root of ROOTS.splice(0)) rmSync(root, { recursive: true, force: true });
}

describe("THE FRESH-TREE LOCK — data/tmp is runtime state, so the lock creates it", () => {
  it("ARM 1: acquires on a root with no data/ dir — the parent chain is the lock's own job", () => {
    const root = freshRoot();
    expect(existsSync(join(root, "data")), "the fixture root must start with NO runtime state (the fresh-clone shape)").toBe(false);
    const lockDir = acquireTreeLock(root);
    expect(lockDir).toBe(join(root, "data", "tmp", "build-plane.lock"));
    expect(existsSync(join(lockDir, "pid")), "the holder must stamp its pid").toBe(true);
    expect(readFileSync(join(lockDir, "pid"), "utf8").trim()).toBe(String(process.pid));
    releaseTreeLock(lockDir);
    expect(existsSync(lockDir)).toBe(false);
    // The parent survives a release: repeated builds on one box stay cheap.
    expect(existsSync(join(root, "data", "tmp"))).toBe(true);
    cleanup();
  });

  it("ARM 2: THE BURN FROZEN — the first cut's bare non-recursive mkdir throws ENOENT on the same fresh root", () => {
    const root = freshRoot();
    // Verbatim shape of the burned commit: no parent creation, a bare catch.
    let burned: unknown = null;
    try {
      mkdirSync(join(root, "data", "tmp", "build-plane.lock"), { recursive: false });
    } catch (err) {
      burned = err;
    }
    expect((burned as NodeJS.ErrnoException | null)?.code, "the preparented mkdir MUST fail ENOENT — if this arm goes green the burn no longer reproduces and the wall is judging a paraphrase").toBe("ENOENT");
    // The cured door on the same root succeeds where the burn failed.
    const lockDir = acquireTreeLock(root);
    expect(existsSync(lockDir)).toBe(true);
    releaseTreeLock(lockDir);
    cleanup();
  });

  it("ARM 3: a LIVE holder is refused with its pid, and the loser never steals the lock", () => {
    const root = freshRoot();
    const lockDir = acquireTreeLock(root);
    try {
      expect(() => acquireTreeLock(root, process.pid)).toThrow(TreeLockHeld);
      let held: TreeLockHeld | null = null;
      try {
        acquireTreeLock(root, process.pid);
      } catch (err) {
        held = err as TreeLockHeld;
      }
      expect(held?.pid, "the refusal must name the live holder").toBe(process.pid);
      expect(held?.message).toMatch(/another instance \(pid \d+\) holds the tree lock/);
      expect(readFileSync(join(lockDir, "pid"), "utf8").trim(), "the loser must not rewrite the holder's pid").toBe(String(process.pid));
    } finally {
      releaseTreeLock(lockDir);
      cleanup();
    }
  });

  it("ARM 4: a CORPSE holder (pid of an exited process) is reclaimed", () => {
    const root = freshRoot();
    const dead = spawnSync(process.execPath, ["-e", ""], { encoding: "utf8" });
    expect(dead.status, "the corpse probe needs a process that really exited").toBe(0);
    const lockDir = join(root, "data", "tmp", "build-plane.lock");
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(join(lockDir, "pid"), `${dead.pid}\n`);
    const reclaimed = acquireTreeLock(root);
    expect(readFileSync(join(reclaimed, "pid"), "utf8").trim(), "a dead holder's lock must be reclaimed by the new writer").toBe(String(process.pid));
    releaseTreeLock(reclaimed);
    cleanup();
  });

  it("ARM 5: an errno that is not EEXIST surfaces — a filesystem fault is never read as a held lock", () => {
    const root = freshRoot();
    writeFileSync(join(root, "data"), "not a directory\n");
    let thrown: NodeJS.ErrnoException | null = null;
    try {
      acquireTreeLock(root);
    } catch (err) {
      thrown = err as NodeJS.ErrnoException;
    }
    expect(thrown, "the acquirer must throw when the runtime parent cannot be created").not.toBeNull();
    expect(thrown?.code, "the fault keeps its own errno — it must not be laundered into TreeLockHeld").not.toBe("EEXIST");
    expect(thrown instanceof TreeLockHeld).toBe(false);
    cleanup();
  });

  it("ARM 6: THE RECYCLED CORPSE — a live pid wearing a dead holder's number is reclaimed, not refused forever", () => {
    const root = freshRoot();
    // A genuinely live process whose argv differs from the stamp: the
    // pid-reuse shape (the OS handed the corpse's number to a stranger).
    const stranger = spawn(process.execPath, ["-e", "setInterval(() => {}, 1e6)"], {
      stdio: "ignore",
    });
    try {
      let strangerAlive = false;
      try {
        process.kill(stranger.pid!, 0);
        strangerAlive = true;
      } catch {
        strangerAlive = false;
      }
      expect(stranger.pid, "the fixture needs a live stranger process").toBeTruthy();
      expect(strangerAlive, "the stranger must still be alive for the reuse to be real").toBe(true);
      const lockDir = join(root, "data", "tmp", "build-plane.lock");
      mkdirSync(lockDir, { recursive: true });
      writeFileSync(join(lockDir, "pid"), `${stranger.pid}\n`);
      // The stamp records the DEAD holder's boot-clock start time —
      // the stranger booted at a different tick, so it can never match.
      writeFileSync(join(lockDir, "holder"), "100\n");
      const reclaimed = acquireTreeLock(root);
      expect(readFileSync(join(reclaimed, "pid"), "utf8").trim(), "the recycled corpse's lock must be reclaimed by the new writer").toBe(String(process.pid));
      expect(readFileSync(join(reclaimed, "holder"), "utf8").trim(), "the reclaim restamps the holder start time").not.toBe("100");
      releaseTreeLock(reclaimed);
    } finally {
      if (stranger.pid) process.kill(stranger.pid, "SIGKILL");
      cleanup();
    }
  });

  it("ARM 7: a live holder whose start time MATCHES the stamp is still refused — identity never defeats a real writer", () => {
    const root = freshRoot();
    const lockDir = acquireTreeLock(root);
    try {
      let held: TreeLockHeld | null = null;
      try {
        acquireTreeLock(root, process.pid);
      } catch (err) {
        held = err as TreeLockHeld;
      }
      expect(held, "a live matching holder is a real writer — the lock must refuse").not.toBeNull();
      expect(readFileSync(join(lockDir, "pid"), "utf8").trim()).toBe(String(process.pid));
    } finally {
      releaseTreeLock(lockDir);
      cleanup();
    }
  });
});
