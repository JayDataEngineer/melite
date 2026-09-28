import "../../../helpers/boot-models.ts";

/** code lines only — a comment may NAME a token; a string literal or
 *  a retyped const is the duplication (the closure gate's idiom). */
const codeOf = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .join("\n");
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOAD_CARRY_KEYS, BIRTH_STRIP_KEYS, RESTORE_STRIP_KEYS, normalizeBenchStage } from "../../../../packages/web-kit/contracts/src/benchStage.ts";
import { TERMINAL_RUN_STATUSES } from "../../../../packages/web/melite-run-wire/src/index.ts";

// THE BOUNDARY LAWS (2026-10-10, the two-plane audit sweep). Each
// pin is a law the audit found UNPINNED — every one of them was a
// live break, not a style point.
describe("the boundary laws", () => {
  it("a restore's provenance survives the load (the repair law's coordinate)", async () => {
    // The bench normalizer stamped the AUTHOR over every row, so a
    // design-era archive row lost the 'restored' mark the model
    // repair law reads — and refused at its next admission with no
    // repair. The stamp is now conditional.
    // BEHAVIOURAL (A-M10, the wall audit, 2026-09-28): the arm used
    // to be a codeOf toContain on the very expression a COMMENT
    // could name — a dead stamp passed. The normalizer is now
    // DRIVEN: a restored row keeps its mark, the author's own rows
    // are stamped as before.
    const { normalizeStages } = await import("../../../../packages/estate/drafts/src/bench.ts");
    const [restored, own] = normalizeStages(
      [{ id: "s_0", provenance: "restored" }, { id: "s_1" }],
      "agent" as never,
    );
    expect(restored["provenance"]).toBe("restored");
    expect(own["provenance"]).toBe("agent");
    // and a live row may not CLAIM the repair coordinate
    const [forged] = normalizeStages([{ id: "s_0" }], "agent" as never);
    expect(forged["provenance"]).not.toBe("restored");
  });

  it("the arm lists live in the CONTRACT, not beside it (no second copy)", () => {
    // birth strips, restore strips, load carries — three arms, one
    // owner each. A local list in a door is the drift the audit found.
    const bench = readFileSync("packages/estate/drafts/src/bench.ts", "utf8");
    expect(bench).toContain("BIRTH_STRIP_KEYS");
    expect(bench).toContain("LOAD_CARRY_KEYS");
    expect(bench).not.toMatch(/const MEMORY_KEYS = \[/);
    const registry = readFileSync("packages/harness/estate-queue/src/runsRegistry.ts", "utf8");
    expect(registry).not.toContain('CARD_PLANE_ENGINE = "comfyui"');
    expect(registry).toContain("stageEngineOf");
    // the sets are complements, and named once
    expect(BIRTH_STRIP_KEYS).not.toContain("result");
    expect(LOAD_CARRY_KEYS).toContain("result");
    expect(RESTORE_STRIP_KEYS).toContain("result");
  });

  it("mcp args: the string a form writes and the object a program writes compose the SAME call", async () => {
    // BEHAVIOURAL (A-M10): the arm was two substrings over the
    // source — a dead parse site passed. The executor is now DRIVEN
    // with both spellings; the recorded wire call is compared, and
    // the malformed spelling must refuse LOUDLY (the refusal text
    // names the field).
    const { mcpExecutor } = await import("../../../../packages/engines/mcp/src/mcp-engine.ts");
    const seen: Record<string, unknown>[] = [];
    const tools = {
      execute: async (input: { name: string; arguments: unknown }) => {
        seen.push(input.arguments as Record<string, unknown>);
        return { isError: false, content: [], value: {} };
      },
    } as never;
    const { executeStages } = mcpExecutor(tools, "mcp:unity");
    const runDir = mkdtempSync(join(tmpdir(), "mcp-args-"));
    const row = (args: unknown) => [{ stageId: "s_0", outputs: {}, params: { tool: "scene_info", args } }];
    const opts = { report: () => {}, shouldStop: () => false };
    await executeStages(row({ limit: 8 }), runDir, [], opts as never);
    await executeStages(row(JSON.stringify({ limit: 8 })), runDir, [], opts as never);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[0]).toEqual({ limit: 8 });
    // the empty string is the blank field, not malformed JSON
    await expect(executeStages(row(""), runDir, [], opts as never)).resolves.toBeDefined();
    await expect(executeStages(row("{nope"), runDir, [], opts as never))
      .rejects.toThrow(/mcp 'args' is not valid JSON/);
    // a JSON array is not a JSON object — refused by name too
    await expect(executeStages(row("[1,2]"), runDir, [], opts as never))
      .rejects.toThrow(/mcp 'args' is not valid JSON/);
    rmSync(runDir, { recursive: true, force: true });
  });

  it("the media LIST mints its URLs with the shared encoder (a space in a filename must fetch)", async () => {
    // BEHAVIOURAL (A-M10): the two substrings could both pass on
    // dead code. The ENCODER is now driven — a space, a paren and a
    // non-ASCII segment must percent-encode per segment — and the
    // list's own site is pinned as a live CALL, not a string.
    const { mediaUrl, MEDIA_PREFIX } = await import("../../../../packages/estate/media/src/index.ts");
    expect(mediaUrl("run-1", "a b.png")).toBe(MEDIA_PREFIX + "/run-1/a%20b.png");
    // encodeURIComponent leaves the RFC-3986 sub-delims alone
    expect(mediaUrl("run-1", "shot (1).png")).toBe(MEDIA_PREFIX + "/run-1/shot%20(1).png");
    expect(mediaUrl("run-1", "café/naïve.png")).toBe(MEDIA_PREFIX + "/run-1/caf%C3%A9/na%C3%AFve.png");
    // a name that already rides a URL passes verbatim (the rewrite
    // claims bare run-relative names only)
    expect(mediaUrl("run-1", "https://x.test/a.png")).toBe("https://x.test/a.png");
    expect(mediaUrl("run-1", "/already/rooted.png")).toBe("/already/rooted.png");
    expect(mediaUrl("run-1", "")).toBe("");
    const src = codeOf(readFileSync("packages/estate/media/src/index.ts", "utf8"));
    expect(src).toContain("url: mediaUrl(runId, name)");
    expect(src).not.toMatch(/url: `\$\{MEDIA_PREFIX\}\/\$\{runId\}\/\$\{name\}`/);
  });

  it("the model filename is the URL's PATHNAME basename (no query, no fragment, no empty)", async () => {
    // BEHAVIOURAL (A-M10): the substring pair could pass on dead
    // code. The derivation is now DRIVEN over the four URL shapes
    // the audit's C5 broke on.
    // the derivation lives in the CONTRACT (promoted by this arm):
    // the client is not importable from the node wall project, and a
    // pin that cannot DRIVE its subject is a comment.
    const { artifactFileName } = await import("../../../../packages/web-kit/contracts/src/benchResult.ts");
    expect(artifactFileName("https://h.test/models/x/f.safetensors")).toBe("f.safetensors");
    expect(artifactFileName("https://h.test/models/x/f.safetensors?download=1")).toBe("f.safetensors");
    expect(artifactFileName("https://h.test/models/x/f.safetensors#frag")).toBe("f.safetensors");
    expect(artifactFileName("https://h.test/models/x/f.safetensors?d=1#frag")).toBe("f.safetensors");
    // a trailing slash names no file — empty, and the caller's
    // destination check refuses it by name
    expect(artifactFileName("https://h.test/models/x/")).toBe("");
    // percent-decoding: the stored name is the REAL filename
    expect(artifactFileName("https://h.test/models/x/my%20model.safetensors")).toBe("my model.safetensors");
    // and the ONE call site takes the contract's copy
    const src = codeOf(readFileSync("packages/web/melite-estate/src/provisioning.ts", "utf8"));
    expect(src).toContain("artifactFileName(artifact.source_url)");
    expect(src).toContain('from "@melite/contracts/benchResult"');
    expect(src).not.toMatch(/source_url\.split\("\/"\)\.pop\(\)/);
    // a second local derivation is the drift this promotion killed
    expect(src).not.toMatch(/function artifactFileName/);
  });

  it("the terminal run vocabulary is ONE set, and both readers use it", () => {
    expect(TERMINAL_RUN_STATUSES).toContain("error");
    const runCard = readFileSync("packages/web/viewer-base/src/runCard.tsx", "utf8");
    expect(runCard).toContain("TERMINAL_RUN_STATUSES");
    expect(runCard).not.toMatch(/new Set\(\['completed', 'failed', 'stopped'/);
  });

  it("a stored path heals wherever it sits: params AND input edges", () => {
    // BEHAVIOURAL (A-M10): the regex matched a source shape a dead
    // edit could satisfy. The normalizer is DRIVEN: a legacy
    // run-media path in inputs AND in params heals, and a $spell,
    // an http URL and a local file ride verbatim.
    const row = normalizeBenchStage(
      {
        id: "s_0",
        inputs: { image1: "/v1/assets/runs/run-1/a.png", keep: ["$spell", "/home/user/a.png"] },
        params: { image2: "/v1/assets/runs/run-1/b.png" },
      },
      0,
    );
    expect((row["inputs"] as Record<string, unknown>)["image1"]).toBe("/melite-media/runs/run-1/a.png");
    expect((row["inputs"] as Record<string, unknown>)["keep"]).toEqual(["$spell", "/home/user/a.png"]);
    expect((row["params"] as Record<string, unknown>)["image2"]).toBe("/melite-media/runs/run-1/b.png");
  });
});
