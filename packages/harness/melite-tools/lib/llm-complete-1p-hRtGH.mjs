import { CARD_KINDS, SLOT_VOCABULARY, buildCatalog, emitModifierKinds, emitParamsSchema, enhanceRecipeFor, getModel, isServedFamily, liveScanOrder, loadCardDefs, modelIds, registryModel, theService } from "@melite/comfyui-cordis";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/estate.ts
/** Narrow the seat-bound request to the canonical EstateCall the card
* tool builders receive: the seats demand a caller signal (trySeats'
* throwIfAborted), so a signalless call fails HERE with a named error
* instead of deep inside the lane as a TypeError (2026-09-12). */
function asEstateCall(request) {
	return (method, path, body, signal, timeoutMs) => {
		if (signal === void 0) throw new Error(`estate call ${method} ${path} arrived without a caller signal (the seats require cancellation)`);
		return request(method, path, body, signal, timeoutMs);
	};
}
/** Route one KV/runs lane to its seat; undefined = no seat / no match. */
async function trySeats(ctx, method, path, body, signal) {
	const probe = ctx;
	const seats = {
		get draftsRemote() {
			return probe.get("draftsRemote");
		},
		get benchRemote() {
			return probe.get("benchRemote");
		},
		get runs() {
			return probe.get("runs");
		},
		get disclose() {
			return probe.get("disclose");
		},
		get manage() {
			return probe.get("manage");
		},
		get skills() {
			return probe.get("meliteSkills");
		},
		get load() {
			return probe.get("load");
		},
		get queue() {
			return probe.get("queue");
		}
	};
	signal.throwIfAborted();
	if (method === "GET" && path === "/v1/flows/drafts") {
		if (seats.draftsRemote === void 0) return void 0;
		return seats.draftsRemote.list(signal);
	}
	let m = /^\/v1\/flows\/drafts\/([^/?]+)$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.draftsRemote === void 0) return void 0;
		return seats.draftsRemote.get(decodeURIComponent(m[1]), signal);
	}
	if (method === "POST" && path === "/v1/flows/drafts") {
		if (seats.benchRemote === void 0) return void 0;
		if (body === void 0 || typeof body !== "object" || body === null) throw new Error("card compose needs a JSON body");
		const bag = body;
		const intentSrc = typeof bag["prompt"] === "string" && bag["prompt"] !== "" ? bag["prompt"] : typeof bag["intent"] === "string" ? bag["intent"] : "card";
		const intent = intentSrc.length > 80 ? intentSrc.slice(0, 77) + "…" : intentSrc;
		const params = { ...bag["params"] ?? {} };
		if (typeof bag["prompt"] === "string" && bag["prompt"] !== "") params["prompt"] = bag["prompt"];
		const ensure = {
			session: "default",
			intent,
			stages: [{
				id: "s_0",
				engine: "comfyui",
				params
			}]
		};
		const cur = await seats.benchRemote.get("default", signal);
		if (cur !== void 0 && typeof cur["rev"] === "number") ensure["expect_rev"] = cur["rev"];
		const row = await seats.benchRemote.ensure(ensure, signal);
		if (row === void 0 || typeof row["draft_id"] !== "string") throw new Error("card compose returned no draft_id — refusing to start cardless");
		return { draftId: row["draft_id"] };
	}
	m = /^\/v1\/flows\/drafts\/([^/?]+)\/stages\/([^/?]+)(?:\/result)?$/.exec(path);
	if (method === "PATCH" && m !== null) {
		if (seats.draftsRemote === void 0) return void 0;
		if (body === void 0 || typeof body !== "object" || body === null) throw new Error("draft stage patch needs a JSON body");
		return seats.draftsRemote.patch(decodeURIComponent(m[1]), decodeURIComponent(m[2]), body, signal);
	}
	if (method === "POST" && path === "/v1/bench/ensure") {
		if (seats.benchRemote === void 0) return void 0;
		if (body === void 0 || typeof body !== "object" || body === null) throw new Error("bench ensure needs a JSON body");
		return seats.benchRemote.ensure(body, signal);
	}
	m = /^\/v1\/bench\/([^/?]+)$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.benchRemote === void 0) return void 0;
		return seats.benchRemote.get(decodeURIComponent(m[1]), signal);
	}
	if (method === "POST") {
		const arm = /^\/v1\/bench\/([^/?]+)\/(patch|add_stage|remove_stage|rewire|undo)$/.exec(path);
		if (arm !== null) {
			if (seats.benchRemote === void 0) return void 0;
			if (body === void 0 || typeof body !== "object" || body === null) throw new Error(`bench ${arm[2]} needs a JSON body`);
			const session = decodeURIComponent(arm[1]);
			const doc = body;
			switch (arm[2]) {
				case "patch": return seats.benchRemote.patch(session, doc, signal);
				case "add_stage": return seats.benchRemote.addStage(session, doc, signal);
				case "remove_stage": return seats.benchRemote.removeStage(session, doc, signal);
				case "rewire": return seats.benchRemote.rewire(session, doc, signal);
				case "undo": return seats.benchRemote.undo(session, doc, signal);
			}
		}
	}
	if (method === "POST" && path === "/v1/flows/validate") {
		if (seats.runs === void 0) return void 0;
		return seats.runs.validate(body, signal);
	}
	if (method === "POST" && path === "/v1/flows/start") {
		if (seats.runs === void 0) return void 0;
		return seats.runs.start(body, signal);
	}
	m = /^\/v1\/flows\/status\/([^/?]+)(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.runs === void 0) return void 0;
		const first = m[2] === void 0 ? null : m[2].split("&")[0];
		const flagValue = first === null ? "" : first.split("=")[1] ?? "";
		const includeLog = [
			"1",
			"true",
			"yes"
		].includes(decodeURIComponent(flagValue).toLowerCase());
		return seats.runs.status(decodeURIComponent(m[1]), signal, includeLog);
	}
	m = /^\/v1\/flows\/stop\/([^/?]+)$/.exec(path);
	if (method === "POST" && m !== null) {
		if (seats.runs === void 0) return void 0;
		return seats.runs.stop(decodeURIComponent(m[1]), signal);
	}
	m = /^\/v1\/flows\/runs(?:\/|$|\?)/.exec(path);
	if (method === "GET" && m !== null && path !== "/v1/flows/runs/") {
		if (seats.runs === void 0) return void 0;
		const lim = /(?:^|[?&])limit=([^&]*)/.exec(path);
		return seats.runs.list(lim !== null ? decodeURIComponent(lim[1]) : "200", signal);
	}
	m = /^\/v1\/discover(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.disclose === void 0) return void 0;
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.disclose.discover(qs.get("lookup") ?? "all", qs.get("q") ?? "", qs.get("tags") ?? "");
	}
	if (method === "POST" && path === "/v1/manage") {
		if (seats.manage === void 0) return void 0;
		return seats.manage.act(body, signal);
	}
	if (method === "GET" && path === "/v1/skills") {
		if (seats.skills === void 0) return void 0;
		return seats.skills.index();
	}
	m = /^\/v1\/skills\/([^/?]+)$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.skills === void 0) return void 0;
		return seats.skills.read(decodeURIComponent(m[1]), signal);
	}
	m = /^\/v1\/load(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.load === void 0) return void 0;
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.load.load(qs.get("inference_type") ?? "", qs.get("name") ?? "");
	}
	m = /^\/v1\/ledger(?:\?([^/]*))?$/.exec(path);
	if (method === "GET" && m !== null) {
		if (seats.queue === void 0) return [];
		const qs = new URLSearchParams(m[1] ?? "");
		return seats.queue.ledger(qs.get("limit") ?? "50", qs.get("event") ?? "");
	}
}
/** Build the tools' request: seats only, in-process. A lane with no
*  seat is a hard error (the gateway that used to absorb it is
*  dead) — the caller migrates to a named remote. */
function makeEstateRequest(ctx) {
	return async (method, path, body, execSignal) => {
		const viaSeats = await trySeats(ctx, method, path, body, execSignal);
		if (viaSeats !== void 0) return viaSeats;
		throw new Error(`no remote serves ${method} ${path} (the gateway lane fallback died 2026-09-10 — migrate to a named Typert remote)`);
	};
}
//#endregion
//#region src/discovery.ts
/** The boarded map (family -> the card that boards it, first-seen).
*  Exported for the flow tool's bench pass (the card-id alias
*  resolution rides the SAME table form-spec serves — one truth). */
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
		defaults: {
			...v.resolver_defaults ?? {},
			...v.wire_defaults ?? {}
		},
		route: v.route ?? "",
		hint: v.hint ?? null,
		engine: v.engine ?? declEngine,
		quant: null,
		vram_peak_gb: null,
		owner: ""
	};
}
function capQuant(quant) {
	return quant.length > 0 ? quant[0].toUpperCase() + quant.slice(1) : /* v8 ignore next -- !c.quant gate */ quant;
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
				route: c.route,
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
/** The modifier-pack table (the subcard packs). controlnet waits
*  unboarded (the phantom-capability gate). kind/label/cardinality
*  are UI strings with no other live source — one row per pack,
*  stated once.
*  LANPAINT'S ROW (stroke 32 — the operator's missing-seat report:
*  image-edit's required image1 never rendered): the port moved the
*  anchor out of the schema into the lanpaint mod, so the old
*  "rides inline" exemption became a dropped seat — the family
*  boards lanpaint, mod_schemas serves it, compose requires it, but
*  no modifiers entry ever offered the brick. The rail seats the
*  anchor (the client half); this row offers the knobs. */
const MODIFIER_PACKS = {
	loras: {
		kind: "lora",
		label: "LoRAs",
		cardinality: "list",
		entry: "option",
		option_key: "id"
	},
	controlnet: {
		kind: "controlnet",
		label: "ControlNet",
		cardinality: "list",
		max_stack: 5,
		param_key: "controlnets",
		entry: "hybrid",
		option_key: "type"
	},
	mask: {
		kind: "mask",
		label: "Region Mask",
		cardinality: "list",
		max_stack: 1
	},
	lanpaint: {
		kind: "brick",
		label: "Lanpaint",
		cardinality: "list",
		max_stack: 1
	},
	ip_adapter: {
		kind: "ip_adapter",
		label: "IP-Adapter",
		cardinality: "list",
		max_stack: 5,
		param_key: "ip_adapters",
		entry: "hybrid",
		option_key: "kind",
		scalar_key: "weight"
	}
};
function optionTooltip(row, shared) {
	const base = row.tooltip ?? (row.category ? `${row.category} — ${row.filename}` : row.filename);
	return shared ? `${base} — runtime catalog` : base;
}
/** The modifiers offer: one entry per boarded modifier pack (the
*  DECL's mods order, filtered to the pack table). Options ride the
*  pack rows (union-served rows carry the shared suffix); the
*  entry's param rows derive client-side off `mod_schemas[pack]`
*  (the absorbed contract's own toJSON — same walker as the card
*  fields, one meta path). */
function specModifiers(svc, card, key, decl, def) {
	const out = [];
	for (const pack of decl?.mods ?? []) {
		const meta = MODIFIER_PACKS[pack];
		if (meta === void 0) continue;
		const cat = svc.modCatalog(pack, key);
		const entry = {
			kind: meta.kind,
			label: meta.label,
			param_key: meta.param_key ?? pack,
			schema_key: pack,
			cardinality: meta.cardinality
		};
		if (meta.max_stack !== void 0) entry.max_stack = meta.max_stack;
		if (meta.entry !== void 0) entry.entry = meta.entry;
		if (meta.option_key !== void 0) entry.option_key = meta.option_key;
		if (meta.scalar_key !== void 0) entry.scalar_key = meta.scalar_key;
		entry.options = cat.rows.map((r) => ({
			value: r.id,
			label: r.label ?? r.id,
			tooltip: optionTooltip(r, cat.shared),
			defaults: r.default_strength === void 0 && r.default_weight === void 0 && r.steps === void 0 ? {} : Object.fromEntries(Object.entries({
				[meta.scalar_key ?? "strength"]: r.default_strength ?? r.default_weight,
				steps: r.steps
			}).filter(([, v]) => v !== void 0)),
			model: r.filename,
			...r.preprocessor !== void 0 ? { preprocessor: r.preprocessor } : {}
		}));
		out.push(entry);
	}
	for (const k of def?.mods ?? []) {
		if (typeof k.kind !== "string" || k.kind === "" || typeof k.label !== "string" || k.label === "" || typeof k.param_key !== "string" || k.param_key === "" || typeof k.cardinality !== "string" || k.cardinality === "") throw new Error(`form-spec: card '${card}' declares a malformed mod kind (kind/label/param_key/cardinality required) — ${JSON.stringify(k).slice(0, 120)}`);
		const entry = {
			kind: k.kind,
			label: k.label,
			param_key: k.param_key,
			cardinality: k.cardinality
		};
		if (k.entry !== void 0) entry.entry = k.entry;
		if (k.option_key !== void 0) entry.option_key = k.option_key;
		if (k.scalar_key !== void 0) entry.scalar_key = k.scalar_key;
		if (k.max_stack !== void 0) entry.max_stack = k.max_stack;
		if (k.category !== void 0) entry.category = k.category;
		if (k.fields !== void 0) entry.fields = k.fields;
		if (k.kindFields !== void 0) entry.kindFields = k.kindFields;
		if (k.options !== void 0) entry.options = k.options;
		if (k.leaf_face !== void 0) entry.leaf_face = k.leaf_face;
		out.push(entry);
	}
	return out;
}
/** One form-spec envelope (the /v1/form-spec?model= body — the
*  editor's render truth for one served key). Everything scopes to
*  the KEY family; the owner supplies only the service
*  attribution. Keys insert alphabetically (the frozen shape). */
/** The family's DECL face ("MOSS-SFX v2") — registryModel in a
* guard, degrading to the id (the module singleton's law: a read
* that can miss never throws — same shape as the getModel guard
* above). Never the composed variant+quant row. */
function familyFace(fam) {
	try {
		return registryModel(fam).label;
	} catch {
		return fam;
	}
}
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
	const schemas = svc.formSchemas(res.card, key);
	if (schemas === null) throw new Error(`form-spec: card '${res.card}' unknown`);
	const modifiers = specModifiers(svc, res.card, key, decl, def);
	let liveMids;
	try {
		liveMids = new Set(liveScanOrder());
	} catch {
		/* v8 ignore next -- the booted registry serves in practice; an
		empty set degrades to all-absent marks, never a throw */
		liveMids = /* @__PURE__ */ new Set();
	}
	const surface = def.surface ?? {};
	const boarded = def.boarded ?? [];
	const primary = (boarded.length > 0 ? boarded[0] : res.card) === key;
	const inputs = Object.entries(def.flowKinds.inputs).map(([name, kind]) => ({
		name,
		kind
	}));
	return {
		contract: null,
		model_defaults: decl?.defaults ?? {},
		engine: decl?.engine ?? "comfyui",
		enhance_prompt: null,
		enhance_prompts: enhanceRecipeFor(key, res.service) !== null ? { prompt: enhanceRecipeFor(key, res.service) } : {
			prompt: null,
			lyrics: ""
		},
		features: {
			modifiers,
			variant_groups: groupContract(decl)
		},
		...def.preview !== void 0 ? { preview: def.preview } : {},
		form: res.card,
		genre: ident.genre,
		guide: null,
		inputs,
		label: ident.label,
		layout: surface.layout === "studio" ? "studio" : null,
		loader_info: null,
		mod_schemas: schemas.mods,
		model: res.model,
		outputs: def.flowKinds.outputs,
		schema: schemas.schema,
		service: res.service,
		size: surface.size === "huge" ? "huge" : null,
		variants: decl ? specVariants(decl, key, res.service, primary) : [],
		packs: svc.packPresence(def.requiresByFamily?.[key] ?? def.requires ?? []),
		families: (def.boarded ?? []).map((fam) => ({
			id: fam,
			present: liveMids.has(fam),
			label: familyFace(fam)
		}))
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
				covers: boarded.length > 0 ? boarded : [id],
				inputs: def.flowKinds.inputs,
				outputs: def.flowKinds.outputs
			}
		});
	}
	rows.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
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
/** /v1/card-tools — the 1:1 flow port's picker manifests: one row
* per card package, the manifest shape the old ServicePicker renders
* (name/model/stage_title/description/params_schema with declared
* defaults). Projected from the live card defs via emitParamsSchema
* — the same SSOT the form-spec door rides, never a re-derivation. */
async function cardToolsArm() {
	const defs = await loadCardDefs();
	const out = [];
	for (const id of [...defs.keys()].sort()) {
		const def = defs.get(id);
		const ident = def.identity;
		/* v8 ignore next -- loadCardDefs asserts identity (the m1 wall), so live defs always carry it (2026-09-12) */
		if (ident === void 0) continue;
		const boarded = [...def.boarded ?? []];
		const fams = boarded.length > 0 ? boarded : [id];
		const carrier = def.schemaCarrier ?? def.schema;
		const schema = emitParamsSchema(carrier, fams);
		const mods = emitModifierKinds(def.mods);
		out.push({
			name: id,
			version: 1,
			kind: "generation",
			model: fams[0],
			stage_title: ident.label,
			description: ident.description,
			genre: ident.genre,
			families: fams,
			params_schema: schema,
			...mods.length > 0 ? { modifiers: mods } : {}
		});
	}
	return out;
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
/** /v1/forms — the forms table (card rows + the MCP INSTANCE rows:
*  one descriptor row per seated server, §1.5 — the engine-served
*  surface the cards tab lists; the census is the caller's LIVE
*  fold, never static). */
function formsWithEngines(cardRows, mcpServers) {
	const out = { ...cardRows };
	for (const [i, server] of [...mcpServers].sort().entries()) out[`mcp:${server}`] = {
		label: `MCP · ${server}`,
		genre: "3d",
		order: 23 + i,
		plugin: "mcp",
		sidebar_key: "3d",
		default_service: `mcp:${server}`,
		hidden: false,
		covers: [`mcp:${server}`],
		inputs: {},
		outputs: { default: "text" }
	};
	return out;
}
/** /v1/forms — the forms table. */
async function formsArm(mcpServers = []) {
	return formsWithEngines(formsTable(await loadCardDefs()), mcpServers);
}
/** /v1/kinds — the kinds arm. */
async function kindsDoorArm() {
	return kindsArm();
}
/** /v1/form-spec?model=<key> — the envelope, or null when the key
*  does not resolve (the door 404s, same body as ever). */
async function formSpecArm(model, engineDocs) {
	const buildEngine = engineDocs?.get(model);
	if (buildEngine !== void 0) return buildEngine();
	const defs = await loadCardDefs();
	const res = resolveSpecKey(model, defs, boardedMap(defs));
	if (res === null) return null;
	return specBody(theService(), defs, res);
}
//#endregion
//#region src/llm-complete.ts
/** "provider/model" — the only spelling a route is ever named by. */
function routeName(r) {
	return r.provider + "/" + r.model;
}
/** End-to-end deadline for one auxiliary completion (observed live: ~60s). */
const ENHANCE_DEADLINE_MS = 18e4;
/**
* Resolve the harness model routes with ZERO configuration: every
* registered provider route × its advertised models — INTERLEAVED
* round-robin across providers (2026-09-05 fix: registration order
* let ONE keyless provider with many advertised models eat the entire
* attempt budget — observed live: six deepseek-official routes burned
* before the credentialed xiaomi/zai/openrouter providers were ever
* tried). The FIRST healthy route serves; a dead one (quota, auth) is
* stepped past — "no model" cannot happen while any route breathes.
* There is no explicit config knob to misconfigure.
*/
const MAX_ROUTE_ATTEMPTS = 12;
async function resolveHarnessRoutes(llm) {
	const providers = llm.listProviders();
	if (providers.length === 0) throw new Error("enhance: no LLM adapter is registered in the harness host");
	const perProvider = [];
	for (const p of providers) try {
		const models = await llm.listModels(p.id);
		if (models.length > 0) perProvider.push(models.map((m) => ({
			provider: p.id,
			model: m.id
		})));
	} catch {}
	const routes = [];
	for (let i = 0; i < MAX_ROUTE_ATTEMPTS; i++) for (const list of perProvider) if (list[i]) routes.push(list[i]);
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
		messages: [createUserMessage({
			content: [{
				type: "text",
				text: req.prompt
			}],
			source: { kind: "user" }
		})],
		system: req.system + OUTPUT_CONTRACT,
		...req.temperature !== void 0 && Number.isFinite(req.temperature) ? { temperature: req.temperature } : {},
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
		throw new Error("enhance: " + routeName(route) + " failed — " + detail);
	}
	return text;
}
/**
* The door's WIRE CONTRACT, appended to EVERY recipe (2026-09-06,
* live-caught 1:1: the image model's form-spec recipe is pure
* structure rules — no output-format word in it — so the model
* answered "**Prompt:** …" prose and the JSON parse 502'd). The
* {positive, negative} JSON shape is THIS door's requirement, so
* THIS door guarantees it, whatever the per-model recipe says.
*/
const OUTPUT_CONTRACT = "\n\nOutput contract: reply with ONLY a JSON object {\"positive\": \"<the rewritten prompt>\", \"negative\": \"<what to avoid, or empty string>\"} — no prose, no markdown, nothing outside the JSON.";
/**
* Match a caller-named route against the live list. Exact
* "provider/model" wins; a bare "model" must be unambiguous (two
* providers advertising it is a 400 naming both — guessing between
* providers is how silent-DeepSeek happens). Unknown → throw with
* the live list (the route turns it into a 400, never a walk).
*
* `{ quiet: true }` (the preference arm): an unresolvable or
* ambiguous name returns undefined instead of throwing — a
* preference is an ordered candidate, so the caller skips to its
* next arm; every resolve rule above is unchanged.
*
* Version-tail tolerance (2026-09-06, live-caught): the settings
* default names glm-5.3 while the provider advertises glm-4.7 —
* a newer default than the live provider list carries. The named
* model is RESOLVED, never walked: same provider, its NEWEST
* advertised model below the named one in the family line. If the
* provider itself is absent, or nothing matches, the failure stays
* loud with the live list. This is resolution of the user's own
* default, not a fallback to a DIFFERENT provider's model.
*/
function matchHarnessRoute(routes, want, opts) {
	const exact = routes.find((r) => routeName(r) === want);
	if (exact) return exact;
	const bare = routes.filter((r) => r.model === want);
	if (bare.length === 1) return bare[0];
	if (bare.length > 1) {
		if (opts?.quiet === true) return void 0;
		throw new Error("enhance: ambiguous llm \"" + want + "\" — advertised by " + bare.map(routeName).join(", ") + "; name provider/model");
	}
	const provider = want.split("/")[0];
	const stem = (want.split("/")[1] ?? "").replace(/[-.][0-9]+.*$/, "").toLowerCase();
	if (stem !== "") {
		const familyRoutes = routes.filter((r) => r.provider === provider).filter((r) => r.model.toLowerCase() === stem || r.model.toLowerCase().startsWith(stem + "-") || r.model.toLowerCase().startsWith(stem + "."));
		if (familyRoutes.length > 0) {
			const ver = (m) => {
				const t = /[-.]v?([0-9]+(?:[._][0-9]+)*)/.exec(m);
				return t ? Number.parseFloat(t[1].replace("_", ".")) : 0;
			};
			return familyRoutes.reduce((best, r) => ver(r.model) > ver(best.model) ? r : best);
		}
	}
	const live = routes.map(routeName).join(", ");
	if (opts?.quiet === true) return void 0;
	throw new Error("enhance: unknown llm route \"" + want + "\" — live routes: " + live);
}
/**
* Recipe + prompt in, {positive, negative, via} out. THE one enhance
* call. NO WALK, NO FALLBACKS (queue lane law, operator 2026-09-06:
* "No fallbacks. Ever." — the first-breathing walk is what served
* DeepSeek/minimax by luck of registration order and provider
* health):
*
*   - explicit req.llm names the route, else defaultLlm (the
*     agentDefaultModel service's live selection — the user's own
*     default) names it. Explicit wins; NEITHER walks.
*   - preference (operator order, "muse-spark-1.3-contributor i
*     want to use over glm-5v-turbo"): a route name the door
*     prefers BETWEEN explicit and the host default. An ordered
*     candidate, not a contract — a name that does not resolve
*     against the live list is SKIPPED (the default arm serves);
*     a named-live preference that fails to complete is still the
*     honest 502 (no step-past, ever).
*   - unresolvable name → throw naming the live routes (the route
*     maps explicit→400, stale default→502).
*   - the ONE route completes; its failure is the honest error
*     (502 naming route + cause) — never a silent other model.
*
* `via` echoes the serving route. This is the keystore era's shape
* (one configured model, loud otherwise) with the model resolved
* from the host default instead of the retired keystore.
*/
async function harnessEnhance(llm, req, defaultLlm, preference) {
	const routes = await resolveHarnessRoutes(llm);
	const explicit = typeof req.llm === "string" && req.llm.length > 0 ? req.llm : void 0;
	if (explicit !== void 0) {
		const route = matchHarnessRoute(routes, explicit);
		return {
			...parseEnhanceJson(await harnessCompleteOnRoute(llm, route, req)),
			via: routeName(route)
		};
	}
	if (typeof preference === "string" && preference.length > 0) {
		const preferred = matchHarnessRoute(routes, preference, { quiet: true });
		if (preferred !== void 0) return {
			...parseEnhanceJson(await harnessCompleteOnRoute(llm, preferred, req)),
			via: routeName(preferred)
		};
	}
	if (typeof defaultLlm === "string" && defaultLlm.length > 0) {
		const route = matchHarnessRoute(routes, defaultLlm);
		return {
			...parseEnhanceJson(await harnessCompleteOnRoute(llm, route, req)),
			via: routeName(route)
		};
	}
	throw new Error("enhance: no llm named and no host default configured — name llm (\"provider/model\") or set the host default model");
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
export { boardedMap as a, formsArm as c, resolveSpecKey as d, asEstateCall as f, routeName as i, kindsDoorArm as l, matchHarnessRoute as n, cardToolsArm as o, makeEstateRequest as p, resolveHarnessRoutes as r, formSpecArm as s, harnessEnhance as t, modelCatalogArm as u };
