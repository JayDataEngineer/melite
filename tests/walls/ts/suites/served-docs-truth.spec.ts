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
import { seedFlowsSeat } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { MELITE_TOOL_NAMES } from "../../../../packages/harness/melite-tools/src/index.ts";
import { modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { CALL_KEYS } from "../../../../packages/models/h3/src/timelineContract.ts";
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

  // ── gates-doc-dead-ref-census ARMS 1–3 (U3, 2026-10-31 mapping §1)
  // THE INVARIANT: a rail, param, lora row, or skill id a served doc
  // names resolves against the family DECL / catalog / id namespace
  // it is named in. The drain queue's dead refs are the first reds:
  // ARM 1 — `kin` (flagship card craft promptHint) + the `preset`
  // knob the music lane never served; ARM 2 — `vn_character_sheet`
  // (no family catalog carries it); ARM 3 — `card:rig` (rig ships no
  // agents doc, the id serves no skill face).
  //
  // DEPTH (canon axis 4): the roster is DERIVED — every card def's
  // craft promptHint + every served bundle-agents text + the SERVED
  // walk above — and every DECL is read off the live object (the
  // def's schemaCarrier ?? schema dict, admits, jsonArrayParams,
  // flowKinds inputs, mods param_keys; the flow row's own tool +
  // stages; the booted service's flavor registrations), never a
  // hand-kept list. A doc the walk cannot attribute fails LOUD
  // (an unattributed doc is a census hole, never a silent skip).
  //
  // DENIALS ARE NOT TEACHINGS: a line that retracts, buries, or
  // refuses a name warns the agent correctly — the arms judge
  // claim positions only. Strong markers (DEAD / RETIRED /
  // RETRACTED / unboarded / "do not use" / "once taught" / "can be
  // skipped") exempt the whole line; weak markers (no / not /
  // never / refuses / unknown / instead of / rather than) exempt
  // only their own clause (split on ; : —). "Set `foo` — never
  // omit it" still reds: the lie sits in the clean clause.
  /** A served doc attributed to the DECL that judges it. rowFields
   *  is the card's NESTED row namespace (per-call / per-clip keys) —
   *  a backticked row teaching is judged there, never as a top-level
   *  knob claim (P1/P2/P3 ride the top-level DECL only). */
  type CensusDoc = { file: string; text: string; decl: Set<string>; entryFields: Set<string>; rowFields: Set<string> };
  const STRONG_DENIAL = /\b(dead\b|retired\b|retracted\b|gone\b|removal\b|unboarded\b|not boarded\b|no longer\b|once taught\b|do not use\b|don't use\b|can.{0,20}be skipped\b|experimental\b)/i;
  const WEAK_DENIAL = /\b(no\b|not\b|never\b|n't\b|does not\b|isn't\b|aren't\b|names? no\b|refuses?\b|refuse\b|unknown\b|instead of\b|rather than\b|remove it\b|clear it\b|back it\b|without\b|missing\b)/i;
  const splitClauses = (line: string): string[] => line.split(/[;:—–]|\.(?=\s)/);
  const lineDenied = (line: string): boolean => STRONG_DENIAL.test(line);
  const clauseDenied = (clause: string): boolean => STRONG_DENIAL.test(clause) || WEAK_DENIAL.test(clause);
  // THE SENTENCE UNIT: a retraction wraps across file lines ("NEVER
  // hand-write a lora filename or a legacy\n`lora` / `lora_strength`
  // knob: ..."; "there is NO\n`caption` param"). denial is judged on
  // the sentence — the current line plus up to two continuable
  // predecessors (non-blank, non-header, non-fence, ending
  // mid-sentence, i.e. no terminal [.?!…]). Blockquote lines judge
  // as ONE unit (a callout warning names names across its lines and
  // retracts them together — the DEADLINE LAW blockquote shape).
  // CAP: a denial and an unrelated teaching jammed into one
  // unbroken sentence across a wrap share the sentence (the wall
  // judges it denied) — served docs break sentences with terminals,
  // and every toggle-proof below rides the real wrapped shapes,
  // never the hostile one.
  const sentAt = (lines: string[], i: number): string => {
    if (/^\s*>/.test(lines[i] ?? "")) {
      const parts = [lines[i]!];
      for (let j = i - 1; j >= 0 && /^\s*>/.test(lines[j]!); j--) parts.unshift(lines[j]!);
      for (let j = i + 1; j < lines.length && /^\s*>/.test(lines[j]!); j++) parts.push(lines[j]!);
      return parts.join("\n");
    }
    const parts = [lines[i]!];
    for (let j = i - 1; j >= i - 2 && j >= 0; j--) {
      const prev = lines[j]!;
      const t = prev.trim();
      if (t === "") break;
      if (/^(#{1,6}\s|>\s|```|---\s*$)/.test(t)) break;
      if (/[.!?…]["')\]]?\s*$/.test(t)) break;
      parts.unshift(prev);
    }
    return parts.join("\n");
  };
  /** Every sentence-clause carrying the NEEDLE is denied — the
    *  needle is the exact served shape (backticked token, dotted
    *  param path): a bare substring would let an unrelated mention
    *  of the same letters (`mods/loras.ts` beside a `lora`
    *  retraction) dilute the judgment. The retraction rides with
    *  the name it retracts ("Set `foo` — never omit it" stays RED:
    *  the token's clause is clean). */
  const deniedFor = (sent: string, needle: string): boolean => {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!\\w)${esc}(?!\\w)`);
    const cs = splitClauses(sent).filter((c) => re.test(c));
    return cs.length > 0 && cs.every(clauseDenied);
  };
  /** Pure identifier backtick spans — dotted paths, key=value pairs,
   *  and prose spans never qualify (ARM 2/3 own the id shapes). */
  function* backtickIdents(text: string): Generator<{ token: string }> {
    for (const line of text.split("\n")) {
      for (const m of line.matchAll(/`([A-Za-z][A-Za-z0-9_-]*)`/g)) {
        yield { token: m[1]! };
      }
    }
  }
  async function censusDocs(): Promise<{ docs: CensusDoc[]; loraIds: Set<string>; skillNames: Set<string>; unattributed: string[] }> {
    const defs = await loadCardDefs();
    // THE NESTED ROW NAMESPACE (schema-nested keys are card-local:
    // h3-timeline's per-call keys ride its exported CALL_KEYS
    // (timelineContract.ts), its audio-clip raw keys ride filmMix's
    // parse reads (src/start_frame/dur_frames/text/class/id/name —
    // filmMix.ts parseFilmMixClips). A new row-key schema adds its
    // export here; until then its docs judge row teachings top-level
    // (LOUD, never a silent pass).
    const CLIP_ROW_KEYS = new Set<string>(["src", "start_frame", "dur_frames", "text", "class", "id", "name"]);
    const rowFieldsForCard = (id: string): Set<string> =>
      id === "h3-timeline" ? new Set<string>([...CALL_KEYS, ...CLIP_ROW_KEYS]) : new Set<string>();
    const byCard = new Map<string, { decl: Set<string>; entryFields: Set<string>; rowFields: Set<string> }>();
    const famCards = new Map<string, Set<string>>();
    for (const [id, def] of defs) {
      const d = def as unknown as {
        admits?: readonly string[]; jsonArrayParams?: readonly string[];
        flowKinds?: { inputs?: Record<string, unknown>; legacyAliases?: Record<string, unknown> };
        legacyAliases?: Record<string, unknown>;
        mods?: ReadonlyArray<{ param_key?: unknown; fields?: ReadonlyArray<Record<string, unknown>>; kindFields?: ReadonlyArray<Record<string, unknown>> }>;
        boarded?: readonly string[];
      };
      const dict = ((def.schemaCarrier ?? def.schema) as unknown as { dict?: Record<string, unknown> }).dict ?? {};
      const decl = new Set<string>(Object.keys(dict));
      for (const k of d.admits ?? []) decl.add(k);
      for (const k of d.jsonArrayParams ?? []) decl.add(k);
      for (const k of Object.keys(d.flowKinds?.inputs ?? {})) decl.add(k);
      for (const k of Object.keys(d.flowKinds?.legacyAliases ?? {})) decl.add(k);
      for (const k of Object.keys(d.legacyAliases ?? {})) decl.add(k);
      const entryFields = new Set<string>();
      for (const m of d.mods ?? []) {
        if (typeof m.param_key === "string") decl.add(m.param_key);
        for (const f of [...(m.fields ?? []), ...(m.kindFields ?? [])]) {
          if (typeof f["name"] === "string") entryFields.add(f["name"] as string);
        }
      }
      byCard.set(id, { decl, entryFields, rowFields: rowFieldsForCard(id) });
      for (const mid of d.boarded ?? []) {
        if (!famCards.has(mid)) famCards.set(mid, new Set());
        famCards.get(mid)!.add(id);
      }
    }
    const famDecl = new Map<string, { decl: Set<string>; entryFields: Set<string>; rowFields: Set<string> }>();
    for (const [mid, cards] of famCards) {
      const decl = new Set<string>();
      const entryFields = new Set<string>();
      const rowFields = new Set<string>();
      for (const c of cards) {
        for (const k of byCard.get(c)?.decl ?? []) decl.add(k);
        for (const k of byCard.get(c)?.entryFields ?? []) entryFields.add(k);
        for (const k of byCard.get(c)?.rowFields ?? []) rowFields.add(k);
      }
      famDecl.set(mid, { decl, entryFields, rowFields });
    }
    const flowDecl = new Map<string, { decl: Set<string>; entryFields: Set<string>; rowFields: Set<string> }>();
    const seat = seedFlowsSeat();
    for (const name of seat.names()) {
      const row = seat.get(name)!;
      // THE FLOW NAMESPACE = the flow's own declaration ∪ the cards
      // its stages ride (a flow doc may teach a card knob — flows
      // COMPOSE cards) ∪ the flow leaf's tool.json params (the
      // door-validated body — craft-loop's row carries no registry
      // tool; the leaf's params_schema IS the declaration).
      const decl = new Set<string>([
        ...Object.keys(row.tool?.properties ?? {}),
        ...Object.keys(row.initialValidators ?? {}),
      ]);
      const entryFields = new Set<string>();
      const rowFields = new Set<string>();
      for (const st of row.stages ?? []) {
        decl.add(st.id);
        for (const k of Object.keys(st.inputs ?? {})) decl.add(k);
        for (const k of Object.keys(st.outputs ?? {})) decl.add(k);
        for (const k of Object.keys((st as { cardIo?: Record<string, unknown> }).cardIo ?? {})) decl.add(k);
        for (const k of Object.keys(st.params ?? {})) decl.add(k);
        const cardId = (st as { card?: unknown }).card;
        if (typeof cardId === "string" && byCard.has(cardId)) {
          for (const k of byCard.get(cardId)!.decl) decl.add(k);
          for (const k of byCard.get(cardId)!.entryFields) entryFields.add(k);
          for (const k of byCard.get(cardId)!.rowFields) rowFields.add(k);
        }
      }
      try {
        const leaf = JSON.parse(readFileSync(join(ROOT, "flows", name, "tool.json"), "utf8")) as {
          params_schema?: { properties?: Record<string, unknown> };
        };
        for (const k of Object.keys(leaf.params_schema?.properties ?? {})) decl.add(k);
      } catch {
        // a flow leaf with no tool.json rides the registry row alone
      }
      flowDecl.set(name, { decl, entryFields, rowFields });
    }
    // THE SKILL-ID NAMESPACE (ARM 3's reference): every served SKILL.md
    // leaf's frontmatter name + its directory basename — the derived
    // set of skill faces an agent can be handed.
    const skillNames = new Set<string>();
    const collectSkills = (files: string[]): void => {
      for (const f of files) {
        if (!f.endsWith("SKILL.md")) continue;
        skillNames.add(basename(join(f, "..")));
        const head = readFileSync(f, "utf8").split("\n").slice(0, 10).join("\n");
        const m = /^name:\s*["']?(.+?)["']?\s*$/m.exec(head);
        if (m) skillNames.add(m[1]!);
      }
    };
    collectSkills(SERVED);
    // THE LORA-ROW NAMESPACE (ARM 2's reference): the booted
    // service's own flavor registrations — the picker/compose
    // door's served catalog (service.ts modCatalogForCompose rides
    // these same rows; the unknown-lora refusal names them).
    const loraIds = new Set<string>();
    for (const f of theService().flavorRegistrations()) {
      if ((f as { pack?: unknown }).pack !== "loras") continue;
      for (const r of (f as { rows?: ReadonlyArray<{ id?: unknown }> }).rows ?? []) {
        if (typeof r.id === "string") loraIds.add(r.id);
      }
    }
    // THE ROSTER: card craft promptHints + card bundle agents +
    // the SERVED walk, attributed to the DECL that judges each doc.
    // A served file the attribution cannot place fails LOUD below.
    const docs: CensusDoc[] = [];
    const unattributed: string[] = [];
    const cards = { defsSync: () => defs };
    for (const [id, { decl, entryFields, rowFields }] of byCard) {
      const def = defs.get(id) as unknown as { craft?: { promptHint?: unknown } };
      if (typeof def.craft?.promptHint === "string" && def.craft.promptHint.length > 0) {
        docs.push({ file: `card:${id} craft.promptHint`, text: def.craft.promptHint, decl, entryFields, rowFields });
      }
      const bundle = loadCard(DOC_ROOT, cards as never, null, id) as {
        agents?: Array<{ path: string; text: string }>;
      } | null;
      for (const a of bundle?.agents ?? []) {
        docs.push({ file: `${id}/${a.path}`, text: a.text, decl, entryFields, rowFields });
        if (a.path.endsWith("SKILL.md")) {
          skillNames.add(basename(join(a.path, "..")));
          const m = /^name:\s*["']?(.+?)["']?\s*$/m.exec(a.text.split("\n").slice(0, 10).join("\n"));
          if (m) skillNames.add(m[1]!);
        }
      }
    }
    for (const f of SERVED) {
      const rel = f.startsWith(DOC_ROOT + "/") ? f.slice(DOC_ROOT.length + 1) : f;
      const text = readFileSync(f, "utf8");
      let m = /^packages\/engines\/comfyui-cordis\/models\/[^/]+\/([^/]+)\//.exec(rel);
      if (m) {
        // A family NO card boards (mask-studio and its mask_t1.json
        // template) has no DECL — the strictest judge applies: the
        // EMPTY knob set, so any params-shaped teaching reds. Boarded
        // families ride their boarding cards' union DECL.
        const fam = famDecl.get(m[1]!);
        docs.push({
          file: rel, text,
          decl: fam?.decl ?? new Set<string>(),
          entryFields: fam?.entryFields ?? new Set<string>(),
          rowFields: fam?.rowFields ?? new Set<string>(),
        });
        continue;
      }
      m = /^flows\/([^/]+)\//.exec(rel);
      if (m) {
        const flow = flowDecl.get(m[1]!);
        docs.push({
          file: rel, text,
          decl: flow?.decl ?? new Set<string>(),
          entryFields: flow?.entryFields ?? new Set<string>(),
          rowFields: flow?.rowFields ?? new Set<string>(),
        });
        continue;
      }
      unattributed.push(rel);
    }
    return { docs, loraIds, skillNames, unattributed } as {
      docs: CensusDoc[]; loraIds: Set<string>; skillNames: Set<string>; unattributed: string[];
    };
  }

  vit0("ARM 1 — rail/param names in served craft + AGENT text walk the family DECL params (kin is the first red)", async () => {
    const { docs, loraIds, skillNames, unattributed } = await censusDocs();
    vassert.deepEqual(unattributed, [], `served files no DECL attribution places (a census hole, never a silent skip):\n${unattributed.join("\n")}`);
    // the id namespace: names that resolve as IDS (cards, families,
    // flows, lora rows, skills, estate tools) are never param claims —
    // ARM 2/3 judge those shapes; this arm judges param claims only.
    const svc = theService();
    const ids = new Set<string>([
      ...svc.cardIds(),
      ...modelIds(),
      ...(MELITE_TOOL_NAMES as readonly string[]),
    ]);
    for (const f of seedFlowsSeat().names()) ids.add(f);
    for (const id of loraIds) ids.add(id);
    for (const name of skillNames) ids.add(name);
    // THE REGISTRY ROUTING KEY (served truth, not a DECL knob):
    // params.model is consumed ABOVE the schema — runsRegistry's
    // routing read (runsRegistry.ts: `params["model"] ?? service ??
    // card`) and the card registry's family-lane reads
    // (cardsRegistry.ts params["model"]) resolve the lane before
    // validation. A doc teaching params.model teaches the routing
    // door, never a phantom knob.
    const ROUTING_KEYS = new Set<string>(["model"]);
    for (const k of ROUTING_KEYS) ids.add(k);
    // THE RUN-DOOR ENVELOPE (runsRegistry's closed arg list — the
    // door's own refusal names them: only bench | card (+model) |
    // flow | stages (+connects/id/description/test) ride top level):
    // the envelope key names are estate vocabulary, never knobs.
    for (const k of ["params", "card", "flow", "stages", "connects", "bench"]) ids.add(k);
    // DERIVED GLOBAL: no judged DECL serves a preset knob — the
    // estate-wide absence every preset-position claim below is
    // judged against (the music lane's served lever is duration,
    // the image lane's is params.model + width/height). If a lane
    // ever serves one, this premise reds LOUD instead of silently
    // licensing preset teachings.
    const presetServing = new Set<string>();
    for (const doc of docs) {
      if (doc.decl.has("preset")) presetServing.add(doc.file);
    }
    vassert.deepStrictEqual([...presetServing], [], "a judged DECL serves a preset knob — the preset-position rule's derived premise broke; re-derive, never hand-patch");
    const offenders: string[] = [];
    // A KNOB-POSITION noun in the clause — the teaching seats the
    // name AS a servable. Bare verbs ("state the style", "use X in
    // the order shown") and possession ("owns out paths") teach
    // VALUES and content, a namespace this arm does not judge (the
    // TTS preset-voice precedent; upstream guide vocab rides here).
    // "name/labels" are deliberately absent: a name is an
    // identifier, often a value ("preset names" rides the preset
    // rule below instead). "rows" is ARM 2's shape (lora rows), and
    // hyphenated compounds ("six-field", a modifier) are not the
    // noun — only a standalone noun seats a name.
    const KNOB_NOUN = /(?<![\w-])(params?|knobs?|rails?|fields?|channels?|slots?|bags?|lanes?)(?![\w-])/i;
    // "preset <noun>" in ANY spelling (backticked or bare): preset
    // is never a served knob-position noun in any family — prose
    // ("preset fields", "preset names") pins a servable exactly
    // like backticks do.
    const PRESET_NOUN = /`?presets?`?\s+(fields?|names?|knobs?|params?)\b/gi;
    // THE VENDORED GUIDES are byte-true upstream prompt-writing
    // docs (their own wall asserts the upstream anchors verbatim):
    // their "field" vocabulary is the PROMPT format's, not the
    // estate's knobs — ARM 1 does not judge upstream-frozen text.
    const VENDORED_GUIDE = /\/h3-guide-(base|ref)\.md$/;
    for (const doc of docs) {
      if (VENDORED_GUIDE.test(doc.file)) continue;
      const known = new Set<string>([...doc.decl, ...ids]);
      // FILE lines always (frontmatter lines skipped in place): an
      // offender cites the file:line the agent reads, never a
      // body-relative number that shifts under frontmatter.
      const fmSpan = /^---\n[\s\S]*?\n---\n?/.exec(doc.text)?.[0].split("\n").length ?? 1;
      const content: Array<[number, string]> = doc.text.split("\n")
        .map((line, i) => [i, line] as [number, string])
        .filter(([i]) => i + 1 >= fmSpan);
      const lines = doc.text.split("\n");
      // P1 — params.<name> is always a param claim (top-level DECL
      // only — row keys are not top-level knobs).
      for (const [ln, line] of content) {
        const sent = sentAt(lines, ln);
        if (lineDenied(sent)) continue;
        for (const m of line.matchAll(/\bparams\.([A-Za-z][A-Za-z0-9_]*)/g)) {
          if (known.has(m[1]!)) continue;
          if (deniedFor(sent, `params.${m[1]!}`) || deniedFor(sent, m[1]!)) continue;
          offenders.push(`${doc.file}:${ln + 1} — params.${m[1]} names no served knob`);
        }
      }
      // P2 — fenced JSON .params objects name only served knobs
      // (whole text: fences are multi-line by nature).
      for (const m of doc.text.matchAll(/```(?:json)?\n([\s\S]*?)```/g)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(m[1]!);
        } catch {
          continue;
        }
        const walk = (v: unknown): void => {
          if (Array.isArray(v)) {
            for (const e of v) walk(e);
            return;
          }
          if (v !== null && typeof v === "object") {
            for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
              if (k === "params" && e !== null && typeof e === "object" && !Array.isArray(e)) {
                for (const key of Object.keys(e as Record<string, unknown>)) {
                  if (!known.has(key)) offenders.push(`${doc.file} — fenced params.${key} names no served knob`);
                }
              }
              walk(e);
            }
          }
        };
        walk(parsed);
      }
      // P3 — a parenthesized enumeration that seats a name THE DOC'S
      // OWN DECL serves seats ONLY served names beside it (the kin
      // shape: a dead rail taught as the sibling of a live one). The
      // anchor is the doc's own namespace, never the global id set —
      // a content enumeration ("identity locks: hair, eyes, skin, …")
      // colliding with an unrelated served family id (skin) is prose,
      // not a rail seat. The line gate rides standalone seat nouns —
      // hyphenated compounds ("six-field") and lighting talk ("key
      // direction") are not seat vocabulary.
      const anchor = new Set<string>([...doc.decl, ...doc.entryFields, ...doc.rowFields]);
      for (const [ln, line] of content) {
        const sent = sentAt(lines, ln);
        if (lineDenied(sent)) continue;
        if (!/(?<![\w-])(params?|knobs?|rails?|fields?|bags?|lanes?)(?![\w-])/i.test(line)) continue;
        for (const m of line.matchAll(/\(([^()]{1,200})\)/g)) {
          const chunks = m[1]!.split(/\s+and\s+|\s+or\s+|[,;/]/).map((c) =>
            c.trim().replace(/^[`'"]+|[`'"]+$/g, ""),
          );
          const tokens = chunks.filter((c) => /^[a-z][a-z0-9_]*$/.test(c));
          if (tokens.length === 0 || !tokens.some((t) => anchor.has(t))) continue;
          for (const t of tokens) {
            if (anchor.has(t) || deniedFor(sent, t)) continue;
            offenders.push(`${doc.file}:${ln + 1} — "(${m[1]})" seats ${t} beside a served name; ${t} names no rail or knob`);
          }
        }
      }
      // P4-preset — "preset <noun>" in any spelling (the derived
      // global above: no lane serves a preset knob). Frontmatter
      // included (descriptions are served tier-1 lines): every line
      // of the doc, not just the body.
      for (const [ln, line] of lines.entries()) {
        const sent = sentAt(lines, ln);
        if (lineDenied(sent)) continue;
        for (const m of line.matchAll(PRESET_NOUN)) {
          const name = /`?presets?`?/i.exec(m[0]!)![0]!.replace(/`/g, "");
          if (deniedFor(sent, name)) continue;
          offenders.push(`${doc.file}:${ln + 1} — "${m[0]!.trim()}" claims a preset servable; no preset knob is served`);
        }
      }
      // P4b — "Presets: <enum>" claims a preset knob the DECL never
      // served (value-talk — "preset voice/speaker" — is not a
      // claim). LINE level: the colon dies in clause-splitting, so
      // the pattern rides the whole line or it never fires. One
      // offender per line — the lie is the Presets: seat, not each
      // enum word after it.
      for (const [ln, line] of content) {
        const sent = sentAt(lines, ln);
        if (lineDenied(sent)) continue;
        if (!/presets?\s*:/i.test(line)) continue;
        offenders.push(`${doc.file}:${ln + 1} — "Presets: ..." seats a preset enum; no preset knob is served`);
      }
      // P5 — a backticked identifier seated AS a servable (a
      // knob-position noun shares its clause) resolves against the
      // DECL, the id namespace, the card's mod entry fields, or the
      // card's nested row fields. Subsumes the old "<name> <noun>"
      // adjacency rule (same clause is the teaching unit).
      for (const [ln, line] of content) {
        const sent = sentAt(lines, ln);
        if (lineDenied(sent)) continue;
        for (const { token } of backtickIdents(line)) {
          if (known.has(token) || doc.entryFields.has(token) || doc.rowFields.has(token)) continue;
          if (deniedFor(sent, `\`${token}\``)) continue;
          let positioned = false;
          for (const clause of splitClauses(sent)) {
            if (clause.includes(token) && KNOB_NOUN.test(clause)) {
              positioned = true;
              break;
            }
          }
          if (positioned) offenders.push(`${doc.file}:${ln + 1} — \`${token}\` is taught as servable but names no DECL knob or served id`);
        }
      }
    }
    vassert.ok(docs.length >= 60, `the census judges the derived roster (saw ${docs.length} docs — a vacuous pass is the hole this wall closes)`);
    vassert.deepStrictEqual(offenders, [], "served craft + AGENT text naming rails/params no DECL serves:\n" + offenders.join("\n"));
  });

  vit0("ARM 2 — lora row ids in served leaves resolve against the family catalog (vn_character_sheet reds)", async () => {
    const { docs, loraIds, skillNames: _skills, unattributed } = await censusDocs();
    void _skills;
    vassert.ok(loraIds.size >= 3, `the catalog census rides the served flavor rows (saw ${loraIds.size} loras rows — an empty catalog would pass vacuously)`);
    vassert.deepEqual(unattributed, [], `unattributed served files:\n${unattributed.join("\n")}`);
    const offenders: string[] = [];
    for (const doc of docs) {
      const lines = doc.text.split("\n");
      let sectionLora = false;
      lines.forEach((line, i) => {
        const hm = /^(#{1,3})\s+(.+)$/.exec(line);
        if (hm) sectionLora = /lora/i.test(hm[2]!);
        const loraCtx = sectionLora || /lora/i.test(line);
        if (!loraCtx) return;
        // sentence unit: the NEVER retraction wraps above the token
        // ("NEVER hand-write a lora filename or a legacy\n`lora` /
        // `lora_strength` knob: ...").
        const sent = sentAt(lines, i);
        if (lineDenied(sent)) return;
        for (const { token } of backtickIdents(line)) {
          if (!/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(token)) continue;
          // a name the DECL serves as a PARAM is a knob claim (ARM
          // 1's business), never a row-id claim.
          if (doc.decl.has(token)) continue;
          if (deniedFor(sent, `\`${token}\``)) continue;
          if (!loraIds.has(token)) offenders.push(`${doc.file}:${i + 1} — \`${token}\` names no served loras row`);
        }
      });
      // fenced loras bags (JSON): entries are {id} or bare ids.
      for (const m of doc.text.matchAll(/```(?:json)?\n([\s\S]*?)```/g)) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(m[1]!);
        } catch {
          continue;
        }
        const walk = (v: unknown): void => {
          if (Array.isArray(v)) {
            for (const e of v) walk(e);
            return;
          }
          if (v !== null && typeof v === "object") {
            for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
              if (k === "loras" && Array.isArray(e)) {
                for (const entry of e) {
                  const id = typeof entry === "string" ? entry : (entry as Record<string, unknown>)?.["id"];
                  if (typeof id === "string" && id.length > 0 && !loraIds.has(id)) {
                    offenders.push(`${doc.file} — fenced loras bag names row id "${id}", which no served catalog carries`);
                  }
                }
              }
              walk(e);
            }
          }
        };
        walk(parsed);
      }
    }
    vassert.deepStrictEqual(offenders, [], "served leaves naming lora rows no family catalog carries:\n" + offenders.join("\n"));
  });

  vit0("ARM 3 — skill ids in served leaves round-trip the id namespace (card:rig reds)", async () => {
    const defs = await loadCardDefs();
    const { docs, skillNames, unattributed } = await censusDocs();
    vassert.deepStrictEqual(unattributed, [], `unattributed served files:\n${unattributed.join("\n")}`);
    const cards = { defsSync: () => defs };
    const servesAgents = new Map<string, boolean>();
    for (const [id] of defs) {
      const bundle = loadCard(DOC_ROOT, cards as never, null, id) as {
        agents?: Array<{ path: string; text: string }>;
      } | null;
      servesAgents.set(id, (bundle?.agents ?? []).length > 0);
    }
    const offenders: string[] = [];
    for (const doc of docs) {
      const lines = doc.text.split("\n");
      for (const [ln, line] of lines.entries()) {
        // sentence unit (see ARM 1): a retraction wrapping above the
        // token retracts it — a "do not use `card:gone`" wrapped
        // across lines is a warning, never a claim.
        const sent = sentAt(lines, ln);
        if (lineDenied(sent)) continue;
        for (const m of line.matchAll(/`card:([a-z0-9-]+)`/g)) {
          const id = m[1]!;
          // the prose shape (card "id") only claims existence — the
          // card-id arm above judges it. The BACKTICKED skill-id
          // shape claims a servable skill face: the card must ship
          // agents docs, or the id serves nothing.
          if (!servesAgents.get(id) && !deniedFor(sent, m[0]!)) {
            offenders.push(`${doc.file}:${ln + 1} — \`card:${id}\` claims a skill face but no agents doc serves it`);
          }
        }
        // "Skill: `name`" enumerations + "`name` skill" claims
        // (hyphenated names included — backtickIdents is the
        // underscore-identifier shape; skill ids carry hyphens).
        const skillLine = /\b[Ss]kills?:/.test(line);
        for (const m of line.matchAll(/`([A-Za-z0-9_-]+)`/g)) {
          const token = m[1]!;
          if (/^[0-9-]+$/.test(token)) continue;
          const claimed = skillLine || new RegExp(`\`${token.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\`\\s+skills?\\b`).test(line);
          if (!claimed) continue;
          if (deniedFor(sent, `\`${token}\``)) continue;
          if (!skillNames.has(token) && !servesAgents.has(token)) {
            offenders.push(`${doc.file}:${ln + 1} — skill \`${token}\` names no served skill leaf`);
          }
        }
      }
    }
    vassert.ok(skillNames.size >= 10, `the skill namespace derives the served leaves (saw ${skillNames.size} skill names — an empty namespace would pass vacuously)`);
    vassert.deepStrictEqual(offenders, [], "served leaves naming skill ids that serve nothing:\n" + offenders.join("\n"));
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
