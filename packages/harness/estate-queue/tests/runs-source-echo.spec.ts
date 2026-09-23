// runs-source-echo.spec.ts — THE SOURCE-ECHO LAW (operator
// 2026-09-23): every run carries history pointing at the files that
// created it; a break in that chain refuses LOUD, never silent.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectMediaRefs,
  parseMediaRef,
  resolveSourceRefs,
} from "../src/runsSourceEcho.ts";
import { registerCompiledRun } from "../src/runsStart.ts";
import type { CompiledStage } from "../src/runsStart.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "runs-source-echo-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
/** A state root holding one served file (the media walk's shape). */
const rooted = (runId: string, rel: string): string => {
  const root = tmp();
  const dir = join(root, "output", runId, rel.split("/").slice(0, -1).join("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, "output", runId, rel), "bytes");
  return root;
};
const stageWith = (params: Record<string, unknown>): CompiledStage => ({
  id: "s",
  engine: "comfyui",
  params,
  outputs: {},
  expected: {},
  outputNodes: {},
  inputNames: {},
});
const mustRegister = (
  args: Parameters<typeof registerCompiledRun>[0],
): { run: RunRecord; queuePosition: number } => {
  const out = registerCompiledRun(args);
  if ("payload" in out) throw new Error("expected registration, got refusal: " + JSON.stringify(out.payload));
  return out;
};

describe("collectMediaRefs", () => {
  it("sweeps nested params (calls, clips, stanzas), dedupes, ignores non-pointers", () => {
    const got = collectMediaRefs({
      ref_images: ["/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"],
      calls: [{ text: "x", refs: { images: "/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png" } }],
      audio_clips: [{ src: "/melite-media/runs/run-dddd4444-ee55ff66/tts/b.flac" }],
      image: "data:image/png;base64,xx",
      guide: "bare-artifact-name",
      remote: "https://example.com/c.png",
    });
    assert.deepEqual(got, [
      "/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png",
      "/melite-media/runs/run-dddd4444-ee55ff66/tts/b.flac",
    ]);
  });

  it("collects nothing from sourceless params", () => {
    assert.deepEqual(collectMediaRefs({ steps: 12, calls: [{ text: "hi" }] }), []);
    assert.deepEqual(collectMediaRefs(undefined), []);
  });
});

describe("parseMediaRef", () => {
  it("parses run dir + rel", () => {
    assert.deepEqual(parseMediaRef("/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"), {
      runId: "run-aaaa1111-bb22cc33",
      rel: "edit/a.png",
    });
  });

  it("refuses shapes that can never serve (short, bad run dir, traversal, bad escape)", () => {
    assert.throws(() => parseMediaRef("/melite-media/runs/onlyone"), /malformed/);
    assert.throws(() => parseMediaRef("/melite-media/runs/notarun/a.png"), /mint grammar/);
    assert.throws(() => parseMediaRef("/melite-media/runs/run-aaaa1111-bb22cc33/../x"), /traversal/);
    assert.throws(() => parseMediaRef("/melite-media/runs/run-aaaa1111-bb22cc33/%zz"), /percent-escape/);
  });
});

describe("resolveSourceRefs", () => {
  it("resolves through the run-dir walk (first-root-wins across the manifest)", () => {
    const r1 = tmp();
    const r2 = rooted("run-aaaa1111-bb22cc33", "edit/a.png");
    const rows = resolveSourceRefs(["/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"], [r1, r2]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.file, join(r2, "output", "run-aaaa1111-bb22cc33", "edit/a.png"));
  });

  it("one error names EVERY dead source plus the searched roots", () => {
    const root = tmp();
    assert.throws(
      () =>
        resolveSourceRefs(
          [
            "/melite-media/runs/run-aaaa1111-bb22cc33/edit/gone.png",
            "/melite-media/runs/run-bbbb2222-cc33dd44/tts/gone.flac",
          ],
          [root],
        ),
      (e: Error) =>
        /resolve nowhere/.test(e.message) &&
        e.message.includes("gone.png") &&
        e.message.includes("gone.flac") &&
        e.message.includes(root),
    );
  });

  it("a run dir without the file is a miss (the dir alone proves nothing)", () => {
    const root = tmp();
    mkdirSync(join(root, "output", "run-aaaa1111-bb22cc33"), { recursive: true });
    assert.throws(
      () => resolveSourceRefs(["/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"], [root]),
      /resolve nowhere/,
    );
  });
});

describe("registerCompiledRun (the source-echo gate)", () => {
  it("a dead media source refuses at the door with its URL named — nothing registers", () => {
    const root = tmp();
    const seen: string[] = [];
    const out = registerCompiledRun({
      compiled: { stages: [stageWith({ ref_images: ["/melite-media/runs/run-aaaa1111-bb22cc33/edit/gone.png"] })] },
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: (row) => {
        seen.push(row.runId);
        return 0;
      },
    });
    assert.ok("payload" in out, "the door refuses");
    assert.equal(out.payload.code, "invalid_request");
    assert.match((out.payload.error as string), /resolve nowhere/);
    assert.match((out.payload.error as string), /gone\.png/);
    assert.deepEqual(seen, [], "nothing enqueued");
  });

  it("live sources stamp the record (url + resolved file) and ride the sidecar", () => {
    const root = rooted("run-aaaa1111-bb22cc33", "edit/a.png");
    const { run } = mustRegister({
      compiled: {
        stages: [
          stageWith({
            ref_images: ["/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"],
            audio_clips: [{ src: "data:audio/x" }],
          }),
        ],
      },
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 0,
    });
    assert.deepEqual(run.sourceEcho, {
      refs: [
        {
          url: "/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png",
          file: join(root, "output", "run-aaaa1111-bb22cc33", "edit/a.png"),
        },
      ],
    });
  });

  it("sourceless runs register exactly as before (no stamp, no refusal)", () => {
    const root = tmp();
    const { run } = mustRegister({
      compiled: { stages: [stageWith({ steps: 12 })] },
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 0,
    });
    assert.equal(run.sourceEcho, undefined);
  });
});
