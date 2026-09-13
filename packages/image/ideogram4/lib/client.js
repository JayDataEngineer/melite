window.__ModuleLoader__.load({
	id: "@melite/image-ideogram4",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region \0dsh-css:/home/user/Documents/programs/active/inference.cpp/packages/image/ideogram4/src/client/client.module.css.mjs
		const css$1 = ".K5r_la_ideoStudio{grid-template-columns:minmax(280px,360px) 1fr;gap:14px;display:grid}.K5r_la_ideoStudio :where(input,textarea,select,button){box-sizing:border-box}.K5r_la_ideoRail{flex-direction:column;gap:10px;min-width:0;display:flex}.K5r_la_ideoField{flex-direction:column;gap:5px;display:flex}.K5r_la_ideoFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.K5r_la_ideoField input,.K5r_la_ideoField textarea,.K5r_la_ideoField select{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-primary,#d8d9da);font:inherit;border-radius:6px;width:100%;padding:6px 8px;font-size:12px}.K5r_la_ideoToolbar{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.K5r_la_ideoAspect{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-primary,#d8d9da);border-radius:6px;padding:5px 6px;font-size:12px}.K5r_la_ideoStatus{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.K5r_la_ideoTabs{border-bottom:1px solid var(--dsw-alias-outline-primary,#33363b);gap:2px;display:flex}.K5r_la_ideoTab{color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;padding:6px 10px;font-size:12px}.K5r_la_ideoTabOn{border-bottom-color:var(--dsw-alias-accent-primary,#3aa0c8);color:var(--dsw-alias-label-primary,#d8d9da)}.K5r_la_ideoInspector,.K5r_la_ideoStylePanel,.K5r_la_ideoJsonPanel{flex-direction:column;gap:10px;display:flex}.K5r_la_ideoInspectorHead{justify-content:space-between;align-items:center;display:flex}.K5r_la_ideoInspectorActions{gap:4px;display:flex}.K5r_la_ideoTypeBadge,.K5r_la_ideoRowBadge{text-transform:uppercase;border-radius:4px;padding:2px 6px;font-size:10px}.K5r_la_ideoTypeBadge[data-ideo-type=obj],.K5r_la_ideoRowBadge[data-ideo-type=obj]{color:#3aa0c8;background:#3da0c82e}.K5r_la_ideoTypeBadge[data-ideo-type=text],.K5r_la_ideoRowBadge[data-ideo-type=text]{color:#9664c8;background:#9664c82e}.K5r_la_ideoTypeBadge[data-ideo-type=logo],.K5r_la_ideoRowBadge[data-ideo-type=logo]{color:#db9456;background:#db94562e}.K5r_la_ideoBboxRow{grid-template-columns:repeat(4,1fr);gap:8px;display:grid}.K5r_la_ideoFontChips{flex-wrap:wrap;gap:4px;display:flex}.K5r_la_ideoChip{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;border-radius:999px;padding:3px 8px;font-size:10px}.K5r_la_ideoChipOn{border-color:var(--dsw-alias-accent-primary,#3aa0c8);color:var(--dsw-alias-accent-primary,#3aa0c8)}.K5r_la_ideoSwatches{flex-wrap:wrap;align-items:center;gap:4px;display:flex}.K5r_la_ideoSwatch{border:1px solid var(--dsw-alias-outline-primary,#33363b);cursor:pointer;border-radius:4px;width:22px;height:16px;display:inline-block}.K5r_la_ideoSwatchAdd{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px dashed var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-secondary,#61666b);border-radius:4px;width:84px;padding:2px 6px;font-size:10px}.K5r_la_ideoMiniSwatch{border-radius:2px;width:10px;height:8px;display:inline-block}.K5r_la_ideoEmpty{color:var(--dsw-alias-label-secondary,#61666b);flex-direction:column;gap:8px;font-size:12px;display:flex}.K5r_la_ideoList{flex-direction:column;gap:4px;display:flex}.K5r_la_ideoRow{border:1px solid var(--dsw-alias-outline-primary,#33363b);cursor:pointer;border-radius:6px;align-items:center;gap:8px;padding:5px 8px;display:flex}.K5r_la_ideoRowOn{border-color:var(--dsw-alias-accent-primary,#3aa0c8)}.K5r_la_ideoRowText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:12px;overflow:hidden}.K5r_la_ideoRowBbox{color:var(--dsw-alias-label-secondary,#61666b);font-size:10px}.K5r_la_ideoRowActions{gap:2px;display:flex}.K5r_la_ideoRowActions button{color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;background:0 0;border:none;padding:2px 4px;font-size:11px}.K5r_la_ideoRowActions button:hover{color:var(--dsw-alias-label-primary,#d8d9da)}.K5r_la_ideoPre{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);white-space:pre-wrap;border-radius:6px;max-height:240px;margin:0;padding:8px;font-size:10px;overflow:auto}.K5r_la_ideoWarn{color:var(--dsw-alias-state-critical,#c73a3a);font-size:11px}.K5r_la_ideoCanvasWrap{flex-direction:column;gap:6px;min-width:0;display:flex}.K5r_la_ideoCanvas{background:var(--dsw-alias-fill-secondary,#141416);border:1px solid var(--dsw-alias-outline-primary,#33363b);touch-action:none;user-select:none;border-radius:8px;width:100%;max-width:100%;margin:0 auto;position:relative;overflow:hidden}.K5r_la_ideoCanvasDraw{cursor:crosshair}.K5r_la_ideoCanvasBg{position:absolute;inset:0}.K5r_la_ideoBgText{color:var(--dsw-alias-label-secondary,#61666b);opacity:.28;pointer-events:none;text-align:center;word-break:break-word;justify-content:center;align-items:center;padding:24px;font-size:14px;font-weight:600;display:flex;position:absolute;inset:0;overflow:hidden}.K5r_la_ideoGridMinor{pointer-events:none;background-image:linear-gradient(90deg,#a0aabe0f 1px,#0000 1px),linear-gradient(#a0aabe0f 1px,#0000 1px);background-size:2.5% 2.5%;position:absolute;inset:0}.K5r_la_ideoGridMajor{pointer-events:none;background-image:linear-gradient(90deg,#a0aabe29 1px,#0000 1px),linear-gradient(#a0aabe29 1px,#0000 1px);background-size:10% 10%;position:absolute;inset:0}.K5r_la_ideoBox{position:absolute}.K5r_la_ideoBox_obj{--ideo-accent:#3aa0c8}.K5r_la_ideoBox_text{--ideo-accent:#9664c8}.K5r_la_ideoBox_logo{--ideo-accent:#db9456}.K5r_la_ideoHalo{border:2px solid var(--ideo-accent,#3aa0c8);opacity:.45;pointer-events:none;border-radius:3px;position:absolute;inset:-4px}.K5r_la_ideoBoxMain{border:1.5px solid var(--ideo-accent,#3aa0c8);cursor:move;border-radius:4px;flex-direction:column;align-items:flex-start;gap:3px;width:100%;height:100%;padding:4px 6px;display:flex;overflow:hidden}.K5r_la_ideoTag{background:var(--ideo-accent,#3aa0c8);color:#101114;text-transform:uppercase;border-radius:3px;width:fit-content;padding:1px 5px;font-size:9px;font-weight:700}.K5r_la_ideoDesc{color:var(--dsw-alias-label-secondary,#9a9b9d);word-break:break-word;font-size:10px;line-height:1.3;overflow:hidden}.K5r_la_ideoInlineText{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--ideo-accent,#9664c8);color:var(--dsw-alias-label-primary,#d8d9da);border-radius:4px;width:100%;padding:4px 6px;font-size:11px}.K5r_la_ideoHandle{background:var(--dsw-alias-label-primary,#d8d9da);border:1px solid var(--dsw-alias-fill-secondary,#141416);z-index:3;border-radius:2px;width:8px;height:8px;margin:-5px 0 0 -5px;position:absolute}.K5r_la_ideoHandle_nw,.K5r_la_ideoHandle_n,.K5r_la_ideoHandle_w{cursor:nwse-resize}.K5r_la_ideoHandle_se,.K5r_la_ideoHandle_s,.K5r_la_ideoHandle_e{cursor:nesw-resize}.K5r_la_ideoHandle_ne,.K5r_la_ideoHandle_sw{cursor:ns-resize}.K5r_la_ideoDrawPreview{border:1.5px dashed var(--dsw-alias-accent-primary,#3aa0c8);pointer-events:none;z-index:4;border-radius:3px;position:absolute}.K5r_la_ideoCoord{color:var(--dsw-alias-label-secondary,#61666b);text-align:center;font-size:10px}.K5r_la_ideoRunRow{grid-column:1/3;gap:8px;display:flex}";
		const tagId$1 = "@melite/image-ideogram4/client.module.css@c471e7ef";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-ideogram4";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var client_module_css_default = {
			"ideoAspect": "K5r_la_ideoAspect",
			"ideoBboxRow": "K5r_la_ideoBboxRow",
			"ideoBgText": "K5r_la_ideoBgText",
			"ideoBox": "K5r_la_ideoBox",
			"ideoBoxMain": "K5r_la_ideoBoxMain",
			"ideoBox_logo": "K5r_la_ideoBox_logo",
			"ideoBox_obj": "K5r_la_ideoBox_obj",
			"ideoBox_text": "K5r_la_ideoBox_text",
			"ideoCanvas": "K5r_la_ideoCanvas",
			"ideoCanvasBg": "K5r_la_ideoCanvasBg",
			"ideoCanvasDraw": "K5r_la_ideoCanvasDraw",
			"ideoCanvasWrap": "K5r_la_ideoCanvasWrap",
			"ideoChip": "K5r_la_ideoChip",
			"ideoChipOn": "K5r_la_ideoChipOn",
			"ideoCoord": "K5r_la_ideoCoord",
			"ideoDesc": "K5r_la_ideoDesc",
			"ideoDrawPreview": "K5r_la_ideoDrawPreview",
			"ideoEmpty": "K5r_la_ideoEmpty",
			"ideoField": "K5r_la_ideoField",
			"ideoFieldKey": "K5r_la_ideoFieldKey",
			"ideoFontChips": "K5r_la_ideoFontChips",
			"ideoGridMajor": "K5r_la_ideoGridMajor",
			"ideoGridMinor": "K5r_la_ideoGridMinor",
			"ideoHalo": "K5r_la_ideoHalo",
			"ideoHandle": "K5r_la_ideoHandle",
			"ideoHandle_e": "K5r_la_ideoHandle_e",
			"ideoHandle_n": "K5r_la_ideoHandle_n",
			"ideoHandle_ne": "K5r_la_ideoHandle_ne",
			"ideoHandle_nw": "K5r_la_ideoHandle_nw",
			"ideoHandle_s": "K5r_la_ideoHandle_s",
			"ideoHandle_se": "K5r_la_ideoHandle_se",
			"ideoHandle_sw": "K5r_la_ideoHandle_sw",
			"ideoHandle_w": "K5r_la_ideoHandle_w",
			"ideoInlineText": "K5r_la_ideoInlineText",
			"ideoInspector": "K5r_la_ideoInspector",
			"ideoInspectorActions": "K5r_la_ideoInspectorActions",
			"ideoInspectorHead": "K5r_la_ideoInspectorHead",
			"ideoJsonPanel": "K5r_la_ideoJsonPanel",
			"ideoList": "K5r_la_ideoList",
			"ideoMiniSwatch": "K5r_la_ideoMiniSwatch",
			"ideoPre": "K5r_la_ideoPre",
			"ideoRail": "K5r_la_ideoRail",
			"ideoRow": "K5r_la_ideoRow",
			"ideoRowActions": "K5r_la_ideoRowActions",
			"ideoRowBadge": "K5r_la_ideoRowBadge",
			"ideoRowBbox": "K5r_la_ideoRowBbox",
			"ideoRowOn": "K5r_la_ideoRowOn",
			"ideoRowText": "K5r_la_ideoRowText",
			"ideoRunRow": "K5r_la_ideoRunRow",
			"ideoStatus": "K5r_la_ideoStatus",
			"ideoStudio": "K5r_la_ideoStudio",
			"ideoStylePanel": "K5r_la_ideoStylePanel",
			"ideoSwatch": "K5r_la_ideoSwatch",
			"ideoSwatchAdd": "K5r_la_ideoSwatchAdd",
			"ideoSwatches": "K5r_la_ideoSwatches",
			"ideoTab": "K5r_la_ideoTab",
			"ideoTabOn": "K5r_la_ideoTabOn",
			"ideoTabs": "K5r_la_ideoTabs",
			"ideoTag": "K5r_la_ideoTag",
			"ideoToolbar": "K5r_la_ideoToolbar",
			"ideoTypeBadge": "K5r_la_ideoTypeBadge",
			"ideoWarn": "K5r_la_ideoWarn"
		};
		//#endregion
		//#region ../../web/card-base/src/spec.ts
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
		/** The axis groups in declaration order: features.variant_groups'
		*  key order when the door serves it, else the rows' distinct groups
		*  in first-seen order. Empty group names never ride. */
		function axisGroups(spec) {
			const rows = spec.variants ?? [];
			const groups = [];
			const declared = variantGroupsContract(spec);
			if (declared.length > 0) {
				for (const g of declared) if (g !== "" && !groups.includes(g)) groups.push(g);
			}
			for (const v of rows) if (v.group !== "" && !groups.includes(v.group)) groups.push(v.group);
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
		//#region \0dsh-css:card-base/src/card.module.css.mjs
		const css = ".FRpSCG_specForm :where(input,textarea,select,button){box-sizing:border-box}.FRpSCG_specForm{flex-direction:column;gap:12px;display:flex}.FRpSCG_specGroup{flex-direction:column;gap:8px;display:flex}.FRpSCG_modelAxes{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;display:grid}.FRpSCG_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.FRpSCG_specField{flex-direction:column;gap:6px;display:flex}.FRpSCG_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.FRpSCG_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.FRpSCG_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.FRpSCG_specSelect{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.FRpSCG_specSliderRow{align-items:center;gap:8px;display:flex}.FRpSCG_specSlider{flex:1}.FRpSCG_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.FRpSCG_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.FRpSCG_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.FRpSCG_squareOff{opacity:.5;pointer-events:none}.FRpSCG_squareBox{border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.FRpSCG_squareOver{border-color:var(--dsw-alias-border-l3,#00000047);box-shadow:0 0 0 2px var(--dsw-alias-border-l1,#00000014)}.FRpSCG_squareThumb{object-fit:cover;width:100%;height:100%}.FRpSCG_squareGlyph{color:var(--dsw-alias-label-tertiary,#00000073)}.FRpSCG_squareX{background:var(--dsw-alias-bg-module,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.FRpSCG_squareLabel{color:var(--dsw-alias-label-primary,#0f1115);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.FRpSCG_squareMetric{color:var(--dsw-alias-label-tertiary,#00000073);font-size:10px;line-height:17px}.FRpSCG_squareFileInput{display:none}.FRpSCG_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.FRpSCG_modHead{align-items:baseline;gap:8px;display:flex}.FRpSCG_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.FRpSCG_modHint{opacity:.45;font-size:9px}.FRpSCG_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.FRpSCG_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.FRpSCG_modTile:active{cursor:grabbing}.FRpSCG_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.FRpSCG_modTileStrength{opacity:.55;font-size:9px}.FRpSCG_modAddSquare{border:1px dashed var(--dsw-alias-border-l3,#00000047);cursor:pointer;opacity:.7;height:64px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:8px;justify-content:center;align-items:center;width:64px;display:flex}.FRpSCG_modAddSquare:hover{background:var(--dsw-alias-interactive-bg-hover,#0000000d);border-color:var(--dsw-alias-border-l4,#0006);opacity:1}.FRpSCG_tileDragging{opacity:.5}.FRpSCG_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.FRpSCG_modLeafFields{gap:8px;display:grid}.FRpSCG_modLeafActions{gap:8px;display:flex}.FRpSCG_modField{flex-direction:column;gap:4px;font-size:11px;display:flex}.FRpSCG_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#8080800f);color:inherit;border-radius:6px;padding:6px 8px;font-size:12px}.FRpSCG_modLeafError{color:#e06c5f;margin:0;font-size:11px}.FRpSCG_pickList{flex-direction:column;gap:4px;max-height:60vh;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.FRpSCG_pickRow{display:block}.FRpSCG_pickBtn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:6px;align-items:center;gap:10px;width:100%;padding:6px;display:flex}.FRpSCG_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4)}.FRpSCG_pickThumb{object-fit:cover;border-radius:4px;flex:none;width:40px;height:40px}.FRpSCG_pickGlyph{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;width:40px;height:40px;font-size:15px;font-weight:600;display:inline-flex}.FRpSCG_pickLabel{text-overflow:ellipsis;white-space:nowrap;font-size:13px;overflow:hidden}.FRpSCG_pickEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.FRpSCG_sourceRow{flex-direction:column;display:flex}.FRpSCG_specSlotRow{flex-wrap:wrap;align-items:flex-start;gap:8px;display:flex}.FRpSCG_specSlotCell{flex-direction:column;gap:4px;display:flex}.FRpSCG_specListBlock{flex-direction:column;gap:6px;display:flex}";
		const tagId = "@melite/image-ideogram4/card.module.css@b6a32ba5";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-ideogram4";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"modAddSquare": "FRpSCG_modAddSquare",
			"modField": "FRpSCG_modField",
			"modHead": "FRpSCG_modHead",
			"modHint": "FRpSCG_modHint",
			"modLeaf": "FRpSCG_modLeaf",
			"modLeafActions": "FRpSCG_modLeafActions",
			"modLeafError": "FRpSCG_modLeafError",
			"modLeafFields": "FRpSCG_modLeafFields",
			"modRow": "FRpSCG_modRow",
			"modSection": "FRpSCG_modSection",
			"modSelect": "FRpSCG_modSelect",
			"modTile": "FRpSCG_modTile",
			"modTileLabel": "FRpSCG_modTileLabel",
			"modTileStrength": "FRpSCG_modTileStrength",
			"modTitle": "FRpSCG_modTitle",
			"modelAxes": "FRpSCG_modelAxes",
			"pickBtn": "FRpSCG_pickBtn",
			"pickEmpty": "FRpSCG_pickEmpty",
			"pickGlyph": "FRpSCG_pickGlyph",
			"pickLabel": "FRpSCG_pickLabel",
			"pickList": "FRpSCG_pickList",
			"pickRow": "FRpSCG_pickRow",
			"pickThumb": "FRpSCG_pickThumb",
			"sourceRow": "FRpSCG_sourceRow",
			"specField": "FRpSCG_specField",
			"specFieldKey": "FRpSCG_specFieldKey",
			"specForm": "FRpSCG_specForm",
			"specGroup": "FRpSCG_specGroup",
			"specGroupTitle": "FRpSCG_specGroupTitle",
			"specHint": "FRpSCG_specHint",
			"specListBlock": "FRpSCG_specListBlock",
			"specRequired": "FRpSCG_specRequired",
			"specSelect": "FRpSCG_specSelect",
			"specSlider": "FRpSCG_specSlider",
			"specSliderRow": "FRpSCG_specSliderRow",
			"specSliderValue": "FRpSCG_specSliderValue",
			"specSlotCell": "FRpSCG_specSlotCell",
			"specSlotRow": "FRpSCG_specSlotRow",
			"specTextarea": "FRpSCG_specTextarea",
			"squareBox": "FRpSCG_squareBox",
			"squareFileInput": "FRpSCG_squareFileInput",
			"squareGlyph": "FRpSCG_squareGlyph",
			"squareLabel": "FRpSCG_squareLabel",
			"squareMetric": "FRpSCG_squareMetric",
			"squareOff": "FRpSCG_squareOff",
			"squareOver": "FRpSCG_squareOver",
			"squareThumb": "FRpSCG_squareThumb",
			"squareWrap": "FRpSCG_squareWrap",
			"squareX": "FRpSCG_squareX",
			"tileDragging": "FRpSCG_tileDragging"
		};
		//#endregion
		//#region ../../web/card-base/src/square.tsx
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
			const fileRef = (0, react.useRef)(null);
			const boxRef = (0, react.useRef)(null);
			const [over, setOver] = (0, react.useState)(false);
			const thumb = typeof value === "string" && isImageUrl(value) ? value : null;
			const empty = thumb === null;
			const pick = () => {
				if (disabled) return;
				if (props.onPick !== void 0) props.onPick(boxRef.current);
				else if (empty && props.onFile !== void 0) fileRef.current?.click();
			};
			return (0, react.createElement)("div", { className: card_module_css_default.squareWrap + (disabled ? " " + card_module_css_default.squareOff : "") }, (0, react.createElement)("div", {
				ref: boxRef,
				className: card_module_css_default.squareBox + (over ? " " + card_module_css_default.squareOver : ""),
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
			}, thumb !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.squareThumb,
				src: thumb,
				alt: label
			}) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { className: card_module_css_default.squareGlyph }), !empty && props.onClear !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default.squareX,
				type: "button",
				title: "Detach",
				"aria-label": "Detach " + label,
				onClick: (e) => {
					e.stopPropagation();
					props.onClear?.();
				}
			}, "✕") : null), label !== "" ? (0, react.createElement)("span", { className: card_module_css_default.squareLabel }, label) : null, metric !== void 0 ? (0, react.createElement)("span", { className: card_module_css_default.squareMetric }, metric) : null, props.onFile !== void 0 && !disabled ? (0, react.createElement)("input", {
				ref: fileRef,
				type: "file",
				accept: "image/png,image/jpeg,image/webp",
				className: card_module_css_default.squareFileInput,
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
		//#region ../../web/card-base/src/wire.ts
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
		/** /v1/form-spec?model=<family> — the card family's emission (fields
		*  + the declared edges + the mod kinds). */
		async function fetchFormSpec(model, signal) {
			const doc = await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal);
			if (!Array.isArray(doc["fields"])) throw new Error("form-spec: no fields array");
			return doc;
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
		//#region ../../web/melite-run-wire/src/index.ts
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard; the hand-rolled arm covers non-secure
		*  contexts where the standard is absent). */
		function nextRpcId() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** The estate's domain refusal (result.ok !== true): the message
		*  rides verbatim (the door's own law — the client never
		*  paraphrases); the class separates DOMAIN verdicts from transport
		*  failures, which carry the caller's voice prefix instead. */
		var WireRefusedError = class extends Error {
			constructor(message) {
				super(message);
				this.name = "WireRefusedError";
			}
		};
		/** One client-request round trip: POST /api/<method> with the frame,
		*  narrow the server-response envelope. Non-ok results throw the
		*  estate's message; channel surprises throw honestly. */
		async function wireCall(method, args, opts) {
			const voice = opts?.voice ?? "wire";
			const rpcId = nextRpcId();
			const res = await fetch("/api/" + method, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method,
					payload: { args }
				}),
				...opts?.signal === void 0 ? {} : { signal: opts.signal }
			});
			if (!res.ok) throw new Error(voice + ": HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error(voice + ": malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error(voice + ": malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new WireRefusedError(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : voice + ": refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(voice + ": not a JSON object");
			return value;
		}
		/** media/list — the runs-tree library, kind-filtered (image | audio |
		*  video | model | all). The url is the SAME /melite-media/runs
		*  grammar the byte route serves; picking one writes it verbatim. */
		async function fetchMediaLibrary(kind, signal) {
			const items = (await wireCall("media/list", { kind }, {
				signal,
				voice: "media/list"
			}))["items"];
			if (!Array.isArray(items)) return [];
			const out = [];
			for (const it of items) {
				if (typeof it !== "object" || it === null) continue;
				const url = Reflect.get(it, "url");
				const name = Reflect.get(it, "name");
				const k = Reflect.get(it, "kind");
				const runId = Reflect.get(it, "runId");
				if (typeof url === "string" && typeof name === "string" && typeof k === "string" && typeof runId === "string") out.push({
					url,
					name,
					kind: k,
					runId
				});
			}
			return out;
		}
		//#endregion
		//#region ../../web/card-base/src/form.tsx
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
			const [spec, setSpec] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const id = typeof modelId === "string" && modelId !== "" ? modelId : null;
			(0, react.useEffect)(() => {
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
			const [mirror, setMirror] = (0, react.useState)({});
			const [pickAt, setPickAt] = (0, react.useState)(null);
			const [modalAt, setModalAt] = (0, react.useState)(null);
			const fieldRef = (0, react.useRef)(null);
			const [mediaRows, setMediaRows] = (0, react.useState)(null);
			const fileRef = (0, react.useRef)(null);
			const onFile = (0, react.useCallback)(async (f, file) => {
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
			const sourceMenu = pickAt === null ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
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
			(0, react.useEffect)(() => {
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
				const fallback = (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: true,
					onClose: () => {
						setModalAt(null);
					},
					title: modalAt.mode === "flow" ? "From flow" : "From media",
					description: modalAt.mode === "flow" ? "The other stages’ latest outputs" + (req.kind !== "all" ? " (" + req.kind + ")" : "") : "The runs library" + (req.kind !== "all" ? " (" + req.kind + ")" : ""),
					closeLabel: "Close picker"
				}, candidates.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.pickEmpty }, modalAt.mode === "media" && mediaRows === null ? "loading…" : "nothing to pick yet") : (0, react.createElement)("ul", { className: card_module_css_default.pickList }, candidates.map((c) => (0, react.createElement)("li", {
					key: c.id,
					className: card_module_css_default.pickRow
				}, (0, react.createElement)("button", {
					type: "button",
					className: card_module_css_default.pickBtn,
					"data-testid": "source-pick-row",
					onClick: () => {
						pick(c.url);
					}
				}, isImageUrl(c.url) ? (0, react.createElement)("img", {
					className: card_module_css_default.pickThumb,
					src: c.url,
					alt: c.label,
					loading: "lazy"
				}) : (0, react.createElement)("span", { className: card_module_css_default.pickGlyph }, c.label.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.pickLabel }, c.label))))));
				return wire.renderSourcePick !== void 0 ? wire.renderSourcePick(req, fallback) : fallback;
			})();
			const fileInput = (0, react.createElement)("input", {
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
				wireMenu: (0, react.createElement)(react.Fragment, null, sourceMenu, pickerModal, fileInput)
			};
		}
		function SourceRow(props) {
			const field = {
				name: "__source_row__",
				label: props.label,
				type: props.kind === "image" ? "image" : "file"
			};
			const { square, wireMenu } = useSquareProvider((0, react.useCallback)((name, v) => {
				props.onEdit(typeof v === "string" ? v : String(v ?? ""));
			}, [props.onEdit]), {
				candidates: props.candidates ?? [],
				...props.onFile !== void 0 ? { onFile: props.onFile } : {},
				...props.renderSourcePick !== void 0 ? { renderSourcePick: props.renderSourcePick } : {}
			});
			const host = square(field);
			const shown = host !== void 0 ? host.display ?? props.value ?? null : props.value ?? null;
			return (0, react.createElement)("div", {
				className: card_module_css_default.sourceRow,
				"data-source-row": props.label
			}, wireMenu, (0, react.createElement)(InputSquare, {
				label: props.label,
				value: shown !== null && isImageUrl(shown) ? shown : null,
				metric: typeof props.value === "string" && props.value !== "" && !isImageUrl(props.value) ? props.value : void 0,
				...host !== void 0 ? host.verbs : {}
			}));
		}
		/** THE MULTI-IMAGE ROW (2026-09-13, the operator's source-row law):
		*  an image_list value renders as ONE row of source squares — one per
		*  entry (each with the full three-source grammar: menu, modal, OS
		*  file, drops, detach) plus a trailing add square that APPENDS. The
		*  row is the mods grammar applied to inputs: same plus square, same
		*  menu, dynamically addable. The cap rides the declaration's tooltip
		*  law (the frozen picker served up to 3). */
		const IMAGE_LIST_CAP = 3;
		function ImageListAtom({ f, value, onEdit, candidates }) {
			const arr = Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
			const write = (next) => {
				onEdit(f.name, next);
			};
			const writeAt = (i, v) => {
				if (v === "") {
					write(arr.filter((_, j) => j !== i));
					return;
				}
				const next = [...arr];
				next[i] = v;
				write(next);
			};
			const append = (v) => {
				if (v === "") return;
				write([...arr, v]);
			};
			return (0, react.createElement)("div", {
				className: card_module_css_default.specListBlock,
				"data-image-list": f.name
			}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label), (0, react.createElement)("div", { className: card_module_css_default.specSlotRow }, arr.map((v, i) => (0, react.createElement)(SourceRow, {
				key: f.name + "-" + i + "-" + v,
				label: "",
				kind: "image",
				value: v,
				candidates,
				onEdit: (nv) => {
					writeAt(i, nv);
				}
			})), arr.length < IMAGE_LIST_CAP ? (0, react.createElement)(SourceRow, {
				key: f.name + "-add",
				label: "",
				kind: "image",
				value: null,
				candidates,
				onEdit: append
			}) : null));
		}
		/** THE TRI-STATE ATOM (hour 15, stroke C): inherit / on / off —
		*  promoted from h3's studio-local TriControl (same semantics, same
		*  option order). Serves schema-bound fields of type 'tri' AND the
		*  standalone rail rows that hand-rolled the select before. */
		function TriStateAtom({ label, value, onEdit, name, disabled }) {
			return (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				"aria-label": label,
				disabled: disabled === true,
				value: value === void 0 ? "" : String(value),
				onChange: (e) => {
					const v = e.target.value;
					onEdit(name, v === "" ? void 0 : v === "true");
				}
			}, (0, react.createElement)("option", { value: "" }, "inherit"), (0, react.createElement)("option", { value: "true" }, "on"), (0, react.createElement)("option", { value: "false" }, "off"));
		}
		/** The slider's local display during a drag (the settle law's
		*  carrier): local owns the bubble while dragging; an external move
		*  of the backing value (agent write, revive, another card opened)
		*  reclaims the display. */
		function useLocalSliderValue(value, def) {
			const num = typeof value === "number" ? value : Number(value);
			const [local, setLocal] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
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
			return (0, react.createElement)("span", { className: card_module_css_default.specSliderRow }, (0, react.createElement)("input", {
				className: card_module_css_default.specSlider,
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
			}), (0, react.createElement)("span", { className: card_module_css_default.specSliderValue }, String(shown.value)));
		}
		/** One spec atom — typed by the declaration, edited as a raw string
		*  while typing (decimal dots survive; coercion happens once at patch). */
		function SpecAtom({ f, value, onEdit, square, wireCandidates }) {
			if ((f.type === "image" || f.type === "file") && square !== void 0) {
				const shown = square.display !== void 0 && square.display !== null && square.display !== "" ? square.display : typeof value === "string" ? value : null;
				return (0, react.createElement)(InputSquare, {
					label: f.label !== "" ? f.label : f.name,
					value: shown !== null && isImageUrl(shown) ? shown : null,
					metric: typeof value === "string" && value !== "" && !isImageUrl(value) ? value : void 0,
					...square.verbs
				});
			}
			if (f.type === "select" && Array.isArray(f.options) && f.options.length > 0) return (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				value: String(value ?? ""),
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			}, f.options.map((o) => {
				const row = typeof o === "string" ? {
					value: o,
					label: o
				} : o;
				return (0, react.createElement)("option", {
					key: row.value,
					value: row.value
				}, row.label);
			}));
			if (f.type === "slider") return (0, react.createElement)(SpecSliderAtom, {
				f,
				value,
				onEdit
			});
			if (f.type === "tri") return (0, react.createElement)(TriStateAtom, {
				label: f.label !== "" ? f.label : f.name,
				value: value === void 0 || value === null ? void 0 : value === true || value === "true",
				onEdit,
				name: f.name
			});
			if (f.type === "switch" || f.type === "boolean") {
				const on = value === true || value === "true";
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
					label: f.label,
					checked: on,
					onChange: (next) => {
						onEdit(f.name, next);
					}
				});
			}
			if (f.type === "textarea") return (0, react.createElement)("textarea", {
				className: card_module_css_default.specTextarea,
				rows: 3,
				value: String(value ?? ""),
				placeholder: f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			});
			if (f.type === "image_list") return (0, react.createElement)(ImageListAtom, {
				f,
				value,
				onEdit,
				candidates: wireCandidates
			});
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
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
			return (0, react.createElement)("section", {
				className: `${card_module_css_default.specGroup} ${card_module_css_default.modelAxes}`,
				"data-model-axes": "1"
			}, (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, "Model"), (0, react.createElement)("label", { className: card_module_css_default.specField }, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, "Model"), (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				"aria-label": "Model",
				value: typeof values["model"] === "string" && values["model"] !== "" ? values["model"] : typeof spec.model === "string" && spec.model !== "" ? spec.model : models[0] ?? "",
				onChange: (e) => {
					onEdit("model", e.target.value);
				}
			}, models.map((m) => (0, react.createElement)("option", {
				key: m,
				value: m
			}, m)))), groups.map((g) => {
				const rows = composingRows(spec, g, active);
				if (rows.length === 0) return null;
				const label = contract[g]?.label ?? g;
				return (0, react.createElement)("label", {
					key: g,
					className: card_module_css_default.specField
				}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, label), (0, react.createElement)("select", {
					className: card_module_css_default.specSelect,
					"aria-label": label,
					"data-axis": g,
					value: active[g] ?? "",
					onChange: (e) => {
						const id = e.target.value;
						const row = rows.find((v) => v.id === id);
						if (row !== void 0) pick(row);
					}
				}, rows.map((v) => (0, react.createElement)("option", {
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
			return (0, react.createElement)("label", { className: card_module_css_default.specField }, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null), (0, react.createElement)(SpecAtom, {
				f,
				value,
				onEdit,
				square,
				...wireCandidates !== void 0 ? { wireCandidates } : {}
			}), f.tooltip !== void 0 && f.tooltip !== "" ? (0, react.createElement)("span", { className: card_module_css_default.specHint }, f.tooltip) : null);
		}
		function CardForm({ spec, fields, values, onEdit, wire, square, atoms, onPatch }) {
			const modKinds = spec?.features?.modifiers ?? [];
			const owned = modOwnedFields(spec ?? {
				form: "",
				fields: [],
				variants: []
			});
			const groups = groupFields(owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields, values);
			const atomOf = (f) => atoms?.[f.type];
			const own = useSquareProvider(onEdit, wire ?? { candidates: [] });
			const squareFor = square ?? own.square;
			const seeded = (0, react.useRef)(false);
			const valuesRef = (0, react.useRef)(values);
			valuesRef.current = values;
			(0, react.useEffect)(() => {
				if (spec === void 0 || seeded.current) return;
				seeded.current = true;
				const seed = seedAxisValues(spec, valuesRef.current);
				for (const [k, v] of Object.entries(seed)) onEdit(k, v);
			}, [spec, onEdit]);
			return (0, react.createElement)("div", { className: card_module_css_default.specForm }, spec !== void 0 ? (0, react.createElement)(ModelAxes, {
				spec,
				values,
				onEdit
			}) : null, groups.map((g) => {
				const children = [];
				let row = [];
				const flush = () => {
					if (row.length === 0) return;
					children.push((0, react.createElement)("div", {
						key: "slotrow-" + String(children.length),
						className: card_module_css_default.specSlotRow
					}, row));
					row = [];
				};
				for (const f of g.fields) {
					const claim = atomOf(f);
					const sq = squareFor(f);
					const wireCandidates = wire?.candidates;
					if (claim !== void 0) {
						flush();
						children.push((0, react.createElement)("label", {
							key: f.name,
							className: card_module_css_default.specField
						}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null), claim({
							f,
							value: values[f.name],
							onEdit,
							square: sq
						}), f.tooltip !== void 0 && f.tooltip !== "" ? (0, react.createElement)("span", { className: card_module_css_default.specHint }, f.tooltip) : null));
						continue;
					}
					if (f.type === "image_list") {
						flush();
						children.push((0, react.createElement)("div", {
							key: f.name,
							className: card_module_css_default.specSlotCell,
							title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
						}, (0, react.createElement)(SpecAtom, {
							f,
							value: values[f.name],
							onEdit,
							square: sq,
							...wireCandidates !== void 0 ? { wireCandidates } : {}
						})));
						continue;
					}
					if (f.type === "image" || f.type === "file") {
						row.push((0, react.createElement)("div", {
							key: f.name,
							className: card_module_css_default.specSlotCell,
							title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
						}, (0, react.createElement)(SpecAtom, {
							f,
							value: values[f.name],
							onEdit,
							square: sq,
							...wireCandidates !== void 0 ? { wireCandidates } : {}
						})));
						continue;
					}
					flush();
					children.push((0, react.createElement)(SpecFieldRow, {
						key: f.name,
						f,
						value: values[f.name],
						onEdit,
						square: sq,
						...wireCandidates !== void 0 ? { wireCandidates } : {}
					}));
				}
				flush();
				return (0, react.createElement)("section", {
					key: g.group ?? "",
					className: card_module_css_default.specGroup
				}, g.group !== null ? (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, g.group) : null, children);
			}), modKinds.length > 0 ? (0, react.createElement)(ModifiersSection, {
				kinds: modKinds,
				values,
				onEdit,
				...onPatch !== void 0 ? { onPatch } : {}
			}) : null, own.wireMenu);
		}
		//#endregion
		//#region ../../web/card-base/src/mods.tsx
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
			const [dragTile, setDragTile] = (0, react.useState)(null);
			const [overTile, setOverTile] = (0, react.useState)(null);
			const [pickAt, setPickAt] = (0, react.useState)(null);
			const [leaf, setLeaf] = (0, react.useState)(null);
			const [leafError, setLeafError] = (0, react.useState)(null);
			const [draftOption, setDraftOption] = (0, react.useState)("");
			const [draftStrength, setDraftStrength] = (0, react.useState)("");
			const [draftParams, setDraftParams] = (0, react.useState)({});
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
			return (0, react.createElement)("section", {
				className: card_module_css_default.modSection,
				"data-subcard-grid": "on"
			}, (0, react.createElement)("div", { className: card_module_css_default.modHead }, (0, react.createElement)("span", { className: card_module_css_default.modTitle }, "Modifiers"), (0, react.createElement)("span", { className: card_module_css_default.modHint }, "drag to set apply order")), leafError !== null && leaf === null ? (0, react.createElement)("p", { className: card_module_css_default.modLeafError }, leafError) : null, (0, react.createElement)("div", {
				className: card_module_css_default.modRow,
				"data-subcard-row": "flow"
			}, kinds.map((k) => {
				const entries = entriesOf(k);
				if (entries.length === 0) return null;
				return entries.map((entry, i) => {
					const id = typeof entry["id"] === "string" ? entry["id"] : "";
					const option = optionOf(k, id);
					const strength = typeof entry["strength"] === "number" ? entry["strength"] : option !== null && option.defaults !== void 0 ? option.defaults.strength : void 0;
					return (0, react.createElement)(ModTile, {
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
			}), addable.length > 0 ? (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.modAddSquare,
				"data-subcard-add": "mod",
				"aria-label": "Add modifier",
				title: "Add a modifier",
				onClick: (e) => {
					setPickAt({ rect: e.currentTarget.getBoundingClientRect() });
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { className: card_module_css_default.squareGlyph })) : null), pickAt !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
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
			}) : null, leaf !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: () => {
					setLeaf(null);
				},
				title: (leaf.mode === "create" ? "Add " : "Edit ") + leaf.kind.label,
				closeLabel: "Close"
			}, (0, react.createElement)(ModLeaf, {
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
			return (0, react.createElement)("div", { className: card_module_css_default.modLeaf }, leafError !== null ? (0, react.createElement)("p", { className: card_module_css_default.modLeafError }, leafError) : null, isOptionKind(k) ? (0, react.createElement)("div", { className: card_module_css_default.modLeafFields }, leaf.mode === "create" ? (0, react.createElement)("label", { className: card_module_css_default.modField }, k.label, (0, react.createElement)("select", {
				className: card_module_css_default.modSelect,
				value: onDraft.draftOption,
				onChange: (e) => {
					onDraft.setDraftOption(e.target.value);
				}
			}, (0, react.createElement)("option", { value: "" }, "— pick —"), (k.options ?? []).map((o) => (0, react.createElement)("option", {
				key: o.value,
				value: o.value
			}, o.label)))) : null, (0, react.createElement)("label", { className: card_module_css_default.modField }, "Strength", (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				type: "number",
				step: "0.05",
				value: onDraft.draftStrength,
				placeholder: "the row default",
				onChange: (e) => {
					onDraft.setDraftStrength(e.target.value);
				}
			}))) : (0, react.createElement)("div", { className: card_module_css_default.modLeafFields }, (k.fields ?? []).map((f) => (0, react.createElement)("label", {
				key: f.name,
				className: card_module_css_default.modField
			}, f.label ?? f.name, (0, react.createElement)(SpecAtom, {
				f,
				value: onDraft.draftParams[f.name],
				onEdit: (name, v) => {
					onDraft.setDraftParams({
						...onDraft.draftParams,
						[name]: v
					});
				},
				square: own.square(f)
			}))), own.wireMenu), (0, react.createElement)("div", { className: card_module_css_default.modLeafActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				onClick: onSave
			}, leaf.mode === "create" ? "Add" : "Save"), leaf.mode === "edit" ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				onClick: onDelete
			}, "Remove") : null));
		}
		/** One mod tile (the original, verbatim: useSortable + click to
		*  edit + strength to 2 decimals). */
		/** The reorder drag's MIME (native HTML5 sortable). */
		const MOD_DRAG_MIME = "application/x-melite-mod";
		function ModTile(props) {
			return (0, react.createElement)("li", {
				className: card_module_css_default.modTile + (props.dragging ? " " + card_module_css_default.tileDragging : "") + (props.dragOver ? " " + card_module_css_default.modTileOver : ""),
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
			}, (0, react.createElement)("span", { className: card_module_css_default.modTileLabel }, props.label), props.strength !== void 0 ? (0, react.createElement)("span", { className: card_module_css_default.modTileStrength }, props.strength.toFixed(2)) : null);
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* ideogram4-studio — the compositional-deconstruction layout editor
		* ported onto cards.stage.view (2026-09-12, the all-cards port order).
		*
		* THE 1:1 SOURCE: packages/image/ideogram4/src/ui/studio/ (the old
		* editor's tenant — component.tsx/IdeogramCanvas.tsx/IdeoPanels.tsx/
		* ideoHelpers.ts/slot.tsx). The helpers are ported VERBATIM (pure TS:
		* the 0–1000 grid law, snap 25, MIN_BOX 30, the caption bridge, the
		* PNG tEXt/zTXt re-inflation). The canvas is the same DOM-overlay law:
		* no canvas library, aspect-ratio box + % offsets, pointer events
		* converted back to grid units via getBoundingClientRect.
		*
		* THE HOST TRANSLATION (the slot.tsx bridge): the draft's `prompt`
		* param IS the assembled caption JSON string; width/height are their
		* own params. Edits are local until Run — then patch-the-domain-first
		* (the drill's law). No toast infra in the host: feedback rides inline
		* status text. No lucide icons: text labels.
		*/
		const GRID_SIZE = 1e3;
		const MIN_BOX = 30;
		const SNAP_UNITS = 25;
		const CANVAS_MAX_HEIGHT = 400;
		/** Aspect presets — width/height multiples of 16 (the Ideogram requirement). */
		const ASPECT_PRESETS = [
			{
				id: "1:1",
				label: "Square",
				w: 1024,
				h: 1024
			},
			{
				id: "3:2",
				label: "Photo LS",
				w: 1216,
				h: 832
			},
			{
				id: "2:3",
				label: "Photo PT",
				w: 832,
				h: 1216
			},
			{
				id: "16:9",
				label: "Wide",
				w: 1280,
				h: 768
			},
			{
				id: "9:16",
				label: "Story",
				w: 768,
				h: 1280
			},
			{
				id: "4:3",
				label: "Landscape",
				w: 1024,
				h: 768
			},
			{
				id: "3:4",
				label: "Portrait",
				w: 768,
				h: 1024
			}
		];
		const PALETTE_PRESETS = [
			{
				name: "Sunset",
				colors: [
					"#FF6B35",
					"#F7B801",
					"#7B2D26"
				]
			},
			{
				name: "Ocean",
				colors: [
					"#023E8A",
					"#0077B6",
					"#48CAE4"
				]
			},
			{
				name: "Forest",
				colors: [
					"#1B4332",
					"#40916C",
					"#95D5B2"
				]
			},
			{
				name: "Mono",
				colors: [
					"#0A0A0A",
					"#525252",
					"#FAFAFA"
				]
			},
			{
				name: "Candy",
				colors: [
					"#FF6B9D",
					"#FEC8D8",
					"#C8B6FF"
				]
			},
			{
				name: "Cyber",
				colors: [
					"#FF00E5",
					"#00F0FF",
					"#FFE600"
				]
			},
			{
				name: "Earth",
				colors: [
					"#5C3D2E",
					"#8B5E3C",
					"#D4A373"
				]
			},
			{
				name: "Cherry",
				colors: [
					"#9B1B30",
					"#C73E1D",
					"#F4A261"
				]
			}
		];
		const STYLE_PRESETS = [
			{
				name: "Cinematic photo",
				style_type: "photo",
				aesthetics: "cinematic, dramatic, shallow depth of field",
				lighting: "golden hour rim light, soft fill",
				medium: "35mm film, anamorphic",
				style_value: "shot on Kodak Portra 400, grainy, natural color",
				palette: [
					"#2B1810",
					"#C9A063",
					"#F2E8DC"
				]
			},
			{
				name: "Studio product",
				style_type: "photo",
				aesthetics: "clean, commercial, high-key",
				lighting: "softbox studio lighting, even illumination",
				medium: "digital photograph, 50mm",
				style_value: "professional product photography, crisp focus",
				palette: [
					"#FFFFFF",
					"#E5E5E5",
					"#1A1A1A"
				]
			},
			{
				name: "Oil painting",
				style_type: "art_style",
				aesthetics: "classical, painterly, rich textures",
				lighting: "chiaroscuro, warm directional light",
				medium: "oil on canvas",
				style_value: "Baroque oil painting, Rembrandt-inspired",
				palette: [
					"#3B2A1A",
					"#8B6B3D",
					"#D4B483"
				]
			},
			{
				name: "Anime cel",
				style_type: "art_style",
				aesthetics: "vibrant, clean linework, expressive",
				lighting: "flat shading with rim highlights",
				medium: "digital illustration",
				style_value: "modern anime cel shading, Studio Trigger style",
				palette: [
					"#FF4FA3",
					"#4FC3FF",
					"#FFD54F"
				]
			},
			{
				name: "Watercolor",
				style_type: "art_style",
				aesthetics: "soft, flowing, organic",
				lighting: "diffused natural light",
				medium: "watercolor on cold-press paper",
				style_value: "loose watercolor washes, pigment bleeds",
				palette: [
					"#A8DADC",
					"#F1FAEE",
					"#E63946"
				]
			}
		];
		const FONT_PRESETS = [
			"bold geometric sans-serif, all caps",
			"elegant high-contrast serif, uppercase",
			"heavy condensed sans-serif, italic",
			"thin minimalist sans-serif, lowercase",
			"brush script, hand-painted feel",
			"art deco serif, wide stance",
			"mono-spaced typewriter, regular weight",
			"stencil sans-serif, military style",
			"retro rounded sans-serif, 1960s feel",
			"graffiti bubble letters, outlined"
		];
		let _idSeq = 0;
		function genId(prefix = "el") {
			_idSeq += 1;
			return `${prefix}_${Date.now().toString(36)}_${_idSeq}`;
		}
		function clamp(v, lo, hi) {
			return Math.max(lo, Math.min(hi, v));
		}
		function clampBbox(bbox) {
			let [ymin, xmin, ymax, xmax] = bbox;
			if (xmin > xmax) {
				const t = xmin;
				xmin = xmax;
				xmax = t;
			}
			if (ymin > ymax) {
				const t = ymin;
				ymin = ymax;
				ymax = t;
			}
			return [
				clamp(Math.round(ymin), 0, GRID_SIZE),
				clamp(Math.round(xmin), 0, GRID_SIZE),
				clamp(Math.round(ymax), 0, GRID_SIZE),
				clamp(Math.round(xmax), 0, GRID_SIZE)
			];
		}
		function bboxToRect(bbox) {
			const [ymin, xmin, ymax, xmax] = bbox;
			return {
				x: xmin,
				y: ymin,
				w: Math.max(0, xmax - xmin),
				h: Math.max(0, ymax - ymin)
			};
		}
		function snap(v, enabled) {
			if (!enabled) return v;
			return Math.round(v / SNAP_UNITS) * SNAP_UNITS + 0;
		}
		function normalizeHex(input) {
			let s = input.trim();
			if (!s) return null;
			if (!s.startsWith("#")) s = "#" + s;
			if (/^#[0-9a-fA-F]{3}$/.test(s)) s = "#" + s.slice(1).split("").map((c) => c + c).join("");
			if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
			return s.toUpperCase();
		}
		function sanitizeHexList(input) {
			return input.split(/[,\s]+/).map((s) => normalizeHex(s)).filter((s) => !!s);
		}
		function isValidElementsArray(parsed) {
			if (!Array.isArray(parsed)) return false;
			return parsed.every((el) => {
				if (!el || typeof el !== "object") return false;
				const e = el;
				if (e["type"] !== "obj" && e["type"] !== "text" && e["type"] !== "logo") return false;
				if (typeof e["desc"] !== "string" && typeof e["description"] !== "string") return false;
				if (e["bbox"] !== void 0 && !Array.isArray(e["bbox"])) return false;
				return true;
			});
		}
		/** Parse a JSON string into the internal shape, filling defaults; null if invalid. */
		function parseElementsJSON(raw) {
			if (!raw || !raw.trim()) return [];
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return null;
			}
			if (!isValidElementsArray(parsed)) return null;
			return parsed.map((el, idx) => {
				const type = el["type"] === "text" ? "text" : el["type"] === "logo" ? "logo" : "obj";
				const rawBbox = el["bbox"];
				let bbox = [
					200,
					200,
					500,
					500
				];
				if (Array.isArray(rawBbox) && rawBbox.length === 4 && rawBbox.every((v) => typeof v === "number")) bbox = clampBbox(rawBbox);
				const paletteSrc = el["color_palette"] ?? el["palette"] ?? [];
				const color_palette = Array.isArray(paletteSrc) ? paletteSrc.map((c) => normalizeHex(String(c))).filter((c) => !!c).slice(0, 5) : [];
				const rawDesc = el["desc"] ?? el["description"] ?? "";
				const rawText = el["text"] ?? "";
				const rawFont = el["font"] ?? "";
				const hasText = type === "text" || type === "logo";
				return {
					id: genId(`imp${idx}`),
					type,
					desc: typeof rawDesc === "string" ? rawDesc : String(rawDesc ?? ""),
					text: hasText ? typeof rawText === "string" ? rawText : String(rawText ?? "") : void 0,
					font: hasText && typeof rawFont === "string" && rawFont ? rawFont : void 0,
					bbox,
					color_palette
				};
			});
		}
		/** Serialize internal elements back to the wire JSON string. */
		function serializeElements(elements) {
			const out = elements.map((el) => {
				const obj = {
					type: el.type,
					bbox: el.bbox,
					desc: el.desc
				};
				if (el.type === "text" || el.type === "logo") obj["text"] = el.text ?? "";
				if ((el.type === "text" || el.type === "logo") && el.font) obj["font"] = el.font;
				if (el.color_palette.length > 0) obj["color_palette"] = el.color_palette;
				return obj;
			});
			return JSON.stringify(out);
		}
		/** Extract the Ideogram caption from a PNG's tEXt/zTXt chunks (verbatim). */
		async function extractIdeogramCaptionFromPNG(file) {
			const buf = new Uint8Array(await file.arrayBuffer());
			if (buf.length < 8) return null;
			if (![
				137,
				80,
				78,
				71,
				13,
				10,
				26,
				10
			].every((b, i) => buf[i] === b)) return null;
			const textChunks = {};
			let off = 8;
			const decoder = new TextDecoder("utf-8");
			while (off + 8 <= buf.length) {
				const len = buf[off] << 24 | buf[off + 1] << 16 | buf[off + 2] << 8 | buf[off + 3];
				const type = decoder.decode(buf.slice(off + 4, off + 8));
				const dataStart = off + 8;
				const dataEnd = dataStart + len;
				if (dataEnd > buf.length) break;
				if (type === "tEXt") {
					const payload = decoder.decode(buf.slice(dataStart, dataEnd));
					const nul = payload.indexOf("\0");
					if (nul > 0) textChunks[payload.slice(0, nul)] = payload.slice(nul + 1);
				} else if (type === "zTXt") try {
					const payload = decoder.decode(buf.slice(dataStart, dataEnd));
					const nul = payload.indexOf("\0", 1);
					if (nul > 0) {
						const compData = buf.slice(dataStart + nul + 2, dataEnd);
						if (typeof DecompressionStream !== "undefined") {
							const ds = new DecompressionStream("deflate");
							const stream = new Blob([compData]).stream().pipeThrough(ds);
							textChunks[payload.slice(0, nul)] = await new Response(stream).text();
						}
					}
				} catch {}
				else if (type === "IEND") break;
				off = dataEnd + 4;
			}
			const candidates = [
				textChunks["prompt"],
				textChunks["parameters"],
				textChunks["Caption"],
				textChunks["caption"],
				textChunks["IdeogramCaption"],
				textChunks["Description"]
			].filter((v) => !!v);
			for (const c of candidates) {
				const trimmed = c.trim();
				if (trimmed.startsWith("{")) try {
					const cd = JSON.parse(trimmed)?.["compositional_deconstruction"];
					if (Array.isArray(cd?.["elements"])) {
						const parsed = parseElementsJSON(JSON.stringify(cd["elements"]));
						if (parsed) return parsed;
					}
				} catch {}
				const jsonMatch = trimmed.match(/\{[\s\S]*"compositional_deconstruction"[\s\S]*\}/);
				if (jsonMatch) try {
					const cd = JSON.parse(jsonMatch[0])?.["compositional_deconstruction"];
					if (Array.isArray(cd?.["elements"])) {
						const parsed = parseElementsJSON(JSON.stringify(cd["elements"]));
						if (parsed) return parsed;
					}
				} catch {}
			}
			return null;
		}
		/** Parse the field value (object or JSON string) into a partial caption. */
		function parseCaptionValue(raw) {
			if (!raw) return {};
			if (typeof raw === "string") try {
				return JSON.parse(raw);
			} catch {
				return {};
			}
			if (typeof raw === "object") return raw;
			return {};
		}
		/** Flatten caption object → the editor's flat values record (verbatim). */
		function flattenCaption(rawCaption, width, height) {
			const c = parseCaptionValue(rawCaption);
			const sd = c.style_description ?? {};
			let styleType = "none";
			let styleValue = "";
			if (typeof sd.photo === "string") {
				styleType = "photo";
				styleValue = sd.photo;
			} else if (typeof sd.art_style === "string") {
				styleType = "art_style";
				styleValue = sd.art_style;
			}
			const cd = c.compositional_deconstruction ?? {
				background: "",
				elements: []
			};
			return {
				high_level_description: c.high_level_description ?? "",
				style_type: styleType,
				aesthetics: sd.aesthetics ?? "",
				lighting: sd.lighting ?? "",
				medium: sd.medium ?? "",
				style_value: styleValue,
				style_palette: Array.isArray(sd.color_palette) ? sd.color_palette.join(", ") : "",
				background: cd.background ?? "",
				elements: JSON.stringify(cd.elements ?? []),
				width,
				height
			};
		}
		/** Assemble the editor's flat values → caption object for the wire (verbatim). */
		function assembleCaption(v) {
			const styleType = String(v["style_type"] ?? "none");
			const out = {};
			const hld = String(v["high_level_description"] ?? "").trim();
			if (hld) out.high_level_description = hld;
			if (styleType !== "none") {
				const sd = {};
				const a = String(v["aesthetics"] ?? "").trim();
				const l = String(v["lighting"] ?? "").trim();
				const m = String(v["medium"] ?? "").trim();
				const sv = String(v["style_value"] ?? "").trim();
				if (a) sd.aesthetics = a;
				if (l) sd.lighting = l;
				if (m) sd.medium = m;
				if (styleType === "photo" && sv) sd.photo = sv;
				if (styleType === "art_style" && sv) sd.art_style = sv;
				const palette = sanitizeHexList(String(v["style_palette"] ?? ""));
				if (palette.length) sd.color_palette = palette;
				if (Object.keys(sd).length) out.style_description = sd;
			}
			const bg = String(v["background"] ?? "").trim();
			let elements = [];
			try {
				const parsed = JSON.parse(String(v["elements"] ?? "[]"));
				if (Array.isArray(parsed)) elements = parsed;
			} catch {}
			out.compositional_deconstruction = {
				background: bg || "(describe the scene background)",
				elements
			};
			return out;
		}
		const HANDLE_DEFS = [
			{
				id: "nw",
				pos: {
					left: "0%",
					top: "0%"
				}
			},
			{
				id: "n",
				pos: {
					left: "50%",
					top: "0%"
				}
			},
			{
				id: "ne",
				pos: {
					left: "100%",
					top: "0%"
				}
			},
			{
				id: "e",
				pos: {
					left: "100%",
					top: "50%"
				}
			},
			{
				id: "se",
				pos: {
					left: "100%",
					top: "100%"
				}
			},
			{
				id: "s",
				pos: {
					left: "50%",
					top: "100%"
				}
			},
			{
				id: "sw",
				pos: {
					left: "0%",
					top: "100%"
				}
			},
			{
				id: "w",
				pos: {
					left: "0%",
					top: "50%"
				}
			}
		];
		/** The keys the studio OWNS (never generic fields): prompt is the
		*  assembled caption, width/height the aspect dropdown's. */
		const SPEC_EXCLUDED = /* @__PURE__ */ new Set([
			"prompt",
			"width",
			"height"
		]);
		/** The ideogram studio — registered under key 'ideogram4'. */
		function Ideogram4Studio(props) {
			const { row, runStatus, onPatch, onRun, onStop, onRemove, onSurface } = props;
			const params = typeof row["params"] === "object" && row["params"] !== null ? row["params"] : {};
			const [values, setValues] = (0, react.useState)(() => flattenCaption(params["prompt"], Number(params["width"] ?? 1024) || 1024, Number(params["height"] ?? 1024) || 1024));
			const { spec: servedSpec } = useFormSpec(typeof props["cardName"] === "string" ? props["cardName"] : "");
			const [spec, setSpec] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (servedSpec === null) return;
				const rest = servedSpec.fields.filter((f) => !SPEC_EXCLUDED.has(f.name));
				setSpec({
					...servedSpec,
					fields: rest
				});
				setValues((prev) => ({
					...specDefaults(rest),
					...params,
					...prev
				}));
			}, [servedSpec]);
			const [elements, setElementsInternal] = (0, react.useState)(() => parseElementsJSON(String(values["elements"] ?? "[]")) ?? []);
			const [selectedIds, setSelectedIds] = (0, react.useState)([]);
			const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
			const setSelectedId = (0, react.useCallback)((id) => {
				setSelectedIds(id ? [id] : []);
			}, []);
			const toggleSelected = (0, react.useCallback)((id) => {
				setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
			}, []);
			const [tab, setTab] = (0, react.useState)("elements");
			const [showGrid, setShowGrid] = (0, react.useState)(true);
			const [snapEnabled, setSnapEnabled] = (0, react.useState)(true);
			const [status, setStatus] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				onSurface("huge");
			}, [onSurface]);
			const elementsRef = (0, react.useRef)(elements);
			(0, react.useEffect)(() => {
				elementsRef.current = elements;
			}, [elements]);
			const lastWrittenRef = (0, react.useRef)(String(values["elements"] ?? "[]"));
			const lastIngestedRef = (0, react.useRef)(String(values["elements"] ?? "[]"));
			(0, react.useEffect)(() => {
				const incoming = String(values["elements"] ?? "[]");
				if (incoming === lastWrittenRef.current) return;
				if (incoming === lastIngestedRef.current) return;
				lastIngestedRef.current = incoming;
				const parsed = parseElementsJSON(incoming);
				if (parsed !== null) setElementsInternal(parsed);
			}, [values["elements"]]);
			const writeBack = (0, react.useCallback)((next) => {
				const json = serializeElements(next);
				lastWrittenRef.current = json;
				lastIngestedRef.current = json;
				setValues((prev) => ({
					...prev,
					elements: json
				}));
			}, []);
			const commitElements = (0, react.useCallback)((updater) => {
				const next = updater(elementsRef.current);
				elementsRef.current = next;
				setElementsInternal(next);
				writeBack(next);
			}, [writeBack]);
			const updateElement = (0, react.useCallback)((id, patch) => {
				commitElements((prev) => prev.map((el) => el.id === id ? {
					...el,
					...patch
				} : el));
			}, [commitElements]);
			const addElement = (0, react.useCallback)((type) => {
				const hasText = type === "text" || type === "logo";
				const w = hasText ? 500 : 350;
				const h = type === "text" ? 120 : type === "logo" ? 200 : 300;
				const xmin = Math.round((GRID_SIZE - w) / 2);
				const ymin = Math.round((GRID_SIZE - h) / 2);
				const newEl = {
					id: genId(type),
					type,
					desc: "",
					text: hasText ? "" : void 0,
					bbox: clampBbox([
						ymin,
						xmin,
						ymin + h,
						xmin + w
					]),
					color_palette: []
				};
				commitElements((prev) => [...prev, newEl]);
				setSelectedId(newEl.id);
				setTab("elements");
			}, [commitElements]);
			const deleteElement = (0, react.useCallback)((id) => {
				commitElements((prev) => prev.filter((el) => el.id !== id));
				setSelectedIds((prev) => prev.filter((x) => x !== id));
			}, [commitElements]);
			const duplicateElement = (0, react.useCallback)((id) => {
				commitElements((prev) => {
					const src = prev.find((e) => e.id === id);
					if (!src) return prev;
					const copy = {
						...src,
						id: genId(src.type),
						bbox: clampBbox([
							Math.min(src.bbox[0] + 40, 950),
							Math.min(src.bbox[1] + 40, 950),
							0,
							0
						]),
						color_palette: [...src.color_palette]
					};
					copy.bbox[2] = Math.min(GRID_SIZE, copy.bbox[0] + (src.bbox[2] - src.bbox[0]));
					copy.bbox[3] = Math.min(GRID_SIZE, copy.bbox[1] + (src.bbox[3] - src.bbox[1]));
					copy.bbox = clampBbox(copy.bbox);
					setSelectedId(copy.id);
					return [...prev, copy];
				});
			}, [commitElements]);
			const reorder = (0, react.useCallback)((id, dir) => {
				commitElements((prev) => {
					const idx = prev.findIndex((e) => e.id === id);
					if (idx === -1) return prev;
					const next = prev.filter((_, i) => i !== idx);
					if (dir === "front") return [...next, prev[idx]];
					return [prev[idx], ...next];
				});
			}, [commitElements]);
			const handleImportElements = (0, react.useCallback)((next, source) => {
				commitElements(() => next);
				setSelectedId(null);
				setStatus(`Loaded ${next.length} element${next.length === 1 ? "" : "s"} from ${source}`);
			}, [commitElements]);
			const pngInputRef = (0, react.useRef)(null);
			const handlePngPick = (0, react.useCallback)(async (e) => {
				const input = e.target;
				const file = input.files?.[0];
				input.value = "";
				if (!file) return;
				if (!file.type.includes("png")) {
					setStatus("Only PNG files can be re-inflated");
					return;
				}
				try {
					const parsed = await extractIdeogramCaptionFromPNG(file);
					if (!parsed) {
						setStatus("No Ideogram caption found in PNG metadata");
						return;
					}
					handleImportElements(parsed, `PNG metadata (${file.name})`);
				} catch (err) {
					setStatus(err instanceof Error ? err.message : "Failed to read PNG");
				}
			}, [handleImportElements]);
			const selected = (0, react.useMemo)(() => elements.find((e) => e.id === selectedId) ?? null, [elements, selectedId]);
			const width = Number(values["width"] ?? 1024) || 1024;
			const height = Number(values["height"] ?? 1024) || 1024;
			(0, react.useEffect)(() => {
				const handler = (e) => {
					const t = e.target;
					if (t !== null && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) && e.key !== "Escape") return;
					if (selectedIds.length === 0) {
						if (e.key === "Escape") setSelectedIds([]);
						return;
					}
					const step = e.shiftKey ? 50 : 10;
					if (e.key === "Escape") {
						setSelectedIds([]);
						return;
					}
					if (e.key === "Delete" || e.key === "Backspace") {
						e.preventDefault();
						commitElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)));
						setSelectedIds([]);
						return;
					}
					if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
						e.preventDefault();
						const ids = [...selectedIds];
						commitElements((prev) => {
							const copies = [];
							for (const src of prev) {
								if (!ids.includes(src.id)) continue;
								const copy = {
									...src,
									id: genId(src.type),
									bbox: clampBbox([
										Math.min(src.bbox[0] + 40, 950),
										Math.min(src.bbox[1] + 40, 950),
										0,
										0
									]),
									color_palette: [...src.color_palette]
								};
								copy.bbox[2] = Math.min(GRID_SIZE, copy.bbox[0] + (src.bbox[2] - src.bbox[0]));
								copy.bbox[3] = Math.min(GRID_SIZE, copy.bbox[1] + (src.bbox[3] - src.bbox[1]));
								copy.bbox = clampBbox(copy.bbox);
								copies.push(copy);
							}
							return [...prev, ...copies];
						});
						return;
					}
					let dy = 0;
					let dx = 0;
					switch (e.key) {
						case "ArrowUp":
							dy = -step;
							break;
						case "ArrowDown":
							dy = step;
							break;
						case "ArrowLeft":
							dx = -step;
							break;
						case "ArrowRight":
							dx = step;
							break;
						default: return;
					}
					e.preventDefault();
					const ids = [...selectedIds];
					commitElements((prev) => prev.map((el) => {
						if (!ids.includes(el.id)) return el;
						const [ymin, xmin, ymax, xmax] = el.bbox;
						const ow = xmax - xmin;
						const oh = ymax - ymin;
						const nxmin = clamp(xmin + dx, 0, GRID_SIZE - ow);
						const nymin = clamp(ymin + dy, 0, GRID_SIZE - oh);
						return {
							...el,
							bbox: [
								nymin,
								nxmin,
								nymin + oh,
								nxmin + ow
							]
						};
					}));
				};
				window.addEventListener("keydown", handler);
				return () => {
					window.removeEventListener("keydown", handler);
				};
			}, [selectedIds, commitElements]);
			(0, react.useEffect)(() => {
				if (selectedId !== null) setTab("elements");
			}, [selectedId]);
			const containerRef = (0, react.useRef)(null);
			const [mode, setMode] = (0, react.useState)({ kind: "idle" });
			const [editingTextId, setEditingTextId] = (0, react.useState)(null);
			const [inlineText, setInlineText] = (0, react.useState)("");
			const commitInlineText = (0, react.useCallback)(() => {
				const id = editingTextId;
				if (id === null) return;
				const val = inlineText;
				onCommitMap((prev) => prev.map((el) => el.id === id ? {
					...el,
					text: val
				} : el));
				setEditingTextId(null);
			}, [editingTextId, inlineText]);
			function onCommitMap(updater) {
				commitElements(updater);
			}
			const toLocal = (0, react.useCallback)((clientX, clientY) => {
				const el = containerRef.current;
				if (el === null) return {
					x: 0,
					y: 0
				};
				const r = el.getBoundingClientRect();
				return {
					x: clamp((clientX - r.left) / r.width * GRID_SIZE, 0, GRID_SIZE),
					y: clamp((clientY - r.top) / r.height * GRID_SIZE, 0, GRID_SIZE)
				};
			}, []);
			const patchBbox = (0, react.useCallback)((id, next) => {
				commitElements((prev) => prev.map((el) => el.id === id ? {
					...el,
					bbox: clampBbox(next)
				} : el));
			}, [commitElements]);
			const handleCanvasPointerDown = (0, react.useCallback)((e) => {
				if (e.button !== 0) return;
				const target = e.target;
				if (!(target === containerRef.current || target.dataset["canvasBg"] === "1" || target.dataset["grid"] === "1")) return;
				const { x, y } = toLocal(e.clientX, e.clientY);
				setSelectedId(null);
				try {
					containerRef.current?.setPointerCapture(e.pointerId);
				} catch {}
				setMode({
					kind: "draw",
					startX: x,
					startY: y,
					curX: x,
					curY: y
				});
			}, [toLocal, setSelectedId]);
			const handleBoxPointerDown = (0, react.useCallback)((e, el) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				if (e.ctrlKey || e.metaKey) {
					toggleSelected(el.id);
					return;
				}
				const groupDrag = selectedIds.includes(el.id) && selectedIds.length > 1;
				if (!groupDrag) setSelectedId(el.id);
				const subjects = (groupDrag ? selectedIds : [el.id]).map((id) => {
					const found = elements.find((x) => x.id === id);
					return found !== void 0 ? {
						id,
						origBbox: found.bbox
					} : null;
				}).filter((s) => s !== null);
				const { x, y } = toLocal(e.clientX, e.clientY);
				try {
					containerRef.current?.setPointerCapture(e.pointerId);
				} catch {}
				setMode({
					kind: "move",
					startX: x,
					startY: y,
					subjects
				});
			}, [
				toLocal,
				setSelectedId,
				toggleSelected,
				selectedIds,
				elements
			]);
			const handleHandlePointerDown = (0, react.useCallback)((e, el, handle) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				const { x, y } = toLocal(e.clientX, e.clientY);
				try {
					containerRef.current?.setPointerCapture(e.pointerId);
				} catch {}
				setMode({
					kind: "resize",
					id: el.id,
					handle,
					startX: x,
					startY: y,
					origBbox: el.bbox
				});
			}, [toLocal]);
			const handlePointerMove = (0, react.useCallback)((e) => {
				if (mode.kind === "idle") return;
				const { x, y } = toLocal(e.clientX, e.clientY);
				if (mode.kind === "draw") {
					setMode({
						...mode,
						curX: x,
						curY: y
					});
					return;
				}
				if (mode.kind === "move") {
					let dx = x - mode.startX;
					let dy = y - mode.startY;
					if (snapEnabled) {
						dx = snap(dx, true);
						dy = snap(dy, true);
					}
					const finalDx = dx;
					const finalDy = dy;
					commitElements((prev) => prev.map((el) => {
						const subj = mode.subjects.find((s) => s.id === el.id);
						if (subj === void 0) return el;
						const [oymin, oxmin, oymax, oxmax] = subj.origBbox;
						const ow = oxmax - oxmin;
						const oh = oymax - oymin;
						const nxmin = clamp(oxmin + finalDx, 0, GRID_SIZE - ow);
						const nymin = clamp(oymin + finalDy, 0, GRID_SIZE - oh);
						return {
							...el,
							bbox: [
								nymin,
								nxmin,
								nymin + oh,
								nxmin + ow
							]
						};
					}));
					return;
				}
				if (mode.kind === "resize") {
					const [oymin, oxmin, oymax, oxmax] = mode.origBbox;
					let nxmin = oxmin;
					let nymin = oymin;
					let nxmax = oxmax;
					let nymax = oymax;
					let nx = x;
					let ny = y;
					if (snapEnabled) {
						nx = snap(nx, true);
						ny = snap(ny, true);
					}
					const hd = mode.handle;
					if (hd.includes("w")) nxmin = clamp(nx, 0, nxmax - MIN_BOX);
					if (hd.includes("e")) nxmax = clamp(nx, nxmin + MIN_BOX, GRID_SIZE);
					if (hd.includes("n")) nymin = clamp(ny, 0, nymax - MIN_BOX);
					if (hd.includes("s")) nymax = clamp(ny, nymin + MIN_BOX, GRID_SIZE);
					patchBbox(mode.id, [
						nymin,
						nxmin,
						nymax,
						nxmax
					]);
				}
			}, [
				mode,
				toLocal,
				snapEnabled,
				patchBbox,
				commitElements
			]);
			const finishInteraction = (0, react.useCallback)((e) => {
				try {
					containerRef.current?.releasePointerCapture(e.pointerId);
				} catch {}
				if (mode.kind === "draw") {
					const { startX, startY, curX, curY } = mode;
					const xmin = Math.min(startX, curX);
					const xmax = Math.max(startX, curX);
					const ymin = Math.min(startY, curY);
					const ymax = Math.max(startY, curY);
					if (xmax - xmin >= MIN_BOX && ymax - ymin >= MIN_BOX) {
						const newEl = {
							id: genId("el"),
							type: "obj",
							desc: "",
							bbox: clampBbox([
								ymin,
								xmin,
								ymax,
								xmax
							]),
							color_palette: []
						};
						commitElements((prev) => [...prev, newEl]);
						setSelectedId(newEl.id);
					}
				}
				setMode({ kind: "idle" });
			}, [
				mode,
				commitElements,
				setSelectedId
			]);
			const run = () => {
				const patch = {
					...params,
					...spec !== null ? specPatch(spec.fields, values, params) : {},
					prompt: JSON.stringify(assembleCaption(values)),
					width,
					height
				};
				delete patch["elements"];
				onPatch(patch);
				onRun();
			};
			const ratio = width / height;
			const cssMaxWidth = Math.round(CANVAS_MAX_HEIGHT * ratio);
			const drawMode = mode.kind === "idle" ? false : mode.kind === "draw";
			const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((prev) => ({
					...prev,
					[name]: v
				}));
			}, []);
			const styleInput = (key, label) => (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, label), (0, react.createElement)("input", {
				value: String(values[key] ?? ""),
				onChange: (e) => {
					setValues((prev) => ({
						...prev,
						[key]: e.target.value
					}));
				}
			}));
			const jsonPreview = (0, react.useMemo)(() => JSON.stringify(assembleCaption(values), null, 2), [values]);
			const [jsonDraft, setJsonDraft] = (0, react.useState)("");
			const jsonParseError = (0, react.useMemo)(() => {
				if (jsonDraft.trim() === "") return null;
				return parseElementsJSON(jsonDraft) === null ? "invalid elements JSON" : null;
			}, [jsonDraft]);
			const elementsTab = selected !== null ? (0, react.createElement)("div", { className: client_module_css_default.ideoInspector }, (0, react.createElement)("div", { className: client_module_css_default.ideoInspectorHead }, (0, react.createElement)("span", {
				className: client_module_css_default.ideoTypeBadge,
				"data-ideo-type": selected.type
			}, selected.type), (0, react.createElement)("span", { className: client_module_css_default.ideoInspectorActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					reorder(selected.id, "front");
				}
			}, "↑"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					reorder(selected.id, "back");
				}
			}, "↓"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					duplicateElement(selected.id);
				}
			}, "Dup"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					deleteElement(selected.id);
				}
			}, "✕"))), selected.type !== "obj" ? (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Text content"), (0, react.createElement)("input", {
				value: selected.text ?? "",
				onChange: (e) => {
					updateElement(selected.id, { text: e.target.value });
				}
			})) : null, selected.type !== "obj" ? (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Font"), (0, react.createElement)("input", {
				value: selected.font ?? "",
				placeholder: "typography descriptor",
				onChange: (e) => {
					updateElement(selected.id, { font: e.target.value });
				}
			}), (0, react.createElement)("div", { className: client_module_css_default.ideoFontChips }, FONT_PRESETS.map((f) => (0, react.createElement)("button", {
				key: f,
				className: client_module_css_default.ideoChip,
				onClick: () => {
					updateElement(selected.id, { font: f });
				},
				title: f
			}, f.split(",")[0])))) : null, (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Description"), (0, react.createElement)("textarea", {
				rows: 2,
				value: selected.desc,
				placeholder: "what this element depicts",
				onChange: (e) => {
					updateElement(selected.id, { desc: e.target.value });
				}
			})), (0, react.createElement)("div", { className: client_module_css_default.ideoBboxRow }, [
				"ymin",
				"xmin",
				"ymax",
				"xmax"
			].map((k, i) => (0, react.createElement)("label", {
				key: k,
				className: client_module_css_default.ideoField
			}, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, k), (0, react.createElement)("input", {
				type: "number",
				value: selected.bbox[i],
				onChange: (e) => {
					const next = [...selected.bbox];
					next[i] = Number(e.target.value) || 0;
					updateElement(selected.id, { bbox: clampBbox(next) });
				}
			})))), (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Palette"), (0, react.createElement)("div", { className: client_module_css_default.ideoSwatches }, selected.color_palette.map((c, i) => (0, react.createElement)("span", {
				key: i,
				className: client_module_css_default.ideoSwatch,
				style: { background: c },
				title: `${c} — click to remove`,
				onClick: () => {
					updateElement(selected.id, { color_palette: selected.color_palette.filter((_, j) => j !== i) });
				}
			})), selected.color_palette.length < 5 ? (0, react.createElement)("input", {
				className: client_module_css_default.ideoSwatchAdd,
				placeholder: "#RRGGBB",
				onKeyDown: (e) => {
					if (e.key !== "Enter") return;
					const hex = normalizeHex(e.target.value);
					if (hex !== null) {
						updateElement(selected.id, { color_palette: [...selected.color_palette, hex] });
						e.target.value = "";
					}
				}
			}) : null), (0, react.createElement)("div", { className: client_module_css_default.ideoFontChips }, PALETTE_PRESETS.map((p) => (0, react.createElement)("button", {
				key: p.name,
				className: client_module_css_default.ideoChip,
				title: p.colors.join(" "),
				onClick: () => {
					updateElement(selected.id, { color_palette: p.colors });
				}
			}, p.name))))) : elements.length === 0 ? (0, react.createElement)("div", { className: client_module_css_default.ideoEmpty }, (0, react.createElement)("p", null, "Drag on the canvas to create a box, or add:"), (0, react.createElement)("div", null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: () => {
					addElement("obj");
				}
			}, "+ Object"), " ", (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: () => {
					addElement("text");
				}
			}, "+ Text"), " ", (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: () => {
					addElement("logo");
				}
			}, "+ Logo"))) : (0, react.createElement)("div", { className: client_module_css_default.ideoList }, [...elements].reverse().map((el) => {
				const r = bboxToRect(el.bbox);
				return (0, react.createElement)("div", {
					key: el.id,
					className: selectedIds.includes(el.id) ? `${client_module_css_default.ideoRow} ${client_module_css_default.ideoRowOn}` : client_module_css_default.ideoRow,
					onClick: (e) => {
						if (e.ctrlKey || e.metaKey) toggleSelected(el.id);
						else setSelectedId(el.id);
					}
				}, (0, react.createElement)("span", {
					className: client_module_css_default.ideoRowBadge,
					"data-ideo-type": el.type
				}, el.type), (0, react.createElement)("span", { className: client_module_css_default.ideoRowText }, el.type === "obj" ? el.desc || "—" : `“${el.text || el.type}”`), (0, react.createElement)("span", { className: client_module_css_default.ideoRowBbox }, `${r.w}×${r.h}`), (0, react.createElement)("span", { className: client_module_css_default.ideoRowPalette }, el.color_palette.map((c, i) => (0, react.createElement)("span", {
					key: i,
					style: { background: c },
					className: client_module_css_default.ideoMiniSwatch
				}))), (0, react.createElement)("span", { className: client_module_css_default.ideoRowActions }, (0, react.createElement)("button", {
					title: "bring to front",
					onClick: (e) => {
						e.stopPropagation();
						reorder(el.id, "front");
					}
				}, "↑"), (0, react.createElement)("button", {
					title: "send to back",
					onClick: (e) => {
						e.stopPropagation();
						reorder(el.id, "back");
					}
				}, "↓"), (0, react.createElement)("button", {
					title: "duplicate",
					onClick: (e) => {
						e.stopPropagation();
						duplicateElement(el.id);
					}
				}, "⧉"), (0, react.createElement)("button", {
					title: "delete",
					onClick: (e) => {
						e.stopPropagation();
						deleteElement(el.id);
					}
				}, "✕")));
			}));
			const styleTab = (0, react.createElement)("div", { className: client_module_css_default.ideoStylePanel }, (0, react.createElement)("div", { className: client_module_css_default.ideoFontChips }, STYLE_PRESETS.map((p) => (0, react.createElement)("button", {
				key: p.name,
				className: client_module_css_default.ideoChip,
				title: `${p.style_value} · ${p.palette.join(" ")}`,
				onClick: () => {
					setValues((prev) => ({
						...prev,
						style_type: p.style_type,
						aesthetics: p.aesthetics,
						lighting: p.lighting,
						medium: p.medium,
						style_value: p.style_value,
						style_palette: p.palette.join(", ")
					}));
				}
			}, p.name))), (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "High-level description"), (0, react.createElement)("input", {
				value: String(values["high_level_description"] ?? ""),
				onChange: (e) => {
					setValues((prev) => ({
						...prev,
						high_level_description: e.target.value
					}));
				}
			})), (0, react.createElement)("div", { className: client_module_css_default.ideoBboxRow }, [
				"none",
				"photo",
				"art_style"
			].map((st) => (0, react.createElement)("button", {
				key: st,
				className: values["style_type"] === st ? `${client_module_css_default.ideoChip} ${client_module_css_default.ideoChipOn}` : client_module_css_default.ideoChip,
				onClick: () => {
					setValues((prev) => ({
						...prev,
						style_type: st
					}));
				}
			}, st))), styleInput("aesthetics", "Aesthetics"), styleInput("lighting", "Lighting"), styleInput("medium", "Medium"), String(values["style_type"]) !== "none" ? styleInput("style_value", String(values["style_type"]) === "photo" ? "Photo detail" : "Art style") : null, (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Style palette"), (0, react.createElement)("input", {
				value: String(values["style_palette"] ?? ""),
				placeholder: "#FF6B35, #F7B801",
				onChange: (e) => {
					setValues((prev) => ({
						...prev,
						style_palette: e.target.value
					}));
				}
			}), (0, react.createElement)("div", { className: client_module_css_default.ideoSwatches }, sanitizeHexList(String(values["style_palette"] ?? "")).slice(0, 8).map((c, i) => (0, react.createElement)("span", {
				key: i,
				className: client_module_css_default.ideoSwatch,
				style: { background: c }
			})))));
			const jsonTab = (0, react.createElement)("div", { className: client_module_css_default.ideoJsonPanel }, (0, react.createElement)("div", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Caption (read-only — what Run sends)"), (0, react.createElement)("pre", { className: client_module_css_default.ideoPre }, jsonPreview)), (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Elements JSON — paste + Apply"), (0, react.createElement)("textarea", {
				rows: 6,
				value: jsonDraft,
				placeholder: "[{\"type\":\"obj\",\"desc\":\"…\",\"bbox\":[200,200,500,500]}]",
				onChange: (e) => {
					setJsonDraft(e.target.value);
				}
			})), jsonParseError !== null ? (0, react.createElement)("div", { className: client_module_css_default.ideoWarn }, jsonParseError) : null, (0, react.createElement)("div", { className: client_module_css_default.ideoToolbar }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				disabled: jsonParseError !== null || jsonDraft.trim() === "",
				onClick: () => {
					const parsed = parseElementsJSON(jsonDraft);
					if (parsed !== null) {
						handleImportElements(parsed, "JSON paste");
						setJsonDraft("");
					}
				}
			}, "Apply elements"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					navigator.clipboard?.writeText(jsonPreview).then(() => {
						setStatus("caption copied");
					});
				}
			}, "Copy caption")));
			return (0, react.createElement)("div", { className: client_module_css_default.ideoStudio }, (0, react.createElement)("div", { className: client_module_css_default.ideoRail }, (0, react.createElement)("label", { className: client_module_css_default.ideoField }, (0, react.createElement)("span", { className: client_module_css_default.ideoFieldKey }, "Background — the scene everything exists in"), (0, react.createElement)("textarea", {
				rows: 2,
				value: String(values["background"] ?? ""),
				placeholder: "A natural wood desk against a white wall.",
				onChange: (e) => {
					setValues((prev) => ({
						...prev,
						background: e.target.value
					}));
				}
			})), (0, react.createElement)("div", { className: client_module_css_default.ideoToolbar }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: () => {
					addElement("obj");
				}
			}, "+ Object"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: () => {
					addElement("text");
				}
			}, "+ Text"), (0, react.createElement)("select", {
				className: client_module_css_default.ideoAspect,
				value: `${width}x${height}`,
				onChange: (e) => {
					const p = ASPECT_PRESETS.find((x) => `${x.w}x${x.h}` === e.target.value);
					if (p !== void 0) setValues((prev) => ({
						...prev,
						width: p.w,
						height: p.h
					}));
				}
			}, ASPECT_PRESETS.map((p) => (0, react.createElement)("option", {
				key: p.id,
				value: `${p.w}x${p.h}`
			}, `${p.id} ${p.label} ${p.w}×${p.h}`))), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					setShowGrid((g) => !g);
				}
			}, showGrid ? "Grid ✓" : "Grid"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					setSnapEnabled((s) => !s);
				}
			}, snapEnabled ? "Snap ✓" : "Snap"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					pngInputRef.current?.click();
				}
			}, "Load PNG"), elements.length > 0 ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					commitElements(() => []);
					setSelectedId(null);
				}
			}, "Clear") : null, (0, react.createElement)("input", {
				ref: pngInputRef,
				type: "file",
				accept: "image/png",
				style: { display: "none" },
				onChange: (e) => {
					handlePngPick(e);
				}
			})), status !== null ? (0, react.createElement)("div", { className: client_module_css_default.ideoStatus }, status) : null, (0, react.createElement)("div", { className: client_module_css_default.ideoTabs }, (0, react.createElement)("button", {
				className: tab === "elements" ? `${client_module_css_default.ideoTab} ${client_module_css_default.ideoTabOn}` : client_module_css_default.ideoTab,
				onClick: () => {
					setTab("elements");
				}
			}, `Elements${elements.length > 0 ? ` (${elements.length})` : ""}`), (0, react.createElement)("button", {
				className: tab === "style" ? `${client_module_css_default.ideoTab} ${client_module_css_default.ideoTabOn}` : client_module_css_default.ideoTab,
				onClick: () => {
					setTab("style");
				}
			}, "Style"), (0, react.createElement)("button", {
				className: tab === "json" ? `${client_module_css_default.ideoTab} ${client_module_css_default.ideoTabOn}` : client_module_css_default.ideoTab,
				onClick: () => {
					setTab("json");
				}
			}, "JSON")), tab === "elements" ? elementsTab : null, tab === "style" ? styleTab : null, tab === "json" ? jsonTab : null, spec !== null && spec.fields.length > 0 ? (0, react.createElement)(CardForm, {
				spec,
				fields: spec.fields,
				values,
				onEdit
			}) : null), (0, react.createElement)("div", { className: client_module_css_default.ideoCanvasWrap }, (0, react.createElement)("div", {
				ref: containerRef,
				className: `${client_module_css_default.ideoCanvas}${drawMode ? ` ${client_module_css_default.ideoCanvasDraw}` : ""}`,
				style: {
					aspectRatio: `${width} / ${height}`,
					maxWidth: `min(100%, ${cssMaxWidth}px)`
				},
				onPointerDown: handleCanvasPointerDown,
				onPointerMove: handlePointerMove,
				onPointerUp: finishInteraction,
				onPointerCancel: finishInteraction
			}, (0, react.createElement)("div", {
				"data-canvas-bg": "1",
				className: client_module_css_default.ideoCanvasBg
			}), String(values["background"] ?? "") !== "" ? (0, react.createElement)("div", { className: client_module_css_default.ideoBgText }, String(values["background"])) : null, showGrid ? (0, react.createElement)("div", {
				"data-grid": "1",
				className: client_module_css_default.ideoGridMinor
			}) : null, showGrid ? (0, react.createElement)("div", {
				"data-grid": "1",
				className: client_module_css_default.ideoGridMajor
			}) : null, elements.map((el) => {
				const r = bboxToRect(el.bbox);
				const isSel = selectedIds.includes(el.id);
				const isPrimary = el.id === primaryId;
				return (0, react.createElement)("div", {
					key: el.id,
					className: `${client_module_css_default.ideoBox} ${client_module_css_default[`ideoBox_${el.type}`] ?? ""}`,
					style: {
						left: `${r.x / 10}%`,
						top: `${r.y / 10}%`,
						width: `${r.w / 10}%`,
						height: `${r.h / 10}%`
					}
				}, isSel ? (0, react.createElement)("div", { className: `${client_module_css_default.ideoHalo} ${client_module_css_default[`ideoHalo_${el.type}`] ?? ""}` }) : null, (0, react.createElement)("div", {
					className: client_module_css_default.ideoBoxMain,
					onPointerDown: (e) => {
						handleBoxPointerDown(e, el);
					},
					onDoubleClick: el.type !== "obj" ? () => {
						setEditingTextId(el.id);
						setInlineText(el.text ?? "");
					} : void 0
				}, (0, react.createElement)("span", { className: `${client_module_css_default.ideoTag} ${client_module_css_default[`ideoTag_${el.type}`] ?? ""}` }, el.type === "obj" ? "obj" : el.type), el.type === "obj" && r.w > 60 && r.h > 80 ? (0, react.createElement)("span", { className: client_module_css_default.ideoDesc }, el.desc) : null, el.color_palette.length > 0 ? (0, react.createElement)("span", { className: client_module_css_default.ideoRowPalette }, el.color_palette.map((c, i) => (0, react.createElement)("span", {
					key: i,
					style: { background: c },
					className: client_module_css_default.ideoMiniSwatch
				}))) : null, editingTextId === el.id ? (0, react.createElement)("textarea", {
					className: client_module_css_default.ideoInlineText,
					value: inlineText,
					autoFocus: true,
					onChange: (e) => {
						setInlineText(e.target.value);
					},
					onBlur: () => {
						commitInlineText();
					},
					onKeyDown: (e) => {
						const ke = e;
						if (ke.key === "Enter" && !ke.shiftKey) {
							ke.preventDefault();
							commitInlineText();
						}
						if (ke.key === "Escape") setEditingTextId(null);
					}
				}) : null), isPrimary ? HANDLE_DEFS.map((hd) => (0, react.createElement)("div", {
					key: hd.id,
					className: `${client_module_css_default.ideoHandle} ${client_module_css_default[`ideoHandle_${hd.id}`] ?? ""}`,
					style: hd.pos,
					onPointerDown: (e) => {
						handleHandlePointerDown(e, el, hd.id);
					}
				})) : null);
			}), drawMode && mode.kind === "draw" ? (() => {
				const xmin = Math.min(mode.startX, mode.curX);
				const xmax = Math.max(mode.startX, mode.curX);
				const ymin = Math.min(mode.startY, mode.curY);
				const ymax = Math.max(mode.startY, mode.curY);
				return (0, react.createElement)("div", {
					className: client_module_css_default.ideoDrawPreview,
					style: {
						left: `${xmin / 10}%`,
						top: `${ymin / 10}%`,
						width: `${(xmax - xmin) / 10}%`,
						height: `${(ymax - ymin) / 10}%`
					}
				});
			})() : null), (0, react.createElement)("div", { className: client_module_css_default.ideoCoord }, `${width}×${height} · ${elements.length} element${elements.length === 1 ? "" : "s"}`)), (0, react.createElement)("div", { className: client_module_css_default.ideoRunRow }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				onClick: run,
				disabled: runStatus === "running"
			}, runStatus === "running" ? "Rendering…" : "Run"), runStatus === "running" ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				onClick: onStop
			}, "Stop") : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				onClick: onRemove
			}, "Remove stage")));
		}
		/** The built-in registration (the ui-tool law, verbatim — the
		* module namespace IS the plugin: the loader consumes name/inject/apply). */
		const name = "ideogram4Studio";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("cards.stage.view", () => ctx.slots.register({
				name: "cards.stage.view",
				key: "ideogram4"
			}, Ideogram4Studio));
		}
		//#endregion
		exports.Ideogram4Studio = Ideogram4Studio;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
