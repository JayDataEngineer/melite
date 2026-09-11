// queue.spec.ts — the serial-GPU queue core: roots, the single-writer
// lock, the journal, refusals, the envelope chain, the registry, retry,
// the sidecar, sweeps, resurrection, and the py-compat value helpers.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BOOT_SWEEP_QUEUED_WHY,
  BOOT_SWEEP_WHY,
  MAX_SETTLED_RUNS,
  QueueCore,
  acquireLock,
  appendLedger,
  atomicWriteJson,
  bootGate,
  bootQueue,
  bootSweep,
  buildRebuiltRun,
  coerceCreatedAt,
  durableRecordUsable,
  dumpsLedgerData,
  graphRowsUsable,
  isPidAlive,
  ledgerPathFor,
  lockPathFor,
  newRunId,
  nodeRowUsable,
  noteStageRetry,
  outRootFor,
  pipelineOf,
  planResurrect,
  pyArtifactStrings,
  pyDictEntries,
  pyListItems,
  pyRepr,
  pyStr,
  pyTruthy,
  pyTupleItems,
  pyTypeName,
  refuseCompletedResume,
  refuseLiveReproduce,
  refuseLiveResume,
  refuseMissingRequest,
  refuseNoDurableRecord,
  refuseNonObjectRequest,
  refuseStartLine,
  refuseTerminalStop,
  refuseUnknownStop,
  refuseUnresumable,
  refuseUnusableRecord,
  refuseCardlessReplay,
  refusal,
  releaseLock,
  resolveStateRoot,
  resurrectRuns,
  shouldRetry,
  sidecarDoc,
  strictBodyCheck,
  sweepSidecar,
  terminalFrame,
  validateSubmitEnvelope,
  writeRegistration,
} from "../src/queue.ts";
import type { QueueRunRow } from "../src/queue.ts";

let TMP = "";
afterEach(() => {
  delete process.env.MELITE_STATE_ROOT;
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "queue-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const row = (over: Partial<QueueRunRow> = {}): QueueRunRow => ({
  runId: "run-x",
  status: "queued",
  error: "",
  createdAt: 1,
  draftId: "d1",
  testFlag: false,
  stopFlag: false,
  ...over,
});

describe("roots + constants", () => {
  it("resolves roots (env wins) and pins the refusal line", () => {
    assert.equal(resolveStateRoot("/repo"), join("/repo", "data", "runs"));
    process.env.MELITE_STATE_ROOT = "/st";
    assert.equal(resolveStateRoot("/repo"), "/st");
    assert.equal(outRootFor("/st", true), join("/st", "test-output"));
    assert.equal(outRootFor("/st", false), join("/st", "output"));
    assert.equal(ledgerPathFor("/st"), join("/st", "output", "_ledger.jsonl"));
    assert.equal(lockPathFor("/st"), join("/st", "gateway.lock"));
    assert.match(refuseStartLine("x"), /REFUSING TO START.*one writer per state root/);
    assert.equal(MAX_SETTLED_RUNS, 500);
  });
});

describe("isPidAlive", () => {
  it("reads the signal-0 probe (self alive, the void dead, init EPERM-alive)", () => {
    assert.equal(isPidAlive(process.pid), true);
    assert.equal(isPidAlive(2 ** 30), false);
    assert.equal(isPidAlive(1), true);
  });
});

describe("lock", () => {
  it("acquires, refuses the live holder, releases only its own", () => {
    const root = tmp();
    assert.deepEqual(acquireLock(root), { ok: true, note: "acquired" });
    const again = acquireLock(root);
    assert.equal(again.ok, false);
    assert.match(again.note, /held by live pid/);
    assert.equal(releaseLock(root, process.pid + 1), false);
    assert.equal(releaseLock(root), true);
    assert.equal(releaseLock(root), false);
    assert.deepEqual(bootGate(root), { ok: true, note: "acquired" });
  });

  it("steals from the dead (garbage or gone pids ledger the theft)", () => {
    const root = tmp();
    writeFileSync(join(root, "gateway.lock"), "notapid\n");
    const stolen = acquireLock(root, process.pid, 7);
    assert.equal(stolen.ok, true);
    assert.match(stolen.note, /stolen from dead pid -1/);
    const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /server\.lock_stolen/);
    releaseLock(root);
    writeFileSync(join(root, "gateway.lock"), String(2 ** 30));
    assert.match(acquireLock(root).note, /stolen from dead pid/);
  });

  it("a directory at the lock path fails the steal (never a live unlink)", () => {
    const root = tmp();
    mkdirSync(join(root, "gateway.lock"));
    const res = acquireLock(root);
    assert.equal(res.ok, false);
    assert.match(res.note, /lock steal failed/);
  });

  it("a locked parent dir fails the release unlink (never a silent drop)", () => {
    const root = tmp();
    assert.deepEqual(acquireLock(root), { ok: true, note: "acquired" });
    chmodSync(root, 0o555);
    try {
      assert.equal(releaseLock(root), false);
    } finally {
      chmodSync(root, 0o755);
    }
    assert.equal(releaseLock(root), true);
  });
});

describe("journal", () => {
  it("dumps canonical JSON and appends line-delimited rows", () => {
    const root = tmp();
    assert.equal(dumpsLedgerData({ a: "é" }), '{"a":"\\u00e9"}');
    appendLedger(root, "ev", { n: 1 }, 9);
    appendLedger(root, "ev2", null, 10);
    const lines = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]!), { ts: 9, event: "ev", data: { n: 1 } });
    // the journal never throws (a file at the root swallows everything).
    const fileRoot = join(tmp(), "f");
    writeFileSync(fileRoot, "x");
    appendLedger(fileRoot, "ev", {}, 1);
  });

  it("writes atomically (no tmp litter)", () => {
    const root = tmp();
    const f = join(root, "w.json");
    atomicWriteJson(f, { a: [1] });
    assert.deepEqual(JSON.parse(readFileSync(f, "utf8")), { a: [1] });
    atomicWriteJson(join(root, "u.json"), undefined);
    assert.equal(readFileSync(join(root, "u.json"), "utf8"), "null");
  });
});

describe("refusals", () => {
  it("shapes the envelope (optionals ride only when stated)", () => {
    assert.deepEqual(refusal(400, "e", "c"), {
      status: 400,
      payload: { error: "e", code: "c" },
    });
    assert.deepEqual(refusal(400, "e", "c", "l", "ex", "g").payload, {
      error: "e",
      code: "c",
      loc: "l",
      expected: "ex",
      got: "g",
    });
    assert.equal(refuseTerminalStop("completed").status, 200);
    assert.equal(refuseUnknownStop("r").payload["code"], "run_unknown");
    assert.equal(refuseLiveResume("r", "running").payload["code"], "run_live");
    assert.equal(refuseNoDurableRecord("r").payload["code"], "run_unknown");
    assert.equal(refuseCompletedResume("r").payload["code"], "run_completed");
    assert.equal(refuseUnresumable("r", "").payload["got"], "unknown");
    assert.equal(refuseUnresumable("r", "queued").payload["got"], "queued");
    assert.equal(refuseUnusableRecord("r").payload["code"], "run_record_unusable");
    assert.equal(refuseLiveReproduce("r", "running").payload["code"], "run_live");
    assert.equal(refuseCardlessReplay("r").payload["code"], "run_cardless");
    assert.equal(refuseMissingRequest("r").payload["code"], "run_record_unusable");
    assert.equal(refuseNonObjectRequest("r", "list").payload["got"], "list");
  });

  it("names py types and reprs scalars", () => {
    assert.deepEqual(
      [null, "a", true, 1, 1.5, [], {}, undefined, () => {}].map(pyTypeName),
      ["NoneType", "str", "bool", "int", "float", "list", "dict", "unknown", "unknown"],
    );
    assert.equal(pyRepr("a"), "'a'");
    assert.equal(pyRepr(true), "true");
    assert.equal(pyRepr(false), "false");
    assert.equal(pyRepr(null), "null");
    assert.equal(pyRepr(undefined), "null");
    assert.equal(pyRepr(5), "5");
    assert.equal(pyRepr({}), "[object Object]");
  });
});

describe("envelope", () => {
  const yes = (): boolean => true;
  it("walks the chain in py order", () => {
    assert.equal(validateSubmitEnvelope([1], yes)!.payload["code"], "bad_envelope");
    assert.equal(validateSubmitEnvelope(null, yes)!.payload["code"], "bad_envelope");
    assert.equal(validateSubmitEnvelope("s", yes)!.payload["code"], "bad_envelope");
    assert.equal(
      validateSubmitEnvelope({ test: "yes" }, yes)!.payload["loc"],
      "test",
    );
    assert.equal(
      validateSubmitEnvelope({}, yes)!.payload["code"],
      "draft_required",
    );
    assert.equal(
      validateSubmitEnvelope({ draft_id: "bad id!" }, yes)!.payload["code"],
      "draft_malformed",
    );
    assert.equal(
      validateSubmitEnvelope({ draft_id: "ghost" }, () => false)!.payload["code"],
      "draft_unknown",
    );
    const base = { draft_id: "d1", flow: "f" };
    assert.equal(validateSubmitEnvelope({ ...base, start_from: 1 }, yes)!.payload["code"], "invalid_request");
    assert.equal(validateSubmitEnvelope({ ...base, pipe: 1 }, yes)!.payload["code"], "invalid_request");
    assert.match(
      validateSubmitEnvelope({ draft_id: "d1", flow: "a", model: "b" }, yes)!.payload["error"] as string,
      /ambiguous/,
    );
    assert.equal(
      validateSubmitEnvelope({ draft_id: "d1" }, yes)!.payload["code"],
      "invalid_request",
    );
    assert.equal(validateSubmitEnvelope(base, yes), null);
    assert.equal(validateSubmitEnvelope({ draft_id: "d1", model: "m", zzz: 1 }, yes), null);
  });

  it("strictBodyCheck sorts the retired knobs", () => {
    assert.equal(strictBodyCheck({ flow: "f" }), null);
    const hit = strictBodyCheck({ stop_after: 1, start_from: 2 })!;
    assert.match(hit.payload["error"] as string, /'start_from', 'stop_after'/);
    assert.equal(strictBodyCheck({ _zzz: 1 })!.payload["code"], "invalid_request");
  });
});

describe("QueueCore", () => {
  it("enqueues FIFO, claims once, settles three ways", () => {
    const q = new QueueCore();
    assert.equal(q.enqueue(row({ runId: "a" })), 0);
    assert.equal(q.enqueue(row({ runId: "b" })), 1);
    assert.equal(q.queuePosition("b"), 1);
    assert.equal(q.queuePosition("ghost"), 0);
    const first = q.tryDequeue()!;
    assert.equal(first.runId, "a");
    assert.equal(first.status, "running");
    assert.equal(q.tryDequeue(), null);
    assert.deepEqual(q.snapshot(), { queued: 1, running: 1, active: "a", queued_ids: ["b"] });
    q.releaseActive();
    assert.equal(q.snapshot().running, 0);
    assert.equal(q.settleRun(first, null), "completed");
    assert.equal(q.settleRun(row({ stopFlag: true }), "boom"), "stopped");
    const bad = row();
    assert.equal(q.settleRun(bad, "Type: msg"), "failed");
    assert.equal(bad.error, "Type: msg");
  });

  it("tryDequeue skips missing rows; eviction keeps stops and caps 500", () => {
    const q = new QueueCore();
    q.order.push("ghost");
    assert.equal(q.tryDequeue(), null);
    for (let i = 0; i < 502; i++) {
      q.enqueue(row({ runId: "s" + i, status: i % 2 === 0 ? "completed" : "failed", createdAt: i }));
    }
    q.enqueue(row({ runId: "stop", status: "stopped", createdAt: -1 }));
    const small = new QueueCore();
    small.enqueue(row({ runId: "only", status: "completed" }));
    assert.deepEqual(small.evictSettled(), []);
    const evicted = q.evictSettled();
    assert.equal(evicted.length, 2);
    // equal timestamps fall to the id tiebreak (both directions sort).
    const tied = new QueueCore();
    const ids: string[] = [];
    for (let i = 0; i < 501; i++) ids.push("t" + String(i).padStart(3, "0"));
    for (let i = 0; i < 501; i++) {
      const id = ids[(i * 37) % 501]!;
      tied.enqueue(row({ runId: id, status: "completed", createdAt: 9 }));
    }
    assert.deepEqual(tied.evictSettled(), ["t000"]);
    assert.deepEqual(evicted, ["s0", "s1"]);
    assert.ok(q.runs.has("stop"));
  });
});

describe("retry + frames", () => {
  it("retries while attempts remain and no stop landed", () => {
    assert.equal(shouldRetry({ attempt: 0, maxExtra: 5, stopSet: false }), true);
    assert.equal(shouldRetry({ attempt: 5, maxExtra: 5, stopSet: false }), false);
    assert.equal(shouldRetry({ attempt: 0, maxExtra: 5, stopSet: true }), false);
    const note = noteStageRetry("r", "s", 2, 1, "boom");
    assert.deepEqual(note.stagePatch, { retries_used: 1, retry_last_error: "boom" });
    assert.equal(note.ledgerEvent, "run.stage_retry");
    assert.deepEqual(note.busFrame, { type: "stage", stage: "s", index: 2, retry: 1 });
    assert.match(newRunId(), /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
    assert.deepEqual(terminalFrame("completed"), { type: "run", status: "completed" });
  });
});

describe("sidecar", () => {
  it("renders key order with the error quirk (quoted, capped)", () => {
    const doc = sidecarDoc({
      runId: "r",
      status: "failed",
      error: "boom",
      stages: [],
      skippedStages: ["s"],
      artifacts: ["a"],
      createdAt: 3,
      testFlag: true,
      draftId: "d",
      pipeline: "model",
      graph: [],
    });
    assert.deepEqual(Object.keys(doc), [
      "run_id",
      "status",
      "error",
      "stages",
      "skipped_stages",
      "artifacts",
      "created_at",
      "test",
      "draft_id",
      "pipeline",
      "graph",
    ]);
    assert.equal(doc["error"], '"boom"');
    assert.equal(sidecarDoc({ runId: "r", status: "ok", error: "", stages: [], skippedStages: [], artifacts: [], createdAt: 0, testFlag: false, draftId: "", pipeline: "", graph: [] })["error"], "");
    const long = sidecarDoc({
      runId: "r", status: "failed", error: "x".repeat(30000), stages: [],
      skippedStages: [], artifacts: [], createdAt: 0, testFlag: false,
      draftId: "", pipeline: "", graph: [],
    })["error"] as string;
    assert.ok(long.length <= 20000 && long.startsWith('"'));
  });

  it("names the door pipeline", () => {
    assert.equal(pipelineOf({ flow: "f" }), "f");
    assert.equal(pipelineOf({ flow: "", model: "m" }), "m");
    assert.equal(pipelineOf({ flow_inline: { id: "i" } }), "i");
    assert.equal(pipelineOf({ flow_inline: { id: 5 } }), "");
    assert.equal(pipelineOf({}), "");
  });

  it("registers the write pair", () => {
    const root = tmp();
    const dir = writeRegistration(root, "run-w", false, { a: 1 }, { g: 1 });
    assert.deepEqual(JSON.parse(readFileSync(join(dir, "_request.json"), "utf8")), { a: 1 });
    assert.deepEqual(JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")), { g: 1 });
  });
});

describe("sweepSidecar", () => {
  it("fails active statuses at every depth (queued rides its own why)", () => {
    const doc = { status: "queued", stages: [{ status: "running" }] };
    const res = sweepSidecar(doc, "why", "qwhy");
    assert.equal(res.touched, true);
    assert.equal(res.wasQueued, true);
    assert.equal(doc["status"], "failed");
    assert.equal(doc["error"], "qwhy");
    assert.equal(doc["sweep"], "qwhy");
    const res2 = sweepSidecar(doc, "why", "qwhy");
    assert.equal(res2.touched, false);
    const run = sweepSidecar({ status: "running" }, "why");
    assert.equal((run.doc as Record<string, unknown>)["sweep"], "why");
    assert.ok(!("error" in run.doc));
    const settled = sweepSidecar({ status: "completed" }, "why");
    assert.equal(settled.touched, false);
  });
});

describe("bootSweep", () => {
  it("sweeps zombies, shields the live, ledgers the unreadable (sorted)", () => {
    const root = tmp();
    assert.deepEqual(bootSweep(root), []);
    const out = join(root, "output");
    mkdirSync(join(out, "run-b"), { recursive: true });
    writeFileSync(join(out, "run-b", "_flow.json"), JSON.stringify({ status: "running" }));
    mkdirSync(join(out, "run-a"), { recursive: true });
    writeFileSync(join(out, "run-a", "_flow.json"), JSON.stringify({ status: "queued" }));
    mkdirSync(join(out, "run-live"), { recursive: true });
    writeFileSync(join(out, "run-live", "_flow.json"), JSON.stringify({ status: "queued" }));
    mkdirSync(join(out, "run-done"), { recursive: true });
    writeFileSync(join(out, "run-done", "_flow.json"), JSON.stringify({ status: "completed" }));
    mkdirSync(join(out, "run-bad"), { recursive: true });
    writeFileSync(join(out, "run-bad", "_flow.json"), "{nope");
    mkdirSync(join(out, "run-str"), { recursive: true });
    writeFileSync(join(out, "run-str", "_flow.json"), "5");
    mkdirSync(join(out, "run-nofile"), { recursive: true });
    mkdirSync(join(out, "notes"), { recursive: true });
    const swept = bootSweep(root, ["run-live"], 11);
    assert.deepEqual(swept, ["run-a", "run-b"]);
    assert.equal(JSON.parse(readFileSync(join(out, "run-a", "_flow.json"), "utf8"))["error"], BOOT_SWEEP_QUEUED_WHY);
    assert.equal(JSON.parse(readFileSync(join(out, "run-b", "_flow.json"), "utf8"))["sweep"], BOOT_SWEEP_WHY);
    const ledger = readFileSync(join(out, "_ledger.jsonl"), "utf8");
    assert.match(ledger, /queued_lost/);
    assert.match(ledger, /unreadable/);
  });
});

describe("py value helpers", () => {
  it("tuples ride element-wise (null is the raise road)", () => {
    assert.deepEqual(pyTupleItems([1]), [1]);
    assert.deepEqual(pyTupleItems("ab"), ["a", "b"]);
    assert.deepEqual(pyTupleItems({ x: 1 }), ["x"]);
    assert.deepEqual(pyTupleItems(null), []);
    assert.deepEqual(pyTupleItems(0), []);
    assert.equal(pyTupleItems(5), null);
    assert.equal(pyTupleItems(true), null);
  });

  it("dicts ride entries (pair-lists validated, the rest refused)", () => {
    assert.deepEqual(pyDictEntries({ a: 1 }), [["a", 1]]);
    assert.deepEqual(pyDictEntries([["a", 1], "bc"]), [["a", 1], ["b", "c"]]);
    assert.deepEqual(pyDictEntries(null), []);
    assert.equal(pyDictEntries([["a", 1, 2]]), null);
    assert.equal(pyDictEntries([[1, 2]]), null);
    assert.equal(pyDictEntries(5), null);
  });

  it("rows gate ids, refs, maps and dupes", () => {
    const seen = new Set<string>();
    const good = {
      id: "n",
      type: "t",
      input_from: ["a"],
      input_names: { x: "s" },
      outputs: {},
      params: { any: 1 },
      extra: true,
    };
    assert.equal(nodeRowUsable(good, seen), true);
    assert.equal(nodeRowUsable(good, seen), false);
    assert.equal(nodeRowUsable(null, new Set()), false);
    assert.equal(nodeRowUsable([], new Set()), false);
    assert.equal(nodeRowUsable({ id: "", type: "t" }, new Set()), false);
    assert.equal(nodeRowUsable({ id: "i", type: "" }, new Set()), false);
    assert.equal(nodeRowUsable({ id: "i", type: "t", input_from: 5 }, new Set()), false);
    assert.equal(
      nodeRowUsable({ id: "i", type: "t", input_from: [" "] }, new Set()),
      false,
    );
    assert.equal(
      nodeRowUsable({ id: "i", type: "t", input_names: 5 }, new Set()),
      false,
    );
    assert.equal(
      nodeRowUsable({ id: "i", type: "t", input_names: { x: 1 } }, new Set()),
      false,
    );
    assert.equal(
      nodeRowUsable({ id: "i", type: "t", params: 5 }, new Set()),
      false,
    );
    assert.equal(graphRowsUsable(null), true);
    assert.equal(graphRowsUsable("s"), false);
    assert.equal(graphRowsUsable([good]), true);
    assert.equal(graphRowsUsable([{ id: "x" }]), false);
    assert.equal(graphRowsUsable([{ ...good, id: "z" }]), true);
  });

  it("lists split, truthiness filters, strings render py", () => {
    assert.deepEqual(pyListItems("ab"), ["a", "b"]);
    assert.deepEqual(pyListItems({ x: 1 }), ["x"]);
    assert.deepEqual(pyListItems(null), []);
    assert.throws(() => pyListItems(5), /unlistable/);
    assert.equal(pyTruthy(0), false);
    assert.equal(pyTruthy([]), false);
    assert.equal(pyTruthy({}), false);
    assert.equal(pyTruthy([0]), true);
    assert.equal(pyTruthy(NaN), true);
    assert.equal(pyStr("a"), "a");
    assert.equal(pyStr("a'b", true), "'a\\'b'");
    assert.equal(pyStr(true), "True");
    assert.equal(pyStr(false), "False");
    assert.equal(pyStr(1e100), "1e+100");
    assert.equal(pyStr(1e-7), "1e-7");
    assert.match(pyStr(() => {}), /=>/);
    assert.equal(pyStr(null), "None");
    assert.equal(pyStr(undefined), "None");
    assert.equal(pyStr(NaN), "nan");
    assert.equal(pyStr(Infinity), "inf");
    assert.equal(pyStr(-Infinity), "-inf");
    assert.equal(pyStr(5), "5");
    assert.equal(pyStr(5.5), "5.5");
    assert.equal(pyStr([1, "a"]), "[1, 'a']");
    assert.equal(pyStr({ k: "v" }), "{'k': 'v'}");
    assert.equal(pyStr("a\\b\nc\rd\te\x01f\x7fgé𝄞", true), "'a\\\\b\\nc\\rd\\te\\x01f\\x7fg\\u00e9\\ud834\\udd1e'");
    assert.deepEqual(pyArtifactStrings(["a", "", 0, false, null]), ["a"]);
    assert.deepEqual(pyArtifactStrings({ a: "x", b: "" }), ["a", "b"]);
  });

  it("created_at coerces without raising (garbage rides 0)", () => {
    assert.equal(coerceCreatedAt(5), 5);
    assert.equal(coerceCreatedAt(Infinity), 0);
    assert.equal(coerceCreatedAt(true), 1);
    assert.equal(coerceCreatedAt(false), 0);
    assert.equal(coerceCreatedAt(" 12 "), 12);
    assert.equal(coerceCreatedAt(""), 0);
    assert.equal(coerceCreatedAt("inf"), Infinity);
    assert.equal(coerceCreatedAt("-inf"), -Infinity);
    assert.equal(coerceCreatedAt("nan"), 0);
    assert.equal(coerceCreatedAt("0x1"), 0);
    assert.equal(coerceCreatedAt("1e3"), 1000);
    assert.equal(coerceCreatedAt([1]), 0);
    assert.equal(coerceCreatedAt(null), 0);
  });
});

describe("durable + resurrect", () => {
  const sidecar = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({
      draft_id: "d1",
      graph: [],
      stages: [],
      skipped_stages: [],
      artifacts: [],
      ...over,
    });
  it("gates the durable record (parse, birth, graph, lists)", () => {
    assert.equal(durableRecordUsable("{nope", "{}", true), false);
    assert.equal(durableRecordUsable("5", "{}", true), false);
    assert.equal(durableRecordUsable(sidecar({ draft_id: "" }), "{}", true), false);
    assert.equal(durableRecordUsable(sidecar(), "{}", false), false);
    assert.equal(durableRecordUsable(sidecar(), "{nope", true), false);
    assert.equal(durableRecordUsable(sidecar({ graph: "s" }), "{}", true), false);
    assert.equal(durableRecordUsable(sidecar({ stages: 5 }), "{}", true), false);
    assert.equal(durableRecordUsable(sidecar(), "{}", true), true);
  });

  it("plans FIFO by created_at (orphans ride the reconcile road)", () => {
    const root = tmp();
    const out = join(root, "output");
    const put = (name: string, flow: string | null, req: string | null): void => {
      mkdirSync(join(out, name), { recursive: true });
      if (flow !== null) writeFileSync(join(out, name, "_flow.json"), flow);
      if (req !== null) writeFileSync(join(out, name, "_request.json"), req);
    };
    put("run-b", JSON.stringify({ status: "queued", draft_id: "d", created_at: 2, graph: [], stages: [], skipped_stages: [], artifacts: [] }), "{}");
    put("run-a", JSON.stringify({ status: "queued", draft_id: "d", created_at: 1, graph: [], stages: [], skipped_stages: [], artifacts: [] }), "{}");
    put("run-run", JSON.stringify({ status: "running", draft_id: "d" }), "{}");
    put("run-half", "{nope", "{}");
    put("run-str", "5", "{}");
    put("run-noreq", JSON.stringify({ status: "queued", draft_id: "d" }), null);
    put("run-nodoc", JSON.stringify({ status: "queued", draft_id: "ghost" }), "{}");
    put("run-baddraft", JSON.stringify({ status: "queued", draft_id: 5 }), "{}");
    put("notes", null, null);
    mkdirSync(join(out, "run-empty"), { recursive: true });
    const plan = planResurrect(root, undefined, undefined, (id: string): boolean => id !== "ghost");
    assert.deepEqual(plan.order, ["run-a", "run-b"]);
    assert.deepEqual(plan.orphans.sort(), ["run-baddraft", "run-half", "run-nodoc", "run-noreq", "run-str"]);
    assert.deepEqual(planResurrect(join(root, "missing")), { order: [], orphans: [] });
    // unreadable sidecars ride the default reader (null skips silently).
    assert.deepEqual(
      planResurrect(root, () => null, undefined, () => true).order,
      [],
    );
    // the LOUD default probe fires on queued records with requests.
    assert.throws(() => planResurrect(root), /draftExists probe/);
  });

  it("rebuilds rows (draft falls back to empty) and revives the queue", () => {
    const root = tmp();
    const out = join(root, "output");
    mkdirSync(join(out, "run-a"), { recursive: true });
    writeFileSync(
      join(out, "run-a", "_flow.json"),
      JSON.stringify({ draft_id: "d", stages: "ab", skipped_stages: [], artifacts: ["x", ""] }),
    );
    writeFileSync(join(out, "run-a", "_request.json"), "{}");
    const rebuilt = buildRebuiltRun(root, "run-a");
    assert.deepEqual(rebuilt.stages, ["a", "b"]);
    assert.deepEqual(rebuilt.artifacts, ["x"]);
    mkdirSync(join(out, "run-b"), { recursive: true });
    writeFileSync(join(out, "run-b", "_flow.json"), JSON.stringify({ stages: [] }));
    assert.equal(buildRebuiltRun(root, "run-b").draftId, "");
    const seen: string[] = [];
    const revived = resurrectRuns(root, (r) => void seen.push(r.runId), () => false, 3);
    assert.deepEqual(revived, []);
    assert.deepEqual(seen, []);
  });

  it("boots whole (resurrect, sweep, ledger) and never throws poisoned", () => {
    const root = tmp();
    const out = join(root, "output");
    mkdirSync(join(out, "run-a"), { recursive: true });
    const doc = { status: "queued", draft_id: "d", created_at: 1, graph: [], stages: [], skipped_stages: [], artifacts: [] };
    writeFileSync(join(out, "run-a", "_flow.json"), JSON.stringify(doc));
    writeFileSync(join(out, "run-a", "_request.json"), "{}");
    mkdirSync(join(out, "run-z"), { recursive: true });
    writeFileSync(join(out, "run-z", "_flow.json"), JSON.stringify({ status: "running" }));
    const seen: string[] = [];
    const res = bootQueue(
      { stateRoot: root, runsRoot: join(root, "output"), ledgerPath: join(root, "output", "_ledger.jsonl") },
      (r) => void seen.push(r.runId),
      8080,
      "comfyui",
      5,
      () => true,
    );
    assert.deepEqual(res, { resurrected: 1, swept: 1, live: ["run-a"] });
    assert.deepEqual(seen, ["run-a"]);
    const poison = join(tmp(), "file");
    writeFileSync(poison, "x");
    assert.deepEqual(
      bootQueue({ stateRoot: poison, runsRoot: poison, ledgerPath: poison }, () => {}, 1, "e", 1, () => true),
      { resurrected: 0, swept: 0, live: [] },
    );
    // without the caller's probe the LOUD default fires on queued records.
    assert.throws(
      () =>
        bootQueue(
          { stateRoot: root, runsRoot: join(root, "output"), ledgerPath: join(root, "output", "_ledger.jsonl") },
          () => {},
          8080,
          "comfyui",
        ),
      /draftExists probe/,
    );
  });
});
