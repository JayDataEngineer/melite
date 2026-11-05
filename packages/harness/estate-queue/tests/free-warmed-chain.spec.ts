// @contract gates-free-warmed-chain
// free-warmed-chain.spec.ts — THE FREE DOOR CHAINS THE WARMED-SEAT
// RELEASE (qa8 F42).
//
// THE BURN: `comfy_manage free` answered "free issued (next worker
// iteration)" while the engine's resident cache (8.35 GB) never
// dropped — verified across 3 waits + nvidia-smi; only a real
// restart cleared. THE TRACE: the estate's free door posted ONLY
// native `/free`, which evicts ComfyUI-core-tracked models; the
// qwen3 torch engine's process-wide warmed handles (~4.3 GB per
// variant) are the AUDIO PACK's engine-owned seats, invisible to
// /free. The pack's release door (vendored e4e4c13: POST
// /audiocore/release_warmed, firing the same release_warmed_handles()
// the Unload node fires) was seated with its own pointer — "the free
// door chains it after native /free" — and the estate never chained
// it. ESTATE-SIDE DEFECT: the release door failed to make the
// complete call; the engine never ignored a correct one.
//
// THE LAW: free posts native /free FIRST (the core eviction, the
// failure verdict rides it), then the warmed-seat chain, and the
// envelope ANSWERS WITH THE COUNT — never the silent no-op face. A
// lane that does not carry the audio pack names itself in the
// answer; the free verdict still lands (native eviction happened).
import { describe, it, expect, afterEach } from "vitest";
import assert from "node:assert/strict";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status });
const ctx = (): ManageCtx =>
  ({
    repoRoot: "",
    stateRoots: [],
    comfyUnit: "melite-comfyui.service",
    autoProvision: false,
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: { allDecls: () => [] },
    timeout: () => () => {},
  }) as unknown as ManageCtx;

describe("the free door chains the warmed-seat release (F42)", () => {
  it("free posts native /free AND the pack's /audiocore/release_warmed, and the answer carries the released count", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url);
      calls.push(u);
      if (u.endsWith("/free")) return json({});
      if (u.endsWith("/audiocore/release_warmed")) return json({ released: 3 });
      return json({});
    }) as typeof fetch;
    const [code, env] = await dispatchManage({ action: "free" }, ctx());
    assert.equal(code, 200);
    assert.deepEqual(
      calls,
      ["http://engine:8188/free", "http://engine:8188/audiocore/release_warmed"],
      "the chain fires BOTH doors — native eviction first, the warmed seats after",
    );
    assert.match(env.detail ?? "", /free issued/, "the native verdict lands");
    assert.match(env.detail ?? "", /released 3 handle\(s\)/, "the envelope answers with the count — never a silent no-op face");
  });

  it("a lane without the audio pack still frees — the chain names itself in the answer", async () => {
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url);
      if (u.endsWith("/free")) return json({});
      return json({ error: "not found" }, 404);
    }) as typeof fetch;
    const [code, env] = await dispatchManage({ action: "free" }, ctx());
    assert.equal(code, 200, "the free verdict survives a missing pack door");
    assert.match(env.detail ?? "", /free issued/);
    assert.match(env.detail ?? "", /warmed-seat chain unavailable/, "the miss names itself — never silence");
  });

  it("a native /free failure refuses loud and never reaches the chain (the core eviction is the verdict's own seat)", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url);
      calls.push(u);
      if (u.endsWith("/free")) return json({ error: "engine down" }, 500);
      return json({});
    }) as typeof fetch;
    const [code, env] = await dispatchManage({ action: "free" }, ctx());
    assert.equal(code, 502, "a failed native free answers as the mapped rail refusal");
    assert.equal(env.ok, false);
    assert.match(env.detail ?? "", /engine down/);
    assert.deepEqual(calls, ["http://engine:8188/free"], "the chain never fires past a failed native free");
  });
});
