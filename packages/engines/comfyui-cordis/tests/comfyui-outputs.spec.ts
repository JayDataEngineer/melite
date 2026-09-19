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
  fetchOutputs,
  publishOutputChannels,
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
  serve: (filename: string) => { body: string; ct: string } | null,
): Client =>
  ({
    fetchApi: async (url: string) => {
      const name = new URL("http://x" + String(url)).searchParams.get("filename") ?? "";
      const hit = serve(name);
      if (hit === null) throw new Error("unreachable");
      return new Response(hit.body, {
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

describe("publishOutputChannels (the declared-channel law)", () => {
  it("first unmatched artifact wins per channel, declaration order, claimed across channels", () => {
    const out = publishOutputChannels(
      { hero: "image", clip: "video", other: "mesh" },
      ["/r/a.mp4", "/r/b.png", "/r/c.glb"],
    );
    expect(out).toEqual({ hero: "/r/b.png", clip: "/r/a.mp4", other: "/r/c.glb" });
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
  it("error status with an execution_error message voices it", () => {
    const v = mapHistoryEntry({
      status: {
        status_str: "error",
        messages: [["execution_error", { node: 7, reason: "oom" }], ["noise", 1]],
      },
    });
    expect(v).toEqual({ kind: "failed", detail: JSON.stringify({ node: 7, reason: "oom" }).slice(0, 400) });
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

describe("CHANNEL_EXTS table", () => {
  it("the four file kinds carry their extensions", () => {
    expect(Object.keys(CHANNEL_EXTS).sort()).toEqual(["audio", "image", "mesh", "video"]);
  });
});
