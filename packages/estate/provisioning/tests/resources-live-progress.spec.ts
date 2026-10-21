// resources-live-progress.spec.ts — THE LIVE-ROW DOOR LAW (audit
// download-stack-audit-2026-10-20 F10, last remainder: the Manager
// sidebar's "Declared resources" showed NO download progress mid-
// flight; a mid-flight family showed its last settled state because
// inspect() JOINED the live lock — the read blocked on the download
// or answered pre-download truth, and the verify phase was
// invisible).
//
// THE LAW: a LOCKED row (a live operation) resolves to the LIVE
// ledger snapshot — state/bytes/total/phase/operation_id/detail —
// WITHOUT awaiting the flight's settle. The scan never hangs on a
// download again, and the row is honest about being mid-flight.
// Additive fields only: a SETTLED row's shape is byte-identical to
// pre-cure (no bytes/total/phase keys — the existing resources walls
// judge that shape and stay untouched). The journey-honesty arms
// ride the same door: a resumed flight's ledger seeds the adopted
// offset (the range-resume slice), so the row never reads 0% on a
// resumed flight; and the pre-seed window (lock registered, ledger
// row not yet seeded) answers an honest arming row — never a hang,
// never invented bytes.
//
// REAL SERVICE, FAKED TRANSPORT ONLY (the weight-streams boundary):
// the flight is the service's own direct arm over a gated byte
// stream; every state word, phase, and count here is one the
// service's own ledger reported.
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
  ArtifactWriterPort,
  ProvisionPlan,
  ProvisioningConfig,
  ResourceRef,
  ResourceStatus,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) {
    // the arms hold gated flights open on purpose — the dispose waits
    // on the fiber's operation, so it is bounded here; the verdict of
    // an abandoned gate is no arm's subject
    await Promise.race([
      context.fiber.dispose(),
      new Promise<void>((resolve) => { setTimeout(resolve, 2_000); }),
    ]);
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-live-progress-"));
  roots.push(root);
  return root;
}

const TOTAL = 20;
const PART = 8;
const RESUME_OFFSET = 1_234_567;
// D2's declared file is big enough to lawfully adopt a 1 234 567-byte
// part (the adoption scan skips any part >= the declared total)
const RESUME_TOTAL = 2_000_000;
const BYTES = Buffer.alloc(TOTAL, 7);
const DIGEST = createHash("sha256").update(BYTES).digest("hex");

function refOf(id: string): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id };
}

function planOf(id: string, sizeBytes: number = TOTAL): ProvisionPlan {
  return {
    ref: refOf(id),
    items: [{
      kind: "model",
      key: `model:family:${id}::weight.bin`,
      owner: "family",
      id,
      name: "weight.bin",
      folder: "checkpoints",
      url: "https://example.invalid/weight.bin",
      sha256: DIGEST,
      sizeBytes,
      required: true,
      provider: "direct",
    }],
  };
}

function writerFor(over: Partial<ArtifactWriterPort> = {}): ArtifactWriterPort {
  return {
    inspect: async () => ({ present: false as const }),
    write: async () => {
      throw new Error("the live-progress walls never land bytes");
    },
    ...over,
  } satisfies ArtifactWriterPort;
}

/** A gated byte body: lands its prefix, then holds the stream open
 *  (never closes) until the arm releases it — the lock stays held
 *  the whole scan. The proven shape from range-resume.spec.ts. */
function gatedBody(prefix: Uint8Array, gate: Promise<void>): AsyncIterable<Uint8Array> {
  return (async function* generate(): AsyncGenerator<Uint8Array> {
    yield Uint8Array.from(prefix);
    await gate;
  })();
}

/** Wait until the predicate holds — the ledger's pump counts
 *  asynchronously, so the arms wait for the counted state instead of
 *  sleeping. */
async function until(predicate: () => boolean, what: string): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
  assert.fail(what);
}

describe("THE LIVE-ROW DOOR LAW (audit download-stack-audit-2026-10-20 F10)", () => {
  test("ARM D1 — a locked row resolves the LIVE ledger snapshot WITHOUT settling the flight: the scan answers mid-stream (state/bytes/total/phase/operation_id) and the flight is STILL live after the scan", async () => {
    const ctx = new Context();
    contexts.push(ctx);
    // the flight: the stream lands PART bytes, then holds (never
    // closes) until the arm releases it — the lock stays held the
    // whole scan
    let releaseStream!: () => void;
    const streamGate = new Promise<void>((resolve) => { releaseStream = resolve; });
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => planOf("live-fam") },
      storeRoot: tempRoot(),
      artifactWriter: writerFor(),
      fetcher: async () => ({ status: 200, body: gatedBody(BYTES.subarray(0, PART), streamGate) }) as never,
    } satisfies ProvisioningConfig);
    const ref = refOf("live-fam");
    const flight = service.ensure(ref);
    void flight.catch(() => undefined);
    await until(() => service.progressOfRef(ref)?.bytes === PART,
      "the stream's first chunk never reached the ledger — the arm cannot seat a mid-flight scan");
    const preScan = service.progressOfRef(ref);
    assert.ok(preScan !== null && preScan.state === "acquiring" && preScan.phase === "stream",
      "control: the flight is live mid-stream before the scan");

    // THE DOOR: the resources inspect must answer while the gate is
    // still closed. Pre-cure this awaited the settle (joinLocked) and
    // the arm wedged here — the scan cannot answer a live flight.
    const row = (await service.inspect(ref)) as ResourceStatus & { bytes?: number; total?: number; phase?: string };
    expect(row.state,
      "a locked row must read LIVE (acquiring), never the last settled verdict",
    ).toBe("acquiring");
    expect(row.operationId,
      "the live row names its operation — the face's poll key",
    ).toBe(preScan.operationId);
    expect(row.bytes,
      "the live row carries the ledger's landed bytes",
    ).toBe(PART);
    expect(row.total,
      "the live row carries the ledger's DECL total",
    ).toBe(TOTAL);
    expect(row.phase,
      "the live row carries the ledger's phase word — the liveness window",
    ).toBe("stream");

    // THE FLIGHT SURVIVED THE SCAN: still live, still counting.
    expect(service.isLocked(ref),
      "the scan must not have settled, cancelled, or joined the flight",
    ).toBe(true);
    const postScan = service.progressOfRef(ref);
    assert.ok(postScan !== null, "the ledger row survives the scan");
    expect(postScan.state, "the flight is STILL live after the scan").toBe("acquiring");

    // release; the flight's verdict after release is not this arm's
    // subject (the fake writer refuses bytes) — only its settle is
    releaseStream();
    await until(() => !service.isLocked(ref), "the released flight never settled");
    await flight.catch(() => undefined);
  });

  test("ARM D2 — a resumed flight reads its SEEDED OFFSET through the door: bytes carry the adopted part mid-flight, never a 0% row (the range-resume seed)", async () => {
    const ctx = new Context();
    contexts.push(ctx);
    const root = tempRoot();
    // the previous attempt's kept part on disk — the range-resume
    // seed's own source (the real writer adopts it; the proven seam
    // from range-resume.spec.ts ARM a)
    const legacyPart = Buffer.alloc(RESUME_OFFSET, 3);
    mkdirSync(join(root, "checkpoints"), { recursive: true });
    writeFileSync(join(root, "checkpoints", "weight.bin.part-legacy"), legacyPart);
    let releaseStream!: () => void;
    const streamGate = new Promise<void>((resolve) => { releaseStream = resolve; });
    let rangedAsk = false;
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => planOf("resume-fam", RESUME_TOTAL) },
      storeRoot: root,
      fetcher: async (_url, _signal, init) => {
        rangedAsk = (init?.rangeFrom ?? 0) === RESUME_OFFSET;
        return {
          status: 206,
          body: gatedBody(Uint8Array.of(1, 2, 3), streamGate),
          resumedFrom: RESUME_OFFSET,
          totalBytes: TOTAL,
        } as never;
      },
    } satisfies ProvisioningConfig);
    const ref = refOf("resume-fam");
    const flight = service.ensure(ref);
    void flight.catch(() => undefined);
    await until(() => (service.progressOfRef(ref)?.bytes ?? 0) >= RESUME_OFFSET + 3,
      "the resumed flight never seeded its offset into the ledger");
    expect(rangedAsk, "control: the kept part turned into a ranged ask").toBe(true);

    const row = (await service.inspect(ref)) as ResourceStatus & { bytes?: number };
    expect(row.state, "the resumed flight is live").toBe("acquiring");
    expect(row.bytes,
      "THE NO-0%-LIE LAW: the door answers the ledger's seeded offset — a resumed flight never reads 0 bytes mid-flight",
    ).toBe(RESUME_OFFSET + 3);

    // release; the resumed body (3 fresh bytes over a 1 234 567-byte
    // prefix) cannot match the digest — the flight's FAILED verdict
    // is not this arm's subject, only its settle is
    releaseStream();
    await until(() => !service.isLocked(ref), "the released flight never settled");
    await flight.catch(() => undefined);
  });

  test("ARM D3 — a SETTLED row's shape is byte-identical to pre-cure: no bytes/total/phase keys ride a settled row (the additive-fields law)", async () => {
    const ctx = new Context();
    contexts.push(ctx);
    const root = tempRoot();
    // the settled truth is REAL: the declared file landed byte-exact
    // on the store (the inspect path always rides the real fs-side
    // writer — a port override never answers for it)
    mkdirSync(join(root, "checkpoints"), { recursive: true });
    writeFileSync(join(root, "checkpoints", "weight.bin"), BYTES);
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => planOf("settled-fam") },
      storeRoot: root,
    } satisfies ProvisioningConfig);
    const ref = refOf("settled-fam");
    const row = (await service.inspect(ref)) as ResourceStatus & Record<string, unknown>;
    expect(row.state, "the present file's inspect settles").toBe("active");
    for (const additive of ["bytes", "total", "phase"]) {
      expect(additive in row,
        `the additive live fields must never ride a SETTLED row (found "${additive}") — the settled shape is pre-cure byte-identical`,
      ).toBe(false);
    }
  });

  test("ARM D4 — the PRE-SEED window: a lock held with no ledger row yet answers an honest arming row — never a hang, never invented bytes", async () => {
    const ctx = new Context();
    contexts.push(ctx);
    // the plan resolve is gated: the lock registers (runLocked), the
    // ledger seeds only AFTER the plan lands — the window the old
    // join rode
    let releasePlan!: () => void;
    const planGate = new Promise<ProvisionPlan>((resolve) => { releasePlan = (): void => { resolve(planOf("arming-fam")); }; });
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: (_ref: ResourceRef): Promise<ProvisionPlan> => planGate },
      storeRoot: tempRoot(),
      artifactWriter: writerFor(),
    } satisfies ProvisioningConfig);
    const ref = refOf("arming-fam");
    const flight = service.ensure(ref);
    void flight.catch(() => undefined);
    await until(() => service.isLocked(ref), "the lock never registered");

    const row = (await service.inspect(ref)) as ResourceStatus & Record<string, unknown>;
    expect(row.state,
      "the arming window still reads live — the fetch is mid-flight even before its ledger counts",
    ).toBe("acquiring");
    expect(row.operationId !== undefined || row.operation_id !== undefined,
      "the arming row names its operation id",
    ).toBe(true);
    for (const additive of ["bytes", "total", "phase"]) {
      expect(row[additive] === undefined,
        `the arming window invents no ${additive} — no ledger, no numbers`,
      ).toBe(true);
    }

    // release; the plan lands, the acquire fails against the refusing
    // writer — the flight's verdict is not this arm's subject, only
    // its settle is
    releasePlan();
    await until(() => !service.isLocked(ref), "the released flight never settled");
    await flight.catch(() => undefined);
  });
});
