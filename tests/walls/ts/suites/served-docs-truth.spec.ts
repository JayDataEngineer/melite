// served-docs-truth.spec.ts — THE SERVED-DOC TRUTH WALL.
//
// The phantom-tool disease (operator finding, 2026-10-16): the h3
// bundle's AGENT.md documented a `tools.ts` carrier (four tools,
// among them `h3_prompt_library`) that existed nowhere in the tree,
// and pointed its guides at `dev_docs/prompt-guides/` — an untracked
// developer-local dir a clone never carries. An agent that followed
// the bundle hit a wall BY DESIGN ("no filesystem tool exists; the
// tool serves..."). The cure vendored the upstream guides into the
// bundle as their own skill rows and rewrote every served doc to
// name real doors. This wall keeps it true: every doc the estate
// SERVES to a model may name only (a) doors that exist, (b) skill
// row ids that resolve, (c) repo paths that exist. dev_docs is
// untracked by law — it can never ride a served surface.
//
// Run: npx vitest run tests/walls/ts/suites/served-docs-truth.spec.ts

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assert } from "vitest";
import { describe, expect, it } from "vitest";
import { modelRows } from "../../../../packages/harness/estate-queue/src/skillRows.ts";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ENGINE = join(ROOT, "packages/engines/comfyui-cordis");
const MODELS = join(ENGINE, "models");
const FLOWS = join(ROOT, "flows");

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

describe("THE SERVED-DOC TRUTH WALL (phantom tools, dead paths, unreachable rows)", () => {
  it("the served tree carries EXACTLY the docs a model can be handed", () => {
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
    assert.equal(
      raw.length, SERVED.length,
      `the served walk (${String(SERVED.length)}) and the raw walk (${String(raw.length)}) disagree — servedFiles is skipping or inventing files`,
    );
    const modelsCount = SERVED.filter((f) => f.startsWith(MODELS)).length;
    const flowsCount = SERVED.filter((f) => f.startsWith(FLOWS)).length;
    assert.ok(modelsCount >= 38, `the models tree serves ${String(modelsCount)} docs — below the 38 floor (a silent deletion reds here)`);
    assert.ok(flowsCount >= 10, `the flows tree serves ${String(flowsCount)} docs — below the 10 floor (a silent deletion reds here)`);
  });

  it("no served doc names a phantom tool carrier or tool call", () => {
    // The h3 disease's exact spellings; `tools.get_flow_spec` /
    // `submit_video_run` / `get_run_status` rode the same fiction
    // (mask-studio's real tools.ts is NOT in a served tree).
    const phantoms = /h3_prompt_library|tools\.get_flow_spec|submit_video_run|tools\.get_run_status|\btools\.ts\b/;
    const offenders: string[] = [];
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      const m = phantoms.exec(text);
      if (m !== null) offenders.push(f.replace(ROOT + "/", "") + " — " + m[0]);
    }
    assert.deepStrictEqual(offenders, [], "served docs naming tool carriers that no door serves:\n" + offenders.join("\n"));
  });

  it("every card id a served doc names resolves to a real card (CO-W2, flows wave-2: image-upscale's served body taught 'card \"image-upscale\"' — a flow id the card plane refuses)", async () => {
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
        if (!real.has(m[1]!)) offenders.push(`${f.replace(ROOT + "/", "")} — backticked card:${m[1]}`);
      }
      for (const m of text.matchAll(shaped)) {
        const id = m[1] ?? m[2];
        if (id !== undefined && !real.has(id)) offenders.push(`${f.replace(ROOT + "/", "")} — speaks card "${id}" (no such card)`);
      }
    }
    assert.deepStrictEqual(offenders, [], "served docs naming cards that do not exist:\n" + offenders.join("\n"));
  });

  it("every repo path a served doc names exists (the header's own law, finally armed)", () => {
    // the file's header promises "(c) repo paths that exist" —
    // stated, never asserted (LAW 4 axis 1). Paths are relative to
    // the repo root, spelled packages/... or flows/...
    const offenders: string[] = [];
    const pathRe = /\b((?:packages|flows|vendor)\/[A-Za-z0-9_\/.-]+)/gu;
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(pathRe)) {
        const raw = m[1]!.replace(/[.,;:)]+$/u, "");
        if (!existsSync(join(ROOT, raw))) offenders.push(`${f.replace(ROOT + "/", "")} — names ${raw}, which does not exist`);
      }
    }
    assert.deepStrictEqual(offenders, [], "served docs naming repo paths that do not exist:\n" + offenders.join("\n"));
  });

  it("no served doc points at dev_docs (untracked by law — a clone never carries it)", () => {
    const offenders: string[] = [];
    for (const f of SERVED) {
      const text = readFileSync(f, "utf8");
      if (/dev_docs/.test(text)) offenders.push(f.replace(ROOT + "/", ""));
    }
    assert.deepStrictEqual(offenders, [], "served docs pointing at developer-local material:\n" + offenders.join("\n"));
  });

  it("every melite_skill_read row id a served doc names resolves to a real row", () => {
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
        offenders.push(f.replace(ROOT + "/", "") + " — " + id);
      }
    }
    assert.deepStrictEqual(offenders, [], "served docs naming skill row ids that do not resolve:\n" + offenders.join("\n"));
  });

  it("the h3 guides are vendored, served, and byte-true to upstream", () => {
    const rows = modelRows(ENGINE);
    const base = rows.find((r) => r.row.id === "model:h3:h3-guide-base.md");
    const ref = rows.find((r) => r.row.id === "model:h3:h3-guide-ref.md");
    assert.ok(base !== undefined, "model:h3:h3-guide-base.md serves");
    assert.ok(ref !== undefined, "model:h3:h3-guide-ref.md serves");
    const baseBody = readFileSync(base.path, "utf8");
    const refBody = readFileSync(ref.path, "utf8");
    // verbatim upstream bodies (frontmatter prepended): the titles
    // and the structural anchors of MiniMax-H3's two guides
    assert.match(baseBody, /\n# Video Prompt Writing Guide \(T2VA \/ I2VA \/ FL2VA \/ L2VA\)/);
    assert.match(baseBody, /integrated_multimodal_description/);
    assert.match(refBody, /\n# Full-Reference Mode Rewrite Output Format Guide/);
    assert.match(refBody, /subject_definitions/);
  });
});
