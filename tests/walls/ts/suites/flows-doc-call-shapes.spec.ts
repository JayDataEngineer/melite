// flows-doc-call-shapes.spec.ts — THE SERVED-CALL-SHAPE WALL (H1/H2/
// H3/H9, skills-harness audit 2026-11-13). A served flow doc that
// teaches a call shape the door REFUSES or SILENTLY DROPS costs a
// burning run per guess: extend-video taught `{flow, source_clip,
// extend_prompt}` (the unknown-arg gate refuses the strays),
// object-forge taught a top-level `prompt` (accepted by the arg list,
// never read by the template arm), image-upscale taught `add_stage
// flow` (construct has no flow seat), craft-loop taught a raw
// `{flow_inline}` start body (a banned HTTP shape).
//
// THE LAW: every `melite_flow {…}` snippet in a served flow doc uses
// ONLY the keys the tool's own declared parameter schema publishes —
// the schema IS the door's grammar, so a doc can never teach a key the
// tool would reject, and a new flow param that the doc forgets to
// route through `params` reds here too.
// @contract flows-doc-call-shapes
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { meliteFlow } from "../../../../packages/harness/melite-tools/src/tools/melite-flow.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const FLOWS = join(ROOT, "flows");

/** Every served doc under flows/<id>/ (SKILL.md, AGENT.md, AGENTS.md,
 *  agents/*.md) — the leaves the load plane hands an agent. */
function servedDocs(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".md")) out.push(p);
    }
  };
  if (existsSync(FLOWS)) walk(FLOWS);
  return out;
}

/** THE TOP-LEVEL KEYS of one `melite_flow {…}` snippet: bracket-depth
 *  aware, so `params: {…}` and nested stage rows never leak their own
 *  keys into the judgment. @param body the text between the braces */
function topLevelKeys(body: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;
  let inString: string | null = null;
  while (i < body.length) {
    const ch = body[i]!;
    if (inString !== null) {
      if (ch === "\\") { i += 2; continue }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = ch; i++; continue }
    if (ch === "{" || ch === "[") { depth++; i++; continue }
    if (ch === "}" || ch === "]") { depth--; i++; continue }
    if (depth === 0) {
      const m = /^([A-Za-z_][\w-]*)\s*:/.exec(body.slice(i));
      if (m !== null) {
        const before = i === 0 ? "" : body.slice(0, i).trimEnd().slice(-1);
        if (before === "" || before === "," || before === "{") keys.push(m[1]!);
      }
    }
    i++;
  }
  return keys;
}

/** Every `melite_flow {…}` snippet in one doc, with its brace body.
 *  Handles the docs' ```-fenced JSON blocks and their inline prose
 *  forms alike. @param text the doc's bytes */
function snippets(text: string): string[] {
  const out: string[] = [];
  const re = /melite_flow\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;
    let inString: string | null = null;
    for (; i < text.length; i++) {
      const ch = text[i]!;
      if (inString !== null) {
        if (ch === "\\") { i++; continue }
        if (ch === inString) inString = null;
        continue;
      }
      if (ch === '"' || ch === "'") { inString = ch; continue }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(text.slice(start + 1, i));
  }
  return out;
}

/** The door's declared argument names — defineTool serializes the
 *  param map to a JSON-schema root (`{type, properties:{…}}`), so the
 *  properties ARE the grammar. Both shapes read, so a defineTool
 *  version bump cannot silently empty the reference. */
const DECLARED: string[] = (() => {
  const params = (meliteFlow(null as never) as unknown as {
    parameters?: Record<string, unknown>;
  }).parameters ?? {};
  const props = params["properties"];
  const source = props !== null && typeof props === "object" && !Array.isArray(props)
    ? props as Record<string, unknown>
    : params;
  return Object.keys(source);
})();

describe("THE SERVED-CALL-SHAPE WALL — no flow doc teaches a key the door refuses", () => {
  it("ARM 1 — the reference is the tool's own declared schema, and it is non-empty", () => {
    assert.ok(DECLARED.length > 3,
      "meliteFlow's declared parameters must be readable — the wall judges the door's grammar, never a copy");
    for (const key of ["flow", "params", "bench", "card", "stages", "prompt"]) {
      assert.ok(DECLARED.includes(key), `the door declares '${key}'`);
    }
  });

  it("ARM 2 — every `melite_flow {…}` snippet in every served flow doc uses ONLY declared keys", () => {
    const docs = servedDocs();
    assert.ok(docs.length > 0, "the flow doc walk found nothing — the tree moved");
    const failures: string[] = [];
    let judged = 0;
    for (const file of docs) {
      const text = readFileSync(file, "utf8");
      for (const body of snippets(text)) {
        const keys = topLevelKeys(body);
        if (keys.length === 0) continue;
        judged++;
        const stray = keys.filter((k) => !DECLARED.includes(k));
        if (stray.length > 0) {
          failures.push(
            `${file.slice(ROOT.length + 1)} teaches ${JSON.stringify(stray)} at the call's top level — ` +
              `the door accepts only ${DECLARED.join(" | ")}; a flow's own params ride INSIDE params`,
          );
        }
      }
    }
    assert.ok(judged > 0, "no call snippet was parsed — the walk is vacuous");
    assert.deepEqual(failures, [], "served flow docs teaching refused call shapes:\n" + failures.join("\n"));
  });

  it("ARM 3 — the CONSTRUCTION door is taught only with the args it declares (no `add_stage flow`)", () => {
    const failures: string[] = [];
    for (const file of servedDocs()) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/add_stage\s+flow\b[^\n]*/g)) {
        failures.push(
          `${file.slice(ROOT.length + 1)}: '${m[0].trim()}' — add_stage stages CARDS (card <id>); a flow is ` +
            "driven by melite_flow {flow, params}",
        );
      }
    }
    assert.deepEqual(failures, [], "served docs teaching a construction verb it does not declare:\n" + failures.join("\n"));
  });
});
