// comfyui-host-repoint.spec.ts — the host service's source/repoint
// laws over DIRECT construction (moved from the walls copy
// engine-supervisor.spec.ts, 2026-10-12). No transport mocks: these
// arms pin the REAL resolveEngineBaseUrl path under a hermetic env —
// the empty-source LOUD refusal (NO_ENDPOINT_MESSAGE), the silent
// unresolved swap, the host/port triple, and the symmetric repoint.
// Direct construction is also the only path covering the supervisor
// constructor's default arms (src/supervisor.ts:213-216) and the
// real-timer unref (:317): the timers and clock here are the source
// defaults and an armed handle is a real Node timer.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { ComfyUIHostService, NO_ENDPOINT_MESSAGE } from "../src/comfyui.ts";
import { Context } from "@deepseek-ai/cordis";

const URL_A = "http://127.0.0.1:8188";
const URL_B = "http://127.0.0.1:18499";

function hermeticEnv(): () => void {
  const savedUrl = process.env["COMFYUI_URL"];
  const savedCfg = process.env["COMFYUI_ENDPOINT_CONFIG"];
  const savedBox = process.env["INFERENCE_TEST_SANDBOX"];
  delete process.env["COMFYUI_URL"];
  delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  process.env["INFERENCE_TEST_SANDBOX"] = "1";
  return (): void => {
    if (savedUrl === undefined) delete process.env["COMFYUI_URL"];
    else process.env["COMFYUI_URL"] = savedUrl;
    if (savedCfg === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    else process.env["COMFYUI_ENDPOINT_CONFIG"] = savedCfg;
    if (savedBox === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
    else process.env["INFERENCE_TEST_SANDBOX"] = savedBox;
  };
}

function service(
  ctx: Context,
  config: { url?: string; host?: string; port?: number } = {},
): ComfyUIHostService {
  return new ComfyUIHostService(ctx, config);
}

function loudText(fn: () => unknown): string {
  try {
    fn();
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected LOUD, resolved quiet");
}

describe("ComfyUIHostService repoint (settings onChange, direct construction)", () => {
  it("empty source stays LOUD (no silent default, no fallback)", () => {
    const ctx = new Context();
    const restore = hermeticEnv();
    try {
      assert.equal(loudText(() => service(ctx).baseUrl()), NO_ENDPOINT_MESSAGE);
    } finally {
      restore();
    }
  });

  it("unresolved repoint swaps the pin silently (registration arm)", () => {
    const ctx = new Context();
    const s = service(ctx, { url: URL_A });
    // Registration calls onChange once with the entry value —
    // same pin, and nothing resolved yet: pure no-op, no probe.
    s.setSource(() => ({ url: URL_A }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_A);
    s.resetForTests();
  });

  it("host/port source composes the triple (no url key needed)", () => {
    const ctx = new Context();
    const s = service(ctx);
    s.setSource(() => ({ host: "127.0.0.1", port: 18499 }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_B);
    s.resetForTests();
  });

  it("resolved + changed repoints; the switch is symmetric", () => {
    const ctx = new Context();
    const s = service(ctx, { url: URL_A });
    assert.equal(s.baseUrl(), URL_A);
    s.setSource(() => ({ url: URL_B }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_B);
    s.setSource(() => ({ url: URL_A }));
    s.repoint();
    assert.equal(s.baseUrl(), URL_A);
    s.resetForTests();
  });
});
