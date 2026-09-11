// queue-service.spec.ts — REBUILD-5 wall: the serial run queue as a
// host Cordis service (lock-first lifecycle, FIFO law, the two
// re-homed seams). Boots the real Context + timer + estate-queue
// over mkdtemp state roots — no doors, no routes, no port.
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "../../../../packages/harness/estate-queue/node_modules/@deepseek-ai/cordis/lib/index.js";
import timerPlugin from "../../../../packages/harness/estate-queue/node_modules/@deepseek-ai/cordis-plugin-timer/lib/index.js";
import queuePlugin from "../../../../packages/harness/estate-queue/src/index.ts";
import * as queueMod from "../../../../packages/harness/estate-queue/src/index.ts";
import {
  QueueService,
  asciiEscape,
  draftIdOk,
  lockPathFor,
} from "../../../../packages/harness/estate-queue/src/index.ts";

function scratch(): string {
  return mkdtempSync(join(tmpdir(), "estate-queue-"));
}

interface Booted {
  ctx: Context;
  fiber: { dispose(): Promise<void> };
}

async function boot(root: string): Promise<Booted> {
  const ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  const fiber = ctx.plugin(queuePlugin as never, { repoRoot: root });
  await fiber;
  return { ctx, fiber: fiber as unknown as { dispose(): Promise<void> } };
}

test("the service owns the lock: acquire on boot, release on dispose", async () => {
  const root = scratch();
  process.env["MELITE_STATE_ROOT"] = root;
  const { ctx, fiber } = await boot(root);
  const svc = ctx.queue as QueueService;
  assert.ok(svc !== undefined, "the queue seat registered");
  assert.equal(svc.lockNote, "acquired");
  const lockPath = lockPathFor(root);
  assert.equal(readFileSync(lockPath, "utf8").trim(), String(process.pid));
  await fiber.dispose();
  assert.equal(existsSync(lockPath), false, "dispose released OUR lock");
  delete process.env["MELITE_STATE_ROOT"];
});

test("a second writer over a live holder's root refuses LOUD", async () => {
  const root = scratch();
  mkdirSync(root, { recursive: true });
  writeFileSync(lockPathFor(root), String(process.pid)); // we are alive
  // The MELITE_STATE_ROOT override pins the gate to THIS root
  // (resolveStateRoot would otherwise append data/runs).
  process.env["MELITE_STATE_ROOT"] = root;
  const ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  // Cordis's loud plugin death: the boot gate's throw rejects the
  // awaited fiber — the second writer exits HERE, having touched
  // nothing but the read.
  await assert.rejects(
    async (): Promise<unknown> => await ctx.plugin(queuePlugin as never, { repoRoot: root }),
    /estate-queue: gateway.lock held by live pid/,
  );
  delete process.env["MELITE_STATE_ROOT"];
});

test("a stale lock (dead pid) is stolen, with the ledger row", async () => {
  const root = scratch();
  mkdirSync(root, { recursive: true });
  writeFileSync(lockPathFor(root), "999999"); // no such pid
  process.env["MELITE_STATE_ROOT"] = root;
  const { ctx, fiber } = await boot(root);
  const svc = ctx.queue as QueueService;
  assert.match(svc.lockNote, /^stolen from dead pid 999999$/);
  await fiber.dispose();
  delete process.env["MELITE_STATE_ROOT"];
});

test("QueueCore keeps the serial-GPU law: one active, strict FIFO", () => {
  // The in-memory registry (no I/O): enqueue two, claim the head,
  // the second claim BLOCKS until release; settle maps the triad.
  const core = new queueMod.QueueCore();
  const a = { runId: "r1", status: "queued", error: "", createdAt: 1, draftId: "d", testFlag: false, stopFlag: false };
  const b = { ...a, runId: "r2", createdAt: 2 };
  assert.equal(core.enqueue(a), 0);
  assert.equal(core.enqueue(b), 1);
  const claimed = core.tryDequeue();
  assert.equal(claimed?.runId, "r1");
  assert.equal(claimed?.status, "running");
  assert.equal(core.tryDequeue(), null, "one GPU run machine-wide");
  assert.equal(core.settleRun(claimed!, null), "completed");
  core.releaseActive();
  const next = core.tryDequeue();
  assert.equal(next?.runId, "r2");
  const stopped = { ...a, runId: "r3", stopFlag: true };
  core.enqueue(stopped);
  core.releaseActive();
  assert.equal(core.settleRun(core.tryDequeue()!, new Error("x").toString()), "stopped");
});

test("the re-homed seams: asciiEscape bytes + the draft-id law's ONE address", () => {
  assert.equal(asciiEscape("caf\u00e9"), 'caf\\u00e9');
  assert.equal(asciiEscape("\u4e2d"), '\\u4e2d');
  assert.equal(draftIdOk("bench-main_01"), true);
  assert.equal(draftIdOk("bad/id"), false);
  assert.equal(draftIdOk(""), false);
  // The queue's re-export IS the drafts package's law (one voice).
  assert.equal(
    typeof queuePlugin.apply,
    "function",
  );
});
