import { createRequire } from "node:module";
import { extraOf } from "@melite/contracts/extraKeys";
import { judgeLaneBounds, judgeLaneRelations, judgeLaneSurface, judgeSamplerEnvelope, laneBoundsOf, laneSurfaceOf, samplerEnvelopeCure, unknownQuantVoice, unknownVariantVoice } from "@melite/contracts/laneRelations";
import { Button, DisclosureRow, IconArchiveOutlineRegular, IconPlusOutlineRegular, Input, Menu, Modal, StateDot, Switch, Toast, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives";
import { clsx } from "clsx";
import { readAsDataURL, readAsDataURL as readAsDataURL$1 } from "@melite/formats/readFile";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Fragment as Fragment$1, createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isModelUrl, mediaVocab } from "@melite/contracts/mediaKinds";
import { fitObjectToHeight } from "@melite/formats/glbLoad";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { isTerminalRun, listRowMediaUrl, readRunStatus } from "@melite-plugin/melite-run-wire";
import { fetchBindMesh } from "@melite/formats/poserSkin";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region src/spec.ts
/** Build an envelope from raw dict nodes — the TEST-side and
*  migration-side constructor; the served envelopes come from
*  schemastery's own toJSON. Ids assign in insertion order; a node
*  carrying `consts` (string labels or {value,label} rows) expands
*  into minted const refs with the union's `list` wired to them —
*  the shape schemastery's union-of-consts serializes to. */
function schemaEnvelope(dict) {
	const refs = { 0: {
		type: "object",
		dict: {}
	} };
	let uid = 0;
	for (const [name, raw] of Object.entries(dict)) {
		uid += 1;
		const nodeId = uid;
		const node = { ...raw };
		const consts = node["consts"];
		delete node["consts"];
		if (Array.isArray(consts)) {
			const list = [];
			for (const c of consts) {
				uid += 1;
				if (typeof c === "string") refs[uid] = {
					type: "const",
					value: c
				};
				else if (typeof c === "object" && c !== null) {
					const row = c;
					refs[uid] = {
						type: "const",
						value: row.value,
						...row.label !== void 0 ? { meta: { description: String(row.label) } } : {}
					};
				}
				list.push(uid);
			}
			node.list = list;
			if (node.type === void 0) node.type = "union";
		}
		refs[nodeId] = node;
		refs[0].dict[name] = nodeId;
	}
	return {
		uid: 0,
		refs
	};
}
/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
*  served modifier kind owns — its fields' names plus its param_key
*  (the bag storage). CardForm EXCLUDES these from the flat param
*  groups: mod params render ONLY inside the mod system. PURE. */
function modOwnedFields(spec) {
	const owned = /* @__PURE__ */ new Set();
	for (const k of spec.features?.modifiers ?? []) owned.add(k.param_key);
	for (const env of Object.values(spec.mod_schemas ?? {})) {
		if (env == null) continue;
		const root = env.refs[env.uid];
		for (const name of Object.keys(root?.dict ?? {})) owned.add(name);
	}
	return owned;
}
/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
*  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
function isOptionKind(k) {
	return (k.options ?? []).length > 0;
}
/** THE HYBRID TEST (the served entry mode — never the kind name):
*  catalog rows AND bag-element entry fields. */
function isHybridKind(k) {
	return k.entry === "hybrid";
}
/** The catalog-bound field (the hybrid type / the option id) —
*  'id' when the door serves no key (the lora backstop). */
function optionKeyOf(k) {
	return typeof k.option_key === "string" && k.option_key !== "" ? k.option_key : "id";
}
/** The scalar dial of a bag element (the pack's own name —
*  'strength' backstop when the door serves none). */
function scalarKeyOf(k) {
	return typeof k.scalar_key === "string" && k.scalar_key !== "" ? k.scalar_key : "strength";
}
/** THE TITLE-CASE FACE (the operator's sweep law): machine ids
*  (krea-2, z-image, euler, comfyui…) render titled — never raw.
*  FACES ONLY: option values, param keys, and wire bodies keep the
*  verbatim id (the 1:1 law — the eye gets prose, the door gets the
*  id). First letter of each separator-bound word upper, the rest
*  untouched (INT8 stays INT8); idempotent on titled prose. */
function titleCaseId(id) {
	return id.split(/[-_\s]+/).filter((w) => w !== "").map((w) => w.slice(0, 1).toUpperCase() + w.slice(1)).join(" ");
}
/** THE SCHEMA LAYER's declared defaults (fieldsOfEnvelope's output —
*  resolveValue's first layer; the base never invents one). */
function specDefaults(fields) {
	const out = {};
	for (const f of fields) if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
	return out;
}
function composeUnset(inherited, schemaDefault) {
	if (inherited !== void 0 && inherited !== null && inherited !== "") return {
		composed: String(inherited),
		from: "stamp"
	};
	if (schemaDefault !== void 0 && schemaDefault !== null) return {
		composed: String(schemaDefault),
		from: "schema"
	};
	return {
		composed: void 0,
		from: "none"
	};
}
/** The unset face's LABEL: a run stamp names its source ('← 28'); the
*  schema default rides plain (it is not inheriting anything — it IS
*  the engine's compose floor); 'inherit' only when nothing
*  composes. */
function unsetFaceLabel(face) {
	if (face.composed === void 0) return "inherit";
	return face.from === "stamp" ? `← ${face.composed}` : face.composed;
}
/** The unset face's PROSE (the tooltip): names in words what unset
*  composes. `render` adapts the vocabulary (e.g. boolean on/off). */
function unsetFaceTip(face, render) {
	const v = (render ?? ((x) => x))(face.composed ?? "");
	if (face.from === "stamp") return `unset — inherits ${v} from the run`;
	if (face.from === "schema") return `unset — the engine composes ${v} (the schema's default)`;
	return "unset — the engine default applies";
}
/** ── THE ENVELOPE WALKER ─────────────────────────────────────────
*
* One pure projection: serialized schemastery schema -> derived
* SpecFields. Every presentation fact lives in the nodes' meta (the
* declaration IS the UI contract — the Field.emit law); this
* walk reads, never invents. THE ORDER: dict insertion order with
* the declared `order` hint as tie-break (a stable sort — equal
* keys keep insertion order).
*
* Families scoping: a node whose extra.families names families the
* spec does NOT serve skips (the absorption is family-scoped —
* the card serves only the boarded plane).
*
* Nullable pairs: a union of [X, const(null)] wires as X — the
* OUTER meta wins (schemastery's nullable() shape, probed live on
* image-gen 2026-09-14).
*
* Presentation types (the audit's client-side derivation — a view
* choice over typed meta, never a server row): extra.wtype wins
* (declared presentation); union-of-consts -> select; number ->
* step 1 -> seed, any other step -> slider, no step -> slider;
* string -> text; boolean -> boolean; array -> loras.
*
* Option labels: a union's const members carry their own
* meta.description (the emitter's label law) — the declared
* extra.options override when present. */
function fieldsOfEnvelope(env, family) {
	if (env == null) return [];
	const root = env.refs[env.uid];
	return projectDict(env, root?.dict ?? {}, family);
}
/** THE HYBRID PROJECTION (the controlnet restoration): the envelope
*  root's bag array (param_key) holds entry OBJECTS — project the
*  ELEMENT's dict as the kind's entry fields (the catalog select
*  joins them in the leaf). Empty when the bag is absent or its
*  element is not an object (a pure OPTION kind like lora). */
function entryFieldsOfEnvelope(env, paramKey, family) {
	if (env == null) return [];
	const at = env.refs[env.uid]?.dict?.[paramKey];
	const node = at === void 0 ? void 0 : env.refs[at];
	const innerId = node?.inner;
	const inner = typeof innerId === "number" ? env.refs[innerId] : void 0;
	if (node?.type !== "array" || inner?.type !== "object") return [];
	return projectDict(env, inner.dict ?? {}, family);
}
/** THE PACK-LEVEL PROJECTION (the controlnet strength floor): the
*  envelope root's fields OUTSIDE the bag array — the section's own
*  rows above the tiles. Bag-external arrays are not section rows
*  (no atom renders a bag) — scalars only. */
function kindScalarFieldsOfEnvelope(env, paramKey, family) {
	if (env == null) return [];
	const dict = { ...env.refs[env.uid]?.dict ?? {} };
	delete dict[paramKey];
	for (const [name, id] of Object.entries(dict)) if (env.refs[id]?.type === "array") delete dict[name];
	return projectDict(env, dict, family);
}
/** The dict projector (the walker's body — one meta path for the
*  root, the hybrid element, and the pack-level rows). */
function projectDict(env, dict, family) {
	const out = [];
	for (const [name, id] of Object.entries(dict)) {
		let node = env.refs[id];
		if (node === void 0) continue;
		if (node.type === "union" && Array.isArray(node.list) && node.list.length === 2) {
			const a = env.refs[node.list[0]];
			const b = env.refs[node.list[1]];
			const nullConst = (r) => r?.type === "const" && r.value === null;
			if (a !== void 0 && b !== void 0 && (nullConst(a) && b.type !== "const" || nullConst(b) && a.type !== "const")) node = nullConst(a) ? b : a;
		}
		const meta = node.meta ?? {};
		const extra = extraOf(node);
		const families = Array.isArray(extra.families) ? extra.families : null;
		if (families !== null && family !== void 0 && !families.includes(family)) continue;
		if (extra.hidden === true) continue;
		let options;
		if (node.type === "union" && Array.isArray(node.list)) {
			const opts = [];
			for (const mid of node.list) {
				const m = env.refs[mid];
				if (m?.type !== "const") continue;
				const v = m.value;
				if (v === null || v === void 0) continue;
				const label = typeof m.meta?.["description"] === "string" ? m.meta["description"] : String(v);
				if (label === String(v)) opts.push(String(v));
				else opts.push({
					value: String(v),
					label
				});
			}
			if (opts.length > 0) options = opts;
		}
		if (Array.isArray(extra.options)) options = extra.options.map((o) => typeof o === "string" ? o : typeof o === "object" && o !== null && "value" in o && "label" in o ? {
			value: String(o["value"]),
			label: String(o["label"])
		} : String(o));
		const hint = typeof extra.wtype === "string" ? extra.wtype : "";
		let type;
		if (hint !== "") type = hint;
		else if (options !== void 0 && node.type === "union") type = "select";
		else if (node.type === "number") type = String(meta["step"] ?? "") === "1" ? "seed" : "slider";
		else if (node.type === "string") type = "text";
		else if (node.type === "boolean") type = "boolean";
		else if (node.type === "array") type = "loras";
		else type = node.type ?? "string";
		const num = (k) => typeof meta[k] === "number" ? meta[k] : void 0;
		const str = (k, m) => {
			const b = extra[k];
			if (typeof b === "string") return b;
			const mk = m ?? k;
			return typeof meta[mk] === "string" ? meta[mk] : void 0;
		};
		out.push({
			name,
			label: typeof meta["description"] === "string" && meta["description"] !== "" ? meta["description"] : name,
			order: typeof extra.order === "number" ? extra.order : void 0,
			type,
			default: meta["default"] === void 0 ? void 0 : meta["default"],
			min: num("min"),
			max: num("max"),
			step: type === "seed" ? void 0 : num("step"),
			options,
			group: str("group") ?? "",
			zone: str("zone"),
			required: extra.required === true || meta["required"] === true,
			placeholder: str("placeholder"),
			tooltip: str("tooltip"),
			visible_when: str("visible_when"),
			columns: typeof extra.columns === "number" ? extra.columns : void 0,
			width: typeof extra.width === "number" ? extra.width : void 0,
			max_stack: typeof extra.max_stack === "number" ? extra.max_stack : void 0,
			media: str("media")
		});
	}
	return out.map((f, i) => [f, i]).sort((a, b) => (a[0].order ?? 0) - (b[0].order ?? 0) || a[1] - b[1]).map((x) => x[0]);
}
/** THE EDIT COERCION (the one specPatch duty that survives, moved
* to the edit boundary): atoms emit raw strings while typing; a
* numeric field's edit rides the user layer as a NUMBER. An
* unparseable/empty numeric string rides VERBATIM (display
* continuity through clear-and-retype — the bench drill's law; a
* blank that reaches the run's schema parse refuses loud, naming
* the field — never a silent 0). `v === undefined` stays undefined
* (the tri-state's inherit — the caller's unset signal). The
* STUDIOS' blank-inherits law lives one door up, at their own edit
* verb (useResolvedForm) — each face owns its blank semantics.
* PURE. */
/** THE NUMERIC PARSE, shared by both blank laws (2026-10-13, the card-UI
*  duplication audit): a finite parse is a number, anything else is
*  NOT one. The blank SEMANTICS then differ by seat and stay there —
*  this file rides an unparseable value VERBATIM (never a silent 0),
*  while the drill modal keeps the prior value (a typed "x" must
*  never reach a number param). One parse, two named laws; the two
*  copies of the parse itself are gone. */
function parseNumericInput(v) {
	if (v.trim() === "") return void 0;
	const n = Number(v);
	return Number.isFinite(n) ? n : void 0;
}
function coerceFieldEdit(f, v) {
	if (v === void 0) return void 0;
	if (f !== void 0 && (f.type === "number" || f.type === "seed" || f.type === "slider") && typeof v === "string") {
		const n = parseNumericInput(v);
		if (n !== void 0) return n;
	}
	return v;
}
/** THE FAMILY-KEY RESOLUTION (the families-DRY law, 2026-09-21):
* a field's `families` declares BASE family ids — the card's
* boarded ids — while the served model key may be a COMPOSED
* catalog row (family-variant-quant, e.g. 'pixal3d-1536-int8').
* Resolve the active key to its base against the spec's OWN
* boarded-families rows: the longest id matching the key at a
* '-' boundary wins (a 'pixal3d' + 'pixal3d-pro' board resolves
* to the longer). An unresolved key passes through verbatim —
* single-family cards and keys with no boarded base walk
* unchanged; the resolution never drops a field, it only widens
* what a declared base id covers. */
function resolveFamilyKey(spec) {
	const key = typeof spec.model === "string" ? spec.model : void 0;
	if (key === void 0 || key === "") return void 0;
	const boarded = spec.families;
	if (boarded === void 0) return key;
	let best;
	for (const row of boarded) {
		const exact = key === row.id;
		const prefixed = key.startsWith(row.id + "-") && (best === void 0 || row.id.length > best.length);
		if (exact || prefixed) best = row.id;
	}
	return best ?? key;
}
/** The card's own derived fields (the schema envelope walked,
* families-scoped to the served family). Memoize at the caller for
* hot loops — the walk is pure. */
function fieldsOf(spec) {
	return fieldsOfEnvelope(spec.schema, resolveFamilyKey(spec));
}
/** THE LAYERED RESOLUTION — the engine's compose cascade mirrored
* client-side (stroke 34 — the card-recipe layer is dead): schema
* defaults <- model defaults <- SERVED STAMPS <- user. The form
* SHOWS exactly what a run composes; `user` rides verbatim by key
* presence (a PRESENCE is the override mark, never its value — the
* settings law). Arrays (lora bags) and nulls in model_defaults
* skip, matching the engine's overlay filter.
*
* THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): `base` is the
* stage row's `resolved` map — prepareCardParams' own stamped +
* lifted body, served by the drafts doors. It layers UNDER the user
* (presence still wins) and OVER model_defaults (the server's own
* family/variant stamps replace the client's guesses — variant
* resolver_defaults, family defaults, the surface filter). Absent
* base = the registry-less lane derive. PURE. */
function resolveValue(spec, user, base) {
	const out = specDefaults(fieldsOf(spec));
	for (const [k, v] of Object.entries(spec.model_defaults ?? {})) {
		if (v === null || Array.isArray(v)) continue;
		out[k] = v;
	}
	if (base !== void 0) for (const [k, v] of Object.entries(base)) {
		if (v === null || v === void 0 || Array.isArray(v)) continue;
		out[k] = v;
	}
	for (const [k, v] of Object.entries(user)) {
		if (v === null || v === void 0) continue;
		out[k] = v;
	}
	for (const kind of spec.features?.modifiers ?? []) {
		if (kind.marries === void 0) continue;
		const bag = out[kind.param_key];
		if (!Array.isArray(bag) || bag.length === 0) continue;
		const catalog = new Map((kind.options ?? []).map((o) => [o.value, o]));
		for (const knob of Object.keys(kind.marries)) {
			const counts = [];
			for (const row of bag) {
				const stated = row?.[knob];
				if (typeof stated === "number" && Number.isFinite(stated)) {
					counts.push(stated);
					continue;
				}
				const id = typeof row?.["id"] === "string" ? row["id"] : void 0;
				const fromCatalog = id === void 0 ? void 0 : (catalog.get(id)?.defaults)?.[knob];
				if (typeof fromCatalog === "number" && Number.isFinite(fromCatalog)) counts.push(fromCatalog);
			}
			if (counts.length > 0) out[knob] = Math.max(...counts);
		}
	}
	return out;
}
/** evalVisibleWhen's serving shape: "key=value" guards, `&`-ANDed;
* one guard's value may be a `|`-SET ("key=a|b" = key ∈ {a,b}).
* (The ONE schema grammar — a field declares its own visibility;
* the walker interprets, cards never hand-rolled predicates.) A
* field with no visible_when always shows. Unknown guard keys:
* show (never hide on a typo). Examples:
*   "sharpen_enabled=true"
*   "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass" */
function fieldVisible(f, values) {
	const rule = f.visible_when;
	if (typeof rule !== "string" || rule === "") return true;
	for (const guard of rule.split("&")) {
		const g = guard.trim();
		const ne = g.indexOf("!=");
		const eq = ne >= 0 ? -1 : g.indexOf("=");
		let key;
		let wants;
		let negate = false;
		if (ne >= 0) {
			key = g.slice(0, ne).trim();
			wants = g.slice(ne + 2).split("|").map((w) => w.trim());
			negate = true;
		} else if (eq >= 0) {
			key = g.slice(0, eq).trim();
			wants = g.slice(eq + 1).split("|").map((w) => w.trim());
		} else continue;
		if (key === "") continue;
		const val = String(values[key] ?? "");
		const hit = wants.some((w) => w === "null" ? val === "" : w === val);
		if (negate === hit) return false;
	}
	return true;
}
/** The resolved lane surface for the current variant, or null when
*  the family declares none (the legacy truth — visibility falls
*  back to visible_when). `variantId` is the RESOLVED variant
*  value (values.variant); an unknown id inherits the family base
*  verbatim (a Quant-only or unset axis). */
function laneSurfaceFor(spec, variantId) {
	const lanes = spec.lanes;
	if (lanes === void 0) return null;
	const extra = variantId === null ? void 0 : lanes.variants?.[variantId]?.params;
	return laneSurfaceOf(lanes.base, extra);
}
/** The relation words that judge the resolved lane: the family's
*  own + the variant's own (both layers fire — the DECL cascade). */
function laneRelationsFor(spec, variantId) {
	const lanes = spec.lanes;
	if (lanes === void 0) return [];
	const out = [];
	if (lanes.relations !== void 0) out.push(lanes.relations);
	const v = variantId === null ? void 0 : lanes.variants?.[variantId]?.relations;
	if (v !== void 0) out.push(v);
	return out;
}
/** The numeric bounds that judge the resolved lane: family rows,
*  per-field replaced by the variant's own (the DECL cascade's
*  replace-law for numbers). */
function laneBoundsFor(spec, variantId) {
	const lanes = spec.lanes;
	if (lanes === void 0) return null;
	return laneBoundsOf(lanes.bounds ?? null, variantId === null ? void 0 : lanes.variants?.[variantId]?.bounds ?? null);
}
/** Field visibility UNDER the lane contract: a declared surface
*  hides every field it does not name (the declaration is the
*  author — the field set IS the variant); a family that declares
*  no surface keeps the visible_when grammar. */
function fieldOnLane(spec, paramName, values) {
	const surface = laneSurfaceFor(spec, typeof values["variant"] === "string" && values["variant"] !== "" ? values["variant"] : null);
	if (surface === null) return true;
	return surface.includes(paramName);
}
/** THE INLINE GATE: the lane's relation + surface violations over
*  what the state CARRIES — rendered under the named field while the
*  user types, refused by the bench door when the state is saved.
*  Empty = a state the run accepts.
*
*  THE CARRIED LAYERS, NOT THE RESOLVED MAP (2026-10-10, the
*  form-plane audit's CRITICAL-1): the resolved `values` map
*  materializes schema defaults and model_defaults as own
*  properties, so a defaulted field reads as STATED whether the user
*  ever touched it. On a lane that excludes a defaulted field that
*  produced a perpetual, UNCURABLE warning: the row was hidden
*  (fieldOnLane) so the cure ("drop it") was unclickable, and
*  unsetting it re-materialized the default. The bench judges the
*  PREPARED body — the operator's own params plus the stamps that
*  survive the null-skip — so the form judges the same thing: the
*  user layer over the base layer, non-null keys only. A schema
*  default is a PREFILL the operator never sent, and a variant's
*  `voice: null` stamp is exactly how the bench says "no persona on
*  this lane". */
function laneViolations(spec, fields, user, base) {
	const carried = (key) => Object.prototype.hasOwnProperty.call(user, key) ? user[key] : (base ?? {})[key];
	const rawVariant = carried("variant");
	if (rawVariant !== void 0 && rawVariant !== null) {
		if (typeof rawVariant !== "string" || rawVariant === "" || !laneVariantServed(spec, rawVariant)) return [];
	}
	const variantId = typeof rawVariant === "string" && rawVariant !== "" ? rawVariant : null;
	const surface = laneSurfaceFor(spec, variantId);
	const relations = laneRelationsFor(spec, variantId);
	if (surface === null && relations.length === 0) return [];
	const names = fields.map((f) => f.name);
	const stated = {};
	for (const src of [base ?? {}, user]) for (const [k, v] of Object.entries(src)) {
		if (v === null || v === void 0) continue;
		stated[k] = v;
	}
	const bounds = laneBoundsFor(spec, variantId);
	return [
		...judgeLaneSurface(surface, names, stated),
		...judgeLaneRelations(relations, stated),
		...judgeLaneBounds(bounds, stated)
	];
}
/** Does the served doc offer this variant id? The VARIANT rows are
*  the served truth — a recipe row and a surface-less variant
*  (voicedesign) legitimately carry no `lanes.variants` entry and
*  still inherit the family base, so the check reads spec.variants
*  ids, never the lanes map's keys. */
function laneVariantServed(spec, variantId) {
	return (Array.isArray(spec.variants) ? spec.variants : []).some((row) => {
		const rec = row;
		return rec?.id === variantId || rec?.key === variantId;
	});
}
/** Group the visible fields (the spec's own group key, first-appearance
*  order — ungrouped first under no heading). */
function groupFields(fields, values) {
	const out = [];
	for (const f of fields) {
		if (!fieldVisible(f, values)) continue;
		const g = typeof f.group === "string" && f.group !== "" ? f.group : null;
		const known = out.find((x) => x.group === g);
		if (known === void 0) out.push({
			group: g,
			fields: [f]
		});
		else known.fields.push(f);
	}
	return out;
}
/** The declared input edge for a param, if the emission names one
*  (THE EDGE LOOKUP — the constructor's one way to know a field is
*  slot-shaped: the DECLARATION says so, the wtype never guesses). */
function inputEdgeOf(spec, paramName) {
	return (spec.inputs ?? []).find((e) => e.name === paramName);
}
/** The axis groups in declaration order: features.variant_groups'
*  key order when the door serves it, else the rows' distinct groups
*  in first-seen order. Empty group names never ride. The Recipe
*  group never rides (the recipe-axis yield above). */
function axisGroups(spec) {
	const rows = spec.variants ?? [];
	const groups = [];
	const declared = variantGroupsContract(spec);
	if (declared.length > 0) {
		for (const g of declared) if (g !== "" && !groups.includes(g)) groups.push(g);
	}
	for (const v of rows) if (v.group !== "" && !groups.includes(v.group)) groups.push(v.group);
	return groups.filter((g) => g !== "Recipe");
}
/** The variant_groups contract's keys, in served order (the door
*  serves it under features when the family declares axis groups). */
function variantGroupsContract(spec) {
	const vg = spec.features?.["variant_groups"];
	if (vg === null || typeof vg !== "object" || Array.isArray(vg)) return [];
	return Object.keys(vg);
}
/** One axis' rows (served order). */
function rowsFor(spec, group) {
	return (spec.variants ?? []).filter((v) => v.group === group);
}
/** THE CHAIN (one direction: an axis filters the axes BELOW it): a
*  row composes with the current selection when its `owner` is empty
*  (composes with everything — patch-only rows) or names the ACTIVE
*  row of another axis. */
function composingRows(spec, group, active) {
	return rowsFor(spec, group).filter((v) => {
		if (v.owner === void 0 || v.owner === "") return true;
		for (const g of axisGroups(spec)) {
			if (g === group) continue;
			if (rowsFor(spec, g).find((x) => x.id === v.owner) !== void 0) return active[g] === v.owner;
		}
		return true;
	});
}
/** The Variant axis' rows (group 'Variant', served order). */
function variantRows(spec) {
	return rowsFor(spec, "Variant");
}
/** The Quant cells composing with a variant (THE CHAIN). */
function quantRowsFor(spec, variantId) {
	return composingRows(spec, "Quant", { Variant: variantId ?? void 0 });
}
/** The Model select's options (stroke 21, the operator's law:
*  "WHY IS KREA-2 AND KREA-2-RAW MODELS! THAT IS A VARIANT") — THE
*  FAMILY THE SPEC SERVES, full stop. A variant row's re-point
*  (krea-2-raw) is the DECL's compose stamp, resolved server-side
*  into the run's params — it is NOT a model and never renders as
*  one. The rail's other options are the card's boarded families
*  (spec.families, served from the card package). */
function modelChoices(spec) {
	return typeof spec.model === "string" && spec.model !== "" ? [spec.model] : [];
}
/** THE ACTIVE-ENTRY LAW (activeVariantId, generalized to the served
*  shape): a row is active when its re-pointed model (defaults.model
*  ?? route) matches the held `model` value AND its owner chain
*  holds. Nothing matches → undefined (the caller falls to the first
*  composing row — the catalog's first-declared law). */
function activeVariantId(spec, values, group) {
	if ((typeof values["model"] === "string" ? values["model"] : void 0) === void 0) return void 0;
	const active = {};
	for (const g of axisGroups(spec)) active[g] = activeRowId(spec, values, g, active);
	return active[group] ?? void 0;
}
/** The ACTIVE RECIPE (the dropdown's selection state, derived from
* the ONE truth -- never a persisted key): a recipe row is active
* when EVERY key its pick stamps (axisPickPatch, minus the durable
* axis keys -- the run door refuses an undeclared `recipe` param)
* deep-equals the user layer's held value. Stamp-for-stamp matches
* are naturally exclusive (a two-row bag matches only the row that
* stamps two rows); first-declared wins on a tie. NOTHING matches ->
* undefined (the dropdown shows its placeholder -- a hand-edited
* layer is not a recipe, and the form never lies about it). */
function activeRecipeId(spec, values) {
	for (const row of rowsFor(spec, "Recipe")) {
		const patch = axisPickPatch(spec, row);
		let holds = true;
		for (const [k, v] of Object.entries(patch)) {
			if (k === axisKey("Recipe")) continue;
			if (!deepEqualHeld(values[k], v)) {
				holds = false;
				break;
			}
		}
		if (holds && Object.keys(patch).length > 0) return row.id;
	}
}
/** Deep equality over JSON-shaped held values (arrays compared
* element-wise -- the lora bag rows; primitives by Object.is). */
function deepEqualHeld(a, b) {
	if (Object.is(a, b)) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) if (!deepEqualHeld(a[i], b[i])) return false;
		return true;
	}
	if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
		const ka = Object.keys(a);
		const kb = Object.keys(b);
		if (ka.length !== kb.length) return false;
		for (const k of ka) if (!deepEqualHeld(a[k], b[k])) return false;
		return true;
	}
	return false;
}
/** One group's active row under the owner chain (inner recursion of
*  activeVariantId — Variant resolves first, chained groups after). */
function activeRowId(spec, values, group, active) {
	const held = typeof values["model"] === "string" ? values["model"] : void 0;
	if (held === void 0) return void 0;
	for (const v of rowsFor(spec, group)) {
		const rePoint = typeof v.defaults["model"] === "string" ? v.defaults["model"] : v.route;
		if (rePoint === "" || rePoint !== held) continue;
		if (v.owner !== void 0 && v.owner !== "") {
			let chainHolds = false;
			for (const g of axisGroups(spec)) {
				if (g === group) continue;
				if (rowsFor(spec, g).find((x) => x.id === v.owner) !== void 0) {
					chainHolds = active[g] === v.owner;
					break;
				}
			}
			if (!chainHolds) continue;
		}
		return v.id;
	}
}
/** THE AXIS STAMP VOCABULARY (2026-09-29, caught LIVE by the
*  compose gate in the CI seat: the client stamped the Quant row's
*  composed catalog id — 'raw__int8' — where the door's contract
*  speaks the CELL's quant field — 'int8'; the gate refused with the
*  door's own voice and the write never left the studio, which is
*  exactly the law working). The value an axis pick stamps on the
*  durable key is the value the DOOR reads: the variant id for
*  Variant, the cell quant for Quant. Never the flat-catalog id.
* PURE. */
function axisStampOf(row) {
	if (row.group !== "Quant") return row.id;
	if (typeof row.quant === "string" && row.quant !== "") return row.quant;
	throw new Error("illegal Quant row " + JSON.stringify(row.id) + " (owner " + JSON.stringify(row.owner ?? "") + "): no quant coordinate — the row is refused at the stamp; the spec server must refuse it at birth");
}
/** The durable param key an axis rides (the group's id, lowercased —
*  'variant', 'quant', 'recipe', 'precision'). */
function axisKey(group) {
	return group.toLowerCase();
}
/** A pick's full value patch — the old onPick law: the row's
*  `defaults` overlay rides (model re-point + every resolver default),
*  plus the durable axis keys themselves so a reopened stage restores
*  its selects. Picking a row also re-seeds the axes BELOW it (their
*  first composing row). */
function axisPickPatch(spec, row) {
	const patch = {};
	for (const [k, v] of Object.entries(row.defaults)) {
		if (k === "model") continue;
		patch[k] = v;
	}
	const groups = axisGroups(spec);
	const at = groups.indexOf(row.group);
	const active = {};
	for (const g of groups) if (g === row.group) active[g] = row.id;
	else if (typeof row.defaults["model"] === "string") active[g] = void 0;
	if (groups.includes(row.group)) patch[axisKey(row.group)] = axisStampOf(row);
	if (at < 0) return patch;
	for (const g of groups.slice(at + 1)) {
		const composing = composingRows(spec, g, active);
		if (composing.length > 0) patch[axisKey(g)] = axisStampOf(composing[0]);
		else patch[axisKey(g)] = "";
	}
	return patch;
}
/** A model switch's full value patch (the stale-variant cure,
*  operator 2026-09-14: model anima + variant turbo refused at
*  compose — a switch that keeps the old family's axes is a broken
*  stage). Every axis re-seeds to its FIRST row re-pointing at the
*  new model (else its first composing row), and the picked rows'
*  defaults overlay rides (raw → {model, steps, cfg} — the pick
*  law, same as axisPickPatch). The caller writes every key through
*  onEdit. PURE. */
function modelSwitchPatch(spec, model) {
	const patch = { model };
	const groups = axisGroups(spec);
	const active = {};
	const crossSpec = model !== "" && model !== spec.model;
	for (const g of groups) {
		const composing = composingRows(spec, g, active);
		if (composing.length === 0 || crossSpec) {
			patch[axisKey(g)] = "";
			active[g] = "";
			continue;
		}
		const row = composing.find((r) => {
			return (typeof r.defaults["model"] === "string" && r.defaults["model"] !== "" ? r.defaults["model"] : r.route) === model;
		}) ?? composing[0];
		for (const [k, v] of Object.entries(row.defaults)) {
			if (k === "model") continue;
			patch[k] = v;
		}
		patch[axisKey(g)] = row.id;
		active[g] = row.id;
	}
	patch["model"] = model;
	return patch;
}
/** THE EMPTY-SELECTION LAW's authoring decision (2026-10-10, the
*  operator's live bench: a stage carrying quant:"" — born when a
*  model switch CLEARED the axis to '' — which the RUN door refused:
*  'unknown quant "" for model "z-image" variant "turbo" (known:
*  int8)'). A stated EMPTY selection is UNSTATED: the authoring
*  seat unsets the key instead of writing the empty string, so
*  compose defaults the cell. ONE pure decision, shared by the seed
*  (seedAxisValues omits) and the write (the drill's onSet unsets)
*  — the form's rendering is untouched (a missing axis key reads
*  as '' on screen). */
function axisUnset(name, v, spec) {
	if (v !== "" || spec === null) return false;
	return axisGroups(spec).some((g) => axisKey(g) === name);
}
/** Seed the axis keys for a fresh stage (the catalog's first-declared
*  law: each axis defaults to its FIRST composing row). Held values
*  win (a reopened stage never re-seeds). */
function seedAxisValues(spec, held) {
	const out = {};
	const groups = axisGroups(spec);
	if (groups.length === 0) return out;
	const active = {};
	for (const g of groups) {
		const heldKey = typeof held[axisKey(g)] === "string" ? held[axisKey(g)] : "";
		const heldRow = rowsFor(spec, g).find((x) => x.id === heldKey);
		if (heldRow !== void 0) active[g] = heldRow.id;
		else {
			const composing = composingRows(spec, g, active);
			active[g] = composing.length > 0 ? composing[0].id : "";
		}
		if (active[g] !== "") out[axisKey(g)] = active[g];
	}
	const heldModel = held["model"];
	if (typeof heldModel !== "string" || heldModel === "") {
		const model = typeof spec.model === "string" && spec.model !== "" ? spec.model : "";
		if (model !== "") out["model"] = model;
	}
	return out;
}
/** Seed a stage's USER layer from its held params (the bench's
* stage.params — the only migration seam). Presence-based, per the
* settings law: every HELD key rides verbatim (the override marks
* survived the reopen), the absent axis keys seed per the axis law
* (seedAxisValues above — first composing row, one direction).
*
* THE ONE VALIDATION CLAUSE (never value-compare): a held `recipe`
* the card's schema does not declare is poison — the dead
* card-recipe layer's stamp (strokes 33+34). Dropped on open, so
* the run flush's null-domain half deletes the bench key and the
* card composes again. Everything else rides untouched.
*
* PURE — the caller owns the write (onSet per fresh key). */
function seedUser(spec, held) {
	const out = {
		...held,
		...seedAxisValues(spec, held)
	};
	if (!fieldsOf(spec).some((f) => f.name === "recipe")) delete out["recipe"];
	return out;
}
function composeValidate(spec, doc) {
	if (spec === null) return [];
	const heldModel = doc["model"];
	if (typeof heldModel === "string" && heldModel !== "" && spec.model !== void 0 && spec.model !== "" && heldModel !== spec.model) return [];
	const out = [];
	const all = spec.variants ?? [];
	const configured = all.filter((r) => r.group !== "Recipe" && r.group !== "Quant");
	const pool = configured.length > 0 ? configured : all.filter((r) => r.group !== "Quant");
	const rawVariant = doc["variant"];
	let offered;
	if (typeof rawVariant === "string" && rawVariant !== "") {
		offered = pool.find((r) => r.id === rawVariant || r.route === rawVariant);
		if (offered === void 0) {
			out.push({ message: "card_compose: " + unknownVariantVoice(rawVariant, spec.model ?? "", pool.map((r) => r.id)) });
			return out;
		}
	} else offered = pool[0];
	if (offered !== void 0) {
		const rawQuant = doc["quant"];
		if (typeof rawQuant === "string" && rawQuant !== "") {
			const cells = all.filter((r) => r.group === "Quant" && r.owner === offered.id);
			if (!cells.some((c) => c.quant === rawQuant)) out.push({ message: "card_compose: " + unknownQuantVoice(rawQuant, spec.model ?? "", offered.id, cells.map((c) => c.quant).filter((q) => typeof q === "string")) });
		}
		const off = judgeSamplerEnvelope(doc, offered.sampler_envelope ?? null, {
			id: offered.id,
			route: offered.route
		});
		if (off !== null) out.push({ message: "card_compose: " + off.voice + ". " + samplerEnvelopeCure() });
	}
	return out;
}
/** Compose the CANDIDATE doc the door would judge: the bench row's
*  held params, the user layer's overrides, then the in-flight frame
*  — later layers win, and a null value DELETES the key (the wire's
*  own unset law). This is composition: the full doc, assembled
*  where the edit happens, so the law can run BEFORE the write. */
function composeCandidateDoc(held, user, frame) {
	const doc = {
		...held,
		...user
	};
	for (const [k, v] of Object.entries(frame)) if (v === null) delete doc[k];
	else doc[k] = v;
	return doc;
}
//#endregion
//#region src/chrome.ts
/**
* Card chrome primitives — the ONE joiner + the card-base face of the
* ONE file reader (founded 2026-09-12, debt extermination: anny/ideo
* cx, motion/h3 clsx-cn). DOM-free, no CSS, no atoms — safe for node
* and browser.
*
* `readAsDataURL` is @melite/formats' implementation, re-served here
* so cards reach one door; @melite/formats/readFile.ts owns the body.
*
* Reached through the `/client` door (`@melite/card-base/client`).
*/
/** Plain classnames joiner (no conflicting utilities to merge —
*  plain join is exact). */
function cx(...parts) {
	return parts.filter(Boolean).join(" ");
}
/** The merging joiner (clsx — objects/arrays/conditionals). */
function cn(...inputs) {
	return clsx(...inputs);
}
/** THE ESTATE'S DRAG CONTRACT (2026-09-18, exterminated): the MIME
*  under which an upstream asset rides a drop payload — a JSON blob
*  {url, name, …} carried by the source's dataTransfer. h3's kit and
*  motion's kit each redeclared it; card-base, the card-view's
*  CardsTab and input-square already consumed it. One definition
*  estate-wide (the drag is a shared contract, not a studio rule). */
const ASSET_DRAG_MIME = "application/tech-noir-asset";
function parseAssetDrop(raw) {
	if (raw === "") return {};
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return {};
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
	const payload = parsed;
	const url = typeof payload["url"] === "string" && payload["url"] !== "" ? payload["url"] : void 0;
	const type = typeof payload["type"] === "string" && payload["type"] !== "" ? payload["type"] : void 0;
	return {
		...url === void 0 ? {} : { url },
		...type === void 0 ? {} : { type }
	};
}
//#endregion
//#region src/card.module.css
var card_module_default = {
	"axesPair": "VMoOIq_axesPair",
	"ctlRow": "VMoOIq_ctlRow",
	"ctlRowSm": "VMoOIq_ctlRowSm",
	"emptyHint": "VMoOIq_emptyHint",
	"emptyOverlay": "VMoOIq_emptyOverlay",
	"emptyPane": "VMoOIq_emptyPane",
	"emptyTitle": "VMoOIq_emptyTitle",
	"groupTab": "VMoOIq_groupTab",
	"groupTabActive": "VMoOIq_groupTabActive",
	"groupTabs": "VMoOIq_groupTabs",
	"iconSpin": "VMoOIq_iconSpin",
	"inputRail": "VMoOIq_inputRail",
	"laneWarn": "VMoOIq_laneWarn",
	"modAddSquare": "VMoOIq_modAddSquare",
	"modelAxes": "VMoOIq_modelAxes",
	"modField": "VMoOIq_modField",
	"modHead": "VMoOIq_modHead",
	"modHint": "VMoOIq_modHint",
	"modLeaf": "VMoOIq_modLeaf",
	"modLeafActions": "VMoOIq_modLeafActions",
	"modLeafError": "VMoOIq_modLeafError",
	"modLeafFields": "VMoOIq_modLeafFields",
	"modLeafModal": "VMoOIq_modLeafModal",
	"modLeafSplit": "VMoOIq_modLeafSplit",
	"modLeafStage": "VMoOIq_modLeafStage",
	"modRow": "VMoOIq_modRow",
	"modSection": "VMoOIq_modSection",
	"modSelect": "VMoOIq_modSelect",
	"modStageCaption": "VMoOIq_modStageCaption",
	"modTile": "VMoOIq_modTile",
	"modTileLabel": "VMoOIq_modTileLabel",
	"modTileRecipe": "VMoOIq_modTileRecipe",
	"modTileSteps": "VMoOIq_modTileSteps",
	"modTileStrength": "VMoOIq_modTileStrength",
	"modTitle": "VMoOIq_modTitle",
	"paneHeaderPreview": "VMoOIq_paneHeaderPreview",
	"paneHeaderStrip": "VMoOIq_paneHeaderStrip",
	"paneHint": "VMoOIq_paneHint",
	"paneMeta": "VMoOIq_paneMeta",
	"paneMetaNum": "VMoOIq_paneMetaNum",
	"panePulse": "VMoOIq_panePulse",
	"paneShell": "VMoOIq_paneShell",
	"paneTitle": "VMoOIq_paneTitle",
	"pickBtn": "VMoOIq_pickBtn",
	"pickEmpty": "VMoOIq_pickEmpty",
	"pickGlyph": "VMoOIq_pickGlyph",
	"pickLabel": "VMoOIq_pickLabel",
	"pickList": "VMoOIq_pickList",
	"pickRow": "VMoOIq_pickRow",
	"pickThumb": "VMoOIq_pickThumb",
	"sectionLabel": "VMoOIq_sectionLabel",
	"sectionLabelTail": "VMoOIq_sectionLabelTail",
	"sectionLabelText": "VMoOIq_sectionLabelText",
	"skeleton": "VMoOIq_skeleton",
	"sourceRow": "VMoOIq_sourceRow",
	"specChip": "VMoOIq_specChip",
	"specChipOn": "VMoOIq_specChipOn",
	"specChips": "VMoOIq_specChips",
	"specDice": "VMoOIq_specDice",
	"specDiceOn": "VMoOIq_specDiceOn",
	"specField": "VMoOIq_specField",
	"specFieldHead": "VMoOIq_specFieldHead",
	"specFieldKey": "VMoOIq_specFieldKey",
	"specForm": "VMoOIq_specForm",
	"specGrid": "VMoOIq_specGrid",
	"specGroup": "VMoOIq_specGroup",
	"specGroupTitle": "VMoOIq_specGroupTitle",
	"specHint": "VMoOIq_specHint",
	"specInfo": "VMoOIq_specInfo",
	"specLinkBtn": "VMoOIq_specLinkBtn",
	"specRequired": "VMoOIq_specRequired",
	"specSelect": "VMoOIq_specSelect",
	"specSlider": "VMoOIq_specSlider",
	"specSliderRow": "VMoOIq_specSliderRow",
	"specSliderValue": "VMoOIq_specSliderValue",
	"specSlotCell": "VMoOIq_specSlotCell",
	"specSlotRow": "VMoOIq_specSlotRow",
	"specStack": "VMoOIq_specStack",
	"specTextarea": "VMoOIq_specTextarea",
	"squareActions": "VMoOIq_squareActions",
	"squareBadge": "VMoOIq_squareBadge",
	"squareBox": "VMoOIq_squareBox",
	"squareEmptyIcon": "VMoOIq_squareEmptyIcon",
	"squareFileInput": "VMoOIq_squareFileInput",
	"squareGlyph": "VMoOIq_squareGlyph",
	"squareLabel": "VMoOIq_squareLabel",
	"squareMesh": "VMoOIq_squareMesh",
	"squareMetric": "VMoOIq_squareMetric",
	"squareOff": "VMoOIq_squareOff",
	"squareOver": "VMoOIq_squareOver",
	"squarePick": "VMoOIq_squarePick",
	"squareThumb": "VMoOIq_squareThumb",
	"squareWrap": "VMoOIq_squareWrap",
	"squareX": "VMoOIq_squareX",
	"sz14": "VMoOIq_sz14",
	"tileDragging": "VMoOIq_tileDragging",
	"tipAnchor": "VMoOIq_tipAnchor",
	"wireDialog": "VMoOIq_wireDialog",
	"wiredTag": "VMoOIq_wiredTag",
	"wireEmpty": "VMoOIq_wireEmpty",
	"wireIdx": "VMoOIq_wireIdx",
	"wireList": "VMoOIq_wireList",
	"wireMeta": "VMoOIq_wireMeta",
	"wireOption": "VMoOIq_wireOption",
	"wireOut": "VMoOIq_wireOut",
	"wireSelected": "VMoOIq_wireSelected",
	"wireSub": "VMoOIq_wireSub",
	"wireThumb": "VMoOIq_wireThumb",
	"wireThumbFallback": "VMoOIq_wireThumbFallback",
	"wireTitle": "VMoOIq_wireTitle",
	"wireUnwire": "VMoOIq_wireUnwire"
};
//#endregion
//#region src/layout.tsx
/** The estate's tooltip anchor: the DSH Tooltip atom over a REAL
*  layout box (a display:contents or fragment child measures a zero
*  rect and pins the bubble to the viewport corner).
* @param props.tip - bubble text; absent renders the child bare.
* @param props.shortcut - keyboard shortcut, appended to the bubble text.
* @param props.side - bubble placement, default 'top'.
* @param props.delayDuration - hover delay in ms, default 300.
* @param props.children - the single anchor element. */
function Tip({ tip, shortcut, side = "top", delayDuration = 300, children }) {
	if (tip === void 0) return children;
	return /* @__PURE__ */ jsx(Tooltip, {
		label: shortcut ? `${tip} (${shortcut})` : tip,
		side: side === "left" ? "right" : side,
		delayMs: delayDuration,
		children: /* @__PURE__ */ jsx("span", {
			className: card_module_default.tipAnchor,
			children
		})
	});
}
function ControlRow({ label, hint, children, density = "md", className }) {
	return /* @__PURE__ */ jsxs("label", {
		className: cn(density === "sm" ? card_module_default.ctlRowSm : card_module_default.ctlRow, className),
		children: [/* @__PURE__ */ jsxs("span", { children: [label, hint != null ? hint : null] }), children]
	});
}
function SectionLabel({ children, tail, className }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cn(card_module_default.sectionLabel, className),
		children: [/* @__PURE__ */ jsx("span", {
			className: card_module_default.sectionLabelText,
			children
		}), tail != null ? /* @__PURE__ */ jsx("span", {
			className: card_module_default.sectionLabelTail,
			children: tail
		}) : null]
	});
}
function EmptyState({ icon, title, hint, variant = "pane", className }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-slot": "empty-state",
		"data-variant": variant,
		className: cn(variant === "overlay" ? card_module_default.emptyOverlay : card_module_default.emptyPane, className),
		children: [
			icon,
			/* @__PURE__ */ jsx("p", {
				className: card_module_default.emptyTitle,
				children: title
			}),
			hint != null ? /* @__PURE__ */ jsx("p", {
				className: card_module_default.emptyHint,
				children: hint
			}) : null
		]
	});
}
/** Skeleton — the quiet loading block (promoted 2026-09-18 from
*  motion's kit, where it was the estate's only copy): a bare div
*  with the estate pulse. EmptyState is the pane's empty face;
*  Skeleton is its loading face. */
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		"data-slot": "skeleton",
		className: cn(card_module_default.skeleton, className),
		...props
	});
}
function PaneHeader({ title, meta, hint, lead, variant = "strip", className }) {
	if (variant === "preview") return /* @__PURE__ */ jsxs("div", {
		"data-slot": "pane-header",
		"data-variant": "preview",
		className: cn(card_module_default.paneHeaderPreview, className),
		children: [
			lead,
			title != null ? /* @__PURE__ */ jsx("span", {
				className: card_module_default.paneTitle,
				children: title
			}) : null,
			meta != null ? /* @__PURE__ */ jsx("span", {
				className: card_module_default.paneMeta,
				children: meta
			}) : null,
			hint
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		"data-slot": "pane-header",
		"data-variant": "strip",
		className: cn(card_module_default.paneHeaderStrip, className),
		children: [
			lead,
			title != null ? /* @__PURE__ */ jsx("span", {
				className: card_module_default.paneTitle,
				children: title
			}) : null,
			meta != null ? /* @__PURE__ */ jsx("span", {
				className: card_module_default.paneMetaNum,
				children: meta
			}) : null,
			hint != null ? /* @__PURE__ */ jsx("span", {
				className: card_module_default.paneHint,
				children: hint
			}) : null
		]
	});
}
function PaneShell({ children, className }) {
	return /* @__PURE__ */ jsx("div", {
		"data-slot": "pane-shell",
		className: cn(card_module_default.paneShell, className),
		children
	});
}
//#endregion
//#region src/icons.tsx
function Svg({ className, style, children, ...rest }) {
	return /* @__PURE__ */ jsx("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: 24,
		height: 24,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		focusable: "false",
		className,
		style,
		...rest,
		children
	});
}
function X({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M18 6 6 18" }), /* @__PURE__ */ jsx("path", { d: "m6 6 12 12" })]
	});
}
function ChevronDown({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "m6 9 6 6 6-6" })
	});
}
function ChevronLeft({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "m15 18-6-6 6-6" })
	});
}
function ChevronRight({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "m9 18 6-6-6-6" })
	});
}
function Upload({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
			/* @__PURE__ */ jsx("path", { d: "m17 8-5-5-5 5" }),
			/* @__PURE__ */ jsx("path", { d: "M12 3v12" })
		]
	});
}
function PersonStanding({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "5",
				r: "1"
			}),
			/* @__PURE__ */ jsx("path", { d: "m9 20 3-6 3 6" }),
			/* @__PURE__ */ jsx("path", { d: "m6 8 6 2 6-2" }),
			/* @__PURE__ */ jsx("path", { d: "M12 10v4" })
		]
	});
}
function User({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ jsx("circle", {
			cx: "12",
			cy: "7",
			r: "4"
		})]
	});
}
function Link2({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M9 17H7A5 5 0 0 1 7 7h2" }),
			/* @__PURE__ */ jsx("path", { d: "M15 7h2a5 5 0 1 1 0 10h-2" }),
			/* @__PURE__ */ jsx("path", { d: "M8 12h8" })
		]
	});
}
function Plus({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M12 5v14" }), /* @__PURE__ */ jsx("path", { d: "M5 12h14" })]
	});
}
function Check({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "M20 6 9 17l-5-5" })
	});
}
function Box({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73Z" }),
			/* @__PURE__ */ jsx("path", { d: "m5.3 7.3 6.7 3.9 6.7-3.9" }),
			/* @__PURE__ */ jsx("path", { d: "M12 22V11" })
		]
	});
}
function Layers({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "m12 2 9 4.9-9 4.9-9-4.9L12 2Z" }),
			/* @__PURE__ */ jsx("path", { d: "m3 11.9 9 4.9 9-4.9" }),
			/* @__PURE__ */ jsx("path", { d: "m3 16.9 9 4.9 9-4.9" })
		]
	});
}
function Palette({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("circle", {
				cx: "13.5",
				cy: "6.5",
				r: "1"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "17.5",
				cy: "10.5",
				r: "1"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "8.5",
				cy: "7.5",
				r: "1"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "6.5",
				cy: "12.5",
				r: "1"
			}),
			/* @__PURE__ */ jsx("path", { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A5.46 5.46 0 0 0 22 10.5C21.94 5.75 17.5 2 12 2Z" })
		]
	});
}
function Move({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "m5 9-3 3 3 3" }),
			/* @__PURE__ */ jsx("path", { d: "m9 5 3-3 3 3" }),
			/* @__PURE__ */ jsx("path", { d: "m15 19-3 3-3-3" }),
			/* @__PURE__ */ jsx("path", { d: "m19 9 3 3-3 3" }),
			/* @__PURE__ */ jsx("path", { d: "M2 12h20" }),
			/* @__PURE__ */ jsx("path", { d: "M12 2v20" })
		]
	});
}
/** The circular-arrow glyph, spinning by construction (the Loader2
*  contract: callers size and tint it, never animate it). */
function Loader2({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className: cn(card_module_default.iconSpin, className),
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })
	});
}
function AlertTriangle({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
			/* @__PURE__ */ jsx("path", { d: "M12 9v4" }),
			/* @__PURE__ */ jsx("path", { d: "M12 17h.01" })
		]
	});
}
/** h3's name for the alert triangle — same drawing. */
function TriangleAlert({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
			/* @__PURE__ */ jsx("path", { d: "M12 9v4" }),
			/* @__PURE__ */ jsx("path", { d: "M12 17h.01" })
		]
	});
}
function Clapperboard({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" }),
			/* @__PURE__ */ jsx("path", { d: "m6.2 5.3 3.1 3.9" }),
			/* @__PURE__ */ jsx("path", { d: "m12.4 3.4 3.1 4" }),
			/* @__PURE__ */ jsx("path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" })
		]
	});
}
function Type({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M4 7V5h16v2" }),
			/* @__PURE__ */ jsx("path", { d: "M12 5v14" }),
			/* @__PURE__ */ jsx("path", { d: "M9 19h6" })
		]
	});
}
function Copy({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("rect", {
			x: "9",
			y: "9",
			width: "12",
			height: "12",
			rx: "2"
		}), /* @__PURE__ */ jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })]
	});
}
function Image({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "3",
				y: "3",
				width: "18",
				height: "18",
				rx: "2"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "9",
				cy: "9",
				r: "2"
			}),
			/* @__PURE__ */ jsx("path", { d: "m21 15-3.5-3.5a1.5 1.5 0 0 0-2 0L6 21" })
		]
	});
}
function Brush({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" }), /* @__PURE__ */ jsx("path", { d: "M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" })]
	});
}
function Focus({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }),
			/* @__PURE__ */ jsx("path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }),
			/* @__PURE__ */ jsx("path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }),
			/* @__PURE__ */ jsx("path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }),
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "3"
			})
		]
	});
}
function Expand({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "m15 15 6 6" }),
			/* @__PURE__ */ jsx("path", { d: "m21 15v6h-6" }),
			/* @__PURE__ */ jsx("path", { d: "m9 9-6-6" }),
			/* @__PURE__ */ jsx("path", { d: "m3 9V3h6" })
		]
	});
}
function Hand({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }),
			/* @__PURE__ */ jsx("path", { d: "M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" }),
			/* @__PURE__ */ jsx("path", { d: "M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" }),
			/* @__PURE__ */ jsx("path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" })
		]
	});
}
function Info({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}),
			/* @__PURE__ */ jsx("path", { d: "M12 16v-4" }),
			/* @__PURE__ */ jsx("path", { d: "M12 8h.01" })
		]
	});
}
function Pause({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("rect", {
			x: "14",
			y: "4",
			width: "4",
			height: "16",
			rx: "1"
		}), /* @__PURE__ */ jsx("rect", {
			x: "6",
			y: "4",
			width: "4",
			height: "16",
			rx: "1"
		})]
	});
}
function Download({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
			/* @__PURE__ */ jsx("path", { d: "m7 10 5 5 5-5" }),
			/* @__PURE__ */ jsx("path", { d: "M12 15V3" })
		]
	});
}
function EyeOff({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }),
			/* @__PURE__ */ jsx("path", { d: "M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" }),
			/* @__PURE__ */ jsx("path", { d: "M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" }),
			/* @__PURE__ */ jsx("path", { d: "m2 2 20 20" })
		]
	});
}
function RefreshCw({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
			/* @__PURE__ */ jsx("path", { d: "M21 3v5h-5" }),
			/* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
			/* @__PURE__ */ jsx("path", { d: "M3 21v-5h5" })
		]
	});
}
function RotateCw({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }), /* @__PURE__ */ jsx("path", { d: "M21 3v5h-5" })]
	});
}
function RotateCcw({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), /* @__PURE__ */ jsx("path", { d: "M3 3v5h5" })]
	});
}
function Target({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "6"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "2"
			})
		]
	});
}
function ImagePlus({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M16 5h6" }),
			/* @__PURE__ */ jsx("path", { d: "M19 2v6" }),
			/* @__PURE__ */ jsx("path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }),
			/* @__PURE__ */ jsx("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }),
			/* @__PURE__ */ jsx("circle", {
				cx: "9",
				cy: "9",
				r: "2"
			})
		]
	});
}
function Camera({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }), /* @__PURE__ */ jsx("circle", {
			cx: "12",
			cy: "13",
			r: "3"
		})]
	});
}
function FileBox({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }),
			/* @__PURE__ */ jsx("path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }),
			/* @__PURE__ */ jsx("path", { d: "M10 9H8" }),
			/* @__PURE__ */ jsx("path", { d: "M16 13H8" }),
			/* @__PURE__ */ jsx("path", { d: "M16 17H8" })
		]
	});
}
/** Lucide-faithful `audio-lines` (new 2026-10-08 — the history kind
* face's audio glyph; no prior card copy existed to unify). */
function AudioLines({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M2 10v3" }),
			/* @__PURE__ */ jsx("path", { d: "M6 6v11" }),
			/* @__PURE__ */ jsx("path", { d: "M10 3v18" }),
			/* @__PURE__ */ jsx("path", { d: "M14 8v7" }),
			/* @__PURE__ */ jsx("path", { d: "M18 5v13" }),
			/* @__PURE__ */ jsx("path", { d: "M22 10v3" })
		]
	});
}
function Film({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("rect", {
				x: "3",
				y: "3",
				width: "18",
				height: "18",
				rx: "2"
			}),
			/* @__PURE__ */ jsx("path", { d: "M7 3v18" }),
			/* @__PURE__ */ jsx("path", { d: "M3 7.5h4" }),
			/* @__PURE__ */ jsx("path", { d: "M3 12h18" }),
			/* @__PURE__ */ jsx("path", { d: "M3 16.5h4" }),
			/* @__PURE__ */ jsx("path", { d: "M17 3v18" }),
			/* @__PURE__ */ jsx("path", { d: "M17 7.5h4" }),
			/* @__PURE__ */ jsx("path", { d: "M17 16.5h4" })
		]
	});
}
function Crop({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }), /* @__PURE__ */ jsx("path", { d: "M18 22V8a2 2 0 0 0-2-2H2" })]
	});
}
function Frame({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M22 6H2" }),
			/* @__PURE__ */ jsx("path", { d: "M22 18H2" }),
			/* @__PURE__ */ jsx("path", { d: "M6 2v20" }),
			/* @__PURE__ */ jsx("path", { d: "M18 2v20" })
		]
	});
}
function Volume2({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
			/* @__PURE__ */ jsx("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
			/* @__PURE__ */ jsx("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" })
		]
	});
}
function VolumeX({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
			/* @__PURE__ */ jsx("line", {
				x1: "22",
				x2: "16",
				y1: "9",
				y2: "15"
			}),
			/* @__PURE__ */ jsx("line", {
				x1: "16",
				x2: "22",
				y1: "9",
				y2: "15"
			})
		]
	});
}
function Maximize({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
			/* @__PURE__ */ jsx("path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }),
			/* @__PURE__ */ jsx("path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }),
			/* @__PURE__ */ jsx("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" })
		]
	});
}
function Minimize2({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("path", { d: "M4 14h6v6" }),
			/* @__PURE__ */ jsx("path", { d: "M20 10h-6V4" }),
			/* @__PURE__ */ jsx("path", { d: "m14 10 7-7" }),
			/* @__PURE__ */ jsx("path", { d: "m3 21 7-7" })
		]
	});
}
function Dices({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [
			/* @__PURE__ */ jsx("rect", {
				width: "12",
				height: "12",
				x: "2",
				y: "10",
				rx: "2",
				ry: "2"
			}),
			/* @__PURE__ */ jsx("path", { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" }),
			/* @__PURE__ */ jsx("path", { d: "M6 18h.01" }),
			/* @__PURE__ */ jsx("path", { d: "M10 14h.01" }),
			/* @__PURE__ */ jsx("path", { d: "M15 6h.01" }),
			/* @__PURE__ */ jsx("path", { d: "M18 9h.01" })
		]
	});
}
function Square({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2"
		})
	});
}
function Eye({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" }), /* @__PURE__ */ jsx("circle", {
			cx: "12",
			cy: "12",
			r: "3"
		})]
	});
}
function Play({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "m6 3 14 9-14 9V3z" })
	});
}
/** Motion's simplified eye variant. */
function EyeAlt({ className, style, ...rest }) {
	return /* @__PURE__ */ jsxs(Svg, {
		className,
		style,
		...rest,
		children: [/* @__PURE__ */ jsx("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" }), /* @__PURE__ */ jsx("circle", {
			cx: "12",
			cy: "12",
			r: "3"
		})]
	});
}
/** Motion's sharp-corner play variant. */
function PlayAlt({ className, style, ...rest }) {
	return /* @__PURE__ */ jsx(Svg, {
		className,
		style,
		...rest,
		children: /* @__PURE__ */ jsx("path", { d: "M6 4l14 8-14 8V4z" })
	});
}
//#endregion
//#region src/stage3d.ts
/**
* stage3d — the SHARED raw-three stage core (the substrate law).
*
* One imperative mount that every 3D viewport in the card plane builds
* on: renderer + camera + OrbitControls + the rAF loop + resize
* observation + pointer picking + full disposal. Pure TypeScript over
* three and three/addons — NO @react-three anywhere (the r3f
* react-reconciler version-skew boot crash is why this exists).
*
* Consumers own their SCENE CONTENT (lights, floor, figures) and their
* FRAME LOGIC via addTick (ordered registry — ticks run in registration
* order before each render, the raw analogue of useFrame declared top
* to bottom in a JSX tree).
*
* Pointer semantics (the r3f onClick/onPointerOver/onPointerOut
* analogue): an object becomes interactive by carrying
* `userData.pick = { click?, over?, out? }` on itself or an ancestor.
* The stage raycasts on pointermove and click, walks parentward from
* the hit to the first pick carrier, and calls the handlers with the
* world intersection point + the DOM event. A drag-orbit never reads
* as a click (the 350ms threshold). Gizmo subtrees (TransformControls)
* are excluded from picking — r3f did this implicitly.
*/
/** THE 3D STAGE COLOUR (the one owner). The void every raw-three
*  viewport clears behind its scene, and the light counterpart the
*  pose stage flips to. Every renderer/background that paints this
*  stage reads these constants — a stage colour edited in one place
*  lands at every stage.
*
*  The CSS channel is the `--melite-stage-bg` custom property:
*  ViewportFrame sets it from STAGE_BACKGROUND_DARK on the frame
*  element, and the sheets that tint the frame and the overlays on
*  it read that property, so no stylesheet restates the hex. */
const STAGE_BACKGROUND_DARK = "#0e0e1a";
const STAGE_BACKGROUND_LIGHT = "#e4e4f0";
/** The r3f pointer-events analogue lives on userData.pick (see header). */
function findPickCarrier(o) {
	let cur = o;
	while (cur !== null) {
		if (cur.userData !== void 0 && cur.userData.pick !== void 0) return cur;
		cur = cur.parent;
	}
	return null;
}
/** Skip hits on a TransformControls gizmo subtree (invisible pick planes
*  would swallow every click while a gizmo is attached). */
function isGizmoHit(o) {
	let cur = o;
	while (cur !== null) {
		if (cur.gizmo !== void 0) return true;
		cur = cur.parent;
	}
	return false;
}
function mountStage3D(canvas, opts = {}) {
	let renderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: opts.alpha !== false,
			preserveDrawingBuffer: opts.preserveDrawingBuffer === true
		});
	} catch (e) {
		opts.onContextFailure?.(e instanceof Error ? e.message : "WebGL unavailable");
		return null;
	}
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.toneMapping = opts.toneMapping ?? THREE.ACESFilmicToneMapping;
	const scene = new THREE.Scene();
	scene.background = null;
	const camera = new THREE.PerspectiveCamera(opts.fov ?? 45, 1, opts.near ?? .05, opts.far ?? 60);
	camera.position.set(...opts.camera ?? [
		2.2,
		1.6,
		2.6
	]);
	camera.lookAt(0, .8, 0);
	const controls = new OrbitControls(camera, canvas);
	controls.target.set(...opts.target ?? [
		0,
		.8,
		0
	]);
	controls.enableDamping = true;
	controls.dampingFactor = .1;
	if (opts.minDistance !== void 0) controls.minDistance = opts.minDistance;
	if (opts.maxDistance !== void 0) controls.maxDistance = opts.maxDistance;
	if (opts.maxPolarAngle !== void 0) controls.maxPolarAngle = opts.maxPolarAngle;
	controls.update();
	const ticks = [];
	const addTick = (fn) => {
		ticks.push(fn);
		return () => {
			const i = ticks.indexOf(fn);
			if (i >= 0) ticks.splice(i, 1);
		};
	};
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	let hovered = null;
	let downAt = 0;
	const threshold = opts.clickVsDragMs ?? 350;
	const pickAt = (ev) => {
		const r = canvas.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) return null;
		pointer.x = (ev.clientX - r.left) / r.width * 2 - 1;
		pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
		raycaster.setFromCamera(pointer, camera);
		const hits = raycaster.intersectObjects(scene.children, true);
		for (const hit of hits) {
			if (isGizmoHit(hit.object)) continue;
			const carrier = findPickCarrier(hit.object);
			if (carrier !== null) return {
				carrier,
				point: hit.point
			};
		}
		return null;
	};
	const onPointerDown = (e) => {
		downAt = e.timeStamp;
	};
	const onPointerMove = (e) => {
		const found = pickAt(e);
		const carrier = found?.carrier ?? null;
		if (carrier !== hovered) {
			(hovered?.userData.pick)?.out?.(e);
			document.body.style.cursor = "auto";
			hovered = carrier;
			if (carrier !== null && found !== null) carrier.userData.pick.over?.(found.point, e);
		}
	};
	const onPointerLeave = (e) => {
		if (hovered !== null) {
			hovered.userData.pick.out?.(e);
			document.body.style.cursor = "auto";
			hovered = null;
		}
	};
	const onClick = (e) => {
		if (e.timeStamp - downAt > threshold) return;
		const found = pickAt(e);
		if (found !== null) found.carrier.userData.pick.click?.(found.point, e);
		else opts.onEmptyClick?.();
	};
	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("pointerleave", onPointerLeave);
	canvas.addEventListener("click", onClick);
	let raf = 0;
	const clock = new THREE.Clock();
	const frame = () => {
		raf = requestAnimationFrame(frame);
		const delta = clock.getDelta();
		for (const t of ticks) t(delta);
		controls.update();
		renderer.render(scene, camera);
	};
	frame();
	const resize = () => {
		const w = canvas.clientWidth, h = canvas.clientHeight;
		if (w === 0 || h === 0) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	};
	resize();
	const ro = new ResizeObserver(resize);
	ro.observe(canvas);
	return {
		canvas,
		renderer,
		scene,
		camera,
		controls,
		addTick,
		resize,
		dispose: () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			canvas.removeEventListener("pointerdown", onPointerDown);
			canvas.removeEventListener("pointermove", onPointerMove);
			canvas.removeEventListener("pointerleave", onPointerLeave);
			canvas.removeEventListener("click", onClick);
			controls.dispose();
			renderer.dispose();
		}
	};
}
/** A billboard TEXT label — the drei <Billboard><Text/></Text> analogue:
*  canvas-drawn glyphs on a THREE.Sprite (sprites always face the camera,
*  which IS the billboard). worldHeight is the label's height in scene
*  units (drei Text's fontSize is world units too). */
function makeLabelSprite(text, color, worldHeight) {
	const px = 96;
	const c = document.createElement("canvas");
	const ctx = c.getContext("2d");
	if (ctx !== null) {
		ctx.font = `600 ${px}px system-ui, sans-serif`;
		const w = Math.ceil(ctx.measureText(text).width) + 32;
		c.width = w;
		c.height = 128;
		ctx.font = `600 ${px}px system-ui, sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = color;
		ctx.fillText(text, w / 2, 64);
	}
	const tex = new THREE.CanvasTexture(c);
	tex.minFilter = THREE.LinearFilter;
	const mat = new THREE.SpriteMaterial({
		map: tex,
		transparent: true
	});
	const sprite = new THREE.Sprite(mat);
	const aspect = c.width / c.height;
	sprite.scale.set(worldHeight * aspect, worldHeight, 1);
	return sprite;
}
//#endregion
//#region src/preview.module.css
var preview_module_default = {
	"empty": "yvIe7G_empty",
	"figureError": "yvIe7G_figureError",
	"hero": "yvIe7G_hero",
	"heroAudio": "yvIe7G_heroAudio",
	"heroImg": "yvIe7G_heroImg",
	"heroIncoming": "yvIe7G_heroIncoming",
	"historyBlock": "yvIe7G_historyBlock",
	"historyTile": "yvIe7G_historyTile",
	"historyTileActive": "yvIe7G_historyTileActive",
	"historyTitle": "yvIe7G_historyTitle",
	"layerChip": "yvIe7G_layerChip",
	"layerRow": "yvIe7G_layerRow",
	"reportCard": "yvIe7G_reportCard",
	"reportChip": "yvIe7G_reportChip",
	"reportChips": "yvIe7G_reportChips",
	"reportHead": "yvIe7G_reportHead",
	"reportKey": "yvIe7G_reportKey",
	"reportRow": "yvIe7G_reportRow",
	"reportRows": "yvIe7G_reportRows",
	"reportStatus": "yvIe7G_reportStatus",
	"reportTitle": "yvIe7G_reportTitle",
	"reportVal": "yvIe7G_reportVal",
	"stageCanvas": "yvIe7G_stageCanvas",
	"stagePreview": "yvIe7G_stagePreview",
	"staleBadge": "yvIe7G_staleBadge",
	"strip": "yvIe7G_strip",
	"stripLink": "yvIe7G_stripLink",
	"thumb": "yvIe7G_thumb",
	"thumbFace": "yvIe7G_thumbFace",
	"thumbRow": "yvIe7G_thumbRow",
	"thumbVideo": "yvIe7G_thumbVideo",
	"thumbVideoActive": "yvIe7G_thumbVideoActive",
	"thumbVideoBtn": "yvIe7G_thumbVideoBtn",
	"thumbVideoName": "yvIe7G_thumbVideoName"
};
//#endregion
//#region src/glb-stage.tsx
/**
* glb-stage.tsx — THE MESH PREVIEW (the preview seam's mesh-kind
* claim, hour 14 2026-09-13). Grown from img-to-mesh's GlbViewport
* (the raw-three substrate, verbatim) + the old @melite-plugin/3d
* Stage's multi-asset contract (assets/selection/per-asset errors —
* the four props anny's assembly actually uses; drop-placement
* gizmos and mixers stay unported until a consumer ports them, the
* promotion law).
*
* SUBSTRATE LAW (verbatim, the 2026-09-12 boot-crash lesson): RAW
* three.js — imperative scene in a useEffect, NO @react-three. r3f's
* bundled react-reconciler reads the seeded React 19 internals by
* minified single-letter fields and a version-skew throws at boot
* ("reading 'S' of undefined"). three is a pure leaf library: no
* React entanglement, mounts like any imperative canvas lib.
*
* THE PREVIEW-PORT INTERACTION LAW (the operator's catch, hour 14:
* "Anny and Trellis are close to the same, but the way they interact
* with the preview port is different"): ONE stage component serves
* both — selection + per-asset errors are the stage's own uniform
* interaction surface; studio chrome (anchors, badges, in-card
* actions like anny's HMR fit-body) docks AROUND it, never inside.
*/
let draco = null;
function loader() {
	if (draco === null) {
		draco = new DRACOLoader();
		draco.setDecoderPath("/draco/gltf/");
	}
	const l = new GLTFLoader();
	l.setDRACOLoader(draco);
	return l;
}
/** One stage asset — the old Stage contract's live subset (the four
*  fields consumers set: id/url/name + the placement override; the
*  drop-raycast position stays caller-computed). */
function meshAssetUrl(value) {
	const match = /^data\/input\/([^?#]+)$/i.exec(value);
	return match === null ? value : `/v1/assets/inputs/${encodeURIComponent(match[1] ?? "")}`;
}
/** Normalize a loaded scene to a known viewing size — the fit law:
*  center X/Z, scale the largest dimension to targetHeight, feet on
*  y=0, mutating the root in place. The ALGORITHM lives in
*  @melite/formats (fitObjectToHeight); this adapts the return shape
*  its callers read. Meshes arrive at wildly different scales, and
*  the one rule is that every viewport frames them identically. */
function autoFitToHeight(root, targetHeight = 1.6) {
	fitObjectToHeight(root, targetHeight);
	const box = new THREE.Box3().setFromObject(root);
	return {
		box,
		height: box.getSize(new THREE.Vector3()).y
	};
}
/** The imperative three scene — BUILT ON THE SHARED STAGE CORE
*  (stage3d.ts): the core owns renderer/camera/controls/rAF/resize/picking;
*  this adds the glb-stage's own light rig + floor grid and maps the core's
*  pick semantics onto the stage-asset id (group.userData.pick → clickSink,
*  empty click → clickSink(null)). A drag-orbit never reads as a click. */
function mountScene(canvas, onFail) {
	let clickSink = () => {};
	const stage = mountStage3D(canvas, {
		fov: 40,
		camera: [
			2.2,
			1.6,
			2.6
		],
		target: [
			0,
			.8,
			0
		],
		toneMapping: THREE.NoToneMapping,
		onContextFailure: onFail,
		onEmptyClick: () => clickSink(null)
	});
	if (stage === null) return null;
	const scene = stage.scene;
	scene.add(new THREE.HemisphereLight(16777215, 9079434, 1.4));
	const key = new THREE.DirectionalLight(16777215, 2.2);
	key.position.set(3, 5, 2);
	scene.add(key);
	const fill = new THREE.DirectionalLight(16777215, .6);
	fill.position.set(-3, 2, -2);
	scene.add(fill);
	const grid = new THREE.GridHelper(6, 24, 12303291, 14540253);
	const gridMat = grid.material;
	gridMat.transparent = true;
	gridMat.opacity = .35;
	scene.add(grid);
	return {
		scene,
		setClickSink: (fn) => {
			clickSink = fn;
		},
		addTick: stage.addTick,
		dispose: () => {
			grid.geometry.dispose();
			stage.dispose();
		}
	};
}
/** The selection tint — emissive lift on the selected group's meshes
*  (the old Stage's highlight, the DOM-free way; lifted meshes read
*  at any theme because emissive adds, never replaces). */
function tint(root, on) {
	root.traverse((o) => {
		const m = o.material;
		if (m !== void 0 && m !== null && "emissive" in m) m.emissive.setHex(on ? 3159626 : 0);
	});
}
/** Flip the wireframe flag on every wireframe-capable material under
*  the root (mesh materials; points/lines have no such flag and are
*  left alone). Idempotent — loads mint fresh materials, so no
*  original-flag bookkeeping is owed. */
function applyWireframe(root, on) {
	root.traverse((o) => {
		const m = o.material;
		if (m !== void 0 && m !== null && "wireframe" in m) m.wireframe = on;
	});
}
/** A bone-visualization overlay for one loaded group — null when
*  the group carries no bones (unrigged meshes seat no overlay, the
*  honest absence). The caller adds the helper to the scene and owns
*  its visibility + disposal. */
function skeletonHelperFor(group) {
	const bones = [];
	group.traverse((o) => {
		if (o.isBone === true) bones.push(o);
	});
	if (bones.length === 0) return null;
	return new THREE.SkeletonHelper(group);
}
/** THE TURNTABLE SPEED (radians/sec) — one revolution every ~12.5s,
*  the gentle review idle; fast enough to read as motion in a
*  glance, slow enough to inspect. */
const TURNTABLE_SPEED = .5;
/** One turntable frame: rotate every group about its OWN Y axis
*  (each spins in place — the row layout's positions stand). Pure —
*  the stage's tick seam calls it with the rAF delta; a 0 delta is
*  a no-op. Declared per-asset rotation rides along (the spin adds
*  to the current angle, never resets it). */
function turntableTick(groups, delta) {
	if (delta === 0) return;
	const d = TURNTABLE_SPEED * delta;
	for (const g of groups) g.rotation.y += d;
}
/** ── THE WEIGHTS HEAT OVERLAY (primitive ②, fourth slice) ───────────
*
* Per-vertex skin-weight heat: a skinned mesh's dominant-bone weight
* (the max of its skinWeight components, ∈ [0.25,1] under 4
* influences) paints a blue→red ramp through vertex colors. Unskinned
* meshes are untouched (no skinWeight attribute — no lane, no paint).
* OFF restores each geometry's ORIGINAL color attribute (cached the
* first time we touch it — absent means we delete ours) and the
* material's vertexColors flag. Idempotent both ways. */
/** The heat ramp — 5 stops (blue→cyan→green→yellow→red), t clamped.
*  Pure: the same ramp every stage paints, the wall pins the stops. */
function heatColor(t) {
	const x = Math.min(1, Math.max(0, t));
	const stops = [
		[
			0,
			0,
			1
		],
		[
			0,
			1,
			1
		],
		[
			0,
			1,
			0
		],
		[
			1,
			1,
			0
		],
		[
			1,
			0,
			0
		]
	];
	const s = x * (stops.length - 1);
	const i = Math.min(stops.length - 2, Math.floor(s));
	const f = s - i;
	const a = stops[i], b = stops[i + 1];
	return [
		a[0] + (b[0] - a[0]) * f,
		a[1] + (b[1] - a[1]) * f,
		a[2] + (b[2] - a[2]) * f
	];
}
const weightColorCache = /* @__PURE__ */ new WeakMap();
function applyWeightsHeat(root, on) {
	root.traverse((o) => {
		const mesh = o;
		const geo = mesh.geometry;
		if (geo === void 0) return;
		const mat = mesh.material;
		if (mat === void 0 || mat === null || Array.isArray(mat)) return;
		const sw = geo.getAttribute("skinWeight");
		if (sw === void 0) return;
		const pos = geo.getAttribute("position");
		if (pos === void 0) return;
		const sm = mat;
		if (on) {
			if (!weightColorCache.has(geo)) weightColorCache.set(geo, geo.getAttribute("color") ?? null);
			const colors = new Float32Array(pos.count * 3);
			const comps = Math.min(4, sw.itemSize);
			for (let i = 0; i < pos.count; i++) {
				let w = sw.getX(i);
				for (let c = 1; c < comps; c++) {
					const v = c === 1 ? sw.getY(i) : c === 2 ? sw.getZ(i) : sw.getW(i);
					if (v > w) w = v;
				}
				const [r, g, b] = heatColor(w);
				colors[i * 3] = r;
				colors[i * 3 + 1] = g;
				colors[i * 3 + 2] = b;
			}
			geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
			sm.vertexColors = true;
			sm.needsUpdate = true;
		} else {
			const orig = weightColorCache.get(geo);
			if (orig === null) geo.deleteAttribute("color");
			else if (orig !== void 0) geo.setAttribute("color", orig);
			if (sm.vertexColors === true) {
				sm.vertexColors = false;
				sm.needsUpdate = true;
			}
		}
	});
}
/** ── NAMED MESH SLOTS (primitive ②, third slice) ────────────────────
* A comparison seat: assets may declare a SLOT (`slot: 'source'` /
* `'result'`, body/garment, donor/target, LOD names) — the stage
* paints the slot's label above the asset (a billboard sprite, the
* stage3d makeLabelSprite). Unslotted assets seat unlabeled, as
* ever. Pure derivation, mount-side paint (the WebGL-exempt arm). */
function slotLabelOf(asset) {
	return typeof asset.slot === "string" && asset.slot !== "" ? asset.slot : null;
}
/** THE MESH STAGE PREVIEW — the multi-asset GLB viewport (assets in a
*  row, click to select, per-asset load failures reported upward).
*  No assets → the honest empty state; the canvas mounts when the
*  first asset lands. */
function GlbStagePreview({ assets, selectedId, onSelect, onAssetError, emptyHint, label, layers, onLayers, turntable }) {
	const canvasRef = useRef(null);
	const sceneRef = useRef(null);
	const skeletonHelpers = useRef([]);
	const slotLabels = useRef([]);
	const [loaded, setLoaded] = useState([]);
	const [failed, setFailed] = useState(null);
	const [ready, setReady] = useState(false);
	const selectRef = useRef(onSelect);
	selectRef.current = onSelect;
	const key = assets.map((a) => a.id + "@" + a.url).join("|");
	const errRef = useRef(onAssetError);
	errRef.current = onAssetError;
	const groupsRef = useRef([]);
	groupsRef.current = loaded.map((l) => l.group);
	const turntableRef = useRef(turntable === true);
	turntableRef.current = turntable === true;
	useEffect(() => {
		setLoaded([]);
		setFailed(null);
		setReady(false);
		if (assets.length === 0) return;
		let alive = true;
		let pending = assets.length;
		const settle = () => {
			if (alive && pending === 0) setReady(true);
		};
		for (const a of assets) loader().load(meshAssetUrl(a.url), (g) => {
			if (!alive) return;
			autoFitToHeight(g.scene);
			const group = new THREE.Group();
			group.userData.stageId = a.id;
			group.userData.pick = { click: () => selectRef.current?.(a.id) };
			group.add(g.scene);
			if (a.scale !== void 0) group.scale.multiplyScalar(a.scale);
			if (a.rotation !== void 0) group.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
			if (a.position !== void 0) group.position.set(a.position[0], a.position[1], a.position[2]);
			setLoaded((prev) => [...prev, {
				asset: a,
				group
			}]);
			errRef.current?.(a.id, null);
			pending -= 1;
			settle();
		}, void 0, (e) => {
			if (!alive) return;
			errRef.current?.(a.id, e instanceof Error ? e.message : "glb load failed");
			pending -= 1;
			settle();
		});
		return () => {
			alive = false;
		};
	}, [key]);
	useEffect(() => {
		if (!ready || loaded.length === 0) return;
		const canvas = canvasRef.current;
		const mounted = mountScene(canvas, (m) => setFailed(m));
		if (mounted === null) return;
		sceneRef.current = mounted;
		mounted.setClickSink((id) => selectRef.current?.(id));
		let x = 0;
		for (const { asset, group } of loaded) {
			mounted.scene.add(group);
			if (asset.position === void 0) {
				const box = new THREE.Box3().setFromObject(group);
				const size = new THREE.Vector3();
				box.getSize(size);
				group.position.x += x + size.x / 2;
				x += size.x + .4;
			}
		}
		const helpers = [];
		for (const { group } of loaded) {
			const helper = skeletonHelperFor(group);
			if (helper !== null) {
				helper.visible = false;
				mounted.scene.add(helper);
				helpers.push(helper);
			}
		}
		skeletonHelpers.current = helpers;
		const labels = [];
		for (const { asset, group } of loaded) {
			const text = slotLabelOf(asset);
			if (text === null) continue;
			const sprite = makeLabelSprite(text, "#1c1f26", .05);
			const box = new THREE.Box3().setFromObject(group);
			sprite.position.set(group.position.x, box.max.y + .06, 0);
			mounted.scene.add(sprite);
			labels.push(sprite);
		}
		slotLabels.current = labels;
		mounted.addTick((dt) => {
			if (!turntableRef.current) return;
			turntableTick(groupsRef.current, dt);
		});
		return () => {
			for (const helper of skeletonHelpers.current) {
				mounted.scene.remove(helper);
				helper.dispose();
			}
			skeletonHelpers.current = [];
			for (const sprite of slotLabels.current) {
				mounted.scene.remove(sprite);
				const mat = sprite.material;
				mat.map?.dispose();
				mat.dispose();
			}
			slotLabels.current = [];
			sceneRef.current = null;
			mounted.dispose();
		};
	}, [ready, loaded]);
	useEffect(() => {
		for (const { asset, group } of loaded) tint(group, asset.id === selectedId);
	}, [loaded, selectedId]);
	const wireframe = layers?.wireframe ?? false;
	useEffect(() => {
		for (const { group } of loaded) applyWireframe(group, wireframe);
	}, [loaded, wireframe]);
	const skeleton = layers?.skeleton ?? false;
	useEffect(() => {
		for (const helper of skeletonHelpers.current) helper.visible = skeleton;
	}, [loaded, skeleton]);
	const weights = layers?.weights === true;
	useEffect(() => {
		for (const { group } of loaded) applyWeightsHeat(group, weights);
	}, [loaded, weights]);
	return createElement("div", {
		className: preview_module_default.stagePreview,
		"data-viewport": label ?? "glb-stage"
	}, assets.length === 0 ? createElement("div", { className: preview_module_default.empty }, emptyHint ?? "Run the card to see the mesh") : failed !== null ? createElement("div", { className: preview_module_default.empty }, "viewport failed: " + failed) : !ready ? createElement("div", { className: preview_module_default.empty }, "loading mesh…") : createElement("canvas", {
		ref: canvasRef,
		className: preview_module_default.stageCanvas,
		"data-testid": "stage-preview-glb"
	}), onLayers !== void 0 && assets.length > 0 ? createElement("div", {
		className: preview_module_default.layerRow,
		role: "group",
		"aria-label": "mesh layers"
	}, createElement("button", {
		type: "button",
		className: preview_module_default.layerChip,
		"aria-pressed": !wireframe,
		onClick: () => {
			onLayers({
				wireframe: false,
				skeleton,
				weights
			});
		}
	}, "Shaded"), createElement("button", {
		type: "button",
		className: preview_module_default.layerChip,
		"aria-pressed": wireframe,
		onClick: () => {
			onLayers({
				wireframe: true,
				skeleton,
				weights
			});
		}
	}, "Wireframe"), createElement("button", {
		type: "button",
		className: preview_module_default.layerChip,
		"aria-pressed": skeleton,
		onClick: () => {
			onLayers({
				wireframe,
				skeleton: !skeleton,
				weights
			});
		}
	}, "Skeleton"), createElement("button", {
		type: "button",
		className: preview_module_default.layerChip,
		"aria-pressed": weights,
		onClick: () => {
			onLayers({
				wireframe,
				skeleton,
				weights: !weights
			});
		}
	}, "Weights")) : null);
}
//#endregion
//#region src/square.tsx
/**
* square.tsx — InputSquare, THE ONE square for any slot-shaped value
* — the base's default input component. Ported from the old system's
* SlotSquare law (packages/web-kit/ui/SlotSquare.tsx, 2026-08-08:
* "the look for it will be reused for the sub-card system") onto the
* DSH substrate: ui-primitives glyphs, module CSS under the
* web-styling chrome laws, no lucide/cn/tip.
*
* THE PLUS LAW (2026-09-13, the operator): the empty square
* carries the PLUS — "add a source" — and the click opens the
* three-entry source menu (From flow / From media / From file) in
* the provider; a bare square without a picker still files.
* THE OLD LAW, KEPT — a square thumbnail with label + badge
* + the THREE source verbs (operator, 2026-09-12: "we rendered a
* square and gave the option to do 1 of 3 things"):
*   a) from previous card  → onClick (the host opens the wire picker;
*                            badge = the upstream card's title)
*   b) from file upload    → onPickFile/onDropFile (hidden input +
*                            OS drop — the ONE read path readAsDataURL)
*   c) from media bar      → onDropAsset (the ASSET_DRAG_MIME contract
*                            the drop surface already serves)
* plus the X (detach). The consumer owns the doors — this shell only
* voices them (ui-attachment's own law: presentation registers, the
* service seams stay with their owners).
*
* THE CONSTRUCTION LAW (2026-09-12, the card-base founding): a card
* package EMITS an image input → the base constructs THIS square
* automatically. One input component; no card hand-rolls its own
* file field ever again.
*/
/** THE "is this a thumbnail" rule (SlotSquare's, kept verbatim):
*  data: images, blob: fresh-upload mirrors, and http(s)/root-relative
*  artifact URLs. Every slot-shaped value renders the same way. */
const IMAGE_EXTS = [...mediaVocab().image, "avif"].filter((e) => e !== "svg");
const IMAGE_EXT_RE = new RegExp("\\.(?:" + IMAGE_EXTS.join("|") + ")(?:[?#]|$)", "i");
function isImageUrl(value) {
	return /^data:image\//i.test(value) || /^blob:/i.test(value) || /^(?:https?:)?\/[^"'<>]*\./i.test(value) && IMAGE_EXT_RE.test(value);
}
/** THE MESH FACE of the same rule (the mesh wire type, 2026-09-21 —
*  the base-gaps primitive ③): a .glb/.gltf value — an estate path
*  ('data/input/x.glb') or a run artifact URL — renders the ONE
*  square with the inline GLB thumb (the mini GlbStagePreview), the
*  same square grammar as images: never a bespoke mesh picker. */
function isMeshUrl(value) {
	return isModelUrl(value);
}
const DEFAULT_SQUARE_ACCEPT = "image/png,image/jpeg,image/webp";
const MESH_SQUARE_ACCEPT = ".glb,.gltf";
function InputSquare(props) {
	const { label, value, metric, disabled } = props;
	const seat = props.ariaLabel ?? label;
	const fileRef = useRef(null);
	const boxRef = useRef(null);
	const [over, setOver] = useState(false);
	const thumb = typeof value === "string" && isImageUrl(value) ? value : null;
	const mesh = thumb === null && typeof value === "string" && value !== "" && isMeshUrl(value) ? value : null;
	const empty = thumb === null && mesh === null;
	const acceptsDrop = (event) => {
		if (event.dataTransfer.getData("application/tech-noir-asset") !== "" || event.dataTransfer.files.length > 0) return true;
		const types = event.dataTransfer.types;
		if (types === void 0 || types === null) return false;
		return types.includes("application/tech-noir-asset") || types.includes("Files");
	};
	const pick = () => {
		if (disabled) return;
		if (props.onPick !== void 0) props.onPick(boxRef.current);
		else if (empty && props.onFile !== void 0) fileRef.current?.click();
	};
	return createElement("div", { className: card_module_default.squareWrap + (disabled ? " " + card_module_default.squareOff : "") }, createElement("div", {
		ref: boxRef,
		className: card_module_default.squareBox + (over ? " " + card_module_default.squareOver : ""),
		role: "button",
		tabIndex: 0,
		"data-slot-square": true,
		"aria-label": (seat || "source") + (seat !== "" ? " source" : ""),
		onClick: pick,
		onKeyDown: (e) => {
			if (e.key === "Enter") pick();
		},
		onDragOver: (e) => {
			if (disabled || !acceptsDrop(e)) return;
			e.preventDefault();
			setOver(true);
		},
		onDragLeave: () => {
			setOver(false);
		},
		onDrop: (e) => {
			setOver(false);
			if (disabled || !acceptsDrop(e)) return;
			e.preventDefault();
			const asset = parseAssetDrop(e.dataTransfer.getData(ASSET_DRAG_MIME));
			if (asset.url !== void 0 && props.onAsset !== void 0) {
				props.onAsset(asset.url);
				return;
			}
			const file = e.dataTransfer.files[0];
			if (file !== void 0 && props.onFile !== void 0) props.onFile(file);
		}
	}, thumb !== null ? createElement("img", {
		className: card_module_default.squareThumb,
		src: thumb,
		alt: label
	}) : mesh !== null ? createElement("div", { className: card_module_default.squareMesh }, createElement(GlbStagePreview, {
		assets: [{
			id: "square-mesh",
			url: mesh
		}],
		label: "square-mesh"
	})) : props.emptyIcon === void 0 ? createElement(IconPlusOutlineRegular, { className: card_module_default.squareGlyph }) : createElement("span", { className: card_module_default.squareEmptyIcon }, props.emptyIcon), props.actions !== void 0 && props.actions !== null && props.actions !== false && !disabled ? createElement("span", {
		className: card_module_default.squareActions,
		onClick: (event) => {
			event.stopPropagation();
		}
	}, props.actions) : null, !empty && props.onClear !== void 0 ? createElement("button", {
		className: card_module_default.squareX,
		type: "button",
		title: "Detach",
		"aria-label": "Detach " + (seat || "source"),
		onClick: (e) => {
			e.stopPropagation();
			props.onClear();
		}
	}, "✕") : null, props.showFileAction === true && props.onFile !== void 0 && !disabled ? createElement("button", {
		className: card_module_default.squarePick,
		type: "button",
		title: `Pick a file for ${label}`,
		"aria-label": `Pick a file for ${label}`,
		"data-slot-pick": true,
		onClick: (event) => {
			event.stopPropagation();
			fileRef.current?.click();
		}
	}, createElement(Upload, { "aria-hidden": true })) : null), label !== "" ? createElement("span", {
		className: card_module_default.squareLabel,
		"data-slot-label": true
	}, label) : null, props.badge === void 0 ? null : createElement("span", {
		className: card_module_default.squareBadge,
		"data-slot-badge": true
	}, props.badge), metric !== void 0 ? createElement("span", { className: card_module_default.squareMetric }, metric) : null, props.onFile !== void 0 && !disabled ? createElement("input", {
		ref: fileRef,
		type: "file",
		accept: props.accept ?? "image/png,image/jpeg,image/webp",
		className: card_module_default.squareFileInput,
		"data-slot-input": true,
		"aria-hidden": true,
		tabIndex: -1,
		onChange: (e) => {
			const file = e.target.files?.[0];
			if (file !== void 0 && file !== null) props.onFile?.(file);
			if (fileRef.current !== null) fileRef.current.value = "";
		}
	}) : null);
}
//#endregion
//#region src/wirePicker.tsx
/** The wire picker — prior stages by ARRAY INDEX, including ones that
* haven't run yet ("not run yet" — wire BEFORE the upstream runs).
*
* Named outputs: when an upstream stage produced >1 named artifact
* (input_prep → media + mask), it expands into ONE ROW PER output so the
* user can wire mask → lanpaint_mask specifically. Upstreams with 0–1
* named artifacts render as a single row (legacy — primary via
* assetUrls[0]). The output name rides onPick → setSlotInput →
* inputOutputs → collectUpstreamResults. */
function WirePickerModal({ slot, priorStages, currentId, currentOutput, onPick, onUnwire, onClose }) {
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		onClose,
		title: `Wire ${slot} from an earlier card`,
		closeLabel: "Close wire picker",
		className: card_module_default.wireDialog,
		children: /* @__PURE__ */ jsxs("div", {
			"data-wire-modal": true,
			children: [currentId && /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: onUnwire,
				"data-wire-unwire": true,
				className: card_module_default.wireUnwire,
				children: "Unwire — this slot will ask for a file or wire again"
			}), /* @__PURE__ */ jsxs("ul", {
				className: card_module_default.wireList,
				children: [priorStages.length === 0 && /* @__PURE__ */ jsx("li", {
					className: card_module_default.wireEmpty,
					children: "No earlier cards yet — add a card before this one to wire from it."
				}), priorStages.map((u, i) => {
					const named = u.result?.artifacts ?? {};
					const namedEntries = Object.entries(named);
					const multi = namedEntries.length > 1;
					return (multi ? namedEntries.map(([name, url]) => ({
						outputName: name,
						thumb: url,
						label: name
					})) : [{
						outputName: null,
						thumb: u.result?.assetUrls[0],
						label: "primary"
					}]).map((row, ri) => {
						const selected = u.id === currentId && (currentOutput ?? null) === (row.outputName ?? null);
						return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => onPick(u.id, row.outputName),
							"data-wire-option": row.outputName ?? "primary",
							className: clsx(card_module_default.wireOption, selected && card_module_default.wireSelected),
							children: [
								/* @__PURE__ */ jsx("span", {
									className: card_module_default.wireIdx,
									children: String(i + 1).padStart(2, "0")
								}),
								row.thumb && isImageUrl(row.thumb) ? /* @__PURE__ */ jsx("img", {
									src: row.thumb,
									alt: "",
									className: card_module_default.wireThumb
								}) : /* @__PURE__ */ jsx("div", {
									className: card_module_default.wireThumbFallback,
									children: /* @__PURE__ */ jsx(Link2, { className: card_module_default.sz14 })
								}),
								/* @__PURE__ */ jsxs("div", {
									className: card_module_default.wireMeta,
									children: [/* @__PURE__ */ jsxs("div", {
										className: card_module_default.wireTitle,
										children: [u.title, multi && /* @__PURE__ */ jsxs("span", {
											className: card_module_default.wireOut,
											children: ["· ", row.label]
										})]
									}), /* @__PURE__ */ jsx("div", {
										className: card_module_default.wireSub,
										children: u.result ? row.thumb ?? "no artifacts" : "not run yet"
									})]
								}),
								selected && /* @__PURE__ */ jsx("span", {
									className: card_module_default.wiredTag,
									children: "wired"
								})
							]
						}) }, u.id + (ri > 0 ? `:${row.outputName}` : ""));
					});
				})]
			})]
		})
	});
}
//#endregion
//#region src/wire.ts
/** Read a same-origin /v1 JSON door. Non-200 → named throw (the door's
*  own error text when present). */
async function v1Get(path, signal) {
	const res = await fetch(path, { ...signal === void 0 ? {} : { signal } });
	const body = await res.json().catch(() => null);
	if (!res.ok) {
		const err = typeof body === "object" && body !== null ? Reflect.get(body, "error") : void 0;
		throw new Error(typeof err === "string" ? err : path + ": HTTP " + String(res.status));
	}
	return body;
}
/** Correlation id for one client-request frame (the reference caller
* uses a random uuid per call; crypto.randomUUID is the browser
* standard — the deck's assets tab owns the older copy; this is the
* card chrome's seat). */
function nextRpcId() {
	const cryptoApi = globalThis.crypto;
	if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
	return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}
/** POST one manage action over the `manage` remote's wire door —
* same-origin /api/manage/act carrying the documented client-request
* frame (api-gateway.md). The single argument is `doc` (the
* adapter's parameter name — the wire field rides it verbatim).
* THE DOWNLOAD PROMPT's arm (no-silent-drop law, stroke 18): a
* boarded-but-not-downloaded model is OFFERED — the surfaces prompt
* the user, the click lands here as provision_model (the manager
* queues the download; present files are skipped). A refusal is a
* DOMAIN outcome: the envelope carries it (ok:false + detail) — the
* caller renders the truth, never a throw past the surface. */
async function postManageAction(action, payload, signal) {
	const response = await fetch("/api/manage/act", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			type: "client-request",
			rpcId: nextRpcId(),
			method: "manage/act",
			payload: { args: { doc: {
				action,
				...payload
			} } }
		}),
		...signal === void 0 ? {} : { signal }
	});
	const body = await response.json().catch(() => null);
	const row = typeof body === "object" && body !== null ? Reflect.get(body, "result") : void 0;
	const inner = typeof row === "object" && row !== null ? row : {};
	if (!response.ok) return {
		ok: false,
		detail: typeof inner["message"] === "string" ? inner["message"] : "manage/" + action + ": HTTP " + String(response.status)
	};
	if (inner["ok"] === false) {
		const err = inner["error"];
		return {
			ok: false,
			detail: typeof err?.["message"] === "string" ? err["message"] : "manage/" + action + " refused"
		};
	}
	const value = inner["value"];
	return {
		ok: true,
		detail: typeof value?.["detail"] === "string" ? value["detail"] : void 0,
		data: value?.["data"]
	};
}
/** /v1/model-catalog → the cards section (the picker's ONE surface —
*  action cards, one tile per card package; models are NOT entries). */
async function fetchCardCatalog(signal) {
	const raw = (await v1Get("/v1/model-catalog", signal))["cards"] ?? {};
	const out = [];
	for (const [id, row] of Object.entries(raw)) {
		if (typeof row !== "object" || row === null) continue;
		const famsRaw = row["families"];
		out.push({
			id,
			label: typeof row["label"] === "string" ? row["label"] : id,
			description: typeof row["description"] === "string" ? row["description"] : "",
			genre: typeof row["genre"] === "string" ? row["genre"] : "",
			families: Array.isArray(famsRaw) ? famsRaw.filter((x) => typeof x === "string") : [id]
		});
	}
	return out.sort((a, b) => a.label.localeCompare(b.label));
}
/** /v1/form-spec?model=<family> — the card family's emission (the
*  serialized schema envelope + model defaults + the declared edges
*  + the mod kinds and their envelopes). */
async function fetchFormSpec(model, signal) {
	const doc = await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal);
	const env = doc["schema"];
	if (env !== null && (typeof env !== "object" || typeof env.uid !== "number" || typeof env.refs !== "object")) throw new Error("form-spec: no schema envelope");
	return doc;
}
/** /v1/forms — every card's meta row (the edge emission included). */
async function fetchFormsTable(signal) {
	return v1Get("/v1/forms", signal);
}
/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL; the
*  mesh wire type boards .glb/.gltf — model/gltf-binary, or the
*  browser's octet-stream with a GLB name) → the input-dir path the
*  param accepts. The door's own gates (type whitelist, one clean
*  segment) are the law — the client only voices its refusals, never
*  invents its own. */
async function uploadInputFile(file) {
	const isImage = file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
	const isAudio = file.type.startsWith("audio/");
	const glbName = /\.glb$/i.test(file.name) || /\.gltf$/i.test(file.name);
	const isMesh = file.type === "model/gltf-binary" || file.type === "model/gltf+json" || file.type === "application/octet-stream" && glbName;
	if (!isImage && !isAudio && !isMesh) throw new Error("Input cards don’t accept " + (file.type !== "" ? file.type : "that file") + " — drop an image, audio, or .glb/.gltf file");
	if (isAudio) throw new Error("audio uploads have no door yet — the uploads door boards png / jpeg / webp / glb only");
	const dataUrl = await readAsDataURL$1(file);
	const res = await fetch("/v1/uploads", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			filename: file.name,
			data: dataUrl
		})
	});
	if (!res.ok) throw new Error("upload refused: HTTP " + String(res.status));
	const out = await res.json();
	const path = typeof out === "object" && out !== null && typeof Reflect.get(out, "path") === "string" ? Reflect.get(out, "path") : "";
	if (path === "") throw new Error("upload answered without a path");
	return {
		name: path,
		file: path.split("/").pop()
	};
}
//#endregion
//#region src/square-provider.tsx
/** square-provider.tsx — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
/** The media-kind the picker fetches for a field: image fields name
*  image; mesh fields name the MEDIA vocabulary's kind for 3D, which
*  is `model` — NOT `mesh`. `mesh` is the client PREVIEW kind
*  (preview-kinds.ts), a different vocabulary; the media list door
*  admits image/audio/video/model/all and refuses anything else with
*  `media/kind`, so asking it for `mesh` was a guaranteed refusal that
*  the picker swallowed into an empty list (the "From media" row was
*  empty for every mesh field, with no error anywhere). file fields
*  take the whole library (their accept narrows client-side per row). */
function mediaKindForField(f) {
	if (f.type === "image") return "image";
	if (f.type === "mesh") return "model";
	return "all";
}
/** THE OS-DIALOG ACCEPT, derived per field (primitive ③): mesh rows
*  offer the GLB pair; everything else keeps the image triad (the
*  historic default). The provider's ONE hidden input re-targets
*  imperatively at click time — the accept is a property of the
*  field being picked, never of the provider instance. */
function acceptOfField(f) {
	return f !== null && f.type === "mesh" ? MESH_SQUARE_ACCEPT : DEFAULT_SQUARE_ACCEPT;
}
/** THE ONE square provider (the old SlotGrid law, DSH substrate):
*  every slot-shaped field of a stage gets the same verbs — file
*  upload (the /v1/uploads door + the data-URL mirror), media drop
*  (the asset MIME → the param), and THE PICKER (a DSH Menu anchored
*  on the square listing the other stages' latest outputs; picking
*  one writes the PARAM — the slot is the wire, no separate wiring
*  mechanic exists). ONE definition; the constructor and every
*  claimed atom ride it. */
function useSquareProvider(onEdit, wire) {
	const [mirror, setMirror] = useState({});
	const [pickAt, setPickAt] = useState(null);
	const [modalAt, setModalAt] = useState(null);
	const fieldRef = useRef(null);
	const [mediaRows, setMediaRows] = useState(null);
	const [mediaErr, setMediaErr] = useState(null);
	const fileRef = useRef(null);
	const onFile = useCallback(async (f, file) => {
		if (wire.onFile !== void 0) {
			wire.onFile(file);
			return;
		}
		try {
			const dataUrl = await readAsDataURL(file);
			if (f.type !== "mesh") setMirror((m) => ({
				...m,
				[f.name]: dataUrl
			}));
			const { name } = await uploadInputFile(file);
			onEdit(f.name, name);
		} catch (e) {
			onEdit(f.name, e instanceof Error ? e.message : "upload failed");
		}
	}, [onEdit, wire.onFile]);
	const square = (f) => {
		if (f.type !== "image" && f.type !== "file" && f.type !== "mesh") return void 0;
		return {
			display: mirror[f.name] ?? null,
			verbs: {
				onPick: (anchor) => {
					const el = anchor instanceof HTMLElement ? anchor : null;
					setPickAt(el !== null ? {
						rect: el.getBoundingClientRect(),
						field: f
					} : {
						rect: new DOMRect(8, 8, 1, 1),
						field: f
					});
				},
				onFile: (file) => {
					onFile(f, file);
				},
				onAsset: (url) => {
					onEdit(f.name, url);
				},
				onClear: () => {
					setMirror((m) => {
						const n = { ...m };
						delete n[f.name];
						return n;
					});
					onEdit(f.name, "");
				}
			}
		};
	};
	const sourceMenu = pickAt === null ? null : createElement(Menu, {
		open: true,
		anchor: null,
		getAnchorRect: () => pickAt.rect,
		items: [
			{
				id: "__flow__",
				label: "From flow"
			},
			{
				id: "__media__",
				label: "From media"
			},
			{
				id: "__file__",
				label: "From file"
			},
			{
				type: "separator",
				id: "sep"
			},
			{
				id: "__none__",
				label: "— clear —",
				danger: true
			}
		],
		onSelect: (id) => {
			const f = pickAt.field;
			setPickAt(null);
			if (id === "__flow__") {
				setModalAt({
					mode: "flow",
					field: f
				});
				return;
			}
			if (id === "__media__") {
				setModalAt({
					mode: "media",
					field: f
				});
				return;
			}
			if (id === "__file__") {
				fieldRef.current = f;
				const input = fileRef.current;
				input.accept = acceptOfField(f);
				input.click();
				return;
			}
			setMirror((m) => {
				const n = { ...m };
				delete n[f.name];
				return n;
			});
			onEdit(f.name, "");
		},
		onClose: () => {
			setPickAt(null);
		},
		portal: true
	});
	const loadMedia = wire?.loadMedia;
	useEffect(() => {
		if (modalAt?.mode !== "media") return;
		if (loadMedia === void 0) {
			setMediaRows([]);
			return;
		}
		const ctrl = new AbortController();
		setMediaRows(null);
		loadMedia(mediaKindForField(modalAt.field), ctrl.signal).then((items) => {
			setMediaRows(items.map((it) => ({
				id: it.url,
				label: it.name,
				url: it.url
			})));
			setMediaErr(null);
		}).catch((e) => {
			setMediaRows([]);
			setMediaErr(e instanceof Error ? e.message : String(e));
		});
		return () => {
			ctrl.abort();
		};
	}, [modalAt, loadMedia]);
	const pickerModal = modalAt === null ? null : (() => {
		const f = modalAt.field;
		const candidates = modalAt.mode === "flow" ? wire.candidatesFor !== void 0 ? wire.candidatesFor(f) : wire.candidates : mediaRows ?? [];
		const req = {
			mode: modalAt.mode,
			kind: mediaKindForField(f),
			field: f,
			candidates
		};
		const pick = (url) => {
			setModalAt(null);
			if (url !== "") onEdit(f.name, url);
		};
		const fallback = createElement(Modal, {
			open: true,
			onClose: () => {
				setModalAt(null);
			},
			title: modalAt.mode === "flow" ? "From flow" : "From media",
			description: modalAt.mode === "flow" ? "The other stages’ latest outputs" + (req.kind !== "all" ? " (" + req.kind + ")" : "") : "The runs library" + (req.kind !== "all" ? " (" + req.kind + ")" : ""),
			closeLabel: "Close picker"
		}, candidates.length === 0 ? createElement("p", { className: card_module_default.pickEmpty }, modalAt.mode === "media" && mediaRows === null ? "loading…" : mediaErr !== null ? "media library unavailable — " + mediaErr : "nothing to pick yet") : createElement("ul", { className: card_module_default.pickList }, candidates.map((c) => createElement("li", {
			key: c.id,
			className: card_module_default.pickRow
		}, createElement("button", {
			type: "button",
			className: card_module_default.pickBtn,
			"data-testid": "source-pick-row",
			onClick: () => {
				pick(c.url);
			}
		}, isImageUrl(c.url) ? createElement("img", {
			className: card_module_default.pickThumb,
			src: c.url,
			alt: c.label,
			loading: "lazy"
		}) : createElement("span", { className: card_module_default.pickGlyph }, c.label.slice(0, 1).toUpperCase()), createElement("span", { className: card_module_default.pickLabel }, c.label))))));
		return wire.renderSourcePick !== void 0 ? wire.renderSourcePick(req, fallback) : fallback;
	})();
	const fileInput = createElement("input", {
		ref: fileRef,
		type: "file",
		accept: wire.accept ?? acceptOfField(null),
		"aria-hidden": true,
		tabIndex: -1,
		style: { display: "none" },
		onChange: (e) => {
			const file = e.target.files?.[0];
			const f = fieldRef.current;
			if (f !== null && file !== void 0 && file !== null) {
				fieldRef.current = null;
				onFile(f, file);
			}
			fileRef.current.value = "";
		}
	});
	return {
		square,
		wireMenu: createElement(Fragment$1, null, sourceMenu, pickerModal, fileInput)
	};
}
//#endregion
//#region src/atoms.tsx
/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
function SourceRow(props) {
	const field = {
		name: props.name ?? "__source_row__",
		label: props.label,
		type: props.kind === "image" ? "image" : "file"
	};
	const { square, wireMenu } = useSquareProvider(useCallback((name, v) => {
		props.onEdit(v);
	}, [props.onEdit]), {
		candidates: props.candidates ?? [],
		...props.candidatesFor !== void 0 ? { candidatesFor: props.candidatesFor } : {},
		...props.loadMedia !== void 0 ? { loadMedia: props.loadMedia } : {},
		...props.onFile !== void 0 ? { onFile: props.onFile } : {},
		...props.accept !== void 0 ? { accept: props.accept } : {},
		...props.renderSourcePick !== void 0 ? { renderSourcePick: props.renderSourcePick } : {}
	});
	const host = square(field);
	const shown = host.display ?? props.value ?? null;
	return createElement("div", {
		className: card_module_default.sourceRow,
		"data-source-row": props.label
	}, wireMenu, createElement(InputSquare, {
		label: props.hideLabel === true ? "" : props.label,
		...props.ariaLabel !== void 0 ? { ariaLabel: props.ariaLabel } : {},
		value: shown !== null && (isImageUrl(shown) || isMeshUrl(shown)) ? shown : null,
		metric: typeof props.value === "string" && props.value !== "" && !isImageUrl(props.value) && !isMeshUrl(props.value) ? props.value : void 0,
		...host.verbs
	}));
}
/** THE TRI-STATE ATOM (hour 15, stroke C): inherit / on / off —
*  promoted from h3's studio-local TriControl (same semantics, same
*  option order). Serves schema-bound fields of type 'tri' AND the
*  standalone rail rows that hand-rolled the select before. */
function TriStateAtom({ label, value, onEdit, name, disabled }) {
	return createElement("select", {
		className: card_module_default.specSelect,
		"aria-label": label,
		disabled: disabled === true,
		value: value === void 0 ? "" : String(value),
		onChange: (e) => {
			const v = e.target.value;
			onEdit(name, v === "" ? void 0 : v === "true");
		}
	}, createElement("option", { value: "" }, "inherit"), createElement("option", { value: "true" }, "on"), createElement("option", { value: "false" }, "off"));
}
/** The slider's local display during a drag (the settle law's
*  carrier): local owns the bubble while dragging; an external move
*  of the backing value (agent write, revive, another card opened)
*  reclaims the display. */
function useLocalSliderValue(value) {
	const num = typeof value === "number" ? value : Number(value);
	const [local, setLocal] = useState(null);
	useEffect(() => {
		setLocal(null);
	}, [num]);
	return {
		value: local !== null ? local : Number.isFinite(num) ? num : null,
		set: setLocal
	};
}
/** THE SETTLE LAW for slider atoms (hour 15, stroke C — grown from
*  mask-studio's draft absorber, 2026-08-10): a drag fires input
*  60×/sec; if every step wrote to the card, updateStageParams →
*  _recomputeKeys would hash multi-MB paint data 60×/sec and freeze
*  the editor. The atom shows the drag locally and persists ONCE on
*  settle (the change event = release / keyboard step). External
*  writes (agent, revive) re-sync the display when the backing
*  value actually moves. */
function SpecSliderAtom({ f, value, onEdit }) {
	const shown = useLocalSliderValue(value);
	if (shown.value === null) return createElement("span", {
		className: card_module_default.specSliderRow,
		"data-refused": f.name
	}, createElement("span", { className: card_module_default.specSliderValue }, String(value) + " — REFUSED: not a number"));
	return createElement("span", { className: card_module_default.specSliderRow }, createElement("input", {
		className: card_module_default.specSlider,
		type: "range",
		min: f.min ?? 0,
		max: f.max ?? 10,
		step: f.step ?? .1,
		value: shown.value,
		onInput: (e) => {
			shown.set(Number(e.target.value));
		},
		onChange: (e) => {
			onEdit(f.name, e.target.value);
		},
		"aria-label": f.label
	}), createElement("span", { className: card_module_default.specSliderValue }, String(shown.value)));
}
/** One spec atom — typed by the declaration, edited as a raw string
*  while typing (decimal dots survive; coercion happens once at patch). */
function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost }) {
	if ((f.type === "image" || f.type === "file" || f.type === "mesh") && square !== void 0) {
		const shown = square.display !== void 0 && square.display !== null && square.display !== "" ? square.display : typeof value === "string" ? value : null;
		return createElement(InputSquare, {
			label: f.label !== "" ? f.label : f.name,
			value: shown !== null && (isImageUrl(shown) || isMeshUrl(shown)) ? shown : null,
			metric: typeof value === "string" && value !== "" && !isImageUrl(value) && !isMeshUrl(value) ? value : void 0,
			...square.verbs
		});
	}
	if (f.type === "select" && f.multi === true && Array.isArray(f.options) && f.options.length > 0) {
		const rows = f.options.map((o) => typeof o === "string" ? {
			value: o,
			label: o
		} : o);
		const held = new Set(String(value ?? "").split(",").map((w) => w.trim()).filter((w) => w !== ""));
		return createElement("div", {
			className: card_module_default.specChips,
			role: "group",
			"aria-label": f.label,
			...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
		}, rows.map((row) => {
			const on = held.has(row.value);
			return createElement("button", {
				type: "button",
				key: row.value,
				className: card_module_default.specChip + (on ? " " + card_module_default.specChipOn : ""),
				"aria-pressed": on,
				"data-chip": row.value,
				onClick: () => {
					const next = new Set(held);
					if (on) next.delete(row.value);
					else next.add(row.value);
					onEdit(f.name, rows.filter((r) => next.has(r.value)).map((r) => r.value).join(","));
				}
			}, titleCaseId(row.label));
		}));
	}
	if (f.type === "select" && Array.isArray(f.options) && f.options.length > 0) return createElement("select", {
		className: card_module_default.specSelect,
		value: String(value ?? ""),
		onChange: (e) => onEdit(f.name, e.target.value),
		"aria-label": f.label,
		...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
	}, ghost !== void 0 ? createElement("option", { value: "" }, ghost) : null, f.options.map((o) => {
		const row = typeof o === "string" ? {
			value: o,
			label: o
		} : o;
		return createElement("option", {
			key: row.value,
			value: row.value
		}, titleCaseId(row.label));
	}));
	if (f.type === "slider") return createElement(SpecSliderAtom, {
		f,
		value,
		onEdit
	});
	if (f.type === "tri") return createElement(TriStateAtom, {
		label: f.label !== "" ? f.label : f.name,
		value: value === void 0 || value === null ? void 0 : value === true || value === "true",
		onEdit,
		name: f.name
	});
	if (f.type === "switch" || f.type === "boolean") {
		if (value !== void 0 && value !== null && typeof value !== "boolean" && value !== "true" && value !== "false") return createElement("span", {
			className: card_module_default.specField,
			"data-refused": f.name
		}, f.label + ": " + String(value) + " — REFUSED: not a boolean");
		const on = value === true || value === "true";
		return createElement(Switch, {
			label: f.label,
			checked: on,
			onChange: (next) => {
				onEdit(f.name, next);
			}
		});
	}
	if (f.type === "textarea") {
		const fitStable = useCallback((el) => {
			if (el === null) return;
			el.style.height = "auto";
			el.style.height = Math.max(el.scrollHeight, 44) + "px";
		}, []);
		const fitEl = useRef(null);
		useEffect(() => {
			const el = fitEl.current;
			el.style.height = "auto";
			el.style.height = Math.max(el.scrollHeight, 44) + "px";
		}, [String(value ?? "")]);
		return createElement("textarea", {
			className: card_module_default.specTextarea,
			rows: 2,
			value: String(value ?? ""),
			placeholder: f.placeholder ?? "",
			ref: (el) => {
				const ta = el ?? null;
				fitEl.current = ta;
				fitStable(ta);
			},
			onChange: (e) => {
				const el = e.target;
				fitStable(el);
				onEdit(f.name, el.value);
			},
			"aria-label": f.label
		});
	}
	if (f.type === "number") return createElement(Input, {
		type: "number",
		min: f.min,
		max: f.max,
		step: f.step,
		value: String(value ?? ""),
		placeholder: placeholder ?? f.placeholder ?? "",
		onChange: (e) => onEdit(f.name, e.target.value),
		"aria-label": f.label,
		...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
	});
	return createElement(Input, {
		value: String(value ?? ""),
		placeholder: placeholder ?? f.placeholder ?? "",
		onChange: (e) => onEdit(f.name, e.target.value),
		"aria-label": f.label,
		...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
	});
}
/** THE MODEL AXES (the pass-along law, 2026-09-12): the Model select
*  plus ONE SELECT PER SERVED AXIS GROUP — Variant, Quant, Recipe,
*  Precision, … the declaration's whole vocabulary, NEVER a hardcoded
*  list (the operator's lane proof caught the hardcoded Quant-only
*  list dropping seedvr2's and qwen's other axes). Order: the door's
*  variant_groups contract, else first-seen. Chain: an axis' options
*  are the rows composing with the axes above (the row's `owner`).
*  Each pick applies the row's defaults overlay through onEdit — the
*  values (model + every axis key + overlay keys) ride the caller's
*  map and pass along at Run. Renders nothing when the spec declares
*  no matrix. */
//#endregion
//#region src/rows.tsx
/** rows.tsx — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
/** THE INFO GLYPH (hour 21): the field's declared help prose (the
*  schema's extra.tooltip) rides a hover (i) beside the label — one
*  definition for every card; absent prose, no glyph. The text is
*  aria-carried (the DSH Tooltip is hover-only). */
function infoGlyph(f) {
	if (f.tooltip === void 0 || f.tooltip === "") return null;
	return createElement(Tip, {
		tip: f.tooltip,
		children: createElement("span", {
			className: card_module_default.specInfo,
			role: "note",
			"aria-label": `info: ${f.tooltip}`
		}, "i")
	});
}
/** THE SEED DICE (stroke 39 — the operator's QOL law): the seed
*  knob carries the RANDOM sentinel -1 (GATE S: -1 mints a fresh
*  seed in the lane, EVERY run). The dice sits at the key line's
*  right end, across from the field's name: FILLED pips = random
*  (a new seed every run), HOLLOW pips = fixed (this exact seed
*  re-runs). The state DERIVES from the resolved value alone — no
*  hidden mode to drift; the click writes the value: fixed → -1
*  (random), random → a minted concrete int (the kit's own mint
*  law, Math.floor(random * 2147483647)). Typing a number while
*  random fixes it — the dice unfills by derivation, one source
*  of truth. The input never paints the sentinel: random shows
*  the placeholder, never "-1". */
function SeedDice({ random, onToggle }) {
	return createElement("button", {
		type: "button",
		className: card_module_default.specDice + (random ? " " + card_module_default.specDiceOn : ""),
		"data-seed-dice": random ? "random" : "fixed",
		"aria-pressed": random,
		"aria-label": "seed dice",
		title: random ? "Random — a new seed every run. Click to fix one." : "Fixed seed — this exact seed re-runs. Click for a new one every run.",
		onClick: onToggle
	}, createElement("svg", {
		width: 14,
		height: 14,
		viewBox: "0 0 16 16",
		fill: "none",
		xmlns: "http://www.w3.org/2000/svg",
		"aria-hidden": "true"
	}, createElement("rect", {
		x: 1.4,
		y: 1.4,
		width: 13.2,
		height: 13.2,
		rx: 3.2,
		stroke: "currentColor",
		strokeWidth: 1.3
	}), createElement("circle", {
		cx: 5,
		cy: 5,
		r: 1.35,
		...random ? { fill: "currentColor" } : {
			stroke: "currentColor",
			strokeWidth: 1
		}
	}), createElement("circle", {
		cx: 11,
		cy: 5,
		r: 1.35,
		...random ? { fill: "currentColor" } : {
			stroke: "currentColor",
			strokeWidth: 1
		}
	}), createElement("circle", {
		cx: 8,
		cy: 8,
		r: 1.35,
		...random ? { fill: "currentColor" } : {
			stroke: "currentColor",
			strokeWidth: 1
		}
	}), createElement("circle", {
		cx: 5,
		cy: 11,
		r: 1.35,
		...random ? { fill: "currentColor" } : {
			stroke: "currentColor",
			strokeWidth: 1
		}
	}), createElement("circle", {
		cx: 11,
		cy: 11,
		r: 1.35,
		...random ? { fill: "currentColor" } : {
			stroke: "currentColor",
			strokeWidth: 1
		}
	})));
}
function SpecFieldRow({ f, value, onEdit, square, wireCandidates }) {
	const seedKnob = f.name === "seed";
	const seedRandom = seedKnob && (value === -1 || value === "-1");
	return createElement("div", { className: card_module_default.specField }, seedKnob ? createElement("div", { className: card_module_default.specFieldHead }, createElement("span", { className: card_module_default.specFieldKey }, f.label, f.required === true ? createElement("span", { className: card_module_default.specRequired }, " *") : null, infoGlyph(f)), createElement(SeedDice, {
		random: seedRandom,
		onToggle: () => {
			if (seedRandom) onEdit(f.name, Math.floor(Math.random() * 2147483647));
			else onEdit(f.name, -1);
		}
	})) : createElement("span", { className: card_module_default.specFieldKey }, f.label, f.required === true ? createElement("span", { className: card_module_default.specRequired }, " *") : null, infoGlyph(f)), createElement(SpecAtom, {
		f,
		value: seedRandom ? void 0 : value,
		...seedRandom ? { placeholder: "random — new every run" } : {},
		onEdit,
		square,
		...wireCandidates !== void 0 ? { wireCandidates } : {}
	}));
}
/** ── THE OVERRIDE PARAMETER LAYER (hour 22 — the operator's law) ──
*
* OverlayKnob: ONE generic primitive for every LAYERED parameter
* face — a sparse overlay over a base over the schema floor (h3's
* call knobs over run stamps; any card's stages over a flow, its
* variants over a base). It renders ONE field's control with THE
* UNSET-FACE LAW (composeUnset, the generic surface): an unset
* value shows EXACTLY what composes — the base layer's explicit
* stamp, else the schema's own declared default (the admission gate
* fills it), else 'inherit' (honest only when no schema truth
* exists). REPLACE semantics at the write: unset edits serialize
* ABSENT (undefined, never a sentinel).
*
* The field rides the SERVED envelope's walk (SpecField — the same
* schemastery serialization every other face consumes): type, label,
* options, default, min/max/step, tooltip — all the schema's truth,
* never a per-card projection. Cards own only WHAT layers exist and
* which keys ride them; this row owns the semantics, once. */
function OverlayKnob({ name, field, value, base, ariaLabel, onEdit }) {
	const label = field?.label ?? name;
	const face = composeUnset(base, field?.default);
	const tip = unsetFaceTip(face, field?.type === "boolean" ? (v) => v === "true" ? "on" : v === "false" ? "off" : v : void 0);
	const aria = ariaLabel ?? label;
	const boolLabel = (v) => v === "true" ? "on" : v === "false" ? "off" : v;
	if (field?.type === "boolean") return createElement(ControlRow, {
		label,
		density: "sm",
		children: createElement(SpecAtom, {
			f: {
				name,
				label: aria,
				type: "select",
				options: [{
					value: "true",
					label: "on"
				}, {
					value: "false",
					label: "off"
				}],
				tooltip: tip
			},
			ghost: face.composed === void 0 ? "inherit" : boolLabel(unsetFaceLabel(face)),
			value: value === true ? "true" : value === false ? "false" : void 0,
			onEdit: (_, v) => onEdit(v === void 0 || v === "" ? void 0 : v === "true")
		})
	});
	if (Array.isArray(field?.options) && field.options.length > 0) {
		const f = {
			name,
			label: aria,
			type: "select",
			options: field.options,
			tooltip: tip
		};
		return createElement(ControlRow, {
			label,
			density: "sm",
			children: createElement(SpecAtom, {
				f,
				ghost: unsetFaceLabel(face),
				value: typeof value === "string" ? value : typeof value === "number" ? String(value) : void 0,
				onEdit: (_, v) => onEdit(v === "" ? void 0 : v)
			})
		});
	}
	if (field?.type === "number" || field?.type === "integer") {
		const f = {
			name,
			label: aria,
			type: "number",
			step: field.step ?? (field.type === "integer" ? 1 : .1),
			...field.min !== void 0 ? { min: field.min } : {},
			...field.max !== void 0 ? { max: field.max } : {},
			tooltip: tip
		};
		return createElement(ControlRow, {
			label,
			density: "sm",
			children: createElement(SpecAtom, {
				f,
				value: typeof value === "number" ? value : void 0,
				placeholder: face.composed === void 0 ? "inherit" : face.composed,
				onEdit: (_, v) => {
					if (typeof v !== "string" || v.trim() === "") {
						onEdit(void 0);
						return;
					}
					const n = Number(v);
					onEdit(Number.isFinite(n) ? n : void 0);
				}
			})
		});
	}
	return createElement(ControlRow, {
		label,
		density: "sm",
		children: createElement(SpecAtom, {
			f: {
				name,
				label: aria,
				type: "text",
				tooltip: tip
			},
			value: typeof value === "string" ? value : void 0,
			placeholder: face.composed === void 0 ? "inherit" : face.composed,
			onEdit: (_, v) => {
				const t = typeof v === "string" ? v.trim() : "";
				onEdit(t === "" ? void 0 : t);
			}
		})
	});
}
//#endregion
//#region src/axes.tsx
/** axes.tsx — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
/** THE PACK PROMPT (the no-silent-drop law's extension half,
*  stroke 18): the card's DECLARED extension packs that the engine
*  cannot see render AS THEMSELVES — marked missing, with the
*  install verb one click away (the manage door's install_extension;
*  the host owns the wire). Present and unknown packs render nothing
*  (nothing to act on; the spec carries their truth for anyone who
*  reads it). Never a silently absent pack: the run's refusal text
*  and this prompt name the same id. */
function PackPrompt({ spec, onInstallPack }) {
	const missing = (spec.packs ?? []).filter((p) => p.present === false);
	if (missing.length === 0 || onInstallPack === void 0) return null;
	return createElement("section", {
		className: `${card_module_default.specGroup} ${card_module_default.modelAxes}`,
		"data-pack-prompt": "1"
	}, createElement("h4", { className: card_module_default.specGroupTitle }, "Extensions"), missing.map((p) => createElement(PackPromptRow, {
		key: p.id,
		id: p.id,
		onInstallPack
	})));
}
function PackPromptRow({ id, onInstallPack }) {
	const [st, setSt] = useState("idle");
	return createElement("div", {
		className: card_module_default.specHint,
		"data-missing-pack": id
	}, id + " is required by this card but not installed on the engine.", " ", createElement("button", {
		type: "button",
		className: card_module_default.specLinkBtn,
		disabled: st !== "idle",
		onClick: () => {
			setSt("busy");
			onInstallPack(id).then((ok) => setSt(ok ? "queued" : "failed")).catch(() => setSt("failed"));
		}
	}, st === "idle" ? "Install " + id : st === "busy" ? "Requesting…" : st === "queued" ? "Install queued ✓ (restart the engine when it lands)" : "Install request failed — retry from the assets tab"));
}
function ModelAxes({ spec, value, onSet, onPick, onDownloadModel }) {
	const groups = axisGroups(spec);
	if (groups.length === 0) return null;
	const models = modelChoices(spec);
	const matrixSet = new Set(models);
	const familyRows = (spec.families ?? []).map((f) => ({
		...f,
		inMatrix: matrixSet.has(f.id)
	}));
	const familyFace = /* @__PURE__ */ new Map();
	for (const f of spec.families ?? []) if (f.label !== void 0 && f.label !== "") familyFace.set(f.id, f.label);
	const contract = spec.features?.variant_groups ?? {};
	const pick = (row) => {
		onPick(axisPickPatch(spec, row));
	};
	const knobStamp = (r) => axisPickPatch(spec, r);
	rowsFor(spec, "Recipe").filter((r) => Object.keys(knobStamp(r)).length > 0);
	const heldModelRaw = value["model"];
	const heldModel = typeof heldModelRaw === "string" && heldModelRaw !== "" ? heldModelRaw : void 0;
	const knownModel = (m) => models.includes(m) || (spec.families ?? []).some((f) => f.id === m);
	const refusedModel = heldModel !== void 0 && !knownModel(heldModel) ? heldModel : void 0;
	const shownModel = heldModel ?? (typeof spec.model === "string" && spec.model !== "" ? spec.model : models[0] ?? "");
	const heldFam = (spec.families ?? []).find((f) => f.id === shownModel && !f.present);
	const [dlState, setDlState] = useState("idle");
	useEffect(() => {
		setDlState("idle");
	}, [shownModel]);
	const rowsOf = (g, active) => composingRows(spec, g, active);
	const active = {};
	for (const g of groups) {
		const heldRaw = value[axisKey(g)];
		const heldId = typeof heldRaw === "string" && heldRaw !== "" ? heldRaw : void 0;
		const rows = rowsOf(g, active);
		if (heldId !== void 0 && rows.some((r) => r.id === heldId || (r.quant ?? "") === heldId)) {
			const grounded = rows.find((r) => r.quant === heldId && r.id !== heldId);
			active[g] = grounded !== void 0 ? grounded.id : heldId;
		} else if (heldId !== void 0) active[g] = heldId;
		else active[g] = activeRowId(spec, value, g, active) ?? (rows.length > 0 ? rows[0].id : "");
	}
	const modelField = createElement("label", { className: card_module_default.specField }, createElement("span", {
		className: card_module_default.specFieldKey,
		"aria-hidden": "true"
	}), createElement("select", {
		className: card_module_default.specSelect,
		"aria-label": "Model",
		...refusedModel !== void 0 ? { "data-refused": "model" } : {},
		value: shownModel,
		onChange: (e) => {
			const m = e.target.value;
			onPick(modelSwitchPatch(spec, m));
		}
	}, refusedModel !== void 0 ? createElement("option", {
		key: refusedModel,
		value: refusedModel
	}, titleCaseId(refusedModel) + " — not an offered model of this card") : null, familyRows.map((f) => f.inMatrix ? null : createElement("option", {
		key: "fam-" + f.id,
		value: f.id
	}, (f.label ?? titleCaseId(f.id)) + (f.present ? "" : " — not downloaded on this machine"))), models.map((m) => createElement("option", {
		key: m,
		value: m
	}, familyFace.get(m) ?? titleCaseId(m)))));
	const axisField = (g) => {
		const rows = rowsOf(g, active);
		const heldRaw = value[axisKey(g)];
		const heldId = typeof heldRaw === "string" && heldRaw !== "" ? heldRaw : void 0;
		const refusedId = heldId !== void 0 && !rows.some((r) => r.id === heldId || (r.quant ?? "") === heldId) ? heldId : void 0;
		if (rows.length === 0 && refusedId === void 0) return null;
		const label = contract[g]?.label ?? titleCaseId(g);
		return createElement("label", {
			key: g,
			className: card_module_default.specField
		}, createElement("span", { className: card_module_default.specFieldKey }, label), createElement("select", {
			className: card_module_default.specSelect,
			"aria-label": label,
			"data-axis": g,
			...refusedId !== void 0 ? { "data-refused": g } : {},
			value: active[g],
			onChange: (e) => {
				const id = e.target.value;
				const row = rows.find((v) => v.id === id);
				if (row !== void 0) pick(row);
			}
		}, refusedId !== void 0 ? createElement("option", {
			key: refusedId,
			value: refusedId
		}, titleCaseId(refusedId) + " — invalid " + label.toLowerCase() + " for " + titleCaseId(heldModel ?? shownModel)) : null, rows.map((v) => createElement("option", {
			key: v.id,
			value: v.id
		}, titleCaseId(v.label) + (typeof v.hint === "string" && v.hint !== "" ? ` — ${v.hint}` : "")))));
	};
	const variantAxis = groups.includes("Variant") ? "Variant" : void 0;
	const variantField = variantAxis !== void 0 ? axisField(variantAxis) : null;
	const restGroups = variantAxis !== void 0 ? groups.filter((g) => g !== variantAxis) : groups;
	return createElement("section", {
		className: `${card_module_default.specGroup} ${card_module_default.modelAxes}`,
		"data-model-axes": "1"
	}, createElement("h4", { className: card_module_default.specGroupTitle }, "Model"), variantField !== null ? createElement("div", {
		className: card_module_default.axesPair,
		"data-axes-pair": "Model+Variant"
	}, modelField, variantField) : modelField, heldFam !== void 0 && onDownloadModel !== void 0 ? createElement("div", {
		className: card_module_default.specHint,
		"data-download-prompt": heldFam.id
	}, titleCaseId(heldFam.id) + " is offered by this card but not downloaded on this machine.", " ", createElement("button", {
		type: "button",
		className: card_module_default.specLinkBtn,
		disabled: dlState !== "idle",
		onClick: () => {
			setDlState("busy");
			onDownloadModel(heldFam.id).then((ok) => setDlState(ok ? "queued" : "failed")).catch(() => setDlState("failed"));
		}
	}, dlState === "idle" ? "Download " + (heldFam.label ?? titleCaseId(heldFam.id)) : dlState === "busy" ? "Requesting…" : dlState === "queued" ? "Download queued ✓ (run when it lands)" : "Download request failed — retry from the assets tab")) : null, restGroups.map((g) => axisField(g)), createElement(RecipePills, {
		spec,
		onPick,
		values: value
	}));
}
/** THE FAMILY RECIPE DROPDOWN (Rule A -- the recipe law; the
* operator's order, 2026-09-18: "RECIPES AREN'T EVEN A DROPDOWN"):
* the family's preset macros as ONE SELECT beside the axes -- the
* same shape every axis rides, never a list of link-buttons. The
* pick writes the row's FULL stamp (axisPickPatch -- mod-owned keys
* included, the Rule A amendment); the SELECTION derives from the
* ONE truth (activeRecipeId -- the row whose stamp the user layer
* holds; no recipe key persists, nothing goes stale when the rail
* moves). Stamp-less rows (the family `default`) render nothing: a
* row that writes nothing is a dead option. A hand-edited layer
* (no stamp-for-stamp match) shows the placeholder -- the form
* never lies that a recipe is active.
*
* THE REUSE LAW: extracted so EVERY model surface seats the same
* dropdown -- CardForm under the axes, a studio beside its model
* route. Never a second implementation. */
function RecipePills({ spec, onPick, values }) {
	const pillRows = rowsFor(spec, "Recipe").filter((r) => Object.keys(axisPickPatch(spec, r)).length > 0);
	if (pillRows.length === 0) return null;
	const active = values !== void 0 ? activeRecipeId(spec, values) : void 0;
	const pick = (id) => {
		const row = pillRows.find((r) => r.id === id);
		if (row === void 0) return;
		onPick(axisPickPatch(spec, row));
	};
	return createElement("label", { className: card_module_default.specField }, createElement("span", { className: card_module_default.specFieldKey }, "Recipe"), createElement("select", {
		className: card_module_default.specSelect,
		"data-recipe-select": "1",
		"aria-label": "Recipe",
		value: active ?? "",
		onChange: (e) => {
			const id = e.currentTarget.value;
			if (id !== "") pick(id);
		}
	}, createElement("option", {
		key: "__none__",
		value: "",
		disabled: active !== void 0
	}, active === void 0 ? "-- recipe --" : "-- custom --"), pillRows.map((r) => createElement("option", {
		key: r.id,
		value: r.id,
		title: typeof r.hint === "string" && r.hint !== "" ? r.hint : void 0
	}, titleCaseId(r.label) + (typeof r.hint === "string" && r.hint !== "" ? ` \u2014 ${r.hint}` : "")))));
}
/** THE CARD FORM (the constructor's surface half) — the emission's
*  fields walked off the schema envelope, grouped, visible-when
*  honored; the RESOLVED value derives per render (resolveValue —
*  the engine's compose cascade mirrored), edits are set/unset ops
*  over the USER layer (the settings law: presence IS the override
*  mark, the reset chip removes it). Each field renders through the
*  claimed atom for its emitted type when the caller passes one;
*  the base's built-in atom is the default.
*
*  THE CONSTRUCTION LAW IS NOT OPTIONAL (operator, 2026-09-12: "the
*  img-to-mesh input component — you are not using it around — you
*  are hardcoding"): an emitted image/file/mesh input constructs THE ONE
*  SQUARE AUTOMATICALLY, in EVERY surface. The constructor OWNS the
*  square provider — no call site wires it, no call site can forget
*  it. The caller hands only the WIRE (picker candidates), never the
*  component; a caller that passes its own `square` fn overrides (the
*  host-claim seam), but the default is the constructor's own. */
/** ONE SPEC FIELD ROW (hour 15, stroke C): the label chrome (key,
*  required star, hint) around the atom — CardForm's own row, opened
*  to rail sections that render served fields outside a whole form
*  (mask's TuneSection). The claim seam stays CardForm's; this row
*  takes the resolved atom inputs. */
//#endregion
//#region src/use-form-spec.ts
/** use-form-spec.ts — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
/** THE SERVED-SPEC HOOK (the DRY extraction, 2026-09-13): four
*  consumers (mask-studio's TuneSection, h3's RunAdvancedPanels,
*  img-to-mesh's client, ideogram4's client) each hand-copied the
*  same fetch-once + abort dance. One spelling now: fetches
*  /v1/form-spec?model=<id> when the id is non-empty, aborts the
*  in-flight fetch on unmount or id change, and hands back the doc
*  (null until it lands) + the refusal message (null unless the door
*  refused — loud consumers render it, silent ones ignore it).
*  Consumer-specific derivations (field filters, value seeding) stay
*  at the call site as reactions to `spec`. */
function useFormSpec(modelId) {
	const [spec, setSpec] = useState(null);
	const [error, setError] = useState(null);
	const id = typeof modelId === "string" && modelId !== "" ? modelId : null;
	useEffect(() => {
		if (id === null) return;
		const ctl = new AbortController();
		setSpec(null);
		setError(null);
		fetchFormSpec(id, ctl.signal).then((doc) => {
			setSpec(doc);
		}).catch((e) => {
			setError(e instanceof Error ? e.message : "form-spec failed");
		});
		return () => {
			ctl.abort();
		};
	}, [id]);
	return {
		spec,
		error
	};
}
//#endregion
//#region src/spec-panel.tsx
/** spec-panel.tsx — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
/** THE DYNAMIC PARAMETER PANEL (2026-09-17, the operator's shared-
* component law): sections of the SERVED form-spec's rows at their
* wire names — ONE mechanism every card seats, never a per-card
* re-walk. The card owns POLICY through the DECLARATION (which
* fields exist, their visible_when leaves); the base owns MECHANISM
* (fetch → walker → row atoms → visibility grammar → the error
* law). A row the door never declared renders NOTHING (no ghost,
* no twin); a refused spec renders AS an error — never a thinner
* panel. */
function SpecPanel({ model, sections, values, onEdit, spec: specProp, error: errorProp }) {
	const owned = useFormSpec(model);
	const spec = specProp !== void 0 ? specProp : owned.spec;
	const error = specProp !== void 0 ? errorProp ?? null : owned.error;
	if (error !== null) return createElement("div", {
		className: card_module_default.specGroup,
		role: "alert",
		"data-testid": "spec-panel-error"
	}, createElement("div", { className: card_module_default.specGroupTitle }, "form-spec failed — parameters unavailable"), createElement("div", { className: card_module_default.specHint }, error));
	if (spec === null) return null;
	const byName = new Map(fieldsOf(spec).map((f) => [f.name, f]));
	const guardModel = resolveFamilyKey(spec) ?? model;
	return createElement("div", { className: card_module_default.specForm }, sections.map((sec) => createElement("div", {
		className: card_module_default.specGroup,
		key: sec.title,
		...sec.testid !== void 0 ? { "data-testid": sec.testid } : {}
	}, createElement("div", { className: card_module_default.specGroupTitle }, sec.title), sec.rows.map((row) => {
		const f = byName.get(row.name);
		if (f === void 0) return null;
		if (!fieldVisible(f, {
			...values,
			model: guardModel
		})) return null;
		return createElement(SpecFieldRow, {
			key: row.name,
			f,
			value: values[row.name],
			onEdit
		});
	}))));
}
//#endregion
//#region src/form.tsx
/**
* form.tsx — @melite/card-base: THE CONSTRUCTOR (the godfile
* split, hour 15: the seams live in their own files now —
* use-form-spec.ts, square-provider.tsx, atoms.tsx, rows.tsx,
* spec-panel.tsx, axes.tsx — this file is the CardForm
* composition + the stable re-export surface).
*
* THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
* construct the card ui should see that the card package emits an
* image input, then constructs the input component automatically"):
* the base reads the card package's EMISSION — the served form-spec
* (the schema envelope, declared input/output edges, mod kinds) —
* and constructs the surface. The resolved value derives per render
* (resolveValue — the engine's compose cascade mirrored); every
* image/file/mesh field gets THE ONE square (square.tsx) with the
* three source verbs; no card ever hand-rolls an input component.
*
* THE SEAM (slots.ts): each field renders through the field-atom seam
* keyed by its emitted wire type — the caller may pass claimed atoms
* (the composition consults the slot machinery and hands them in);
* the base's built-in atom is the default (the ui-tool built-ins
* pattern). A whole-form takeover replaces CardForm itself.
*
* DSH NATIVE: Menu/Input/Switch from the installed ui-primitives; the
* atoms the primitives set lacks (select, slider, textarea) are
* layout-only module CSS over native elements, every color an
* inherited --dsw-alias-* token (the package's documented pattern).
*/
/** THE CARD FORM (the constructor's surface half) — the emission's
*  fields walked off the schema envelope, grouped, visible-when
*  honored; the RESOLVED value derives per render (resolveValue —
*  the engine's compose cascade mirrored), edits are set/unset ops
*  over the USER layer (the settings law: presence IS the override
*  mark, the reset chip removes it). The constructor OWNS the square
*  provider (no call site wires it, no call site can forget it). */
function CardForm({ spec, user, base, onSet, onPick, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference }) {
	const fields = fieldsOf(spec);
	const value = resolveValue(spec, user, base);
	const fieldByName = new Map(fields.map((f) => [f.name, f]));
	const edit = (name, v) => {
		if (v === void 0) {
			onUnset?.(name);
			return;
		}
		onSet(name, coerceFieldEdit(fieldByName.get(name), v));
	};
	const family = resolveFamilyKey(spec);
	const modKinds = (spec.features?.modifiers ?? []).map((k) => {
		const env = spec.mod_schemas?.[k.schema_key ?? k.param_key];
		const hybrid = k.entry === "hybrid";
		const declared = (rows) => rows?.map((f) => typeof f.wtype === "string" && f.wtype !== "" ? {
			...f,
			type: f.wtype
		} : f);
		return {
			...k,
			fields: hybrid ? entryFieldsOfEnvelope(env, k.param_key, family) : declared(k.fields) ?? fieldsOfEnvelope(env, family),
			kindFields: hybrid ? kindScalarFieldsOfEnvelope(env, k.param_key, family) : declared(k.kindFields) ?? []
		};
	});
	const owned = modOwnedFields(spec);
	const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields;
	const signature = Array.isArray(spec.inputs) ? spec.inputs : [];
	const modFieldByName = /* @__PURE__ */ new Map();
	for (const k of modKinds) for (const f of k.fields) if (!modFieldByName.has(f.name)) modFieldByName.set(f.name, f);
	const railOf = (inp) => {
		const f = flatFields.find((x) => x.name === inp.name);
		if (f === void 0) return void 0;
		if (f.type === "image" || f.type === "file" || f.type === "mesh") return f;
	};
	const railFields = signature.map((inp) => typeof inp?.name === "string" ? railOf(inp) : void 0).filter((f) => f !== void 0).filter((f) => fieldVisible(f, {
		...value,
		model: family ?? ""
	})).filter((f) => fieldOnLane(spec, f.name, {
		...value,
		model: family ?? ""
	}));
	const railNames = new Set(railFields.map((f) => f.name));
	const stackFields = flatFields.filter((f) => f.type === "image_list" && !modFieldByName.has(f.name)).filter((f) => fieldVisible(f, {
		...value,
		model: family ?? ""
	})).filter((f) => fieldOnLane(spec, f.name, {
		...value,
		model: family ?? ""
	}));
	const visible = (f) => f.type !== "image_list" && !railNames.has(f.name) && fieldOnLane(spec, f.name, {
		...value,
		model: family ?? ""
	});
	const groupFieldsAll = flatFields.filter(visible);
	const laneWarns = laneViolations(spec, flatFields, {
		...user,
		model: family ?? ""
	}, base);
	const gateViolations = composeValidate(spec, user);
	const groups = groupFields(groupFieldsAll, {
		...value,
		model: family ?? ""
	});
	const submenu = groups.length > 1;
	const [openGroup, setOpenGroup] = useState(void 0);
	const activeGroup = submenu ? groups.find((g) => g.group === openGroup) ?? groups[0] : void 0;
	const shownGroups = submenu && activeGroup !== void 0 ? [activeGroup] : groups;
	const atomOf = (f) => atoms?.[f.type];
	const own = useSquareProvider(edit, wire ?? { candidates: [] });
	const squareFor = square ?? own.square;
	const stackRow = (f) => {
		const v = value[f.name];
		const entries = Array.isArray(v) ? v.filter((x) => typeof x === "string" && x !== "") : [];
		const cap = typeof f.max_stack === "number" && f.max_stack > 0 ? f.max_stack : void 0;
		const over = cap !== void 0 && entries.length > cap;
		const kind = f.media === "video" || f.media === "audio" ? "file" : "image";
		const accept = f.media === "video" ? "video/*" : f.media === "audio" ? "audio/*" : void 0;
		return createElement("div", {
			key: "stack-" + f.name,
			className: card_module_default.specStack,
			"data-input-stack": f.name,
			"data-stack-count": String(entries.length),
			...over ? { "data-stack-over": String(cap) } : {}
		}, createElement("div", {
			className: card_module_default.modHead,
			"data-stack-head": f.name,
			title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
		}, createElement("span", { className: card_module_default.modTitle }, f.label), createElement("span", {
			className: card_module_default.modHint,
			...over ? { style: { color: "var(--dsh-danger, #f44)" } } : {}
		}, `${String(entries.length)}${cap !== void 0 ? " / " + String(cap) : ""}${f.media !== void 0 && f.media !== "" ? " · " + f.media : ""}`)), over ? createElement("p", {
			className: card_module_default.laneWarn,
			style: { margin: 0 }
		}, `'${f.name}': ${String(entries.length)} stated, this lane admits ${String(cap)} — remove ${String(entries.length - cap)} before the write (the capacity follows the boarded model)`) : null, createElement("div", { className: card_module_default.specSlotRow }, entries.map((entry, i) => createElement("div", {
			key: f.name + ":" + String(i),
			className: card_module_default.specSlotCell,
			title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
		}, createElement(SourceRow, {
			label: String(i + 1),
			ariaLabel: `${f.label} ${String(i + 1)}`,
			kind,
			value: entry,
			name: f.name,
			...accept !== void 0 ? { accept } : {},
			onEdit: (next) => {
				const arr = [...entries];
				if (next === "") arr.splice(i, 1);
				else arr[i] = next;
				edit(f.name, arr);
			},
			...wire?.loadMedia !== void 0 ? { loadMedia: wire.loadMedia } : {},
			...wire?.candidates !== void 0 ? { candidates: wire.candidates } : {},
			...wire?.candidatesFor !== void 0 ? { candidatesFor: wire.candidatesFor } : {}
		}))), cap === void 0 || entries.length < cap ? createElement("div", {
			className: card_module_default.specSlotCell,
			"data-stack-add": f.name,
			title: f.tooltip
		}, createElement(SourceRow, {
			label: "",
			ariaLabel: `Add ${f.label}`,
			kind,
			value: null,
			name: f.name,
			...accept !== void 0 ? { accept } : {},
			onEdit: (next) => {
				/* v8 ignore else -- the empty cell carries no clear verb (the square renders no Detach without an attached value, and the provider wires onClear for attached values only) — '' is unconstructible through the seam, so the else is the type fence, never a UI path */
				if (next !== "") edit(f.name, [...entries, next]);
			},
			...wire?.loadMedia !== void 0 ? { loadMedia: wire.loadMedia } : {},
			...wire?.candidates !== void 0 ? { candidates: wire.candidates } : {},
			...wire?.candidatesFor !== void 0 ? { candidatesFor: wire.candidatesFor } : {}
		})) : null));
	};
	return createElement("div", { className: card_module_default.specForm }, gateViolations.length > 0 ? createElement("div", {
		className: card_module_default.laneWarn,
		"data-compose-gate": String(gateViolations.length),
		role: "alert"
	}, createElement("p", { style: { fontWeight: 700 } }, "THE COMPOSE GATE REFUSED THIS DOC — the card will not render an impossible contract. Fix the stated value, or reset the row."), gateViolations.map((v, i) => createElement("p", { key: "gate-" + String(i) }, v.message))) : null, laneWarns.length > 0 ? createElement("div", {
		className: card_module_default.laneWarn,
		"data-lane-warn": String(laneWarns.length),
		role: "alert"
	}, laneWarns.map((v, i) => createElement("p", { key: "lane-" + String(i) }, v.message))) : null, createElement(PackPrompt, {
		spec,
		onInstallPack
	}), createElement(ModelAxes, {
		spec,
		value,
		onSet: edit,
		onPick,
		onDownloadModel
	}), railFields.length > 0 || stackFields.length > 0 ? createElement("section", {
		className: card_module_default.specGroup + " " + card_module_default.inputRail,
		"data-input-rail": "1"
	}, createElement("h4", { className: card_module_default.specGroupTitle }, "Inputs"), railFields.length > 0 ? createElement("div", { className: card_module_default.specSlotRow }, railFields.map((f) => {
		return createElement("div", {
			key: f.name,
			className: card_module_default.specSlotCell,
			title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
		}, createElement(SpecAtom, {
			f,
			value: value[f.name],
			onEdit: edit,
			square: squareFor(f),
			...wire?.candidates !== void 0 ? { wireCandidates: wire.candidates } : {}
		}));
	})) : null, stackFields.map((f) => stackRow(f))) : null, submenu && activeGroup !== void 0 ? createElement("div", {
		className: card_module_default.groupTabs,
		role: "tablist",
		"data-form-submenu": "1"
	}, groups.map((g) => {
		const selected = activeGroup.group === g.group;
		return createElement("button", {
			key: g.group ?? "__general__",
			type: "button",
			role: "tab",
			"aria-selected": selected ? "true" : "false",
			"data-form-group-tab": g.group ?? "general",
			className: card_module_default.groupTab + (selected ? " " + card_module_default.groupTabActive : ""),
			onClick: () => {
				setOpenGroup(g.group);
			}
		}, titleCaseId(g.group ?? "General"));
	})) : null, shownGroups.map((g) => {
		const declared = g.fields.find((f) => typeof f.columns === "number" && f.columns >= 1)?.columns;
		const gridCols = Math.max(1, Math.floor(declared ?? 2));
		const cellStyle = (f) => {
			if (f.type === "textarea") return {
				gridColumn: "1 / -1",
				minWidth: "0"
			};
			return {
				gridColumn: `span ${Math.max(1, Math.floor(f.width ?? 1))}`,
				minWidth: "0"
			};
		};
		const children = [];
		let row = [];
		const flush = () => {
			if (row.length === 0) return;
			children.push(createElement("div", {
				key: "slotrow-" + String(children.length),
				className: card_module_default.specSlotRow,
				style: {
					gridColumn: "1 / -1",
					minWidth: "0"
				}
			}, row));
			row = [];
		};
		for (const f of g.fields) {
			const claim = atomOf(f);
			const sq = squareFor(f);
			const wireCandidates = wire?.candidates;
			if (claim !== void 0) {
				flush();
				const cell = createElement("div", {
					key: f.name,
					className: card_module_default.specField
				}, createElement("span", { className: card_module_default.specFieldKey }, f.label, f.required === true ? createElement("span", { className: card_module_default.specRequired }, " *") : null, infoGlyph(f)), claim({
					f,
					value: value[f.name],
					onEdit: edit,
					square: sq
				}));
				children.push(createElement("div", {
					key: f.name + "-cell",
					style: cellStyle(f)
				}, cell));
				continue;
			}
			if (f.type === "image" || f.type === "file" || f.type === "mesh") {
				row.push(createElement("div", {
					key: f.name,
					className: card_module_default.specSlotCell,
					title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
				}, createElement(SpecAtom, {
					f,
					value: value[f.name],
					onEdit: edit,
					square: sq,
					...wireCandidates !== void 0 ? { wireCandidates } : {}
				})));
				continue;
			}
			flush();
			const cell = createElement(SpecFieldRow, {
				key: f.name,
				f,
				value: value[f.name],
				onEdit: edit,
				...sq !== void 0 ? { square: sq } : {},
				...wireCandidates !== void 0 ? { wireCandidates } : {}
			});
			children.push(createElement("div", {
				key: f.name + "-cell",
				style: cellStyle(f)
			}, cell));
		}
		flush();
		return createElement("section", {
			key: g.group ?? "",
			className: card_module_default.specGroup,
			"data-form-group-panel": g.group ?? "general"
		}, g.group !== null && !submenu ? createElement("h4", { className: card_module_default.specGroupTitle }, titleCaseId(g.group)) : null, createElement("div", {
			className: card_module_default.specGrid,
			style: { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }
		}, children));
	}), modKinds.length > 0 ? createElement(ModifiersSection, {
		kinds: modKinds,
		values: value,
		onEdit: edit,
		railSeated: railNames,
		...onPatch !== void 0 ? { onPatch } : {},
		...paintFace !== void 0 ? { paintFace } : {},
		...bboxFace !== void 0 ? { bboxFace } : {},
		...paintReference !== void 0 ? { paintReference } : {},
		...wire?.loadMedia !== void 0 ? { loadMedia: wire.loadMedia } : {}
	}) : null, own.wireMenu);
}
//#endregion
//#region src/mods.tsx
/**
* mods.tsx — THE MOD SYSTEM, CORE (the old SubcardGrid, ported 1:1 —
* and moved into the base package 2026-09-12 after the operator's
* law: "MOD SYSTEM IS CORE. NEVER HARDCODED. The LORAS should not be
* on cards, the MOD SYSTEM SHOULD").
*
* The laws this section enforces:
*  - mods NEVER ride the card's param form. The estate serves the
*    OPEN kind vocabulary (features.modifiers); the constructor
*    (CardForm) renders THIS section itself and excludes every
*    mod-owned name from the flat groups — no surface wires it, no
*    surface can forget it (the construction law, same as the
*    square).
*  - THE WIRE IS THE STORAGE: params[param_key] holds the bag; the
*    same bag runs and the agent reads/writes it.
*  - commits persist immediately (the old onSaveParams law — never
*    deferred to Run): onEdit rides the caller's values map AND
*    onPatch (when present) persists to the domain on the spot.
*  - apply order = array order; the drag rewrites the bag.
*  - THREE kind shapes, all first-class (the leaf switches on the
*    SERVED entry mode, never the kind name):
*      OPTION kinds (lora): served catalog rows + strength; the
*        entry is { id, strength } — the row's own defaults seed the
*        strength.
*      HYBRID kinds (controlnet): served catalog rows AND entry
*        fields; the entry is the bag element keyed by its option_key
*        (type) — the leaf stamps the row's resolved facts (model +
*        preprocessor) onto new entries so the run record carries the
*        retired wire shape; the lane re-validates them, never trusts
*        them. Pack-level scalars (the strength floor) render as the
*        section's own rows above the tiles.
*      OPTION kinds (lora): served catalog rows + strength; the
*        entry is { id, strength } — the row's own defaults seed the
*        strength.
*      FIELD kinds (mask): the kind's own spec fields (image squares,
*        selects, sliders); the entry IS the params object. The leaf
*        renders kind.fields through the same constructor atoms —
*        the fields NEVER render flat on the card form.
*/
function ModifiersSection(props) {
	const { kinds, values, onEdit, onPatch } = props;
	const [dragTile, setDragTile] = useState(null);
	const [overTile, setOverTile] = useState(null);
	const [pickAt, setPickAt] = useState(null);
	const [leaf, setLeaf] = useState(null);
	const [leafError, setLeafError] = useState(null);
	const [draftOption, setDraftOption] = useState("");
	const [draftStrength, setDraftStrength] = useState("");
	const [draftSteps, setDraftSteps] = useState("");
	const [draftParams, setDraftParams] = useState({});
	const entriesOf = (k) => {
		const v = values[k.param_key];
		return Array.isArray(v) ? v.filter((e) => typeof e === "object" && e !== null) : [];
	};
	const optionOf = (k, value) => (k.options ?? []).find((o) => o.value === value) ?? null;
	/** THE HYBRID ENTRY FIELDS (the bag element minus its two bound
	*  rows — the option_key select and the scalar dial own those). */
	const hybridFields = (k, hidden) => {
		const key = optionKeyOf(k);
		const scalar = scalarKeyOf(k);
		return (k.fields ?? []).filter((f) => f.name !== key && f.name !== scalar && !(hidden?.has(f.name) ?? false));
	};
	/** The scalar seed (the row's own default wins; the contract
	*  field default is the backstop — 0.7, the retired leaf). */
	const strengthSeedOf = (k, option) => {
		const scalar = scalarKeyOf(k);
		const rowDefault = option?.defaults?.[scalar];
		if (typeof rowDefault === "number") return rowDefault;
		const field = (k.fields ?? []).find((f) => f.name === scalar);
		return typeof field?.default === "number" ? field.default : .7;
	};
	const commitScalar = (f, name, v) => {
		const coerced = coerceFieldEdit(f, v);
		onEdit(name, coerced);
		onPatch?.({ [name]: coerced });
	};
	const commit = (k, next) => {
		onEdit(k.param_key, next);
		onPatch?.({ [k.param_key]: next });
	};
	const addable = kinds.filter((k) => k.cardinality !== "scalar");
	if (kinds.length === 0) return null;
	const seated = props.railSeated;
	const fieldDefaults = (k) => {
		const out = {};
		for (const f of k.fields ?? []) {
			if (seated?.has(f.name) ?? false) continue;
			if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
		}
		return out;
	};
	const openCreate = (k) => {
		const entries = entriesOf(k);
		if (k.max_stack !== void 0 && entries.length >= k.max_stack) {
			setLeafError(k.label + " stack limit reached (" + String(k.max_stack) + ") — remove one to add another.");
			return;
		}
		setDraftOption("");
		setDraftStrength("");
		setDraftSteps("");
		setDraftParams(fieldDefaults(k));
		setLeafError(null);
		setLeaf({
			mode: "create",
			kind: k,
			index: -1
		});
	};
	const openEdit = (k, index) => {
		const entry = entriesOf(k)[index];
		if (isHybridKind(k)) {
			const key = optionKeyOf(k);
			setDraftOption(typeof entry[key] === "string" ? entry[key] : "");
			const scalar = scalarKeyOf(k);
			const strength = typeof entry[scalar] === "number" ? entry[scalar] : void 0;
			setDraftStrength(strength !== void 0 ? String(strength) : "");
			const params = {};
			for (const f of hybridFields(k, seated)) if (entry[f.name] !== void 0) params[f.name] = entry[f.name];
			setDraftParams(params);
		} else if (isOptionKind(k)) {
			setDraftOption(typeof entry["id"] === "string" ? entry["id"] : "");
			const strength = typeof entry["strength"] === "number" ? entry["strength"] : void 0;
			setDraftStrength(strength !== void 0 ? String(strength) : "");
			setDraftSteps(typeof entry["steps"] === "number" ? String(entry["steps"]) : "");
		} else {
			const params = { ...fieldDefaults(k) };
			for (const f of k.fields ?? []) {
				if (seated?.has(f.name) ?? false) continue;
				if (entry[f.name] !== void 0) params[f.name] = entry[f.name];
			}
			setDraftParams(params);
		}
		setLeafError(null);
		setLeaf({
			mode: "edit",
			kind: k,
			index
		});
	};
	const saveLeaf = () => {
		const open = leaf;
		const k = open.kind;
		const entries = entriesOf(k);
		if (isHybridKind(k)) {
			const key = optionKeyOf(k);
			if (draftOption === "") {
				setLeafError("Pick one from the served rows.");
				return;
			}
			const option = optionOf(k, draftOption);
			if (option === null) {
				setLeafError("‘" + draftOption + "’ is not a served " + k.label + " row — pick from the catalog, never hand-spell.");
				return;
			}
			const seed = strengthSeedOf(k, option);
			const strength = draftStrength.trim() === "" ? seed : Number(draftStrength);
			if (!Number.isFinite(strength)) {
				setLeafError("Strength must be a number.");
				return;
			}
			const scalar = { [scalarKeyOf(k)]: strength };
			const stamped = { [key]: draftOption };
			if (typeof option.model === "string") stamped["model"] = option.model;
			if (typeof option.preprocessor === "string") stamped["preprocessor"] = option.preprocessor;
			if (open.mode === "create") commit(k, [...entries, {
				...stamped,
				...draftParams,
				...scalar
			}]);
			else {
				const entry = entries[open.index];
				if (entry === void 0) {
					setLeaf(null);
					return;
				}
				const next = [...entries];
				next[open.index] = {
					...entry,
					...stamped,
					...draftParams,
					...scalar
				};
				commit(k, next);
			}
		} else if (isOptionKind(k)) {
			if (open.mode === "create") {
				if (draftOption === "") {
					setLeafError("Pick one from the served rows.");
					return;
				}
				const option = optionOf(k, draftOption);
				const seed = option !== null && option.defaults?.strength !== void 0 ? option.defaults.strength : 1;
				const strength = draftStrength.trim() === "" ? seed : Number(draftStrength);
				if (!Number.isFinite(strength)) {
					setLeafError("Strength must be a number.");
					return;
				}
				const stepsSeed = option?.defaults?.steps;
				const steps = draftSteps.trim() === "" ? typeof stepsSeed === "number" ? stepsSeed : void 0 : Number(draftSteps);
				if (steps !== void 0 && (!Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1)) {
					setLeafError("Steps applied must be a whole number ≥ 1.");
					return;
				}
				if (steps !== void 0) {
					const min = option?.defaults?.steps_min;
					const max = option?.defaults?.steps_max;
					if (typeof min === "number" && steps < min) {
						setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`);
						return;
					}
					if (typeof max === "number" && steps > max) {
						setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`);
						return;
					}
				}
				commit(k, [...entries, steps === void 0 ? {
					id: draftOption,
					strength
				} : {
					id: draftOption,
					strength,
					steps
				}]);
			} else {
				const entry = entries[open.index];
				if (entry === void 0) {
					setLeaf(null);
					return;
				}
				const editRow = (k.options ?? []).find((o) => o.value === entry.id);
				const strengthSeed = typeof editRow?.defaults?.strength === "number" ? editRow.defaults.strength : 1;
				const strength = draftStrength.trim() === "" ? strengthSeed : Number(draftStrength);
				if (!Number.isFinite(strength)) {
					setLeafError("Strength must be a number.");
					return;
				}
				const steps = draftSteps.trim() === "" ? void 0 : Number(draftSteps);
				if (steps !== void 0 && (!Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1)) {
					setLeafError("Steps applied must be a whole number ≥ 1.");
					return;
				}
				if (steps !== void 0) {
					const min = editRow?.defaults?.steps_min;
					const max = editRow?.defaults?.steps_max;
					if (typeof min === "number" && steps < min) {
						setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`);
						return;
					}
					if (typeof max === "number" && steps > max) {
						setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`);
						return;
					}
				}
				const next = [...entries];
				if (steps === void 0) {
					const rest = {
						...entry,
						strength
					};
					delete rest["steps"];
					next[open.index] = rest;
				} else next[open.index] = {
					...entry,
					strength,
					steps
				};
				commit(k, next);
			}
		} else if (open.mode === "create") commit(k, [...entries, { ...draftParams }]);
		else {
			const entry = entries[open.index];
			if (entry === void 0) {
				setLeaf(null);
				return;
			}
			const next = [...entries];
			next[open.index] = {
				...entry,
				...draftParams
			};
			commit(k, next);
		}
		setLeaf(null);
	};
	const deleteLeaf = () => {
		commit(leaf.kind, entriesOf(leaf.kind).filter((_, i) => i !== leaf.index));
		setLeaf(null);
	};
	const onTileDrop = (k, active, over) => {
		const entries = entriesOf(k);
		const from = entries.findIndex((_, i) => k.param_key + "-" + i === active);
		const to = entries.findIndex((_, i) => k.param_key + "-" + i === over);
		if (from < 0 || to < 0) return;
		const next = [...entries];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		commit(k, next);
	};
	const isOrdered = (k) => k.category !== "standalone";
	const anyOrdered = kinds.some(isOrdered);
	return createElement("section", {
		className: card_module_default.modSection,
		"data-subcard-grid": "on",
		"data-testid": "cb-mods-section"
	}, createElement("div", { className: card_module_default.modHead }, createElement("span", { className: card_module_default.modTitle }, "Modifiers"), createElement("span", { className: card_module_default.modHint }, anyOrdered ? "drag to set apply order" : "each entry is its own output (standalone)")), leafError !== null && leaf === null ? createElement("p", { className: card_module_default.modLeafError }, leafError) : null, ...kinds.filter((k) => (k.kindFields ?? []).length > 0).map((k) => createElement("div", {
		key: k.param_key + ":kind",
		className: card_module_default.modLeafFields
	}, k.kindFields.map((f) => createElement("label", {
		key: f.name,
		className: card_module_default.modField
	}, f.label ?? f.name, createElement(SpecAtom, {
		f,
		value: values[f.name] ?? f.default,
		onEdit: (name, v) => {
			commitScalar(f, name, v);
		}
	}))))), createElement("div", {
		className: card_module_default.modRow,
		"data-subcard-row": "flow"
	}, kinds.map((k) => {
		const entries = entriesOf(k);
		if (entries.length === 0) return null;
		const ordered = isOrdered(k);
		return [...entries.map((entry, i) => {
			const id = typeof entry[optionKeyOf(k)] === "string" ? entry[optionKeyOf(k)] : "";
			const option = optionOf(k, id);
			const scalar = scalarKeyOf(k);
			const strength = typeof entry[scalar] === "number" ? entry[scalar] : option !== null && option.defaults !== void 0 && typeof option.defaults[scalar] === "number" ? option.defaults[scalar] : void 0;
			const steps = typeof entry["steps"] === "number" ? entry["steps"] : option !== null && option.defaults !== void 0 && typeof option.defaults["steps"] === "number" ? option.defaults["steps"] : void 0;
			const picked = (k.fields ?? []).find((f) => f.type === "select" && typeof entry[f.name] === "string" && entry[f.name] !== "");
			const pickedLabel = picked === void 0 ? null : (picked.options ?? []).map((o) => typeof o === "string" ? {
				value: o,
				label: o
			} : o).find((o) => o.value === entry[picked.name])?.label ?? null;
			return createElement(ModTile, {
				key: k.param_key + "-" + i,
				tileId: k.param_key + "-" + i,
				label: option !== null ? option.label : pickedLabel !== null ? pickedLabel : id !== "" ? titleCaseId(id) : isOptionKind(k) ? k.label + " " + String(i + 1) : k.label,
				...strength !== void 0 ? { strength } : {},
				...steps !== void 0 ? { steps } : {},
				onOpen: () => {
					openEdit(k, i);
				},
				dragging: dragTile === k.param_key + "-" + i,
				dragOver: overTile === k.param_key + "-" + i && dragTile !== null && dragTile !== overTile,
				...ordered ? {
					onReorderStart: (id) => {
						setDragTile(id);
						if (id === null) setOverTile(null);
					},
					onReorderOver: setOverTile,
					onReorderDrop: (active, over) => {
						setDragTile(null);
						setOverTile(null);
						onTileDrop(k, active, over);
					}
				} : {}
			});
		})];
	}), addable.length > 0 ? createElement("button", {
		type: "button",
		className: card_module_default.modAddSquare,
		"data-subcard-add": "mod",
		"aria-label": "Add modifier",
		title: "Add a modifier",
		onClick: (e) => {
			setPickAt({ rect: e.currentTarget.getBoundingClientRect() });
		}
	}, createElement(IconPlusOutlineRegular, { className: card_module_default.squareGlyph })) : null), pickAt !== null ? createElement(Menu, {
		open: true,
		anchor: null,
		getAnchorRect: () => pickAt.rect,
		items: addable.map((k) => ({
			id: k.kind,
			label: k.label
		})),
		onSelect: (id) => {
			setPickAt(null);
			openCreate(addable.find((x) => x.kind === id));
		},
		onClose: () => {
			setPickAt(null);
		},
		portal: true
	}) : null, leaf !== null ? createElement(Modal, {
		open: true,
		onClose: () => {
			setLeaf(null);
		},
		title: (leaf.mode === "create" ? "Add " : "Edit ") + leaf.kind.label,
		closeLabel: "Close",
		className: card_module_default.modLeafModal
	}, createElement(ModLeaf, {
		leaf,
		values,
		hideFields: seated,
		onDraft: {
			setDraftOption,
			setDraftStrength,
			setDraftParams,
			setDraftSteps,
			draftOption,
			draftStrength,
			draftParams,
			draftSteps
		},
		onError: setLeafError,
		onSave: saveLeaf,
		onDelete: deleteLeaf,
		leafError,
		paintFace: props.paintFace,
		bboxFace: props.bboxFace,
		paintReferenceValue: typeof props.paintReference === "string" ? String(values[props.paintReference] ?? "") : "",
		...props.loadMedia !== void 0 ? { loadMedia: props.loadMedia } : {}
	})) : null);
}
/** THE LEAF BODY — split so the FIELD-kind editor gets its own
*  square provider (the construction law: an image input constructs
*  the square automatically, even inside a mod leaf). */
function ModLeaf(props) {
	const { leaf, onDraft, onSave, onDelete, leafError } = props;
	const k = leaf.kind;
	const hidden = props.hideFields;
	const bboxCanvas = props.bboxFace !== void 0 && k.leaf_face === "bbox-canvas";
	const paintField = props.paintFace !== void 0 && k.leaf_face === "paint-canvas" ? (k.fields ?? []).find((f) => f.type === "image" || f.wtype === "image") : void 0;
	const facePresent = bboxCanvas || paintField !== void 0;
	const draftQuad = () => {
		const quad = [
			onDraft.draftParams["bbox_x"],
			onDraft.draftParams["bbox_y"],
			onDraft.draftParams["bbox_w"],
			onDraft.draftParams["bbox_h"]
		];
		return quad.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ? {
			x: quad[0],
			y: quad[1],
			width: quad[2],
			height: quad[3]
		} : null;
	};
	const writeQuad = (b) => {
		onDraft.setDraftParams(b === null ? {
			...onDraft.draftParams,
			bbox_x: -1,
			bbox_y: -1,
			bbox_w: -1,
			bbox_h: -1
		} : {
			...onDraft.draftParams,
			bbox_x: Math.round(b.x),
			bbox_y: Math.round(b.y),
			bbox_w: Math.round(b.width),
			bbox_h: Math.round(b.height)
		});
	};
	const leafFields = (k.fields ?? []).filter((f) => !(hidden?.has(f.name) ?? false) && !(facePresent && f.faceOwned === true));
	const own = useSquareProvider((name, v) => {
		onDraft.setDraftParams({
			...onDraft.draftParams,
			[name]: v
		});
	}, {
		candidates: [],
		...props.loadMedia !== void 0 ? { loadMedia: props.loadMedia } : {}
	});
	return createElement("div", { className: card_module_default.modLeaf }, leafError !== null ? createElement("p", { className: card_module_default.modLeafError }, leafError) : null, isHybridKind(k) ? createElement("div", { className: card_module_default.modLeafFields }, createElement("label", { className: card_module_default.modField }, k.label, createElement("select", {
		className: card_module_default.modSelect,
		value: onDraft.draftOption,
		onChange: (e) => {
			onDraft.setDraftOption(e.target.value);
		}
	}, createElement("option", { value: "" }, "— pick —"), (k.options ?? []).map((o) => createElement("option", {
		key: o.value,
		value: o.value,
		title: o.tooltip ?? o.label
	}, o.label)), onDraft.draftOption !== "" && (k.options ?? []).every((o) => o.value !== onDraft.draftOption) ? createElement("option", { value: onDraft.draftOption }, titleCaseId(onDraft.draftOption) + " (unregistered)") : null)), createElement("label", { className: card_module_default.modField }, (k.fields ?? []).find((f) => f.name === scalarKeyOf(k))?.label ?? "Strength", createElement(Input, {
		type: "number",
		step: "0.05",
		value: onDraft.draftStrength,
		placeholder: "the row default",
		onChange: (e) => {
			onDraft.setDraftStrength(e.target.value);
		}
	})), (k.fields ?? []).filter((f) => f.name !== optionKeyOf(k) && f.name !== scalarKeyOf(k) && !(hidden?.has(f.name) ?? false)).map((f) => {
		const sq = own.square(f);
		const atom = createElement(SpecAtom, {
			f,
			value: onDraft.draftParams[f.name] ?? f.default,
			onEdit: (name, v) => {
				onDraft.setDraftParams({
					...onDraft.draftParams,
					[name]: v
				});
			},
			...sq !== void 0 ? { square: sq } : {}
		});
		const caption = createElement("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name);
		return sq !== void 0 ? createElement("div", {
			key: f.name,
			className: card_module_default.modField
		}, caption, atom) : createElement("label", {
			key: f.name,
			className: card_module_default.modField
		}, caption, atom);
	}), own.wireMenu) : isOptionKind(k) ? createElement("div", { className: card_module_default.modLeafFields }, leaf.mode === "create" ? createElement("label", { className: card_module_default.modField }, k.label, createElement("select", {
		className: card_module_default.modSelect,
		value: onDraft.draftOption,
		onChange: (e) => {
			onDraft.setDraftOption(e.target.value);
		}
	}, createElement("option", { value: "" }, "— pick —"), k.options.map((o) => createElement("option", {
		key: o.value,
		value: o.value
	}, o.label)))) : null, createElement("label", { className: card_module_default.modField }, "Strength", createElement(Input, {
		type: "number",
		step: "0.05",
		value: onDraft.draftStrength,
		placeholder: "the row default",
		onChange: (e) => {
			onDraft.setDraftStrength(e.target.value);
		}
	})), (k.options ?? []).some((o) => typeof o.defaults?.steps === "number") ? (() => {
		const rowOpts = k.options ?? [];
		const activeRow = rowOpts.find((o) => o.value === onDraft.draftOption) ?? rowOpts[0];
		const rMin = activeRow?.defaults?.steps_min;
		const rMax = activeRow?.defaults?.steps_max;
		const rangeText = typeof rMin === "number" && typeof rMax === "number" && rMin !== rMax ? ` ${rMin}\u2013${rMax}` : typeof activeRow?.defaults?.steps === "number" ? ` (fixed at ${activeRow.defaults.steps})` : "";
		return createElement("label", { className: card_module_default.modField }, `Steps applied${rangeText}`, createElement(Input, {
			"aria-label": "Steps applied",
			type: "number",
			step: "1",
			min: typeof rMin === "number" ? String(rMin) : void 0,
			max: typeof rMax === "number" ? String(rMax) : void 0,
			value: onDraft.draftSteps,
			placeholder: String(activeRow?.defaults?.steps ?? ""),
			title: typeof rMin === "number" && typeof rMax === "number" && rMin !== rMax ? `This adapter runs ${rMin}\u2013${rMax} steps — the dial bounds to the row's declared domain; the run\u2019s sampler applies it unless a call pins steps explicitly.` : "The distill’s own step count — the run’s sampler applies it unless a call pins steps explicitly.",
			onChange: (e) => {
				onDraft.setDraftSteps(e.target.value);
			}
		}));
	})() : null) : bboxCanvas || paintField !== void 0 ? createElement("div", { className: card_module_default.modLeafSplit }, createElement("div", {
		className: card_module_default.modLeafStage,
		"data-leaf-stage": bboxCanvas ? "bbox" : "paint"
	}, bboxCanvas && props.bboxFace !== void 0 ? createElement("div", {
		className: card_module_default.modStageCaption,
		"data-stage-caption": "region"
	}, "Region — optional (scopes the search; clear = whole image)") : null, bboxCanvas && props.bboxFace !== void 0 ? createElement("div", {
		className: card_module_default.modField,
		"data-leaf-canvas": "bbox"
	}, createElement(props.bboxFace, {
		referenceUrl: props.paintReferenceValue,
		value: draftQuad(),
		onChange: writeQuad
	})) : null, paintField !== void 0 && props.paintFace !== void 0 ? createElement("div", {
		className: card_module_default.modField,
		"data-leaf-canvas": "paint"
	}, createElement(props.paintFace, {
		referenceUrl: props.paintReferenceValue,
		value: typeof onDraft.draftParams[paintField.name] === "string" ? onDraft.draftParams[paintField.name] : "",
		onChange: (dataUrl) => {
			onDraft.setDraftParams({
				...onDraft.draftParams,
				[paintField.name]: dataUrl
			});
		}
	})) : null), createElement("div", { className: card_module_default.modLeafFields }, k.section !== void 0 ? createElement("div", {
		className: card_module_default.modStageCaption,
		"data-stage-caption": "filter"
	}, k.section) : null, leafFields.map((f) => createElement("div", { key: f.name }, (() => {
		const sq = own.square(f);
		const atom = createElement(SpecAtom, {
			f,
			value: onDraft.draftParams[f.name],
			onEdit: (name, v) => {
				onDraft.setDraftParams({
					...onDraft.draftParams,
					[name]: v
				});
			},
			...sq !== void 0 ? { square: sq } : {}
		});
		return sq !== void 0 ? createElement("div", { className: card_module_default.modField }, createElement("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name), atom) : createElement("label", { className: card_module_default.modField }, f.label ?? f.name, atom);
	})())), own.wireMenu)) : createElement("div", { className: card_module_default.modLeafFields }, k.section !== void 0 ? createElement("div", {
		className: card_module_default.modStageCaption,
		"data-stage-caption": "filter"
	}, k.section) : null, leafFields.map((f) => createElement("div", { key: f.name }, (() => {
		const sq = own.square(f);
		const atom = createElement(SpecAtom, {
			f,
			value: onDraft.draftParams[f.name],
			onEdit: (name, v) => {
				onDraft.setDraftParams({
					...onDraft.draftParams,
					[name]: v
				});
			},
			...sq !== void 0 ? { square: sq } : {}
		});
		return sq !== void 0 ? createElement("div", { className: card_module_default.modField }, createElement("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name), atom) : createElement("label", { className: card_module_default.modField }, f.label ?? f.name, atom);
	})())), own.wireMenu), createElement("div", { className: card_module_default.modLeafActions }, createElement(Button, {
		variant: "primary",
		onClick: onSave
	}, leaf.mode === "create" ? "Add" : "Save"), leaf.mode === "edit" ? createElement(Button, {
		variant: "ghost",
		onClick: onDelete
	}, "Remove") : null));
}
/** One mod tile (the original, verbatim: useSortable + click to
*  edit + strength to 2 decimals). */
/** The reorder drag's MIME (native HTML5 sortable). */
const MOD_DRAG_MIME = "application/x-melite-mod";
function ModTile(props) {
	const ordered = props.onReorderStart !== void 0;
	return createElement("li", {
		className: card_module_default.modTile + (props.dragging ? " " + card_module_default.tileDragging : "") + (props.dragOver ? " " + card_module_default.modTileOver : ""),
		draggable: ordered,
		"data-mod-tile": props.tileId,
		title: ordered ? "Drag to reorder · click to edit" : "Click to edit (standalone — own output)",
		onDragStart: (e) => {
			if (!ordered) return;
			e.dataTransfer.setData(MOD_DRAG_MIME, props.tileId);
			e.dataTransfer.effectAllowed = "move";
			props.onReorderStart(props.tileId);
		},
		onDragEnd: () => {
			if (ordered) props.onReorderStart(null);
		},
		onDragOver: (e) => {
			if (!ordered) return;
			if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				props.onReorderOver(props.tileId);
			}
		},
		onDrop: (e) => {
			if (!ordered) return;
			if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
				e.preventDefault();
				e.stopPropagation();
				const active = e.dataTransfer.getData(MOD_DRAG_MIME);
				if (active !== "" && active !== props.tileId) props.onReorderDrop(active, props.tileId);
			}
		},
		onClick: props.onOpen
	}, createElement("span", { className: card_module_default.modTileLabel }, props.label), props.strength !== void 0 ? createElement("span", { className: card_module_default.modTileStrength }, props.strength.toFixed(2)) : null, props.steps !== void 0 ? createElement("span", { className: card_module_default.modTileSteps }, `${String(props.steps)} steps`) : null);
}
//#endregion
//#region src/estate-remote.ts
/** The estate's domain refusal ({ok:false} answers): the message
* rides verbatim; the class separates DOMAIN verdicts from transport
* failures so policy code (the gone-verdict, the poll, the CAS
* rebase) can discriminate. */
var EstateRefusedError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "EstateRefusedError";
	}
};
let bound;
/** The armed lazy source (see armEstateRemoteLazyBind): the studio
*  bind's order-proof wake, plain JS — no cordis fiber. */
let lazySource;
/** Capture the namespaces (the mounter's direct bind — or a test's
*  honest fake). Idempotent; the last bind wins. */
function bindEstateRemote(namespaces) {
	bound = namespaces;
}
/** Drop the bind (tests isolate between cases; also disarms the lazy
*  source so the next case starts from the honest unbound state). */
function unbindEstateRemote() {
	bound = void 0;
	lazySource = void 0;
}
/** Arm the lazy bind (the studio bundles' order-proof wake): the
*  factory captures a plain getter reading the namespaces through
*  the inject-free reflect seam (ctx.get — cordis' own type doc:
*  "Read a service from the store without the inject requirement").
*  No cordis fiber, no inject list, no epoch — a getter cannot be
*  parked dormant, refused by a proxy, or poisoned into a parent
*  fiber's inject set (the four receipts that killed every fiber
*  binder). The FIRST verb pulls it (estateRemote, below); if the
*  namespaces still do not exist the loud refusal below speaks. */
function armEstateRemoteLazyBind(source) {
	lazySource = source;
}
/** The bound namespaces — LOUD when unbound, and the LAZY BIND'S
*  MOUTH: the first verb after the mounts land pulls the armed
*  getter once (order-proof — by first use, the mounter has long
*  booted); a verb before the mounts (or on a host without the
*  estate plugin) meets the loud wiring refusal, never a hang and
*  never a silent fallback. */
function estateRemote() {
	if (bound === void 0 && lazySource !== void 0) try {
		bindEstateRemoteFromRemote(lazySource());
	} catch {}
	if (bound === void 0) throw new Error("estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)");
	return bound;
}
/** THE BIND SEAM, HARNESS-SHAPED (2026-09-29, the fourth lane
*  receipt): the client-bundle preset inlines card-base into every
*  consumer bundle, so this module's `bound` singleton exists PER
*  BUNDLE — the from-media outage's second layer. Every attempt to
*  bind through a RUNTIME child fiber died on cordis' own machinery
*  (dotted-only injects: the proxy refuses `child.remote`; parent-
*  only: the fiber starts INACTIVE; both: the runner's own inspect
*  sync breaks). The harness never binds this way. Its consumers —
*  product-analytics, ui-settings, ui-model-selection — declare
*  STATIC plugin injects with BOTH levels (`['remote',
*  'remote.productAnalytics']`), the loader waits for the mounted
*  namespaces before their apply runs, and they read
*  `ctx.remote.<namespace>` directly. That is this bind:
*
*  - a CONSUMING studio declares `export const inject = ['slots',
*    'remote', 'remote.bench', 'remote.drafts', 'remote.runs',
*    'remote.media']` on its client entry — the loader guarantees
*    the namespaces exist when its apply runs;
*  - the MOUNTER (card-view) injects only the parent 'remote' (the
*    dotted names on the mounter would wait on its own $mount — the
*    2026-09-15 deadlock) and binds directly after its mounts;
*  - both call THIS function, the one spelling of the bind, loud on
*    any absent namespace (a mis-injected entry is a wiring bug,
*    never a silent hole).
*
*  THE WALL pins every studio entry's inject list; the singleton
*  throw stays the runtime guard. */
function bindEstateRemoteFromRemote(remote) {
	const { bench, drafts, runs, media } = remote;
	if (bench === void 0 || drafts === void 0 || runs === void 0 || media === void 0) throw new Error("estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)");
	const namespaces = {
		bench,
		drafts,
		runs,
		media
	};
	bindEstateRemote(namespaces);
	return namespaces;
}
/** Await one namespace method's RemoteResult and unwrap it: the
*  value on ok, the estate's refusal text (verbatim) on the error
*  branch. Accepts the promise directly so call sites stay one
*  expression. */
async function unwrapRemote(result, voice) {
	const settled = await result;
	if (settled.ok === true) return settled.value;
	const { error } = settled;
	const failure = error;
	throw new EstateRefusedError(typeof failure === "object" && failure !== null && typeof failure.message === "string" && failure.message !== "" ? failure.message : voice + ": refused");
}
/** Refusal discrimination for policy code (the CAS rebase, the
* gone-verdict, the poll's file-era arms). */
function isEstateRefusal(error) {
	return error instanceof EstateRefusedError;
}
//#endregion
//#region src/slots.ts
function defineStageViewRegistration(key, view, inject) {
	return (ctx) => {
		armEstateRemoteLazyBind(() => ({
			bench: ctx.get("remote.bench"),
			drafts: ctx.get("remote.drafts"),
			runs: ctx.get("remote.runs"),
			media: ctx.get("remote.media")
		}));
		ctx.slots.inject("cards.stage.view", () => {
			ctx.slots.register({
				name: "cards.stage.view",
				key,
				...inject === void 0 ? {} : { inject }
			}, view);
		});
	};
}
/** The seam ids, spelled once. Claims use these constants. */
const CARD_SLOTS = {
	/** keyed by wire type: 'image' | 'file' | 'mesh' | 'select' | ... — the
	*  ATOM seam. The constructor renders every emitted field through
	*  the claim for its declared type; the base's built-in atom is
	*  the default, a card takes over its own type's atom. */
	field: "melite.card.field",
	/** keyed by card id: the WHOLE-FORM takeover — a card's client
	*  half replaces the constructed form entirely (the studio law's
	*  form half; the drill consults this before constructing). */
	form: "melite.card.form",
	/** keyed by card id: the BENCH stage view — a card's client half
	*  mounted on the bench slot (the studio law's bench half; the
	*  first-party studio surface every card package ships). */
	stageView: "cards.stage.view",
	/** keyed by media kind ('video' | 'image'): THE PREVIEW SEAM —
	*  every card's rendered output previews through one shared slot
	*  (shared DSH primitives, hour-9 law); a card claims its kind's
	*  preview only to specialize, never to bespoke. */
	stagePreview: "cards.stage.preview"
};
//#endregion
//#region src/use-resolved.ts
/**
* use-resolved.ts — THE STUDIO SEAM, ONE UNIVERSAL DEFAULT SYSTEM
* (operator, 2026-09-18: "there is no universal default system
* right?"). ONE resolver composes EVERY layer — schema defaults <-
* model_defaults <- base (the persisted/bench layer) <- user — and
* the surface reads THE ONE resolved map. Never a hand `??` ladder
* at a call site: a ladder IS a second resolver, and every extra
* arm is a place the truth forks.
*
* PRE-FETCH LAW: the spec arrives async, but the resolved map is
* STILL the layer composition — base under user, verbatim — so a
* synchronous render shows the document's own held values; the
* fetch landing fills the declared defaults under them (the same
* one map, richer). Nothing renders blank, nothing flickers, no
* call site branches on spec-null.
*
* THE EDIT LAW: `undefined` is the tri-state's inherit signal (the
* unset) — it rides verbatim, the caller's write owns what it
* means. Edits coerce at the SCHEMA BOUNDARY (coerceFieldEdit):
* numeric strings ride as numbers, unparseable strings ride
* verbatim for the run's schema parse to refuse LOUD, and keys the
* spec never declared (the mod bag) ride verbatim — the mod plane
* owns their validation.
*/
/** The resolved studio seam: spec + error from the door, values
* resolved through the ONE cascade, edits coerced at the schema
* boundary. `user` is the surface's explicit layer (a document's
* params — sparse by design); `base` is the persisted layer under
* it (the bench/stage row's params), when the surface has one. */
function useResolvedForm(family, user, onWrite, base) {
	const { spec, error } = useFormSpec(family);
	const resolved = useMemo(() => resolveValueLayered(spec, base, user), [
		spec,
		base,
		user
	]);
	const fieldOf = useCallback((name) => spec !== null ? fieldsOf(spec).find((f) => f.name === name) : void 0, [spec]);
	return {
		spec,
		error,
		resolved,
		edit: useCallback((name, v) => {
			const f = fieldOf(name);
			if (v === "" && f !== void 0 && (f.type === "number" || f.type === "seed" || f.type === "slider")) {
				onWrite(name, void 0);
				return;
			}
			onWrite(name, coerceFieldEdit(f, v));
		}, [fieldOf, onWrite]),
		fieldOf
	};
}
/** The layer composition — PURE, exported for the seam's own wall:
* with a spec it is exactly resolveValue (schema <- model_defaults
* <- base <- user); without one (the pre-fetch render, the dead
* door) it is still the LAYERS — base under user, verbatim — so
* every surface reads the same shape at every moment. */
function resolveValueLayered(spec, base, user) {
	if (spec === null) {
		const out = { ...base ?? {} };
		for (const [k, v] of Object.entries(user)) {
			if (v === null || v === void 0) continue;
			out[k] = v;
		}
		return out;
	}
	return resolveValue(spec, user, base);
}
//#endregion
//#region src/runs-policy.ts
/**
* runs-policy.ts — the run verbs over THE ONE LANE (stroke 81; the
* shared home, stroke 81b — beside estate-remote, for the same
* singleton reason: sibling studio clients poll runs here).
*
* The run-wire package's policy laws, moved verbatim onto the
* mounted runs namespace: status/list/start/stop are typed calls
* through ctx.remote (the generated client — the Connection owns
* transport, RPC ids, envelopes, cancellation; the hand-written
* envelope lane is dead). Refusals resolve as RemoteResult error
* branches and throw EstateRefusedError carrying the estate's
* message verbatim (WireRefusedError's discrimination role — the
* gone-verdict, the poll's file-era arms key on the CLASS, not the
* words). The PURE laws (readRunStatus's normalize, toRunMediaUrl's
* one rewrite, the terminal vocabulary, the list-row url law) stay
* in the run-wire package — their ONE definition; only the
* transport moved.
*/
/** One runs/status read (normalized once — readRunStatus's law). */
async function fetchRunStatus(runId, signal) {
	const doc = await unwrapRemote(estateRemote().runs.status(runId, signal), "runs/status");
	return readRunStatus(runId, doc);
}
/** The runs/list rows as loose records (the restore port's own
*  shape — run_id, draft_id, created_at, status, artifacts). */
async function listRunRows(signal) {
	const row = await unwrapRemote(estateRemote().runs.list("500", signal), "runs/list");
	return (Array.isArray(row["runs"]) ? row["runs"] : []).filter((r) => typeof r === "object" && r !== null);
}
/** One runs/list row by run_id (the file-era face — runs/status only
*  knows live runs; the list is the completed runs' SSOT). */
async function fetchListRow(runId, signal) {
	for (const r of await listRunRows(signal)) {
		const rid = r["run_id"] ?? r["id"];
		if (typeof rid === "string" && rid !== "" && rid === runId) return r;
	}
	return null;
}
/** THE SINGLE-STAGE FALLBACK (run-wire's law, verbatim): a
*  one-stage run's only stage IS the asked stage — the {model:} door
*  names its stage by the card's declared skeleton ('img-to-mesh'),
*  not the bench row id ('s_1') the caller holds; matching ids first
*  keeps multi-stage runs exact while single-stage card runs answer
*  under any label. File-era arm: a REFUSED status (the run is not
*  in the live map) falls back to the runs/list row's first
*  artifact — completed runs answer here, not at the status door.
*  Transport errors rethrow (the caller decides retry); a live
*  answer with no url yet is null (the poll loop keeps going). */
async function fetchRunStageUrl(runId, stageId, signal) {
	let value;
	try {
		value = await fetchRunStatus(runId, signal);
	} catch (e) {
		if (e instanceof Error && e.name === "EstateRefusedError") {
			const listed = await fetchListRow(runId, signal).catch(() => null);
			return listed !== null ? listRowMediaUrl(listed) : null;
		}
		throw e;
	}
	const row = value.stages.find((s) => s.id === stageId) ?? (value.stages.length === 1 ? value.stages[0] : void 0);
	return row !== void 0 && typeof row.url === "string" && row.url !== "" ? row.url : null;
}
/** A run's terminal read (stops poll loops). */
async function fetchRunTerminal(runId, signal) {
	return isTerminalRun((await fetchRunStatus(runId, signal)).status);
}
/** THE GONE-VERDICT (2026-09-13 phantom-running incident): for a run
*  the live registry no longer knows (an estate restart wiped the
*  in-memory map). The file-era law: a refused id may still answer
*  from runs/list (the completed runs' SSOT); absent from both, the
*  run is GONE — nothing will ever write its terminal, so the caller
*  stamps 'stopped'. Transport errors rethrow (not a verdict — the
*  caller retries or leaves the row alone). */
async function probeRunGone(runId, signal) {
	try {
		await fetchRunStatus(runId, signal);
		return "live";
	} catch (e) {
		if (!(e instanceof Error && e.name === "EstateRefusedError")) throw e;
		const listed = await fetchListRow(runId, signal).catch(() => null);
		if (listed === null) return "gone";
		const status = listed["status"];
		return typeof status === "string" && status !== "" ? status : "completed";
	}
}
/** The draft's newest run (runs/list adoption — the reload-proof
*  bridge: the estate is the SSOT, never the client's memory).
*  NOTE the list's ordering: media-bearing runs first, then
*  newest-first — scan the wide tail, newest by created_at. */
async function fetchLatestRunForDraft(draftId, signal) {
	let newest = null;
	for (const r of await listRunRows(signal)) {
		const rid = r["run_id"] ?? r["id"];
		const did = r["draft_id"];
		if (typeof rid !== "string" || rid === "" || did !== draftId) continue;
		const created = r["created_at"];
		const at = typeof created === "number" ? created : 0;
		if (newest === null || at > newest.created) newest = {
			rid,
			created: at
		};
	}
	return newest !== null ? newest.rid : null;
}
/** runs/stop — the cancel door (the registry seat's flag +
*  interrupt). Refusals throw the estate's text. */
async function stopRun(runId, signal) {
	await unwrapRemote(estateRemote().runs.stop(runId, signal), "runs/stop");
}
/** The shared start core — ONE envelope walk for both doors (the
*  registry demands draft_id + an explicit test boolean; the flow
*  body needs its id — the bench runs under its own draft_id). */
async function startRun(doc, signal) {
	try {
		const runId = (await unwrapRemote(estateRemote().runs.start(doc, signal), "runs/start"))["run_id"];
		if (typeof runId === "string" && runId !== "") return { runId };
		return { refused: "run refused: no run_id in the answer" };
	} catch (e) {
		return { refused: e instanceof Error ? e.message : "run request failed" };
	}
}
/** Start ONE card through the composing door (the bench drill's
*  Run, a studio's Run — every single-card gesture rides this). */
async function startCardRun(input, signal) {
	return await startRun({
		...input.params,
		model: input.model,
		draft_id: input.draftId,
		test: input.test ?? false
	}, signal);
}
/** Start pre-composed stages through the flow door (whole-bench Run —
*  honest refusal when the stages carry no workflow or the bench is
*  multi-stage: the single-stage policy is the estate's). */
async function startFlowInlineRun(input, signal) {
	return await startRun({
		flow_inline: {
			id: input.flowId,
			stages: input.stages
		},
		draft_id: input.draftId,
		test: input.test ?? false
	}, signal);
}
/** THE ARTIFACT POLL (the old pollFlowRun law, moved verbatim onto
*  the mounted runs namespace — stroke 81 dropped it by accident and
*  the img-to-mesh studio's import caught the hole): the run is the
*  SSOT — check the stage's url immediately, then on the cadence
*  until it lands (onUrl once, resolve), the run settles without
*  one (resolve silent — the caller's empty state is honest), or
*  signal aborts.
*
*  THE TWO ERROR CLASSES settle differently:
*  - TRANSPORT failures (the wire is down) are swallowed: the next
*    poll may recover.
*  - REFUSALS (EstateRefusedError — the estate answered) on
*    runs/status prove the run is NOT in the live map: nothing is
*    executing for it. The file-era arm then consults the runs/list
*    row ONCE and settles from it — its artifact url when it
*    carries one, silent otherwise (file-era rows never update, so
*    waiting would be the lie); no row at all settles silent the
*    same way. A transport-failed list read keeps the poll alive
*    (the answer may land next cadence). */
async function pollRunStageUrl(runId, stageId, opts, signal) {
	const interval = opts.intervalMs ?? 1500;
	const sleep = (ms) => new Promise((resolve) => {
		const t = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve("slept");
		}, ms);
		const onAbort = () => {
			clearTimeout(t);
			resolve("abort");
		};
		if (signal?.aborted === true) {
			onAbort();
			return;
		}
		signal?.addEventListener("abort", onAbort, { once: true });
	});
	while (signal?.aborted !== true) {
		let row;
		try {
			row = await fetchRunStatus(runId, signal);
		} catch (e) {
			if (isEstateRefusal(e)) try {
				const listed = await fetchListRow(runId, signal);
				const url = listed !== null ? listRowMediaUrl(listed) : null;
				if (url !== null) opts.onUrl(url);
				return;
			} catch (listErr) {
				if (isEstateRefusal(listErr)) return;
			}
			row = {
				runId,
				status: "unknown",
				draftId: null,
				stages: []
			};
		}
		const stage = row.stages.find((s) => s.id === stageId) ?? (row.stages.length === 1 ? row.stages[0] : void 0);
		if (stage !== void 0 && typeof stage.url === "string" && stage.url !== "") {
			opts.onUrl(stage.url);
			return;
		}
		if (isTerminalRun(row.status)) return;
		if (await sleep(interval) === "abort") return;
	}
}
//#endregion
//#region ../../../node_modules/.pnpm/react-dom@19.3.0_react@19.3.0/node_modules/react-dom/cjs/react-dom.production.js
/**
* @license React
* react-dom.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_dom_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var React = __require("react");
	function formatProdErrorMessage(code) {
		var url = "https://react.dev/errors/" + code;
		if (1 < arguments.length) {
			url += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
		}
		return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function noop() {}
	var Internals = {
		d: {
			f: noop,
			r: function() {
				throw Error(formatProdErrorMessage(522));
			},
			D: noop,
			C: noop,
			L: noop,
			m: noop,
			X: noop,
			S: noop,
			M: noop
		},
		p: 0,
		findDOMNode: null
	};
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_RECOVERABLE_TYPE = Symbol.for("react.recoverable");
	var REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key");
	function createPortal$1(children, containerInfo, implementation) {
		var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
		return {
			$$typeof: REACT_PORTAL_TYPE,
			key: null == key ? null : key === REACT_OPTIMISTIC_KEY ? REACT_OPTIMISTIC_KEY : "" + key,
			children,
			containerInfo,
			implementation
		};
	}
	var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function getCrossOriginStringAs(as, input) {
		if ("font" === as) return "";
		if ("string" === typeof input) return "use-credentials" === input ? input : "";
	}
	exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
	exports.browser = function(reason) {
		return {
			$$typeof: REACT_RECOVERABLE_TYPE,
			_reason: reason
		};
	};
	exports.createPortal = function(children, container) {
		var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
		if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType) throw Error(formatProdErrorMessage(299));
		return createPortal$1(children, container, null, key);
	};
	exports.flushSync = function(fn) {
		var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
		try {
			if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
		} finally {
			ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
		}
	};
	exports.preconnect = function(href, options) {
		"string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
	};
	exports.prefetchDNS = function(href) {
		"string" === typeof href && Internals.d.D(href);
	};
	exports.preinit = function(href, options) {
		if ("string" === typeof href && options && "string" === typeof options.as) {
			var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
			"style" === as ? Internals.d.S(href, "string" === typeof options.precedence ? options.precedence : void 0, {
				crossOrigin,
				integrity,
				fetchPriority
			}) : "script" === as && Internals.d.X(href, {
				crossOrigin,
				integrity,
				fetchPriority,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0
			});
		}
	};
	exports.preinitModule = function(href, options) {
		if ("string" === typeof href) if ("object" === typeof options && null !== options) {
			if (null == options.as || "script" === options.as) {
				var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
				Internals.d.M(href, {
					crossOrigin,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0,
					fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
				});
			}
		} else options ?? Internals.d.M(href);
	};
	exports.preload = function(href, options) {
		if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
			var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
			Internals.d.L(href, as, {
				crossOrigin,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0,
				type: "string" === typeof options.type ? options.type : void 0,
				fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
				referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
				imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
				imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
				media: "string" === typeof options.media ? options.media : void 0
			});
		}
	};
	exports.preloadModule = function(href, options) {
		if ("string" === typeof href) if (options) {
			var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
			Internals.d.m(href, {
				as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
				crossOrigin,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0,
				fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
			});
		} else Internals.d.m(href);
	};
	exports.requestFormReset = function(form) {
		Internals.d.r(form);
	};
	exports.unstable_batchedUpdates = function(fn, a) {
		return fn(a);
	};
	exports.useFormState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useFormState(action, initialState, permalink);
	};
	exports.useFormStatus = function() {
		return ReactSharedInternals.H.useHostTransitionStatus();
	};
	exports.version = "19.3.0";
}));
//#endregion
//#region ../../../node_modules/.pnpm/react-dom@19.3.0_react@19.3.0/node_modules/react-dom/cjs/react-dom.development.js
/**
* @license React
* react-dom.development.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_dom_development = /* @__PURE__ */ __commonJSMin(((exports) => {
	"production" !== process.env.NODE_ENV && (function() {
		function noop() {}
		function testStringCoercion(value) {
			return "" + value;
		}
		function createPortal$1(children, containerInfo, implementation) {
			var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
			if (null == key) key = null;
			else if (key === REACT_OPTIMISTIC_KEY) key = REACT_OPTIMISTIC_KEY;
			else {
				try {
					testStringCoercion(key);
					var JSCompiler_inline_result = !1;
				} catch (e) {
					JSCompiler_inline_result = !0;
				}
				JSCompiler_inline_result && (console.error("The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", "function" === typeof Symbol && Symbol.toStringTag && key[Symbol.toStringTag] || key.constructor.name || "Object"), testStringCoercion(key));
				key = "" + key;
			}
			return {
				$$typeof: REACT_PORTAL_TYPE,
				key,
				children,
				containerInfo,
				implementation
			};
		}
		function getCrossOriginStringAs(as, input) {
			if ("font" === as) return "";
			if ("string" === typeof input) return "use-credentials" === input ? input : "";
		}
		function getValueDescriptorExpectingObjectForWarning(thing) {
			return null === thing ? "`null`" : void 0 === thing ? "`undefined`" : "" === thing ? "an empty string" : "something with type \"" + typeof thing + "\"";
		}
		function getValueDescriptorExpectingEnumForWarning(thing) {
			return null === thing ? "`null`" : void 0 === thing ? "`undefined`" : "" === thing ? "an empty string" : "string" === typeof thing ? JSON.stringify(thing) : "number" === typeof thing ? "`" + thing + "`" : "something with type \"" + typeof thing + "\"";
		}
		function resolveDispatcher() {
			var dispatcher = ReactSharedInternals.H;
			null === dispatcher && console.error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.");
			return dispatcher;
		}
		"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
		var React = __require("react"), Internals = {
			d: {
				f: noop,
				r: function() {
					throw Error("Invalid form element. requestFormReset must be passed a form that was rendered by React.");
				},
				D: noop,
				C: noop,
				L: noop,
				m: noop,
				X: noop,
				S: noop,
				M: noop
			},
			p: 0,
			findDOMNode: null
		}, REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_RECOVERABLE_TYPE = Symbol.for("react.recoverable"), REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
		"function" === typeof Map && null != Map.prototype && "function" === typeof Map.prototype.forEach && "function" === typeof Set && null != Set.prototype && "function" === typeof Set.prototype.clear && "function" === typeof Set.prototype.forEach || console.error("React depends on Map and Set built-in types. Make sure that you load a polyfill in older browsers. https://reactjs.org/link/react-polyfills");
		exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
		exports.browser = function(reason) {
			return {
				$$typeof: REACT_RECOVERABLE_TYPE,
				_reason: reason
			};
		};
		exports.createPortal = function(children, container) {
			var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
			if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType) throw Error("Target container is not a DOM element.");
			return createPortal$1(children, container, null, key);
		};
		exports.flushSync = function(fn) {
			var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
			try {
				if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
			} finally {
				ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f() && console.error("flushSync was called from inside a lifecycle method. React cannot flush when React is already rendering. Consider moving this call to a scheduler task or micro task.");
			}
		};
		exports.preconnect = function(href, options) {
			"string" === typeof href && href ? null != options && "object" !== typeof options ? console.error("ReactDOM.preconnect(): Expected the `options` argument (second) to be an object but encountered %s instead. The only supported option at this time is `crossOrigin` which accepts a string.", getValueDescriptorExpectingEnumForWarning(options)) : null != options && "string" !== typeof options.crossOrigin && console.error("ReactDOM.preconnect(): Expected the `crossOrigin` option (second argument) to be a string but encountered %s instead. Try removing this option or passing a string value instead.", getValueDescriptorExpectingObjectForWarning(options.crossOrigin)) : console.error("ReactDOM.preconnect(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.", getValueDescriptorExpectingObjectForWarning(href));
			"string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
		};
		exports.prefetchDNS = function(href) {
			if ("string" !== typeof href || !href) console.error("ReactDOM.prefetchDNS(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.", getValueDescriptorExpectingObjectForWarning(href));
			else if (1 < arguments.length) {
				var options = arguments[1];
				"object" === typeof options && options.hasOwnProperty("crossOrigin") ? console.error("ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. It looks like the you are attempting to set a crossOrigin property for this DNS lookup hint. Browsers do not perform DNS queries using CORS and setting this attribute on the resource hint has no effect. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.", getValueDescriptorExpectingEnumForWarning(options)) : console.error("ReactDOM.prefetchDNS(): Expected only one argument, `href`, but encountered %s as a second argument instead. This argument is reserved for future options and is currently disallowed. Try calling ReactDOM.prefetchDNS() with just a single string argument, `href`.", getValueDescriptorExpectingEnumForWarning(options));
			}
			"string" === typeof href && Internals.d.D(href);
		};
		exports.preinit = function(href, options) {
			"string" === typeof href && href ? null == options || "object" !== typeof options ? console.error("ReactDOM.preinit(): Expected the `options` argument (second) to be an object with an `as` property describing the type of resource to be preinitialized but encountered %s instead.", getValueDescriptorExpectingEnumForWarning(options)) : "style" !== options.as && "script" !== options.as && console.error("ReactDOM.preinit(): Expected the `as` property in the `options` argument (second) to contain a valid value describing the type of resource to be preinitialized but encountered %s instead. Valid values for `as` are \"style\" and \"script\".", getValueDescriptorExpectingEnumForWarning(options.as)) : console.error("ReactDOM.preinit(): Expected the `href` argument (first) to be a non-empty string but encountered %s instead.", getValueDescriptorExpectingObjectForWarning(href));
			if ("string" === typeof href && options && "string" === typeof options.as) {
				var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
				"style" === as ? Internals.d.S(href, "string" === typeof options.precedence ? options.precedence : void 0, {
					crossOrigin,
					integrity,
					fetchPriority
				}) : "script" === as && Internals.d.X(href, {
					crossOrigin,
					integrity,
					fetchPriority,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0
				});
			}
		};
		exports.preinitModule = function(href, options) {
			var encountered = "";
			"string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
			void 0 !== options && "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && "as" in options && "script" !== options.as && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingEnumForWarning(options.as) + ".");
			if (encountered) console.error("ReactDOM.preinitModule(): Expected up to two arguments, a non-empty `href` string and, optionally, an `options` object with a valid `as` property.%s", encountered);
			else switch (encountered = options && "string" === typeof options.as ? options.as : "script", encountered) {
				case "script": break;
				default: encountered = getValueDescriptorExpectingEnumForWarning(encountered), console.error("ReactDOM.preinitModule(): Currently the only supported \"as\" type for this function is \"script\" but received \"%s\" instead. This warning was generated for `href` \"%s\". In the future other module types will be supported, aligning with the import-attributes proposal. Learn more here: (https://github.com/tc39/proposal-import-attributes)", encountered, href);
			}
			if ("string" === typeof href) if ("object" === typeof options && null !== options) {
				if (null == options.as || "script" === options.as) encountered = getCrossOriginStringAs(options.as, options.crossOrigin), Internals.d.M(href, {
					crossOrigin: encountered,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0,
					fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
				});
			} else options ?? Internals.d.M(href);
		};
		exports.preload = function(href, options) {
			var encountered = "";
			"string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
			null == options || "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : "string" === typeof options.as && options.as || (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
			encountered && console.error("ReactDOM.preload(): Expected two arguments, a non-empty `href` string and an `options` object with an `as` property valid for a `<link rel=\"preload\" as=\"...\" />` tag.%s", encountered);
			if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
				encountered = options.as;
				var crossOrigin = getCrossOriginStringAs(encountered, options.crossOrigin);
				Internals.d.L(href, encountered, {
					crossOrigin,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0,
					type: "string" === typeof options.type ? options.type : void 0,
					fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
					referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
					imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
					imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
					media: "string" === typeof options.media ? options.media : void 0
				});
			}
		};
		exports.preloadModule = function(href, options) {
			var encountered = "";
			"string" === typeof href && href || (encountered += " The `href` argument encountered was " + getValueDescriptorExpectingObjectForWarning(href) + ".");
			void 0 !== options && "object" !== typeof options ? encountered += " The `options` argument encountered was " + getValueDescriptorExpectingObjectForWarning(options) + "." : options && "as" in options && "string" !== typeof options.as && (encountered += " The `as` option encountered was " + getValueDescriptorExpectingObjectForWarning(options.as) + ".");
			encountered && console.error("ReactDOM.preloadModule(): Expected two arguments, a non-empty `href` string and, optionally, an `options` object with an `as` property valid for a `<link rel=\"modulepreload\" as=\"...\" />` tag.%s", encountered);
			"string" === typeof href && (options ? (encountered = getCrossOriginStringAs(options.as, options.crossOrigin), Internals.d.m(href, {
				as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
				crossOrigin: encountered,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0,
				fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
			})) : Internals.d.m(href));
		};
		exports.requestFormReset = function(form) {
			Internals.d.r(form);
		};
		exports.unstable_batchedUpdates = function(fn, a) {
			return fn(a);
		};
		exports.useFormState = function(action, initialState, permalink) {
			return resolveDispatcher().useFormState(action, initialState, permalink);
		};
		exports.useFormStatus = function() {
			return resolveDispatcher().useHostTransitionStatus();
		};
		exports.version = "19.3.0";
		"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
	})();
}));
//#endregion
//#region src/studioRail.tsx
/**
* StudioRail — the shell-provided TOOLS slot in the studio's left rail
* (spec docs/design/card-studio-pattern.md §5 + §7.10).
*
* WHY A PORTAL: vertical space is the scarce axis (§7.9 — human figures),
* so a tenant's tool buttons (Skeleton / Refine pose / Export / …) must
* live in the RAIL, but their state lives INSIDE the tenant component
* (showSkeleton, editMode, bgImage…). Splitting the tenant into two
* registered components would force that state up through the shell —
* breaking E1 (the tenant receives exactly {stage, running, onSave}).
* Instead the tenant stays ONE component and PROJECTS its tools into the
* shell's slot; the shell stays genre-blind (it renders an empty div and
* knows nothing about motion).
*
* THE CONTRACT IS UNCHANGED: portaled tools write through the same
* onSave channel — nothing about the write path moves. Without the shell
* (a tenant mounted inline, e.g. the form view) the tools render in place
* — the exact layout the tenant had before the slot existed.
*
* Mount order (no flash): CardStudio renders the slot div and the tenant
* in the same commit; the div's ref lands before the tenant's effects
* run, so the portal binds on the first effect pass. The one render
* before that is inside the skeleton-masked mount anyway.
*/
var import_react_dom = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function checkDCE() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") return;
		if (process.env.NODE_ENV !== "production") throw new Error("^_^");
		try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
		} catch (err) {
			console.error(err);
		}
	}
	if (process.env.NODE_ENV === "production") {
		checkDCE();
		module.exports = require_react_dom_production();
	} else module.exports = require_react_dom_development();
})))();
/** The rail's tools-slot element, published by CardStudio. Null when the
*  tenant is mounted outside a studio shell (inline fallback). */
const StudioRailCtx = createContext(null);
/** TENANT side: renders children into the studio rail when one exists,
*  inline otherwise. Wrap the tenant's toolbar in this — nothing else. */
function StudioRail({ children }) {
	const slot = useContext(StudioRailCtx);
	const [el, setEl] = useState(null);
	useEffect(() => {
		if (slot && slot !== el) setEl(slot);
	}, [slot]);
	if (el) return (0, import_react_dom.createPortal)(children, el);
	if (slot) return null;
	return /* @__PURE__ */ jsx(Fragment, { children });
}
//#endregion
//#region src/toastStore.ts
/**
* THE ONE TOAST STORE (node-safe half of the one toast system,
* stroke 37): module state + the dual API (hook selector for React,
* zustand-classic statics for module-level pushers and tests). NO
* atom imports — node-env suites (the catalog contract specs) import
* this half without dragging DSH UI primitives' .css through the
* door. The renderer half lives in ./toast.tsx (ToastViewport); the
* store is the system, the viewport is its face.
*
* One store for the whole system: pusher modules call the
* `getState()`/`subscribe()`/`setState()` statics from module context,
* React seats use the hook selector. The last two private stores (in
* web-kit/catalog and mask-studio) are gone; their pushers now ride
* the `contractToast` seam in @melite/catalog, wired by each browser
* entry to this store.
*/
let nextId = 1;
let entries = [];
const listeners = /* @__PURE__ */ new Set();
function emit() {
	listeners.forEach((l) => l());
}
function subscribe(listener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
function getSnapshot() {
	return entries;
}
/** How long a toast of a severity holds before it dismisses, in ms.
*  THE ONE OWNER of that number: the store arms its dismissal timer
*  from it (the lifetime holds without a viewport mounted) and the
*  renderer face passes it to the DSH Toast as `holdMs`, so a
*  duration is spelled once. Errors persist long enough for the
*  operator to read what broke; success and info clear quickly. */
function toastHoldMs(type) {
	return type === "error" ? 15e3 : 5e3;
}
function addToast(type, message, _action) {
	const id = nextId++;
	entries = [...entries, {
		id,
		type,
		message
	}];
	if (type === "error") console.error("[toast]", message);
	else console.info("[toast]", message);
	emit();
	setTimeout(() => {
		removeToast(id);
	}, toastHoldMs(type));
}
function removeToast(id) {
	if (!entries.some((t) => t.id === id)) return;
	entries = entries.filter((t) => t.id !== id);
	emit();
}
let liveAddToast = addToast;
function getStore() {
	return {
		toasts: entries,
		addToast: liveAddToast,
		removeToast
	};
}
function setStoreState(patch) {
	if (patch.addToast !== void 0) liveAddToast = patch.addToast;
	if (patch.toasts !== void 0) entries = patch.toasts;
	emit();
}
/** The hook half — inside React: `useToastStore((s) => s.addToast)`.
*  The static half (getState/subscribe/setState) hangs off the same
*  function, the zustand-classic shape — module-level pushers and
*  tests use those without calling the hook. */
const useToastStore = Object.assign(function useToastStore(selector) {
	const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	return selector({
		addToast: liveAddToast,
		removeToast,
		toasts
	});
}, {
	getState: getStore,
	setState: setStoreState,
	subscribe
});
//#endregion
//#region src/toast.tsx
/**
* ToastViewport — THE RENDERER FACE of the one toast system
* (stroke 37). The store lives in ./toastStore.ts (node-safe, no
* atom); this file re-exports it so UI users keep one import —
* `@melite/card-base/client` — and mounts the viewport.
*
* THE MOUNT-CLAIM LAW: the viewport may mount at every seat — the
* studio shell, the cards console — and the document still renders
* toasts exactly ONCE. The first live viewport owns rendering;
* every other mounted viewport renders nothing; ownership
* re-broadcasts when owners unmount. No studio wires it, no studio
* can forget it, no seat can duplicate it.
*
* Reached through the `/client` door (`@melite/card-base/client`).
*/
const liveViewportIds = /* @__PURE__ */ new Set();
let viewportEpoch = 0;
const viewportListeners = /* @__PURE__ */ new Set();
function emitViewportChange() {
	viewportEpoch++;
	viewportListeners.forEach((l) => l());
}
function subscribeViewport(l) {
	viewportListeners.add(l);
	return () => {
		viewportListeners.delete(l);
	};
}
function getViewportEpoch() {
	return viewportEpoch;
}
let nextViewportId = 1;
/** Mount anywhere the system needs a renderer — the studio shell,
*  the cards console, any seat. The claim law guarantees exactly one
*  live renderer per document: the first-mounted viewport renders,
*  others render nothing until the owner unmounts. Renders the live
*  entries through the DSH Toast atom (body-portaled banner, owner
*  unmounts onDone). */
function ToastViewport() {
	const idRef = useRef(nextViewportId++);
	useEffect(() => {
		const id = idRef.current;
		liveViewportIds.add(id);
		emitViewportChange();
		return () => {
			liveViewportIds.delete(id);
			emitViewportChange();
		};
	}, []);
	useSyncExternalStore(subscribeViewport, getViewportEpoch, getViewportEpoch);
	const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	if (!(liveViewportIds.size === 0 || Math.min(...liveViewportIds) === idRef.current) || toasts.length === 0) return null;
	return /* @__PURE__ */ jsx(Fragment, { children: toasts.map((t) => /* @__PURE__ */ jsx(Toast, {
		text: t.message,
		holdMs: toastHoldMs(t.type),
		onDone: () => removeToast(t.id)
	}, t.id)) });
}
//#endregion
//#region src/shell.module.css
var shell_module_default = {
	"errorIcon": "DKBqVW_errorIcon",
	"errorLine": "DKBqVW_errorLine",
	"errorRow": "DKBqVW_errorRow",
	"railHead": "DKBqVW_railHead",
	"railSection": "DKBqVW_railSection",
	"railTitle": "DKBqVW_railTitle",
	"shell": "DKBqVW_shell"
};
//#endregion
//#region src/shell.tsx
/** The loud error line — shell-owned chrome. Same DOM the assembly
*  body always rendered. */
function StudioShellErrorLine({ errors }) {
	if (errors.length === 0) return null;
	return /* @__PURE__ */ jsx("div", {
		role: "alert",
		className: shell_module_default.errorLine,
		children: errors.map((e) => /* @__PURE__ */ jsxs("p", {
			className: shell_module_default.errorRow,
			children: [
				/* @__PURE__ */ jsx(AlertTriangle, { className: shell_module_default.errorIcon }),
				e.id,
				": ",
				e.message
			]
		}, e.id))
	});
}
/** The studio body: params column LEFT (projected into the shell rail
*  slot when one exists), preview RIGHT, optional bottom bar, then the
*  error line. The uniform three-slot shape — timeline and form cards
*  are the same grain, forms simply leave the right/bottom slots empty.
*
*  THE TOAST LAW (stroke 36): the shell mounts the ONE toast viewport
*  — toasts are shell-owned chrome exactly like the error line (the
*  construction law: no studio wires it, no studio can forget it).
*  Before: motion hand-mounted a copy in a slot the contract never
*  had (type drift), anny pushed toasts with NO viewport mounted —
*  silently dropped — and ideogram4 hand-wired its own outside the
*  shell. The per-studio mount is DEAD; any toast pushed from any
*  seam renders here, once. */
function StudioShell({ params, preview, bottom, errors = [], className }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cx(shell_module_default.shell, className),
		children: [
			/* @__PURE__ */ jsx(StudioRail, { children: params }),
			preview,
			bottom,
			/* @__PURE__ */ jsx(StudioShellErrorLine, { errors }),
			/* @__PURE__ */ jsx(ToastViewport, {})
		]
	});
}
function RailSection({ title, actions, children, className, titleClassName, ...props }) {
	return /* @__PURE__ */ jsxs("section", {
		"data-slot": "rail-section",
		"aria-label": typeof title === "string" ? title : void 0,
		className: cx(shell_module_default.railSection, className),
		...props,
		children: [/* @__PURE__ */ jsxs("div", {
			className: shell_module_default.railHead,
			children: [/* @__PURE__ */ jsx("p", {
				className: cx(shell_module_default.railTitle, titleClassName),
				children: title
			}), actions]
		}), children]
	});
}
/** The construction door: one obvious way to build a declaration,
*  typed at the call site. Runtime-frozen. */
function defineShellDeclaration(declaration) {
	return Object.freeze(declaration);
}
//#endregion
//#region src/studio.module.css
var studio_module_default = {
	"groupNote": "jKGmwq_groupNote",
	"runError": "jKGmwq_runError",
	"studioGroup": "jKGmwq_studioGroup",
	"studioGroupTitle": "jKGmwq_studioGroupTitle",
	"studioRail": "jKGmwq_studioRail",
	"zoomDetail": "jKGmwq_zoomDetail"
};
//#endregion
//#region src/studio.tsx
/** studio.tsx — THE DECLARATIVE STUDIO (primitive ④, 2026-09-21):
*  the stage view owns ORGANIZATION over the SAME form-spec SSOT —
*  and organization is now DATA, not a client half. A card declares
*  its group partition (expose/fold + titles) and its preview kind;
*  the base renders everything else: spec fetch, value seeding +
*  resolved layering, the square provider, the patch-first run law,
*  the bindRun ref dispatch, run polling, the envelope lift,
*  error/loading faces, StudioShell composition.
*
*  A studio client half survives ONLY as a declaration + seam
*  registration (img-to-mesh is the first: ~30 lines, zero react
*  machinery, zero three, zero css). A TRUE takeover — content no
*  renderer can declare (motion's timeline, h3's call-card strip) —
*  rides beside this renderer as an extra pane, never a fork. */
/** The construction door: one obvious way to build a declaration,
*  typed at the call site. Runtime-frozen. */
function defineStudioDeclaration(declaration) {
	return Object.freeze({
		...declaration,
		expose: Object.freeze([...declaration.expose]),
		folds: Object.freeze({ ...declaration.folds })
	});
}
function rowsOfGroup(fields, group) {
	return fields.filter((f) => f.group === group);
}
/** THE ONE data-driven studio renderer. Props are the seam's own
*  currency (StageViewOwnerProps) plus the card's declaration. */
function DeclarativeStudio(props) {
	const { declaration, row, runStatus, onPatch, onRun, onStop } = props;
	const params = typeof row["params"] === "object" && row["params"] !== null ? row["params"] : {};
	const [spec, setSpec] = useState(null);
	const [error, setError] = useState(null);
	const [user, setUser] = useState(params);
	const [open, setOpen] = useState({});
	const rowResult = typeof row["result"] === "object" && row["result"] !== null ? row["result"] : null;
	const ownRunId = typeof rowResult?.run_id === "string" && rowResult.run_id !== "" ? rowResult.run_id : null;
	const ownUrl = typeof rowResult?.url === "string" && rowResult.url !== "" ? rowResult.url : null;
	const [meshUrl, setMeshUrl] = useState(ownUrl);
	useEffect(() => {
		setMeshUrl(ownUrl);
		if (ownUrl !== null || ownRunId === null) return;
		const ctrl = new AbortController();
		pollRunStageUrl(ownRunId, props.stageId, { onUrl: setMeshUrl }, ctrl.signal);
		return () => {
			ctrl.abort();
		};
	}, [
		ownRunId,
		ownUrl,
		props.stageId
	]);
	const { spec: liveSpec, error: specError } = useFormSpec(declaration.model);
	useEffect(() => {
		if (specError !== null) {
			setError(specError);
			return;
		}
		if (liveSpec === null) return;
		setSpec(liveSpec);
		setUser({ ...params });
		props.onSurface(liveSpec.size === "huge" ? "huge" : "");
	}, [liveSpec, specError]);
	const fieldByName = new Map((spec !== null ? fieldsOf(spec) : []).map((f) => [f.name, f]));
	const onEdit = (name, v) => {
		setUser((prev) => ({
			...prev,
			[name]: coerceFieldEdit(fieldByName.get(name), v)
		}));
	};
	const servedBase = typeof row["resolved"] === "object" && row["resolved"] !== null && !Array.isArray(row["resolved"]) ? row["resolved"] : void 0;
	const value = resolveValue(spec ?? { form: "" }, user, servedBase);
	const specRows = spec !== null ? fieldsOf(spec) : [];
	const { square: squareFor, wireMenu } = useSquareProvider(onEdit, { candidates: props.upstream.map((u) => ({
		id: u.id,
		label: u.title,
		url: u.url
	})) });
	const run = () => {
		if (spec === null) return;
		const patch = {};
		const userKeys = new Set(Object.keys(user));
		for (const k of userKeys) patch[k] = user[k];
		for (const k of Object.keys(params)) if (!userKeys.has(k)) patch[k] = null;
		onPatch(patch);
		onRun();
	};
	const runRef = useRef(run);
	runRef.current = run;
	useEffect(() => {
		props.bindRun?.(() => {
			runRef.current();
		});
	}, [props.bindRun]);
	return createElement("div", { className: studio_module_default.zoomDetail }, wireMenu, error !== null ? createElement("p", { className: studio_module_default.runError }, error) : null, spec === null ? createElement("p", { className: studio_module_default.groupNote }, "loading the declared knob surface…") : createElement(StudioShell, {
		params: createElement("div", { className: studio_module_default.studioRail }, declaration.expose.map((g) => createElement("section", {
			key: g,
			className: studio_module_default.studioGroup
		}, createElement("h4", { className: studio_module_default.studioGroupTitle }, g), createElement(StudioFields, {
			fields: rowsOfGroup(specRows, g),
			value,
			onEdit,
			square: squareFor
		}))), Object.entries(declaration.folds).map(([g, title]) => {
			const fs = rowsOfGroup(specRows, g);
			if (fs.length === 0) return null;
			const isOpen = open[g] === true;
			return createElement(DisclosureRow, {
				key: g,
				icon: createElement(IconArchiveOutlineRegular),
				title,
				open: isOpen,
				expandable: true,
				expandOnRowClick: true,
				onToggle: () => {
					setOpen((prev) => ({
						...prev,
						[g]: !prev[g]
					}));
				}
			}, createElement(StudioFields, {
				fields: fs,
				value,
				onEdit,
				square: squareFor
			}));
		})),
		preview: createElement(GlbStagePreview, {
			assets: meshUrl === null ? [] : [{
				id: "mesh",
				url: meshUrl,
				name: "mesh"
			}],
			label: declaration.model,
			emptyHint: "Run the card to see the mesh"
		})
	}));
}
/** The generic card's OWN atoms (SpecFieldRow renders one group's
*  rows — the studio owns its group partition; zero atom copies).
*  `value` is the RESOLVED map (resolveValue at the caller) — the
*  rows show exactly what a run composes. */
function StudioFields({ fields, value, onEdit, square }) {
	if (fields.length === 0) return createElement("p", { className: studio_module_default.groupNote }, "no declared fields");
	return createElement("div", null, fields.map((f) => createElement(SpecFieldRow, {
		key: f.name,
		f,
		value: value[f.name],
		onEdit,
		square: square(f)
	})));
}
//#endregion
//#region src/poser-figure.tsx
/**
* poser-figure.tsx — THE NATIVE FIGURE STAGE (stroke 90 + the live
* follow-up, 2026-09-17: "these knobs do LITERALLY NOTHING — they
* are supposed to CHANGE THE [REDACTED 2026-11-05] BODY"). The figure is not a
* static portrait: it is SHAPED BY THE CARD'S LIVE PARAMS — the 11
* identity coeffs and the non-zero local_changes ride the SAME
* shared bind-mesh module the body studios use
* (@melite/formats/poserSkin — ONE fetch surface, ONE per-signature
* cache across the estate; the module's own header records the
* dedup law: "the positional form is how the two pre-dedup copies
* drifted"). The 2026-09-06 law stands: NEVER the low-poly GLB
* export, always the /poser shaped bind mesh (18,056 verts, smooth
* normals).
*
* SUBSTRATE LAW (verbatim, glb-stage.tsx): RAW three.js — imperative
* scene in a useEffect, NO @react-three. three is a pure leaf
* library; mounts like any imperative canvas lib.
*
* DRAG LAW: slider drags emit streams; the fetch debounces 120ms
* and the module's cache (coeffs rounded 0.1, local changes 0.02)
* collapses identical shapes. The SCENE mounts once per card; shape
* commits SWAP THE GEOMETRY in place — no canvas flicker per drag.
*/
/** Pure: the resolved params → the identity coeff vector (the
* identity group's fields, order-sorted, values from the resolved
* map). null when the spec has no identity group OR any dim is not
* a finite number — a PARTIAL vector would mis-shape the body
* (every dim must ride or none do; the neutral GET is the
* fallback). */
function figureCoeffsOf(spec, value) {
	if (spec === null) return null;
	const fields = fieldsOf(spec).filter((f) => f.group === "identity").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	if (fields.length === 0) return null;
	const coeffs = [];
	for (const f of fields) {
		const v = value[f.name];
		if (typeof v !== "number" || !Number.isFinite(v)) return null;
		coeffs.push(v);
	}
	return coeffs;
}
/** Pure: the resolved params → the local-changes map (the morph
* group's fields, NON-ZERO finite values only — the sparse law:
* absent = the engine's own 0). null when empty or no morph group
* (the caller omits the arm; the fetch rides the neutral GET). */
function figureLocalChangesOf(spec, value) {
	if (spec === null) return null;
	const out = {};
	for (const f of fieldsOf(spec)) {
		if (f.group !== "morph") continue;
		const v = value[f.name];
		if (typeof v === "number" && Number.isFinite(v) && v !== 0) out[f.name] = v;
	}
	return Object.keys(out).length > 0 ? out : null;
}
/** Pure: the door's JSON → a three geometry (unit-testable without
* WebGL). Float32 positions, uint32 indices, computed smooth
* normals (the door ships unindexed soup; the weld-free normals are
* the poser's own smooth-shading intent — the design doc's word). */
function figureGeometry(doc) {
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(doc.vertices.flat(), 3));
	g.setIndex(doc.faces.flat());
	g.computeVertexNormals();
	return g;
}
/** The shape signature — identity coeffs + local changes as one
* stable string (the effect's dep; a new shape re-fetches, an
* identical one does not). */
function figureShapeSig(identityCoeffs, localChanges) {
	return `${identityCoeffs !== void 0 && identityCoeffs !== null && identityCoeffs.length > 0 ? identityCoeffs.map((v) => v.toFixed(2)).join(",") : ""}|${localChanges !== void 0 && localChanges !== null ? Object.entries(localChanges).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",") : ""}`;
}
/** The resting camera radius (mount default [2.2, 1.6, 2.6]) —
* framing scales AGAINST this base, so framing 1.2 ≈ the resting
* view and 3.0 pulls the camera back to the factor's own word. */
const BASE_CAMERA_RADIUS = Math.hypot(2.2, 1.6, 2.6);
/** Pure: the resolved params → the figure camera arms. The poser's
* camera verbs are NAME-KEYED ('framing' = distance factor,
* 'focal_length' = lens mm): a card that declares them drives the
* figure viewport's camera LIVE (the studio's camera rail); a card
* that doesn't (or non-finite values) omits both — the stage's own
* resting camera stands. */
function figureCameraOf(spec, value) {
	if (spec === null) return {};
	const out = {};
	const framing = value["framing"];
	if (typeof framing === "number" && Number.isFinite(framing) && framing > 0) out.framing = framing;
	const focal = value["focal_length"];
	if (typeof focal === "number" && Number.isFinite(focal) && focal > 0) out.focalLength = focal;
	return out;
}
/** THE NATIVE FIGURE — the /poser shaped bind mesh on the shared
* stage core (same light rig + floor grid as the GLB stage, the
* preview-port interaction law: ONE look across ports). Fetch
* failures voice themselves in the DOM (the loud-errors law);
* WebGL absence refuses loud, never a blank silent canvas. */
function PoserFigureStage({ identityModel, identityCoeffs, localChanges, framing, focalLength, label }) {
	const canvasRef = useRef(null);
	const meshRef = useRef(null);
	const stageRef = useRef(null);
	const [doc, setDoc] = useState(null);
	const [failed, setFailed] = useState(null);
	const sig = figureShapeSig(identityCoeffs, localChanges);
	useEffect(() => {
		setDoc(null);
		setFailed(null);
	}, [identityModel]);
	useEffect(() => {
		let alive = true;
		const timer = setTimeout(() => {
			setFailed(null);
			fetchBindMesh({
				identityModel,
				...identityCoeffs !== void 0 && identityCoeffs !== null && identityCoeffs.length > 0 ? { identityCoeffs } : {},
				...localChanges !== void 0 && localChanges !== null && Object.keys(localChanges).length > 0 ? { localChanges } : {}
			}).then((d) => {
				if (alive) setDoc(d);
			}).catch((e) => {
				if (alive) setFailed(e instanceof Error ? e.message : "figure fetch failed");
			});
		}, 120);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [identityModel, sig]);
	const hasDoc = doc !== null;
	useEffect(() => {
		if (!hasDoc) return;
		const canvas = canvasRef.current;
		const stage = mountStage3D(canvas, {
			fov: 40,
			camera: [
				2.2,
				1.6,
				2.6
			],
			target: [
				0,
				.8,
				0
			],
			toneMapping: THREE.NoToneMapping,
			onContextFailure: (m) => setFailed(m)
		});
		if (stage === null) return;
		stageRef.current = stage;
		const scene = stage.scene;
		scene.add(new THREE.HemisphereLight(16777215, 9079434, 1.4));
		const key = new THREE.DirectionalLight(16777215, 2.2);
		key.position.set(3, 5, 2);
		scene.add(key);
		const fill = new THREE.DirectionalLight(16777215, .6);
		fill.position.set(-3, 2, -2);
		scene.add(fill);
		const grid = new THREE.GridHelper(6, 24, 12303291, 14540253);
		const gridMat = grid.material;
		gridMat.transparent = true;
		gridMat.opacity = .35;
		scene.add(grid);
		const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({
			color: 13220008,
			roughness: .72,
			metalness: .04
		}));
		meshRef.current = mesh;
		scene.add(mesh);
		return () => {
			stageRef.current = null;
			meshRef.current = null;
			mesh.geometry.dispose();
			mesh.material.dispose();
			grid.geometry.dispose();
			stage.dispose();
		};
	}, [hasDoc]);
	useEffect(() => {
		const mesh = meshRef.current;
		if (mesh === null || doc === null) return;
		const next = figureGeometry(doc);
		mesh.geometry.dispose();
		mesh.geometry = next;
		autoFitToHeight(mesh);
	}, [doc]);
	useEffect(() => {
		const stage = stageRef.current;
		const camera = stage?.camera;
		if (camera === void 0) return;
		if (typeof framing === "number" && Number.isFinite(framing) && framing > 0) {
			const radius = camera.position.length();
			if (radius > 0) {
				camera.position.multiplyScalar(BASE_CAMERA_RADIUS * framing / radius);
				stage?.controls?.update();
			}
		}
		if (typeof focalLength === "number" && Number.isFinite(focalLength) && focalLength > 0) {
			camera.fov = 2 * Math.atan(12 / focalLength) * 180 / Math.PI;
			camera.updateProjectionMatrix();
		}
	}, [
		framing,
		focalLength,
		hasDoc
	]);
	return createElement("div", {
		className: preview_module_default.stagePreview,
		"data-viewport": label ?? "poser-figure"
	}, failed !== null && doc === null ? createElement("div", {
		className: preview_module_default.empty,
		"data-testid": "figure-failed"
	}, "figure failed: " + failed) : doc === null ? createElement("div", {
		className: preview_module_default.empty,
		"data-testid": "figure-loading"
	}, "loading figure…") : createElement("canvas", {
		ref: canvasRef,
		className: preview_module_default.stageCanvas,
		"data-testid": "stage-preview-figure"
	}), failed !== null && doc !== null ? createElement("div", {
		className: preview_module_default.figureError,
		"data-testid": "figure-failed"
	}, "figure failed: " + failed) : null);
}
//#endregion
//#region src/report-view.tsx
/** report-view.tsx — THE REPORT ATOM (ROADMAP 11e, primitive ①):
* the default face for a result row's machine-readable verdicts.
* A run may write named `reports` (kind 'report' — the contract's
* BenchReport) beside its media; the result row claims ONE default
* atom per entry and THIS is it: the DSH StateDot semantic (pass →
* done, warn → warning, fail → error) + the status word, the title
* (or the entry's own name), the check chips, and the key-value
* rows. The agent loop reads the same object the row renders — the
* machine-readable gate and its human face are ONE shape. */
/** The report status vocabulary → the DSH dot's own states (the
*  semantic set StateDot ships: done/warning/error — no invented
*  colors, no hand-rolled dots). TOTAL over the contract's union —
*  the harvest rejects any other status before it reaches the atom. */
const DOT_OF = {
	pass: "done",
	warn: "warning",
	fail: "error"
};
/** Render one report. Pure: every arm derived from the contract's
*  own optionals (title absent → the name; chips/rows absent → no
*  section). The card claims this by kind in the result row — the
*  base owns the DEFAULT, a studio may claim over it (the
*  claim-over-default law every preview kind rides). */
function ReportView(props) {
	const { name, report } = props;
	const dot = DOT_OF[report.status];
	const chips = report.chips ?? [];
	const rows = Object.entries(report.rows ?? {});
	return createElement("section", {
		className: preview_module_default.reportCard,
		"data-testid": "report-card",
		"aria-label": "run report " + name
	}, createElement("header", { className: preview_module_default.reportHead }, createElement(StateDot, {
		state: dot,
		size: 8
	}), createElement("span", {
		className: preview_module_default.reportStatus,
		"data-report-status": report.status
	}, report.status.toUpperCase()), createElement("span", { className: preview_module_default.reportTitle }, report.title ?? name)), chips.length > 0 ? createElement("div", {
		className: preview_module_default.reportChips,
		"aria-label": "report chips"
	}, chips.map((c) => createElement("span", {
		key: c,
		className: preview_module_default.reportChip
	}, c))) : null, rows.length > 0 ? createElement("dl", {
		className: preview_module_default.reportRows,
		"aria-label": "report rows"
	}, rows.map(([k, v]) => createElement("div", {
		key: k,
		className: preview_module_default.reportRow
	}, createElement("dt", { className: preview_module_default.reportKey }, k), createElement("dd", { className: preview_module_default.reportVal }, String(v))))) : null);
}
//#endregion
//#region src/viewportChrome.module.css
var viewportChrome_module_default = {
	"badge": "bzm3cW_badge",
	"badgeCaption": "bzm3cW_badgeCaption",
	"badgeImg": "bzm3cW_badgeImg",
	"dockBottom": "bzm3cW_dockBottom",
	"dockBottomCenter": "bzm3cW_dockBottomCenter",
	"dockBottomLeft": "bzm3cW_dockBottomLeft",
	"dockBottomRight": "bzm3cW_dockBottomRight",
	"dockEdgeLeft": "bzm3cW_dockEdgeLeft",
	"dockEdgeRight": "bzm3cW_dockEdgeRight",
	"dockFill": "bzm3cW_dockFill",
	"dockTopLeft": "bzm3cW_dockTopLeft",
	"dockTopRight": "bzm3cW_dockTopRight",
	"frame": "bzm3cW_frame"
};
//#endregion
//#region src/viewportChrome.tsx
function ViewportFrame({ children, label, empty, className, style, ...props }) {
	return /* @__PURE__ */ jsxs("div", {
		"data-slot": "viewport-frame",
		"aria-label": label,
		className: cx(viewportChrome_module_default.frame, className),
		style: {
			"--melite-stage-bg": STAGE_BACKGROUND_DARK,
			...style
		},
		...props,
		children: [children, empty]
	});
}
const DOCK_CLASS = {
	"top-right": viewportChrome_module_default.dockTopRight,
	"top-left": viewportChrome_module_default.dockTopLeft,
	"bottom-right": viewportChrome_module_default.dockBottomRight,
	"bottom-left": viewportChrome_module_default.dockBottomLeft,
	"bottom-center": viewportChrome_module_default.dockBottomCenter,
	bottom: viewportChrome_module_default.dockBottom,
	fill: viewportChrome_module_default.dockFill,
	"edge-right": viewportChrome_module_default.dockEdgeRight,
	"edge-left": viewportChrome_module_default.dockEdgeLeft
};
function ViewportAnchor({ dock = "top-right", className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		"data-slot": "viewport-anchor",
		"data-dock": dock,
		className: cx(DOCK_CLASS[dock], className),
		...props
	});
}
function ReferenceImageBadge({ url, label, className, ...props }) {
	if (!url) return null;
	return /* @__PURE__ */ jsxs("figure", {
		"data-slot": "reference-image-badge",
		"data-reference-image": true,
		"aria-label": label,
		className: cx(viewportChrome_module_default.badge, className),
		...props,
		children: [/* @__PURE__ */ jsx("img", {
			src: url,
			alt: label,
			className: viewportChrome_module_default.badgeImg,
			draggable: false
		}), /* @__PURE__ */ jsx("figcaption", {
			className: viewportChrome_module_default.badgeCaption,
			children: label
		})]
	});
}
//#endregion
//#region src/preview.tsx
/**
* preview.tsx — THE SHARED PREVIEW COMPONENTS (the preview seam's
* built-in claims, hour-9 2026-09-13 — the operator's law: "Where
* the VIDEO PREVIEW and the IMAGE PREVIEW of other cards go in a
* SLOT with SHARED DSH PRIMITIVES"). One preview per media kind,
* DSH-pure: native media elements on card-base chrome, DSW tokens
* BARE (no fallbacks — the hour-8 name law), zero bespoke islands.
*
* These are the DEFAULTS the pattern prescribes (the ui-tool law:
* "central default views"); a card claims its kind's preview only
* to specialize — the h3 studio rides the shared VIDEO preview for
* its hero, exactly as an image-gen card rides the IMAGE one.
*/
const pickCells = /* @__PURE__ */ new Map();
const PICK_CELL_CAP = 64;
function pickCellOf(id) {
	let cell = pickCells.get(id);
	if (cell === void 0) {
		if (pickCells.size >= PICK_CELL_CAP) for (const oldest of pickCells.keys()) {
			pickCells.delete(oldest);
			break;
		}
		cell = {
			key: null,
			listeners: /* @__PURE__ */ new Set()
		};
		pickCells.set(id, cell);
	} else {
		pickCells.delete(id);
		pickCells.set(id, cell);
	}
	return cell;
}
function usePickCell(id) {
	const cell = pickCellOf(id);
	const key = useSyncExternalStore((onChange) => {
		cell.listeners.add(onChange);
		return () => {
			cell.listeners.delete(onChange);
		};
	}, () => cell.key);
	const set = (next) => {
		cell.key = next;
		for (const l of cell.listeners) l();
	};
	return [key, set];
}
/** The test seam: cells are module-shared BY DESIGN (identity-stable
*  across mounts); walls reset between cases so no pick bleeds. */
function resetPickCellsForTests() {
	pickCells.clear();
}
/** THE HISTORY HERO (stroke 40 + the output-component stroke): one
* hook, three faces — the hero artifact, the REST of whatever set
* the hero belongs to (the current run's other outputs, or a picked
* history entry's other outputs — a multi-output card shows its
* full set either way, never the current row under an old hero),
* and THE STALENESS FACT (an explicitly picked entry is NOT the
* current generation — the badge law; the between-runs fallback
* hero gets NO badge: with no current run, the newest archive is
* the closest thing to current, not a stale one). */
/** The view-identity cell id (stage + run, else urls) — ONE law,
* exported so a preview's specialized pick cells (the video face's
* current-set pick) derive from the SAME identity, never re-derive. */
function previewCellIdOf(props) {
	return props.runId !== void 0 && props.runId !== "" ? `${props.stageId}\u0000run:${props.runId}` : `${props.stageId}\u0000${props.artifacts.map((a) => a.url).join("|")}`;
}
function useHistoryHero(props, opts) {
	const flat = props.artifacts.length > 0 ? props.artifacts : (props.history ?? []).flat();
	const history = props.history ?? [];
	const keyOf = (entry) => entry.map((a) => a.url).join("|");
	const [pickedKey, setPickedKey] = usePickCell(previewCellIdOf(props));
	const picked = pickedKey === null ? -1 : history.findIndex((e) => keyOf(e) === pickedKey);
	const promote = (i) => {
		const k = keyOf(history[i]);
		setPickedKey(k !== pickedKey ? k : null);
	};
	const returnToCurrent = () => {
		setPickedKey(null);
	};
	const entry = picked >= 0 && history[picked] !== void 0 && history[picked].length > 0 ? history[picked] : null;
	const source = entry ?? flat;
	const currentSet = props.artifacts.length > 0 ? props.artifacts : history[0];
	const viewingHistory = entry !== null && (currentSet === void 0 || keyOf(entry) !== keyOf(currentSet));
	const heroIdx = opts?.heroIndex !== void 0 && source.length > 0 ? Math.min(Math.max(0, opts.heroIndex(source)), source.length - 1) : 0;
	return {
		hero: source[heroIdx],
		rest: [...source.slice(0, heroIdx), ...source.slice(heroIdx + 1)].slice(0, 12),
		viewingHistory,
		note: !viewingHistory ? void 0 : (props.historyNotes ?? [])[picked] || void 0,
		picked: entry !== null ? picked : -1,
		promote,
		returnToCurrent
	};
}
/** THE NOT-CURRENT BADGE (the output-component stroke — the
* operator's law: "a tag or indicator to show they are not
* current"). Rendered while an explicit history pick owns the hero;
* when the entry's params snapshot differs from the live params the
* chip names the keys (shared by every presenter). */
/** THE NOT-CURRENT BADGE (the output-component stroke — the
* operator's law: "a tag or indicator to show they are not
* current") — AND THE RETURN CONTROL (the toggle law, 2026-09-16):
* the badge is the visible way back to the current generation;
* clicking it restores the current hero. */
function StaleBadge(props) {
	return createElement("button", {
		type: "button",
		className: preview_module_default.staleBadge,
		"data-testid": "history-stale-badge",
		onClick: (e) => {
			e.stopPropagation();
			props.onReturn();
		},
		title: "Return to the current generation"
	}, "Not current — earlier generation", props.note === void 0 ? null : ` · differs: ${props.note}`, " · Return to current");
}
/** ONE HISTORY THUMB with an HONEST DEAD FACE (the operator's
*  catch, 2026-09-21: "There's no sideways error"): an archived
*  artifact whose file left the disk rendered the browser's silent
*  broken-image glyph — no error, no name, nothing. The strip is
*  the sideways row; a dead entry shows its NAME and a missing
*  marker, never a silent void.
*  THE KIND FACE (the operator's catches, 2026-10-08): (1) audio
*  history tiles read 'gone' — an <img> decodes ONLY images, so a
*  non-image url seated in an <img> fires onError on mount and
*  every audio/video/mesh tile wore the FALSE dead face ("it says
*  gone instead historical view under the preview"). (2) the first
*  cut put the artifact NAME in the chip — "a long rectangle with
*  a file name" (music/SaveAudioAdvanced.0_music_00002.mp3)
*  instead of something compact. THE FACE: the thumb rides the
*  owner's DECLARED kind (the primary-output law — the same kind
*  that picked this presenter): image decodes as itself (the dead
*  face stays its honesty); every other kind renders a COMPACT
*  48×48 glyph square — the image thumb row's own rhythm — with
*  the full artifact name on the TILE BUTTON's tooltip, never in
*  the face. No decode to fail, no false 'gone', no long box. */
function HistoryThumb(props) {
	const [dead, setDead] = useState(false);
	if (props.kind !== "image") {
		const Glyph = props.kind === "audio" ? AudioLines : props.kind === "video" ? Film : Box;
		return createElement(Glyph, {
			className: preview_module_default.thumbFace,
			"data-testid": `history-thumb-${props.kind}`
		});
	}
	if (dead) return createElement("span", {
		className: cn(preview_module_default.thumb, preview_module_default.thumbDead),
		"data-testid": "history-thumb-missing",
		title: `${props.a.name} — the artifact file is gone`
	}, "gone");
	return createElement("img", {
		key: props.a.url,
		className: preview_module_default.thumb,
		src: props.a.url,
		alt: props.a.name,
		loading: "lazy",
		onError: () => {
			setDead(true);
		}
	});
}
function HistoryStrip(props, promote, testid, picked) {
	if (props.historyStrip === false) return null;
	const history = props.history ?? [];
	if (history.length === 0) return null;
	const notes = props.historyNotes ?? [];
	return createElement("div", {
		className: preview_module_default.historyBlock,
		"data-testid": testid
	}, createElement("span", { className: preview_module_default.historyTitle }, "History"), createElement("div", { className: preview_module_default.thumbRow }, history.map((entry, i) => createElement("button", {
		key: String(i) + "|" + String(entry[0]?.url ?? ""),
		type: "button",
		className: cn(preview_module_default.historyTile, i === picked ? preview_module_default.historyTileActive : void 0),
		"aria-pressed": i === picked,
		title: entry.map((a) => a.name).join(", ") + (notes[i] ? ` (differs: ${notes[i]})` : "") + (i === picked ? " (viewing — click to return to current)" : ""),
		onClick: (e) => {
			e.stopPropagation();
			promote(i);
		}
	}, entry.slice(0, 1).map((a, j) => createElement(HistoryThumb, {
		key: String(i) + "|" + String(j) + "|" + a.url,
		a,
		kind: props.kind
	}))))));
}
/** THE SEAT-SAFE NEW-TAB LINK (the seat-bubble law, ledger #45):
*  rest links ride INSIDE the walk-opening drilldown seat — the
*  link consumes its own click so opening the tab never also opens
*  the walk (the thumb/badge fix's sibling; one wrapper, both
*  presenters — the platform owns the link, we own the wrap). */
function seatSafeLink(a, i = 0) {
	return createElement("a", {
		key: String(i) + "|" + a.url + a.name,
		className: preview_module_default.stripLink,
		href: a.url,
		target: "_blank",
		rel: "noreferrer",
		title: a.name,
		onClick: (e) => {
			e.stopPropagation();
		}
	}, a.name);
}
/** THE VIDEO PREVIEW — one hero film, one native player (the kit's
*  FilmPlayer law: native <video controls>; no library, no kit). The
*  hero is THE FILM (the composed artifact — a film run's artifacts
*  arrive windows-first, the film last, so the named film wins the
*  seat; any other video card keeps the first). The set's other
*  clips render as PLAYABLE THUMBS in the strip (the operator's
*  catch b, 2026-09-22: "the preview only shows one of the three
*  clips" — a text link is not a preview): click a thumb to promote
*  it into the hero, click it again to return (the toggle law);
*  the name still opens the file raw in a new tab. The set is the
*  CURRENT run's (or the picked history entry's — never mixed).
*  Honest empty state while no artifact has landed. */
function VideoStagePreview(props) {
	const { hero: defaultHero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props, { heroIndex: (src) => {
		const i = src.findIndex((a) => /(^|[^a-z])film([^a-z]|$)/i.test(a.name));
		return i >= 0 ? i : 0;
	} });
	const [faceUrl, setFaceUrl] = usePickCell(`${previewCellIdOf(props)}\u0000face`);
	const hero = (faceUrl !== null && defaultHero !== void 0 && (defaultHero.url === faceUrl || rest.some((a) => a.url === faceUrl)) ? defaultHero.url === faceUrl ? defaultHero : rest.find((a) => a.url === faceUrl) : void 0) ?? defaultHero;
	const others = defaultHero !== void 0 ? [defaultHero, ...rest] : [];
	return createElement("div", {
		className: preview_module_default.stagePreview,
		"data-testid": "stage-preview-video"
	}, viewingHistory ? createElement(StaleBadge, {
		note,
		onReturn: returnToCurrent
	}) : null, hero === void 0 ? createElement("div", { className: preview_module_default.empty }, props.runStatus === "running" ? "rendering… the film lands here" : "No render yet — run lands the film here") : createElement("video", {
		className: preview_module_default.hero,
		controls: true,
		playsInline: true,
		key: hero.url,
		src: hero.url,
		"data-testid": "stage-preview-video-hero"
	}), others.length > 0 ? createElement("div", {
		className: preview_module_default.strip,
		"data-testid": "stage-preview-video-strip"
	}, others.map((a) => createElement("button", {
		key: a.url,
		type: "button",
		className: cn(preview_module_default.thumbVideoBtn, a.url === faceUrl ? preview_module_default.thumbVideoActive : void 0),
		"aria-pressed": a.url === faceUrl,
		title: a.name + (a.url === faceUrl ? " (viewing — click to return to the film)" : " — click to preview"),
		onClick: (e) => {
			e.stopPropagation();
			setFaceUrl(a.url !== faceUrl ? a.url : null);
		}
	}, createElement("video", {
		className: preview_module_default.thumbVideo,
		src: a.url,
		muted: true,
		playsInline: true,
		preload: "metadata"
	}), createElement("span", { className: preview_module_default.thumbVideoName }, a.name)))) : null, HistoryStrip(props, promote, "stage-output-history", picked));
}
/** THE IMAGE PREVIEW — the latest render hero (native <img>), the
*  active set's thumbs beneath (the CURRENT run's gallery, or the
*  picked history entry's full set — a multi-output card never shows
*  the current row under an old hero), then THE OUTPUT HISTORY
*  (stroke 40): the stage's previous unique outputs, newest first —
*  click one to view it in the hero. Same chrome, same law. */
function ImageStagePreview(props) {
	const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
	const [loadedUrl, setLoadedUrl] = useState(null);
	const heroUrl = hero === void 0 ? null : hero.url;
	const seatUrl = loadedUrl ?? heroUrl;
	const incoming = heroUrl !== null && seatUrl !== heroUrl ? heroUrl : null;
	return createElement("div", {
		className: cn(preview_module_default.stagePreview),
		"data-testid": "stage-preview-image"
	}, viewingHistory ? createElement(StaleBadge, {
		note,
		onReturn: returnToCurrent
	}) : null, seatUrl !== null ? createElement("img", {
		className: preview_module_default.heroImg,
		key: seatUrl,
		src: seatUrl,
		alt: hero === void 0 ? "" : hero.name,
		"data-testid": "stage-preview-image-hero",
		onLoad: () => {
			setLoadedUrl(seatUrl);
		}
	}) : createElement("div", { className: preview_module_default.empty }, props.runStatus === "running" ? "rendering… the image lands here" : "No render yet — run lands the image here"), incoming !== null ? createElement("img", {
		key: "incoming-" + incoming,
		className: preview_module_default.heroIncoming,
		src: incoming,
		alt: "",
		"data-testid": "stage-preview-image-hero",
		onLoad: () => {
			setLoadedUrl(incoming);
		}
	}) : null, rest.length > 0 ? createElement("div", { className: preview_module_default.thumbRow }, rest.map((a, i) => createElement("img", {
		key: String(i) + "|" + a.url,
		className: preview_module_default.thumb,
		src: a.url,
		alt: a.name,
		loading: "lazy"
	}))) : null, HistoryStrip(props, promote, "stage-output-history", picked));
}
/** THE AUDIO PREVIEW — one hero track, one native player (the same
*  law as the video preview: native <audio controls>; no library).
*  The active set's named clips follow in the strip row. */
function AudioStagePreview(props) {
	const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
	return createElement("div", {
		className: preview_module_default.stagePreview,
		"data-testid": "stage-preview-audio"
	}, viewingHistory ? createElement(StaleBadge, {
		note,
		onReturn: returnToCurrent
	}) : null, hero === void 0 ? createElement("div", { className: preview_module_default.empty }, props.runStatus === "running" ? "rendering… the track lands here" : "No render yet — run lands the track here") : createElement("audio", {
		className: preview_module_default.heroAudio,
		controls: true,
		key: hero.url,
		src: hero.url,
		"data-testid": "stage-preview-audio-hero"
	}), rest.length > 0 ? createElement("div", { className: preview_module_default.strip }, rest.map(seatSafeLink)) : null, HistoryStrip(props, promote, "stage-output-history", picked));
}
/** THE MESH PREVIEW — the seam's adapter onto the raw-three
*  multi-asset stage (GlbStagePreview, the substrate law: NO
*  @react-three in any client bundle). The ACTIVE set becomes
*  stage assets (the current run's, or a picked history entry's —
*  mesh gains the full history law every other kind already had);
*  the empty hint honors the live-run flag. THE LIVE FIGURE
*  (stroke 90): a card-declared preview.figure replaces the empty
*  tombstone with the native figure (the /poser bind mesh) — the
*  studio-viewport capability on the form card; run outputs still
*  take the stage the moment they exist. */
function MeshStagePreview(props) {
	const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
	const active = hero === void 0 ? [] : [hero, ...rest];
	return createElement("div", {
		className: preview_module_default.stagePreview,
		"data-testid": "stage-preview-mesh"
	}, viewingHistory ? createElement(StaleBadge, {
		note,
		onReturn: returnToCurrent
	}) : null, active.length > 0 ? createElement(GlbStagePreview, {
		assets: active.map((a, i) => ({
			id: `${props.stageId}:${a.name || i}`,
			url: a.url,
			name: a.name
		})),
		emptyHint: props.runStatus === "running" ? "rendering… the mesh lands here" : "No render yet — run lands the mesh here"
	}) : props.figure !== void 0 ? createElement(PoserFigureStage, {
		identityModel: props.figure.identityModel,
		identityCoeffs: props.figure.identityCoeffs,
		localChanges: props.figure.localChanges,
		framing: props.figure.framing,
		focalLength: props.figure.focalLength,
		label: `poser-figure:${props.stageId}`
	}) : createElement(GlbStagePreview, {
		assets: [],
		emptyHint: props.runStatus === "running" ? "rendering… the mesh lands here" : "No render yet — run lands the mesh here"
	}), HistoryStrip(props, promote, "stage-output-history", picked));
}
//#endregion
//#region src/media-library.ts
/**
* media-library.ts — the runs-tree library over the mounted media
* namespace (stroke 81b: moved beside the bind it rides).
*
* The picker's injected source (SquareWire.loadMedia): kind-filtered
* media/list rows, shaped to {url, name}. Every surface — the bench
* drill, the mod leaf, the studio SourceRows — injects THIS function
* (or a test fake); the base form carries no transport of its own.
*/
/** media/list — the runs-tree library (the picker's injected
*  source; kind-filtered). */
async function fetchMediaLibrary(kind, signal) {
	const v = await unwrapRemote(estateRemote().media.list(kind, signal), "media/list");
	return Array.isArray(v.items) ? v.items.filter((it) => typeof it?.url === "string" && typeof it?.name === "string") : [];
}
//#endregion
export { ASSET_DRAG_MIME, AlertTriangle, AudioLines, AudioStagePreview, Box, Brush, CARD_SLOTS, Camera, CardForm, Check, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, ControlRow, Copy, Crop, DEFAULT_SQUARE_ACCEPT, DeclarativeStudio, Dices, Download, EmptyState, EstateRefusedError, Expand, Eye, EyeAlt, EyeOff, FileBox, Film, Focus, Frame, GlbStagePreview, Hand, Image, ImagePlus, ImageStagePreview, Info, InputSquare, Layers, Link2, Loader2, MESH_SQUARE_ACCEPT, Maximize, MeshStagePreview, Minimize2, ModelAxes, ModifiersSection, Move, OverlayKnob, PackPrompt, Palette, PaneHeader, PaneShell, Pause, PersonStanding, Play, PlayAlt, Plus, PoserFigureStage, RailSection, RecipePills, ReferenceImageBadge, RefreshCw, ReportView, RotateCcw, RotateCw, STAGE_BACKGROUND_DARK, STAGE_BACKGROUND_LIGHT, SectionLabel, SeedDice, Skeleton, SourceRow, SpecAtom, SpecFieldRow, SpecPanel, SpecSliderAtom, Square, StudioRail, StudioShell, StudioShellErrorLine, TURNTABLE_SPEED, Target, Tip, ToastViewport, TriStateAtom, TriangleAlert, Type, Upload, User, VideoStagePreview, ViewportAnchor, ViewportFrame, Volume2, VolumeX, WirePickerModal, X, activeRecipeId, activeRowId, activeVariantId, applyWeightsHeat, applyWireframe, armEstateRemoteLazyBind, autoFitToHeight, axisGroups, axisKey, axisPickPatch, axisStampOf, axisUnset, bindEstateRemote, bindEstateRemoteFromRemote, cn, coerceFieldEdit, composeCandidateDoc, composeUnset, composeValidate, composingRows, cx, defineShellDeclaration, defineStageViewRegistration, defineStudioDeclaration, entryFieldsOfEnvelope, estateRemote, fetchCardCatalog, fetchFormSpec, fetchFormsTable, fetchLatestRunForDraft, fetchListRow, fetchMediaLibrary, fetchRunStageUrl, fetchRunStatus, fetchRunTerminal, fieldOnLane, fieldVisible, fieldsOf, fieldsOfEnvelope, figureCameraOf, figureCoeffsOf, figureGeometry, figureLocalChangesOf, figureShapeSig, getSnapshot, groupFields, heatColor, inputEdgeOf, isEstateRefusal, isHybridKind, isImageUrl, isMeshUrl, isOptionKind, kindScalarFieldsOfEnvelope, laneBoundsFor, laneRelationsFor, laneSurfaceFor, laneViolations, makeLabelSprite, modOwnedFields, modelChoices, modelSwitchPatch, mountStage3D, optionKeyOf, parseAssetDrop, parseNumericInput, pollRunStageUrl, postManageAction, previewCellIdOf, probeRunGone, quantRowsFor, readAsDataURL, readAsDataURL as readAsDataUrl, removeToast, resetPickCellsForTests, resolveFamilyKey, resolveValue, resolveValueLayered, rowsFor, scalarKeyOf, schemaEnvelope, seedAxisValues, seedUser, skeletonHelperFor, slotLabelOf, specDefaults, startCardRun, startFlowInlineRun, stopRun, subscribe, titleCaseId, toastHoldMs, turntableTick, unbindEstateRemote, unsetFaceLabel, unsetFaceTip, unwrapRemote, uploadInputFile, useFormSpec, useResolvedForm, useSquareProvider, useToastStore, variantGroupsContract, variantRows };
