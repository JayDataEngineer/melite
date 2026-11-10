// queue-lock-sweep.spec.ts — the lock, sidecar, and boot-sweep
// planes' every arm (TEST-2 breadth, the deterministic census of
// 2026-09-19): acquireLock's fresh/live-pid/stale-steal/unreadable
// rows, releaseLock, pipelineOf's four resolutions, bootSweep's
// dispositions (absent root, live row, unreadable flow, non-object
// flow, running resettle, the D-8 queued hold + its bound),
// sweepSidecar's deep resettle.
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireLock,
  releaseLock,
  refuseStartLine,
  appendLedger,
  writeJsonAtomic,
  resolveStateRoot,
  outRootFor,
  ledgerPathFor,
  bootGate,
  isPidAlive,
} from "../src/queueLock.ts";
import { pipelineOf } from "../src/queueSidecar.ts";
import { bootSweep, sweepSidecar } from "../src/queueSweep.ts";

const ROOT = join(tmpdir(), "melite-lock-" + process.pid);
beforeAll(() => mkdirSync(ROOT, { recursive: true }));
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

describe("the lock plane's tail arms", () => {
  it("refuseStartLine voices the em-dash byte-exact", () => {
    assert.equal(
      refuseStartLine("note"),
      "[gateway] REFUSING TO START: note — one writer per state root",
    );
  });
  it("an unreadable holder (a directory at the lock path) steals as garbage", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockd-"));
    try {
      mkdirSync(join(root, "gateway.lock"), { recursive: true });
      const r = acquireLock(root, 222222);
      // the directory holder read throws -> "" -> garbage steal
      // (writePidFile then fails too — the path IS a directory — so
      // the steal refuses with the failed-write voice)
      assert.equal(r.ok, false);
      assert.match(r.note, /lock steal failed/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  // Windows: chmod mode bits are ignored (admin runner) — the
  // read-only root still steals, so this refusal never fires here.
  it.skipIf(process.platform === "win32")("a read-only root after a dead-pid collision refuses the steal", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockr-"));
    try {
      writeFileSync(join(root, "gateway.lock"), String(2 ** 31 - 1));
      chmodSync(root, 0o555);
      const r = acquireLock(root, 333333);
      assert.equal(r.ok, false);
      // the stale lock file still exists: the steal's re-open trips
      // EEXIST (the file survived), not EACCES (the root refuses the
      // unlink) — the note carries the bare errno
      assert.match(r.note, /open EEXIST\)$/);
    } finally {
      chmodSync(root, 0o755);
      rmSync(root, { recursive: true, force: true });
    }
  });
  // Windows: chmod mode bits are ignored (admin runner) — see above.
  it.skipIf(process.platform === "win32")("an unwritable runs root with no stale lock steals into EACCES and the note names the root's mode", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-locke-"));
    try {
      const runs = join(root, "runs");
      mkdirSync(runs);
      chmodSync(runs, 0o555);
      const r = acquireLock(runs, 424242);
      // no holder file exists: the first open fails EACCES, the
      // holder read comes back empty (garbage), the unlink no-ops,
      // and the steal's second open fails EACCES again — the note
      // names the errno AND the runs-root remedy (F5's whole point)
      assert.equal(r.ok, false);
      assert.match(
        r.note,
        /lock steal failed: .*gateway\.lock \(open EACCES — the runs root is not writable by this user\)$/,
      );
    } finally {
      chmodSync(join(root, "runs"), 0o755);
      rmSync(root, { recursive: true, force: true });
    }
  });
  // Windows: chmod mode bits are ignored (admin runner) — the
  // read-only unlink still frees, so the third refusal never fires.
  // The chmod-free refusals ride the lane-independent arm below.
  it.skipIf(process.platform === "win32")("releaseLock: absent file, foreign holder, and read-only unlink all refuse", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockrel-"));
    try {
      assert.equal(releaseLock(root, 444444), false, "absent lock refuses");
      writeFileSync(join(root, "gateway.lock"), String(555555));
      assert.equal(releaseLock(root, 444444), false, "a foreign pid never frees another's lock");
      writeFileSync(join(root, "gateway.lock"), String(444444));
      chmodSync(root, 0o555);
      assert.equal(releaseLock(root, 444444), false, "an unremovable lock refuses");
      chmodSync(root, 0o755);
      assert.equal(releaseLock(root, 444444), true, "the owner frees its own");
    } finally {
      chmodSync(root, 0o755);
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("releaseLock: the chmod-free refusals (absent file, foreign holder) — lane-independent", () => {
    // The portable half of the arm above: no chmod involved, so this
    // judges on every lane including Windows (where the read-only
    // unlink half is skipped).
    const root = mkdtempSync(join(tmpdir(), "melite-lockrel-portable-"));
    try {
      assert.equal(releaseLock(root, 444444), false, "absent lock refuses");
      writeFileSync(join(root, "gateway.lock"), String(555555));
      assert.equal(releaseLock(root, 444444), false, "a foreign pid never frees another's lock");
      writeFileSync(join(root, "gateway.lock"), String(444444));
      assert.equal(releaseLock(root, 444444), true, "the owner frees its own");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("resolveStateRoot names the root in config (J12: the env seam is gone); outRootFor and ledgerPathFor compose", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockpaths-"));
    try {
      assert.equal(resolveStateRoot({ repoRoot: root }), join(root, "data", "runs"));
      assert.equal(
        resolveStateRoot({ repoRoot: root, stateRoot: join(root, "elsewhere") }),
        join(root, "elsewhere"),
      );
      // The retired seam must NOT win even when set: config is the
      // only spelling (the negative control on the retirement).
      process.env["MELITE_STATE_ROOT"] = join(root, "ghost");
      try {
        assert.equal(resolveStateRoot({ repoRoot: root }), join(root, "data", "runs"));
      } finally {
        delete process.env["MELITE_STATE_ROOT"];
      }
      assert.equal(outRootFor(root, true), join(root, "test-output"));
      assert.equal(outRootFor(root, false), join(root, "output"));
      assert.equal(ledgerPathFor(root), join(root, "output", "_ledger.jsonl"));
      // THE DOUBLE-UNNAMED FALLBACK: a config naming NEITHER root
      // resolves the repo-relative default — the empty repoRoot joins
      // data/runs relative to the process cwd, never an invented
      // absolute.
      assert.equal(resolveStateRoot({}), join("data", "runs"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("bootGate delegates to acquireLock (one spelling)", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockboot-"));
    try {
      // the FIRST writer is THIS live process: a second boot from
      // the same live pid refuses — one writer per state root
      assert.equal(bootGate(root, process.pid).ok, true);
      assert.equal(bootGate(root, process.pid).ok, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("appendLedger without data rides the empty-object toll; a bad root never throws", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockled-"));
    try {
      appendLedger(root, "server.no_data");
      const line = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8").trim();
      assert.match(line, /"data":\{\}/);
      appendLedger(join(root, "not", "writable", "path"), "never.throws");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("writeJsonAtomic stringifies undefined to the literal null", async () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockaw-"));
    try {
      await writeJsonAtomic(join(root, "doc.json"), undefined);
      assert.equal(readFileSync(join(root, "doc.json"), "utf8"), "null");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("acquireLock (the single-gateway lock)", () => {
  it("a fresh root acquires", () => {
    const r = acquireLock(ROOT, 111111);
    assert.deepEqual(r, { ok: true, note: "acquired" });
    releaseLock(ROOT, 111111);
  });
  it("a lock held by a LIVE pid refuses", () => {
    // fixture by hand: the holder line must be THIS process (live)
    writeFileSync(join(ROOT, "gateway.lock"), String(process.pid));
    const r = acquireLock(ROOT, 111111);
    assert.equal(r.ok, false);
    assert.match(r.note ?? "", /held by live pid/);
    releaseLock(ROOT, process.pid);
  });
  it("a stale lock is stolen from the dead pid, ledgered", () => {
    // fixture by hand: a kernel-reserved pid that cannot exist
    writeFileSync(join(ROOT, "gateway.lock"), String(2 ** 31 - 1));
    const r = acquireLock(ROOT, 111111);
    assert.equal(r.ok, true);
    assert.match(r.note ?? "", /stolen from dead pid 2147483647/);
    releaseLock(ROOT, 111111);
  });
  it("an unreadable holder line steals too (hpid -1)", () => {
    acquireLock(ROOT, 111111);
    writeFileSync(join(ROOT, "gateway.lock"), "not-a-pid");
    const r = acquireLock(ROOT, 222222);
    assert.equal(r.ok, true);
    releaseLock(ROOT, 222222);
  });
  it("isPidAlive: this process lives; pid -1 does not", () => {
    assert.equal(isPidAlive(process.pid), true);
    // pid 0 is never deliverable on linux: process.kill(0,0) probes
    // the caller's own group — use a reserved-kernel pid that cannot exist
    assert.equal(isPidAlive(2 ** 31 - 1), false);
  });
});

describe("pipelineOf (the run's pipeline identity)", () => {
  it("flow string first", () => {
    assert.equal(
      pipelineOf({ flow: "f1", model: "m1", flow_inline: { id: "x" } } as never),
      "f1",
    );
  });
  it("model string second (empty flow falls through)", () => {
    assert.equal(pipelineOf({ flow: "", model: "m1" } as never), "m1");
  });
  it("flow_inline.id third", () => {
    assert.equal(pipelineOf({ flow_inline: { id: "inline-1" } } as never), "inline-1");
  });
  it("nothing resolves: empty string", () => {
    assert.equal(pipelineOf({} as never), "");
    assert.equal(pipelineOf({ flow_inline: { id: 7 } } as never), "");
  });
});

describe("bootSweep (the boot dispositions)", () => {
  it("an absent output root sweeps nothing", async () => {
    assert.deepEqual(await bootSweep(join(ROOT, "nope")), []);
  });
  it("a live run id is left alone; a stale RUNNING claim resettles", async () => {
    const out = join(ROOT, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-live"), { recursive: true });
    writeFileSync(join(out, "run-live", "_flow.json"), JSON.stringify({ status: "running" }));
    mkdirSync(join(out, "run-stale"), { recursive: true });
    writeFileSync(join(out, "run-stale", "_flow.json"), JSON.stringify({ status: "running" }));
    const swept = await bootSweep(ROOT, ["run-live"]);
    assert.deepEqual(swept, ["run-stale"]);
    const doc = JSON.parse(readFileSync(join(out, "run-stale", "_flow.json"), "utf8"));
    assert.equal(doc["status"], "failed");
  });
  it("an unreadable _flow.json is ledgered unreadable, never silent", async () => {
    const out = join(ROOT, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-bad"), { recursive: true });
    writeFileSync(join(out, "run-bad", "_flow.json"), "{nope");
    // ROW 28 law: the row is LEDGERED unreadable — not swept (the
    // disposition is the ledger row itself, the loop continues). The
    // bytes SURVIVE for operator reconcile (Q5: only an ABSENT
    // sidecar is reclaimed).
    assert.deepEqual(await bootSweep(ROOT), []);
    const ledger = readFileSync(join(ROOT, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"state":"unreadable"/);
    assert.match(ledger, /parse failed/);
    assert.ok(existsSync(join(out, "run-bad")), "torn bytes survive for reconcile");
  });
  it("a crash-orphaned _request.json-only dir is observed once and reclaimed (Q5)", async () => {
    // the press died between its two sidecar writes: the dir can
    // never enqueue, so the ledger row is its one observation and the
    // bytes are reclaimed instead of haunting every boot
    const root3 = join(ROOT, "state3");
    const out = join(root3, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-orphan"), { recursive: true });
    writeFileSync(join(out, "run-orphan", "_request.json"), JSON.stringify({ draft_id: "d1" }));
    assert.deepEqual(await bootSweep(root3), []);
    const ledger = readFileSync(join(root3, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"state":"unreadable"/);
    assert.match(ledger, /crash-orphaned dir dropped/);
    assert.ok(!existsSync(join(out, "run-orphan")), "the orphan's bytes are reclaimed");
  });
  it("a non-object _flow.json is ledgered unreadable too", async () => {
    const root2 = join(ROOT, "state2");
    const out = join(root2, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-arr"), { recursive: true });
    writeFileSync(join(out, "run-arr", "_flow.json"), "[1]");
    assert.deepEqual(await bootSweep(root2), []);
    const ledger = readFileSync(join(root2, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /_flow.json is not an object/);
  });
});

// THE D-8 HOLD (defect board 2026-11-18, the verbatim burn:
// `run.swept — run_id=run-422c4d46a721-c2357165, state=failed,
// error=boot sweep`): "A run that had already been accepted into the
// queue was marked failed because the harness restarted before it
// dispatched. No artifact, no retry. For a GPU queue whose runs cost
// minutes, the sweep should re-queue (or hold as queued) rather than
// fail: the user's press was valid and nothing about the engine
// changed." A still-QUEUED sidecar at boot NEVER executed — it holds
// as queued (ledgered queued_held, never failed), bounded by
// BOOT_SWEEP_MAX_HOLDS so a row no boot can replay cannot haunt as
// queued forever.
describe("bootSweep holds a queued press (D-8)", () => {
  const plant = (root: string, run: string, doc: Record<string, unknown>): string => {
    const dir = join(root, "output", run);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify(doc));
    return join(dir, "_flow.json");
  };
  it("a still-QUEUED sidecar holds as queued — never failed, ledgered queued_held", async () => {
    const root = join(ROOT, "d8-hold");
    rmSync(root, { recursive: true, force: true });
    plant(root, "run-press", {
      status: "queued",
      draft_id: "d1",
      created_at: 100,
      pipeline: "flow_inline",
      stages: [{ id: "s1", status: "queued" }],
    });
    const swept = await bootSweep(root);
    // the press was never executed: NOTHING retires it
    assert.deepEqual(swept, [], "a held row is not swept — the sweep retired nothing");
    const doc = JSON.parse(readFileSync(join(root, "output", "run-press", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(doc["status"], "queued", "the press stays queued for the next boot's replay");
    assert.equal(doc["sweep_holds"], 1);
    assert.match(String(doc["sweep"]), /held as queued for the next boot's replay \(hold 1\/3/);
    assert.match(String(doc["sweep"]), /never executed/);
    assert.equal(doc["error"], undefined, "a held row is not an errored row");
    // per-stage queued faces stay queued too — the run never started
    assert.equal((doc["stages"] as { status: string }[])[0]["status"], "queued");
    const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"state":"queued_held"/);
    assert.match(ledger, /the press never executed/);
    assert.doesNotMatch(ledger, /"state":"failed"/);
  });
  it("the hold is bounded — past BOOT_SWEEP_MAX_HOLDS the row settles failed loud (the haunt law)", async () => {
    const root = join(ROOT, "d8-bound");
    rmSync(root, { recursive: true, force: true });
    plant(root, "run-ghost", {
      status: "queued",
      draft_id: "d1",
      created_at: 100,
      pipeline: "flow_inline",
      stages: [{ id: "s1", status: "queued" }],
    });
    for (let i = 0; i < 3; i++) await bootSweep(root);
    let doc = JSON.parse(readFileSync(join(root, "output", "run-ghost", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(doc["status"], "queued", "three boots held — the grace window is 3");
    assert.equal(doc["sweep_holds"], 3);
    const swept = await bootSweep(root);
    // the 4th boot: no replay ever came — the row settles failed
    // loud, never haunting as queued forever
    assert.deepEqual(swept, ["run-ghost"]);
    doc = JSON.parse(readFileSync(join(root, "output", "run-ghost", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(doc["status"], "failed");
    assert.match(String(doc["error"]), /held 4 boots without a replay; settling failed \(resubmit\)/);
    assert.match(String(doc["error"]), /never executed/);
    assert.equal((doc["stages"] as { status: string }[])[0]["status"], "failed");
    const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"state":"queued_held"/);
    assert.match(ledger, /"state":"queued_lost"/);
  });
  it("a held row's identity rides verbatim — the hold touches only the sweep keys", async () => {
    const root = join(ROOT, "d8-identity");
    rmSync(root, { recursive: true, force: true });
    plant(root, "run-ident", {
      status: "queued",
      draft_id: "d1",
      created_at: "late",
      pipeline: 7,
      stages: "s",
      skipped_stages: [],
      artifacts: [],
    });
    await bootSweep(root);
    const doc = JSON.parse(readFileSync(join(root, "output", "run-ident", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(doc["status"], "queued");
    assert.equal(doc["created_at"], "late");
    assert.equal(doc["pipeline"], 7);
    assert.equal(doc["stages"], "s", "the row rides verbatim — the hold never rebuilds identity");
  });
});

describe("sweepSidecar (the deep resettle)", () => {
  it("running and queued rows anywhere in the tree resettle to failed (the maxHolds-0 default — only a caller that opts in holds)", () => {
    const doc = {
      status: "queued",
      stages: [{ status: "running" }, { status: "queued" }, { status: "completed" }],
    };
    const r = sweepSidecar(doc, "server.restart", "queue.requeued");
    assert.equal(doc["status"], "failed");
    assert.equal((doc["stages"] as { status: string }[])[0]["status"], "failed");
    assert.equal((doc["stages"] as { status: string }[])[1]["status"], "failed");
    assert.equal((doc["stages"] as { status: string }[])[2]["status"], "completed");
    assert.equal(r.touched, true);
    assert.equal(r.wasQueued, true);
    assert.equal(r.held, false);
  });
  it("maxHolds > 0 HOLDS a queued face — status untouched, the counter stamps, the note names the replay", () => {
    const doc: Record<string, unknown> = {
      status: "queued",
      stages: [{ id: "s1", status: "queued" }, { id: "s2", status: "completed" }],
    };
    const r = sweepSidecar(doc, "server.restart", "queue.requeued", 3);
    assert.equal(doc["status"], "queued");
    assert.equal((doc["stages"] as { status: string }[])[0]["status"], "queued");
    assert.equal(doc["sweep_holds"], 1);
    assert.match(String(doc["sweep"]), /held as queued for the next boot's replay \(hold 1\/3/);
    assert.equal(doc["error"], undefined);
    assert.equal(r.touched, true);
    assert.equal(r.held, true);
    // the SECOND hold stacks the counter (boot two of the grace)
    const r2 = sweepSidecar(doc, "server.restart", "queue.requeued", 3);
    assert.equal(doc["sweep_holds"], 2);
    assert.match(String(doc["sweep"]), /hold 2\/3/);
    assert.equal(r2.held, true);
  });
  it("past the bound the resettle fires with the exhausted-holds voice", () => {
    const doc: Record<string, unknown> = { status: "queued", sweep_holds: 3, stages: [{ id: "s1", status: "queued" }] };
    const r = sweepSidecar(doc, "server.restart", "queue.requeued", 3);
    assert.equal(doc["status"], "failed");
    assert.equal((doc["stages"] as { status: string }[])[0]["status"], "failed");
    assert.match(String(doc["error"]), /held 4 boots without a replay; settling failed \(resubmit\)/);
    assert.equal(r.held, false);
    assert.equal(r.wasQueued, true);
  });
  it("a stopping row resettles to stopped — the requested stop landed, never failed", () => {
    const doc = { status: "stopping", stages: [{ status: "running" }, { status: "stopping" }] };
    const r = sweepSidecar(doc, "server.restart");
    assert.equal(doc["status"], "stopped");
    const stages = doc["stages"] as { status: string }[];
    assert.equal(stages[0]["status"], "failed");
    assert.equal(stages[1]["status"], "stopped");
    assert.equal(r.touched, true);
    assert.equal(r.wasQueued, false);
  });
  it("a settled doc rides untouched", () => {
    const doc = { status: "completed", stages: [{ status: "completed" }] };
    const r = sweepSidecar(doc, "server.restart");
    assert.equal(doc["status"], "completed");
    assert.equal(r.touched, false);
    assert.equal(r.wasQueued, false);
  });
});
