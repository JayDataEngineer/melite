// THE AGENT-DOCS WALL (2026-09-22): the served agent face must teach
// the LIVE laws — the dialogue-tag recipe (audio_clips + text), the
// automatic 22-frame seam — and must never resurrect the retired
// spellings (per-call `audio`, `audio_stem`, `seam_carry`) that a
// fresh agent would follow into dead params. The operator caught the
// gap: mechanics live in the card, craft must live where agents load
// it (AGENT.md, the skills, the served params spec).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "src");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf-8");

// the retired law, banned from every agent-facing doc
const RETIRED: Array<[string, RegExp]> = [
  ["per-call audio", /"audio"\s*:|\bcall'?s? `audio`|per-call `audio`/],
  ["audio_stem", /audio_stem/],
  ["seam_carry", /seam_carry/],
  ["retired step spelling", /\bsampler_steps\b|\bsampling_steps\b/],
];

describe("THE AGENT-DOCS WALL (the live law, where agents load it)", () => {
  it("AGENT.md carries the dialogue law: audio_clips rows with exact text, one lane per window, cross-seam continuation, the duck", () => {
    const md = read("agents/AGENT.md");
    expect(md).toMatch(/audio_clips/);
    expect(md).toMatch(/"text":\s*"I told you I would finish it before dawn\."/);
    expect(md).toMatch(/THE WORDS MOVE THE MOUTH/);
    expect(md).toMatch(/One lane per CLASS per window/);
    expect(md).toMatch(/CONTINUES the same line across both/);
    expect(md).toMatch(/DUCKS -14dB/);
    expect(md).toMatch(/two or more calls/);
  });

  it("the directing skill teaches clip rows + text, never the retired per-call law", () => {
    const md = read("agents/skills/directing/SKILL.md");
    expect(md).toMatch(/audio_clips/);
    expect(md).toMatch(/MUST carry the exact spoken words/);
    expect(md).toMatch(/NEVER a call field/);
    for (const [name, re] of RETIRED) expect(md, `retired ${name}`).not.toMatch(re);
  });

  it("the video-timeline skill teaches the D-M-E clip rows + the automatic seam, and that the bed is GONE, never the retired spellings", () => {
    const md = read("agents/skills/video-timeline/SKILL.md");
    expect(md).toMatch(/THE BED IS GONE/);
    expect(md).toMatch(/params\.audio_clips/);
    expect(md).toMatch(/22-frame overlap/);
    expect(md).toMatch(/transition:\s*"cut"/);
    for (const [name, re] of RETIRED) expect(md, `retired ${name}`).not.toMatch(re);
  });

  it("AGENT.md teaches the automatic seam, never the retired spellings", () => {
    const md = read("agents/AGENT.md");
    expect(md).toMatch(/22-frame/);
    for (const [name, re] of RETIRED) expect(md, `retired ${name}`).not.toMatch(re);
  });

  it("the served params spec (tool.ts) exposes audio_clips with the text obligation — agents can SEE the field", () => {
    // source-text wall: the builder's parameters block is the served
    // spec an agent reads via melite_load; the text obligation and
    // the no-per-call-audio law must ride it verbatim
    const src = read("../src/tool.ts");
    expect(src).toMatch(/audio_clips:\s*\{/);
    expect(src).toMatch(/text = THE SPOKEN WORDS/);
    expect(src).toMatch(/lip-sync law/);
    expect(src).toMatch(/There is NO per-call audio/);
  });
});
