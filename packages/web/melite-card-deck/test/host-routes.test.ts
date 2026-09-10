// host-routes.test — THE DECK HOST CONTRACT (rewritten 2026-09-10,
// FIX-IT stroke; the estate-collapse cut).
//
// The old file asserted a deleted world (bun:test import — a retired
// runner — plus /v1|/comfyui|/poser|/health proxies and the events WS
// tunnel, all retired with the second Loader). It ran NOWHERE and
// pinned NOTHING. This file pins what src/index.ts actually
// registers, under node:test:
//
//   - registration: exactly `prefix /v1/llm` + `prefix /editor` —
//     no /v1 proxies, no /comfyui, no /poser, no /health, no
//     /ray-deck/*, no WS upgrades at all (absence pins!);
//   - the /v1/llm lane is stubbed at the wire (the assistant lives
//     in DSH): the stub table + the unknown-lane 404;
//   - /editor serves a fixture dist through DSH's serveStatic
//     (traversal fence, MIME table, index auth): index, asset,
//     SPA fallback, miss 404, traversal 403, non-GET/HEAD 405.
//
// No gateway, no network, no DSH host: fixture dist on disk, fake
// cordis ctx, node-http-shaped req/res.
//
// Run: node --experimental-strip-types --test packages/web/melite-card-deck/test/host-routes.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply } from "../src/index.ts";

interface Reg { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }
interface Ctx {
  routes: Reg[];
  upgrades: unknown[];
  authorizeCalls: number;
  authorizeAnswer: boolean;
}

function mount(): Ctx {
  const ctx: Ctx = { routes: [], upgrades: [], authorizeCalls: 0, authorizeAnswer: true };
  const cordis = {
    effect(fn: () => unknown) { fn(); return () => {}; },
    webServer: {
      register(r: Reg) { ctx.routes.push(r); return () => {}; },
      registerUpgrade(u: unknown) { ctx.upgrades.push(u); return () => {}; },
    },
    connection: {
      // The DSH contract: true = serve; false = the response is
      // ALREADY owned (Connection wrote the 401 itself).
      authorizeIndex(_req: unknown, res: {
        writeHead: (s: number, h?: Record<string, string>) => void;
        end: (b?: unknown) => void;
      }) {
        ctx.authorizeCalls++;
        if (!ctx.authorizeAnswer) {
          res.writeHead(401, { "content-type": "text/plain" });
          res.end("unauthorized");
        }
        return ctx.authorizeAnswer;
      },
    },
    logger: { info() {} },
  };
  apply(cordis as never);
  return ctx;
}

function fakeReq(url: string, method = "GET"): unknown {
  return { url, method, headers: {} };
}

interface Saw { status: number; headers: Record<string, string>; body: Buffer }

function fakeRes(): { saw: Saw; res: unknown } {
  const saw: Saw = { status: 0, headers: {}, body: Buffer.alloc(0) };
  const res = {
    writeHead(status: number, headers: Record<string, string> = {}) {
      saw.status = status;
      saw.headers = headers;
    },
    end(body: unknown = Buffer.alloc(0)) {
      saw.body = typeof body === "string" ? Buffer.from(body) : (body as Buffer);
    },
  };
  return { saw, res };
}

function pick(routes: Reg[], url: string): Reg {
  const p: string = url.split("?")[0]!;
  const exact: Reg[] = routes.filter((r) => r.kind === "exact" && r.path === p);
  if (exact.length > 0) return exact[0]!;
  const prefixes: Reg[] = routes
    .filter((r) => r.kind === "prefix" && p.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length);
  if (prefixes.length === 0) throw new Error("no route for " + url);
  return prefixes[0]!;
}

async function hit(ctx: Ctx, url: string, method = "GET"): Promise<Saw> {
  const { saw, res } = fakeRes();
  await pick(ctx.routes, url).handler(fakeReq(url, method), res);
  return saw;
}

// ── fixture dist (RAY_EDITOR_DIST is read at apply time) ──────────
let dist = "";
let savedEnv = "";

before(() => {
  dist = mkdtempSync(join(tmpdir(), "deck-editor-dist-"));
  writeFileSync(join(dist, "index.html"), "<html><body>editor</body></html>");
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "assets", "main-abc.js"), "console.log(1)");
  savedEnv = process.env["RAY_EDITOR_DIST"] ?? "";
  process.env["RAY_EDITOR_DIST"] = dist;
});

after(() => {
  if (savedEnv === "") delete process.env["RAY_EDITOR_DIST"];
  else process.env["RAY_EDITOR_DIST"] = savedEnv;
  rmSync(dist, { recursive: true, force: true });
});

describe("registration shape (the collapse cut)", () => {
  it("registers exactly the LLM stub + the editor static — nothing else", () => {
    const ctx = mount();
    const byPath: string[] = ctx.routes.map((r) => `${r.kind} ${r.path}`).sort();
    assert.deepEqual(byPath, ["prefix /editor", "prefix /v1/llm"]);
    assert.deepEqual(ctx.upgrades, []);
  });

  it("THE RETIREMENT PINS: no proxies, no tunnel, no deck doors", () => {
    const ctx = mount();
    const every: string[] = [...ctx.routes.map((r) => r.path)];
    for (const dead of ["/v1/", "/comfyui", "/poser", "/health", "/ray-deck", "/editor/assets/runs"]) {
      assert.ok(!every.some((p) => p === dead || p.startsWith(dead + "/")), `dead route back: ${dead}`);
    }
  });
});

describe("the /v1/llm stub (the assistant lives in DSH)", () => {
  it("serves the stub table", async () => {
    const ctx = mount();
    const keys = await hit(ctx, "/v1/llm/keys");
    assert.equal(keys.status, 200);
    assert.deepEqual(JSON.parse(keys.body.toString()), { keys: [] });
    const health = await hit(ctx, "/v1/llm/health");
    assert.equal(health.status, 200);
    assert.equal((JSON.parse(health.body.toString()) as { reason: string }).reason, "dsh_owns_the_assistant");
    const providers = await hit(ctx, "/v1/llm/providers");
    assert.deepEqual(JSON.parse(providers.body.toString()), { providers: [] });
    const active = await hit(ctx, "/v1/llm/keys/active");
    assert.equal(active.status, 404);
    assert.equal((JSON.parse(active.body.toString()) as { error: string }).error, "no_active_key");
  });

  it("unknown LLM lanes refuse loud, never 200+HTML", async () => {
    const ctx = mount();
    const saw = await hit(ctx, "/v1/llm/something-new?x=1");
    assert.equal(saw.status, 404);
    assert.equal((JSON.parse(saw.body.toString()) as { error: string }).error, "llm_lane_disabled");
    assert.ok((saw.headers["content-type"] ?? "").includes("application/json"));
  });
});

describe("/editor static (DSH serveStatic)", () => {
  it("serves index at the root and the index path, authed", async () => {
    const ctx = mount();
    for (const url of ["/editor/", "/editor/index.html", "/editor/?x=1"]) {
      const saw = await hit(ctx, url);
      assert.equal(saw.status, 200);
      assert.ok(saw.body.toString().includes("editor"));
      assert.ok((saw.headers["content-type"] ?? "").includes("text/html"));
    }
    assert.ok(ctx.authorizeCalls >= 3, "index responses pass the connection fence");
  });

  it("refuses the index when the fence says no (Connection owns the 401)", async () => {
    const ctx = mount();
    ctx.authorizeAnswer = false;
    const saw = await hit(ctx, "/editor/");
    assert.equal(saw.status, 401);
  });

  it("serves assets with DSH MIME types", async () => {
    const ctx = mount();
    const saw = await hit(ctx, "/editor/assets/main-abc.js");
    assert.equal(saw.status, 200);
    assert.ok((saw.headers["content-type"] ?? "").includes("javascript"));
    assert.equal(saw.body.toString(), "console.log(1)");
  });

  it("SPA fallback: extensionless misses render index", async () => {
    const ctx = mount();
    const saw = await hit(ctx, "/editor/some/client/route");
    assert.equal(saw.status, 200);
    assert.ok(saw.body.toString().includes("editor"));
  });

  it("asset misses 404 honestly", async () => {
    const ctx = mount();
    const saw = await hit(ctx, "/editor/assets/nope.js");
    assert.equal(saw.status, 404);
  });

  it("traversal is fenced, never file bytes and never the index", async () => {
    const ctx = mount();
    // WHATWG URL normalizes %2e dot segments before dispatch, so
    // most traversal never reaches the claim (404); %2f-encoded
    // separators survive to serveStatic's own fence (403); an
    // extensionless foreign path 404s in the SPA shim (never the
    // index). Every layer refuses; nothing discloses.
    const cases: Array<[string, number]> = [
      ["/editor/../secret", 404],
      ["/editor/%2e%2e/%2e%2e/etc/passwd", 404],
      ["/editor/..%2f..%2fetc%2fhosts.txt", 403],
      ["/editor/%2e%2e/%2e%2e/no-such-file-xyz", 404],
    ];
    for (const [url, status] of cases) {
      const saw = await hit(ctx, url);
      assert.equal(saw.status, status, `${url} -> ${saw.status}`);
      assert.ok(!saw.body.toString().includes("root:"), "no file disclosure");
      assert.ok(!saw.body.toString().includes("editor"), "no index fallback for foreign paths");
    }
  });

  it("non-GET/HEAD is 405 (the DSH static contract)", async () => {
    const ctx = mount();
    const saw = await hit(ctx, "/editor/", "POST");
    assert.equal(saw.status, 405);
  });
});
