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

// SOURCES NON-EMPTINESS IS THE WALL'S OWN WALL (the walls audit's
// row 2, 2026-10-10): every rule below iterates SOURCES — a renamed
// root or a widened skip rule empties the list and every loop goes
// vacuously green. The floor is pinned near the real count (615 at
// the pin); a tree that shrinks by a third has lost roots, and a
// wall that iterates nothing proves nothing.
expect(SOURCES.length >= 400,
  `SOURCES must walk the tree (got ${String(SOURCES.length)} files from ${SRC_ROOTS.join(", ")} — a renamed root or a widened skip rule emptied the gate)`).toBe(true);
expect(SOURCES.some((f) => f.includes("/src/")), "the walk reaches src trees").toBe(true);

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
    // THE ALLOW-LIST IS CHECKED AGAINST THE TREE (the walls audit's
    // H10, 2026-10-10): a hand list is a list that rots — a renamed
    // writer (or a seventh one) matched nothing and the rule judged
    // zero files. Every listed writer must EXIST, and the loop must
    // have read every one of them.
    const missing = WRITERS.filter((w) => !SOURCES.some((f) => f.includes(w)));
    expect(missing, `every listed writer exists in the tree (missing: ${missing.join(", ")})`).toEqual([]);
    const scanned: string[] = [];
    for (const f of SOURCES) {
      if (!WRITERS.some((w) => f.includes(w))) continue;
      scanned.push(f);
      const code = codeOf(read(f));
      if (/["']comfyui["']/.test(code)) {
        offenders.push(f + " — a stage-row writer spells the engine; take stageEngineOf/CARD_PLANE_ENGINE");
      }
    }
    expect(scanned.length, "the rule scanned every listed writer").toBe(WRITERS.length);
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
    // A-C2 (the wall audit): the census needs a FLOOR — an interface
    // rename rots the regex to carried=[] and the loop asserts
    // nothing. And the check must run BOTH ways: the `owned` hand
    // list once padded 14 registry-DECL names (family/genre/form/
    // label/…) the facts ROW never carried — dead weight that made
    // the one-way check pass vacuously. owned is EXACTLY the
    // ModelFacts reader census now; equality is set-equality.
    expect(carried.length, "the ModelFacts row census found no members — the regex rotted (interface renamed?)").toBeGreaterThan(10);
    const carriedSet = new Set(carried);
    const owned = new Set<string>([
      // the identity + derivation columns
      "id", "card", "defaults", "lane_inputs",
      // the lane declaration itself (the DECL surface + its laws) —
      // carried by the row and read by the registry seat
      "params", "relations",
      // the RANGE RULE's numeric domains — read by the registry seat
      // (judgeLaneBounds) and served by the spec door (laneContractOf)
      "bounds",
      // the variant matrix + its UI groups + the delivery contract
      "variants", "variant_groups", "outputs",
      // optional declarations, present only where the owner declares
      "accepts", "studio", "requires_by_family", "mods",
    ]);
    for (const key of carriedSet) {
      expect(owned.has(key), `the facts row carries '${key}', which no reader owns — a write-only column`).toBe(true);
    }
    // the reverse equality: the row carries EXACTLY what readers own
    // (owned ⊆ carried — a reader whose column was cut/renamed is a
    // silent break on the read side)
    expect([...owned].filter((k) => !carriedSet.has(k)),
      "owned readers whose column the row no longer carries (renamed/cut)").toEqual([]);
    expect(carried.length, "carried names a column twice — the census double-counts").toEqual(carriedSet.size);
  });

  it("RULE 5 · no hand-typed list a declaration owns: cards board DECL ids", async () => {
    // image-gen's pattern is the law: BOARDED comes from the DECLs.
    // Any card that retypes a family id has the drift bug.
    //
    // A-C3 (the wall audit): only `const BOARDED` arrays were judged —
    // every inline `boarded: [...]` literal rode exempt. BOTH
    // spellings are judged now, per member:
    //   1. a DECL `.id` reference passes (the derivation itself);
    //   2. a string literal passes ONLY when the registry declares the
    //      id live AND the file does not hold the DECL key (a card
    //      that imports a DECL and still spells its id as a literal is
    //      the exact retyping this rule exists to kill);
    //   3. a card.ts carrying NEITHER spelling fails (the shape
    //      changed — the census rotted).
    await import("../../../helpers/boot-models.ts");
    const { modelIds } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
    const live = new Set(modelIds());
    expect(live.size, "the registry census found no families — it did not boot").toBeGreaterThan(0);
    const offenders: string[] = [];
    let judged = 0;
    for (const f of SOURCES) {
      if (!/\/card\.ts$/.test(f)) continue;
      // the contracts package's card.ts is the WIRE TYPE module, not
      // an engine card — it boards nothing by design
      if (f === "packages/web-kit/contracts/src/card.ts") continue;
      const code = codeOf(read(f));
      const arrays = [...code.matchAll(/(?:const BOARDED[^=]*=\s*|boarded:\s*)(\[[^\]]*\])/g)].map((m) => m[1]!);
      if (arrays.length === 0) {
        offenders.push(`${f} — neither a const BOARDED array nor an inline boarded: literal — the card shape changed`);
        continue;
      }
      judged += 1;
      // the file's own DECL keys (the derivations it holds): a file
      // that imports a DECL and still spells a boarded id as a
      // LITERAL is the exact retyping this rule kills — the DECL
      // renames and the literal silently diverges.
      const hasDeclKeys = /\b[A-Za-z0-9]+Decl\b/.test(code);
      for (const arr of arrays) {
        const members = [...arr.matchAll(/["']([a-z0-9-_]+)["']/g)].map((x) => x[1]!);
        // PER MEMBER, NOT PER ARRAY (the walls audit's M5: the old
        // `/Decl\.id/` test ran against the WHOLE array text, so
        // `[SomeDecl.id, "retyped-literal"]` passed — one honest member
        // excused any number beside it).
        for (const id of members) {
          if (new RegExp(`\\b${id}\\.id\\b`).test(arr)) continue; // the derivation rides beside
          if (hasDeclKeys) {
            offenders.push(`${f} — boards '${id}' as a literal while holding DECL keys — board the DECL's .id`);
            continue;
          }
          if (!live.has(id)) {
            offenders.push(`${f} — boards '${id}', which the registry does not declare (dead or typo'd id)`);
          }
        }
      }
    }
    expect(judged, "no card.ts was judged — the census rotted").toBeGreaterThan(10);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 6 · no default written twice: the lane solver has one owner", () => {
    const src = read("packages/engines/comfyui-card-kit/src/lanes-image.ts");
    const code = codeOf(src);
    // the old inline spelling is gone; the named owner answers
    // BOTH SPELLINGS (the walls audit's M5, 2026-10-10): the ban
    // caught `p.sampler || "euler"` while `p.sampler ?? "euler"` — the
    // same second writer of the lane default, written with the other
    // falsy-check — walked past.
    expect(code).not.toMatch(/p\.sampler\s*(\|\||\?\?)/);
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

  it("RULE 4c · every self-named family is in the contract's list", async () => {
    // A-C1 (the wall audit): this rule once regexed facts.ts for
    // `card: "…"` literals — a shape facts.ts does not carry — so
    // BOTH censuses were [] and the loop asserted NOTHING (zero
    // green). The derivation is LIVE now: the booted registry's own
    // card ids and model ids, each with a floor, and the equality
    // runs BOTH ways (a list entry that names no real card∩family is
    // its own rot).
    await import("../../../helpers/boot-models.ts");
    const { loadCardDefs, theService } = await import("../../../../packages/engines/comfyui-cordis/src/cardDefs.ts");
    const { modelIds } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
    await loadCardDefs();
    const cardIds = new Set(theService().cardIds());
    const families = new Set(modelIds());
    expect(cardIds.size, "the card census found no cards — the registry did not boot").toBeGreaterThan(0);
    expect(families.size, "the family census found no families — the registry did not boot").toBeGreaterThan(0);
    const both = [...cardIds].filter((id) => families.has(id));
    expect(both.length, "the card∩family set is empty — SELF_NAMED_FAMILIES names nothing real").toBeGreaterThan(0);
    for (const id of both) {
      expect(SELF_NAMED_FAMILIES.has(id), `card '${id}' is also a family id and must be in SELF_NAMED_FAMILIES`).toBe(true);
    }
    // the reverse: every list entry IS a real card∩family id
    for (const id of SELF_NAMED_FAMILIES) {
      expect(
        cardIds.has(id) && families.has(id),
        `SELF_NAMED_FAMILIES names '${id}', which is not both a card id and a family id — the list rotted`,
      ).toBe(true);
    }
    // set-equality, stated once, mechanically (no drift between the
    // two loops above and the truth)
    expect([...SELF_NAMED_FAMILIES].sort(), "SELF_NAMED_FAMILIES is exactly the card∩family set").toEqual([...both].sort());
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
      // THE RE-SPELLING SIGNATURE (li-aq.3, the rules audit's M-4):
      // the private copies the NAME-scan missed both spelled the
      // grammar as the lookahead+charset combo — dots-only refused
      // by negative lookahead over the filename charset. Ban the
      // SHAPE (a new name sails past a name list; the signature
      // cannot). A genuinely different law (wire names, run ids)
      // carries neither the charset with dots NOR the dots-only
      // lookahead.
      if (/\(\?!\\\.{1,2}\$\)\[A-Za-z0-9\._-\]/.test(code)) {
        offenders.push(f + " — the media segment grammar re-spelled as a private regex; import segmentConfined from @melite/contracts/mediaKinds");
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
      // L13 (li-aq.3): the ban matched only the INTERFACE spelling —
      // `type BenchStageRow = …` (the alias) sailed through, the
      // same evasion class RULE 10's name-scan had. Both spellings
      // die; only the storage row keeps the name.
      const view = [...code.matchAll(/(?:export\s+)?(?:interface|type)\s+BenchStageRow\b/g)];
      const storage = f.endsWith("packages/estate/drafts/src/bench.ts");
      if (view.length > 0 && !storage) {
        offenders.push(f + " — a BenchStageRow that is not the storage row (BenchStageView; interface OR type alias — both spell the presentation row)");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
