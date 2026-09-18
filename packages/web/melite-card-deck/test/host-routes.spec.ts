// host-routes.spec — THE DECK HOST CONTRACT (rewritten 2026-09-10,
// FIX-IT stroke; the estate-collapse cut. Migrated to root vitest
// 2026-09-11: rides the node project).
//
// The old file asserted a deleted world (bun:test import — a retired
// runner — plus /v1|/comfyui|/poser|/health proxies and the events WS
// tunnel, all retired with the second Loader). It ran NOWHERE and
// pinned NOTHING. This file pins what src/index.ts actually
// registers, under vitest:
//
//   - registration: exactly `prefix /v1/llm` + `prefix /editor` —
//     no /v1 proxies, no /comfyui, no /poser, no /health, no
//     /ray-deck/*, no WS upgrades at all (absence pins!);
//   - the /v1/llm lane is stubbed at the wire (the assistant lives
//     in DSH): the stub table + the unknown-lane 404;
//   - /editor is retired (the collapse cut); only the llm stub stands
//     (traversal fence, MIME table, index auth): index, asset,
//     SPA fallback, miss 404, traversal 403, non-GET/HEAD 405.
//
// No gateway, no network, no DSH host: fixture dist on disk, fake
// cordis ctx, node-http-shaped req/res.
//
// Run: npx vitest run packages/web/melite-card-deck/test/host-routes.spec.ts
import {describe, it} from "vitest";
import assert from "node:assert/strict";
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

describe("registration shape (the collapse cut)", () => {
  it("registers exactly the LLM stub — nothing else", () => {
    const ctx = mount();
    const byPath: string[] = ctx.routes.map((r) => `${r.kind} ${r.path}`).sort();
    assert.deepEqual(byPath, ["prefix /v1/llm"]);
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
