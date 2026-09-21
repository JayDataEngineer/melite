// skill-registry.spec.ts — the skills seat: the index serves the
// repo, reads return docs / throw the door's voice, aborts refuse.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { SkillDirectoryService, skillProvider } from "../src/skillRegistry.ts";

let state = "";
afterEach(() => {
  if (state !== "") {
    rmSync(state, { recursive: true, force: true });
    state = "";
  }
});

const seat = (): SkillDirectoryService => {
  state = mkdtempSync(join(tmpdir(), "skills-seat-"));
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = { stateRoot: state };
  skillProvider.apply(ctx);
  const svc = (ctx as unknown as { meliteSkills: SkillDirectoryService }).meliteSkills;
  assert.ok(svc instanceof SkillDirectoryService);
  return svc;
};

describe("SkillDirectoryService", () => {
  it("indexes the repo (the binding vocabulary — never skill rows)", () => {
    const idx = seat().index() as { count: number; families: Array<{ id: string }>; cards: Array<{ id: string }>; flows: { count: number; ids: string[] } };
    // THE NO-DUMP LAW: the index serves the vocabulary only; a skill
    // id is learned from its owning surface (melite_load), never here.
    assert.equal((idx as { skills?: unknown }).skills, undefined);
    assert.ok(idx.count > 11);
    assert.ok(idx.families.length > 5, "the family vocabulary serves");
    assert.ok(idx.cards.length > 5, "the card vocabulary serves");
    assert.ok(idx.flows.ids.includes("flow:audio-native-tts"), "flow ids ride the vocabulary");
  });

  it("reads serve docs; unknowns throw the door's voice", async () => {
    const svc = seat();
    const doc = svc.read("flow:audio-native-tts", new AbortController().signal) as {
      id: string;
      content: string;
    };
    assert.equal(doc.id, "flow:audio-native-tts");
    assert.ok(doc.content.length > 0);
    assert.throws(() => svc.read("ghost", new AbortController().signal), /no such skill: \"ghost\"/);
  });

  it("aborted signals throw before the plane", () => {
    const svc = seat();
    const ctrl = new AbortController();
    ctrl.abort();
    assert.throws(() => svc.read("flow:audio-native-tts", ctrl.signal));
  });
});
