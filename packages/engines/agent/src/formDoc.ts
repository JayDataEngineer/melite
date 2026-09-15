// formDoc.ts — THE AGENT FORM DOC (stroke 66: the card-seam
// generalization — engine-served form specs). The drill renders
// card-less stages from a served FormSpecDoc; engine 'agent' serves
// THIS doc. ANTI-DRIFT: the schema arm serializes the SAME
// agentParams object the executor's gate validates (params.ts) —
// the form and the wire are one declaration, and the wall
// (tests/params.spec.ts) pins the serialization against a golden so
// a change must land consciously in both.
import { agentParams, agentModKinds, type CensusRow } from "./params.ts";

/** The census inputs (served LIVE by the door — never a static
 * list): the seated MCP servers and the skill index leaves. */
export interface AgentFormCensus {
  mcps: readonly CensusRow[];
  skills: readonly CensusRow[];
}

/** The served doc (the FormSpecDoc shape the drill's SpecForm
 * walks: schema envelope + features.modifiers — specBody's arms,
 * mirrored for an engine with no card, no family, no variants). */
export function agentFormDoc(census: AgentFormCensus): Record<string, unknown> {
  return {
    form: "agent",
    genre: "agent",
    engine: "agent",
    // THE CONTRACT'S OWN SERIALIZATION — never a re-hand-rolled
    // field list (the card law: the schema IS the served form).
    schema: agentParams.toJSON(),
    mod_schemas: {},
    model_defaults: {},
    model: "agent",
    families: [],
    variants: [],
    inputs: [],
    outputs: { default: "text" },
    label: "Agent",
    description:
      "Spawn a subagent with a task: a general tool-calling loop on the runs plane. " +
      "MCPs grant tools, skills inject discipline, inputs ride the brief, max turns bounds the loop.",
    layout: null,
    loader_info: null,
    service: "agent",
    size: null,
    enhance_prompts: { prompt: null, lyrics: "" },
    features: {
      modifiers: agentModKinds(census),
      variant_groups: [],
    },
  };
}
