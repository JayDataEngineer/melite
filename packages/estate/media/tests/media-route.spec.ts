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
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
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
  CARD_BUILD_PREFIX,
  cardBuildStamps,
  repoRootOf,
} from "../src/index.ts";
import { stampLine, stampOf, unstamped } from "@melite/contracts/buildStamp";

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

function fakeReq(
  method: string,
  url?: string,
  headers: Record<string, string> = {},
): IncomingMessage {
  const req = url === undefined ? { method, headers } : { method, url, headers };
  return req as unknown as IncomingMessage;
}

async function drive(
  handler: Handler,
  method: string,
  url?: string,
  headers: Record<string, string> = {},
): Promise<Seen> {
  const { res, seen } = fakeRes();
  await handler(fakeReq(method, url, headers), res);
  return seen;
}

interface Mount {
  ctx: Context;
  rows: Array<{ kind: string; path: string; handler: Handler }>;
  handler: Handler;
}

/** Mount the plugin on a fresh Context with a recording webServer
 *  seat and an optional queue seat; deep-equals the registered row. */
async function mountWeb(
  stateRoot: string | undefined,
  stateRoots?: readonly string[],
): Promise<Mount> {
  const ctx = new Context();
  const rows: Array<{ kind: string; path: string; handler: Handler }> = [];
  ctx.provide("webServer", {
    register: (row: { kind: string; path: string; handler: Handler }) => {
      rows.push(row);
      return () => undefined;
    },
  });
  if (stateRoot !== undefined) {
    // §23: the seat may carry the manifest — undefined stays the
    // legacy single-root seat (the fallback arm stays covered).
    ctx.provide("queue", stateRoots === undefined ? { stateRoot } : { stateRoot, stateRoots });
  }
  await ctx.plugin({ name: "t-probe", apply: mediaApply } as never);
  assert.equal(rows.length, 2, "two prefix rows register (runs + the card-build handshake)");
  const row = rows[0] as { kind: string; path: string; handler: Handler };
  assert.deepEqual(
    { kind: row.kind, path: row.path },
    { kind: "prefix", path: MEDIA_PREFIX },
  );
  assert.equal(typeof row.handler, "function");
  const buildRow = rows[1] as { kind: string; path: string; handler: Handler };
  assert.deepEqual(
    { kind: buildRow.kind, path: buildRow.path },
    { kind: "prefix", path: CARD_BUILD_PREFIX },
    "the deploy handshake route registers beside the runs route",
  );
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
      "accept-ranges": "bytes",
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
      "accept-ranges": "bytes",
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
      "accept-ranges": "bytes",
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
      "accept-ranges": "bytes",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, Buffer.from("ZZ"));
  });

  test("GET serves svg as octet-stream — never inline executable (the svg law: same-origin script vector)", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "diagram.svg": "<svg></svg>" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/diagram.svg`,
    );
    assert.equal(seen.status, 200);
    assert.equal(seen.headers["content-type"], "application/octet-stream");
    assert.deepEqual(seen.body, Buffer.from("<svg></svg>"));
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
      "accept-ranges": "bytes",
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

describe("the range law (the audio-seek stroke): 206 slices, the loud 416, the ignored ask", () => {
  // 10 bytes 0..9 — the canonical window every arm slices against
  const URL = `${MEDIA_PREFIX}/run-aaa1-x/track.mp3`;

  test("a bounded window answers 206 with exactly the asked slice", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "track.mp3": "0123456789" });
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "GET", URL, { range: "bytes=2-5" });
    assert.equal(seen.status, 206);
    assert.deepEqual(seen.headers, {
      "content-type": "audio/mpeg",
      "content-length": "4",
      "content-range": "bytes 2-5/10",
      "accept-ranges": "bytes",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body, Buffer.from("2345"));
    assert.equal(seen.ended, true);
  });

  test("an open end runs to EOF; a suffix serves the tail", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "track.mp3": "0123456789" });
    const { handler } = await mountWeb(root);
    const open = await drive(handler, "GET", URL, { range: "bytes=6-" });
    assert.equal(open.status, 206);
    assert.deepEqual(open.body, Buffer.from("6789"));
    assert.deepEqual(open.headers["content-range"], "bytes 6-9/10");
    const tail = await drive(handler, "GET", URL, { range: "bytes=-3" });
    assert.equal(tail.status, 206);
    assert.deepEqual(tail.body, Buffer.from("789"));
    assert.deepEqual(tail.headers["content-range"], "bytes 7-9/10");
  });

  test("an end past EOF clamps to the last byte", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "track.mp3": "0123456789" });
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "GET", URL, { range: "bytes=8-999" });
    assert.equal(seen.status, 206);
    assert.deepEqual(seen.body, Buffer.from("89"));
    assert.deepEqual(seen.headers["content-range"], "bytes 8-9/10");
    assert.deepEqual(seen.headers["content-length"], "2");
  });

  test("a start at/past EOF is the loud 416 naming the size", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "track.mp3": "0123456789" });
    const { handler } = await mountWeb(root);
    for (const ask of ["bytes=10-", "bytes=99-200", "bytes=-0"]) {
      const seen = await drive(handler, "GET", URL, { range: ask });
      assert.equal(seen.status, 416, ask);
      assert.deepEqual(seen.headers["content-range"], "bytes */10", ask);
      assert.deepEqual(seen.headers["accept-ranges"], "bytes", ask);
      assert.equal(seen.ended, true, ask);
    }
  });

  test("ignorable asks serve the full 200 (malformed, multi-range, inverted)", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "track.mp3": "0123456789" });
    const { handler } = await mountWeb(root);
    for (const ask of ["bytes=abc", "bytes=0-1,3-4", "bytes=5-2", "chunks=0-4"]) {
      const seen = await drive(handler, "GET", URL, { range: ask });
      assert.equal(seen.status, 200, ask);
      assert.deepEqual(seen.body, Buffer.from("0123456789"), ask);
      assert.deepEqual(seen.headers["content-length"], "10", ask);
    }
  });

  test("HEAD ignores a Range: the metadata answer stays full-length", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "track.mp3": "0123456789" });
    const { handler } = await mountWeb(root);
    const seen = await drive(handler, "HEAD", URL, { range: "bytes=2-5" });
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.headers["content-length"], "10");
    assert.deepEqual(seen.body, Buffer.alloc(0));
  });

  test("a slice of an audio file carries the audio content type (the playable seek)", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "voice.wav": "0123456789" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/voice.wav`,
      { range: "bytes=0-3" },
    );
    assert.equal(seen.status, 206);
    assert.deepEqual(seen.headers["content-type"], "audio/wav");
    assert.deepEqual(seen.body, Buffer.from("0123"));
  });

  test("real HTTP: a fetch carrying Range answers 206 with the slice bytes", async () => {
    const root = mintRoot();
    const bytes = Buffer.from("0123456789");
    seedRun(root, "run-aaa1-x", { "track.mp3": bytes });
    const { handler } = await mountWeb(root);
    const server = createServer((req, res) => {
      void handler(req, res);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    try {
      const port = (server.address() as AddressInfo).port;
      const res = await fetch(
        `http://127.0.0.1:${String(port)}${MEDIA_PREFIX}/run-aaa1-x/track.mp3`,
        { headers: { range: "bytes=2-5" } },
      );
      assert.equal(res.status, 206);
      assert.equal(res.headers.get("content-range"), "bytes 2-5/10");
      assert.equal(res.headers.get("accept-ranges"), "bytes");
      assert.deepEqual(Buffer.from(await res.arrayBuffer()), Buffer.from("2345"));
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

/** Root bypasses permission bits, so chmod walls cannot bite there. */
function isRoot(): boolean {
  return (
    typeof process.geteuid === "function" && process.geteuid() === 0
  );
}

describe("stroke-82 walls: unreadable / raced files refuse 404 + ended", () => {
  test("a file that exists but is unreadable (chmod 000) is a 404 with res ended", async () => {
    if (isRoot()) {
      console.warn("unreadable-file wall skipped: running as root");
      return;
    }
    const root = mintRoot();
    const dir = seedRun(root, "run-aaa1-x", { "locked.png": "SECRET" });
    const file = join(dir, "locked.png");
    chmodSync(file, 0o000);
    try {
      const { handler } = await mountWeb(root);
      const seen = await drive(
        handler,
        "GET",
        `${MEDIA_PREFIX}/run-aaa1-x/locked.png`,
      );
      assert.equal(seen.status, 404);
      assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
      assert.equal(seen.ended, true);
    } finally {
      chmodSync(file, 0o644);
    }
  });

  test("a file deleted between list and GET is a 404 with res ended", async () => {
    const root = mintRoot();
    const dir = seedRun(root, "run-aaa1-x", { "gone.png": "BYTES" });
    const { handler } = await mountWeb(root);
    const before = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/gone.png`,
    );
    assert.equal(before.status, 200);
    unlinkSync(join(dir, "gone.png"));
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/gone.png`,
    );
    assert.equal(seen.status, 404);
    assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
    assert.equal(seen.ended, true);
  });
});

describe("stroke-82 walls: the mint→serve round trip", () => {
  test("raw AND encoded names serve: 'out 1.png' and 'café.png'", async () => {
    const root = mintRoot();
    const runId = "run-aaa1-x";
    const spaceBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]);
    const uniBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x02]);
    seedRun(root, runId, { "out 1.png": spaceBytes, "café.png": uniBytes });
    const { handler } = await mountWeb(root);
    // The picker's half: listMedia advertises the raw names — those
    // advertised urls serve through the handler with the right bytes.
    const listed = await listMedia(root, "all");
    assert.equal(listed.count, 2);
    for (const item of listed.items) {
      const seen = await drive(handler, "GET", item.url);
      assert.equal(seen.status, 200, item.url);
      assert.deepEqual(
        seen.body,
        item.name === "out 1.png" ? spaceBytes : uniBytes,
      );
      assert.equal(seen.ended, true);
    }
    // The client seam's half: mediaUrl's per-segment encoding serves too.
    for (const [name, want] of [
      ["out 1.png", spaceBytes],
      ["café.png", uniBytes],
    ] as Array<[string, Buffer]>) {
      const seen = await drive(handler, "GET", mediaUrl(runId, name));
      assert.equal(seen.status, 200, mediaUrl(runId, name));
      assert.deepEqual(seen.body, want);
      assert.equal(seen.ended, true);
    }
  });

  test("encoded dot segments still refuse: %2e%2e is a 404", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "x" });
    const { handler } = await mountWeb(root);
    // Defense in depth, two locks: the WHATWG URL layer normalizes
    // %2e to dot segments (collapsing the traversal before the
    // route's own grammar runs), AND parseTarget decodes-then-
    // validates (a decoded `..` refuses). Both roads end at 404.
    for (const url of [
      `${MEDIA_PREFIX}/run-aaa1-x/%2e%2e`,
      `${MEDIA_PREFIX}/run-aaa1-x/%2e%2e/a.png`,
      `${MEDIA_PREFIX}/run-aaa1-x/%2E%2E/a.png`,
    ]) {
      const seen = await drive(handler, "GET", url);
      assert.equal(seen.status, 404, url);
      assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
    }
  });
});

describe("stroke-82 walls: underscore state files", () => {
  test("_flow.json and _request.json refuse 404; _poster.jpg serves", async () => {
    const root = mintRoot();
    const runId = "run-aaa1-x";
    const poster = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    seedRun(root, runId, {
      "_flow.json": '{"status":"completed"}',
      "_request.json": "{}",
      "_poster.jpg": poster,
      "a.png": "x",
    });
    const { handler } = await mountWeb(root);
    for (const rel of ["_flow.json", "_request.json"]) {
      const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/${runId}/${rel}`);
      assert.equal(seen.status, 404, rel);
      assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
      assert.equal(seen.ended, true);
    }
    const posterSeen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/${runId}/_poster.jpg`,
    );
    assert.equal(posterSeen.status, 200);
    assert.deepEqual(posterSeen.headers["content-type"], "image/jpeg");
    assert.deepEqual(posterSeen.body, poster);
    assert.equal(posterSeen.ended, true);
  });
});

describe("stroke-82 walls: the content-type table + query", () => {
  test("one table-driven GET per extension asserts the mapped content type", async () => {
    const root = mintRoot();
    const runId = "run-aaa1-x";
    const rows: Array<[string, string]> = [
      ["f.jpg", "image/jpeg"],
      ["f.jpeg", "image/jpeg"],
      ["f.webp", "image/webp"],
      ["f.gif", "image/gif"],
      ["f.webm", "video/webm"],
      ["f.mp3", "audio/mpeg"],
      ["f.wav", "audio/wav"],
      ["f.flac", "audio/flac"],
      ["f.ogg", "audio/ogg"],
      ["f.m4a", "audio/mp4"],
      ["f.aac", "audio/aac"],
      ["f.json", "application/json; charset=utf-8"],
      ["f.txt", "text/plain; charset=utf-8"],
    ];
    const files: Record<string, string> = {};
    for (const [name] of rows) files[name] = `bytes-of-${name}`;
    seedRun(root, runId, files);
    const { handler } = await mountWeb(root);
    for (const [name, contentType] of rows) {
      const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/${runId}/${name}`);
      assert.equal(seen.status, 200, name);
      assert.deepEqual(seen.headers["content-type"], contentType, name);
      assert.deepEqual(seen.body, Buffer.from(`bytes-of-${name}`), name);
    }
  });

  test("a cache-buster query serves 200: the query is stripped", async () => {
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "0123456789" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/a.png?v=1`,
    );
    assert.equal(seen.status, 200);
    assert.deepEqual(seen.body, Buffer.from("0123456789"));
    assert.equal(seen.ended, true);
  });
});

describe("coverage walls: decode-validate refusals (NUL + malformed escape)", () => {
  test("a NUL byte in a segment refuses 404 via the decode-validate lock", async () => {
    // LOCK: decode-validate (segmentOk's NUL arm, index.ts:67 → the
    // !segmentOk refuse at :119) — NOT URL-normalize (probed
    // 2026-09-16: WHATWG URL preserves %00 verbatim in pathname, so
    // "/run-aaa1-x/a%00b.png" reaches parseTarget intact) and NOT
    // realpath (parseTarget nulls before any tree walk).
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "x" });
    const { handler } = await mountWeb(root);
    for (const url of [
      `${MEDIA_PREFIX}/run-aaa1-x/a%00b.png`,
      `${MEDIA_PREFIX}/run-aaa1-x/%00`,
    ]) {
      const seen = await drive(handler, "GET", url);
      assert.equal(seen.status, 404, url);
      assert.deepEqual(seen.headers, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
      assert.equal(seen.ended, true);
    }
  });

  test("a malformed percent-escape refuses 404 via the decode-validate catch", async () => {
    // LOCK: decode-validate catch (index.ts:117) — NOT URL-normalize
    // (probed 2026-09-16: WHATWG URL preserves "%E0%A4%A" verbatim in
    // pathname) and NOT realpath — decodeURIComponent throws URIError
    // (a truncated 3-byte sequence ending in the lone "%A"), so
    // parseTarget nulls before the segment loop.
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "x" });
    const { handler } = await mountWeb(root);
    const seen = await drive(
      handler,
      "GET",
      `${MEDIA_PREFIX}/run-aaa1-x/%E0%A4%A`,
    );
    assert.equal(seen.status, 404);
    assert.deepEqual(seen.headers, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
    assert.equal(seen.ended, true);
  });

  test("single-dot spellings refuse 404 via the URL-normalize lock, never segmentOk", async () => {
    // DOCUMENTS the v8-ignore on segmentOk's dot/empty arm
    // (index.ts:66): probed 2026-09-16 — WHATWG URL collapses every
    // single-dot spelling ("%2e", ".") to the run-only short path
    // BEFORE parseTarget's segment loop runs, so the refusal arrives
    // via the parts.length<2 arm (walled above), never the
    // decode-validate dot arm. The double-dot half already rides the
    // "%2e%2e is a 404" wall; this pins the single-dot half.
    const root = mintRoot();
    seedRun(root, "run-aaa1-x", { "a.png": "x" });
    const { handler } = await mountWeb(root);
    for (const url of [
      `${MEDIA_PREFIX}/run-aaa1-x/%2e`,
      `${MEDIA_PREFIX}/run-aaa1-x/.`,
    ]) {
      const seen = await drive(handler, "GET", url);
      assert.equal(seen.status, 404, url);
      assert.deepEqual(seen.headers, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      assert.deepEqual(seen.body.toString(), NOT_FOUND_BODY);
      assert.equal(seen.ended, true);
    }
  });
});

// §23 CROSS-ROOTS: the byte route walks the seat's manifest — the
// first root holding the run serves the bytes (own root leads).
describe("the byte route across roots (the §23 manifest)", () => {
  test("a run that lives only in the SECOND root serves its bytes", async () => {
    const own = mintRoot();
    const mk = mintRoot();
    seedRun(mk, "run-0eee5-mk", { "film.mp4": Buffer.from("MAKERFILM") });
    const { handler } = await mountWeb(own, [own, mk]);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-0eee5-mk/film.mp4`);
    assert.deepEqual([seen.status, seen.body.toString()], [200, "MAKERFILM"]);
  });

  test("a run-id collision resolves FIRST-ROOT-WINS (the own root's bytes serve)", async () => {
    const own = mintRoot();
    const mk = mintRoot();
    seedRun(own, "run-0fff6-dup", { "take.mp4": Buffer.from("OWN") });
    seedRun(mk, "run-0fff6-dup", { "take.mp4": Buffer.from("MAKER") });
    const { handler } = await mountWeb(own, [own, mk]);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-0fff6-dup/take.mp4`);
    assert.deepEqual([seen.status, seen.body.toString()], [200, "OWN"]);
  });

  test("a run in NO searched root stays the honest 404", async () => {
    const own = mintRoot();
    const mk = mintRoot();
    const { handler } = await mountWeb(own, [own, mk]);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-0123ab-ghost/x.png`);
    assert.deepEqual([seen.status, seen.body.toString()], [404, NOT_FOUND_BODY]);
  });

  test("a manifest root that is MISSING on disk reads empty, never poisons", async () => {
    const own = mintRoot();
    seedRun(own, "run-0456cd-solo", { "s.png": Buffer.from("SOLO") });
    const ghost = join(tmpdir(), "media-route-ghost-none");
    const { handler } = await mountWeb(own, [own, ghost]);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-0456cd-solo/s.png`);
    assert.deepEqual([seen.status, seen.body.toString()], [200, "SOLO"]);
  });
});

describe("the byte route across roots (the §23 manifest, degenerate shapes)", () => {
  test("a run-id path that is a FILE (not a dir) is skipped — the next root serves", async () => {
    const own = mintRoot();
    const mk = mintRoot();
    mkdirSync(join(own, "output"), { recursive: true });
    writeFileSync(join(own, "output", "run-0789ef-nd"), "i am a file, not a run dir");
    seedRun(mk, "run-0789ef-nd", { "real.mp4": Buffer.from("REAL") });
    const { handler } = await mountWeb(own, [own, mk]);
    const seen = await drive(handler, "GET", `${MEDIA_PREFIX}/run-0789ef-nd/real.mp4`);
    assert.deepEqual([seen.status, seen.body.toString()], [200, "REAL"]);
  });
});

// ── THE DEPLOY HANDSHAKE (2026-09-23, the stale-tab root rot):
//    the loader's /plugins URL is immutable-cached on the plugin
//    LIST — rebuilt bundles ride the SAME URL and never reach a
//    browser that cached it. The stamps route serves disk truth;
//    these walls pin its law end to end. ──────────────────────────
describe("the card-build handshake", () => {
  test("the stamp law round-trips: stampLine(stampOf(code)) is idempotent", () => {
    const code = "console.log('the living tree')\n";
    const once = code + stampLine(stampOf(code));
    // the appended line never perturbs its own value
    assert.equal(stampOf(once), stampOf(code), "the stamp survives re-stamping");
    // a CHANGED body changes the stamp — the museum detector
    const changed = code + "// touched\n";
    assert.notEqual(stampOf(changed), stampOf(code));
    // the strip is byte-exact both ways (no newline drift)
    assert.equal(once.replace(stampLine(stampOf(code)), ""), code);
  });

  test("THE GUILLOTINE WALL: an inert marker mid-file is never stripped", () => {
    // the night's live breakage: a bundle inlining this module's
    // own marker literal (inside a string/template) made the old
    // textual strip cut the file mid-expression — the whole muxed
    // /plugins payload failed to parse and every plugin refused to
    // register in the operator's browser. The strip is structural
    // now: only a marker that BEGINS the final content line and is
    // followed by exactly the stamp assignment counts.
    const marker = "/*__MELITE_BUILD_STAMP__*/";
    const body =
      `const STAMP_MARKER = "${marker}";\n` +
      `const line = \`${marker}globalThis.x="y";\n\`;\n` +
      `module.exports = { STAMP_MARKER, line };\n`;
    // a mid-file marker (bare or inside strings/templates) is inert
    assert.equal(stampOf(body), stampOf(body), "no strip, no crash");
    const stamped = body + stampLine(stampOf(body));
    assert.equal(stampOf(stamped), stampOf(body), "the real tail still strips");
    // the guillotine, reproduced: the OLD law would return only the
    // prefix before the FIRST-in-order lastIndexOf hit — assert the
    // new law keeps the body intact
    assert.ok(unstamped(stamped).endsWith("module.exports = { STAMP_MARKER, line };\n"),
      "the body survives its own marker literal");
  });

  test("cardBuildStamps walks packages/*/lib/client.js, stamped or bare", () => {
    const root = mkdtempSync(join(tmpdir(), "card-build-"));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, "packages", "card-one", "lib"), { recursive: true });
    mkdirSync(join(root, "packages", "card-two", "lib"), { recursive: true });
    mkdirSync(join(root, "packages", "host-only"), { recursive: true });
    const one = "export const x = 1\n";
    const two = "export const y = 2\n";
    // one rides stamped (post-handshake build), one rides bare (never rebuilt)
    writeFileSync(join(root, "packages", "card-one", "lib", "client.js"), one + stampLine(stampOf(one)));
    writeFileSync(join(root, "packages", "card-two", "lib", "client.js"), two);
    const stamps = cardBuildStamps(root);
    assert.deepEqual(Object.keys(stamps).sort(), ["card-one", "card-two"], "client bundles only");
    assert.equal(stamps["card-one"], stampOf(one), "a stamped bundle's stamp is its unstamped sha1");
    assert.equal(stamps["card-two"], stampOf(two), "a bare bundle stamps its whole code");
  });

  test("repoRootOf walks up to the workspace manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "card-root-"));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
    const deep = join(root, "packages", "estate", "media", "lib");
    mkdirSync(deep, { recursive: true });
    assert.equal(repoRootOf(join(deep, "index.js")), root);
    // the no-manifest arm needs its OWN tree (a path under `root`
    // would walk up INTO the manifest just planted)
    const bare = mkdtempSync(join(tmpdir(), "card-bare-"));
    onTestFinished(() => rmSync(bare, { recursive: true, force: true }));
    mkdirSync(join(bare, "lib"), { recursive: true });
    assert.equal(repoRootOf(join(bare, "lib", "index.js")), null, "no manifest → no root ({} served)");
  });

  test("the route serves no-store stamps; non-GET refuses", async () => {
    const { rows } = await mountWeb(undefined);
    const row = rows[1] as { handler: Handler };
    const get = await drive(row.handler, "GET", CARD_BUILD_PREFIX);
    assert.equal(get.status, 200);
    assert.equal(get.headers["cache-control"], "no-store", "never cached — disk truth every ask");
    const body = JSON.parse(get.body.toString()) as { stamps: Record<string, string> };
    const repoRoot = repoRootOf(new URL(import.meta.url).pathname)!;
    assert.equal(body.stamps["melite-card-view"], stampOf(
      readFileSync(join(repoRoot, "packages", "web", "melite-card-view", "lib", "client.js"), "utf8"),
    ), "the route's stamp equals the sha1 law on the real repo's own bundle");
    const post = await drive(row.handler, "POST", CARD_BUILD_PREFIX);
    assert.equal(post.status, 405);
  });
});
