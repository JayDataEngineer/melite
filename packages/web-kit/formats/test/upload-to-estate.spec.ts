// upload-to-estate.spec.ts — the browser-file → estate-path rail: the
// image-type refusal, the read-error guidance, the upload POST arms,
// and the preview-URL mapping. FileReader is scripted (the one browser
// call on the read path).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  UploadRefusedError,
  estateInputUrl,
  uploadToEstate,
} from "../src/uploadToEstate.ts";

const realFetch = globalThis.fetch;
const realReader = (globalThis as Record<string, unknown>)["FileReader"];
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realReader === undefined) delete (globalThis as Record<string, unknown>)["FileReader"];
  else (globalThis as Record<string, unknown>)["FileReader"] = realReader;
});

const file = (name: string, type: string): File =>
  new File(["bytes"], name, { type });

/** Script FileReader: resolve with `url` or fail the read. */
const stubReader = (url?: string): void => {
  (globalThis as Record<string, unknown>)["FileReader"] = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | null = null;
    error: Error | null = null;
    readAsDataURL(_f: Blob): void {
      if (url !== undefined) {
        this.result = url;
        this.onload?.();
      } else {
        this.error = new Error("locked");
        this.onerror?.();
      }
    }
  };
};

describe("uploadToEstate refusals", () => {
  it("refuses non-images client-side before any POST", async () => {
    stubReader("data:video/mp4;base64,AA==");
    let posts = 0;
    globalThis.fetch = (async () => {
      posts++;
      return new Response("{}");
    }) as typeof fetch;
    await assert.rejects(uploadToEstate(file("c.mp4", "video/mp4")), UploadRefusedError);
    await assert.rejects(uploadToEstate(file("c.mp4", "video/mp4")), /only png \/ jpeg \/ webp/);
    await assert.rejects(uploadToEstate(file("blob", "")), /unknown type/);
    assert.equal(posts, 0);
  });

  it("maps unreadable files onto picker guidance", async () => {
    stubReader(undefined);
    await assert.rejects(
      uploadToEstate(file("gone.png", "image/png")),
      /could not read "gone.png"/,
    );
  });
});

describe("uploadToEstate POST arms", () => {
  it("returns the estate path on success", async () => {
    stubReader("data:image/png;base64,AA==");
    let seen: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      seen = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({ path: "data/input/a.png" }));
    }) as typeof fetch;
    assert.equal(await uploadToEstate(file("a.png", "image/png")), "data/input/a.png");
    assert.equal(seen["filename"], "a.png");
  });

  it("wraps network failures", async () => {
    stubReader("data:image/png;base64,AA==");
    globalThis.fetch = (async () => {
      throw new Error("conn refused");
    }) as typeof fetch;
    await assert.rejects(uploadToEstate(file("a.png", "image/png")), /Upload failed \(network\): conn refused/);
  });

  it("surfaces server errors, non-JSON bodies, and pathless 200s", async () => {
    stubReader("data:image/png;base64,AA==");
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "too big" }), { status: 413 })) as typeof fetch;
    await assert.rejects(uploadToEstate(file("a.png", "image/png")), /too big/);
    globalThis.fetch = (async () => new Response("oops", { status: 500 })) as typeof fetch;
    await assert.rejects(uploadToEstate(file("a.png", "image/png")), /Upload failed \(HTTP 500\)/);
    globalThis.fetch = (async () => new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
    await assert.rejects(uploadToEstate(file("a.png", "image/png")), /Upload failed \(HTTP 200\)/);
  });
});

describe("estateInputUrl", () => {
  it("passes servable shapes through untouched", () => {
    assert.equal(estateInputUrl("data:image/png;base64,AA=="), "data:image/png;base64,AA==");
    assert.equal(estateInputUrl("blob:https://h/u"), "blob:https://h/u");
    assert.equal(estateInputUrl("https://h/a.png"), "https://h/a.png");
    assert.equal(estateInputUrl("http://h/a.png"), "http://h/a.png");
    assert.equal(estateInputUrl("/assets/a.png"), "/assets/a.png");
    assert.equal(estateInputUrl("/api/x"), "/api/x");
    assert.equal(estateInputUrl("/v1/assets/runs/r/a.png"), "/v1/assets/runs/r/a.png");
  });

  it("maps estate input paths onto the preview door, else null", () => {
    assert.equal(estateInputUrl("data/input/photo.PNG"), "/v1/assets/inputs/photo.PNG");
    assert.equal(estateInputUrl("data/input/a.jpeg"), "/v1/assets/inputs/a.jpeg");
    assert.equal(estateInputUrl("data/input/a.webp"), "/v1/assets/inputs/a.webp");
    assert.equal(estateInputUrl("/mnt/data/a.png"), null);
    assert.equal(estateInputUrl("data/input/a.gif"), null);
    assert.equal(estateInputUrl("data/input/../x.png"), null);
    assert.equal(estateInputUrl("data/input/sub/a.png"), null);
  });
});
