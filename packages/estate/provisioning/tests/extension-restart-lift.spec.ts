// @contract infra-extension-restart-lift
// extension-restart-lift.spec.ts — THE BOOT-SATISFIED LIFT
// (FRICTION_3 N9, 2026-11-13: "status face shows stale
// failed/restart_required rows surviving engine restarts — now
// worse").
//
// THE BURN: an extension install settles restart_required (the
// Manager acked the pack; the engine must re-import it at boot).
// The row's promise — "restart the engine and this row lifts" —
// was NEVER re-checked: verifyOperation owned re-verifies for
// model/snapshot rows against the disk and explicitly excluded
// extension rows, so after the operator restarted the engine the
// row wore restart_required forever and the manage face kept
// commanding next_action: restart at a healthy engine.
//
// THE LAW: extension rows verify against the LIVE ENGINE (the
// inspector's /object_info census), never the disk. verifyOperation
// lifts a restart_required or failed extension item to active when
// the census says the pack's nodes serve; every other answer
// (inactive: the restart is still owed; a throw; no inspector; the
// unverifiable flag) keeps the settled row VERBATIM — a lift is
// never invented. The operation re-aggregates, so the face's
// next_action leaves restart the same read.
//
// The REAL service runs (locks + ledger); the Manager and the
// inspector are faked at the suite's seams — the census is a
// closure over a mutable flag the arms flip exactly when the
// operator's restart lands.
import { afterEach, describe, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
  ManagerInstallRequest,
  ManagerPort,
  ProvisionPlan,
  ProvisioningConfig,
  ResourceRef,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-restart-lift-"));
  roots.push(root);
  return root;
}

/** THE CENSUS FLAG: false = the pre-restart engine (the pack is on
 *  disk but its nodes are not imported); true = the operator
 *  restarted and the engine now serves the pack's nodes. */
function censusRig(initial: boolean): {
  service: ProvisioningService,
  landRestart: () => void,
} {
  let nodesServe = initial;
  const context = new Context();
  contexts.push(context);
  const url = "https://example.invalid/some-pack";
  const ref: ResourceRef = { kind: "extension", id: "external:" + url };
  const manager: ManagerPort = {
    inspect: async () => ({ installed: true, active: false }),
    install: async (request: ManagerInstallRequest): Promise<{ installed: boolean; detail?: string }> => {
      const hook = (request as { onQueueStatus?: () => void }).onQueueStatus;
      hook?.();
      return { installed: true, detail: "installed some-pack" };
    },
  };
  const service = new ProvisioningService(context, {
    declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
    storeRoot: tempRoot(),
    manager,
    inspector: {
      inspect: async () => ({ active: nodesServe, nodeTypes: nodesServe ? ["SomePackNode"] : [] }),
    },
  } satisfies ProvisioningConfig);
  return { service, landRestart: () => { nodesServe = true; } };
}

describe("the boot-satisfied lift (extension rows verify against the live engine, FRICTION_3 N9)", () => {
  test("ARM L1 — THE LIFT: a restart_required extension row lifts to active once the restarted engine serves the pack's nodes", async () => {
    const { service, landRestart } = censusRig(false);
    await service.acquireExternal(
      { kind: "extension", url: "https://example.invalid/some-pack" },
      { operatorConfirmed: true },
    );
    const settled = service.operationOf({ kind: "extension", id: "external:https://example.invalid/some-pack" });
    expect(settled?.state, "the rig's settle must wear restart_required (the pre-cure terminal the face served forever)").toBe("restart_required");

    // the operator restarts the engine: the census now sees the nodes
    landRestart();
    const verified = await service.verifyOperation(settled!);
    expect(verified.state,
      "the restart landed but the row never lifted — the face kept commanding restarts of a healthy engine (N9)",
    ).toBe("active");
    expect(verified.items[0]?.state).toBe("active");
    expect(verified.items[0]?.detail ?? "").toMatch(/serves this pack's nodes/);
  });

  test("ARM L2 — THE HOLD: an inactive census keeps the row restart_required verbatim (the restart is still owed)", async () => {
    const { service } = censusRig(false);
    await service.acquireExternal(
      { kind: "extension", url: "https://example.invalid/some-pack" },
      { operatorConfirmed: true },
    );
    const settled = service.operationOf({ kind: "extension", id: "external:https://example.invalid/some-pack" })!;
    const verified = await service.verifyOperation(settled);
    expect(verified.state,
      "an engine that does not serve the pack must keep the row honest — the restart is still owed",
    ).toBe("restart_required");
    expect(verified.items[0]?.state).toBe("restart_required");
  });

  test("ARM L3 — NEVER INVENT: a throwing census and a census-less lane keep the settled row verbatim", async () => {
    // a throwing census (the engine mid-reboot, the 2s bound biting)
    const url = "https://example.invalid/some-pack";
    const ref: ResourceRef = { kind: "extension", id: "external:" + url };
    const context = new Context();
    contexts.push(context);
    const manager: ManagerPort = {
      inspect: async () => ({ installed: true, active: false }),
      install: async () => ({ installed: true }),
    };
    const throwing = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
      storeRoot: tempRoot(),
      manager,
      inspector: {
        inspect: async () => { throw new Error("engine node-defs unreachable (dial memo): ECONNREFUSED"); },
      },
    } satisfies ProvisioningConfig);
    await throwing.acquireExternal({ kind: "extension", url }, { operatorConfirmed: true });
    const thrownRow = throwing.operationOf(ref)!;
    const thrownVerified = await throwing.verifyOperation(thrownRow);
    expect(thrownVerified.state,
      "a census that throws is NO evidence — the settled row must survive verbatim, never lift, never throw",
    ).toBe("restart_required");

    // a lane with no inspector seat at all
    const bare = new ProvisioningService(new Context(), {
      declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
      storeRoot: tempRoot(),
      manager,
    } satisfies ProvisioningConfig);
    contexts.splice(contexts.length - 1, 0, (bare as unknown as { ctx: Context }).ctx);
    await bare.acquireExternal({ kind: "extension", url }, { operatorConfirmed: true });
    const bareRow = bare.operationOf(ref)!;
    const bareVerified = await bare.verifyOperation(bareRow);
    expect(bareVerified.state,
      "a lane with no inspector has no truth door for extensions — the row stays exactly as it settled",
    ).toBe("restart_required");
  });

  test("ARM L4 — THE FAILED ROW LIFTS ON THE SAME CENSUS: a dead Manager verdict never outranks an engine that serves the pack", async () => {
    let nodesServe = false;
    const context = new Context();
    contexts.push(context);
    const url = "https://example.invalid/failed-pack";
    const ref: ResourceRef = { kind: "extension", id: "external:" + url };
    const manager: ManagerPort = {
      inspect: async () => { throw new Error("manager is down"); },
      install: async () => { throw new Error("manager/install-failed: the queue refused the pack"); },
    };
    const service = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
      storeRoot: tempRoot(),
      manager,
      inspector: { inspect: async () => ({ active: nodesServe, nodeTypes: [] }) },
    } satisfies ProvisioningConfig);
    await service.acquireExternal({ kind: "extension", url }, { operatorConfirmed: true });
    const settled = service.operationOf(ref)!;
    expect(settled.state, "the rig's settle must wear failed (a Manager-side failure)").toBe("failed");

    nodesServe = true;
    const verified = await service.verifyOperation(settled);
    expect(verified.state,
      "the engine serving the pack's nodes outranks a dead Manager verdict — the failed row lifts on the same census (the re-admit arm's extension half)",
    ).toBe("active");
  });

  test("ARM L5 — THE MIXED ROW: a lift re-aggregates a model+extension operation (the aggregate owns the face)", async () => {
    const { service, landRestart } = censusRig(false);
    const url = "https://example.invalid/some-pack";
    const ref: ResourceRef = { kind: "extension", id: "external:" + url };
    await service.acquireExternal({ kind: "extension", url }, { operatorConfirmed: true });
    const settled = service.operationOf(ref)!;
    // splice an ACTIVE model item onto the stored row — the real
    // mixed shape (a plan that carries weights and a pack): the
    // weights landed, the pack owed its restart, the stored row
    // wore the pack's restart_required
    const mixed = {
      ...settled,
      items: [
        { key: "weights", kind: "model" as const, state: "active" as const, outcome: "active" as const },
        ...settled.items,
      ],
    };
    expect(mixed.state).toBe("restart_required");
    const holding = await service.verifyOperation(mixed);
    expect(holding.state,
      "pre-lift the mixed row keeps its stored restart_required (the weights never satisfied the pack's promise)",
    ).toBe("restart_required");

    landRestart();
    const lifted = await service.verifyOperation(mixed);
    expect(lifted.state,
      "the pack's lift must re-aggregate the WHOLE mixed row — the weights were already fine, so the operation reads active (the face leaves next_action: restart the same read)",
    ).toBe("active");
    expect(lifted.items.every((item) => item.state === "active")).toBe(true);
  });
});
