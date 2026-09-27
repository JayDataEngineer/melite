import { describe, it, expect } from "vitest";
import { assertSchemaAcceptsMinimalRows } from "../../../../packages/engines/comfyui-cordis/src/models/families/contract.ts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// THE CLOSURE GATE — "ALL", mechanically (2026-10-10).
//
// The operator's standard: EVERY little detail under a contract. This
// is the single wall that states what that means in checkable terms
// and fails the moment the tree breaks one of the rules. It is
// deliberately grep-shaped: the laws it enforces are laws about the
// SHAPE of the tree (one owner, no second copy, nothing unread), and
// a shape law is only enforceable by reading the tree.
//
// Each rule names the class it closes, so a failure says which law
// broke rather than "something changed".

const SRC_ROOTS = [
  "packages",
  "scripts",
  "tools",
];

function walk(dir: string, out: string[] = []): string[] {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name === "lib" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.spec\.|\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

const SOURCES = SRC_ROOTS.flatMap((r) => walk(r));

const read = (f: string): string => readFileSync(f, "utf8");
/** code lines only — a comment may NAME a token (the walls read the
 *  names), a string literal or a retyped const is the duplication. */
const codeOf = (src: string): string =>
  src
    // block comments first (a comment may NAME a token — the rule is
    // about CODE), then the line-comment and doc-asterisk lines
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .join("\n");

describe("THE CLOSURE GATE — every detail under a contract", () => {
  it("RULE 1 · one document, one writer: no bench-stage defaults outside the contract", () => {
    // the writer: the bench normalizer. Any other place that FILLS a
    // stage row's derived fields is a second writer
    const offenders: string[] = [];
    for (const f of SOURCES) {
      const src = read(f);
      if (f.includes("benchStage.ts") || f.includes("/bench.ts")) continue;
      if (/=\s*\{\s*default:\s*["']image["']\s*\}/.test(codeOf(src))) {
        offenders.push(f + " — a stage row's outputs default outside the contract");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 2 · no second copy: the run-media prefixes live in the contract only", () => {
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (f.includes("benchStage.ts")) continue;
      const code = codeOf(read(f));
      // ANY mention of either spelling in CODE — the records audit
      // caught a template literal the old quote-adjacent regex could
      // not see (`/melite-media/runs/${...}`), and a legacy path
      // passed through verbatim because it begins with a slash.
      // A DEFINITION builds a path (a short literal or a template);
      // PROSE merely names one inside a sentence (a tool description,
      // a tooltip telling an operator the URL shape). The old scan
      // could not tell them apart and flagged both.
      for (const line of code.split("\n")) {
        if (!line.includes("/v1/assets/runs") && !line.includes("/melite-media/runs")) continue;
        const isProse = line.length > 200 || /description:|tooltip:/.test(line);
        if (isProse) continue;
        offenders.push(f + " — a run-media prefix is DEFINED outside the contract (import it)");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 2b · a STAGE-ROW writer takes its engine from the contract", () => {
    // the audit's Rule-2 finding: "comfyui" was written at five
    // stage-row writers with no pin. Scope: the WRITERS of a bench
    // stage row (a card's own `inject` declaration is a different
    // class — it is that card's seat row, like its BOARDED list, and
    // is out of this rule's reach by design).
    const WRITERS = [
      "estate/drafts/src/bench.ts",
      "melite-tools/src/tools/melite-construct.ts",
      "infer-gallery/src/client/bench-load.ts",
      "estate-queue/src/runsRegistry.ts",
      "estate-queue/src/runsStart.ts",
      "estate-queue/src/runsExecute.ts",
    ];
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (!WRITERS.some((w) => f.includes(w))) continue;
      const code = codeOf(read(f));
      if (/["']comfyui["']/.test(code)) {
        offenders.push(f + " — a stage-row writer spells the engine; take stageEngineOf/CARD_PLANE_ENGINE");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 3 · nothing demanded that can be derived: the card plane's engine is not invented", () => {
    // the card arm's engine is DERIVED at the run door; a card (or a
    // gate) that DEMANDS it on a bench row is asking for what the
    // contract owns
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (!/\/card\.ts$/.test(f)) continue;
      const code = codeOf(read(f));
      if (/engine:\s*(spec\.engine\s*\?\?|\(\s*spec\.engine)/.test(code)) {
        offenders.push(f + " — a card authors the stage engine; the contract derives it");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 4 · no write-only persisted column: the facts file carries only read keys", () => {
    const factsSrc = read("packages/engines/comfyui-card-kit/src/facts.ts");
    // every key the frozen file's rows carry is READ by the derivation
    // TOP-LEVEL members of the row type only (a nested relation row
    // like `conflicts` is not a column)
    const rowType = factsSrc.match(/export interface (?:ModelFactsRow|ModelFacts)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const carried = [...rowType.matchAll(/^\s{2}([a-z_]+)\??:/gm)].map((m) => m[1]!);
    const owned = new Set<string>([
      "id", "card", "family", "genre", "form", "label", "description", "source",
      "defaults", "engine", "outputs", "requires_by_family", "variants",
      "variant_groups", "lane_inputs", "mods", "unavailable", "unoffered",
      "has_agent", "has_inference", "has_rubric", "studio", "timeout_floor",
      "requires", "accepts", "requires_by_family", "overlay",
      // the lane declaration itself (the DECL surface + its laws) —
      // carried by the row and read by the registry seat
      "params", "relations",
    ]);
    for (const key of new Set(carried)) {
      expect(owned.has(key), `the facts row carries '${key}', which no reader owns — a write-only column`).toBe(true);
    }
  });

  it("RULE 5 · no hand-typed list a declaration owns: cards board DECL ids", () => {
    // image-gen's pattern is the law: BOARDED comes from the DECLs.
    // Any card that retypes a family id has the drift bug.
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (!/\/card\.ts$/.test(f)) continue;
      const code = codeOf(read(f));
      const m = code.match(/(?:export )?const BOARDED[^=]*=\s*\[([^\]]*)\]/);
      if (m === null) continue;
      const members = [...m[1]!.matchAll(/["']([a-z0-9-]+)["']/g)].map((x) => x[1]!);
      for (const id of members) {
        if (/Decl\.id/.test(m[1]!)) continue;
        offenders.push(`${f} — BOARDED retypes '${id}'; every member should be a DECL's .id`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 6 · no default written twice: the lane solver has one owner", () => {
    const src = read("packages/engines/comfyui-card-kit/src/lanes-image.ts");
    const code = codeOf(src);
    // the old inline spelling is gone; the named owner answers
    expect(code).not.toMatch(/p\.sampler\s*\|\|/);
    expect(code).not.toMatch(/p\.scheduler\s*\|\|/);
    expect(code).toContain("laneSampler(p)");
  });

  it("RULE 7 · the cross-root order and the servable leaf are the contract's", () => {
    // both readers take the contract's rules
    const gallery = read("packages/web/infer-gallery/src/index.ts");
    expect(gallery).toContain("crossRootOrder");
    expect(gallery).toContain("servableLeaf");
    const media = read("packages/estate/media/src/index.ts");
    expect(media).toContain("servableLeaf");
  });

  it("RULE 8 · the schema is the contract: every row's minimal form resolves", () => {
    // (the runtime half of the DECL agreement — the census's C3)
    assertSchemaAcceptsMinimalRows();
  });

  it("RULE 9 · there is no stale-tab claim and no shared build-stamp global in a client", () => {
    // the operator's own law: the tab is never stale
    const offenders: string[] = [];
    for (const f of SOURCES.filter((p) => p.includes("/web/") && /client/.test(p))) {
      const code = codeOf(read(f));
      if (/STALE TAB|cards-stale-build|staleBuild/.test(code)) {
        offenders.push(f + " — a client claims the tab is stale (the bench is live)");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
