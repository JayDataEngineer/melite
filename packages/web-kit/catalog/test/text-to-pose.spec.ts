// text-to-pose.spec.ts — the poser client: frame slicing, submit/poll/wait,
// cache, models, registry, examples, exports/downloads, constraints,
// scenes, bind joints, re-skin. DOM-touching downloads run against anchor
// + URL stubs; data: URL decodes delegate to the real fetch.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  cancelJob,
  clearPoseCache,
  deformSomaJoints,
  deletePoseCacheEntry,
  deleteConstraints,
  deleteScene,
  downloadAMASSNpz,
  downloadBVH,
  downloadFBX,
  downloadG1Csv,
  downloadServerVideo,
  exportBVH,
  fetchBindJoints,
  formatBytes,
  generatePose,
  listConstraints,
  listExamples,
  listModels,
  listPoseCache,
  listRegistry,
  listScenes,
  loadConstraints,
  loadExample,
  loadScene,
  pickFrame,
  pollJob,
  preloadForgeService,
  renderServerVideo,
  saveConstraints,
  saveScene,
  sliceFrameAsB64,
  submitTextToPose,
  waitForJob,
} from "../src/text-to-pose.ts";
import type { PoseMotion, TextToPoseRequest } from "../src/text-to-pose.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete (URL as unknown as Record<string, unknown>).createObjectURL;
  delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  delete (globalThis as unknown as Record<string, unknown>).document;
});

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
const stubFetch = (h: Handler): void => {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => h(String(url), init)) as typeof fetch;
};
const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const clicks: string[] = [];
const stubDom = (): void => {
  (URL as unknown as Record<string, unknown>).createObjectURL = () => "blob:fake";
  (URL as unknown as Record<string, unknown>).revokeObjectURL = () => {};
  const anchor = () => ({
    href: "",
    download: "",
    click(this: { download: string }) {
      clicks.push(this.download);
    },
    remove() {},
  });
  (globalThis as unknown as Record<string, unknown>).document = {
    createElement: () => anchor(),
    body: { appendChild() {} },
  };
};

const REQ = { prompt: "walk", seed: null, duration_sec: 1 } as TextToPoseRequest;
const MOTION = {
  fps: 30, frame_count: 2, duration_sec: 1, skeleton: "s", model: "m",
  camera_view: "front", width: 1, height: 1, peak_frame_idx: 0,
  frames_flat: [[1, 2, 3], [4, 5, 6]],
  frames_coco18_3d: [[[0, 0, 0]]],
  frames_soma77_3d: [[[0, 0, 0]]],
  frames_soma77_rotmat: [[[[1, 0, 0], [0, 1, 0], [0, 0, 1]]]],
} as unknown as PoseMotion;
const RESULT = { status: "success", cache_hit: false, inference_time_sec: 1, motion: MOTION } as const;

describe("sliceFrameAsB64", () => {
  // data: URLs decode for real — everything else is stubbed per-test.
  const passthrough = (h: Handler): Handler => (url, init) =>
    url.startsWith("data:") ? realFetch(url, init) : h(url, init);
  const twoFrames = (): string => {
    const f = new Float32Array(12);
    for (let i = 0; i < 12; i++) f[i] = i;
    return Buffer.from(new Uint8Array(f.buffer)).toString("base64");
  };
  const decode = async (b64: string): Promise<number[]> =>
    Array.from(new Float32Array(await (await realFetch(`data:application/octet-stream;base64,${b64}`)).arrayBuffer()));

  it("slices the requested frame and clamps out-of-range indices", async () => {
    stubFetch(passthrough(async () => json({})));
    const multi = twoFrames();
    assert.deepEqual(await decode((await sliceFrameAsB64(multi, 1, 2))!), [6, 7, 8, 9, 10, 11]);
    assert.deepEqual(await decode((await sliceFrameAsB64(multi, -9, 2))!), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(await decode((await sliceFrameAsB64(multi, 99, 2))!), [6, 7, 8, 9, 10, 11]);
  });

  it("returns null for empty buffers and undecodable input", async () => {
    // Empty input resolves to zero bytes (no fetch rejection, so no
    // retry ladder — the ladder is apiFetch's tested contract, not
    // this unit's; the undecodable case DOES ride the real backoff
    // ladder (~3.6s in isolation, more under suite load), so this test
    // carries explicit timeout headroom instead of flaking on the 5s
    // default under parallel jitter (2026-09-12: it failed a commit's
    // full-suite hook at 5.0s while passing in isolation at 3.6s).
    stubFetch(async () => new Response(new Uint8Array(0)));
    assert.equal(await sliceFrameAsB64("", 0, 2), null);
    stubFetch(passthrough(async () => json({})));
    assert.equal(await sliceFrameAsB64("!!!not-base64!!!", 0, 2), null);
  }, 20_000);
});

describe("submitTextToPose", () => {
  it("returns the parsed body on success", async () => {
    stubFetch(async () => json({ job_id: "j1", status: "pending", poll_url: "/p" }));
    assert.deepEqual(await submitTextToPose(REQ), { job_id: "j1", status: "pending", poll_url: "/p" });
  });

  it("reports JSON error bodies, bare text, and schemaless JSON", async () => {
    stubFetch(async () => new Response(JSON.stringify({ error: "nope" }), { status: 400 }));
    await assert.rejects(submitTextToPose(REQ), /Submit failed: HTTP 400 — nope/);
    stubFetch(async () => new Response("boom", { status: 400 }));
    await assert.rejects(submitTextToPose(REQ), /Submit failed: HTTP 400 — boom/);
    stubFetch(async () => new Response("{}", { status: 400 }));
    await assert.rejects(submitTextToPose(REQ), /Submit failed: HTTP 400 — \{\}/);
  });

  it("rejects a 200 with invalid JSON", async () => {
    stubFetch(async () => new Response("xx", { status: 200 }));
    await assert.rejects(submitTextToPose(REQ), /invalid JSON/);
  });
});

describe("pollJob", () => {
  it("returns the status body", async () => {
    stubFetch(async () => json({ job_id: "j", status: "running" }));
    assert.deepEqual(await pollJob("j"), { job_id: "j", status: "running" });
  });

  it("throws not-found, non-ok, and invalid JSON distinctly", async () => {
    stubFetch(async () => new Response("gone", { status: 404 }));
    await assert.rejects(pollJob("j"), /not found/);
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(pollJob("j"), /Poll failed: HTTP 400/);
    stubFetch(async () => new Response("xx", { status: 200 }));
    await assert.rejects(pollJob("j"), /invalid JSON/);
  });
});

describe("waitForJob", () => {
  it("returns the result, reporting each poll", async () => {
    const seen: string[] = [];
    stubFetch(async () => json({ job_id: "j", status: "completed", result: RESULT }));
    const out = await waitForJob("j", {
      intervalMs: 5, timeoutMs: 1000, onUpdate: (s) => { seen.push(s.status); },
    });
    assert.deepEqual(out, RESULT);
    assert.deepEqual(seen, ["completed"]);
  });

  it("uses defaults, skips result-less completions, and sleeps between polls", async () => {
    let n = 0;
    stubFetch(async () => {
      n++;
      return n === 1
        ? json({ job_id: "j", status: "pending" })
        : n === 2
          ? json({ job_id: "j", status: "completed" })
          : json({ job_id: "j", status: "completed", result: RESULT });
    });
    const out = await waitForJob("j");
    assert.deepEqual(out, RESULT);
    assert.equal(n, 3);
  });

  it("throws the backend error, its class, unknown, or cancellation", async () => {
    stubFetch(async () => json({ job_id: "j", status: "failed", error: "kaput" }));
    await assert.rejects(waitForJob("j", { timeoutMs: 1000 }), /kaput/);
    stubFetch(async () => json({ job_id: "j", status: "failed", error_class: "OOM" }));
    await assert.rejects(waitForJob("j", { timeoutMs: 1000 }), /OOM/);
    stubFetch(async () => json({ job_id: "j", status: "failed" }));
    await assert.rejects(waitForJob("j", { timeoutMs: 1000 }), /unknown/);
    stubFetch(async () => json({ job_id: "j", status: "cancelled" }));
    await assert.rejects(waitForJob("j", { timeoutMs: 1000 }), /cancelled/);
  });

  it("times out without polling when the deadline already passed", async () => {
    let n = 0;
    stubFetch(async () => {
      n++;
      return json({ job_id: "j", status: "pending" });
    });
    await assert.rejects(waitForJob("j", { timeoutMs: 0, intervalMs: 1 }), /timed out after 0ms/);
    assert.equal(n, 0);
  });
});

describe("cancelJob + generatePose", () => {
  it("cancel tolerates 404 but reports other failures", async () => {
    stubFetch(async () => new Response("ok", { status: 200 }));
    await cancelJob("j");
    stubFetch(async () => new Response("gone", { status: 404 }));
    await cancelJob("j");
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(cancelJob("j"), /Cancel failed: HTTP 400/);
  });

  it("generatePose submits then waits", async () => {
    stubFetch(async (url, init) =>
      init?.method === "POST"
        ? json({ job_id: "j9", status: "pending", poll_url: "/p" })
        : json({ job_id: "j9", status: "completed", result: RESULT }),
    );
    assert.deepEqual(await generatePose(REQ, { intervalMs: 5, timeoutMs: 1000 }), RESULT);
  });
});

describe("cache, models, registry, examples", () => {
  it("lists the cache and reports failures", async () => {
    stubFetch(async () => json({ entries: [], total_size_bytes: 0, entry_count: 0 }));
    assert.deepEqual(await listPoseCache(), { entries: [], total_size_bytes: 0, entry_count: 0 });
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(listPoseCache(), /Cache list failed/);
  });

  it("deletes entries, tolerating 404", async () => {
    stubFetch(async () => new Response("ok", { status: 200 }));
    await deletePoseCacheEntry("h");
    stubFetch(async () => new Response("gone", { status: 404 }));
    await deletePoseCacheEntry("h");
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(deletePoseCacheEntry("h"), /Cache delete failed/);
  });

  it("clears the cache, returning the count", async () => {
    stubFetch(async () => json({ cleared: 3 }));
    assert.equal(await clearPoseCache(), 3);
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(clearPoseCache(), /Cache clear failed/);
  });

  it("lists models and the registry", async () => {
    stubFetch(async () => json({ models: [], default: "m" }));
    assert.deepEqual(await listModels(), { models: [], default: "m" });
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(listModels(), /Models list failed/);
    stubFetch(async () => json({ datasets: [], tree: {} }));
    assert.deepEqual(await listRegistry(), { datasets: [], tree: {} });
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(listRegistry(), /Registry fetch failed/);
  });

  it("lists examples with and without the model filter", async () => {
    const urls: string[] = [];
    stubFetch(async (url) => {
      urls.push(url);
      return json({ examples: [] });
    });
    await listExamples();
    await listExamples("kimodo");
    assert.ok(urls[0].endsWith("/examples"));
    assert.ok(urls[1].includes("?model=kimodo"));
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(listExamples(), /Examples list failed/);
  });

  it("loads examples with and without ground truth", async () => {
    const urls: string[] = [];
    stubFetch(async (url) => {
      urls.push(url);
      return json({ id: "e", model: "m", meta: {} });
    });
    await loadExample("m", "e");
    await loadExample("m", "e", true);
    assert.ok(!urls[0].includes("load_gt"));
    assert.ok(urls[1].includes("?load_gt=true"));
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(loadExample("m", "e"), /Example load failed/);
  });
});

describe("exportBVH", () => {
  it("returns the payload and reports both error shapes", async () => {
    stubFetch(async () => json({ bvh: "B", frames: 1, joints: 77 }));
    assert.deepEqual(
      await exportBVH([[[0]]], [[[[1]]]], 30),
      { bvh: "B", frames: 1, joints: 77 },
    );
    stubFetch(async () => json({ error: "nope" }, 400));
    await assert.rejects(exportBVH([[[0]]], [[[[1]]]], 30), /nope/);
    stubFetch(async () => json({}, 400));
    await assert.rejects(exportBVH([[[0]]], [[[[1]]]], 30), /BVH export failed: HTTP 400/);
  });
});

describe("downloads", () => {
  it("downloadBVH refuses incomplete motion", async () => {
    stubFetch(async () => json({}));
    await assert.rejects(downloadBVH({} as PoseMotion), /missing SOMA-77/);
    await assert.rejects(
      downloadBVH({ frames_soma77_3d: [] } as unknown as PoseMotion), /missing SOMA-77/,
    );
    await assert.rejects(
      downloadBVH({ frames_soma77_rotmat: [] } as unknown as PoseMotion), /missing SOMA-77/,
    );
  });

  it("downloadBVH reports export errors and saves on success", async () => {
    stubDom();
    stubFetch(async () => json({ error: "nope" }, 400));
    await assert.rejects(downloadBVH(MOTION), /nope/);
    stubFetch(async () => json({}, 400));
    await assert.rejects(downloadBVH(MOTION), /BVH export failed/);
    stubFetch(async () => json({ bvh: "B" }));
    clicks.length = 0;
    await downloadBVH(MOTION);
    assert.equal(clicks.length, 1);
    assert.match(clicks[0], /\.bvh$/);
  });

  it("downloadAMASSNpz and downloadG1Csv guard, report, and save", async () => {
    stubDom();
    for (const [fn, ext] of [[downloadAMASSNpz, /\.npz$/], [downloadG1Csv, /\.csv$/]] as const) {
      stubFetch(async () => json({}));
      await assert.rejects(fn({} as PoseMotion), /missing SOMA-77/);
      stubFetch(async () => json({ error: "nope" }, 400));
      await assert.rejects(fn(MOTION), /nope/);
      stubFetch(async () => json({}, 400));
      await assert.rejects(fn(MOTION), /export failed/);
      stubFetch(async () => json({ data_b64: Buffer.from([1, 2, 3]).toString("base64") }));
      clicks.length = 0;
      await fn(MOTION);
      assert.equal(clicks.length, 1);
      assert.match(clicks[0], ext);
    }
  });

  it("downloadFBX guards, reports, and forwards the mixamo flag", async () => {
    stubDom();
    const bodies: unknown[] = [];
    stubFetch(async () => json({}));
    await assert.rejects(downloadFBX({} as PoseMotion), /missing SOMA-77/);
    stubFetch(async () => json({ error: "nope" }, 400));
    await assert.rejects(downloadFBX(MOTION), /nope/);
    stubFetch(async () => json({}, 400));
    await assert.rejects(downloadFBX(MOTION), /FBX export failed/);
    stubFetch(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return json({ fbx: "F" });
    });
    clicks.length = 0;
    await downloadFBX(MOTION);
    await downloadFBX(MOTION, false);
    assert.deepEqual((bodies[0] as { mixamo: boolean }).mixamo, true);
    assert.deepEqual((bodies[1] as { mixamo: boolean }).mixamo, false);
    assert.equal(clicks.length, 2);
    assert.match(clicks[0], /\.fbx$/);
  });

  it("renderServerVideo honors option defaults and reports errors", async () => {
    const bodies: unknown[] = [];
    stubFetch(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return json({ video_b64: Buffer.from([9]).toString("base64"), mime: "video/mp4" });
    });
    const blob = await renderServerVideo(MOTION);
    assert.ok(blob instanceof Blob);
    assert.deepEqual(
      bodies[0] as object,
      { frames_flat: [[1, 2, 3], [4, 5, 6]], fps: 30, width: 512, height: 512, background: "#0d2847" },
    );
    await renderServerVideo(MOTION, { width: 64, height: 64, background: "#fff" });
    assert.deepEqual((bodies[1] as { width: number }).width, 64);
    stubFetch(async () => json({ error: "nope" }, 400));
    await assert.rejects(renderServerVideo(MOTION), /nope/);
    stubFetch(async () => json({}, 400));
    await assert.rejects(renderServerVideo(MOTION), /Video render failed/);
  });

  it("downloadServerVideo renders then saves", async () => {
    stubDom();
    stubFetch(async () => json({ video_b64: Buffer.from([9]).toString("base64") }));
    clicks.length = 0;
    await downloadServerVideo(MOTION);
    assert.equal(clicks.length, 1);
    assert.match(clicks[0], /\.mp4$/);
  });
});

describe("constraints", () => {
  it("lists entries, defaulting when absent", async () => {
    stubFetch(async () => json({ entries: [{ name: "n" }] }));
    assert.deepEqual(await listConstraints(), [{ name: "n" }]);
    stubFetch(async () => json({}));
    assert.deepEqual(await listConstraints(), []);
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(listConstraints(), /Constraints list failed/);
  });

  it("saves, reporting both error shapes", async () => {
    stubFetch(async () => new Response("ok", { status: 200 }));
    await saveConstraints("n", {});
    stubFetch(async () => json({ error: "nope" }, 400));
    await assert.rejects(saveConstraints("n", {}), /nope/);
    stubFetch(async () => json({}, 400));
    await assert.rejects(saveConstraints("n", {}), /Save failed/);
  });

  it("loads and deletes, tolerating 404 on delete", async () => {
    stubFetch(async () => json({ constraints: [1] }));
    assert.deepEqual(await loadConstraints("f"), [1]);
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(loadConstraints("f"), /Load failed/);
    stubFetch(async () => new Response("ok", { status: 200 }));
    await deleteConstraints("f");
    stubFetch(async () => new Response("gone", { status: 404 }));
    await deleteConstraints("f");
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(deleteConstraints("f"), /Delete failed/);
  });
});

describe("scenes", () => {
  it("lists entries, defaulting when absent", async () => {
    stubFetch(async () => json({ entries: [{ name: "n" }] }));
    assert.deepEqual(await listScenes(), [{ name: "n" }]);
    stubFetch(async () => json({}));
    assert.deepEqual(await listScenes(), []);
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(listScenes(), /Scenes list failed/);
  });

  it("saves, reporting both error shapes", async () => {
    stubFetch(async () => new Response("ok", { status: 200 }));
    await saveScene("n", {});
    stubFetch(async () => json({ error: "nope" }, 400));
    await assert.rejects(saveScene("n", {}), /nope/);
    stubFetch(async () => json({}, 400));
    await assert.rejects(saveScene("n", {}), /Save failed/);
  });

  it("loads and deletes, tolerating 404 on delete", async () => {
    stubFetch(async () => json({ scene: { a: 1 } }));
    assert.deepEqual(await loadScene("f"), { a: 1 });
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(loadScene("f"), /Load failed/);
    stubFetch(async () => new Response("ok", { status: 200 }));
    await deleteScene("f");
    stubFetch(async () => new Response("gone", { status: 404 }));
    await deleteScene("f");
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(deleteScene("f"), /Delete failed/);
  });
});

describe("pickFrame + formatBytes", () => {
  it("clamps the frame index", () => {
    assert.deepEqual(pickFrame(MOTION, 0), [1, 2, 3]);
    assert.deepEqual(pickFrame(MOTION, -5), [1, 2, 3]);
    assert.deepEqual(pickFrame(MOTION, 99), [4, 5, 6]);
  });

  it("formats bytes, kilobytes, and megabytes", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2.0 KB");
    assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB");
  });
});

describe("fetchBindJoints", () => {
  it("GETs the neutral joints by default and reports failures", async () => {
    const urls: string[] = [];
    stubFetch(async (url) => {
      urls.push(url);
      return json({ joints: [], identity_model: "anny" });
    });
    assert.deepEqual(await fetchBindJoints(), { joints: [], identity_model: "anny" });
    assert.ok(urls[0].includes("identity_model=anny"));
    // Empty specs stay on GET.
    await fetchBindJoints("mhr", [], {}, {});
    assert.ok(urls[1].includes("identity_model=mhr"));
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(fetchBindJoints(), /Failed to load bind joints/);
  });

  it("POSTs each supplied identity spec and reports failures", async () => {
    const bodies: Record<string, unknown>[] = [];
    stubFetch(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return json({ joints: [], identity_model: "x" });
    });
    await fetchBindJoints("x", [0.5], { jaw: 1 }, { hip: 2 });
    assert.deepEqual(bodies[0], {
      identity_model: "x", identity_coeffs: [0.5], local_changes: { jaw: 1 }, custom_targets: { hip: 2 },
    });
    await fetchBindJoints("x", undefined, { jaw: 1 });
    assert.deepEqual(bodies[1], { identity_model: "x", local_changes: { jaw: 1 } });
    await fetchBindJoints("x", undefined, undefined, { hip: 2 });
    assert.deepEqual(bodies[2], { identity_model: "x", custom_targets: { hip: 2 } });
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(fetchBindJoints("x", [1]), /Failed to load bind joints/);
  });
});

describe("preloadForgeService", () => {
  it("is a no-op echo", async () => {
    assert.deepEqual(await preloadForgeService("svc"), { status: "ok", service: "svc" });
  });
});

describe("deformSomaJoints", () => {
  const joints = (): Float32Array => {
    const j = new Float32Array(77 * 3);
    for (let i = 0; i < j.length; i++) j[i] = i;
    return j;
  };
  const rots = (): Float32Array => {
    const r = new Float32Array(77 * 9);
    for (let i = 0; i < r.length; i++) r[i] = i;
    return r;
  };

  it("sends the full identity + rotation spec and returns the verts", async () => {
    const bodies: Record<string, unknown>[] = [];
    stubFetch(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return json({ vertices_b64: "V" });
    });
    const out = await deformSomaJoints(joints(), "anny", rots(), [0.1], { a: 1 }, { b: 2 }, rots());
    assert.equal(out, "V");
    const b = bodies[0];
    assert.equal((b.frames_soma77_3d as number[][][])[0].length, 77);
    assert.deepEqual((b.frames_soma77_3d as number[][][])[0][1], [3, 4, 5]);
    assert.deepEqual(b.identity_coeffs, [0.1]);
    assert.ok(Array.isArray(b.frames_soma77_rotmat));
    assert.ok(Array.isArray(b.frames_soma77_base_rotmat));
    assert.equal(((b.frames_soma77_rotmat as number[][][][])[0][0][0] as number[]).length, 3);
  });

  it("omits every optional field when unsupplied or undersized", async () => {
    const bodies: Record<string, unknown>[] = [];
    stubFetch(async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return json({ vertices_b64: "V" });
    });
    await deformSomaJoints(joints());
    assert.deepEqual(Object.keys(bodies[0]).sort(), ["binary", "frames_soma77_3d", "identity_model"]);
    // Wrong-length rotation buffers are dropped, not packed.
    await deformSomaJoints(joints(), "anny", new Float32Array(9), undefined, undefined, undefined, new Float32Array(9));
    assert.deepEqual(Object.keys(bodies[1]).sort(), ["binary", "frames_soma77_3d", "identity_model"]);
    // Empty identity spec arrays stay out of the body.
    await deformSomaJoints(joints(), "anny", null, [], {}, {});
    assert.deepEqual(Object.keys(bodies[2]).sort(), ["binary", "frames_soma77_3d", "identity_model"]);
  });

  it("reports transport and backend errors", async () => {
    stubFetch(async () => new Response("bad", { status: 400 }));
    await assert.rejects(deformSomaJoints(joints()), /Re-skin failed/);
    stubFetch(async () => json({ error: "kaput" }));
    await assert.rejects(deformSomaJoints(joints()), /kaput/);
  });
});
