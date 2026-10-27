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
  claimPersist,
  runLogTail,
} from "../src/runsTypes.ts";
import { variantOfBodies } from "../src/queue.ts";
import { sidecarStageOf } from "../src/queueSidecar.ts";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

let dir = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "runstypes-"));
});

function record(over: Partial<RunRecord> = {}): RunRecord {
  return {
    // The fixture brands at its construction door (arbitrary label).
    runId: "r1" as RunId,
    status: "completed",
    stages: [],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId: draftIdOf("d1"),
    dir: join(dir, "r1"),
    testFlag: false,
    stopFlag: false,
    params: [],
    outputNodes: [],
    initials: {},
    createdAt: 1700000000,
    pipeline: "p",
    graphRows: [],
    ...over,
  };
}

describe("sidecarStageOf", () => {
  it("defaults core maps and filters presentation rows", () => {
    assert.deepEqual(sidecarStageOf({ id: "s", name: "n", index: 0, status: "queued" }), {
      id: "s",
      name: "n",
      index: 0,
      status: "queued",
      outputs: {},
      expected: {},
    })
    assert.deepEqual(sidecarStageOf({
      id: "s",
      name: "n",
      index: 0,
      status: "completed",
      engine: "comfyui",
      url: "out.mp4",
      gallery: [{ name: "film.mp4" }, null, [], { name: "" }, { name: 4 }, { name: "audio.flac" }],
      result_outputs: { prompt_id: "p" },
      error: "none",
      merged: true,
      outputs: { default: "video" },
      expected: { default: "video" },
    }), {
      id: "s",
      name: "n",
      index: 0,
      status: "completed",
      engine: "comfyui",
      url: "out.mp4",
      gallery: [{ name: "film.mp4" }, { name: "audio.flac" }],
      result_outputs: { prompt_id: "p" },
      error: "none",
      merged: true,
      outputs: { default: "video" },
      expected: { default: "video" },
    })
    const empty = sidecarStageOf({
      id: "s",
      name: "n",
      index: 0,
      status: "failed",
      engine: 4,
      url: "",
      gallery: [],
      result_outputs: [],
      error: 4,
      merged: false,
    } as never)
    assert.equal("engine" in empty, false)
    assert.equal("gallery" in empty, false)
    assert.equal("result_outputs" in empty, false)
    assert.equal("error" in empty, false)
    assert.equal("merged" in empty, false)
  })
});

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

  it("non-Errors voice Error: String(v)", async () => {
    assert.equal(errText("boom"), "Error: boom");
    assert.equal(errText(42), "Error: 42");
    assert.equal(errText(undefined), "Error: undefined");
  });
});

describe("claimPersist", () => {
  // THE CLAIM PERSIST (the commission wedge landing, 2026-10-03):
  // registration writes 'queued', settle writes terminal — a process
  // death between claim and settle left the sidecar 'queued' forever,
  // so the next boot replayed a run that had already claimed (and a
  // wedged claim was indistinguishable on disk from never-claimed).
  // The claim write puts 'running' on disk the moment the pump
  // claims; the boot sweep owns retiring it.
  it("writes the row's running faces at claim time (claimed-on-disk ≠ never-claimed)", async () => {
    const runDir = join(dir, "claim1");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      status: "running",
      stages: [{ id: "s", name: "s", index: 0, status: "queued", outputs: {}, expected: {} }],
    });
    await claimPersist(run);
    const doc = JSON.parse(
      readFileSync(join(runDir, "_flow.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(doc["status"], "running");
    assert.equal(doc["run_id"], "r1");
    assert.equal(
      (doc["stages"] as Array<Record<string, unknown>>)[0]!["status"],
      "queued",
    );
  });

  it("self-swallows a fault (a file-as-dir never blocks the claim — the settlePersist law)", async () => {
    const fileAsDir = join(dir, "claim-filedir");
    writeFileSync(fileAsDir, "x");
    await claimPersist(record({ dir: join(fileAsDir, "r"), status: "running" }));
  });
});

describe("settlePersist", () => {
  it("rewrites the sidecar and appends the terminal ledger row", async () => {
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
    await settlePersist(run, dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["run_id"], "r1");
    assert.equal(sidecar["status"], "failed");
    assert.deepEqual(sidecar["skipped_stages"], ["s2"]);
    assert.deepEqual(sidecar["artifacts"], ["out/a.png"]);
    const ledger = readFileSync(join(dir, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"event":"run\.failed"/);
    assert.match(ledger, /"run_id":"r1"/);
  });

  it("preserves terminal stage presentation metadata in the sidecar", async () => {
    const runDir = join(dir, "rstagemeta");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      stages: [{
        id: "s1",
        name: "first",
        index: 0,
        status: "completed",
        engine: "comfyui",
        outputs: { default: "video" },
        expected: {},
        url: "h3-film/h3_t4_film_00001_.mp4",
        gallery: [{ name: "h3-film/h3_t4_film_00001_.mp4" }, { name: "h3-film/h3_t4_film_audio_00001.flac" }],
        result_outputs: { default: "/run/h3-film/h3_t4_film_00001_.mp4" },
        merged: true,
      } as never],
    });
    await settlePersist(run, dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as { stages: Array<Record<string, unknown>> };
    assert.deepEqual(sidecar.stages[0], {
      id: "s1",
      name: "first",
      index: 0,
      status: "completed",
      engine: "comfyui",
      url: "h3-film/h3_t4_film_00001_.mp4",
      gallery: [{ name: "h3-film/h3_t4_film_00001_.mp4" }, { name: "h3-film/h3_t4_film_audio_00001.flac" }],
      result_outputs: { default: "/run/h3-film/h3_t4_film_00001_.mp4" },
      merged: true,
      outputs: { default: "video" },
      expected: {},
    });
  });

  it("a persist failure never unmakes the in-memory truth", async () => {
    const fileAsDir = join(dir, "filedir");
    writeFileSync(fileAsDir, "x");
    const run = record({ dir: join(fileAsDir, "r") });
    await settlePersist(run, fileAsDir);
    await settlePersist(record(), join(dir, "nostate", "deep"));
  });

  it("THE TERMINAL ECHO (the audit's gap): the compose echo survives into the settled _flow.json", async () => {
    const runDir = join(dir, "recho");
    mkdirSync(runDir, { recursive: true });
    const echo = { seam: "carry,cut", calls: 2, benchRev: 17 };
    await settlePersist(record({ dir: runDir, composeEcho: echo }), dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(sidecar["compose_echo"], echo);
  });

  it("THE EXPORT-NAME STAMP (023's self-critique #4/#6): a stage voice_name rides the settled _flow.json + the record", async () => {
    const runDir = join(dir, "rexp");
    mkdirSync(runDir, { recursive: true });
    const run = record({ dir: runDir, params: [{ voice_name: "night-keeper" } as never] });
    await settlePersist(run, dir);
    assert.equal(run.exportName, "night-keeper");
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["export_name"], "night-keeper");
  });

  it("runs without a voice_name stamp nothing (no export_name key)", async () => {
    const runDir = join(dir, "rnoexp");
    mkdirSync(runDir, { recursive: true });
    const run = record({ dir: runDir, params: [{ text: "hi" } as never] });
    await settlePersist(run, dir);
    assert.equal(run.exportName, undefined);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("export_name" in sidecar));
  });

  it("THE SNAPSHOT FALLBACK (024's post-mortem): compiled stage params may consume card keys — the card snapshot still names the mint", async () => {
    const runDir = join(dir, "rsnap");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      params: [{ workflow: {} } as never],
      cardSnapshot: { card: "qwen3-tts", params: { voice_name: "night-keeper", text: "hi" } },
    });
    await settlePersist(run, dir);
    assert.equal(run.exportName, "night-keeper");
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["export_name"], "night-keeper");
  });

  it("THE EXPORT-PATH STAMP (the export FULL PATH, roadmap OWED 2026-09-24): the engine-reported mint rides the record + sidecar verbatim", async () => {
    const runDir = join(dir, "rpath");
    mkdirSync(runDir, { recursive: true });
    const mint = "/mnt/data/models/audio/voices/night-keeper_17.qvoice";
    const run = record({
      dir: runDir,
      params: [{ voice_name: "night-keeper" } as never],
      stages: [{
        id: "tts",
        name: "tts",
        index: 0,
        status: "completed",
        outputs: {},
        expected: {},
        result_outputs: { prompt_id: "p1", qvoice_path: mint },
      } as never],
    });
    await settlePersist(run, dir);
    assert.equal(run.exportPath, mint);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["export_path"], mint);
    assert.equal(sidecar["export_name"], "night-keeper");
  });

  it("THE LOUDNESS + FRESHNESS STAMPS (2026-09-26 — the compact-row chip's data): the meter reading and the voice-mint receipt lift off the stage result_outputs onto the record + sidecar", async () => {
    const runDir = join(dir, "rloudfresh");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      stages: [{
        id: "h3-film",
        name: "h3-film",
        index: 0,
        status: "completed",
        outputs: { default: "video" },
        expected: {},
        result_outputs: {
          default: "/run/h3-film/h3_t4_film_00034_.mp4",
          loudness: { loudness_lufs: -24.72274663827507, peak_db: -6.366579627483562 },
        },
      } as never,
      {
        id: "tts",
        name: "tts",
        index: 1,
        status: "completed",
        outputs: { voices: "voice" },
        expected: {},
        result_outputs: {
          qvoice_path: "/voices/tide_2.qvoice",
          voice_freshness: { reused_existing: false, voice_file: "tide_2.qvoice" },
        },
      } as never],
    });
    await settlePersist(run, dir);
    // the meter's pair lifts whole (no re-derivation, no rounding here)
    assert.deepEqual(run.loudness, { loudness_lufs: -24.72274663827507, peak_db: -6.366579627483562 });
    assert.deepEqual(run.voiceFreshness, { reused_existing: false, voice_file: "tide_2.qvoice" });
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(sidecar["loudness"], { loudness_lufs: -24.72274663827507, peak_db: -6.366579627483562 });
    assert.deepEqual(sidecar["voice_freshness"], { reused_existing: false, voice_file: "tide_2.qvoice" });
  });

  it("unmetered, voiceless runs stamp neither (no fabricated receipts), and incoherent shapes skip", async () => {
    const runDir = join(dir, "rnofab");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      stages: [{
        id: "s1",
        name: "s1",
        index: 0,
        status: "completed",
        outputs: {},
        expected: {},
        // garbage arms: a string, a half-pair, an array
        result_outputs: {
          loudness: "loud",
          voice_freshness: { reused_existing: true },
        },
      } as never],
    });
    await settlePersist(run, dir);
    assert.equal(run.loudness, undefined);
    assert.equal(run.voiceFreshness, undefined);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("loudness" in sidecar));
    assert.ok(!("voice_freshness" in sidecar));
  });

  it("runs whose engine minted nothing stamp no export_path (load lanes)", async () => {
    const runDir = join(dir, "rnopath");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      params: [{ voice_name: "night-keeper" } as never],
      stages: [{
        id: "tts",
        name: "tts",
        index: 0,
        status: "completed",
        outputs: {},
        expected: {},
        result_outputs: { prompt_id: "p1" },
      } as never],
    });
    await settlePersist(run, dir);
    assert.equal(run.exportPath, undefined);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("export_path" in sidecar));
  });

  it("THE VARIANT STAMP (commission 033's self-critique #5): the lane rides the record + sidecar + terminal ledger row — design reads apart from performing", async () => {
    const runDir = join(dir, "rvariant");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      params: [{ text: "hi" } as never],
      cardSnapshot: { card: "qwen3-tts", params: { variant: "customvoice", voice_name: "night-frequency" } },
    });
    await settlePersist(run, dir);
    assert.equal(run.variant, "customvoice");
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["variant"], "customvoice");
    const ledger = readFileSync(join(dir, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"event":"run\.completed"/);
    assert.match(ledger, /"variant":"customvoice"/);
  });

  it("runs without a variant stamp nothing (no variant key — never guessed)", async () => {
    const runDir = join(dir, "rnovariant");
    mkdirSync(runDir, { recursive: true });
    const run = record({ dir: runDir, params: [{ text: "hi" } as never] });
    await settlePersist(run, dir);
    assert.equal(run.variant, undefined);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("variant" in sidecar));
  });

  it("THE REGISTRATION CARRY: a row that already holds a variant keeps it when the bodies name none (the ?? right side)", async () => {
    // registration stamps run.variant; settle re-lifts from the same
    // bodies — the fallback keeps the birth stamp when neither body
    // names a lane (never un-names a run at rest).
    const runDir = join(dir, "rvarcarry");
    mkdirSync(runDir, { recursive: true });
    const run = record({ dir: runDir, params: [{ text: "hi" } as never], variant: "voicedesign" });
    await settlePersist(run, dir);
    assert.equal(run.variant, "voicedesign");
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["variant"], "voicedesign");
  });

  it("THE JUNK-BODIES SKIP (§16 burn-down: the stamp loops' guard arm): null/array bodies never crash the stamp — the lane still lifts from the live body", async () => {
    // the export-name loop's `continue` TRUE arm had no wall (a
    // flagged branch at HEAD); the variant lift shares the shape.
    // Junk in, lane out — never a crash, never a guess.
    const runDir = join(dir, "rjunk");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      params: [null, { variant: "customvoice" }] as never,
      cardSnapshot: { card: "qwen3-tts", params: ["junk"] },
    });
    await settlePersist(run, dir);
    assert.equal(run.variant, "customvoice");
    assert.equal(run.exportName, undefined);
  });
});

describe("variantOfBodies", () => {
  // THE LIFT'S EVERY ARM (033 #5): junk bodies skip, non-string and
  // blank variants fall through, the first non-empty string wins.
  it("lifts the first non-empty variant across bodies in order", () => {
    assert.equal(variantOfBodies([{ variant: "voicedesign" }, { variant: "customvoice" }]), "voicedesign");
    assert.equal(variantOfBodies([{ text: "hi" }, { variant: "  customvoice  " }]), "customvoice");
  });
  it("skips junk bodies and junk variants, returning undefined when none names a lane", () => {
    assert.equal(variantOfBodies([]), undefined);
    assert.equal(variantOfBodies([null, undefined, "x", 5, ["variant"]]), undefined);
    assert.equal(variantOfBodies([{ variant: 5 }, { variant: "" }, { variant: "   " }, { text: "hi" }]), undefined);
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

// 2026-10-16 — the coverage queue's runsTypes batch: the two
// already-decided guards of the loudness + freshness lift (the
// "the run already holds this stamp" legs, which the settled-run
// rows above never reach because their records carry neither).
describe("settlePersist's loudness + freshness guards (2026-10-16, the coverage queue's runsTypes batch)", () => {
  it("a loudness PAIR the meter cannot vouch for stamps nothing (a stringified LUFS, a non-finite peak)", async () => {
    // The outer gate (loudness is not a dict) had a wall; the inner
    // pair gate did not: a row whose loudness IS an object but whose
    // numbers are junk must ride the same silence as no meter at
    // all — never a coerced number on the compact-row chip.
    const runDir = join(dir, "rbadpair");
    mkdirSync(runDir, { recursive: true });
    const run = record({
      dir: runDir,
      stages: [
        {
          id: "h3-film", name: "h3-film", index: 0, status: "completed",
          outputs: { default: "video" }, expected: {},
          result_outputs: { loudness: { loudness_lufs: "-24.7", peak_db: -6.4 } },
        } as never,
        {
          id: "h3-film-2", name: "h3-film-2", index: 1, status: "completed",
          outputs: { default: "video" }, expected: {},
          result_outputs: { loudness: { loudness_lufs: -24.7, peak_db: Number.NaN } },
        } as never,
      ],
    });
    await settlePersist(run, dir);
    assert.equal(run.loudness, undefined);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("loudness" in sidecar));
  });

  it("an already-stamped voiceFreshness is never re-lifted from a later stage's receipt", async () => {
    // The first coherent pair wins — but a run that already carries
    // the receipt (registration stamped it, or an earlier settle
    // did) keeps its own: the loop's guard is the stamp's presence,
    // not the stage's order.
    const runDir = join(dir, "rkeepfresh");
    mkdirSync(runDir, { recursive: true });
    const stamped = { reused_existing: true, voice_file: "tide_2.qvoice" };
    const run = record({
      dir: runDir,
      voiceFreshness: stamped,
      stages: [{
        id: "tts", name: "tts", index: 0, status: "completed",
        outputs: { voices: "voice" }, expected: {},
        result_outputs: { voice_freshness: { reused_existing: false, voice_file: "other_9.qvoice" } },
      } as never],
    });
    await settlePersist(run, dir);
    assert.deepEqual(run.voiceFreshness, stamped);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(sidecar["voice_freshness"], stamped);
  });
});

describe("settlePersist's replay verdict (D11, 2026-10-11)", () => {
  it("carries the executor's verdict onto the sidecar and the terminal ledger row", async () => {
    // The engine served memo'd outputs without executing (the
    // tap folded zero events): the run still completes, but the
    // disk tells the truth — the sidecar inside the identity
    // window, the ledger row beside the terminal event.
    const runDir = join(dir, "rreplay");
    mkdirSync(runDir, { recursive: true });
    await settlePersist(record({ dir: runDir, replaySuspect: true }), dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["replay_suspect"], true);
    const ledger = readFileSync(join(dir, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"replay_suspect":true/);
  });

  it("omits the replay key when the executor never witnessed (absent, never clean)", async () => {
    const runDir = join(dir, "rreplay-absent");
    mkdirSync(runDir, { recursive: true });
    await settlePersist(record({ dir: runDir }), dir);
    const sidecar = JSON.parse(readFileSync(join(runDir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal("replay_suspect" in sidecar, false);
  });
});
