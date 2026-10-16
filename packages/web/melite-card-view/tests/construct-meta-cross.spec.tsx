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
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { parseConstructBlock, constructTitleOf } from "../src/client/construct-card.tsx";
import type { ToolCallBlockView } from "../src/client/types.ts";

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

  // (audit-followups M7, 2026-11-06) THE TITLE MIRROR'S CROSS-JUDGE:
  // the host's presentCall (melite-construct.ts:363) and the client's
  // constructTitleOf (construct-card.tsx → chromeCopy.constructTitle)
  // spell the same verdict title in two homes — each side's wall pins
  // its own literal independently, so a host rewording with the
  // dictionary left behind keeps both green against different live
  // strings. This arm feeds ONE args value through BOTH real faces
  // and demands agreement; drift reds at the next wording change.
  test("the verdict title agrees across its two homes (host presentCall vs client constructTitleOf)", async () => {
    const estate = {
      benchGet: async () => ({ session: "s_chat7", rev: 5, intent: "x", stages: [{ id: "s1" }], log: [] }),
    } as never;
    const tool = meliteConstruct(estate);
    const present = tool.presentCall as (args: unknown) => { title: string };
    const cases: Array<Record<string, unknown>> = [
      { verb: "patch", stage: "s1" },
      { verb: "add_stage", card: "image-gen" },
      { verb: "read" },
      { verb: "remove_stage", stage: "" },
    ];
    for (const args of cases) {
      const host = present(args).title;
      const client = constructTitleOf(JSON.stringify(args));
      assert.equal(client.malformedArgs, false);
      assert.equal(host, client.title, `title drift for ${JSON.stringify(args)}: host "${host}" vs client "${client.title}"`);
    }
  });

  test("a CAS-shaped refusal crosses with its kind and rev intact (host) and its bench beside the error line (client)", async () => {
    // (audit-followups W6, 2026-11-06) the REAL refusal shape: the
    // bench's cas-conflict arrives as a RemoteError (code +
    // current_rev — the harness refusal arm's shape), never a plain
    // Error. The cross tier judges all three legs: the execute
    // value carries the kind + rev, the meta projects {bench,
    // error} (the cas details drop BY DESIGN at the projector —
    // pinned here), and the client reads the same bench + error
    // line from the row.
    const estate = {
      benchGet: async () => {
        throw new RemoteError("bench/cas-conflict", "bench moved: rev is 7, caller held 6", {
          current_rev: 7,
          expect_rev: 6,
        });
      },
    } as never;
    const tool = meliteConstruct(estate);
    const out = (await tool.execute({ verb: "read" }, {
      signal: AbortSignal.timeout(5000),
    } as never)) as Record<string, unknown>;
    assert.equal(out.ok, false);
    assert.equal(out.error_kind, "bench/cas-conflict");
    assert.equal(out.current_rev, 7);
    const meta = tool.output.presentationMeta!({} as never, out as never) as Record<string, unknown>;
    assert.deepEqual(meta, { bench: "main", error: "bench moved: rev is 7, caller held 6" });
    const parsed = parseConstructBlock({
      kind: "tool-result", meta, isError: true,
      call: { argsRaw: JSON.stringify({ verb: "read" }) },
      content: [{ text: "bench moved: rev is 7, caller held 6" }],
    } as unknown as ToolCallBlockView);
    assert.equal(parsed.bench, "main", "the refusal still links the bench");
    assert.equal(parsed.errorLine, "bench moved: rev is 7, caller held 6");
  });
});
