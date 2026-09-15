// params.ts — THE CRAFT PARAMS CONTRACT (stroke 69: the card-seam
// generalization completed for the second engine). ANTI-DRIFT LAW
// (the operator's pin, stroke 66's precedent): ONE schemastery
// object is BOTH the executor's validation gate AND the served
// form's schema — the wire and the form are one declaration, and
// the golden wall (tests/params.spec.ts) pins the serialization so
// a change lands consciously in both.
import z from "@deepseek-ai/schemastery";

/** The craft stage wire (the four fields, verbatim from the
 * engine's own arms — every LOUD message preserved). */
export interface CraftStageParams {
  prompt: string;
  command: { engine: string; params: Record<string, unknown> };
  model: string | undefined;
  maxIterations: number | undefined;
}

/** THE HARD CAP (the circuit-breaker law — ONE declaration: the
 * gate enforces it, the form's tooltip tells it, the engine
 * re-exports it). */
export const CRAFT_MAX_ITERATIONS_HARD_CAP = 1000;

const commandSchema = z
  .object({
    engine: z.string().description("Engine id").extra("extra", { order: 2, group: "mods", width: 1, tooltip: "The nested engine this craft loop drives (image-gen, agent, …)." }),
    params: z.object({}).description("The nested engine's params").extra("extra", { order: 3, group: "mods", width: 1, wtype: "textarea", tooltip: "The nested engine's stage params as JSON." }),
  })
  .description("Command")
  .extra("extra", { order: 4, group: "mods", width: 2, tooltip: "The nested stage the loop drives — {engine, params} as JSON." });

/** THE CONTRACT: types + form layout + the gate's shape. */
export const craftParams = z.object({
  agent_prompt: z.string().description("Brief")
    .extra("extra", { order: 1, group: "brief", width: 2, wtype: "textarea", tooltip: "The brief — what the craft loop must get done. Concrete and checkable." }),
  model: z.string().description("Model")
    .extra("extra", { order: 2, group: "brief", width: 1, tooltip: "Brain route (provider/model). Empty = the lane default." }),
  command: commandSchema,
  max_iterations: z.number().min(1).max(CRAFT_MAX_ITERATIONS_HARD_CAP).description("Max iterations")
    .extra("extra", { order: 3, group: "brief", width: 1, tooltip: `Bounds the critique loop (default unlimited, hard cap ${CRAFT_MAX_ITERATIONS_HARD_CAP}).` }),
});

/** THE COMMAND ROW GATE (shared spelling): the stage's own
 * command AND the critic's refine verdict walk the same law. */
export function normalizeCraftCommand(v: unknown, where: string): { engine: string; params: Record<string, unknown> } {
  // THE FORM FOLD: a textarea carries a JSON string — fold it; a
  // non-row (string that is not JSON, undefined, array) keeps the
  // wire's ORIGINAL LOUD word — the pinned tests own it.
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`${where}: command must be a JSON object {engine, params}`);
    }
  }
  if (!plainObject(v)) {
    throw new Error(`${where}: command must be a JSON object {engine, params}`);
  }
  if (typeof v["engine"] !== "string" || v["engine"].length === 0) {
    throw new Error(`${where}: 'command' needs a non-empty 'engine' id`);
  }
  if (v["params"] !== undefined && !plainObject(v["params"])) {
    throw new Error(`${where}: 'command' 'params' must be a JSON object`);
  }
  return { engine: v["engine"], params: (v["params"] ?? {}) as Record<string, unknown> };
}

function plainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** THE GATE (the executor consumes this — one spelling of the
 * wire). Accepts the canonical object OR the form's JSON string
 * for `command` (a textarea carries text; the gate folds it). */
export function normalizeCraftStageParams(
  raw: unknown,
  where: string,
  hardCap: number,
): CraftStageParams {
  if (!plainObject(raw)) {
    throw new Error(`${where}: params must be a JSON object`);
  }
  const prompt = raw["agent_prompt"];
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new Error(`${where}: 'agent_prompt' (the brief) is required`);
  }
  let command: unknown = raw["command"];
  if (command === undefined) {
    const inputs = raw["inputs"];
    if (!plainObject(inputs)) {
      throw new Error(`${where}: 'inputs' must be a JSON object carrying 'command'`);
    }
    command = inputs["command"];
  }
  const commandRow = normalizeCraftCommand(command, where);
  const model = raw["model"];
  if (model !== undefined && (typeof model !== "string" || model.length === 0)) {
    throw new Error(`${where}: 'model' must be a non-empty route id`);
  }
  const maxIter = raw["max_iterations"];
  if (maxIter !== undefined && (typeof maxIter !== "number" || !Number.isInteger(maxIter) || maxIter < 1)) {
    throw new Error(`${where}: 'max_iterations' must be a positive integer`);
  }
  if (maxIter !== undefined && maxIter > hardCap) {
    throw new Error(`${where}: 'max_iterations' ${maxIter} exceeds the hard cap ${hardCap}`);
  }
  return {
    prompt,
    command: commandRow,
    model: model as string | undefined,
    maxIterations: maxIter as number | undefined,
  };
}

/** THE SERVED DOC (FormSpecDoc-shaped — the drill renders the loop
 * stage from THIS; the schema arm is the contract's own
 * serialization, never a re-hand-rolled field list). */
export function craftFormDoc(): Record<string, unknown> {
  return {
    form: "craft",
    genre: "craft",
    engine: "craft",
    schema: craftParams.toJSON(),
    mod_schemas: {},
    model_defaults: {},
    model: "craft",
    families: [],
    variants: [],
    inputs: [],
    outputs: { default: "text" },
    label: "Craft",
    description:
      "A critique loop: drive a nested engine stage, judge the artifacts against the brief, refine until done. " +
      "The command names the nested stage; max iterations bounds the loop.",
    layout: null,
    loader_info: null,
    service: "craft",
    size: null,
    enhance_prompts: { prompt: null, lyrics: "" },
    features: {
      modifiers: [],
      variant_groups: [],
    },
  };
}
