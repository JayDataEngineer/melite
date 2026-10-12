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
    // The exact pin replaced a `> 50` floor on 2026-10-04: the floor
    // was being propped up by five UNREACHABLE authoring leaves
    // (flows/{prop,creature,humanoid,non-humanoid,sprite-sheet}-flow
    // and sprite-sheet — 25 files, 12 of them SKILL.md under
    // flows/*/agents/skills/, which NO walker serves: only
    // flows/<registry-id>/SKILL.md is a served row, and only for a
    // registry row). Deleting the cruft dropped the walk from 56 to
    // 46. An exact pin now catches an accidental DELETION and a
    // silent ADDITION alike — a floor could not. 46 → 50
    // (2026-10-09: the character-factory leaf — tool.json,
    // AGENTS.md, agents/AGENT.md, agents/skills/
    // character-factory-pipeline/SKILL.md). 50 → 52 (2026-10-22:
    // anima's A2 — the authored agents/AGENT.md entrance + the
    // anima-prompt-writing skill beside the enhance recipe).
    // 52 → 53 (2026-10-22: audit 004/C7 — the character-sheet
    // recipe skill under qwen-img-21's agents tree, its own grammar
    // beside the factory pipeline's). 53 → 57 (2026-10-11:
    // object-forge's leaf — tool.json, AGENTS.md, agents/AGENT.md,
    // agents/skills/object-forge-pipeline/SKILL.md). 57 → 56
    // (2026-10-12: kill-residue audit F1 — the ltx-director-distilled
    // prompt-enhance SKILL.md, a dead family's orphaned leaf serving
    // through the fs-skill walk; killed with its family, and the
    // fs-skill→DECL edge now walled in family-coverage).
    expect(SERVED.length).toBe(56);
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
