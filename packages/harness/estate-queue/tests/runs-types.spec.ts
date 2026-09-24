// runs-types.spec.ts — the live-run record helpers: runRel,
// errText, the best-effort settle persist, the synthesized log
// tail. settlePersist writes a real tmp run dir (its two try/catch
// arms ride a file-as-dir and a file-as-stateRoot).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  runRel,
  errText,
  settlePersist,
  runLogTail,
} from "../src/runsTypes.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let dir = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "runstypes-"));
});

function record(over: Partial<RunRecord> = {}): RunRecord {
  return {
    runId: "r1",
    status: "completed",
    stages: [],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId: "d1",
    dir: join(dir, "r1"),
    testFlag: false,
    stopFlag: false,
    params: [],
    outputNodes: [],
    createdAt: 1700000000,
    pipeline: "p",
    graphRows: [],
    ...over,
  };
}

describe("runRel", () => {
  const run = record({ dir: "/runs/r1" });
  it("the dir itself voices its basename", () => {
    assert.equal(runRel(run, "/runs/r1"), "r1");
  });

  it("in-dir paths strip the prefix", () => {
    assert.equal(runRel(run, "/runs/r1/out/a.png"), "out/a.png");
  });

  it("foreign paths fall back to the basename", () => {
    assert.equal(runRel(run, "/elsewhere/b.png"), "b.png");
    assert.equal(runRel(run, "C:\\w\\c.png"), "c.png");
    assert.equal(runRel(run, "bare.png"), "bare.png");
  });

  it("empty and dot artifacts stay honest", () => {
    assert.equal(runRel(run, ""), "");
    assert.equal(runRel(run, "."), ".");
  });
});

describe("errText", () => {
  it("Errors voice <Type>: <msg>", () => {
    assert.equal(errText(new TypeError("nope")), "TypeError: nope");
  });

  it("nameless Errors degrade to Error", () => {
    const e = new Error("x");
    e.name = "";
    assert.equal(errText(e), "Error: x");
  });

  it("non-Errors voice Error: String(v)", () => {
    assert.equal(errText("boom"), "Error: boom");
    assert.equal(errText(42), "Error: 42");
    assert.equal(errText(undefined), "Error: undefined");
  });
});

describe("settlePersist", () => {
  it("rewrites the sidecar and appends the terminal ledger row", () => {
    const runDir = join(dir, "rset");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      status: "failed",
      error: "went wrong",
      stages: [
        {
          id: "s1",
          name: "first",
          index: 0,
          status: "failed",
          outputs: { image: "o.png" },
          expected: { image: "image" },
        },
      ],
      artifacts: ["out/a.png"],
      skippedStages: ["s2"],
    });
    settlePersist(run, dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["run_id"], "r1");
    assert.equal(sidecar["status"], "failed");
    assert.deepEqual(sidecar["skipped_stages"], ["s2"]);
    assert.deepEqual(sidecar["artifacts"], ["out/a.png"]);
    const ledger = readFileSync(join(dir, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"event":"run\.failed"/);
    assert.match(ledger, /"run_id":"r1"/);
  });

  it("a persist failure never unmakes the in-memory truth", () => {
    const fileAsDir = join(dir, "filedir");
    writeFileSync(fileAsDir, "x");
    const run = record({ dir: join(fileAsDir, "r") });
    settlePersist(run, fileAsDir);
    settlePersist(record(), join(dir, "nostate", "deep"));
  });

  it("THE TERMINAL ECHO (the audit's gap): the compose echo survives into the settled _flow.json", () => {
    const runDir = join(dir, "recho");
    mkdirSync(runDir, { recursive: true });
    const echo = { seam: "carry,cut", calls: 2, benchRev: 17 };
    settlePersist(record({ dir: runDir, composeEcho: echo }), dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(sidecar["compose_echo"], echo);
  });

  it("THE EXPORT-NAME STAMP (023's self-critique #4/#6): a stage voice_name rides the settled _flow.json + the record", () => {
    const runDir = join(dir, "rexp");
    mkdirSync(runDir, { recursive: true });
    const run = record({ dir: runDir, params: [{ voice_name: "night-keeper" } as never] });
    settlePersist(run, dir);
    assert.equal(run.exportName, "night-keeper");
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["export_name"], "night-keeper");
  });

  it("runs without a voice_name stamp nothing (no export_name key)", () => {
    const runDir = join(dir, "rnoexp");
    mkdirSync(runDir, { recursive: true });
    const run = record({ dir: runDir, params: [{ text: "hi" } as never] });
    settlePersist(run, dir);
    assert.equal(run.exportName, undefined);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("export_name" in sidecar));
  });
});

describe("runLogTail", () => {
  it("the empty object voices the unknown run", () => {
    assert.equal(runLogTail({}), "run: ?");
  });

  it("queued voices its position; errors append sliced", () => {
    assert.equal(
      runLogTail({ status: "queued", queue_position: 2 }),
      "run: queued (queue position 2)",
    );
    assert.equal(runLogTail({ status: "queued", queue_position: 0 }), "run: queued");
    assert.equal(runLogTail({ status: "queued", queue_position: "2" }), "run: queued");
    assert.equal(
      runLogTail({ status: "failed", error: "x".repeat(400) }).split(" — ")[1]?.length,
      300,
    );
  });

  it("stages voice name/status, progress, activity, error", () => {
    const tail = runLogTail({
      status: "running",
      stages: [
        "skip-me",
        null,
        ["skip-me-too"],
        { id: "s1" },
        {},
        { name: "n", status: "running", progress: { value: 3, max: 10 } },
        { name: "m", status: "running", progress: { value: 1 } },
        { name: "k", status: "running", progress: 5 },
        {
          name: "a",
          status: "running",
          activity: { phase: "load", message: "ckpt" },
        },
        {
          name: "b",
          status: "running",
          activity: { phase: "infer", node_class: "KSampler" },
        },
        { name: "c", status: "running", activity: { phase: "idle" } },
        {
          name: "d",
          status: "running",
          activity: { phase: "null", message: null, node_class: "KSampler" },
        },
        { name: "f", status: "running", activity: { message: "ph-six" } },
        { name: "e", status: "failed", error: "y".repeat(400) },
      ],
    });
    assert.ok(tail.includes("s1: ?"));
    assert.ok(tail.includes("stage: ?"));
    assert.ok(tail.includes("n: running — 3/10"));
    assert.ok(tail.includes("m: running"));
    assert.ok(!tail.includes("m: running —"));
    assert.ok(tail.includes("a: running [load: ckpt]"));
    assert.ok(tail.includes("b: running [infer: KSampler]"));
    assert.ok(tail.includes("c: running [idle]"));
    assert.ok(tail.includes("d: running [null: KSampler]"));
    assert.ok(tail.includes("f: running [: ph-six]"));
    assert.match(tail, /\n  error: y{300}$/m);
    assert.ok(!tail.includes("skip-me"));
  });

  it("all-invalid artifacts stay silent (the empty-names arm)", () => {
    assert.equal(
      runLogTail({ status: "completed", artifacts: [{}, ""] }),
      "run: completed",
    );
  });

  it("non-array stages and empty artifacts stay silent", () => {
    assert.equal(runLogTail({ status: "running", stages: {} }), "run: running");
    assert.equal(
      runLogTail({ status: "completed", artifacts: [] }),
      "run: completed",
    );
  });

  it("artifacts voice basenames (url/name/scalar), capped at six", () => {
    const arts = [
      { url: "/runs/r1/out/a.png" },
      { name: "b.png" },
      {},
      "c/d.png",
      7,
      "e.png",
      "f.png",
      "",
      "trailing/",
    ];
    const tail = runLogTail({ status: "completed", artifacts: arts });
    assert.equal(tail, "run: completed\nartifacts: a.png, b.png, d.png, 7, e.png");
  });
});
