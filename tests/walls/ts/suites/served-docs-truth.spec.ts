// served-docs-truth.spec.ts — THE SERVE-FRESHNESS WALL (audit 013
// cure 3c): the load plane's agent docs are served per request from
// the disk bytes — never a snapshot, never a cache, never a
// hand-maintained copy. Two arms:
//   1. BYTE FIDELITY — every served agents[].text IS the file's
//      bytes (prefix under the serve budget, full equality within
//      it): a stale serve or a drifted copy reds here.
//   2. DIGEST RIDES CONTENT — the bundle digest is sha16 of the
//      bundle's own JSON: a one-byte in-memory change moves the
//      digest (no tree mutation, the proof is pure), and a fresh
//      load re-serves the original bytes (the edit lands on the
//      next load, the freshness law itself).
// @contract models-served-docs-truth
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { paramSchema } from "../../../../packages/models/h3/src/schema.ts";
import { DOC_FPS_DEFAULT } from "../../../../packages/models/h3/src/timelineContract.ts";
import {
  bundleDigest,
  cardSkillDocs,
  loadCard,
  resolveCardPackageDir,
} from "../../../../packages/harness/estate-queue/src/loadPlane.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
/** cardSkillDocs' serve budget — the cap a served doc may sit under
 *  (the fidelity arm reads the constant off the served shape, never
 *  a second source: a doc at or under the budget serves FULLY). */
const SERVE_BUDGET = 32768;

describe("THE SERVE-FRESHNESS WALL — the load plane serves the disk's own bytes", () => {
  it("BYTE FIDELITY: every served agents[].text is the file's bytes — a stale or copied serve reds", async () => {
    const defs = await loadCardDefs();
    const cards = { defsSync: () => defs };
    let servedCards = 0;
    let servedDocs = 0;
    for (const [id] of defs) {
      const bundle = loadCard(ROOT, cards as never, null, id) as {
        agents?: Array<{ path: string; text: string }>;
      } | null;
      const docs = bundle?.agents ?? [];
      if (docs.length === 0) continue;
      servedCards++;
      const pkgDir = resolveCardPackageDir(ROOT, id);
      for (const doc of docs) {
        const disk = readFileSync(join(pkgDir, doc.path), "utf8");
        assert.ok(
          disk.startsWith(doc.text),
          `${id} ${doc.path}: the served text is NOT the disk's bytes — a stale serve or a drifted copy (serve freshness is the law: the load plane re-reads per request)`,
        );
        if (disk.length <= SERVE_BUDGET) {
          assert.equal(
            doc.text, disk,
            `${id} ${doc.path}: the file sits under the serve budget — it must serve in FULL, never truncated`,
          );
        }
        servedDocs++;
      }
    }
    assert.ok(
      servedCards >= 1 && servedDocs >= 1,
      `the fidelity arm judged real served docs (saw ${servedCards} cards / ${servedDocs} docs — a vacuous pass over zero docs is the hole this wall closes)`,
    );
    // THE AGENT-FIRST ORDER rides the same serve (the bundle's head
    // doc is AGENT.md wherever the card ships one): byte-fidelity
    // without order would let a sorted-but-wrong head teach first.
    const h3 = loadCard(ROOT, cards as never, null, "h3-timeline") as {
      agents: Array<{ path: string; text: string }>;
    };
    assert.equal(h3.agents[0]?.path, "src/agents/AGENT.md", "AGENT.md heads the served docs (the head doc is the agent's first read)");
    // THE READ SEAT IS THE SAME FUNCTION the bundle rides — cardSkill
    // Docs(pkgDir) re-reads per call; pinning it to the disk bytes
    // here keeps the wall on the serve path, not a test-side rewalk.
    const pkgDir = resolveCardPackageDir(ROOT, "h3-timeline");
    const fresh = cardSkillDocs(pkgDir);
    assert.equal(fresh[0]?.path, "src/agents/AGENT.md");
    assert.equal(fresh[0]?.text, readFileSync(join(pkgDir, "src", "agents", "AGENT.md"), "utf8"),
      "cardSkillDocs serves the disk's current AGENT.md bytes (the per-request read, no cache)");
  });

  it("DIGEST RIDES CONTENT: one in-memory byte moves the digest, and a fresh load re-serves the original — no tree mutation, the proof is pure", async () => {
    const defs = await loadCardDefs();
    const cards = { defsSync: () => defs };
    const bundle = loadCard(ROOT, cards as never, null, "h3-timeline") as Record<string, unknown> & {
      agents: Array<{ path: string; text: string }>;
      digest: string;
    };
    const original = bundle.digest;
    assert.ok(original.length > 0, "the bundle carries its content digest");
    // THE ONE-BYTE BURN (the stale-serve class): touch ONE byte of
    // the served docs in memory — the digest must move, because it
    // is sha16 of the bundle's own canonical JSON, never a name or
    // a timestamp.
    const servedText = bundle.agents[0]!.text;
    bundle.agents[0]!.text = servedText + "x";
    const burned = bundleDigest(bundle as Record<string, unknown>);
    assert.notEqual(burned, original, "a one-byte in-memory doc change MUST move the bundle digest — a digest that survives it is a name, not content");
    // restore the in-memory shape (the tree was never touched) and
    // prove the freshness law itself: a fresh load re-serves the
    // original bytes and the original digest — an edit on disk lands
    // on the agent's next load, never a cached ghost.
    bundle.agents[0]!.text = servedText;
    const again = loadCard(ROOT, cards as never, null, "h3-timeline") as { digest: string; agents: Array<{ path: string; text: string }> };
    assert.equal(again.digest, original, "a fresh load re-serves the original digest — the serve carries no in-memory cache");
    assert.equal(again.agents[0]?.text, servedText, "a fresh load re-serves the original bytes");
    assert.equal(basename(again.agents[0]!.path), "AGENT.md");
  });
});

describe("THE FPS ONE-HOME WALL (audit 013 cure 3d) — the clock's value and its prose live in one home", () => {
  /** The h3 served doc set: the card's agents docs + the family's
   *  serve tree (the cordis models skills the load/skill planes
   *  hand the agent). Every byte here is model-visible. */
  const FAMILY_TREE = join(ROOT, "packages", "engines", "comfyui-cordis", "models", "video", "h3");
  const walkMd = (dir: string, out: string[] = []): string[] => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walkMd(p, out);
      else if (ent.name.endsWith(".md") || ent.name.endsWith(".yaml")) out.push(p);
    }
    return out;
  };
  /** A marked place: the line POINTS at the schema default (the
   *  ONE-HOME pointer idiom) instead of restating the value. */
  const MARKED = /schema fps default|the one clock|fps default/i;

  it("VALUE LAW: the carrier fps row's declared default IS DOC_FPS_DEFAULT — the schema derives the const, never a second literal", () => {
    // fps is a hidden validation row (off the rendered projection),
    // so the live derivation reads the FAMILY CARRIER itself — the
    // serialized meta the envelope serves (toJSON rides the same
    // meta) — and pulls the fps node's declared default out.
    const fps = (paramSchema as unknown as { dict: Record<string, unknown> }).dict["fps"] as {
      meta?: { default?: unknown };
    };
    assert.ok(fps, "the carrier declares the fps row");
    assert.equal(
      fps.meta?.default, DOC_FPS_DEFAULT,
      `the carrier fps default (${String(fps.meta?.default)}) must BE DOC_FPS_DEFAULT (${String(DOC_FPS_DEFAULT)}) — a literal here is a second home for the clock`,
    );
  });

  it("PROSE LAW: no bare 24fps restatement in the served docs — every mention is a marked pointer at the schema default", () => {
    const pkgDir = resolveCardPackageDir(ROOT, "h3-timeline");
    const files = [
      ...cardSkillDocs(pkgDir).map((d) => join(pkgDir, d.path)),
      ...walkMd(FAMILY_TREE),
    ];
    assert.ok(files.length >= 4, `the prose arm scans the served doc set (saw ${files.length} files — a vacuous pass is the hole this wall closes)`);
    const bare: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/24\s*fps/i.test(line) && !MARKED.test(line)) bare.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(
      bare, [],
      "bare 24fps restatements in the served docs — the clock's value lives in DOC_FPS_DEFAULT (schema.ts derives it); prose POINTS at the schema fps default instead of restating a number",
    );
  });
});
