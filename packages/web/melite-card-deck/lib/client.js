window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-deck",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../web-kit/contracts/src/applyGuard.ts
		function createApplyGuard(label, opts = {}) {
			let claimed = false;
			return {
				claim() {
					if (claimed) {
						if (opts.warnOnRefusal === true) console.warn(`[${label}] apply called twice — second mount skipped`);
						return false;
					}
					claimed = true;
					return true;
				},
				release() {
					claimed = false;
				}
			};
		}
		//#endregion
		//#region src/client/apply-guard.ts
		/**
		* apply-guard — THIS PLUGIN'S single-mount claim. The guard itself is
		* one implementation in @melite/contracts (createApplyGuard); this
		* module exists so the deck's claim is its OWN module instance (a
		* shared boolean would make the deck's apply refuse the gallery's).
		*/
		const guard = createApplyGuard("melite-card-deck", { warnOnRefusal: true });
		function claimDeckApply() {
			return guard.claim();
		}
		function releaseDeckApply() {
			guard.release();
		}
		//#endregion
		//#region \0dsh-css:melite-card-deck/src/client/assets.module.css.mjs
		const css = ".ZRfIha_root{box-sizing:border-box;width:100%;min-width:0;max-width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:10px;padding:clamp(8px,3cqi,12px);font-size:12px;line-height:1.4;display:flex;overflow:hidden auto;container-type:inline-size}.ZRfIha_root,.ZRfIha_root *{box-sizing:border-box}.ZRfIha_head,.ZRfIha_healthTop,.ZRfIha_resultHead,.ZRfIha_resultRecordHead,.ZRfIha_nextRow,.ZRfIha_resourceMain,.ZRfIha_resultItem,.ZRfIha_resourceItem,.ZRfIha_lifecycleActions,.ZRfIha_checkRow,.ZRfIha_device{min-width:0}.ZRfIha_head{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;display:flex}.ZRfIha_title{letter-spacing:.02em;margin:0;font-size:14px;font-weight:650}.ZRfIha_sub,.ZRfIha_freshness,.ZRfIha_resultKind,.ZRfIha_resultDataLabel{opacity:.72;overflow-wrap:anywhere;font-size:11px}.ZRfIha_section{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;gap:8px;min-width:0;padding:10px;display:flex}.ZRfIha_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.68;align-items:center;gap:6px;margin:0;font-size:11px;font-weight:650;display:flex}.ZRfIha_count{background:color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);border-radius:999px;justify-content:center;align-items:center;min-width:20px;padding:1px 6px;font-size:10px;display:inline-flex}.ZRfIha_healthPanel{gap:7px}.ZRfIha_healthTop{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ZRfIha_healthCopy{flex-direction:column;flex:150px;min-width:0;display:flex}.ZRfIha_healthTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.58;margin:0;font-size:10px;font-weight:600}.ZRfIha_healthLabel{overflow-wrap:anywhere;font-size:13px}.ZRfIha_healthGrid{grid-template-columns:repeat(auto-fit,minmax(min(128px,100%),1fr));gap:6px 10px;margin:0;display:grid}.ZRfIha_healthItem{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 75%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-base) 55%, transparent);border-radius:7px;min-width:0;padding:5px 7px}.ZRfIha_healthItem dt{text-transform:uppercase;letter-spacing:.05em;opacity:.58;margin-bottom:2px;font-size:10px;font-weight:600}.ZRfIha_healthItem dd{overflow-wrap:anywhere;min-width:0;margin:0;font-size:11px}.ZRfIha_row{flex-flow:wrap;align-items:flex-end;gap:6px;min-width:0;display:flex}.ZRfIha_row>label{flex:150px;min-width:0;max-width:100%}.ZRfIha_field{flex-direction:column;gap:3px;min-width:0;display:flex}.ZRfIha_fieldLabel{opacity:.74;font-size:11px;font-weight:550}.ZRfIha_input{box-sizing:border-box;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);width:100%;min-width:0;max-width:100%;color:inherit;border-radius:7px;padding:6px 8px;font-family:inherit;font-size:12px}.ZRfIha_input:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.ZRfIha_mono,.ZRfIha_hash{font-family:ui-monospace,monospace;font-size:11px}.ZRfIha_wrapText,.ZRfIha_hash{overflow-wrap:anywhere;word-break:break-word;min-width:0;max-width:100%}.ZRfIha_btnDanger{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);color:var(--dsw-alias-state-error-primary)}.ZRfIha_dot{border-radius:50%;flex:none;width:9px;height:9px}.ZRfIha_dotOk{background:var(--dsw-alias-state-business-primary);}.ZRfIha_dotWarn{background:color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);}.ZRfIha_dotBad{background:var(--dsw-alias-state-error-primary);}.ZRfIha_kvKey{overflow-wrap:anywhere;min-width:0;font-weight:600}.ZRfIha_deviceList{flex-direction:column;gap:5px;display:flex}.ZRfIha_device{grid-template-columns:minmax(54px,auto) minmax(40px,1fr) auto;align-items:center;gap:7px;display:grid}.ZRfIha_bar{background:color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);border-radius:3px;min-width:0;height:5px;display:block;overflow:hidden}.ZRfIha_barFill{background:var(--dsw-alias-state-business-primary);border-radius:3px;height:100%;display:block}.ZRfIha_advanced{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent);border-radius:8px;min-width:0;padding:7px 8px}.ZRfIha_advanced>summary{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;cursor:pointer;font-size:11px;font-weight:600}.ZRfIha_advanced[open]{flex-direction:column;gap:8px;display:flex}.ZRfIha_operatorBadge{border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);letter-spacing:.04em;text-transform:uppercase;border-radius:999px;margin-right:5px;padding:1px 6px;font-size:9px;font-weight:700;display:inline-block}.ZRfIha_operatorNote,.ZRfIha_warningNote{color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary));overflow-wrap:anywhere;margin:0;font-size:11px}.ZRfIha_dangerNote,.ZRfIha_errorCode{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0;font-size:11px}.ZRfIha_resultDock{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-border-l1))}.ZRfIha_resultHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;display:flex}.ZRfIha_resultRecord{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;flex-direction:column;gap:6px;min-width:0;padding:8px;display:flex}.ZRfIha_resultRecord+.ZRfIha_resultRecord{margin-top:7px}.ZRfIha_resultRecordHead{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.ZRfIha_resultAction,.ZRfIha_resourceName{overflow-wrap:anywhere;min-width:0;font-family:ui-monospace,monospace;font-size:11px;font-weight:600}.ZRfIha_resultKind{margin-left:auto}.ZRfIha_resultOk,.ZRfIha_resultWarn,.ZRfIha_resultBad,.ZRfIha_stateOk,.ZRfIha_stateWarn,.ZRfIha_stateBad,.ZRfIha_stateNeutral{border:1px solid var(--dsw-alias-border-l2);letter-spacing:.05em;overflow-wrap:anywhere;border-radius:999px;align-items:center;max-width:100%;padding:2px 7px;font-size:9px;font-weight:700;line-height:1.25;display:inline-flex}.ZRfIha_resultOk,.ZRfIha_stateOk{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);color:var(--dsw-alias-state-business-primary)}.ZRfIha_resultWarn,.ZRfIha_stateWarn{border-color:color-mix(in srgb, var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary)) 65%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary)) 12%, transparent);color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary))}.ZRfIha_resultBad,.ZRfIha_stateBad{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);color:var(--dsw-alias-state-error-primary)}.ZRfIha_stateNeutral{background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent)}.ZRfIha_resultMeta,.ZRfIha_resultFlags{grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:4px 8px;min-width:0;font-size:11px;display:grid}.ZRfIha_resultMeta>span,.ZRfIha_resultFlags>span{overflow-wrap:anywhere;min-width:0}.ZRfIha_resultDetail{overflow-wrap:anywhere;margin:0;font-size:11px}.ZRfIha_nextRow{flex-wrap:wrap;align-items:center;gap:7px;display:flex}.ZRfIha_resultItem,.ZRfIha_resourceItem{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 72%, transparent);border-radius:7px;flex-wrap:wrap;align-items:center;gap:5px 8px;padding:5px 6px;display:flex}.ZRfIha_resultItem+.ZRfIha_resultItem,.ZRfIha_resourceItem+.ZRfIha_resourceItem{margin-top:4px}.ZRfIha_resultData{flex-direction:column;gap:4px;min-width:0;display:flex}.ZRfIha_pre{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 70%, transparent);white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;border-radius:7px;min-width:0;max-width:100%;max-height:min(42vh,360px);margin:0;padding:7px;font-family:ui-monospace,monospace;font-size:11px;line-height:1.45;overflow:auto}.ZRfIha_resourceList,.ZRfIha_resourceItems,.ZRfIha_list{min-width:0;margin:0;padding:0;list-style:none}.ZRfIha_resourceList,.ZRfIha_list{flex-direction:column;gap:5px;display:flex}.ZRfIha_resourceRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;min-width:0;padding:7px}.ZRfIha_resourceMain{flex-wrap:wrap;align-items:center;gap:5px 8px;display:flex}.ZRfIha_resourceRow>.ZRfIha_sub{margin-top:4px}.ZRfIha_resourceItems{flex-direction:column;gap:4px;margin-top:5px;display:flex}.ZRfIha_resourceItem{padding:4px 5px}.ZRfIha_listRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:7px;justify-content:space-between;align-items:center;gap:6px 8px;min-width:0;padding:5px 7px;display:flex}.ZRfIha_snapshotRow>.ZRfIha_wrapText{flex:150px}.ZRfIha_lifecycleActions{flex-wrap:wrap;gap:6px;display:flex}@container (width<=330px){.ZRfIha_root{gap:8px;padding:8px}.ZRfIha_section{padding:8px}.ZRfIha_healthGrid,.ZRfIha_resultMeta,.ZRfIha_resultFlags{grid-template-columns:minmax(0,1fr)}.ZRfIha_row>label,.ZRfIha_healthCopy{flex-basis:100%}.ZRfIha_device{grid-template-columns:minmax(0,1fr)}.ZRfIha_bar{grid-row:2}.ZRfIha_resultKind{width:100%;margin-left:0}}";
		const tagId = "@melite-plugin/dsh-card-deck/assets.module.css@d320200e";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var assets_module_css_default = {
			"advanced": "ZRfIha_advanced",
			"bar": "ZRfIha_bar",
			"barFill": "ZRfIha_barFill",
			"btnDanger": "ZRfIha_btnDanger",
			"checkRow": "ZRfIha_checkRow",
			"count": "ZRfIha_count",
			"dangerNote": "ZRfIha_dangerNote",
			"device": "ZRfIha_device",
			"deviceList": "ZRfIha_deviceList",
			"dot": "ZRfIha_dot",
			"dotBad": "ZRfIha_dotBad",
			"dotOk": "ZRfIha_dotOk",
			"dotWarn": "ZRfIha_dotWarn",
			"errorCode": "ZRfIha_errorCode",
			"field": "ZRfIha_field",
			"fieldLabel": "ZRfIha_fieldLabel",
			"freshness": "ZRfIha_freshness",
			"hash": "ZRfIha_hash",
			"head": "ZRfIha_head",
			"healthCopy": "ZRfIha_healthCopy",
			"healthGrid": "ZRfIha_healthGrid",
			"healthItem": "ZRfIha_healthItem",
			"healthLabel": "ZRfIha_healthLabel",
			"healthPanel": "ZRfIha_healthPanel",
			"healthTitle": "ZRfIha_healthTitle",
			"healthTop": "ZRfIha_healthTop",
			"input": "ZRfIha_input",
			"kvKey": "ZRfIha_kvKey",
			"lifecycleActions": "ZRfIha_lifecycleActions",
			"list": "ZRfIha_list",
			"listRow": "ZRfIha_listRow",
			"mono": "ZRfIha_mono",
			"nextRow": "ZRfIha_nextRow",
			"operatorBadge": "ZRfIha_operatorBadge",
			"operatorNote": "ZRfIha_operatorNote",
			"pre": "ZRfIha_pre",
			"resourceItem": "ZRfIha_resourceItem",
			"resourceItems": "ZRfIha_resourceItems",
			"resourceList": "ZRfIha_resourceList",
			"resourceMain": "ZRfIha_resourceMain",
			"resourceName": "ZRfIha_resourceName",
			"resourceRow": "ZRfIha_resourceRow",
			"resultAction": "ZRfIha_resultAction",
			"resultBad": "ZRfIha_resultBad",
			"resultData": "ZRfIha_resultData",
			"resultDataLabel": "ZRfIha_resultDataLabel",
			"resultDetail": "ZRfIha_resultDetail",
			"resultDock": "ZRfIha_resultDock",
			"resultFlags": "ZRfIha_resultFlags",
			"resultHead": "ZRfIha_resultHead",
			"resultItem": "ZRfIha_resultItem",
			"resultKind": "ZRfIha_resultKind",
			"resultMeta": "ZRfIha_resultMeta",
			"resultOk": "ZRfIha_resultOk",
			"resultRecord": "ZRfIha_resultRecord",
			"resultRecordHead": "ZRfIha_resultRecordHead",
			"resultWarn": "ZRfIha_resultWarn",
			"root": "ZRfIha_root",
			"row": "ZRfIha_row",
			"section": "ZRfIha_section",
			"sectionTitle": "ZRfIha_sectionTitle",
			"snapshotRow": "ZRfIha_snapshotRow",
			"stateBad": "ZRfIha_stateBad",
			"stateNeutral": "ZRfIha_stateNeutral",
			"stateOk": "ZRfIha_stateOk",
			"stateWarn": "ZRfIha_stateWarn",
			"sub": "ZRfIha_sub",
			"title": "ZRfIha_title",
			"warningNote": "ZRfIha_warningNote",
			"wrapText": "ZRfIha_wrapText"
		};
		//#endregion
		//#region ../../web-kit/formats/src/readFile.ts
		/**
		* readFile — THE one read path for every slot-shaped attach, ported
		* native from the retired kit's SlotSquare (2026-09-12, the kit
		* retirement). A plain FileReader promise — no UI dependency owns a
		* file read.
		*/
		/** Read a File / Blob and resolve its data: URL. */
		function readAsDataURL(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("read failed"));
				reader.readAsDataURL(file);
			});
		}
		//#endregion
		//#region src/client/lora-section.tsx
		/**
		* lora-section.tsx — THE LORA BLOCK for the ComfyUI Manager sidebar
		* (the operator's 2026-09-26 order: "custom LoRAs should be in the
		* ComfyUI manager sidebar").
		*
		* It speaks the manage plane's own two doors — `lora_list` and
		* `lora_install` — so this is the same vocabulary every other sidebar
		* action uses, and the same refusal envelope on a refusal. The block
		* states the two facts a user cannot see otherwise:
		*
		* - what the ENGINE will accept (its own `LoraLoaderModelOnly` combo —
		*   a name outside it is a 400 at /prompt, after the money is spent),
		*   with the rows the engine does NOT have named here;
		* - the user's own rows, and the honest boundary: a copied file only
		*   enters the combo after a RESTART (core enumerates folder_paths at
		*   import — the only refresh primitive this repo owns).
		*
		* The install is a COPY of a file the operator already has — never a
		* fetch ("THERE SHOULD NOT BE A LORAS REMOTE / IT'S ALL BUILT IN").
		*/
		function LoraBlock() {
			const [data, setData] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [refusal, setRefusal] = react.useState(null);
			const [path, setPath] = react.useState("");
			const [families, setFamilies] = react.useState("z-image");
			const [open, setOpen] = react.useState(false);
			const refresh = react.useCallback(async () => {
				setBusy(true);
				setRefusal(null);
				try {
					const reply = await postManage("lora_list", {});
					setData(reply.data ?? {});
				} catch (e) {
					setRefusal(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, []);
			const openedRef = react.useRef(false);
			const openAndLoad = react.useCallback(() => {
				setOpen((was) => {
					const next = !was;
					if (next && openedRef.current !== true) {
						openedRef.current = true;
						refresh();
					}
					return next;
				});
			}, [refresh]);
			const install = react.useCallback(async () => {
				if (path.trim() === "") return;
				setBusy(true);
				setRefusal(null);
				try {
					await postManage("lora_install", {
						path: path.trim(),
						families: families.split(",").map((f) => f.trim()).filter((f) => f !== "")
					});
					await refresh();
				} catch (e) {
					setRefusal(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [
				families,
				path,
				refresh
			]);
			const uploadChosen = react.useCallback(async (file) => {
				setBusy(true);
				setRefusal(null);
				try {
					const dataUrl = await readAsDataURL(file);
					await postManage("lora_install", {
						filename: file.name,
						data: dataUrl,
						families: families.split(",").map((f) => f.trim()).filter((f) => f !== "")
					});
					await refresh();
				} catch (e) {
					setRefusal(e instanceof Error ? e.message : String(e));
				} finally {
					setBusy(false);
				}
			}, [families, refresh]);
			const engine = data?.engine_loras ?? [];
			const rows = data?.user_rows ?? [];
			const unboarded = data?.unboarded ?? [];
			const problems = data?.user_row_problems ?? [];
			return react.createElement("div", { "data-testid": "manage-loras" }, react.createElement("div", { className: "row" }, react.createElement("strong", null, "LoRAs"), open ? react.createElement("button", {
				onClick: () => void refresh(),
				disabled: busy
			}, "Refresh") : react.createElement("button", {
				onClick: openAndLoad,
				disabled: busy
			}, "Show LoRAs")), open === false ? react.createElement("p", { className: "hint" }, "Add a LoRA you already have: the engine accepts only the names in its own list, so copy the file in, restart, then add a row.") : null, react.createElement("p", { className: "hint" }, "The engine accepts " + String(engine.length) + " LoRA name(s) — a name outside its list refuses at run time, so add the file first."), data?.install_dir === void 0 ? null : react.createElement("p", { className: "hint mono" }, "install dir: " + data.install_dir), unboarded.length === 0 ? null : react.createElement("div", { className: "warn" }, unboarded.length + " of your row(s) are not in the engine list yet (install the file, then restart the engine):", ...unboarded.map((u) => react.createElement("div", {
				key: u,
				className: "mono"
			}, "· " + u))), react.createElement("div", { className: "hint" }, "your rows: " + (data?.user_rows_present === true ? String(rows.length) : "none") + (data?.user_rows_path === void 0 ? "" : " — " + data.user_rows_path)), ...rows.map((r) => react.createElement("div", {
				key: String(r.id),
				className: "mono"
			}, "· " + String(r.label ?? r.id) + "  (" + String(r.filename) + ")" + (r.default_strength === void 0 ? "" : "  @" + String(r.default_strength)) + (r.families === void 0 ? "" : "  [" + r.families.join(", ") + "]"))), problems.length === 0 ? null : react.createElement("div", { className: "warn" }, ...problems.map((p) => react.createElement("div", {
				key: p,
				className: "mono"
			}, "refused row — " + p))), react.createElement("div", { className: "row" }, react.createElement("input", {
				type: "file",
				accept: ".safetensors,.ckpt,.pt,.bin,.gguf",
				onChange: (e) => {
					const file = e.target.files?.[0];
					if (file === void 0) return;
					uploadChosen(file);
				},
				disabled: busy
			}), react.createElement("span", { className: "hint" }, "or drop a LoRA you downloaded from civit.ai here (your browser does the download)")), react.createElement("div", { className: "row" }, react.createElement("input", {
				placeholder: "/abs/path/to/my_lora.safetensors",
				value: path,
				onChange: (e) => setPath(e.target.value),
				style: { flex: 1 }
			}), react.createElement("input", {
				placeholder: "families (comma)",
				value: families,
				onChange: (e) => setFamilies(e.target.value),
				style: { width: "12rem" }
			}), react.createElement("button", {
				onClick: () => void install(),
				disabled: busy || path.trim() === ""
			}, "Copy LoRA in")), react.createElement("p", { className: "hint" }, "A copied file enters the engine list only after a restart — the button below asks for one."), react.createElement("div", { className: "row" }, react.createElement("button", {
				onClick: () => void postManage("restart", {}).then(refresh).catch((e) => {
					setRefusal(e instanceof Error ? e.message : String(e));
				}),
				disabled: busy
			}, "Restart engine")), refusal === null ? null : react.createElement("div", { className: "warn" }, refusal));
		}
		//#endregion
		//#region src/client/assets-tab.tsx
		/**
		* assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
		*
		*   ComfyUI Manager — a direct GUI on the estate's management plane.
		*     Every button is ONE action of the manage-plane SSOT
		*     (@melite/estate-queue's managePlane.ts — Cordis provisioning +
		*     ComfyUI-Manager), reached over the `manage` Typert remote
		*     (MANAGE_TYPERT_REMOTE — the host binds it in the estate
		*     composition; the deck seats the namespace card-base's
		*     manageRemote() accessor hands back). The vocabulary mirrors the
		*     comfy_manage agent tool 1:1. Progressive
		*     disclosure: status is the cheap index and refreshes SILENTLY
		*     after every mutating action (never through the result pane —
		*     that pane belongs to the user's last explicit dispatch);
		*     discovery (installed packs, snapshots) renders as ROWS in place.
		*     INFERENCE LAW honored by construction — no action here
		*     runs inference, and lifecycle actions are refused SERVER-side
		*     while any run reads running/queued (the guard lives in the SSOT,
		*     never in this panel).
		*
		* Transport history (kill ledger): the tab's calls died with the
		* gateway app (this plugin's /v1/manage proxy, then a ctx.remote.lane
		* shape that never mounted client-side — "remote.lane is not a
		* function", 2026-09-10), then rode a hand-rolled fetch frame
		* (2026-09-10 to 2026-10-01). Today the panel rides the MOUNTED
		* `manage` Typert namespace (@melite/estate-manage's generated
		* client, seated by the deck's apply): the Connection owns
		* transport, RPC ids, and frame validation; this panel owns the
		* envelope's reply mapping and its voices.
		*
		* Siblings' fate (NO LEGACY): Ray Media deleted with the media plugin
		* (5cbb5bcc — DSH's own media system owns that surface); Ray Flows
		* retired with the yaml spec library (35f2f830).
		*/
		const STATUS_STALE_MS = 3e4;
		const MUTATING = /* @__PURE__ */ new Set([
			"endpoint_set",
			"install_extension",
			"install_extension_url",
			"download_model",
			"provision_model",
			"launch",
			"restart",
			"stop",
			"update",
			"switch_version",
			"free",
			"snapshot_save",
			"snapshot_restore"
		]);
		const ACTION_LABELS = {
			status: "Refresh status",
			endpoint_set: "Set endpoint",
			list_extensions: "Review installed packs",
			install_extension: "Install declared packs",
			install_extension_url: "Open raw-URL pack install",
			search_models: "Search models",
			provision_model: "Provision declared model",
			download_model: "Open raw-URL model download",
			lora_list: "List LoRAs the engine accepts",
			lora_install: "Copy a LoRA in",
			snapshot_list: "Review snapshots",
			snapshot_save: "Save snapshot",
			snapshot_restore: "Restore snapshot",
			launch: "Launch ComfyUI",
			restart: "Restart ComfyUI",
			stop: "Stop ComfyUI",
			free: "Free VRAM",
			update: "Update ComfyUI",
			switch_version: "Switch ComfyUI version"
		};
		function recordOf(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
		}
		function stringOr(value, fallback = "") {
			return typeof value === "string" ? value : fallback;
		}
		/** A refusal voice must carry words: an empty message names the wire's
		*  own refusal rather than rendering a blank line (the card-base
		*  manage lane's law). */
		function nonEmptyOr(value, fallback) {
			return typeof value === "string" && value !== "" ? value : fallback;
		}
		function modelCatalog(value) {
			if (!Array.isArray(value)) return [];
			return value.flatMap((row) => {
				const record = recordOf(row);
				if (record === null || typeof record["id"] !== "string" || record["id"] === "") return [];
				const variants = Array.isArray(record["variants"]) ? record["variants"].flatMap((variantRow) => {
					const variant = recordOf(variantRow);
					if (variant === null || typeof variant["id"] !== "string" || variant["id"] === "") return [];
					const quants = Array.isArray(variant["quants"]) ? variant["quants"].flatMap((quantRow) => {
						const quant = recordOf(quantRow);
						if (quant === null || typeof quant["id"] !== "string" || quant["id"] === "") return [];
						return [{
							id: quant["id"],
							label: stringOr(quant["label"], quant["id"]),
							...typeof quant["description"] === "string" ? { description: quant["description"] } : {}
						}];
					}) : [];
					return [{
						id: variant["id"],
						label: stringOr(variant["label"], variant["id"]),
						...typeof variant["description"] === "string" ? { description: variant["description"] } : {},
						quants
					}];
				}) : [];
				return [{
					id: record["id"],
					label: stringOr(record["label"], record["id"]),
					...typeof record["description"] === "string" ? { description: record["description"] } : {},
					...typeof record["genre"] === "string" ? { genre: record["genre"] } : {},
					variants
				}];
			});
		}
		function versionCatalog(value) {
			if (!Array.isArray(value)) return [];
			return value.flatMap((row) => {
				if (typeof row === "string" || typeof row === "number") {
					const id = String(row);
					return id === "" ? [] : [{
						id,
						label: id
					}];
				}
				const record = recordOf(row);
				if (record === null) return [];
				const version = typeof record["version"] === "string" ? record["version"] : void 0;
				const tag = typeof record["tag"] === "string" ? record["tag"] : void 0;
				const commit = typeof record["commit"] === "string" ? record["commit"] : void 0;
				const id = version ?? tag ?? commit ?? stringOr(record["id"]);
				if (id === "") return [];
				return [{
					id,
					label: version !== void 0 && tag !== void 0 && version !== tag ? version + " — " + tag : version ?? tag ?? commit ?? id,
					...version === void 0 ? {} : { version },
					...tag === void 0 ? {} : { tag },
					...commit === void 0 ? {} : { commit }
				}];
			});
		}
		function numberOr(value) {
			return typeof value === "number" && Number.isFinite(value) ? value : void 0;
		}
		function replyFields(envelope, data) {
			const nested = recordOf(data);
			const fields = {};
			const text = (key) => {
				const value = typeof envelope[key] === "string" ? envelope[key] : nested?.[key];
				if (typeof value === "string") fields[key] = value;
			};
			text("code");
			text("state");
			text("next_action");
			text("operation_id");
			const status = numberOr(envelope["status"]) ?? numberOr(nested?.["status"]);
			if (status !== void 0) fields.status = status;
			const partial = typeof envelope["partial"] === "boolean" ? envelope["partial"] : nested?.["partial"];
			if (typeof partial === "boolean") fields.partial = partial;
			const restart = typeof envelope["restart_required"] === "boolean" ? envelope["restart_required"] : nested?.["restart_required"];
			if (typeof restart === "boolean") fields.restart_required = restart;
			const misses = Array.isArray(envelope["misses"]) ? envelope["misses"] : nested?.["misses"];
			if (Array.isArray(misses)) fields.misses = misses.filter((item) => typeof item === "string");
			return fields;
		}
		/** The seated manage namespace (the deck's apply seats it off its
		*  'remote.manage' inject — the loader guarantees the namespace
		*  exists when apply runs; a panel that renders without it refuses
		*  loud, never silent). */
		let seatedManage;
		/** Seat the manage namespace (called once by the deck's apply;
		*  `undefined` unseats — the loud-refusal arm a panel render without
		*  the contribution meets). */
		function seatManageNamespace(lane) {
			seatedManage = lane;
		}
		async function postManage(action, payload, signal) {
			const lane = seatedManage;
			if (lane === void 0) throw new Error("manage remote not mounted — the manage contribution must mount before any call");
			const doc = {
				action,
				...payload
			};
			try {
				const settled = await lane.act(doc, signal);
				if (settled.ok === true) {
					const row = settled.value;
					const envelope = recordOf(row) ?? {};
					const data = row.data;
					return {
						action: row.action,
						ok: row.ok,
						detail: stringOr(row.detail),
						data,
						...replyFields(envelope, data)
					};
				}
				const failure = settled.error;
				const errorRecord = recordOf(failure) ?? {};
				const details = recordOf(errorRecord["details"]) ?? {};
				const data = details["data"];
				return {
					action: stringOr(details["action"], action),
					ok: false,
					detail: nonEmptyOr(errorRecord["message"], "manage wire: refused"),
					data,
					...replyFields(details, data),
					code: stringOr(details["code"], stringOr(errorRecord["code"], "manage/refused"))
				};
			} catch (e) {
				if (e instanceof Error && e.name === "AbortError") throw e;
				return {
					action,
					ok: false,
					code: "manage/transport",
					detail: e instanceof Error ? e.message : String(e)
				};
			}
		}
		function gb(bytes) {
			return typeof bytes === "number" && bytes > 0 ? (bytes / 2 ** 30).toFixed(1) : "?";
		}
		function displayValue(value) {
			if (typeof value === "string") return value;
			if (typeof value === "number" || typeof value === "boolean") return String(value);
			if (value === null) return "null";
			if (value === void 0) return "";
			try {
				return JSON.stringify(value) ?? String(value);
			} catch {
				return String(value);
			}
		}
		function managerVersion(value) {
			const record = recordOf(value);
			if (record !== null) {
				for (const key of [
					"version",
					"v",
					"tag",
					"commit"
				]) if (typeof record[key] === "string" && record[key] !== "") return record[key];
			}
			return displayValue(value);
		}
		function queueSummary(value) {
			const queue = recordOf(value);
			if (queue === null) return displayValue(value);
			const active = numberOr(queue.in_progress_count) ?? 0;
			const total = numberOr(queue.total_count) ?? 0;
			const done = numberOr(queue.done_count) ?? 0;
			return (queue.is_processing === true ? "working" : "idle") + " · " + String(active) + " active · " + String(done) + "/" + String(total) + " complete";
		}
		function statusView(data) {
			return recordOf(data);
		}
		function provisionData(data) {
			const value = recordOf(data);
			if (value === null || typeof value["state"] !== "string" || !Array.isArray(value["items"])) return null;
			return value;
		}
		function resultContract(reply) {
			const data = recordOf(reply.data) ?? {};
			const state = reply.state ?? stringOr(data["state"]);
			return {
				state,
				operationId: reply.operation_id ?? stringOr(data["operation_id"]),
				partial: state === "partial" || (reply.partial ?? (typeof data["partial"] === "boolean" ? data["partial"] : false)),
				restartRequired: state === "restart_required" || (reply.restart_required ?? (typeof data["restart_required"] === "boolean" ? data["restart_required"] : false)),
				nextAction: reply.next_action ?? stringOr(data["next_action"]),
				code: reply.code ?? stringOr(data["code"]),
				status: reply.status
			};
		}
		function inferredNextAction(reply) {
			const contract = resultContract(reply);
			if (contract.nextAction !== "") return contract.nextAction;
			if (reply.action === "list_extensions") return "install_extension";
			if (reply.action === "snapshot_list") return "snapshot_save";
			if (contract.restartRequired) return "restart";
			return "";
		}
		function freshness(at, now) {
			const age = Math.max(0, now - at);
			if (age >= STATUS_STALE_MS) return "stale";
			if (age < 5e3) return "fresh";
			return String(Math.floor(age / 1e3)) + "s old";
		}
		function receivedLabel(at) {
			return new Date(at).toISOString().slice(11, 19) + " UTC";
		}
		function healthKind(status, receivedAt, loading, error, now) {
			if (status === null) return error === "" ? "loading" : "status-failure";
			if (loading || error !== "" || receivedAt === null || now - receivedAt >= STATUS_STALE_MS) return "stale";
			if (status.endpoint?.reachable !== true) return "engine-failure";
			if (status.manager?.reachable !== true) return "manager-failure";
			return "reachable";
		}
		function healthLabel(kind) {
			if (kind === "loading") return "Loading status";
			if (kind === "stale") return "Stale status";
			if (kind === "reachable") return "Engine + manager reachable";
			if (kind === "manager-failure") return "Manager failure";
			if (kind === "engine-failure") return "Engine failure";
			return "Status unavailable";
		}
		function healthDotClass(kind) {
			if (kind === "reachable") return assets_module_css_default.dotOk;
			if (kind === "loading" || kind === "stale") return assets_module_css_default.dotWarn;
			return assets_module_css_default.dotBad;
		}
		function resourceLabel(resource) {
			const ref = resource.ref;
			if (ref === void 0) return "resource";
			const kind = ref.kind === "extension" ? "extension" : "model";
			const owner = ref.owner === void 0 ? "" : ref.owner + "/";
			const variant = ref.variant === void 0 ? "" : ":" + ref.variant;
			const quant = ref.quant === void 0 ? "" : ":" + ref.quant;
			return kind + " " + owner + (ref.id ?? "?") + variant + quant;
		}
		function resourceStateClass(state) {
			if (state === "active" || state === "ready") return assets_module_css_default.stateOk;
			if (state === "failed" || state === "blocked" || state === "absent" || state === "missing") return assets_module_css_default.stateBad;
			if (state === "partial" || state === "restart_required" || state === "installed" || state === "pending") return assets_module_css_default.stateWarn;
			return assets_module_css_default.stateNeutral;
		}
		function rowLine(row) {
			if (typeof row === "string") return row;
			const value = recordOf(row);
			if (value !== null) {
				const name = typeof value["name"] === "string" ? value["name"] : void 0;
				const version = typeof value["version"] === "string" ? value["version"] : void 0;
				if (name !== void 0 && version !== void 0) return name + " — " + version;
				if (name !== void 0) {
					const traits = [value["type"], value["base"]].filter((item) => typeof item === "string" && item !== "");
					const file = typeof value["filename"] === "string" ? value["filename"] : void 0;
					const head = traits.length > 0 ? name + " (" + traits.join(", ") + ")" : name;
					return file === void 0 ? head : head + " — " + file;
				}
			}
			return displayValue(row);
		}
		function DataBody({ data }) {
			if (Array.isArray(data)) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: assets_module_css_default.pre,
				tabIndex: 0,
				"aria-label": "Result output",
				children: data.map(rowLine).join("\n")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: assets_module_css_default.pre,
				tabIndex: 0,
				"aria-label": "Result output",
				children: displayValue(data)
			});
		}
		function Field({ label, value, placeholder, mono, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: assets_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: assets_module_css_default.fieldLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					className: mono === true ? assets_module_css_default.mono : void 0,
					value,
					placeholder,
					onChange: (event) => {
						onChange(event.target.value);
					}
				})]
			});
		}
		function SearchField({ label, value, options, placeholder, mono = false, onChange }) {
			const listId = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: assets_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: assets_module_css_default.fieldLabel,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						className: mono === true ? assets_module_css_default.mono : void 0,
						type: "search",
						list: listId,
						value,
						placeholder,
						onChange: (event) => {
							onChange(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("datalist", {
						id: listId,
						children: options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: option.value,
							children: option.label
						}, option.value))
					})
				]
			});
		}
		function SelectField({ label, value, options, placeholder, disabled = false, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: assets_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: assets_module_css_default.fieldLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: assets_module_css_default.input,
					value,
					disabled,
					onChange: (event) => {
						onChange(event.target.value);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: placeholder
					}), options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: option.value,
						children: option.label
					}, option.value))]
				})]
			});
		}
		function resultLabel(reply, state) {
			if (state === "partial") return "PARTIAL";
			if (state === "restart_required") return "RESTART REQUIRED";
			if (reply.ok !== true) return "REFUSED";
			if (state !== "") return state.toUpperCase();
			return "OK";
		}
		function ResultRecordView({ record, kind, now, locked, onFollow }) {
			const reply = record.reply;
			const contract = resultContract(reply);
			const provision = provisionData(reply.data);
			const nextAction = inferredNextAction(reply);
			const label = resultLabel(reply, contract.state);
			const warn = contract.partial || contract.restartRequired;
			const good = reply.ok === true && !warn;
			const showFlags = kind === "mutation" || contract.state !== "" || provision !== null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: assets_module_css_default.resultRecord,
				"data-testid": kind === "mutation" ? "mutation-result" : "read-result",
				"aria-label": kind === "mutation" ? "Last mutation result" : "Latest read result",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultRecordHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: good ? assets_module_css_default.resultOk : warn ? assets_module_css_default.resultWarn : assets_module_css_default.resultBad,
								children: label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: assets_module_css_default.resultAction,
								children: reply.action ?? "unknown"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: assets_module_css_default.resultKind,
								children: kind === "mutation" ? "last mutation" : "latest read"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultMeta,
						children: [
							contract.state !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "State:" }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.mono,
									children: contract.state
								})
							] }),
							contract.operationId !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "operation_id:" }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.mono,
									children: contract.operationId
								})
							] }),
							reply.ok !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Error code:" }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: assets_module_css_default.mono,
									children: [contract.code === "" ? "manage/refused" : contract.code, contract.status === void 0 ? "" : " · HTTP " + String(contract.status)]
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Received:" }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
									dateTime: new Date(record.receivedAt).toISOString(),
									children: receivedLabel(record.receivedAt)
								}),
								" · ",
								freshness(record.receivedAt, now)
							] })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: assets_module_css_default.resultDetail,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Detail:" }),
							" ",
							reply.detail ?? ""
						]
					}),
					showFlags && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultFlags,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Partial: ", contract.partial ? "yes" : "no"] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Restart required: ", contract.restartRequired ? "yes" : "no"] })]
					}),
					nextAction !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.nextRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							disabled: locked,
							onClick: () => {
								onFollow(nextAction);
							},
							children: ["Next: ", ACTION_LABELS[nextAction] ?? nextAction]
						})
					}),
					provision !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-testid": "provision-state",
						children: [
							(provision.requested !== void 0 || provision.succeeded !== void 0 || provision.missed !== void 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.resultFlags,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Requested: ", (provision.requested ?? []).join(", ") || "none"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Succeeded: ", (provision.succeeded ?? []).join(", ") || "none"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Missed: ", (provision.missed ?? []).join(", ") || "none"] }),
									(provision.misses ?? []).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["Details: ", provision.misses?.join(" · ")] })
								]
							}),
							provision.items.map((item, index) => {
								const itemState = stringOr(item["state"], "unknown");
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: assets_module_css_default.resultItem,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: resourceStateClass(itemState),
											children: itemState
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.mono,
											children: stringOr(item["key"], "item")
										}),
										typeof item["integrity"] === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.sub,
											children: item["integrity"]
										}),
										typeof item["errorCode"] === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.errorCode,
											children: item["errorCode"]
										}),
										typeof item["detail"] === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.sub,
											children: item["detail"]
										})
									]
								}, stringOr(item["key"], String(index)));
							}),
							(provision.errors ?? []).map((error, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: assets_module_css_default.errorCode,
								children: [
									error.file ?? "error",
									": ",
									error.error ?? "failed"
								]
							}, String(error.file ?? index)))
						]
					}),
					reply.data !== void 0 && reply.data !== null && provision === null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultData,
						"data-testid": "result-data",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: assets_module_css_default.resultDataLabel,
							children: "Output"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataBody, { data: reply.data })]
					})
				]
			});
		}
		function ComfyManagerPanel() {
			const [epUrl, setEpUrl] = (0, react.useState)("");
			const [status, setStatus] = (0, react.useState)(null);
			const [statusDetail, setStatusDetail] = (0, react.useState)("Checking engine and manager…");
			const [statusError, setStatusError] = (0, react.useState)("");
			const [statusLoading, setStatusLoading] = (0, react.useState)(false);
			const [statusReceivedAt, setStatusReceivedAt] = (0, react.useState)(null);
			const [now, setNow] = (0, react.useState)(Date.now());
			const [busy, setBusy] = (0, react.useState)(null);
			const [mutationResult, setMutationResult] = (0, react.useState)(null);
			const [readResult, setReadResult] = (0, react.useState)(null);
			const statusRequestRef = (0, react.useRef)(0);
			const dispatchingRef = (0, react.useRef)(false);
			const dispatchSequenceRef = (0, react.useRef)(0);
			const resultSequenceRef = (0, react.useRef)(0);
			const mountedRef = (0, react.useRef)(true);
			const statusControllerRef = (0, react.useRef)(null);
			const actionControllerRef = (0, react.useRef)(null);
			const [extRows, setExtRows] = (0, react.useState)(null);
			const [extFilter, setExtFilter] = (0, react.useState)("");
			const [snapRows, setSnapRows] = (0, react.useState)(null);
			const [logTail, setLogTail] = (0, react.useState)("200");
			const [extIds, setExtIds] = (0, react.useState)("");
			const [extUrl, setExtUrl] = (0, react.useState)("");
			const [modelQuery, setModelQuery] = (0, react.useState)("");
			const [dlUrl, setDlUrl] = (0, react.useState)("");
			const [dlPath, setDlPath] = (0, react.useState)("");
			const [dlName, setDlName] = (0, react.useState)("");
			const [provModel, setProvModel] = (0, react.useState)("");
			const [provVariant, setProvVariant] = (0, react.useState)("");
			const [provQuant, setProvQuant] = (0, react.useState)("");
			const [swVersion, setSwVersion] = (0, react.useState)("");
			const [lifecycleForce, setLifecycleForce] = (0, react.useState)(false);
			const [restoreForce, setRestoreForce] = (0, react.useState)(false);
			const modelOptions = (0, react.useMemo)(() => modelCatalog(status?.model_options), [status?.model_options]);
			const selectedModel = modelOptions.find((model) => model.id === provModel.trim());
			const selectedVariant = selectedModel?.variants.find((variant) => variant.id === provVariant);
			const quantOptions = selectedVariant?.quants ?? [];
			const comfyuiVersions = (0, react.useMemo)(() => versionCatalog(status?.comfyui_versions), [status?.comfyui_versions]);
			const modelCatalogRef = (0, react.useRef)(null);
			const fetchStatus = (0, react.useCallback)(async () => {
				const request = ++statusRequestRef.current;
				statusControllerRef.current?.abort();
				const controller = new AbortController();
				statusControllerRef.current = controller;
				setStatusLoading(true);
				try {
					const reply = await postManage("status", {}, controller.signal);
					if (!mountedRef.current || request !== statusRequestRef.current) return;
					if (reply.ok === true) {
						const view = statusView(reply.data);
						if (view === null) {
							setStatusError("status reply carried no status data");
							setStatusDetail("");
							return;
						}
						const received = Date.now();
						setStatus(view);
						setStatusReceivedAt(received);
						setStatusError("");
						setStatusDetail(reply.detail ?? "");
						const live = view.endpoint?.url;
						if (typeof live === "string" && live !== "") setEpUrl((previous) => previous === "" ? live : previous);
					} else {
						setStatusError(reply.detail ?? "status request failed");
						setStatusDetail("");
					}
				} catch (error) {
					if (mountedRef.current && !controller.signal.aborted && request === statusRequestRef.current) setStatusError("request failed: " + String(error));
				} finally {
					if (statusControllerRef.current === controller) statusControllerRef.current = null;
					if (mountedRef.current && request === statusRequestRef.current) setStatusLoading(false);
				}
			}, []);
			(0, react.useEffect)(() => {
				mountedRef.current = true;
				fetchStatus();
				return () => {
					mountedRef.current = false;
					statusControllerRef.current?.abort();
					actionControllerRef.current?.abort();
				};
			}, [fetchStatus]);
			(0, react.useEffect)(() => {
				const previous = modelCatalogRef.current;
				modelCatalogRef.current = modelOptions;
				if (previous === null || previous.length === 0) return;
				if (modelOptions.length === 0) {
					setProvVariant("");
					setProvQuant("");
					return;
				}
				const model = modelOptions.find((option) => option.id === provModel.trim());
				if (model === void 0) {
					setProvVariant("");
					setProvQuant("");
					return;
				}
				const variant = model.variants.find((option) => option.id === provVariant) ?? model.variants[0];
				const variantId = variant?.id ?? "";
				const quantId = variant?.quants.find((option) => option.id === provQuant)?.id ?? variant?.quants[0]?.id ?? "";
				if (provVariant !== variantId) setProvVariant(variantId);
				if (provQuant !== quantId) setProvQuant(quantId);
			}, [
				modelOptions,
				provModel,
				provQuant,
				provVariant
			]);
			(0, react.useEffect)(() => {
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, 5e3);
				return () => {
					window.clearInterval(timer);
				};
			}, []);
			const run = (0, react.useCallback)(async (action, payload = {}, recordOutput = true) => {
				if (dispatchingRef.current) return null;
				dispatchingRef.current = true;
				const request = ++dispatchSequenceRef.current;
				const controller = new AbortController();
				actionControllerRef.current = controller;
				setBusy(action);
				try {
					const reply = await postManage(action, payload, controller.signal);
					if (mountedRef.current && request === dispatchSequenceRef.current) {
						const record = {
							id: ++resultSequenceRef.current,
							reply,
							receivedAt: Date.now()
						};
						if (MUTATING.has(action)) setMutationResult(record);
						else if (recordOutput) setReadResult(record);
					}
					return reply;
				} catch (error) {
					if (controller.signal.aborted) return null;
					if (mountedRef.current && request === dispatchSequenceRef.current) {
						const reply = {
							action,
							ok: false,
							code: "manage/transport",
							detail: "request failed: " + String(error)
						};
						const record = {
							id: ++resultSequenceRef.current,
							reply,
							receivedAt: Date.now()
						};
						if (MUTATING.has(action)) setMutationResult(record);
						else if (recordOutput) setReadResult(record);
					}
					return null;
				} finally {
					if (actionControllerRef.current === controller) actionControllerRef.current = null;
					if (MUTATING.has(action) && mountedRef.current) await fetchStatus();
					if (mountedRef.current && request === dispatchSequenceRef.current) {
						dispatchingRef.current = false;
						setBusy(null);
					}
				}
			}, [fetchStatus]);
			const loadExtensions = (0, react.useCallback)(async (recordOutput = true) => {
				const reply = await run("list_extensions", {}, recordOutput);
				if (reply !== null && reply.ok === true && Array.isArray(reply.data)) setExtRows(reply.data.map((row) => {
					if (typeof row === "string") return row;
					const value = recordOf(row);
					if (value !== null) {
						const name = stringOr(value["name"], "?");
						const version = typeof value["version"] === "string" ? value["version"] : typeof value["ver"] === "string" ? value["ver"] : "?";
						return name + " — " + version;
					}
					return String(row);
				}));
			}, [run]);
			const loadSnapshots = (0, react.useCallback)(async (recordOutput = true) => {
				const reply = await run("snapshot_list", {}, recordOutput);
				if (reply !== null && reply.ok === true && Array.isArray(reply.data)) setSnapRows(reply.data.map(String));
			}, [run]);
			function confirmRun(action, sentence, options = {}) {
				if (!window.confirm(sentence)) return;
				options.onUse?.();
				run(action, options.payload ?? {}).then((reply) => {
					if (reply !== null && (reply.ok === true || resultContract(reply).partial)) options.after?.();
				});
			}
			function forceSentence(value) {
				return " Force override: " + (value ? "ON." : "OFF.");
			}
			function changeModel(value) {
				const modelId = value.trim();
				setProvModel(value);
				if (modelOptions.length === 0) {
					if (provModel.trim() !== modelId) {
						setProvVariant("");
						setProvQuant("");
					}
					return;
				}
				const model = modelOptions.find((option) => option.id === modelId);
				if (model === void 0) {
					setProvVariant("");
					setProvQuant("");
					return;
				}
				const variant = model.variants.find((option) => option.id === provVariant) ?? model.variants[0];
				setProvVariant(variant?.id ?? "");
				setProvQuant(variant?.quants[0]?.id ?? "");
			}
			function changeVariant(value) {
				setProvVariant(value);
				const variant = selectedModel?.variants.find((option) => option.id === value);
				setProvQuant(variant?.quants[0]?.id ?? "");
			}
			function focusAction(action) {
				const target = document.getElementById("manage-" + action);
				if (target instanceof HTMLDetailsElement) target.open = true;
				(target?.querySelector("input, select, button"))?.focus();
				if (typeof target?.scrollIntoView === "function") target.scrollIntoView({ block: "start" });
			}
			function followNext(action) {
				if (action === "status") {
					fetchStatus();
					return;
				}
				if (action === "launch" && status?.endpoint?.reachable !== true) {
					confirmRun("launch", "Launch the ComfyUI server?");
					return;
				}
				if (action === "restart" && status?.endpoint?.reachable === true) {
					const force = lifecycleForce;
					confirmRun("restart", "Restart the ComfyUI server?" + forceSentence(force), {
						payload: { force },
						onUse: () => {
							setLifecycleForce(false);
						}
					});
					return;
				}
				focusAction(action);
			}
			const ep = status?.endpoint;
			const manager = status?.manager;
			const up = ep?.reachable === true;
			const byo = status?.routing?.mode === "byo";
			const activeRuns = status?.active_runs ?? [];
			const resources = status?.resources ?? [];
			const kind = healthKind(status, statusReceivedAt, statusLoading, statusError, now);
			const statusNextAction = status?.next_action ?? (up ? "status" : "launch");
			const locked = busy !== null;
			const visibleRead = readResult !== null && (mutationResult === null || readResult.id > mutationResult.id);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: assets_module_css_default.root,
				"data-comfy-manager": "",
				"aria-busy": statusLoading || locked,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: assets_module_css_default.title,
							children: "ComfyUI Manager"
						}), statusDetail !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: assets_module_css_default.sub,
							children: statusDetail
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section + " " + assets_module_css_default.healthPanel,
						"aria-live": "polite",
						"aria-busy": statusLoading,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.healthTop,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: healthDotClass(kind),
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthCopy,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
											className: assets_module_css_default.healthTitle,
											children: "Health"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											className: assets_module_css_default.healthLabel,
											"data-testid": "health-state",
											children: healthLabel(kind)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										"aria-busy": statusLoading,
										disabled: locked || statusLoading,
										variant: "primary",
										onClick: () => {
											fetchStatus();
										},
										children: "Refresh"
									})
								]
							}),
							statusError !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: status === null ? assets_module_css_default.dangerNote : assets_module_css_default.warningNote,
								children: [
									"Refresh failed: ",
									statusError,
									status === null ? "" : " · showing the last confirmed status"
								]
							}),
							statusLoading && status !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: "Refreshing · showing the last confirmed status"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
								className: assets_module_css_default.healthGrid,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Endpoint" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.wrapText,
											children: ep?.url ?? "not reported"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Engine" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [up ? "reachable" : "failure", ep?.reason === void 0 ? "" : " · " + ep.reason] })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "ComfyUI" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.mono,
											children: ep?.comfyui_version === void 0 || ep.comfyui_version === null ? "?" : displayValue(ep.comfyui_version)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Manager" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [manager?.reachable === true ? "reachable" : "failure", manager?.reason === void 0 ? "" : " · " + manager.reason] })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Manager version" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.mono,
											children: manager?.version === void 0 ? "?" : managerVersion(manager.version)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Manager queue" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: manager?.queue === void 0 ? "?" : queueSummary(manager.queue) })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Security" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.wrapText,
											children: manager?.security ?? "not reported"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Manager unit" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.wrapText,
											children: manager?.unit ?? "?"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Runs" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: activeRuns.length === 0 ? "idle" : activeRuns.length + " active · " + activeRuns.join(", ") })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: "Routing" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: displayValue(status?.routing) })]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.nextRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									disabled: locked,
									onClick: () => {
										followNext(statusNextAction);
									},
									children: ["Next: ", ACTION_LABELS[statusNextAction] ?? statusNextAction]
								}), statusReceivedAt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: assets_module_css_default.freshness,
									children: [
										"Updated ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
											dateTime: new Date(statusReceivedAt).toISOString(),
											children: receivedLabel(statusReceivedAt)
										}),
										" · ",
										freshness(statusReceivedAt, now)
									]
								})]
							}),
							(ep?.devices ?? []).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: assets_module_css_default.deviceList,
								children: (ep?.devices ?? []).map((device, index) => {
									const total = typeof device.vram_total === "number" ? device.vram_total : 0;
									const free = typeof device.vram_free === "number" ? device.vram_free : 0;
									const percent = total > 0 ? Math.max(0, Math.min(100, Math.round(free / total * 100))) : 0;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.device,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: assets_module_css_default.kvKey,
												children: device.name ?? "gpu"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: assets_module_css_default.bar,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: assets_module_css_default.barFill,
													style: { width: percent + "%" }
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: assets_module_css_default.mono,
												children: [
													gb(free),
													" / ",
													gb(total),
													" GB free"
												]
											})
										]
									}, String(device.name ?? index));
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-endpoint_set",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "Endpoint settings" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: assets_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: "server url",
										value: epUrl,
										placeholder: "http://127.0.0.1:8188",
										mono: true,
										onChange: setEpUrl
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										"aria-busy": busy === "endpoint_set",
										disabled: locked || epUrl.trim() === "" || busy === "endpoint_set",
										onClick: () => {
											run("endpoint_set", { url: epUrl.trim() });
										},
										children: "Set"
									})]
								})]
							})
						]
					}),
					(mutationResult !== null || visibleRead) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section + " " + assets_module_css_default.resultDock,
						"data-testid": "manage-result",
						"aria-live": "polite",
						"aria-busy": locked,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.resultHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: assets_module_css_default.sectionTitle,
									children: "Result dock"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									onClick: () => {
										setMutationResult(null);
										setReadResult(null);
									},
									children: "Clear result"
								})]
							}),
							mutationResult !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResultRecordView, {
								record: mutationResult,
								kind: "mutation",
								now,
								locked,
								onFollow: followNext
							}),
							visibleRead && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResultRecordView, {
								record: readResult,
								kind: "output",
								now,
								locked,
								onFollow: followNext
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
						className: assets_module_css_default.section,
						id: "manage-loras",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoraBlock, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-resources",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: ["Declared resources ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.count,
									children: resources.length
								})]
							}),
							resources.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: "No declared resources reported."
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: assets_module_css_default.resourceList,
								"data-testid": "resource-status",
								children: resources.map((resource, index) => {
									const state = resource.state ?? "unknown";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: assets_module_css_default.resourceRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: assets_module_css_default.resourceMain,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: resourceStateClass(state),
														children: state
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: assets_module_css_default.resourceName,
														children: resourceLabel(resource)
													}),
													resource.operation_id !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: assets_module_css_default.mono,
														children: ["operation_id: ", resource.operation_id]
													})
												]
											}),
											resource.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: assets_module_css_default.sub,
												children: resource.detail
											}),
											(resource.items ?? []).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
												className: assets_module_css_default.resourceItems,
												children: (resource.items ?? []).map((item, itemIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
													className: assets_module_css_default.resourceItem,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: resourceStateClass(item.state ?? "unknown"),
															children: item.state ?? "unknown"
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.mono,
															children: item.key ?? item.kind ?? "item"
														}),
														item.outcome !== void 0 && item.outcome !== item.state && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.sub,
															children: item.outcome
														}),
														item.integrity !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.sub,
															children: item.integrity
														}),
														item.errorCode !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.errorCode,
															children: item.errorCode
														}),
														item.path !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.wrapText,
															children: item.path
														}),
														item.sha256 !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.hash,
															children: item.sha256
														}),
														item.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.sub,
															children: item.detail
														})
													]
												}, item.key ?? String(itemIndex)))
											})
										]
									}, resourceLabel(resource) + ":" + index);
								})
							}),
							status?.resources_detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: assets_module_css_default.warningNote,
								children: ["Resource scan: ", status.resources_detail]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-list_extensions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Extensions"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "filter installed",
									value: extFilter,
									placeholder: "kj, moge…",
									onChange: setExtFilter
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "list_extensions",
									disabled: locked || busy === "list_extensions",
									onClick: () => {
										loadExtensions();
									},
									children: "Installed packs"
								})]
							}),
							extRows !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
								className: assets_module_css_default.list,
								"data-testid": "ext-list",
								children: [extRows.filter((row) => row.toLowerCase().includes(extFilter.trim().toLowerCase())).map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.wrapText,
										children: row
									})
								}, row)), extRows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: "no packs installed"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "declared registry ids",
									value: extIds,
									placeholder: "ComfyUI-KJNodes, ComfyUI-VideoHelperSuite",
									mono: true,
									onChange: setExtIds
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "install_extension",
									disabled: locked || extIds.trim() === "" || busy === "install_extension",
									onClick: () => {
										const nodes = extIds.split(",").map((value) => value.trim()).filter((value) => value !== "");
										confirmRun("install_extension", "Install declared extension pack(s) " + nodes.join(", ") + " through the manager rail?", {
											payload: { nodes },
											after: () => {
												if (extRows !== null) loadExtensions(false);
											}
										});
									},
									children: "Install"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-install_extension_url",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.operatorBadge,
										children: "Operator only · raw URL"
									}), " Install extension from URL"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: assets_module_css_default.operatorNote,
										children: "This bypasses the declared registry ids. Use only for an operator-vetted source."
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
											label: "git URL (ComfyUI-Manager)",
											value: extUrl,
											placeholder: "https://github.com/…",
											mono: true,
											onChange: setExtUrl
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											"aria-busy": busy === "install_extension_url",
											disabled: locked || extUrl.trim() === "" || busy === "install_extension_url",
											onClick: () => {
												const url = extUrl.trim();
												confirmRun("install_extension_url", "Install extension from operator-vetted URL " + url + "?", {
													payload: { url },
													after: () => {
														if (extRows !== null) loadExtensions(false);
													}
												});
											},
											children: "Install from URL"
										})]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-search_models",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Models"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "search Manager external index",
									value: modelQuery,
									placeholder: "sdxl, wan…",
									onChange: setModelQuery
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "search_models",
									disabled: locked || modelQuery.trim() === "" || busy === "search_models",
									onClick: () => {
										run("search_models", { query: modelQuery.trim() });
									},
									children: "Search"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-provision_model",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "Provision a declared model" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchField, {
												label: "provision catalog id",
												value: provModel,
												options: modelOptions.map((model) => ({
													value: model.id,
													label: model.label + (model.genre === void 0 ? "" : " · " + model.genre)
												})),
												placeholder: "Search declared models…",
												mono: true,
												onChange: changeModel
											}),
											modelOptions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: "variant",
												value: provVariant,
												onChange: setProvVariant
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: "quant",
												value: provQuant,
												onChange: setProvQuant
											})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
												label: "variant",
												value: provVariant,
												options: (selectedModel?.variants ?? []).map((variant) => ({
													value: variant.id,
													label: variant.label
												})),
												placeholder: "Default variant",
												disabled: selectedModel === void 0,
												onChange: changeVariant
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
												label: "quant",
												value: provQuant,
												options: quantOptions.map((quant) => ({
													value: quant.id,
													label: quant.label
												})),
												placeholder: "Default quant",
												disabled: selectedVariant === void 0 || quantOptions.length === 0,
												onChange: setProvQuant
											})] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												"aria-busy": busy === "provision_model",
												disabled: busy === "provision_model" || locked || provModel.trim() === "" || modelOptions.length > 0 && selectedModel === void 0,
												onClick: () => {
													const payload = { model: provModel.trim() };
													if (provVariant.trim() !== "") payload.variant = provVariant.trim();
													if (provQuant.trim() !== "") payload.quant = provQuant.trim();
													confirmRun("provision_model", "Provision declared model " + provModel.trim() + " from the catalog?", { payload });
												},
												children: "Provision"
											})
										]
									}),
									status?.model_options_detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
										className: assets_module_css_default.warningNote,
										children: ["Model catalog: ", status.model_options_detail]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-download_model",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.operatorBadge,
										children: "Operator only · raw URL"
									}), " Download a model from URL"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: assets_module_css_default.operatorNote,
										children: "Prefer a declared catalog id. Raw downloads are outside the resource declaration."
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: "download URL (Manager)",
												value: dlUrl,
												placeholder: "https://…/model.safetensors",
												mono: true,
												onChange: setDlUrl
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: "relative path",
												value: dlPath,
												placeholder: "models/checkpoints",
												mono: true,
												onChange: setDlPath
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: "filename",
												value: dlName,
												placeholder: "model.safetensors",
												mono: true,
												onChange: setDlName
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												"aria-busy": busy === "download_model",
												disabled: locked || dlUrl.trim() === "" || busy === "download_model",
												onClick: () => {
													const payload = { url: dlUrl.trim() };
													if (dlPath.trim() !== "") payload.relative_path = dlPath.trim();
													if (dlName.trim() !== "") payload.filename = dlName.trim();
													confirmRun("download_model", "Queue operator-vetted download of " + (dlName.trim() || dlUrl.trim()) + "?", { payload });
												},
												children: "Download"
											})
										]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-snapshot_list",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Snapshots"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: "Save before update or version switch. Restore needs restart and uses its own one-shot force control."
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "snapshot_list",
									disabled: locked || busy === "snapshot_list",
									onClick: () => {
										loadSnapshots();
									},
									children: "List snapshots"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "snapshot_save",
									disabled: locked || busy === "snapshot_save",
									variant: "primary",
									onClick: () => {
										confirmRun("snapshot_save", "Save an environment snapshot (ComfyUI + packs + dependencies)?", { after: () => {
											loadSnapshots(false);
										} });
									},
									children: "Save snapshot"
								})]
							}),
							snapRows !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
								className: assets_module_css_default.list,
								"data-testid": "snap-list",
								children: [snapRows.map((snapshot) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: assets_module_css_default.listRow + " " + assets_module_css_default.snapshotRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: assets_module_css_default.wrapText,
										children: snapshot
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										className: assets_module_css_default.btnDanger,
										"aria-busy": busy === "snapshot_restore",
										disabled: locked || busy === "snapshot_restore",
										onClick: () => {
											const force = restoreForce;
											confirmRun("snapshot_restore", "Restore snapshot " + snapshot + "? This rewrites extensions and dependencies." + forceSentence(force), {
												payload: {
													snapshot,
													force
												},
												onUse: () => {
													setRestoreForce(false);
												},
												after: () => {
													loadSnapshots(false);
												}
											});
										},
										children: "Restore"
									})]
								}, snapshot)), snapRows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: "no snapshots — save one before switch/update"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
								className: assets_module_css_default.checkRow,
								checked: restoreForce,
								label: "Force the next snapshot restore",
								disabled: locked,
								onChange: setRestoreForce
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-logs",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: assets_module_css_default.sectionTitle,
							children: "Logs"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: assets_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "tail lines",
								value: logTail,
								onChange: setLogTail,
								mono: true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								"aria-busy": busy === "logs",
								disabled: locked || busy === "logs",
								onClick: () => {
									run("logs", { tail: Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2e3)) });
								},
								children: "View logs"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-lifecycle",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: "Lifecycle"
							}),
							activeRuns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: assets_module_css_default.dangerNote,
								children: [activeRuns.length, " active run(s). Guarded actions refuse unless their one-shot force control is ON."]
							}),
							up && !byo ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: assets_module_css_default.lifecycleActions,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											"aria-busy": busy === "restart",
											disabled: locked || busy === "restart",
											className: assets_module_css_default.btnDanger,
											onClick: () => {
												const force = lifecycleForce;
												confirmRun("restart", "Restart the ComfyUI server?" + forceSentence(force), {
													payload: { force },
													onUse: () => {
														setLifecycleForce(false);
													}
												});
											},
											children: "Restart"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											"aria-busy": busy === "stop",
											disabled: locked || busy === "stop",
											className: assets_module_css_default.btnDanger,
											onClick: () => {
												const force = lifecycleForce;
												confirmRun("stop", "Stop the ComfyUI server?" + forceSentence(force), {
													payload: { force },
													onUse: () => {
														setLifecycleForce(false);
													}
												});
											},
											children: "Stop"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											"aria-busy": busy === "free",
											disabled: locked || busy === "free",
											onClick: () => {
												const force = lifecycleForce;
												confirmRun("free", "Ask ComfyUI to free memory on its next worker iteration?" + forceSentence(force), {
													payload: { force },
													onUse: () => {
														setLifecycleForce(false);
													}
												});
											},
											children: "Free VRAM"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
									className: assets_module_css_default.checkRow,
									checked: lifecycleForce,
									label: "Force the next guarded lifecycle action",
									disabled: locked,
									onChange: setLifecycleForce
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
									className: assets_module_css_default.advanced,
									id: "manage-update",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "Advanced update" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: assets_module_css_default.row,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											"aria-busy": busy === "update",
											disabled: locked || busy === "update",
											className: assets_module_css_default.btnDanger,
											onClick: () => {
												const force = lifecycleForce;
												confirmRun("update", "Update ComfyUI through the built-in manager?" + forceSentence(force), {
													payload: {
														target: "comfy",
														force
													},
													onUse: () => {
														setLifecycleForce(false);
													}
												});
											},
											children: "Update ComfyUI"
										})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
									className: assets_module_css_default.advanced,
									id: "manage-switch_version",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "Switch ComfyUI version" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											comfyuiVersions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: "switch to version",
												value: swVersion,
												placeholder: "commit / tag",
												mono: true,
												onChange: setSwVersion
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
												label: "switch to version",
												value: swVersion,
												options: comfyuiVersions.map((version) => ({
													value: version.id,
													label: version.label
												})),
												placeholder: "Select version / tag",
												onChange: setSwVersion
											}),
											status?.comfyui_versions_detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												className: assets_module_css_default.warningNote,
												children: ["Version catalog: ", status.comfyui_versions_detail]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												"aria-busy": busy === "switch_version",
												disabled: locked || swVersion.trim() === "" || busy === "switch_version",
												className: assets_module_css_default.btnDanger,
												onClick: () => {
													const force = lifecycleForce;
													confirmRun("switch_version", "Switch ComfyUI to " + swVersion.trim() + "?" + forceSentence(force), {
														payload: {
															version: swVersion.trim(),
															force
														},
														onUse: () => {
															setLifecycleForce(false);
														}
													});
												},
												children: "Switch"
											})
										]
									})]
								})
							] }) : status === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: "Lifecycle controls unlock after status loads."
							}) : byo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: "BYO endpoint selected. Estate lifecycle controls are unavailable; use Endpoint settings to choose the managed engine."
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: assets_module_css_default.lifecycleActions,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "launch",
									disabled: locked || busy === "launch",
									variant: "primary",
									onClick: () => {
										confirmRun("launch", "Launch the ComfyUI server?");
									},
									children: "Launch"
								})
							})
						]
					})
				]
			});
		}
		function ComfyIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.5",
						y: "2.5",
						width: "11",
						height: "4.6",
						rx: "1.2",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.5",
						y: "8.9",
						width: "11",
						height: "4.6",
						rx: "1.2",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.1",
						cy: "4.8",
						r: "0.9",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.1",
						cy: "11.2",
						r: "0.9",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8.2 4.8h3.2M8.2 11.2h3.2",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					})
				]
			});
		}
		function register(ctx, id, kind, title, guideOrder, guideDescription, icon, component) {
			ctx.effect(() => ctx.sidebarRightTabs.register({
				id,
				kind,
				title: () => title,
				guide: [{
					id: `${id}-guide`,
					order: guideOrder,
					title: () => title,
					description: () => guideDescription,
					icon
				}]
			}), "melite-card-deck: " + id + " tab type");
			ctx.slots.inject("sidebar.right.pane.tab", () => {
				const dispose = ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: id
				}, component);
				return typeof dispose === "function" ? dispose : () => {};
			});
		}
		function registerAssetsTab(ctx) {
			register(ctx, "melite-card-deck:comfy", "comfy-manager", "ComfyUI Manager", 61, "The estate's ComfyUI manager — packs, snapshots, status.", ComfyIcon, ComfyManagerPanel);
		}
		//#endregion
		//#region src/client/index.ts
		/** 'slots' (seat declarations) + the native right-sidebar tab registry
		*  (ui-sidebar-right, the web profile's own subsystem) — hosts the
		*  tabs — + the mounted estate remotes: the manage namespace carries
		*  the panel's transport (the loader guarantees it exists when apply
		*  runs; the mounter is @melite-plugin/dsh-card-view's client, which
		*  mounts every estate contribution). */
		const inject = [
			"slots",
			"sidebarRightTabs",
			"remote",
			"remote.manage"
		];
		function apply(ctx) {
			if (!claimDeckApply()) return;
			ctx.effect(() => releaseDeckApply, "melite-card-deck: apply claim");
			seatManageNamespace(ctx.remote.manage);
			try {
				registerAssetsTab(ctx);
			} catch (error) {
				console.error("[melite-card-deck] assets tab registration failed:", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
