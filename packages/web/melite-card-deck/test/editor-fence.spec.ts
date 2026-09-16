// editor-fence.spec — the /editor shim's two rare refusal arms (the
// host-routes battery pins the common shapes; these two need
// percent-encoded URLs that survive WHATWG parsing):
//
//   - a malformed percent sequence (%E0%A4%A) trips decodeURIComponent
//     → 400, never a throw past the handler;
//   - an extensionless %2f-encoded traversal decodes INSIDE the
//     /editor claim but resolves OUTSIDE the dist root → 404, never
//     the SPA index fallback (an extensionless outside path must not
//     render the index).
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply } from "../src/index.ts";

interface Reg { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }

function mount(): Reg[] {
  const routes: Reg[] = [];
  const cordis = {
    effect(fn: () => unknown) { fn(); return () => {}; },
    webServer: {
      register(r: Reg) { routes.push(r); return () => {}; },
    },
    connection: {
      authorizeIndex() { return true; },
    },
    logger: { info() {} },
  };
  apply(cordis as never);
  return routes;
}

function pick(routes: Reg[], url: string): Reg {
  const p: string = url.split("?")[0]!;
  const prefixes: Reg[] = routes
    .filter((r) => r.kind === "prefix" && p.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length);
  if (prefixes.length === 0) throw new Error("no route for " + url);
  return prefixes[0]!;
}

async function hit(routes: Reg[], url: string): Promise<{ status: number; body: Buffer }> {
  const saw = { status: 0, body: Buffer.alloc(0) };
  const res = {
    writeHead(status: number) { saw.status = status; },
    end(body: unknown = Buffer.alloc(0)) {
      saw.body = typeof body === "string" ? Buffer.from(body) : (body as Buffer);
    },
  };
  await pick(routes, url).handler({ url, method: "GET", headers: {} }, res);
  return saw;
}

let dist = "";
let savedEnv = "";

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), "deck-fence-dist-"));
  writeFileSync(join(dist, "index.html"), "<html><body>editor</body></html>");
  savedEnv = process.env["MELITE_EDITOR_DIST"] ?? "";
  process.env["MELITE_EDITOR_DIST"] = dist;
});

afterAll(() => {
  if (savedEnv === "") delete process.env["MELITE_EDITOR_DIST"];
  else process.env["MELITE_EDITOR_DIST"] = savedEnv;
  rmSync(dist, { recursive: true, force: true });
});

describe("the /editor shim's rare refusals", () => {
  it("a malformed percent sequence is a 400, never a throw", async () => {
    const routes = mount();
    const saw = await hit(routes, "/editor/%E0%A4%A");
    assert.equal(saw.status, 400);
  });

  it("an extensionless encoded traversal inside the claim 404s, never the index", async () => {
    const routes = mount();
    const saw = await hit(routes, "/editor/..%2f..%2fno-such-route");
    assert.equal(saw.status, 404);
    assert.ok(!saw.body.toString().includes("editor"), "outside paths never fall through to the index");
  });

  it("the bare /editor claim (no trailing slash) renders the index", async () => {
    const routes = mount();
    const saw = await hit(routes, "/editor");
    assert.equal(saw.status, 200);
    assert.ok(saw.body.toString().includes("editor"));
  });

  it("an extensionless directory renders the index (the isDirectory arm)", async () => {
    const routes = mount();
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(dist, "docs"));
    const saw = await hit(routes, "/editor/docs");
    assert.equal(saw.status, 200);
    assert.ok(saw.body.toString().includes("editor"));
  });

  it("an existing extensionless file serves its bytes (the stat-hit arm)", async () => {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(dist, "LICENSE"), "melite editor license");
    const routes = mount();
    const saw = await hit(routes, "/editor/LICENSE");
    assert.equal(saw.status, 200);
    assert.ok(saw.body.toString().includes("melite editor license"));
  });

  it("a missing req.url never throws (both handlers default it)", async () => {
    const routes = mount();
    const llm = pick(routes, "/v1/llm/keys");
    const sawLlm = { status: 0, body: Buffer.alloc(0) };
    await llm.handler({}, {
      writeHead(status: number) { sawLlm.status = status; },
      end(body: unknown = Buffer.alloc(0)) {
        sawLlm.body = typeof body === "string" ? Buffer.from(body) : (body as Buffer);
      },
    });
    assert.equal(sawLlm.status, 404);
    const editor = pick(routes, "/editor/");
    const sawEd = { status: 0 };
    await editor.handler({ method: "GET" }, { writeHead(status: number) { sawEd.status = status; }, end() {} });
    // the default url IS the claim root — the index serves (the ??
    // arm is pinned without a throw either way).
    assert.equal(sawEd.status, 200);
  });

  it("apply without MELITE_EDITOR_DIST falls back to the family-relative default", async () => {
    const saved = process.env["MELITE_EDITOR_DIST"];
    delete process.env["MELITE_EDITOR_DIST"];
    try {
      const routes = mount();
      // the LLM lane never touches the dist tree — the default arm is
      // pinned without depending on the family dist existing.
      const saw = await hit(routes, "/v1/llm/keys");
      assert.equal(saw.status, 200);
    } finally {
      if (saved !== undefined) process.env["MELITE_EDITOR_DIST"] = saved;
    }
  });
});
