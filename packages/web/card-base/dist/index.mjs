import { Button, IconPlusOutline16, Input, Menu, Modal, Switch } from "@deepseek-ai/dsh-client-ui-primitives";
import { clsx } from "clsx";
import { jsx, jsxs } from "react/jsx-runtime";
import { Fragment, createElement, useCallback, useEffect, useRef, useState } from "react";
import { fetchMediaLibrary } from "@melite-plugin/melite-run-wire";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
//#region src/spec.ts
/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
*  served modifier kind owns — its fields' names plus its param_key
*  (the bag storage). CardForm EXCLUDES these from the flat param
*  groups: mod params render ONLY inside the mod system. PURE. */
function modOwnedFields(spec) {
	const owned = /* @__PURE__ */ new Set();
	for (const k of spec.features?.modifiers ?? []) {
		owned.add(k.param_key);
		for (const f of k.fields ?? []) owned.add(f.name);
	}
	return owned;
}
/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
*  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
function isOptionKind(k) {
	return (k.options ?? []).length > 0;
}
/** Seed the editable values from the spec's declared defaults (the old
*  picker's law: pick → defaults seeded → the user edits from there).
*  DEFAULTS PROPAGATE FROM THE EMISSION — the base never invents one. */
function specDefaults(fields) {
	const out = {};
	for (const f of fields) if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
	return out;
}
/** evalVisibleWhen's serving shape: "key=value" (a field shows when its
*  guard key holds the value). A field with no visible_when always
*  shows. Unknown guard keys: show (never hide on a typo). */
function fieldVisible(f, values) {
	const rule = f.visible_when;
	if (typeof rule !== "string" || rule === "") return true;
	const eq = rule.indexOf("=");
	if (eq < 0) return true;
	const key = rule.slice(0, eq);
	const want = rule.slice(eq + 1);
	const held = values[key];
	return String(held ?? "") === want;
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
/** Coerce the raw edit strings to the spec's declared types — ONCE, at
*  patch time (the editPatch law). Only keys that CHANGED from the
*  stage's held params ride the patch. */
function specPatch(fields, values, held) {
	const out = {};
	for (const f of fields) {
		const v = values[f.name];
		if (v === void 0) continue;
		const before = held[f.name] ?? f.default;
		if (String(v) === String(before ?? "")) continue;
		if (f.type === "number" || f.type === "seed" || f.type === "slider") {
			const n = Number(v);
			out[f.name] = Number.isFinite(n) ? n : v;
		} else if (f.type === "switch" || f.type === "boolean") out[f.name] = v === true || v === "true";
		else out[f.name] = v;
	}
	return out;
}
/** THE RECIPE-YIELD LAW (operator, 2026-09-14: "IMG GEN UI CARD
*  HAS TWO RECIPES"): the card's own `recipe` schema field and the
*  family matrix's `Recipe` axis group share the `recipe` values key
*  — two selects writing one key (the family's pick clobbers the
*  card's, and the axis seed stamps `default` where the card catalog
*  only knows `standard/...`). When the card declares its own recipe
*  field, the card OWNS the name: the family axis yields (hidden,
*  never seeded). PURE. */
function cardOwnsRecipe(spec) {
	return (spec.fields ?? []).some((f) => f.name === "recipe");
}
/** The axis groups in declaration order: features.variant_groups'
*  key order when the door serves it, else the rows' distinct groups
*  in first-seen order. Empty group names never ride. The Recipe
*  group yields when the card owns its own recipe field (the
*  recipe-yield law above). */
function axisGroups(spec) {
	const rows = spec.variants ?? [];
	const groups = [];
	const declared = variantGroupsContract(spec);
	if (declared.length > 0) {
		for (const g of declared) if (g !== "" && !groups.includes(g)) groups.push(g);
	}
	for (const v of rows) if (v.group !== "" && !groups.includes(v.group)) groups.push(v.group);
	if (cardOwnsRecipe(spec)) return groups.filter((g) => g !== "Recipe");
	return groups;
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
/** The Model select's options — the distinct model ROUTES the matrix
*  can land on: the spec root's family + every row's defaults.model
*  (dedup, first-seen order; the family leads). */
function modelChoices(spec) {
	const out = [];
	const push = (m) => {
		if (typeof m !== "string" || m === "") return;
		if (!out.includes(m)) out.push(m);
	};
	push(spec.model);
	for (const v of spec.variants ?? []) push(v.defaults["model"]);
	return out;
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
	const patch = { ...row.defaults };
	const groups = axisGroups(spec);
	const at = groups.indexOf(row.group);
	const active = {};
	for (const g of groups) if (g === row.group) active[g] = row.id;
	else if (typeof row.defaults["model"] === "string") active[g] = void 0;
	patch[axisKey(row.group)] = row.id;
	for (const g of groups.slice(at + 1)) {
		const composing = composingRows(spec, g, active);
		if (composing.length > 0) patch[axisKey(g)] = composing[0].id;
		else patch[axisKey(g)] = "";
	}
	return patch;
}
/** Heal a bench POISONED by the double-recipe era (the recipe-yield
*  law's migration half): when the card owns its recipe field, a held
*  `recipe` value naming a FAMILY recipe row (`default`, `realism` —
*  stamped by the old axis seed) is not a card recipe. Fall it back
*  to the field default so the next Run patches the healed value and
*  the bench converges. Judged against the field's own options when
*  the emission carries them; option-less emissions pass through
*  untouched (never refuse on a guess). PURE. */
function healOwnedRecipe(spec, values) {
	if (!cardOwnsRecipe(spec)) return values;
	const field = (spec.fields ?? []).find((f) => f.name === "recipe");
	const cur = values["recipe"];
	if (typeof cur !== "string" || cur === "") return values;
	const opts = (field?.options ?? []).map((o) => typeof o === "string" ? o : o.value);
	if (opts.length > 0 && !opts.includes(cur)) {
		const next = { ...values };
		if (field?.default !== void 0 && field.default !== null) next["recipe"] = field.default;
		else delete next["recipe"];
		return next;
	}
	return values;
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
	for (const g of groups) {
		const composing = composingRows(spec, g, active);
		if (composing.length === 0) {
			patch[axisKey(g)] = "";
			active[g] = "";
			continue;
		}
		const row = composing.find((r) => {
			return (typeof r.defaults["model"] === "string" && r.defaults["model"] !== "" ? r.defaults["model"] : r.route) === model;
		}) ?? composing[0];
		Object.assign(patch, row.defaults);
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
		let model = typeof spec.model === "string" && spec.model !== "" ? spec.model : "";
		for (const g of groups) {
			const row = rowsFor(spec, g).find((x) => x.id === active[g]);
			if (row !== void 0 && typeof row.defaults["model"] === "string" && row.defaults["model"] !== "") {
				model = row.defaults["model"];
				break;
			}
		}
		if (model !== "") out["model"] = model;
	}
	return out;
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
//#region src/card.module.css
var card_module_default = {
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
	"modTileStrength": "VMoOIq_modTileStrength",
	"modTitle": "VMoOIq_modTitle",
	"pickBtn": "VMoOIq_pickBtn",
	"pickEmpty": "VMoOIq_pickEmpty",
	"pickGlyph": "VMoOIq_pickGlyph",
	"pickLabel": "VMoOIq_pickLabel",
	"pickList": "VMoOIq_pickList",
	"pickRow": "VMoOIq_pickRow",
	"pickThumb": "VMoOIq_pickThumb",
	"sourceRow": "VMoOIq_sourceRow",
	"specField": "VMoOIq_specField",
	"specFieldKey": "VMoOIq_specFieldKey",
	"specForm": "VMoOIq_specForm",
	"specGroup": "VMoOIq_specGroup",
	"specGroupTitle": "VMoOIq_specGroupTitle",
	"specHint": "VMoOIq_specHint",
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
		"aria-label": label + " source",
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
		"aria-label": "Detach " + label,
		onClick: (e) => {
			e.stopPropagation();
			props.onClear?.();
		}
	}, "✕") : null), createElement("span", { className: card_module_default.squareLabel }, label), metric !== void 0 ? createElement("span", { className: card_module_default.squareMetric }, metric) : null, props.onFile !== void 0 && !disabled ? createElement("input", {
		ref: fileRef,
		type: "file",
		accept: "image/png,image/jpeg,image/webp",
		className: card_module_default.squareFileInput,
		"aria-hidden": true,
		tabIndex: -1,
		onChange: (e) => {
			const f = e.target.files?.[0];
			if (f !== void 0 && f !== null) props.onFile?.(f);
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
/** /v1/form-spec?model=<family> — the card family's emission (fields
*  + the declared edges + the mod kinds). */
async function fetchFormSpec(model, signal) {
	const doc = await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal);
	if (!Array.isArray(doc["fields"])) throw new Error("form-spec: no fields array");
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
		file: path.split("/").pop() ?? file.name
	};
}
//#endregion
//#region src/form.tsx
/**
* form.tsx — @melite/card-base: THE CONSTRUCTOR.
*
* THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
* construct the card ui should see that the card package emits an
* image input, then constructs the input component automatically"):
* the base reads the card package's EMISSION — the served form-spec
* (fields, declared input/output edges, mod kinds) — and constructs
* the surface. Defaults propagate from the emission (specDefaults);
* every image/file field gets THE ONE square (square.tsx) with the
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
			if (id === "__none__") {
				setMirror((m) => {
					const n = { ...m };
					delete n[f.name];
					return n;
				});
				onEdit(f.name, "");
				return;
			}
		},
		onClose: () => {
			setPickAt(null);
		},
		portal: true
	});
	useEffect(() => {
		if (modalAt?.mode !== "media") return;
		const ctrl = new AbortController();
		setMediaRows(null);
		fetchMediaLibrary(mediaKindForField(modalAt.field), ctrl.signal).then((items) => {
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
	}, [modalAt]);
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
		accept: "image/png,image/jpeg,image/webp",
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
			if (fileRef.current !== null) fileRef.current.value = "";
		}
	});
	return {
		square,
		wireMenu: createElement(Fragment, null, sourceMenu, pickerModal, fileInput)
	};
}
function SourceRow(props) {
	const field = {
		name: "__source_row__",
		label: props.label,
		type: props.kind === "image" ? "image" : "file"
	};
	const { square, wireMenu } = useSquareProvider(useCallback((name, v) => {
		props.onEdit(typeof v === "string" ? v : String(v ?? ""));
	}, [props.onEdit]), {
		candidates: props.candidates ?? [],
		...props.onFile !== void 0 ? { onFile: props.onFile } : {},
		...props.renderSourcePick !== void 0 ? { renderSourcePick: props.renderSourcePick } : {}
	});
	const host = square(field);
	const shown = host !== void 0 ? host.display ?? props.value ?? null : props.value ?? null;
	return createElement("div", {
		className: card_module_default.sourceRow,
		"data-source-row": props.label
	}, wireMenu, createElement(InputSquare, {
		label: props.label,
		value: shown !== null && isImageUrl(shown) ? shown : null,
		metric: typeof props.value === "string" && props.value !== "" && !isImageUrl(props.value) ? props.value : void 0,
		...host !== void 0 ? host.verbs : {}
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
function useLocalSliderValue(value, def) {
	const num = typeof value === "number" ? value : Number(value);
	const [local, setLocal] = useState(null);
	useEffect(() => {
		setLocal(null);
	}, [num]);
	return {
		value: local !== null ? local : Number.isFinite(num) ? num : Number(def ?? 0),
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
	const shown = useLocalSliderValue(value, f.default);
	return createElement("span", { className: card_module_default.specSliderRow }, createElement("input", {
		className: card_module_default.specSlider,
		type: "range",
		min: f.min ?? 0,
		max: f.max ?? 10,
		step: f.step ?? .1,
		value: shown,
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
function SpecAtom({ f, value, onEdit, square, wireCandidates }) {
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
		"aria-label": f.label
	}, f.options.map((o) => {
		const row = typeof o === "string" ? {
			value: o,
			label: o
		} : o;
		return createElement("option", {
			key: row.value,
			value: row.value
		}, row.label);
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
		const on = value === true || value === "true";
		return createElement(Switch, {
			label: f.label,
			checked: on,
			onChange: (next) => {
				onEdit(f.name, next);
			}
		});
	}
	if (f.type === "textarea") return createElement("textarea", {
		className: card_module_default.specTextarea,
		rows: 3,
		value: String(value ?? ""),
		placeholder: f.placeholder ?? "",
		onChange: (e) => onEdit(f.name, e.target.value),
		"aria-label": f.label
	});
	return createElement(Input, {
		value: String(value ?? ""),
		placeholder: f.placeholder ?? "",
		onChange: (e) => onEdit(f.name, e.target.value),
		"aria-label": f.label
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
function ModelAxes({ spec, values, onEdit }) {
	const groups = axisGroups(spec);
	if (groups.length === 0) return null;
	const models = modelChoices(spec);
	const contract = spec.features?.variant_groups ?? {};
	const pick = (row) => {
		const patch = axisPickPatch(spec, row);
		for (const [k, v] of Object.entries(patch)) onEdit(k, v);
	};
	const active = {};
	for (const g of groups) {
		const held = values[axisKey(g)];
		const rows = composingRows(spec, g, active);
		if (typeof held === "string" && held !== "" && rows.some((r) => r.id === held)) active[g] = held;
		else active[g] = activeRowId(spec, values, g, active) ?? (rows.length > 0 ? rows[0].id : "");
	}
	return createElement("section", {
		className: `${card_module_default.specGroup} ${card_module_default.modelAxes}`,
		"data-model-axes": "1"
	}, createElement("h4", { className: card_module_default.specGroupTitle }, "Model"), createElement("label", { className: card_module_default.specField }, createElement("span", { className: card_module_default.specFieldKey }, "Model"), createElement("select", {
		className: card_module_default.specSelect,
		"aria-label": "Model",
		value: typeof values["model"] === "string" && values["model"] !== "" ? values["model"] : typeof spec.model === "string" && spec.model !== "" ? spec.model : models[0] ?? "",
		onChange: (e) => {
			const m = e.target.value;
			const patch = modelSwitchPatch(spec, m);
			for (const [k, v] of Object.entries(patch)) onEdit(k, v);
		}
	}, models.map((m) => createElement("option", {
		key: m,
		value: m
	}, m)))), groups.map((g) => {
		const rows = composingRows(spec, g, active);
		if (rows.length === 0) return null;
		const label = contract[g]?.label ?? g;
		return createElement("label", {
			key: g,
			className: card_module_default.specField
		}, createElement("span", { className: card_module_default.specFieldKey }, label), createElement("select", {
			className: card_module_default.specSelect,
			"aria-label": label,
			"data-axis": g,
			value: active[g] ?? "",
			onChange: (e) => {
				const id = e.target.value;
				const row = rows.find((v) => v.id === id);
				if (row !== void 0) pick(row);
			}
		}, rows.map((v) => createElement("option", {
			key: v.id,
			value: v.id
		}, v.label + (typeof v.hint === "string" && v.hint !== "" ? ` — ${v.hint}` : "")))));
	}));
}
/** THE CARD FORM (the constructor's surface half) — the spec's
*  fields, grouped, visible-when honored, defaults seeded by the
*  caller (specDefaults — propagated from the emission). Edits ride
*  the caller's values map. Each field renders through the claimed
*  atom for its emitted type when the caller passes one; the base's
*  built-in atom is the default.
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
function SpecFieldRow({ f, value, onEdit, square, wireCandidates }) {
	return createElement("label", { className: card_module_default.specField }, createElement("span", { className: card_module_default.specFieldKey }, f.label, f.required === true ? createElement("span", { className: card_module_default.specRequired }, " *") : null), createElement(SpecAtom, {
		f,
		value,
		onEdit,
		square,
		...wireCandidates !== void 0 ? { wireCandidates } : {}
	}), f.tooltip !== void 0 && f.tooltip !== "" ? createElement("span", { className: card_module_default.specHint }, f.tooltip) : null);
}
function CardForm({ spec, fields, values, onEdit, wire, square, atoms, onPatch }) {
	const modKinds = spec?.features?.modifiers ?? [];
	const owned = modOwnedFields(spec ?? {
		form: "",
		fields: [],
		variants: []
	});
	const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields;
	const signature = spec !== void 0 && Array.isArray(spec.inputs) ? spec.inputs : [];
	const railOf = (inp) => {
		const f = flatFields.find((x) => x.name === inp.name);
		if (f === void 0) return void 0;
		if (f.type === "image" || f.type === "file") return f;
	};
	const railFields = signature.map((inp) => typeof inp?.name === "string" ? railOf(inp) : void 0).filter((f) => f !== void 0);
	const railNames = new Set(railFields.map((f) => f.name));
	const visible = (f) => f.type !== "image_list" && !railNames.has(f.name);
	const groups = groupFields(flatFields.filter(visible), values);
	const atomOf = (f) => atoms?.[f.type];
	const own = useSquareProvider(onEdit, wire ?? { candidates: [] });
	const squareFor = square ?? own.square;
	const seeded = useRef(false);
	const valuesRef = useRef(values);
	valuesRef.current = values;
	useEffect(() => {
		if (spec === void 0 || seeded.current) return;
		seeded.current = true;
		const seed = seedAxisValues(spec, valuesRef.current);
		for (const [k, v] of Object.entries(seed)) onEdit(k, v);
	}, [spec, onEdit]);
	return createElement("div", { className: card_module_default.specForm }, spec !== void 0 ? createElement(ModelAxes, {
		spec,
		values,
		onEdit
	}) : null, railFields.length > 0 ? createElement("section", {
		className: card_module_default.specGroup + " " + card_module_default.inputRail,
		"data-input-rail": "1"
	}, createElement("div", { className: card_module_default.specSlotRow }, railFields.map((f) => {
		if (f.type === "image_list") return null;
		return createElement("div", {
			key: f.name,
			className: card_module_default.specSlotCell,
			title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
		}, createElement(SpecAtom, {
			f,
			value: values[f.name],
			onEdit,
			square: squareFor(f),
			...wire?.candidates !== void 0 ? { wireCandidates: wire.candidates } : {}
		}));
	}))) : null, groups.map((g) => {
		const children = [];
		let row = [];
		const flush = () => {
			if (row.length === 0) return;
			children.push(createElement("div", {
				key: "slotrow-" + String(children.length),
				className: card_module_default.specSlotRow
			}, row));
			row = [];
		};
		for (const f of g.fields) {
			if (railNames.has(f.name)) continue;
			const claim = atomOf(f);
			const sq = squareFor(f);
			const wireCandidates = wire?.candidates;
			if (claim !== void 0) {
				flush();
				children.push(createElement("label", {
					key: f.name,
					className: card_module_default.specField
				}, createElement("span", { className: card_module_default.specFieldKey }, f.label, f.required === true ? createElement("span", { className: card_module_default.specRequired }, " *") : null), claim({
					f,
					value: values[f.name],
					onEdit,
					square: sq
				}), f.tooltip !== void 0 && f.tooltip !== "" ? createElement("span", { className: card_module_default.specHint }, f.tooltip) : null));
				continue;
			}
			if (f.type === "image" || f.type === "file") {
				row.push(createElement("div", {
					key: f.name,
					className: card_module_default.specSlotCell,
					title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
				}, createElement(SpecAtom, {
					f,
					value: values[f.name],
					onEdit,
					square: sq,
					...wireCandidates !== void 0 ? { wireCandidates } : {}
				})));
				continue;
			}
			flush();
			children.push(createElement(SpecFieldRow, {
				key: f.name,
				f,
				value: values[f.name],
				onEdit,
				square: sq,
				...wireCandidates !== void 0 ? { wireCandidates } : {}
			}));
		}
		flush();
		return createElement("section", {
			key: g.group ?? "",
			className: card_module_default.specGroup
		}, g.group !== null ? createElement("h4", { className: card_module_default.specGroupTitle }, g.group) : null, children);
	}), modKinds.length > 0 ? createElement(ModifiersSection, {
		kinds: modKinds,
		values,
		onEdit,
		...onPatch !== void 0 ? { onPatch } : {}
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
*  - TWO kind shapes, both first-class:
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
	const [draftParams, setDraftParams] = useState({});
	const entriesOf = (k) => {
		const v = values[k.param_key];
		return Array.isArray(v) ? v.filter((e) => typeof e === "object" && e !== null) : [];
	};
	const optionOf = (k, value) => (k.options ?? []).find((o) => o.value === value) ?? null;
	const commit = (k, next) => {
		onEdit(k.param_key, next);
		onPatch?.({ [k.param_key]: next });
	};
	const addable = kinds.filter((k) => k.cardinality !== "scalar");
	if (kinds.length === 0) return null;
	const fieldDefaults = (k) => {
		const out = {};
		for (const f of k.fields ?? []) if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
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
		if (entry === void 0) return;
		if (isOptionKind(k)) {
			const strength = typeof entry["strength"] === "number" ? entry["strength"] : void 0;
			setDraftStrength(strength !== void 0 ? String(strength) : "");
		} else {
			const params = {};
			for (const f of k.fields ?? []) if (entry[f.name] !== void 0) params[f.name] = entry[f.name];
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
		if (leaf === null) return;
		const k = leaf.kind;
		const entries = entriesOf(k);
		if (isOptionKind(k)) {
			if (leaf.mode === "create") {
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
				commit(k, [...entries, {
					id: draftOption,
					strength
				}]);
			} else {
				const entry = entries[leaf.index];
				if (entry === void 0) {
					setLeaf(null);
					return;
				}
				const strength = Number(draftStrength);
				if (!Number.isFinite(strength)) {
					setLeafError("Strength must be a number.");
					return;
				}
				const next = [...entries];
				next[leaf.index] = {
					...entry,
					strength
				};
				commit(k, next);
			}
		} else if (leaf.mode === "create") commit(k, [...entries, { ...draftParams }]);
		else {
			const entry = entries[leaf.index];
			if (entry === void 0) {
				setLeaf(null);
				return;
			}
			const next = [...entries];
			next[leaf.index] = {
				...entry,
				...draftParams
			};
			commit(k, next);
		}
		setLeaf(null);
	};
	const deleteLeaf = () => {
		if (leaf === null || leaf.mode !== "edit") return;
		commit(leaf.kind, entriesOf(leaf.kind).filter((_, i) => i !== leaf.index));
		setLeaf(null);
	};
	const onTileDrop = (k, active, over) => {
		if (over === active) return;
		const entries = entriesOf(k);
		const from = entries.findIndex((_, i) => k.param_key + "-" + i === active);
		const to = entries.findIndex((_, i) => k.param_key + "-" + i === over);
		if (from < 0 || to < 0) return;
		const next = [...entries];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		commit(k, next);
	};
	return createElement("section", {
		className: card_module_default.modSection,
		"data-subcard-grid": "on"
	}, createElement("div", { className: card_module_default.modHead }, createElement("span", { className: card_module_default.modTitle }, "Modifiers"), createElement("span", { className: card_module_default.modHint }, "drag to set apply order")), leafError !== null && leaf === null ? createElement("p", { className: card_module_default.modLeafError }, leafError) : null, createElement("div", {
		className: card_module_default.modRow,
		"data-subcard-row": "flow"
	}, kinds.map((k) => {
		const entries = entriesOf(k);
		if (entries.length === 0) return null;
		return entries.map((entry, i) => {
			const id = typeof entry["id"] === "string" ? entry["id"] : "";
			const option = optionOf(k, id);
			const strength = typeof entry["strength"] === "number" ? entry["strength"] : option !== null && option.defaults !== void 0 ? option.defaults.strength : void 0;
			return createElement(ModTile, {
				key: k.param_key + "-" + i,
				tileId: k.param_key + "-" + i,
				label: option !== null ? option.label : id !== "" ? id : isOptionKind(k) ? k.label + " " + String(i + 1) : k.label,
				...strength !== void 0 ? { strength } : {},
				onOpen: () => {
					openEdit(k, i);
				},
				dragging: dragTile === k.param_key + "-" + i,
				dragOver: overTile === k.param_key + "-" + i && dragTile !== null && dragTile !== overTile,
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
			});
		});
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
			const k = addable.find((x) => x.kind === id);
			if (k !== void 0) openCreate(k);
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
		onDraft: {
			setDraftOption,
			setDraftStrength,
			setDraftParams,
			draftOption,
			draftStrength,
			draftParams
		},
		onError: setLeafError,
		onSave: saveLeaf,
		onDelete: deleteLeaf,
		leafError
	})) : null);
}
/** THE LEAF BODY — split so the FIELD-kind editor gets its own
*  square provider (the construction law: an image input constructs
*  the square automatically, even inside a mod leaf). */
function ModLeaf(props) {
	const { leaf, onDraft, onSave, onDelete, leafError } = props;
	const k = leaf.kind;
	const own = useSquareProvider((name, v) => {
		onDraft.setDraftParams({
			...onDraft.draftParams,
			[name]: v
		});
	}, { candidates: [] });
	return createElement("div", { className: card_module_default.modLeaf }, leafError !== null ? createElement("p", { className: card_module_default.modLeafError }, leafError) : null, isOptionKind(k) ? createElement("div", { className: card_module_default.modLeafFields }, leaf.mode === "create" ? createElement("label", { className: card_module_default.modField }, k.label, createElement("select", {
		className: card_module_default.modSelect,
		value: onDraft.draftOption,
		onChange: (e) => {
			onDraft.setDraftOption(e.target.value);
		}
	}, createElement("option", { value: "" }, "— pick —"), (k.options ?? []).map((o) => createElement("option", {
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
	}))) : createElement("div", { className: card_module_default.modLeafFields }, (k.fields ?? []).map((f) => createElement("label", {
		key: f.name,
		className: card_module_default.modField
	}, f.label ?? f.name, createElement(SpecAtom, {
		f,
		value: onDraft.draftParams[f.name],
		onEdit: (name, v) => {
			onDraft.setDraftParams({
				...onDraft.draftParams,
				[name]: v
			});
		},
		square: own.square(f)
	}))), own.wireMenu), createElement("div", { className: card_module_default.modLeafActions }, createElement(Button, {
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
	return createElement("li", {
		className: card_module_default.modTile + (props.dragging ? " " + card_module_default.tileDragging : "") + (props.dragOver ? " " + card_module_default.modTileOver : ""),
		draggable: true,
		"data-mod-tile": props.tileId,
		title: "Drag to reorder · click to edit",
		onDragStart: (e) => {
			e.dataTransfer.setData(MOD_DRAG_MIME, props.tileId);
			e.dataTransfer.effectAllowed = "move";
			props.onReorderStart(props.tileId);
		},
		onDragEnd: () => {
			props.onReorderStart(null);
		},
		onDragOver: (e) => {
			if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				props.onReorderOver(props.tileId);
			}
		},
		onDrop: (e) => {
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
export { ASSET_DRAG_MIME, CARD_SLOTS, CardForm, InputSquare, ModelAxes, ModifiersSection, SourceRow, SpecAtom, SpecFieldRow, SpecSliderAtom, TriStateAtom, WirePickerModal, activeRowId, activeVariantId, axisGroups, axisKey, axisPickPatch, cardOwnsRecipe, composingRows, fetchCardCatalog, fetchFormSpec, fetchFormsTable, fieldVisible, groupFields, healOwnedRecipe, inputEdgeOf, isImageUrl, isOptionKind, makeLabelSprite, modOwnedFields, modelChoices, modelSwitchPatch, mountStage3D, quantRowsFor, readAsDataUrl, rowsFor, seedAxisValues, specDefaults, specPatch, uploadInputFile, useFormSpec, useSquareProvider, variantGroupsContract, variantRows };
