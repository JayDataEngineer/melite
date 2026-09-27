import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import {
  PROVISION_PROVIDERS,
  providerOk,
  unknownProviderRefusal,
} from "../src/contracts.ts";

// ── THE PROVIDER VOCABULARY (2026-10-10, the boundary audit's C4) ──
//
// The plan's `provider` is a PROTOCOL TOKEN, and the estate writes
// four of them ("direct", "git", "manager", "local") — but the
// service dispatched on ONE (`provider === "local"`), so a "git" or
// "direct" item silently fell into the Manager path: an extension
// declared with a git URL went to ComfyUI-Manager, and on a lane
// with no Manager it refused `manager/unavailable` while a git
// provider sat right there. A token with no arm is not a default —
// it is a refusal, BY NAME.
describe("the provider vocabulary is closed and dispatched", () => {
  test("the tokens the estate writes are all admitted; nothing else is", () => {
    for (const name of ["local", "manager", "git", "direct", "external"]) {
      expect(providerOk(name), name).toBe(true);
    }
    expect(providerOk("gitlab")).toBe(false);
    expect(providerOk("Direct")).toBe(false); // a token is a token: no case folding
    expect(providerOk(" direct")).toBe(false); // no trimming
  });

  test("the vocabulary IS the closed list the refusal names", () => {
    expect(PROVISION_PROVIDERS).toEqual(["local", "manager", "git", "direct", "external"]);
    for (const name of PROVISION_PROVIDERS) {
      expect(unknownProviderRefusal(name)).toContain("outside the vocabulary");
    }
  });

  test("an unknown provider's refusal NAMES it and the vocabulary", () => {
    const msg = unknownProviderRefusal("whatever");
    expect(msg).toContain("whatever");
    expect(msg).toContain("local");
    expect(msg).toContain("never routed to a default");
  });

  test("the service gates on the vocabulary BEFORE its local/manager arms", () => {
    // the dispatch arm itself, pinned where it lives: an unknown
    // token can never fall through to the Manager install.
    const src = readFileSync(new URL("../src/service.ts", import.meta.url), "utf8");
    expect(src).toContain("providerOk(item.provider)");
    expect(src).toContain("extension/unknown-provider");
    const gate = src.indexOf("providerOk(item.provider)");
    const localArm = src.indexOf('item.provider === "local"');
    expect(gate).toBeGreaterThan(-1);
    expect(localArm).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(localArm);
  });
});
