// b64.spec.ts — async decode to ArrayBuffer via the fetch data: URL bridge.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { decodeB64ToBuffer } from "../src/b64.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("decodeB64ToBuffer", () => {
  it("decodes base64 through the fetch bridge", async () => {
    const seen: string[] = [];
    globalThis.fetch = (async (input: unknown) => {
      seen.push(String(input));
      return new Response(Uint8Array.from([104, 105]));
    }) as typeof fetch;
    const buf = await decodeB64ToBuffer("aGk=");
    assert.deepEqual(Array.from(new Uint8Array(buf)), [104, 105]);
    assert.equal(seen.length, 1);
    assert.match(seen[0], /^data:application\/octet-stream;base64,aGk=$/);
  });
});
