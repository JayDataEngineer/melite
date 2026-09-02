"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_GATEWAY_URL: () => DEFAULT_GATEWAY_URL,
  MELITE_TOOL_NAMES: () => MELITE_TOOL_NAMES,
  RayGatewayError: () => RayGatewayError,
  apply: () => apply,
  buildPipeline: () => buildPipeline,
  cardTools: () => cardTools,
  enhancePrompt: () => enhancePrompt,
  inject: () => inject,
  laneBundle: () => laneBundle,
  ledgerTail: () => ledgerTail,
  modelCatalog: () => modelCatalog,
  name: () => name,
  normalizeGatewayUrl: () => normalizeGatewayUrl,
  provisionModel: () => provisionModel,
  refineDraft: () => refineDraft,
  skillIndex: () => skillIndex,
  skillRead: () => skillRead
});
module.exports = __toCommonJS(index_exports);

// src/gateway.ts
var RayGatewayError = class extends Error {
  status;
  url;
  body;
  constructor(status, url, body) {
    super(`melite gateway ${status} ${url}: ${body}`);
    this.name = "RayGatewayError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
};
var DEFAULT_GATEWAY_URL = "http://localhost:33081";
function normalizeGatewayUrl(gatewayUrl) {
  return gatewayUrl.replace(/\/+$/, "");
}
async function gatewayRequest(gatewayUrl, method, path, body, execSignal, timeoutMs) {
  const url = `${normalizeGatewayUrl(gatewayUrl)}${path}`;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = fuseSignals(execSignal, timeout);
  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers: body === void 0 ? void 0 : { "content-type": "application/json" },
      body: body === void 0 ? void 0 : JSON.stringify(body),
      signal
    });
  } catch (e) {
    if (execSignal.aborted) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`melite gateway unreachable at ${url}: ${msg}`);
  }
  const raw = await resp.text();
  if (!resp.ok) throw new RayGatewayError(resp.status, url, raw);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`melite gateway returned non-JSON at ${url}: ${raw.slice(0, 300)}`);
  }
}
function fuseSignals(...signals) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
  }
  const onAbort = (event) => {
    const target = event.target;
    controller.abort(target.reason);
    cleanup();
  };
  const cleanup = () => {
    for (const signal of signals) signal.removeEventListener("abort", onAbort);
  };
  for (const signal of signals) signal.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

// src/json-clean.ts
function jsonClean(value) {
  return clean(value, /* @__PURE__ */ new WeakMap());
}
function clean(value, seen) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Object.is(value, -0) ? 0 : value;
  if (typeof value === "bigint") return String(value);
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return null;
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i++) out[i] = value[i] === void 0 ? null : clean(value[i], seen);
    return out;
  }
  if (typeof value === "object") {
    const obj = value;
    const hit = seen.get(obj);
    if (hit !== void 0) return hit;
    const out = {};
    seen.set(obj, out);
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v === void 0) continue;
      out[k] = clean(v, seen);
    }
    return out;
  }
  return null;
}

// src/tools/build-pipeline.ts
var CATALOG_TIMEOUT_MS = 15e3;
var DRAFT_TIMEOUT_MS = 15e3;
function buildPipeline(gatewayUrl) {
  return {
    name: "build_pipeline",
    description: "Compose a pipeline from the allowed card tools ONLY. Allowed models: h3-timeline, qwen3_tts_voicedesign, qwen3-tts, music3, krea-2, img-edit. Creates a pipeline draft; the conversation renders editable card tiles (prompt, model params \u2014 refined in the card, run by the user pressing Run). Args: model (one of the allowed models) + prompt (+ optional params bag). This tool never executes anything \u2014 there is no run tool; ONLY the user starts runs, from the cards.",
    parameters: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: 'Catalog model id (discover with model_catalog), e.g. "z-image", "music3", "trellis".'
        },
        prompt: {
          type: "string",
          description: "Generation prompt (text-to-X). The card carries it; the user can refine it before running."
        },
        params: {
          type: "object",
          additionalProperties: true,
          description: 'Extra card params over the model defaults (e.g. {"seed":7}). An explicit prompt argument wins over params.prompt.'
        }
      },
      required: ["model", "prompt"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          card: { type: "string", description: 'Always "draft" \u2014 editable cards, never a run.' },
          draftId: { type: "string", description: "The backend draft id the card surface hydrates." },
          stages: {
            type: "array",
            items: { type: "object", additionalProperties: true },
            description: "Slim stage rows (id/title/kind/service) \u2014 one per action card."
          }
        },
        required: ["card", "draftId", "stages"]
      },
      render: (_args, value) => {
        const v = value;
        const n = Array.isArray(v.stages) ? v.stages.length : 0;
        return [{
          type: "text",
          // The toolview parses the draft id out of this line (content is
          // the render text, not the raw value): it takes the token right
          // after the FIRST 'card ' — so the draft id must come IMMEDIATELY
          // after 'card ' (the gateway card-tools contract), with no other
          // 'card ' occurrence earlier in the line.
          text: "card " + String(v.draftId ?? "?") + " (" + String(v.model ?? "?") + ") \u2014 " + n + " stage" + (n === 1 ? "" : "s") + " \xB7 the user presses Run on the card"
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      if (typeof a.model !== "string" || a.model.length === 0) {
        throw new Error('build_pipeline: "model" is required (a catalog model id string)');
      }
      if (typeof a.prompt !== "string" || a.prompt.length === 0) {
        throw new Error('build_pipeline: "prompt" is required (what to put on the card)');
      }
      const ALLOWED_MODELS = /* @__PURE__ */ new Set([
        "h3-timeline",
        "qwen3_tts_voicedesign",
        "qwen3-tts",
        "music3",
        "krea-2",
        "img-edit"
      ]);
      if (!ALLOWED_MODELS.has(a.model)) {
        throw new Error('build_pipeline: model "' + a.model + '" is not allowed. Use one of: ' + [...ALLOWED_MODELS].join(", "));
      }
      const cat = await gatewayRequest(gatewayUrl, "GET", "/v1/model-catalog", void 0, exec.signal, CATALOG_TIMEOUT_MS);
      const models = cat.models ?? {};
      const entry = models[a.model];
      if (entry === void 0) {
        const near = Object.keys(models).slice(0, 12).join(", ");
        throw new Error('build_pipeline: unknown model "' + a.model + '" \u2014 catalog has: ' + near);
      }
      try {
        const v = await gatewayRequest(
          gatewayUrl,
          "GET",
          "/v1/card-tools/validate?model=" + encodeURIComponent(a.model),
          void 0,
          exec.signal,
          1e4
        );
        if (v.runnable !== true) {
          throw new Error("build_pipeline: " + (v.error || 'model "' + a.model + '" cannot run'));
        }
      } catch (e) {
        if (e instanceof Error && /cannot run/.test(e.message)) throw e;
      }
      const familyId = typeof entry.family === "string" ? entry.family : a.model;
      const famLabel = cat.families?.[familyId]?.label;
      let title = typeof famLabel === "string" && famLabel.length > 0 ? famLabel : familyId;
      let cardDefaults = {};
      try {
        const tools = await gatewayRequest(gatewayUrl, "GET", "/v1/card-tools", void 0, exec.signal, CATALOG_TIMEOUT_MS);
        const manifest = Array.isArray(tools) ? tools.find((t) => t.model === a.model) : void 0;
        if (manifest !== void 0) {
          const st = manifest.stage_title;
          if (typeof st === "string" && st.length > 0) title = st;
          const props = (manifest.params_schema !== null && typeof manifest.params_schema === "object" && manifest.params_schema.properties) ?? {};
          for (const [k, spec] of Object.entries(props)) {
            if (spec.default !== void 0) cardDefaults[k] = spec.default;
          }
        }
      } catch {
      }
      const defaults = entry.defaults !== null && typeof entry.defaults === "object" && !Array.isArray(entry.defaults) ? entry.defaults : {};
      const bag = a.params !== null && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
      const params = { ...cardDefaults, ...defaults, ...bag, prompt: a.prompt };
      const intent = a.prompt.length > 80 ? a.prompt.slice(0, 77) + "\u2026" : a.prompt;
      const draft = await gatewayRequest(gatewayUrl, "POST", "/v1/pipelines/drafts", {
        intent,
        stages: [{
          title,
          kind: "generation",
          service: a.model,
          params
        }]
      }, exec.signal, DRAFT_TIMEOUT_MS);
      if (typeof draft.draftId !== "string" || draft.draftId === "") {
        throw new Error("build_pipeline: gateway draft POST returned no draftId");
      }
      const value = {
        card: "draft",
        draftId: draft.draftId,
        model: a.model,
        title,
        stages: Array.isArray(draft.stages) ? draft.stages : []
      };
      return jsonClean(value);
    }
  };
}

// src/llm-complete.ts
var ENHANCE_DEADLINE_MS = 18e4;
var MAX_TOKENS = 2048;
var MAX_ROUTE_ATTEMPTS = 6;
async function resolveHarnessRoutes(llm) {
  const providers = llm.listProviders();
  if (providers.length === 0) {
    throw new Error("enhance: no LLM adapter is registered in the harness host");
  }
  const routes = [];
  for (const p of providers) {
    try {
      const models = await llm.listModels(p.id);
      for (const m of models) routes.push({ provider: p.id, model: m.id });
    } catch {
    }
  }
  if (routes.length === 0) {
    throw new Error("enhance: no registered harness provider advertises any model");
  }
  return routes.slice(0, MAX_ROUTE_ATTEMPTS);
}
async function harnessCompleteOnRoute(llm, route, req) {
  const timeout = AbortSignal.timeout(ENHANCE_DEADLINE_MS);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
  const options = {
    provider: route.provider,
    model: route.model,
    messages: [{
      role: "user",
      content: [{ type: "text", text: req.prompt }],
      source: { kind: "plugin", plugin: "@melite-plugin/dsh-tools" }
    }],
    system: req.system,
    ...req.temperature !== void 0 && Number.isFinite(req.temperature) ? { temperature: req.temperature } : {},
    maxTokens: MAX_TOKENS,
    signal
  };
  let text = "";
  let finish = null;
  for await (const chunk of llm.stream(options)) {
    if (chunk.type === "text-delta" && typeof chunk.text === "string") {
      text += chunk.text;
    } else if (chunk.type === "finish") {
      const r = chunk.reason;
      finish = {
        kind: typeof r?.kind === "string" ? r.kind : JSON.stringify(r ?? null),
        failure: r?.failure
      };
    }
  }
  if (finish === null) {
    throw new Error("enhance: the harness model stream ended without a terminal finish");
  }
  if (finish.kind !== "stop") {
    const detail = finish.failure ? finish.failure.message + " [" + (finish.failure.code ?? "?") + "]" : finish.kind;
    throw new Error("enhance: harness model call failed \u2014 " + detail);
  }
  return text;
}
async function harnessEnhance(llm, req) {
  const routes = await resolveHarnessRoutes(llm);
  const failures = [];
  for (const route of routes) {
    let text;
    try {
      text = await harnessCompleteOnRoute(llm, route, req);
    } catch (err) {
      failures.push(route.provider + "/" + route.model + ": " + (err instanceof Error ? err.message : String(err)));
      continue;
    }
    try {
      return parseEnhanceJson(text);
    } catch (err) {
      failures.push(route.provider + "/" + route.model + ": " + (err instanceof Error ? err.message : String(err)));
    }
  }
  throw new Error("enhance: every registered harness route failed \u2014 " + failures.join(" | "));
}
function parseEnhanceJson(text) {
  const attempts = [text, text.replace(/^```(?:json)?\s*|\s*```$/g, ""), text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const attempt of attempts) {
    try {
      const obj = JSON.parse(attempt);
      if (obj !== null && typeof obj === "object" && typeof obj.positive === "string") {
        return { positive: obj.positive, negative: typeof obj.negative === "string" ? obj.negative : "" };
      }
    } catch {
    }
  }
  throw new Error("enhance: the model reply was not the recipe JSON \u2014 head: " + text.slice(0, 160));
}

// src/enhance-agent.ts
var FORMSPEC_TIMEOUT_MS = 15e3;
async function fetchDeclaredFields(gatewayUrl, model, signal) {
  const spec = await gatewayRequest(
    gatewayUrl,
    "GET",
    "/v1/form-spec?model=" + encodeURIComponent(model),
    void 0,
    signal,
    FORMSPEC_TIMEOUT_MS
  );
  let fields = {};
  if (spec.enhance_prompts !== null && typeof spec.enhance_prompts === "object" && !Array.isArray(spec.enhance_prompts)) {
    for (const [k, v] of Object.entries(spec.enhance_prompts)) {
      if (typeof v === "string" && v.length > 0) fields[k] = v;
    }
  } else if (typeof spec.enhance_prompt === "string" && spec.enhance_prompt.length > 0) {
    fields = { prompt: spec.enhance_prompt };
  }
  return { fields, names: Object.keys(fields) };
}
function enhanceOneField(llm, recipe, prompt, temperature, signal) {
  return harnessEnhance(llm, {
    system: recipe,
    prompt,
    temperature,
    signal
  });
}
var GENERIC_ENHANCE_RECIPE = 'You rewrite rough generation prompts into model-optimal ones. Expand terse descriptions into concrete visual/audio language: subject, action, setting, lighting, composition, style, medium, detail level. Reply with ONLY a JSON object {"positive": "<the rewritten prompt>", "negative": "<what to avoid, or empty string>"} \u2014 no prose outside the JSON.';
async function agenticSweep(gatewayUrl, llm, opts) {
  const { fields } = await fetchDeclaredFields(gatewayUrl, opts.model, opts.signal);
  let names = Object.keys(fields);
  if (names.length === 0) names = ["prompt"];
  if (names.length === 1 && fields[names[0]] === void 0) {
    fields[names[0]] = GENERIC_ENHANCE_RECIPE;
  }
  const results = {};
  for (const name2 of names) {
    results[name2] = await enhanceOneField(
      llm,
      fields[name2],
      opts.prompt,
      opts.temperature,
      opts.signal
    );
  }
  return { model: opts.model, results };
}

// src/tools/enhance-prompt.ts
function enhancePrompt(gatewayUrl, llm) {
  return {
    name: "enhance_prompt",
    description: "Rewrite a rough generation prompt into a model-optimal one using the model's OWN declared recipe (per-model expert system prompts), completed by the DeepSeek harness model itself. Args: model (a catalog id) + prompt (the user's rough words). Most models are SIMPLE: one call returns the enhanced text. Multi-field models (music3: caption + lyrics) are AGENTIC: the first call returns the field list \u2014 then call ONCE PER FIELD with field set, handing back every enhanced piece. Never invent fields; only the declared ones exist.",
    parameters: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: 'Catalog model id (discover with model_catalog), e.g. "z-image", "music3".'
        },
        prompt: {
          type: "string",
          description: "The user's rough words for THIS field."
        },
        field: {
          type: "string",
          description: 'Which declared enhance field to rewrite ("prompt", "lyrics", \u2026). Omit on the FIRST call: single-field models enhance immediately; multi-field models return their field list for per-field follow-ups.'
        },
        temperature: {
          type: "number",
          description: "Optional sampling temperature override."
        }
      },
      required: ["model", "prompt"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          model: { type: "string" },
          field: { type: "string", description: 'The enhanced field ("prompt", "lyrics", \u2026); absent on a field-listing response.' },
          positive: { type: "string", description: "The enhanced prompt text." },
          negative: { type: "string", description: 'Enhanced negative prompt when the model uses negatives, else "".' },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Declared enhance fields \u2014 present ONLY on the multi-field listing response (call again once per field)."
          }
        },
        required: ["model", "positive"]
      },
      render: (_args, value) => {
        const v = value;
        if (Array.isArray(v.fields) && v.fields.length > 0) {
          return [{
            type: "text",
            text: "enhance fields for " + String(v.model ?? "?") + ": " + v.fields.join(", ") + " \u2014 call enhance_prompt once per field with field set"
          }];
        }
        const n = typeof v.positive === "string" ? v.positive.length : 0;
        return [{
          type: "text",
          text: "enhanced " + String(v.model ?? "?") + (v.field ? "." + v.field : "") + " \u2192 " + n + " chars \xB7 paste onto the card"
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      if (typeof a.model !== "string" || a.model.length === 0) {
        throw new Error('enhance_prompt: "model" is required (a catalog model id string)');
      }
      if (typeof a.prompt !== "string") {
        throw new Error(`enhance_prompt: "prompt" is required (the user's rough words)`);
      }
      if (a.field !== void 0 && typeof a.field !== "string") {
        throw new Error('enhance_prompt: "field" must be a string when given');
      }
      const { fields, names } = await fetchDeclaredFields(gatewayUrl, a.model, exec.signal);
      const wantsField = typeof a.field === "string" && a.field.length > 0 ? a.field : null;
      if (!wantsField && names.length > 1) {
        return jsonClean({ model: a.model, positive: "", fields: names });
      }
      const fieldName = wantsField ?? (names[0] ?? "");
      const recipe = fieldName !== "" && fields[fieldName] !== void 0 ? fields[fieldName] : { system: GENERIC_ENHANCE_RECIPE };
      const usedFallback = fieldName === "" || fields[fieldName] === void 0;
      const result = await enhanceOneField(
        llm,
        recipe,
        a.prompt,
        typeof a.temperature === "number" ? a.temperature : void 0,
        exec.signal
      );
      return jsonClean({
        model: a.model,
        field: fieldName === "" ? "prompt" : fieldName,
        recipe: usedFallback ? "generic" : "model-declared",
        positive: result.positive,
        negative: result.negative
      });
    }
  };
}

// src/tools/lane-bundle.ts
var TIMEOUT_MS = 15e3;
function paramKeys(t) {
  const sch = t.params_schema;
  return sch && typeof sch.properties === "object" ? Object.keys(sch.properties) : [];
}
function laneBundle(gatewayUrl) {
  return {
    name: "lane_bundle",
    description: `Load one inference lane's full bundle (card-tool manifest + skills), or LIST all lanes when called with no arguments. With {lane}: GET /v1/cards/<lane>/bundle \u2192 the lane's card tool(s) with params_schema (the card's input contract) and its skill documents (rules, seam/grid laws, recipes). THE COMPOSE FLOW: lane_bundle(lane) \u2192 read the manifest (tools[0].name is the lane's DEDICATED CARD TOOL \u2014 image_card, tts_card, video_card, three_d_card\u2026) \u2192 call THAT tool with params from its params_schema. build_pipeline(model, prompt) is the generic fallback ONLY when the lane has no card tool. Without arguments: one compact row per lane \u2014 lane key, card tool name, title, param keys. Lane keys resolve by card dir name ("video-gen", "image-gen", "tts", "sfx", "music", "3d-gen", "motion-gen", "body", "humanoid-flow") or by model id ("krea-2", "qwen3-tts", "h3-timeline").`,
    parameters: {
      type: "object",
      properties: {
        lane: {
          type: "string",
          description: 'Optional lane key. Omit to LIST all lanes. Card-dir style ("image-gen", "tts") or model id ("krea-2", "qwen3-tts").'
        }
      },
      required: []
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          mode: { type: "string", description: '"list" (no lane given) or "bundle".' },
          lanes: {
            type: "array",
            description: "List mode: one row per lane {lane, card, title, description, params}."
          },
          lane: { type: "string", description: "Bundle mode: the resolved lane name." },
          tools: { type: "array", description: "Bundle mode: card manifests with params_schema + constraints." },
          skills: { type: "array", description: "Bundle mode: the lane's skill documents (id/name/description)." }
        },
        required: ["mode"]
      },
      render: (_args, value) => {
        const v = value;
        if (v.mode === "list") {
          const n = Array.isArray(v.lanes) ? v.lanes.length : 0;
          return [{
            type: "text",
            text: "lane_bundle: " + String(n) + " lanes \u2014 " + (v.lanes ?? []).map((l) => String(l.lane ?? "?")).join(", ")
          }];
        }
        const nTools = Array.isArray(v.tools) ? v.tools.length : 0;
        const nSkills = Array.isArray(v.skills) ? v.skills.length : 0;
        return [{
          type: "text",
          text: "lane_bundle " + String(v.lane ?? "?") + ": " + String(nTools) + " tool(s), " + String(nSkills) + " skill(s) \u2014 read the skills, then build_pipeline"
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      if (typeof a.lane !== "string" || a.lane.length === 0) {
        const manifests = await gatewayRequest(
          gatewayUrl,
          "GET",
          "/v1/card-tools",
          void 0,
          exec.signal,
          TIMEOUT_MS
        );
        const rows = (Array.isArray(manifests) ? manifests : []).filter((m) => typeof m?.name === "string" && typeof m?.model === "string").map((m) => ({
          lane: String(m.model),
          card: typeof m.name === "string" ? m.name : null,
          title: typeof m.stage_title === "string" ? m.stage_title : null,
          description: typeof m.description === "string" ? m.description : null,
          params: paramKeys(m)
        }));
        return jsonClean({ mode: "list", lanes: rows, lane_count: rows.length });
      }
      const lane = a.lane;
      const res = await gatewayRequest(
        gatewayUrl,
        "GET",
        "/v1/cards/" + encodeURIComponent(lane) + "/bundle",
        void 0,
        exec.signal,
        TIMEOUT_MS
      );
      const tools = Array.isArray(res.tools) ? res.tools.map((t) => ({
        name: t.name,
        model: t.model,
        description: t.description,
        params_schema: t.params_schema,
        constraints: t.constraints
      })) : [];
      const skills = Array.isArray(res.skills) ? res.skills.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description
      })) : [];
      return jsonClean({
        mode: "bundle",
        lane: res.lane ?? lane,
        tools,
        skills,
        tool_count: tools.length,
        skill_count: skills.length
      });
    }
  };
}

// src/tools/model-catalog.ts
var CATALOG_TIMEOUT_MS2 = 2e4;
var DEFAULT_LIMIT = 50;
function modelCatalog(gatewayUrl) {
  return {
    name: "model_catalog",
    description: "List Melite's model catalog (GET /v1/model-catalog), compacted: model ids with label/family/form/engines/variant ids/preset keys, plus the capability \u2192 default-family map. Filter with query (substring over id, label and family); detail=true adds per-model defaults, presets, variants and the provision source. Use an exact id from here for pipeline_start / compose.",
    // Wire shape (2026-08-22): ctx.tools.register passes parameters through
    // schemaOf() VERBATIM to the provider — no author-map compilation happens
    // on this path. The old author shape (property map with inline
    // required:true) went out as a malformed schema (no type/properties/
    // required keywords), and the model answered every call with empty
    // arguments {} — the "compose: model is required" loop. Full
    // JSON-Schema object or nothing.
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Substring filter over model id, label and family (case-insensitive). Omit for everything."
        },
        limit: {
          type: "integer",
          description: `Max models returned (${DEFAULT_LIMIT} default; the summary counts the total regardless).`
        },
        detail: {
          type: "boolean",
          description: "Include defaults, full presets, variants and the source declaration per matched model."
        }
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          model_count: { type: "integer" },
          returned: { type: "integer" },
          models: { type: "object", additionalProperties: true },
          capabilities: { type: "object", additionalProperties: true },
          families: { type: "object", additionalProperties: true }
        },
        required: ["model_count", "returned", "models"]
      },
      render: (_args, value) => {
        const v = value;
        const lines = [`melite catalog: ${v.returned}/${v.model_count} models`];
        for (const [id, m] of Object.entries(v.models)) {
          lines.push(`  ${id} \u2014 ${m.label ?? id} (family=${m.family ?? "?"} form=${m.form ?? "?"})`);
        }
        return [{ type: "text", text: lines.join("\n") }];
      }
    },
    async execute(args, exec) {
      const a = args;
      const catalog = await gatewayRequest(gatewayUrl, "GET", "/v1/model-catalog", void 0, exec.signal, CATALOG_TIMEOUT_MS2);
      const models = catalog.models ?? {};
      const q = typeof a.query === "string" ? a.query.toLowerCase() : "";
      const matched = Object.entries(models).filter(([id, m]) => {
        if (!q) return true;
        return id.toLowerCase().includes(q) || String(m.label ?? "").toLowerCase().includes(q) || String(m.family ?? "").toLowerCase().includes(q);
      });
      const limit = Math.min(Math.max(Number(a.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1), 500);
      const detail = a.detail === true;
      const compactModels = {};
      for (const [id, m] of matched.slice(0, limit)) {
        const variantIds = Array.isArray(m.variants) ? m.variants.map((v) => v?.id).filter((x) => typeof x === "string") : [];
        const presetKeys = m.presets && typeof m.presets === "object" ? Object.keys(m.presets) : [];
        const base = {
          label: m.label,
          family: m.family,
          form: m.form,
          ...m.capability !== void 0 ? { capability: m.capability } : {},
          ...typeof m.engine === "string" ? { engine: m.engine } : {},
          variants: variantIds,
          presets: presetKeys
        };
        if (detail) {
          base.defaults = m.defaults ?? {};
          base.presets = m.presets ?? {};
          base.variants = m.variants ?? [];
          base.source = m.source ?? null;
        }
        compactModels[id] = base;
      }
      const compactCapabilities = {};
      for (const [id, c] of Object.entries(catalog.capabilities ?? {})) {
        compactCapabilities[id] = {
          label: c.label,
          description: c.description,
          default_family: c.default_family,
          families: c.families
        };
      }
      const compactFamilies = {};
      for (const [id, f] of Object.entries(catalog.families ?? {})) {
        const entry = f;
        compactFamilies[id] = { label: entry.label, genre: entry.genre };
      }
      return jsonClean({
        model_count: Object.keys(models).length,
        returned: Object.keys(compactModels).length,
        truncated: matched.length > limit,
        engine_order: catalog.engine_order ?? [],
        quant_order: catalog.quant_order ?? [],
        models: compactModels,
        capabilities: compactCapabilities,
        families: compactFamilies
      });
    }
  };
}

// src/tools/provision-model.ts
var PROVISION_TIMEOUT_MS = 3e4;
var STATUS_TIMEOUT_MS = 1e4;
function str(v) {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function provisionModel(gatewayUrl) {
  return {
    name: "provision_model",
    description: "Queue the weight download for ONE Melite catalog model (POST /v1/models/provision; ComfyUI-Manager downloads to the executor volume). Use when model_catalog shows a model whose weights are not provisioned yet, when the user asks to fetch/install/download a model, or after an action card failed on missing weights. INFRA UPKEEP only - it queues bytes, runs nothing; there is still no run tool. Args: model (a catalog id from model_catalog) + optional variant id.",
    parameters: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: 'Catalog model id (discover with model_catalog), e.g. "z-image".'
        },
        variant: {
          type: "string",
          description: "Optional variant/route cell id when the model declares variants/quants."
        }
      },
      required: ["model"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          queued: { type: "boolean", description: "true when Manager accepted the install." },
          model: { type: "string" },
          detail: { type: "string", description: "One-line human summary of the queue outcome." }
        },
        required: ["queued", "model"]
      },
      render: (_args, value) => {
        const v = value;
        return [{
          type: "text",
          text: "provision_model " + String(v.model ?? "?") + ": " + String(v.detail ?? (v.queued ? "queued" : "not queued"))
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      if (typeof a.model !== "string" || a.model.length === 0) {
        throw new Error('provision_model: "model" is required (a catalog model id string)');
      }
      const body = { model: a.model };
      if (typeof a.variant === "string" && a.variant.length > 0) body.variant = a.variant;
      const res = await gatewayRequest(
        gatewayUrl,
        "POST",
        "/v1/models/provision",
        body,
        exec.signal,
        PROVISION_TIMEOUT_MS
      );
      const accepted = res.manager?.accepted === true;
      const workerKicked = res.manager?.worker_kicked === true;
      let statusSnapshot = null;
      try {
        statusSnapshot = await gatewayRequest(
          gatewayUrl,
          "GET",
          "/v1/models/provision/status",
          void 0,
          exec.signal,
          STATUS_TIMEOUT_MS
        );
      } catch {
        statusSnapshot = null;
      }
      const detail = accepted ? "ACCEPTED by ComfyUI-Manager" + (res.payload?.save_path != null ? " -> " + String(res.payload.save_path) : "") + (workerKicked ? " (worker kicked)" : " (queue/start not confirmed)") : "NOT accepted - see manager.status";
      const value = jsonClean({
        queued: accepted,
        model: str(res.model) ?? a.model,
        variant: str(res.variant),
        filename: res.payload ? str(res.payload.filename) : null,
        save_path: res.payload ? str(res.payload.save_path) : null,
        url: res.payload ? str(res.payload.url) : null,
        registry_match: res.payload?.registry_match === true,
        manager_status: res.manager ? str(res.manager.status) : null,
        worker_kicked: workerKicked,
        manager_reachable: statusSnapshot ? statusSnapshot.reachable === true : null,
        detail
      });
      return value;
    }
  };
}

// src/tools/refine-draft.ts
var TIMEOUT_MS2 = 15e3;
function refineDraft(gatewayUrl) {
  return {
    name: "refine_draft",
    description: `EDIT an existing action card in place: key-wise MERGE params onto the draft's stage (the same PATCH channel the card editor's Save uses \u2014 the SAME card tile updates, nothing re-stacks). Use after build_pipeline when the user tweaks an existing card ("seed 42", "make it snow", "drop the music layer"). For a NEW generation or a different model, build_pipeline again instead. Args: draftId (from build_pipeline), params (the keys to merge \u2014 e.g. {"seed":42,"prompt":"..."}), optional stage id (default: the draft's first stage).`,
    parameters: {
      type: "object",
      properties: {
        draftId: {
          type: "string",
          description: 'The draft id from build_pipeline (e.g. "draft-6a96...-1").'
        },
        params: {
          type: "object",
          additionalProperties: true,
          description: 'The param keys to merge onto the card (e.g. {"seed":42} or {"prompt":"a red fox in snow"}). Unmentioned keys are left untouched.'
        },
        stage: {
          type: "string",
          description: "Optional stage id within the draft. Omit to target the first stage (the normal one-card case)."
        }
      },
      required: ["draftId", "params"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          card: { type: "string", description: 'Always "draft" \u2014 still a card, never a run.' },
          draftId: { type: "string" },
          stage: { type: "string", description: "The stage id that was patched." },
          params: { type: "object", description: "The stage's full merged params after the patch." }
        },
        required: ["card", "draftId", "stage", "params"]
      },
      render: (_args, value) => {
        const v = value;
        return [{
          type: "text",
          text: "refine_draft " + String(v.draftId ?? "?") + " (stage " + String(v.stage ?? "?") + ") \u2014 card updated in place, the user presses Run when ready"
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      if (typeof a.draftId !== "string" || a.draftId.length === 0) {
        throw new Error('refine_draft: "draftId" is required (the draft id from build_pipeline)');
      }
      if (a.params === null || typeof a.params !== "object" || Array.isArray(a.params)) {
        throw new Error('refine_draft: "params" is required (an object of keys to merge, e.g. {"seed":42})');
      }
      let sid = typeof a.stage === "string" && a.stage.length > 0 ? a.stage : "";
      if (!sid) {
        const doc = await gatewayRequest(
          gatewayUrl,
          "GET",
          "/v1/pipelines/drafts/" + encodeURIComponent(a.draftId),
          void 0,
          exec.signal,
          TIMEOUT_MS2
        );
        const stages2 = Array.isArray(doc.stages) ? doc.stages : [];
        if (stages2.length === 0) {
          throw new Error('refine_draft: draft "' + a.draftId + '" has no stages to patch');
        }
        const first = stages2[0];
        sid = typeof first.id === "string" && first.id.length > 0 ? first.id : "s_0";
      }
      const mergeParams = {};
      for (const [k, v] of Object.entries(a.params)) {
        mergeParams[k] = k === "calls" && Array.isArray(v) ? JSON.stringify(v) : v;
      }
      const updated = await gatewayRequest(
        gatewayUrl,
        "PATCH",
        "/v1/pipelines/drafts/" + encodeURIComponent(a.draftId) + "/stages/" + encodeURIComponent(sid),
        { params: mergeParams },
        exec.signal,
        TIMEOUT_MS2
      );
      const stages = Array.isArray(updated.stages) ? updated.stages : [];
      const patched = stages.find((s) => s.id === sid) ?? stages[0] ?? {};
      const params = patched.params !== null && typeof patched.params === "object" ? patched.params : {};
      return jsonClean({
        card: "draft",
        draftId: updated.draft_id ?? a.draftId,
        stage: sid,
        intent: updated.intent ?? null,
        params
      });
    }
  };
}

// src/tools/skill-index.ts
var INDEX_TIMEOUT_MS = 15e3;
function skillIndex(gatewayUrl) {
  return {
    name: "skill_index",
    description: "List gateway skills (progressive disclosure tier 1): id + name + one-line description per skill, with genre/model when the skill is model-scoped. Cheap scan. Then load ONLY the skill you need with skill_read. Use before generating with an unfamiliar model, when the user asks what this stack can do, or to find the lane recipe for a genre (image/audio/video/3D/text). No arguments.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          count: { type: "number", description: "Skills found." },
          skills: {
            type: "array",
            description: "Index rows: id/name/description (+genre/model when scoped)."
          }
        },
        required: ["count", "skills"]
      },
      render: (_args, value) => {
        const v = value;
        return [{
          type: "text",
          text: "skill_index: " + String(v.count ?? 0) + " skills (load one with skill_read)"
        }];
      }
    },
    async execute(_args, exec) {
      const res = await gatewayRequest(
        gatewayUrl,
        "GET",
        "/v1/skills",
        void 0,
        exec.signal,
        INDEX_TIMEOUT_MS
      );
      const rows = Array.isArray(res.skills) ? res.skills : [];
      return { count: rows.length, skills: rows };
    }
  };
}

// src/tools/skill-read.ts
var READ_TIMEOUT_MS = 15e3;
function skillRead(gatewayUrl) {
  return {
    name: "skill_read",
    description: "Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its name/description and genre/model when scoped. Discover ids first with skill_index. Reads are recorded in the gateway ledger (skill.read) - the audit trail of which recipes informed a generation. Args: id (from skill_index).",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Skill id from skill_index: "<stem>", "model:<id>" or "model:<id>:<stem>".'
        }
      },
      required: ["id"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string" },
          name: { type: "string", description: "Skill title from frontmatter." },
          description: { type: "string", description: "One-line summary." },
          content: { type: "string", description: "The full markdown body." }
        },
        required: ["id", "content"]
      },
      render: (args, value) => {
        const a = args;
        const v = value;
        return [{
          type: "text",
          text: "skill_read " + String(a.id ?? v.id ?? "?") + ": " + String(v.name ?? "loaded")
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      if (typeof a.id !== "string" || a.id.length === 0) {
        throw new Error('skill_read: "id" is required (a skill id string from skill_index)');
      }
      const res = await gatewayRequest(
        gatewayUrl,
        "GET",
        "/v1/skills/" + encodeURIComponent(a.id),
        void 0,
        exec.signal,
        READ_TIMEOUT_MS
      );
      return {
        id: res.id ?? a.id,
        name: res.name ?? null,
        description: res.description ?? null,
        genre: res.genre ?? null,
        model: res.model ?? null,
        content: res.content ?? ""
      };
    }
  };
}

// src/tools/ledger-tail.ts
var LEDGER_TIMEOUT_MS = 15e3;
function ledgerTail(gatewayUrl) {
  return {
    name: "ledger_tail",
    description: 'Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server boots). Use to answer "what happened / what ran / what downloaded", to resume interrupted work after a restart, or to audit activity. Entries come back oldest -> newest within the tail; pair with skill_read "run-recovery" for the full recovery workflow. Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. "run." or "prov").',
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "How many entries to return (default 50, max 500)."
        },
        event: {
          type: "string",
          description: 'Optional event-name prefix filter, e.g. "run.", "prov", "skill".'
        }
      },
      required: []
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          shown: { type: "number", description: "Entries returned." },
          matched: { type: "number", description: "Total entries matching the filter." },
          entries: {
            type: "array",
            description: "Ledger rows: {ts, event, data}, oldest -> newest."
          }
        },
        required: ["shown", "matched", "entries"]
      },
      render: (_args, value) => {
        const v = value;
        return [{
          type: "text",
          text: "ledger_tail: " + String(v.shown ?? 0) + " of " + String(v.matched ?? 0) + " entries"
        }];
      }
    },
    async execute(args, exec) {
      const a = args;
      const q = [];
      if (typeof a.limit === "number" && Number.isFinite(a.limit) && a.limit > 0) {
        q.push("limit=" + encodeURIComponent(String(Math.floor(a.limit))));
      } else if (typeof a.limit === "string" && a.limit.length > 0) {
        q.push("limit=" + encodeURIComponent(a.limit));
      }
      if (typeof a.event === "string" && a.event.length > 0) {
        q.push("event=" + encodeURIComponent(a.event));
      }
      const path = "/v1/ledger" + (q.length > 0 ? "?" + q.join("&") : "");
      const res = await gatewayRequest(
        gatewayUrl,
        "GET",
        path,
        void 0,
        exec.signal,
        LEDGER_TIMEOUT_MS
      );
      const entries = Array.isArray(res.entries) ? res.entries : [];
      return {
        shown: typeof res.shown === "number" ? res.shown : entries.length,
        matched: typeof res.matched === "number" ? res.matched : entries.length,
        entries
      };
    }
  };
}

// src/tools/card-tools.ts
var MANIFEST_TIMEOUT_MS = 15e3;
var DRAFT_TIMEOUT_MS2 = 15e3;
async function gwJson(gatewayUrl, method, path, body, signal, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctl.abort(), { once: true });
  const sessionHdr = { "content-type": "application/json" };
  if (process.env.INF_AGENT_SESSION) sessionHdr["x-agent-session"] = process.env.INF_AGENT_SESSION;
  try {
    const r = await fetch(gatewayUrl.replace(/\/$/, "") + path, {
      method,
      headers: sessionHdr,
      body: body === void 0 ? void 0 : JSON.stringify(body),
      signal: ctl.signal
    });
    const text = await r.text();
    if (!r.ok) throw new Error("gateway " + String(r.status) + ": " + text.slice(0, 300));
    return JSON.parse(text);
  } finally {
    clearTimeout(t);
  }
}
function fail(tool, msg) {
  throw new Error(tool + ": " + msg);
}
function validateCardArgs(m, args) {
  const name2 = m.name;
  const sch = m.params_schema ?? {};
  const props = sch.properties ?? {};
  const req = sch.required ?? [];
  for (const k of req) if (args[k] === void 0) fail(name2, '"' + k + '" is required');
  if (sch.additional_properties === false) {
    for (const k of Object.keys(args)) if (!(k in props)) fail(name2, 'unknown field "' + k + '" (allowed: ' + Object.keys(props).join(", ") + ")");
  }
  const out = {};
  for (const [k, def] of Object.entries(props)) {
    const v = args[k] === void 0 ? def.default : args[k];
    if (v === void 0) continue;
    const t = def.type;
    if (t === "integer" && !(typeof v === "number" && Number.isInteger(v))) fail(name2, k + " must be an integer");
    if (t === "number" && typeof v !== "number") fail(name2, k + " must be a number");
    if (t === "string" && typeof v !== "string") fail(name2, k + " must be a string");
    if (t === "boolean" && typeof v !== "boolean") fail(name2, k + " must be a boolean");
    if (typeof v === "number" && def.min !== void 0 && v < def.min) fail(name2, k + " must be >= " + String(def.min));
    if (typeof v === "number" && def.max !== void 0 && v > def.max) fail(name2, k + " must be <= " + String(def.max));
    if (def.artifact_name === true && typeof v === "string" && (/^https?:\/\//.test(v) || v.includes("/"))) fail(name2, k + " must be an artifact NAME (no URLs, no paths)");
    out[k] = v;
  }
  const cons = m.constraints ?? {};
  const callsProp = props.calls;
  if (callsProp === void 0) return { params: out, calls: null, fps: 0 };
  const calls = Array.isArray(args.calls) ? args.calls : fail(name2, "calls[] is required");
  if (callsProp?.min_items !== void 0 && calls.length < callsProp.min_items) fail(name2, "calls needs at least " + String(callsProp.min_items) + " entry");
  if (callsProp?.max_items !== void 0 && calls.length > callsProp.max_items) fail(name2, "calls exceeds " + String(callsProp.max_items) + " entries");
  const itemProps = callsProp?.items?.properties ?? {};
  const itemReq = callsProp?.items?.required ?? [];
  if (cons.xor_fields) {
    for (const group of cons.xor_fields) {
      const present = group.filter((f2) => args.calls?.some?.((c2) => c2[f2] !== void 0));
      for (let i = 0; i < calls.length; i++) {
        const got = group.filter((f2) => calls[i][f2] !== void 0);
        if (got.length === 0) fail(name2, "calls[" + String(i) + "] needs one of: " + group.join(" / "));
        if (got.length > 1) fail(name2, "calls[" + String(i) + "] has both " + got.join(" + ") + " \u2014 exactly one");
      }
      void present;
    }
  }
  for (let i = 0; i < calls.length; i++) {
    const c2 = calls[i];
    if (typeof c2 !== "object" || c2 === null) fail(name2, "calls[" + String(i) + "] must be an object");
    for (const k of itemReq) if (c2[k] === void 0) fail(name2, "calls[" + String(i) + "]." + k + " is required");
    if (callsProp?.items?.additional_properties === false) {
      for (const k of Object.keys(c2)) if (!(k in itemProps)) fail(name2, "calls[" + String(i) + '] unknown field "' + k + '"');
    }
    for (const [k, def] of Object.entries(itemProps)) {
      const v = c2[k];
      if (v === void 0) continue;
      if (def.type === "integer" && !(typeof v === "number" && Number.isInteger(v))) fail(name2, "calls[" + String(i) + "]." + k + " must be an integer");
      if (def.type === "number" && typeof v !== "number") fail(name2, "calls[" + String(i) + "]." + k + " must be a number");
      if (typeof v === "number" && def.min !== void 0 && v < def.min) fail(name2, "calls[" + String(i) + "]." + k + " must be >= " + String(def.min));
      if (typeof v === "number" && def.max !== void 0 && v > def.max) fail(name2, "calls[" + String(i) + "]." + k + " must be <= " + String(def.max));
      if (def.artifact_name === true && typeof v === "string" && (/^https?:\/\//.test(v) || v.includes("/"))) fail(name2, "calls[" + String(i) + "]." + k + " must be an artifact NAME");
    }
    if (cons.first_item_forbidden && i === 0) {
      for (const k of cons.first_item_forbidden) if (c2[k] !== void 0) fail(name2, "calls[0] must NOT set " + k + " \u2014 there is no previous window");
    }
  }
  if (cons.tile) {
    const t2 = cons.tile;
    if (t2.from_zero && calls[0][t2.start] !== 0) fail(name2, "calls[0]." + String(t2.start) + " must be 0 (the timeline starts at 0)");
    for (let i = 1; i < calls.length; i++) {
      if (calls[i][t2.start] !== calls[i - 1][t2.end]) fail(name2, "calls[" + String(i) + "].start_frame " + String(calls[i][t2.start]) + " does not tile: previous ends at " + String(calls[i - 1][t2.end]));
    }
  }
  if (cons.span) {
    const s2 = cons.span;
    for (let i = 0; i < calls.length; i++) {
      const span = calls[i].end_frame - calls[i].start_frame;
      if (span < s2.min) fail(name2, "calls[" + String(i) + "] span " + String(span) + "f under the " + String(s2.min) + "f floor");
      if (span > s2.max) fail(name2, "calls[" + String(i) + "] span " + String(span) + "f exceeds one window (" + String(s2.max) + "f) \u2014 split the shot");
    }
  }
  const fps = typeof out.fps === "number" ? out.fps : 24;
  return { params: out, calls, fps };
}
async function cardTools(gatewayUrl, signal, lane) {
  const path = lane ? "/v1/card-tools?lane=" + encodeURIComponent(lane) : "/v1/card-tools";
  const manifests = await gwJson(gatewayUrl, "GET", path, void 0, signal, MANIFEST_TIMEOUT_MS);
  if (!Array.isArray(manifests) || manifests.length === 0) {
    if (lane) throw new Error('card-tools: lane "' + lane + '" has no manifest on the gateway');
    return [];
  }
  if (lane && manifests.length !== 1) throw new Error('card-tools: lane "' + lane + '" resolved ' + String(manifests.length) + " manifests (must be exactly 1)");
  const ALLOWED_CARDS = /* @__PURE__ */ new Set([
    "h3_timeline_card",
    "voice_lock_card",
    "tts_card",
    "music_card",
    "image_card",
    "image_edit_card"
  ]);
  const tools = [];
  for (const m of manifests) {
    if (typeof m?.name !== "string" || !m.name || typeof m.model !== "string" || !m.model) continue;
    if (!ALLOWED_CARDS.has(m.name)) continue;
    const toolName = m.name;
    const model = m.model;
    const stageTitle = typeof m.stage_title === "string" && m.stage_title ? m.stage_title : model;
    tools.push({
      name: toolName,
      description: String(m.description ?? toolName),
      parameters: m.params_schema,
      output: {
        schema: { type: "object", additionalProperties: true, properties: { card: { type: "string" }, draftId: { type: "string" } }, required: ["card", "draftId"] },
        render: (_a, v) => [{ type: "text", text: "card " + String(v?.draftId ?? "?") + " (" + model + ") \u2014 " + (Array.isArray(v?.stages) && v.stages.length > 0 ? String(v.stages.length) + " stage" : String(v?.shots ?? 1) + " shot") + ", 1 run" }]
      },
      async execute(args, exec) {
        const a = args ?? {};
        const { params, calls, fps } = validateCardArgs(m, a);
        const intent = typeof a.intent === "string" && a.intent ? a.intent : fail(toolName, "intent is required");
        let doc;
        if (calls === null) {
          doc = {};
          for (const [k, v] of Object.entries(params)) if (k !== "intent") doc[k] = v;
        } else {
          doc = { calls: JSON.stringify(calls), fps, intent };
          for (const [k, v] of Object.entries(params)) if (k !== "calls" && k !== "intent") doc[k] = v;
        }
        const draft = await gwJson(gatewayUrl, "POST", "/v1/pipelines/drafts", {
          intent,
          stages: [{ title: stageTitle, kind: "generation", service: model, params: doc }]
        }, exec?.signal, DRAFT_TIMEOUT_MS2);
        if (typeof draft.draftId !== "string" || draft.draftId === "") fail(toolName, "gateway draft POST returned no draftId");
        const clean2 = (x) => {
          if (Array.isArray(x)) return x.map(clean2);
          if (x && typeof x === "object") {
            const o = {};
            for (const [k, v] of Object.entries(x)) {
              const c4 = clean2(v);
              if (c4 !== void 0) o[k] = c4;
            }
            return o;
          }
          if (typeof x === "function" || x === void 0) return void 0;
          return x;
        };
        if (calls === null) {
          return clean2({
            card: "draft",
            draftId: draft.draftId,
            model,
            title: stageTitle,
            // ONE card = ONE run. The gateway expands to N windows.
            runs: 1,
            stages: Array.isArray(draft.stages) ? draft.stages : []
          });
        }
        const totalFrames = calls[calls.length - 1].end_frame;
        const seams = calls.filter((c3) => c3.first_frame_prev_sec !== void 0).length;
        return clean2({
          card: "draft",
          draftId: draft.draftId,
          model,
          shots: calls.length,
          totalFrames,
          durationSec: Math.round(totalFrames / fps * 100) / 100,
          motionSeams: seams,
          hardCuts: calls.length - 1 - seams,
          // ONE card = ONE run. The gateway expands to N windows.
          // There is no split plan. There is no chaining.
          runs: 1,
          stages: Array.isArray(draft.stages) ? draft.stages : []
        });
      }
    });
  }
  return tools;
}

// src/index.ts
var name = "melite-tools";
var inject = ["tools", "webServer", "llm"];
var MELITE_TOOL_NAMES = [
  "model_catalog",
  "build_pipeline",
  "refine_draft",
  "lane_bundle",
  "enhance_prompt",
  "provision_model",
  "skill_index",
  "skill_read",
  "ledger_tail"
];
async function apply(ctx, config = {}) {
  const c = ctx;
  const envGw = process.env.MELITE_GATEWAY_URL || "";
  const gatewayUrl = (envGw || config.gatewayUrl || DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
  const lane = process.env.MELITE_CARD_TOOLS_LANE || config.lane || "";
  if (lane) {
    const cardToolList = await cardTools(gatewayUrl, void 0, lane);
    if (cardToolList.length !== 1)
      throw new Error('melite-tools lane mode: lane "' + lane + '" must yield exactly 1 tool, got ' + String(cardToolList.length));
    for (const t of cardToolList) c.tools.register(t);
    c.logger.info("melite-tools LANE MODE (%s): 1 tool \u2014 %s", lane, cardToolList[0]?.name ?? "?");
    return;
  }
  c.logger.info("melite-tools: registering %d tools against gateway %s", MELITE_TOOL_NAMES.length, gatewayUrl);
  c.tools.register(modelCatalog(gatewayUrl));
  c.tools.register(buildPipeline(gatewayUrl));
  c.tools.register(refineDraft(gatewayUrl));
  c.tools.register(laneBundle(gatewayUrl));
  c.tools.register(provisionModel(gatewayUrl));
  c.tools.register(enhancePrompt(gatewayUrl, c.llm));
  c.tools.register(skillIndex(gatewayUrl));
  c.tools.register(skillRead(gatewayUrl));
  c.tools.register(ledgerTail(gatewayUrl));
  try {
    const cardToolList = await cardTools(gatewayUrl);
    for (const t of cardToolList) c.tools.register(t);
    c.logger.info("melite-tools: %d card tool(s) from /v1/card-tools", cardToolList.length);
  } catch (e) {
    c.logger.warn("melite-tools: card-tools manifest fetch failed: %s", e instanceof Error ? e.message : e);
  }
  c.effect(() => c.webServer.register({
    kind: "exact",
    path: "/melite-tools/catalog",
    handler: (_req, res) => {
      const mine = new Set(MELITE_TOOL_NAMES);
      const tools = c.tools.schemas().filter((s) => mine.has(s.name)).map((s) => ({ name: s.name, description: s.description, parameters: s.parameters }));
      const body = JSON.stringify({ gateway: gatewayUrl, tools });
      res.writeHead(200, { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)) });
      res.end(Buffer.from(body));
    }
  }), "melite-tools: catalog route");
  c.effect(() => c.webServer.register({
    kind: "exact",
    path: "/melite-tools/enhance",
    handler: (req, res) => {
      const chunks = [];
      let ok = true;
      const respond = (status, payload) => {
        if (!ok) return;
        ok = false;
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      req.on("data", (d) => {
        if (d) chunks.push(d);
      });
      req.on("end", () => {
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          return respond(400, { error: "body must be JSON: {system_prompt, prompt, temperature?} or {model, prompt, temperature?}" });
        }
        if (typeof body.prompt !== "string" || body.prompt.length === 0) {
          return respond(400, { error: "prompt is a required string" });
        }
        const temperature = typeof body.temperature === "number" ? body.temperature : void 0;
        if (typeof body.model === "string" && body.model.length > 0) {
          return agenticSweep(gatewayUrl, c.llm, {
            model: body.model,
            prompt: body.prompt,
            temperature,
            signal: AbortSignal.timeout(6e5)
          }).then((result) => respond(200, result)).catch((err) => respond(502, { error: err instanceof Error ? err.message : String(err) }));
        }
        if (typeof body.system_prompt !== "string" || body.system_prompt.length === 0) {
          return respond(400, { error: "either model (agent sweep) or system_prompt (one-shot) is required" });
        }
        harnessEnhance(c.llm, {
          system: body.system_prompt,
          prompt: body.prompt,
          temperature
        }).then((result) => respond(200, result)).catch((err) => respond(502, { error: err instanceof Error ? err.message : String(err) }));
      });
    }
  }), "melite-tools: enhance route");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_GATEWAY_URL,
  MELITE_TOOL_NAMES,
  RayGatewayError,
  apply,
  buildPipeline,
  cardTools,
  enhancePrompt,
  inject,
  laneBundle,
  ledgerTail,
  modelCatalog,
  name,
  normalizeGatewayUrl,
  provisionModel,
  refineDraft,
  skillIndex,
  skillRead
});
