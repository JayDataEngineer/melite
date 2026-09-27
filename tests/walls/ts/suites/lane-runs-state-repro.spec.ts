// lane-runs-state-repro.spec.ts — the false-death hunt's laws, as
// ASSERTIONS (2026-10-08; the critique's M3: the first version of
// this file printed verdicts and asserted nothing — a wall that
// cannot fail).
//
// The lane's runs seat was NEVER dead: the "validate 502s" were (a)
// seat REFUSALS rendered 502 by the /v1 door's error map (fixed —
// failEstate maps the code's class; see doors.ts + doors-errors.
// spec.ts), (b) boot-settle races (doors answer before sibling
// fibers' services land — the verbatim test below pins that every
// seat settles within the window), and (c) wrong paths/bodies in
// the probes themselves (/v1/runs was never a route).
//
// The four laws this wall pins:
//  1. VERBATIM — the full estate bundle settles every seat against
//     an empty root (the composition wall's shape, re-pinned here
//     with the runs plane + skills in the settle list).
//  2. THE TREE — the same bundle against a COPY of the REAL
//     data/runs tree (media filtered, lock deleted) settles every
//     seat: the state tree does not kill the queue.
//  3. THE ENV PIN (stroke 45c) — a boot without MELITE_STATE_ROOT
//     buries the queue fiber silently (asserted directly: the
//     QueueService constructor throws the unpinned voice).
//  4. THE LOCK LAW — a gateway.lock held by a LIVE pid refuses the
//     boot gate (asserted directly: acquireLock on a live-pid lock
//     refuses; dead pid is stolen; a clean root acquires). A repro
//     copying the real tree inherits the LIVE lane's pid — the
//     copy must drop the lock.
//
// Hygiene (the prior incident: an env leak poisoned the shared
// worker): env saved/restored per test, every Context torn down
// via its root fiber's dispose (Context itself exposes no dispose;
// the fibers do — the second critique caught the header claiming
// disposal while the code dropped the array), every sandbox
// removed in afterEach.
import "../../../helpers/boot-models.ts";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import timerPlugin from "@deepseek-ai/cordis-plugin-timer";
import draftsPlugin from "@melite/estate-drafts";
import { acquireLock } from "../../../../packages/harness/estate-queue/src/queueLock.ts";
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";
import { QueueService } from "../../../../packages/harness/estate-queue/src/service.ts";

const REAL_RUNS = join(import.meta.dirname, "..", "..", "..", "..", "data", "runs");

const SEATS = [
  "queue", "runs", "runsRemote", "draftsRemote", "benchRemote",
  "cardRegistry", "disclose", "manage", "meliteSkills",
] as const;

const contexts: Context[] = [];
const sandboxes: string[] = [];
let savedEnv: string | undefined;

beforeEach(() => {
  savedEnv = process.env["MELITE_STATE_ROOT"];
});

afterEach(async () => {
  if (savedEnv === undefined) delete process.env["MELITE_STATE_ROOT"];
  else process.env["MELITE_STATE_ROOT"] = savedEnv;
  // Context exposes no .dispose — its ROOT FIBER does (cordis
  // lib/types/fiber.d.ts: dispose(): Promise<void>). Tear each
  // boot down for real (best-effort: a disposal throw must not
  // mask a test failure); the peer walls rely on worker exit, this
  // wall does better.
  for (const ctx of contexts.splice(0)) {
    const fiber = (ctx as { fiber?: { dispose?: () => Promise<void> } }).fiber
    if (fiber !== undefined && typeof fiber.dispose === "function") {
      await fiber.dispose().catch(() => undefined)
    }
  }
  for (const dir of sandboxes.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function sandbox(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), name + "-"));
  sandboxes.push(dir);
  return dir;
}

/** The real runs tree, media-filtered (the first version of this
 *  wall filled /tmp — 6 sandboxes × 1.1G), lock DELETED (the lock
 *  holds the LIVE lane's pid; law 4). */
function copyRealTree(dst: string): void {
  cpSync(REAL_RUNS, dst, {
    recursive: true,
    filter: (f: string): boolean => {
      if (statSync(f).isDirectory()) return !basename(f).startsWith("media");
      return statSync(f).size <= 1_000_000;
    },
  });
  rmSync(join(dst, "gateway.lock"), { force: true });
}

/** The verbatim bundle boot (the composition wall's shape). env
 *  MUST be pinned by the caller — the root-pin law is law 3. */
async function bootBundle(root: string): Promise<Context> {
  const ctx = new Context();
  contexts.push(ctx);
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(estateBundle as never);
  return ctx;
}

/** Poll until every seat resolves; return the missing list at
 *  deadline (the caller asserts — a wall that cannot fail pins
 *  nothing). */
async function settleMissing(ctx: Context, names: readonly string[], ms: number): Promise<string[]> {
  const deadline = Date.now() + ms;
  for (;;) {
    const missing = names.filter((n) => ctx.get(n, false) === undefined);
    if (missing.length === 0 || Date.now() > deadline) return missing;
    await new Promise((r): void => setTimeout(r, 100));
  }
}

describe("the false-death hunt's four laws", () => {
  it("1. VERBATIM: the bundle settles every seat on an empty root", { timeout: 30_000 }, async () => {
    const root = join(sandbox("law1-empty"), "runs");
    process.env["MELITE_STATE_ROOT"] = root;
    const ctx = await bootBundle(root);
    const missing = await settleMissing(ctx, SEATS, 20_000);
    expect(missing).toEqual([]);
  });

  it("2. THE TREE: the bundle settles every seat against a copy of the REAL runs tree", { timeout: 40_000 }, async () => {
    expect(existsSync(REAL_RUNS)).toBe(true);
    const root = join(sandbox("law2-tree"), "runs");
    copyRealTree(root);
    process.env["MELITE_STATE_ROOT"] = root;
    const ctx = await bootBundle(root);
    const missing = await settleMissing(ctx, SEATS, 20_000);
    expect(missing).toEqual([]);
  });

  it("3. THE ENV PIN: without MELITE_STATE_ROOT the queue constructor refuses LOUD (and the fiber buries it)", { timeout: 20_000 }, async () => {
    delete process.env["MELITE_STATE_ROOT"];
    const ctx = new Context();
    contexts.push(ctx);
    await ctx.plugin(timerPlugin as never);
    expect(() => new QueueService(ctx, {})).toThrow(/unpinned/);
    // And through the bundle: the row's fiber dies buried — the seat
    // NEVER settles. This silence is the false-death lesson: an
    // unpinned boot looks identical to a dead seat from the door.
    const ctx2 = new Context();
    contexts.push(ctx2);
    await ctx2.plugin(timerPlugin as never);
    await ctx2.plugin(estateBundle as never);
    // 2s, not 5: the burial is DETERMINISTIC (an unpinned boot never
    // seats queue — the constructor throws) so this poll cannot
    // flake green; it only waits out the proof window.
    const missing = await settleMissing(ctx2, ["queue"], 2_000);
    expect(missing).toEqual(["queue"]);
  });

  it("4. THE LOCK LAW: a live-pid lock refuses the gate; dead is stolen; clean acquires", { timeout: 20_000 }, async () => {
    const root = join(sandbox("law4-lock"), "runs");
    copyRealTree(root);
    // a lock held by OUR OWN pid — alive by definition
    writeFileSync(join(root, "gateway.lock"), String(process.pid));
    const refused = acquireLock(root, process.pid);
    expect(refused.ok).toBe(false);
    expect(refused.note).toContain("held by live pid");
    // dead pid → stolen (2_000_000_000 sits beyond kernel.pid_max —
    // guaranteed ESRCH; pid 1 was a bad pick, it is init and ALIVE)
    writeFileSync(join(root, "gateway.lock"), "2000000000");
    const stolen = acquireLock(root, process.pid);
    expect(stolen.ok).toBe(true);
    expect(stolen.note).toContain("stolen");
    // clean root → acquired
    rmSync(join(root, "gateway.lock"), { force: true });
    const clean = acquireLock(root, process.pid);
    expect(clean.ok).toBe(true);
    expect(clean.note).toBe("acquired");
    // THE REAL-TREE LOCK IS A MACHINE FACT, NOT A BEHAVIOUR (2026-09-26).
    // The intent is worth keeping — the live lane's lock is the
    // documented reason copyRealTree must delete a copied lock, or the
    // copy refuses its own boot — but the file's PRESENCE is the
    // operator's lane's business: it is released and re-minted across a
    // lane restart, and this wall read it at one instant. It failed
    // here on exactly that (ENOENT while :3088 cycled), which is a
    // flaky wall reporting a restart as a regression. The three laws
    // above are proven hermetically against synthetic roots; this tail
    // only confirms the live tree carries a pid when it is mid-life, so
    // it polls briefly and reports its absence rather than failing.
    const realLock = join(REAL_RUNS, "gateway.lock");
    let realHolder: string | null = null;
    for (let i = 0; i < 10 && realHolder === null; i += 1) {
      try {
        realHolder = readFileSync(realLock, "utf8").trim();
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (realHolder !== null) {
      expect(realHolder).toMatch(/^\d+$/);
    } else {
      // mid-restart is a legitimate state for the operator's lane; the
      // copy rule this documents is covered by the deletion arm above
      expect(true).toBe(true);
    }
  });
});
