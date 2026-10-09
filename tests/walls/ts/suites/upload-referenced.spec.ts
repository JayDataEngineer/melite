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
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { uploadReferenced } from "../../../../packages/engines/comfyui-cordis/src/comfyui.ts";
import { resolveLinkedInput } from "../../../../packages/engines/comfyui-cordis/src/linked.ts";
import { sdkClient } from "../../../../packages/engines/comfyui-cordis/src/comfyui-transport.ts";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

const stub = (getStatus: number) => createServer((req, res) => {
  if (req.method === "POST" && (req.url ?? "").startsWith("/upload/image")) {
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
      const { graph } = await uploadReferenced(sdkClient(base), graphFor(`${base}/v1/assets/runs/r1/out.png`) as never);
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
        uploadReferenced(sdkClient(base), graphFor(`${base}/v1/assets/runs/r1/out.png`) as never),
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
      const { graph } = await uploadReferenced(sdkClient(base), {
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
    // J12: the state root is call data — the resolver never reads
    // the process env (the retired seam's last reader)
    const stateRoot = mkdtempSync(join(tmpdir(), "linked-wall-"));
    assert.equal(
      resolveLinkedInput("/v1/assets/runs/r1/generate/out.png", stateRoot),
      join(stateRoot, "output", "r1", "generate", "out.png"),
    );
  });

  it("absolute URLs, spells, and estate paths ride verbatim", () => {
    assert.equal(resolveLinkedInput("http://h:1/v1/assets/runs/r1/o.png"), "http://h:1/v1/assets/runs/r1/o.png");
    assert.equal(resolveLinkedInput("$image"), "$image");
    assert.equal(resolveLinkedInput("/mnt/estate/in.png"), "/mnt/estate/in.png");
  });

  it("a rewritten path escaping the runs root refuses loud", () => {
    assert.throws(
      () => resolveLinkedInput("/v1/assets/runs/../../etc/passwd", "/tmp/linked-state"),
      /escapes the runs root/,
    );
  });
});

describe("uploadReferenced §23 state_roots stamp (J12 Layer C)", () => {
  // The film_mix node's clip-source walk carries the estate's roots
  // manifest as call data: the walk stamps the SAME manifest it
  // searches onto the MeliteFilmAudioMix node. The engine's
  // validate_inputs iterates only a node's own declared keys, so an
  // extra input key is inert on a pack predating the input — the
  // stamp never blocks the live engine.
  const mixGraph = () => ({
    "1": { class_type: "MeliteFilmAudioMix", inputs: {
      videos: "h3_w1,h3_w2", after: "boundary", clips_json: "[]",
      duck_spans: "", music_duck_spans: "", duck_db: -12, film_seconds: 8,
    } },
  });

  it("stamps the roots manifest (own root first, extras declared, deduped)", async () => {
    const s = stub(200);
    const base = await listen(s);
    try {
      const stateRoot = mkdtempSync(join(tmpdir(), "stamp-wall-"));
      const extra = mkdtempSync(join(tmpdir(), "stamp-extra-"));
      const { graph } = await uploadReferenced(sdkClient(base), mixGraph() as never, {
        runsRoot: join(stateRoot, "output"),
        stateRoots: [extra, stateRoot],
      });
      const ins = (graph["1"] as { inputs: Record<string, unknown> }).inputs;
      assert.deepEqual(JSON.parse(ins.state_roots as string), [stateRoot, extra]);
    } finally {
      s.close();
    }
  });

  it("without a runs root the graph rides unstamped (the old shape)", async () => {
    const s = stub(200);
    const base = await listen(s);
    try {
      const { graph } = await uploadReferenced(sdkClient(base), mixGraph() as never);
      const ins = (graph["1"] as { inputs: Record<string, unknown> }).inputs;
      assert.equal("state_roots" in ins, false);
    } finally {
      s.close();
    }
  });

  it("non-mix nodes never carry the stamp", async () => {
    const s = stub(200);
    const base = await listen(s);
    try {
      const stateRoot = mkdtempSync(join(tmpdir(), "stamp-none-"));
      const { graph } = await uploadReferenced(sdkClient(base), {
        "1": { class_type: "KSampler", inputs: { seed: 1 } },
      } as never, { runsRoot: join(stateRoot, "output") });
      const ins = (graph["1"] as { inputs: Record<string, unknown> }).inputs;
      assert.equal("state_roots" in ins, false);
    } finally {
      s.close();
    }
  });
});
