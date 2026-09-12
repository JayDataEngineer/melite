// manageRegistry.ts — the management seat (REBUILD-15, 2026-09-10):
// the pure plane (managePlane.ts) answers through a Service; the
// ctx assembles from the estate's own seats — the endpoint config
// re-read per call (loadEndpointConfig), the models catalog
// (modelsService — the engine singleton, no seat), the timer seat
// (ctx.timeout — cordis-plugin-timer, never a bare setTimeout).
//
// The seat's contract: act(doc) returns the ENVELOPE
// ({action, ok, detail, data}) on ok; a refused envelope THROWS a
// RemoteError carrying the envelope (code manage/refused) — the
// tools' lane surface reads it as the value, so the model sees WHY.
//
// Erasable-syntax TS only (node --experimental-strip-types).

import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
// Type-only edge to the Timer plugin: applies its Context
// augmentation (ctx.timeout) with no runtime import (the queue's
// own seam).
import type { TimerService } from "@deepseek-ai/cordis-plugin-timer";
import { loadEndpointConfig, resolveRepoRoot, modelsService } from "@melite/comfyui-cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { dispatchManage } from "./managePlane.ts";
import type { ManageCtx, ManageEnvelope } from "./managePlane.ts";

declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** A refused manage envelope — the details CARRY the envelope
     *  (action/status/data) so the tool surfaces WHY. */
    "manage/refused": {
      readonly action?: string;
      readonly status?: number;
      readonly data?: unknown;
    };
  }
}

// ROLE (cookbook adding-a-package role table): Gateway: adapts the external comfy-manager API to the local manage lane. Key "manage" unchanged.
export class ManageGatewayService extends Service {
  static inject = ["timer"];

  constructor(ctx: Context) {
    super(ctx, "manage");
  }

  /** The one entry: the tools' /v1/manage lane. */
  async act(doc: unknown, signal: AbortSignal): Promise<ManageEnvelope> {
    signal.throwIfAborted();
    const mctx: ManageCtx = {
      repoRoot: resolveRepoRoot(),
      endpoint: (): Record<string, unknown> =>
        loadEndpointConfig() as Record<string, unknown>,
      models: modelsService(),
      // TWO-CORDIS TOPOLOGY: the timer plugin's Context augmentation
      // lands on ITS cordis copy (structural, never instanceof
      // across copies — the documented law); the seat reads the
      // timer through the structural shape.
      timeout: (callback: () => void, delay: number): (() => void) =>
        (this.ctx as unknown as {
          timeout(cb: () => void, ms: number): () => void;
        }).timeout(callback, delay),
    };
    const [status, envelope] = await dispatchManage(doc, mctx);
    if (envelope.ok) return envelope;
    // A refusal IS the answer's shape: carry the envelope in the
    // RemoteError — the lane surfaces it as the tool's value.
    throw new RemoteError("manage/refused", envelope.detail, {
      action: envelope.action,
      status,
      data: envelope.data,
    });
  }
}

/** The manage row: gates on the timer seat (the rail's timeouts). */
export const manageProvider = {
  name: "estate-manage",
  inject: ["timer"] as const,
  apply(ctx: Context): void {
    new ManageGatewayService(ctx);
  },
};

declare module "@deepseek-ai/cordis" {
  interface Context {
    manage: ManageGatewayService;
  }
}
