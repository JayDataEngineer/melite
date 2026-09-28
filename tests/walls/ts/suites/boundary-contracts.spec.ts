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
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LOAD_CARRY_KEYS, BIRTH_STRIP_KEYS, RESTORE_STRIP_KEYS } from "../../../../packages/web-kit/contracts/src/benchStage.ts";
import { TERMINAL_RUN_STATUSES } from "../../../../packages/web/melite-run-wire/src/index.ts";

// THE BOUNDARY LAWS (2026-10-10, the two-plane audit sweep). Each
// pin is a law the audit found UNPINNED — every one of them was a
// live break, not a style point.
describe("the boundary laws", () => {
  it("a restore's provenance survives the load (the repair law's coordinate)", () => {
    // The bench normalizer stamped the AUTHOR over every row, so a
    // design-era archive row lost the 'restored' mark the model
    // repair law reads — and refused at its next admission with no
    // repair. The stamp is now conditional.
    // CODE ONLY (the walls audit's M4, 2026-10-10): a raw
    // toContain passes when the expression is mentioned in a COMMENT —
    // and the provenance law is exactly the kind a comment may name
    // while the normalizer stops stamping. Comments are stripped
    // before the assertion (the closure gate's codeOf idiom).
    const src = codeOf(readFileSync("packages/estate/drafts/src/bench.ts", "utf8"));
    expect(src).toContain('row["provenance"] !== "restored"');
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

  it("mcp args: the string a form writes and the object a program writes compose the SAME call", () => {
    const src = readFileSync("packages/engines/mcp/src/mcp-engine.ts", "utf8");
    // one parse site, and the loud refusal names the field
    expect(src).toContain("JSON.parse(text)");
    expect(src).toMatch(/mcp 'args' is not valid JSON/);
  });

  it("the media LIST mints its URLs with the shared encoder (a space in a filename must fetch)", () => {
    const src = readFileSync("packages/estate/media/src/index.ts", "utf8");
    expect(src).toContain("url: mediaUrl(runId, name)");
    expect(src).not.toMatch(/url: `\$\{MEDIA_PREFIX\}\/\$\{runId\}\/\$\{name\}`/);
  });

  it("the model filename is the URL's PATHNAME basename (no query, no fragment, no empty)", () => {
    const src = readFileSync("packages/web/melite-estate/src/provisioning.ts", "utf8");
    expect(src).toContain("artifactFileName(artifact.source_url)");
    expect(src).not.toMatch(/source_url\.split\("\/"\)\.pop\(\)/);
  });

  it("the terminal run vocabulary is ONE set, and both readers use it", () => {
    expect(TERMINAL_RUN_STATUSES).toContain("error");
    const runCard = readFileSync("packages/web/viewer-base/src/runCard.tsx", "utf8");
    expect(runCard).toContain("TERMINAL_RUN_STATUSES");
    expect(runCard).not.toMatch(/new Set\(\['completed', 'failed', 'stopped'/);
  });

  it("a stored path heals wherever it sits: params AND input edges", () => {
    const src = readFileSync("packages/web-kit/contracts/src/benchStage.ts", "utf8");
    // the inputs' initials are stored paths too (the audit's MEDIUM-6)
    expect(src).toMatch(/out\["inputs"\] = [^;]*healRunMediaPaths/);
  });
});
