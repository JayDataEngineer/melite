// queue-lock-sweep.spec.ts — the lock, sidecar, and boot-sweep
// planes' every arm (TEST-2 breadth, the deterministic census of
// 2026-09-19): acquireLock's fresh/live-pid/stale-steal/unreadable
// rows, releaseLock, pipelineOf's four resolutions, bootSweep's
// dispositions (absent root, live row, unreadable flow, non-object
// flow, running/queued resettle), sweepSidecar's deep resettle.
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireLock,
  releaseLock,
  refuseStartLine,
  appendLedger,
  atomicWriteJson,
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
  it("a read-only root after a dead-pid collision refuses the steal", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockr-"));
    try {
      writeFileSync(join(root, "gateway.lock"), String(2 ** 31 - 1));
      chmodSync(root, 0o555);
      const r = acquireLock(root, 333333);
      assert.equal(r.ok, false);
      assert.match(r.note, /lock steal failed/);
    } finally {
      chmodSync(root, 0o755);
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("releaseLock: absent file, foreign holder, and read-only unlink all refuse", () => {
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
  it("resolveStateRoot honors the env override; outRootFor and ledgerPathFor compose", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockpaths-"));
    try {
      assert.equal(resolveStateRoot(root), join(root, "data", "runs"));
      process.env["MELITE_STATE_ROOT"] = join(root, "elsewhere");
      try {
        assert.equal(resolveStateRoot(root), join(root, "elsewhere"));
      } finally {
        delete process.env["MELITE_STATE_ROOT"];
      }
      assert.equal(outRootFor(root, true), join(root, "test-output"));
      assert.equal(outRootFor(root, false), join(root, "output"));
      assert.equal(ledgerPathFor(root), join(root, "output", "_ledger.jsonl"));
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
  it("atomicWriteJson stringifies undefined to the literal null", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-lockaw-"));
    try {
      atomicWriteJson(join(root, "doc.json"), undefined);
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
  it("an absent output root sweeps nothing", () => {
    assert.deepEqual(bootSweep(join(ROOT, "nope")), []);
  });
  it("a live run id is left alone; others resettle", () => {
    const out = join(ROOT, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-live"), { recursive: true });
    writeFileSync(join(out, "run-live", "_flow.json"), JSON.stringify({ status: "running" }));
    mkdirSync(join(out, "run-stale"), { recursive: true });
    writeFileSync(join(out, "run-stale", "_flow.json"), JSON.stringify({ status: "queued" }));
    const swept = bootSweep(ROOT, ["run-live"]);
    assert.deepEqual(swept, ["run-stale"]);
    const doc = JSON.parse(readFileSync(join(out, "run-stale", "_flow.json"), "utf8"));
    assert.equal(doc["status"], "failed");
  });
  it("an unreadable _flow.json is ledgered unreadable, never silent", () => {
    const out = join(ROOT, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-bad"), { recursive: true });
    writeFileSync(join(out, "run-bad", "_flow.json"), "{nope");
    // ROW 28 law: the row is LEDGERED unreadable — not swept (the
    // disposition is the ledger row itself, the loop continues)
    assert.deepEqual(bootSweep(ROOT), []);
    const ledger = readFileSync(join(ROOT, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"state":"unreadable"/);
    assert.match(ledger, /parse failed/);
  });
  it("a non-object _flow.json is ledgered unreadable too", () => {
    const root2 = join(ROOT, "state2");
    const out = join(root2, "output");
    rmSync(out, { recursive: true, force: true });
    mkdirSync(join(out, "run-arr"), { recursive: true });
    writeFileSync(join(out, "run-arr", "_flow.json"), "[1]");
    assert.deepEqual(bootSweep(root2), []);
    const ledger = readFileSync(join(root2, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /_flow.json is not an object/);
  });
});

describe("sweepSidecar (the deep resettle)", () => {
  it("running and queued rows anywhere in the tree resettle to failed", () => {
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
  });
  it("a settled doc rides untouched", () => {
    const doc = { status: "completed", stages: [{ status: "completed" }] };
    const r = sweepSidecar(doc, "server.restart");
    assert.equal(doc["status"], "completed");
    assert.equal(r.touched, false);
    assert.equal(r.wasQueued, false);
  });
});
