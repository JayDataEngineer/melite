import { a as makeEstateRequest, i as routeName, r as resolveHarnessRoutes, t as harnessEnhance } from "./llm-complete-B3iLioEQ.mjs";
import { CARD_KINDS, SLOT_VOCABULARY, buildCatalog, getModel, isServedFamily, loadCardDefs, modelIds, theService } from "@melite/comfyui-cordis";
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
async function fetchDeclaredFields(request, model, signal) {
	const spec = await request("GET", "/v1/form-spec?model=" + encodeURIComponent(model), void 0, signal, FORMSPEC_TIMEOUT_MS);
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
function enhanceOneField(llm, recipe, prompt, temperature, signal, llmWant, defaultLlm) {
	return harnessEnhance(llm, {
		system: recipe,
		prompt,
		temperature,
		signal,
		...llmWant !== void 0 && llmWant.length > 0 ? { llm: llmWant } : {}
	}, defaultLlm);
}
/**
* GENERIC FALLBACK RECIPE — BACK HOME (the gateway kill,
* 2026-09-10): the ONE spelling lives here, where it was born (the
* disclosure bundle that shared it died with the gateway).
*/
const GENERIC_ENHANCE_RECIPE = "You rewrite rough generation prompts into model-optimal ones. Expand terse descriptions into concrete visual/audio language: subject, action, setting, lighting, composition, style, medium, detail level. Reply with ONLY a JSON object {\"positive\": \"<the rewritten prompt>\", \"negative\": \"<what to avoid, or empty string>\"} — no prose outside the JSON.";
/**
* THE SWEEP — every declared field, one press. The route's model-form uses
* this: the CALLER orchestrates (a button, not a conversational agent), so
* unlike the chat tool there is no listing round-trip — all declared fields
* are enhanced sequentially and returned together. A model with NO declared
* fields sweeps ONE generic 'prompt' field (the shared fallback recipe).
*/
async function agenticSweep(ctx, llm, opts) {
	const { fields } = await fetchDeclaredFields(makeEstateRequest(ctx), opts.model, opts.signal);
	let names = Object.keys(fields);
	if (names.length === 0) names = ["prompt"];
	if (names.length === 1 && fields[names[0]] === void 0) fields[names[0]] = GENERIC_ENHANCE_RECIPE;
	const results = {};
	for (const name of names) results[name] = await enhanceOneField(llm, fields[name], opts.prompt, opts.temperature, opts.signal, opts.llmWant, opts.defaultLlm);
	return {
		model: opts.model,
		results
	};
}
//#endregion
//#region src/discovery.ts
/** The boarded map (family -> the card that boards it, first-seen). */
function boardedMap(defs) {
	const out = /* @__PURE__ */ new Map();
	for (const [cardId, def] of defs) for (const fam of def.boarded ?? []) if (!out.has(fam)) out.set(fam, cardId);
	return out;
}
/** Every route address a family's declaration names (variant routes
*  + cell routes) — the route->owner back edge. */
function declRoutes(decl) {
	const out = /* @__PURE__ */ new Set();
	for (const v of decl.variants ?? []) {
		if (v.route) out.add(v.route);
		for (const c of v.cells ?? []) if (c.route) out.add(c.route);
	}
	return out;
}
function resolveSpecKey(key, defs, boarded) {
	const def = defs.get(key);
	if (def !== void 0 && !isFamilyKey(key)) {
		const boardedFams = def.boarded ?? [];
		const service = boardedFams.length > 0 ? boardedFams[0] : key;
		return {
			card: key,
			service,
			model: service
		};
	}
	let decl;
	try {
		decl = getModel(key);
	} catch {
		return null;
	}
	if (!isServedFamily(decl)) return null;
	const self = boarded.get(key);
	if (self !== void 0) return {
		card: self,
		service: key,
		model: key
	};
	for (const [fam, card] of boarded) {
		let fdecl;
		try {
			fdecl = getModel(fam);
		} catch {
			continue;
		}
		if (declRoutes(fdecl).has(key)) return {
			card,
			service: fam,
			model: key
		};
	}
	return null;
}
/** A key is a family key when a DECL names it (routes and owners
*  alike); otherwise a defs hit is a card-id alias. */
function isFamilyKey(key) {
	try {
		getModel(key);
		return true;
	} catch {
		return false;
	}
}
/** One DECL variant's wire row (the editor Variant contract: all ten
*  keys, always — null/"" for absent, never a missing key). */
function variantRow(v, declEngine) {
	return {
		id: v.id,
		label: v.label,
		group: v.group,
		defaults: v.resolver_defaults ?? {},
		route: v.route ?? "",
		hint: v.hint ?? null,
		engine: v.engine ?? declEngine,
		quant: null,
		vram_peak_gb: null,
		owner: ""
	};
}
function capQuant(quant) {
	return quant.length > 0 ? quant[0].toUpperCase() + quant.slice(1) : quant;
}
/** The key family's variants + its offered quant cells (a cell
*  serves the envelope iff its route is the key, the service owner,
*  or the key is the card's default family. Routeless cells are
*  unaddressable, never offered. Variant rows serve whole (all ten
*  keys, always) regardless of route.) */
function specVariants(decl, key, service, primary) {
	const rows = [];
	const seen = /* @__PURE__ */ new Set();
	const declEngine = decl.engine ?? "";
	for (const v of decl.variants ?? []) {
		rows.push(variantRow(v, declEngine));
		seen.add(v.id);
		for (const c of v.cells ?? []) {
			if (!c.quant || c.hide_from_dropdown === true) continue;
			if (!c.route) continue;
			if (c.route !== key && c.route !== service && !primary) continue;
			const id = seen.has(c.quant) ? `${v.id}__${c.quant}` : c.quant;
			seen.add(id);
			rows.push({
				id,
				label: c.label || capQuant(c.quant),
				group: "Quant",
				defaults: c.resolver_defaults ?? {},
				route: c.route ?? "",
				hint: null,
				engine: c.engine ?? declEngine,
				quant: c.quant,
				vram_peak_gb: c.vram_peak_gb ?? null,
				owner: v.id
			});
		}
	}
	return rows;
}
/** The variant-group contract from the DECL's groups. */
function groupContract(decl) {
	const out = {};
	for (const g of decl?.variant_groups ?? []) {
		const entry = { label: g.label };
		if (g.tooltip) entry.tooltip = g.tooltip;
		if (g.default) entry.default = g.default;
		out[g.id] = entry;
	}
	return out;
}
/** The modifier-pack table (the subcard packs). lanpaint/qvoice ride
*  the spec fields inline, never as subcards, so they have no row
*  here; controlnet waits unboarded (the phantom-capability gate).
*  kind/label/cardinality are UI strings with no other live source —
*  one row per pack, stated once. */
const MODIFIER_PACKS = {
	loras: {
		kind: "lora",
		label: "LoRAs",
		cardinality: "list"
	},
	controlnet: {
		kind: "controlnet",
		label: "ControlNet",
		cardinality: "list"
	},
	mask: {
		kind: "mask",
		label: "Region Mask",
		cardinality: "list",
		max_stack: 1
	}
};
function optionTooltip(row, shared) {
	const base = row.category ? `${row.category} — ${row.filename}` : row.filename;
	return shared ? `${base} — runtime catalog` : base;
}
/** The modifiers offer: one entry per boarded modifier pack (the
*  DECL's mods order, filtered to the pack table). Options ride the
*  pack rows (union-served rows carry the shared suffix); fields
*  ride the pack's schema_groups member rows minus the pack's own
*  stack knob. */
function specModifiers(svc, card, key, decl, schemaGroups) {
	const out = [];
	for (const pack of decl?.mods ?? []) {
		const meta = MODIFIER_PACKS[pack];
		if (meta === void 0) continue;
		const cat = svc.modCatalog(pack, key);
		const groups = /* @__PURE__ */ new Set();
		for (const absorbed of svc.cardModFields(card)) {
			if (absorbed.pack !== pack) continue;
			if (!absorbed.families.includes(key)) continue;
			const dict = absorbed.fields?.dict;
			for (const node of Object.values(dict ?? {})) {
				const extra = node.meta?.extra ?? {};
				if (typeof extra.group === "string") groups.add(extra.group);
			}
		}
		const fields = [];
		for (const g of schemaGroups) {
			if (!groups.has(g.id)) continue;
			for (const f of g.fields) {
				if (f.name === pack) continue;
				fields.push(f);
			}
		}
		const entry = {
			kind: meta.kind,
			label: meta.label,
			param_key: pack,
			cardinality: meta.cardinality
		};
		if (meta.max_stack !== void 0) entry.max_stack = meta.max_stack;
		entry.fields = fields;
		entry.options = cat.rows.map((r) => ({
			value: r.id,
			label: r.label ?? r.id,
			tooltip: optionTooltip(r, cat.shared),
			defaults: r.default_strength === void 0 ? {} : { strength: r.default_strength }
		}));
		out.push(entry);
	}
	return out;
}
/** Card schema defaults for card-only keys (mask-studio declares no
*  DECL — its envelope defaults ride the schema's declared
*  defaults, native JSON types). DECL keys ride the DECL defaults
*  verbatim. */
function schemaDefaults(def) {
	const out = {};
	const dict = (def.schemaCarrier ?? def.schema)?.dict;
	for (const [name, node] of Object.entries(dict ?? {})) {
		const dflt = node?.meta?.default;
		if (dflt !== void 0) out[name] = dflt;
	}
	return out;
}
/** One form-spec envelope (the /v1/form-spec?model= body — the
*  editor's render truth for one served key). Everything scopes to
*  the KEY family; the owner supplies only the service
*  attribution. Keys insert alphabetically (the frozen shape). */
function specBody(svc, defs, res) {
	const def = defs.get(res.card);
	if (def === void 0) throw new Error(`form-spec: unknown card '${res.card}'`);
	const ident = def.identity;
	if (ident === void 0) throw new Error(`form-spec: card '${res.card}' declares no identity`);
	const key = res.model;
	let decl = null;
	try {
		decl = getModel(key);
	} catch {
		decl = null;
	}
	const fs = svc.formSpec(res.card, key);
	if (fs === null) throw new Error(`form-spec: card '${res.card}' unknown`);
	const surface = def.surface ?? {};
	const boarded = def.boarded ?? [];
	const primary = (boarded.length > 0 ? boarded[0] : res.card) === key;
	return {
		contract: null,
		defaults: decl?.defaults ?? schemaDefaults(def),
		engine: decl?.engine ?? "comfyui",
		enhance_prompt: null,
		enhance_prompts: {
			prompt: null,
			lyrics: ""
		},
		features: {
			modifiers: specModifiers(svc, res.card, key, decl, fs.schema_groups),
			variant_groups: groupContract(decl)
		},
		fields: fs.fields,
		form: res.card,
		genre: ident.genre,
		guide: null,
		label: ident.label,
		layout: surface.layout === "studio" ? "studio" : null,
		loader_info: null,
		model: res.model,
		schema_groups: fs.schema_groups,
		service: res.service,
		size: surface.size === "huge" ? "huge" : null,
		variants: decl ? specVariants(decl, key, res.service, primary) : []
	};
}
/** The forms table (the /v1/forms body — card meta only, no fields).
*  Sorted by (sidebar order, card id) — deterministic. */
function formsTable(defs) {
	const rows = [];
	for (const [id, def] of defs) {
		const sidebar = def.sidebar ?? {
			key: "",
			order: 0
		};
		const boarded = [...def.boarded ?? []];
		rows.push({
			id,
			order: typeof sidebar.order === "number" ? sidebar.order : 0,
			row: {
				label: def.identity?.label ?? id,
				genre: def.identity?.genre ?? "",
				order: sidebar.order,
				plugin: "comfyui",
				sidebar_key: sidebar.key,
				default_service: boarded.length > 0 ? boarded[0] : id,
				hidden: sidebar.hidden === true,
				covers: boarded.length > 0 ? boarded : [id]
			}
		});
	}
	rows.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	const out = {};
	for (const r of rows) out[r.id] = r.row;
	return out;
}
/** The kinds arm (the /v1/kinds body — CARD_KINDS in its own
*  alphabetical order, projected to the served seven keys). */
function kindsArm() {
	return { kinds: CARD_KINDS.map((k) => ({
		kind: k.kind,
		runnable: k.runnable,
		executable: k.executable,
		formSpec: k.formSpec,
		compound: k.compound,
		opensStudio: k.opensStudio,
		badgeTone: k.badgeTone
	})) };
}
/** The live card sections (the catalog arm's cards + capabilities —
*  alphabetical by card id). families/default ride boarding
*  (boarded[0] ?? the card itself); principles ride the identity
*  rung. */
function cardSections(defs) {
	const cards = {};
	const capabilities = {};
	for (const id of [...defs.keys()].sort()) {
		const def = defs.get(id);
		const ident = def.identity;
		if (ident === void 0) throw new Error(`catalog: card '${id}' declares no identity`);
		const boarded = [...def.boarded ?? []];
		const fams = boarded.length > 0 ? boarded : [id];
		const df = fams[0];
		cards[id] = {
			id,
			label: ident.label,
			description: ident.description,
			genre: ident.genre,
			families: fams,
			principles: [...ident.principles ?? []],
			skills: [],
			has_inference: false,
			has_rubric: false
		};
		capabilities[id] = {
			label: ident.label,
			description: ident.description,
			default_family: df,
			families: fams,
			kind: "generation",
			icon: ident.icon ?? "",
			resolved: {
				family: df,
				model: df,
				params: {}
			}
		};
	}
	return {
		cards,
		capabilities
	};
}
/** The full live catalog section (models/families ride the registry
*  emission; cards/capabilities ride the cards; the vocabulary rides
*  the slot SSOT). */
function catalogSection(defs) {
	const live = buildCatalog(modelIds().map((id) => getModel(id)));
	const { cards, capabilities } = cardSections(defs);
	return {
		models: live["models"],
		families: live["families"],
		capabilities,
		cards,
		input_vocabulary: SLOT_VOCABULARY
	};
}
/** /v1/model-catalog — the live catalog section. */
async function modelCatalogArm() {
	return catalogSection(await loadCardDefs());
}
/** /v1/forms — the forms table. */
async function formsArm() {
	return formsTable(await loadCardDefs());
}
/** /v1/kinds — the kinds arm. */
async function kindsDoorArm() {
	return kindsArm();
}
/** /v1/form-spec?model=<key> — the envelope, or null when the key
*  does not resolve (the door 404s, same body as ever). */
async function formSpecArm(model) {
	const defs = await loadCardDefs();
	const res = resolveSpecKey(model, defs, boardedMap(defs));
	if (res === null) return null;
	return specBody(theService(), defs, res);
}
//#endregion
//#region src/doors.ts
const inject = [
	"webServer",
	"llm",
	"tools"
];
function apply(c, config = {}) {
	const readDefaultLlm = () => {
		try {
			const sel = c.get("agentDefaultModel")?.currentSelection?.();
			if (typeof sel?.provider === "string" && typeof sel?.model === "string") return sel.provider + "/" + sel.model;
		} catch {}
	};
	/** A signal that fires when the HTTP caller goes away (aborts or
	*  closes) — the fuse leg for long LLM sweeps (row 13). */
	const reqClosedSignal = (req) => {
		const ctrl = new AbortController();
		req.on("close", () => ctrl.abort());
		req.on("aborted", () => ctrl.abort());
		return ctrl.signal;
	};
	const readBody = (req) => new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (d) => {
			if (d) chunks.push(d);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-tools/catalog",
		handler: (_req, res) => {
			const respondCatalog = (llmRoutes) => {
				const body = JSON.stringify({
					tools: c.tools.schemas().map((s) => ({
						name: s.name,
						description: s.description ?? ""
					})),
					llmRoutes
				});
				res.writeHead(200, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			};
			resolveHarnessRoutes(c.llm).then((routes) => respondCatalog(routes.map(routeName)), () => respondCatalog([]));
		}
	}), "melite-tools: catalog route");
	c.effect(() => c.webServer.register({
		kind: "exact",
		path: "/melite-tools/enhance",
		handler: (req, res) => {
			let ok = true;
			const respond = (status, payload) => {
				if (!ok) return;
				ok = false;
				res.writeHead(status, { "content-type": "application/json" });
				res.end(JSON.stringify(payload));
			};
			readBody(req).then((buf) => {
				let body;
				try {
					body = JSON.parse(buf.toString("utf8"));
				} catch {
					return respond(400, { error: "body must be JSON: {system_prompt, prompt, temperature?, llm?} or {model, prompt, temperature?, llm?}" });
				}
				if (typeof body.prompt !== "string" || body.prompt.length === 0) return respond(400, { error: "prompt is a required string" });
				const temperature = typeof body.temperature === "number" ? body.temperature : void 0;
				const llmWant = typeof body.llm === "string" && body.llm.length > 0 ? body.llm : void 0;
				const mapEnhanceError = (err) => {
					const msg = err instanceof Error ? err.message : String(err);
					if (msg.startsWith("enhance: unknown llm route")) {
						const namesDefault = llmWant !== void 0 && msg.includes("\"" + llmWant + "\"");
						return respond(namesDefault ? 400 : 502, { error: msg });
					}
					return respond(502, { error: msg });
				};
				if (typeof body.model === "string" && body.model.length > 0) {
					const sweepSignal = AbortSignal.any([AbortSignal.timeout(6e5), reqClosedSignal(req)]);
					return agenticSweep(c, c.llm, {
						model: body.model,
						prompt: body.prompt,
						temperature,
						signal: sweepSignal,
						...llmWant !== void 0 ? { llmWant } : {},
						defaultLlm: readDefaultLlm()
					}).then((result) => respond(200, result)).catch(mapEnhanceError);
				}
				if (typeof body.system_prompt !== "string" || body.system_prompt.length === 0) return respond(400, { error: "either model (agent sweep) or system_prompt (one-shot) is required" });
				harnessEnhance(c.llm, {
					system: body.system_prompt,
					prompt: body.prompt,
					temperature,
					...llmWant !== void 0 ? { llm: llmWant } : {}
				}, readDefaultLlm()).then((result) => respond(200, result)).catch(mapEnhanceError);
			}).catch((err) => respond(400, { error: `body read failed: ${err instanceof Error ? err.message : String(err)}` }));
		}
	}), "melite-tools: enhance route");
	c.effect(() => c.webServer.register({
		kind: "prefix",
		path: "/v1",
		handler: (req, res) => {
			const ok = (payload) => {
				const body = JSON.stringify(payload);
				res.writeHead(200, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			};
			const fail = (status, payload) => {
				const body = JSON.stringify(payload);
				res.writeHead(status, {
					"content-type": "application/json",
					"content-length": String(Buffer.byteLength(body))
				});
				res.end(Buffer.from(body));
			};
			const url = new URL(req.url ?? "/", "http://localhost");
			const path = url.pathname;
			const method = (req.method ?? "GET").toUpperCase();
			const callerGone = new AbortController();
			res.on("close", () => {
				if (!res.writableEnded) callerGone.abort();
			});
			const signal = callerGone.signal;
			const serve = () => {
				try {
					if (method === "GET" && path === "/v1/model-catalog") {
						modelCatalogArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/forms") {
						formsArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/kinds") {
						kindsDoorArm().then(ok, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
					if (method === "GET" && path === "/v1/form-spec") {
						const model = url.searchParams.get("model") ?? "";
						if (model.length === 0) return fail(400, { error: "form-spec: the model query parameter is required" });
						formSpecArm(model).then((spec) => {
							if (spec === null) return fail(404, { error: `form-spec: '${model}' does not resolve (unknown, unoffered, or retired)` });
							return ok(spec);
						}, (e) => fail(500, { error: `discovery door: ${e instanceof Error ? e.message : String(e)}` }));
						return;
					}
				} catch (error) {
					return fail(500, { error: `discovery door: ${error instanceof Error ? error.message : String(error)}` });
				}
				const request = makeEstateRequest(c);
				if (method === "POST") {
					readBody(req).then((buf) => {
						let body;
						try {
							body = buf.length > 0 ? JSON.parse(buf.toString("utf8")) : {};
						} catch {
							return fail(400, { error: "body must be JSON" });
						}
						request(method, path, body, signal, 12e4).then((value) => ok(value)).catch((error) => fail(502, { error: error instanceof Error ? error.message : String(error) }));
					}).catch((error) => fail(400, { error: `body read failed: ${error instanceof Error ? error.message : String(error)}` }));
					return;
				}
				request(method, path, void 0, signal, 12e4).then((value) => ok(value)).catch((error) => fail(502, { error: error instanceof Error ? error.message : String(error) }));
			};
			return serve();
		}
	}), "melite-tools: /v1 prefix door");
}
//#endregion
export { apply, inject };
