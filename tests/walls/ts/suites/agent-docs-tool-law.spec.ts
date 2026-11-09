// agent-docs-tool-law.spec.ts — THE SERVED-DOCS TOOL-LAW WALL
// (2026-11-09, the operator's audit order: "NO HISTORY, JUST THE
// TOOLS AND HOW TO USE THEM" over every agents.md/skill the AI agent
// gets). The docs under packages/*/src/agents/** are SERVED to
// agents on the media lane — they teach seats, states, derivations,
// and refusals. Anything else in them is poison at serve time: a
// run-id the reader cannot open, a burn story narrated as law, a
// door that no longer exists, a frame field the door refuses.
//
// The bag-skill-coverage wall judges the six alias leaves' banner
// shape; THIS wall sweeps the WHOLE served tree (every *.md under
// every package's src/agents), derived — a new leaf or a new
// package joins the census by existing, never by a list edit:
//
//   1. NO HISTORY — no run-ids, no calendar dates, no stopgap
//      arc tags, no § cites, no burn narration. The tool law
//      states the present; how it came to be is dev_docs
//      archaeology, not served copy.
//   2. NO RETIRED DOORS — the bracket-door spellings
//      (replace[]/repair[]/extend[]/refine[]/upscale[]) and the
//      pre-collapse roster counts ("SEVEN armed mod bags",
//      "EIGHTH bag") teach a door set the compose door refuses.
//      The legacy names are preset CELLS of the ONE edit bag.
//   3. NO FRAME TYPING — the internal edit seats
//      (window_start/window_length/clip_seconds/overlap_frames/
//      segment_crf) appear only in sentences that DECLARE them
//      internal/never-served. A line teaching an agent to type or
//      cut one reds by file:line (the carry law's acceptance test:
//      does the agent type window_start? If yes, the interface
//      failed).
//   4. THE RUN PRESS — no served doc hands the agent the run:
//      `melite_flow` and "Execute" arms are maker-lane law, and
//      the root AGENT MODE contract ends at construct (runs start
//      at the user's Run press, never the agent's).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const isDir = (p: string): boolean => {
  try { return statSync(p).isDirectory(); } catch { return false; }
};

/** Every package's served agents tree, derived off packages/
 * (packages/<genre>/<pkg>/src/agents — the workspace nests by
 * genre, so the census walks two levels, never a list). */
const servedDocs = (): string[] => {
  const out: string[] = [];
  const pkgs = join(ROOT, "packages");
  for (const genre of readdirSync(pkgs)) {
    const genreDir = join(pkgs, genre);
    if (!isDir(genreDir)) continue;
    for (const pkg of readdirSync(genreDir)) {
      const agents = join(genreDir, pkg, "src", "agents");
      if (!isDir(agents)) continue;
      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir)) {
          const p = join(dir, entry);
          if (isDir(p)) { walk(p); continue; }
          if (p.endsWith(".md")) out.push(p);
        }
      };
      walk(agents);
    }
  }
  return out.sort();
};

const lineHits = (md: string, re: RegExp): number[] =>
  md.split("\n").flatMap((line, i) => (re.test(line) ? [i + 1] : []));

describe("THE SERVED-DOCS TOOL-LAW WALL (no history, just the tools and how to use them)", () => {
  const docs = servedDocs();
  assert.ok(docs.length >= 30, `the census sees the served tree (found ${docs.length} docs)`);

  it("ARM 1 — NO HISTORY: no run-id, calendar date, stopgap tag, § cite, or burn narration in any served doc", () => {
    const offenders: string[] = [];
    for (const doc of docs) {
      const md = readFileSync(doc, "utf-8");
      const marks: Array<[string, RegExp]> = [
        ["run-id", /run-[0-9a-f]{8,}/],
        ["calendar date", /\b(19|20)\d\d-\d\d-\d\d\b/],
        ["stopgap arc tag", /stopgap/],
        ["section cite", /§/],
        ["burn narration", /\bburn(ed|ing)?\b/i],
      ];
      for (const [name, re] of marks) {
        const lines = lineHits(md, re);
        if (lines.length > 0) {
          offenders.push(`${relative(ROOT, doc)}:${lines.join(",")} carries ${name} copy`);
        }
      }
    }
    assert.deepEqual(offenders, [], "served docs teach tools; history lives in dev_docs");
  });

  it("ARM 2 — NO RETIRED DOORS: no bracket-door spellings or pre-collapse roster counts in any served doc", () => {
    const offenders: string[] = [];
    for (const doc of docs) {
      const md = readFileSync(doc, "utf-8");
      const marks: Array<[string, RegExp]> = [
        ["bracket door", /\b(replace|repair|extend|refine|upscale)\s*\[\]/],
        ["seven-bag roster", /SEVEN armed mod bags|twenty-one pairs?/],
        ["eighth-bag roster", /EIGHTH bag/],
      ];
      for (const [name, re] of marks) {
        const lines = lineHits(md, re);
        if (lines.length > 0) {
          offenders.push(`${relative(ROOT, doc)}:${lines.join(",")} teaches a retired ${name}`);
        }
      }
    }
    assert.deepEqual(offenders, [], "the legacy names are preset cells of the ONE edit bag, never doors");
  });

  it("ARM 3 — NO FRAME TYPING: the internal edit seats appear only in sentences declaring them internal", () => {
    const INTERNAL_SEATS = [
      "window_start", "window_length", "clip_seconds", "overlap_frames", "segment_crf",
    ] as const;
    const offenders: string[] = [];
    for (const doc of docs) {
      const md = readFileSync(doc, "utf-8");
      const lines = md.split("\n");
      lines.forEach((line, i) => {
        for (const seat of INTERNAL_SEATS) {
          if (!line.includes(seat)) continue;
          // the declaration may ride the sentence's continuation
          // lines (markdown hard-wraps prose) — judge the ±2-line
          // window around the mention, never the bare line
          const window = lines.slice(Math.max(0, i - 2), i + 3).join("\n");
          const declares = /internal|never (type|served|typed)|not (a|the) (served|agent)/i.test(window);
          if (!declares) {
            offenders.push(`${relative(ROOT, doc)}:${i + 1} mentions ${seat} without the internal declaration`);
          }
        }
      });
    }
    assert.deepEqual(offenders, [], "an agent never types frame seats — the edit door derives its windows");
  });

  it("ARM 4 — THE RUN PRESS: no served doc hands the agent the run (no melite_flow, no Execute arm)", () => {
    const offenders: string[] = [];
    for (const doc of docs) {
      const md = readFileSync(doc, "utf-8");
      // the flow tool: naming it to REFUSE it is tool law (the root
      // contract's own spelling); teaching its use (maker-lane law)
      // hands the served agent a run door that is not his
      const refusal = /not in your tools|do not hunt|never yours|no `?melite_flow`?/i;
      const taught = md.split("\n")
        .map((line, i) => (/\bmelite_flow\b/.test(line) && !refusal.test(line)) ? i + 1 : 0)
        .filter((n) => n > 0);
      if (taught.length > 0) {
        offenders.push(`${relative(ROOT, doc)}:${taught.join(",")} teaches the flow tool's use`);
      }
      const marks: Array<[string, RegExp]> = [
        ["an execute arm", /DELIVERABLE\? *Execute/i],
        ["starts the run itself", /(starts?|rid(e|es)) the run (there |itself )?lawfully/i],
      ];
      for (const [name, re] of marks) {
        const lines = lineHits(md, re);
        if (lines.length > 0) {
          offenders.push(`${relative(ROOT, doc)}:${lines.join(",")} seats the agent at ${name}`);
        }
      }
    }
    assert.deepEqual(offenders, [], "the contract ends at construct — runs start at the user's Run press");
  });

  it("THE LAW FIRES (each arm reds on a planted violation, greening on its removal)", () => {
    // ARM 1: a run-id plant
    assert.deepEqual(lineHits("fixed in run-e79f3b304e4b last week", /run-[0-9a-f]{8,}/), [1]);
    assert.deepEqual(lineHits("plain tool law, no history", /run-[0-9a-f]{8,}/), []);
    // ARM 2: the bracket door and the roster counts
    assert.deepEqual(lineHits("route it to repair[] instead", /\b(replace|repair|extend|refine|upscale)\s*\[\]/), [1]);
    assert.deepEqual(lineHits("loras is the EIGHTH bag", /EIGHTH bag/), [1]);
    assert.deepEqual(lineHits("the preset cell named repair", /\b(replace|repair|extend|refine|upscale)\s*\[\]/), []);
    // ARM 3: the same seat name, declaring vs teaching
    const declares = "window_start is internal — admitted, never served";
    const teaches = "cut window_start to 56 to fit the window";
    assert.equal(/internal|never (type|served|typed)|not (a|the) (served|agent)/i.test(declares), true);
    assert.equal(/internal|never (type|served|typed)|not (a|the) (served|agent)/i.test(teaches), false);
    // ARM 4: the run door
    assert.deepEqual(lineHits("melite_flow starts the run there lawfully", /\bmelite_flow\b/), [1]);
    assert.deepEqual(lineHits("DELIVERABLE? Execute the flow", /DELIVERABLE\? *Execute/i), [1]);
    assert.deepEqual(lineHits("the user presses Run", /\bmelite_flow\b/), []);
  });
});
