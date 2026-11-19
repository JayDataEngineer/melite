// card-birth.spec.ts — the card-birth ritual: compose the card doc,
// refuse loudly on any refusal, reuse a declared draft_id.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { composeCard, ensureDraftId } from "../src/cardBirth.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const res = (body: string, status = 200): Response => new Response(body, { status });

describe("composeCard", () => {
  it("mints the draft id from a clean compose", async () => {
    let seenUrl = "";
    globalThis.fetch = (async (url: unknown) => {
      seenUrl = String(url);
      return res(JSON.stringify({ draftId: "d1" }));
    }) as typeof fetch;
    assert.equal(await composeCard({ model: "m" }), "d1");
    assert.equal(seenUrl, "/v1/flows/drafts");
  });

  it("refuses loudly on HTTP errors, with or without a body", async () => {
    globalThis.fetch = (async () => res("nope", 400)) as typeof fetch;
    await assert.rejects(composeCard({}), /card compose refused: HTTP 400: nope/);
    globalThis.fetch = (async () => res("", 500)) as typeof fetch;
    await assert.rejects(composeCard({}), /card compose refused: HTTP 500/);
  });

  it("refuses non-JSON bodies and missing draftIds", async () => {
    globalThis.fetch = (async () => res("<html>", 200)) as typeof fetch;
    await assert.rejects(composeCard({}), /non-JSON body/);
    for (const body of ["{}", '{"draftId": ""}', '{"draftId": 7}']) {
      globalThis.fetch = (async () => res(body, 200)) as typeof fetch;
      await assert.rejects(composeCard({}), /no draftId/);
    }
  });
});

describe("ensureDraftId", () => {
  it("reuses a declared draft_id without fetching", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return res("{}");
    }) as typeof fetch;
    assert.equal(await ensureDraftId({ draft_id: "declared" }), "declared");
    assert.equal(called, false);
  });

  it("composes when the declaration is absent, empty, or non-string", async () => {
    globalThis.fetch = (async () => res(JSON.stringify({ draftId: "minted" }))) as typeof fetch;
    const ctl = new AbortController();
    assert.equal(await ensureDraftId({}, ctl.signal), "minted");
    assert.equal(await ensureDraftId({ draft_id: "" }), "minted");
    assert.equal(await ensureDraftId({ draft_id: 9 }), "minted");
  });
});
