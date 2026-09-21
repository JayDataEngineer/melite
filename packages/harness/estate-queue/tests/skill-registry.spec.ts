// skill-registry.spec.ts — the skills seat: the index serves the
// repo, reads return docs / throw the door's voice, aborts refuse.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
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


// THE SELECTION LAW (2026-09-21): the seat's index serves the LIVE
// BENCH only — seed a bench doc (DSH_HOME tmp) to see vocabulary.
function seedBench(stages: Array<{ card?: string; model?: string }>): () => void {
  const home = mkdtempSync(join(tmpdir(), "bench-home-"));
  mkdirSync(join(home, "storages", "drafts", "docs"), { recursive: true });
  writeFileSync(
    join(home, "storages", "drafts", "docs", "bench-session-test.json"),
    JSON.stringify({ record: { doc: { stages: stages.map((x) => ({ card: x.card ?? null, params: x.model ? { model: x.model } : {} })) } } }),
  );
  const prev = process.env["DSH_HOME"];
  process.env["DSH_HOME"] = home;
  return () => {
    if (prev === undefined) delete process.env["DSH_HOME"];
    else process.env["DSH_HOME"] = prev;
  };
}

describe("SkillDirectoryService", () => {
  it("serves the SELECTION — an empty bench lists nothing; a benched card serves", () => {
    // THE SELECTION LAW (operator 2026-09-21): the catalog IS the
    // selection. Empty bench → zero rows (melite_discover is the
    // paid door); a benched card serves exactly its binding line.
    // ENV-PIN LAW (2026-10-08): "empty bench" means an empty PIN
    // home — unpinned, the seat reads the operator's REAL DSH_HOME
    // and this assert flaked the moment a GUI bench session landed
    // there. seedBench pins its own home for the seeded phase.
    const savedHome = process.env["DSH_HOME"];
    const emptyHome = mkdtempSync(join(tmpdir(), "skill-registry-empty-"));
    process.env["DSH_HOME"] = emptyHome;
    try {
    const empty = seat().index() as { count: number; families: unknown[]; cards: unknown[]; flows: { count: number; ids: string[] } };
    assert.equal((empty as { skills?: unknown }).skills, undefined);
    assert.equal(empty.count, 0, "an empty bench lists nothing");
    assert.deepEqual(empty.cards, []);
    const restore = seedBench([{ card: "image-gen", model: "krea-2" }]);
    try {
      const idx = seat().index() as { count: number; families: Array<{ id: string }>; cards: Array<{ id: string }> };
      assert.ok(idx.cards.some((c) => c.id === "image-gen"), "the benched card serves");
      assert.ok(idx.families.some((f) => f.id === "krea-2"), " the benched family serves");
      assert.ok(!idx.cards.some((c) => c.id === "image-edit"), "unbenched cards never ride");
    } finally {
      restore();
    }
    } finally {
      if (savedHome === undefined) delete process.env["DSH_HOME"];
      else process.env["DSH_HOME"] = savedHome;
    }
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
