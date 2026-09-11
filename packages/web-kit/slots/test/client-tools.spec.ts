// client-tools.spec.ts — the browser-tool federation registry + interrupt parsing.
// (useClientTool is React-hook wiring for mounted surfaces — dom territory,
// v8-ignored at the site; everything else runs in node.)
import { describe, it, beforeEach } from "vitest";
import assert from "node:assert/strict";
import {
  activeClientToolNames,
  getClientToolHandler,
  hasClientTool,
  interruptRecordsFromValues,
  registerClientTool,
} from "../src/clientTools.ts";

describe("registerClientTool / get / has / active names", () => {
  beforeEach(() => {
    for (const name of activeClientToolNames()) {
      const handler = getClientToolHandler(name);
      if (handler) registerClientTool(name, handler)();
    }
  });

  it("registers, reads back, and removes on dispose", () => {
    const handler = (args: Record<string, unknown>): unknown => args;
    assert.equal(hasClientTool("demo.tool"), false);
    assert.equal(getClientToolHandler("demo.tool"), undefined);
    const dispose = registerClientTool("demo.tool", handler);
    assert.equal(hasClientTool("demo.tool"), true);
    assert.equal(getClientToolHandler("demo.tool"), handler);
    assert.deepEqual(activeClientToolNames(), ["demo.tool"]);
    dispose();
    assert.equal(hasClientTool("demo.tool"), false);
    assert.deepEqual(activeClientToolNames(), []);
  });

  it("the most recent mount wins; a stale disposer never removes the winner", () => {
    const first = (): unknown => "first";
    const second = (): unknown => "second";
    const disposeFirst = registerClientTool("shared.tool", first);
    const disposeSecond = registerClientTool("shared.tool", second);
    assert.equal(getClientToolHandler("shared.tool"), second);
    disposeFirst();
    assert.equal(getClientToolHandler("shared.tool"), second);
    disposeSecond();
    assert.equal(hasClientTool("shared.tool"), false);
  });

  it("lists every registered name", () => {
    const a = (): unknown => 1;
    const b = (): unknown => 2;
    const da = registerClientTool("a", a);
    const db = registerClientTool("b", b);
    try {
      assert.deepEqual(new Set(activeClientToolNames()), new Set(["a", "b"]));
    } finally {
      da();
      db();
    }
  });
});

describe("interruptRecordsFromValues", () => {
  it("rejects non-object payloads", () => {
    assert.deepEqual(interruptRecordsFromValues(null), []);
    assert.deepEqual(interruptRecordsFromValues(undefined), []);
    assert.deepEqual(interruptRecordsFromValues(42), []);
    assert.deepEqual(interruptRecordsFromValues("tasks"), []);
  });

  it("rejects payloads without a tasks array", () => {
    assert.deepEqual(interruptRecordsFromValues({}), []);
    assert.deepEqual(interruptRecordsFromValues({ tasks: null }), []);
    assert.deepEqual(interruptRecordsFromValues({ tasks: {} }), []);
  });

  it("skips tasks without an interrupts array", () => {
    assert.deepEqual(interruptRecordsFromValues({ tasks: [{}] }), []);
    assert.deepEqual(interruptRecordsFromValues({ tasks: [{ interrupts: null }] }), []);
    assert.deepEqual(
      interruptRecordsFromValues({
        tasks: [{ interrupts: [{ id: "a", value: 1 }] }, {}],
      }),
      [{ id: "a", value: 1 }],
    );
  });

  it("keeps string ids and drops non-string ids to undefined", () => {
    assert.deepEqual(
      interruptRecordsFromValues({
        tasks: [
          {
            interrupts: [
              { id: "x1", value: { client_tool: "t", args: {} } },
              { value: "no-id" },
              { id: 7, value: "num-id" },
              { id: null, value: null },
            ],
          },
        ],
      }),
      [
        { id: "x1", value: { client_tool: "t", args: {} } },
        { id: undefined, value: "no-id" },
        { id: undefined, value: "num-id" },
        { id: undefined, value: null },
      ],
    );
  });
});
