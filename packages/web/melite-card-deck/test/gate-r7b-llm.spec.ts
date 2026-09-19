// gate-r7b-llm.spec.ts — GATE R7b: the deck LLM stub's dark arm
// (src/index.ts:49 `req.url ?? '/'` path 2/2 — a request with no
// url). The handler refuses loud as an unknown lane (never a
// throw); plus a pin that an unlisted lane URL takes the same
// typed 404. Mirrors test/host-routes.spec.ts's ctx fake. Rides
// the node project.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { apply } from "../src/index.ts";

interface Reg { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }

function mount(): { routes: Reg[] } {
  const routes: Reg[] = [];
  const cordis = {
    effect(fn: () => unknown) { fn(); return () => {}; },
    webServer: {
      register(r: Reg) { routes.push(r); return () => {}; },
      registerUpgrade() { return () => {}; },
    },
    connection: {},
    logger: { info() {} },
  };
  apply(cordis as never);
  return { routes };
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

function llm(routes: Reg[]): Reg {
  const found = routes.find((r) => r.kind === "prefix" && r.path === "/v1/llm");
  assert.ok(found, "the /v1/llm prefix route is registered");
  return found!;
}

describe("the /v1/llm stub — the url-less request (the ?? / arm)", () => {
  it("a request with no url refuses loud as an unknown lane, never throws", async () => {
    const { routes } = mount();
    const { saw, res } = fakeRes();
    await llm(routes).handler({}, res);
    assert.equal(saw.status, 404);
    assert.equal((JSON.parse(saw.body.toString()) as { error: string }).error, "llm_lane_disabled");
    assert.ok((saw.headers["content-type"] ?? "").includes("application/json"));
  });

  it("an unlisted lane URL takes the same typed 404 (never 200+HTML)", async () => {
    const { routes } = mount();
    const { saw, res } = fakeRes();
    await llm(routes).handler({ url: "/v1/llm/nope", method: "GET", headers: {} }, res);
    assert.equal(saw.status, 404);
    assert.equal((JSON.parse(saw.body.toString()) as { error: string }).error, "llm_lane_disabled");
    assert.ok((saw.headers["content-type"] ?? "").includes("application/json"));
  });
});
