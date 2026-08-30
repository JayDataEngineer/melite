//#region src/gateway.ts
/**
* Thin HTTP seam to the Melite gateway (server-js, default :33081).
*
* The gateway STAYS AS-IS — this module is a pure client over the wire
* contract in melite/docs/PROTOCOL.md. Error law: a non-2xx response surfaces
* the gateway's body VERBATIM (`RayGatewayError` message = status + url +
* raw body), because a thrown tool error is materialized by the DSH registry
* as the model-facing error text. Network failures name the URL and the
* underlying cause instead of being swallowed.
*/
/** Gateway answered with a non-2xx status; body carried verbatim. */
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
/** Default Melite gateway base URL (the Bun gateway's loopback listen). */
const DEFAULT_GATEWAY_URL = "http://localhost:33081";
/** Strip one trailing slash so path joins stay single-slash. */
function normalizeGatewayUrl(gatewayUrl) {
	return gatewayUrl.replace(/\/+$/, "");
}
/**
* Fetch JSON from the gateway. The caller's `exec.signal` and a per-call
* timeout are fused (either abort cancels the request); a non-2xx response
* throws `RayGatewayError` carrying the response body verbatim.
*/
async function gatewayRequest(gatewayUrl, method, path, body, execSignal, timeoutMs) {
	const url = `${normalizeGatewayUrl(gatewayUrl)}${path}`;
	const signal = fuseSignals(execSignal, AbortSignal.timeout(timeoutMs));
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
/** Fuse N signals without requiring AbortSignal.any (Node <20 fallback). */
function fuseSignals(...signals) {
	const controller = new AbortController();
	for (const signal of signals) if (signal.aborted) {
		controller.abort(signal.reason);
		return controller.signal;
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
//#endregion
//#region src/json-clean.ts
/**
* Deep JSON-normalization for tool results.
*
* The DSH tool registry rejects non-lossless values (undefined, functions,
* symbols, -0, sparse arrays) in both arguments and results — the exact
* "binding arguments must be lossless JSON" failure W2's live gate caught in
* model_catalog (raw `label: m.label` passthrough leaked `undefined` for
* catalog entries without labels). Every Melite tool result passes through
* jsonClean at the boundary so gateway-shaped data ( SparseMap-like objects
* with undefined fields) can never poison the registry call.
*/
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
//#endregion
//#region src/tools/build-pipeline.ts
const CATALOG_TIMEOUT_MS$1 = 15e3;
const DRAFT_TIMEOUT_MS = 15e3;
function buildPipeline(gatewayUrl) {
	return {
		name: "build_pipeline",
		description: "Compose the action cards for ONE Melite generation (image/video/audio/3D): creates a pipeline draft and the conversation renders the REAL editable card tiles (prompt, model params — refined in the card, run by the user pressing Run). Pick sound defaults and hand it back — do not ask for details first. Args: model (a catalog id from model_catalog) + prompt (+ optional params bag). For options or variations, call it once per variation — the cards stack in the conversation. This tool never executes anything — there is no run tool; ONLY the user starts runs, from the cards.",
		parameters: {
			type: "object",
			properties: {
				model: {
					type: "string",
					description: "Catalog model id (discover with model_catalog), e.g. \"z-image\", \"music3\", \"trellis\"."
				},
				prompt: {
					type: "string",
					description: "Generation prompt (text-to-X). The card carries it; the user can refine it before running."
				},
				params: {
					type: "object",
					additionalProperties: true,
					description: "Extra card params over the model defaults (e.g. {\"seed\":7}). An explicit prompt argument wins over params.prompt."
				}
			},
			required: ["model", "prompt"]
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					card: {
						type: "string",
						description: "Always \"draft\" — editable cards, never a run."
					},
					draftId: {
						type: "string",
						description: "The backend draft id the card surface hydrates."
					},
					stages: {
						type: "array",
						items: {
							type: "object",
							additionalProperties: true
						},
						description: "Slim stage rows (id/title/kind/service) — one per action card."
					}
				},
				required: [
					"card",
					"draftId",
					"stages"
				]
			},
			render: (_args, value) => {
				const v = value;
				const n = Array.isArray(v.stages) ? v.stages.length : 0;
				return [{
					type: "text",
					text: "cards draft " + String(v.draftId ?? "?") + " — " + n + " card" + (n === 1 ? "" : "s") + " (" + String(v.model ?? "?") + ") · the user presses Run on the card"
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			if (typeof a.model !== "string" || a.model.length === 0) throw new Error("build_pipeline: \"model\" is required (a catalog model id string)");
			if (typeof a.prompt !== "string" || a.prompt.length === 0) throw new Error("build_pipeline: \"prompt\" is required (what to put on the card)");
			const cat = await gatewayRequest(gatewayUrl, "GET", "/v1/model-catalog", void 0, exec.signal, CATALOG_TIMEOUT_MS$1);
			const models = cat.models ?? {};
			const entry = models[a.model];
			if (entry === void 0) {
				const near = Object.keys(models).slice(0, 12).join(", ");
				throw new Error("build_pipeline: unknown model \"" + a.model + "\" — catalog has: " + near);
			}
			const familyId = typeof entry.family === "string" ? entry.family : a.model;
			const famLabel = cat.families?.[familyId]?.label;
			const title = typeof famLabel === "string" && famLabel.length > 0 ? famLabel : familyId;
			const defaults = entry.defaults !== null && typeof entry.defaults === "object" && !Array.isArray(entry.defaults) ? entry.defaults : {};
			const bag = a.params !== null && typeof a.params === "object" && !Array.isArray(a.params) ? a.params : {};
			const params = {
				...defaults,
				...bag,
				prompt: a.prompt
			};
			const draft = await gatewayRequest(gatewayUrl, "POST", "/v1/pipelines/drafts", {
				intent: a.prompt,
				stages: [{
					title,
					kind: "generation",
					service: a.model,
					params
				}]
			}, exec.signal, DRAFT_TIMEOUT_MS);
			if (typeof draft.draftId !== "string" || draft.draftId === "") throw new Error("build_pipeline: gateway draft POST returned no draftId");
			return jsonClean({
				card: "draft",
				draftId: draft.draftId,
				model: a.model,
				title,
				stages: Array.isArray(draft.stages) ? draft.stages : []
			});
		}
	};
}
//#endregion
//#region src/llm-complete.ts
/** End-to-end deadline for one auxiliary completion (observed live: ~60s). */
const ENHANCE_DEADLINE_MS = 18e4;
/** Output cap — recipes emit bounded JSON (captions, lyrics), never essays. */
const MAX_TOKENS = 2048;
/**
* Resolve the harness model routes with ZERO configuration: every
* registered provider route × its advertised models, in registration order.
* The FIRST healthy route serves; a dead one (quota, auth) is stepped past —
* "no model" cannot happen while any route breathes. There is no explicit
* config knob to misconfigure.
*/
const MAX_ROUTE_ATTEMPTS = 6;
async function resolveHarnessRoutes(llm) {
	const providers = llm.listProviders();
	if (providers.length === 0) throw new Error("enhance: no LLM adapter is registered in the harness host");
	const routes = [];
	for (const p of providers) try {
		const models = await llm.listModels(p.id);
		for (const m of models) routes.push({
			provider: p.id,
			model: m.id
		});
	} catch {}
	if (routes.length === 0) throw new Error("enhance: no registered harness provider advertises any model");
	return routes.slice(0, MAX_ROUTE_ATTEMPTS);
}
/**
* One streaming completion on ONE exact route, assembled to text. Terminal
* finish reasons other than 'stop' become thrown errors carrying the
* provider failure message + code — never swallowed.
*/
async function harnessCompleteOnRoute(llm, route, req) {
	const timeout = AbortSignal.timeout(ENHANCE_DEADLINE_MS);
	const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
	const options = {
		provider: route.provider,
		model: route.model,
		messages: [{
			role: "user",
			content: [{
				type: "text",
				text: req.prompt
			}],
			source: {
				kind: "plugin",
				plugin: "@melite-plugin/dsh-tools"
			}
		}],
		system: req.system,
		...req.temperature !== void 0 && Number.isFinite(req.temperature) ? { temperature: req.temperature } : {},
		maxTokens: MAX_TOKENS,
		signal
	};
	let text = "";
	let finish = null;
	for await (const chunk of llm.stream(options)) if (chunk.type === "text-delta" && typeof chunk.text === "string") text += chunk.text;
	else if (chunk.type === "finish") {
		const r = chunk.reason;
		finish = {
			kind: typeof r?.kind === "string" ? r.kind : JSON.stringify(r ?? null),
			failure: r?.failure
		};
	}
	if (finish === null) throw new Error("enhance: the harness model stream ended without a terminal finish");
	if (finish.kind !== "stop") {
		const detail = finish.failure ? finish.failure.message + " [" + (finish.failure.code ?? "?") + "]" : finish.kind;
		throw new Error("enhance: harness model call failed — " + detail);
	}
	return text;
}
/**
* Recipe + prompt in, {positive, negative} out. THE one enhance call:
* walk the harness's registered routes until ONE completes (a quota-dead
* or unauthorized route is stepped past — the first healthy model serves),
* then parse the recipe's strict JSON reply. All routes dead → one honest
* error naming every failure.
*/
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
	throw new Error("enhance: every registered harness route failed — " + failures.join(" | "));
}
/**
* Parse the recipe's STRICT JSON reply ({positive, negative}) out of model
* text: direct parse, then fenced, then first-brace slice. All fail → throw
* with the raw head (honest failure, never a silent whole-text positive).
*/
function parseEnhanceJson(text) {
	const attempts = [
		text,
		text.replace(/^```(?:json)?\s*|\s*```$/g, ""),
		text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
	];
	for (const attempt of attempts) try {
		const obj = JSON.parse(attempt);
		if (obj !== null && typeof obj === "object" && typeof obj.positive === "string") return {
			positive: obj.positive,
			negative: typeof obj.negative === "string" ? obj.negative : ""
		};
	} catch {}
	throw new Error("enhance: the model reply was not the recipe JSON — head: " + text.slice(0, 160));
}
//#endregion
//#region src/enhance-agent.ts
/**
* The AGENT-side enhance orchestration — shared by the chat tool and the
* /melite-tools/enhance route's sweep mode. ONE implementation, two doors.
*
* The recipes are SSOT in the gateway form-spec (per-model
* prompt-enhance* SKILL.md files surfaced as enhance_prompt | enhance_prompts).
* Every field completion rides the harness model via llm-complete.ts —
* no keystore, no "no model".
*/
const FORMSPEC_TIMEOUT_MS = 15e3;
/** Read the model's declared recipes straight off the form-spec SSOT. */
async function fetchDeclaredFields(gatewayUrl, model, signal) {
	const spec = await gatewayRequest(gatewayUrl, "GET", "/v1/form-spec?model=" + encodeURIComponent(model), void 0, signal, FORMSPEC_TIMEOUT_MS);
	let fields = {};
	if (spec.enhance_prompts !== null && typeof spec.enhance_prompts === "object" && !Array.isArray(spec.enhance_prompts)) {
		for (const [k, v] of Object.entries(spec.enhance_prompts)) if (typeof v === "string" && v.length > 0) fields[k] = v;
	} else if (typeof spec.enhance_prompt === "string" && spec.enhance_prompt.length > 0) fields = { prompt: spec.enhance_prompt };
	return {
		fields,
		names: Object.keys(fields)
	};
}
/** One field's enhancement through the harness model. */
function enhanceOneField(llm, recipe, prompt, temperature, signal) {
	return harnessEnhance(llm, {
		system: recipe,
		prompt,
		temperature,
		signal
	});
}
/**
* THE SWEEP — every declared field, one press. The route's model-form uses
* this: the CALLER orchestrates (a button, not a conversational agent), so
* unlike the chat tool there is no listing round-trip — all declared fields
* are enhanced sequentially and returned together.
*/
async function agenticSweep(gatewayUrl, llm, opts) {
	const { fields } = await fetchDeclaredFields(gatewayUrl, opts.model, opts.signal);
	const names = Object.keys(fields);
	if (names.length === 0) throw new Error("agentic enhance: model \"" + opts.model + "\" declares no enhance recipe");
	const results = {};
	for (const name of names) results[name] = await enhanceOneField(llm, fields[name], opts.prompt, opts.temperature, opts.signal);
	return {
		model: opts.model,
		results
	};
}
//#endregion
//#region src/tools/enhance-prompt.ts
function enhancePrompt(gatewayUrl, llm) {
	return {
		name: "enhance_prompt",
		description: "Rewrite a rough generation prompt into a model-optimal one using the model's OWN declared recipe (per-model expert system prompts), completed by the DeepSeek harness model itself. Args: model (a catalog id) + prompt (the user's rough words). Most models are SIMPLE: one call returns the enhanced text. Multi-field models (music3: caption + lyrics) are AGENTIC: the first call returns the field list — then call ONCE PER FIELD with field set, handing back every enhanced piece. Never invent fields; only the declared ones exist.",
		parameters: {
			type: "object",
			properties: {
				model: {
					type: "string",
					description: "Catalog model id (discover with model_catalog), e.g. \"z-image\", \"music3\"."
				},
				prompt: {
					type: "string",
					description: "The user's rough words for THIS field."
				},
				field: {
					type: "string",
					description: "Which declared enhance field to rewrite (\"prompt\", \"lyrics\", …). Omit on the FIRST call: single-field models enhance immediately; multi-field models return their field list for per-field follow-ups."
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
					field: {
						type: "string",
						description: "The enhanced field (\"prompt\", \"lyrics\", …); absent on a field-listing response."
					},
					positive: {
						type: "string",
						description: "The enhanced prompt text."
					},
					negative: {
						type: "string",
						description: "Enhanced negative prompt when the model uses negatives, else \"\"."
					},
					fields: {
						type: "array",
						items: { type: "string" },
						description: "Declared enhance fields — present ONLY on the multi-field listing response (call again once per field)."
					}
				},
				required: ["model", "positive"]
			},
			render: (_args, value) => {
				const v = value;
				if (Array.isArray(v.fields) && v.fields.length > 0) return [{
					type: "text",
					text: "enhance fields for " + String(v.model ?? "?") + ": " + v.fields.join(", ") + " — call enhance_prompt once per field with field set"
				}];
				const n = typeof v.positive === "string" ? v.positive.length : 0;
				return [{
					type: "text",
					text: "enhanced " + String(v.model ?? "?") + (v.field ? "." + v.field : "") + " → " + n + " chars · paste onto the card"
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			if (typeof a.model !== "string" || a.model.length === 0) throw new Error("enhance_prompt: \"model\" is required (a catalog model id string)");
			if (typeof a.prompt !== "string") throw new Error("enhance_prompt: \"prompt\" is required (the user's rough words)");
			if (a.field !== void 0 && typeof a.field !== "string") throw new Error("enhance_prompt: \"field\" must be a string when given");
			const { fields, names } = await fetchDeclaredFields(gatewayUrl, a.model, exec.signal);
			const wantsField = typeof a.field === "string" && a.field.length > 0 ? a.field : null;
			if (!wantsField && names.length > 1) return jsonClean({
				model: a.model,
				positive: "",
				fields: names
			});
			const fieldName = wantsField ?? names[0] ?? "";
			if (fieldName === "" || fields[fieldName] === void 0) throw new Error("enhance_prompt: model \"" + a.model + "\" declares no recipe" + (wantsField ? " for field \"" + wantsField + "\"" : "") + (names.length > 0 ? " — declared fields: " + names.join(", ") : " — no enhance recipe at all"));
			const result = await enhanceOneField(llm, fields[fieldName], a.prompt, typeof a.temperature === "number" ? a.temperature : void 0, exec.signal);
			return jsonClean({
				model: a.model,
				field: fieldName,
				positive: result.positive,
				negative: result.negative
			});
		}
	};
}
//#endregion
//#region src/tools/model-catalog.ts
const CATALOG_TIMEOUT_MS = 2e4;
const DEFAULT_LIMIT = 50;
function modelCatalog(gatewayUrl) {
	return {
		name: "model_catalog",
		description: "List Melite's model catalog (GET /v1/model-catalog), compacted: model ids with label/family/form/engines/variant ids/preset keys, plus the capability → default-family map. Filter with query (substring over id, label and family); detail=true adds per-model defaults, presets, variants and the provision source. Use an exact id from here for pipeline_start / compose.",
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
					models: {
						type: "object",
						additionalProperties: true
					},
					capabilities: {
						type: "object",
						additionalProperties: true
					},
					families: {
						type: "object",
						additionalProperties: true
					}
				},
				required: [
					"model_count",
					"returned",
					"models"
				]
			},
			render: (_args, value) => {
				const v = value;
				const lines = [`melite catalog: ${v.returned}/${v.model_count} models`];
				for (const [id, m] of Object.entries(v.models)) lines.push(`  ${id} — ${m.label ?? id} (family=${m.family ?? "?"} form=${m.form ?? "?"})`);
				return [{
					type: "text",
					text: lines.join("\n")
				}];
			}
		},
		async execute(args, exec) {
			const a = args;
			const catalog = await gatewayRequest(gatewayUrl, "GET", "/v1/model-catalog", void 0, exec.signal, CATALOG_TIMEOUT_MS);
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
			for (const [id, c] of Object.entries(catalog.capabilities ?? {})) compactCapabilities[id] = {
				label: c.label,
				description: c.description,
				default_family: c.default_family,
				families: c.families
			};
			const compactFamilies = {};
			for (const [id, f] of Object.entries(catalog.families ?? {})) {
				const entry = f;
				compactFamilies[id] = {
					label: entry.label,
					genre: entry.genre
				};
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
//#endregion
//#region src/tools/provision-model.ts
const PROVISION_TIMEOUT_MS = 3e4;
const STATUS_TIMEOUT_MS = 1e4;
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
					description: "Catalog model id (discover with model_catalog), e.g. \"z-image\"."
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
					queued: {
						type: "boolean",
						description: "true when Manager accepted the install."
					},
					model: { type: "string" },
					detail: {
						type: "string",
						description: "One-line human summary of the queue outcome."
					}
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
			if (typeof a.model !== "string" || a.model.length === 0) throw new Error("provision_model: \"model\" is required (a catalog model id string)");
			const body = { model: a.model };
			if (typeof a.variant === "string" && a.variant.length > 0) body.variant = a.variant;
			const res = await gatewayRequest(gatewayUrl, "POST", "/v1/models/provision", body, exec.signal, PROVISION_TIMEOUT_MS);
			const accepted = res.manager?.accepted === true;
			const workerKicked = res.manager?.worker_kicked === true;
			let statusSnapshot = null;
			try {
				statusSnapshot = await gatewayRequest(gatewayUrl, "GET", "/v1/models/provision/status", void 0, exec.signal, STATUS_TIMEOUT_MS);
			} catch {
				statusSnapshot = null;
			}
			const detail = accepted ? "ACCEPTED by ComfyUI-Manager" + (res.payload?.save_path != null ? " -> " + String(res.payload.save_path) : "") + (workerKicked ? " (worker kicked)" : " (queue/start not confirmed)") : "NOT accepted - see manager.status";
			return jsonClean({
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
		}
	};
}
//#endregion
//#region src/tools/skill-index.ts
const INDEX_TIMEOUT_MS = 15e3;
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
					count: {
						type: "number",
						description: "Skills found."
					},
					skills: {
						type: "array",
						description: "Index rows: id/name/description (+genre/model when scoped)."
					}
				},
				required: ["count", "skills"]
			},
			render: (_args, value) => {
				return [{
					type: "text",
					text: "skill_index: " + String(value.count ?? 0) + " skills (load one with skill_read)"
				}];
			}
		},
		async execute(_args, exec) {
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/skills", void 0, exec.signal, INDEX_TIMEOUT_MS);
			const rows = Array.isArray(res.skills) ? res.skills : [];
			return {
				count: rows.length,
				skills: rows
			};
		}
	};
}
//#endregion
//#region src/tools/skill-read.ts
const READ_TIMEOUT_MS = 15e3;
function skillRead(gatewayUrl) {
	return {
		name: "skill_read",
		description: "Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its name/description and genre/model when scoped. Discover ids first with skill_index. Reads are recorded in the gateway ledger (skill.read) - the audit trail of which recipes informed a generation. Args: id (from skill_index).",
		parameters: {
			type: "object",
			properties: { id: {
				type: "string",
				description: "Skill id from skill_index: \"<stem>\", \"model:<id>\" or \"model:<id>:<stem>\"."
			} },
			required: ["id"]
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					id: { type: "string" },
					name: {
						type: "string",
						description: "Skill title from frontmatter."
					},
					description: {
						type: "string",
						description: "One-line summary."
					},
					content: {
						type: "string",
						description: "The full markdown body."
					}
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
			if (typeof a.id !== "string" || a.id.length === 0) throw new Error("skill_read: \"id\" is required (a skill id string from skill_index)");
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/skills/" + encodeURIComponent(a.id), void 0, exec.signal, READ_TIMEOUT_MS);
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
//#endregion
//#region src/tools/ledger-tail.ts
const LEDGER_TIMEOUT_MS = 15e3;
function ledgerTail(gatewayUrl) {
	return {
		name: "ledger_tail",
		description: "Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server boots). Use to answer \"what happened / what ran / what downloaded\", to resume interrupted work after a restart, or to audit activity. Entries come back oldest -> newest within the tail; pair with skill_read \"run-recovery\" for the full recovery workflow. Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. \"run.\" or \"prov\").",
		parameters: {
			type: "object",
			properties: {
				limit: {
					type: "number",
					description: "How many entries to return (default 50, max 500)."
				},
				event: {
					type: "string",
					description: "Optional event-name prefix filter, e.g. \"run.\", \"prov\", \"skill\"."
				}
			},
			required: []
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: true,
				properties: {
					shown: {
						type: "number",
						description: "Entries returned."
					},
					matched: {
						type: "number",
						description: "Total entries matching the filter."
					},
					entries: {
						type: "array",
						description: "Ledger rows: {ts, event, data}, oldest -> newest."
					}
				},
				required: [
					"shown",
					"matched",
					"entries"
				]
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
			if (typeof a.limit === "number" && Number.isFinite(a.limit) && a.limit > 0) q.push("limit=" + encodeURIComponent(String(Math.floor(a.limit))));
			else if (typeof a.limit === "string" && a.limit.length > 0) q.push("limit=" + encodeURIComponent(a.limit));
			if (typeof a.event === "string" && a.event.length > 0) q.push("event=" + encodeURIComponent(a.event));
			const res = await gatewayRequest(gatewayUrl, "GET", "/v1/ledger" + (q.length > 0 ? "?" + q.join("&") : ""), void 0, exec.signal, LEDGER_TIMEOUT_MS);
			const entries = Array.isArray(res.entries) ? res.entries : [];
			return {
				shown: typeof res.shown === "number" ? res.shown : entries.length,
				matched: typeof res.matched === "number" ? res.matched : entries.length,
				entries
			};
		}
	};
}
//#endregion
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "melite-tools";
/** Services this fiber needs: tools, the host web server, and the harness LLM seam. */
const inject = [
	"tools",
	"webServer",
	"llm"
];
/** The tool names this plugin owns (the diagnostic route filters to these). */
const MELITE_TOOL_NAMES = [
	"model_catalog",
	"build_pipeline",
	"enhance_prompt",
	"provision_model",
	"skill_index",
	"skill_read",
	"ledger_tail"
];
/** Register the Melite tools (+ the /melite-tools/catalog diagnostic route). */
function apply(ctx, config = {}) {
	const c = ctx;
	const gatewayUrl = (config.gatewayUrl ?? "http://localhost:33081").replace(/\/+$/, "");
	c.logger.info("melite-tools: registering %d tools against gateway %s", MELITE_TOOL_NAMES.length, gatewayUrl);
	c.tools.register(modelCatalog(gatewayUrl));
	c.tools.register(buildPipeline(gatewayUrl));
	c.tools.register(provisionModel(gatewayUrl));
	c.tools.register(enhancePrompt(gatewayUrl, c.llm));
	c.tools.register(skillIndex(gatewayUrl));
	c.tools.register(skillRead(gatewayUrl));
	c.tools.register(ledgerTail(gatewayUrl));
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-tools/catalog",
		handler: (_req, res) => {
			const mine = new Set(MELITE_TOOL_NAMES);
			const tools = c.tools.schemas().filter((s) => mine.has(s.name)).map((s) => ({
				name: s.name,
				description: s.description,
				parameters: s.parameters
			}));
			const body = JSON.stringify({
				gateway: gatewayUrl,
				tools
			});
			res.writeHead(200, {
				"content-type": "application/json",
				"content-length": String(Buffer.byteLength(body))
			});
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
				if (typeof body.prompt !== "string" || body.prompt.length === 0) return respond(400, { error: "prompt is a required string" });
				const temperature = typeof body.temperature === "number" ? body.temperature : void 0;
				if (typeof body.model === "string" && body.model.length > 0) return agenticSweep(gatewayUrl, c.llm, {
					model: body.model,
					prompt: body.prompt,
					temperature,
					signal: AbortSignal.timeout(6e5)
				}).then((result) => respond(200, result)).catch((err) => respond(502, { error: err instanceof Error ? err.message : String(err) }));
				if (typeof body.system_prompt !== "string" || body.system_prompt.length === 0) return respond(400, { error: "either model (agent sweep) or system_prompt (one-shot) is required" });
				harnessEnhance(c.llm, {
					system: body.system_prompt,
					prompt: body.prompt,
					temperature
				}).then((result) => respond(200, result)).catch((err) => respond(502, { error: err instanceof Error ? err.message : String(err) }));
			});
		}
	}), "melite-tools: enhance route");
}
//#endregion
export { DEFAULT_GATEWAY_URL, MELITE_TOOL_NAMES, RayGatewayError, apply, inject, name, normalizeGatewayUrl };
