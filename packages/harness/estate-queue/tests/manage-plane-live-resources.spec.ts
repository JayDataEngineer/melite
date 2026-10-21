// manage-plane-live-resources.spec.ts — THE LIVE ROW ON THE WIRE
// (audit download-stack-audit-2026-10-20 F10, last remainder; tier
// cards-assets-live-progress' door arm on the estate-queue side).
//
// THE LAW: the status envelope's `resources` section passes a LIVE
// resource row's additive fields — bytes/total/phase — through to the
// Manager sidebar VERBATIM (the provisioning door resolves a locked
// row to the live ledger snapshot; the plane's row mapping must not
// strip what the door answered), and a SETTLED row keeps its exact
// pre-cure shape (no additive keys, no reshaping). The census law
// rides along: a live row is never an 'unknown' row, so a mid-flight
// scan must not mark census_partial.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ProvisioningServiceDefinition,
  ProvisionState,
  ResourceRef,
  ResourceStatus,
} from "@melite/estate-provisioning";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { resolveStateRoot } from "../src/queueLock.ts";
import { rootsManifest } from "../src/rootsManifest.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

const modelRef = (id: string): Extract<ResourceRef, { kind: "model" }> => ({
  kind: "model",
  owner: "family",
  id,
});

const seatFor = (rows: readonly ResourceStatus[]): ProvisioningServiceDefinition => ({
  reconcile: async (): Promise<ResourceStatus[]> => [...rows],
  stateOf: (): ProvisionState => "unknown",
  operationOf: () => undefined,
  isLocked: () => true,
}) as unknown as ProvisioningServiceDefinition;

const CTX = (seat: ProvisioningServiceDefinition, root: string): ManageCtx =>
  ({
    repoRoot: root,
    stateRoots: rootsManifest(resolveStateRoot({ repoRoot: root }), []),
    endpoint: () => ({ provision: "managed", url: "http://127.0.0.1:1" }),
    autoProvision: false,
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    provisioning: seat,
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
    signal: new AbortController().signal,
  }) as unknown as ManageCtx;

const manage = (doc: unknown, ctx: ManageCtx): Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]> =>
  dispatchManage(doc, ctx) as Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]>;

describe("THE LIVE ROW ON THE WIRE (audit F10 last remainder)", () => {
  it("a live row's bytes/total/phase reach the status envelope's resources section verbatim; a settled row carries none of the additive keys", async () => {
    const root = mkdtempSync(join(tmpdir(), "manage-live-resources-"));
    try {
      // the endpoint never answers (fetch refuses) — the resources
      // reconciliation is independent of endpoint reachability, the
      // same door shape the operator's status rides
      globalThis.fetch = (async () => {
        throw new Error("connection refused (the arm's stub)");
      }) as typeof fetch;
      const liveRow: ResourceStatus = {
        ref: modelRef("wan"),
        state: "acquiring",
        operationId: "op-live-1",
        bytes: 5_196_173_399,
        total: 7_343_591_088,
        phase: "stream",
        items: [],
      };
      const settledRow: ResourceStatus = {
        ref: modelRef("anima"),
        state: "restart_required",
        operationId: "op-done-1",
        items: [{
          key: "model:family:anima::w.safetensors",
          kind: "model",
          state: "restart_required",
          integrity: "operator-unverified",
          path: "models/anima/w.safetensors",
        }],
      };
      const [, env] = await manage({ action: "status" }, CTX(seatFor([liveRow, settledRow]), root));
      assert.equal(env.ok, true, "the status arm answers over a refused endpoint");
      const data = env.data as {
        resources: Array<Record<string, unknown>>;
        census_partial?: boolean;
      };
      assert.equal(data.resources.length, 2, "the roster stays row-complete");
      const live = data.resources[0] as Record<string, unknown>;
      assert.equal(live["operation_id"], "op-live-1", "the live row names its operation");
      assert.equal(live["state"], "acquiring", "the live row rides its live state word");
      assert.equal(live["bytes"], 5_196_173_399,
        "the live row's bytes reach the sidebar verbatim — the additive door answer must not be stripped");
      assert.equal(live["total"], 7_343_591_088,
        "the live row's total reaches the sidebar verbatim");
      assert.equal(live["phase"], "stream",
        "the live row's phase word reaches the sidebar verbatim — the verify/stream liveness window");
      const settled = data.resources[1] as Record<string, unknown>;
      for (const additive of ["bytes", "total", "phase"]) {
        assert.ok(!(additive in settled),
          `the additive fields must never ride a SETTLED wire row (found "${additive}") — the settled shape is pre-cure byte-identical`);
      }
      assert.equal(data.census_partial, undefined,
        "a live row is never an 'unknown' row — a mid-flight scan must not mark the census partial");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
