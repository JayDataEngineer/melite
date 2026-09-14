window.__ModuleLoader__.load({
	id: "@melite/image-ideogram4",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		require("react/jsx-runtime");
		//#region \0dsh-css:/home/user/Documents/programs/active/inference.cpp/packages/image/ideogram4/src/client/client.module.css.mjs
		const css$1 = ".K5r_la_ideoStudio{grid-template-columns:minmax(280px,360px) 1fr;gap:14px;display:grid}.K5r_la_ideoStudio :where(input,textarea,select,button){box-sizing:border-box}.K5r_la_ideoRail{flex-direction:column;gap:10px;min-width:0;display:flex}.K5r_la_ideoField{flex-direction:column;gap:5px;display:flex}.K5r_la_ideoFieldKey{color:var(--dsw-alias-label-secondary);font-size:11px}.K5r_la_ideoField input,.K5r_la_ideoField textarea,.K5r_la_ideoField select{background:var(--dsw-alias-fill-primary);border:1px solid var(--dsw-alias-outline-primary);color:var(--dsw-alias-label-primary);font:inherit;border-radius:6px;width:100%;padding:6px 8px;font-size:12px}.K5r_la_ideoToolbar{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.K5r_la_ideoAspect{background:var(--dsw-alias-fill-primary);border:1px solid var(--dsw-alias-outline-primary);color:var(--dsw-alias-label-primary);border-radius:6px;padding:5px 6px;font-size:12px}.K5r_la_ideoStatus{color:var(--dsw-alias-label-secondary);font-size:11px}.K5r_la_ideoTabs{border-bottom:1px solid var(--dsw-alias-outline-primary);gap:2px;display:flex}.K5r_la_ideoTab{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;padding:6px 10px;font-size:12px}.K5r_la_ideoTabOn{border-bottom-color:var(--dsw-alias-accent-primary);color:var(--dsw-alias-label-primary)}.K5r_la_ideoInspector,.K5r_la_ideoStylePanel,.K5r_la_ideoJsonPanel{flex-direction:column;gap:10px;display:flex}.K5r_la_ideoInspectorHead{justify-content:space-between;align-items:center;display:flex}.K5r_la_ideoInspectorActions{gap:4px;display:flex}.K5r_la_ideoTypeBadge,.K5r_la_ideoRowBadge{text-transform:uppercase;border-radius:4px;padding:2px 6px;font-size:10px}.K5r_la_ideoTypeBadge[data-ideo-type=obj],.K5r_la_ideoRowBadge[data-ideo-type=obj]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent);color:var(--dsw-alias-state-business-primary)}.K5r_la_ideoTypeBadge[data-ideo-type=text],.K5r_la_ideoRowBadge[data-ideo-type=text]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);color:var(--dsw-alias-brand-primary)}.K5r_la_ideoTypeBadge[data-ideo-type=logo],.K5r_la_ideoRowBadge[data-ideo-type=logo]{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent);color:var(--dsw-alias-state-warn-primary)}.K5r_la_ideoBboxRow{grid-template-columns:repeat(4,1fr);gap:8px;display:grid}.K5r_la_ideoFontChips{flex-wrap:wrap;gap:4px;display:flex}.K5r_la_ideoChip{background:var(--dsw-alias-fill-primary);border:1px solid var(--dsw-alias-outline-primary);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:999px;padding:3px 8px;font-size:10px}.K5r_la_ideoChipOn{border-color:var(--dsw-alias-accent-primary);color:var(--dsw-alias-accent-primary)}.K5r_la_ideoSwatches{flex-wrap:wrap;align-items:center;gap:4px;display:flex}.K5r_la_ideoSwatch{border:1px solid var(--dsw-alias-outline-primary);cursor:pointer;border-radius:4px;width:22px;height:16px;display:inline-block}.K5r_la_ideoSwatchAdd{background:var(--dsw-alias-fill-primary);border:1px dashed var(--dsw-alias-outline-primary);color:var(--dsw-alias-label-secondary);border-radius:4px;width:84px;padding:2px 6px;font-size:10px}.K5r_la_ideoMiniSwatch{border-radius:2px;width:10px;height:8px;display:inline-block}.K5r_la_ideoEmpty{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:8px;font-size:12px;display:flex}.K5r_la_ideoList{flex-direction:column;gap:4px;display:flex}.K5r_la_ideoRow{border:1px solid var(--dsw-alias-outline-primary);cursor:pointer;border-radius:6px;align-items:center;gap:8px;padding:5px 8px;display:flex}.K5r_la_ideoRowOn{border-color:var(--dsw-alias-accent-primary)}.K5r_la_ideoRowText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:12px;overflow:hidden}.K5r_la_ideoRowBbox{color:var(--dsw-alias-label-secondary);font-size:10px}.K5r_la_ideoRowActions{gap:2px;display:flex}.K5r_la_ideoRowActions button{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:2px 4px;font-size:11px}.K5r_la_ideoRowActions button:hover{color:var(--dsw-alias-label-primary)}.K5r_la_ideoPre{background:var(--dsw-alias-fill-primary);border:1px solid var(--dsw-alias-outline-primary);white-space:pre-wrap;border-radius:6px;max-height:240px;margin:0;padding:8px;font-size:10px;overflow:auto}.K5r_la_ideoWarn{color:var(--dsw-alias-state-critical);font-size:11px}.K5r_la_ideoCanvasWrap{flex-direction:column;gap:6px;min-width:0;display:flex}.K5r_la_ideoCanvas{background:var(--dsw-alias-fill-secondary);border:1px solid var(--dsw-alias-outline-primary);touch-action:none;user-select:none;border-radius:8px;width:100%;max-width:100%;margin:0 auto;position:relative;overflow:hidden}.K5r_la_ideoCanvasDraw{cursor:crosshair}.K5r_la_ideoCanvasBg{position:absolute;inset:0}.K5r_la_ideoBgText{color:var(--dsw-alias-label-secondary);opacity:.28;pointer-events:none;text-align:center;word-break:break-word;justify-content:center;align-items:center;padding:24px;font-size:14px;font-weight:600;display:flex;position:absolute;inset:0;overflow:hidden}.K5r_la_ideoGridMinor{background-image:linear-gradient(to right, color-mix(in srgb, var(--dsw-alias-label-tertiary) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--dsw-alias-label-tertiary) 6%, transparent) 1px, transparent 1px);pointer-events:none;background-size:2.5% 2.5%;position:absolute;inset:0}.K5r_la_ideoGridMajor{background-image:linear-gradient(to right, color-mix(in srgb, var(--dsw-alias-label-tertiary) 16%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--dsw-alias-label-tertiary) 16%, transparent) 1px, transparent 1px);pointer-events:none;background-size:10% 10%;position:absolute;inset:0}.K5r_la_ideoBox{position:absolute}.K5r_la_ideoBox_obj{--ideo-accent:var(--dsw-alias-state-business-primary)}.K5r_la_ideoBox_text{--ideo-accent:var(--dsw-alias-brand-primary)}.K5r_la_ideoBox_logo{--ideo-accent:var(--dsw-alias-state-warn-primary)}.K5r_la_ideoHalo{border:2px solid var(--ideo-accent,var(--dsw-alias-state-business-primary));opacity:.45;pointer-events:none;border-radius:3px;position:absolute;inset:-4px}.K5r_la_ideoBoxMain{border:1.5px solid var(--ideo-accent,var(--dsw-alias-state-business-primary));cursor:move;border-radius:4px;flex-direction:column;align-items:flex-start;gap:3px;width:100%;height:100%;padding:4px 6px;display:flex;overflow:hidden}.K5r_la_ideoTag{background:var(--ideo-accent,var(--dsw-alias-state-business-primary));color:var(--dsw-alias-bg-base);text-transform:uppercase;border-radius:3px;width:fit-content;padding:1px 5px;font-size:9px;font-weight:700}.K5r_la_ideoDesc{color:var(--dsw-alias-label-secondary);word-break:break-word;font-size:10px;line-height:1.3;overflow:hidden}.K5r_la_ideoInlineText{background:var(--dsw-alias-fill-primary);border:1px solid var(--ideo-accent,var(--dsw-alias-brand-primary));color:var(--dsw-alias-label-primary);border-radius:4px;width:100%;padding:4px 6px;font-size:11px}.K5r_la_ideoHandle{background:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-fill-secondary);z-index:3;border-radius:2px;width:8px;height:8px;margin:-5px 0 0 -5px;position:absolute}.K5r_la_ideoHandle_nw,.K5r_la_ideoHandle_n,.K5r_la_ideoHandle_w{cursor:nwse-resize}.K5r_la_ideoHandle_se,.K5r_la_ideoHandle_s,.K5r_la_ideoHandle_e{cursor:nesw-resize}.K5r_la_ideoHandle_ne,.K5r_la_ideoHandle_sw{cursor:ns-resize}.K5r_la_ideoDrawPreview{border:1.5px dashed var(--dsw-alias-accent-primary);pointer-events:none;z-index:4;border-radius:3px;position:absolute}.K5r_la_ideoCoord{color:var(--dsw-alias-label-secondary);text-align:center;font-size:10px}.K5r_la_ideoRunRow{grid-column:1/3;gap:8px;display:flex}";
		const tagId$1 = "@melite/image-ideogram4/client.module.css@8e8a7d97";
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
		/** THE SCHEMA LAYER's declared defaults (fieldsOfEnvelope's output —
		*  resolveValue's first layer; the base never invents one). */
		function specDefaults(fields) {
			const out = {};
			for (const f of fields) if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
			return out;
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
			const dict = env.refs[env.uid]?.dict ?? {};
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
					visible_when: str("visible_when")
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
		/** THE LAYERED RESOLUTION — the engine's compose cascade (applyRecipe
		* in the card's service plane) mirrored client-side: schema
		* defaults <- model defaults <- SERVED STAMPS <- card-recipe params
		* <- user. The form SHOWS exactly what a run composes; `user` rides
		* verbatim by key presence (a PRESENCE is the override mark, never
		* its value — the settings law). Arrays (lora bags) and nulls in
		* model_defaults skip, matching the engine's overlay filter.
		*
		* THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): `base` is the
		* stage row's `resolved` map — prepareCardParams' own stamped +
		* lifted body, served by the drafts doors. It layers UNDER the user
		* (presence still wins) and OVER model_defaults (the server's own
		* family/variant stamps replace the client's guesses — variant
		* resolver_defaults, family defaults, the surface filter). The
		* recipe key reads user.recipe ?? base.recipe ?? the field default,
		* so the server's stamped recipe wins over the client's guess when
		* the user never touched it. Absent base = the registry-less lane
		* derive (the wall pins parity on the golden families). PURE. */
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
			const rkey = recipeKeyOf(spec, user, base);
			if (rkey !== void 0) {
				const overlay = spec.recipes?.[rkey]?.params;
				if (overlay !== void 0) Object.assign(out, overlay);
			}
			Object.assign(out, user);
			return out;
		}
		/** THE EFFECTIVE RECIPE KEY — one law, one seat: user.recipe (the
		*  pick) ?? the served base's stamped recipe ?? the field's declared
		*  default. resolveValue and the mod plane's recipe-stack derivation
		*  both read THIS (never two spellings of the recipe-key law). */
		function recipeKeyOf(spec, user, base) {
			const userRecipe = user["recipe"];
			if (typeof userRecipe === "string" && userRecipe !== "") return userRecipe;
			const baseRecipe = base?.["recipe"];
			if (typeof baseRecipe === "string" && baseRecipe !== "") return baseRecipe;
			const dflt = fieldsOf(spec).find((f) => f.name === "recipe")?.default;
			return typeof dflt === "string" && dflt !== "" ? dflt : void 0;
		}
		//#endregion
		//#region \0dsh-css:card-base/src/card.module.css.mjs
		const css = ".FRpSCG_specForm :where(input,textarea,select,button){box-sizing:border-box}.FRpSCG_specForm{flex-direction:column;gap:12px;display:flex}.FRpSCG_specGroup{flex-direction:column;gap:8px;display:flex}.FRpSCG_modelAxes{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;display:grid}.FRpSCG_modelAxes .FRpSCG_specGroupTitle{grid-column:1/-1;margin-bottom:0}.FRpSCG_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.FRpSCG_specField{flex-direction:column;gap:6px;display:flex}.FRpSCG_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.FRpSCG_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.FRpSCG_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.FRpSCG_specSelect option{color:#0f1115;background:#fff}.FRpSCG_specSelect{color-scheme:light;background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.FRpSCG_specSliderRow{align-items:center;gap:8px;display:flex}.FRpSCG_specSlider{flex:1}.FRpSCG_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.FRpSCG_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.FRpSCG_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.FRpSCG_squareOff{opacity:.5;pointer-events:none}.FRpSCG_squareBox{border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.FRpSCG_squareOver{border-color:var(--dsw-alias-border-l3,#00000047);box-shadow:0 0 0 2px var(--dsw-alias-border-l1,#00000014)}.FRpSCG_squareThumb{object-fit:cover;width:100%;height:100%}.FRpSCG_squareGlyph{color:var(--dsw-alias-label-tertiary,#00000073)}.FRpSCG_squareX{background:var(--dsw-alias-bg-module,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.FRpSCG_squareLabel{color:var(--dsw-alias-label-primary,#0f1115);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.FRpSCG_squareMetric{color:var(--dsw-alias-label-tertiary,#00000073);font-size:10px;line-height:17px}.FRpSCG_squareFileInput{display:none}.FRpSCG_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.FRpSCG_modHead{align-items:baseline;gap:8px;display:flex}.FRpSCG_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.FRpSCG_modHint{opacity:.45;font-size:9px}.FRpSCG_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.FRpSCG_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.FRpSCG_modTile:active{cursor:grabbing}.FRpSCG_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.FRpSCG_modTileStrength{opacity:.55;font-size:9px}.FRpSCG_modAddSquare{border:1px dashed var(--dsw-alias-border-l3,#00000047);cursor:pointer;opacity:.7;height:64px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:8px;justify-content:center;align-items:center;width:64px;display:flex}.FRpSCG_modAddSquare:hover{background:var(--dsw-alias-interactive-bg-hover,#0000000d);border-color:var(--dsw-alias-border-l4,#0006);opacity:1}.FRpSCG_tileDragging{opacity:.5}.FRpSCG_modTileRecipe{cursor:default;border-style:dashed}.FRpSCG_modTileRecipe .FRpSCG_modTileStrength:after{content:\" · recipe\"}.FRpSCG_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.FRpSCG_modLeafFields{gap:8px;display:grid}.FRpSCG_modLeafActions{gap:8px;display:flex}.FRpSCG_modField{flex-direction:column;gap:4px;font-size:11px;display:flex}.FRpSCG_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#8080800f);color:inherit;border-radius:6px;padding:6px 8px;font-size:12px}.FRpSCG_modLeafError{color:#e06c5f;margin:0;font-size:11px}.FRpSCG_pickList{flex-direction:column;gap:4px;max-height:60vh;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.FRpSCG_pickRow{display:block}.FRpSCG_pickBtn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:6px;align-items:center;gap:10px;width:100%;padding:6px;display:flex}.FRpSCG_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4)}.FRpSCG_pickThumb{object-fit:cover;border-radius:4px;flex:none;width:40px;height:40px}.FRpSCG_pickGlyph{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;width:40px;height:40px;font-size:15px;font-weight:600;display:inline-flex}.FRpSCG_pickLabel{text-overflow:ellipsis;white-space:nowrap;font-size:13px;overflow:hidden}.FRpSCG_pickEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.FRpSCG_sourceRow{flex-direction:column;display:flex}.FRpSCG_specSlotRow{flex-wrap:wrap;align-items:flex-start;gap:8px;display:flex}.FRpSCG_specSlotCell{flex-direction:column;gap:4px;display:flex}.FRpSCG_inputRail{gap:10px}.FRpSCG_sz14{flex:none;width:14px;height:14px}.FRpSCG_wireDialog{width:min(448px,100vw - 32px);max-height:60vh;overflow-y:auto}.FRpSCG_wireUnwire{text-align:left;cursor:pointer;border:0;border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);width:100%;color:var(--dsw-alias-state-error-primary);background:0 0;align-items:center;gap:8px;padding:8px 12px;font-size:11px;display:flex}.FRpSCG_wireUnwire:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent)}.FRpSCG_wireList{margin:0;padding:0;list-style:none}.FRpSCG_wireList>li+li{border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)}.FRpSCG_wireEmpty{color:color-mix(in srgb, var(--dsw-alias-label-primary) 48%, transparent);padding:12px;font-size:11px}.FRpSCG_wireOption{text-align:left;cursor:pointer;width:100%;color:var(--dsw-alias-label-primary);background:0 0;border:0;align-items:center;gap:8px;padding:8px 12px;display:flex}.FRpSCG_wireOption:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent)}.FRpSCG_wireSelected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent)}.FRpSCG_wireIdx{font-variant-numeric:tabular-nums;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);width:20px;height:20px;color:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent);border-radius:4px;flex:none;justify-content:center;align-items:center;font-size:9px;font-weight:700;display:flex}.FRpSCG_wireThumb{object-fit:cover;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);border-radius:4px;flex:none;width:32px;height:32px}.FRpSCG_wireThumbFallback{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent);width:32px;height:32px;color:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent);border-radius:4px;flex:none;justify-content:center;align-items:center;display:flex}.FRpSCG_wireMeta{flex:1;min-width:0}.FRpSCG_wireTitle{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:11px;font-weight:500;overflow:hidden}.FRpSCG_wireOut{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);color:color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);margin-left:4px;font-size:9px}.FRpSCG_wireSub{text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);color:color-mix(in srgb, var(--dsw-alias-label-primary) 48%, transparent);font-size:9px;overflow:hidden}.FRpSCG_wiredTag{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);color:var(--dsw-alias-brand-primary);border-radius:4px;flex:none;padding:2px 6px;font-size:9px;font-weight:600}";
		const tagId = "@melite/image-ideogram4/card.module.css@d15b0389";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-ideogram4";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"inputRail": "FRpSCG_inputRail",
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
			"modTileRecipe": "FRpSCG_modTileRecipe",
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
			"sz14": "FRpSCG_sz14",
			"tileDragging": "FRpSCG_tileDragging",
			"wireDialog": "FRpSCG_wireDialog",
			"wireEmpty": "FRpSCG_wireEmpty",
			"wireIdx": "FRpSCG_wireIdx",
			"wireList": "FRpSCG_wireList",
			"wireMeta": "FRpSCG_wireMeta",
			"wireOption": "FRpSCG_wireOption",
			"wireOut": "FRpSCG_wireOut",
			"wireSelected": "FRpSCG_wireSelected",
			"wireSub": "FRpSCG_wireSub",
			"wireThumb": "FRpSCG_wireThumb",
			"wireThumbFallback": "FRpSCG_wireThumbFallback",
			"wireTitle": "FRpSCG_wireTitle",
			"wireUnwire": "FRpSCG_wireUnwire",
			"wiredTag": "FRpSCG_wiredTag"
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
			}, "✕") : null), (0, react.createElement)("span", { className: card_module_css_default.squareLabel }, label), metric !== void 0 ? (0, react.createElement)("span", { className: card_module_css_default.squareMetric }, metric) : null, props.onFile !== void 0 && !disabled ? (0, react.createElement)("input", {
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
		/** /v1/form-spec?model=<family> — the card family's emission (the
		*  serialized schema envelope + model defaults + the declared edges
		*  + the mod kinds and their envelopes). */
		async function fetchFormSpec(model, signal) {
			const doc = await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal);
			const env = doc["schema"];
			if (env !== null && (typeof env !== "object" || typeof env.uid !== "number" || typeof env.refs !== "object")) throw new Error("form-spec: no schema envelope");
			return doc;
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
		function useLocalSliderValue(value) {
			const num = typeof value === "number" ? value : Number(value);
			const [local, setLocal] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
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
			if (shown.value === null) return (0, react.createElement)("span", {
				className: card_module_css_default.specSliderRow,
				"data-refused": f.name
			}, (0, react.createElement)("span", { className: card_module_css_default.specSliderValue }, String(value) + " — REFUSED: not a number"));
			return (0, react.createElement)("span", { className: card_module_css_default.specSliderRow }, (0, react.createElement)("input", {
				className: card_module_css_default.specSlider,
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
				if (value !== void 0 && value !== null && typeof value !== "boolean" && value !== "true" && value !== "false") return (0, react.createElement)("span", {
					className: card_module_css_default.specField,
					"data-refused": f.name
				}, f.label + ": " + String(value) + " — REFUSED: not a boolean");
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
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: String(value ?? ""),
				placeholder: f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			});
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
		function SpecFieldRow({ f, value, onEdit, square, wireCandidates }) {
			return (0, react.createElement)("div", { className: card_module_css_default.specField }, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null), (0, react.createElement)(SpecAtom, {
				f,
				value,
				onEdit,
				square,
				...wireCandidates !== void 0 ? { wireCandidates } : {}
			}), f.tooltip !== void 0 && f.tooltip !== "" ? (0, react.createElement)("span", { className: card_module_css_default.specHint }, f.tooltip) : null);
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
				setSpec(servedSpec);
				setValues((prev) => {
					const seeded = { ...params };
					delete seeded["prompt"];
					return {
						...seeded,
						...prev
					};
				});
			}, [servedSpec]);
			const specRows = spec !== null ? fieldsOf(spec).filter((f) => !SPEC_EXCLUDED.has(f.name)) : [];
			const servedBase = typeof row["resolved"] === "object" && row["resolved"] !== null && !Array.isArray(row["resolved"]) ? row["resolved"] : void 0;
			const value = resolveValue(spec ?? { form: "" }, values, servedBase);
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
				const userKeys = new Set(Object.keys(values));
				const patch = {
					...params,
					prompt: JSON.stringify(assembleCaption(values)),
					width,
					height
				};
				for (const k of userKeys) if (k !== "prompt") patch[k] = values[k];
				for (const k of Object.keys(params)) if (!userKeys.has(k) && k !== "prompt" && k !== "width" && k !== "height" && k !== "elements") patch[k] = null;
				delete patch["elements"];
				onPatch(patch);
				onRun();
			};
			const ratio = width / height;
			const cssMaxWidth = Math.round(CANVAS_MAX_HEIGHT * ratio);
			const drawMode = mode.kind === "idle" ? false : mode.kind === "draw";
			const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
			const fieldByName = new Map(specRows.map((f) => [f.name, f]));
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((prev) => ({
					...prev,
					[name]: coerceFieldEdit(fieldByName.get(name), v)
				}));
			}, [fieldByName]);
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
			}, "JSON")), tab === "elements" ? elementsTab : null, tab === "style" ? styleTab : null, tab === "json" ? jsonTab : null, specRows.length > 0 ? (0, react.createElement)("div", null, specRows.map((f) => (0, react.createElement)(SpecFieldRow, {
				key: f.name,
				f,
				value: value[f.name],
				onEdit
			}))) : null), (0, react.createElement)("div", { className: client_module_css_default.ideoCanvasWrap }, (0, react.createElement)("div", {
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