// THE AGENT-DOCS WALL (2026-09-22): the served agent face must teach
// the LIVE laws — the dialogue-tag recipe (audio_clips + text), the
// automatic 22-frame seam — and must never resurrect the retired
// spellings (per-call `audio`, `audio_stem`, `seam_carry`) that a
// fresh agent would follow into dead params. The operator caught the
// gap: mechanics live in the card, craft must live where agents load
// it (AGENT.md, the skills, the served params spec).
import { readdirSync, readFileSync } from "node:fs";
import { join, sep} from "node:path";
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

  it("the swap skill teaches the bag container, the mask convention, and the confirm lane clause (friction-report #2/#3/#5)", () => {
    const md = read("agents/skills/swap/SKILL.md");
    // #2: the entry rides params.replace as an array on every door —
    // never flat (the flat spelling refuses as unknown param(s)).
    expect(md).toMatch(/params\.replace = \[entry\]/);
    expect(md).toMatch(/never flat/);
    // #3: the mask seat takes one union image, never the folder —
    // and there is no mask_sequence seat to guess at.
    expect(md).toMatch(/UNION/);
    expect(md).toMatch(/never its staged/);
    expect(md).toMatch(/no `mask_sequence` seat/);
    // #5: the confirm wait is chat-lane law — a headless commission
    // states values in the run record and executes, never stalls.
    expect(md).toMatch(/THE LANE CLAUSE/);
    expect(md).toMatch(/brief IS the confirmation/);
  });

  it("AGENT.md teaches the lane test (friction-report #5, recured by the 2026-11-09 docs audit: the deliverable starts at the user's Run press, the draft at construct)", () => {
    const md = read("agents/AGENT.md");
    expect(md).toMatch(/THE LANE TEST/);
    // the run-press law: the agent composes, the user presses Run —
    // the execute arm is maker-lane law, never taught to this reader
    expect(md).toMatch(/user'?s Run press/i);
    expect(md).not.toMatch(/DELIVERABLE\? Execute/);
    // naming the flow tool to refuse it is law; teaching its use is not
    const taught = md.split("\n").filter((l) => /\bmelite_flow\b/.test(l) && !/not in your tools|do not hunt|never yours/i.test(l));
    expect(taught).toEqual([]);
  });

  it("the reshoot skill teaches the mod-bag door, the not-a-regen boundary, and the mutual refusal", () => {
    const md = read("agents/skills/reshoot/SKILL.md");
    // the door's shape: the fourth mod bag on the film, never flat —
    // and never confused with a fresh regen (a moved camera, not a
    // re-roll).
    expect(md).toMatch(/params\.reshoot = \[entry\]/);
    expect(md).toMatch(/never flat/);
    expect(md).toMatch(/NOT.*fresh regen/i);
    expect(md).toMatch(/NOT.*identity pass/i);
    // one door per doc: armed replace + armed reshoot refuses loud.
    expect(md).toMatch(/One door per doc/);
    // the armed-missing-clip law: loud refusal naming the seat,
    // never a silent disarm.
    expect(md).toMatch(/refuses LOUD naming the seat/);
    // the identity camera: untouched knobs re-render the same view.
    expect(md).toMatch(/identity camera/);
    // no machine-specific ports or service names anywhere in the
    // doc (the maker runbook pointer left with the melite_flow clause
    // at the 2026-11-09 docs audit — maker-lane law is not served copy)
    expect(md).not.toMatch(/3088|33081|systemctl|127\.0\.0\.1|localhost/);
  });
  it("no agent-facing doc routes to the exterminated viggle-animate family — the subject door is this card's own swap skill", () => {
    // THE EXTERMINATED ROUTE (operator: "We EXTERMINATED the viggle
    // route"): cinemadir used to hand subject asks to the dead
    // `openjutsu` swap flow, and nothing judged the doc tree for it.
    // The roster is DERIVED (a walk of every agent doc), so a new
    // skill cannot resurrect the route unseen; the live door is the
    // h3-timeline `swap` skill's own replace bag.
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
    const docs = walk(join(ROOT, "agents"));
    expect(docs.length).toBeGreaterThan(5);
    expect(docs.some((f) => f.split(sep).join("/").endsWith("skills/cinemadir/SKILL.md")), "the walk reaches the skill bodies").toBe(true);
    for (const f of docs) {
      expect(readFileSync(f, "utf-8"), `dead viggle route in ${f}`)
        .not.toMatch(/openjutsu|viggle/i);
    }
  });
  it("ARM 4 — the served source-less law EQUALS the filmMix throw (derived from the engine source, never a hand copy)", () => {
    // THE DEPTH LAW: the doc's refusal quote rides the REAL door —
    // the message is extracted from filmMix.ts's own positioned-row
    // throw, so a reworded throw or an unquoted doc reds here. A
    // hand-copied literal would pass while the engine's law drifted.
    const mixSrc = readFileSync(
      join(__dirname, "..", "..", "..", "models", "h3", "src", "filmMix.ts"),
      "utf-8",
    );
    const thrown = /throw new Error\(\s*'audio_clips:\s*(a positioned clip row[^']*)'\s*\)/.exec(mixSrc);
    expect(thrown, "filmMix.ts still throws the positioned source-less row law").not.toBeNull();
    const lawCore = thrown![1]!.replace(/\s+/g, " ");
    // the DERIVED served roster (the same walk the viggle arm rides):
    // every agent doc the card ships, judged for the verbatim law —
    // wording, not wrapping (markdown reflow is not drift).
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
    const docs = walk(join(ROOT, "agents")).filter((f) => f.endsWith(".md"));
    expect(docs.length).toBeGreaterThan(5);
    const carriers = docs.filter((f) => readFileSync(f, "utf-8").replace(/\s+/g, " ").includes(lawCore));
    expect(
      carriers.length,
      `no served agent doc quotes the filmMix source-less law verbatim ("${lawCore}") — the served teaching drifted from the engine's own throw`,
    ).toBeGreaterThan(0);
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
