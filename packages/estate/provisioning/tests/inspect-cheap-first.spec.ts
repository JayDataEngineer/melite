// inspect-cheap-first.spec.ts — THE CHEAP-FIRST SCAN LAW (the
// operator's live burn, 2026-11: audit download-stack-audit-2026-10-20
// F10 addendum; the estate-side cure beside the sidebar face). The
// writer's inspect re-hashed every declared file on every scan — a
// full sha256 per item per press — so a 56-resource estate could
// never finish inside the status budget.
//
// THE LAW, at the store plane (the REAL VerifiedArtifactWriter over
// REAL files — no hashing fake here):
//   1. CHEAP-FIRST: a present file whose size matches the declared
//      sizeBytes is judged by STAT — `verifiedBy: 'size'`, NO sha256
//      on the answer, and the digest is never consulted (a tampered
//      same-size file still reads present: had the hash run, the
//      digest mismatch would have refused it).
//   2. THE VERIFIED-HASH MEMO: a full-hash answer is remembered by
//      the file's stat triple (path + size + mtime) — the same file
//      re-inspected while its triple holds NEVER re-hashes (a
//      same-length tamper with the mtime restored still answers the
//      remembered digest — a live re-hash would expose the tamper).
//   3. STALE TRIPLE: a stat change (mtime bump) invalidates the memo
//      — the next inspect re-hashes and answers the fresh digest.
//   4. MISMATCH: a size mismatch never takes the cheap path — the
//      full hash runs and the answer keeps its pre-cure shape
//      (present/sha256/sizeBytes, verifiedBy absent).
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService, VerifiedArtifactWriter } from "../src/index.ts";
import type { ProvisionPlan, ProvisioningConfig, ResourceRef } from "../src/index.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-cheap-first-"));
  roots.push(root);
  return root;
}

const BYTES = Buffer.alloc(512, 9);
const DIGEST = createHash("sha256").update(BYTES).digest("hex");
// a same-length tamper: different bytes, identical size — the shape a
// corrupted-but-plausible file wears
const TAMPERED = Buffer.from(Buffer.alloc(512, 9).map((byte, index) => (index % 2 === 0 ? 1 : byte)));

function refOf(id: string): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id };
}

function planFor(id: string, sizeBytes: number | undefined): ProvisionPlan {
  return {
    ref: refOf(id),
    items: [{
      kind: "model",
      key: `model:family:${id}::w.bin`,
      owner: "family",
      id,
      name: "w.bin",
      folder: "checkpoints",
      url: "https://example.invalid/w.bin",
      sha256: DIGEST,
      ...(sizeBytes === undefined ? {} : { sizeBytes }),
      required: true,
      provider: "direct",
    }],
  };
}

/** Land the real bytes at the real store path. */
function landFile(root: string, content: Buffer = BYTES): void {
  const dir = join(root, "checkpoints");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "w.bin"), content);
}

/** Restore the mtime the file wore BEFORE the tamper's write — the
 *  stat triple (path + size + mtime) stays exactly as the memo
 *  remembers it. */
function restoreMtime(root: string, originalMtime: Date): void {
  const path = join(root, "checkpoints", "w.bin");
  utimesSync(path, originalMtime, originalMtime);
}

describe("THE CHEAP-FIRST SCAN LAW (the real writer, real files)", () => {
  test("ARM C1 — a size-matching file is judged by STAT: verifiedBy 'size', no sha256, and the digest is never consulted (a same-size tamper still reads present)", async () => {
    const root = tempRoot();
    landFile(root);
    // pin the mtime to a whole-ms Date BEFORE the first inspect: the
    // memo's triple keys on mtimeMs, so the tamper's restore must
    // round-trip the exact value the memo remembers
    const stamp = new Date();
    utimesSync(join(root, "checkpoints", "w.bin"), stamp, stamp);
    const writer = new VerifiedArtifactWriter(root);
    const cheap = await writer.inspect({
      root,
      relativePath: "checkpoints/w.bin",
      expectedSha256: DIGEST,
      expectedSizeBytes: BYTES.length,
    });
    expect(cheap.present, "the landed file reads present").toBe(true);
    expect(cheap.verifiedBy,
      "a size-matching file must carry the size-verified word",
    ).toBe("size");
    expect(cheap.sha256 === undefined,
      "the cheap path carries NO digest — never claim a sha256 the scan did not compute",
    ).toBe(true);
    expect(cheap.sizeBytes).toBe(BYTES.length);

    // THE NO-HASH PROOF: same size, different bytes — a hashing
    // inspect would answer present:false on the digest mismatch. The
    // cheap path answers present:true without touching the digest.
    landFile(root, TAMPERED);
    restoreMtime(root, stamp);
    const tampered = await writer.inspect({
      root,
      relativePath: "checkpoints/w.bin",
      expectedSha256: DIGEST,
      expectedSizeBytes: BYTES.length,
    });
    expect(tampered.present,
      "the tampered same-size file still reads present — the cheap verdict never consulted the digest",
    ).toBe(true);
    expect(tampered.verifiedBy).toBe("size");

    // THE SERVICE FACE: the scan row answers active 'size-checked'.
    const service = new ProvisioningService(new Context(), {
      declaration: { resolve: async (): Promise<ProvisionPlan> => planFor("cheap-fam", BYTES.length) },
      storeRoot: root,
    } satisfies ProvisioningConfig);
    const row = await service.inspect(refOf("cheap-fam"));
    expect(row.state, "the scan verdicts the landed file").toBe("active");
    const item = row.items[0];
    expect(item?.integrity, "the row names the size-verified integrity").toBe("size-checked");
    expect(item?.sha256 === undefined,
      "the row carries no digest — the scan did not hash",
    ).toBe(true);
  });

  test("ARM C2 — THE VERIFIED-HASH MEMO: a sizeless file's full-hash answer is remembered by its stat triple; the re-inspect never re-hashes (the remembered digest survives a same-triple tamper)", async () => {
    const root = tempRoot();
    landFile(root);
    // pin the mtime to a whole-ms Date BEFORE the first inspect (the
    // memo's triple must round-trip the restore exactly)
    const stamp = new Date();
    utimesSync(join(root, "checkpoints", "w.bin"), stamp, stamp);
    const writer = new VerifiedArtifactWriter(root);
    const request = { root, relativePath: "checkpoints/w.bin", expectedSha256: DIGEST };
    const first = await writer.inspect(request);
    expect(first.present, "control: the file hashes on the first inspect").toBe(true);
    expect(first.sha256).toBe(DIGEST);

    // same stat triple (size and mtime untouched by the same-length
    // tamper + restored mtime): the memo answers, the hash does not
    // run — a live re-hash would answer the TAMPERED digest
    landFile(root, TAMPERED);
    restoreMtime(root, stamp);
    const second = await writer.inspect(request);
    expect(second.present, "the memo's answer stands: the file was verified").toBe(true);
    expect(second.sha256,
      "THE NEVER-RE-HASH LAW: the remembered digest answered for the unchanged stat triple — a fresh hash would have exposed the tamper",
    ).toBe(DIGEST);
  });

  test("ARM C3 — a STALE triple re-hashes: an mtime bump invalidates the memo and the fresh digest answers", async () => {
    const root = tempRoot();
    landFile(root);
    // pin the mtime to a whole-ms Date BEFORE the first inspect (the
    // memo's triple must round-trip the restore exactly)
    const stamp = new Date();
    utimesSync(join(root, "checkpoints", "w.bin"), stamp, stamp);
    const writer = new VerifiedArtifactWriter(root);
    const request = { root, relativePath: "checkpoints/w.bin", expectedSha256: DIGEST };
    const first = await writer.inspect(request);
    expect(first.sha256).toBe(DIGEST);

    landFile(root, TAMPERED);
    // the tamper's write bumped the mtime — the triple moved, the
    // memo must miss, and the re-hash must expose the fresh bytes
    const second = await writer.inspect(request);
    expect(second.sha256,
      "a changed stat triple re-hashes — the memo never answers for a file it has not stat-checked",
    ).toBe(createHash("sha256").update(TAMPERED).digest("hex"));
  });

  test("ARM C4 — a SIZE MISMATCH never takes the cheap path: the full hash runs and the answer keeps its pre-cure shape", async () => {
    const root = tempRoot();
    landFile(root);
    const writer = new VerifiedArtifactWriter(root);
    const mismatch = await writer.inspect({
      root,
      relativePath: "checkpoints/w.bin",
      expectedSha256: DIGEST,
      expectedSizeBytes: BYTES.length + 1,
    });
    expect(mismatch.present, "the digest still judges: the bytes are the declared ones").toBe(true);
    expect(mismatch.sha256,
      "the mismatch path carries the computed digest — the full hash ran",
    ).toBe(DIGEST);
    expect(mismatch.sizeBytes).toBe(BYTES.length);
    expect(mismatch.verifiedBy === undefined,
      "the full-hash answer keeps its pre-cure shape — no size-verified word",
    ).toBe(true);

    // the service face keeps its honest failed verdict over the
    // mismatching declaration
    const service = new ProvisioningService(new Context(), {
      declaration: { resolve: async (): Promise<ProvisionPlan> => planFor("mismatch-fam", BYTES.length + 1) },
      storeRoot: root,
    } satisfies ProvisioningConfig);
    const row = await service.inspect(refOf("mismatch-fam"));
    expect(row.state).toBe("failed");
    assert.match(row.items[0]?.detail ?? "", /size/);
  });
});
