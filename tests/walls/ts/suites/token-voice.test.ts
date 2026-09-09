// token-voice.test.ts — ROW 26 (one trust check at the transport
// seam, ledger § THE WIRE ADOPTION F3).
//
// Pins the unified bearer voice in @melite/gateway-core (errors.ts):
// bearerOk is THE one header comparison shared by the HTTP adapter's
// authCheck and the WS upgrade's wsAuthOk (G-17: two spellings of one
// trust fact, now one address). The WS ?token= query arm stays (py
// parity gateway.py 2189-2240 — browsers cannot set WS headers) but
// it is NOT a second comparison.
//
// Pure unit suite (no sandbox boot): relative source import — walls
// have no workspace package boundary (see run.mjs), and errors.ts is
// erasable-syntax by house law with only the cordis import (which
// resolves through the core package's own node_modules).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/token-voice.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bearerOk, wsAuthOk } from "../../../../packages/gateway/core/src/core/errors.ts";

const TOKEN = "wall-ts-token-voice";

describe("bearerOk (the one comparison)", () => {
  it("empty token passes everything (mirrors _adapt/_auth_ok)", () => {
    assert.equal(bearerOk({}, ""), true);
    assert.equal(bearerOk({ authorization: "Bearer anything" }, ""), true);
  });

  it("exact Bearer match passes", () => {
    assert.equal(bearerOk({ authorization: "Bearer " + TOKEN }, TOKEN), true);
  });

  it("missing, wrong, or partial bearers refuse", () => {
    assert.equal(bearerOk({}, TOKEN), false);
    assert.equal(bearerOk({ authorization: "Bearer wrong" }, TOKEN), false);
    assert.equal(bearerOk({ authorization: "Bearer " }, TOKEN), false);
    assert.equal(bearerOk({ authorization: TOKEN }, TOKEN), false);
    assert.equal(bearerOk({ authorization: "bearer " + TOKEN }, TOKEN), false);
  });

  it("query tokens do not count on the header voice", () => {
    // The HTTP path passes "" as query_token (_adapt) — a ?token= in
    // the URL must never satisfy the header check.
    assert.equal(bearerOk({ authorization: "" }, TOKEN), false);
  });
});

describe("wsAuthOk (Bearer arm is bearerOk; ?token= is the WS allowance)", () => {
  it("empty token passes everything", () => {
    assert.equal(wsAuthOk({}, "/v1/flows/events/x", ""), true);
  });

  it("Bearer header passes through the shared voice", () => {
    assert.equal(wsAuthOk({ authorization: "Bearer " + TOKEN }, "/v1/flows/events/x", TOKEN), true);
    assert.equal(wsAuthOk({ authorization: "Bearer wrong" }, "/v1/flows/events/x", TOKEN), false);
  });

  it("?token= query passes (browsers cannot set WS headers)", () => {
    assert.equal(wsAuthOk({}, "/v1/flows/events/x?token=" + TOKEN, TOKEN), true);
  });

  it("?token= wrong, empty, or mis-keyed refuses", () => {
    assert.equal(wsAuthOk({}, "/v1/flows/events/x?token=wrong", TOKEN), false);
    assert.equal(wsAuthOk({}, "/v1/flows/events/x?token=", TOKEN), false);
    assert.equal(wsAuthOk({}, "/v1/flows/events/x?other=" + TOKEN, TOKEN), false);
    assert.equal(wsAuthOk({}, "/v1/flows/events/x", TOKEN), false);
  });

  it("URL-encoded ?token= values decode (py parity)", () => {
    const encoded = encodeURIComponent(TOKEN).replace(/%/g, "%");
    assert.equal(wsAuthOk({}, "/v1/flows/events/x?token=" + encoded, TOKEN), true);
  });
});
