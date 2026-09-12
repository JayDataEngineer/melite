// manage-registry.spec.ts — the manage seat: aborts refuse, refused
// envelopes throw RemoteError (the lane's value-shape), ok envelopes
// return, and the provider row mounts.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
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
    assert.match(err.message, /Input should be one of/);
    const details = err.details as { action?: string; status?: number };
    assert.equal(details.action, "bogus");
    assert.equal(details.status, 422);
  });

  it("ok envelopes return (status through the routed rail)", async () => {
    globalThis.fetch = (async (url: unknown) =>
      url.toString().endsWith("/system_stats")
        ? new Response(JSON.stringify({ system: { comfyui_version: "9.9" }, devices: [] }))
        : new Response(JSON.stringify({ is_processing: false, in_progress_count: 0, total_count: 0, done_count: 0 }))) as typeof fetch;
    const { svc } = seat();
    const env = await svc.act({ action: "status" }, new AbortController().signal);
    assert.equal(env.ok, true);
    assert.equal(env.action, "status");
    assert.equal(env.detail, "server up");
  });
});
