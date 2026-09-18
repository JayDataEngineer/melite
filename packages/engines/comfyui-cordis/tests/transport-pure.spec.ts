// @melite/comfyui-cordis — pure-port batteries (split from comfyui-transport.spec.ts).
// Pure ports pin directly: no engine, no stub server, no fixtures.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  formatTimeout0f, mapHistoryEntry, publishOutputChannels, pyDumps400,
  pyReprStr, pyReprStrList, pyStr, spliceWorkflow
} from "../src/comfyui.ts";
import type { EngineJson } from "../src/comfyui.ts";

// ── pure ports ─────────────────────────────────────────────────

describe("pyReprStr (the quote battery)", () => {
  it("escapes the wall's shapes", () => {
    assert.equal(pyReprStr("plain"), "'plain'");
    assert.equal(pyReprStr("a\\b"), "'a\\\\b'");
    assert.equal(pyReprStr("it's"), "'it\\'s'");
    assert.equal(pyReprStr("a\nb\rc\td"), "'a\\nb\\rc\\td'");
  });
});

describe("pyStr (str() parity)", () => {
  it("walks every shape", () => {
    assert.equal(pyStr(null), "None");
    assert.equal(pyStr(undefined), "None");
    assert.equal(pyStr("top body"), "top body");
    assert.equal(pyStr("nested", false), "'nested'");
    assert.equal(pyStr(7), "7");
    assert.equal(pyStr(true), "True");
    assert.equal(pyStr(false), "False");
    assert.equal(pyStr(Buffer.from("AB")), "b'AB'");
    assert.equal(pyStr(["a", 1, true, null]), "['a', 1, True, None]");
    assert.equal(pyStr({ a: "x", n: 2 }), "{'a': 'x', 'n': 2}");
  });
});

describe("pyDumps400 (the dump battery)", () => {
  it("emits the default separators + truncates", () => {
    assert.equal(pyDumps400("s"), '"s"');
    assert.equal(pyDumps400(null), "null");
    assert.equal(pyDumps400(3), "3");
    assert.equal(pyDumps400(true), "true");
    assert.equal(pyDumps400(["a", 1]), '["a", 1]');
    assert.equal(pyDumps400({ k: "v", n: [1, 2] }), '{"k": "v", "n": [1, 2]}');
    assert.equal(pyDumps400("x".repeat(500)).length, 400);
  });
});

describe("formatTimeout0f (half-to-even)", () => {
  it("rounds like %.0f", () => {
    assert.equal(formatTimeout0f(2.4), "2");
    assert.equal(formatTimeout0f(2.6), "3");
    assert.equal(formatTimeout0f(2.5), "2");
    assert.equal(formatTimeout0f(3.5), "4");
  });
});

describe("pyReprStrList", () => {
  it("str()s the list", () => {
    assert.equal(pyReprStrList(["a", "b"]), "['a', 'b']");
  });
});

describe("spliceWorkflow (the splice gates)", () => {
  const wf = (): Record<string, EngineJson> => ({
    "1": { class_type: "K", inputs: { seed: 1, prompt: "x" } },
  });
  it("splices injects into the graph", () => {
    const out = spliceWorkflow({ workflow: wf(), inject: { "1.seed": 9 } });
    assert.equal(((out["1"] as Record<string, EngineJson>)["inputs"] as Record<string, EngineJson>)["seed"], 9);
  });
  it("every misshapen splice refuses named", () => {
    assert.throws(() => spliceWorkflow({}), /carries no inline workflow/);
    assert.throws(() => spliceWorkflow({ workflow: "x" }), /carries no inline workflow/);
    assert.throws(() => spliceWorkflow({ workflow: [] }), /carries no inline workflow/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: "x" }), /inject must be an object/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: { noslot: 1 } }), /targets nothing/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: { "9.seed": 1 } }), /targets nothing/);
    assert.throws(() => spliceWorkflow({ workflow: wf(), inject: { "1.ghost": 1 } }), /has no input/);
    assert.throws(
      () => spliceWorkflow({ workflow: { "1": { class_type: "K" } }, inject: { "1.seed": 1 } }),
      /has no input/,
    );
  });
});

describe("publishOutputChannels (the declaration order)", () => {
  it("first unmatched artifact wins per channel; unknown kinds skip", () => {
    const out = publishOutputChannels(
      { image: "image", thumb: "image", video: "video", text: "text", mesh: "mesh" },
      ["/r/a.png", "/r/b.mp4", "/r/c.glb"],
    );
    assert.equal(out["image"], "/r/a.png");
    assert.equal(out["thumb"], undefined, "a.png is claimed — the second image channel starves");
    assert.equal(out["video"], "/r/b.mp4");
    assert.equal(out["mesh"], "/r/c.glb");
    assert.equal(out["text"], undefined, "text is no FILE-kind channel");
    assert.deepEqual(publishOutputChannels(undefined as never, undefined as never), {});
    assert.deepEqual(publishOutputChannels({ image: "image" }, undefined as never), {});
    assert.deepEqual(publishOutputChannels({ image: "image" }, ["/r/a.bin"]), {});
  });
});

describe("mapHistoryEntry (the verdict read)", () => {
  it("reads every verdict", () => {
    assert.deepEqual(mapHistoryEntry(null), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry(undefined), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry({}), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry({ status: "x" }), { kind: "pending" });
    assert.deepEqual(mapHistoryEntry({ status: { status_str: "success", completed: true } }), { kind: "completed" });
    assert.deepEqual(mapHistoryEntry({ status: { status_str: "running", completed: false } }), { kind: "pending" });
    const execFail = {
      status: {
        status_str: "error",
        messages: [["execution_error", { node_id: "1", exception_message: "boom" }], ["other", {}]],
      },
    };
    const v = mapHistoryEntry(execFail as never);
    assert.equal(v.kind, "failed");
    assert.ok((v as { detail: string }).detail.includes("boom"), "the execution_error detail wins");
    const whole = mapHistoryEntry({ status: { status_str: "error", messages: [["other", 1]] } } as never);
    assert.ok((whole as { detail: string }).detail.includes("status_str"), "without it the whole status voices");
    assert.equal((mapHistoryEntry({ status: { status_str: "error" } }) as { kind: string }).kind, "failed");
    assert.equal((mapHistoryEntry({ status: { status_str: "error", messages: "x" } }) as { kind: string }).kind, "failed");
  });
});
