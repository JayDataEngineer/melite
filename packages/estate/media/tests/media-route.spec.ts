// media-route.spec.ts — the runs byte route + mediaUrl + the media
// remote + the list arm's uncovered edges, pinned behavioral.
//
// The byte route is driven through a fake `webServer` seat provided
// on a REAL cordis Context (`ctx.provide("webServer", fake)` whose
// `register(row)` RECORDS the row), mounted via
// `await ctx.plugin({ name: "t-probe", apply })`, then the captured
// handler is driven two ways: hand-rolled req/res fakes recording
// `writeHead`/`end` args (precise header/body deep-equals), and —
// for one arm — a REAL `node:http` server on an ephemeral port
// asserting status/headers/body bytes via fetch (the estate's
// real-server pattern). The `queue` seat rides
// `ctx.provide("queue", { stateRoot })` or stays absent (the 502
// arm). TMP OWNERSHIP: every tree is test-owned via mintRoot() +
// onTestFinished disposal. No mocks, no `any` — casts only at the
// cordis Service boundary.
import { describe, onTestFinished, test } from "vitest";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  apply as mediaApply,
  listMedia,
  MEDIA_PREFIX,
  mediaUrl,
  MediaRemoteService,
} from "../src/index.ts";

const NOT_FOUND_BODY = '{"error":"media/not-found"}';
const NO_QUEUE_BODY =
  '{"error":"estate-media/no-queue-seat","message":"mount @melite-plugin/melite-estate (the queue seat owns the runs tree root)"}';
const METHOD_BODY = '{"error":"media/method-not-allowed"}';
const sig = new AbortController().signal;

/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "media-route-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** Seed one run dir with rel-path → bytes rows; returns the run dir. */
function seedRun(
  root: string,
  runId: string,
  files: Record<string, string | Buffer>,
): string {
  const dir = join(root, "output", runId);
  mkdirSync(dir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const file = join(dir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  return dir;
}

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;

interface Seen {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  ended: boolean;
}

function fakeRes(): { res: ServerResponse; seen: Seen } {
  const seen: Seen = {
    status: 0,
    headers: {},
    body: Buffer.alloc(0),
    ended: false,
  };
  const res = {
    writeHead(status: number, headers: Record<string, string>): void {
      seen.status = status;
      seen.headers = { ...headers };
    },
    end(body?: unknown): void {
      seen.ended = true;
      if (body !== undefined)
        seen.body = Buffer.isBuffer(body)
          ? body
          : Buffer.from(String(body));
    },
  };
  return { res: res as unknown as ServerResponse, seen };
}

function fakeReq(method: string, url?: string): IncomingMessage {
  const req = url === undefined ? { method } : { method, url };
  return req as unknown as IncomingMessage;
}

async function drive(
  handler: Handler,
  method: string,
  url?: string,
): Promise<Seen> {
  const { res, seen } = fakeRes();
  await handler(fakeReq(method, url), res);
  return seen;
}

interface Mount {
  ctx: Context;
  rows: Array<{ kind: string; path: string; handler: Handler }>;
  handler: Handler;
}

/** Mount the plugin on a fresh Context with a recording webServer
 *  seat and an optional queue seat; deep-equals the registered row. */
async function mountWeb(stateRoot: string | undefined): Promise<Mount> {
  const ctx = new Context();
  const rows: Array<{ kind: string; path: string; handler: Handler }> = [];
  ctx.provide("webServer", {
    register: (row: { kind: string; path: string; handler: Handler }) => {
      rows.push(row);
      return () => undefined;
    },
  });
  if (stateRoot !== undefined) ctx.provide("queue", { stateRoot });
  await ctx.plugin({ name: "t-probe", apply: mediaApply } as never);
  assert.equal(rows.length, 1, "one prefix row registers");
  const row = rows[0] as { kind: string; path: string; handler: Handler };
  assert.deepEqual(
    { kind: row.kind, path: row.path },
    { kind: "prefix", path: MEDIA_PREFIX },
  );
  assert.equal(typeof row.handler, "function");
  return { ctx, rows, handler: row.handler };
}

describe("the mount halves", () => {
  test("headless mount: no webServer seat keeps the list door, route unmounted", async () => {
    const ctx = new Context();
    await ctx.plugin({ name: "t-probe", apply: mediaApply } as never);
    const remote = (
      ctx as unknown as { mediaRemote?: unknown }
    ).mediaRemote;
    assert.ok(
      remote instanceof MediaRemoteService,
      "the list remote rides headless mounts",
    );
    assert.equal(
      (
        remote as unknown as {
          typertRemote: { namespace: string };
        }
      ).typertRemote.namespace,
      "media",
    );
  });

  test("web mount registers the prefix route", async () => {
    const root = mintRoot();
    await mountWeb(root);
  });
});

describe("the byte route refusals", () => {
  test("non-GET/HEAD is a loud 405 with the allow header", async () => {
    const root = mintRoot();
    const { handler } = await mountWeb(root);
    for (const method of ["POST", "PUT", "DELETE"]) {
      const seen = await drive(
        handler,
        method,
        `${MEDIA_PREFIX}/run-aaa1-x/a.png`,
      );
      assert.equal(seen.status, 405);
      assert.deepEqual(seen.headers, {
        "content-type": "application/json",
        allow: "GET, HEAD",
        "cache-control": "no-store",
      });
      assert.deepEqual(seen.body.toString(), METHOD_BODY);
      assert.equal(seen.ended, true);
    }
  });

  test("short paths never parse: prefix alone and run-only are 404", async () => {
    const root = mintRoot();
    const { handler } = await mountWeb(root);
    for (const url of [`${MEDIA_PREFIX}/`, `${MEDIA_PREFIX}/run-aaa1-x`]) {
      const seen = await drive(handler, "GET", url);
      assert.equal(seen.status, 404);
      assert.deepEqual(seen.headers, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
    }
  });

  test("a runId outside the mint grammar is a 404, never a tree walk", async () => {
    const root = mintRoot();
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/notarun/a.png`);
    assert.equal(seen.status, 404);
    assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
  });

  test("a confined-grammar violation in rel is a 404", async () => {
    const root = mintRoot();
    const { handler } = await mountWeb(root);
    const bang = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/bad!seg`,
    );
    assert.equal(bang.status, 404);
    assert.deepEqual(bang.body.toString(), NOT_FOUND_BODY);
    // %20 survives URL parsing as a literal % sequence — outside the
    // segment grammar, so still a 404, never a decoded walk.
    const space = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/a%20b.png`,
    );
    assert.equal(space.status, 404);
    assert.deepEqual(space.body.toString(), NOT_FOUND_BODY);
  });

  test("a request without a URL cannot parse: 404", async () => {
    const root = mintRoot();
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "GET", undefined);
    assert.equal(seen.status, 404);
    assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
  });

  test("a web mount without the queue seat is a loud 502 naming the fix", async () => {
    const { handler } = await mountWeb(undefined);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/a.png`,
    );
    assert.equal(seen.status, 502);
    assert.deepEqual(seen.headers, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body.toString(), NO_QUEUE_BODY);
  });

  test("missing bytes are a loud 404: ghost run and ghost file", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "bytes" });
    const { handler } = await mountWeb(root);
    const ghostRun = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-fff9-ghost/a.png`,
    );
    assert.equal(ghostRun.status, 404);
    assert.deepEqual(ghostRun.body.toString(), NOT_FOUND_BODY);
    const ghostFile = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/nope.png`,
    );
    assert.equal(ghostFile.status, 404);
    assert.deepEqual(ghostFile.body.toString(), NOT_FOUND_BODY);
  });

  test("a symlink escaping the run dir is contained: 404, never the outside bytes", async () => {
    const root = mintRoot();
    writeFileSync(join(root, "secret.png"), "OUTSIDE");
    const dir = seedRun(root, "run-aaa1-x", { "a.png": "inside" });
    symlinkSync(join(root, "secret.png"), join(dir, "evil.png"));
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/evil.png`,
    );
    assert.equal(seen.status, 404);
    assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
  });

  test("a directory path stats but is not a file: 404", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "stage/a.png": "x" });
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-aaa1-x/stage`);
    assert.equal(seen.status, 404);
    assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
  });
});

describe("the byte route serves", () => {
  test("a symlinked run dir resolves before containment: bytes serve", async () => {
    const root = mintRoot();
    const real = join(root, "real-store");
    mkdirSync(real, { recursive: true });
    writeFileSync(join(real, "a.png"), "REAL");
    mkdirSync(join(root, "output"), { recursive: true });
    symlinkSync(real, join(root, "output", "run-aaa1-link"));
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-link/a.png`,
    );
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.body, Buffer.from("REAL"));
  });

  test("HEAD answers the headers with an empty body", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "0123456789" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "HEAD",
      `${MEDIA_PREFIX}/run-aaa1-x/a.png`,
    );
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.headers, {
      "content-type": "image/png",
      "content-length": "10",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, Buffer.alloc(0));
    assert.equal(seen.ended, true);
  });

  test("GET serves the file bytes with the extension's content type (png)", async () => {
    const root = mintRoot();
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    seedRun(root, "run-aaa1-x", { "a.png": bytes });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/a.png`,
    );
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.headers, {
      "content-type": "image/png",
      "content-length": "5",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, bytes);
  });

  test("GET serves mp4 as video/mp4", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "clip.mp4": "VID" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/clip.mp4`,
    );
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.headers, {
      "content-type": "video/mp4",
      "content-length": "3",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, Buffer.from("VID"));
  });

  test("GET serves unknown extensions as octet-stream", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "blob.weirdxyz": "ZZ" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/blob.weirdxyz`,
    );
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.headers, {
      "content-type": "application/octet-stream",
      "content-length": "2",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, Buffer.from("ZZ"));
  });

  test("GET serves extensionless names as octet-stream", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "noext": "NE" });
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-aaa1-x/noext`);
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.headers, {
      "content-type": "application/octet-stream",
      "content-length": "2",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, Buffer.from("NE"));
  });

  test("the captured handler serves real bytes over a real HTTP server", async () => {
    const root = mintRoot();
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    seedRun(root, "run-aaa1-x", { "a.png": bytes });
    const { handler } = await mountWeb(root);
    const server = createServer((req, res) => {
      void handler(req, res);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    try {
      const port = (server.address() as AddressInfo).port;
      const res = await fetch(
        `http://127.0.0.1:${String(port)}${MEDIA_PREFIX}/run-aaa1-x/a.png`,
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "image/png");
      assert.equal(res.headers.get("content-length"), "5");
      assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe("mediaUrl", () => {
  test("empty names pass through", () => {
    assert.equal(mediaUrl("run-aaa1-x", ""), "");
  });

  test("absolute URLs and rooted paths pass verbatim", () => {
    assert.equal(
      mediaUrl("run-aaa1-x", "https://cdn.invalid/a.png"),
      "https://cdn.invalid/a.png",
    );
    assert.equal(
      mediaUrl("run-aaa1-x", "http://cdn.invalid/a.png"),
      "http://cdn.invalid/a.png",
    );
    assert.equal(mediaUrl("run-aaa1-x", "/abs/a.png"), "/abs/a.png");
  });

  test("bare names mint the route grammar with per-segment encoding", () => {
    assert.equal(
      mediaUrl("run-aaa1-x", "a.png"),
      `${MEDIA_PREFIX}/run-aaa1-x/a.png`,
    );
    assert.equal(
      mediaUrl("run-aaa1-x", "stage/out 1.png"),
      `${MEDIA_PREFIX}/run-aaa1-x/stage/out%201.png`,
    );
  });
});

describe("listMedia edges", () => {
  test("a RUN_ID-named file in output/ is not a run: skipped, never an error", async () => {
    const root = mintRoot();
    mkdirSync(join(root, "output"), { recursive: true });
    writeFileSync(join(root, "output", "run-fff9-notadir"), "x");
    seedRun(root, "run-aaa1-x", { "a.png": "x" });
    const { count, items } = await listMedia(root, "all");
    assert.equal(count, 1);
    assert.deepEqual(
      items.map((i) => i.name),
      ["a.png"],
    );
  });

  test("raced run entries sort through the zero fallback and walk-skip to the survivors", async () => {
    const root = mintRoot();
    mkdirSync(join(root, "output"), { recursive: true });
    symlinkSync(join(root, "nope-a"), join(root, "output", "run-aaa1-ghost"));
    symlinkSync(join(root, "nope-b"), join(root, "output", "run-bbb2-gone"));
    seedRun(root, "run-ccc3-real", { "a.png": "x" });
    const { count, items } = await listMedia(root, "image");
    assert.equal(count, 1);
    assert.deepEqual(
      items.map((i) => i.runId),
      ["run-ccc3-real"],
    );
  });

  test("depth past run/stage/file stops: nested names mint, deeper names never list", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-deep", {
      "top.png": "t",
      "l1/l2/deep.png": "d",
      "l1/l2/l3/toodeep.png": "x",
    });
    const { count, items } = await listMedia(root, "all");
    assert.equal(count, 2);
    assert.deepEqual(
      items.map((i) => i.name).sort(),
      ["l1/l2/deep.png", "top.png"],
    );
  });

  test("non-file entries never list: symlinks skip", async () => {
    const root = mintRoot();
    const dir = seedRun(root, "run-aaa1-x", { "real.png": "x" });
    symlinkSync(join(dir, "real.png"), join(dir, "link.png"));
    const { count, items } = await listMedia(root, "image");
    assert.equal(count, 1);
    assert.deepEqual(
      items.map((i) => i.name),
      ["real.png"],
    );
  });

  test("extensionless files never list", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "gen.png": "x", README: "x" });
    const { count, items } = await listMedia(root, "image");
    assert.equal(count, 1);
    assert.deepEqual(
      items.map((i) => i.name),
      ["gen.png"],
    );
  });

  test("the picker caps at 300: later runs starve once the cap is hit", async () => {
    const root = mintRoot();
    const after = seedRun(root, "run-aaa1-after", { "after.png": "x" });
    const cap = seedRun(root, "run-bbb2-cap", {});
    for (let i = 0; i < 310; i++)
      writeFileSync(join(cap, `f${String(i).padStart(3, "0")}.png`), "");
    // Newest-first: the cap run walks before the older run, fills the
    // page, and the older run's walk starves at the cap guard.
    const now = Date.now();
    utimesSync(after, new Date(now - 100_000), new Date(now - 100_000));
    utimesSync(cap, new Date(now), new Date(now));
    const { count, items } = await listMedia(root, "all");
    assert.equal(count, 300);
    assert.equal(items.length, 300);
    assert.ok(items.every((i) => i.runId === "run-bbb2-cap"));
    assert.equal(
      items.some((i) => i.name === "after.png"),
      false,
    );
  }, 30_000);

  test("runs list newest-first by run-dir mtime", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-old", { "a.png": "x" });
    seedRun(root, "run-bbb2-new", { "b.png": "x" });
    const now = Date.now();
    utimesSync(
      join(root, "output", "run-aaa1-old"),
      new Date(now),
      new Date(now),
    );
    utimesSync(
      join(root, "output", "run-bbb2-new"),
      new Date(now - 100_000),
      new Date(now - 100_000),
    );
    const { items } = await listMedia(root, "all");
    assert.deepEqual(
      items.map((i) => i.runId),
      ["run-aaa1-old", "run-bbb2-new"],
    );
  });

  test("files within a run list newest-first by file mtime", async () => {
    const root = mintRoot();
    const dir = seedRun(root, "run-aaa1-x", {
      "old.png": "x",
      "new.png": "x",
    });
    const now = Date.now();
    utimesSync(
      join(dir, "old.png"),
      new Date(now - 100_000),
      new Date(now - 100_000),
    );
    utimesSync(join(dir, "new.png"), new Date(now), new Date(now));
    const { items } = await listMedia(root, "image");
    assert.deepEqual(
      items.map((i) => i.name),
      ["new.png", "old.png"],
    );
  });
});

describe("the media remote", () => {
  test("the constructor binds the media namespace on the context", async () => {
    const root = mintRoot();
    const ctx = new Context();
    ctx.provide("queue", { stateRoot: root });
    const svc = new MediaRemoteService(ctx);
    assert.ok(svc instanceof MediaRemoteService);
    assert.equal(
      (
        svc as unknown as {
          typertRemote: { namespace: string };
        }
      ).typertRemote.namespace,
      "media",
    );
    assert.ok(
      (ctx as unknown as { mediaRemote?: unknown }).mediaRemote instanceof
        MediaRemoteService,
      "the service is visible on its cordis key",
    );
  });

  test("media/list refuses unknown kinds loudly with the kind in the details", async () => {
    const root = mintRoot();
    const ctx = new Context();
    ctx.provide("queue", { stateRoot: root });
    const svc = new MediaRemoteService(ctx);
    await assert.rejects(svc.remoteExportList("bogus", sig), /unknown kind/);
    try {
      await svc.remoteExportList("bogus", sig);
      assert.fail("must refuse");
    } catch (e) {
      const err = e as { code?: string; details?: unknown; message?: string };
      assert.equal(err.code, "media/kind");
      assert.deepEqual(err.details, { kind: "bogus" });
      assert.match(
        err.message ?? "",
        /one of image, audio, video, model, all/,
      );
    }
  });

  test("media/list without the queue seat refuses with media/no-seat", async () => {
    const ctx = new Context();
    const svc = new MediaRemoteService(ctx);
    await assert.rejects(svc.remoteExportList("image", sig), /queue seat/);
    try {
      await svc.remoteExportList("image", sig);
      assert.fail("must refuse");
    } catch (e) {
      const err = e as { code?: string };
      assert.equal(err.code, "media/no-seat");
    }
  });

  test("media/list over the fixture tree deep-equals the list arm", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-img", {
      "gen_00001_.png": "x",
      "prompt.json": "{}",
    });
    seedRun(root, "run-bbb2-vid", {
      "stage/out.mp4": "xx",
      "stage/voice.wav": "x",
    });
    const ctx = new Context();
    ctx.provide("queue", { stateRoot: root });
    const svc = new MediaRemoteService(ctx);
    const got = await svc.remoteExportList("all", sig);
    const want = await listMedia(root, "all");
    assert.deepEqual(got, want);
    assert.equal(got.count, 3);
  });
});
