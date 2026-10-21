// manage-plane-scan-budget.spec.ts — THE SCAN MUST FINISH (the
// operator's live burn, 2026-11 (audit download-stack-audit-2026-10-20
// F10 addendum): 56 declared resources, one press, 56/56 "unknown" —
// the scan-incomplete note — every time. THE ROOT CAUSE: each
// resource's inspect re-hashed every declared file (a full sha256 per
// item per press); the first multi-GB hash outran the status budget
// (STATUS_RECONCILE_MS) and everything behind it rode the census
// honesty arms into 'unknown'. At 56 resources the scan was
// architecturally incapable of completing.
//
// THE LAW (cheap-first verdicts): a landed file with a declared size
// is judged by STAT — present + declared-size match → active with
// integrity 'size-checked', NO hash call. The full hash is the
// mismatch/unknown/stale path only (the sizeless and stat-changed
// files; the writer's verified-hash memo arms live in the
// provisioning suite, inspect-cheap-first.spec.ts). The wall rides
// the REAL status door: dispatchManage status → withManageTimeout's
// 1.5s fuse → the real service's reconcile → the writer seam — with
// a writer that mirrors the operator's estate: a hash costs more
// than the whole budget (one hash alone blows it), a stat is instant.
// A completed 56-row verdict IS the in-budget proof: had the fuse
// fired, the roster would carry 'unknown' rows and census_partial.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProvisioningService } from "@melite/estate-provisioning";
import type {
  ArtifactWriterPort,
  DeclarationPort,
  ProvisionPlan,
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

const FAMILIES = 56;
const SIZE = 100;

const modelRef = (id: string): Extract<ResourceRef, { kind: "model" }> => ({
  kind: "model",
  owner: "family",
  id,
});

function declaration(): DeclarationPort {
  const refs = Array.from({ length: FAMILIES }, (_, index) => modelRef("fam-" + String(index)));
  const plans = new Map<string, ProvisionPlan>(refs.map((ref) => [ref.id, {
    ref,
    items: [{
      kind: "model",
      key: "model:family:" + ref.id + "::w.safetensors",
      owner: "family",
      id: ref.id,
      name: "w.safetensors",
      folder: "checkpoints",
      url: "https://example.invalid/" + ref.id + ".safetensors",
      sha256: "a".repeat(64),
      sizeBytes: SIZE,
      required: true,
      provider: "direct",
    }],
  }]));
  return {
    list: async (): Promise<readonly ResourceRef[]> => refs,
    resolve: async (target: ResourceRef): Promise<ProvisionPlan> => {
      const plan = plans.get((target as { id: string }).id);
      if (plan === undefined) throw new Error("undeclared " + target.id);
      return plan;
    },
  };
}

/** The operator's estate as a writer: a multi-GB hash costs more
 *  than the WHOLE status budget (one hash alone blows it); a stat is
 *  instant. The cheap path rides the cure's own contract —
 *  `expectedSizeBytes` on the request, `verifiedBy: 'size'` on the
 *  answer — so the pre-cure service (which sends neither) hashes
 *  every row and the wall reds; the cured service stats every row. */
function estateWriter(counts: { hashCalls: number }): ArtifactWriterPort {
  return {
    inspect: async (request) => {
      if (request.expectedSizeBytes !== undefined) {
        return {
          present: true,
          path: join("/store", request.relativePath),
          sizeBytes: request.expectedSizeBytes,
          verifiedBy: "size" as const,
        };
      }
      counts.hashCalls += 1;
      await new Promise((resolve) => { setTimeout(resolve, 2_000); });
      return {
        present: true,
        path: join("/store", request.relativePath),
        sha256: request.expectedSha256,
        sizeBytes: SIZE,
      };
    },
    write: async () => {
      throw new Error("the scan-budget wall never lands bytes");
    },
  } satisfies ArtifactWriterPort;
}

const manage = (doc: unknown, ctx: ManageCtx): Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]> =>
  dispatchManage(doc, ctx) as Promise<[number, { ok: boolean; detail: string; action: string; data?: unknown }]>;

function statusCtx(root: string, service: ProvisioningService): ManageCtx {
  return {
    repoRoot: root,
    stateRoots: rootsManifest(resolveStateRoot({ repoRoot: root }), []),
    endpoint: () => ({ provision: "managed", url: "http://127.0.0.1:1" }),
    autoProvision: false,
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    provisioning: service as unknown as ProvisioningServiceDefinition & {
      reconcile: (signal?: AbortSignal) => Promise<ResourceStatus[]>;
    },
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
    signal: new AbortController().signal,
  } as unknown as ManageCtx;
}

describe("THE SCAN MUST FINISH (audit F10 addendum: 56 resources, one press)", () => {
  it("56 declared resources verdict INSIDE the status budget — every row active 'size-checked', the scan never hashes, the census never marks partial", async () => {
    // the endpoint never answers; the resources reconciliation is
    // independent of endpoint reachability
    globalThis.fetch = (async () => {
      throw new Error("connection refused (the arm's stub)");
    }) as typeof fetch;
    const root = mkdtempSync(join(tmpdir(), "manage-scan-budget-"));
    try {
      const counts = { hashCalls: 0 };
      const service = new ProvisioningService(new (await import("@deepseek-ai/cordis")).Context(), {
        declaration: declaration(),
        artifactWriter: estateWriter(counts),
        storeRoot: root,
      });
      const started = Date.now();
      const [, env] = await manage({ action: "status" }, statusCtx(root, service));
      const elapsed = Date.now() - started;
      assert.equal(env.ok, true, "the status arm answers — the scan did not die to its fuse");
      const data = env.data as {
        resources: Array<{ state?: string; items?: Array<{ state?: string; integrity?: string; sha256?: string }> }>;
        census_partial?: boolean;
        resources_detail?: string;
      };
      assert.equal(data.resources_detail, undefined,
        "the scan answered inside its budget — no seam note (pre-cure this carried the timeout voice)");
      assert.equal(data.census_partial, undefined,
        "a completed scan never marks the census partial");
      assert.equal(data.resources.length, FAMILIES, "the roster is row-complete");
      const off = data.resources
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.state !== "active"
          || (row.items ?? []).some((item) => item.state !== "active" || item.integrity !== "size-checked"));
      assert.deepEqual(off, [],
        "every row must verdict active with a 'size-checked' item inside the budget — off rows: "
        + off.map(({ index }) => "#" + String(index)).join(","));
      assert.equal(counts.hashCalls, 0,
        "a landed, size-matching estate never re-hashes on a status scan (the full hash is the mismatch/unknown/stale path)");
      assert.ok(elapsed < 1_500,
        "the scan rode well inside the status budget (finished in " + String(elapsed) + "ms; the fuse is 1500ms)");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
