// runs-registry.test.ts — THE RUNS REGISTRY WALL (the ALL stroke's
// third cutover, 2026-09-09): GET /v1/flows/runs converge-then-serves
// the assets domain's `registry` table. The scan stays the
// convergence source (served rows are put-if-changed first — storage
// can never stale the bytes); any storage failure scan-serves
// (identical bytes — the seam never throws).
//
// Pinned shapes:
//   1. EXACT BODIES — a fixture tree (success/error/running-zombie/
//      unknown/_-hidden/no-sidecar/orphan-draft rows + one media row)
//      serves the file-era bytes verbatim, media-first/newest-first,
//      count counting even the hidden row.
//   2. MATERIALIZATION — every served card lands in the domain unit
//      (storage/assets/registry/<run-id>.json carrying
//      {run_id, media, created, card}).
//   3. DRIFT-CONVERGE — a sidecar rewritten between requests serves
//      the new bytes (the slice put-if-changes).
//   4. REBOOT — the saved table serves after reboot; a run dir
//      deleted between boots ghost-deletes (count drops, no ghost).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/runs-registry.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootSandbox, http, parsed, reap } from "../helpers/boot.ts";
import type { HttpOut, Sandbox } from "../helpers/boot.ts";

const TOKEN = "wall-ts-registry-2026-09-09";
const STUB_BIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "mcp-stub.mjs");

function sidecar(fields: Record<string, unknown>): string {
  return JSON.stringify({
    status: "success",
    pipeline: "img",
    prompt: "p",
    draft_id: "",
    seed: 1,
    created_at: 1700000000,
    ...fields,
  });
}

function seedRuns(output: string): void {
  const run = (id: string, sc: string | null, media: boolean): void => {
    const dir = join(output, id);
    mkdirSync(dir, { recursive: true });
    if (sc !== null) writeFileSync(join(dir, "_flow.json"), sc);
    if (media) writeFileSync(join(dir, "out.png"), Buffer.alloc(16, 7));
  };
  // Media row, newest media (sorts first).
  run("run-a", sidecar({ prompt: "alpha", seed: 11, created_at: 1700000300 }), true);
  // error -> failed.
  run("run-b", sidecar({ status: "error", prompt: "bravo", created_at: 1700000200 }), false);
  // running -> zombie failed.
  run("run-c", sidecar({ status: "running", prompt: "charlie", created_at: 1700000100 }), false);
  // No status key -> unknown; orphan draft clears to "".
  const noStatus = JSON.parse(sidecar({ prompt: "delta", created_at: 1700000050 })) as Record<string, unknown>;
  delete noStatus["status"];
  noStatus["draft_id"] = "draft-00000000-00000-0";
  run("run-d", JSON.stringify(noStatus), false);
  // Hidden pipeline: counted, never served.
  run("run-e", sidecar({ pipeline: "_hidden", prompt: "echo", created_at: 1700000400 }), false);
  // No sidecar at all: status success, empty pipeline, created 0.
  run("run-f", null, false);
}

async function listRuns(port: number, qs: string): Promise<{ status: number; doc: Record<string, unknown> }> {
  const out: HttpOut = await http(port, "GET", "/v1/flows/runs" + qs, { token: TOKEN });
  return { status: out.status, doc: parsed(out.bytes) as Record<string, unknown> };
}

function byId(doc: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>();
  for (const r of doc["runs"] as Record<string, unknown>[]) m.set(String(r["run_id"]), r);
  return m;
}

describe("runs list rides the registry (sandbox boot)", () => {
  let sandbox: Sandbox | null = null;
  let stateRoot = "";

  before(async (): Promise<void> => {
    try {
      accessSync(STUB_BIN, constants.X_OK);
    } catch {
      assert.fail("mcp stub is not executable: " + STUB_BIN + " (chmod +x fixtures/mcp-stub.mjs)");
    }
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-registry-"));
    seedRuns(join(stateRoot, "output"));
    sandbox = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, stateRoot });
  });

  after((): void => {
    if (sandbox !== null) reap(sandbox.proc);
  });

  it("serves the file-era bytes verbatim (order, voices, count)", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const { status, doc } = await listRuns(sandbox.port, "?limit=200");
    assert.equal(status, 200);
    assert.equal(doc["count"], 6, "the hidden row counts");
    const ids = (doc["runs"] as Record<string, unknown>[]).map((r): string => String(r["run_id"]));
    // Media first, then newest-first; the hidden row never serves.
    assert.deepEqual(ids, ["run-a", "run-b", "run-c", "run-d", "run-f"], "order: " + JSON.stringify(ids));
    const rows = byId(doc);
    assert.equal(rows.get("run-a")?.["status"], "success");
    assert.equal(rows.get("run-b")?.["status"], "failed");
    assert.equal(rows.get("run-c")?.["status"], "failed", "zombie override");
    assert.equal(rows.get("run-d")?.["status"], "unknown");
    assert.equal(rows.get("run-d")?.["draft_id"], "", "orphan draft clears");
    assert.equal(rows.get("run-f")?.["status"], "success", "no sidecar reads success");
    assert.equal(rows.get("run-a")?.["prompt"], "alpha");
    assert.equal(rows.get("run-a")?.["seed"], 11);
    assert.equal((rows.get("run-a")?.["params"] as Record<string, unknown>)["seed"], 11);
    assert.ok(String(rows.get("run-a")?.["thumbnail"] ?? "").endsWith("/run-a/out.png"), "poster: " + String(rows.get("run-a")?.["thumbnail"]));
    const arts = rows.get("run-a")?.["artifacts"] as Record<string, unknown>[];
    assert.equal(arts.length, 1);
    assert.equal(arts[0]?.["name"], "out.png");
  });

  it("slices by limit; garbage 400s with the pinned voice", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const sliced = await listRuns(sandbox.port, "?limit=3");
    assert.equal(sliced.status, 200);
    assert.equal(sliced.doc["count"], 6, "count ignores the slice");
    // Slice-before-build (file-era law): the slice [run-a, run-e,
    // run-b] serves 2 — the hidden row eats a slot.
    assert.equal((sliced.doc["runs"] as unknown[]).length, 2);
    const bad: HttpOut = await http(sandbox.port, "GET", "/v1/flows/runs?limit=nope", { token: TOKEN });
    assert.equal(bad.status, 400);
    assert.ok(String((parsed(bad.bytes) as Record<string, unknown>)["error"]).includes("limit must be an integer"), "voice: " + bad.bytes.subarray(0, 80));
  });

  it("materializes every served card in the domain unit", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    await listRuns(sandbox.port, "?limit=200");
    for (const id of ["run-a", "run-b", "run-c", "run-d", "run-f"]) {
      const recPath = join(stateRoot, "storage", "assets", "registry", id + ".json");
      assert.ok(existsSync(recPath), id + " materializes");
      const rec = JSON.parse(readFileSync(recPath, "utf8")) as {
        version: number;
        record: { run_id: string; media: boolean; created: number; card: Record<string, unknown> };
      };
      assert.equal(rec.version, 1);
      assert.equal(rec.record.run_id, id);
      assert.equal(rec.record.card["run_id"], id);
    }
    // The hidden row never converges (built null = never stored).
    assert.ok(!existsSync(join(stateRoot, "storage", "assets", "registry", "run-e.json")), "hidden rows leave no record");
  });

  it("drift-converges a rewritten sidecar", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    writeFileSync(
      join(stateRoot, "output", "run-b", "_flow.json"),
      sidecar({ status: "success", prompt: "bravo-v2", created_at: 1700000200 }),
    );
    const { doc } = await listRuns(sandbox.port, "?limit=200");
    const rows = byId(doc);
    assert.equal(rows.get("run-b")?.["status"], "success", "new bytes serve");
    assert.equal(rows.get("run-b")?.["prompt"], "bravo-v2");
  });
});

describe("registry durability + ghost-delete (reboot the same root)", () => {
  let first: Sandbox | null = null;
  let second: Sandbox | null = null;
  let stateRoot = "";

  before(async (): Promise<void> => {
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-registry-rb-"));
    seedRuns(join(stateRoot, "output"));
    first = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, stateRoot });
    const listed = await listRuns(first.port, "?limit=200");
    assert.equal(listed.status, 200);
    assert.equal(listed.doc["count"], 6, "boot-1 converges");
    rmSync(join(stateRoot, "output", "run-c"), { recursive: true, force: true });
    reap((first as Sandbox).proc);
    first = null;
    second = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, stateRoot });
  });

  after((): void => {
    if (first !== null) reap(first.proc);
    if (second !== null) reap(second.proc);
  });

  it("serves the table; the deleted run ghosts out", async (): Promise<void> => {
    assert.ok(second !== null);
    const { status, doc } = await listRuns(second.port, "?limit=200");
    assert.equal(status, 200);
    assert.equal(doc["count"], 5, "count drops");
    const ids = (doc["runs"] as Record<string, unknown>[]).map((r): string => String(r["run_id"]));
    assert.ok(!ids.includes("run-c"), "no ghost: " + JSON.stringify(ids));
    assert.ok(!existsSync(join(stateRoot, "storage", "assets", "registry", "run-c.json")), "ghost record deleted");
    assert.ok(byId(doc).get("run-a") !== undefined, "survivors serve");
  });
});
