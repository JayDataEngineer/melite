// manage-registry.spec.ts — the manage seat: aborts refuse, refused
// envelopes throw RemoteError (the lane's value-shape), ok envelopes
// return, and the provider row mounts.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { ManageGatewayService, manageProvider } from "../src/manageRegistry.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const seat = (): { ctx: Context; svc: ManageGatewayService } => {
  const ctx = new Context();
  (ctx as unknown as { timeout: unknown }).timeout = (cb: () => void, _ms: number): (() => void) => {
    cb();
    return () => {};
  };
  // J12: the manage seat's ctx folds the queue seat's stateRoots
  // manifest (config-named call data — no env seam).
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "manage-reg-")),
    stateRoots: [],
  };
  manageProvider.apply(ctx);
  const svc = (ctx as unknown as { manage: ManageGatewayService }).manage;
  assert.ok(svc instanceof ManageGatewayService);
  return { ctx, svc };
};

describe("ManageGatewayService", () => {
  it("aborted signals throw before the plane", async () => {
    const { svc } = seat();
    const ctrl = new AbortController();
    ctrl.abort();
    await assert.rejects(svc.act({ action: "status" }, ctrl.signal));
  });

  it("refusals throw RemoteError carrying the envelope", async () => {
    const { svc } = seat();
    const err = await svc
      .act({ action: "bogus" }, new AbortController().signal)
      .then(
        () => null,
        (e: unknown) => e as InstanceType<typeof RemoteError>,
      );
    assert.ok(err instanceof RemoteError);
    const details = err.details as { action?: string; status?: number; code?: string };
    assert.equal(details.action, "bogus");
    assert.equal(details.status, 422);
    assert.equal(details.code, "manage/refused");
  });

  it("propagates caller abort into the manager fetch", async () => {
    const root = mkdtempSync(join(tmpdir(), "manage-abort-"));
    const endpointPath = join(root, "endpoint.json");
    writeFileSync(endpointPath, JSON.stringify({ provision: "managed", url: "http://engine:8188" }));
    process.env.COMFYUI_ENDPOINT_CONFIG = endpointPath;
    const { ctx, svc } = seat();
    (ctx as unknown as { timeout: unknown }).timeout = (_cb: () => void, _ms: number): (() => void) => () => {};
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_url: unknown, init: RequestInit | undefined) => new Promise<Response>((_resolve, reject) => {
      signal = init?.signal ?? undefined;
      signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    })) as typeof fetch;
    const controller = new AbortController();
    try {
      const pending = svc.act({ action: "status" }, controller.signal);
      controller.abort();
      await assert.rejects(pending, (error: unknown) => {
        assert.equal((error as Error).name, "AbortError");
        return true;
      });
      assert.equal(signal?.aborted, true);
    } finally {
      delete process.env.COMFYUI_ENDPOINT_CONFIG;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("ok envelopes return (status through the routed rail)", async () => {
    globalThis.fetch = (async (url: unknown) =>
      String(url).endsWith("/system_stats")
        ? new Response(JSON.stringify({ system: { comfyui_version: "9.9" }, devices: [] }))
        : new Response(JSON.stringify({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }))) as typeof fetch;
    const { svc } = seat();
    const env = await svc.act({ action: "status" }, new AbortController().signal);
    assert.equal(env.ok, true);
    assert.equal(env.action, "status");
    assert.equal(env.detail, "server up");
  });

  // THE TIMER SEAT'S STRUCTURAL BRIDGE (the coverage queue's
  // manageRegistry batch, 2026-10-16): the service definition's
  // timeout adapter routes ManageCtx.timer calls onto the hosting
  // Context's own timer seat — the queue-drain poll wait is the
  // in-tree rider. A busy-then-idle manager answer forces exactly
  // one poll wait, and the recording seat proves the bridge fired.
  it("the timer adapter bridges the poll wait onto the Context's timer seat", async () => {
    const root = mkdtempSync(join(tmpdir(), "manage-timer-"));
    const endpointPath = join(root, "endpoint.json");
    writeFileSync(endpointPath, JSON.stringify({ provision: "managed", url: "http://engine:8188" }));
    process.env.COMFYUI_ENDPOINT_CONFIG = endpointPath;
    const timerDelays: number[] = [];
    let polls = 0;
    globalThis.fetch = (async (url: unknown) =>
      new Response(JSON.stringify(
        String(url).includes("/manager/queue/status") && ++polls === 1
          ? { is_processing: true, in_progress_count: 1, total_count: 0, done_count: 0 }
          : { is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 },
      ))) as typeof fetch;
    const { ctx, svc } = seat();
    (ctx as unknown as { timeout: unknown }).timeout = (cb: () => void, ms: number): (() => void) => {
      timerDelays.push(ms);
      // a real seat fires asynchronously (a sync fire would hit the
      // poll wait's own TDZ between dispose and onAbort)
      queueMicrotask(cb);
      return () => {};
    };
    try {
      const env = await svc.act({ action: "update", force: true }, new AbortController().signal);
      assert.equal(env.ok, true);
      assert.match(env.detail, /update\(comfy\) queued/);
      assert.ok(timerDelays.length >= 1, "the adapter bridged the poll wait onto the timer seat");
      assert.ok(timerDelays.every((d) => d === 1000), "the poll wait rides the seat's own cadence");
    } finally {
      delete process.env.COMFYUI_ENDPOINT_CONFIG;
      rmSync(root, { recursive: true, force: true });
    }
  });
});
