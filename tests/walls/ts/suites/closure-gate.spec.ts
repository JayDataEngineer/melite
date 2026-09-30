import { describe, it, expect } from "vitest";
import { SELF_NAMED_FAMILIES } from "../../../../packages/web-kit/contracts/src/benchStage.ts";
import { STALE_TAB_VOCABULARY } from "../../helpers/stale-tab-vocabulary.ts";
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
// A-M12 (the wall audit, 2026-09-28): the floor sat at 400 against
// a real tree of ~615 — a tree that lost a THIRD of its roots still
// passed. The pin is a tight band now: the count derives from the
// same walk at run time, pinned to today's census ±10% (growth is
// fine; collapse is the hole the floor existed for).
expect(SOURCES.length >= 550,
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
        // A-M6 (the wall audit, 2026-09-28): the old escape excused
        // ANY line over 200 chars — a 201-char DEFINITION walked.
        // PROSE ONLY now: a comment line, or a description/tooltip
        // field naming a path inside a sentence.
        // A string that MENTIONS the prefix mid-sentence is prose;
        // a string that IS the prefix (starts at the opening quote
        // or a template head) is a definition. The last quote
        // before the match decides: prose if words precede the
        // prefix inside the same string.
        const at = line.indexOf("/v1/assets/runs") >= 0 ? line.indexOf("/v1/assets/runs") : line.indexOf("/melite-media/runs");
        const before = line.slice(0, at);
        const lastQuote = Math.max(before.lastIndexOf("'"), before.lastIndexOf('"'), before.lastIndexOf('`'));
        const head = before.slice(lastQuote + 1).trim();
        const isProse = /^\s*(\/\/|\*|#)/.test(line)
          || /description:|tooltip:/.test(line)
          || (lastQuote >= 0 && head.length > 0); // words inside the string before the prefix → a sentence
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
    // A-M7 (the wall audit, 2026-09-28): scanned==6 proved the
    // listed writers EXIST, not that no 7th writer was born — the
    // audit's probe found five spellers outside the list
    // (estate.ts, melite-flow.ts ×2, flowsRegistryRows.ts ×2,
    // cardDefs.ts — all fixed to CARD_PLANE_ENGINE in the same
    // stroke). The completeness pin is a REPO-WIDE discovery over
    // the same SOURCES: the literal may appear ONLY in the named
    // carve — the DECL grammar's own self-test fixture (contract.ts
    // declares the engine STRING; its fixture row is data) and the
    // e2e client fixtures (tour drives the client with a fake row).
    // Any new spelling anywhere refuses.
    const CARVE = [
      "models/families/contract.ts", // the DECL grammar's self-test fixture row — the grammar declares the STRING
      "e2e/tour.ts", // e2e client fixture: tour drives the client with a fake stage row
      "tests/estate-harness.ts", // the card-view test harness's fake bench row (test data, not a writer)
    ];
    const spellers: string[] = [];
    for (const f of SOURCES) {
      if (CARVE.some((c) => f.includes(c))) continue;
      const code = codeOf(read(f));
      if (/engine\s*:\s*["']comfyui["']/.test(code)) spellers.push(f);
    }
    expect(spellers, `the engine literal is spelled only in the carve (spellers: ${spellers.join(", ")})`).toEqual([]);
  });

  it("RULE 3 · nothing demanded that can be derived: the card plane's engine is not invented", () => {
    // the card arm's engine is DERIVED at the run door; a card (or a
    // gate) that DEMANDS it on a bench row is asking for what the
    // contract owns
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (!/\/card\.ts$/.test(f)) continue;
      const code = codeOf(read(f));
      // A-L18 (the wall audit, 2026-09-28): the pattern named two
      // shapes (`spec.engine ??` and `(spec.engine`) — a third
      // spelling (`spec.engine ||`, a ternary, an Object.assign)
      // walked past. The LAW is behavioural, not textual: no card
      // file may WRITE an `engine` key at all — the contract derives
      // it from the card id (benchStage.ts's stageEngineOf). A card
      // that reads an engine (a test, a type) may still say it.
      for (const line of code.split("\n")) {
        if (/\bengine\b\s*[:,=]/.test(line) && !/\/\//.test(line)) {
          offenders.push(f + " — a card authors the stage engine; the contract derives it");
          break;
        }
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
      // the owning family of a route address (the addressOwners
      // derivation) — read by the image-gen card's compose seat
      // (ACTION_BINDINGS keys on model.family ?? model.id; card.ts
      // — the route-id binding miss killed 2026-09-30)
      "family",
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

  it("RULE 5b · card compose bindings derive from the family DECLs: declaredAction at every seat", async () => {
    // The interlock the atom vocabulary owes (stroke 3's close):
    // an ACTION_BINDINGS row resolves its action off the family's
    // OWN DECL through declaredAction — the hand-imported action
    // list (one static import per family, retyped per card) is the
    // drift bug this kills: the family drops an action from its
    // DECL and the card's import silently keeps composing a dead
    // segment. Judged per seat, two laws:
    //   1. every instantiateAction seat inside the bindings literal
    //      takes declaredAction(<decl>, '<id>') — nothing else;
    //   2. the id is one the imported DECL actually declares (a
    //      card binding an unoffered action refuses at boarding —
    //      the wall refuses first, at CI).
    const offenders: string[] = [];
    let judged = 0;
    const checked = new Map<string, Set<string>>();
    for (const f of SOURCES) {
      if (!/\/card\.ts$/.test(f)) continue;
      if (f === "packages/web-kit/contracts/src/card.ts") continue;
      const code = codeOf(read(f));
      // string-scan the bindings literal: the type annotation may
      // itself carry braces (tts's slot record), so anchor at the
      // assignment's `= {` and close at the first `}` at column 0
      const anchor = code.indexOf("ACTION_BINDINGS");
      if (anchor === -1) continue;
      const open = code.indexOf("= {", anchor);
      if (open === -1) continue;
      const close = code.indexOf("\n}", open);
      if (close === -1) continue;
      judged += 1;
      const body = code.slice(open, close);
      const seats = [...body.matchAll(/instantiateAction\((.+?), p, model, g, runId\)/g)].map((x) => x[1]!.trim());
      if (seats.length === 0) {
        offenders.push(`${f} — ACTION_BINDINGS with no instantiateAction seats — the card shape changed`);
        continue;
      }
      for (const seat of seats) {
        const dm = seat.match(/^declaredAction\((\w+Decl),\s*'([a-z0-9_-]+)'\)$/);
        if (!dm) {
          offenders.push(`${f} — binding seat '${seat}' does not derive via declaredAction(<decl>, '<id>')`);
          continue;
        }
        const [, declName, actionId] = dm as unknown as [string, string, string];
        const im = code.match(new RegExp(`import \\{[^}]*DECL as ${declName}[^}]*\\} from '([^']+)'`));
        if (!im) {
          offenders.push(`${f} — seat names ${declName} but the file never imports it`);
          continue;
        }
        const spec = im[1]!;
        // walls resolve by path, not workspace name — every family
        // package is '@melite/models-<dir>' with the DECL at root
        const dir = spec.replace(/^@melite\/models-/, "");
        if (!checked.has(dir)) {
          const offered = new Set<string>();
          try {
            const mod = (await import(`../../../../packages/models/${dir}/src/index.ts`)) as {
              DECL?: { actions?: Array<{ id: string }> };
            };
            for (const a of mod.DECL?.actions ?? []) offered.add(a.id);
          } catch {
            /* the offender line below reports the empty offer */
          }
          checked.set(dir, offered);
        }
        const offered = checked.get(dir)!;
        if (!offered.has(actionId)) {
          offenders.push(`${f} — binds '${actionId}' off ${spec}, which declares [${[...offered].join(", ") || "none"}]`);
        }
      }
    }
    expect(judged, "no card.ts was judged — the census rotted").toBeGreaterThan(10);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 6 · no default written twice: the lane solver has one owner, ESTATE-WIDE", () => {
    // THE BAN IS NO LONGER ONE FILE (the dead-wall audit's finding
    // #3). This rule read only `lanes-image.ts`, so the exact banned
    // spelling written in `lanes-image-tools.ts` sailed: RULE 6 green,
    // the whole closure file 22/22 green. A one-owner rule pinned to
    // one owner is a note about that file, not a law about the
    // estate — and a second writer of a lane default is precisely
    // what a second FILE would be.
    //
    // The old inline spelling is gone; the named owner answers
    // BOTH SPELLINGS (the walls audit's M5, 2026-10-10): the ban
    // caught `p.sampler || "euler"` while `p.sampler ?? "euler"` — the
    // same second writer of the lane default, written with the other
    // falsy-check — walked past.
    // A-L16 (the wall audit, 2026-09-28): the ban covered BOTH
    // falsy spellings for `sampler` and only `||` for `scheduler` —
    // the same law written asymmetrically is the same drift waiting
    // to happen. Both keys, both spellings.
    const offenders: string[] = [];
    let judged = 0;
    for (const f of SOURCES) {
      // the owner itself is where `laneSampler(p)` legitimately lives;
      // the ban is on a SECOND writer of the default, wherever it sits
      const code = codeOf(read(f));
      judged += 1;
      if (/p\.sampler\s*(\|\||\?\?)/.test(code)) {
        offenders.push(`${f} — writes a second sampler default (p.sampler || / ??)`);
      }
      if (/p\.scheduler\s*(\|\||\?\?)/.test(code)) {
        offenders.push(`${f} — writes a second scheduler default (p.scheduler || / ??)`);
      }
    }
    expect(judged, "no source was judged — the census rotted").toBeGreaterThan(50);
    expect(offenders, offenders.join("\n")).toEqual([]);
    // and the named owner still answers, in its own file
    const owner = codeOf(read("packages/engines/comfyui-card-kit/src/lanes-image.ts"));
    expect(owner).toContain("laneSampler(p)");
  });

  it("RULE 6d · the restored-provenance spelling is the CONTRACT'S (a coordinate has one writer)", () => {
    // "restored" is the coordinate the model-repair law reads. It was
    // a bare literal in five places — the drafts reader, the snapshot
    // restore, and three client restore arms — while the estate's own
    // door carried a NAMED spelling beside them. A coordinate with
    // two sources is a coordinate that can disagree with itself: a
    // rename on one side silently stops exempting the rows the other
    // side still writes, and the repair law stops repairing. The
    // contract floor owns the spelling; the bare literal is banned
    // everywhere else, so a sixth writer cannot appear.
    const CONTRACT = "web-kit/contracts/src/benchStage.ts";
    const offenders: string[] = [];
    let owners = 0;
    for (const f of SOURCES) {
      const code = codeOf(read(f));
      const isDeclaration = /export const RESTORED_PROVENANCE_SPELLING = "restored"/.test(code);
      const literal = isDeclaration
        || /provenance['"]?\]?\s*[:=]\s*['"]restored['"]|['"]restored['"]\s*===|!==\s*['"]restored['"]/.test(code);
      if (!literal) continue;
      if (f.includes(CONTRACT)) { owners += 1; continue }
      offenders.push(f + " — the restored coordinate is the contract's RESTORED_PROVENANCE_SPELLING");
    }
    expect(owners, "the contract floor declares the restored spelling once").toBe(1);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 6e · a card knob may never collide with an envelope key (the silent eat)", async () => {
    const { CARD_ENVELOPE_KEYS } = await import("../../../../packages/harness/estate-queue/src/cardsRegistry.ts");
    // The envelope fix (li-ar) filters the row's own coordinates out
    // of a card's knob bag BY NAME. Zero collisions exist today, and
    // a card that declared a knob called `description` (or `id`, or
    // `outputs`) would have that knob silently eaten at EVERY
    // compose — the compose would succeed with a missing required
    // input and the graph would fail downstream, or the run would
    // refuse for a key the author cannot see. Only `params` was
    // walled (RULE 4b); the other eleven coordinates had no wall at
    // all, so the first card to declare one would be a silent eat.
    //
    // The law: no card, family, or resolver row may declare a knob
    // whose name is an envelope key. The set is DERIVED from the
    // envelope itself, so a new coordinate is covered the day it
    // lands.
    const COORDINATES = new Set(CARD_ENVELOPE_KEYS);
    const offenders: string[] = [];
    // the card planes: every card's declared schema
    for (const f of SOURCES.filter((p) => /\/card\.ts$/.test(p))) {
      const code = codeOf(read(f));
      for (const m of code.matchAll(/^\s{2,}([a-z_][a-z0-9_]*)\??:\s*z\./gm)) {
        const name = m[1]!;
        if (COORDINATES.has(name)) offenders.push(f + " declares the knob '" + name + "' — that name is an ENVELOPE coordinate and would be eaten at compose");
      }
      for (const m of code.matchAll(/\["']([a-z_][a-z0-9_]*)["']:\s*z\./g)) {
        const name = m[1]!;
        if (COORDINATES.has(name)) offenders.push(f + " declares the knob '" + name + "' (quoted key) — an envelope coordinate, eaten at compose");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 6c · the session grammar is the CONTRACT'S (no fourth mirror)", () => {
    // The bench key is an ADDRESS — it names a stored document — and
    // an address has one grammar. It was spelled in five places: the
    // drafts owner, two inline copies in melite-construct, and two
    // browser mirrors. The grammar wall compared the copies it knew
    // by name, so a copy outside that set (or a tightening of any ONE
    // of them) passed the whole suite: a copy the wall does not name
    // is a copy the wall does not hold. The contract floor owns it
    // now; this bans the literal everywhere else, so a fifth copy
    // cannot appear without a wall red.
    const CONTRACT = "web-kit/contracts/src/benchStage.ts";
    const owners: string[] = [];
    const offenders: string[] = [];
    for (const f of SOURCES) {
      const code = codeOf(read(f));
      // the MCP tool-address grammar is a DIFFERENT address (a tool
      // name, not a bench key) and keeps its own copy — named here so
      // the ban is honest about what it does and does not cover.
      if (f.includes("engines/mcp/src/mcp-engine.ts")) continue;
      const inContract = f.includes(CONTRACT);
      const literal = /\^\[A-Za-z0-9_-\]\{1,64\}\$|\[A-Za-z0-9_-\]\{1,64\}\$\//.test(code)
        || /BENCH_SESSION_RE\s*=\s*\//.test(code)
        || /SESSION_RE\s*:\s*RegExp\s*=\s*\//.test(code);
      if (!literal) continue;
      if (inContract) { owners.push(f); continue }
      offenders.push(f + " — the bench-key grammar is the contract's SESSION_RE; import it");
    }
    expect(owners, "the contract floor declares the grammar once").toHaveLength(1);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 6b · the stage-patch key list is spelled ONCE (B-M9's second copy)", () => {
    // The old door's fixed key set lived in TWO production modules —
    // the drafts admission and the runs gate — with the same members
    // in a DIFFERENT order, each composing its own refusal voice. A
    // key added to one door left the other refusing it. The list is
    // the contract's now; no module may re-spell it.
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (f.includes("web-kit/contracts/src/benchStage.ts")) continue;
      const code = codeOf(read(f));
      if (/const\s+STAGE_PATCH_KEYS\s*[:=]/.test(code)) {
        offenders.push(f + " — the stage-patch key list is the contract's; import it");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 7 · the cross-root order and the servable leaf are the contract's", () => {
    // BOTH READERS TAKE THE CONTRACT'S RULES — behaviourally: the
    // contract's own predicates are imported and CALLED, not merely
    // named. A-L23 (the wall audit, 2026-09-28): `toContain` on a
    // NAME passes on a bare import the file never calls (an unused
    // import satisfies toContain and the reader keeps its own
    // copy). The import must be a CALL SITE, and the reader's own
    // judgement must move with the contract's rule.
    const gallery = codeOf(read("packages/web/infer-gallery/src/index.ts"));
    expect(gallery, "the gallery CALLS crossRootOrder (an import alone proves nothing)").toMatch(/crossRootOrder\s*\(/);
    expect(gallery, "the gallery CALLS servableLeaf").toMatch(/servableLeaf\s*\(/);
    const media = codeOf(read("packages/estate/media/src/index.ts"));
    expect(media, "the media reader CALLS servableLeaf").toMatch(/servableLeaf\s*\(/);
  });

  it("RULE 8 · the schema is the contract: every row's minimal form resolves", () => {
    // (the runtime half of the DECL agreement — the census's C3)
    assertSchemaAcceptsMinimalRows();
  });

  it("RULE 9 · there is no stale-tab claim and no shared build-stamp global in a client", () => {
    // the operator's own law: the tab is never stale
    const offenders: string[] = [];
    // A-L17 (the wall audit, 2026-09-28): this rule was NARROWER
    // than its bench-stage twin — the twin bans five spellings
    // (/stale tab/i, staleBuild, buildVerdict, ...) over three
    // client roots, this one banned three over a path filter. A
    // stricter twin and a looser copy is a hole with a name. The
    // vocabulary is now the TWIN'S, spelled once here as the shared
    // list both walls carry (and the bench-stage twin asserts its
    // own copy against the same shapes).
    const STALE = STALE_TAB_VOCABULARY;
    for (const f of SOURCES.filter((p) => p.includes("/web/") && /client/.test(p))) {
      const code = codeOf(read(f));
      for (const re of STALE) {
        if (re.test(code)) offenders.push(f + " matches " + String(re) + " — a client claims the tab is stale (the bench is live)");
      }
      if (code.includes("__MELITE_BUILD_STAMP__")) {
        offenders.push(f + " reads the shared build-stamp global (which bundle ran last is not this bundle's build)");
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

// ── THE LAWS THE WORK AND DESIGN AUDITS ADDED (2026-10-10) ─────────
// These back the fixes that came out of the two adversarial audits;
// each is a rule the tree would otherwise be free to break again.
describe("THE AUDIT-ADDED LAWS", async () => {
  // the CONTRACT's own schema instance — a wall that imported its
  // own copy of schemastery would be driving a second judge
  const { SCHEMA: Schema } = await import("../../../../packages/engines/comfyui-cordis/src/models/families/contract.ts");
  const contractNs = await import("../../../../packages/engines/comfyui-cordis/src/models/families/contract.ts");
  const { ENGINE_TRUTH } = await import("../../../../packages/engines/comfyui-cordis/src/models/validate.ts");
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
      // A-L22 (the wall audit, 2026-09-28): the ban named two
      // literal shapes — a computed key (`[PARAMS_KEY]: z.…`, where
      // the constant is "params") and a spread-then-params walked
      // past. The law is by RESOLUTION: a card may not declare a
      // member whose resolved key is `params`, and a computed key
      // whose text is not literally "params" is a new spelling to
      // name here, not a hole.
      const literal = /^\s*params:\s*z\./m.test(code) || /["']params["']\s*:\s*(?:z\.|bag\()/m.test(code);
      const computed = /\[\s*["'][^"']+["']\s*\]\s*:\s*(?:z\.|bag\()/m.test(code)
        || /\[\s*\w+\s*\]\s*:\s*(?:z\.|bag\()/m.test(code);
      if (literal || computed) {
        offenders.push(f + " — declares a `params` field (literal or computed key); the stanza unwrap would dissolve it");
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
      // A-L20 (the wall audit, 2026-09-28): three hand-rolled blank
      // spellings were named and a fourth (`const isBlank = (v: any)
      //`, `const blankish = ...`, an arrow with a typed param) walked
      // past. The ban is by SHAPE: a local blank predicate is any
      // function or arrow whose body is a nullish/emptiness test —
      // the contract's laneBlank is the only one allowed to exist.
      const shaped = [
        /(?:const|let|function)\s+\w*[Bb]lank\w*\s*(?:=\s*(?:\(|function)|\()/,
        /\w*[Bb]lank\w*\s*(?:=\s*\([^)]*\)\s*=>|\([^)]*\)\s*\{[^}]*===?\s*(?:null|undefined))/,
      ];
      for (const re of shaped) {
        if (re.test(code)) {
          offenders.push(f + " — a hand-rolled blank (" + String(re) + "); import laneBlank from @melite/contracts/laneRelations");
          break;
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("RULE 7b · the main declaration's schema is CHECKED against its interface", async () => {
    // the design audit's Q1: ModelDecl was the one row left
    // un-annotated, with two walls existing only to police the pair.
    //
    // BEHAVIOURAL NOW (the schema auditor, 2026-09-28): the old arm
    // pinned the ANNOTATION TEXT plus a banned comment string, and
    // the auditor added `audit_probe_field?: string` to the
    // interface with no schema twin — every wall stayed green. An
    // interface member the schema does not know is a declaration an
    // author may write and registration will silently drop, which is
    // the drift class this rule exists for. The pair is now driven:
    // every OPTIONAL interface member is a key the schema carries
    // (a row stating it resolves), and every member is either
    // required or omittable (the minimal-row table, RULE 8).
    const { SCHEMA } = await import("../../../../packages/engines/comfyui-cordis/src/models/families/contract.ts");
    const src = read("packages/engines/comfyui-cordis/src/models/families/contract.ts");
    expect(src).toContain("export const ModelDecl: z<ModelDecl>");
    expect(src).not.toMatch(/RUNTIME schema and the TS interface stay separate truths/);
    // the interface's own members, read from its declaration
    const decl = src.match(/export interface ModelDecl\s*\{([\s\S]*?)\n\}/);
    expect(decl, "the ModelDecl interface is declared where this arm reads it").not.toBeNull();
    const members = [...(decl![1] as string).matchAll(/^\s{2}(\w+)(\??):\s*([^;]+);/gm)]
      .map((m) => ({ name: m[1]!, optional: m[2] === "?", type: (m[3] ?? "").trim() }));
    expect(members.length, "the interface census read its members (a regex rot empties it)").toBeGreaterThan(5);
    // the schema's own keys, read from its declaration
    const schemaBlock = src.match(/export const ModelDecl: z<ModelDecl> = z\.object\(\{([\s\S]*?)\n\}\);/);
    expect(schemaBlock, "the ModelDecl schema is declared where this arm reads it").not.toBeNull();
    const schemaKeys = new Set([...(schemaBlock![1] as string).matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]!));
    // EVERY interface member is a schema key — this is the direction
    // the annotation text could not see.
    const orphans = members.filter((m) => !schemaKeys.has(m.name)).map((m) => m.name);
    expect(orphans, `every interface member has a schema key (orphans: ${orphans.join(", ")}) — ` +
      "an interface field the schema drops is a declaration an author may write and registration silently loses").toEqual([]);
    // and the schema declares no key the interface does not (the
    // reverse: a schema key no author may write is a dead field)
    const memberNames = new Set(members.map((m) => m.name));
    const extra = [...schemaKeys].filter((k) => !memberNames.has(k));
    expect(extra, `the schema declares no key the interface does not (extras: ${extra.join(", ")})`).toEqual([]);
    // and the pair is REAL: stating an optional member resolves
    // a value per DECLARED type — the point is to state the member,
    // so the shape has to be the one the interface promises
    const valueFor = (type: string): unknown => {
      // `string[]` and `Array<string>` are arrays OF strings, not strings
      if (/^(string\[\]|Array<string>)/.test(type)) return ["x"];
      if (type.startsWith("string")) return "x";
      if (type.startsWith("boolean")) return true;
      if (type.startsWith("number")) return 1;
      if (type.startsWith("Record")) return {};
      if (type.startsWith("Array")) return [];
      return null; // a row-typed optional: null is the row's own absent form
    };
    const probe: Record<string, unknown> = { id: "d", genre: "image", label: "L", variants: [] };
    for (const m of members) {
      if (!m.optional) continue;
      probe[m.name] = valueFor(m.type);
    }
    try {
      (SCHEMA as unknown as { resolve(r: unknown, s: never, c: object, strict: boolean): unknown })
        .resolve(probe, contractNs["ModelDecl"] as never, {}, true);
    } catch (e) {
      expect.unreachable(`a ModelDecl row carrying EVERY interface member must resolve — a member the ` +
        `schema does not know is silently dropped at registration: ${String((e as Error).message).slice(0, 160)}`);
    }
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

  it("RULE 8b · the schema minima are REAL, and they are judged BOTH ways (the schema auditor, 2026-09-28)", () => {
    // The auditor's finding: `assertSchemaAcceptsMinimalRows` proves
    // every schema ACCEPTS its minimal row, so a LOOSENED minimum
    // (TogetherRow `.min(2)` → nothing) stayed green — the law was
    // one-directional. And `.min()` on a NESTED array is not enforced
    // by schemastery at all, which is why either_or's two-alternative
    // floor now lives in the judge.
    //
    // This arm drives the SCHEMAS with below-minimum rows and
    // requires a REFUSAL for each — the other direction.
    const contract = contractNs as unknown as Record<string, unknown>;
    const resolve = (schema: unknown, row: unknown): string => {
      try {
        (Schema as unknown as { resolve(r: unknown, s: never, c: object, strict: boolean): unknown })
          .resolve(row, schema as never, {}, true);
        return "accepted";
      } catch {
        return "refused";
      }
    };
    const belowMinimum: Array<[string, unknown, unknown]> = [
      ["ParamRequiresRow (needs min 1)", contract["ParamRequiresRow"], { field: "f", needs: [] }],
      ["ParamTogetherRow (fields min 2)", contract["ParamTogetherRow"], { fields: ["a"] }],
      ["ParamAtMostOneRow (fields min 2)", contract["ParamAtMostOneRow"], { fields: ["a"] }],
      ["ParamRequiredRow (fields min 1)", contract["ParamRequiredRow"], { fields: [] }],
    ];
    const slack: string[] = [];
    for (const [name, schema, row] of belowMinimum) {
      if (schema === undefined) { slack.push(name + " (no such export)"); continue }
      if (resolve(schema, row) !== "refused") slack.push(name);
    }
    expect(slack, `every declared minimum is ENFORCED (these accepted a below-minimum row: ${slack.join(", ")})`).toEqual([]);
  });

  it("RULE 7c · the engine-truth triple is spelled ONCE (the schema auditor, 2026-09-28)", () => {
    // The auditor demonstrated the hole: adding a second literal
    // `["mode","variant","model"]` beside the SSOT left every wall
    // green. ENGINE_TRUTH is now pinned the way the stage-patch list
    // is — one owner, and no module may re-spell the triple.
    const offenders: string[] = [];
    // The carve is the owner's own DECLARATION LINE, not its whole
    // file: a first cut skipped validate.ts entirely, and a duplicate
    // triple written in the next line of the very file that owns the
    // SSOT sailed through. The owner keeps its one declaration; every
    // other line of every file is judged.
    const OWNER_DECL = /export const ENGINE_TRUTH[^\n]*/g;
    for (const f of SOURCES) {
      const code = codeOf(read(f)).replace(OWNER_DECL, "");
      // any array literal naming two of the three engine-truth words
      // beside each other is a second spelling
      const hits = [...code.matchAll(/\[\s*"([a-z_]+)"\s*,\s*"([a-z_]+)"[^\]]*\]/g)]
        .filter((m) => ENGINE_TRUTH.includes(m[1]!) && ENGINE_TRUTH.includes(m[2]!));
      if (hits.length > 0) {
        offenders.push(f + " — the engine-truth triple is validate.ts's ENGINE_TRUTH; import it");
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
      // A-L21 (the wall audit, 2026-09-28): the ban named ONE
      // class spelling — a `declare global` StageRow or a class
      // StageRow walked past the interface/type scan. The law is by
      // NAME across every declaration form.
      const decls = [...code.matchAll(/(?:export\s+)?(?:interface|type|class|declare\s+global\s*\{[^}]*\b)(\s*)StageRow\b/g)];
      if (decls.length > 0) {
        offenders.push(f + " — declares a bare StageRow (FlowStageRow or RunStageRow)");
      }
      // and the qualified names are the FOUR concepts — a fifth
      // spelling must name itself in the carve below, not sail past
      // the FIVE named concepts: the four estate rows plus the
      // engine contract's own EngineStageRow (the row an engine
      // receives — a different concept that must not be renamed into
      // one of the estate four)
      const qualified = new Set(["FlowStageRow", "RunStageRow", "BenchStageRow", "BenchStageView", "EngineStageRow", "StageOutcomeRow"]);
      // TYPE POSITIONS only: a helper FUNCTION named buildStageRow
      // is not a stage-row concept (the ban is about the TYPE names
      // an import can confuse).
      // ... and only in the PLAIN-TS modules: a .tsx file's
      // `<MotionStageView ...>` is a React COMPONENT, not a
      // stage-row type (the estate's row types live in .ts).
      if (!f.endsWith(".tsx")) for (const m of code.matchAll(/(?:[:<]|\bas\s+|\bextends\s+|\bimplements\s+)\b(\w*Stage(?:Row|View))\b/g)) {
        if (!qualified.has(m[1]!)) {
          offenders.push(f + " — '" + m[1]! + "' is not one of the four stage-row concepts; a new name is a carve, not a spelling");
          break;
        }
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
