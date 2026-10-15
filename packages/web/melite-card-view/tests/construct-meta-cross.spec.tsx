// @vitest-environment happy-dom
// construct-meta-cross.spec.tsx — (flow-link F5, 2026-11-06) the
// two-home cross-judge: the meta payload shape is spelled in the
// tool's projector (harness melite-construct.ts) and read by the
// client (construct-card.tsx parseConstructBlock) — each side's own
// wall can stay green while the homes DRIFT in the middle. This
// wall feeds a REAL meliteConstruct execute value through the
// tool's presentationMeta, then through parseConstructBlock, and
// asserts the bench key + error line agree end to end. (Seated in
// the |dom| project: the card module's import graph needs a DOM;
// the tool side carries no DOM of its own.)
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { meliteConstruct } from "../../../harness/melite-tools/src/tools/melite-construct.ts";
import { parseConstructBlock } from "../src/client/construct-card.tsx";
import type { ToolCallBlockView } from "../src/client/construct-card.tsx";

describe("construct meta cross-judge (the projector's real output through the client's reader)", () => {
  test("a real read's meta parses to the same bench the value carries", async () => {
    const estate = {
      benchGet: async () => ({ session: "s_chat7", rev: 5, intent: "x", stages: [{ id: "s1" }], log: [] }),
    } as never;
    const tool = meliteConstruct(estate);
    // the session rides the exec context's agent id (the read's own
    // law — the tool targets the calling conversation's bench)
    const out = (await tool.execute({ verb: "read" }, {
      signal: AbortSignal.timeout(5000),
      agent: { id: "s_chat7" },
    } as never)) as Record<string, unknown>;
    const meta = tool.output.presentationMeta!({} as never, out as never) as Record<string, unknown>;
    assert.deepEqual(meta, { bench: "s_chat7" });
    const parsed = parseConstructBlock({
      kind: "tool-result", meta,
      call: { argsRaw: JSON.stringify({ verb: "read" }) },
    } as unknown as ToolCallBlockView);
    assert.equal(parsed.bench, "s_chat7", "the client reads the bench the projector wrote");
    assert.equal(parsed.settled, true);
  });

  test("a refusal's meta parses with the bench beside the error line", async () => {
    const estate = {
      benchGet: async () => { throw new Error("bench moved: rev is 7, caller held 6"); },
    } as never;
    const tool = meliteConstruct(estate);
    const out = (await tool.execute({ verb: "read" }, {
      signal: AbortSignal.timeout(5000),
    } as never)) as Record<string, unknown>;
    const meta = tool.output.presentationMeta!({} as never, out as never) as Record<string, unknown>;
    const parsed = parseConstructBlock({
      kind: "tool-result", meta, isError: true,
      call: { argsRaw: JSON.stringify({ verb: "read" }) },
      content: [{ text: "bench moved: rev is 7, caller held 6" }],
    } as unknown as ToolCallBlockView);
    assert.equal(parsed.bench, "main", "the refusal still links the bench");
    assert.equal(parsed.errorLine, "bench moved: rev is 7, caller held 6");
  });
});
