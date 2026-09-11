// upload-referenced.spec.ts — the linked-input arm (2026-09-10).
//
// A stage wired to an upstream card's output arrives at submit as
// that output's asset URL (/v1/assets/runs/… — the editor injects
// it at compile). The walk used to stage local files ONLY, so the
// URL rode into LoadImage verbatim and the run died on the engine —
// every chained run was broken. Now http(s) values fetch (the asset
// door is open GET), stage to tmp, and upload exactly like a local
// file; a dead URL refuses LOUD, never a dangling URL in the graph.
//
// Stub ComfyUI: GET serves bytes (or 404), POST /upload/image
// answers {name}. No engine, no gateway.
//
// Run: npx vitest run tests/walls/ts/suites/upload-referenced.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { uploadReferenced } from "../../../../packages/engines/comfyui-cordis/src/comfyui.ts";
import { resolveLinkedInput } from "../../../../packages/engines/comfyui-cordis/src/linked.ts";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

const stub = (getStatus: number) => createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload/image") {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ name: "staged.png", subfolder: "", type: "input" }));
    });
    return;
  }
  if (req.method === "GET" && req.url === "/v1/assets/runs/r1/out.png") {
    if (getStatus === 200) {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(PNG);
    } else {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "artifact not found" }));
    }
    return;
  }
  res.writeHead(404);
  res.end();
});

const listen = (s: ReturnType<typeof createServer>): Promise<string> =>
  new Promise((resolve) => s.listen(0, "127.0.0.1", () => {
    const a = s.address();
    resolve(`http://127.0.0.1:${typeof a === "object" && a !== null ? a.port : 0}`);
  }));

const graphFor = (image: string) => ({
  "1": { class_type: "LoadImage", inputs: { image } },
});

describe("uploadReferenced linked-input arm", () => {
  it("an asset URL fetches, stages, and uploads (the chained run)", async () => {
    const s = stub(200);
    const base = await listen(s);
    try {
      const { graph } = await uploadReferenced(base, graphFor(`${base}/v1/assets/runs/r1/out.png`) as never);
      const node = (graph["1"] as { inputs: { image: string } }).inputs;
      assert.equal(node.image, "staged.png");
    } finally {
      s.close();
    }
  });

  it("a dead upstream URL refuses LOUD (never a dangling URL in LoadImage)", async () => {
    const s = stub(404);
    const base = await listen(s);
    try {
      await assert.rejects(
        uploadReferenced(base, graphFor(`${base}/v1/assets/runs/r1/out.png`) as never),
        /linked input fetch failed/,
      );
    } finally {
      s.close();
    }
  });

  it("non-URL values still pass through untouched", async () => {
    const s = stub(200);
    const base = await listen(s);
    try {
      const { graph } = await uploadReferenced(base, {
        "1": { class_type: "KSampler", inputs: { seed: 42, steps: 8 } },
      } as never);
      const node = (graph["1"] as { inputs: Record<string, unknown> }).inputs;
      assert.equal(node.seed, 42);
    } finally {
      s.close();
    }
  });
});

describe("resolveLinkedInput root-relative rewrite", () => {
  // The editor injects upstream outputs root-relative
  // (/v1/assets/runs/…) as well as absolute — the card gates
  // misread the root-relative spelling as an estate path. The
  // resolver rewrites it to the runs-root mount path (same estate,
  // verified at compose); everything else rides verbatim.
  it("a root-relative asset URL becomes the mount path", () => {
    assert.equal(
      resolveLinkedInput("/v1/assets/runs/r1/generate/out.png"),
      join(process.cwd(), "data", "runs", "output", "r1", "generate", "out.png"),
    );
  });

  it("absolute URLs, spells, and estate paths ride verbatim", () => {
    assert.equal(resolveLinkedInput("http://h:1/v1/assets/runs/r1/o.png"), "http://h:1/v1/assets/runs/r1/o.png");
    assert.equal(resolveLinkedInput("$image"), "$image");
    assert.equal(resolveLinkedInput("/mnt/estate/in.png"), "/mnt/estate/in.png");
  });

  it("a rewritten path escaping the runs root refuses loud", () => {
    assert.throws(
      () => resolveLinkedInput("/v1/assets/runs/../../etc/passwd"),
      /escapes the runs root/,
    );
  });
});
