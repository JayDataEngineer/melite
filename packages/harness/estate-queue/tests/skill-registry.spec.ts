// skill-registry.spec.ts — the skills seat: the index serves the
// repo, reads return docs / throw the door's voice, aborts refuse.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, afterEach } from "vitest";

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { SkillDirectoryService, skillProvider } from "../src/skillRegistry.ts";

let state = "";
const tmpDirs: string[] = [];
afterEach(() => {
  if (state !== "") {
    rmSync(state, { recursive: true, force: true });
    state = "";
  }
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
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
// BENCH only — seed a bench doc in the WRITER's tree (audit 004/C1:
// <repoRoot>/data/runs/storage/drafts/docs — the one root, never
// the DSH home) to see vocabulary. The seeded doc is transient-live
// (mtime now) and removed by the restore fn — the same window the
// DSH-home seeding era carried.
function seedBench(stages: Array<{ card?: string; model?: string }>): () => void {
  const docsDir = join(resolveRepoRoot(), "data", "runs", "storage", "drafts", "docs");
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(
    join(docsDir, "bench-session-test.json"),
    JSON.stringify({ record: { doc: { stages: stages.map((x) => ({ card: x.card ?? null, params: x.model ? { model: x.model } : {} })) } } }),
  );
  return () => {
    rmSync(join(docsDir, "bench-session-test.json"), { force: true });
  };
}

describe("SkillDirectoryService", () => {
  it("serves the SELECTION — an empty bench lists nothing; a benched card serves", () => {
    // THE SELECTION LAW (operator 2026-09-21): the catalog IS the
    // selection. Empty bench → zero rows (melite_discover is the
    // paid door); a benched card serves exactly its binding line.
    // EMPTY-BENCH LAW (C1's shape): a temp MELITE_REPO_ROOT pins the
    // reader's whole tree away — no engines, no writer docs, zero
    // rows by construction (the old DSH-home env pin died with the
    // seam: the reader no longer looks there at all). The seeded
    // phase returns to the real repo root and seeds the WRITER's
    // tree — one root for writer and reader.
    const savedRepo = process.env["MELITE_REPO_ROOT"];
    const emptyRepo = mkdtempSync(join(tmpdir(), "skill-registry-empty-"));
    tmpDirs.push(emptyRepo);
    process.env["MELITE_REPO_ROOT"] = emptyRepo;
    try {
      const empty = seat().index() as { count: number; families: unknown[]; cards: unknown[]; flows: { count: number; ids: string[] } };
      assert.equal((empty as { skills?: unknown }).skills, undefined);
      assert.equal(empty.count, 0, "an empty bench lists nothing");
      assert.deepEqual(empty.cards, []);
    } finally {
      if (savedRepo === undefined) delete process.env["MELITE_REPO_ROOT"];
      else process.env["MELITE_REPO_ROOT"] = savedRepo;
    }
    const restore = seedBench([{ card: "image-gen", model: "krea-2" }]);
    try {
      const idx = seat().index() as { count: number; families: Array<{ id: string }>; cards: Array<{ id: string }> };
      assert.ok(idx.cards.some((c) => c.id === "image-gen"), "the benched card serves");
      assert.ok(idx.families.some((f) => f.id === "krea-2"), " the benched family serves");
      assert.ok(!idx.cards.some((c) => c.id === "image-edit"), "unbenched cards never ride");
    } finally {
      restore();
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
