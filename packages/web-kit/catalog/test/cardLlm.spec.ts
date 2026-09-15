// cardLlm.spec.ts — the card LLM preference store (the ✦ rail's
// model dropdown, operator order: "the cards need a model dropdown
// to select the models we want"). Pins:
//   1. set/get round-trip; cardLlmArg threads the stored route
//   2. null/empty clears (Auto serves — undefined arg)
//   3. no storage access (sandboxed iframe / SSR) never throws:
//      reads null (Auto), writes are per-mount only
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";

import {
  CARD_LLM_KEY,
  cardLlmArg,
  getCardLlm,
  setCardLlm,
} from "../src/cardLlm.ts";

/** A Map-backed localStorage stand-in (the DOM type's used surface). */
function fakeWindow(): { window: { localStorage: Storage } } {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length(): number { return map.size; },
    clear: () => { map.clear(); },
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
  return { window: { localStorage: storage } };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  vi.unstubAllGlobals();
});

describe("card llm preference store", () => {
  it("round-trips a picked route and threads it as the llm arg", () => {
    (globalThis as Record<string, unknown>).window = fakeWindow().window;
    assert.equal(getCardLlm(), null);
    assert.equal(cardLlmArg(), undefined);
    setCardLlm("opencode-go/muse-spark-1.3-contributor");
    assert.equal(getCardLlm(), "opencode-go/muse-spark-1.3-contributor");
    assert.equal(cardLlmArg(), "opencode-go/muse-spark-1.3-contributor");
    assert.equal(
      (globalThis as { window: { localStorage: Storage } }).window.localStorage.getItem(CARD_LLM_KEY),
      "opencode-go/muse-spark-1.3-contributor",
    );
  });

  it("null (and empty) clear the preference — Auto serves", () => {
    (globalThis as Record<string, unknown>).window = fakeWindow().window;
    setCardLlm("zai/glm-5v-turbo");
    setCardLlm(null);
    assert.equal(getCardLlm(), null);
    assert.equal(cardLlmArg(), undefined);
    setCardLlm("zai/glm-5v-turbo");
    setCardLlm("");
    assert.equal(getCardLlm(), null);
  });

  it("never throws without storage access — reads null, writes drop", () => {
    // no window at all (SSR) and a throwing localStorage both stay safe
    assert.equal(getCardLlm(), null);
    assert.equal(cardLlmArg(), undefined);
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: () => { throw new Error("denied"); },
        setItem: () => { throw new Error("denied"); },
        removeItem: () => { throw new Error("denied"); },
      } as unknown as Storage,
    };
    assert.equal(getCardLlm(), null);
    setCardLlm("opencode-go/muse-spark-1.3-contributor");
    assert.equal(getCardLlm(), null);
  });
});
