import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

/**
 * THE AUTHORED SKILL LAW (operator 2026-11-04: "we should also be
 * able to get the agent to write skills. For example, it would be
 * helpful that when we gave the lora to the model, that could also
 * make the skill with examples, trigger words" — and, correcting a
 * hand-authored doc: "we are NOT adding a lora + skill in right now.
 * We are making the MECHANIC, so anyone can do this on the fly").
 *
 * The mechanic, pinned here: the agent names a skill, states what a
 * human told it, and the doc LANDS — served by the same walk that
 * serves the tracked skill docs, readable at once through the real
 * read door. No per-lora blessing, no hand file, no instance in the
 * tree.
 *
 * The seams this pins:
 * - ONE SPELLING: the writer and the walk resolve one path —
 *   <stateRoot>/skills/<family>/<stem>/SKILL.md.
 * - THE ROUND TRIP: a written doc is served by the walk AND by
 *   hSkillRead (the real door melite_skill_read rides) with the id
 *   shape every door documents: model:<family>:<stem>.
 * - THE WORDS ARE THE OPERATOR'S: trigger words and examples render
 *   verbatim and in order; an unstated set renders as the explicit
 *   blank — never an invented trigger.
 * - THE REFUSALS FIRE: unseated family, unsafe leaf, and a silent
 *   replacement all refuse with the door's voice.
 * - THE SOURCE PLANE IS NEVER WRITTEN: an authored doc lands under
 *   the state root, never in the tracked models tree.
 * - THE WALK IS OPT-IN: without a state root the repo walk is exactly
 *   what it was (no authored rows appear from nowhere).
 */

const REPO = join(import.meta.dirname, "..", "..", "..", "..");

/** One real family (the walk finds it; a fabricated id would prove
 *  nothing about the seat check). */
const FAMILY = "krea-2";

function freshState(): string {
  return mkdtempSync(join(tmpdir(), "authored-skill-law-"));
}

describe("the authored skill law", () => {
  it("lands the doc at the one spelled path and serves it through the real read door", async () => {
    const { authoredSkillDoc } = await import(
      "../../../../packages/harness/estate-queue/src/skillAuthored.ts"
    );
    const { authoredRows } = await import(
      "../../../../packages/harness/estate-queue/src/skillRows.ts"
    );
    const { hSkillRead, hSkillWrite } = await import(
      "../../../../packages/harness/estate-queue/src/skillPlane.ts"
    );
    const stateRoot = freshState();
    try {
      // THE WRITE DOOR (melite_skill_write's own path: POST /v1/skills).
      const answerW = hSkillWrite(REPO, stateRoot, {
        model: FAMILY,
        name: "lora-hand-off",
        description: "How this family's dropped lora is run",
        trigger_words: ["shapstraction", "geometric abstraction"],
        examples: ["matte cream backdrop, stacked blocks"],
        body: "Strength 0.9 reads strong; the A/B receipt is the domain pair.",
        lora: "krea-2/Some_dropped_lora_v3.safetensors",
        replace: false,
      });
      assert.equal(answerW.status, 200);
      const written = answerW.payload as { id: string; path: string; replaced: boolean };
      // ONE SPELLING: the returned path is the path law, byte for byte.
      assert.equal(written.path, authoredSkillDoc(stateRoot, FAMILY, "lora-hand-off"));
      assert.equal(
        written.path,
        join(stateRoot, "skills", FAMILY, "lora-hand-off", "SKILL.md"),
        "the doc's path is the one law both ends spell",
      );
      assert.equal(written.id, "model:krea-2:lora-hand-off");
      assert.equal(written.replaced, false);
      assert.ok(existsSync(written.path), "the doc exists on disk after the write");

      // THE SOURCE PLANE IS NEVER WRITTEN at runtime.
      const tracked = join(
        REPO, "packages", "engines", "comfyui-cordis", "models", "image", FAMILY,
        "agents", "skills", "lora-hand-off",
      );
      expect(existsSync(tracked), "an authored skill never lands in the tracked models tree").toBe(false);

      // THE WALK serves it, with the documented id shape.
      const rows = authoredRows(stateRoot, FAMILY, "image");
      const row = rows.find((r) => r.row.id === "model:krea-2:lora-hand-off");
      expect(row, "the written doc is walked for its family").toBeDefined();
      expect(row!.row.name, "the frontmatter's name is the served name").toBe("lora-hand-off");
      expect(row!.row.description, "the frontmatter's description rides every load").toBe(
        "How this family's dropped lora is run",
      );
      expect(row!.row.model, "the row is scoped to the family it serves").toBe(FAMILY);

      // THE REAL DOOR: melite_skill_read's own path serves the body.
      const answer = hSkillRead(REPO, stateRoot, "model:krea-2:lora-hand-off");
      assert.equal(answer.status, 200);
      const payload = answer.payload as { name?: string; content?: string };
      assert.equal(payload.name, "lora-hand-off");
      assert.ok(payload.content!.includes("shapstraction"), "the read door serves the operator's trigger words");
      assert.ok(payload.content!.includes("matte cream backdrop"), "the read door serves the example verbatim");
      assert.ok(payload.content!.includes("Some_dropped_lora_v3"), "the doc names the mod row it documents");

      // THE LEDGER: the write is auditable exactly as the read is.
      const ledger = readFileSync(join(stateRoot, "output", "_ledger.jsonl"), "utf8");
      assert.ok(ledger.includes('"event":"skill.write"'), "the write ledgers skill.write");
      assert.ok(ledger.includes('"event":"skill.read"'), "the read ledgers skill.read");
    } finally {
      rmSync(stateRoot, { recursive: true, force: true });
    }
  });

  it("renders the operator's words verbatim, and the unstated set as the explicit blank", async () => {
    const { writeAuthoredSkill } = await import(
      "../../../../packages/harness/estate-queue/src/skillAuthored.ts"
    );
    const stateRoot = freshState();
    try {
      const stated = writeAuthoredSkill(REPO, stateRoot, {
        model: FAMILY,
        name: "with-words",
        description: "Stated triggers",
        trigger_words: ["first trigger", "second trigger"],
        examples: ["example one", "example two"],
        body: "",
        lora: "",
        replace: false,
      });
      const withWords = readFileSync(stated.path, "utf8");
      const firstAt = withWords.indexOf("first trigger");
      const secondAt = withWords.indexOf("second trigger");
      assert.ok(firstAt > -1 && secondAt > -1, "both trigger words render");
      assert.ok(firstAt < secondAt, "trigger words keep the operator's order");
      assert.ok(!withWords.includes("None stated yet"), "a stated set never carries the blank");

      const blank = writeAuthoredSkill(REPO, stateRoot, {
        model: FAMILY,
        name: "no-words",
        description: "Triggers not stated",
        trigger_words: [],
        examples: [],
        body: "",
        lora: "",
        replace: false,
      });
      const noWords = readFileSync(blank.path, "utf8");
      assert.ok(
        noWords.includes("None stated yet"),
        "an unstated trigger set records the blank instead of inventing words",
      );
    } finally {
      rmSync(stateRoot, { recursive: true, force: true });
    }
  });

  // ONE PREFIX (2026-11-04 live burn): a draft whose lora is stated
  // with its family — the spelling the tray row's filename carries —
  // rendered `krea-2/krea-2/<file>`, a path the engine does not have.
  it("renders the lora path once, however the caller states it", async () => {
    const { renderAuthoredSkill } = await import(
      "../../../../packages/harness/estate-queue/src/skillAuthored.ts"
    );
    const base = {
      model: FAMILY,
      name: "prefixed",
      description: "One path",
      trigger_words: [],
      examples: [],
      body: "",
      replace: false,
    };
    const bare = renderAuthoredSkill({ ...base, lora: "weights_v2.safetensors" });
    const prefixed = renderAuthoredSkill({ ...base, lora: "krea-2/weights_v2.safetensors" });
    assert.ok(bare.includes("- lora: `krea-2/weights_v2.safetensors`"), "the bare spelling is family-prefixed once");
    assert.equal(prefixed, bare, "the prefixed spelling renders the same doc, byte for byte");
    assert.ok(!prefixed.includes("krea-2/krea-2/"), "the family is never doubled");
  });

  // THE DISCOVERY LAW (2026-11-04 live gap): the write landed and the
  // id read back, but melite_load — the door an agent actually learns a
  // family's craft from — walked the TRACKED tree alone, so an authored
  // skill was invisible to discovery. The load seat now threads the
  // same state root; without it the walk stays the tracked tree alone.
  it("melite_load's skill lines disclose the authored skill (and only when the root rides)", async () => {
    const { skillLinesForFamilies } = await import(
      "../../../../packages/harness/estate-queue/src/loadPlane.ts"
    );
    const { writeAuthoredSkill } = await import(
      "../../../../packages/harness/estate-queue/src/skillAuthored.ts"
    );
    const stateRoot = freshState();
    try {
      writeAuthoredSkill(REPO, stateRoot, {
        model: FAMILY,
        name: "discovered-by-load",
        description: "Authored, then found by the load door",
        trigger_words: [],
        examples: [],
        body: "",
        lora: "",
        replace: false,
      });
      const ids = (rows: Array<Record<string, unknown>>): string[] =>
        rows.map((r) => String(r["id"]));
      const tracked = ids(skillLinesForFamilies(REPO, [FAMILY]));
      assert.ok(
        !tracked.includes("model:krea-2:discovered-by-load"),
        "without the root the walk is the tracked tree alone (no authored row appears from nowhere)",
      );
      const withRoot = ids(skillLinesForFamilies(REPO, [FAMILY], stateRoot));
      assert.ok(
        withRoot.includes("model:krea-2:discovered-by-load"),
        "the load door discloses the authored skill under the family that owns it",
      );
    } finally {
      rmSync(stateRoot, { recursive: true, force: true });
    }
  });

  // THE CLASS LAW (2026-11-04 live burn): the seat's refusal must
  // answer the CALLER's class — a plain Error rode the door's
  // catch-all 502, so "model: Field required" reached the operator as
  // "no seat on this lane serves POST /v1/skills" (a mounted seat
  // reported absent). The codes are the producing seat's own, and the
  // door's table maps them: refused → 400, unknown → 404.
  it("speaks the door's own failure class: a refused draft is 400, a missing doc 404", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const { remoteErrorOf } = await import("@deepseek-ai/dsh-typert-protocol");
    const { SkillDirectoryService } = await import(
      "../../../../packages/harness/estate-queue/src/skillRegistry.ts"
    );
    const { REFUSAL_STATUS_OF } = await import(
      "../../../../packages/harness/melite-tools/src/doors.ts"
    );
    const stateRoot = freshState();
    try {
      const ctx = new Context();
      // the seat's ONE dependency: the queue's state root (the ledger
      // seam). Reflective seat of a stub — a wall composes no estate.
      Reflect.set(ctx, "queue", { stateRoot });
      const seat = new SkillDirectoryService(ctx);
      let refused: unknown;
      try {
        seat.write({ model: "krea-2" });
      } catch (e) {
        refused = e;
      }
      const refusedRemote = remoteErrorOf(refused);
      assert.equal(refusedRemote?.code, "melite/skill-refused");
      assert.equal(REFUSAL_STATUS_OF["melite/skill-refused"], 400);
      assert.match(
        String((refused as Error).message),
        /skill write refusal: name: Field required/,
        "the writer's verbatim voice rides the class",
      );
      let missing: unknown;
      try {
        seat.read("model:krea-2:nope", AbortSignal.timeout(2_000));
      } catch (e) {
        missing = e;
      }
      const missingRemote = remoteErrorOf(missing);
      assert.equal(missingRemote?.code, "melite/skill-unknown");
      assert.equal(REFUSAL_STATUS_OF["melite/skill-unknown"], 404);
    } finally {
      rmSync(stateRoot, { recursive: true, force: true });
    }
  });

  it("refuses an unseated family, an unsafe leaf, and a silent replacement", async () => {
    const { writeAuthoredSkill } = await import(
      "../../../../packages/harness/estate-queue/src/skillAuthored.ts"
    );
    const stateRoot = freshState();
    try {
      const base = {
        model: FAMILY,
        name: "guarded",
        description: "Guard arms",
        trigger_words: [],
        examples: [],
        body: "",
        lora: "",
        replace: false,
      };
      assert.throws(
        () => writeAuthoredSkill(REPO, stateRoot, { ...base, model: "no-such-family" }),
        /no family "no-such-family"/,
        "a skill under a family nobody serves is refused",
      );
      assert.throws(
        () => writeAuthoredSkill(REPO, stateRoot, { ...base, name: "../escape" }),
        /not a path-safe skill id/,
        "a leaf that escapes the plane is refused",
      );
      assert.throws(
        () => writeAuthoredSkill(REPO, stateRoot, { ...base, description: "   " }),
        /description: Field required/,
        "the one-line summary every load prints cannot be blank",
      );
      const first = writeAuthoredSkill(REPO, stateRoot, base);
      assert.throws(
        () => writeAuthoredSkill(REPO, stateRoot, { ...base, description: "Different line" }),
        /already exists.*replace: true/s,
        "a rewrite is an explicit call — the previous words are never lost silently",
      );
      const rewritten = writeAuthoredSkill(REPO, stateRoot, { ...base, description: "Different line", replace: true });
      assert.equal(rewritten.replaced, true);
      assert.equal(rewritten.path, first.path);
      assert.ok(readFileSync(rewritten.path, "utf8").includes("Different line"));
    } finally {
      rmSync(stateRoot, { recursive: true, force: true });
    }
  });

  it("the repo walk is unchanged without a state root (the authored plane is opt-in)", async () => {
    const { modelRows } = await import(
      "../../../../packages/harness/estate-queue/src/skillRows.ts"
    );
    const { writeAuthoredSkill } = await import(
      "../../../../packages/harness/estate-queue/src/skillAuthored.ts"
    );
    const stateRoot = freshState();
    try {
      writeAuthoredSkill(REPO, stateRoot, {
        model: FAMILY,
        name: "opt-in",
        description: "Only served with a root",
        trigger_words: [],
        examples: [],
        body: "",
        lora: "",
        replace: false,
      });
      const engine = join(REPO, "packages", "engines", "comfyui-cordis");
      const bare = modelRows(engine);
      expect(bare.some((r) => r.row.id === "model:krea-2:opt-in"), "no state root: the authored doc is not invented into the walk").toBe(false);
      const rooted = modelRows(engine, stateRoot);
      expect(rooted.some((r) => r.row.id === "model:krea-2:opt-in"), "with the state root the same walk serves it").toBe(true);
    } finally {
      rmSync(stateRoot, { recursive: true, force: true });
    }
  });
});
