// THE SERVED-GRID-TRUTH WALL (the skill-adherence audit's F5, the
// masked-edit unification 2026-11-12): every "Xs = Yf" grid literal
// the estate SERVES — the flow skill, the flow tool description, the
// registry row's published description, the card tooltip, and the
// family skill — is judged against the code that owns the law
// (isGridLength + solveWindowComposition), never a frozen literal.
// The burn this closes: the served corpus taught "3.83 = 92f" (off
// the 22+17k grid — 92−22 is not divisible by 17) and "cap 15.08 =
// 362f" (the cap the unification removed) across FIVE homes while
// every wall stayed green — the walls judged files-exist and
// rows-parse, never a sentence's numeric truth (a LAW-4 DEPTH gap:
// a wall judging a copy of the truth passes while the truth burns).
// No @contract marker: package-local law, prose header (the registry
// wall counts markers, not files).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isGridLength, GRID_MAX_FRAMES } from "../src/timelineContract.ts";
import { solveWindowComposition } from "../src/extend.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The served corpus: every surface an agent or operator reads that
 * states grid arithmetic. One fact, these homes — the wall keeps
 * them all honest against the one code home. */
const SERVED: readonly [string, string][] = [
  ["flow skill", join(ROOT, "flows", "extend-video", "SKILL.md")],
  ["flow tool", join(ROOT, "flows", "extend-video", "tool.json")],
  ["registry row", join(ROOT, "packages", "harness", "estate-queue", "src", "flowsRegistryRows.ts")],
  ["card tooltip", join(ROOT, "packages", "video", "h3-timeline", "src", "card.ts")],
  ["family skill", join(ROOT, "packages", "engines", "comfyui-cordis", "models", "video", "h3", "agents", "skills", "extend-flow", "SKILL.md")],
];

/** "2.33 = 56f", "15.08s = 362f", "19.333" … every seconds↔frames
 * pairing the corpus states. */
const PAIR = /(\d+(?:\.\d+)?)\s*(?:s\s*)?=\s*(\d+)f/g;

/** A stated total is legal if it is a single grid window, an exact
 * multi-window composition, or a neighbor the solver's own refusal
 * names in a "deliver Nf" clause (464/481 ride the 480f refusal;
 * the refusal's own "stated Xf" header never counts — every total
 * appears there, legal or not). */
const legalTotal = (frames: number): boolean => {
  if (isGridLength(frames)) return true
  try {
    solveWindowComposition(frames, "wall")
    return true
  } catch (e) {
    return String(e).includes(`deliver ${frames}f`)
  }
}

/** The solver refuses this total (no exact composition). */
const throwsFor = (frames: number): boolean => {
  try {
    solveWindowComposition(frames, "wall")
    return false
  } catch {
    return true
  }
}

describe("the served grid literals (every surface vs the code's own law)", () => {
  it("every seconds↔frames pairing on every served surface satisfies the grid or the solver", () => {
    assert.ok(SERVED.length >= 5, "the served corpus rides (a collapsed roster must not green silently)")
    let judged = 0
    for (const [home, path] of SERVED) {
      const text = readFileSync(path, "utf8")
      for (const m of text.matchAll(PAIR)) {
        const seconds = Number(m[1])
        const frames = Number(m[2])
        judged++
        // A total the solver refuses may ride ONLY inside a sentence
        // that says it refuses (the 480f teaching example); a
        // non-grid total in a landable list is the 92f lie class.
        const context = text.slice(m.index ?? 0, (m.index ?? 0) + 160)
        const legal =
          legalTotal(frames) ||
          (throwsFor(frames) && /refus/i.test(context))
        assert.ok(
          legal,
          `${home}: "${m[0]}" — ${frames}f is neither a 22+17k window in [22,${GRID_MAX_FRAMES}] nor an exact composition nor a stated refusal`,
        )
        if (isGridLength(frames) && frames <= GRID_MAX_FRAMES) {
          assert.ok(
            Math.abs(seconds - frames / 24) < 0.005,
            `${home}: "${m[0]}" — the seconds must round-trip frames/24 (${(frames / 24).toFixed(3)}s)`,
          )
        }
      }
    }
    assert.ok(judged >= 8, `the pairing census rides (judged ${judged}; a regex collapse must not green silently)`)
  })

  it("the two burned lie classes appear NOWHERE in the served corpus", () => {
    // The 92f lesson: 3.83 = 92f was served in five homes while off
    // the grid (an operator copying it hit a loud refusal); "cap
    // 15.08" taught a ceiling the unification removed. Both classes
    // stay dead by name.
    for (const [home, path] of SERVED) {
      const text = readFileSync(path, "utf8")
      assert.ok(!text.includes("3.83"), `${home}: the off-grid 3.83 = 92f example must not come back`)
      assert.ok(!/cap 15\.08/i.test(text), `${home}: 362f is the largest SINGLE window, never a cap — the multi-window door exists`)
    }
  })

  it("the named composition examples match the solver's live output", () => {
    // The served sentences name 379f (2×209−39) and 480f's neighbors
    // (464f, 481f) — judge those against the solver, not the prose.
    const c = solveWindowComposition(379, "wall")
    assert.equal(`${c.windows}×${c.windowFrames}−39`, "2×209−39", "the served 379f example is the solver's own answer")
    assert.throws(
      () => solveWindowComposition(480, "wall"),
      /464f.*481f|481f.*464f/s,
      "the served 480f refusal names exactly 464f and 481f",
    )
  })
})
