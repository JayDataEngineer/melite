// flow-cards-parse.spec.ts — parseCardsBlock's full decision table
// (2026-09-16 burn-down): the model header (native call args, the
// settled call-nest, malformed JSON, non-string models), the draft
// handle (native presentationMeta, the legacy render-text token in
// both spellings, error blocks), and the token scan's scan/skip
// arms. Pure function, deep-equal on the returned record — no DOM.
import { describe, expect, test } from "vitest";
import { parseCardsBlock } from "../src/client/FlowCards.tsx";
import type { ToolCallBlockView } from "../src/client/types.ts";

function callBlock(over: Partial<ToolCallBlockView> = {}): ToolCallBlockView {
  return { callId: "c1", ...over };
}
function settledBlock(over: Partial<ToolCallBlockView> = {}): ToolCallBlockView {
  return { callId: "c1", kind: "tool-result", isError: false, meta: null, content: [], ...over };
}

describe("parseCardsBlock — the model header", () => {
  test("an unsettled call's argsRaw names the model", () => {
    expect(parseCardsBlock(callBlock({ argsRaw: JSON.stringify({ model: "h3-timeline" }) })).model)
      .toBe("h3-timeline");
  });
  test("a settled call's nested call args name the model (the call head rides along)", () => {
    const b = settledBlock({ call: { name: "melite_flow", argsRaw: JSON.stringify({ model: "krea-2" }) } });
    expect(parseCardsBlock(b).model).toBe("krea-2");
  });
  test("a settled call without a head has no model (never a throw)", () => {
    expect(parseCardsBlock(settledBlock()).model).toBeNull();
  });
  test("malformed args badge the defect — the flag carries to the header (L10)", () => {
    // model stays null (nothing to name), but the corruption is no
    // longer indistinguishable from a model-less call: the flag
    // rides to the render, which badges "args unparseable".
    const parsed = parseCardsBlock(callBlock({ argsRaw: "{oops" }));
    expect(parsed.model).toBeNull();
    expect(parsed.malformedArgs).toBe(true);
  });
  test("parseable args never flag (the badge is corrupt-body-only)", () => {
    expect(parseCardsBlock(callBlock({ argsRaw: JSON.stringify({ seed: 1 }) })).malformedArgs).toBe(false);
    expect(parseCardsBlock(callBlock({ argsRaw: "" })).malformedArgs).toBe(false);
    expect(parseCardsBlock(callBlock({ argsRaw: JSON.stringify({ model: "krea-2" }) })).malformedArgs).toBe(false);
  });
  test("a missing model key renders header-less", () => {
    expect(parseCardsBlock(callBlock({ argsRaw: JSON.stringify({ seed: 1 }) })).model).toBeNull();
  });
  test("an empty-string model renders header-less", () => {
    expect(parseCardsBlock(callBlock({ argsRaw: JSON.stringify({ model: "" }) })).model).toBeNull();
  });
  test("a non-string model renders header-less", () => {
    expect(parseCardsBlock(callBlock({ argsRaw: JSON.stringify({ model: 7 }) })).model).toBeNull();
  });
});

describe("parseCardsBlock — the draft handle", () => {
  test("NATIVE: the persisted presentationMeta names the draft", () => {
    const r = parseCardsBlock(settledBlock({ meta: { draft_id: "draft-9" } }));
    expect(r).toMatchObject({ draftId: "draft-9", settled: true, isError: false });
  });
  test("a null meta falls to the legacy scan (never a throw)", () => {
    expect(parseCardsBlock(settledBlock({ meta: null })).draftId).toBeNull();
  });
  test("an array meta is not a payload (falls through, never a throw)", () => {
    expect(parseCardsBlock(settledBlock({ meta: [] })).draftId).toBeNull();
  });
  test("a primitive meta is not a payload", () => {
    expect(parseCardsBlock(settledBlock({ meta: 42 })).draftId).toBeNull();
  });
  test("an empty-string draft_id is not a handle", () => {
    expect(parseCardsBlock(settledBlock({ meta: { draft_id: "" } })).draftId).toBeNull();
  });
  test("a non-string draft_id is not a handle", () => {
    expect(parseCardsBlock(settledBlock({ meta: { draft_id: 7 } })).draftId).toBeNull();
  });
  test("an error block never names a draft (even with meta + token)", () => {
    const b = settledBlock({ isError: true, meta: { draft_id: "draft-9" }, content: [{ text: "card draft-1" }] });
    expect(parseCardsBlock(b)).toMatchObject({ draftId: null, settled: true, isError: true });
  });
  test("an unsettled block never names a draft (even with a token in flight)", () => {
    expect(parseCardsBlock(callBlock({ argsRaw: "" })).settled).toBe(false);
  });
});

describe("parseCardsBlock — the legacy render-text token", () => {
  const legacy = (text: string): ToolCallBlockView =>
    settledBlock({ content: [{ text }] });
  test("the 'card ' spelling names the draft", () => {
    expect(parseCardsBlock(legacy("see card draft-abc done")).draftId).toBe("draft-abc");
  });
  test("a token at end-of-text (no trailing space) names the draft", () => {
    expect(parseCardsBlock(legacy("see card draft-xyz")).draftId).toBe("draft-xyz");
  });
  test("the 'draft ' spelling names the draft (the older rule)", () => {
    expect(parseCardsBlock(legacy("open draft p_9 now")).draftId).toBe("p_9");
  });
  test("text without a token names nothing", () => {
    expect(parseCardsBlock(legacy("hello world")).draftId).toBeNull();
  });
  test("a part whose first token mismatches is skipped (later parts still scan)", () => {
    const b = settledBlock({ content: [{ text: "see card ab" }, { text: "then card draft-ok!" }] });
    expect(parseCardsBlock(b).draftId).toBe("draft-ok!");
  });
  test("a short 'p_' stub is not a handle (length law)", () => {
    expect(parseCardsBlock(legacy("see card p_ then more")).draftId).toBeNull();
  });
  test("non-object parts scan past (nulls, primitives, textless shapes)", () => {
    const b = settledBlock({ content: [null, 42, {}, { text: 7 }, { text: "card draft-tail" }] });
    expect(parseCardsBlock(b).draftId).toBe("draft-tail");
  });
  test("a missing content list names nothing", () => {
    const b = settledBlock();
    delete (b as { content?: unknown }).content;
    expect(parseCardsBlock(b).draftId).toBeNull();
  });
  test("the native handle wins over the token (no scan when meta names it)", () => {
    const b = settledBlock({ meta: { draft_id: "draft-9" }, content: [{ text: "card draft-other" }] });
    expect(parseCardsBlock(b).draftId).toBe("draft-9");
  });
});
