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
  collectSourceRefs,
  parseMediaRef,
  parseSourceRef,
  resolveSourceRefs,
  resolveMediaRefs,
} from "../src/runsSourceEcho.ts";
import { registerCompiledRun } from "../src/runsStart.ts";
import type { CompiledStage } from "../src/runsStart.ts";
import { newRunId } from "../src/queueCore.ts";
import type { EngineJson } from "@melite/comfyui-cordis";
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
const stageWith = (params: Record<string, EngineJson>): CompiledStage => ({
  id: "s",
  engine: "comfyui",
  params,
  outputs: {},
  // the compiled row carries the derivation (runsStart.ts:366): an
  // empty outputs map is NOT a declared one
  outputsDeclared: false,
  expected: {},
  outputNodes: {},
  inputNames: {},
});
/** The door is REQUIRED by the type (the operator's live refusal,
 *  2026-09-28: the run id used to have a second producer here, so a
 *  composed graph and its run could name different runs). These arms
 *  are about the SOURCE gate, not the id seam, so the helper supplies
 *  a door when a caller does not — the id is still the caller's and
 *  the run registers under exactly it. */
const mustRegister = async (
  args: Omit<Parameters<typeof registerCompiledRun>[0], "door"> & {
    door?: Parameters<typeof registerCompiledRun>[0]["door"];
  },
): Promise<{ run: RunRecord; queuePosition: number }> => {
  const withDoor = {
    ...args,
    door: args.door ?? { runId: newRunId(), pipeline: "flow_inline", requestBody: {} },
  };
  const out = await registerCompiledRun(withDoor);
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

describe("collectSourceRefs (every face the stager stages)", () => {
  it("sweeps the assets face and padded spellings; stamps verbatim", () => {
    const got = collectSourceRefs({
      clip: "/v1/assets/runs/run-aaaa1111-bb22cc33/edit/a.png",
      padded: "  /melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png  ",
    });
    assert.deepEqual(got, [
      "/v1/assets/runs/run-aaaa1111-bb22cc33/edit/a.png",
      "  /melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png  ",
    ]);
  });

  it("sweeps absolute paths and run-tails", () => {
    const got = collectSourceRefs({
      abs: "/tmp/x/a.png",
      tail: "run-aaaa1111-bb22cc33/edit/a.png",
    });
    assert.deepEqual(got, ["/tmp/x/a.png", "run-aaaa1111-bb22cc33/edit/a.png"]);
  });

  it("prose never qualifies (no false refusals on prompts)", () => {
    assert.deepEqual(
      collectSourceRefs({
        prompt: "AC/DC live 24/7, a cat/dog hybrid",
        rel: "data/input/x.png",
        tom: "Tom/Jerry",
      }),
      [],
    );
  });

  it("data:, bare names, and linked http(s) ride untouched (the engine's own arms)", () => {
    assert.deepEqual(
      collectSourceRefs({
        a: "data:image/png;base64,xx",
        b: "still-a",
        c: "https://example.com/c.png",
      }),
      [],
    );
  });

  it("does not revisit a cyclic params object", () => {
    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    assert.deepEqual(collectSourceRefs(cycle), []);
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

describe("parseSourceRef (faces + the servable fence)", () => {
  it("parses the assets face and run-tails", () => {
    assert.equal(parseSourceRef("/v1/assets/runs/run-aaaa1111-bb22cc33/edit/a.png").runId, "run-aaaa1111-bb22cc33");
    const tail = parseSourceRef("run-aaaa1111-bb22cc33/edit/a.png");
    assert.equal(tail.runId, "run-aaaa1111-bb22cc33");
    assert.equal(tail.rel, "edit/a.png");
    assert.equal(parseSourceRef("/tmp/x/a.png").face, "abs");
  });

  it("run-state files refuse (the server 404s them) — _poster.jpg excepted", () => {
    assert.throws(
      () => parseSourceRef("/melite-media/runs/run-aaaa1111-bb22cc33/_request.json"),
      /run-state file/,
    );
    assert.equal(
      parseSourceRef("/melite-media/runs/run-aaaa1111-bb22cc33/_poster.jpg").rel,
      "_poster.jpg",
    );
  });

  it("refuses invalid run heads, confined segments, NUL absolutes, and non-run media", () => {
    assert.throws(() => parseSourceRef("not-a-run/file.png"), /not a source pointer/);
    assert.throws(() => parseSourceRef("%zz/file.png"), /not a source pointer/);
    assert.throws(() => parseSourceRef("/melite-media/runs/run-aaaa1111-bb22cc33/./x.png"), /traversal/);
    assert.throws(() => parseSourceRef("/melite-media/runs/run-aaaa1111-bb22cc33/a%00.png"), /traversal/);
    assert.throws(() => parseSourceRef("/melite-media/runs/run-aaaa1111-bb22cc33//x.png"), /traversal/);
    assert.throws(() => parseSourceRef("/tmp/a\0.png"), /NUL/);
    assert.throws(() => parseMediaRef("/tmp/a.png"), /not a run source/);
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

  it("a parse refusal joins the aggregate dead-source voice", () => {
    const root = tmp();
    assert.throws(
      () => resolveSourceRefs(["not-a-run/file.png"], [root]),
      (e: Error) => /resolve nowhere/.test(e.message) && /not a source pointer/.test(e.message),
    );
  });

  it("the media wrapper resolves the same run faces", () => {
    const root = rooted("run-aaaa1111-bb22cc33", "edit/a.png");
    const rows = resolveMediaRefs(["/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"], [root]);
    assert.equal(rows[0]?.file, join(root, "output", "run-aaaa1111-bb22cc33", "edit/a.png"));
  });

  it("a run dir without the file is a miss (the dir alone proves nothing)", () => {
    const root = tmp();
    mkdirSync(join(root, "output", "run-aaaa1111-bb22cc33"), { recursive: true });
    assert.throws(
      () => resolveSourceRefs(["/melite-media/runs/run-aaaa1111-bb22cc33/edit/a.png"], [root]),
      /resolve nowhere/,
    );
  });

  it("the assets face resolves through the same trees", () => {
    const r = rooted("run-aaaa1111-bb22cc33", "edit/a.png");
    const rows = resolveSourceRefs(["/v1/assets/runs/run-aaaa1111-bb22cc33/edit/a.png"], [r]);
    assert.equal(rows[0]?.file, join(r, "output", "run-aaaa1111-bb22cc33", "edit/a.png"));
    assert.throws(
      () => resolveSourceRefs(["/v1/assets/runs/run-aaaa1111-bb22cc33/edit/gone.png"], [r]),
      /gone\.png/,
    );
  });

  it("run-tails resolve through trees, then the lane cwd (the stager's order)", () => {
    const r = rooted("run-aaaa1111-bb22cc33", "edit/a.png");
    const rows = resolveSourceRefs(
      ["run-aaaa1111-bb22cc33/edit/a.png"],
      [tmp()],
      join(r, "output", "run-aaaa1111-bb22cc33"),
    );
    assert.equal(rows.length, 1);
    assert.throws(
      () => resolveSourceRefs(["run-aaaa1111-bb22cc33/edit/a.png"], [tmp()], tmp()),
      /resolve nowhere/,
    );
  });

  it("the registering run's own id passes unstamped (its future output path rides the graph)", () => {
    const self = "run-aaaa1111-bb22cc33";
    const rows = resolveSourceRefs(
      [`${self}/gen`, `/melite-media/runs/${self}/gen`],
      [tmp()],
      tmp(),
      self,
    );
    assert.deepEqual(rows, []);
    // …while every OTHER dead tail still refuses.
    assert.throws(
      () => resolveSourceRefs(["run-bbbb2222-cc33dd44/gen"], [tmp()], tmp(), self),
      /resolve nowhere/,
    );
  });

  it("absolute paths stage verbatim or refuse", () => {
    const r = tmp();
    writeFileSync(join(r, "a.png"), "bytes");
    const rows = resolveSourceRefs([join(r, "a.png")], [tmp()]);
    assert.equal(rows[0]?.file, join(r, "a.png"));
    assert.throws(() => resolveSourceRefs([join(r, "gone.png")], [tmp()]), /resolve nowhere/);
  });
});

describe("registerCompiledRun (the source-echo gate)", () => {
  it("a dead media source refuses at the door with its URL named — nothing registers", async () => {
    const root = tmp();
    const seen: string[] = [];
    const out = await registerCompiledRun({
      compiled: { stages: [stageWith({ ref_images: ["/melite-media/runs/run-aaaa1111-bb22cc33/edit/gone.png"] })] },
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      door: { runId: newRunId(), pipeline: "flow_inline", requestBody: {} },
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

  it("live sources stamp the record (url + resolved file) and ride the sidecar", async () => {
    const root = rooted("run-aaaa1111-bb22cc33", "edit/a.png");
    const { run } = await mustRegister({
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

  it("sourceless runs register exactly as before (no stamp, no refusal)", async () => {
    const root = tmp();
    const { run } = await mustRegister({
      compiled: { stages: [stageWith({ steps: 12 })] },
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 0,
    });
    assert.equal(run.sourceEcho, undefined);
  });
});

// ── THE PER-SEGMENT LAW (li-aq.3, L10): the old `t.includes("..")`
// substring ban refused a LEGAL name the engine mints
// (`still..frame.png`) — traversal is a property of SEGMENTS.
describe("the dot law is per-segment (a substring ban refuses legal minted names)", () => {
  it("'..' INSIDE a segment is a legal name; a '..' SEGMENT is traversal", () => {
    // a legal run-tail source: dots WITHIN a segment, never a
    // dots-only segment (the head is the mint grammar)
    const legal = parseSourceRef("run-aaaa1111-bb22cc33/still..frame.png");
    assert.notEqual(legal, null, "'..' inside a segment is a name, not a traversal");
    // the traversal shapes stay refused
    assert.throws(() => parseSourceRef("../escape.png"), "a leading '..' segment is traversal");
    assert.throws(() => parseSourceRef("run-aaaa1111-bb22cc33/../../escape.png"), "a mid-path '..' segment is traversal");
    assert.throws(() => parseSourceRef("run-aaaa1111-bb22cc33/./here.png"), "a '.' segment is not a name");
  });
});
