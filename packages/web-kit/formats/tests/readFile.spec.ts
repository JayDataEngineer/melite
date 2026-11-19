// readFile.spec.ts — readAsDataURL (THE one FileReader read path): resolve,
// reject with the reader's error, reject with the fallback when the reader
// carries no error. The FileReader is stubbed per case (node has none).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { readAsDataURL } from "../src/readFile.ts";

const realFileReader = (globalThis as Record<string, unknown>).FileReader;

afterEach(() => {
  if (realFileReader === undefined) {
    delete (globalThis as Record<string, unknown>).FileReader;
  } else {
    (globalThis as Record<string, unknown>).FileReader = realFileReader;
  }
});

let seen: Blob | null = null;

/** Install a FileReader stub: resolves, or fails with/without an error. */
function install(mode: "resolve" | "reject-error" | "reject-empty"): void {
  seen = null;
  (globalThis as Record<string, unknown>).FileReader = class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | null = null;
    error: Error | null = null;
    readAsDataURL(file: Blob): void {
      seen = file;
      if (mode === "resolve") {
        this.result = "data:text/plain;base64,eA==";
        this.onload?.();
      } else {
        if (mode === "reject-error") this.error = new Error("denied");
        this.onerror?.();
      }
    }
  };
}

describe("readAsDataURL", () => {
  it("resolves the data URL through the reader", async () => {
    install("resolve");
    const blob = new Blob(["x"]);
    assert.equal(await readAsDataURL(blob), "data:text/plain;base64,eA==");
    assert.equal(seen, blob);
  });

  it("rejects with the reader's error", async () => {
    install("reject-error");
    await assert.rejects(readAsDataURL(new Blob(["x"])), /denied/);
  });

  it("rejects with the fallback when the reader carries no error", async () => {
    install("reject-empty");
    await assert.rejects(readAsDataURL(new Blob(["x"])), /read failed/);
  });
});
