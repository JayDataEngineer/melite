// THE AGENT-LOOKS-PARITY WALL (the skills-vs-dsh-autodocs audit,
// 2026-11-12): the image-gen AGENT.md's look list is AUTHORED prose
// about a code-owned roster (BOARDED) — the audit found it teaching
// "Four looks are boarded" while the card boarded and served SIX
// (flux-klein and moss-image invisible to every agent that read the
// entrance). Until the AGENT.md shrink-to-pointer lands (the
// teachable set riding the served face), this wall pins the authored
// list to the code roster in BOTH directions: every boarded family
// appears, every named look is boarded. No @contract marker:
// package-local law, prose header.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BOARDED } from "../src/card.ts";

const AGENT_MD = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "agents", "AGENT.md");

describe("the AGENT.md look list vs the boarded roster", () => {
  it("every boarded family appears in the entrance's look list, and every named look is boarded", () => {
    const md = readFileSync(AGENT_MD, "utf8");
    // the look list's bullet rows: "- **family** — …"
    const named = [...md.matchAll(/^- \*\*([a-z0-9-]+)\*\* —/gm)].map((m) => m[1]);
    assert.ok(named.length >= 6, `the look list rides (${named.length} rows; a collapsed parse must not green silently)`);
    for (const family of BOARDED) {
      assert.ok(named.includes(family), `boarded family ${family} must appear in the AGENT.md look list (an invisible look is unservable by prose)`);
    }
    for (const look of named) {
      assert.ok((BOARDED as readonly string[]).includes(look), `named look ${look} is not boarded — the list must not teach a dead family`);
    }
  });

  it("the roster count sentence matches the roster (no stale 'Four looks' class)", () => {
    const md = readFileSync(AGENT_MD, "utf8");
    const m = md.match(/(\w+) looks are boarded/);
    assert.ok(m, "the entrance states how many looks are boarded");
    const words: Record<string, number> = { Six: 6, six: 6, Five: 5, five: 5, Four: 4, four: 4, Seven: 7, seven: 7, Eight: 8, eight: 8, Nine: 9, nine: 9, Ten: 10, ten: 10 };
    assert.equal(words[m[1]], BOARDED.length, `the sentence says ${m[1]} but the card boards ${BOARDED.length}`);
  });
});
