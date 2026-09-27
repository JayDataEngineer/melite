import { describe, it, expect } from "vitest";
import { SELF_NAMED_FAMILIES } from "../../../../packages/web-kit/contracts/src/benchStage.ts";
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
      // the RANGE RULE's numeric domains — read by the registry seat
      // (judgeLaneBounds) and served by the spec door (laneContractOf)
      "bounds",
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

// ── THE LAWS THE WORK AND DESIGN AUDITS ADDED (2026-10-10) ─────────
// These back the fixes that came out of the two adversarial audits;
// each is a rule the tree would otherwise be free to break again.
describe("THE AUDIT-ADDED LAWS", () => {
  it("RULE 4b · no card declares a real `params` KNOB (the stanza unwrap's safety)", () => {
    // liftCardParams unwraps a `params` stanza (the run body's shape)
    // and liftStanza merges it. If any card ever declares a field
    // named `params`, the unwrap would dissolve it. No card does today
    // — and this is what makes that true rather than assumed.
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (!/\/card\.ts$/.test(f)) continue;
      const code = codeOf(read(f));
      // a schema member named params: (not a description, not a
      // hand-built object key in unrelated logic)
      if (/^\s*params:\s*z\./m.test(code) || /["']params["']\s*:\s*(?:z\.|bag\()/m.test(code)) {
        offenders.push(f + " — declares a `params` field; the stanza unwrap would dissolve it");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 4c · every self-named family is in the contract's list", () => {
    // a card whose id is also a family id must appear in
    // SELF_NAMED_FAMILIES, or the self-naming strip erases a real
    // boarding and the row silently becomes model-less
    const list = SELF_NAMED_FAMILIES;
    const facts = read("packages/engines/comfyui-card-kit/src/facts.ts");
    // the derivation carries each row's own card; the families are the
    // roster keys — a card id that is ALSO a family key is the case
    const cardIds = new Set([...facts.matchAll(/card:\s*["']([a-z0-9_-]+)["']/g)].map((m) => m[1]!));
    const families = new Set([...facts.matchAll(/modelId:\s*["']([a-z0-9_-]+)["']/g)].map((m) => m[1]!));
    const both = [...cardIds].filter((id) => families.has(id));
    for (const id of both) {
      expect(list.has(id), `card '${id}' is also a family id and must be in SELF_NAMED_FAMILIES`).toBe(true);
    }
  });

  it("RULE 9b · the blank law is the CONTRACT'S (no seat hand-rolls one)", () => {
    // the design audit's Q4: three seats spelled "blank" and disagreed
    // about 0, false, {} and [] — one of which meant `top_k: 0` ("off")
    // read as absent in one seat and present in another
    const offenders: string[] = [];
    for (const f of SOURCES) {
      const code = codeOf(read(f));
      if (f.includes("laneRelations.ts")) continue;
      if (/const blank\s*=\s*\(v:\s*unknown\)|function blank\(/.test(code)
        || /const isBlank\s*=\s*\(v:\s*unknown\)/.test(code)) {
        offenders.push(f + " — a hand-rolled blank; import laneBlank from @melite/contracts/laneRelations");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 7b · the main declaration's schema is CHECKED against its interface", () => {
    // the design audit's Q1: ModelDecl was the one row left
    // un-annotated, with two walls existing only to police the pair
    const contract = read("packages/engines/comfyui-cordis/src/models/families/contract.ts");
    expect(contract).toContain("export const ModelDecl: z<ModelDecl>");
    expect(contract).not.toMatch(/RUNTIME schema and the TS interface stay separate truths/);
  });

  it("RULE 10 · the segment grammar is the CONTRACT'S (no door owns a private copy)", () => {
    // the bypass audit's "artifact-URL parsing ×3": three doors
    // judged a legal segment with three private predicates, and the
    // gallery's charset had already drifted to REFUSE names the
    // engine mints (a space, unicode, parens) that the media route
    // served. One predicate; a private re-spelling reopens the
    // disagreement.
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (f.includes("mediaKinds.ts")) continue;
      const code = codeOf(read(f));
      if (/function segmentOk\(|const segmentOk\s*=/.test(code)) {
        offenders.push(f + " — a private segment grammar; import segmentConfined from @melite/contracts/mediaKinds");
      }
      if (/RUN_SEGMENT\s*=\s*\/\^/.test(code)) {
        offenders.push(f + " — a private run-segment charset (the class that refused minted names)");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 11 · every stage-row concept carries its QUALIFIED name (no bare StageRow)", () => {
    // the bypass audit's C4: two same-named StageRow interfaces (a
    // flow-doc stage and a run-record stage) plus a presentation
    // BenchStageRow beside the storage one — an import of the wrong
    // one typechecked silently. The bare names are BANNED; each
    // concept spells FlowStageRow / RunStageRow / BenchStageRow
    // (storage) / BenchStageView (presentation).
    const offenders: string[] = [];
    for (const f of SOURCES) {
      const code = codeOf(read(f));
      const decls = [...code.matchAll(/(?:export\s+)?(?:interface|type)\s+StageRow\b/g)];
      if (decls.length > 0) {
        offenders.push(f + " — declares a bare StageRow (FlowStageRow or RunStageRow)");
      }
      const view = [...code.matchAll(/(?:export\s+)?interface\s+BenchStageRow\b/g)];
      const storage = f.endsWith("packages/estate/drafts/src/bench.ts");
      if (view.length > 0 && !storage) {
        offenders.push(f + " — a BenchStageRow that is not the storage row (BenchStageView)");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
