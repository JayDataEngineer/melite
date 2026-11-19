// @melite/comfyui-cordis — the sdkClient socket-error seat wall.
// UPSTREAM 1.5.9 leaves a dead WebSocket in `socket` on error; every
// reconnect path guards on `!socket`, so the dangling object blocks
// reconnection forever. sdkClient clears it on connection_error and
// forces the close (the cure that replaces the former whole-dist
// pnpm patch — 2026-11-19). Arms:
//   1. THE CURE: an errored socket that never fires close is
//      cleared from `client.socket` and closed — red if the
//      listener is toggled out.
//   2. THE PATCH IS GONE: no patchedDependencies seat and no
//      patches/ tree — the cure's only home is this source seat.
//   3. THE HEALTHY PATH: a socket that errors AND closes settles
//      without double-closing (idempotent cure).
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sdkClient } from "../src/comfyui-transport.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** A fake WebSocket: a real EventTarget so the SDK's addEventListener
 *  registration is genuine, plus a recorded close(). It never opens
 *  and (by default) never closes itself — the exact deadlock shape. */
class FakeSocket extends EventTarget {
  binaryType = "";
  closes = 0;
  constructor() { super(); FAKE_SOCKETS.push(this); }
  close(): void { this.closes += 1; }
}
const FAKE_SOCKETS: FakeSocket[] = [];

describe("sdkClient socket-error seat (the upstream 1.5.9 cure)", () => {
  it("THE CURE: an errored socket that never closes is cleared and closed (reconnect unblocked)", async () => {
    const client = sdkClient("http://127.0.0.1:1");
    // inject the fake through the SDK's own public field — the
    // creation door stays the SDK's connect()
    client.WebSocket = FakeSocket as unknown as typeof WebSocket;
    // fire-and-forget: connect() waits for "open", which never comes
    void client.connect({ websocket: { enabled: true }, timeout_ms: 50 }).catch(() => {});
    for (let i = 0; i < 50 && FAKE_SOCKETS.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.equal(FAKE_SOCKETS.length, 1, "connect created exactly one socket");
    // FakeSocket & WebSocket: the intersection keeps .closes while giving
    // the === seat-comparison real overlap with client.socket's type
    const dead = FAKE_SOCKETS[0] as unknown as FakeSocket & WebSocket;
    assert.ok(client.socket === dead, "the socket sits on the seat before the error");
    // the burn: the socket errors and NEVER fires close (the
    // deadlock shape the old dist patch existed for)
    dead.dispatchEvent(new Event("error"));
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(client.socket, null,
      "the dead socket was cleared from the seat — reconnect paths guard on !socket");
    assert.equal(dead.closes, 1, "the dead socket was closed exactly once");
    FAKE_SOCKETS.length = 0;
  });

  it("THE HEALTHY PATH: error-then-close settles with the cure idempotent (no double close)", async () => {
    const client = sdkClient("http://127.0.0.1:1");
    client.WebSocket = FakeSocket as unknown as typeof WebSocket;
    void client.connect({ websocket: { enabled: true }, timeout_ms: 50 }).catch(() => {});
    for (let i = 0; i < 50 && FAKE_SOCKETS.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 5));
    }
    // FakeSocket & WebSocket: the intersection keeps .closes while giving
    // the === seat-comparison real overlap with client.socket's type
    const dead = FAKE_SOCKETS[0] as unknown as FakeSocket & WebSocket;
    dead.dispatchEvent(new Event("error"));
    // the socket ALSO closes on its own (the normal browser path)
    dead.dispatchEvent(new Event("close"));
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(client.socket, null, "the seat is clear");
    assert.equal(dead.closes, 1, "close ran once — the cure does not stack closes");
    FAKE_SOCKETS.length = 0;
  });

  it("THE PATCH IS GONE: no patchedDependencies seat, no patches/ tree — the cure lives in source alone", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as Record<string, unknown>;
    assert.equal(pkg["patchedDependencies"], undefined,
      "package.json carries no patchedDependencies (no dist-artifact patches)");
    assert.equal(existsSync(join(repoRoot, "patches")), false,
      "the patches/ tree is deleted — the socket-error cure's only home is comfyui-transport.ts");
  });

  it("the transport still mints a plain client for a healthy server url", () => {
    const client = sdkClient("http://127.0.0.1:8188/");
    assert.equal(client.api_host, "127.0.0.1:8188");
    assert.equal(client.socket, undefined, "no socket before any connect");
    assert.equal(typeof client.on("connection_error", () => {}), "function",
      "the connection_error listener registered at construction (the unsubscribe face)");
    onTestFinished(() => { client.socket = null; });
  });
});
