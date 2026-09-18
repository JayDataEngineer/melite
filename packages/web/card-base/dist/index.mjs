import { Button, IconPlusOutline16, Input, Menu, Modal, Switch, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives";
import { clsx } from "clsx";
import { jsx, jsxs } from "react/jsx-runtime";
import { Fragment, createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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
* declaration IS the UI contract — the py Field.emit law); this
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
* meta.description (the py emitter's label law) — the declared
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
		const extra = typeof meta["extra"] === "object" && meta["extra"] !== null && !Array.isArray(meta["extra"]) ? meta["extra"] : {};
		const families = Array.isArray(extra["families"]) ? extra["families"] : null;
		if (families !== null && family !== void 0 && !families.includes(family)) continue;
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
		if (Array.isArray(extra["options"])) options = extra["options"].map((o) => typeof o === "string" ? o : typeof o === "object" && o !== null && "value" in o && "label" in o ? {
			value: String(o["value"]),
			label: String(o["label"])
		} : String(o));
		const hint = typeof extra["wtype"] === "string" ? extra["wtype"] : "";
		let type;
		if (hint !== "") type = hint;
		else if (options !== void 0 && node.type === "union") type = "select";
		else if (node.type === "number") type = String(meta["step"] ?? "") === "1" ? "seed" : "slider";
		else if (node.type === "string") type = "text";
		else if (node.type === "boolean") type = "boolean";
		else if (node.type === "array") type = "loras";
		else type = node.type ?? "string";
		const num = (k) => typeof meta[k] === "number" ? meta[k] : void 0;
		const str = (k) => typeof extra[k] === "string" ? extra[k] : typeof meta[k] === "string" ? meta[k] : void 0;
		out.push({
			name,
			label: typeof meta["description"] === "string" && meta["description"] !== "" ? meta["description"] : name,
			order: typeof extra["order"] === "number" ? extra["order"] : void 0,
			type,
			default: meta["default"] === void 0 ? void 0 : meta["default"],
			min: num("min"),
			max: num("max"),
			step: type === "seed" ? void 0 : num("step"),
			options,
			group: str("group") ?? "",
			zone: str("zone"),
			required: extra["required"] === true || meta["required"] === true,
			placeholder: str("placeholder"),
			tooltip: str("tooltip"),
			visible_when: str("visible_when"),
			columns: typeof extra["columns"] === "number" ? extra["columns"] : void 0,
			width: typeof extra["width"] === "number" ? extra["width"] : void 0
		});
	}
	return out.map((f, i) => [f, i]).sort((a, b) => (a[0].order ?? 0) - (b[0].order ?? 0) || a[1] - b[1]).map((x) => x[0]);
}
/** THE EDIT COERCION (the one specPatch duty that survives, moved
* to the edit boundary): atoms emit raw strings while typing; a
* numeric field's edit rides the user layer as a NUMBER. An
* unparseable/empty numeric string rides VERBATIM (the run's schema
* parse refuses loud, naming the field — never a silent 0). `v ===
* undefined` stays undefined (the tri-state's inherit — the caller's
* unset signal). PURE. */
function coerceFieldEdit(f, v) {
	if (v === void 0) return void 0;
	if (f !== void 0 && (f.type === "number" || f.type === "seed" || f.type === "slider") && typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
	return v;
}
/** The card's own derived fields (the schema envelope walked,
* families-scoped to the served family). Memoize at the caller for
* hot loops — the walk is pure. */
function fieldsOf(spec) {
	return fieldsOfEnvelope(spec.schema, typeof spec.model === "string" ? spec.model : void 0);
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
* base = the registry-less lane derive (the wall pins parity on
* the golden families). PURE. */
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
	Object.assign(out, user);
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
		const eq = guard.indexOf("=");
		if (eq < 0) continue;
		const key = guard.slice(0, eq);
		if (!guard.slice(eq + 1).split("|").includes(String(values[key] ?? ""))) return false;
	}
	return true;
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
	if (groups.includes(row.group)) patch[axisKey(row.group)] = row.id;
	if (at < 0) return patch;
	for (const g of groups.slice(at + 1)) {
		const composing = composingRows(spec, g, active);
		if (composing.length > 0) patch[axisKey(g)] = composing[0].id;
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
		out[axisKey(g)] = active[g];
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
//#endregion
//#region src/chrome.ts
/**
* Card chrome primitives — the ONE joiner + the ONE file reader
* (founded 2026-09-12, debt extermination: anny/ideo cx, motion/h3
* clsx-cn, and the four identical readAsDataURL copies collapsed
* here). DOM-free, no CSS, no atoms — safe for node and browser.
*
* Per-seam subpath: `@melite/card-base/chrome`.
*/
/** The merging joiner (clsx — objects/arrays/conditionals). */
function cn(...inputs) {
	return clsx(...inputs);
}
//#endregion
//#region src/card.module.css
var card_module_default = {
	"ctlRow": "VMoOIq_ctlRow",
	"ctlRowSm": "VMoOIq_ctlRowSm",
	"emptyHint": "VMoOIq_emptyHint",
	"emptyOverlay": "VMoOIq_emptyOverlay",
	"emptyPane": "VMoOIq_emptyPane",
	"emptyTitle": "VMoOIq_emptyTitle",
	"groupTab": "VMoOIq_groupTab",
	"groupTabActive": "VMoOIq_groupTabActive",
	"groupTabs": "VMoOIq_groupTabs",
	"inputRail": "VMoOIq_inputRail",
	"modAddSquare": "VMoOIq_modAddSquare",
	"modelAxes": "VMoOIq_modelAxes",
	"modField": "VMoOIq_modField",
	"modHead": "VMoOIq_modHead",
	"modHint": "VMoOIq_modHint",
	"modLeaf": "VMoOIq_modLeaf",
	"modLeafActions": "VMoOIq_modLeafActions",
	"modLeafError": "VMoOIq_modLeafError",
	"modLeafFields": "VMoOIq_modLeafFields",
	"modRow": "VMoOIq_modRow",
	"modSection": "VMoOIq_modSection",
	"modSelect": "VMoOIq_modSelect",
	"modTile": "VMoOIq_modTile",
	"modTileLabel": "VMoOIq_modTileLabel",
	"modTileRecipe": "VMoOIq_modTileRecipe",
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
	"specTextarea": "VMoOIq_specTextarea",
	"squareBox": "VMoOIq_squareBox",
	"squareFileInput": "VMoOIq_squareFileInput",
	"squareGlyph": "VMoOIq_squareGlyph",
	"squareLabel": "VMoOIq_squareLabel",
	"squareMetric": "VMoOIq_squareMetric",
	"squareOff": "VMoOIq_squareOff",
	"squareOver": "VMoOIq_squareOver",
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
function Tip({ tip, children }) {
	if (tip === void 0) return children;
	return /* @__PURE__ */ jsx(Tooltip, {
		label: tip,
		side: "top",
		delayMs: 300,
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
/** The media-bar drag contract (the tab's drop surface serves the
* same MIME — ONE spelling, imported from the base's law). */
const ASSET_DRAG_MIME = "application/tech-noir-asset";
/** THE "is this a thumbnail" rule (SlotSquare's, kept verbatim):
*  data: images, blob: fresh-upload mirrors, and http(s)/root-relative
*  artifact URLs. Every slot-shaped value renders the same way. */
function isImageUrl(value) {
	return /^data:image\//i.test(value) || /^blob:/i.test(value) || /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value);
}
/** Read a File/Blob and resolve its data: URL — the ONE read path for
*  every slot-shaped attach (the old law, single definition). */
function readAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => {
			resolve(String(r.result));
		};
		r.onerror = () => {
			reject(r.error ?? /* @__PURE__ */ new Error("read failed"));
		};
		r.readAsDataURL(file);
	});
}
/** Parse the asset MIME off a drop event. null = absent or malformed. */
function assetPayload(e) {
	const raw = e.dataTransfer.getData(ASSET_DRAG_MIME);
	if (raw === "") return null;
	try {
		const p = JSON.parse(raw);
		return typeof p["url"] === "string" ? p["url"] : null;
	} catch {
		return null;
	}
}
function InputSquare(props) {
	const { label, value, metric, disabled } = props;
	const fileRef = useRef(null);
	const boxRef = useRef(null);
	const [over, setOver] = useState(false);
	const thumb = typeof value === "string" && isImageUrl(value) ? value : null;
	const empty = thumb === null;
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
		"aria-label": (label || "source") + (label ? " source" : ""),
		onClick: pick,
		onKeyDown: (e) => {
			if (e.key === "Enter") pick();
		},
		onDragOver: (e) => {
			if (disabled) return;
			e.preventDefault();
			setOver(true);
		},
		onDragLeave: () => {
			setOver(false);
		},
		onDrop: (e) => {
			if (disabled) return;
			e.preventDefault();
			setOver(false);
			const asset = assetPayload(e);
			if (asset !== null && props.onAsset !== void 0) {
				props.onAsset(asset);
				return;
			}
			const f = e.dataTransfer.files[0];
			if (f !== void 0 && props.onFile !== void 0) props.onFile(f);
		}
	}, thumb !== null ? createElement("img", {
		className: card_module_default.squareThumb,
		src: thumb,
		alt: label
	}) : createElement(IconPlusOutline16, { className: card_module_default.squareGlyph }), !empty && props.onClear !== void 0 ? createElement("button", {
		className: card_module_default.squareX,
		type: "button",
		title: "Detach",
		"aria-label": "Detach " + (label || "source"),
		onClick: (e) => {
			e.stopPropagation();
			props.onClear();
		}
	}, "✕") : null), label !== "" ? createElement("span", { className: card_module_default.squareLabel }, label) : null, metric !== void 0 ? createElement("span", { className: card_module_default.squareMetric }, metric) : null, props.onFile !== void 0 && !disabled ? createElement("input", {
		ref: fileRef,
		type: "file",
		accept: "image/png,image/jpeg,image/webp",
		className: card_module_default.squareFileInput,
		"aria-hidden": true,
		tabIndex: -1,
		onChange: (e) => {
			const f = e.target.files?.[0];
			if (f !== void 0 && f !== null) props.onFile?.(f);
			fileRef.current.value = "";
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
/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL) → the
*  input-dir path the param accepts. The door's own gates (type
*  whitelist, one clean segment) are the law — the client only
*  voices its refusals, never invents its own. */
async function uploadInputFile(file) {
	const isImage = file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
	const isAudio = file.type.startsWith("audio/");
	if (!isImage && !isAudio) throw new Error("Input cards don’t accept " + (file.type !== "" ? file.type : "that file") + " — drop an image or audio file");
	if (isAudio) throw new Error("audio uploads have no door yet — the uploads door boards png / jpeg / webp only");
	const dataUrl = await new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => {
			resolve(String(r.result));
		};
		r.onerror = () => {
			reject(/* @__PURE__ */ new Error("could not read the dropped file"));
		};
		r.readAsDataURL(file);
	});
	const res = await fetch("/v1/uploads", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			filename: file.name.replace(/[^A-Za-z0-9._-]/g, "_"),
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
*  image; file fields take the whole library (their accept narrows
*  client-side per row). */
function mediaKindForField(f) {
	return f.type === "image" ? "image" : "all";
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
	const fileRef = useRef(null);
	const onFile = useCallback(async (f, file) => {
		if (wire.onFile !== void 0) {
			wire.onFile(file);
			return;
		}
		try {
			const dataUrl = await readAsDataUrl(file);
			setMirror((m) => ({
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
		if (f.type !== "image" && f.type !== "file") return void 0;
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
				fileRef.current?.click();
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
		}).catch(() => {
			setMediaRows([]);
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
		}, candidates.length === 0 ? createElement("p", { className: card_module_default.pickEmpty }, modalAt.mode === "media" && mediaRows === null ? "loading…" : "nothing to pick yet") : createElement("ul", { className: card_module_default.pickList }, candidates.map((c) => createElement("li", {
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
		accept: wire.accept ?? "image/png,image/jpeg,image/webp",
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
		wireMenu: createElement(Fragment, null, sourceMenu, pickerModal, fileInput)
	};
}
//#endregion
//#region src/atoms.tsx
/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
* operator's DRY audit law: one seam, one small file, one wall). */
function SourceRow(props) {
	const field = {
		name: "__source_row__",
		label: props.label,
		type: props.kind === "image" ? "image" : "file"
	};
	const { square, wireMenu } = useSquareProvider(useCallback((name, v) => {
		props.onEdit(v);
	}, [props.onEdit]), {
		candidates: props.candidates ?? [],
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
		value: shown !== null && isImageUrl(shown) ? shown : null,
		metric: typeof props.value === "string" && props.value !== "" && !isImageUrl(props.value) ? props.value : void 0,
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
	if ((f.type === "image" || f.type === "file") && square !== void 0) {
		const shown = square.display !== void 0 && square.display !== null && square.display !== "" ? square.display : typeof value === "string" ? value : null;
		return createElement(InputSquare, {
			label: f.label !== "" ? f.label : f.name,
			value: shown !== null && isImageUrl(shown) ? shown : null,
			metric: typeof value === "string" && value !== "" && !isImageUrl(value) ? value : void 0,
			...square.verbs
		});
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
		const fit = (el) => {
			if (el === null) return;
			el.style.height = "auto";
			el.style.height = Math.max(el.scrollHeight, 44) + "px";
		};
		return createElement("textarea", {
			className: card_module_default.specTextarea,
			rows: 2,
			value: String(value ?? ""),
			placeholder: f.placeholder ?? "",
			ref: fit,
			onChange: (e) => {
				const el = e.target;
				fit(el);
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
function ModelAxes({ spec, value, onSet, onDownloadModel }) {
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
		const patch = axisPickPatch(spec, row);
		for (const [k, v] of Object.entries(patch)) onSet(k, v);
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
		if (heldId !== void 0 && rows.some((r) => r.id === heldId)) active[g] = heldId;
		else if (heldId !== void 0) active[g] = heldId;
		else active[g] = activeRowId(spec, value, g, active) ?? (rows.length > 0 ? rows[0].id : "");
	}
	return createElement("section", {
		className: `${card_module_default.specGroup} ${card_module_default.modelAxes}`,
		"data-model-axes": "1"
	}, createElement("h4", { className: card_module_default.specGroupTitle }, "Model"), createElement("label", { className: card_module_default.specField }, createElement("span", { className: card_module_default.specFieldKey }, "Model"), createElement("select", {
		className: card_module_default.specSelect,
		"aria-label": "Model",
		...refusedModel !== void 0 ? { "data-refused": "model" } : {},
		value: shownModel,
		onChange: (e) => {
			const m = e.target.value;
			const patch = modelSwitchPatch(spec, m);
			for (const [k, v] of Object.entries(patch)) onSet(k, v);
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
	}, familyFace.get(m) ?? titleCaseId(m)))), heldFam !== void 0 && onDownloadModel !== void 0 ? createElement("div", {
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
	}, dlState === "idle" ? "Download " + (heldFam.label ?? titleCaseId(heldFam.id)) : dlState === "busy" ? "Requesting…" : dlState === "queued" ? "Download queued ✓ (run when it lands)" : "Download request failed — retry from the assets tab")) : null), groups.map((g) => {
		const rows = rowsOf(g, active);
		const heldRaw = value[axisKey(g)];
		const heldId = typeof heldRaw === "string" && heldRaw !== "" ? heldRaw : void 0;
		const refusedId = heldId !== void 0 && !rows.some((r) => r.id === heldId) ? heldId : void 0;
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
	}), createElement(RecipePills, {
		spec,
		onSet,
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
function RecipePills({ spec, onSet, values }) {
	const pillRows = rowsFor(spec, "Recipe").filter((r) => Object.keys(axisPickPatch(spec, r)).length > 0);
	if (pillRows.length === 0) return null;
	const active = values !== void 0 ? activeRecipeId(spec, values) : void 0;
	const pick = (id) => {
		const row = pillRows.find((r) => r.id === id);
		if (row === void 0) return;
		for (const [k, v] of Object.entries(axisPickPatch(spec, row))) onSet(k, v);
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
*  are hardcoding"): an emitted image/file input constructs THE ONE
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
	return createElement("div", { className: card_module_default.specForm }, sections.map((sec) => createElement("div", {
		className: card_module_default.specGroup,
		key: sec.title,
		...sec.testid !== void 0 ? { "data-testid": sec.testid } : {}
	}, createElement("div", { className: card_module_default.specGroupTitle }, sec.title), sec.rows.map((row) => {
		const f = byName.get(row.name);
		if (f === void 0) return null;
		if (!fieldVisible(f, values)) return null;
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
* image/file field gets THE ONE square (square.tsx) with the
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
function CardForm({ spec, user, base, onSet, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference }) {
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
	const family = typeof spec.model === "string" ? spec.model : void 0;
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
		const f = flatFields.find((x) => x.name === inp.name) ?? modFieldByName.get(inp.name);
		if (f === void 0) return void 0;
		if (f.type === "image" || f.type === "file") return f;
	};
	const railFields = signature.map((inp) => typeof inp?.name === "string" ? railOf(inp) : void 0).filter((f) => f !== void 0);
	const railNames = new Set(railFields.map((f) => f.name));
	const visible = (f) => f.type !== "image_list" && !railNames.has(f.name);
	const groups = groupFields(flatFields.filter(visible), value);
	const submenu = groups.length > 1;
	const [openGroup, setOpenGroup] = useState(void 0);
	const activeGroup = submenu ? groups.find((g) => g.group === openGroup) ?? groups[0] : void 0;
	const shownGroups = submenu && activeGroup !== void 0 ? [activeGroup] : groups;
	const atomOf = (f) => atoms?.[f.type];
	const own = useSquareProvider(edit, wire ?? { candidates: [] });
	const squareFor = square ?? own.square;
	return createElement("div", { className: card_module_default.specForm }, createElement(PackPrompt, {
		spec,
		onInstallPack
	}), createElement(ModelAxes, {
		spec,
		value,
		onSet: edit,
		onDownloadModel
	}), railFields.length > 0 ? createElement("section", {
		className: card_module_default.specGroup + " " + card_module_default.inputRail,
		"data-input-rail": "1"
	}, createElement("div", { className: card_module_default.specSlotRow }, railFields.map((f) => {
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
	}))) : null, submenu && activeGroup !== void 0 ? createElement("div", {
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
		const gridCols = g.fields.find((f) => typeof f.columns === "number" && f.columns >= 2)?.columns;
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
				...gridCols !== void 0 ? { style: {
					gridColumn: "1 / -1",
					minWidth: "0"
				} } : {}
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
				children.push(gridCols === void 0 ? cell : createElement("div", {
					key: f.name + "-cell",
					style: cellStyle(f)
				}, cell));
				continue;
			}
			if (f.type === "image" || f.type === "file") {
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
			children.push(gridCols === void 0 ? cell : createElement("div", {
				key: f.name + "-cell",
				style: cellStyle(f)
			}, cell));
		}
		flush();
		return createElement("section", {
			key: g.group ?? "",
			className: card_module_default.specGroup,
			"data-form-group-panel": g.group ?? "general"
		}, g.group !== null && !submenu ? createElement("h4", { className: card_module_default.specGroupTitle }, titleCaseId(g.group)) : null, gridCols === void 0 ? children : createElement("div", {
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
			const strength = typeof entry["strength"] === "number" ? entry["strength"] : void 0;
			setDraftStrength(strength !== void 0 ? String(strength) : "");
			setDraftSteps(typeof entry["steps"] === "number" ? String(entry["steps"]) : "");
		} else {
			const params = {};
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
				const strength = Number(draftStrength);
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
					const row = (k.options ?? []).find((o) => o.value === entry.id);
					const min = row?.defaults?.steps_min;
					const max = row?.defaults?.steps_max;
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
		"data-subcard-grid": "on"
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
			return createElement(ModTile, {
				key: k.param_key + "-" + i,
				tileId: k.param_key + "-" + i,
				label: option !== null ? option.label : id !== "" ? titleCaseId(id) : isOptionKind(k) ? k.label + " " + String(i + 1) : k.label,
				...strength !== void 0 ? { strength } : {},
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
	}, createElement(IconPlusOutline16, { className: card_module_default.squareGlyph })) : null), pickAt !== null ? createElement(Menu, {
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
		closeLabel: "Close"
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
	const leafFields = (k.fields ?? []).filter((f) => !(hidden?.has(f.name) ?? false));
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
	})), (k.fields ?? []).filter((f) => f.name !== optionKeyOf(k) && f.name !== scalarKeyOf(k) && !(hidden?.has(f.name) ?? false)).map((f) => createElement("label", {
		key: f.name,
		className: card_module_default.modField
	}, createElement("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name), createElement(SpecAtom, {
		f,
		value: onDraft.draftParams[f.name] ?? f.default,
		onEdit: (name, v) => {
			onDraft.setDraftParams({
				...onDraft.draftParams,
				[name]: v
			});
		},
		square: own.square(f)
	}))), own.wireMenu) : isOptionKind(k) ? createElement("div", { className: card_module_default.modLeafFields }, leaf.mode === "create" ? createElement("label", { className: card_module_default.modField }, k.label, createElement("select", {
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
	})() : null) : createElement("div", { className: card_module_default.modLeafFields }, leafFields.map((f) => createElement("div", { key: f.name }, createElement("label", { className: card_module_default.modField }, f.label ?? f.name, createElement(SpecAtom, {
		f,
		value: onDraft.draftParams[f.name],
		onEdit: (name, v) => {
			onDraft.setDraftParams({
				...onDraft.draftParams,
				[name]: v
			});
		},
		square: own.square(f)
	})), props.paintFace !== void 0 && k.leaf_face === "paint-canvas" && (f.type === "image" || f.wtype === "image") ? createElement(PaintVerb, {
		Face: props.paintFace,
		referenceUrl: props.paintReferenceValue,
		payloadUrl: typeof onDraft.draftParams[f.name] === "string" ? onDraft.draftParams[f.name] : "",
		onSaved: (dataUrl) => {
			onDraft.setDraftParams({
				...onDraft.draftParams,
				[f.name]: dataUrl
			});
		}
	}) : null)), props.bboxFace !== void 0 && k.leaf_face === "bbox-canvas" ? createElement(BboxVerb, {
		Face: props.bboxFace,
		referenceUrl: props.paintReferenceValue,
		draft: onDraft.draftParams,
		onSaved: (bbox) => {
			onDraft.setDraftParams({
				...onDraft.draftParams,
				bbox_x: Math.round(bbox.x),
				bbox_y: Math.round(bbox.y),
				bbox_w: Math.round(bbox.width),
				bbox_h: Math.round(bbox.height)
			});
		}
	}) : null, own.wireMenu), createElement("div", { className: card_module_default.modLeafActions }, createElement(Button, {
		variant: "primary",
		onClick: onSave
	}, leaf.mode === "create" ? "Add" : "Save"), leaf.mode === "edit" ? createElement(Button, {
		variant: "ghost",
		onClick: onDelete
	}, "Remove") : null));
}
/** THE PAINT VERB — the brush button + modal mount (the face
*  component arrives from the host; this is the wiring only). */
function PaintVerb(props) {
	const [open, setOpen] = useState(false);
	return createElement("div", { className: card_module_default.modField }, createElement(Button, {
		variant: "ghost",
		onClick: () => {
			setOpen(true);
		}
	}, "Paint"), open ? createElement(props.Face, {
		referenceUrl: props.referenceUrl,
		payloadUrl: props.payloadUrl,
		onSave: (dataUrl) => {
			props.onSaved(dataUrl);
			setOpen(false);
		},
		onCancel: () => {
			setOpen(false);
		}
	}) : null);
}
/** THE BBOX VERB (stroke 78) — the selection button + modal mount:
*  reads the entry's current rectangle (all four present and finite
*  = set; anything else = null, a fresh draw), writes the four
*  bbox_* inputs on save. Same delivery law as the paint verb. */
function BboxVerb(props) {
	const [open, setOpen] = useState(false);
	const quad = [
		props.draft["bbox_x"],
		props.draft["bbox_y"],
		props.draft["bbox_w"],
		props.draft["bbox_h"]
	];
	const set = quad.length === 4 && quad.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ? {
		x: quad[0],
		y: quad[1],
		width: quad[2],
		height: quad[3]
	} : null;
	return createElement("div", { className: card_module_default.modField }, createElement(Button, {
		variant: "ghost",
		onClick: () => {
			setOpen(true);
		}
	}, set === null ? "Draw box" : "Redraw box"), open ? createElement(props.Face, {
		referenceUrl: props.referenceUrl,
		bbox: set,
		onSave: (bbox) => {
			props.onSaved(bbox);
			setOpen(false);
		},
		onCancel: () => {
			setOpen(false);
		}
	}) : null);
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
	}, createElement("span", { className: card_module_default.modTileLabel }, props.label), props.strength !== void 0 ? createElement("span", { className: card_module_default.modTileStrength }, props.strength.toFixed(2)) : null);
}
//#endregion
//#region src/slots.ts
/** The seam ids, spelled once. Claims use these constants. */
const CARD_SLOTS = {
	/** keyed by wire type: 'image' | 'file' | 'select' | ... — the
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
			onWrite(name, coerceFieldEdit(fieldOf(name), v));
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
		return Object.assign(out, user);
	}
	return resolveValue(spec, user, base);
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
export { ASSET_DRAG_MIME, CARD_SLOTS, CardForm, ControlRow, EmptyState, InputSquare, ModelAxes, ModifiersSection, OverlayKnob, PackPrompt, PaneHeader, PaneShell, RecipePills, SectionLabel, SeedDice, Skeleton, SourceRow, SpecAtom, SpecFieldRow, SpecPanel, SpecSliderAtom, Tip, TriStateAtom, WirePickerModal, activeRecipeId, activeRowId, activeVariantId, axisGroups, axisKey, axisPickPatch, coerceFieldEdit, composeUnset, composingRows, entryFieldsOfEnvelope, fetchCardCatalog, fetchFormSpec, fetchFormsTable, fieldVisible, fieldsOf, fieldsOfEnvelope, groupFields, inputEdgeOf, isHybridKind, isImageUrl, isOptionKind, kindScalarFieldsOfEnvelope, makeLabelSprite, modOwnedFields, modelChoices, modelSwitchPatch, mountStage3D, optionKeyOf, postManageAction, quantRowsFor, readAsDataUrl, resolveValue, resolveValueLayered, rowsFor, scalarKeyOf, schemaEnvelope, seedAxisValues, seedUser, specDefaults, titleCaseId, unsetFaceLabel, unsetFaceTip, uploadInputFile, useFormSpec, useResolvedForm, useSquareProvider, variantGroupsContract, variantRows };
