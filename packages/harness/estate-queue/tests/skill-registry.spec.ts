// skill-registry.spec.ts — the skills seat: the index serves the
// repo, reads return docs / throw the door's voice, aborts refuse.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, afterEach } from "vitest";

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
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
// BENCH only. seedBench writes the WRITER's tree — the seat's OWN
// queue.stateRoot storage (<stateRoot>/storage/drafts/docs, the
// derivation melite-estate index.ts:676 hands the drafts row; audit
// 2026-10-31 §8.3: the reader that globbed the repo tree served a
// root no producer writes) — and returns a remove fn. The boot
// cutoff makes the fresh doc live for exactly this read.
function seedBench(stages: Array<{ card?: string; model?: string }>): () => void {
  const docsDir = join(state, "storage", "drafts", "docs");
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
    // EMPTY-BENCH LAW: a temp MELITE_REPO_ROOT pins the walks' tree
    // away — no engines, no families, zero rows by construction —
    // and the seat's own writer tree (the state root's storage) is
    // empty too. The old DSH-home env pin died with the seam.
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
    // THE BENCHED SELECTION rides the seat's OWN writer tree (one
    // seat created once; seedBench targets ITS state root): the
    // walks read the real repo (image-gen/krea-2 live there) and the
    // writer tree carries the picks.
    const svc = seat();
    const restore = seedBench([{ card: "image-gen", model: "krea-2" }]);
    try {
      const idx = svc.index() as { count: number; families: Array<{ id: string }>; cards: Array<{ id: string }> };
      assert.ok(idx.cards.some((c) => c.id === "image-gen"), "the benched card serves");
      assert.ok(idx.families.some((f) => f.id === "krea-2"), " the benched family serves");
      assert.ok(!idx.cards.some((c) => c.id === "image-edit"), "unbenched cards never ride");
    } finally {
      restore();
    }
  });

  it("the selection rides the WRITER's root, never the repo tree (the §8.3 orphan cure)", () => {
    // THE ORPHAN (audit 2026-10-31 §8.3): the index reader globbed
    // <repo>/data/runs/storage — a root the live writer (the drafts
    // store at <queue.stateRoot>/storage) never writes on a
    // stateRoot-pinned or cold-profile lane: the seat served an
    // EMPTY selection in production. The cure threads the seat's own
    // state root through; this wall rides the real seat and reds
    // when the pass-through is toggled out (the reader falls back to
    // the repo tree and the seeded writer doc goes invisible).
    // Hermetic: a temp MELITE_REPO_ROOT pins the walks to a minimal
    // estate, so neither arm reads the real repo's tree.
    const repo = mkdtempSync(join(tmpdir(), "skill-registry-walks-"));
    tmpDirs.push(repo);
    const w = (rel: string, text: string): void => {
      const f = join(repo, rel);
      mkdirSync(join(f, ".."), { recursive: true });
      writeFileSync(f, text);
    };
    w("packages/engines/eng-a/package.json", "{}");
    w("packages/engines/eng-a/models/g1/m1/agents/AGENT.md", "# Agent One\n");
    w("packages/engines/eng-a/src/cards/g2/c1/AGENT.md", "# Card One\n");
    const savedRepo = process.env["MELITE_REPO_ROOT"];
    process.env["MELITE_REPO_ROOT"] = repo;
    try {
      const svc = seat();
      const restore = seedBench([{ card: "c1", model: "m1" }]);
      try {
        const idx = svc.index() as { count: number; families: Array<{ id: string }>; cards: Array<{ id: string }> };
        assert.ok(idx.cards.some((c) => c.id === "c1"), "the benched card serves from the writer's tree");
        assert.ok(idx.families.some((f) => f.id === "m1"), "the benched family serves from the writer's tree");
      } finally {
        restore();
      }
    } finally {
      if (savedRepo === undefined) delete process.env["MELITE_REPO_ROOT"];
      else process.env["MELITE_REPO_ROOT"] = savedRepo;
    }
  });

  it("reads serve docs; unknowns throw the door's voice", async () => {
    const svc = seat();
    const doc = svc.read("flow:image-upscale", new AbortController().signal) as {
      id: string;
      content: string;
    };
    assert.equal(doc.id, "flow:image-upscale");
    assert.ok(doc.content.length > 0);
    assert.throws(() => svc.read("ghost", new AbortController().signal), /no such skill: \"ghost\"/);
  });

  it("aborted signals throw before the plane", () => {
    const svc = seat();
    const ctrl = new AbortController();
    ctrl.abort();
    assert.throws(() => svc.read("flow:image-upscale", ctrl.signal));
  });

  it("write lands the doc under the state root and serves it back with its id", () => {
    // THE WRITE SUCCESS (the seat's 200 arm): a fully-stated draft
    // lands <stateRoot>/skills/<family>/<stem>/SKILL.md and answers
    // the read id — written and read are one law.
    const svc = seat();
    const answer = svc.write({
      model: "krea-2",
      name: "seat-success-probe",
      description: "A landed skill from the seat's own door",
      trigger_words: ["first trigger", "second trigger"],
      examples: ["example one"],
      body: "Strength 0.9 reads strong.",
      lora: "",
      replace: false,
    }) as { id: string; path: string; replaced: boolean };
    assert.equal(answer.id, "model:krea-2:seat-success-probe");
    assert.equal(answer.replaced, false);
    assert.ok(existsSync(answer.path), "the doc exists on disk after the write");
    const doc = svc.read("model:krea-2:seat-success-probe", new AbortController().signal) as {
      id: string;
      content: string;
    };
    assert.equal(doc.id, "model:krea-2:seat-success-probe");
    assert.ok(doc.content.includes("first trigger"), "the read door serves the written triggers");
    assert.ok(doc.content.includes("example one"), "the read door serves the written example");
  });

  it("write refuses a draft that names nothing to seat (the caller's 400, verbatim voice)", () => {
    // THE WRITE REFUSAL (the seat's non-200 arm): a missing name is
    // the caller's to fix — the writer's verbatim voice rides the
    // melite/skill-refused class, never a transport 502.
    const svc = seat();
    assert.throws(
      () => svc.write({ model: "krea-2" }),
      /skill write refusal: name: Field required/,
    );
    assert.throws(
      () => svc.write({ model: "" }),
      /skill write refusal: model: Field required/,
    );
  });

  it("write drops non-string list entries and empty trims, and refuses non-string scalars", () => {
    // THE WIRE LIST LAW (an example the caller did not state is
    // never invented): a non-array trigger_words reads as unstated,
    // non-string/blank examples never render, the stated one does.
    const svc = seat();
    const answer = svc.write({
      model: "krea-2",
      name: "seat-wire-probe",
      description: "Wire list edges",
      trigger_words: "notalist",
      examples: [42, "  ", "", "real example"],
      body: "",
      lora: "",
      replace: false,
    }) as { id: string; path: string };
    assert.equal(answer.id, "model:krea-2:seat-wire-probe");
    const text = readFileSync(answer.path, "utf8");
    assert.ok(text.includes("real example"), "the stated example renders");
    assert.ok(!text.includes("42"), "a non-string entry is dropped, never stringified");
    assert.ok(text.includes("None stated yet"), "a non-array trigger_words reads as the explicit blank");
    // THE WIRE SCALAR LAW: a non-string model is "" for the writer —
    // the refusal names the missing field, never a TypeError.
    assert.throws(
      () => svc.write({ model: 7, name: "x", description: "d" }),
      /skill write refusal: model: Field required/,
    );
  });

  it("write on a non-object body refuses (the draft defaults to empty, never crashes)", () => {
    // THE PARSE DEFAULT (a body that is not an object states
    // nothing): every required field misses and the writer refuses
    // the empty draft with its own voice.
    const svc = seat();
    assert.throws(() => svc.write(null), /skill write refusal: model: Field required/);
    assert.throws(() => svc.write("krea-2"), /skill write refusal: model: Field required/);
  });
});
