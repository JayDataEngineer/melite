// presets-door.test.ts — THE PRESETS DOMAIN WALL (the ALL stroke,
// 2026-09-09): the studios user-preset ledgers ride the DSH storage
// tier — the `presets` domain is the truth, the per-tenant
// presets.json tmp+rename CRUD is DEAD, and this is the door's
// FIRST gate ever (the py-port era left it unwalled).
//
// Pinned shapes:
//   1. LEGACY IMPORT — a pre-seeded repo data/tenants tree imports
//      once on first domain open: good rows ride (append order
//      kept), poison files skip whole, depth-invalid rows quarantine
//      at serve; the legacy files stay untouched (evidence).
//   2. CRUD ROUND TRIP — save validates (py-exact refusal voices)
//      and assigns the next user-N over the DOMAIN rows; delete
//      removes exactly one record; estate ids refuse immutable;
//      the record materializes as a per-record doc in the domain
//      unit (storage/presets/rows/<b64u>.json carrying {tenant,row}).
//   3. DURABILITY + MARKER — a second boot on the SAME roots serves
//      the saved row and never re-imports the legacy tree (a row
//      added to the legacy file between boots stays a ghost).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/presets-door.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootSandbox, http, parsed, reap } from "../helpers/boot.ts";
import type { HttpOut, Sandbox } from "../helpers/boot.ts";

const TOKEN = "wall-ts-presets-2026-09-09";
const TENANT = "3d/anny";

const NULL_PARTS = { hair: null, outfit: null };
const NULL_KNOBS = { focal_length: null, framing: null, resolution: null, samples: null, transparent: null };

function goodRow(id: string, label: string): Record<string, unknown> {
  return {
    id,
    label,
    description: "",
    origin: "file",
    params: null,
    params_ref: null,
    body_ref: null,
    parts: { ...NULL_PARTS },
    knobs: { ...NULL_KNOBS },
  };
}

function listPresets(port: number): Promise<HttpOut> {
  return http(port, "GET", "/v1/studios/" + TENANT + "/presets", { token: TOKEN });
}

function userIds(doc: Record<string, unknown>): string[] {
  const presets = doc["presets"] as Record<string, unknown>[];
  return presets.filter((p): boolean => String(p["id"]).startsWith("user-")).map((p): string => String(p["id"]));
}

function seedRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), "wall-ts-presets-repo-"));
  writeFileSync(
    join(repoRoot, "inference.config.json"),
    JSON.stringify(
      { models: { read_root: join(repoRoot, "models"), download_root: join(repoRoot, "models") }, engines: {} },
      null,
      2,
    ),
  );
  const tenantDir = join(repoRoot, "data", "tenants", "3d", "anny");
  mkdirSync(tenantDir, { recursive: true });
  writeFileSync(
    join(tenantDir, "presets.json"),
    JSON.stringify({
      presets: [
        goodRow("user-1", "Legacy One"),
        goodRow("user-2", "Legacy Two"),
        // Depth-invalid: the seam schema admits it (id/label are
        // strings) but the door gate refuses — serve-quarantined.
        { ...goodRow("user-3", "Legacy Three"), label: 7 },
      ],
    }),
  );
  // Poison file for a second lane tenant is covered by the same
  // tenant tree walk; a poison presets.json for THIS tenant would
  // nuke the good rows' import, so poison rides its own tenant dir
  // (3d/body — estate-present, user-empty).
  const poisonDir = join(repoRoot, "data", "tenants", "3d", "body");
  mkdirSync(poisonDir, { recursive: true });
  writeFileSync(join(poisonDir, "presets.json"), "{not json at all");
  return repoRoot;
}

describe("presets ride the storage domain (sandbox boot)", () => {
  let sandbox: Sandbox | null = null;
  let stateRoot = "";
  let repoRoot = "";

  before(async (): Promise<void> => {
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-presets-"));
    repoRoot = seedRepo();
    sandbox = await bootSandbox({ token: TOKEN, stateRoot, repoRoot });
  });

  after((): void => {
    if (sandbox !== null) reap(sandbox.proc);
  });

  it("imports the legacy tree once (good ride in order, poison skips, files stay)", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const out = await listPresets(sandbox.port);
    assert.equal(out.status, 200, "list status");
    const doc = parsed(out.bytes) as Record<string, unknown>;
    assert.deepEqual(userIds(doc), ["user-1", "user-2"], "append order kept, depth-invalid quarantined: " + JSON.stringify(userIds(doc)));
    const presets = doc["presets"] as Record<string, unknown>[];
    const one = presets.find((p): boolean => p["id"] === "user-1");
    assert.equal(one?.["label"], "Legacy One");
    // The legacy files remain untouched (evidence, never truth).
    const legacy = JSON.parse(
      readFileSync(join(repoRoot, "data", "tenants", "3d", "anny", "presets.json"), "utf8"),
    ) as { presets: unknown[] };
    assert.equal(legacy.presets.length, 3, "legacy file untouched");
    // Poison tenant serves estate rows only (no user rows, no 500).
    const poisoned = await http(sandbox.port, "GET", "/v1/studios/3d/body/presets", { token: TOKEN });
    assert.equal(poisoned.status, 200, "poison tenant lists");
    assert.deepEqual(userIds(parsed(poisoned.bytes) as Record<string, unknown>), [], "poison file imports nothing");
  });

  it("save assigns the next user-N over the domain rows; the record materializes", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const saved = await http(sandbox.port, "POST", "/v1/studios/" + TENANT + "/presets", {
      body: JSON.stringify({ ...goodRow("user-pending", "Wall New"), id: undefined }),
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(saved.status, 201, "save status: " + saved.bytes.subarray(0, 200));
    const body = parsed(saved.bytes) as { preset: { id: string } };
    // user-3 is quarantined, not assigned — next over SERVED rows is user-3.
    assert.equal(body.preset.id, "user-3", "next id over the served rows");
    const key = Buffer.from(TENANT + "\nuser-3", "utf8").toString("base64url");
    const recPath = join(stateRoot, "storage", "presets", "rows", key + ".json");
    assert.ok(existsSync(recPath), "record materializes in the domain unit");
    const rec = JSON.parse(readFileSync(recPath, "utf8")) as {
      version: number;
      record: { tenant: string; row: Record<string, unknown> };
    };
    assert.equal(rec.version, 1);
    assert.equal(rec.record.tenant, TENANT);
    assert.equal(rec.record.row["label"], "Wall New");
  });

  it("refusal voices survive the migration", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const bad = await http(sandbox.port, "POST", "/v1/studios/" + TENANT + "/presets", {
      body: JSON.stringify({ label: "", origin: "authored", params: { phenotype: [0.5], local_changes: [] }, parts: {}, knobs: {} }),
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(bad.status, 400);
    assert.ok(
      String((parsed(bad.bytes) as Record<string, unknown>)["error"]).startsWith("bad preset row:"),
      "gate voice: " + bad.bytes.subarray(0, 120),
    );
    const unknown = await http(sandbox.port, "GET", "/v1/studios/nope/nope/presets", { token: TOKEN });
    assert.equal(unknown.status, 404);
    const missing = await http(sandbox.port, "DELETE", "/v1/studios/" + TENANT + "/presets/user-999", { token: TOKEN });
    assert.equal(missing.status, 404);
  });

  it("delete removes exactly one record", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const del = await http(sandbox.port, "DELETE", "/v1/studios/" + TENANT + "/presets/user-1", { token: TOKEN });
    assert.equal(del.status, 200);
    assert.equal((parsed(del.bytes) as Record<string, unknown>)["deleted"], "user-1");
    const out = await listPresets(sandbox.port);
    assert.deepEqual(userIds(parsed(out.bytes) as Record<string, unknown>), ["user-2", "user-3"]);
  });
});

describe("presets durability + the import marker (reboot the same roots)", () => {
  let first: Sandbox | null = null;
  let second: Sandbox | null = null;
  let stateRoot = "";
  let repoRoot = "";

  before(async (): Promise<void> => {
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-presets-rb-"));
    repoRoot = seedRepo();
    first = await bootSandbox({ token: TOKEN, stateRoot, repoRoot });
    const saved = await http(first.port, "POST", "/v1/studios/" + TENANT + "/presets", {
      body: JSON.stringify({ ...goodRow("user-pending", "Survives") }),
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(saved.status, 201, "boot-1 save");
    // A ghost row added to the legacy file between boots.
    const legacyPath = join(repoRoot, "data", "tenants", "3d", "anny", "presets.json");
    const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as { presets: Record<string, unknown>[] };
    legacy.presets.push(goodRow("user-99", "Ghost"));
    writeFileSync(legacyPath, JSON.stringify({ presets: legacy.presets }));
    reap((first as Sandbox).proc);
    first = null;
    second = await bootSandbox({ token: TOKEN, stateRoot, repoRoot });
  });

  after((): void => {
    if (first !== null) reap(first.proc);
    if (second !== null) reap(second.proc);
  });

  it("the saved row survives; the ghost never imports", async (): Promise<void> => {
    assert.ok(second !== null);
    const out = await listPresets(second.port);
    assert.equal(out.status, 200);
    const ids = userIds(parsed(out.bytes) as Record<string, unknown>);
    assert.ok(ids.includes("user-3"), "saved row survives: " + JSON.stringify(ids));
    assert.ok(!ids.includes("user-99"), "ghost stays a ghost: " + JSON.stringify(ids));
  });
});
