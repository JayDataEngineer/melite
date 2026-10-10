// comfyui-upload.spec.ts — the upload plane's every arm (TEST-2
// breadth, the deterministic census): spliceWorkflow's inject law,
// uploadFile's ctype table + refusal, isFile, and uploadReferenced's
// full walk (data URLs, linked inputs, estate assets, runs-relative,
// cwd, the VHS exemption, object descent).
import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  candidateTrees,
  spliceWorkflow,
  uploadFile,
  isFile,
  uploadReferenced,
} from "../src/comfyui-upload.ts";
import type { Client } from "@stable-canvas/comfyui-client";

const DIR = join(tmpdir(), "melite-upload-" + process.pid);
const ROOT = join(DIR, "runs");
beforeAll(() => {
  mkdirSync(join(ROOT, "run-1"), { recursive: true });
  writeFileSync(join(ROOT, "run-1", "local.png"), "png");
  writeFileSync(join(ROOT, "run-1", "local.flac"), "flac");
  writeFileSync(join(DIR, "abs.gif"), "gif");
  writeFileSync(join(DIR, "rel.webp"), "webp");
  writeFileSync(join(process.cwd(), "cwd-rel.webp"), "webp");
});
afterAll(() => {
  rmSync(DIR, { recursive: true, force: true });
  rmSync(join(process.cwd(), "cwd-rel.webp"), { force: true });
});

const uploads: Array<{ name: string; type: string }> = [];
const fakeClient = (over: Record<string, unknown> = {}): Client =>
  ({
    fetchApi: async (_url: string, init: RequestInit) => {
      const fd = init.body as FormData;
      const blob = fd.get("image") as Blob & { name?: string };
      uploads.push({ name: blob.name ?? "blob", type: blob.type });
      return new Response(JSON.stringify({ name: blob.name ?? "staged-" + uploads.length + ".bin" }), { status: 200 });
    },
    ...over,
  }) as unknown as Client;

describe("spliceWorkflow (the inject law)", () => {
  it("injects into named nodes' inputs", () => {
    const g = spliceWorkflow({
      workflow: { n1: { class_type: "X", inputs: { seed: 0, other: 1 } } },
      inject: { "n1.seed": 42 },
    });
    expect((g["n1"] as { inputs: Record<string, unknown> }).inputs["seed"]).toBe(42);
    expect((g["n1"] as { inputs: Record<string, unknown> }).inputs["other"]).toBe(1);
  });
  it("a missing workflow refuses (no silent empty render)", () => {
    expect(() => spliceWorkflow({})).toThrow(/no inline workflow/);
    expect(() => spliceWorkflow({ workflow: [1] })).toThrow(/no inline workflow/);
  });
  it("a non-object inject refuses", () => {
    expect(() => spliceWorkflow({ workflow: {}, inject: 5 })).toThrow(/inject must be an object/);
  });
  it("inject without a dot, missing node, or missing key refuses", () => {
    const wf = { workflow: { n1: { class_type: "X", inputs: { a: 1 } } } };
    expect(() => spliceWorkflow({ ...wf, inject: { nodot: 1 } })).toThrow(/targets nothing/);
    expect(() => spliceWorkflow({ ...wf, inject: { "ghost.a": 1 } })).toThrow(/targets nothing/);
    expect(() => spliceWorkflow({ ...wf, inject: { "n1.missing": 1 } })).toThrow(/targets nothing/);
    expect(() => spliceWorkflow({
      workflow: { bare: 5 },
      inject: { "bare.a": 1 },
    })).toThrow(/targets nothing/);
    expect(() => spliceWorkflow({
      workflow: { n2: { class_type: "X", inputs: "flat" } },
      inject: { "n2.a": 1 },
    })).toThrow(/targets nothing/);
  });
});

describe("uploadFile (the ctype table + the receipt)", () => {
  it("each extension maps its mime; the server name rides back", async () => {
    const cases: Array<[string, string]> = [
      ["a.png", "image/png"], ["a.jpg", "image/jpeg"], ["a.jpeg", "image/jpeg"],
      ["a.webp", "image/webp"], ["a.gif", "image/gif"], ["a.mp4", "video/mp4"],
      ["a.wav", "audio/wav"], ["a.mp3", "audio/mpeg"], ["a.glb", "model/gltf-binary"],
      ["a.gltf", "model/gltf+json"],
      ["a.xyz", "application/octet-stream"], ["no-extension", "application/octet-stream"],
    ];
    for (const [name, mime] of cases) {
      const p = join(DIR, name);
      writeFileSync(p, "x");
      const out = await uploadFile(fakeClient(), p);
      expect(out.name).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
      expect(uploads.at(-1)?.type).toBe(mime);
    }
  });
  it("THE STALE-TAKE WALL: the staged name is content-addressed — same bytes idempotent, a different take gets a different name", async () => {
    // two files, same basename, different bytes (two runs' TTS of the
    // same line) — the bare-basename law served whichever landed
    // first; the content-address law keeps them apart
    const take1 = join(DIR, "line-take.flac");
    const take2 = join(DIR, "line-take-2.flac");
    writeFileSync(take1, "take-one-bytes");
    writeFileSync(take2, "take-two-bytes-different-length");
    const c = fakeClient();
    const a = await uploadFile(c, take1);
    const b = await uploadFile(c, take2);
    const again = await uploadFile(c, take1);
    expect(a.name).toMatch(/^line-take_[0-9a-f]{12}\.flac$/);
    expect(b.name).toMatch(/^line-take-2_[0-9a-f]{12}\.flac$/);
    expect(a.name).not.toBe(b.name);
    expect(again.name).toBe(a.name);
  });
  it("a server answer without a name refuses", async () => {
    const bad = { fetchApi: async () => new Response("{}", { status: 200 }) } as unknown as Client;
    await expect(uploadFile(bad, join(DIR, "a.png"))).rejects.toThrow(/upload failed/);
  });
});

describe("isFile", () => {
  it("files true; dirs, missing, and unreadable false", () => {
    expect(isFile(join(DIR, "a.png"))).toBe(true);
    expect(isFile(DIR)).toBe(false);
    expect(isFile(join(DIR, "nope"))).toBe(false);
  });
});

describe("uploadReferenced (the staging walk)", () => {
  it("a data:image URL decodes, uploads, and substitutes", async () => {
    const url = "data:image/png;base64," + Buffer.from("png").toString("base64");
    const { graph, uploaded } = await uploadReferenced(fakeClient(), {
      n: { class_type: "LoadImage", inputs: { image: url } },
    });
    expect((graph["n"] as { inputs: { image: string } }).inputs["image"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect(uploaded[url]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
  });
  it("mesh data URLs stage with the mesh extension and mime", async () => {
    for (const mime of ["model/gltf-binary", "model/gltf+json"]) {
      const url = `data:${mime};base64,` + Buffer.from("mesh").toString("base64");
      const { graph, uploaded } = await uploadReferenced(fakeClient(), {
        n: { class_type: "LoadGLB", inputs: { glb_path: url } },
      });
      expect((graph["n"] as { inputs: { glb_path: string } }).inputs.glb_path).toMatch(new RegExp(`\\.(?:glb|gltf)$`));
      expect(uploaded[url]).toMatch(new RegExp(`\\.(?:glb|gltf)$`));
    }
  });

  it("non-image and empty-payload data URLs ride untouched", async () => {
    const { graph } = await uploadReferenced(fakeClient(), {
      a: { class_type: "X", inputs: { v: "data:text/plain;base64,aGk=" } },
      b: { class_type: "X", inputs: { v: "data:image/png;base64," } },
      c: { class_type: "X", inputs: { v: "data:not-even-a-url" } },
    });
    expect((graph["a"] as { inputs: { v: string } }).inputs["v"]).toBe("data:text/plain;base64,aGk=");
    expect((graph["b"] as { inputs: { v: string } }).inputs["v"]).toBe("data:image/png;base64,");
    expect((graph["c"] as { inputs: { v: string } }).inputs["v"]).toBe("data:not-even-a-url");
  });
  it("a linked http input fetches, stages, and substitutes", async () => {
    const fetchMock = vi.fn(async () => new Response("bytes", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const leaked = (): string[] => readdirSync(tmpdir()).filter((name) => name.startsWith("melite-link-"));
    const before = leaked().length;
    try {
      const { graph } = await uploadReferenced(fakeClient(), {
        n: { class_type: "LoadImage", inputs: { image: "https://up/run-1/out.png" } },
      });
      expect((graph["n"] as { inputs: { image: string } }).inputs["image"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
      // the staging tmp dies with the upload (audit M-E2) — one
      // leaked file per chained run is unbounded /tmp growth
      expect(leaked().length).toBe(before);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("a failed linked fetch refuses loud (status and wire both)", async () => {
    const statusMock = vi.fn(async () => new Response("x", { status: 502 }));
    vi.stubGlobal("fetch", statusMock);
    try {
      await expect(uploadReferenced(fakeClient(), {
        n: { class_type: "X", inputs: { v: "https://up/x.png" } },
      })).rejects.toThrow(/linked input fetch failed/);
      vi.unstubAllGlobals();
      const wireMock = vi.fn(async () => { throw new Error("wire died"); });
      vi.stubGlobal("fetch", wireMock);
      await expect(uploadReferenced(fakeClient(), {
        n: { class_type: "X", inputs: { v: "https://up/x.png" } },
      })).rejects.toThrow(/linked input fetch failed/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("an estate asset URL resolves under the runs root (both prefixes)", async () => {
    for (const prefix of ["/melite-media/runs/", "/v1/assets/runs/"]) {
      const { graph } = await uploadReferenced(fakeClient(), {
        n: { class_type: "LoadImage", inputs: { image: prefix + "run-1/local.png" } },
      }, { runsRoot: ROOT });
      expect((graph["n"] as { inputs: { image: string } }).inputs["image"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    }
  });
  it("a .qvoice from a run's media bag STAGES (the voice lane's own container)", async () => {
    // THE T5 WALL (the TTS chain audit, 2026-10-15): the voice lane
    // saves a voice as a .qvoice under the run's media bag and hands
    // preview_voice that path. UPLOAD_EXTS had no .qvoice — the table's
    // own header claimed it did — so the path rode into the graph
    // verbatim and the pack opened a file the engine had never seen.
    // This asserts the substitution the engine needs: a staged,
    // content-addressed name, never the estate URL.
    // the voice file really sits in the run's media bag: the walk
    // resolves the URL on disk, so the wall needs the artifact.
    mkdirSync(join(ROOT, "run-1", "voices"), { recursive: true });
    writeFileSync(join(ROOT, "run-1", "voices", "coral.qvoice"), "QVOICE");
    const { graph, uploaded } = await uploadReferenced(fakeClient(), {
      n: {
        class_type: "AudiocoreVoiceStudio",
        inputs: { voice: "/melite-media/runs/run-1/voices/coral.qvoice" },
      },
    }, { runsRoot: ROOT });
    const voice = (graph["n"] as { inputs: { voice: string } }).inputs.voice;
    expect(voice).toMatch(/coral_[0-9a-f]{12}\.qvoice$/);
    expect(voice).not.toContain("/melite-media/");
    expect(Object.keys(uploaded)).toHaveLength(1);
  });

  it("stages every source in a film clips_json manifest and preserves row fields", async () => {
    const data = "data:audio/flac;base64," + Buffer.from("manifest-flac").toString("base64");
    const source = "/melite-media/runs/run-1/local.flac";
    const { graph, uploaded } = await uploadReferenced(fakeClient(), {
      n: {
        class_type: "MeliteFilmAudioMix",
        inputs: {
          clips_json: JSON.stringify([
            { src: source, start_sec: 0, dur_sec: 1, class: "sfx" },
            { src: data, start_sec: 2, dur_sec: 3, class: "music" },
          ]),
          film_seconds: 10,
        },
      },
    }, { runsRoot: ROOT });
    const input = (graph["n"] as { inputs: { clips_json: string } }).inputs;
    const rows = JSON.parse(input.clips_json) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ start_sec: 0, dur_sec: 1, class: "sfx" });
    expect(rows[1]).toMatchObject({ start_sec: 2, dur_sec: 3, class: "music" });
    expect(rows[0]!.src).toMatch(/local_[0-9a-f]{12}\.flac$/);
    expect(rows[1]!.src).toMatch(/melite-data-.*_[0-9a-f]{12}\.flac$/);
    expect(input.clips_json).toBe(JSON.stringify(rows));
    expect(Object.keys(uploaded)).toHaveLength(2);
  });
  it("leaves malformed and non-array film manifests for the node validator", async () => {
    const values = [
      "not-json",
      JSON.stringify({ src: "/melite-media/runs/run-1/local.flac" }),
      JSON.stringify([null, 3, { start_sec: 0, dur_sec: 1, class: "sfx" }]),
      7,
    ];
    for (const clips_json of values) {
      const { graph } = await uploadReferenced(fakeClient(), {
        n: { class_type: "MeliteFilmAudioMix", inputs: { clips_json } },
      }, { runsRoot: ROOT });
      expect((graph["n"] as { inputs: { clips_json: unknown } }).inputs.clips_json).toBe(clips_json);
    }
  });
  it("deduplicates a direct asset against the same film manifest source", async () => {
    const source = "/melite-media/runs/run-1/local.flac";
    const before = uploads.length;
    const { graph } = await uploadReferenced(fakeClient(), {
      direct: { class_type: "LoadAudio", inputs: { audio: source } },
      mix: {
        class_type: "MeliteFilmAudioMix",
        inputs: { clips_json: JSON.stringify([{ src: source, start_sec: 0, dur_sec: 1, class: "sfx" }]) },
      },
    }, { runsRoot: ROOT });
    expect(uploads.length).toBe(before + 1);
    const direct = (graph["direct"] as { inputs: { audio: string } }).inputs.audio;
    const row = JSON.parse((graph["mix"] as { inputs: { clips_json: string } }).inputs.clips_json)[0] as { src: string };
    expect(row.src).toBe(direct);
  });
  it("an estate URL without a runs root refuses", async () => {
    await expect(uploadReferenced(fakeClient(), {
      n: { class_type: "X", inputs: { v: "/v1/assets/runs/run-1/local.png" } },
    })).rejects.toThrow(/without a runs root/);
  });
  it("a traversal estate URL refuses", async () => {
    await expect(uploadReferenced(fakeClient(), {
      n: { class_type: "X", inputs: { v: "/v1/assets/runs/../escape.png" } },
    }, { runsRoot: ROOT })).rejects.toThrow(/refuses traversal/);
  });
  it("a dangling estate URL refuses loud", async () => {
    await expect(uploadReferenced(fakeClient(), {
      n: { class_type: "X", inputs: { v: "/v1/assets/runs/run-1/ghost.png" } },
    }, { runsRoot: ROOT })).rejects.toThrow(/not found/);
  });
  // §23 CROSS-ROOTS (the operator's law, 2026-09-23: "the agent
  // maker and the user share EVERYTHING"): a chained input may
  // point at a run living in ANOTHER state root — the maker lane's
  // run resolves on the user's lane (the live refusal this wall
  // kills: run-9758446ae437's edit sheet, written under the
  // maker's output/ tree, dangling as "estate asset url not found"
  // under the user's data/runs/output). Own root first; a miss
  // names EVERY searched tree.
  it("THE SHARED-EVERYTHING WALL — an estate URL resolves under a stateRoots tree; a miss names every root", async () => {
    const OTHER_STATE = join(DIR, "maker-state");
    mkdirSync(join(OTHER_STATE, "output", "run-maker"), { recursive: true });
    writeFileSync(join(OTHER_STATE, "output", "run-maker", "sheet.png"), "png");
    // the manifest rides the opts (J12 call data — the retired
    // MELITE_STATE_ROOTS seam's content)
    // the media route AND the runs-relative form both stage from
    // the OTHER root's output tree
    const { graph } = await uploadReferenced(fakeClient(), {
      media: { class_type: "LoadImage", inputs: { image: "/melite-media/runs/run-maker/sheet.png" } },
      rel: { class_type: "X", inputs: { v: "run-maker/sheet.png" } },
    }, { runsRoot: ROOT, stateRoots: [OTHER_STATE] });
    expect((graph["media"] as { inputs: { image: string } }).inputs["image"]).toMatch(/sheet_[0-9a-f]{12}\.png$/);
    expect((graph["rel"] as { inputs: { v: string } }).inputs["v"]).toMatch(/sheet_[0-9a-f]{12}\.png$/);
    // a true miss names BOTH searched trees (the NAME-THE-ROOT law)
    await expect(uploadReferenced(fakeClient(), {
      n: { class_type: "X", inputs: { v: "/v1/assets/runs/run-ghost/none.png" } },
    }, { runsRoot: ROOT, stateRoots: [OTHER_STATE] })).rejects.toThrow(/not found[\s\S]*searched [^\n]*maker-state\/output/);
  });
  it("candidateTrees: own output root leads, manifest roots' output/ follow, dedup keeps first", () => {
    const own = join(DIR, "own", "output");
    // J12: the manifest rides the call (the retired env seam's
    // blanks-and-dupes content, verbatim)
    expect(candidateTrees(own, [join(DIR, "a"), "", join(DIR, "b"), join(DIR, "a")])).toEqual([
      own,
      join(DIR, "a", "output"),
      join(DIR, "b", "output"),
    ]);
  });
  it("runs-relative names resolve under the root; a miss falls to cwd", async () => {
    const { graph } = await uploadReferenced(fakeClient(), {
      hit: { class_type: "X", inputs: { v: "run-1/local.png" } },
      miss: { class_type: "X", inputs: { v: "run-9/none.png" } },
    }, { runsRoot: ROOT });
    expect((graph["hit"] as { inputs: { v: string } }).inputs["v"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect((graph["miss"] as { inputs: { v: string } }).inputs["v"]).toBe("run-9/none.png");
  });
  it("absolute and cwd-relative files stage; misses ride", async () => {
    const { graph } = await uploadReferenced(fakeClient(), {
      abs: { class_type: "X", inputs: { v: join(DIR, "abs.gif") } },
      rel: { class_type: "X", inputs: { v: "cwd-rel.webp" } },
      miss: { class_type: "X", inputs: { v: "not-there.png" } },
    }, undefined);
    expect((graph["abs"] as { inputs: { v: string } }).inputs["v"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect((graph["rel"] as { inputs: { v: string } }).inputs["v"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect((graph["miss"] as { inputs: { v: string } }).inputs["v"]).toBe("not-there.png");
  });
  it("the VHS video exemption rides the file path untouched", async () => {
    const { graph } = await uploadReferenced(fakeClient(), {
      vhs: {
        class_type: "VHS_LoadVideoPath",
        inputs: { video: "/abs/should/not/stage.mp4", other: join(DIR, "abs.gif") },
      },
      vhs2: { class_type: "VHS_LoadVideo", inputs: { video: "keep.webp" } },
    });
    const v = graph["vhs"] as { inputs: Record<string, string> };
    expect(v.inputs["video"]).toBe("/abs/should/not/stage.mp4");
    expect(v.inputs["other"]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect((graph["vhs2"] as { inputs: Record<string, string> }).inputs["video"]).toBe("keep.webp");
  });
  it("objects descend, arrays walk, non-strings ride", async () => {
    const { graph } = await uploadReferenced(fakeClient(), {
      n: { class_type: "X", inputs: { nested: { deep: join(DIR, "abs.gif") }, arr: ["cwd-rel.webp", 5, null] } },
      scalar: 7,
    });
    const n = graph["n"] as { inputs: Record<string, unknown> };
    expect((n.inputs["nested"] as { deep: string }).deep).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect((n.inputs["arr"] as unknown[])[0]).toMatch(/_[0-9a-f]{12}(?:\.[a-z0-9]+)?$/);
    expect((n.inputs["arr"] as unknown[])[1]).toBe(5);
    expect(graph["scalar"]).toBe(7);
  });
  it("a node with no extension match rides verbatim", async () => {
    const { graph } = await uploadReferenced(fakeClient(), {
      n: { class_type: "X", inputs: { v: "some-model-name" } },
    });
    expect((graph["n"] as { inputs: { v: string } }).inputs["v"]).toBe("some-model-name");
  });
});

describe("the seen-map dedup (one upload per unique ref)", () => {
  it("a data URL twice uploads once and substitutes twice", async () => {
    const url = "data:image/png;base64," + Buffer.from("dup").toString("base64");
    const before = uploads.length;
    const { graph } = await uploadReferenced(fakeClient(), {
      a: { class_type: "X", inputs: { v: url } },
      b: { class_type: "X", inputs: { v: url } },
    });
    expect(uploads.length).toBe(before + 1);
    expect((graph["a"] as { inputs: { v: string } }).inputs["v"])
      .toBe((graph["b"] as { inputs: { v: string } }).inputs["v"]);
  });
  it("an estate asset twice uploads once", async () => {
    const before = uploads.length;
    await uploadReferenced(fakeClient(), {
      a: { class_type: "X", inputs: { v: "/v1/assets/runs/run-1/local.png" } },
      b: { class_type: "X", inputs: { v: "/melite-media/runs/run-1/local.png" } },
    }, { runsRoot: ROOT });
    expect(uploads.length).toBe(before + 1);
  });
  it("a runs-relative name twice uploads once; a cwd file twice uploads once", async () => {
    const before = uploads.length;
    await uploadReferenced(fakeClient(), {
      a: { class_type: "X", inputs: { v: "run-1/local.png" } },
      b: { class_type: "X", inputs: { v: "run-1/local.png" } },
    }, { runsRoot: ROOT });
    expect(uploads.length).toBe(before + 1);
    const b2 = uploads.length;
    await uploadReferenced(fakeClient(), {
      a: { class_type: "X", inputs: { v: join(DIR, "abs.gif") } },
      b: { class_type: "X", inputs: { v: join(DIR, "abs.gif") } },
    });
    expect(uploads.length).toBe(b2 + 1);
  });
  it("a linked input twice fetches and uploads once", async () => {
    const fetchMock = vi.fn(async () => new Response("b", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const before = uploads.length;
      await uploadReferenced(fakeClient(), {
        a: { class_type: "X", inputs: { v: "https://up/dup.png" } },
        b: { class_type: "X", inputs: { v: "https://up/dup.png" } },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(uploads.length).toBe(before + 1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("spliceWorkflow's absent-inject toll", () => {
  it("a workflow with no inject key rides the ?? arm untouched", () => {
    const g = spliceWorkflow({ workflow: { n1: { class_type: "X", inputs: { a: 1 } } } });
    expect((g["n1"] as { inputs: Record<string, number> }).inputs["a"]).toBe(1);
  });
});
