// params.ts — THE AGENT STAGE'S DECLARED CONTRACT (stroke 66, the
// operator's anti-drift law: "DSH github has contracts that ensure
// that fields conform for anti-drift, make sure you do the same").
//
// THE LAW (the estate's card precedent, cited): every card's
// schemastery schema is BOTH the compose gate AND the served form
// (`carrier.toJSON()` at the service, `def.schema(params)` at the
// door) — ONE declared object, zero drift between what the form
// renders and what the engine validates. The vocab module states
// the row-level law: "ONE row gives the dropdown AND the membership
// refusal". THIS FILE is that law for engine 'agent' stages.
//
// Three consumers, one truth each:
//   1. agentParams            — the schemastery object; the form doc
//                               serializes THIS object (toJSON); the
//                               flat fields carry layout metadata.
//   2. agentModKinds(census)  — the mod kinds (the plus-box grammar:
//                               mcps/skills/inputs bags). The entry
//                               field names are CONSTANTS shared with
//                               the normalizer — the form's grammar
//                               cannot drift from the wire's.
//   3. normalizeAgentStageParams — the executor's gate: canonical
//                               strings OR form-bag entries → the
//                               canonical shape, LOUD on anything
//                               else (the estate's message law).
import z from "@deepseek-ai/schemastery";

/** The MCP bag entry's catalog field (the form's select binds this
 *  name; the normalizer reads the same constant). */
export const MCP_ENTRY_FIELD = "server";

/** The skills bag entry's catalog field. */
export const SKILL_ENTRY_FIELD = "skill";

/** The canonical wire (what the executor consumes and what agents
 * compose structurally): mcps string[], skills string[], inputs
 * {name, value}[]. The FORM writes bag entries ({server: "blender"});
 * the normalizer folds both into this shape. */
export interface AgentStageParams {
  task: string;
  model?: string;
  mcps: string[];
  skills: string[];
  inputs: { name: string; value: unknown }[];
  max_turns?: number;
}

/** THE CONTRACT OBJECT — the served form serializes this (toJSON)
 * and the type conformance is declared here, never re-hand-rolled.
 * Layout metadata rides .extra (the card schema grammar): task is
 * the brief's textarea; model names a brain route; max_turns bounds
 * the loop (default unlimited). mcps/skills/inputs are MOD-OWNED
 * (the kinds' param_keys — the mod law excludes them from the flat
 * groups); they are declared here for the wire's truth, not for
 * flat rendering. */
export const agentParams = z.object({
  task: z.string().role("free").description("Task")
    .extra("extra", {
      order: 1, group: "brief", width: 2, wtype: "textarea",
      tooltip: "The brief — what the subagent must get done. Concrete and checkable.",
    }),
  model: z.string().role("free").description("Brain route")
    .extra("extra", {
      order: 2, group: "brief", width: 2,
      tooltip: '"provider/model" — the boot-seated route (MELITE_AGENT_ROUTE) serves when empty.',
    }),
  mcps: z.array(z.any()).description("MCPs")
    .extra("extra", {
      order: 1, group: "mods", width: 2,
      tooltip: "The allow-list: each entry grants one MCP server's tools (mcp__<server>__*).",
    }),
  skills: z.array(z.any()).description("Skills")
    .extra("extra", {
      order: 2, group: "mods", width: 2,
      tooltip: "Spawn-injected leaves — operating instructions read at stage start.",
    }),
  inputs: z.array(z.any()).description("Inputs")
    .extra("extra", {
      order: 3, group: "mods", width: 2,
      tooltip: "The plus-box list: {name, value} entries rendered into the brief.",
    }),
  max_turns: z.number().min(1).max(1000).step(1).description("Max turns")
    .extra("extra", {
      order: 3, group: "brief", width: 1,
      tooltip: "Turn bound — default unlimited (the hard circuit breaker is 1000).",
    }),
});

/** One census row (the LIVE enumeration — served options, never a
 * static list): the seated MCP servers / the skill index leaves. */
export interface CensusRow {
  value: string;
  label: string;
  tooltip?: string;
}

/** The mod kinds (the plus-box grammar — the operator's sketch:
 * "input can function like mods row, where there is always one more
 * 'plus box' to add another"). FIELD kinds: each entry is its own
 * object with a select binding the census — stacking tiles IS the
 * multi-select. The entry field names ride the shared constants. */
export function agentModKinds(census: { mcps: readonly CensusRow[]; skills: readonly CensusRow[] }): Array<Record<string, unknown>> {
  const kinds: Array<Record<string, unknown>> = [
    {
      kind: "agent_mcps",
      label: "MCPs",
      param_key: "mcps",
      cardinality: "list",
      max_stack: 16,
      fields: [{
        name: MCP_ENTRY_FIELD,
        label: "Server",
        type: "select",
        options: census.mcps.map((r) => ({ value: r.value, label: r.label })),
        tooltip: "One seated MCP server — its tools become mcp__<server>__*.",
        default: census.mcps.length > 0 ? census.mcps[0]!.value : "",
      }],
    },
    {
      kind: "agent_skills",
      label: "Skills",
      param_key: "skills",
      cardinality: "list",
      max_stack: 16,
      fields: [{
        name: SKILL_ENTRY_FIELD,
        label: "Skill",
        type: "select",
        options: census.skills.map((r) => ({ value: r.value, label: r.label })),
        tooltip: "One skill leaf, spawn-injected into the brief at stage start.",
        default: census.skills.length > 0 ? census.skills[0]!.value : "",
      }],
    },
    {
      kind: "agent_inputs",
      label: "Inputs",
      param_key: "inputs",
      cardinality: "list",
      max_stack: 32,
      fields: [
        { name: "name", label: "Name", type: "string", default: "", tooltip: "The entry's name (rendered into the brief)." },
        { name: "value", label: "Value", type: "string", default: "", tooltip: "The entry's value." },
      ],
    },
  ];
  return kinds;
}

const plainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** THE EXECUTOR'S GATE — canonical strings OR form-bag entries fold
 *  into the canonical shape; every malformed value refuses LOUD
 *  with the estate's message law (the messages the spec pins). */
export function normalizeAgentStageParams(
  raw: Record<string, unknown>,
  where: string,
  hardCap: number,
): AgentStageParams {
  const task = raw["task"];
  if (typeof task !== "string" || task.length === 0) {
    throw new Error(`${where}: 'task' (the brief) is required`);
  }
  // THE FOLD (both grammars, one wire): a bare string IS the entry;
  // an object must carry the shared entry field — never a silent
  // skip, never a guessed read off the wrong key.
  const fold = (v: unknown, field: string, name: string): string => {
    if (typeof v === "string") {
      if (v.length === 0) throw new Error(`${where}: '${name}' entries must be non-empty strings`);
      return v;
    }
    if (plainObject(v) && typeof v[field] === "string" && (v[field] as string).length > 0) {
      return v[field] as string;
    }
    throw new Error(
      `${where}: '${name}' entries must be non-empty strings (or {${field}: string} rows off the mod form)`,
    );
  };
  const list = (v: unknown, name: string): unknown[] => {
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      throw new Error(`${where}: '${name}' must be an array of strings`);
    }
    return v;
  };
  const mcps = list(raw["mcps"], "mcps").map((e) => fold(e, MCP_ENTRY_FIELD, "mcps"));
  const skills = list(raw["skills"], "skills").map((e) => fold(e, SKILL_ENTRY_FIELD, "skills"));
  const inputsRaw = raw["inputs"];
  const inputs: { name: string; value: unknown }[] = [];
  if (inputsRaw !== undefined && inputsRaw !== null) {
    if (!Array.isArray(inputsRaw)) {
      throw new Error(`${where}: 'inputs' must be an array of {name, value} entries`);
    }
    for (const e of inputsRaw) {
      if (!plainObject(e) || typeof e["name"] !== "string" || (e["name"] as string).length === 0 || !("value" in e)) {
        throw new Error(
          `${where}: 'inputs' entries must be objects {name: string, value: any}`,
        );
      }
      inputs.push({ name: e["name"] as string, value: e["value"] });
    }
  }
  const maxTurns = raw["max_turns"];
  if (
    maxTurns !== undefined &&
    (typeof maxTurns !== "number" || !Number.isInteger(maxTurns) || maxTurns < 1)
  ) {
    throw new Error(`${where}: 'max_turns' must be a positive integer (default unlimited)`);
  }
  if (maxTurns !== undefined && maxTurns > hardCap) {
    throw new Error(
      `${where}: 'max_turns' ${maxTurns} exceeds the hard cap ${hardCap}`,
    );
  }
  const model = raw["model"];
  return {
    task,
    ...(model === undefined ? {} : { model: model as string }),
    mcps,
    skills,
    inputs,
    ...(maxTurns === undefined ? {} : { max_turns: maxTurns }),
  };
}
