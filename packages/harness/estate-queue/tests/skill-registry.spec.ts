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
  it("indexes the repo", () => {
    const idx = seat().index() as { count: number; skills: Array<{ id: string }> };
    assert.equal(idx.count, idx.skills.length);
    assert.ok(idx.count > 11);
    assert.ok(idx.skills.some((s) => s.id === "flow:audio-native-tts"));
  });

  it("reads serve docs; unknowns throw the door's voice", async () => {
    const svc = seat();
    const doc = svc.read("flow:audio-native-tts", new AbortController().signal) as {
      id: string;
      content: string;
    };
    assert.equal(doc.id, "flow:audio-native-tts");
    assert.ok(doc.content.length > 0);
    assert.throws(() => svc.read("ghost", new AbortController().signal), /no such skill: 'ghost'/);
  });

  it("aborted signals throw before the plane", () => {
    const svc = seat();
    const ctrl = new AbortController();
    ctrl.abort();
    assert.throws(() => svc.read("flow:audio-native-tts", ctrl.signal));
  });
});
