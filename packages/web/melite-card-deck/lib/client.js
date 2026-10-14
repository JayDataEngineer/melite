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
		//#region \0dsh-css:packages/web/melite-card-deck/src/client/assets.module.css.mjs
		const css = ".zcZoIq_root{box-sizing:border-box;width:100%;min-width:0;max-width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:10px;padding:clamp(8px,3cqi,12px);font-size:12px;line-height:1.4;display:flex;overflow:hidden auto;container-type:inline-size}.zcZoIq_root,.zcZoIq_root *{box-sizing:border-box}.zcZoIq_head,.zcZoIq_healthTop,.zcZoIq_resultHead,.zcZoIq_resultRecordHead,.zcZoIq_nextRow,.zcZoIq_resultItem,.zcZoIq_resourceItem,.zcZoIq_lifecycleActions,.zcZoIq_checkRow,.zcZoIq_device{min-width:0}.zcZoIq_head{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px;display:flex}.zcZoIq_title{letter-spacing:.02em;margin:0;font-size:14px;font-weight:650}.zcZoIq_sub,.zcZoIq_freshness,.zcZoIq_resultKind,.zcZoIq_resultDataLabel{opacity:.72;overflow-wrap:anywhere;font-size:11px}.zcZoIq_section{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:10px;flex-direction:column;gap:8px;min-width:0;padding:10px;display:flex}.zcZoIq_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.68;align-items:center;gap:6px;margin:0;font-size:11px;font-weight:650;display:flex}.zcZoIq_count{background:color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);border-radius:999px;justify-content:center;align-items:center;min-width:20px;padding:1px 6px;font-size:10px;display:inline-flex}.zcZoIq_healthPanel{gap:7px}.zcZoIq_healthTop{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.zcZoIq_healthCopy{flex-direction:column;flex:150px;min-width:0;display:flex}.zcZoIq_healthTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.58;margin:0;font-size:10px;font-weight:600}.zcZoIq_healthLabel{overflow-wrap:anywhere;font-size:13px}.zcZoIq_healthGrid{grid-template-columns:repeat(auto-fit,minmax(min(128px,100%),1fr));gap:6px 10px;margin:0;display:grid}.zcZoIq_healthItem{border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 75%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-base) 55%, transparent);border-radius:7px;min-width:0;padding:5px 7px}.zcZoIq_healthItem dt{text-transform:uppercase;letter-spacing:.05em;opacity:.58;margin-bottom:2px;font-size:10px;font-weight:600}.zcZoIq_healthItem dd{overflow-wrap:anywhere;min-width:0;margin:0;font-size:11px}.zcZoIq_row{flex-flow:wrap;align-items:flex-end;gap:6px;min-width:0;display:flex}.zcZoIq_row>label{flex:150px;min-width:0;max-width:100%}.zcZoIq_field{flex-direction:column;gap:3px;min-width:0;display:flex}.zcZoIq_fieldLabel{opacity:.74;font-size:11px;font-weight:550}.zcZoIq_input{box-sizing:border-box;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);width:100%;min-width:0;max-width:100%;color:inherit;border-radius:7px;padding:6px 8px;font-family:inherit;font-size:12px}.zcZoIq_input:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.zcZoIq_mono,.zcZoIq_hash{font-family:ui-monospace,monospace;font-size:11px}.zcZoIq_chipRow{flex-wrap:wrap;gap:4px;min-width:0;display:flex}.zcZoIq_chip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:7px;align-items:center;gap:4px;padding:3px 4px 3px 7px;font-size:11px;line-height:1;display:inline-flex}.zcZoIq_chipX{color:inherit;cursor:pointer;font:inherit;background:0 0;border:none;border-radius:4px;padding:2px 4px;font-size:13px;line-height:1}.zcZoIq_chipX:hover{background:var(--dsw-alias-border-l1)}.zcZoIq_wrapText,.zcZoIq_hash{overflow-wrap:anywhere;word-break:break-word;min-width:0;max-width:100%}.zcZoIq_btnDanger{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);color:var(--dsw-alias-state-error-primary)}.zcZoIq_dot{border-radius:50%;flex:none;width:9px;height:9px}.zcZoIq_dotOk{background:var(--dsw-alias-state-business-primary);}.zcZoIq_dotWarn{background:color-mix(in srgb, var(--dsw-alias-label-primary) 55%, transparent);}.zcZoIq_dotBad{background:var(--dsw-alias-state-error-primary);}.zcZoIq_kvKey{overflow-wrap:anywhere;min-width:0;font-weight:600}.zcZoIq_deviceList{flex-direction:column;gap:5px;display:flex}.zcZoIq_device{grid-template-columns:minmax(54px,auto) minmax(40px,1fr) auto;align-items:center;gap:7px;display:grid}.zcZoIq_bar{background:color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);border-radius:3px;min-width:0;height:5px;display:block;overflow:hidden}.zcZoIq_barFill{background:var(--dsw-alias-state-business-primary);border-radius:3px;height:100%;display:block}.zcZoIq_advanced{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent);border-radius:8px;min-width:0;padding:7px 8px}.zcZoIq_advanced>summary{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;cursor:pointer;font-size:11px;font-weight:600}.zcZoIq_advanced[open]{flex-direction:column;gap:8px;display:flex}.zcZoIq_operatorBadge{border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);letter-spacing:.04em;text-transform:uppercase;border-radius:999px;margin-right:5px;padding:1px 6px;font-size:9px;font-weight:700;display:inline-block}.zcZoIq_operatorNote,.zcZoIq_warningNote{color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary));overflow-wrap:anywhere;margin:0;font-size:11px}.zcZoIq_dangerNote,.zcZoIq_errorCode{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0;font-size:11px}.zcZoIq_resultDock{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-border-l1))}.zcZoIq_resultHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;display:flex}.zcZoIq_resultRecord{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;flex-direction:column;gap:6px;min-width:0;padding:8px;display:flex}.zcZoIq_resultRecord+.zcZoIq_resultRecord{margin-top:7px}.zcZoIq_resultRecordHead{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.zcZoIq_resultAction,.zcZoIq_resourceName{overflow-wrap:anywhere;min-width:0;font-family:ui-monospace,monospace;font-size:11px;font-weight:600}.zcZoIq_resultKind{margin-left:auto}.zcZoIq_resultOk,.zcZoIq_resultWarn,.zcZoIq_resultBad,.zcZoIq_stateOk,.zcZoIq_stateWarn,.zcZoIq_stateBad,.zcZoIq_stateNeutral{border:1px solid var(--dsw-alias-border-l2);letter-spacing:.05em;overflow-wrap:anywhere;border-radius:999px;align-items:center;max-width:100%;padding:2px 7px;font-size:9px;font-weight:700;line-height:1.25;display:inline-flex}.zcZoIq_resultOk,.zcZoIq_stateOk{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);color:var(--dsw-alias-state-business-primary)}.zcZoIq_resultWarn,.zcZoIq_stateWarn{border-color:color-mix(in srgb, var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary)) 65%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary)) 12%, transparent);color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-primary))}.zcZoIq_resultBad,.zcZoIq_stateBad{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);color:var(--dsw-alias-state-error-primary)}.zcZoIq_stateNeutral{background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent)}.zcZoIq_resultMeta,.zcZoIq_resultFlags{grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr));gap:4px 8px;min-width:0;font-size:11px;display:grid}.zcZoIq_resultMeta>span,.zcZoIq_resultFlags>span{overflow-wrap:anywhere;min-width:0}.zcZoIq_resultDetail{overflow-wrap:anywhere;margin:0;font-size:11px}.zcZoIq_nextRow{flex-wrap:wrap;align-items:center;gap:7px;display:flex}.zcZoIq_resultItem,.zcZoIq_resourceItem{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 72%, transparent);border-radius:7px;flex-wrap:wrap;align-items:center;gap:5px 8px;padding:5px 6px;display:flex}.zcZoIq_resultItem+.zcZoIq_resultItem,.zcZoIq_resourceItem+.zcZoIq_resourceItem{margin-top:4px}.zcZoIq_resultData{flex-direction:column;gap:4px;min-width:0;display:flex}.zcZoIq_pre{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 70%, transparent);white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;border-radius:7px;min-width:0;max-width:100%;max-height:min(42vh,360px);margin:0;padding:7px;font-family:ui-monospace,monospace;font-size:11px;line-height:1.45;overflow:auto}.zcZoIq_resourceList,.zcZoIq_resourceItems,.zcZoIq_list{min-width:0;margin:0;padding:0;list-style:none}.zcZoIq_resourceList,.zcZoIq_list{flex-direction:column;gap:5px;display:flex}.zcZoIq_resourceRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:8px;min-width:0;padding:7px}.zcZoIq_resourceRow>.zcZoIq_sub{margin-top:4px}.zcZoIq_resourceFold{flex-direction:column;gap:4px;min-width:0;display:flex}.zcZoIq_resourceFold>summary{cursor:pointer;flex-wrap:wrap;align-items:center;gap:5px 8px;min-width:0;list-style:none;display:flex}.zcZoIq_resourceFold>summary::-webkit-details-marker{display:none}.zcZoIq_resourceFold>summary:before{content:\"▸\";color:var(--dsw-alias-label-secondary);flex:none;font-size:9px}.zcZoIq_resourceFold[open]>summary:before{content:\"▾\"}.zcZoIq_resourceFold[open]{gap:6px}.zcZoIq_resourceItems{flex-direction:column;gap:4px;margin-top:5px;display:flex}.zcZoIq_resourceItem{padding:4px 5px}.zcZoIq_listRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:7px;justify-content:space-between;align-items:center;gap:6px 8px;min-width:0;padding:5px 7px;display:flex}.zcZoIq_snapshotRow>.zcZoIq_wrapText{flex:150px}.zcZoIq_lifecycleActions{flex-wrap:wrap;gap:6px;display:flex}@container (width<=330px){.zcZoIq_root{gap:8px;padding:8px}.zcZoIq_section{padding:8px}.zcZoIq_healthGrid,.zcZoIq_resultMeta,.zcZoIq_resultFlags{grid-template-columns:minmax(0,1fr)}.zcZoIq_row>label,.zcZoIq_healthCopy{flex-basis:100%}.zcZoIq_device{grid-template-columns:minmax(0,1fr)}.zcZoIq_bar{grid-row:2}.zcZoIq_resultKind{width:100%;margin-left:0}}";
		const tagId = "@melite-plugin/dsh-card-deck/assets.module.css@40f98e92";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var assets_module_css_default = {
			"advanced": "zcZoIq_advanced",
			"bar": "zcZoIq_bar",
			"barFill": "zcZoIq_barFill",
			"btnDanger": "zcZoIq_btnDanger",
			"checkRow": "zcZoIq_checkRow",
			"chip": "zcZoIq_chip",
			"chipRow": "zcZoIq_chipRow",
			"chipX": "zcZoIq_chipX",
			"count": "zcZoIq_count",
			"dangerNote": "zcZoIq_dangerNote",
			"device": "zcZoIq_device",
			"deviceList": "zcZoIq_deviceList",
			"dot": "zcZoIq_dot",
			"dotBad": "zcZoIq_dotBad",
			"dotOk": "zcZoIq_dotOk",
			"dotWarn": "zcZoIq_dotWarn",
			"errorCode": "zcZoIq_errorCode",
			"field": "zcZoIq_field",
			"fieldLabel": "zcZoIq_fieldLabel",
			"freshness": "zcZoIq_freshness",
			"hash": "zcZoIq_hash",
			"head": "zcZoIq_head",
			"healthCopy": "zcZoIq_healthCopy",
			"healthGrid": "zcZoIq_healthGrid",
			"healthItem": "zcZoIq_healthItem",
			"healthLabel": "zcZoIq_healthLabel",
			"healthPanel": "zcZoIq_healthPanel",
			"healthTitle": "zcZoIq_healthTitle",
			"healthTop": "zcZoIq_healthTop",
			"input": "zcZoIq_input",
			"kvKey": "zcZoIq_kvKey",
			"lifecycleActions": "zcZoIq_lifecycleActions",
			"list": "zcZoIq_list",
			"listRow": "zcZoIq_listRow",
			"mono": "zcZoIq_mono",
			"nextRow": "zcZoIq_nextRow",
			"operatorBadge": "zcZoIq_operatorBadge",
			"operatorNote": "zcZoIq_operatorNote",
			"pre": "zcZoIq_pre",
			"resourceFold": "zcZoIq_resourceFold",
			"resourceItem": "zcZoIq_resourceItem",
			"resourceItems": "zcZoIq_resourceItems",
			"resourceList": "zcZoIq_resourceList",
			"resourceName": "zcZoIq_resourceName",
			"resourceRow": "zcZoIq_resourceRow",
			"resultAction": "zcZoIq_resultAction",
			"resultBad": "zcZoIq_resultBad",
			"resultData": "zcZoIq_resultData",
			"resultDataLabel": "zcZoIq_resultDataLabel",
			"resultDetail": "zcZoIq_resultDetail",
			"resultDock": "zcZoIq_resultDock",
			"resultFlags": "zcZoIq_resultFlags",
			"resultHead": "zcZoIq_resultHead",
			"resultItem": "zcZoIq_resultItem",
			"resultKind": "zcZoIq_resultKind",
			"resultMeta": "zcZoIq_resultMeta",
			"resultOk": "zcZoIq_resultOk",
			"resultRecord": "zcZoIq_resultRecord",
			"resultRecordHead": "zcZoIq_resultRecordHead",
			"resultWarn": "zcZoIq_resultWarn",
			"root": "zcZoIq_root",
			"row": "zcZoIq_row",
			"section": "zcZoIq_section",
			"sectionTitle": "zcZoIq_sectionTitle",
			"snapshotRow": "zcZoIq_snapshotRow",
			"stateBad": "zcZoIq_stateBad",
			"stateNeutral": "zcZoIq_stateNeutral",
			"stateOk": "zcZoIq_stateOk",
			"stateWarn": "zcZoIq_stateWarn",
			"sub": "zcZoIq_sub",
			"title": "zcZoIq_title",
			"warningNote": "zcZoIq_warningNote",
			"wrapText": "zcZoIq_wrapText"
		};
		//#endregion
		//#region src/assetsCopy.ts
		/**
		* assetsCopy.ts — THE ASSET-BROWSER CHROME COPY DICTIONARY (the deck's
		* locale-owned copy surface, 2026-11-05). Client UI copy is locale-owned
		* (the estate's decision, mirrored from card-base's square.ts and the h3
		* studio's studioCopy.ts): presentation code owns no product-copy
		* literals; it consumes them here by property. This module is the LOCALE
		* OWNER for every user-visible string the ComfyUI Manager sidebar renders
		* — client/assets-tab.tsx (the manager tab: health, endpoint, declared
		* resources, extensions, models, snapshots, logs, lifecycle) and
		* client/lora-section.tsx (the LoRA block). Melite ships one locale
		* (English); a second locale plugs into this dictionary without touching
		* a single panel component. THE BOUND: static chrome faces live here
		* (group labels, action buttons, empty states, aria names, field labels,
		* placeholders); live wire DATA (run ids, file names, counts, version
		* rows, detail strings) rides dict functions with typed params — the
		* dictionary owns the static sentence shape, the site feeds the values.
		*/
		/** The typed dictionary. Keys are stable copy ids; template entries take exactly the params they declare. */
		// v8 ignore next -- exercised key-by-key by the client-copy census wall (the deck tree pins zero)
		const assetsCopy = {
			/** Next-button label for the status arm. */
			actionRefreshStatus: "Refresh status",
			/** Next-button label for the endpoint arm. */
			actionSetEndpoint: "Set endpoint",
			/** Next-button label for the installed-packs review arm. */
			actionReviewPacks: "Review installed packs",
			/** Next-button label for the declared-packs install arm. */
			actionInstallDeclared: "Install declared packs",
			/** Next-button label for the raw-URL pack arm. */
			actionOpenRawPack: "Open raw-URL pack install",
			/** Next-button label for the model-search arm. */
			actionSearchModels: "Search models",
			/** Next-button label for the declared-model provision arm. */
			actionProvisionModel: "Provision declared model",
			/** Next-button label for the raw-URL model arm. */
			actionOpenRawModel: "Open raw-URL model download",
			/** Next-button label for the LoRA-list arm. */
			actionListLoras: "List LoRAs the engine accepts",
			/** Next-button label for the LoRA-install arm. */
			actionCopyLora: "Copy a LoRA in",
			/** Next-button label for the snapshot-review arm. */
			actionReviewSnapshots: "Review snapshots",
			/** Next-button label for the snapshot-restore arm. */
			actionRestoreSnapshot: "Restore snapshot",
			/** Next-button label for the launch arm. */
			actionLaunch: "Launch ComfyUI",
			/** Next-button label for the restart arm. */
			actionRestart: "Restart ComfyUI",
			/** Next-button label for the stop arm. */
			actionStop: "Stop ComfyUI",
			/** Manager queue roll-up; params are the live queue counters. */
			queueSummary: (p) => (p.processing ? "working" : "idle") + " · " + String(p.active) + " active · " + String(p.done) + "/" + String(p.total) + " complete",
			/** Freshness word for a stale status payload. */
			freshnessStale: "stale",
			/** Freshness word for a just-received status payload. */
			freshnessFresh: "fresh",
			/** Freshness sentence; the site feeds the live age in seconds. */
			freshnessAged: (p) => String(p.seconds) + "s old",
			/** Received-time suffix; the site feeds the preformatted clock time. */
			receivedUtc: (p) => p.time + " UTC",
			/** Health state while the first status is in flight. */
			healthLoading: "Loading status",
			/** Health state when the last confirmed status is old or error-backed. */
			healthStale: "Stale status",
			/** Health state when engine and manager both answer. */
			healthReachable: "Engine + manager reachable",
			/** Health state when the manager door refuses. */
			healthManagerFailure: "Manager failure",
			/** Health state when the engine endpoint refuses. */
			healthEngineFailure: "Engine failure",
			/** Health state when no status was ever confirmed. */
			healthUnavailable: "Status unavailable",
			/** Fallback label for a resource with no reference. */
			resourceFallback: "resource",
			/** Accessible name of the raw result-output panes. */
			resultOutputAria: "Result output",
			/** Result badge for a partial mutation. */
			resultPartial: "PARTIAL",
			/** Result badge when the mutation needs a restart. */
			resultRestartRequired: "RESTART REQUIRED",
			/** Result badge for a refused dispatch. */
			resultRefused: "REFUSED",
			/** Result badge for a clean dispatch. */
			resultOk: "OK",
			/** Accessible name of the last-mutation record. */
			mutationResultAria: "Last mutation result",
			/** Accessible name of the latest-read record. */
			readResultAria: "Latest read result",
			/** Fallback token when the wire names no action. */
			unknownFallback: "unknown",
			/** Fallback token when the wire names no item. */
			itemFallback: "item",
			/** Fallback token when a provision list is empty. */
			noneFallback: "none",
			/** Kind tag of the last-mutation record. */
			mutationKind: "last mutation",
			/** Kind tag of the latest-read record. */
			readKind: "latest read",
			/** Result-meta label for the envelope state. */
			stateLabel: "State:",
			/** Result-meta label for the envelope operation id. */
			operationIdLabel: "operation_id:",
			/** Result-meta label for the refusal code. */
			errorCodeLabel: "Error code:",
			/** Result-meta label for the receive time. */
			receivedLabel: "Received:",
			/** Result-body label for the human detail. */
			detailLabel: "Detail:",
			/** Fallback refusal code when the wire names none. */
			refusedCodeFallback: "manage/refused",
			/** HTTP-status suffix; the site feeds the live status code. */
			httpSuffix: (p) => " · HTTP " + String(p.status),
			/** Result-flags label for the partial bit. */
			partialLabel: "Partial:",
			/** Result-flags label for the restart bit. */
			restartRequiredLabel: "Restart required:",
			/** Flag value for a set bit. */
			yesValue: "yes",
			/** Flag value for a clear bit. */
			noValue: "no",
			/** Follow-up button sentence; the site feeds the resolved action label. */
			nextLabel: (p) => "Next: " + p.label,
			/** Provision-flags label for the requested ids. */
			requestedLabel: "Requested:",
			/** Provision-flags label for the succeeded ids. */
			succeededLabel: "Succeeded:",
			/** Provision-flags label for the missed ids. */
			missedLabel: "Missed:",
			/** Provision-flags label for the miss details. */
			detailsLabel: "Details:",
			/** Fallback token when a provision error names no file. */
			errorFileFallback: "error",
			/** Fallback token when a provision error carries no message. */
			errorDetailFallback: "failed",
			/** Result-data section label for a raw payload. */
			outputLabel: "Output",
			/** Resource-row operation id; the site feeds the live id. */
			operationIdValue: (p) => "operation_id: " + p.id,
			/** Confirm-sentence tail for the one-shot force control. */
			forceSentence: (p) => " Force override: " + (p.on ? "ON." : "OFF."),
			/** Panel title of the manager tab. */
			panelTitle: "ComfyUI Manager",
			/** Health section title. */
			healthTitle: "Health",
			/** Health refresh button. */
			refreshButton: "Refresh",
			/** Refresh-failure note; the site feeds the live error and whether a confirmed status stands behind it. */
			refreshFailedNote: (p) => "Refresh failed: " + p.error + (p.showingLast ? " · showing the last confirmed status" : ""),
			/** Loading note while a refresh covers a confirmed status. */
			refreshingNote: "Refreshing · showing the last confirmed status",
			/** Health-grid term for the engine URL. */
			endpointTerm: "Endpoint",
			/** Health-grid fallback when the wire reports no value. */
			notReported: "not reported",
			/** Health-grid term for the engine reachability row. */
			engineTerm: "Engine",
			/** Reachability value when the door answers. */
			reachableValue: "reachable",
			/** Reachability value when the door refuses. */
			failureValue: "failure",
			/** Health-grid term for the ComfyUI version row. */
			comfyuiTerm: "ComfyUI",
			/** Health-grid term for the manager reachability row. */
			managerTerm: "Manager",
			/** Health-grid term for the manager version row. */
			managerVersionTerm: "Manager version",
			/** Health-grid term for the manager queue row. */
			managerQueueTerm: "Manager queue",
			/** Health-grid term for the security row. */
			securityTerm: "Security",
			/** Health-grid term for the manager unit row. */
			managerUnitTerm: "Manager unit",
			/** Health-grid term for the active-runs row. */
			runsTerm: "Runs",
			/** Runs value when no run reads active. */
			runsIdle: "idle",
			/** Runs value; the site feeds the live count and run ids. */
			runsActive: (p) => String(p.count) + " active · " + p.names,
			/** Health-grid term for the routing row. */
			routingTerm: "Routing",
			/** Freshness prefix before the status timestamp. */
			updatedLabel: "Updated",
			/** Fallback token when a device names no GPU. */
			gpuFallback: "gpu",
			/** Device VRAM line; the site feeds the preformatted free/total figures. */
			vramSummary: (p) => p.free + " / " + p.total + " GB free",
			/** Endpoint fold summary. */
			endpointSettings: "Endpoint settings",
			/** Endpoint field label. */
			serverUrlField: "server url",
			/** Endpoint set button. */
			setButton: "Set",
			/** Result-dock section title. */
			resultDockTitle: "Result dock",
			/** Result-dock clear button. */
			clearResultButton: "Clear result",
			/** Declared-resources section title (the live count rides its own span). */
			declaredResourcesTitle: "Declared resources",
			/** Empty state when the status names no declared resources. */
			noDeclaredResources: "No declared resources reported.",
			/** Scan-wide seam note; the site feeds the live scan detail. */
			resourceScanNote: (p) => "Resource scan: " + p.detail,
			/** Extensions section title. */
			extensionsTitle: "Extensions",
			/** Installed-packs filter field label. */
			filterInstalledField: "filter installed",
			/** Installed-packs filter placeholder. */
			filterInstalledPlaceholder: "kj, moge…",
			/** Installed-packs review button. */
			installedPacksButton: "Installed packs",
			/** Empty state when no pack is installed. */
			noPacksInstalled: "no packs installed",
			/** Declared-registry-ids field label. */
			declaredIdsField: "declared registry ids",
			/** Declared-registry-ids field placeholder. */
			declaredIdsPlaceholder: "ComfyUI-KJNodes, ComfyUI-VideoHelperSuite",
			/** Declared-packs install button. */
			installButton: "Install",
			/** Operator-only badge shared by the raw-URL folds. */
			operatorBadge: "Operator only · raw URL",
			/** Raw-URL extension fold summary. */
			installFromUrlSummary: "Install extension from URL",
			/** Raw-URL extension operator warning. */
			rawUrlNote: "This bypasses the declared registry ids. Use only for an operator-vetted source.",
			/** Raw-URL extension git-URL field label. */
			gitUrlField: "git URL (ComfyUI-Manager)",
			/** Raw-URL extension git-URL placeholder. */
			gitUrlPlaceholder: "https://github.com/…",
			/** Raw-URL extension ref-pin field label. */
			refPinField: "ref pin (commit SHA or tag, optional)",
			/** Raw-URL extension ref-pin placeholder. */
			refPinPlaceholder: "leave empty to float with branch head",
			/** Raw-URL extension install button. */
			installFromUrlButton: "Install from URL",
			/** Models section title. */
			modelsTitle: "Models",
			/** External-index search field label. */
			modelSearchField: "search Manager external index",
			/** External-index search placeholder. */
			modelSearchPlaceholder: "sdxl, wan…",
			/** External-index search button. */
			searchButton: "Search",
			/** Declared-model provision fold summary. */
			provisionSummary: "Provision a declared model",
			/** Provision catalog-id field label. */
			provisionCatalogField: "provision catalog id",
			/** Provision catalog-id placeholder. */
			provisionCatalogPlaceholder: "Search declared models…",
			/** Provision variant field label. */
			variantField: "variant",
			/** Provision quant field label. */
			quantField: "quant",
			/** Provision variant placeholder when the catalog names no variant. */
			defaultVariantPlaceholder: "Default variant",
			/** Provision quant placeholder when the variant names no quant. */
			defaultQuantPlaceholder: "Default quant",
			/** Declared-model provision button. */
			provisionButton: "Provision",
			/** Model-catalog seam note; the site feeds the live catalog detail. */
			modelCatalogNote: (p) => "Model catalog: " + p.detail,
			/** Raw-URL model fold summary. */
			downloadSummary: "Download a model from URL",
			/** Raw-URL model operator warning. */
			rawDownloadNote: "Prefer a declared catalog id. Raw downloads are outside the resource declaration.",
			/** Raw-URL model download-URL field label. */
			downloadUrlField: "download URL (Manager)",
			/** Raw-URL model download-URL placeholder. */
			downloadUrlPlaceholder: "https://…/model.safetensors",
			/** Raw-URL model relative-path field label. */
			relativePathField: "relative path",
			/** Raw-URL model relative-path placeholder. */
			relativePathPlaceholder: "models/checkpoints",
			/** Raw-URL model filename field label. */
			filenameField: "filename",
			/** Raw-URL model filename placeholder. */
			filenamePlaceholder: "model.safetensors",
			/** Raw-URL model download button. */
			downloadButton: "Download",
			/** Snapshots section title. */
			snapshotsTitle: "Snapshots",
			/** Snapshot discipline note. */
			snapshotsNote: "Save before update or version switch. Restore needs restart and uses its own one-shot force control.",
			/** Snapshot-list button. */
			listSnapshotsButton: "List snapshots",
			/** Snapshot save button (also the snapshot_save Next label). */
			saveSnapshot: "Save snapshot",
			/** Snapshot-row restore button. */
			restoreButton: "Restore",
			/** Empty state when no snapshot exists. */
			noSnapshots: "no snapshots — save one before switch/update",
			/** One-shot force checkbox for the next snapshot restore. */
			forceRestoreLabel: "Force the next snapshot restore",
			/** Logs section title. */
			logsTitle: "Logs",
			/** Log tail-lines field label. */
			tailLinesField: "tail lines",
			/** Log view button. */
			viewLogsButton: "View logs",
			/** Lifecycle section title. */
			lifecycleTitle: "Lifecycle",
			/** Guarded-actions warning; the site feeds the live active-run count. */
			guardedRunsNote: (p) => String(p.count) + " active run(s). Guarded actions refuse unless their one-shot force control is ON.",
			/** Lifecycle restart button. */
			restartButton: "Restart",
			/** Lifecycle stop button. */
			stopButton: "Stop",
			/** Free-VRAM button (also the free Next label). */
			freeVram: "Free VRAM",
			/** One-shot force checkbox for the next guarded lifecycle action. */
			forceLifecycleLabel: "Force the next guarded lifecycle action",
			/** Advanced-update fold summary. */
			advancedUpdateSummary: "Advanced update",
			/** Lifecycle update button (also the update Next label). */
			updateComfyui: "Update ComfyUI",
			/** Version-switch fold summary (also the switch_version Next label). */
			switchVersionSummary: "Switch ComfyUI version",
			/** Version-switch field label. */
			switchToVersionField: "switch to version",
			/** Version-switch placeholder when no catalog version exists. */
			switchVersionPlaceholder: "commit / tag",
			/** Version-switch placeholder when the catalog names versions. */
			selectVersionPlaceholder: "Select version / tag",
			/** Version-catalog seam note; the site feeds the live catalog detail. */
			versionCatalogNote: (p) => "Version catalog: " + p.detail,
			/** Version-switch button. */
			switchButton: "Switch",
			/** Lifecycle note while status has never loaded. */
			lifecycleLockedNote: "Lifecycle controls unlock after status loads.",
			/** Lifecycle note for a bring-your-own endpoint. */
			byoNote: "BYO endpoint selected. Estate lifecycle controls are unavailable; use Endpoint settings to choose the managed engine.",
			/** Lifecycle launch button. */
			launchButton: "Launch",
			/** LoRA block title. */
			loraTitle: "LoRAs",
			/** LoRA refresh button once the block is open. */
			loraRefresh: "Refresh",
			/** LoRA open button before the first load. */
			loraShow: "Show LoRAs",
			/** LoRA discipline note while the block is closed. */
			loraClosedNote: "Add a LoRA you already have: the engine accepts only the names in its own list, so copy the file in, restart, then add a row.",
			/** Engine-acceptance sentence; the site feeds the live accepted-name count. */
			engineAcceptsNote: (p) => "The engine accepts " + String(p.count) + " LoRA name(s) — a name outside its list refuses at run time, so add the file first.",
			/** Install-dir line; the site feeds the live directory path. */
			installDirNote: (p) => "install dir: " + p.dir,
			/** Unboarded-rows warning lead; the site feeds the live row count. */
			unboardedNote: (p) => String(p.count) + " of your row(s) are not in the engine list yet (install the file, then restart the engine):",
			/** User-rows label (the live count and path ride their own seats). */
			yourRowsLabel: "your rows:",
			/** Refused-row prefix; the site feeds the live wire problem string. */
			refusedRowNote: (p) => "refused row — " + p.row,
			/** LoRA file-picker field label. */
			loraFileField: "LoRA file (.safetensors, .ckpt, .pt, .bin, .gguf) — or drop it here",
			/** Civit download-boundary note. */
			civitNote: "Downloads stay in your browser: civit.ai needs your account, so you download, the estate only copies bytes it is handed.",
			/** Absolute-path field label. */
			absolutePathField: "absolute path on this machine",
			/** Absolute-path placeholder. */
			absolutePathPlaceholder: "/abs/path/to/my_lora.safetensors",
			/** Families dropdown field label. */
			familiesField: "families",
			/** Families empty option when the provision catalog names none. */
			noFamiliesOption: "no families listed",
			/** Families placeholder option when the catalog names families. */
			addFamilyOption: "add a family…",
			/** LoRA copy-in button. */
			copyLoraButton: "Copy LoRA in",
			/** Accessible name of a picked family's remove control; the site feeds the live family label. */
			removeFamilyLabel: (p) => "remove family " + p.label,
			/** Restart-boundary note after a copy. */
			restartNote: "A copied file enters the engine list only after a restart — the button below asks for one.",
			/** LoRA-block restart button. */
			restartEngineButton: "Restart engine"
		};
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
		*
		* Presentation rides the sidebar's own atoms (dsh Button/Input + the
		* assets module's field/row classes) — the 2026-10-22 operator review
		* retired this block's private raw-element markup: same doors, same
		* voices, native chrome.
		*/
		/** The voice for a THROWN manage verb. postManage raises Error values
		*  only: a lane that throws anything else (a string, a number) is
		*  folded into {ok: false, detail} before it leaves the door
		*  (assets-tab.tsx:360-367), a missing lane raises its own Error
		*  (:329), and the one rethrow is the lane's AbortError — an Error
		*  instance. So the cast below reads a proven reachability fact, and
		*  every catch in this block speaks the same voice from it. */
		function thrownVoice(e) {
			return e.message;
		}
		function LoraBlock({ familyOptions = [] }) {
			const [data, setData] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [refusal, setRefusal] = react.useState(null);
			const [path, setPath] = react.useState("");
			const [families, setFamilies] = react.useState([]);
			const [familyPick, setFamilyPick] = react.useState("");
			const [open, setOpen] = react.useState(false);
			const refresh = react.useCallback(async () => {
				setBusy(true);
				setRefusal(null);
				try {
					const reply = await postManage("lora_list", {});
					if (reply.ok !== true) {
						/* v8 ignore next -- postManage folds a refusal through
						* nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
						* the default text is a belt for a lane that answers
						* differently. */
						setRefusal(reply.detail ?? "the engine refused the LoRA list");
						return;
					}
					setData(reply.data ?? {});
				} catch (e) {
					setRefusal(thrownVoice(e));
				} finally {
					setBusy(false);
				}
			}, []);
			const openedRef = react.useRef(false);
			const openAndLoad = react.useCallback(() => {
				setOpen((was) => {
					const next = !was;
					/* v8 ignore next 3 -- the block has NO close affordance: the
					* open state renders Refresh as its only button (:151-153), so
					* openAndLoad's close half cannot be driven from the UI. */
					if (next && openedRef.current !== true) {
						openedRef.current = true;
						refresh();
					}
					return next;
				});
			}, [refresh]);
			const install = react.useCallback(async () => {
				/* v8 ignore next 3 -- the Copy button is DISABLED while the path
				* is blank, so install cannot run with one; the guard is a belt
				* for a keyboard/programmatic activation. */
				if (path.trim() === "") return;
				setBusy(true);
				setRefusal(null);
				try {
					const installed = await postManage("lora_install", {
						path: path.trim(),
						families
					});
					if (installed.ok !== true) {
						/* v8 ignore next -- postManage folds a refusal through
						* nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
						* the default text is a belt for a lane that answers
						* differently. */
						setRefusal(installed.detail ?? "the engine refused the install");
						return;
					}
					await refresh();
				} catch (e) {
					setRefusal(thrownVoice(e));
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
					const qs = new URLSearchParams({ filename: file.name });
					if (families.length > 0) qs.set("families", families.join(","));
					const res = await fetch("/v1/uploads/lora?" + qs.toString(), {
						method: "POST",
						headers: { "content-type": "application/octet-stream" },
						body: file
					});
					if (!res.ok) {
						const why = await res.json().then((r) => typeof r?.error === "string" ? r.error : "").catch(() => "");
						throw new Error(why !== "" ? why : "the lora door refused the upload (HTTP " + String(res.status) + ")");
					}
					await refresh();
				} catch (e) {
					setRefusal(thrownVoice(e));
				} finally {
					setBusy(false);
				}
			}, [families, refresh]);
			const addFamily = react.useCallback((id) => {
				if (id === "") return;
				setFamilies((was) => was.includes(id) ? was : [...was, id]);
				setFamilyPick("");
			}, []);
			const removeFamily = react.useCallback((id) => {
				setFamilies((was) => was.filter((f) => f !== id));
			}, []);
			const engine = data?.engine_loras ?? [];
			const rows = data?.user_rows ?? [];
			const unboarded = data?.unboarded ?? [];
			const problems = data?.user_row_problems ?? [];
			const labelOf = (id) => familyOptions.find((f) => f.id === id)?.label ?? id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "manage-loras",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.row,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: assets_module_css_default.sectionTitle,
							children: assetsCopy.loraTitle
						}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							onClick: () => {
								refresh();
							},
							disabled: busy,
							children: assetsCopy.loraRefresh
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							onClick: openAndLoad,
							disabled: busy,
							children: assetsCopy.loraShow
						})]
					}),
					open === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: assets_module_css_default.sub,
						children: assetsCopy.loraClosedNote
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: assets_module_css_default.sub,
						children: assetsCopy.engineAcceptsNote({ count: engine.length })
					}),
					data?.install_dir === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: assets_module_css_default.sub + " " + assets_module_css_default.mono,
						children: assetsCopy.installDirNote({ dir: data.install_dir })
					}),
					unboarded.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.warningNote,
						children: [assetsCopy.unboardedNote({ count: unboarded.length }), unboarded.map((u) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: assets_module_css_default.mono,
							children: ["· ", u]
						}, u))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: assets_module_css_default.sub,
						children: [
							assetsCopy.yourRowsLabel,
							" ",
							data?.user_rows_present === true ? String(rows.length) : assetsCopy.noneFallback,
							data?.user_rows_path === void 0 ? "" : " — " + data.user_rows_path
						]
					}),
					rows.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.sub + " " + assets_module_css_default.mono,
						children: [
							"· ",
							String(r.label ?? r.id),
							"  (",
							String(r.filename),
							")",
							r.default_strength === void 0 ? "" : "  @" + String(r.default_strength),
							r.families === void 0 ? "" : "  [" + r.families.join(", ") + "]"
						]
					}, String(r.id))),
					problems.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.warningNote,
						children: problems.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: assets_module_css_default.mono,
							children: assetsCopy.refusedRowNote({ row: p })
						}, p))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.row,
						onDragOver: (e) => {
							e.preventDefault();
						},
						onDrop: (e) => {
							e.preventDefault();
							const file = e.dataTransfer.files[0];
							if (file !== void 0 && busy === false) uploadChosen(file);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: assets_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: assets_module_css_default.fieldLabel,
								children: assetsCopy.loraFileField
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "file",
								className: assets_module_css_default.input,
								accept: ".safetensors,.ckpt,.pt,.bin,.gguf",
								onChange: (e) => {
									const file = e.target.files?.[0];
									if (file === void 0) return;
									uploadChosen(file);
								},
								disabled: busy
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: assets_module_css_default.sub,
						children: assetsCopy.civitNote
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: assets_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.fieldLabel,
									children: assetsCopy.absolutePathField
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: assets_module_css_default.mono,
									placeholder: assetsCopy.absolutePathPlaceholder,
									value: path,
									onChange: (event) => {
										setPath(event.target.value);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: assets_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.fieldLabel,
									children: assetsCopy.familiesField
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: assets_module_css_default.input,
									value: familyPick,
									onChange: (e) => {
										addFamily(e.target.value);
									},
									disabled: busy || familyOptions.length === 0,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: familyOptions.length === 0 ? assetsCopy.noFamiliesOption : assetsCopy.addFamilyOption
									}), familyOptions.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: f.id,
										children: f.label
									}, f.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								onClick: () => {
									install();
								},
								disabled: busy || path.trim() === "",
								children: assetsCopy.copyLoraButton
							})
						]
					}),
					families.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.chipRow,
						children: families.map((f) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: assets_module_css_default.chip,
							children: [labelOf(f), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: assets_module_css_default.chipX,
								"aria-label": assetsCopy.removeFamilyLabel({ label: labelOf(f) }),
								onClick: () => {
									removeFamily(f);
								},
								children: "×"
							})]
						}, f))
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: assets_module_css_default.sub,
						children: assetsCopy.restartNote
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.row,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							className: assets_module_css_default.btnDanger,
							onClick: () => {
								postManage("restart", {}).then((reply) => {
									if (reply.ok !== true) {
										/* v8 ignore next -- postManage folds a refusal through
										* nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
										* the default text is a belt for a lane that answers
										* differently. */
										setRefusal(reply.detail ?? "the engine refused the restart");
										return;
									}
									return refresh();
								}).catch((e) => {
									setRefusal(thrownVoice(e));
								});
							},
							disabled: busy,
							children: assetsCopy.restartEngineButton
						})
					}),
					refusal === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.warningNote,
						role: "status",
						children: refusal
					})
				]
			});
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
		/** The engine's local address — the endpoint field's placeholder and
		*  the value a BLANK Set sends (the field's own default, not a
		*  configurable): ComfyUI's stock bind. */
		const DEFAULT_ENDPOINT = "http://127.0.0.1:8188";
		/** The operator-confirm gate for a manage arm (2026-10-22, the
		*  auto-mode cure). The lane's auto_provision posture lets agent
		*  sessions — which cannot answer a window.confirm dialog — run the
		*  two DECLARED arms without the prompt: provisioning a declared
		*  model and installing declared registry packs. Everything else
		*  keeps the prompt in every posture: the raw-URL arms are outside
		*  the declaration forever (an unvetted source never rides the
		*  auto lane), and the lifecycle arms stop/restart a shared server.
		* @param action the manage arm id.
		* @param autoProvision the lane's auto_provision posture (status).
		* @returns true when the arm needs the operator confirm first.
		*/
		function confirmNeeded(action, autoProvision) {
			if (!autoProvision) return true;
			return action !== "provision_model" && action !== "install_extension";
		}
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
			status: assetsCopy.actionRefreshStatus,
			endpoint_set: assetsCopy.actionSetEndpoint,
			list_extensions: assetsCopy.actionReviewPacks,
			install_extension: assetsCopy.actionInstallDeclared,
			install_extension_url: assetsCopy.actionOpenRawPack,
			search_models: assetsCopy.actionSearchModels,
			provision_model: assetsCopy.actionProvisionModel,
			download_model: assetsCopy.actionOpenRawModel,
			lora_list: assetsCopy.actionListLoras,
			lora_install: assetsCopy.actionCopyLora,
			snapshot_list: assetsCopy.actionReviewSnapshots,
			snapshot_save: assetsCopy.saveSnapshot,
			snapshot_restore: assetsCopy.actionRestoreSnapshot,
			launch: assetsCopy.actionLaunch,
			restart: assetsCopy.actionRestart,
			stop: assetsCopy.actionStop,
			free: assetsCopy.freeVram,
			update: assetsCopy.updateComfyui,
			switch_version: assetsCopy.switchVersionSummary
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
			return assetsCopy.queueSummary({
				processing: queue.is_processing === true,
				active,
				done,
				total
			});
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
			if (age >= STATUS_STALE_MS) return assetsCopy.freshnessStale;
			if (age < 5e3) return assetsCopy.freshnessFresh;
			return assetsCopy.freshnessAged({ seconds: Math.floor(age / 1e3) });
		}
		function receivedLabel(at) {
			return assetsCopy.receivedUtc({ time: new Date(at).toISOString().slice(11, 19) });
		}
		function healthKind(status, receivedAt, loading, error, now) {
			if (status === null) return error === "" ? "loading" : "status-failure";
			if (loading || error !== "" || receivedAt === null || now - receivedAt >= STATUS_STALE_MS) return "stale";
			if (status.endpoint?.reachable !== true) return "engine-failure";
			if (status.manager?.reachable !== true) return "manager-failure";
			return "reachable";
		}
		function healthLabel(kind) {
			if (kind === "loading") return assetsCopy.healthLoading;
			if (kind === "stale") return assetsCopy.healthStale;
			if (kind === "reachable") return assetsCopy.healthReachable;
			if (kind === "manager-failure") return assetsCopy.healthManagerFailure;
			if (kind === "engine-failure") return assetsCopy.healthEngineFailure;
			return assetsCopy.healthUnavailable;
		}
		function healthDotClass(kind) {
			if (kind === "reachable") return assets_module_css_default.dotOk;
			if (kind === "loading" || kind === "stale") return assets_module_css_default.dotWarn;
			return assets_module_css_default.dotBad;
		}
		function resourceLabel(resource) {
			const ref = resource.ref;
			if (ref === void 0) return assetsCopy.resourceFallback;
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
				"aria-label": assetsCopy.resultOutputAria,
				children: data.map(rowLine).join("\n")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: assets_module_css_default.pre,
				tabIndex: 0,
				"aria-label": assetsCopy.resultOutputAria,
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
			if (state === "partial") return assetsCopy.resultPartial;
			if (state === "restart_required") return assetsCopy.resultRestartRequired;
			if (reply.ok !== true) return assetsCopy.resultRefused;
			if (state !== "") return state.toUpperCase();
			return assetsCopy.resultOk;
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
				"aria-label": kind === "mutation" ? assetsCopy.mutationResultAria : assetsCopy.readResultAria,
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
								children: reply.action ?? assetsCopy.unknownFallback
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: assets_module_css_default.resultKind,
								children: kind === "mutation" ? assetsCopy.mutationKind : assetsCopy.readKind
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultMeta,
						children: [
							contract.state !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: assetsCopy.stateLabel }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.mono,
									children: contract.state
								})
							] }),
							contract.operationId !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: assetsCopy.operationIdLabel }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.mono,
									children: contract.operationId
								})
							] }),
							reply.ok !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: assetsCopy.errorCodeLabel }),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: assets_module_css_default.mono,
									children: [contract.code === "" ? assetsCopy.refusedCodeFallback : contract.code, contract.status === void 0 ? "" : assetsCopy.httpSuffix({ status: contract.status })]
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: assetsCopy.receivedLabel }),
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: assetsCopy.detailLabel }),
							" ",
							reply.detail ?? ""
						]
					}),
					showFlags && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultFlags,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							assetsCopy.partialLabel,
							" ",
							contract.partial ? assetsCopy.yesValue : assetsCopy.noValue
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							assetsCopy.restartRequiredLabel,
							" ",
							contract.restartRequired ? assetsCopy.yesValue : assetsCopy.noValue
						] })]
					}),
					nextAction !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: assets_module_css_default.nextRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							disabled: locked,
							onClick: () => {
								onFollow(nextAction);
							},
							children: assetsCopy.nextLabel({ label: ACTION_LABELS[nextAction] ?? nextAction })
						})
					}),
					provision !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-testid": "provision-state",
						children: [
							(provision.requested !== void 0 || provision.succeeded !== void 0 || provision.missed !== void 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.resultFlags,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										assetsCopy.requestedLabel,
										" ",
										(provision.requested ?? []).join(", ") || assetsCopy.noneFallback
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										assetsCopy.succeededLabel,
										" ",
										(provision.succeeded ?? []).join(", ") || assetsCopy.noneFallback
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										assetsCopy.missedLabel,
										" ",
										(provision.missed ?? []).join(", ") || assetsCopy.noneFallback
									] }),
									(provision.misses ?? []).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										assetsCopy.detailsLabel,
										" ",
										provision.misses?.join(" · ")
									] })
								]
							}),
							provision.items.map((item, index) => {
								const itemState = stringOr(item["state"], assetsCopy.unknownFallback);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: assets_module_css_default.resultItem,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: resourceStateClass(itemState),
											children: itemState
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.mono,
											children: stringOr(item["key"], assetsCopy.itemFallback)
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
									error.file ?? assetsCopy.errorFileFallback,
									": ",
									error.error ?? assetsCopy.errorDetailFallback
								]
							}, String(error.file ?? index)))
						]
					}),
					reply.data !== void 0 && reply.data !== null && provision === null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: assets_module_css_default.resultData,
						"data-testid": "result-data",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: assets_module_css_default.resultDataLabel,
							children: assetsCopy.outputLabel
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
			const [extRef, setExtRef] = (0, react.useState)("");
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
				if (confirmNeeded(action, status?.auto_provision === true)) {
					if (!window.confirm(sentence)) return;
				}
				options.onUse?.();
				run(action, options.payload ?? {}).then((reply) => {
					if (reply !== null && (reply.ok === true || resultContract(reply).partial)) options.after?.();
				});
			}
			function forceSentence(value) {
				return assetsCopy.forceSentence({ on: value });
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
							children: assetsCopy.panelTitle
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
											children: assetsCopy.healthTitle
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
										children: assetsCopy.refreshButton
									})
								]
							}),
							statusError !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: status === null ? assets_module_css_default.dangerNote : assets_module_css_default.warningNote,
								children: assetsCopy.refreshFailedNote({
									error: statusError,
									showingLast: status !== null
								})
							}),
							statusLoading && status !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: assetsCopy.refreshingNote
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
								className: assets_module_css_default.healthGrid,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.endpointTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.wrapText,
											children: ep?.url ?? assetsCopy.notReported
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.engineTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [up ? assetsCopy.reachableValue : assetsCopy.failureValue, ep?.reason === void 0 ? "" : " · " + ep.reason] })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.comfyuiTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.mono,
											children: ep?.comfyui_version === void 0 || ep.comfyui_version === null ? "?" : displayValue(ep.comfyui_version)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.managerTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [manager?.reachable === true ? assetsCopy.reachableValue : assetsCopy.failureValue, manager?.reason === void 0 ? "" : " · " + manager.reason] })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.managerVersionTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.mono,
											children: manager?.version === void 0 ? "?" : managerVersion(manager.version)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.managerQueueTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: manager?.queue === void 0 ? "?" : queueSummary(manager.queue) })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.securityTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.wrapText,
											children: manager?.security ?? assetsCopy.notReported
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.managerUnitTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											className: assets_module_css_default.wrapText,
											children: manager?.unit ?? "?"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.runsTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: activeRuns.length === 0 ? assetsCopy.runsIdle : assetsCopy.runsActive({
											count: activeRuns.length,
											names: activeRuns.join(", ")
										}) })]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.healthItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: assetsCopy.routingTerm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: displayValue(status?.routing) })]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.nextRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									disabled: locked,
									onClick: () => {
										followNext(statusNextAction);
									},
									children: assetsCopy.nextLabel({ label: ACTION_LABELS[statusNextAction] ?? statusNextAction })
								}), statusReceivedAt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: assets_module_css_default.freshness,
									children: [
										assetsCopy.updatedLabel,
										" ",
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
												children: device.name ?? assetsCopy.gpuFallback
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: assets_module_css_default.bar,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: assets_module_css_default.barFill,
													style: { width: percent + "%" }
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: assets_module_css_default.mono,
												children: assetsCopy.vramSummary({
													free: gb(free),
													total: gb(total)
												})
											})
										]
									}, String(device.name ?? index));
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-endpoint_set",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: assetsCopy.endpointSettings }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: assets_module_css_default.row,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										label: assetsCopy.serverUrlField,
										value: epUrl,
										placeholder: DEFAULT_ENDPOINT,
										mono: true,
										onChange: setEpUrl
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										"aria-busy": busy === "endpoint_set",
										disabled: locked || busy === "endpoint_set",
										onClick: () => {
											run("endpoint_set", { url: epUrl.trim() === "" ? DEFAULT_ENDPOINT : epUrl.trim() });
										},
										children: assetsCopy.setButton
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
									children: assetsCopy.resultDockTitle
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									onClick: () => {
										setMutationResult(null);
										setReadResult(null);
									},
									children: assetsCopy.clearResultButton
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
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoraBlock, { familyOptions: modelOptions })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-resources",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
							className: assets_module_css_default.sectionTitle,
							children: [
								assetsCopy.declaredResourcesTitle,
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: assets_module_css_default.count,
									children: resources.length
								})
							]
						}), resources.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: assets_module_css_default.sub,
							children: assetsCopy.noDeclaredResources
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(() => {
								const buckets = /* @__PURE__ */ new Map();
								for (const resource of resources) {
									const state = resource.state ?? assetsCopy.unknownFallback;
									buckets.set(state, (buckets.get(state) ?? 0) + 1);
								}
								const rollup = [...buckets.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([state, count]) => `${count} ${state}`).join(" · ");
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: assets_module_css_default.sub,
									"data-testid": "resource-rollup",
									children: rollup
								});
							})(),
							status?.resources_detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.warningNote,
								"data-testid": "resources-scan-note",
								children: assetsCopy.resourceScanNote({ detail: status.resources_detail })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: assets_module_css_default.resourceList,
								"data-testid": "resource-status",
								children: resources.map((resource, index) => {
									const state = resource.state ?? assetsCopy.unknownFallback;
									const items = resource.items ?? [];
									const badItems = items.filter((item) => {
										const itemState = item.state ?? assetsCopy.unknownFallback;
										return itemState === "failed" || itemState === "blocked" || itemState === "absent" || itemState === "missing";
									}).length;
									const itemRollup = items.length === 0 ? "" : badItems === 0 ? `${items.length} item${items.length === 1 ? "" : "s"}` : `${badItems}/${items.length} failed`;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
										className: assets_module_css_default.resourceRow,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
											className: assets_module_css_default.resourceFold,
											"data-testid": "resource-fold",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
													className: assets_module_css_default.resourceSummary,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: resourceStateClass(state),
															children: state
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.resourceName,
															children: resourceLabel(resource)
														}),
														itemRollup !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.sub,
															children: itemRollup
														}),
														resource.operation_id !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: assets_module_css_default.mono,
															children: assetsCopy.operationIdValue({ id: resource.operation_id })
														})
													]
												}),
												resource.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
													className: assets_module_css_default.sub,
													children: resource.detail
												}),
												items.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
													className: assets_module_css_default.resourceItems,
													children: items.map((item, itemIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
														className: assets_module_css_default.resourceItem,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: resourceStateClass(item.state ?? assetsCopy.unknownFallback),
																children: item.state ?? assetsCopy.unknownFallback
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: assets_module_css_default.mono,
																children: item.key ?? item.kind ?? assetsCopy.itemFallback
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
										})
									}, resourceLabel(resource) + ":" + index);
								})
							})
						] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-list_extensions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: assetsCopy.extensionsTitle
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: assetsCopy.filterInstalledField,
									value: extFilter,
									placeholder: assetsCopy.filterInstalledPlaceholder,
									onChange: setExtFilter
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "list_extensions",
									disabled: locked || busy === "list_extensions",
									onClick: () => {
										loadExtensions();
									},
									children: assetsCopy.installedPacksButton
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
									children: assetsCopy.noPacksInstalled
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: assetsCopy.declaredIdsField,
									value: extIds,
									placeholder: assetsCopy.declaredIdsPlaceholder,
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
									children: assetsCopy.installButton
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-install_extension_url",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.operatorBadge,
											children: assetsCopy.operatorBadge
										}),
										" ",
										assetsCopy.installFromUrlSummary
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: assets_module_css_default.operatorNote,
										children: assetsCopy.rawUrlNote
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.gitUrlField,
												value: extUrl,
												placeholder: assetsCopy.gitUrlPlaceholder,
												mono: true,
												onChange: setExtUrl
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.refPinField,
												value: extRef,
												placeholder: assetsCopy.refPinPlaceholder,
												mono: true,
												onChange: setExtRef
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												"aria-busy": busy === "install_extension_url",
												disabled: locked || extUrl.trim() === "" || busy === "install_extension_url",
												onClick: () => {
													const url = extUrl.trim();
													const ref = extRef.trim();
													confirmRun("install_extension_url", "Install extension from operator-vetted URL " + url + (ref === "" ? " (unpinned — floats with branch head)?" : " @ " + ref + "?"), {
														payload: {
															url,
															...ref === "" ? {} : { ref },
															operator_confirmed: true
														},
														after: () => {
															if (extRows !== null) loadExtensions(false);
														}
													});
												},
												children: assetsCopy.installFromUrlButton
											})
										]
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
								children: assetsCopy.modelsTitle
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: assetsCopy.modelSearchField,
									value: modelQuery,
									placeholder: assetsCopy.modelSearchPlaceholder,
									onChange: setModelQuery
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "search_models",
									disabled: locked || modelQuery.trim() === "" || busy === "search_models",
									onClick: () => {
										run("search_models", { query: modelQuery.trim() });
									},
									children: assetsCopy.searchButton
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-provision_model",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: assetsCopy.provisionSummary }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchField, {
												label: assetsCopy.provisionCatalogField,
												value: provModel,
												options: modelOptions.map((model) => ({
													value: model.id,
													label: model.label + (model.genre === void 0 ? "" : " · " + model.genre)
												})),
												placeholder: assetsCopy.provisionCatalogPlaceholder,
												mono: true,
												onChange: changeModel
											}),
											modelOptions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.variantField,
												value: provVariant,
												onChange: setProvVariant
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.quantField,
												value: provQuant,
												onChange: setProvQuant
											})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
												label: assetsCopy.variantField,
												value: provVariant,
												options: (selectedModel?.variants ?? []).map((variant) => ({
													value: variant.id,
													label: variant.label
												})),
												placeholder: assetsCopy.defaultVariantPlaceholder,
												disabled: selectedModel === void 0,
												onChange: changeVariant
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
												label: assetsCopy.quantField,
												value: provQuant,
												options: quantOptions.map((quant) => ({
													value: quant.id,
													label: quant.label
												})),
												placeholder: assetsCopy.defaultQuantPlaceholder,
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
												children: assetsCopy.provisionButton
											})
										]
									}),
									status?.model_options_detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: assets_module_css_default.warningNote,
										children: assetsCopy.modelCatalogNote({ detail: status.model_options_detail })
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								className: assets_module_css_default.advanced,
								id: "manage-download_model",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: assets_module_css_default.operatorBadge,
											children: assetsCopy.operatorBadge
										}),
										" ",
										assetsCopy.downloadSummary
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: assets_module_css_default.operatorNote,
										children: assetsCopy.rawDownloadNote
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.downloadUrlField,
												value: dlUrl,
												placeholder: assetsCopy.downloadUrlPlaceholder,
												mono: true,
												onChange: setDlUrl
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.relativePathField,
												value: dlPath,
												placeholder: assetsCopy.relativePathPlaceholder,
												mono: true,
												onChange: setDlPath
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.filenameField,
												value: dlName,
												placeholder: assetsCopy.filenamePlaceholder,
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
													confirmRun("download_model", "Queue operator-vetted download of " + (dlName.trim() || dlUrl.trim()) + "?", { payload: {
														...payload,
														operator_confirmed: true
													} });
												},
												children: assetsCopy.downloadButton
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
								children: assetsCopy.snapshotsTitle
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: assetsCopy.snapshotsNote
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: assets_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "snapshot_list",
									disabled: locked || busy === "snapshot_list",
									onClick: () => {
										loadSnapshots();
									},
									children: assetsCopy.listSnapshotsButton
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "snapshot_save",
									disabled: locked || busy === "snapshot_save",
									variant: "primary",
									onClick: () => {
										confirmRun("snapshot_save", "Save an environment snapshot (ComfyUI + packs + dependencies)?", { after: () => {
											loadSnapshots(false);
										} });
									},
									children: assetsCopy.saveSnapshot
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
										children: assetsCopy.restoreButton
									})]
								}, snapshot)), snapRows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: assets_module_css_default.listRow,
									children: assetsCopy.noSnapshots
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
								className: assets_module_css_default.checkRow,
								checked: restoreForce,
								label: assetsCopy.forceRestoreLabel,
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
							children: assetsCopy.logsTitle
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: assets_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: assetsCopy.tailLinesField,
								value: logTail,
								onChange: setLogTail,
								mono: true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								"aria-busy": busy === "logs",
								disabled: locked || busy === "logs",
								onClick: () => {
									run("logs", { tail: Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2e3)) });
								},
								children: assetsCopy.viewLogsButton
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: assets_module_css_default.section,
						id: "manage-lifecycle",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: assets_module_css_default.sectionTitle,
								children: assetsCopy.lifecycleTitle
							}),
							activeRuns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.dangerNote,
								children: assetsCopy.guardedRunsNote({ count: activeRuns.length })
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
											children: assetsCopy.restartButton
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
											children: assetsCopy.stopButton
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
											children: assetsCopy.freeVram
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
									className: assets_module_css_default.checkRow,
									checked: lifecycleForce,
									label: assetsCopy.forceLifecycleLabel,
									disabled: locked,
									onChange: setLifecycleForce
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
									className: assets_module_css_default.advanced,
									id: "manage-update",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: assetsCopy.advancedUpdateSummary }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
											children: assetsCopy.updateComfyui
										})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
									className: assets_module_css_default.advanced,
									id: "manage-switch_version",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: assetsCopy.switchVersionSummary }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: assets_module_css_default.row,
										children: [
											comfyuiVersions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
												label: assetsCopy.switchToVersionField,
												value: swVersion,
												placeholder: assetsCopy.switchVersionPlaceholder,
												mono: true,
												onChange: setSwVersion
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
												label: assetsCopy.switchToVersionField,
												value: swVersion,
												options: comfyuiVersions.map((version) => ({
													value: version.id,
													label: version.label
												})),
												placeholder: assetsCopy.selectVersionPlaceholder,
												onChange: setSwVersion
											}),
											status?.comfyui_versions_detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: assets_module_css_default.warningNote,
												children: assetsCopy.versionCatalogNote({ detail: status.comfyui_versions_detail })
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
												children: assetsCopy.switchButton
											})
										]
									})]
								})
							] }) : status === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: assetsCopy.lifecycleLockedNote
							}) : byo ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: assets_module_css_default.sub,
								children: assetsCopy.byoNote
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: assets_module_css_default.lifecycleActions,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									"aria-busy": busy === "launch",
									disabled: locked || busy === "launch",
									variant: "primary",
									onClick: () => {
										confirmRun("launch", "Launch the ComfyUI server?");
									},
									children: assetsCopy.launchButton
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
