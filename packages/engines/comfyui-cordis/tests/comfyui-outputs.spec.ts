// comfyui-outputs.spec.ts — the outputs plane's every arm (TEST-2
// breadth): the timeout formulas, the harvest's full shape matrix
// (dict rows, tuple rows, flat result rows, subfolder prefixes,
// JSON pretty re-serialization, unreachable artifacts skipped),
// the channel publish law (first unmatched wins, claimed set,
// unknown kinds skipped), the history verdict's arms, and the
// timeout normalizer's garbage law.
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  viewTimeoutMs,
  fetchOutputArtifacts,
  fetchOutputs,
  publishOutputChannels,
  assertPublishedOutputChannels,
  qvoicePathsOf,
  loudnessOf,
  qvoiceFreshnessOf,
  mapHistoryEntry,
  normalizeTimeoutS,
  CHANNEL_EXTS,
} from "../src/comfyui-outputs.ts";
import type { Client } from "@stable-canvas/comfyui-client";

const DIR = join(tmpdir(), "melite-outputs-" + process.pid);
beforeAll(() => mkdirSync(DIR, { recursive: true }));
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

const fileOf = (p: string): string => p.split("/").pop() ?? "";

const clientWith = (
  serve: (filename: string) => { body: string; ct: string } | { bytes: Uint8Array; ct: string } | null,
): Client =>
  ({
    fetchApi: async (url: string) => {
      const name = new URL("http://x" + String(url)).searchParams.get("filename") ?? "";
      const hit = serve(name);
      if (hit === null) throw new Error("unreachable");
      return new Response("bytes" in hit ? hit.bytes : hit.body, {
        status: 200,
        headers: { "content-type": hit.ct },
      });
    },
  }) as unknown as Client;

describe("normalizeTimeoutS (the garbage law)", () => {
  it("finite positives ride; everything else tolls to 2400", () => {
    expect(normalizeTimeoutS(10)).toBe(10);
    expect(normalizeTimeoutS(1)).toBe(1);
    for (const garbage of [0, -5, Number.NaN, Infinity, "x", null, undefined, {}]) {
      expect(normalizeTimeoutS(garbage as never)).toBe(2400);
    }
  });
});

describe("viewTimeoutMs (the floor formula)", () => {
  it("short budgets keep the 180s floor; long ones ride the run's budget", () => {
    expect(viewTimeoutMs(10)).toBe(180_000);
    expect(viewTimeoutMs(undefined)).toBe(2_400_000);
    expect(viewTimeoutMs(3600)).toBe(3_600_000);
  });
});

describe("fetchOutputs (the harvest matrix)", () => {
  it("dict rows harvest per kind with subfolder node prefixes", async () => {
    const runDir = join(DIR, "dict");
    const client = clientWith((f) => ({ body: "b:" + f, ct: "application/octet-stream" }));
    const arts = await fetchOutputs(client, runDir, {
      outputs: {
        n1: {
          images: [{ filename: "a.png", subfolder: "sub", type: "output" }],
          files: [{ filename: "b.json", subfolder: "", type: "temp" }],
        },
      },
    }, 10);
    expect(arts.length).toBe(2);
    expect(fileOf(arts[0] ?? "")).toBe("n1_a.png");
    expect(fileOf(arts[1] ?? "")).toBe("b.json");
    expect(readFileSync(join(runDir, "n1_a.png"), "utf8")).toBe("b:a.png");
  });
  it("BINARY BYTES READ BACK BYTE-FOR-BYTE (the media contract, 2026-10-15)", async () => {
    // Every other wall in this file compares UTF-8 STRINGS, which a
    // mangling writer survives: a byte dropped from a .glb, a PNG's
    // binary tail truncated, a re-encoding all read back as "equal"
    // when the strings happened to match. The engine's contract is the
    // BYTE, so this wall serves bytes (a PNG signature, a zero-byte
    // page, high bytes that no string round trip preserves) and reads
    // the file back with Buffer.compare.
    const runDir = join(DIR, "binary");
    // glTF header + a byte pattern that a UTF-8 round trip mangles
    const glb = new Uint8Array([
      0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00,
      0x1c, 0x00, 0x00, 0x00, 0x00, 0xff, 0xfe, 0x80,
      0xc3, 0x28, 0x00, 0x9f, 0x92, 0xa9, 0x0a, 0x0d,
    ]);
    const client = clientWith((f) => (f === "rigged.glb"
      ? { bytes: glb, ct: "model/gltf-binary" }
      : { body: "x", ct: "application/octet-stream" }));
    const arts = await fetchOutputs(client, runDir, {
      outputs: { glb: { "3d": [{ filename: "rigged.glb", subfolder: "", type: "output" }] } },
    });
    expect(arts.length).toBe(1);
    // the subfolder-less spelling lands under its own name (the
    // node-prefixed name is the subfoldered arm's) — and the path the
    // harvest RETURNS is the file it wrote
    expect(arts[0]).toBe(join(runDir, "rigged.glb"));
    const written = readFileSync(join(runDir, "rigged.glb"));
    expect(written.length).toBe(glb.length);
    expect(Buffer.compare(written, Buffer.from(glb))).toBe(0);
  });

  it("the SEMANTIC RECORDS path writes the same bytes (not just the shape)", async () => {
    // fetchOutputArtifacts is the record-writing face: the shape was
    // pinned, the bytes were not.
    const runDir = join(DIR, "records-bytes");
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x80, 0xff, 0xfe, 0x7f]);
    const client = clientWith((f) => (f === "clip.wav"
      ? { bytes: wav, ct: "audio/wav" }
      : { body: "x", ct: "application/octet-stream" }));
    const records = await fetchOutputArtifacts(client, runDir, {
      outputs: { snd: { audio: [{ filename: "clip.wav", subfolder: "", type: "output" }] } },
    });
    expect(records.length).toBe(1);
    const written = readFileSync(records[0]!.path);
    expect(Buffer.compare(written, Buffer.from(wav))).toBe(0);
  });

  it("THE SAVETEXT HARVEST (the tagger publish-plane gap): the engine's SaveText ui dict (text + files — comfy_extras/nodes_text.py returns ui={text, files:[SavedResult]}) harvests its .txt through the files kind", async () => {
    const runDir = join(DIR, "savetext");
    const client = clientWith((f) => (f === "tags_00001_.txt"
      ? { body: "1girl, solo", ct: "text/plain; charset=utf-8" }
      : { body: "x", ct: "application/octet-stream" }));
    const records = await fetchOutputArtifacts(client, runDir, {
      outputs: {
        "SaveText.0": {
          text: ["1girl, solo"],
          files: [{ filename: "tags_00001_.txt", subfolder: "run-abc/tagger", type: "output" }],
        },
      },
    });
    expect(records.length).toBe(1);
    expect(records[0]!.nodeId).toBe("SaveText.0");
    expect(records[0]!.kind).toBe("files");
    expect(fileOf(records[0]!.path)).toBe("SaveText.0_tags_00001_.txt");
    expect(readFileSync(records[0]!.path, "utf8")).toBe("1girl, solo");
  });
  it("semantic records retain producer node provenance", async () => {
    const runDir = join(DIR, "records");
    const client = clientWith(() => ({ body: "x", ct: "application/octet-stream" }));
    const records = await fetchOutputArtifacts(client, runDir, {
      outputs: {
        pose: { three_model: [{ filename: "motion.npz", subfolder: "run", type: "output" }] },
        glb: { "3d": [{ filename: "rigged.glb", subfolder: "run", type: "output" }] },
      },
    });
    expect(records).toEqual([
      { nodeId: "pose", path: join(runDir, "pose_motion.npz"), kind: "three_model" },
      { nodeId: "glb", path: join(runDir, "glb_rigged.glb"), kind: "3d" },
    ]);
  });
  it("tuple rows harvest (filename, subfolder, type) with tolls", async () => {
    const runDir = join(DIR, "tuple");
    const client = clientWith(() => ({ body: "t", ct: "application/octet-stream" }));
    const arts = await fetchOutputs(client, runDir, {
      outputs: {
        n1: {
          images: [["t1.png", "s", "temp"], ["t2.png"], ["t3.png", 7]],
          audio: [["t4.wav", "", ""]],
        },
      },
    });
    expect(arts.length).toBe(4);
    expect(fileOf(arts[0] ?? "")).toBe("n1_t1.png");
    expect(fileOf(arts[1] ?? "")).toBe("t2.png");
    expect(fileOf(arts[2] ?? "")).toBe("t3.png");
    expect(fileOf(arts[3] ?? "")).toBe("t4.wav");
  });
  it("a flat result row (strings) harvests as one row", async () => {
    const runDir = join(DIR, "flat");
    const client = clientWith(() => ({ body: '{"a":1}', ct: "application/json" }));
    const arts = await fetchOutputs(client, runDir, {
      outputs: { n1: { result: ["r1.json", "", "output"] } },
    });
    expect(arts.length).toBe(1);
    expect(readFileSync(join(runDir, "r1.json"), "utf8")).toBe('{\n  "a": 1\n}');
  });
  it("invalid JSON bytes ride raw (the catch never kills the harvest)", async () => {
    const runDir = join(DIR, "badjson");
    const client = clientWith(() => ({ body: "not json", ct: "application/json" }));
    const arts = await fetchOutputs(client, runDir, {
      outputs: { n1: { result: [["r2.json", "", ""]] } },
    });
    expect(fileOf(arts[0] ?? "")).toBe("r2.json");
    expect(readFileSync(join(runDir, "r2.json"), "utf8")).toBe("not json");
  });
  it("non-object outputs, non-object node rows, non-array kinds, and rowless files skip", async () => {
    const runDir = join(DIR, "skip");
    const client = clientWith(() => ({ body: "x", ct: "text/plain" }));
    expect(await fetchOutputs(client, runDir, { outputs: "flat" })).toEqual([]);
    expect(await fetchOutputs(client, runDir, { outputs: ["a"] })).toEqual([]);
    expect(await fetchOutputs(client, runDir, { outputs: { n1: "scalar" } })).toEqual([]);
    expect(await fetchOutputs(client, runDir, { outputs: { n1: { images: "nope" } } })).toEqual([]);
    expect(await fetchOutputs(client, runDir, { outputs: { n1: { images: [{}] } } })).toEqual([]);
    expect(await fetchOutputs(client, runDir, { outputs: { n1: { images: [5] } } })).toEqual([]);
    expect(await fetchOutputs(client, runDir, { outputs: { n1: { images: [[""] ] } } })).toEqual([]);
    expect(await fetchOutputs(client, runDir, {})).toEqual([]);
  });
  it("a headerless response rides raw (the ?? \"\" toll)", async () => {
    const runDir = join(DIR, "noct");
    const client = {
      fetchApi: async () => ({
        headers: { get: () => null },
        arrayBuffer: async () => new TextEncoder().encode("raw"),
      }),
    } as unknown as Client;
    const arts = await fetchOutputs(client, runDir, {
      outputs: { n1: { images: [{ filename: "x.png" }] } },
    });
    expect(readFileSync(join(runDir, "x.png"), "utf8")).toBe("raw");
    expect(arts.length).toBe(1);
  });
  // THE SPLIT CATCH (audit M-S9): the remote half folds (the wall
  // below), the LOCAL write throws loud — a directory squatting on
  // the artifact's name makes writeFileSync fail, and a disk-full
  // or permission failure must never silently shrink the artifact
  // set a success receipt then attests to.
  it("a local write failure rejects the harvest (never a silent partial artifact set)", async () => {
    const runDir = join(DIR, "eisdir");
    mkdirSync(join(runDir, "out.png"), { recursive: true });
    const client = clientWith(() => ({ body: "b", ct: "application/octet-stream" }));
    await expect(
      fetchOutputs(client, runDir, {
        outputs: { n1: { images: [{ filename: "out.png", subfolder: "", type: "output" }] } },
      }),
    ).rejects.toThrow(/EISDIR|EPERM|EACCES/u);
  });

  it("one unreachable artifact never kills the harvest", async () => {
    const runDir = join(DIR, "mixed");
    const client = clientWith((f) => (f === "dead.png" ? null : { body: "ok", ct: "text/plain" }));
    const arts = await fetchOutputs(client, runDir, {
      outputs: {
        n1: { images: [{ filename: "dead.png" }, { filename: "live.png" }] },
      },
    });
    expect(arts.length).toBe(1);
    expect(fileOf(arts[0] ?? "")).toBe("live.png");
    expect(readFileSync(join(runDir, "live.png"), "utf8")).toBe("ok");
  });
});

describe("qvoicePathsOf (THE QVOICE CHANNEL — the export FULL PATH, roadmap OWED 2026-09-24)", () => {
  it("lifts the first engine-reported mint path verbatim (history ui shape)", () => {
    const outputs = {
      "10": {
        qvoice_path: ["/mnt/data/models/audio/voices/night-keeper_17.qvoice"],
        mode: ["export_lite"],
      },
    };
    expect(qvoicePathsOf(outputs)).toBe(
      "/mnt/data/models/audio/voices/night-keeper_17.qvoice",
    );
  });
  it("first non-empty across nodes; blanks and non-strings skip", () => {
    expect(
      qvoicePathsOf({
        a: { qvoice_path: ["", "  "] },
        b: { qvoice_path: ["/voices/x_2.qvoice"] },
      }),
    ).toBe("/voices/x_2.qvoice");
    expect(qvoicePathsOf({ a: { qvoice_path: "not-a-list" } })).toBe("");
  });
  it("no qvoice node, garbage shapes, absent outputs — empty string, never a throw", () => {
    expect(qvoicePathsOf({ a: { images: [{ filename: "p.png" }] } })).toBe("");
    expect(qvoicePathsOf(undefined)).toBe("");
    expect(qvoicePathsOf(null)).toBe("");
    expect(qvoicePathsOf([1, 2])).toBe("");
    expect(qvoicePathsOf({ a: null, b: 3, c: "x" })).toBe("");
  });
});

describe("publishOutputChannels (the declared-channel law)", () => {  it("first unmatched artifact wins per channel, declaration order, claimed across channels", () => {
    const out = publishOutputChannels(
      { hero: "image", clip: "video", other: "mesh" },
      ["/r/a.mp4", "/r/b.png", "/r/c.glb"],
    );
    expect(out).toEqual({ hero: "/r/b.png", clip: "/r/a.mp4", other: "/r/c.glb" });
  });
  // THE BOUND ARM'S KIND LAW: a binding says which node serves the
  // channel, not that the node's artifact is of that kind. An action
  // that returned its PROOF RENDERER published a PNG as a `mesh`
  // channel this way, and every gate stayed green — the mistake was
  // visible only in a live run's own assertion.
  it("a BOUND node whose artifact is the wrong kind publishes nothing", () => {
    // (outputs, artifacts, bindings, records) — the bound arm reads
    // the RECORDS list, the unbound arm the paths.
    const artifacts = ["/r/proof_0001_.png", "/r/skin_body_0001_.glb"];
    const records = [
      { nodeId: "RayRenderGLBViews.0", path: "/r/proof_0001_.png" },
      { nodeId: "SkinApply.0", path: "/r/skin_body_0001_.glb" },
    ];
    // the renderer bound to a mesh channel: refused, and the mesh
    // channel takes the artifact that IS a mesh
    expect(
      publishOutputChannels(
        { skin: "mesh" },
        artifacts,
        { skin: "RayRenderGLBViews.0" },
        records as never,
      ),
    ).toEqual({});
    // the grafted body bound to the same channel: published
    expect(
      publishOutputChannels(
        { skin: "mesh" },
        artifacts,
        { skin: "SkinApply.0" },
        records as never,
      ),
    ).toEqual({ skin: "/r/skin_body_0001_.glb" });
    // an image channel bound to the renderer is fine (kind agrees)
    expect(
      publishOutputChannels(
        { proof: "image" },
        artifacts,
        { proof: "RayRenderGLBViews.0" },
        records as never,
      ),
    ).toEqual({ proof: "/r/proof_0001_.png" });
  });
  it("an artifact claimed once never republishes", () => {
    const out = publishOutputChannels(
      { one: "image", two: "image" },
      ["/r/a.png"],
    );
    expect(out).toEqual({ one: "/r/a.png" });
  });
  it("unknown kinds and empty artifacts publish nothing", () => {
    expect(publishOutputChannels({ x: "weird" }, ["/r/a.png"])).toEqual({});
    expect(publishOutputChannels({}, ["/r/a.png"])).toEqual({});
    expect(publishOutputChannels({ hero: "image" }, [])).toEqual({});
    expect(publishOutputChannels(undefined as never, [])).toEqual({});
    expect(publishOutputChannels({ hero: "image" }, undefined as never)).toEqual({});
  });
  it("case-insensitive extension matching", () => {
    const out = publishOutputChannels({ hero: "image" }, ["/r/A.PNG"]);
    expect(out).toEqual({ hero: "/r/A.PNG" });
  });
  it("THE MASK CHANNEL (stroke-103 debt): a declared 'seg' channel publishes mask PNGs — before the row existed the channel was skipped SILENTLY and mask runs surfaced zero outputs", () => {
    const out = publishOutputChannels(
      { default: "seg" },
      ["/r/mask/mask_figure_1_00001_.png", "/r/mask/mask_combined_00001_.png"],
    );
    expect(out).toEqual({ default: "/r/mask/mask_figure_1_00001_.png" });
    // an image channel and a seg channel in one stage split by declaration order, claimed across
    const both = publishOutputChannels(
      { hero: "seg", preview: "image" },
      ["/r/mask_combined_00001_.png", "/r/render.png"],
    );
    expect(both).toEqual({ hero: "/r/mask_combined_00001_.png", preview: "/r/render.png" });
  });
  it("THE TEXT CHANNEL (the tagger publish-plane gap): a declared 'text' channel publishes SaveText mints — before the row existed the channel was skipped SILENTLY and tagger runs surfaced zero outputs", () => {
    const out = publishOutputChannels(
      { default: "text" },
      ["/r/run-abc/tagger/SaveText.0_tags_00001_.txt"],
    );
    expect(out).toEqual({ default: "/r/run-abc/tagger/SaveText.0_tags_00001_.txt" });
    // every SaveText format the engine mints (comfy_extras/nodes_text.py
    // FORMAT_EXTENSIONS) publishes through the text channel
    for (const minted of ["tags_00001_.txt", "caption_00001_.csv", "notes_00001_.md", "kind_00001_.json"]) {
      expect(publishOutputChannels({ default: "text" }, [`/r/${minted}`])).toEqual({
        default: `/r/${minted}`,
      });
    }
    // case-insensitive, like every other file kind
    expect(publishOutputChannels({ default: "text" }, ["/r/TAGS_00001_.TXT"])).toEqual({
      default: "/r/TAGS_00001_.TXT",
    });
  });
  it("THE TEXT CHANNEL'S REFUSAL: an unbound declared text channel with no artifact refuses loud (never a silent zero-output run)", () => {
    expect(() => assertPublishedOutputChannels({ default: "text" }, {}, {})).toThrow(
      /declared text output 'default' produced no artifact/,
    );
  });
  it("a BOUND SaveText node publishes its .txt through the text channel (the tagger merge path)", () => {
    const artifacts = ["/r/tagger/SaveText.0_tags_00001_.txt"];
    const records = [
      { nodeId: "SaveText.0", path: "/r/tagger/SaveText.0_tags_00001_.txt", kind: "files" },
    ];
    expect(
      publishOutputChannels(
        { default: "text" },
        artifacts,
        { default: "SaveText.0" },
        records as never,
      ),
    ).toEqual({ default: "/r/tagger/SaveText.0_tags_00001_.txt" });
    // ... and the assert stays silent when the bound mint exists
    expect(() =>
      assertPublishedOutputChannels(
        { default: "text" },
        { default: "/r/tagger/SaveText.0_tags_00001_.txt" },
        { default: "SaveText.0" },
      ),
    ).not.toThrow();
    // ... but names the channel when the bound node produced nothing
    const empty = publishOutputChannels({ default: "text" }, [], { default: "SaveText.0" }, []);
    expect(() =>
      assertPublishedOutputChannels({ default: "text" }, empty, { default: "SaveText.0" }),
    ).toThrow(/default/);
  });
  it("declared node bindings publish semantic producers without extension guessing", () => {
    const records = [
      { nodeId: "video", path: "/r/final.mp4", kind: "video" },
      { nodeId: "pose", path: "/r/motion.npz", kind: "three_model" },
    ];
    const outputs = { final: "video", motion_npz: "data" };
    const bindings = { final: "video", motion_npz: "pose" };
    const published = publishOutputChannels(outputs, records.map((record) => record.path), bindings, records);
    expect(published).toEqual({ final: "/r/final.mp4", motion_npz: "/r/motion.npz" });
    expect(() => assertPublishedOutputChannels(outputs, published, bindings)).not.toThrow();
  });
  it("a declared producer with no harvested artifact refuses loudly", () => {
    const outputs = { motion_npz: "data" };
    const bindings = { motion_npz: "pose" };
    const published = publishOutputChannels(outputs, [], bindings, []);
    expect(() => assertPublishedOutputChannels(outputs, published, bindings)).toThrow(/motion_npz/);
  });
  it("an unbound declared file channel refuses when no artifact was published", () => {
    expect(() => assertPublishedOutputChannels({ hero: "image" }, {}, {})).toThrow(
      /declared image output 'hero' produced no artifact/,
    );
    expect(() => assertPublishedOutputChannels({ mystery: "unknown" }, {}, {})).not.toThrow();
  });
});

describe("mapHistoryEntry (the verdict)", () => {
  it("null/undefined entries are pending", () => {
    expect(mapHistoryEntry(null)).toEqual({ kind: "pending" });
    expect(mapHistoryEntry(undefined)).toEqual({ kind: "pending" });
  });
  it("a non-object status tolls to {} (pending)", () => {
    expect(mapHistoryEntry({ status: "flat" })).toEqual({ kind: "pending" });
    expect(mapHistoryEntry({ status: null })).toEqual({ kind: "pending" });
    expect(mapHistoryEntry({ status: ["x"] })).toEqual({ kind: "pending" });
    expect(mapHistoryEntry({})).toEqual({ kind: "pending" });
  });
  it("error status with an execution_error message voices the CAUSE first (F-1: node_id alone starved the 400-char budget; the agent never saw WHY)", () => {
    const v = mapHistoryEntry({
      status: {
        status_str: "error",
        messages: [[
          "execution_error",
          {
            node_id: "h3-film::window2_SamplerCustomAdvanced.1",
            node_type: "SamplerCustomAdvanced",
            executed: ["a", "b", "c", "d", "e", "f", "g", "h"],
            exception_type: "torch.cuda.OutOfMemoryError",
            exception_message: "CUDA out of memory. Tried to allocate 2.50 GiB.",
            traceback: "frame1\nframe2\nframe3",
          },
        ], ["noise", 1]],
      },
    });
    expect(v.kind).toBe("failed");
    const detail = (v as { detail: string }).detail;
    expect(detail).toContain("torch.cuda.OutOfMemoryError");
    expect(detail).toContain("CUDA out of memory. Tried to allocate 2.50 GiB.");
    expect(detail).toContain("h3-film::window2_SamplerCustomAdvanced.1");
    expect(detail).toContain("8 nodes executed before the failure");
    expect(detail).toContain("frame3"); // the traceback tail (raise site) rides
    expect(detail.indexOf("torch.cuda")).toBeLessThan(detail.indexOf("nodes executed")); // cause BEFORE bookkeeping
  });
  it("an execution_error without exception fields still names the node", () => {
    const v = mapHistoryEntry({
      status: { status_str: "error", messages: [["execution_error", { node: 7, reason: "oom" }], ["noise", 1]] },
    });
    expect(v).toEqual({ kind: "failed", detail: "execution failed @ 7 (?)" });
  });
  it("non-object execution_error payloads use the bounded JSON voice", () => {
    const v = mapHistoryEntry({
      status: { status_str: "error", messages: [["execution_error", "plain failure"]] },
    });
    expect(v).toEqual({ kind: "failed", detail: '"plain failure"' });
  });
  it("execution errors name missing nodes and single-field causes", () => {
    const missing = mapHistoryEntry({
      status: { status_str: "error", messages: [["execution_error", { exception_type: "TypeOnly" }]] },
    });
    expect((missing as { detail: string }).detail).toBe("TypeOnly @ ? (?)");
    const message = mapHistoryEntry({
      status: { status_str: "error", messages: [["execution_error", { exception_message: "MessageOnly" }]] },
    });
    expect((message as { detail: string }).detail).toBe("ExecutionError: MessageOnly @ ? (?)");
  });
  it("execution errors trim a long traceback and bound a long rendered cause", () => {
    const longTrace = mapHistoryEntry({
      status: {
        status_str: "error",
        messages: [["execution_error", {
          node_id: "n1",
          node_type: "Node",
          exception_type: "Boom",
          exception_message: "failed",
          traceback: "x".repeat(601),
        }]],
      },
    });
    expect((longTrace as { detail: string }).detail).toContain("traceback tail: …");
    const longCause = mapHistoryEntry({
      status: {
        status_str: "error",
        messages: [["execution_error", {
          node_id: "n1",
          exception_message: "m".repeat(2100),
        }]],
      },
    });
    expect((longCause as { detail: string }).detail.length).toBeLessThanOrEqual(2001);
  });
  it("non-array message rows ride the whole-rec voice too", () => {
    const v = mapHistoryEntry({
      status: { status_str: "error", messages: ["plain", { o: 1 }, ["x"]] },
    });
    expect(v.kind).toBe("failed");
    expect((v as { detail: string }).detail).toContain("status_str");
  });
  it("error status without the message voices the whole rec (sliced)", () => {
    const v = mapHistoryEntry({ status: { status_str: "error", messages: "flat" } });
    expect(v.kind).toBe("failed");
    expect((v as { detail: string }).detail).toContain("status_str");
  });
  it("completed only on the true flag", () => {
    expect(mapHistoryEntry({ status: { completed: true } })).toEqual({ kind: "completed" });
    expect(mapHistoryEntry({ status: { completed: "yes" } })).toEqual({ kind: "pending" });
  });
});

describe("qvoiceFreshnessOf (the freshness receipt — which voice won, and did it predate the run)", () => {
  it("lifts the first coherent reused+file pair from the history ui shape", () => {
    expect(qvoiceFreshnessOf({
      "7": { reused_existing: [false], voice_file: ["harbour_2.qvoice"], voice_mtime: [1758900000.5] },
    })).toEqual({ reused_existing: false, voice_file: "harbour_2.qvoice" });
  });
  it("THE UI LIST LAW both ways: bare scalars lift too; incoherent or half pairs skip; first coherent across nodes wins", () => {
    expect(qvoiceFreshnessOf({ a: { reused_existing: true, voice_file: "old.qvoice" } }))
      .toEqual({ reused_existing: true, voice_file: "old.qvoice" });
    expect(qvoiceFreshnessOf({
      a: { reused_existing: "yes", voice_file: "x.qvoice" },
      b: { reused_existing: [true] },
      c: { voice_file: ["orphan.qvoice"] },
      d: { reused_existing: [true], voice_file: ["won.qvoice"] },
    })).toEqual({ reused_existing: true, voice_file: "won.qvoice" });
    expect(qvoiceFreshnessOf({ a: { reused_existing: [], voice_file: [] } })).toBe(null);
    // a node row that is not a row at all (scalar / list / null) is
    // SKIPPED, never read as a freshness pair (2026-09-26)
    expect(qvoiceFreshnessOf({
      a: "scalar", b: [true, "x.qvoice"], c: null, d: 7,
      e: { reused_existing: [false], voice_file: ["harbour_2.qvoice"] },
    })).toEqual({ reused_existing: false, voice_file: "harbour_2.qvoice" });
    expect(qvoiceFreshnessOf({ a: "scalar", b: [1], c: null })).toBe(null);
    expect(qvoiceFreshnessOf(undefined)).toBe(null);
    expect(qvoiceFreshnessOf([])).toBe(null);
  });
});

describe("loudnessOf (§39's loudness receipt — the meter's reading rides the stage result)", () => {
  it("lifts the first finite lufs+peak pair from the history ui shape", () => {
    expect(loudnessOf({
      "42": { loudness_lufs: -18.42, peak_db: -1.2, sample_rate: [48000] },
    })).toEqual({ loudness_lufs: -18.42, peak_db: -1.2 });
  });
  it("first finite across nodes; non-numeric and half-pairs skip", () => {
    expect(loudnessOf({
      a: { loudness_lufs: "loud", peak_db: -1 },
      b: { loudness_lufs: -20 },
      c: { loudness_lufs: -14.0, peak_db: -0.5 },
    })).toEqual({ loudness_lufs: -14.0, peak_db: -0.5 });
    expect(loudnessOf({ a: { loudness_lufs: Number.NaN } })).toBe(null);
    expect(loudnessOf(undefined)).toBe(null);
    expect(loudnessOf([])).toBe(null);
    // THE UI LIST LAW: the nodes write 1-lists (ComfyUI's merge
    // extends lists, scalars kill the prompt) — both shapes lift
    expect(loudnessOf({ m: { loudness_lufs: [-20.5], peak_db: [-16.3] } }))
      .toEqual({ loudness_lufs: -20.5, peak_db: -16.3 });
    // a mixed pair (list + bare) still lifts; an empty list never does
    expect(loudnessOf({ m: { loudness_lufs: [-20.5], peak_db: -16.3 } }))
      .toEqual({ loudness_lufs: -20.5, peak_db: -16.3 });
    expect(loudnessOf({ m: { loudness_lufs: [], peak_db: [-16.3] } })).toBe(null);
    expect(loudnessOf({ m: { loudness_lufs: ["bad"], peak_db: [-16.3] } })).toBe(null);
    // a NON-OBJECT node row (a bare string/array rides the dict):
    // the continue arm — never a throw, never a fabricated pair
    expect(loudnessOf({ save: "oops", meter: { loudness_lufs: -20, peak_db: -16 } }))
      .toEqual({ loudness_lufs: -20, peak_db: -16 });
    expect(loudnessOf({ save: "oops", up: null })).toBe(null);
    expect(loudnessOf({ save: ["x"] })).toBe(null);
  });
});

describe("CHANNEL_EXTS table", () => {
  it("the six file kinds carry their extensions (seg = the mask channel, stroke-103 debt; text = the tagger channel, SaveText's own format set)", () => {
    expect(Object.keys(CHANNEL_EXTS).sort()).toEqual(["audio", "image", "mesh", "seg", "text", "video"]);
    expect(CHANNEL_EXTS.seg).toEqual([".png"]);
    expect(CHANNEL_EXTS.text).toEqual([".txt", ".csv", ".md", ".json"]);
  });
});
