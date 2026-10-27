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
import { statSync, existsSync } from "node:fs";
import { dirname, join as pathJoin } from "node:path";
import { fileURLToPath } from "node:url";
import { assert as vassert, describe as vdescribe, it as vit0 } from "vitest";
import { modelRows } from "../../../../packages/harness/estate-queue/src/skillRows.ts";
import { theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

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

// ── THE SERVED-DOC TRUTH WALL (the gates tier's own law, restored
// beside the serve-freshness arms — the same file serves both
// contracts: phantom tools, dead paths, unreachable rows) ──────────
const DOC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ENGINE = join(DOC_ROOT, "packages/engines/comfyui-cordis");
const MODELS = join(ENGINE, "models");
const FLOWS = join(DOC_ROOT, "flows");

/** Every served markdown/json file under the agents/ bundles and the
 *  flows tree (SKILL.md leaves, AGENT.md, GUIDE.md, tool.json — the
 *  doc surfaces the skill walk and the flow registry serve). */
function servedFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const full = join(dir, e);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) servedFiles(full, out);
    else if (e.endsWith(".md") || e.endsWith(".json") || e.endsWith(".txt")) out.push(full);
  }
  return out;
}

const SERVED: string[] = [...servedFiles(MODELS), ...servedFiles(FLOWS)];

vdescribe("THE SERVED-DOC TRUTH WALL (phantom tools, dead paths, unreachable rows)", () => {
  vit0("the served tree carries EXACTLY the docs a model can be handed", () => {
    // THE FLOORS-AS-CENSUS CURE (walls-meta wave-2 pin 3: the exact
    // 55 died with its 8-repin era stack — 56→46→50→52→53→57→56→55,
    // each repin rubber-stamping a doc landing, so the pin guarded
    // nothing but the reviewer's patience). Two assertions carry the
    // teeth that survived: (1) per-tree floors — a silent DELETION
    // below the tree's real census reds (the 2026-10-04 disease the
    // exact pin was minted for: unreachable authoring leaves propping
    // a floor; floors sit at today's 42+13=55 minus headroom for the
    // walk's lawful churn); (2) an INDEPENDENT WALK (iterative stack,
    // no shared code with servedFiles) — a helper regression (a
    // subtree skipped, a filter inverted) diverges from the raw walk
    // and reds here.
    const rawWalk = (roots: string[]): string[] => {
      const out: string[] = [];
      const stack = [...roots];
      while (stack.length > 0) {
        const dir = stack.pop()!;
        let entries: string[];
        try {
          entries = readdirSync(dir);
        } catch {
          continue;
        }
        for (const e of entries) {
          if (e === "node_modules" || e.startsWith(".")) continue;
          const full = join(dir, e);
          let st: import("node:fs").Stats;
          try {
            st = statSync(full);
          } catch {
            continue;
          }
          if (st.isDirectory()) stack.push(full);
          else if (/\.(md|json|txt)$/.test(e)) out.push(full);
        }
      }
      return out;
    };
    const raw = rawWalk([MODELS, FLOWS]);
    vassert.equal(
      raw.length, SERVED.length,
      `the served walk (${String(SERVED.length)}) and the raw walk (${String(raw.length)}) disagree — servedFiles is skipping or inventing files`,
    );
    const modelsCount = SERVED.filter((f) => f.startsWith(MODELS)).length;
    const flowsCount = SERVED.filter((f) => f.startsWith(FLOWS)).length;
    vassert.ok(modelsCount >= 38, `the models tree serves ${String(modelsCount)} docs — below the 38 floor (a silent deletion reds here)`);
    vassert.ok(flowsCount >= 10, `the flows tree serves ${String(flowsCount)} docs — below the 10 floor (a silent deletion reds here)`);
  });

  vit0("no served doc names a phantom tool carrier or tool call", () => {
    // The h3 disease's exact spellings; `tools.get_flow_spec` /
    // `submit_video_run` / `get_run_status` rode the same fiction
    // (mask-studio's real tools.ts is NOT in a served tree).
    const phantoms = /h3_prompt_library|tools\.get_flow_spec|submit_video_run|tools\.get_run_status|\btools\.ts\b/;
    const offenders: string[] = [];
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      const m = phantoms.exec(text);
      if (m !== null) offenders.push(f.replace(DOC_ROOT + "/", "") + " — " + m[0]);
    }
    vassert.deepStrictEqual(offenders, [], "served docs naming tool carriers that no door serves:\n" + offenders.join("\n"));
  });

  vit0("every card id a served doc names resolves to a real card (CO-W2, flows wave-2: image-upscale's served body taught 'card \"image-upscale\"' — a flow id the card plane refuses)", async () => {
    // boot-models registers the card defs; the wall resolves every
    // card id a served doc speaks, in BOTH spellings: the backticked
    // `card:<id>` reference and the JSON/prose shapes
    // {"card": "<id>"} / card "<id>".
    await loadCardDefs();
    const svc = theService();
    const real = new Set(svc.cardIds());
    const offenders: string[] = [];
    const backtick = /`card:([a-z0-9-]+)`/gu;
    const shaped = /(?:"card"\s*:\s*"([a-z0-9-]+)")|(?:\bcard\s+"([a-z0-9-]+)")/gu;
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(backtick)) {
        if (!real.has(m[1]!)) offenders.push(`${f.replace(DOC_ROOT + "/", "")} — backticked card:${m[1]}`);
      }
      for (const m of text.matchAll(shaped)) {
        const id = m[1] ?? m[2];
        if (id !== undefined && !real.has(id)) offenders.push(`${f.replace(DOC_ROOT + "/", "")} — speaks card "${id}" (no such card)`);
      }
    }
    vassert.deepStrictEqual(offenders, [], "served docs naming cards that do not exist:\n" + offenders.join("\n"));
  });

  vit0("every repo path a served doc names exists (the header's own law, finally armed)", () => {
    // the file's header promises "(c) repo paths that exist" —
    // stated, never asserted (LAW 4 axis 1). Paths are relative to
    // the repo root, spelled packages/... or flows/...
    const offenders: string[] = [];
    const pathRe = /\b((?:packages|flows|vendor)\/[A-Za-z0-9_\/.-]+)/gu;
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(pathRe)) {
        const raw = m[1]!.replace(/[.,;:)]+$/u, "");
        if (!existsSync(join(DOC_ROOT, raw))) offenders.push(`${f.replace(DOC_ROOT + "/", "")} — names ${raw}, which does not exist`);
      }
    }
    vassert.deepStrictEqual(offenders, [], "served docs naming repo paths that do not exist:\n" + offenders.join("\n"));
  });

  vit0("no served doc points at dev_docs (untracked by law — a clone never carries it)", () => {
    const offenders: string[] = [];
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      if (/dev_docs/.test(text)) offenders.push(f.replace(DOC_ROOT + "/", ""));
    }
    vassert.deepStrictEqual(offenders, [], "served docs pointing at developer-local material:\n" + offenders.join("\n"));
  });

  vit0("every melite_skill_read row id a served doc names resolves to a real row", () => {
    const rows = modelRows(ENGINE);
    const ids = new Set(rows.map((r) => r.row.id));
    const offenders: string[] = [];
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      // `melite_skill_read model:h3:h3-guide-base.md` (also bare
      // backticked ids shaped model:/flow:/guide:)
      const re = /(?:melite_skill_read\s+)?`(model:[a-z0-9_./-]+:[a-z0-9_.-]+|flow:[a-z0-9_-]+|guide:[a-z0-9_-]+)`/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const id = m[1] as string;
        // flow:/guide: rows live outside modelRows — resolve those
        // against the flows tree / model dirs below.
        if (ids.has(id)) continue;
        if (id.startsWith("flow:")) {
          const fid = id.slice("flow:".length);
          if (existsSync(join(FLOWS, fid, "SKILL.md")) || existsSync(join(FLOWS, fid, "tool.json"))) continue;
        }
        if (id.startsWith("guide:")) {
          const gdir = id.slice("guide:".length);
          if (existsSync(join(MODELS, "video", gdir, "GUIDE.md")) || existsSync(join(MODELS, "image", gdir, "GUIDE.md")) || existsSync(join(MODELS, "3d", gdir, "GUIDE.md")) || existsSync(join(MODELS, "audio", gdir, "GUIDE.md")) || existsSync(join(MODELS, "motion", gdir, "GUIDE.md"))) continue;
        }
        offenders.push(f.replace(DOC_ROOT + "/", "") + " — " + id);
      }
    }
    vassert.deepStrictEqual(offenders, [], "served docs naming skill row ids that do not resolve:\n" + offenders.join("\n"));
  });

  vit0("the h3 guides are vendored, served, and byte-true to upstream", () => {
    const rows = modelRows(ENGINE);
    const base = rows.find((r) => r.row.id === "model:h3:h3-guide-base.md");
    const ref = rows.find((r) => r.row.id === "model:h3:h3-guide-ref.md");
    vassert.ok(base !== undefined, "model:h3:h3-guide-base.md serves");
    vassert.ok(ref !== undefined, "model:h3:h3-guide-ref.md serves");
    const baseBody = readFileSync(base.path, "utf8");
    const refBody = readFileSync(ref.path, "utf8");
    // verbatim upstream bodies (frontmatter prepended): the titles
    // and the structural anchors of MiniMax-H3's two guides
    vassert.match(baseBody, /\n# Video Prompt Writing Guide \(T2VA \/ I2VA \/ FL2VA \/ L2VA\)/);
    vassert.match(baseBody, /integrated_multimodal_description/);
    vassert.match(refBody, /\n# Full-Reference Mode Rewrite Output Format Guide/);
    vassert.match(refBody, /subject_definitions/);
  });
});
