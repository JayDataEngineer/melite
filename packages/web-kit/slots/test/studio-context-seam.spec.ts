// studio-context-seam.spec.ts — the open-studio context loaders + open impl seam.
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  applyStudioContext,
  registerStudioContextLoader,
  requestStudioOpen,
  setStudioOpenImpl,
} from "../src/studioContextSeam.ts";

function silenceConsole(): () => void {
  const orig = globalThis.console;
  (globalThis as Record<string, unknown>).console = {
    ...orig,
    warn: () => {},
    error: () => {},
  };
  return () => {
    globalThis.console = orig;
  };
}

describe("registerStudioContextLoader / applyStudioContext", () => {
  it("returns false for an unknown target (shell still switches tabs)", () => {
    assert.equal(applyStudioContext("nope", { a: 1 }), false);
  });

  it("routes the context to the target loader and returns its verdict", () => {
    const seen: unknown[] = [];
    const dispose = registerStudioContextLoader("body", (ctx) => {
      seen.push(ctx);
      return true;
    });
    try {
      assert.equal(applyStudioContext("body", { identity: "soma" }), true);
      assert.deepEqual(seen, [{ identity: "soma" }]);
      assert.equal(applyStudioContext("body", undefined), true);
      assert.deepEqual(seen.length, 2);
    } finally {
      dispose();
    }
    assert.equal(applyStudioContext("body", {}), false);
  });

  it("a second registration wins; disposing the winner restores nothing", () => {
    const disposeA = registerStudioContextLoader("pose", () => false);
    const disposeB = registerStudioContextLoader("pose", () => true);
    try {
      assert.equal(applyStudioContext("pose", {}), true);
      // Disposing the stale (overwritten) loader is a no-op for the table.
      disposeA();
      assert.equal(applyStudioContext("pose", {}), true);
    } finally {
      disposeB();
      disposeA();
    }
    assert.equal(applyStudioContext("pose", {}), false);
  });

  it("a throwing loader warns and returns false (tab switch unblocked)", () => {
    const restore = silenceConsole();
    const dispose = registerStudioContextLoader("boom", () => {
      throw new Error("bad context");
    });
    try {
      assert.equal(applyStudioContext("boom", {}), false);
    } finally {
      dispose();
      restore();
    }
  });

  it("a throwing loader with no console still returns false", () => {
    const orig = globalThis.console;
    (globalThis as Record<string, unknown>).console = undefined;
    const dispose = registerStudioContextLoader("boom2", () => {
      throw new Error("bad context");
    });
    try {
      assert.equal(applyStudioContext("boom2", {}), false);
    } finally {
      dispose();
      globalThis.console = orig;
    }
  });
});

describe("setStudioOpenImpl / requestStudioOpen", () => {
  beforeEach(() => {
    setStudioOpenImpl(null);
  });
  afterEach(() => {
    setStudioOpenImpl(null);
  });

  it("calls the registered impl with the target", () => {
    const opened: string[] = [];
    setStudioOpenImpl((target) => {
      opened.push(target);
    });
    requestStudioOpen("director");
    assert.deepEqual(opened, ["director"]);
  });

  it("without an impl warns instead of crashing (headless tests)", () => {
    const restore = silenceConsole();
    try {
      requestStudioOpen("body");
    } finally {
      restore();
    }
  });

  it("without an impl and no console stays silent", () => {
    const orig = globalThis.console;
    (globalThis as Record<string, unknown>).console = undefined;
    try {
      requestStudioOpen("body");
    } finally {
      globalThis.console = orig;
    }
  });
});
