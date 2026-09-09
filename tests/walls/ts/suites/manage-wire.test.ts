// manage-wire.test.ts — the manage-wire envelope wall.
//
// Successor of the test_gateway_bridges_parity.py manage legs
// (condemned — read-only spec, never edited). Pins the TypeScript
// manage door (doors/bridges.ts handleManage over doors/manage.ts
// dispatchManage) against its wire contract, every leg against a
// SANDBOX boot (fresh MELITE_STATE_ROOT + fixture MELITE_REPO_ROOT —
// never the real tree, never :33081, never :18466):
//
//   bad-JSON 400 shape, method-mismatch 404 literal, list-body 500
//   keys, plane-unavailable 503 template (bogus MELITE_COMFY_MCP_BIN),
//   dispatch 422s (unknown action / empty body / missing arg),
//   catalog-miss 404 (the compiled-in frozen registry answers —
//   root-independent, no fixture seeding since the 2026-09-08
//   provisions.json convergence),
//   live status 200 (stub vendor rail), trailing-slash normalization,
//   auth 401 + the /v1/health exemption, and the resolveComfyMcpBin
//   unit probe.
//
// Hermetic discipline: NOTHING mutates — the legs use refusals
// (503/422/400/500/404), the read-only status probe (stub rail answers
// canned JSON; the fixture repo has no endpoint url, no ini, no runs),
// and template pins. No installs, downloads, lifecycle, or snapshots.
//
// CATALOG NOTE: the models-plane catalog (packages/engines/comfyui)
// lands beside this wall — the unknown-model leg pins its designed
// 404 ("not found in catalog") against the SEEDED fixture catalog.
// The catalogModule 503 ("model catalog is migrating") survives only
// for a genuinely missing engine build; it is not pinned here.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/manage-wire.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { accessSync, constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootSandbox, http, parsed, reap } from "../helpers/boot.ts";
import type { HttpOut, Sandbox } from "../helpers/boot.ts";
import { REPO_ROOT } from "../helpers/boot.ts";

const TOKEN = "wall-ts-manage-2026-09-08";
const STUB_BIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "mcp-stub.mjs");
const BOGUS_BIN = "/nonexistent-xyz-ts-wall-comfy-mcp";

function postManage(port: number, raw: string | Uint8Array): Promise<HttpOut> {
  return http(port, "POST", "/v1/manage", { body: raw, token: TOKEN, contentType: "application/json" });
}

/** The dispatch envelope (bridges normalize4xx adds code on 4xx only). */
function envelope(body: Buffer): Record<string, unknown> {
  const doc: unknown = parsed(body);
  assert.ok(typeof doc === "object" && doc !== null && !Array.isArray(doc), "manage body is not a dict: " + body.subarray(0, 160));
  return doc as Record<string, unknown>;
}

describe("manage wire (sandbox boot, stub vendor rail)", () => {
  let sandbox: Sandbox | null = null;

  before(async (): Promise<void> => {
    try {
      accessSync(STUB_BIN, constants.X_OK);
    } catch {
      assert.fail("mcp stub is not executable: " + STUB_BIN + " (chmod +x fixtures/mcp-stub.mjs)");
    }
    sandbox = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, seedCatalog: true });
  });

  after((): void => {
    if (sandbox !== null) reap(sandbox.proc);
  });

  const port = (): number => {
    assert.ok(sandbox !== null, "sandbox did not boot");
    return (sandbox as Sandbox).port;
  };

  it("bad-JSON 400 shape (status + code + prefix, never host bytes)", async (): Promise<void> => {
    const r: HttpOut = await postManage(port(), "{nope");
    assert.equal(r.status, 400);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.equal(doc["code"], "bad_json");
    assert.ok(String(doc["error"] ?? "").startsWith("bad JSON: "), "error prefix: " + r.bytes.subarray(0, 120));
  });

  it("method-mismatch 404 literal", async (): Promise<void> => {
    const r: HttpOut = await http(port(), "GET", "/v1/manage", { token: TOKEN });
    assert.equal(r.status, 404);
    assert.deepEqual(parsed(r.bytes), { error: "no such route GET /v1/manage", code: "no_such_route" });
  });

  it("list-body 500 shape (keys only — the text embeds the host traceback)", async (): Promise<void> => {
    const r: HttpOut = await postManage(port(), "[1,2]");
    assert.equal(r.status, 500);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.deepEqual(new Set(Object.keys(doc)), new Set(["error", "type", "traceback", "route"]));
    assert.ok(String(doc["error"] ?? "").includes("no attribute 'get'"), "error: " + r.bytes.subarray(0, 160));
  });

  it("unknown action 422 (action echo + ok + code + detail)", async (): Promise<void> => {
    const r: HttpOut = await postManage(port(), JSON.stringify({ action: "nope_no_such_action_ts" }));
    assert.equal(r.status, 422);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.equal(doc["action"], "nope_no_such_action_ts");
    assert.equal(doc["ok"], false);
    assert.equal(doc["code"], "invalid_request");
    assert.ok(String(doc["detail"] ?? "").includes("Input should be"), "detail: " + r.bytes.subarray(0, 200));
  });

  it("empty body 422 (Field required, action '?')", async (): Promise<void> => {
    const r: HttpOut = await postManage(port(), JSON.stringify({}));
    assert.equal(r.status, 422);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.equal(doc["action"], "?");
    assert.equal(doc["ok"], false);
    assert.equal(doc["code"], "invalid_request");
    assert.ok(String(doc["detail"] ?? "").includes("Field required"), "detail: " + r.bytes.subarray(0, 200));
  });

  it("missing arg 422 (install_extension requires: nodes)", async (): Promise<void> => {
    const r: HttpOut = await postManage(port(), JSON.stringify({ action: "install_extension" }));
    assert.equal(r.status, 422);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.equal(doc["action"], "install_extension");
    assert.equal(doc["ok"], false);
    assert.ok(
      String(doc["detail"] ?? "").includes("install_extension requires: nodes"),
      "detail: " + r.bytes.subarray(0, 200),
    );
  });

  it("unknown model 404 (designed catalog refusal, seeded fixture)", async (): Promise<void> => {
    const r: HttpOut = await postManage(
      port(),
      JSON.stringify({ action: "provision_model", model: "no-such-model-xyz-ts" }),
    );
    assert.equal(r.status, 404);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.equal(doc["action"], "provision_model");
    assert.equal(doc["ok"], false);
    assert.equal(doc["code"], "invalid_request");
    assert.ok(
      String(doc["detail"] ?? "").includes("not found in catalog"),
      "detail: " + r.bytes.subarray(0, 200),
    );
  });

  it("status 200 live shape (stub rail; values are stub/fixture truth)", async (): Promise<void> => {
    const r: HttpOut = await postManage(port(), JSON.stringify({ action: "status" }));
    assert.equal(r.status, 200);
    const doc: Record<string, unknown> = envelope(r.bytes);
    assert.equal(doc["action"], "status");
    assert.equal(doc["ok"], true);
    assert.equal(doc["detail"], "server not reachable");
    const data: unknown = doc["data"];
    assert.ok(typeof data === "object" && data !== null, "status carries a data dict");
    const endpoint: unknown = (data as Record<string, unknown>)["endpoint"];
    assert.ok(typeof endpoint === "object" && endpoint !== null, "status data carries endpoint");
    assert.equal((endpoint as Record<string, unknown>)["reachable"], false);
    assert.deepEqual((data as Record<string, unknown>)["active_runs"], []);
  });

  it("NO trailing-slash normalization (the framework law, 2026-09-09)", async (): Promise<void> => {
    // ROUTING 1:1: the webServer contract matches pathnames
    // VERBATIM ("no decoding, no normalization — handlers own
    // their pathname semantics"). The retired uvicorn rim
    // normalized /v1/manage/ ≡ /v1/manage — a py quirk that died
    // with the shadow router. The pin now guards the DEATH: the
    // slashed form matches no exact row and answers 404, never a
    // byte-equal replay of the canonical route.
    const raw: string = JSON.stringify({ action: "nope_no_such_action_ts" });
    const a: HttpOut = await postManage(port(), raw);
    const b: HttpOut = await http(port(), "POST", "/v1/manage/", {
      body: raw,
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(a.status, 422, "canonical route must still answer 422");
    assert.equal(b.status, 404, "slashed form must NOT normalize onto the route");
  });

  it("auth 401 without token; /v1/health exempt", async (): Promise<void> => {
    const r: HttpOut = await http(port(), "POST", "/v1/manage", {
      body: JSON.stringify({ action: "status" }),
      contentType: "application/json",
    });
    assert.equal(r.status, 401);
    assert.ok(String((envelope(r.bytes))["error"] ?? "").includes("unauthorized"), "401: " + r.bytes.subarray(0, 160));
    const h: HttpOut = await http(port(), "GET", "/v1/health");
    assert.equal(h.status, 200);
    assert.equal((parsed(h.bytes) as Record<string, unknown>)["status"], "ok");
  });
});

describe("manage plane-unavailable template (sandbox boot, bogus bin)", () => {
  let sandbox: Sandbox | null = null;

  before(async (): Promise<void> => {
    sandbox = await bootSandbox({ mcpBin: BOGUS_BIN, token: TOKEN });
  });

  after((): void => {
    if (sandbox !== null) reap(sandbox.proc);
  });

  it("bogus MELITE_COMFY_MCP_BIN 503 template (5xx carries no code)", async (): Promise<void> => {
    assert.ok(sandbox !== null, "sandbox did not boot");
    const r: HttpOut = await postManage((sandbox as Sandbox).port, JSON.stringify({ action: "status" }));
    assert.equal(r.status, 503);
    assert.deepEqual(parsed(r.bytes), {
      action: "status",
      ok: false,
      detail: "management plane unavailable: no vendor comfy-mcp at " + BOGUS_BIN + " (provision sync)",
    });
  });
});

describe("resolveComfyMcpBin unit probe (env pin + anchor default)", () => {
  it("default is the anchored base-env bin; the env pin wins", (): void => {
    const bridges: string = join(REPO_ROOT, "packages", "gateway", "doors", "src", "doors", "bridges.ts");
    const wantDefault: string = join(REPO_ROOT, "infra", "python", ".venv", "bin", "comfy-mcp");
    const probe: string =
      "import(" + JSON.stringify("file://" + bridges) + ").then((m) => {" +
      "delete process.env.MELITE_COMFY_MCP_BIN;" +
      "const a = m.resolveComfyMcpBin();" +
      "if (a !== " + JSON.stringify(wantDefault) + ") {" +
      "console.error('unexpected default ' + a); process.exit(1); }" +
      "process.env.MELITE_COMFY_MCP_BIN = '/pin/comfy-mcp';" +
      "const b = m.resolveComfyMcpBin();" +
      "if (b !== '/pin/comfy-mcp') { console.error('pin ' + b); process.exit(1); }" +
      "console.log('RESOLVE-OK'); });";
    const r = spawnSync(process.execPath, ["--no-warnings", "--experimental-strip-types", "--eval", probe], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      timeout: 60000,
      env: { ...process.env, MELITE_COMFY_MCP_BIN: "" },
    });
    assert.equal(r.status, 0, "probe failed: " + ((r.stderr as string) || (r.stdout as string)).slice(-400));
    assert.ok((r.stdout as string).includes("RESOLVE-OK"), "probe output: " + (r.stdout as string).slice(-200));
  });
});
