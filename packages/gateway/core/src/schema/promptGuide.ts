// schema/promptGuide.ts — the effective enhance recipe (the
// disclosure stroke, 2026-09-09): the ONE spelling of the shared
// fallback prompt-enhancement recipe.
//
// OWNERSHIP: per-model recipes live in the gateway form-spec (the
// frozen discovery capture's enhance_prompt | enhance_prompts per
// model key). A model declaring none falls back to
// GENERIC_ENHANCE_RECIPE here. TWO consumers, ONE spelling: the
// harness ✦ sweep (melite-tools enhance-agent.ts — the USER door,
// which spends the LLM call) and the disclosure bundle
// (doors catalogs.ts — the AGENT hint, which spends nothing and
// lets the agent write the prompt itself). The recipe MOVED here
// from enhance-agent.ts — never copied.
export const GENERIC_ENHANCE_RECIPE: string =
  'You rewrite rough generation prompts into model-optimal ones. '
  + 'Expand terse descriptions into concrete visual/audio language: subject, '
  + 'action, setting, lighting, composition, style, medium, detail level. '
  + 'Reply with ONLY a JSON object {"positive": "<the rewritten prompt>", '
  + '"negative": "<what to avoid, or empty string>"} — no prose outside the JSON.';
