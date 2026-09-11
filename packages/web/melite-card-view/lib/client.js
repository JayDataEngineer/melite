window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-view",
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
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
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
		require("@deepseek-ai/cordis");
		let react_dom = require("react-dom");
		//#region src/client/apply-guard.ts
		/** Claims the plugin apply slot. Returns true when this call won the slot. */
		function claimCardViewApply() {
			if (globalThis.__rayCardViewApplied === true) return false;
			globalThis.__rayCardViewApplied = true;
			return true;
		}
		/** Releases the claim so a hot-reloaded bundle can claim again in-page. */
		function releaseCardViewApply() {
			globalThis.__rayCardViewApplied = void 0;
		}
		//#endregion
		//#region \0dsh-css:melite-card-view/src/client/card.module.css.mjs
		const css = ".vYZV7a_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.vYZV7a_load{color:var(--dsw-alias-label-secondary,#9a9aa5);padding:2px 0}.vYZV7a_head{align-items:center;gap:8px;min-width:0;display:flex}.vYZV7a_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.vYZV7a_state{border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.vYZV7a_state[data-state=completed]{color:var(--dsw-alias-state-success-primary,#3fb96f)}.vYZV7a_state[data-state=running],.vYZV7a_state[data-state=queued],.vYZV7a_state[data-state=pending],.vYZV7a_state[data-state=starting],.vYZV7a_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary,#d9a53f)}.vYZV7a_state[data-state=failed],.vYZV7a_state[data-state=error],.vYZV7a_state[data-state=stopped],.vYZV7a_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary,#e05656)}.vYZV7a_prompt{color:var(--dsw-alias-text-secondary,#9a9aa5);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.vYZV7a_link:hover{text-decoration:underline}.vYZV7a_row{color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 6px;display:flex}.vYZV7a_row:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_row:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#4f7bd8);outline-offset:-1px}.vYZV7a_thumb{object-fit:cover;border-radius:4px;flex:none;width:34px;height:34px}.vYZV7a_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;font-weight:600;overflow:hidden}.vYZV7a_drill{width:92vw;max-width:min(860px,92vw)}.vYZV7a_split{grid-template-columns:minmax(240px,1fr) minmax(0,1.2fr);gap:14px;min-width:0;display:grid}@media (width<=640px){.vYZV7a_split{grid-template-columns:1fr}}.vYZV7a_params{flex-direction:column;gap:8px;min-width:0;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_field{flex-direction:column;gap:3px;min-width:0;display:flex}.vYZV7a_fieldKey{color:var(--dsw-alias-label-secondary,#9a9aa5);font-size:11px}.vYZV7a_outputs{flex-direction:column;align-items:center;gap:10px;min-width:0;display:flex}.vYZV7a_outputImg{object-fit:contain;border-radius:8px;max-width:100%;max-height:46vh}.vYZV7a_runRow{justify-content:flex-end;align-items:center;gap:10px;width:100%;display:flex}.vYZV7a_runError{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;font-size:11px}.vYZV7a_state[data-state=legacy]{color:var(--dsw-alias-label-secondary,#9a9aa5)}.vYZV7a_cardsBench{flex-direction:column;gap:8px;display:flex}.vYZV7a_benchHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.vYZV7a_revTag{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:11px}.vYZV7a_runBtn,.vYZV7a_back,.vYZV7a_restore{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;cursor:pointer;font:inherit;background:0 0;border-radius:6px;padding:2px 10px;font-size:12px}.vYZV7a_runBtn:hover:not(:disabled),.vYZV7a_back:hover,.vYZV7a_restore:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_runBtn:disabled,.vYZV7a_restore:disabled{cursor:default;opacity:.45}.vYZV7a_category{flex-direction:column;gap:2px;display:flex}.vYZV7a_catTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.06em;text-transform:uppercase;margin:4px 0 2px;font-size:11px;font-weight:600}.vYZV7a_stages{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.vYZV7a_stage{list-style:none}.vYZV7a_stageTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:45%;font-weight:600;overflow:hidden}.vYZV7a_stageEngine{color:var(--dsw-alias-label-secondary,#61666b);flex:none;font-size:11px}.vYZV7a_stageArtifact{color:var(--dsw-alias-state-business-primary,#4f7bd8);font-size:12px;text-decoration:none}.vYZV7a_stageArtifact:hover{text-decoration:underline}.vYZV7a_empty,.vYZV7a_loading,.vYZV7a_failed,.vYZV7a_missing,.vYZV7a_logHead,.vYZV7a_restoreNote{color:var(--dsw-alias-label-secondary,#61666b);margin:0;font-size:12px;font-style:italic}.vYZV7a_runView{flex-direction:column;gap:8px;display:flex}.vYZV7a_runHead{align-items:baseline;gap:8px;display:flex}.vYZV7a_runId{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;font-weight:600}.vYZV7a_runStatus{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:var(--dsw-alias-label-secondary,#61666b);border-radius:999px;padding:0 8px;font-size:11px}.vYZV7a_runActions{gap:8px;display:flex}.vYZV7a_stageDetail{grid-template-columns:auto 1fr;gap:2px 12px;margin:0;display:grid}.vYZV7a_stageDetail dt{color:var(--dsw-alias-label-secondary,#61666b);text-align:right;text-transform:uppercase;font-size:11px}.vYZV7a_stageDetail dd{min-width:0;margin:0}.vYZV7a_mono{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;overflow-x:auto}.vYZV7a_tileGrid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.vYZV7a_tile{margin:0;padding:0;display:block}.vYZV7a_tileInner{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);cursor:pointer;font:inherit;text-align:left;background:0 0;border-radius:10px;flex-direction:column;align-items:stretch;width:100%;padding:0;transition:border-color .16s,background-color .16s;display:flex;overflow:hidden}.vYZV7a_tileInner:hover{border-color:var(--dsw-alias-state-business-primary,#4f7bd8);background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_tilePreview{aspect-ratio:1;flex:1;width:100%;min-height:0;margin:0;display:block;position:relative}.vYZV7a_tileImg,.vYZV7a_tileImgLink{width:100%;height:100%;display:block}.vYZV7a_tileImg{object-fit:cover}.vYZV7a_kindFace{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-secondary,#61666b);flex-direction:column;justify-content:center;align-items:center;gap:4px;width:100%;height:100%;display:flex}.vYZV7a_kindInitial{font-size:28px;font-weight:700;line-height:1}.vYZV7a_kindName{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-overflow:ellipsis;white-space:nowrap;padding:0 6px;font-size:10px;overflow:hidden}.vYZV7a_tileDot{position:absolute;bottom:6px;right:6px}.vYZV7a_tileCaption{border-top:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);flex-direction:column;flex:none;gap:2px;padding:6px 8px;display:flex}.vYZV7a_tileTitle{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;overflow:hidden}.vYZV7a_tileMeta{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);align-items:center;gap:6px;font-size:10px;display:flex;overflow:hidden}.vYZV7a_tilePrompt{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.vYZV7a_tileAdd .vYZV7a_tileInner{border-style:dashed}.vYZV7a_addFace{color:var(--dsw-alias-label-secondary,#61666b);justify-content:center;align-items:center;font-size:34px;font-weight:300;display:flex}.vYZV7a_picker{flex-direction:column;gap:10px;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_pickerGenre{flex-direction:column;gap:4px;display:flex}.vYZV7a_pickerCard{border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border-radius:8px;align-items:baseline;gap:8px;width:100%;padding:8px 10px;display:flex}.vYZV7a_pickerCard:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_pickerCardLabel{white-space:nowrap;font-size:13px;font-weight:600}.vYZV7a_pickerCardDesc{color:var(--dsw-alias-label-secondary,#61666b);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;overflow:hidden}.vYZV7a_specForm{flex-direction:column;gap:12px;display:flex}.vYZV7a_specGroup{flex-direction:column;gap:8px;display:flex}.vYZV7a_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.vYZV7a_specField{flex-direction:column;gap:3px;display:flex}.vYZV7a_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.vYZV7a_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.vYZV7a_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.vYZV7a_specSelect{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.vYZV7a_specSliderRow{align-items:center;gap:8px;display:flex}.vYZV7a_specSlider{flex:1}.vYZV7a_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.vYZV7a_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.vYZV7a_tileShared{display:block;position:relative}.vYZV7a_zoomOverlay{background:var(--dsw-alias-bg-mask,#090c12b8);z-index:80;flex-direction:column;display:flex;position:fixed;inset:0}.vYZV7a_zoomScroll{flex:1;min-height:0;overflow-y:auto}.vYZV7a_zoomInner{box-sizing:border-box;justify-content:center;align-items:center;width:100%;max-width:100%;min-height:100%;margin:0 auto;padding:24px;display:flex}.vYZV7a_zoomCard{background:var(--dsw-alias-bg-module-platform,#f5f6f7);border:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);color:var(--dsw-alias-label-primary,#0f1115);border-radius:14px;flex-direction:column;min-height:320px;max-height:86vh;display:flex;overflow:hidden;box-shadow:0 24px 64px #090c1259}.vYZV7a_zoomBar{border-bottom:1px solid var(--dsw-alias-label-dimmed,#e1e5ee);flex:none;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;display:flex}.vYZV7a_zoomTitle{font-size:13px;font-weight:600}.vYZV7a_closeX{color:inherit;cursor:pointer;background:0 0;border:none;border-radius:6px;padding:4px 8px;font-size:14px;line-height:1}.vYZV7a_closeX:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_zoomDetail{min-height:0;padding:14px;display:block;overflow-y:auto}.vYZV7a_zoomSkeleton{flex-direction:column;flex:1;gap:10px;min-height:0;padding:16px;display:flex}.vYZV7a_skLine{background:linear-gradient(90deg, transparent 40%, var(--dsw-alias-interactive-bg-hover,#2631480f) 50%, transparent 60%);background-color:var(--dsw-alias-interactive-bg-hover,#2631480f);background-size:200% 100%;border-radius:6px;height:12px;animation:1s linear infinite both vYZV7a_zoomShimmer}.vYZV7a_skWide{width:60%}.vYZV7a_skShort{flex:1;height:28px}.vYZV7a_skBlock{border-radius:10px;height:120px}.vYZV7a_skRow{gap:10px;display:flex}@keyframes vYZV7a_zoomShimmer{0%{background-position:150% 0}to{background-position:-100% 0}}@keyframes vYZV7a_tilePop{0%{opacity:0;transform:scale(.96)translateY(6px)}60%{opacity:1;transform:scale(1.015)translateY(0)}to{opacity:1;transform:scale(1)translateY(0)}}.vYZV7a_tileEnter{animation:.26s cubic-bezier(.2,.8,.3,1) both vYZV7a_tilePop}.vYZV7a_tileDragging{opacity:.55;z-index:2}.vYZV7a_wiredMark{color:var(--dsw-alias-state-business-primary,#4176e6);font-size:10px}.vYZV7a_wireRow{flex:none;align-items:center;gap:8px;margin:0 0 10px;display:flex}.vYZV7a_wireRow .vYZV7a_specSelect{flex:1;width:auto}.vYZV7a_wireLabel{color:var(--dsw-alias-label-secondary,#61666b);white-space:nowrap;font-size:11px}.vYZV7a_wireBtn{background:var(--dsw-alias-bg-module-platform,#f5f6f7);color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;z-index:2;border:0;border-radius:6px;padding:3px 5px;font-size:11px;line-height:1;position:absolute;top:5px;right:5px}.vYZV7a_wireBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-state-business-primary,#4176e6)}.vYZV7a_wiring{outline:1px dashed var(--dsw-alias-state-business-primary,#4176e6);outline-offset:2px}.vYZV7a_wiringSource{outline:2px solid var(--dsw-alias-state-business-primary,#4176e6);outline-offset:2px}.vYZV7a_capOver{background:var(--dsw-alias-interactive-bg-hover,#2631480f);outline:1px dashed var(--dsw-alias-state-business-primary,#4176e6);outline-offset:4px}.vYZV7a_statusChip{color:#fff;letter-spacing:.02em;text-transform:uppercase;border-radius:999px;align-self:flex-start;margin-top:6px;padding:3px 8px;font-size:10px;line-height:1}.vYZV7a_statusChip[data-status=queued],.vYZV7a_statusChip[data-status=pending]{background:#8a6d1a}.vYZV7a_statusChip[data-status=running]{background:var(--dsw-alias-state-business-primary,#4176e6);animation:1.1s ease-in-out infinite vYZV7a_chipPulse}.vYZV7a_statusChip[data-status=done]{background:#1d7a3e}.vYZV7a_statusChip[data-status=failed]{background:#b3261e}@keyframes vYZV7a_chipPulse{0%,to{opacity:1}50%{opacity:.55}}.vYZV7a_upstreamBadge{color:var(--dsw-alias-state-business-primary,#4176e6);white-space:nowrap;font-size:10px}.vYZV7a_cancelBtn{color:#b3261e;cursor:pointer;background:0 0;border:1px solid #b3261e;border-radius:8px;padding:5px 12px;font-size:12px}.vYZV7a_cancelBtn:disabled{cursor:default;opacity:.6}.vYZV7a_groupBar{align-items:center;gap:8px;display:flex}.vYZV7a_checkCircle{border:1.5px solid var(--dsw-alias-label-secondary,#61666b);color:#fff;z-index:3;border-radius:999px;justify-content:center;align-items:center;width:20px;height:20px;font-size:11px;display:flex;position:absolute;top:8px;left:8px}.vYZV7a_checkOn{background:var(--dsw-alias-state-business-primary,#4176e6);border-color:var(--dsw-alias-state-business-primary,#4176e6)}[data-selected=on]{outline:2px solid var(--dsw-alias-state-business-primary,#4176e6);outline-offset:2px}.vYZV7a_groupNote{color:var(--dsw-alias-label-secondary,#61666b);margin:0 0 10px;font-size:12px}.vYZV7a_memberList{margin:0 0 12px;padding:0;list-style:none}.vYZV7a_memberRow{border-bottom:1px solid var(--dsw-alias-interactive-bg-hover,#2631480f);align-items:baseline;gap:8px;padding:6px 2px;display:flex}.vYZV7a_memberIdx{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,monospace);font-size:11px}.vYZV7a_memberName{font-size:13px}";
		const tagId = "@melite-plugin/dsh-card-view/card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"addFace": "vYZV7a_addFace",
			"back": "vYZV7a_back",
			"benchHead": "vYZV7a_benchHead",
			"cancelBtn": "vYZV7a_cancelBtn",
			"capOver": "vYZV7a_capOver",
			"card": "vYZV7a_card",
			"cardsBench": "vYZV7a_cardsBench",
			"catTitle": "vYZV7a_catTitle",
			"category": "vYZV7a_category",
			"checkCircle": "vYZV7a_checkCircle",
			"checkOn": "vYZV7a_checkOn",
			"chipPulse": "vYZV7a_chipPulse",
			"closeX": "vYZV7a_closeX",
			"drill": "vYZV7a_drill",
			"empty": "vYZV7a_empty",
			"failed": "vYZV7a_failed",
			"field": "vYZV7a_field",
			"fieldKey": "vYZV7a_fieldKey",
			"groupBar": "vYZV7a_groupBar",
			"groupNote": "vYZV7a_groupNote",
			"head": "vYZV7a_head",
			"kindFace": "vYZV7a_kindFace",
			"kindInitial": "vYZV7a_kindInitial",
			"kindName": "vYZV7a_kindName",
			"link": "vYZV7a_link",
			"load": "vYZV7a_load",
			"loading": "vYZV7a_loading",
			"logHead": "vYZV7a_logHead",
			"memberIdx": "vYZV7a_memberIdx",
			"memberList": "vYZV7a_memberList",
			"memberName": "vYZV7a_memberName",
			"memberRow": "vYZV7a_memberRow",
			"missing": "vYZV7a_missing",
			"model": "vYZV7a_model",
			"mono": "vYZV7a_mono",
			"outputImg": "vYZV7a_outputImg",
			"outputs": "vYZV7a_outputs",
			"params": "vYZV7a_params",
			"picker": "vYZV7a_picker",
			"pickerCard": "vYZV7a_pickerCard",
			"pickerCardDesc": "vYZV7a_pickerCardDesc",
			"pickerCardLabel": "vYZV7a_pickerCardLabel",
			"pickerGenre": "vYZV7a_pickerGenre",
			"prompt": "vYZV7a_prompt",
			"restore": "vYZV7a_restore",
			"restoreNote": "vYZV7a_restoreNote",
			"revTag": "vYZV7a_revTag",
			"row": "vYZV7a_row",
			"rowTitle": "vYZV7a_rowTitle",
			"runActions": "vYZV7a_runActions",
			"runBtn": "vYZV7a_runBtn",
			"runError": "vYZV7a_runError",
			"runHead": "vYZV7a_runHead",
			"runId": "vYZV7a_runId",
			"runRow": "vYZV7a_runRow",
			"runStatus": "vYZV7a_runStatus",
			"runView": "vYZV7a_runView",
			"skBlock": "vYZV7a_skBlock",
			"skLine": "vYZV7a_skLine",
			"skRow": "vYZV7a_skRow",
			"skShort": "vYZV7a_skShort",
			"skWide": "vYZV7a_skWide",
			"specField": "vYZV7a_specField",
			"specFieldKey": "vYZV7a_specFieldKey",
			"specForm": "vYZV7a_specForm",
			"specGroup": "vYZV7a_specGroup",
			"specGroupTitle": "vYZV7a_specGroupTitle",
			"specHint": "vYZV7a_specHint",
			"specRequired": "vYZV7a_specRequired",
			"specSelect": "vYZV7a_specSelect",
			"specSlider": "vYZV7a_specSlider",
			"specSliderRow": "vYZV7a_specSliderRow",
			"specSliderValue": "vYZV7a_specSliderValue",
			"specTextarea": "vYZV7a_specTextarea",
			"split": "vYZV7a_split",
			"stage": "vYZV7a_stage",
			"stageArtifact": "vYZV7a_stageArtifact",
			"stageDetail": "vYZV7a_stageDetail",
			"stageEngine": "vYZV7a_stageEngine",
			"stageTitle": "vYZV7a_stageTitle",
			"stages": "vYZV7a_stages",
			"state": "vYZV7a_state",
			"statusChip": "vYZV7a_statusChip",
			"thumb": "vYZV7a_thumb",
			"tile": "vYZV7a_tile",
			"tileAdd": "vYZV7a_tileAdd",
			"tileCaption": "vYZV7a_tileCaption",
			"tileDot": "vYZV7a_tileDot",
			"tileDragging": "vYZV7a_tileDragging",
			"tileEnter": "vYZV7a_tileEnter",
			"tileGrid": "vYZV7a_tileGrid",
			"tileImg": "vYZV7a_tileImg",
			"tileImgLink": "vYZV7a_tileImgLink",
			"tileInner": "vYZV7a_tileInner",
			"tileMeta": "vYZV7a_tileMeta",
			"tilePop": "vYZV7a_tilePop",
			"tilePreview": "vYZV7a_tilePreview",
			"tilePrompt": "vYZV7a_tilePrompt",
			"tileShared": "vYZV7a_tileShared",
			"tileTitle": "vYZV7a_tileTitle",
			"upstreamBadge": "vYZV7a_upstreamBadge",
			"wireBtn": "vYZV7a_wireBtn",
			"wireLabel": "vYZV7a_wireLabel",
			"wireRow": "vYZV7a_wireRow",
			"wiredMark": "vYZV7a_wiredMark",
			"wiring": "vYZV7a_wiring",
			"wiringSource": "vYZV7a_wiringSource",
			"zoomBar": "vYZV7a_zoomBar",
			"zoomCard": "vYZV7a_zoomCard",
			"zoomDetail": "vYZV7a_zoomDetail",
			"zoomInner": "vYZV7a_zoomInner",
			"zoomOverlay": "vYZV7a_zoomOverlay",
			"zoomScroll": "vYZV7a_zoomScroll",
			"zoomShimmer": "vYZV7a_zoomShimmer",
			"zoomSkeleton": "vYZV7a_zoomSkeleton",
			"zoomTitle": "vYZV7a_zoomTitle"
		};
		//#endregion
		//#region src/client/draft.ts
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard). */
		function nextRpcId$2() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** One wire call: POST /api/<method> with the client-request frame,
		*  answer narrowed to the value row. A refused result throws the
		*  RemoteError branch's message (the door's own name); a channel
		*  surprise throws honestly. */
		async function wireCall$1(method, args) {
			const rpcId = nextRpcId$2();
			const res = await fetch("/api/" + method, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method,
					payload: { args }
				})
			});
			if (!res.ok) throw new Error(method + ": HTTP " + String(res.status));
			const body = await res.json().catch(() => null);
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error(method + ": malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error(method + ": malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : method + ": refused";
				throw new Error(message);
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(method + ": not a JSON object");
			return value;
		}
		/** The media URL seam — the twin of @melite/estate-media's mediaUrl
		*  (kept LOCAL: this is a browser module, the package main is a host
		*  plugin). Bare run-relative names ride the estate's media route;
		*  names that already carry a URL pass verbatim. */
		function mediaUrl(runId, name) {
			if (name === "") return name;
			if (/^(https?:\/\/|\/)/.test(name)) return name;
			return "/melite-media/runs/" + encodeURIComponent(runId) + "/" + name.split("/").map((seg) => encodeURIComponent(seg)).join("/");
		}
		/** The draft doc; throws the door's own named refusal on failure. */
		async function fetchDraft(draftId) {
			const doc = await wireCall$1("drafts/get", { draftId });
			if (typeof doc["draft_id"] !== "string" || !Array.isArray(doc["stages"])) throw new Error("drafts/get: not a draft doc");
			return doc;
		}
		/** Edit one stage's params — the REAL door, reborn 2026-09-11: the
		*  drafts remote's `drafts/patch` write arm over the drafts domain
		*  (the gateway-era PATCH /v1/flows/drafts/:id/stages/:sid died with
		*  the app; stroke L stubbed this to a loud throw — the shared-state
		*  door is back, same per-key merge semantics server-side). Throws
		*  the door's named refusal; delivered:false lands as a named throw
		*  (never a lying success). */
		async function patchStageParams(draftId, stageId, params) {
			const row = await wireCall$1("drafts/patch", {
				draftId,
				stageId,
				patch: { params }
			});
			if (row["delivered"] !== true) {
				const reason = typeof row["reason"] === "string" ? row["reason"] : "undelivered";
				throw new Error("drafts/patch: " + reason + " (draft " + draftId + ", stage " + stageId + ")");
			}
		}
		/** Start the run; returns the run_id or throws the door's named refusal. */
		async function startDraft(draftId) {
			const row = await wireCall$1("runs/start", { doc: { draft_id: draftId } });
			if (typeof row["run_id"] !== "string") throw new Error("runs/start: no run_id in the answer");
			return row["run_id"];
		}
		/** The run status (poll target). Throws on transport failure only. */
		async function runStatus(runId) {
			const doc = await wireCall$1("runs/status", { runId });
			if (typeof doc["status"] !== "string") throw new Error("runs/status: not a status doc");
			return doc;
		}
		/** The terminal set — @melite/catalog FlowEvents' TERMINAL, verbatim
		* (the poll's stop condition must match the stream's, or a dropped
		* socket polls forever / an unknown run stops early). */
		function runFinished(status) {
			return status === "completed" || status === "failed" || status === "stopped" || status === "unknown";
		}
		function rowStatus(live, doc) {
			const s = live ?? doc ?? "ready";
			if (s === "running" || s === "queued" || s === "pending") return s === "running" ? "running" : "queued";
			if (s === "completed" || s === "done" || s === "cached" || s === "succeeded") return "done";
			if (s === "failed" || s === "error") return "failed";
			return "ready";
		}
		/** Distill the draft (+ optional live run status) into card rows. */
		function cardRows(doc, live) {
			const liveStages = live?.stages ?? [];
			return doc.stages.map((stage, index) => {
				const runStage = liveStages[index];
				const params = stage.params ?? {};
				const prompt = typeof params["prompt"] === "string" && params["prompt"] !== "" ? params["prompt"].slice(0, 96) : null;
				return {
					stageId: stage.id,
					title: stage.title ?? stage.id,
					kind: stage.kind ?? "stage",
					service: typeof stage.service === "string" && stage.service !== "" ? stage.service : null,
					prompt,
					status: rowStatus(runStage?.status, stage.status),
					thumbUrl: typeof runStage?.url === "string" && runStage.url !== "" ? mediaUrl(live?.run_id ?? "", runStage.url) : null
				};
			});
		}
		/** Project a stage's params into editable fields (in key order). */
		function paramFields(params) {
			const fields = [];
			for (const [key, value] of Object.entries(params)) if (typeof value === "boolean") fields.push({
				key,
				value,
				atom: "switch"
			});
			else if (typeof value === "number") fields.push({
				key,
				value,
				atom: "number"
			});
			else if (typeof value === "string") fields.push({
				key,
				value,
				atom: "text"
			});
			return fields;
		}
		/** Coerce an edited atom value back to the param's wire type. */
		function coerceEdit(field, next) {
			if (field.atom === "number") {
				const n = Number(next);
				return Number.isFinite(n) ? n : field.value;
			}
			return next;
		}
		/** The PATCH body for one stage: only the keys whose coerced value
		*  actually changed (a "1." retyped back to the original number is NOT
		*  an edit). */
		function editPatch(fields, edits) {
			const patch = {};
			let changed = false;
			for (const f of fields) {
				const raw = edits.get(f.key);
				if (raw === void 0) continue;
				const next = typeof raw === "boolean" ? raw : coerceEdit(f, raw);
				if (next === f.value) continue;
				patch[f.key] = next;
				changed = true;
			}
			return changed ? patch : null;
		}
		//#endregion
		//#region src/client/card-drill.tsx
		/**
		* card-drill.tsx — THE CARD DRILLDOWN: the second state of the card
		* system, ONE component every card surface drills through (the chat
		* toolview FlowCards and the sidebar Cards tab — the 2026-09-10 UX
		* reborn 2026-09-11 as shared state + shared tool between the agent
		* and the user).
		*
		* DSH Modal (body portal, Escape/mask close — the operator's split
		* directive 2026-09-10): params LEFT (editable — switch fields ride
		* the Pill toggle, everything else a raw-string Input; editPatch
		* coerces ONCE at patch time so decimal dots survive typing), outputs
		* + Run RIGHT. Run ON THE CARD is a USER GESTURE, and it runs what
		* the user SEES: the caller receives the coerced patch and owns the
		* write-then-run order (the shared-state law — the patch lands in the
		* domain BEFORE the run reads it).
		*/
		function CardDrill({ title, fields, thumbUrl, running, onRun, onClose }) {
			const [edits, setEdits] = (0, react.useState)(/* @__PURE__ */ new Map());
			const [runError, setRunError] = (0, react.useState)(null);
			const patch = editPatch(fields, edits);
			const run = async () => {
				setRunError(null);
				try {
					await onRun(patch);
				} catch (e) {
					setRunError(e instanceof Error ? e.message : "run failed");
				}
			};
			const fieldNode = (f) => {
				if (f.atom === "switch") {
					const current = typeof f.value === "boolean" ? edits.get(f.key) ?? f.value : false;
					return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						active: current,
						onClick: () => {
							setEdits((m) => new Map(m).set(f.key, !current));
						}
					}, typeof f.value === "boolean" ? current ? "on" : "off" : "?");
				}
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					value: String(edits.get(f.key) ?? f.value),
					onChange: (e) => {
						const target = e;
						setEdits((m) => new Map(m).set(f.key, target.target.value));
					}
				});
			};
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title,
				closeLabel: "Close card",
				className: card_module_css_default.drill
			}, (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, fields.map((f) => (0, react.createElement)("label", {
				key: f.key,
				className: card_module_css_default.field
			}, (0, react.createElement)("span", { className: card_module_css_default.fieldKey }, f.key), fieldNode(f)))), (0, react.createElement)("div", { className: card_module_css_default.outputs }, thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.outputImg,
				src: thumbUrl,
				alt: title
			}) : null, (0, react.createElement)("div", { className: card_module_css_default.runRow }, runError !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, runError) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")))));
		}
		//#endregion
		//#region src/client/FlowCards.tsx
		/**
		* The melite_flow toolview — THE ACTION CARDS, rendered NATIVE in the
		* DSH React tree (2026-09-10 Phase 1: the iframe died).
		*
		* Keyed into the shipped `tool.call.toolview` seat for the wire tool
		* name `melite_flow`. NOT an iframe, NOT a bridge: the cards are React
		* components IN the host document —
		*   (a) THEME — inherited. The cards sit in DSH's tree, so every
		*       --dsw-alias-* token applies directly; the embed-bridge token
		*       copy is gone with the frame (the deck canvas keeps its own
		*       until Phase 2).
		*   (b) HEIGHT — gone as a problem. In-tree flow lays out natively;
		*       no polling, no scrollHeight reads.
		*   (c) DRILLDOWN — the ui-primitives Modal (body portal, Escape/
		*       mask close, aria-modal): the split detail — params left,
		*       outputs right — per the operator's directive 2026-09-10
		*       ("our cards go inside the dsh modal for the split drill
		*       down and drill up"). No zoom-promotion machine; DSH's own
		*       overlay machinery is the only layer.
		*
		* The wire is the editor's wire, same-origin via the card-deck host's
		* /v1 proxy (draft.ts owns every fetch). The user reviews the rows,
		* edits params in the drilldown, and presses Run ON THE CARD — the run
		* door (runs/start over the wire frame) is a user gesture, never the model's.
		*
		* WATERFALL LEDGER (operator law 2026-09-10: ride DSH 1:1 → minimize
		* our code → DOCUMENT what can't be ridden; each entry is for review):
		*   (a-1) RIDEN 1:1 — Button, Input, Pill, StateDot, Modal from the
		*         INSTALLED @deepseek-ai/dsh-client-ui-primitives rc.8 (Pill
		*         replaced hand-rolled capsule badges; Modal replaced the zoom
		*         machine). The css module is LAYOUT ONLY, every color an
		*         inherited --dsw-alias-* token — the ui-model-selection idiom.
		*   (c-4) rc.8 SURFACE GAP: the reference catalog also ships Tag and
		*         Switch; installed rc.8 does NOT. Pill is the shipped capsule
		*         for both (static span, no onClick = read-only badge; with
		*         onClick = the boolean toggle). REVIEW at the next rc bump:
		*         swap to Tag/Switch when installed.
		*   (c-1) NO ATOM: the card ROW (a list row that opens a Modal).
		*         DisclosureRow is inline expansion — a different interaction;
		*         no shipped atom covers row→modal. Hand-rolled, layout-only.
		*   (a-2) THE LIVE RUN, post-kill: the gateway-era events WS died
		*         with the gateway app (nothing serves it, by design); the
		*         poll over the runs/status remote IS the live channel until
		*         the collapse plan's stream remote exists (@Remote
		*         ({mode:'stream'}) over the mux). The fold mapping
		*         (idempotent stage frames by INDEX — the estate mapping law)
		*         stays in draft.ts for that day.
		*   (c-3) NO CLIENT: the draft/run remote layer (draft.ts). No DSH
		*         package wraps the estate's remotes as a browser client; the
		*         thin wire caller (client-request frame, api-gateway.md) is
		*         the sanctioned shape for plugins outside the web kernel.
		*/
		/** Run-status poll cadence (the editor's door, cheap same-host read). */
		const POLL_MS = 1500;
		/** Parse the melite_flow / card-tool call: the draft id + the model
		*  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
		*  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
		*  every card tool emits it; the handle is read from meta, never
		*  parsed out of prose. The render-text token ('card <draftId>') is
		*  the LEGACY fallback: sessions logged before a tool grew its
		*  projector still hydrate through the parse rule. */
		function parseCardsBlock(block) {
			const settled = block.kind === "tool-result";
			const argsRaw = settled ? block.call?.argsRaw ?? "" : block.argsRaw ?? "";
			let model = null;
			if (argsRaw !== "") try {
				const args = JSON.parse(argsRaw);
				if (typeof args["model"] === "string" && args["model"] !== "") model = args["model"];
			} catch {}
			let draftId = null;
			if (settled && block.isError !== true) {
				const meta = block.meta;
				if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
					const id = meta["draft_id"];
					if (typeof id === "string" && id !== "") draftId = id;
				}
				if (draftId === null && Array.isArray(block.content)) for (const part of block.content) {
					if (part === null || typeof part !== "object") continue;
					const text = part.text;
					if (typeof text !== "string") continue;
					const atCard = text.indexOf("card ");
					const atIdx = atCard >= 0 ? atCard : text.indexOf("draft ");
					if (atIdx < 0) continue;
					const rest = text.slice(atIdx + (atCard >= 0 ? 5 : 6));
					const end = rest.indexOf(" ");
					const tok = end < 0 ? rest : rest.slice(0, end);
					if ((tok.startsWith("draft-") || tok.startsWith("p_")) && tok.length > 2) {
						draftId = tok;
						break;
					}
				}
			}
			return {
				draftId,
				model,
				settled,
				isError: block.isError === true
			};
		}
		/** Draft doc + live run status, fetched and polled (all doors in draft.ts). */
		function useDraft(draftId) {
			const [doc, setDoc] = (0, react.useState)(null);
			const [live, setLive] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [tick, setTick] = (0, react.useState)(0);
			const pollRef = (0, react.useRef)(null);
			const refresh = (0, react.useCallback)(() => {
				setTick((t) => t + 1);
			}, []);
			(0, react.useEffect)(() => {
				if (draftId === null) return;
				let alive = true;
				setDoc(null);
				setLive(null);
				setError(null);
				fetchDraft(draftId).then((d) => {
					if (alive) setDoc(d);
				}).catch((e) => {
					if (alive) setError(e instanceof Error ? e.message : "draft hydration failed");
				});
				return () => {
					alive = false;
				};
			}, [draftId, tick]);
			const runId = live?.run_id ?? null;
			(0, react.useEffect)(() => {
				if (runId === null) return;
				let alive = true;
				const step = () => {
					runStatus(runId).then((s) => {
						if (!alive) return;
						setLive(s);
						if (runFinished(s.status)) {
							if (pollRef.current !== null) window.clearInterval(pollRef.current);
							pollRef.current = null;
							setTick((t) => t + 1);
						}
					}).catch(() => {});
				};
				step();
				pollRef.current = window.setInterval(step, POLL_MS);
				return () => {
					alive = false;
					if (pollRef.current !== null) window.clearInterval(pollRef.current);
					pollRef.current = null;
				};
			}, [runId]);
			return {
				doc,
				live,
				error,
				refresh
			};
		}
		/** The chat-listed card row: kind tag, title, service, status dot, prompt. */
		function CardRowLine({ row, onOpen }) {
			const dot = {
				queued: "warning",
				running: "ongoing",
				done: "done",
				failed: "error",
				ready: null
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: card_module_css_default.row,
				onClick: onOpen,
				"data-stage": row.stageId,
				"data-status": row.status,
				children: [
					row.thumbUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: card_module_css_default.thumb,
						src: row.thumbUrl,
						alt: row.title,
						loading: "lazy"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.kind }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.rowTitle,
						children: row.title
					}),
					row.service !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.service }),
					dot[row.status] !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot[row.status] }),
					row.prompt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.prompt,
						children: row.prompt
					})
				]
			});
		}
		/** One melite_flow call as the REAL action cards (native React, in-tree). */
		function FlowCards({ block }) {
			const parsed = (0, react.useMemo)(() => parseCardsBlock(block), [block]);
			const { doc, live, error, refresh } = useDraft(parsed.draftId);
			const [openStage, setOpenStage] = (0, react.useState)(null);
			if (parsed.settled && !parsed.isError && parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				"data-legacy": "1",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: "melite" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.model,
							children: parsed.model ?? "flow"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.state,
							"data-state": "legacy",
							children: "cards · earlier draft"
						})
					]
				})
			});
			if (parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: card_module_css_default.load,
					children: parsed.isError ? "draft failed" : "composing…"
				})
			});
			const rows = doc !== null ? cardRows(doc, live) : [];
			const openRow = rows.find((r) => r.stageId === openStage) ?? null;
			const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				"data-draft-id": parsed.draftId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: card_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.badge,
								children: "melite"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.model,
								children: doc?.intent ?? parsed.model ?? "flow"
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: card_module_css_default.state,
								"data-state": "error",
								role: "button",
								tabIndex: 0,
								onClick: refresh,
								onKeyDown: refresh,
								children: [error, " · retry"]
							})
						]
					}),
					doc === null && error === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: card_module_css_default.load,
						children: "cards…"
					}),
					rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardRowLine, {
						row,
						onOpen: () => {
							setOpenStage(row.stageId);
						}
					}, row.stageId)),
					openRow !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardDrill, {
						title: "Card " + openRow.title,
						fields: paramFields(openParams),
						thumbUrl: openRow.thumbUrl ?? null,
						running: false,
						onRun: async (patch) => {
							const draftId = parsed.draftId;
							if (draftId === null) throw new Error("draft id gone");
							if (patch !== null) await patchStageParams(draftId, openRow.stageId, patch);
							await startDraft(draftId);
							setOpenStage(null);
							refresh();
						},
						onClose: () => {
							setOpenStage(null);
							refresh();
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/spec-form.tsx
		/**
		* spec-form.tsx — THE CARD FORM, spec-driven (2026-09-11 rebirth).
		*
		* THE OLD SYSTEM'S LAW (the editor's flowParamEditor + the /v1/form-spec
		* SSOT): a card's knob surface is DECLARED, not guessed — the Schemastery
		* schema projects to the served form spec (typed atoms: textarea, number,
		* slider, select, seed, switch; defaults seeded; groups; visible-when).
		* The picker and the drilldown both render THIS — the nice formatting is
		* the spec's own shape, never a raw key/value dump.
		*
		* DSH NATIVE: Input from the installed ui-primitives where it fits;
		* the atoms the primitives set lacks (select, slider, textarea) are
		* layout-only module CSS over native elements, every color an
		* inherited --dsw-alias-* token. No second app, no iframe — same-origin
		* /v1 doors (the 2026-09-11 production restore: model-catalog,
		* form-spec) and the bench wire door.
		*/
		/** Seed the editable values from the spec's declared defaults (the old
		*  picker's law: pick → defaults seeded → the user edits from there). */
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
		/** /v1/form-spec?model=<family> — the card family's declared knob set. */
		async function fetchFormSpec(model, signal) {
			const doc = await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal);
			if (!Array.isArray(doc["fields"])) throw new Error("form-spec: no fields array");
			return doc;
		}
		/** One spec atom — typed by the declaration, edited as a raw string
		*  while typing (decimal dots survive; coercion happens once at patch). */
		function SpecAtom({ f, value, onEdit }) {
			if (f.type === "select" && Array.isArray(f.options) && f.options.length > 0) return (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				value: String(value ?? ""),
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			}, f.options.map((o) => (0, react.createElement)("option", {
				key: o.value,
				value: o.value
			}, o.label)));
			if (f.type === "slider") {
				const num = typeof value === "number" ? value : Number(value);
				return (0, react.createElement)("span", { className: card_module_css_default.specSliderRow }, (0, react.createElement)("input", {
					className: card_module_css_default.specSlider,
					type: "range",
					min: f.min ?? 0,
					max: f.max ?? 10,
					step: f.step ?? .1,
					value: Number.isFinite(num) ? num : f.default ?? 0,
					onInput: (e) => onEdit(f.name, e.target.value),
					"aria-label": f.label
				}), (0, react.createElement)("span", { className: card_module_css_default.specSliderValue }, String(value ?? f.default ?? "")));
			}
			if (f.type === "switch" || f.type === "boolean") {
				const on = value === true || value === "true";
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
					active: on,
					onClick: () => onEdit(f.name, !on)
				}, on ? "on" : "off");
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
		/** THE CARD FORM — the spec's fields, grouped, visible-when honored,
		*  defaults seeded by the caller. Edits ride the caller's values map. */
		function SpecForm({ fields, values, onEdit }) {
			const groups = groupFields(fields, values);
			return (0, react.createElement)("div", { className: card_module_css_default.specForm }, groups.map((g) => (0, react.createElement)("section", {
				key: g.group ?? "",
				className: card_module_css_default.specGroup
			}, g.group !== null ? (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, g.group) : null, g.fields.map((f) => (0, react.createElement)("label", {
				key: f.name,
				className: card_module_css_default.specField
			}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null), (0, react.createElement)(SpecAtom, {
				f,
				value: values[f.name],
				onEdit
			}), f.tooltip !== void 0 && f.tooltip !== "" ? (0, react.createElement)("span", { className: card_module_css_default.specHint }, f.tooltip) : null)))));
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
		//#endregion
		//#region ../../../node_modules/.pnpm/@deepseek-ai+dsh-typert-protocol@0.1.5-rc.2_@deepseek-ai+cordis@4.0.2/node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js
		/** The one Remote failure class shared by owners, the Gateway, and consumers. */
		/**
		* One Remote call failure: a real Error carrying its stable code and typed
		* details. Owners throw it at the failure point; the Host Gateway encodes it
		* onto the wire unchanged; the Client face rebuilds an instance for the
		* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
		* Discrimination is always by `code`, never by instanceof.
		*/
		var RemoteError = class extends Error {
			code;
			details;
			/** Structural marker: cross-realm/bundle identification never uses instanceof. */
			isDSHRemoteError = true;
			/**
			* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
			* @param message - human diagnostic carried across the wire.
			* @param details - structured payload typed by the code.
			* @param options - standard Error options (`cause` survives in-process only).
			*/
			constructor(code, message, details, options) {
				super(message, options);
				this.code = code;
				this.details = details;
				this.name = "RemoteError";
			}
		};
		//#endregion
		//#region src/client/cards-resource.ts
		/** The bench key the tab serves (melite-tools' DEFAULT_BENCH — 'main'). */
		const CARDS_BENCH_ADDRESS = "dsh-resource://cards/bench";
		/** The run address (the wand's target, plan §5). */
		function cardsRunAddress(runId) {
			return "dsh-resource://cards/run/" + encodeURIComponent(runId);
		}
		/** Parse a cards address; null when the path is not one of ours. */
		function parseCardsAddress(address) {
			if (!address.startsWith("dsh-resource://cards/")) return null;
			const rest = address.slice(21);
			if (rest === "bench") return { bench: true };
			if (rest.startsWith("run/")) {
				const runId = decodeURIComponent(rest.slice(4));
				if (runId !== "") return { run: runId };
			}
			return null;
		}
		/** One failure frame (the contract's error branch — a real RemoteError
		*  on the unclassified cards code; the address prefixes the diagnostic). */
		function failure(address, message) {
			return {
				ok: false,
				error: new RemoteError("cards/unclassified", address + ": " + message, {})
			};
		}
		/** Defensive row readers — the door's wire is untyped at this seam. */
		function readBench(doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			const log = Array.isArray(doc["log"]) ? doc["log"].filter((s) => typeof s === "object" && s !== null && typeof s["rev"] === "number") : [];
			return {
				kind: "bench",
				draftId: typeof doc["draft_id"] === "string" ? doc["draft_id"] : "bench-main",
				rev: typeof doc["rev"] === "number" ? doc["rev"] : 0,
				stages,
				log
			};
		}
		/** Re-read the shared bench (session 'main') — the consumer's reload
		*  after its own edits (the provider's bench stream is a single
		*  snapshot; same-address navigation does not re-run it). */
		async function fetchBench(signal) {
			return readBench(await wireCall("bench/get", { sessionKey: "main" }, signal));
		}
		function readRun(runId, doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			for (const stage of stages) if (typeof stage.url === "string" && stage.url !== "" && !/^(https?:\/\/|\/)/.test(stage.url)) stage.url = "/melite-media/runs/" + encodeURIComponent(runId) + "/" + stage.url.split("/").map((seg) => encodeURIComponent(seg)).join("/");
			return {
				kind: "run",
				runId,
				status: typeof doc["status"] === "string" ? doc["status"] : "unknown",
				draftId: typeof doc["draft_id"] === "string" && doc["draft_id"] !== "" ? doc["draft_id"] : null,
				stages,
				lastFrame: void 0
			};
		}
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard). */
		function nextRpcId$1() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** Read a server-response envelope and narrow its result. A non-ok
		*  result throws the RemoteError branch's message (the caller frames
		*  the failure); a channel surprise throws honestly. */
		async function wireCall(nsMethod, args, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/" + nsMethod, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: nsMethod,
					payload: { args }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("wire: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("wire: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("wire: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "wire: refused";
				throw new Error(message);
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("wire: not a JSON object");
			return value;
		}
		/** Card-back-into-flow: restore a run's producing draft onto the
		*  shared bench — drafts/get (the draft holds the full
		*  card/engine/params stages) then per-stage bench/add-stage as the
		*  USER (the CAS law: bench/get first, each add carries expect_rev,
		*  chained from the previous answer's rev). A stage with no card is
		*  SKIPPED and counted (add-stage requires one); an id collision
		*  retries once without the id (the bench auto-ids s_<n>) and notes
		*  it. Any other refusal throws with the door's own text — the bench
		*  keeps whatever landed before it, and the report says so. */
		async function restoreRunToBench(run, signal) {
			if (run.draftId === null || run.draftId === "") throw new Error("this run names no draft — nothing to restore");
			let draft;
			try {
				draft = await wireCall("drafts/get", { draftId: run.draftId }, signal);
			} catch (e) {
				throw new Error("the producing draft is unreadable: " + (e instanceof Error ? e.message : String(e)));
			}
			const raw = draft["stages"];
			const stages = Array.isArray(raw) ? raw.filter((s) => typeof s === "object" && s !== null) : [];
			if (stages.length === 0) throw new Error("the producing draft holds no stages — nothing to restore");
			let bench;
			try {
				bench = await wireCall("bench/get", { sessionKey: "main" }, signal);
			} catch (e) {
				throw new Error("the bench is unreadable: " + (e instanceof Error ? e.message : String(e)));
			}
			let rev = typeof bench["rev"] === "number" ? bench["rev"] : 0;
			const report = {
				added: 0,
				skipped: 0,
				notes: []
			};
			for (const st of stages) {
				const card = st["card"];
				if (typeof card !== "string" || card === "") {
					report.skipped += 1;
					report.notes.push("skipped a stage with no card (add-stage requires one)");
					continue;
				}
				const doc = {
					card,
					author: "user",
					expect_rev: rev
				};
				if (typeof st["engine"] === "string" && st["engine"] !== "") doc["engine"] = st["engine"];
				if (typeof st["params"] === "object" && st["params"] !== null && !Array.isArray(st["params"])) doc["params"] = st["params"];
				const id = typeof st["id"] === "string" && st["id"] !== "" ? st["id"] : null;
				if (id !== null) doc["id"] = id;
				try {
					const row = await wireCall("bench/add-stage", {
						sessionKey: "main",
						doc
					}, signal);
					if (typeof row["rev"] === "number") rev = row["rev"];
					report.added += 1;
				} catch (e) {
					const message = e instanceof Error ? e.message : String(e);
					if (id !== null && message.includes("already on the bench")) {
						const retry = { ...doc };
						delete retry["id"];
						try {
							const row = await wireCall("bench/add-stage", {
								sessionKey: "main",
								doc: retry
							}, signal);
							if (typeof row["rev"] === "number") rev = row["rev"];
							report.added += 1;
							report.notes.push(id + " was already on the bench — added under a fresh id");
						} catch (e2) {
							throw new Error("restore stopped after " + String(report.added) + " stage(s): " + (e2 instanceof Error ? e2.message : String(e2)));
						}
					} else throw new Error("restore stopped after " + String(report.added) + " stage(s): " + message);
				}
			}
			return report;
		}
		/** Merge one events frame into a run value (stage rows upserted by id;
		*  run-status frames replace the status; the frame is kept for the view). */
		function mergeRunFrame(value, frame) {
			const next = {
				...value,
				lastFrame: frame
			};
			const type = frame["type"];
			if (type === "run" && typeof frame["status"] === "string") next.status = frame["status"];
			if (type === "stage") {
				const stageId = frame["stage"];
				if (typeof stageId === "string") {
					if (next.stages.find((s) => s.id === stageId) === void 0) next.stages = [...next.stages, {
						id: stageId,
						status: "running"
					}];
					else next.stages = next.stages.map((s) => s.id === stageId ? {
						...s,
						status: "running"
					} : s);
				}
			}
			return next;
		}
		/** The provider registration body: `ctx.resources.register({ protocol:
		*  'cards', open })`. The estate remotes over the wire frame; abort
		*  ends the stream per the contract. */
		function openCardsResource(address, ctx) {
			const target = parseCardsAddress(address);
			const bench = target !== null && "bench" in target;
			const runId = target !== null && "run" in target ? target.run : "";
			return (async function* () {
				if (target === null) {
					yield failure(address, "not a cards address");
					return;
				}
				if (bench) {
					let value;
					try {
						value = readBench(await wireCall("bench/get", { sessionKey: "main" }));
					} catch (e) {
						yield failure(address, e instanceof Error ? e.message : String(e));
						return;
					}
					yield {
						ok: true,
						value
					};
					return;
				}
				let value;
				try {
					value = readRun(runId, await wireCall("runs/status", { runId }));
				} catch (e) {
					yield failure(address, e instanceof Error ? e.message : String(e));
					return;
				}
				yield {
					ok: true,
					value
				};
				if (ctx.signal.aborted) return;
				if (isTerminal(value.status)) return;
				yield* pollRunFrames(runId, value, ctx.signal);
			})();
		}
		/** The terminal statuses — the runs seat's own vocabulary (runsRegistry:
		*  stopFlag stamps 'stopped'; the settle path stamps 'completed' or
		*  'failed'. A settled run ends the stream; the hydrated/polled value
		*  stays as the last ok frame. */
		function isTerminal(status) {
			return status === "completed" || status === "failed" || status === "stopped";
		}
		/** The live tail (the honest degrade): poll `runs/status` and yield a
		*  value ONLY when the row moved (no frame spam) until the run turns
		*  terminal or the holder aborts. A poll error mid-run is not a
		*  failure frame — the last ok value stays (the kit keeps it); the
		*  next poll may recover. The cadence (1500ms) rides the run pump's
		*  own observation granularity, not user perception of latency: stage
		*  transitions inside the estate tick on the pump's settle path. */
		async function* pollRunFrames(runId, hydrated, signal) {
			let value = hydrated;
			const sleep = (ms) => new Promise((resolve) => {
				const t = setTimeout(() => {
					signal.removeEventListener("abort", onAbort);
					resolve("slept");
				}, ms);
				const onAbort = () => {
					clearTimeout(t);
					resolve("abort");
				};
				if (signal.aborted) {
					onAbort();
					return;
				}
				signal.addEventListener("abort", onAbort, { once: true });
			});
			while (!signal.aborted && !isTerminal(value.status)) {
				if (await sleep(1500) === "abort" || signal.aborted) return;
				let row;
				try {
					row = await wireCall("runs/status", { runId }, signal);
				} catch {
					continue;
				}
				const next = readRun(runId, row);
				if (!(next.status !== value.status || JSON.stringify(next.stages) !== JSON.stringify(value.stages))) continue;
				value = next;
				yield {
					ok: true,
					value
				};
			}
		}
		//#endregion
		//#region src/client/add-stage.ts
		/**
		* add-stage.ts — the bench add-stage wire door caller (the tab's
		* add-card path). The remote's signature is (sessionKey, doc) — the
		* args frame carries BOTH named; the doc holds card/author/engine/
		* params/expect_rev (the CAS law: the caller reads bench/get first
		* and chains the rev). */
		async function addStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/add-stage", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/add-stage",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/add-stage: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/add-stage: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/add-stage: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/add-stage refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/add-stage: not an object");
			return value;
		}
		/** The bench remove-stage wire door caller (the drill's Remove path).
		*  Same frame as the add (sessionKey, doc); the doc holds stage/
		*  expect_rev (the CAS law: the caller chains the bench rev it
		*  rendered, so a concurrent edit refuses instead of slicing wrong). */
		async function removeStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/remove-stage", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/remove-stage",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/remove-stage: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/remove-stage: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/remove-stage: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/remove-stage refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/remove-stage: not an object");
			return value;
		}
		/** The bench reorder wire door caller (the drag-reorder path). Doc:
		*  stage/to/expect_rev — `to` is the post-splice target index. */
		async function reorderStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/reorder", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/reorder",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/reorder: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/reorder: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/reorder: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/reorder refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/reorder: not an object");
			return value;
		}
		/** The bench rewire wire door caller (the wire gesture). Doc:
		*  stage/input/from/expect_rev — from is {stage, output} | {initial}
		*  | ABSENT to clear. */
		async function rewireStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/rewire", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/rewire",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/rewire: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/rewire: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/rewire: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/rewire refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/rewire: not an object");
			return value;
		}
		/** The bench group wire door caller (the Group Cards sub-view):
		*  stages = 2+ ids (bench order applied server-side). */
		async function groupStagesWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/group", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/group",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/group: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/group: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/group: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/group refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/group: not an object");
			return value;
		}
		/** The bench ungroup wire door caller: spill a compound's children. */
		async function ungroupStageWire(doc, signal) {
			const rpcId = nextRpcId$1();
			const res = await fetch("/api/bench/ungroup", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "bench/ungroup",
					payload: { args: {
						sessionKey: "main",
						doc
					} }
				}),
				...signal === void 0 ? {} : { signal }
			});
			if (!res.ok) throw new Error("bench/ungroup: HTTP " + String(res.status));
			const body = await res.json();
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("bench/ungroup: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null) throw new Error("bench/ungroup: malformed result");
			if (Reflect.get(result, "ok") !== true) {
				const error = Reflect.get(result, "error");
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "bench/ungroup refused");
			}
			const value = Reflect.get(result, "value");
			if (typeof value !== "object" || value === null) throw new Error("bench/ungroup: not an object");
			return value;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/LayoutGroupContext.mjs
		const LayoutGroupContext = (0, react.createContext)({});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/utils/use-constant.mjs
		/**
		* Creates a constant value over the lifecycle of a component.
		*
		* Even if `useMemo` is provided an empty array as its final argument, it doesn't offer
		* a guarantee that it won't re-run for performance reasons later on. By using `useConstant`
		* you can ensure that initialisers don't execute twice or more.
		*/
		function useConstant(init) {
			const ref = (0, react.useRef)(null);
			if (ref.current === null) ref.current = init();
			return ref.current;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/utils/use-isomorphic-effect.mjs
		const useIsomorphicLayoutEffect = typeof window !== "undefined" ? react.useLayoutEffect : react.useEffect;
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/PresenceContext.mjs
		/**
		* @public
		*/
		const PresenceContext = /* @__PURE__ */ (0, react.createContext)(null);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/array.mjs
		function addUniqueItem(arr, item) {
			if (arr.indexOf(item) === -1) arr.push(item);
		}
		function removeItem(arr, item) {
			const index = arr.indexOf(item);
			if (index > -1) arr.splice(index, 1);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/clamp.mjs
		const clamp = (min, max, v) => {
			if (v > max) return max;
			if (v < min) return min;
			return v;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/global-config.mjs
		const MotionGlobalConfig = {};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/is-numerical-string.mjs
		/**
		* Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
		*/
		const isNumericalString = (v) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/is-object.mjs
		const isObject = (value) => typeof value === "object" && value !== null;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/is-zero-value-string.mjs
		/**
		* Check if the value is a zero value string like "0px" or "0%"
		*/
		const isZeroValueString = (v) => /^0[^.\s]+$/u.test(v);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/memo.mjs
		/*#__NO_SIDE_EFFECTS__*/
		function memo(callback) {
			let result;
			return () => {
				if (result === void 0) result = callback();
				return result;
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/noop.mjs
		const noop = /* @__NO_SIDE_EFFECTS__ */ (any) => any;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/pipe.mjs
		/**
		* Pipe
		* Compose other transformers to run linearily
		* pipe(min(20), max(40))
		* @param  {...functions} transformers
		* @return {function}
		*/
		const pipe = (...transformers) => transformers.reduce((a, b) => (v) => b(a(v)));
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/progress.mjs
		const progress = /* @__NO_SIDE_EFFECTS__ */ (from, to, value) => {
			const range = to - from;
			return range ? (value - from) / range : 1;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/subscription-manager.mjs
		var SubscriptionManager = class {
			constructor() {
				this.subscriptions = [];
			}
			add(handler) {
				addUniqueItem(this.subscriptions, handler);
				return () => removeItem(this.subscriptions, handler);
			}
			notify(a, b, c) {
				const numSubscriptions = this.subscriptions.length;
				if (!numSubscriptions) return;
				if (numSubscriptions === 1)
 /**
				* If there's only a single handler we can just call it without invoking a loop.
				*/
				this.subscriptions[0](a, b, c);
				else for (let i = 0; i < numSubscriptions; i++) {
					/**
					* Check whether the handler exists before firing as it's possible
					* the subscriptions were modified during this loop running.
					*/
					const handler = this.subscriptions[i];
					handler && handler(a, b, c);
				}
			}
			getSize() {
				return this.subscriptions.length;
			}
			clear() {
				this.subscriptions.length = 0;
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/time-conversion.mjs
		/**
		* Converts seconds to milliseconds
		*
		* @param seconds - Time in seconds.
		* @return milliseconds - Converted time in milliseconds.
		*/
		const secondsToMilliseconds = /* @__NO_SIDE_EFFECTS__ */ (seconds) => seconds * 1e3;
		const millisecondsToSeconds = /* @__NO_SIDE_EFFECTS__ */ (milliseconds) => milliseconds / 1e3;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/velocity-per-second.mjs
		const velocityPerSecond = /* @__NO_SIDE_EFFECTS__ */ (velocity, frameDuration) => frameDuration ? velocity * (1e3 / frameDuration) : 0;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/cubic-bezier.mjs
		const calcBezier = (t, a1, a2) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;
		const subdivisionPrecision = 1e-7;
		const subdivisionMaxIterations = 12;
		function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
			let currentX;
			let currentT;
			let i = 0;
			do {
				currentT = lowerBound + (upperBound - lowerBound) / 2;
				currentX = calcBezier(currentT, mX1, mX2) - x;
				if (currentX > 0) upperBound = currentT;
				else lowerBound = currentT;
			} while (Math.abs(currentX) > subdivisionPrecision && ++i < subdivisionMaxIterations);
			return currentT;
		}
		/*#__NO_SIDE_EFFECTS__*/
		function cubicBezier(mX1, mY1, mX2, mY2) {
			if (mX1 === mY1 && mX2 === mY2) return noop;
			const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
			return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/modifiers/mirror.mjs
		const mirrorEasing = /* @__NO_SIDE_EFFECTS__ */ (easing) => (p) => p <= .5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/modifiers/reverse.mjs
		const reverseEasing = /* @__NO_SIDE_EFFECTS__ */ (easing) => (p) => 1 - easing(1 - p);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/back.mjs
		const backOut = /*@__PURE__*/ cubicBezier(.33, 1.53, .69, .99);
		const backIn = /*@__PURE__*/ reverseEasing(backOut);
		const backInOut = /*@__PURE__*/ mirrorEasing(backIn);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/anticipate.mjs
		const anticipate = (p) => p >= 1 ? 1 : (p *= 2) < 1 ? .5 * backIn(p) : .5 * (2 - Math.pow(2, -10 * (p - 1)));
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/circ.mjs
		const circIn = (p) => 1 - Math.sin(Math.acos(p));
		const circOut = /* @__PURE__ */ reverseEasing(circIn);
		const circInOut = /* @__PURE__ */ mirrorEasing(circIn);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/ease.mjs
		const easeIn = /*@__PURE__*/ cubicBezier(.42, 0, 1, 1);
		const easeOut = /*@__PURE__*/ cubicBezier(0, 0, .58, 1);
		const easeInOut = /*@__PURE__*/ cubicBezier(.42, 0, .58, 1);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/utils/is-easing-array.mjs
		const isEasingArray = /* @__NO_SIDE_EFFECTS__ */ (ease) => {
			return Array.isArray(ease) && typeof ease[0] !== "number";
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/utils/is-bezier-definition.mjs
		const isBezierDefinition = /* @__NO_SIDE_EFFECTS__ */ (easing) => Array.isArray(easing) && typeof easing[0] === "number";
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-utils@12.39.0/node_modules/motion-utils/dist/es/easing/utils/map.mjs
		const easingLookup = {
			linear: noop,
			easeIn,
			easeInOut,
			easeOut,
			circIn,
			circInOut,
			circOut,
			backIn,
			backInOut,
			backOut,
			anticipate
		};
		const isValidEasing = (easing) => {
			return typeof easing === "string";
		};
		const easingDefinitionToFunction = (definition) => {
			if (/* @__PURE__ */ isBezierDefinition(definition)) {
				definition.length;
				const [x1, y1, x2, y2] = definition;
				return /* @__PURE__ */ cubicBezier(x1, y1, x2, y2);
			} else if (isValidEasing(definition)) {
				easingLookup[definition], `${definition}`;
				return easingLookup[definition];
			}
			return definition;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/frameloop/order.mjs
		const stepsOrder = [
			"setup",
			"read",
			"resolveKeyframes",
			"preUpdate",
			"update",
			"preRender",
			"render",
			"postRender"
		];
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/frameloop/render-step.mjs
		function createRenderStep(runNextFrame) {
			/**
			* We create and reuse two queues, one to queue jobs for the current frame
			* and one for the next. We reuse to avoid triggering GC after x frames.
			*/
			let thisFrame = /* @__PURE__ */ new Set();
			let nextFrame = /* @__PURE__ */ new Set();
			/**
			* Track whether we're currently processing jobs in this step. This way
			* we can decide whether to schedule new jobs for this frame or next.
			*/
			let isProcessing = false;
			let flushNextFrame = false;
			/**
			* A set of processes which were marked keepAlive when scheduled.
			*/
			const toKeepAlive = /* @__PURE__ */ new WeakSet();
			let latestFrameData = {
				delta: 0,
				timestamp: 0,
				isProcessing: false
			};
			function triggerCallback(callback) {
				if (toKeepAlive.has(callback)) {
					step.schedule(callback);
					runNextFrame();
				}
				callback(latestFrameData);
			}
			const step = {
				/**
				* Schedule a process to run on the next frame.
				*/
				schedule: (callback, keepAlive = false, immediate = false) => {
					const queue = immediate && isProcessing ? thisFrame : nextFrame;
					if (keepAlive) toKeepAlive.add(callback);
					queue.add(callback);
					return callback;
				},
				/**
				* Cancel the provided callback from running on the next frame.
				*/
				cancel: (callback) => {
					nextFrame.delete(callback);
					toKeepAlive.delete(callback);
				},
				/**
				* Execute all schedule callbacks.
				*/
				process: (frameData) => {
					latestFrameData = frameData;
					/**
					* If we're already processing we've probably been triggered by a flushSync
					* inside an existing process. Instead of executing, mark flushNextFrame
					* as true and ensure we flush the following frame at the end of this one.
					*/
					if (isProcessing) {
						flushNextFrame = true;
						return;
					}
					isProcessing = true;
					const prevFrame = thisFrame;
					thisFrame = nextFrame;
					nextFrame = prevFrame;
					thisFrame.forEach(triggerCallback);
					thisFrame.clear();
					isProcessing = false;
					if (flushNextFrame) {
						flushNextFrame = false;
						step.process(frameData);
					}
				}
			};
			return step;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/frameloop/batcher.mjs
		const maxElapsed = 40;
		function createRenderBatcher(scheduleNextBatch, allowKeepAlive) {
			let runNextFrame = false;
			let useDefaultElapsed = true;
			const state = {
				delta: 0,
				timestamp: 0,
				isProcessing: false
			};
			const flagRunNextFrame = () => runNextFrame = true;
			const steps = stepsOrder.reduce((acc, key) => {
				acc[key] = createRenderStep(flagRunNextFrame);
				return acc;
			}, {});
			const { setup, read, resolveKeyframes, preUpdate, update, preRender, render, postRender } = steps;
			const processBatch = () => {
				const useManualTiming = MotionGlobalConfig.useManualTiming;
				const timestamp = useManualTiming ? state.timestamp : performance.now();
				runNextFrame = false;
				if (!useManualTiming) state.delta = useDefaultElapsed ? 1e3 / 60 : Math.max(Math.min(timestamp - state.timestamp, maxElapsed), 1);
				state.timestamp = timestamp;
				state.isProcessing = true;
				setup.process(state);
				read.process(state);
				resolveKeyframes.process(state);
				preUpdate.process(state);
				update.process(state);
				preRender.process(state);
				render.process(state);
				postRender.process(state);
				state.isProcessing = false;
				if (runNextFrame && allowKeepAlive) {
					useDefaultElapsed = false;
					scheduleNextBatch(processBatch);
				}
			};
			const wake = () => {
				runNextFrame = true;
				useDefaultElapsed = true;
				if (!state.isProcessing) scheduleNextBatch(processBatch);
			};
			const schedule = stepsOrder.reduce((acc, key) => {
				const step = steps[key];
				acc[key] = (process, keepAlive = false, immediate = false) => {
					if (!runNextFrame) wake();
					return step.schedule(process, keepAlive, immediate);
				};
				return acc;
			}, {});
			const cancel = (process) => {
				for (let i = 0; i < stepsOrder.length; i++) steps[stepsOrder[i]].cancel(process);
			};
			return {
				schedule,
				cancel,
				state,
				steps
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/frameloop/frame.mjs
		const { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps } = /* @__PURE__ */ createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop, true);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/frameloop/sync-time.mjs
		let now;
		function clearTime() {
			now = void 0;
		}
		/**
		* An eventloop-synchronous alternative to performance.now().
		*
		* Ensures that time measurements remain consistent within a synchronous context.
		* Usually calling performance.now() twice within the same synchronous context
		* will return different values which isn't useful for animations when we're usually
		* trying to sync animations to the same frame.
		*/
		const time = {
			now: () => {
				if (now === void 0) time.set(frameData.isProcessing || MotionGlobalConfig.useManualTiming ? frameData.timestamp : performance.now());
				return now;
			},
			set: (newTime) => {
				now = newTime;
				queueMicrotask(clearTime);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/is-css-variable.mjs
		const checkStringStartsWith = (token) => (key) => typeof key === "string" && key.startsWith(token);
		const isCSSVariableName = /*@__PURE__*/ checkStringStartsWith("--");
		const startsAsVariableToken = /*@__PURE__*/ checkStringStartsWith("var(--");
		const isCSSVariableToken = (value) => {
			if (!startsAsVariableToken(value)) return false;
			return singleCssVariableRegex.test(value.split("/*")[0].trim());
		};
		const singleCssVariableRegex = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
		/**
		* Check if a value contains a CSS variable anywhere (e.g. inside calc()).
		* Unlike isCSSVariableToken which checks if the value IS a var() token,
		* this checks if the value CONTAINS var() somewhere in the string.
		*/
		function containsCSSVariable(value) {
			if (typeof value !== "string") return false;
			return value.split("/*")[0].includes("var(--");
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/numbers/index.mjs
		const number = {
			test: (v) => typeof v === "number",
			parse: parseFloat,
			transform: (v) => v
		};
		const alpha = {
			...number,
			transform: (v) => clamp(0, 1, v)
		};
		const scale = {
			...number,
			default: 1
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/sanitize.mjs
		const sanitize = (v) => Math.round(v * 1e5) / 1e5;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/float-regex.mjs
		const floatRegex = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/is-nullish.mjs
		function isNullish(v) {
			return v == null;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/single-color-regex.mjs
		const singleColorRegex = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/color/utils.mjs
		/**
		* Returns true if the provided string is a color, ie rgba(0,0,0,0) or #000,
		* but false if a number or multiple colors
		*/
		const isColorString = (type, testProp) => (v) => {
			return Boolean(typeof v === "string" && singleColorRegex.test(v) && v.startsWith(type) || testProp && !isNullish(v) && Object.prototype.hasOwnProperty.call(v, testProp));
		};
		const splitColor = (aName, bName, cName) => (v) => {
			if (typeof v !== "string") return v;
			const [a, b, c, alpha] = v.match(floatRegex);
			return {
				[aName]: parseFloat(a),
				[bName]: parseFloat(b),
				[cName]: parseFloat(c),
				alpha: alpha !== void 0 ? parseFloat(alpha) : 1
			};
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/color/rgba.mjs
		const clampRgbUnit = (v) => clamp(0, 255, v);
		const rgbUnit = {
			...number,
			transform: (v) => Math.round(clampRgbUnit(v))
		};
		const rgba = {
			test: /*@__PURE__*/ isColorString("rgb", "red"),
			parse: /*@__PURE__*/ splitColor("red", "green", "blue"),
			transform: ({ red, green, blue, alpha: alpha$1 = 1 }) => "rgba(" + rgbUnit.transform(red) + ", " + rgbUnit.transform(green) + ", " + rgbUnit.transform(blue) + ", " + sanitize(alpha.transform(alpha$1)) + ")"
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/color/hex.mjs
		function parseHex(v) {
			let r = "";
			let g = "";
			let b = "";
			let a = "";
			if (v.length > 5) {
				r = v.substring(1, 3);
				g = v.substring(3, 5);
				b = v.substring(5, 7);
				a = v.substring(7, 9);
			} else {
				r = v.substring(1, 2);
				g = v.substring(2, 3);
				b = v.substring(3, 4);
				a = v.substring(4, 5);
				r += r;
				g += g;
				b += b;
				a += a;
			}
			return {
				red: parseInt(r, 16),
				green: parseInt(g, 16),
				blue: parseInt(b, 16),
				alpha: a ? parseInt(a, 16) / 255 : 1
			};
		}
		const hex = {
			test: /*@__PURE__*/ isColorString("#"),
			parse: parseHex,
			transform: rgba.transform
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/numbers/units.mjs
		const createUnitType = /* @__NO_SIDE_EFFECTS__ */ (unit) => ({
			test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
			parse: parseFloat,
			transform: (v) => `${v}${unit}`
		});
		const degrees = /*@__PURE__*/ createUnitType("deg");
		const percent = /*@__PURE__*/ createUnitType("%");
		const px = /*@__PURE__*/ createUnitType("px");
		const vh = /*@__PURE__*/ createUnitType("vh");
		const vw = /*@__PURE__*/ createUnitType("vw");
		const progressPercentage = /*@__PURE__*/ (() => ({
			...percent,
			parse: (v) => percent.parse(v) / 100,
			transform: (v) => percent.transform(v * 100)
		}))();
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/color/hsla.mjs
		const hsla = {
			test: /*@__PURE__*/ isColorString("hsl", "hue"),
			parse: /*@__PURE__*/ splitColor("hue", "saturation", "lightness"),
			transform: ({ hue, saturation, lightness, alpha: alpha$1 = 1 }) => {
				return "hsla(" + Math.round(hue) + ", " + percent.transform(sanitize(saturation)) + ", " + percent.transform(sanitize(lightness)) + ", " + sanitize(alpha.transform(alpha$1)) + ")";
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/color/index.mjs
		const color = {
			test: (v) => rgba.test(v) || hex.test(v) || hsla.test(v),
			parse: (v) => {
				if (rgba.test(v)) return rgba.parse(v);
				else if (hsla.test(v)) return hsla.parse(v);
				else return hex.parse(v);
			},
			transform: (v) => {
				return typeof v === "string" ? v : v.hasOwnProperty("red") ? rgba.transform(v) : hsla.transform(v);
			},
			getAnimatableNone: (v) => {
				const parsed = color.parse(v);
				parsed.alpha = 0;
				return color.transform(parsed);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/color-regex.mjs
		const colorRegex = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/complex/index.mjs
		function test(v) {
			return isNaN(v) && typeof v === "string" && (v.match(floatRegex)?.length || 0) + (v.match(colorRegex)?.length || 0) > 0;
		}
		const NUMBER_TOKEN = "number";
		const COLOR_TOKEN = "color";
		const VAR_TOKEN = "var";
		const VAR_FUNCTION_TOKEN = "var(";
		const SPLIT_TOKEN = "${}";
		const complexRegex = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
		function analyseComplexValue(value) {
			const originalValue = value.toString();
			const values = [];
			const indexes = {
				color: [],
				number: [],
				var: []
			};
			const types = [];
			let i = 0;
			return {
				values,
				split: originalValue.replace(complexRegex, (parsedValue) => {
					if (color.test(parsedValue)) {
						indexes.color.push(i);
						types.push(COLOR_TOKEN);
						values.push(color.parse(parsedValue));
					} else if (parsedValue.startsWith(VAR_FUNCTION_TOKEN)) {
						indexes.var.push(i);
						types.push(VAR_TOKEN);
						values.push(parsedValue);
					} else {
						indexes.number.push(i);
						types.push(NUMBER_TOKEN);
						values.push(parseFloat(parsedValue));
					}
					++i;
					return SPLIT_TOKEN;
				}).split(SPLIT_TOKEN),
				indexes,
				types
			};
		}
		function parseComplexValue(v) {
			return analyseComplexValue(v).values;
		}
		function buildTransformer({ split, types }) {
			const numSections = split.length;
			return (v) => {
				let output = "";
				for (let i = 0; i < numSections; i++) {
					output += split[i];
					if (v[i] !== void 0) {
						const type = types[i];
						if (type === NUMBER_TOKEN) output += sanitize(v[i]);
						else if (type === COLOR_TOKEN) output += color.transform(v[i]);
						else output += v[i];
					}
				}
				return output;
			};
		}
		function createTransformer(source) {
			return buildTransformer(analyseComplexValue(source));
		}
		const convertNumbersToZero = (v) => typeof v === "number" ? 0 : color.test(v) ? color.getAnimatableNone(v) : v;
		/**
		* Convert a parsed value to its zero equivalent, but preserve numbers
		* that act as divisors in CSS calc() expressions.
		*
		* analyseComplexValue extracts numbers from CSS strings and puts the
		* surrounding text into a `split` template array. For example:
		*   "calc(var(--gap) / 5)"  →  values: [var(--gap), 5]
		*                               split:  ["calc(", " / ", ")"]
		*
		* When building a zero-equivalent for animation, naively zeroing all
		* numbers turns the divisor into 0 → "calc(var(--gap) / 0)" → NaN.
		* We detect this by checking whether the text preceding a number
		* (split[i]) ends with "/" — the CSS calc division operator.
		*/
		const convertToZero = (value, splitBefore) => {
			if (typeof value === "number") return splitBefore?.trim().endsWith("/") ? value : 0;
			return convertNumbersToZero(value);
		};
		function getAnimatableNone$1(v) {
			const info = analyseComplexValue(v);
			return buildTransformer(info)(info.values.map((value, i) => convertToZero(value, info.split[i])));
		}
		const complex = {
			test,
			parse: parseComplexValue,
			createTransformer,
			getAnimatableNone: getAnimatableNone$1
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/color/hsla-to-rgba.mjs
		function hueToRgb(p, q, t) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		}
		function hslaToRgba({ hue, saturation, lightness, alpha }) {
			hue /= 360;
			saturation /= 100;
			lightness /= 100;
			let red = 0;
			let green = 0;
			let blue = 0;
			if (!saturation) red = green = blue = lightness;
			else {
				const q = lightness < .5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
				const p = 2 * lightness - q;
				red = hueToRgb(p, q, hue + 1 / 3);
				green = hueToRgb(p, q, hue);
				blue = hueToRgb(p, q, hue - 1 / 3);
			}
			return {
				red: Math.round(red * 255),
				green: Math.round(green * 255),
				blue: Math.round(blue * 255),
				alpha
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/mix/immediate.mjs
		function mixImmediate(a, b) {
			return (p) => p > 0 ? b : a;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/mix/number.mjs
		const mixNumber$1 = (from, to, progress) => {
			return from + (to - from) * progress;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/mix/color.mjs
		const mixLinearColor = (from, to, v) => {
			const fromExpo = from * from;
			const expo = v * (to * to - fromExpo) + fromExpo;
			return expo < 0 ? 0 : Math.sqrt(expo);
		};
		const colorTypes = [
			hex,
			rgba,
			hsla
		];
		const getColorType = (v) => colorTypes.find((type) => type.test(v));
		function asRGBA(color) {
			const type = getColorType(color);
			`${color}`;
			if (!Boolean(type)) return false;
			let model = type.parse(color);
			if (type === hsla) model = hslaToRgba(model);
			return model;
		}
		const mixColor = (from, to) => {
			const fromRGBA = asRGBA(from);
			const toRGBA = asRGBA(to);
			if (!fromRGBA || !toRGBA) return mixImmediate(from, to);
			const blended = { ...fromRGBA };
			return (v) => {
				blended.red = mixLinearColor(fromRGBA.red, toRGBA.red, v);
				blended.green = mixLinearColor(fromRGBA.green, toRGBA.green, v);
				blended.blue = mixLinearColor(fromRGBA.blue, toRGBA.blue, v);
				blended.alpha = mixNumber$1(fromRGBA.alpha, toRGBA.alpha, v);
				return rgba.transform(blended);
			};
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/mix/visibility.mjs
		const invisibleValues = /* @__PURE__ */ new Set(["none", "hidden"]);
		/**
		* Returns a function that, when provided a progress value between 0 and 1,
		* will return the "none" or "hidden" string only when the progress is that of
		* the origin or target.
		*/
		function mixVisibility(origin, target) {
			if (invisibleValues.has(origin)) return (p) => p <= 0 ? origin : target;
			else return (p) => p >= 1 ? target : origin;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/mix/complex.mjs
		function mixNumber(a, b) {
			return (p) => mixNumber$1(a, b, p);
		}
		function getMixer(a) {
			if (typeof a === "number") return mixNumber;
			else if (typeof a === "string") return isCSSVariableToken(a) ? mixImmediate : color.test(a) ? mixColor : mixComplex;
			else if (Array.isArray(a)) return mixArray;
			else if (typeof a === "object") return color.test(a) ? mixColor : mixObject;
			return mixImmediate;
		}
		function mixArray(a, b) {
			const output = [...a];
			const numValues = output.length;
			const blendValue = a.map((v, i) => getMixer(v)(v, b[i]));
			return (p) => {
				for (let i = 0; i < numValues; i++) output[i] = blendValue[i](p);
				return output;
			};
		}
		function mixObject(a, b) {
			const output = {
				...a,
				...b
			};
			const blendValue = {};
			for (const key in output) if (a[key] !== void 0 && b[key] !== void 0) blendValue[key] = getMixer(a[key])(a[key], b[key]);
			return (v) => {
				for (const key in blendValue) output[key] = blendValue[key](v);
				return output;
			};
		}
		function matchOrder(origin, target) {
			const orderedOrigin = [];
			const pointers = {
				color: 0,
				var: 0,
				number: 0
			};
			for (let i = 0; i < target.values.length; i++) {
				const type = target.types[i];
				const originIndex = origin.indexes[type][pointers[type]];
				const originValue = origin.values[originIndex] ?? 0;
				orderedOrigin[i] = originValue;
				pointers[type]++;
			}
			return orderedOrigin;
		}
		const mixComplex = (origin, target) => {
			const template = complex.createTransformer(target);
			const originStats = analyseComplexValue(origin);
			const targetStats = analyseComplexValue(target);
			if (originStats.indexes.var.length === targetStats.indexes.var.length && originStats.indexes.color.length === targetStats.indexes.color.length && originStats.indexes.number.length >= targetStats.indexes.number.length) {
				if (invisibleValues.has(origin) && !targetStats.values.length || invisibleValues.has(target) && !originStats.values.length) return mixVisibility(origin, target);
				return pipe(mixArray(matchOrder(originStats, targetStats), targetStats.values), template);
			} else {
				`${origin}${target}`;
				return mixImmediate(origin, target);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/mix/index.mjs
		function mix(from, to, p) {
			if (typeof from === "number" && typeof to === "number" && typeof p === "number") return mixNumber$1(from, to, p);
			return getMixer(from)(from, to);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/drivers/frame.mjs
		const frameloopDriver = (update) => {
			const passTimestamp = ({ timestamp }) => update(timestamp);
			return {
				start: (keepAlive = true) => frame.update(passTimestamp, keepAlive),
				stop: () => cancelFrame(passTimestamp),
				/**
				* If we're processing this frame we can use the
				* framelocked timestamp to keep things in sync.
				*/
				now: () => frameData.isProcessing ? frameData.timestamp : time.now()
			};
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/utils/linear.mjs
		const generateLinearEasing = (easing, duration, resolution = 10) => {
			let points = "";
			const numPoints = Math.max(Math.round(duration / resolution), 2);
			for (let i = 0; i < numPoints; i++) points += Math.round(easing(i / (numPoints - 1)) * 1e4) / 1e4 + ", ";
			return `linear(${points.substring(0, points.length - 2)})`;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/utils/calc-duration.mjs
		/**
		* Implement a practical max duration for keyframe generation
		* to prevent infinite loops
		*/
		const maxGeneratorDuration = 2e4;
		function calcGeneratorDuration(generator) {
			let duration = 0;
			const timeStep = 50;
			let state = generator.next(duration);
			while (!state.done && duration < 2e4) {
				duration += timeStep;
				state = generator.next(duration);
			}
			return duration >= 2e4 ? Infinity : duration;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/utils/create-generator-easing.mjs
		/**
		* Create a progress => progress easing function from a generator.
		*/
		function createGeneratorEasing(options, scale = 100, createGenerator) {
			const generator = createGenerator({
				...options,
				keyframes: [0, scale]
			});
			const duration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
			return {
				type: "keyframes",
				ease: (progress) => {
					return generator.next(duration * progress).value / scale;
				},
				duration: /* @__PURE__ */ millisecondsToSeconds(duration)
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/spring.mjs
		const springDefaults = {
			stiffness: 100,
			damping: 10,
			mass: 1,
			velocity: 0,
			duration: 800,
			bounce: .3,
			visualDuration: .3,
			restSpeed: {
				granular: .01,
				default: 2
			},
			restDelta: {
				granular: .005,
				default: .5
			},
			minDuration: .01,
			maxDuration: 10,
			minDamping: .05,
			maxDamping: 1
		};
		function calcAngularFreq(undampedFreq, dampingRatio) {
			return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
		}
		const rootIterations = 12;
		function approximateRoot(envelope, derivative, initialGuess) {
			let result = initialGuess;
			for (let i = 1; i < rootIterations; i++) result = result - envelope(result) / derivative(result);
			return result;
		}
		/**
		* This is ported from the Framer implementation of duration-based spring resolution.
		*/
		const safeMin = .001;
		function findSpring({ duration = springDefaults.duration, bounce = springDefaults.bounce, velocity = springDefaults.velocity, mass = springDefaults.mass }) {
			let envelope;
			let derivative;
			springDefaults.maxDuration;
			let dampingRatio = 1 - bounce;
			/**
			* Restrict dampingRatio and duration to within acceptable ranges.
			*/
			dampingRatio = clamp(springDefaults.minDamping, springDefaults.maxDamping, dampingRatio);
			duration = clamp(springDefaults.minDuration, springDefaults.maxDuration, /* @__PURE__ */ millisecondsToSeconds(duration));
			if (dampingRatio < 1) {
				/**
				* Underdamped spring
				*/
				envelope = (undampedFreq) => {
					const exponentialDecay = undampedFreq * dampingRatio;
					const delta = exponentialDecay * duration;
					const a = exponentialDecay - velocity;
					const b = calcAngularFreq(undampedFreq, dampingRatio);
					const c = Math.exp(-delta);
					return safeMin - a / b * c;
				};
				derivative = (undampedFreq) => {
					const delta = undampedFreq * dampingRatio * duration;
					const d = delta * velocity + velocity;
					const e = Math.pow(dampingRatio, 2) * Math.pow(undampedFreq, 2) * duration;
					const f = Math.exp(-delta);
					const g = calcAngularFreq(Math.pow(undampedFreq, 2), dampingRatio);
					return (-envelope(undampedFreq) + safeMin > 0 ? -1 : 1) * ((d - e) * f) / g;
				};
			} else {
				/**
				* Critically-damped spring
				*/
				envelope = (undampedFreq) => {
					return -.001 + Math.exp(-undampedFreq * duration) * ((undampedFreq - velocity) * duration + 1);
				};
				derivative = (undampedFreq) => {
					return Math.exp(-undampedFreq * duration) * ((velocity - undampedFreq) * (duration * duration));
				};
			}
			const initialGuess = 5 / duration;
			const undampedFreq = approximateRoot(envelope, derivative, initialGuess);
			duration = /* @__PURE__ */ secondsToMilliseconds(duration);
			if (isNaN(undampedFreq)) return {
				stiffness: springDefaults.stiffness,
				damping: springDefaults.damping,
				duration
			};
			else {
				const stiffness = Math.pow(undampedFreq, 2) * mass;
				return {
					stiffness,
					damping: dampingRatio * 2 * Math.sqrt(mass * stiffness),
					duration
				};
			}
		}
		const durationKeys = ["duration", "bounce"];
		const physicsKeys = [
			"stiffness",
			"damping",
			"mass"
		];
		function isSpringType(options, keys) {
			return keys.some((key) => options[key] !== void 0);
		}
		function getSpringOptions(options) {
			let springOptions = {
				velocity: springDefaults.velocity,
				stiffness: springDefaults.stiffness,
				damping: springDefaults.damping,
				mass: springDefaults.mass,
				isResolvedFromDuration: false,
				...options
			};
			if (!isSpringType(options, physicsKeys) && isSpringType(options, durationKeys)) {
				springOptions.velocity = 0;
				if (options.visualDuration) {
					const visualDuration = options.visualDuration;
					const root = 2 * Math.PI / (visualDuration * 1.2);
					const stiffness = root * root;
					const damping = 2 * clamp(.05, 1, 1 - (options.bounce || 0)) * Math.sqrt(stiffness);
					springOptions = {
						...springOptions,
						mass: springDefaults.mass,
						stiffness,
						damping
					};
				} else {
					const derived = findSpring({
						...options,
						velocity: 0
					});
					springOptions = {
						...springOptions,
						...derived,
						mass: springDefaults.mass
					};
					springOptions.isResolvedFromDuration = true;
				}
			}
			return springOptions;
		}
		function spring(optionsOrVisualDuration = springDefaults.visualDuration, bounce = springDefaults.bounce) {
			const options = typeof optionsOrVisualDuration !== "object" ? {
				visualDuration: optionsOrVisualDuration,
				keyframes: [0, 1],
				bounce
			} : optionsOrVisualDuration;
			let { restSpeed, restDelta } = options;
			const origin = options.keyframes[0];
			const target = options.keyframes[options.keyframes.length - 1];
			/**
			* This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
			* to reduce GC during animation.
			*/
			const state = {
				done: false,
				value: origin
			};
			const { stiffness, damping, mass, duration, velocity, isResolvedFromDuration } = getSpringOptions({
				...options,
				velocity: -/* @__PURE__ */ millisecondsToSeconds(options.velocity || 0)
			});
			const initialVelocity = velocity || 0;
			const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
			const initialDelta = target - origin;
			const undampedAngularFreq = /* @__PURE__ */ millisecondsToSeconds(Math.sqrt(stiffness / mass));
			/**
			* If we're working on a granular scale, use smaller defaults for determining
			* when the spring is finished.
			*
			* These defaults have been selected emprically based on what strikes a good
			* ratio between feeling good and finishing as soon as changes are imperceptible.
			*/
			const isGranularScale = Math.abs(initialDelta) < 5;
			restSpeed || (restSpeed = isGranularScale ? springDefaults.restSpeed.granular : springDefaults.restSpeed.default);
			restDelta || (restDelta = isGranularScale ? springDefaults.restDelta.granular : springDefaults.restDelta.default);
			let resolveSpring;
			let resolveVelocity;
			let angularFreq;
			let A;
			let sinCoeff;
			let cosCoeff;
			if (dampingRatio < 1) {
				angularFreq = calcAngularFreq(undampedAngularFreq, dampingRatio);
				A = (initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) / angularFreq;
				resolveSpring = (t) => {
					const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
					return target - envelope * (A * Math.sin(angularFreq * t) + initialDelta * Math.cos(angularFreq * t));
				};
				sinCoeff = dampingRatio * undampedAngularFreq * A + initialDelta * angularFreq;
				cosCoeff = dampingRatio * undampedAngularFreq * initialDelta - A * angularFreq;
				resolveVelocity = (t) => {
					return Math.exp(-dampingRatio * undampedAngularFreq * t) * (sinCoeff * Math.sin(angularFreq * t) + cosCoeff * Math.cos(angularFreq * t));
				};
			} else if (dampingRatio === 1) {
				resolveSpring = (t) => target - Math.exp(-undampedAngularFreq * t) * (initialDelta + (initialVelocity + undampedAngularFreq * initialDelta) * t);
				const C = initialVelocity + undampedAngularFreq * initialDelta;
				resolveVelocity = (t) => Math.exp(-undampedAngularFreq * t) * (undampedAngularFreq * C * t - initialVelocity);
			} else {
				const dampedAngularFreq = undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
				resolveSpring = (t) => {
					const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
					const freqForT = Math.min(dampedAngularFreq * t, 300);
					return target - envelope * ((initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) * Math.sinh(freqForT) + dampedAngularFreq * initialDelta * Math.cosh(freqForT)) / dampedAngularFreq;
				};
				const P = (initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) / dampedAngularFreq;
				const sinhCoeff = dampingRatio * undampedAngularFreq * P - initialDelta * dampedAngularFreq;
				const coshCoeff = dampingRatio * undampedAngularFreq * initialDelta - P * dampedAngularFreq;
				resolveVelocity = (t) => {
					const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
					const freqForT = Math.min(dampedAngularFreq * t, 300);
					return envelope * (sinhCoeff * Math.sinh(freqForT) + coshCoeff * Math.cosh(freqForT));
				};
			}
			const generator = {
				calculatedDuration: isResolvedFromDuration ? duration || null : null,
				velocity: (t) => /* @__PURE__ */ secondsToMilliseconds(resolveVelocity(t)),
				next: (t) => {
					/**
					* For underdamped physics springs we need both position and
					* velocity each tick. Compute shared trig values once to avoid
					* duplicate Math.exp/sin/cos calls on the hot path.
					*/
					if (!isResolvedFromDuration && dampingRatio < 1) {
						const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
						const sin = Math.sin(angularFreq * t);
						const cos = Math.cos(angularFreq * t);
						const current = target - envelope * (A * sin + initialDelta * cos);
						const currentVelocity = /* @__PURE__ */ secondsToMilliseconds(envelope * (sinCoeff * sin + cosCoeff * cos));
						state.done = Math.abs(currentVelocity) <= restSpeed && Math.abs(target - current) <= restDelta;
						state.value = state.done ? target : current;
						return state;
					}
					const current = resolveSpring(t);
					if (!isResolvedFromDuration) {
						const currentVelocity = /* @__PURE__ */ secondsToMilliseconds(resolveVelocity(t));
						state.done = Math.abs(currentVelocity) <= restSpeed && Math.abs(target - current) <= restDelta;
					} else state.done = t >= duration;
					state.value = state.done ? target : current;
					return state;
				},
				toString: () => {
					const calculatedDuration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
					const easing = generateLinearEasing((progress) => generator.next(calculatedDuration * progress).value, calculatedDuration, 30);
					return calculatedDuration + "ms " + easing;
				},
				toTransition: () => {}
			};
			return generator;
		}
		spring.applyToOptions = (options) => {
			const generatorOptions = createGeneratorEasing(options, 100, spring);
			options.ease = generatorOptions.ease;
			options.duration = /* @__PURE__ */ secondsToMilliseconds(generatorOptions.duration);
			options.type = "keyframes";
			return options;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/utils/velocity.mjs
		const velocitySampleDuration = 5;
		function getGeneratorVelocity(resolveValue, t, current) {
			const prevT = Math.max(t - velocitySampleDuration, 0);
			return /* @__PURE__ */ velocityPerSecond(current - resolveValue(prevT), t - prevT);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/inertia.mjs
		function inertia({ keyframes, velocity = 0, power = .8, timeConstant = 325, bounceDamping = 10, bounceStiffness = 500, modifyTarget, min, max, restDelta = .5, restSpeed }) {
			const origin = keyframes[0];
			const state = {
				done: false,
				value: origin
			};
			const isOutOfBounds = (v) => min !== void 0 && v < min || max !== void 0 && v > max;
			const nearestBoundary = (v) => {
				if (min === void 0) return max;
				if (max === void 0) return min;
				return Math.abs(min - v) < Math.abs(max - v) ? min : max;
			};
			let amplitude = power * velocity;
			const ideal = origin + amplitude;
			const target = modifyTarget === void 0 ? ideal : modifyTarget(ideal);
			/**
			* If the target has changed we need to re-calculate the amplitude, otherwise
			* the animation will start from the wrong position.
			*/
			if (target !== ideal) amplitude = target - origin;
			const calcDelta = (t) => -amplitude * Math.exp(-t / timeConstant);
			const calcLatest = (t) => target + calcDelta(t);
			const applyFriction = (t) => {
				const delta = calcDelta(t);
				const latest = calcLatest(t);
				state.done = Math.abs(delta) <= restDelta;
				state.value = state.done ? target : latest;
			};
			/**
			* Ideally this would resolve for t in a stateless way, we could
			* do that by always precalculating the animation but as we know
			* this will be done anyway we can assume that spring will
			* be discovered during that.
			*/
			let timeReachedBoundary;
			let spring$1;
			const checkCatchBoundary = (t) => {
				if (!isOutOfBounds(state.value)) return;
				timeReachedBoundary = t;
				spring$1 = spring({
					keyframes: [state.value, nearestBoundary(state.value)],
					velocity: getGeneratorVelocity(calcLatest, t, state.value),
					damping: bounceDamping,
					stiffness: bounceStiffness,
					restDelta,
					restSpeed
				});
			};
			checkCatchBoundary(0);
			return {
				calculatedDuration: null,
				next: (t) => {
					/**
					* We need to resolve the friction to figure out if we need a
					* spring but we don't want to do this twice per frame. So here
					* we flag if we updated for this frame and later if we did
					* we can skip doing it again.
					*/
					let hasUpdatedFrame = false;
					if (!spring$1 && timeReachedBoundary === void 0) {
						hasUpdatedFrame = true;
						applyFriction(t);
						checkCatchBoundary(t);
					}
					/**
					* If we have a spring and the provided t is beyond the moment the friction
					* animation crossed the min/max boundary, use the spring.
					*/
					if (timeReachedBoundary !== void 0 && t >= timeReachedBoundary) return spring$1.next(t - timeReachedBoundary);
					else {
						!hasUpdatedFrame && applyFriction(t);
						return state;
					}
				}
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/interpolate.mjs
		function createMixers(output, ease, customMixer) {
			const mixers = [];
			const mixerFactory = customMixer || MotionGlobalConfig.mix || mix;
			const numMixers = output.length - 1;
			for (let i = 0; i < numMixers; i++) {
				let mixer = mixerFactory(output[i], output[i + 1]);
				if (ease) {
					const easingFunction = Array.isArray(ease) ? ease[i] || noop : ease;
					mixer = pipe(easingFunction, mixer);
				}
				mixers.push(mixer);
			}
			return mixers;
		}
		/**
		* Create a function that maps from a numerical input array to a generic output array.
		*
		* Accepts:
		*   - Numbers
		*   - Colors (hex, hsl, hsla, rgb, rgba)
		*   - Complex (combinations of one or more numbers or strings)
		*
		* ```jsx
		* const mixColor = interpolate([0, 1], ['#fff', '#000'])
		*
		* mixColor(0.5) // 'rgba(128, 128, 128, 1)'
		* ```
		*
		* TODO Revisit this approach once we've moved to data models for values,
		* probably not needed to pregenerate mixer functions.
		*
		* @public
		*/
		function interpolate(input, output, { clamp: isClamp = true, ease, mixer } = {}) {
			const inputLength = input.length;
			output.length;
			/**
			* If we're only provided a single input, we can just make a function
			* that returns the output.
			*/
			if (inputLength === 1) return () => output[0];
			if (inputLength === 2 && output[0] === output[1]) return () => output[1];
			const isZeroDeltaRange = input[0] === input[1];
			if (input[0] > input[inputLength - 1]) {
				input = [...input].reverse();
				output = [...output].reverse();
			}
			const mixers = createMixers(output, ease, mixer);
			const numMixers = mixers.length;
			const interpolator = (v) => {
				if (isZeroDeltaRange && v < input[0]) return output[0];
				let i = 0;
				if (numMixers > 1) {
					for (; i < input.length - 2; i++) if (v < input[i + 1]) break;
				}
				const progressInRange = /* @__PURE__ */ progress(input[i], input[i + 1], v);
				return mixers[i](progressInRange);
			};
			return isClamp ? (v) => interpolator(clamp(input[0], input[inputLength - 1], v)) : interpolator;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/offsets/fill.mjs
		function fillOffset(offset, remaining) {
			const min = offset[offset.length - 1];
			for (let i = 1; i <= remaining; i++) {
				const offsetProgress = /* @__PURE__ */ progress(0, remaining, i);
				offset.push(mixNumber$1(min, 1, offsetProgress));
			}
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/offsets/default.mjs
		function defaultOffset(arr) {
			const offset = [0];
			fillOffset(offset, arr.length - 1);
			return offset;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/offsets/time.mjs
		function convertOffsetToTimes(offset, duration) {
			return offset.map((o) => o * duration);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/keyframes.mjs
		function defaultEasing(values, easing) {
			return values.map(() => easing || easeInOut).splice(0, values.length - 1);
		}
		function keyframes({ duration = 300, keyframes: keyframeValues, times, ease = "easeInOut" }) {
			/**
			* Easing functions can be externally defined as strings. Here we convert them
			* into actual functions.
			*/
			const easingFunctions = /* @__PURE__ */ isEasingArray(ease) ? ease.map(easingDefinitionToFunction) : easingDefinitionToFunction(ease);
			/**
			* This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
			* to reduce GC during animation.
			*/
			const state = {
				done: false,
				value: keyframeValues[0]
			};
			const mapTimeToKeyframe = interpolate(convertOffsetToTimes(times && times.length === keyframeValues.length ? times : defaultOffset(keyframeValues), duration), keyframeValues, { ease: Array.isArray(easingFunctions) ? easingFunctions : defaultEasing(keyframeValues, easingFunctions) });
			return {
				calculatedDuration: duration,
				next: (t) => {
					state.value = mapTimeToKeyframe(t);
					state.done = t >= duration;
					return state;
				}
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/get-final.mjs
		const isNotNull = (value) => value !== null;
		function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe, speed = 1) {
			const resolvedKeyframes = keyframes.filter(isNotNull);
			const index = speed < 0 || repeat && repeatType !== "loop" && repeat % 2 === 1 ? 0 : resolvedKeyframes.length - 1;
			return !index || finalKeyframe === void 0 ? resolvedKeyframes[index] : finalKeyframe;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/replace-transition-type.mjs
		const transitionTypeMap = {
			decay: inertia,
			inertia,
			tween: keyframes,
			keyframes,
			spring
		};
		function replaceTransitionType(transition) {
			if (typeof transition.type === "string") transition.type = transitionTypeMap[transition.type];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/WithPromise.mjs
		var WithPromise = class {
			constructor() {
				this.updateFinished();
			}
			get finished() {
				return this._finished;
			}
			updateFinished() {
				this._finished = new Promise((resolve) => {
					this.resolve = resolve;
				});
			}
			notifyFinished() {
				this.resolve();
			}
			/**
			* Allows the animation to be awaited.
			*
			* @deprecated Use `finished` instead.
			*/
			then(onResolve, onReject) {
				return this.finished.then(onResolve, onReject);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/JSAnimation.mjs
		const percentToProgress = (percent) => percent / 100;
		var JSAnimation = class extends WithPromise {
			constructor(options) {
				super();
				this.state = "idle";
				this.startTime = null;
				this.isStopped = false;
				/**
				* The current time of the animation.
				*/
				this.currentTime = 0;
				/**
				* The time at which the animation was paused.
				*/
				this.holdTime = null;
				/**
				* Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
				*/
				this.playbackSpeed = 1;
				/**
				* Reusable state object for the delay phase to avoid
				* allocating a new object every frame.
				*/
				this.delayState = {
					done: false,
					value: void 0
				};
				/**
				* This method is bound to the instance to fix a pattern where
				* animation.stop is returned as a reference from a useEffect.
				*/
				this.stop = () => {
					const { motionValue } = this.options;
					if (motionValue && motionValue.updatedAt !== time.now()) this.tick(time.now());
					this.isStopped = true;
					if (this.state === "idle") return;
					this.teardown();
					this.options.onStop?.();
				};
				this.options = options;
				this.initAnimation();
				this.play();
				if (options.autoplay === false) this.pause();
			}
			initAnimation() {
				const { options } = this;
				replaceTransitionType(options);
				const { type = keyframes, repeat = 0, repeatDelay = 0, repeatType, velocity = 0 } = options;
				let { keyframes: keyframes$1 } = options;
				const generatorFactory = type || keyframes;
				if (generatorFactory !== keyframes && typeof keyframes$1[0] !== "number") {
					this.mixKeyframes = pipe(percentToProgress, mix(keyframes$1[0], keyframes$1[1]));
					keyframes$1 = [0, 100];
				}
				const generator = generatorFactory({
					...options,
					keyframes: keyframes$1
				});
				/**
				* If we have a mirror repeat type we need to create a second generator that outputs the
				* mirrored (not reversed) animation and later ping pong between the two generators.
				*/
				if (repeatType === "mirror") this.mirroredGenerator = generatorFactory({
					...options,
					keyframes: [...keyframes$1].reverse(),
					velocity: -velocity
				});
				/**
				* If duration is undefined and we have repeat options,
				* we need to calculate a duration from the generator.
				*
				* We set it to the generator itself to cache the duration.
				* Any timeline resolver will need to have already precalculated
				* the duration by this step.
				*/
				if (generator.calculatedDuration === null) generator.calculatedDuration = calcGeneratorDuration(generator);
				const { calculatedDuration } = generator;
				this.calculatedDuration = calculatedDuration;
				this.resolvedDuration = calculatedDuration + repeatDelay;
				this.totalDuration = this.resolvedDuration * (repeat + 1) - repeatDelay;
				this.generator = generator;
			}
			updateTime(timestamp) {
				const animationTime = Math.round(timestamp - this.startTime) * this.playbackSpeed;
				if (this.holdTime !== null) this.currentTime = this.holdTime;
				else this.currentTime = animationTime;
			}
			tick(timestamp, sample = false) {
				const { generator, totalDuration, mixKeyframes, mirroredGenerator, resolvedDuration, calculatedDuration } = this;
				if (this.startTime === null) return generator.next(0);
				const { delay = 0, keyframes, repeat, repeatType, repeatDelay, type, onUpdate, finalKeyframe } = this.options;
				/**
				* requestAnimationFrame timestamps can come through as lower than
				* the startTime as set by performance.now(). Here we prevent this,
				* though in the future it could be possible to make setting startTime
				* a pending operation that gets resolved here.
				*/
				if (this.speed > 0) this.startTime = Math.min(this.startTime, timestamp);
				else if (this.speed < 0) this.startTime = Math.min(timestamp - totalDuration / this.speed, this.startTime);
				if (sample) this.currentTime = timestamp;
				else this.updateTime(timestamp);
				const timeWithoutDelay = this.currentTime - delay * (this.playbackSpeed >= 0 ? 1 : -1);
				const isInDelayPhase = this.playbackSpeed >= 0 ? timeWithoutDelay < 0 : timeWithoutDelay > totalDuration;
				this.currentTime = Math.max(timeWithoutDelay, 0);
				if (this.state === "finished" && this.holdTime === null) this.currentTime = totalDuration;
				let elapsed = this.currentTime;
				let frameGenerator = generator;
				if (repeat) {
					/**
					* Get the current progress (0-1) of the animation. If t is >
					* than duration we'll get values like 2.5 (midway through the
					* third iteration)
					*/
					const progress = Math.min(this.currentTime, totalDuration) / resolvedDuration;
					/**
					* Get the current iteration (0 indexed). For instance the floor of
					* 2.5 is 2.
					*/
					let currentIteration = Math.floor(progress);
					/**
					* Get the current progress of the iteration by taking the remainder
					* so 2.5 is 0.5 through iteration 2
					*/
					let iterationProgress = progress % 1;
					/**
					* If iteration progress is 1 we count that as the end
					* of the previous iteration.
					*/
					if (!iterationProgress && progress >= 1) iterationProgress = 1;
					iterationProgress === 1 && currentIteration--;
					currentIteration = Math.min(currentIteration, repeat + 1);
					if (Boolean(currentIteration % 2)) {
						if (repeatType === "reverse") {
							iterationProgress = 1 - iterationProgress;
							if (repeatDelay) iterationProgress -= repeatDelay / resolvedDuration;
						} else if (repeatType === "mirror") frameGenerator = mirroredGenerator;
					}
					elapsed = clamp(0, 1, iterationProgress) * resolvedDuration;
				}
				/**
				* If we're in negative time, set state as the initial keyframe.
				* This prevents delay: x, duration: 0 animations from finishing
				* instantly.
				*/
				let state;
				if (isInDelayPhase) {
					this.delayState.value = keyframes[0];
					state = this.delayState;
				} else state = frameGenerator.next(elapsed);
				if (mixKeyframes && !isInDelayPhase) state.value = mixKeyframes(state.value);
				let { done } = state;
				if (!isInDelayPhase && calculatedDuration !== null) done = this.playbackSpeed >= 0 ? this.currentTime >= totalDuration : this.currentTime <= 0;
				const isAnimationFinished = this.holdTime === null && (this.state === "finished" || this.state === "running" && done);
				if (isAnimationFinished && type !== inertia) state.value = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
				if (onUpdate) onUpdate(state.value);
				if (isAnimationFinished) this.finish();
				return state;
			}
			/**
			* Allows the returned animation to be awaited or promise-chained. Currently
			* resolves when the animation finishes at all but in a future update could/should
			* reject if its cancels.
			*/
			then(resolve, reject) {
				return this.finished.then(resolve, reject);
			}
			get duration() {
				return /* @__PURE__ */ millisecondsToSeconds(this.calculatedDuration);
			}
			get iterationDuration() {
				const { delay = 0 } = this.options || {};
				return this.duration + /* @__PURE__ */ millisecondsToSeconds(delay);
			}
			get time() {
				return /* @__PURE__ */ millisecondsToSeconds(this.currentTime);
			}
			set time(newTime) {
				newTime = /* @__PURE__ */ secondsToMilliseconds(newTime);
				this.currentTime = newTime;
				if (this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0) this.holdTime = newTime;
				else if (this.driver) this.startTime = this.driver.now() - newTime / this.playbackSpeed;
				if (this.driver) this.driver.start(false);
				else {
					this.startTime = 0;
					this.state = "paused";
					this.holdTime = newTime;
					this.tick(newTime);
				}
			}
			/**
			* Returns the generator's velocity at the current time in units/second.
			* Uses the analytical derivative when available (springs), avoiding
			* the MotionValue's frame-dependent velocity estimation.
			*/
			getGeneratorVelocity() {
				const t = this.currentTime;
				if (t <= 0) return this.options.velocity || 0;
				if (this.generator.velocity) return this.generator.velocity(t);
				const current = this.generator.next(t).value;
				return getGeneratorVelocity((s) => this.generator.next(s).value, t, current);
			}
			get speed() {
				return this.playbackSpeed;
			}
			set speed(newSpeed) {
				const hasChanged = this.playbackSpeed !== newSpeed;
				if (hasChanged && this.driver) this.updateTime(time.now());
				this.playbackSpeed = newSpeed;
				if (hasChanged && this.driver) this.time = /* @__PURE__ */ millisecondsToSeconds(this.currentTime);
			}
			play() {
				if (this.isStopped) return;
				const { driver = frameloopDriver, startTime } = this.options;
				if (!this.driver) this.driver = driver((timestamp) => this.tick(timestamp));
				this.options.onPlay?.();
				const now = this.driver.now();
				if (this.state === "finished") {
					this.updateFinished();
					this.startTime = now;
				} else if (this.holdTime !== null) this.startTime = now - this.holdTime;
				else if (!this.startTime) this.startTime = startTime ?? now;
				if (this.state === "finished" && this.speed < 0) this.startTime += this.calculatedDuration;
				this.holdTime = null;
				/**
				* Set playState to running only after we've used it in
				* the previous logic.
				*/
				this.state = "running";
				this.driver.start();
			}
			pause() {
				this.state = "paused";
				this.updateTime(time.now());
				this.holdTime = this.currentTime;
			}
			complete() {
				if (this.state !== "running") this.play();
				this.state = "finished";
				this.holdTime = null;
			}
			finish() {
				this.notifyFinished();
				this.teardown();
				this.state = "finished";
				this.options.onComplete?.();
			}
			cancel() {
				this.holdTime = null;
				this.startTime = 0;
				this.tick(0);
				this.teardown();
				this.options.onCancel?.();
			}
			teardown() {
				this.state = "idle";
				this.stopDriver();
				this.startTime = this.holdTime = null;
			}
			stopDriver() {
				if (!this.driver) return;
				this.driver.stop();
				this.driver = void 0;
			}
			sample(sampleTime) {
				this.startTime = 0;
				return this.tick(sampleTime, true);
			}
			attachTimeline(timeline) {
				if (this.options.allowFlatten) {
					this.options.type = "keyframes";
					this.options.ease = "linear";
					this.initAnimation();
				}
				this.driver?.stop();
				return timeline.observe(this);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/utils/fill-wildcards.mjs
		function fillWildcards(keyframes) {
			for (let i = 1; i < keyframes.length; i++) keyframes[i] ?? (keyframes[i] = keyframes[i - 1]);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/dom/parse-transform.mjs
		const radToDeg = (rad) => rad * 180 / Math.PI;
		const rotate = (v) => {
			const angle = radToDeg(Math.atan2(v[1], v[0]));
			return rebaseAngle(angle);
		};
		const matrix2dParsers = {
			x: 4,
			y: 5,
			translateX: 4,
			translateY: 5,
			scaleX: 0,
			scaleY: 3,
			scale: (v) => (Math.abs(v[0]) + Math.abs(v[3])) / 2,
			rotate,
			rotateZ: rotate,
			skewX: (v) => radToDeg(Math.atan(v[1])),
			skewY: (v) => radToDeg(Math.atan(v[2])),
			skew: (v) => (Math.abs(v[1]) + Math.abs(v[2])) / 2
		};
		const rebaseAngle = (angle) => {
			angle = angle % 360;
			if (angle < 0) angle += 360;
			return angle;
		};
		const rotateZ = rotate;
		const scaleX = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
		const scaleY = (v) => Math.sqrt(v[4] * v[4] + v[5] * v[5]);
		const matrix3dParsers = {
			x: 12,
			y: 13,
			z: 14,
			translateX: 12,
			translateY: 13,
			translateZ: 14,
			scaleX,
			scaleY,
			scale: (v) => (scaleX(v) + scaleY(v)) / 2,
			rotateX: (v) => rebaseAngle(radToDeg(Math.atan2(v[6], v[5]))),
			rotateY: (v) => rebaseAngle(radToDeg(Math.atan2(-v[2], v[0]))),
			rotateZ,
			rotate: rotateZ,
			skewX: (v) => radToDeg(Math.atan(v[4])),
			skewY: (v) => radToDeg(Math.atan(v[1])),
			skew: (v) => (Math.abs(v[1]) + Math.abs(v[4])) / 2
		};
		function defaultTransformValue(name) {
			return name.includes("scale") ? 1 : 0;
		}
		function parseValueFromTransform(transform, name) {
			if (!transform || transform === "none") return defaultTransformValue(name);
			const matrix3dMatch = transform.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
			let parsers;
			let match;
			if (matrix3dMatch) {
				parsers = matrix3dParsers;
				match = matrix3dMatch;
			} else {
				const matrix2dMatch = transform.match(/^matrix\(([-\d.e\s,]+)\)$/u);
				parsers = matrix2dParsers;
				match = matrix2dMatch;
			}
			if (!match) return defaultTransformValue(name);
			const valueParser = parsers[name];
			const values = match[1].split(",").map(convertTransformToNumber);
			return typeof valueParser === "function" ? valueParser(values) : values[valueParser];
		}
		const readTransformValue = (instance, name) => {
			const { transform = "none" } = getComputedStyle(instance);
			return parseValueFromTransform(transform, name);
		};
		function convertTransformToNumber(value) {
			return parseFloat(value.trim());
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/keys-transform.mjs
		/**
		* Generate a list of every possible transform key.
		*/
		const transformPropOrder = [
			"transformPerspective",
			"x",
			"y",
			"z",
			"translateX",
			"translateY",
			"translateZ",
			"scale",
			"scaleX",
			"scaleY",
			"rotate",
			"rotateX",
			"rotateY",
			"rotateZ",
			"skew",
			"skewX",
			"skewY"
		];
		/**
		* A quick lookup for transform props.
		*
		* `pathRotation` is a transform for routing purposes (skipped from raw
		* style application, wired to the transform composite, flags transform
		* dirty) but is intentionally NOT in `transformPropOrder` — it is
		* composed onto `rotate` at the build sites, not serialized in its own
		* slot, and must stay out of the order-array consumers (parse-transform,
		* unit-conversion, keys-position).
		*/
		const transformProps = /*@__PURE__*/ (() => /* @__PURE__ */ new Set([...transformPropOrder, "pathRotation"]))();
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/utils/unit-conversion.mjs
		const isNumOrPxType = (v) => v === number || v === px;
		const transformKeys = /* @__PURE__ */ new Set([
			"x",
			"y",
			"z"
		]);
		const nonTranslationalTransformKeys = transformPropOrder.filter((key) => !transformKeys.has(key));
		function removeNonTranslationalTransform(visualElement) {
			const removedTransforms = [];
			nonTranslationalTransformKeys.forEach((key) => {
				const value = visualElement.getValue(key);
				if (value !== void 0) {
					removedTransforms.push([key, value.get()]);
					value.set(key.startsWith("scale") ? 1 : 0);
				}
			});
			return removedTransforms;
		}
		const positionalValues = {
			width: ({ x }, { paddingLeft = "0", paddingRight = "0", boxSizing }) => {
				const width = x.max - x.min;
				return boxSizing === "border-box" ? width : width - parseFloat(paddingLeft) - parseFloat(paddingRight);
			},
			height: ({ y }, { paddingTop = "0", paddingBottom = "0", boxSizing }) => {
				const height = y.max - y.min;
				return boxSizing === "border-box" ? height : height - parseFloat(paddingTop) - parseFloat(paddingBottom);
			},
			top: (_bbox, { top }) => parseFloat(top),
			left: (_bbox, { left }) => parseFloat(left),
			bottom: ({ y }, { top }) => parseFloat(top) + (y.max - y.min),
			right: ({ x }, { left }) => parseFloat(left) + (x.max - x.min),
			x: (_bbox, { transform }) => parseValueFromTransform(transform, "x"),
			y: (_bbox, { transform }) => parseValueFromTransform(transform, "y")
		};
		positionalValues.translateX = positionalValues.x;
		positionalValues.translateY = positionalValues.y;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/KeyframesResolver.mjs
		const toResolve = /* @__PURE__ */ new Set();
		let isScheduled = false;
		let anyNeedsMeasurement = false;
		let isForced = false;
		function measureAllKeyframes() {
			if (anyNeedsMeasurement) {
				const resolversToMeasure = Array.from(toResolve).filter((resolver) => resolver.needsMeasurement);
				const elementsToMeasure = new Set(resolversToMeasure.map((resolver) => resolver.element));
				const transformsToRestore = /* @__PURE__ */ new Map();
				/**
				* Write pass
				* If we're measuring elements we want to remove bounding box-changing transforms.
				*/
				elementsToMeasure.forEach((element) => {
					const removedTransforms = removeNonTranslationalTransform(element);
					if (!removedTransforms.length) return;
					transformsToRestore.set(element, removedTransforms);
					element.render();
				});
				resolversToMeasure.forEach((resolver) => resolver.measureInitialState());
				elementsToMeasure.forEach((element) => {
					element.render();
					const restore = transformsToRestore.get(element);
					if (restore) restore.forEach(([key, value]) => {
						element.getValue(key)?.set(value);
					});
				});
				resolversToMeasure.forEach((resolver) => resolver.measureEndState());
				resolversToMeasure.forEach((resolver) => {
					if (resolver.suspendedScrollY !== void 0) window.scrollTo(0, resolver.suspendedScrollY);
				});
			}
			anyNeedsMeasurement = false;
			isScheduled = false;
			toResolve.forEach((resolver) => resolver.complete(isForced));
			toResolve.clear();
		}
		function readAllKeyframes() {
			toResolve.forEach((resolver) => {
				resolver.readKeyframes();
				if (resolver.needsMeasurement) anyNeedsMeasurement = true;
			});
		}
		function flushKeyframeResolvers() {
			isForced = true;
			readAllKeyframes();
			measureAllKeyframes();
			isForced = false;
		}
		var KeyframeResolver = class {
			constructor(unresolvedKeyframes, onComplete, name, motionValue, element, isAsync = false) {
				this.state = "pending";
				/**
				* Track whether this resolver is async. If it is, it'll be added to the
				* resolver queue and flushed in the next frame. Resolvers that aren't going
				* to trigger read/write thrashing don't need to be async.
				*/
				this.isAsync = false;
				/**
				* Track whether this resolver needs to perform a measurement
				* to resolve its keyframes.
				*/
				this.needsMeasurement = false;
				this.unresolvedKeyframes = [...unresolvedKeyframes];
				this.onComplete = onComplete;
				this.name = name;
				this.motionValue = motionValue;
				this.element = element;
				this.isAsync = isAsync;
			}
			scheduleResolve() {
				this.state = "scheduled";
				if (this.isAsync) {
					toResolve.add(this);
					if (!isScheduled) {
						isScheduled = true;
						frame.read(readAllKeyframes);
						frame.resolveKeyframes(measureAllKeyframes);
					}
				} else {
					this.readKeyframes();
					this.complete();
				}
			}
			readKeyframes() {
				const { unresolvedKeyframes, name, element, motionValue } = this;
				if (unresolvedKeyframes[0] === null) {
					const currentValue = motionValue?.get();
					const finalKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
					if (currentValue !== void 0) unresolvedKeyframes[0] = currentValue;
					else if (element && name) {
						const valueAsRead = element.readValue(name, finalKeyframe);
						if (valueAsRead !== void 0 && valueAsRead !== null) unresolvedKeyframes[0] = valueAsRead;
					}
					if (unresolvedKeyframes[0] === void 0) unresolvedKeyframes[0] = finalKeyframe;
					if (motionValue && currentValue === void 0) motionValue.set(unresolvedKeyframes[0]);
				}
				fillWildcards(unresolvedKeyframes);
			}
			setFinalKeyframe() {}
			measureInitialState() {}
			renderEndStyles() {}
			measureEndState() {}
			complete(isForcedComplete = false) {
				this.state = "complete";
				this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, isForcedComplete);
				toResolve.delete(this);
			}
			cancel() {
				if (this.state === "scheduled") {
					toResolve.delete(this);
					this.state = "pending";
				}
			}
			resume() {
				if (this.state === "pending") this.scheduleResolve();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/dom/is-css-var.mjs
		const isCSSVar = (name) => name.startsWith("--");
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/dom/style-set.mjs
		function setStyle(element, name, value) {
			isCSSVar(name) ? element.style.setProperty(name, value) : element.style[name] = value;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/supports/flags.mjs
		/**
		* Add the ability for test suites to manually set support flags
		* to better test more environments.
		*/
		const supportsFlags = {};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/supports/memo.mjs
		function memoSupports(callback, supportsFlag) {
			const memoized = /* @__PURE__ */ memo(callback);
			return () => supportsFlags[supportsFlag] ?? memoized();
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/supports/scroll-timeline.mjs
		const supportsScrollTimeline = /* @__PURE__ */ memoSupports(() => window.ScrollTimeline !== void 0, "scrollTimeline");
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/supports/linear-easing.mjs
		const supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
			try {
				document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
			} catch (e) {
				return false;
			}
			return true;
		}, "linearEasing");
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/easing/cubic-bezier.mjs
		const cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/easing/supported.mjs
		const supportedWaapiEasing = {
			linear: "linear",
			ease: "ease",
			easeIn: "ease-in",
			easeOut: "ease-out",
			easeInOut: "ease-in-out",
			circIn: /*@__PURE__*/ cubicBezierAsString([
				0,
				.65,
				.55,
				1
			]),
			circOut: /*@__PURE__*/ cubicBezierAsString([
				.55,
				0,
				1,
				.45
			]),
			backIn: /*@__PURE__*/ cubicBezierAsString([
				.31,
				.01,
				.66,
				-.59
			]),
			backOut: /*@__PURE__*/ cubicBezierAsString([
				.33,
				1.53,
				.69,
				.99
			])
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/easing/map-easing.mjs
		function mapEasingToNativeEasing(easing, duration) {
			if (!easing) return;
			else if (typeof easing === "function") return supportsLinearEasing() ? generateLinearEasing(easing, duration) : "ease-out";
			else if (/* @__PURE__ */ isBezierDefinition(easing)) return cubicBezierAsString(easing);
			else if (Array.isArray(easing)) return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) || supportedWaapiEasing.easeOut);
			else return supportedWaapiEasing[easing];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/start-waapi-animation.mjs
		function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeOut", times } = {}, pseudoElement = void 0) {
			const keyframeOptions = { [valueName]: keyframes };
			if (times) keyframeOptions.offset = times;
			const easing = mapEasingToNativeEasing(ease, duration);
			/**
			* If this is an easing array, apply to keyframes, not animation as a whole
			*/
			if (Array.isArray(easing)) keyframeOptions.easing = easing;
			const options = {
				delay,
				duration,
				easing: !Array.isArray(easing) ? easing : "linear",
				fill: "both",
				iterations: repeat + 1,
				direction: repeatType === "reverse" ? "alternate" : "normal"
			};
			if (pseudoElement) options.pseudoElement = pseudoElement;
			return element.animate(keyframeOptions, options);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/generators/utils/is-generator.mjs
		function isGenerator(type) {
			return typeof type === "function" && "applyToOptions" in type;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/utils/apply-generator.mjs
		function applyGeneratorOptions({ type, ...options }) {
			if (isGenerator(type) && supportsLinearEasing()) return type.applyToOptions(options);
			else {
				options.duration ?? (options.duration = 300);
				options.ease ?? (options.ease = "easeOut");
			}
			return options;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/NativeAnimation.mjs
		/**
		* NativeAnimation implements AnimationPlaybackControls for the browser's Web Animations API.
		*/
		var NativeAnimation = class extends WithPromise {
			constructor(options) {
				super();
				this.finishedTime = null;
				this.isStopped = false;
				/**
				* Tracks a manually-set start time that takes precedence over WAAPI's
				* dynamic startTime. This is cleared when play() or time setter is called,
				* allowing WAAPI to take over timing.
				*/
				this.manualStartTime = null;
				if (!options) return;
				const { element, name, keyframes, pseudoElement, allowFlatten = false, finalKeyframe, onComplete } = options;
				this.isPseudoElement = Boolean(pseudoElement);
				this.allowFlatten = allowFlatten;
				this.options = options;
				options.type;
				const transition = applyGeneratorOptions(options);
				this.animation = startWaapiAnimation(element, name, keyframes, transition, pseudoElement);
				if (transition.autoplay === false) this.animation.pause();
				this.animation.onfinish = () => {
					this.finishedTime = this.time;
					if (!pseudoElement) {
						const keyframe = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
						if (this.updateMotionValue) this.updateMotionValue(keyframe);
						/**
						* If we can, we want to commit the final style as set by the user,
						* rather than the computed keyframe value supplied by the animation.
						* We always do this, even when a motion value is present, to prevent
						* a visual flash in Firefox where the WAAPI animation's fill is removed
						* during cancel() before the scheduled render can apply the correct value.
						*/
						setStyle(element, name, keyframe);
						this.animation.cancel();
					}
					onComplete?.();
					this.notifyFinished();
				};
			}
			play() {
				if (this.isStopped) return;
				this.manualStartTime = null;
				this.animation.play();
				if (this.state === "finished") this.updateFinished();
			}
			pause() {
				this.animation.pause();
			}
			complete() {
				this.animation.finish?.();
			}
			cancel() {
				try {
					this.animation.cancel();
				} catch (e) {}
			}
			stop() {
				if (this.isStopped) return;
				this.isStopped = true;
				const { state } = this;
				if (state === "idle" || state === "finished") return;
				if (this.updateMotionValue) this.updateMotionValue();
				else this.commitStyles();
				if (!this.isPseudoElement) this.cancel();
			}
			/**
			* WAAPI doesn't natively have any interruption capabilities.
			*
			* In this method, we commit styles back to the DOM before cancelling
			* the animation.
			*
			* This is designed to be overridden by NativeAnimationExtended, which
			* will create a renderless JS animation and sample it twice to calculate
			* its current value, "previous" value, and therefore allow
			* Motion to also correctly calculate velocity for any subsequent animation
			* while deferring the commit until the next animation frame.
			*/
			commitStyles() {
				const element = this.options?.element;
				if (!this.isPseudoElement && element?.isConnected) this.animation.commitStyles?.();
			}
			get duration() {
				const duration = this.animation.effect?.getComputedTiming?.().duration || 0;
				return /* @__PURE__ */ millisecondsToSeconds(Number(duration));
			}
			get iterationDuration() {
				const { delay = 0 } = this.options || {};
				return this.duration + /* @__PURE__ */ millisecondsToSeconds(delay);
			}
			get time() {
				return /* @__PURE__ */ millisecondsToSeconds(Number(this.animation.currentTime) || 0);
			}
			set time(newTime) {
				const wasFinished = this.finishedTime !== null;
				this.manualStartTime = null;
				this.finishedTime = null;
				this.animation.currentTime = /* @__PURE__ */ secondsToMilliseconds(newTime);
				if (wasFinished) this.animation.pause();
			}
			/**
			* The playback speed of the animation.
			* 1 = normal speed, 2 = double speed, 0.5 = half speed.
			*/
			get speed() {
				return this.animation.playbackRate;
			}
			set speed(newSpeed) {
				if (newSpeed < 0) this.finishedTime = null;
				this.animation.playbackRate = newSpeed;
			}
			get state() {
				return this.finishedTime !== null ? "finished" : this.animation.playState;
			}
			get startTime() {
				return this.manualStartTime ?? Number(this.animation.startTime);
			}
			set startTime(newStartTime) {
				this.manualStartTime = this.animation.startTime = newStartTime;
			}
			/**
			* Attaches a timeline to the animation, for instance the `ScrollTimeline`.
			*/
			attachTimeline({ timeline, rangeStart, rangeEnd, observe }) {
				if (this.allowFlatten) this.animation.effect?.updateTiming({ easing: "linear" });
				this.animation.onfinish = null;
				if (timeline && supportsScrollTimeline()) {
					this.animation.timeline = timeline;
					if (rangeStart) this.animation.rangeStart = rangeStart;
					if (rangeEnd) this.animation.rangeEnd = rangeEnd;
					return noop;
				} else return observe(this);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/utils/unsupported-easing.mjs
		const unsupportedEasingFunctions = {
			anticipate,
			backInOut,
			circInOut
		};
		function isUnsupportedEase(key) {
			return key in unsupportedEasingFunctions;
		}
		function replaceStringEasing(transition) {
			if (typeof transition.ease === "string" && isUnsupportedEase(transition.ease)) transition.ease = unsupportedEasingFunctions[transition.ease];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/NativeAnimationExtended.mjs
		/**
		* 10ms is chosen here as it strikes a balance between smooth
		* results (more than one keyframe per frame at 60fps) and
		* keyframe quantity.
		*/
		const sampleDelta = 10;
		var NativeAnimationExtended = class extends NativeAnimation {
			constructor(options) {
				/**
				* The base NativeAnimation function only supports a subset
				* of Motion easings, and WAAPI also only supports some
				* easing functions via string/cubic-bezier definitions.
				*
				* This function replaces those unsupported easing functions
				* with a JS easing function. This will later get compiled
				* to a linear() easing function.
				*/
				replaceStringEasing(options);
				/**
				* Ensure we replace the transition type with a generator function
				* before passing to WAAPI.
				*
				* TODO: Does this have a better home? It could be shared with
				* JSAnimation.
				*/
				replaceTransitionType(options);
				super(options);
				/**
				* Only set startTime when the animation should autoplay.
				* Setting startTime on a paused WAAPI animation unpauses it
				* (per the WAAPI spec), which breaks autoplay: false.
				*/
				if (options.startTime !== void 0 && options.autoplay !== false) this.startTime = options.startTime;
				this.options = options;
			}
			/**
			* WAAPI doesn't natively have any interruption capabilities.
			*
			* Rather than read committed styles back out of the DOM, we can
			* create a renderless JS animation and sample it twice to calculate
			* its current value, "previous" value, and therefore allow
			* Motion to calculate velocity for any subsequent animation.
			*/
			updateMotionValue(value) {
				const { motionValue, onUpdate, onComplete, element, ...options } = this.options;
				if (!motionValue) return;
				if (value !== void 0) {
					motionValue.set(value);
					return;
				}
				const sampleAnimation = new JSAnimation({
					...options,
					autoplay: false
				});
				/**
				* Use wall-clock elapsed time for sampling.
				* Under CPU load, WAAPI's currentTime may not reflect actual
				* elapsed time, causing incorrect sampling and visual jumps.
				*/
				const sampleTime = Math.max(sampleDelta, time.now() - this.startTime);
				const delta = clamp(0, sampleDelta, sampleTime - sampleDelta);
				const current = sampleAnimation.sample(sampleTime).value;
				/**
				* Write the estimated value to inline style so it persists
				* after cancel(), covering the async gap before the next
				* animation starts.
				*/
				const { name } = this.options;
				if (element && name) setStyle(element, name, current);
				motionValue.setWithVelocity(sampleAnimation.sample(Math.max(0, sampleTime - delta)).value, current, delta);
				sampleAnimation.stop();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/is-animatable.mjs
		/**
		* Check if a value is animatable. Examples:
		*
		* ✅: 100, "100px", "#fff"
		* ❌: "block", "url(2.jpg)"
		* @param value
		*
		* @internal
		*/
		const isAnimatable = (value, name) => {
			if (name === "zIndex") return false;
			if (typeof value === "number" || Array.isArray(value)) return true;
			if (typeof value === "string" && (complex.test(value) || value === "0") && !value.startsWith("url(")) return true;
			return false;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/can-animate.mjs
		function hasKeyframesChanged(keyframes) {
			const current = keyframes[0];
			if (keyframes.length === 1) return true;
			for (let i = 0; i < keyframes.length; i++) if (keyframes[i] !== current) return true;
		}
		function canAnimate(keyframes, name, type, velocity) {
			/**
			* Check if we're able to animate between the start and end keyframes,
			* and throw a warning if we're attempting to animate between one that's
			* animatable and another that isn't.
			*/
			const originKeyframe = keyframes[0];
			if (originKeyframe === null) return false;
			/**
			* These aren't traditionally animatable but we do support them.
			* In future we could look into making this more generic or replacing
			* this function with mix() === mixImmediate
			*/
			if (name === "display" || name === "visibility") return true;
			const targetKeyframe = keyframes[keyframes.length - 1];
			const isOriginAnimatable = isAnimatable(originKeyframe, name);
			const isTargetAnimatable = isAnimatable(targetKeyframe, name);
			`${name}${originKeyframe}${targetKeyframe}${isOriginAnimatable ? targetKeyframe : originKeyframe}`;
			if (!isOriginAnimatable || !isTargetAnimatable) return false;
			return hasKeyframesChanged(keyframes) || (type === "spring" || isGenerator(type)) && velocity;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/make-animation-instant.mjs
		function makeAnimationInstant(options) {
			options.duration = 0;
			options.type = "keyframes";
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/utils/accelerated-values.mjs
		/**
		* A list of values that can be hardware-accelerated.
		*/
		const acceleratedValues = /* @__PURE__ */ new Set([
			"opacity",
			"clipPath",
			"filter",
			"transform",
			"backgroundColor"
		]);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/utils/is-browser-color.mjs
		const browserColorFunctions = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
		function hasBrowserOnlyColors(keyframes) {
			for (let i = 0; i < keyframes.length; i++) if (typeof keyframes[i] === "string" && browserColorFunctions.test(keyframes[i])) return true;
			return false;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/waapi/supports/waapi.mjs
		const colorProperties = /* @__PURE__ */ new Set([
			"color",
			"backgroundColor",
			"outlineColor",
			"fill",
			"stroke",
			"borderColor",
			"borderTopColor",
			"borderRightColor",
			"borderBottomColor",
			"borderLeftColor"
		]);
		const supportsWaapi = /*@__PURE__*/ memo(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
		function supportsBrowserAnimation(options) {
			const { motionValue, name, repeatDelay, repeatType, damping, type, keyframes } = options;
			const subject = motionValue?.owner?.current;
			/**
			* We use instanceof checks instead of isHTMLElement()/isSVGElement()
			* because we explicitly **don't** want elements in different timing
			* contexts (i.e. popups) to be accelerated, as it's not possible to sync
			* these animations properly with those driven from the main window
			* frameloop.
			*/
			if (!(subject instanceof HTMLElement) && !(subject instanceof SVGElement)) return false;
			const { onUpdate, transformTemplate } = motionValue.owner.getProps();
			return supportsWaapi() && name && (acceleratedValues.has(name) || colorProperties.has(name) && hasBrowserOnlyColors(keyframes)) && (name !== "transform" || !transformTemplate) && !onUpdate && !repeatDelay && repeatType !== "mirror" && damping !== 0 && type !== "inertia";
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/AsyncMotionValueAnimation.mjs
		/**
		* Maximum time allowed between an animation being created and it being
		* resolved for us to use the latter as the start time.
		*
		* This is to ensure that while we prefer to "start" an animation as soon
		* as it's triggered, we also want to avoid a visual jump if there's a big delay
		* between these two moments.
		*/
		const MAX_RESOLVE_DELAY = 40;
		var AsyncMotionValueAnimation = class extends WithPromise {
			constructor({ autoplay = true, delay = 0, type = "keyframes", repeat = 0, repeatDelay = 0, repeatType = "loop", keyframes, name, motionValue, element, ...options }) {
				super();
				/**
				* Bound to support return animation.stop pattern
				*/
				this.stop = () => {
					if (this._animation) {
						this._animation.stop();
						this.stopTimeline?.();
					}
					this.keyframeResolver?.cancel();
				};
				this.createdAt = time.now();
				const optionsWithDefaults = {
					autoplay,
					delay,
					type,
					repeat,
					repeatDelay,
					repeatType,
					name,
					motionValue,
					element,
					...options
				};
				const KeyframeResolver$1 = element?.KeyframeResolver || KeyframeResolver;
				this.keyframeResolver = new KeyframeResolver$1(keyframes, (resolvedKeyframes, finalKeyframe, forced) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe, optionsWithDefaults, !forced), name, motionValue, element);
				this.keyframeResolver?.scheduleResolve();
			}
			onKeyframesResolved(keyframes, finalKeyframe, options, sync) {
				this.keyframeResolver = void 0;
				const { name, type, velocity, delay, isHandoff, onUpdate } = options;
				this.resolvedAt = time.now();
				/**
				* If we can't animate this value with the resolved keyframes
				* then we should complete it immediately.
				*/
				let canAnimateValue = true;
				if (!canAnimate(keyframes, name, type, velocity)) {
					canAnimateValue = false;
					if (MotionGlobalConfig.instantAnimations || !delay) onUpdate?.(getFinalKeyframe(keyframes, options, finalKeyframe));
					keyframes[0] = keyframes[keyframes.length - 1];
					makeAnimationInstant(options);
					options.repeat = 0;
				}
				const resolvedOptions = {
					startTime: sync ? !this.resolvedAt ? this.createdAt : this.resolvedAt - this.createdAt > MAX_RESOLVE_DELAY ? this.resolvedAt : this.createdAt : void 0,
					finalKeyframe,
					...options,
					keyframes
				};
				/**
				* Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
				* WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
				* optimised animation.
				*
				* Also skip WAAPI when keyframes aren't animatable, as the resolved
				* values may not be valid CSS and would trigger browser warnings.
				*/
				const useWaapi = canAnimateValue && !isHandoff && supportsBrowserAnimation(resolvedOptions);
				const element = resolvedOptions.motionValue?.owner?.current;
				let animation;
				if (useWaapi) try {
					animation = new NativeAnimationExtended({
						...resolvedOptions,
						element
					});
				} catch {
					animation = new JSAnimation(resolvedOptions);
				}
				else animation = new JSAnimation(resolvedOptions);
				animation.finished.then(() => {
					this.notifyFinished();
				}).catch(noop);
				if (this.pendingTimeline) {
					this.stopTimeline = animation.attachTimeline(this.pendingTimeline);
					this.pendingTimeline = void 0;
				}
				this._animation = animation;
			}
			get finished() {
				if (!this._animation) return this._finished;
				else return this.animation.finished;
			}
			then(onResolve, _onReject) {
				return this.finished.finally(onResolve).then(() => {});
			}
			get animation() {
				if (!this._animation) {
					this.keyframeResolver?.resume();
					flushKeyframeResolvers();
				}
				return this._animation;
			}
			get duration() {
				return this.animation.duration;
			}
			get iterationDuration() {
				return this.animation.iterationDuration;
			}
			get time() {
				return this.animation.time;
			}
			set time(newTime) {
				this.animation.time = newTime;
			}
			get speed() {
				return this.animation.speed;
			}
			get state() {
				return this.animation.state;
			}
			set speed(newSpeed) {
				this.animation.speed = newSpeed;
			}
			get startTime() {
				return this.animation.startTime;
			}
			attachTimeline(timeline) {
				if (this._animation) this.stopTimeline = this.animation.attachTimeline(timeline);
				else this.pendingTimeline = timeline;
				return () => this.stop();
			}
			play() {
				this.animation.play();
			}
			pause() {
				this.animation.pause();
			}
			complete() {
				this.animation.complete();
			}
			cancel() {
				if (this._animation) this.animation.cancel();
				this.keyframeResolver?.cancel();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/calc-child-stagger.mjs
		function calcChildStagger(children, child, delayChildren, staggerChildren = 0, staggerDirection = 1) {
			const index = Array.from(children).sort((a, b) => a.sortNodePosition(b)).indexOf(child);
			const numChildren = children.size;
			const maxStaggerDuration = (numChildren - 1) * staggerChildren;
			return typeof delayChildren === "function" ? delayChildren(index, numChildren) : staggerDirection === 1 ? index * staggerChildren : maxStaggerDuration - index * staggerChildren;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/index.mjs
		/**
		* Maximum time between the value of two frames, beyond which we
		* assume the velocity has since been 0.
		*/
		const MAX_VELOCITY_DELTA = 30;
		const isFloat = (value) => {
			return !isNaN(parseFloat(value));
		};
		const collectMotionValues = { current: void 0 };
		/**
		* `MotionValue` is used to track the state and velocity of motion values.
		*
		* @public
		*/
		var MotionValue = class {
			/**
			* @param init - The initiating value
			* @param config - Optional configuration options
			*
			* -  `transformer`: A function to transform incoming values with.
			*/
			constructor(init, options = {}) {
				/**
				* Tracks whether this value can output a velocity. Currently this is only true
				* if the value is numerical, but we might be able to widen the scope here and support
				* other value types.
				*
				* @internal
				*/
				this.canTrackVelocity = null;
				/**
				* An object containing a SubscriptionManager for each active event.
				*/
				this.events = {};
				this.updateAndNotify = (v) => {
					const currentTime = time.now();
					/**
					* If we're updating the value during another frame or eventloop
					* than the previous frame, then the we set the previous frame value
					* to current.
					*/
					if (this.updatedAt !== currentTime) this.setPrevFrameValue();
					this.prev = this.current;
					this.setCurrent(v);
					if (this.current !== this.prev) {
						this.events.change?.notify(this.current);
						if (this.dependents) for (const dependent of this.dependents) dependent.dirty();
					}
				};
				this.hasAnimated = false;
				this.setCurrent(init);
				this.owner = options.owner;
			}
			setCurrent(current) {
				this.current = current;
				this.updatedAt = time.now();
				if (this.canTrackVelocity === null && current !== void 0) this.canTrackVelocity = isFloat(this.current);
			}
			setPrevFrameValue(prevFrameValue = this.current) {
				this.prevFrameValue = prevFrameValue;
				this.prevUpdatedAt = this.updatedAt;
			}
			/**
			* Adds a function that will be notified when the `MotionValue` is updated.
			*
			* It returns a function that, when called, will cancel the subscription.
			*
			* When calling `onChange` inside a React component, it should be wrapped with the
			* `useEffect` hook. As it returns an unsubscribe function, this should be returned
			* from the `useEffect` function to ensure you don't add duplicate subscribers..
			*
			* ```jsx
			* export const MyComponent = () => {
			*   const x = useMotionValue(0)
			*   const y = useMotionValue(0)
			*   const opacity = useMotionValue(1)
			*
			*   useEffect(() => {
			*     function updateOpacity() {
			*       const maxXY = Math.max(x.get(), y.get())
			*       const newOpacity = transform(maxXY, [0, 100], [1, 0])
			*       opacity.set(newOpacity)
			*     }
			*
			*     const unsubscribeX = x.on("change", updateOpacity)
			*     const unsubscribeY = y.on("change", updateOpacity)
			*
			*     return () => {
			*       unsubscribeX()
			*       unsubscribeY()
			*     }
			*   }, [])
			*
			*   return <motion.div style={{ x }} />
			* }
			* ```
			*
			* @param subscriber - A function that receives the latest value.
			* @returns A function that, when called, will cancel this subscription.
			*
			* @deprecated
			*/
			onChange(subscription) {
				return this.on("change", subscription);
			}
			on(eventName, callback) {
				if (!this.events[eventName]) this.events[eventName] = new SubscriptionManager();
				const unsubscribe = this.events[eventName].add(callback);
				if (eventName === "change") return () => {
					unsubscribe();
					/**
					* If we have no more change listeners by the start
					* of the next frame, stop active animations.
					*/
					frame.read(() => {
						if (!this.events.change.getSize()) this.stop();
					});
				};
				return unsubscribe;
			}
			clearListeners() {
				for (const eventManagers in this.events) this.events[eventManagers].clear();
			}
			/**
			* Attaches a passive effect to the `MotionValue`.
			*/
			attach(passiveEffect, stopPassiveEffect) {
				this.passiveEffect = passiveEffect;
				this.stopPassiveEffect = stopPassiveEffect;
			}
			/**
			* Sets the state of the `MotionValue`.
			*
			* @remarks
			*
			* ```jsx
			* const x = useMotionValue(0)
			* x.set(10)
			* ```
			*
			* @param latest - Latest value to set.
			* @param render - Whether to notify render subscribers. Defaults to `true`
			*
			* @public
			*/
			set(v) {
				if (!this.passiveEffect) this.updateAndNotify(v);
				else this.passiveEffect(v, this.updateAndNotify);
			}
			setWithVelocity(prev, current, delta) {
				this.set(current);
				this.prev = void 0;
				this.prevFrameValue = prev;
				this.prevUpdatedAt = this.updatedAt - delta;
			}
			/**
			* Set the state of the `MotionValue`, stopping any active animations,
			* effects, and resets velocity to `0`.
			*/
			jump(v, endAnimation = true) {
				this.updateAndNotify(v);
				this.prev = v;
				this.prevUpdatedAt = this.prevFrameValue = void 0;
				endAnimation && this.stop();
				if (this.stopPassiveEffect) this.stopPassiveEffect();
			}
			dirty() {
				this.events.change?.notify(this.current);
			}
			addDependent(dependent) {
				if (!this.dependents) this.dependents = /* @__PURE__ */ new Set();
				this.dependents.add(dependent);
			}
			removeDependent(dependent) {
				if (this.dependents) this.dependents.delete(dependent);
			}
			/**
			* Returns the latest state of `MotionValue`
			*
			* @returns - The latest state of `MotionValue`
			*
			* @public
			*/
			get() {
				if (collectMotionValues.current) collectMotionValues.current.push(this);
				return this.current;
			}
			/**
			* @public
			*/
			getPrevious() {
				return this.prev;
			}
			/**
			* Returns the latest velocity of `MotionValue`
			*
			* @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
			*
			* @public
			*/
			getVelocity() {
				const currentTime = time.now();
				if (!this.canTrackVelocity || this.prevFrameValue === void 0 || currentTime - this.updatedAt > MAX_VELOCITY_DELTA) return 0;
				const delta = Math.min(this.updatedAt - this.prevUpdatedAt, MAX_VELOCITY_DELTA);
				return /* @__PURE__ */ velocityPerSecond(parseFloat(this.current) - parseFloat(this.prevFrameValue), delta);
			}
			/**
			* Registers a new animation to control this `MotionValue`. Only one
			* animation can drive a `MotionValue` at one time.
			*
			* ```jsx
			* value.start()
			* ```
			*
			* @param animation - A function that starts the provided animation
			*/
			start(startAnimation) {
				this.stop();
				return new Promise((resolve) => {
					this.hasAnimated = true;
					this.animation = startAnimation(resolve);
					if (this.events.animationStart) this.events.animationStart.notify();
				}).then(() => {
					if (this.events.animationComplete) this.events.animationComplete.notify();
					this.clearAnimation();
				});
			}
			/**
			* Stop the currently active animation.
			*
			* @public
			*/
			stop() {
				if (this.animation) {
					this.animation.stop();
					if (this.events.animationCancel) this.events.animationCancel.notify();
				}
				this.clearAnimation();
			}
			/**
			* Returns `true` if this value is currently animating.
			*
			* @public
			*/
			isAnimating() {
				return !!this.animation;
			}
			clearAnimation() {
				delete this.animation;
			}
			/**
			* Destroy and clean up subscribers to this `MotionValue`.
			*
			* The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
			* handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
			* created a `MotionValue` via the `motionValue` function.
			*
			* @public
			*/
			destroy() {
				this.dependents?.clear();
				this.events.destroy?.notify();
				this.clearListeners();
				this.stop();
				if (this.stopPassiveEffect) this.stopPassiveEffect();
			}
		};
		function motionValue(init, options) {
			return new MotionValue(init, options);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/resolve-transition.mjs
		/**
		* If `transition` has `inherit: true`, shallow-merge it with
		* `parentTransition` (child keys win) and strip the `inherit` key.
		* Otherwise return `transition` unchanged.
		*/
		function resolveTransition(transition, parentTransition) {
			if (transition?.inherit && parentTransition) {
				const { inherit: _, ...rest } = transition;
				return {
					...parentTransition,
					...rest
				};
			}
			return transition;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/get-value-transition.mjs
		function getValueTransition(transition, key) {
			const valueTransition = transition?.[key] ?? transition?.["default"] ?? transition;
			if (valueTransition !== transition) return resolveTransition(valueTransition, transition);
			return valueTransition;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/default-transitions.mjs
		const underDampedSpring = {
			type: "spring",
			stiffness: 500,
			damping: 25,
			restSpeed: 10
		};
		const criticallyDampedSpring = (target) => ({
			type: "spring",
			stiffness: 550,
			damping: target === 0 ? 2 * Math.sqrt(550) : 30,
			restSpeed: 10
		});
		const keyframesTransition = {
			type: "keyframes",
			duration: .8
		};
		/**
		* Default easing curve is a slightly shallower version of
		* the default browser easing curve.
		*/
		const ease = {
			type: "keyframes",
			ease: [
				.25,
				.1,
				.35,
				1
			],
			duration: .3
		};
		const getDefaultTransition = (valueKey, { keyframes }) => {
			if (keyframes.length > 2) return keyframesTransition;
			else if (transformProps.has(valueKey)) return valueKey.startsWith("scale") ? criticallyDampedSpring(keyframes[1]) : underDampedSpring;
			return ease;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/is-transition-defined.mjs
		const orchestrationKeys = /* @__PURE__ */ new Set([
			"when",
			"delay",
			"delayChildren",
			"staggerChildren",
			"staggerDirection",
			"repeat",
			"repeatType",
			"repeatDelay",
			"from",
			"elapsed"
		]);
		/**
		* Decide whether a transition is defined on a given Transition.
		* This filters out orchestration options and returns true
		* if any options are left.
		*/
		function isTransitionDefined(transition) {
			for (const key in transition) if (!orchestrationKeys.has(key)) return true;
			return false;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/interfaces/motion-value.mjs
		const animateMotionValue = (name, value, target, transition = {}, element, isHandoff) => (onComplete) => {
			const valueTransition = getValueTransition(transition, name) || {};
			/**
			* Most transition values are currently completely overwritten by value-specific
			* transitions. In the future it'd be nicer to blend these transitions. But for now
			* delay actually does inherit from the root transition if not value-specific.
			*/
			const delay = valueTransition.delay || transition.delay || 0;
			/**
			* Elapsed isn't a public transition option but can be passed through from
			* optimized appear effects in milliseconds.
			*/
			let { elapsed = 0 } = transition;
			elapsed = elapsed - /* @__PURE__ */ secondsToMilliseconds(delay);
			const options = {
				keyframes: Array.isArray(target) ? target : [null, target],
				ease: "easeOut",
				velocity: value.getVelocity(),
				...valueTransition,
				delay: -elapsed,
				onUpdate: (v) => {
					value.set(v);
					valueTransition.onUpdate && valueTransition.onUpdate(v);
				},
				onComplete: () => {
					onComplete();
					valueTransition.onComplete && valueTransition.onComplete();
				},
				name,
				motionValue: value,
				element: isHandoff ? void 0 : element
			};
			/**
			* If there's no transition defined for this value, we can generate
			* unique transition settings for this value.
			*/
			if (!isTransitionDefined(valueTransition)) Object.assign(options, getDefaultTransition(name, options));
			/**
			* Both WAAPI and our internal animation functions use durations
			* as defined by milliseconds, while our external API defines them
			* as seconds.
			*/
			options.duration && (options.duration = /* @__PURE__ */ secondsToMilliseconds(options.duration));
			options.repeatDelay && (options.repeatDelay = /* @__PURE__ */ secondsToMilliseconds(options.repeatDelay));
			/**
			* Support deprecated way to set initial value. Prefer keyframe syntax.
			*/
			if (options.from !== void 0) options.keyframes[0] = options.from;
			let shouldSkip = false;
			if (options.type === false || options.duration === 0 && !options.repeatDelay) {
				makeAnimationInstant(options);
				if (options.delay === 0) shouldSkip = true;
			}
			if (MotionGlobalConfig.instantAnimations || MotionGlobalConfig.skipAnimations || element?.shouldSkipAnimations || valueTransition.skipAnimations) {
				shouldSkip = true;
				makeAnimationInstant(options);
				options.delay = 0;
			}
			/**
			* If the transition type or easing has been explicitly set by the user
			* then we don't want to allow flattening the animation.
			*/
			options.allowFlatten = !valueTransition.type && !valueTransition.ease;
			/**
			* If we can or must skip creating the animation, and apply only
			* the final keyframe, do so. We also check once keyframes are resolved but
			* this early check prevents the need to create an animation at all.
			*/
			if (shouldSkip && !isHandoff && value.get() !== void 0) {
				const finalKeyframe = getFinalKeyframe(options.keyframes, valueTransition);
				if (finalKeyframe !== void 0) {
					frame.update(() => {
						options.onUpdate(finalKeyframe);
						options.onComplete();
					});
					return;
				}
			}
			return valueTransition.isSync ? new JSAnimation(options) : new AsyncMotionValueAnimation(options);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/utils/css-variables-conversion.mjs
		/**
		* Parse Framer's special CSS variable format into a CSS token and a fallback.
		*
		* ```
		* `var(--foo, #fff)` => [`--foo`, '#fff']
		* ```
		*
		* @param current
		*/
		const splitCSSVariableRegex = /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;
		function parseCSSVariable(current) {
			const match = splitCSSVariableRegex.exec(current);
			if (!match) return [,];
			const [, token1, token2, fallback] = match;
			return [`--${token1 ?? token2}`, fallback];
		}
		function getVariableValue(current, element, depth = 1) {
			`${current}`;
			const [token, fallback] = parseCSSVariable(current);
			if (!token) return;
			const resolved = window.getComputedStyle(element).getPropertyValue(token);
			if (resolved) {
				const trimmed = resolved.trim();
				return isNumericalString(trimmed) ? parseFloat(trimmed) : trimmed;
			}
			return isCSSVariableToken(fallback) ? getVariableValue(fallback, element, depth + 1) : fallback;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/resolve-variants.mjs
		function getValueState(visualElement) {
			const state = [{}, {}];
			visualElement?.values.forEach((value, key) => {
				state[0][key] = value.get();
				state[1][key] = value.getVelocity();
			});
			return state;
		}
		function resolveVariantFromProps(props, definition, custom, visualElement) {
			/**
			* If the variant definition is a function, resolve.
			*/
			if (typeof definition === "function") {
				const [current, velocity] = getValueState(visualElement);
				definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
			}
			/**
			* If the variant definition is a variant label, or
			* the function returned a variant label, resolve.
			*/
			if (typeof definition === "string") definition = props.variants && props.variants[definition];
			/**
			* At this point we've resolved both functions and variant labels,
			* but the resolved variant label might itself have been a function.
			* If so, resolve. This can only have returned a valid target object.
			*/
			if (typeof definition === "function") {
				const [current, velocity] = getValueState(visualElement);
				definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
			}
			return definition;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/resolve-dynamic-variants.mjs
		function resolveVariant(visualElement, definition, custom) {
			const props = visualElement.getProps();
			return resolveVariantFromProps(props, definition, custom !== void 0 ? custom : props.custom, visualElement);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/keys-position.mjs
		const positionalKeys = /* @__PURE__ */ new Set([
			"width",
			"height",
			"top",
			"left",
			"right",
			"bottom",
			...transformPropOrder
		]);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/is-keyframes-target.mjs
		const isKeyframesTarget = (v) => {
			return Array.isArray(v);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/setters.mjs
		/**
		* Set VisualElement's MotionValue, creating a new MotionValue for it if
		* it doesn't exist.
		*/
		function setMotionValue(visualElement, key, value) {
			if (visualElement.hasValue(key)) visualElement.getValue(key).set(value);
			else visualElement.addValue(key, motionValue(value));
		}
		function resolveFinalValueInKeyframes(v) {
			return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
		}
		function setTarget(visualElement, definition) {
			let { transitionEnd = {}, transition = {}, ...target } = resolveVariant(visualElement, definition) || {};
			target = {
				...target,
				...transitionEnd
			};
			for (const key in target) setMotionValue(visualElement, key, resolveFinalValueInKeyframes(target[key]));
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/utils/is-motion-value.mjs
		const isMotionValue = (value) => Boolean(value && value.getVelocity);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/will-change/is.mjs
		function isWillChangeMotionValue(value) {
			return Boolean(isMotionValue(value) && value.add);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/will-change/add-will-change.mjs
		function addValueToWillChange(visualElement, key) {
			const willChange = visualElement.getValue("willChange");
			/**
			* It could be that a user has set willChange to a regular MotionValue,
			* in which case we can't add the value to it.
			*/
			if (isWillChangeMotionValue(willChange)) return willChange.add(key);
			else if (!willChange && MotionGlobalConfig.WillChange) {
				const newWillChange = new MotionGlobalConfig.WillChange("auto");
				visualElement.addValue("willChange", newWillChange);
				newWillChange.add(key);
			}
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/dom/utils/camel-to-dash.mjs
		function camelToDash(str) {
			return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
		}
		const optimizedAppearDataAttribute = "data-" + camelToDash("framerAppearId");
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/optimized-appear/get-appear-id.mjs
		function getOptimisedAppearId(visualElement) {
			return visualElement.props[optimizedAppearDataAttribute];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/interfaces/visual-element-target.mjs
		/**
		* Decide whether we should block this animation. Previously, we achieved this
		* just by checking whether the key was listed in protectedKeys, but this
		* posed problems if an animation was triggered by afterChildren and protectedKeys
		* had been set to true in the meantime.
		*/
		function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
			const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
			needsAnimating[key] = false;
			return shouldBlock;
		}
		function animateTarget(visualElement, targetAndTransition, { delay = 0, transitionOverride, type } = {}) {
			let { transition, transitionEnd, ...target } = targetAndTransition;
			const defaultTransition = visualElement.getDefaultTransition();
			transition = transition ? resolveTransition(transition, defaultTransition) : defaultTransition;
			const reduceMotion = transition?.reduceMotion;
			const skipAnimations = transition?.skipAnimations;
			if (transitionOverride) transition = transitionOverride;
			const animations = [];
			const animationTypeState = type && visualElement.animationState && visualElement.animationState.getState()[type];
			const path = transition?.path;
			if (path) path.animateVisualElement(visualElement, target, transition, delay, animations);
			for (const key in target) {
				const value = visualElement.getValue(key, visualElement.latestValues[key] ?? null);
				const valueTarget = target[key];
				if (valueTarget === void 0 || animationTypeState && shouldBlockAnimation(animationTypeState, key)) continue;
				const valueTransition = {
					delay,
					...getValueTransition(transition || {}, key)
				};
				if (skipAnimations) valueTransition.skipAnimations = true;
				/**
				* If the value is already at the defined target, skip the animation.
				* We still re-assert the value via frame.update to take precedence
				* over any stale transitionEnd callbacks from previous animations.
				*/
				const currentValue = value.get();
				if (currentValue !== void 0 && !value.isAnimating() && !Array.isArray(valueTarget) && valueTarget === currentValue && !valueTransition.velocity) {
					frame.update(() => value.set(valueTarget));
					continue;
				}
				/**
				* If this is the first time a value is being animated, check
				* to see if we're handling off from an existing animation.
				*/
				let isHandoff = false;
				if (window.MotionHandoffAnimation) {
					const appearId = getOptimisedAppearId(visualElement);
					if (appearId) {
						const startTime = window.MotionHandoffAnimation(appearId, key, frame);
						if (startTime !== null) {
							valueTransition.startTime = startTime;
							isHandoff = true;
						}
					}
				}
				addValueToWillChange(visualElement, key);
				const shouldReduceMotion = reduceMotion ?? visualElement.shouldReduceMotion;
				value.start(animateMotionValue(key, value, valueTarget, shouldReduceMotion && positionalKeys.has(key) ? { type: false } : valueTransition, visualElement, isHandoff));
				const animation = value.animation;
				if (animation) animations.push(animation);
			}
			if (transitionEnd) {
				const applyTransitionEnd = () => frame.update(() => {
					transitionEnd && setTarget(visualElement, transitionEnd);
				});
				if (animations.length) Promise.all(animations).then(applyTransitionEnd);
				else applyTransitionEnd();
			}
			return animations;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/interfaces/visual-element-variant.mjs
		function animateVariant(visualElement, variant, options = {}) {
			const resolved = resolveVariant(visualElement, variant, options.type === "exit" ? visualElement.presenceContext?.custom : void 0);
			let { transition = visualElement.getDefaultTransition() || {} } = resolved || {};
			if (options.transitionOverride) transition = options.transitionOverride;
			/**
			* If we have a variant, create a callback that runs it as an animation.
			* Otherwise, we resolve a Promise immediately for a composable no-op.
			*/
			const getAnimation = resolved ? () => Promise.all(animateTarget(visualElement, resolved, options)) : () => Promise.resolve();
			/**
			* If we have children, create a callback that runs all their animations.
			* Otherwise, we resolve a Promise immediately for a composable no-op.
			*/
			const getChildAnimations = visualElement.variantChildren && visualElement.variantChildren.size ? (forwardDelay = 0) => {
				const { delayChildren = 0, staggerChildren, staggerDirection } = transition;
				return animateChildren(visualElement, variant, forwardDelay, delayChildren, staggerChildren, staggerDirection, options);
			} : () => Promise.resolve();
			/**
			* If the transition explicitly defines a "when" option, we need to resolve either
			* this animation or all children animations before playing the other.
			*/
			const { when } = transition;
			if (when) {
				const [first, last] = when === "beforeChildren" ? [getAnimation, getChildAnimations] : [getChildAnimations, getAnimation];
				return first().then(() => last());
			} else return Promise.all([getAnimation(), getChildAnimations(options.delay)]);
		}
		function animateChildren(visualElement, variant, delay = 0, delayChildren = 0, staggerChildren = 0, staggerDirection = 1, options) {
			const animations = [];
			for (const child of visualElement.variantChildren) {
				child.notify("AnimationStart", variant);
				animations.push(animateVariant(child, variant, {
					...options,
					delay: delay + (typeof delayChildren === "function" ? 0 : delayChildren) + calcChildStagger(visualElement.variantChildren, child, delayChildren, staggerChildren, staggerDirection)
				}).then(() => child.notify("AnimationComplete", variant)));
			}
			return Promise.all(animations);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/interfaces/visual-element.mjs
		function animateVisualElement(visualElement, definition, options = {}) {
			visualElement.notify("AnimationStart", definition);
			let animation;
			if (Array.isArray(definition)) {
				const animations = definition.map((variant) => animateVariant(visualElement, variant, options));
				animation = Promise.all(animations);
			} else if (typeof definition === "string") animation = animateVariant(visualElement, definition, options);
			else {
				const resolvedDefinition = typeof definition === "function" ? resolveVariant(visualElement, definition, options.custom) : definition;
				animation = Promise.all(animateTarget(visualElement, resolvedDefinition, options));
			}
			return animation.then(() => {
				visualElement.notify("AnimationComplete", definition);
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/auto.mjs
		/**
		* ValueType for "auto"
		*/
		const auto = {
			test: (v) => v === "auto",
			parse: (v) => v
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/test.mjs
		/**
		* Tests a provided value against a ValueType
		*/
		const testValueType = (v) => (type) => type.test(v);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/dimensions.mjs
		/**
		* A list of value types commonly used for dimensions
		*/
		const dimensionValueTypes = [
			number,
			px,
			percent,
			degrees,
			vw,
			vh,
			auto
		];
		/**
		* Tests a dimensional value against the list of dimension ValueTypes
		*/
		const findDimensionValueType = (v) => dimensionValueTypes.find(testValueType(v));
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/utils/is-none.mjs
		function isNone(value) {
			if (typeof value === "number") return value === 0;
			else if (value !== null) return value === "none" || value === "0" || isZeroValueString(value);
			else return true;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/complex/filter.mjs
		/**
		* Properties that should default to 1 or 100%
		*/
		const maxDefaults = /* @__PURE__ */ new Set([
			"brightness",
			"contrast",
			"saturate",
			"opacity"
		]);
		function applyDefaultFilter(v) {
			const [name, value] = v.slice(0, -1).split("(");
			if (name === "drop-shadow") return v;
			const [number] = value.match(floatRegex) || [];
			if (!number) return v;
			const unit = value.replace(number, "");
			let defaultValue = maxDefaults.has(name) ? 1 : 0;
			if (number !== value) defaultValue *= 100;
			return name + "(" + defaultValue + unit + ")";
		}
		const functionRegex = /\b([a-z-]*)\(.*?\)/gu;
		const filter = {
			...complex,
			getAnimatableNone: (v) => {
				const functions = v.match(functionRegex);
				return functions ? functions.map(applyDefaultFilter).join(" ") : v;
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/complex/mask.mjs
		const mask = {
			...complex,
			getAnimatableNone: (v) => {
				const parsed = complex.parse(v);
				return complex.createTransformer(v)(parsed.map((v) => typeof v === "number" ? 0 : typeof v === "object" ? {
					...v,
					alpha: 1
				} : v));
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/int.mjs
		const int = {
			...number,
			transform: Math.round
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/maps/number.mjs
		const numberValueTypes = {
			borderWidth: px,
			borderTopWidth: px,
			borderRightWidth: px,
			borderBottomWidth: px,
			borderLeftWidth: px,
			borderRadius: px,
			borderTopLeftRadius: px,
			borderTopRightRadius: px,
			borderBottomRightRadius: px,
			borderBottomLeftRadius: px,
			width: px,
			maxWidth: px,
			height: px,
			maxHeight: px,
			top: px,
			right: px,
			bottom: px,
			left: px,
			inset: px,
			insetBlock: px,
			insetBlockStart: px,
			insetBlockEnd: px,
			insetInline: px,
			insetInlineStart: px,
			insetInlineEnd: px,
			padding: px,
			paddingTop: px,
			paddingRight: px,
			paddingBottom: px,
			paddingLeft: px,
			paddingBlock: px,
			paddingBlockStart: px,
			paddingBlockEnd: px,
			paddingInline: px,
			paddingInlineStart: px,
			paddingInlineEnd: px,
			margin: px,
			marginTop: px,
			marginRight: px,
			marginBottom: px,
			marginLeft: px,
			marginBlock: px,
			marginBlockStart: px,
			marginBlockEnd: px,
			marginInline: px,
			marginInlineStart: px,
			marginInlineEnd: px,
			fontSize: px,
			backgroundPositionX: px,
			backgroundPositionY: px,
			rotate: degrees,
			/**
			* Internal channel for `transition.path` orientToPath. Composed onto
			* `rotate` at the transform-build sites so the user's `rotate` is
			* never read or overwritten. Not part of `transformPropOrder`.
			*/
			pathRotation: degrees,
			rotateX: degrees,
			rotateY: degrees,
			rotateZ: degrees,
			scale,
			scaleX: scale,
			scaleY: scale,
			scaleZ: scale,
			skew: degrees,
			skewX: degrees,
			skewY: degrees,
			distance: px,
			translateX: px,
			translateY: px,
			translateZ: px,
			x: px,
			y: px,
			z: px,
			perspective: px,
			transformPerspective: px,
			opacity: alpha,
			originX: progressPercentage,
			originY: progressPercentage,
			originZ: px,
			zIndex: int,
			fillOpacity: alpha,
			strokeOpacity: alpha,
			numOctaves: int
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/maps/defaults.mjs
		/**
		* A map of default value types for common values
		*/
		const defaultValueTypes = {
			...numberValueTypes,
			color,
			backgroundColor: color,
			outlineColor: color,
			fill: color,
			stroke: color,
			borderColor: color,
			borderTopColor: color,
			borderRightColor: color,
			borderBottomColor: color,
			borderLeftColor: color,
			filter,
			WebkitFilter: filter,
			mask,
			WebkitMask: mask
		};
		/**
		* Gets the default ValueType for the provided value key
		*/
		const getDefaultValueType = (key) => defaultValueTypes[key];
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/animatable-none.mjs
		const customTypes = /*@__PURE__*/ new Set([filter, mask]);
		function getAnimatableNone(key, value) {
			let defaultValueType = getDefaultValueType(key);
			if (!customTypes.has(defaultValueType)) defaultValueType = complex;
			return defaultValueType.getAnimatableNone ? defaultValueType.getAnimatableNone(value) : void 0;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/utils/make-none-animatable.mjs
		/**
		* If we encounter keyframes like "none" or "0" and we also have keyframes like
		* "#fff" or "200px 200px" we want to find a keyframe to serve as a template for
		* the "none" keyframes. In this case "#fff" or "200px 200px" - then these get turned into
		* zero equivalents, i.e. "#fff0" or "0px 0px".
		*/
		const invalidTemplates = /* @__PURE__ */ new Set([
			"auto",
			"none",
			"0"
		]);
		function makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name) {
			let i = 0;
			let animatableTemplate = void 0;
			while (i < unresolvedKeyframes.length && !animatableTemplate) {
				const keyframe = unresolvedKeyframes[i];
				if (typeof keyframe === "string" && !invalidTemplates.has(keyframe) && analyseComplexValue(keyframe).values.length) animatableTemplate = unresolvedKeyframes[i];
				i++;
			}
			if (animatableTemplate && name) for (const noneIndex of noneKeyframeIndexes) unresolvedKeyframes[noneIndex] = getAnimatableNone(name, animatableTemplate);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/keyframes/DOMKeyframesResolver.mjs
		var DOMKeyframesResolver = class extends KeyframeResolver {
			constructor(unresolvedKeyframes, onComplete, name, motionValue, element) {
				super(unresolvedKeyframes, onComplete, name, motionValue, element, true);
			}
			readKeyframes() {
				const { unresolvedKeyframes, element, name } = this;
				if (!element || !element.current) return;
				super.readKeyframes();
				/**
				* If any keyframe is a CSS variable, we need to find its value by sampling the element
				*/
				for (let i = 0; i < unresolvedKeyframes.length; i++) {
					let keyframe = unresolvedKeyframes[i];
					if (typeof keyframe === "string") {
						keyframe = keyframe.trim();
						if (isCSSVariableToken(keyframe)) {
							const resolved = getVariableValue(keyframe, element.current);
							if (resolved !== void 0) unresolvedKeyframes[i] = resolved;
							if (i === unresolvedKeyframes.length - 1) this.finalKeyframe = keyframe;
						}
					}
				}
				/**
				* Resolve "none" values. We do this potentially twice - once before and once after measuring keyframes.
				* This could be seen as inefficient but it's a trade-off to avoid measurements in more situations, which
				* have a far bigger performance impact.
				*/
				this.resolveNoneKeyframes();
				/**
				* Check to see if unit type has changed. If so schedule jobs that will
				* temporarily set styles to the destination keyframes.
				* Skip if we have more than two keyframes or this isn't a positional value.
				* TODO: We can throw if there are multiple keyframes and the value type changes.
				*/
				if (!positionalKeys.has(name) || unresolvedKeyframes.length !== 2) return;
				const [origin, target] = unresolvedKeyframes;
				const originType = findDimensionValueType(origin);
				const targetType = findDimensionValueType(target);
				if (containsCSSVariable(origin) !== containsCSSVariable(target) && positionalValues[name]) {
					this.needsMeasurement = true;
					return;
				}
				/**
				* Either we don't recognise these value types or we can animate between them.
				*/
				if (originType === targetType) return;
				/**
				* If both values are numbers or pixels, we can animate between them by
				* converting them to numbers.
				*/
				if (isNumOrPxType(originType) && isNumOrPxType(targetType)) for (let i = 0; i < unresolvedKeyframes.length; i++) {
					const value = unresolvedKeyframes[i];
					if (typeof value === "string") unresolvedKeyframes[i] = parseFloat(value);
				}
				else if (positionalValues[name])
 /**
				* Else, the only way to resolve this is by measuring the element.
				*/
				this.needsMeasurement = true;
			}
			resolveNoneKeyframes() {
				const { unresolvedKeyframes, name } = this;
				const noneKeyframeIndexes = [];
				for (let i = 0; i < unresolvedKeyframes.length; i++) if (unresolvedKeyframes[i] === null || isNone(unresolvedKeyframes[i])) noneKeyframeIndexes.push(i);
				if (noneKeyframeIndexes.length) makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name);
			}
			measureInitialState() {
				const { element, unresolvedKeyframes, name } = this;
				if (!element || !element.current) return;
				if (name === "height") this.suspendedScrollY = window.pageYOffset;
				this.measuredOrigin = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
				unresolvedKeyframes[0] = this.measuredOrigin;
				const measureKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
				if (measureKeyframe !== void 0) element.getValue(name, measureKeyframe).jump(measureKeyframe, false);
			}
			measureEndState() {
				const { element, name, unresolvedKeyframes } = this;
				if (!element || !element.current) return;
				const value = element.getValue(name);
				value && value.jump(this.measuredOrigin, false);
				const finalKeyframeIndex = unresolvedKeyframes.length - 1;
				const finalKeyframe = unresolvedKeyframes[finalKeyframeIndex];
				unresolvedKeyframes[finalKeyframeIndex] = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
				if (finalKeyframe !== null && this.finalKeyframe === void 0) this.finalKeyframe = finalKeyframe;
				if (this.removedTransforms?.length) this.removedTransforms.forEach(([unsetTransformName, unsetTransformValue]) => {
					element.getValue(unsetTransformName).set(unsetTransformValue);
				});
				this.resolveNoneKeyframes();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/border-radius.mjs
		/**
		* The four corner-radius longhands. Shared so the projection mixer, scale
		* corrector, WAAPI px-value set and view-transition crop pass don't each carry
		* their own copy. Order is irrelevant - every consumer mixes/corrects/animates
		* each corner independently.
		*/
		const cornerRadiusProps = [
			"borderTopLeftRadius",
			"borderTopRightRadius",
			"borderBottomRightRadius",
			"borderBottomLeftRadius"
		];
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/resolve-elements.mjs
		function resolveElements(elementOrSelector, scope, selectorCache) {
			if (elementOrSelector == null) return [];
			if (elementOrSelector instanceof EventTarget) return [elementOrSelector];
			else if (typeof elementOrSelector === "string") {
				let root = document;
				if (scope) root = scope.current;
				const elements = selectorCache?.[elementOrSelector] ?? root.querySelectorAll(elementOrSelector);
				return elements ? Array.from(elements) : [];
			}
			return Array.from(elementOrSelector).filter((element) => element != null);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/get-as-type.mjs
		/**
		* Provided a value and a ValueType, returns the value as that value type.
		*/
		const getValueAsType = (value, type) => {
			return type && typeof value === "number" ? type.transform(value) : value;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/is-html-element.mjs
		/**
		* Checks if an element is an HTML element in a way
		* that works across iframes
		*/
		function isHTMLElement(element) {
			return isObject(element) && "offsetHeight" in element && !("ownerSVGElement" in element);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/frameloop/microtask.mjs
		const { schedule: microtask, cancel: cancelMicrotask } = /* @__PURE__ */ createRenderBatcher(queueMicrotask, false);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/drag/state/is-active.mjs
		const isDragging = {
			x: false,
			y: false
		};
		function isDragActive() {
			return isDragging.x || isDragging.y;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/drag/state/set-active.mjs
		function setDragLock(axis) {
			if (axis === "x" || axis === "y") {
				if (isDragging[axis]) return null;
				else {
					isDragging[axis] = true;
					return () => {
						isDragging[axis] = false;
					};
				}
			} else if (isDragging.x || isDragging.y) return null;
			else {
				isDragging.x = isDragging.y = true;
				return () => {
					isDragging.x = isDragging.y = false;
				};
			}
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/utils/setup.mjs
		function setupGesture(elementOrSelector, options) {
			const elements = resolveElements(elementOrSelector);
			const gestureAbortController = new AbortController();
			const eventOptions = {
				passive: true,
				...options,
				signal: gestureAbortController.signal
			};
			const cancel = () => gestureAbortController.abort();
			return [
				elements,
				eventOptions,
				cancel
			];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/hover.mjs
		function isValidHover(event) {
			return !(event.pointerType === "touch" || isDragActive());
		}
		/**
		* Create a hover gesture. hover() is different to .addEventListener("pointerenter")
		* in that it has an easier syntax, filters out polyfilled touch events, interoperates
		* with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
		*
		* @public
		*/
		function hover(elementOrSelector, onHoverStart, options = {}) {
			const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
			elements.forEach((element) => {
				let isPressed = false;
				let deferredHoverEnd = false;
				let hoverEndCallback;
				const removePointerLeave = () => {
					element.removeEventListener("pointerleave", onPointerLeave);
				};
				const endHover = (event) => {
					if (hoverEndCallback) {
						hoverEndCallback(event);
						hoverEndCallback = void 0;
					}
					removePointerLeave();
				};
				const onPointerUp = (event) => {
					isPressed = false;
					window.removeEventListener("pointerup", onPointerUp);
					window.removeEventListener("pointercancel", onPointerUp);
					if (deferredHoverEnd) {
						deferredHoverEnd = false;
						endHover(event);
					}
				};
				const onPointerDown = () => {
					isPressed = true;
					window.addEventListener("pointerup", onPointerUp, eventOptions);
					window.addEventListener("pointercancel", onPointerUp, eventOptions);
				};
				const onPointerLeave = (leaveEvent) => {
					if (leaveEvent.pointerType === "touch") return;
					if (isPressed) {
						deferredHoverEnd = true;
						return;
					}
					endHover(leaveEvent);
				};
				const onPointerEnter = (enterEvent) => {
					if (!isValidHover(enterEvent)) return;
					deferredHoverEnd = false;
					const onHoverEnd = onHoverStart(element, enterEvent);
					if (typeof onHoverEnd !== "function") return;
					hoverEndCallback = onHoverEnd;
					element.addEventListener("pointerleave", onPointerLeave, eventOptions);
				};
				element.addEventListener("pointerenter", onPointerEnter, eventOptions);
				element.addEventListener("pointerdown", onPointerDown, eventOptions);
			});
			return cancel;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/utils/is-node-or-child.mjs
		/**
		* Recursively traverse up the tree to check whether the provided child node
		* is the parent or a descendant of it.
		*
		* @param parent - Element to find
		* @param child - Element to test against parent
		*/
		const isNodeOrChild = (parent, child) => {
			if (!child) return false;
			else if (parent === child) return true;
			else return isNodeOrChild(parent, child.parentElement);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/utils/is-primary-pointer.mjs
		const isPrimaryPointer = (event) => {
			if (event.pointerType === "mouse") return typeof event.button !== "number" || event.button <= 0;
			else
 /**
			* isPrimary is true for all mice buttons, whereas every touch point
			* is regarded as its own input. So subsequent concurrent touch points
			* will be false.
			*
			* Specifically match against false here as incomplete versions of
			* PointerEvents in very old browser might have it set as undefined.
			*/
			return event.isPrimary !== false;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/press/utils/is-keyboard-accessible.mjs
		const keyboardAccessibleElements = /* @__PURE__ */ new Set([
			"BUTTON",
			"INPUT",
			"SELECT",
			"TEXTAREA",
			"A"
		]);
		/**
		* Checks if an element is natively keyboard accessible (focusable).
		* Used by the press gesture to determine if we need to add tabIndex.
		*/
		function isElementKeyboardAccessible(element) {
			return keyboardAccessibleElements.has(element.tagName) || element.isContentEditable === true;
		}
		const textInputElements = /* @__PURE__ */ new Set([
			"INPUT",
			"SELECT",
			"TEXTAREA"
		]);
		/**
		* Checks if an element has text selection or direct interaction behavior
		* that should block drag gestures from starting.
		*
		* This specifically targets form controls where the user might want to select
		* text or interact with the control (e.g., sliders, dropdowns).
		*
		* Buttons and links are NOT included because they don't have click-and-move
		* actions of their own - they only respond to click events, so dragging
		* should still work when initiated from these elements.
		*/
		function isElementTextInput(element) {
			return textInputElements.has(element.tagName) || element.isContentEditable === true;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/press/utils/state.mjs
		const isPressing = /* @__PURE__ */ new WeakSet();
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/press/utils/keyboard.mjs
		/**
		* Filter out events that are not "Enter" keys.
		*/
		function filterEvents(callback) {
			return (event) => {
				if (event.key !== "Enter") return;
				callback(event);
			};
		}
		function firePointerEvent(target, type) {
			target.dispatchEvent(new PointerEvent("pointer" + type, {
				isPrimary: true,
				bubbles: true
			}));
		}
		const enableKeyboardPress = (focusEvent, eventOptions) => {
			const element = focusEvent.currentTarget;
			if (!element) return;
			const handleKeydown = filterEvents(() => {
				if (isPressing.has(element)) return;
				firePointerEvent(element, "down");
				const handleKeyup = filterEvents(() => {
					firePointerEvent(element, "up");
				});
				const handleBlur = () => firePointerEvent(element, "cancel");
				element.addEventListener("keyup", handleKeyup, eventOptions);
				element.addEventListener("blur", handleBlur, eventOptions);
			});
			element.addEventListener("keydown", handleKeydown, eventOptions);
			/**
			* Add an event listener that fires on blur to remove the keydown events.
			*/
			element.addEventListener("blur", () => element.removeEventListener("keydown", handleKeydown), eventOptions);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/gestures/press/index.mjs
		/**
		* Filter out events that are not primary pointer events, or are triggering
		* while a Motion gesture is active.
		*/
		function isValidPressEvent(event) {
			return isPrimaryPointer(event) && !isDragActive();
		}
		const claimedPointerDownEvents = /* @__PURE__ */ new WeakSet();
		/**
		* Create a press gesture.
		*
		* Press is different to `"pointerdown"`, `"pointerup"` in that it
		* automatically filters out secondary pointer events like right
		* click and multitouch.
		*
		* It also adds accessibility support for keyboards, where
		* an element with a press gesture will receive focus and
		*  trigger on Enter `"keydown"` and `"keyup"` events.
		*
		* This is different to a browser's `"click"` event, which does
		* respond to keyboards but only for the `"click"` itself, rather
		* than the press start and end/cancel. The element also needs
		* to be focusable for this to work, whereas a press gesture will
		* make an element focusable by default.
		*
		* @public
		*/
		function press(targetOrSelector, onPressStart, options = {}) {
			const [targets, eventOptions, cancelEvents] = setupGesture(targetOrSelector, options);
			const startPress = (startEvent) => {
				const target = startEvent.currentTarget;
				if (!isValidPressEvent(startEvent)) return;
				if (claimedPointerDownEvents.has(startEvent)) return;
				isPressing.add(target);
				if (options.stopPropagation) claimedPointerDownEvents.add(startEvent);
				const onPressEnd = onPressStart(target, startEvent);
				/**
				* End listeners run in the capture phase so a descendant calling
				* stopPropagation() in its own pointerup handler can't prevent the
				* press gesture from ending. This also keeps the gesture-end
				* ordering consistent with the drag gesture. See #2794.
				*/
				const endEventOptions = {
					...eventOptions,
					capture: true
				};
				const onPointerEnd = (endEvent, success) => {
					window.removeEventListener("pointerup", onPointerUp, endEventOptions);
					window.removeEventListener("pointercancel", onPointerCancel, endEventOptions);
					if (isPressing.has(target)) isPressing.delete(target);
					if (!isValidPressEvent(endEvent)) return;
					if (typeof onPressEnd === "function") onPressEnd(endEvent, { success });
				};
				const onPointerUp = (upEvent) => {
					onPointerEnd(upEvent, target === window || target === document || options.useGlobalTarget || isNodeOrChild(target, upEvent.target));
				};
				const onPointerCancel = (cancelEvent) => {
					onPointerEnd(cancelEvent, false);
				};
				window.addEventListener("pointerup", onPointerUp, endEventOptions);
				window.addEventListener("pointercancel", onPointerCancel, endEventOptions);
			};
			targets.forEach((target) => {
				(options.useGlobalTarget ? window : target).addEventListener("pointerdown", startPress, eventOptions);
				if (isHTMLElement(target)) {
					target.addEventListener("focus", (event) => enableKeyboardPress(event, eventOptions));
					if (!isElementKeyboardAccessible(target) && !target.hasAttribute("tabindex")) target.tabIndex = 0;
				}
			});
			return cancelEvents;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/is-svg-element.mjs
		/**
		* Checks if an element is an SVG element in a way
		* that works across iframes
		*/
		function isSVGElement(element) {
			return isObject(element) && "ownerSVGElement" in element;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/resize/handle-element.mjs
		const resizeHandlers = /* @__PURE__ */ new WeakMap();
		let observer;
		const getSize = (borderBoxAxis, svgAxis, htmlAxis) => (target, borderBoxSize) => {
			if (borderBoxSize && borderBoxSize[0]) return borderBoxSize[0][borderBoxAxis + "Size"];
			else if (isSVGElement(target) && "getBBox" in target) return target.getBBox()[svgAxis];
			else return target[htmlAxis];
		};
		const getWidth = /*@__PURE__*/ getSize("inline", "width", "offsetWidth");
		const getHeight = /*@__PURE__*/ getSize("block", "height", "offsetHeight");
		function notifyTarget({ target, borderBoxSize }) {
			resizeHandlers.get(target)?.forEach((handler) => {
				handler(target, {
					get width() {
						return getWidth(target, borderBoxSize);
					},
					get height() {
						return getHeight(target, borderBoxSize);
					}
				});
			});
		}
		function notifyAll(entries) {
			entries.forEach(notifyTarget);
		}
		function createResizeObserver() {
			if (typeof ResizeObserver === "undefined") return;
			observer = new ResizeObserver(notifyAll);
		}
		function resizeElement(target, handler) {
			if (!observer) createResizeObserver();
			const elements = resolveElements(target);
			elements.forEach((element) => {
				let elementHandlers = resizeHandlers.get(element);
				if (!elementHandlers) {
					elementHandlers = /* @__PURE__ */ new Set();
					resizeHandlers.set(element, elementHandlers);
				}
				elementHandlers.add(handler);
				observer?.observe(element);
			});
			return () => {
				elements.forEach((element) => {
					const elementHandlers = resizeHandlers.get(element);
					elementHandlers?.delete(handler);
					if (!elementHandlers?.size) observer?.unobserve(element);
				});
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/resize/handle-window.mjs
		const windowCallbacks = /* @__PURE__ */ new Set();
		let windowResizeHandler;
		function createWindowResizeHandler() {
			windowResizeHandler = () => {
				const info = {
					get width() {
						return window.innerWidth;
					},
					get height() {
						return window.innerHeight;
					}
				};
				windowCallbacks.forEach((callback) => callback(info));
			};
			window.addEventListener("resize", windowResizeHandler);
		}
		function resizeWindow(callback) {
			windowCallbacks.add(callback);
			if (!windowResizeHandler) createWindowResizeHandler();
			return () => {
				windowCallbacks.delete(callback);
				if (!windowCallbacks.size && typeof windowResizeHandler === "function") {
					window.removeEventListener("resize", windowResizeHandler);
					windowResizeHandler = void 0;
				}
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/resize/index.mjs
		function resize(a, b) {
			return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/stats/buffer.mjs
		const statsBuffer = {
			value: null,
			addProjectionMetrics: null
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/is-svg-svg-element.mjs
		/**
		* Checks if an element is specifically an SVGSVGElement (the root SVG element)
		* in a way that works across iframes
		*/
		function isSVGSVGElement(element) {
			return isSVGElement(element) && element.tagName === "svg";
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/types/utils/find.mjs
		/**
		* A list of all ValueTypes
		*/
		const valueTypes = [
			...dimensionValueTypes,
			color,
			complex
		];
		/**
		* Tests a value against the list of ValueTypes
		*/
		const findValueType = (v) => valueTypes.find(testValueType(v));
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/models.mjs
		const createAxisDelta = () => ({
			translate: 0,
			scale: 1,
			origin: 0,
			originPoint: 0
		});
		const createDelta = () => ({
			x: createAxisDelta(),
			y: createAxisDelta()
		});
		const createAxis = () => ({
			min: 0,
			max: 0
		});
		const createBox = () => ({
			x: createAxis(),
			y: createAxis()
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/store.mjs
		const visualElementStore = /* @__PURE__ */ new WeakMap();
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/is-animation-controls.mjs
		function isAnimationControls(v) {
			return v !== null && typeof v === "object" && typeof v.start === "function";
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/is-variant-label.mjs
		/**
		* Decides if the supplied variable is variant label
		*/
		function isVariantLabel(v) {
			return typeof v === "string" || Array.isArray(v);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/variant-props.mjs
		const variantPriorityOrder = [
			"animate",
			"whileInView",
			"whileFocus",
			"whileHover",
			"whileTap",
			"whileDrag",
			"exit"
		];
		const variantProps = ["initial", ...variantPriorityOrder];
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/is-controlling-variants.mjs
		function isControllingVariants(props) {
			return isAnimationControls(props.animate) || variantProps.some((name) => isVariantLabel(props[name]));
		}
		function isVariantNode(props) {
			return Boolean(isControllingVariants(props) || props.variants);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/motion-values.mjs
		/**
		* Updates motion values from props changes.
		* Uses `any` type for element to avoid circular dependencies with VisualElement.
		*/
		function updateMotionValuesFromProps(element, next, prev) {
			for (const key in next) {
				const nextValue = next[key];
				const prevValue = prev[key];
				if (isMotionValue(nextValue))
 /**
				* If this is a motion value found in props or style, we want to add it
				* to our visual element's motion value map.
				*/
				element.addValue(key, nextValue);
				else if (isMotionValue(prevValue))
 /**
				* If we're swapping from a motion value to a static value,
				* create a new motion value from that
				*/
				element.addValue(key, motionValue(nextValue, { owner: element }));
				else if (prevValue !== nextValue) {
					/**
					* If this is a flat value that has changed, update the motion value
					* or create one if it doesn't exist. We only want to do this if we're
					* not handling the value with our animation state.
					*/
					if (element.hasValue(key)) {
						const existingValue = element.getValue(key);
						if (existingValue.liveStyle === true) existingValue.jump(nextValue);
						else if (!existingValue.hasAnimated) existingValue.set(nextValue);
					} else {
						const latestValue = element.getStaticValue(key);
						element.addValue(key, motionValue(latestValue !== void 0 ? latestValue : nextValue, { owner: element }));
					}
				}
			}
			for (const key in prev) if (next[key] === void 0) element.removeValue(key);
			return next;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/reduced-motion/state.mjs
		const prefersReducedMotion = { current: null };
		const hasReducedMotionListener = { current: false };
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/reduced-motion/index.mjs
		const isBrowser = typeof window !== "undefined";
		function initPrefersReducedMotion() {
			hasReducedMotionListener.current = true;
			if (!isBrowser) return;
			if (window.matchMedia) {
				const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
				const setReducedMotionPreferences = () => prefersReducedMotion.current = motionMediaQuery.matches;
				motionMediaQuery.addEventListener("change", setReducedMotionPreferences);
				setReducedMotionPreferences();
			} else prefersReducedMotion.current = false;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/VisualElement.mjs
		const propEventHandlers = [
			"AnimationStart",
			"AnimationComplete",
			"Update",
			"BeforeLayoutMeasure",
			"LayoutMeasure",
			"LayoutAnimationStart",
			"LayoutAnimationComplete"
		];
		/**
		* Static feature definitions - can be injected by framework layer
		*/
		let featureDefinitions = {};
		/**
		* Set feature definitions for all VisualElements.
		* This should be called by the framework layer (e.g., framer-motion) during initialization.
		*/
		function setFeatureDefinitions(definitions) {
			featureDefinitions = definitions;
		}
		/**
		* Get the current feature definitions
		*/
		function getFeatureDefinitions() {
			return featureDefinitions;
		}
		/**
		* A VisualElement is an imperative abstraction around UI elements such as
		* HTMLElement, SVGElement, Three.Object3D etc.
		*/
		var VisualElement = class {
			/**
			* This method takes React props and returns found MotionValues. For example, HTML
			* MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
			*
			* This isn't an abstract method as it needs calling in the constructor, but it is
			* intended to be one.
			*/
			scrapeMotionValuesFromProps(_props, _prevProps, _visualElement) {
				return {};
			}
			constructor({ parent, props, presenceContext, reducedMotionConfig, skipAnimations, blockInitialAnimation, visualState }, options = {}) {
				/**
				* A reference to the current underlying Instance, e.g. a HTMLElement
				* or Three.Mesh etc.
				*/
				this.current = null;
				/**
				* A set containing references to this VisualElement's children.
				*/
				this.children = /* @__PURE__ */ new Set();
				/**
				* Determine what role this visual element should take in the variant tree.
				*/
				this.isVariantNode = false;
				this.isControllingVariants = false;
				/**
				* Decides whether this VisualElement should animate in reduced motion
				* mode.
				*
				* TODO: This is currently set on every individual VisualElement but feels
				* like it could be set globally.
				*/
				this.shouldReduceMotion = null;
				/**
				* Decides whether animations should be skipped for this VisualElement.
				* Useful for E2E tests and visual regression testing.
				*/
				this.shouldSkipAnimations = false;
				/**
				* A map of all motion values attached to this visual element. Motion
				* values are source of truth for any given animated value. A motion
				* value might be provided externally by the component via props.
				*/
				this.values = /* @__PURE__ */ new Map();
				this.KeyframeResolver = KeyframeResolver;
				/**
				* Cleanup functions for active features (hover/tap/exit etc)
				*/
				this.features = {};
				/**
				* A map of every subscription that binds the provided or generated
				* motion values onChange listeners to this visual element.
				*/
				this.valueSubscriptions = /* @__PURE__ */ new Map();
				/**
				* A reference to the previously-provided motion values as returned
				* from scrapeMotionValuesFromProps. We use the keys in here to determine
				* if any motion values need to be removed after props are updated.
				*/
				this.prevMotionValues = {};
				/**
				* Track whether this element has been mounted before, to detect
				* remounts after Suspense unmount/remount cycles.
				*/
				this.hasBeenMounted = false;
				/**
				* An object containing a SubscriptionManager for each active event.
				*/
				this.events = {};
				/**
				* An object containing an unsubscribe function for each prop event subscription.
				* For example, every "Update" event can have multiple subscribers via
				* VisualElement.on(), but only one of those can be defined via the onUpdate prop.
				*/
				this.propEventSubscriptions = {};
				this.notifyUpdate = () => this.notify("Update", this.latestValues);
				this.render = () => {
					if (!this.current) return;
					this.triggerBuild();
					this.renderInstance(this.current, this.renderState, this.props.style, this.projection);
				};
				this.renderScheduledAt = 0;
				this.scheduleRender = () => {
					const now = time.now();
					if (this.renderScheduledAt < now) {
						this.renderScheduledAt = now;
						frame.render(this.render, false, true);
					}
				};
				const { latestValues, renderState } = visualState;
				this.latestValues = latestValues;
				this.baseTarget = { ...latestValues };
				this.initialValues = props.initial ? { ...latestValues } : {};
				this.renderState = renderState;
				this.parent = parent;
				this.props = props;
				this.presenceContext = presenceContext;
				this.depth = parent ? parent.depth + 1 : 0;
				this.reducedMotionConfig = reducedMotionConfig;
				this.skipAnimationsConfig = skipAnimations;
				this.options = options;
				this.blockInitialAnimation = Boolean(blockInitialAnimation);
				this.isControllingVariants = isControllingVariants(props);
				this.isVariantNode = isVariantNode(props);
				if (this.isVariantNode) this.variantChildren = /* @__PURE__ */ new Set();
				this.manuallyAnimateOnMount = Boolean(parent && parent.current);
				/**
				* Any motion values that are provided to the element when created
				* aren't yet bound to the element, as this would technically be impure.
				* However, we iterate through the motion values and set them to the
				* initial values for this component.
				*
				* TODO: This is impure and we should look at changing this to run on mount.
				* Doing so will break some tests but this isn't necessarily a breaking change,
				* more a reflection of the test.
				*/
				const { willChange, ...initialMotionValues } = this.scrapeMotionValuesFromProps(props, {}, this);
				for (const key in initialMotionValues) {
					const value = initialMotionValues[key];
					if (latestValues[key] !== void 0 && isMotionValue(value)) value.set(latestValues[key]);
				}
			}
			mount(instance) {
				/**
				* If this element has been mounted before (e.g. after a Suspense
				* unmount/remount), reset motion values to their initial state
				* so animations replay correctly from initial → animate.
				*/
				if (this.hasBeenMounted) for (const key in this.initialValues) {
					this.values.get(key)?.jump(this.initialValues[key]);
					this.latestValues[key] = this.initialValues[key];
				}
				this.current = instance;
				visualElementStore.set(instance, this);
				if (this.projection && !this.projection.instance) this.projection.mount(instance);
				if (this.parent && this.isVariantNode && !this.isControllingVariants) this.removeFromVariantTree = this.parent.addVariantChild(this);
				this.values.forEach((value, key) => this.bindToMotionValue(key, value));
				/**
				* Determine reduced motion preference. Only initialize the matchMedia
				* listener if we actually need the dynamic value (i.e., when config
				* is neither "never" nor "always").
				*/
				if (this.reducedMotionConfig === "never") this.shouldReduceMotion = false;
				else if (this.reducedMotionConfig === "always") this.shouldReduceMotion = true;
				else {
					if (!hasReducedMotionListener.current) initPrefersReducedMotion();
					this.shouldReduceMotion = prefersReducedMotion.current;
				}
				/**
				* Set whether animations should be skipped based on the config.
				*/
				this.shouldSkipAnimations = this.skipAnimationsConfig ?? false;
				this.parent?.addChild(this);
				this.update(this.props, this.presenceContext);
				this.hasBeenMounted = true;
			}
			unmount() {
				this.projection && this.projection.unmount();
				cancelFrame(this.notifyUpdate);
				cancelFrame(this.render);
				this.valueSubscriptions.forEach((remove) => remove());
				this.valueSubscriptions.clear();
				this.removeFromVariantTree && this.removeFromVariantTree();
				this.parent?.removeChild(this);
				for (const key in this.events) this.events[key].clear();
				for (const key in this.features) {
					const feature = this.features[key];
					if (feature) {
						feature.unmount();
						feature.isMounted = false;
					}
				}
				this.current = null;
			}
			addChild(child) {
				this.children.add(child);
				this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set());
				this.enteringChildren.add(child);
			}
			removeChild(child) {
				this.children.delete(child);
				this.enteringChildren && this.enteringChildren.delete(child);
			}
			bindToMotionValue(key, value) {
				if (this.valueSubscriptions.has(key)) this.valueSubscriptions.get(key)();
				if (value.accelerate && acceleratedValues.has(key) && this.current instanceof HTMLElement) {
					const { factory, keyframes, times, ease, duration } = value.accelerate;
					const animation = new NativeAnimation({
						element: this.current,
						name: key,
						keyframes,
						times,
						ease,
						duration: /* @__PURE__ */ secondsToMilliseconds(duration)
					});
					const cleanup = factory(animation);
					this.valueSubscriptions.set(key, () => {
						cleanup();
						animation.cancel();
					});
					return;
				}
				const valueIsTransform = transformProps.has(key);
				if (valueIsTransform && this.onBindTransform) this.onBindTransform();
				const removeOnChange = value.on("change", (latestValue) => {
					this.latestValues[key] = latestValue;
					this.props.onUpdate && frame.preRender(this.notifyUpdate);
					if (valueIsTransform && this.projection) this.projection.isTransformDirty = true;
					this.scheduleRender();
				});
				let removeSyncCheck;
				if (typeof window !== "undefined" && window.MotionCheckAppearSync) removeSyncCheck = window.MotionCheckAppearSync(this, key, value);
				this.valueSubscriptions.set(key, () => {
					removeOnChange();
					if (removeSyncCheck) removeSyncCheck();
				});
			}
			sortNodePosition(other) {
				/**
				* If these nodes aren't even of the same type we can't compare their depth.
				*/
				if (!this.current || !this.sortInstanceNodePosition || this.type !== other.type) return 0;
				return this.sortInstanceNodePosition(this.current, other.current);
			}
			updateFeatures() {
				let key = "animation";
				for (key in featureDefinitions) {
					const featureDefinition = featureDefinitions[key];
					if (!featureDefinition) continue;
					const { isEnabled, Feature: FeatureConstructor } = featureDefinition;
					/**
					* If this feature is enabled but not active, make a new instance.
					*/
					if (!this.features[key] && FeatureConstructor && isEnabled(this.props)) this.features[key] = new FeatureConstructor(this);
					/**
					* If we have a feature, mount or update it.
					*/
					if (this.features[key]) {
						const feature = this.features[key];
						if (feature.isMounted) feature.update();
						else {
							feature.mount();
							feature.isMounted = true;
						}
					}
				}
			}
			triggerBuild() {
				this.build(this.renderState, this.latestValues, this.props);
			}
			/**
			* Measure the current viewport box with or without transforms.
			* Only measures axis-aligned boxes, rotate and skew must be manually
			* removed with a re-render to work.
			*/
			measureViewportBox() {
				return this.current ? this.measureInstanceViewportBox(this.current, this.props) : createBox();
			}
			getStaticValue(key) {
				return this.latestValues[key];
			}
			setStaticValue(key, value) {
				this.latestValues[key] = value;
			}
			/**
			* Update the provided props. Ensure any newly-added motion values are
			* added to our map, old ones removed, and listeners updated.
			*/
			update(props, presenceContext) {
				if (props.transformTemplate || this.props.transformTemplate) this.scheduleRender();
				this.prevProps = this.props;
				this.props = props;
				this.prevPresenceContext = this.presenceContext;
				this.presenceContext = presenceContext;
				/**
				* Update prop event handlers ie onAnimationStart, onAnimationComplete
				*/
				for (let i = 0; i < propEventHandlers.length; i++) {
					const key = propEventHandlers[i];
					if (this.propEventSubscriptions[key]) {
						this.propEventSubscriptions[key]();
						delete this.propEventSubscriptions[key];
					}
					const listener = props["on" + key];
					if (listener) this.propEventSubscriptions[key] = this.on(key, listener);
				}
				this.prevMotionValues = updateMotionValuesFromProps(this, this.scrapeMotionValuesFromProps(props, this.prevProps || {}, this), this.prevMotionValues);
				if (this.handleChildMotionValue) this.handleChildMotionValue();
			}
			getProps() {
				return this.props;
			}
			/**
			* Returns the variant definition with a given name.
			*/
			getVariant(name) {
				return this.props.variants ? this.props.variants[name] : void 0;
			}
			/**
			* Returns the defined default transition on this component.
			*/
			getDefaultTransition() {
				return this.props.transition;
			}
			getTransformPagePoint() {
				return this.props.transformPagePoint;
			}
			getClosestVariantNode() {
				return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
			}
			/**
			* Add a child visual element to our set of children.
			*/
			addVariantChild(child) {
				const closestVariantNode = this.getClosestVariantNode();
				if (closestVariantNode) {
					closestVariantNode.variantChildren && closestVariantNode.variantChildren.add(child);
					return () => closestVariantNode.variantChildren.delete(child);
				}
			}
			/**
			* Add a motion value and bind it to this visual element.
			*/
			addValue(key, value) {
				const existingValue = this.values.get(key);
				if (value !== existingValue) {
					if (existingValue) this.removeValue(key);
					this.bindToMotionValue(key, value);
					this.values.set(key, value);
					this.latestValues[key] = value.get();
				}
			}
			/**
			* Remove a motion value and unbind any active subscriptions.
			*/
			removeValue(key) {
				this.values.delete(key);
				const unsubscribe = this.valueSubscriptions.get(key);
				if (unsubscribe) {
					unsubscribe();
					this.valueSubscriptions.delete(key);
				}
				delete this.latestValues[key];
				this.removeValueFromRenderState(key, this.renderState);
			}
			/**
			* Check whether we have a motion value for this key
			*/
			hasValue(key) {
				return this.values.has(key);
			}
			getValue(key, defaultValue) {
				if (this.props.values && this.props.values[key]) return this.props.values[key];
				let value = this.values.get(key);
				if (value === void 0 && defaultValue !== void 0) {
					value = motionValue(defaultValue === null ? void 0 : defaultValue, { owner: this });
					this.addValue(key, value);
				}
				return value;
			}
			/**
			* If we're trying to animate to a previously unencountered value,
			* we need to check for it in our state and as a last resort read it
			* directly from the instance (which might have performance implications).
			*/
			readValue(key, target) {
				let value = this.latestValues[key] !== void 0 || !this.current ? this.latestValues[key] : this.getBaseTargetFromProps(this.props, key) ?? this.readValueFromInstance(this.current, key, this.options);
				if (value !== void 0 && value !== null) {
					if (typeof value === "string" && (isNumericalString(value) || isZeroValueString(value))) value = parseFloat(value);
					else if (!findValueType(value) && complex.test(target)) value = getAnimatableNone(key, target);
					this.setBaseTarget(key, isMotionValue(value) ? value.get() : value);
				}
				return isMotionValue(value) ? value.get() : value;
			}
			/**
			* Set the base target to later animate back to. This is currently
			* only hydrated on creation and when we first read a value.
			*/
			setBaseTarget(key, value) {
				this.baseTarget[key] = value;
			}
			/**
			* Find the base target for a value thats been removed from all animation
			* props.
			*/
			getBaseTarget(key) {
				const { initial } = this.props;
				let valueFromInitial;
				if (typeof initial === "string" || typeof initial === "object") {
					const variant = resolveVariantFromProps(this.props, initial, this.presenceContext?.custom);
					if (variant) valueFromInitial = variant[key];
				}
				/**
				* If this value still exists in the current initial variant, read that.
				*/
				if (initial && valueFromInitial !== void 0) return valueFromInitial;
				/**
				* Alternatively, if this VisualElement config has defined a getBaseTarget
				* so we can read the value from an alternative source, try that.
				*/
				const target = this.getBaseTargetFromProps(this.props, key);
				if (target !== void 0 && !isMotionValue(target)) return target;
				/**
				* If the value was initially defined on initial, but it doesn't any more,
				* return undefined. Otherwise return the value as initially read from the DOM.
				*/
				return this.initialValues[key] !== void 0 && valueFromInitial === void 0 ? void 0 : this.baseTarget[key];
			}
			on(eventName, callback) {
				if (!this.events[eventName]) this.events[eventName] = new SubscriptionManager();
				return this.events[eventName].add(callback);
			}
			notify(eventName, ...args) {
				if (this.events[eventName]) this.events[eventName].notify(...args);
			}
			scheduleRenderMicrotask() {
				microtask.render(this.render);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/dom/DOMVisualElement.mjs
		var DOMVisualElement = class extends VisualElement {
			constructor() {
				super(...arguments);
				this.KeyframeResolver = DOMKeyframesResolver;
			}
			sortInstanceNodePosition(a, b) {
				/**
				* compareDocumentPosition returns a bitmask, by using the bitwise &
				* we're returning true if 2 in that bitmask is set to true. 2 is set
				* to true if b preceeds a.
				*/
				return a.compareDocumentPosition(b) & 2 ? 1 : -1;
			}
			getBaseTargetFromProps(props, key) {
				const style = props.style;
				return style ? style[key] : void 0;
			}
			removeValueFromRenderState(key, { vars, style }) {
				delete vars[key];
				delete style[key];
			}
			handleChildMotionValue() {
				if (this.childSubscription) {
					this.childSubscription();
					delete this.childSubscription;
				}
				const { children } = this.props;
				if (isMotionValue(children)) this.childSubscription = children.on("change", (latest) => {
					if (this.current) this.current.textContent = `${latest}`;
				});
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/Feature.mjs
		/**
		* Feature base class for extending VisualElement functionality.
		* Features are plugins that can be mounted/unmounted to add behavior
		* like gestures, animations, or layout tracking.
		*/
		var Feature = class {
			constructor(node) {
				this.isMounted = false;
				this.node = node;
			}
			update() {}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/conversion.mjs
		/**
		* Bounding boxes tend to be defined as top, left, right, bottom. For various operations
		* it's easier to consider each axis individually. This function returns a bounding box
		* as a map of single-axis min/max values.
		*/
		function convertBoundingBoxToBox({ top, left, right, bottom }) {
			return {
				x: {
					min: left,
					max: right
				},
				y: {
					min: top,
					max: bottom
				}
			};
		}
		function convertBoxToBoundingBox({ x, y }) {
			return {
				top: y.min,
				right: x.max,
				bottom: y.max,
				left: x.min
			};
		}
		/**
		* Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
		* provided by Framer to allow measured points to be corrected for device scaling. This is used
		* when measuring DOM elements and DOM event points.
		*/
		function transformBoxPoints(point, transformPoint) {
			if (!transformPoint) return point;
			const topLeft = transformPoint({
				x: point.left,
				y: point.top
			});
			const bottomRight = transformPoint({
				x: point.right,
				y: point.bottom
			});
			return {
				top: topLeft.y,
				left: topLeft.x,
				bottom: bottomRight.y,
				right: bottomRight.x
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/utils/has-transform.mjs
		function isIdentityScale(scale) {
			return scale === void 0 || scale === 1;
		}
		function hasScale({ scale, scaleX, scaleY }) {
			return !isIdentityScale(scale) || !isIdentityScale(scaleX) || !isIdentityScale(scaleY);
		}
		function hasTransform(values) {
			return hasScale(values) || has2DTranslate(values) || values.z || values.rotate || values.rotateX || values.rotateY || values.skewX || values.skewY;
		}
		function has2DTranslate(values) {
			return is2DTranslate(values.x) || is2DTranslate(values.y);
		}
		function is2DTranslate(value) {
			return value && value !== "0%";
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/delta-apply.mjs
		/**
		* Scales a point based on a factor and an originPoint
		*/
		function scalePoint(point, scale, originPoint) {
			return originPoint + scale * (point - originPoint);
		}
		/**
		* Applies a translate/scale delta to a point
		*/
		function applyPointDelta(point, translate, scale, originPoint, boxScale) {
			if (boxScale !== void 0) point = scalePoint(point, boxScale, originPoint);
			return scalePoint(point, scale, originPoint) + translate;
		}
		/**
		* Applies a translate/scale delta to an axis
		*/
		function applyAxisDelta(axis, translate = 0, scale = 1, originPoint, boxScale) {
			axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
			axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
		}
		/**
		* Applies a translate/scale delta to a box
		*/
		function applyBoxDelta(box, { x, y }) {
			applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
			applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
		}
		const TREE_SCALE_SNAP_MIN = .999999999999;
		const TREE_SCALE_SNAP_MAX = 1.0000000000001;
		/**
		* Apply a tree of deltas to a box. We do this to calculate the effect of all the transforms
		* in a tree upon our box before then calculating how to project it into our desired viewport-relative box
		*
		* This is the final nested loop within updateLayoutDelta for future refactoring
		*/
		function applyTreeDeltas(box, treeScale, treePath, isSharedTransition = false) {
			const treeLength = treePath.length;
			if (!treeLength) return;
			treeScale.x = treeScale.y = 1;
			let node;
			let delta;
			for (let i = 0; i < treeLength; i++) {
				node = treePath[i];
				delta = node.projectionDelta;
				/**
				* TODO: Prefer to remove this, but currently we have motion components with
				* display: contents in Framer.
				*/
				const { visualElement } = node.options;
				if (visualElement && visualElement.props.style && visualElement.props.style.display === "contents") continue;
				if (isSharedTransition && node.options.layoutScroll && node.scroll && node !== node.root) {
					translateAxis(box.x, -node.scroll.offset.x);
					translateAxis(box.y, -node.scroll.offset.y);
				}
				if (delta) {
					treeScale.x *= delta.x.scale;
					treeScale.y *= delta.y.scale;
					applyBoxDelta(box, delta);
				}
				if (isSharedTransition && hasTransform(node.latestValues)) transformBox(box, node.latestValues, node.layout?.layoutBox);
			}
			/**
			* Snap tree scale back to 1 if it's within a non-perceivable threshold.
			* This will help reduce useless scales getting rendered.
			*/
			if (treeScale.x < TREE_SCALE_SNAP_MAX && treeScale.x > TREE_SCALE_SNAP_MIN) treeScale.x = 1;
			if (treeScale.y < TREE_SCALE_SNAP_MAX && treeScale.y > TREE_SCALE_SNAP_MIN) treeScale.y = 1;
		}
		function translateAxis(axis, distance) {
			axis.min += distance;
			axis.max += distance;
		}
		/**
		* Apply a transform to an axis from the latest resolved motion values.
		* This function basically acts as a bridge between a flat motion value map
		* and applyAxisDelta
		*/
		function transformAxis(axis, axisTranslate, axisScale, boxScale, axisOrigin = .5) {
			applyAxisDelta(axis, axisTranslate, axisScale, mixNumber$1(axis.min, axis.max, axisOrigin), boxScale);
		}
		function resolveAxisTranslate(value, axis) {
			if (typeof value === "string") return parseFloat(value) / 100 * (axis.max - axis.min);
			return value;
		}
		/**
		* Apply a transform to a box from the latest resolved motion values.
		*/
		function transformBox(box, transform, sourceBox) {
			const resolveBox = sourceBox ?? box;
			transformAxis(box.x, resolveAxisTranslate(transform.x, resolveBox.x), transform.scaleX, transform.scale, transform.originX);
			transformAxis(box.y, resolveAxisTranslate(transform.y, resolveBox.y), transform.scaleY, transform.scale, transform.originY);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/utils/measure.mjs
		function measureViewportBox(instance, transformPoint) {
			return convertBoundingBoxToBox(transformBoxPoints(instance.getBoundingClientRect(), transformPoint));
		}
		function measurePageBox(element, rootProjectionNode, transformPagePoint) {
			const viewportBox = measureViewportBox(element, transformPagePoint);
			const { scroll } = rootProjectionNode;
			if (scroll) {
				translateAxis(viewportBox.x, scroll.offset.x);
				translateAxis(viewportBox.y, scroll.offset.y);
			}
			return viewportBox;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/html/utils/build-transform.mjs
		const translateAlias = {
			x: "translateX",
			y: "translateY",
			z: "translateZ",
			transformPerspective: "perspective"
		};
		const numTransforms = transformPropOrder.length;
		/**
		* Build a CSS transform style from individual x/y/scale etc properties.
		*
		* This outputs with a default order of transforms/scales/rotations, this can be customised by
		* providing a transformTemplate function.
		*/
		function buildTransform(latestValues, transform, transformTemplate) {
			let transformString = "";
			let transformIsDefault = true;
			/**
			* Loop over all possible transforms in order, adding the ones that
			* are present to the transform string.
			*/
			for (let i = 0; i < numTransforms; i++) {
				const key = transformPropOrder[i];
				const value = latestValues[key];
				if (value === void 0) continue;
				let valueIsDefault = true;
				if (typeof value === "number") valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
				else {
					const parsed = parseFloat(value);
					valueIsDefault = key.startsWith("scale") ? parsed === 1 : parsed === 0;
				}
				if (!valueIsDefault || transformTemplate) {
					const valueAsType = getValueAsType(value, numberValueTypes[key]);
					if (!valueIsDefault) {
						transformIsDefault = false;
						const transformName = translateAlias[key] || key;
						transformString += `${transformName}(${valueAsType}) `;
					}
					if (transformTemplate) transform[key] = valueAsType;
				}
			}
			const pathRotation = latestValues.pathRotation;
			if (pathRotation) {
				transformIsDefault = false;
				transformString += `rotate(${getValueAsType(pathRotation, numberValueTypes.pathRotation)}) `;
			}
			transformString = transformString.trim();
			if (transformTemplate) transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
			else if (transformIsDefault) transformString = "none";
			return transformString;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/html/utils/build-styles.mjs
		function buildHTMLStyles(state, latestValues, transformTemplate) {
			const { style, vars, transformOrigin } = state;
			let hasTransform = false;
			let hasTransformOrigin = false;
			/**
			* Loop over all our latest animated values and decide whether to handle them
			* as a style or CSS variable.
			*
			* Transforms and transform origins are kept separately for further processing.
			*/
			for (const key in latestValues) {
				const value = latestValues[key];
				if (transformProps.has(key)) {
					hasTransform = true;
					continue;
				} else if (isCSSVariableName(key)) {
					vars[key] = value;
					continue;
				} else {
					const valueAsType = getValueAsType(value, numberValueTypes[key]);
					if (key.startsWith("origin")) {
						hasTransformOrigin = true;
						transformOrigin[key] = valueAsType;
					} else style[key] = valueAsType;
				}
			}
			if (!latestValues.transform) {
				if (hasTransform || transformTemplate) style.transform = buildTransform(latestValues, state.transform, transformTemplate);
				else if (style.transform)
 /**
				* If we have previously created a transform but currently don't have any,
				* reset transform style to none.
				*/
				style.transform = "none";
			}
			/**
			* Build a transformOrigin style. Uses the same defaults as the browser for
			* undefined origins.
			*/
			if (hasTransformOrigin) {
				const { originX = "50%", originY = "50%", originZ = 0 } = transformOrigin;
				style.transformOrigin = `${originX} ${originY} ${originZ}`;
			}
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/html/utils/render.mjs
		function renderHTML(element, { style, vars }, styleProp, projection) {
			const elementStyle = element.style;
			let key;
			for (key in style) elementStyle[key] = style[key];
			projection?.applyProjectionStyles(elementStyle, styleProp);
			for (key in vars) elementStyle.setProperty(key, vars[key]);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/styles/scale-border-radius.mjs
		function pixelsToPercent(pixels, axis) {
			if (axis.max === axis.min) return 0;
			return pixels / (axis.max - axis.min) * 100;
		}
		/**
		* We always correct borderRadius as a percentage rather than pixels to reduce paints.
		* For example, if you are projecting a box that is 100px wide with a 10px borderRadius
		* into a box that is 200px wide with a 20px borderRadius, that is actually a 10%
		* borderRadius in both states. If we animate between the two in pixels that will trigger
		* a paint each time. If we animate between the two in percentage we'll avoid a paint.
		*/
		const correctBorderRadius = { correct: (latest, node) => {
			if (!node.target) return latest;
			/**
			* If latest is a string, if it's a percentage we can return immediately as it's
			* going to be stretched appropriately. Otherwise, if it's a pixel, convert it to a number.
			*/
			if (typeof latest === "string") {
				if (px.test(latest)) latest = parseFloat(latest);
				else return latest;
			}
			return `${pixelsToPercent(latest, node.target.x)}% ${pixelsToPercent(latest, node.target.y)}%`;
		} };
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/styles/scale-box-shadow.mjs
		const correctBoxShadow = { correct: (latest, { treeScale, projectionDelta }) => {
			const original = latest;
			const shadow = complex.parse(latest);
			if (shadow.length > 5) return original;
			const template = complex.createTransformer(latest);
			const offset = typeof shadow[0] !== "number" ? 1 : 0;
			const xScale = projectionDelta.x.scale * treeScale.x;
			const yScale = projectionDelta.y.scale * treeScale.y;
			shadow[0 + offset] /= xScale;
			shadow[1 + offset] /= yScale;
			/**
			* Ideally we'd correct x and y scales individually, but because blur and
			* spread apply to both we have to take a scale average and apply that instead.
			* We could potentially improve the outcome of this by incorporating the ratio between
			* the two scales.
			*/
			const averageScale = mixNumber$1(xScale, yScale, .5);
			if (typeof shadow[2 + offset] === "number") shadow[2 + offset] /= averageScale;
			if (typeof shadow[3 + offset] === "number") shadow[3 + offset] /= averageScale;
			return template(shadow);
		} };
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/styles/scale-correction.mjs
		const scaleCorrectors = {
			borderRadius: {
				...correctBorderRadius,
				applyTo: [...cornerRadiusProps]
			},
			borderTopLeftRadius: correctBorderRadius,
			borderTopRightRadius: correctBorderRadius,
			borderBottomLeftRadius: correctBorderRadius,
			borderBottomRightRadius: correctBorderRadius,
			boxShadow: correctBoxShadow
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/is-forced-motion-value.mjs
		function isForcedMotionValue(key, { layout, layoutId }) {
			return transformProps.has(key) || key.startsWith("origin") || (layout || layoutId !== void 0) && (!!scaleCorrectors[key] || key === "opacity");
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/html/utils/scrape-motion-values.mjs
		function scrapeMotionValuesFromProps$1(props, prevProps, visualElement) {
			const style = props.style;
			const prevStyle = prevProps?.style;
			const newValues = {};
			if (!style) return newValues;
			for (const key in style) if (isMotionValue(style[key]) || prevStyle && isMotionValue(prevStyle[key]) || isForcedMotionValue(key, props) || visualElement?.getValue(key)?.liveStyle !== void 0) newValues[key] = style[key];
			return newValues;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/html/HTMLVisualElement.mjs
		function getComputedStyle$1(element) {
			return window.getComputedStyle(element);
		}
		var HTMLVisualElement = class extends DOMVisualElement {
			constructor() {
				super(...arguments);
				this.type = "html";
				this.renderInstance = renderHTML;
			}
			mount(instance) {
				/**
				* If a custom component forwards its ref to something other than a
				* HTML/SVG element (a class instance, an imperative handle) there's
				* nothing for Motion to style, measure or attach gestures to. #2777
				*/
				Boolean(instance.style);
				super.mount(instance);
			}
			readValueFromInstance(instance, key) {
				if (transformProps.has(key)) return this.projection?.isProjecting ? defaultTransformValue(key) : readTransformValue(instance, key);
				else {
					const computedStyle = getComputedStyle$1(instance);
					const value = (isCSSVariableName(key) ? computedStyle.getPropertyValue(key) : computedStyle[key]) || 0;
					return typeof value === "string" ? value.trim() : value;
				}
			}
			measureInstanceViewportBox(instance, { transformPagePoint }) {
				return measureViewportBox(instance, transformPagePoint);
			}
			build(renderState, latestValues, props) {
				buildHTMLStyles(renderState, latestValues, props.transformTemplate);
			}
			scrapeMotionValuesFromProps(props, prevProps, visualElement) {
				return scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/utils/path.mjs
		const dashKeys = {
			offset: "stroke-dashoffset",
			array: "stroke-dasharray"
		};
		const camelKeys = {
			offset: "strokeDashoffset",
			array: "strokeDasharray"
		};
		/**
		* Build SVG path properties. Uses the path's measured length to convert
		* our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
		* and stroke-dasharray attributes.
		*
		* This function is mutative to reduce per-frame GC.
		*
		* Note: We use unitless values for stroke-dasharray and stroke-dashoffset
		* because Safari incorrectly scales px values when the page is zoomed.
		*/
		function buildSVGPath(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
			attrs.pathLength = 1;
			const keys = useDashCase ? dashKeys : camelKeys;
			attrs[keys.offset] = `${-offset}`;
			attrs[keys.array] = `${length} ${spacing}`;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/utils/build-attrs.mjs
		/**
		* CSS Motion Path properties that should remain as CSS styles on SVG elements.
		*/
		const cssMotionPathProperties = [
			"offsetDistance",
			"offsetPath",
			"offsetRotate",
			"offsetAnchor"
		];
		/**
		* Build SVG visual attributes, like cx and style.transform
		*/
		function buildSVGAttrs(state, { attrX, attrY, attrScale, pathLength, pathSpacing = 1, pathOffset = 0, ...latest }, isSVGTag, transformTemplate, styleProp) {
			buildHTMLStyles(state, latest, transformTemplate);
			/**
			* For svg tags we just want to make sure viewBox is animatable and treat all the styles
			* as normal HTML tags.
			*/
			if (isSVGTag) {
				if (state.style.viewBox) state.attrs.viewBox = state.style.viewBox;
				return;
			}
			state.attrs = state.style;
			state.style = {};
			const { attrs, style } = state;
			/**
			* However, we apply transforms as CSS transforms.
			* So if we detect a transform, transformOrigin we take it from attrs and copy it into style.
			*/
			if (attrs.transform) {
				style.transform = attrs.transform;
				delete attrs.transform;
			}
			if (style.transform || attrs.transformOrigin) {
				style.transformOrigin = attrs.transformOrigin ?? "50% 50%";
				delete attrs.transformOrigin;
			}
			if (style.transform) {
				/**
				* SVG's element transform-origin uses its own median as a reference.
				* Therefore, transformBox becomes a fill-box
				*/
				style.transformBox = styleProp?.transformBox ?? "fill-box";
				delete attrs.transformBox;
			}
			for (const key of cssMotionPathProperties) if (attrs[key] !== void 0) {
				style[key] = attrs[key];
				delete attrs[key];
			}
			if (attrX !== void 0) attrs.x = attrX;
			if (attrY !== void 0) attrs.y = attrY;
			if (attrScale !== void 0) attrs.scale = attrScale;
			if (pathLength !== void 0) buildSVGPath(attrs, pathLength, pathSpacing, pathOffset, false);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/utils/camel-case-attrs.mjs
		/**
		* A set of attribute names that are always read/written as camel case.
		*/
		const camelCaseAttributes = /* @__PURE__ */ new Set([
			"baseFrequency",
			"diffuseConstant",
			"kernelMatrix",
			"kernelUnitLength",
			"keySplines",
			"keyTimes",
			"limitingConeAngle",
			"markerHeight",
			"markerWidth",
			"numOctaves",
			"targetX",
			"targetY",
			"surfaceScale",
			"specularConstant",
			"specularExponent",
			"stdDeviation",
			"tableValues",
			"viewBox",
			"gradientTransform",
			"pathLength",
			"startOffset",
			"textLength",
			"lengthAdjust"
		]);
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/utils/is-svg-tag.mjs
		const isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/utils/render.mjs
		function renderSVG(element, renderState, _styleProp, projection) {
			renderHTML(element, renderState, void 0, projection);
			for (const key in renderState.attrs) element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/utils/scrape-motion-values.mjs
		function scrapeMotionValuesFromProps(props, prevProps, visualElement) {
			const newValues = scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
			for (const key in props) if (isMotionValue(props[key]) || isMotionValue(prevProps[key])) {
				const targetKey = transformPropOrder.indexOf(key) !== -1 ? "attr" + key.charAt(0).toUpperCase() + key.substring(1) : key;
				newValues[targetKey] = props[key];
			}
			return newValues;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/svg/SVGVisualElement.mjs
		var SVGVisualElement = class extends DOMVisualElement {
			constructor() {
				super(...arguments);
				this.type = "svg";
				this.isSVGTag = false;
				this.measureInstanceViewportBox = createBox;
			}
			getBaseTargetFromProps(props, key) {
				return props[key];
			}
			readValueFromInstance(instance, key) {
				if (transformProps.has(key)) {
					const defaultType = getDefaultValueType(key);
					return defaultType ? defaultType.default || 0 : 0;
				}
				key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
				return instance.getAttribute(key);
			}
			scrapeMotionValuesFromProps(props, prevProps, visualElement) {
				return scrapeMotionValuesFromProps(props, prevProps, visualElement);
			}
			build(renderState, latestValues, props) {
				buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate, props.style);
			}
			renderInstance(instance, renderState, styleProp, projection) {
				renderSVG(instance, renderState, styleProp, projection);
			}
			mount(instance) {
				this.isSVGTag = isSVGTag(instance.tagName);
				super.mount(instance);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/get-variant-context.mjs
		const numVariantProps = variantProps.length;
		/**
		* Get variant context from a visual element's parent chain.
		* Uses `any` type for visualElement to avoid circular dependencies.
		*/
		function getVariantContext(visualElement) {
			if (!visualElement) return void 0;
			if (!visualElement.isControllingVariants) {
				const context = visualElement.parent ? getVariantContext(visualElement.parent) || {} : {};
				if (visualElement.props.initial !== void 0) context.initial = visualElement.props.initial;
				return context;
			}
			const context = {};
			for (let i = 0; i < numVariantProps; i++) {
				const name = variantProps[i];
				const prop = visualElement.props[name];
				if (isVariantLabel(prop) || prop === false) context[name] = prop;
			}
			return context;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/shallow-compare.mjs
		function shallowCompare(next, prev) {
			if (!Array.isArray(prev)) return false;
			const prevLength = prev.length;
			if (prevLength !== next.length) return false;
			for (let i = 0; i < prevLength; i++) if (prev[i] !== next[i]) return false;
			return true;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/render/utils/animation-state.mjs
		const reversePriorityOrder = [...variantPriorityOrder].reverse();
		const numAnimationTypes = variantPriorityOrder.length;
		function createAnimateFunction(visualElement) {
			return (animations) => {
				return Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
			};
		}
		function createAnimationState(visualElement) {
			let animate = createAnimateFunction(visualElement);
			let state = createState();
			let isInitialRender = true;
			/**
			* Track whether the animation state has been reset (e.g. via StrictMode
			* double-invocation or Suspense unmount/remount). On the first
			* animateChanges() call after a reset we need to behave like the initial
			* render for variant-inheritance checks, even though isInitialRender is
			* already false.
			*/
			let wasReset = false;
			/**
			* This function will be used to reduce the animation definitions for
			* each active animation type into an object of resolved values for it.
			*/
			const buildResolvedTypeValues = (type) => (acc, definition) => {
				const resolved = resolveVariant(visualElement, definition, type === "exit" ? visualElement.presenceContext?.custom : void 0);
				if (resolved) {
					const { transition, transitionEnd, ...target } = resolved;
					acc = {
						...acc,
						...target,
						...transitionEnd
					};
				}
				return acc;
			};
			/**
			* This just allows us to inject mocked animation functions
			* @internal
			*/
			function setAnimateFunction(makeAnimator) {
				animate = makeAnimator(visualElement);
			}
			/**
			* When we receive new props, we need to:
			* 1. Create a list of protected keys for each type. This is a directory of
			*    value keys that are currently being "handled" by types of a higher priority
			*    so that whenever an animation is played of a given type, these values are
			*    protected from being animated.
			* 2. Determine if an animation type needs animating.
			* 3. Determine if any values have been removed from a type and figure out
			*    what to animate those to.
			*/
			function animateChanges(changedActiveType) {
				const { props } = visualElement;
				const context = getVariantContext(visualElement.parent) || {};
				/**
				* A list of animations that we'll build into as we iterate through the animation
				* types. This will get executed at the end of the function.
				*/
				const animations = [];
				/**
				* Keep track of which values have been removed. Then, as we hit lower priority
				* animation types, we can check if they contain removed values and animate to that.
				*/
				const removedKeys = /* @__PURE__ */ new Set();
				/**
				* A dictionary of all encountered keys. This is an object to let us build into and
				* copy it without iteration. Each time we hit an animation type we set its protected
				* keys - the keys its not allowed to animate - to the latest version of this object.
				*/
				let encounteredKeys = {};
				/**
				* If a variant has been removed at a given index, and this component is controlling
				* variant animations, we want to ensure lower-priority variants are forced to animate.
				*/
				let removedVariantIndex = Infinity;
				/**
				* Iterate through all animation types in reverse priority order. For each, we want to
				* detect which values it's handling and whether or not they've changed (and therefore
				* need to be animated). If any values have been removed, we want to detect those in
				* lower priority props and flag for animation.
				*/
				for (let i = 0; i < numAnimationTypes; i++) {
					const type = reversePriorityOrder[i];
					const typeState = state[type];
					const prop = props[type] !== void 0 ? props[type] : context[type];
					const propIsVariant = isVariantLabel(prop);
					/**
					* If this type has *just* changed isActive status, set activeDelta
					* to that status. Otherwise set to null.
					*/
					const activeDelta = type === changedActiveType ? typeState.isActive : null;
					if (activeDelta === false) removedVariantIndex = i;
					/**
					* If this prop is an inherited variant, rather than been set directly on the
					* component itself, we want to make sure we allow the parent to trigger animations.
					*
					* TODO: Can probably change this to a !isControllingVariants check
					*/
					let isInherited = prop === context[type] && prop !== props[type] && propIsVariant;
					if (isInherited && (isInitialRender || wasReset) && visualElement.manuallyAnimateOnMount) isInherited = false;
					/**
					* Set all encountered keys so far as the protected keys for this type. This will
					* be any key that has been animated or otherwise handled by active, higher-priortiy types.
					*/
					typeState.protectedKeys = { ...encounteredKeys };
					if (!typeState.isActive && activeDelta === null || !prop && !typeState.prevProp || isAnimationControls(prop) || typeof prop === "boolean") continue;
					/**
					* If exit is already active and wasn't just activated, skip
					* re-processing to prevent interrupting running exit animations.
					* Re-resolving exit with a changed custom value can start new
					* value animations that stop the originals, leaving the exit
					* animation promise unresolved and the component stuck in the DOM.
					*/
					if (type === "exit" && typeState.isActive && activeDelta !== true) {
						if (typeState.prevResolvedValues) encounteredKeys = {
							...encounteredKeys,
							...typeState.prevResolvedValues
						};
						continue;
					}
					/**
					* As we go look through the values defined on this type, if we detect
					* a changed value or a value that was removed in a higher priority, we set
					* this to true and add this prop to the animation list.
					*/
					const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
					let shouldAnimateType = variantDidChange || type === changedActiveType && typeState.isActive && !isInherited && propIsVariant || i > removedVariantIndex && propIsVariant;
					let handledRemovedValues = false;
					/**
					* As animations can be set as variant lists, variants or target objects, we
					* coerce everything to an array if it isn't one already
					*/
					const definitionList = Array.isArray(prop) ? prop : [prop];
					/**
					* Build an object of all the resolved values. We'll use this in the subsequent
					* animateChanges calls to determine whether a value has changed.
					*/
					let resolvedValues = definitionList.reduce(buildResolvedTypeValues(type), {});
					if (activeDelta === false) resolvedValues = {};
					/**
					* Now we need to loop through all the keys in the prev prop and this prop,
					* and decide:
					* 1. If the value has changed, and needs animating
					* 2. If it has been removed, and needs adding to the removedKeys set
					* 3. If it has been removed in a higher priority type and needs animating
					* 4. If it hasn't been removed in a higher priority but hasn't changed, and
					*    needs adding to the type's protectedKeys list.
					*/
					const { prevResolvedValues = {} } = typeState;
					const allKeys = {
						...prevResolvedValues,
						...resolvedValues
					};
					const markToAnimate = (key) => {
						shouldAnimateType = true;
						if (removedKeys.has(key)) {
							handledRemovedValues = true;
							removedKeys.delete(key);
						}
						typeState.needsAnimating[key] = true;
						const motionValue = visualElement.getValue(key);
						if (motionValue) motionValue.liveStyle = false;
					};
					for (const key in allKeys) {
						const next = resolvedValues[key];
						const prev = prevResolvedValues[key];
						if (encounteredKeys.hasOwnProperty(key)) continue;
						/**
						* If the value has changed, we probably want to animate it.
						*/
						let valueHasChanged = false;
						if (isKeyframesTarget(next) && isKeyframesTarget(prev)) valueHasChanged = !shallowCompare(next, prev) || variantDidChange;
						else valueHasChanged = next !== prev;
						if (valueHasChanged) {
							if (next !== void 0 && next !== null) markToAnimate(key);
							else removedKeys.add(key);
						} else if (next !== void 0 && removedKeys.has(key))
 /**
						* If next hasn't changed and it isn't undefined, we want to check if it's
						* been removed by a higher priority
						*/
						markToAnimate(key);
						else
 /**
						* If it hasn't changed, we add it to the list of protected values
						* to ensure it doesn't get animated.
						*/
						typeState.protectedKeys[key] = true;
					}
					/**
					* Update the typeState so next time animateChanges is called we can compare the
					* latest prop and resolvedValues to these.
					*/
					typeState.prevProp = prop;
					typeState.prevResolvedValues = resolvedValues;
					if (typeState.isActive) encounteredKeys = {
						...encounteredKeys,
						...resolvedValues
					};
					if ((isInitialRender || wasReset) && visualElement.blockInitialAnimation) shouldAnimateType = false;
					/**
					* If this is an inherited prop we want to skip this animation
					* unless the inherited variants haven't changed on this render.
					*/
					const willAnimateViaParent = isInherited && variantDidChange;
					if (shouldAnimateType && (!willAnimateViaParent || handledRemovedValues)) animations.push(...definitionList.map((animation) => {
						const options = { type };
						/**
						* If we're performing the initial animation, but we're not
						* rendering at the same time as the variant-controlling parent,
						* we want to use the parent's transition to calculate the stagger.
						*/
						if (typeof animation === "string" && (isInitialRender || wasReset) && !willAnimateViaParent && visualElement.manuallyAnimateOnMount && visualElement.parent) {
							const { parent } = visualElement;
							const parentVariant = resolveVariant(parent, animation);
							if (parent.enteringChildren && parentVariant) {
								const { delayChildren } = parentVariant.transition || {};
								options.delay = calcChildStagger(parent.enteringChildren, visualElement, delayChildren);
							}
						}
						return {
							animation,
							options
						};
					}));
				}
				/**
				* If there are some removed value that haven't been dealt with,
				* we need to create a new animation that falls back either to the value
				* defined in the style prop, or the last read value.
				*/
				if (removedKeys.size) {
					const fallbackAnimation = {};
					/**
					* If the initial prop contains a transition we can use that, otherwise
					* allow the animation function to use the visual element's default.
					*/
					if (typeof props.initial !== "boolean") {
						const initialTransition = resolveVariant(visualElement, Array.isArray(props.initial) ? props.initial[0] : props.initial);
						if (initialTransition && initialTransition.transition) fallbackAnimation.transition = initialTransition.transition;
					}
					removedKeys.forEach((key) => {
						const fallbackTarget = visualElement.getBaseTarget(key);
						const motionValue = visualElement.getValue(key);
						if (motionValue) motionValue.liveStyle = true;
						fallbackAnimation[key] = fallbackTarget ?? null;
					});
					animations.push({ animation: fallbackAnimation });
				}
				let shouldAnimate = Boolean(animations.length);
				if (isInitialRender && (props.initial === false || props.initial === props.animate) && !visualElement.manuallyAnimateOnMount) shouldAnimate = false;
				isInitialRender = false;
				wasReset = false;
				return shouldAnimate ? animate(animations) : Promise.resolve();
			}
			/**
			* Change whether a certain animation type is active.
			*/
			function setActive(type, isActive) {
				if (state[type].isActive === isActive) return Promise.resolve();
				visualElement.variantChildren?.forEach((child) => child.animationState?.setActive(type, isActive));
				state[type].isActive = isActive;
				const animations = animateChanges(type);
				for (const key in state) state[key].protectedKeys = {};
				return animations;
			}
			return {
				animateChanges,
				setActive,
				setAnimateFunction,
				getState: () => state,
				reset: () => {
					state = createState();
					wasReset = true;
				}
			};
		}
		function checkVariantsDidChange(prev, next) {
			if (typeof next === "string") return next !== prev;
			else if (Array.isArray(next)) return !shallowCompare(next, prev);
			return false;
		}
		function createTypeState(isActive = false) {
			return {
				isActive,
				protectedKeys: {},
				needsAnimating: {},
				prevResolvedValues: {}
			};
		}
		function createState() {
			return {
				animate: createTypeState(true),
				whileInView: createTypeState(),
				whileHover: createTypeState(),
				whileTap: createTypeState(),
				whileDrag: createTypeState(),
				whileFocus: createTypeState(),
				exit: createTypeState()
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/copy.mjs
		/**
		* Reset an axis to the provided origin box.
		*
		* This is a mutative operation.
		*/
		function copyAxisInto(axis, originAxis) {
			axis.min = originAxis.min;
			axis.max = originAxis.max;
		}
		/**
		* Reset a box to the provided origin box.
		*
		* This is a mutative operation.
		*/
		function copyBoxInto(box, originBox) {
			copyAxisInto(box.x, originBox.x);
			copyAxisInto(box.y, originBox.y);
		}
		/**
		* Reset a delta to the provided origin box.
		*
		* This is a mutative operation.
		*/
		function copyAxisDeltaInto(delta, originDelta) {
			delta.translate = originDelta.translate;
			delta.scale = originDelta.scale;
			delta.originPoint = originDelta.originPoint;
			delta.origin = originDelta.origin;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/delta-calc.mjs
		const SCALE_MIN = .9999;
		const SCALE_MAX = 1.0001;
		const TRANSLATE_MIN = -.01;
		const TRANSLATE_MAX = .01;
		function calcLength(axis) {
			return axis.max - axis.min;
		}
		function isNear(value, target, maxDistance) {
			return Math.abs(value - target) <= maxDistance;
		}
		function calcAxisDelta(delta, source, target, origin = .5) {
			delta.origin = origin;
			delta.originPoint = mixNumber$1(source.min, source.max, delta.origin);
			delta.scale = calcLength(target) / calcLength(source);
			delta.translate = mixNumber$1(target.min, target.max, delta.origin) - delta.originPoint;
			if (delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX || isNaN(delta.scale)) delta.scale = 1;
			if (delta.translate >= TRANSLATE_MIN && delta.translate <= TRANSLATE_MAX || isNaN(delta.translate)) delta.translate = 0;
		}
		function calcBoxDelta(delta, source, target, origin) {
			calcAxisDelta(delta.x, source.x, target.x, origin ? origin.originX : void 0);
			calcAxisDelta(delta.y, source.y, target.y, origin ? origin.originY : void 0);
		}
		function calcRelativeAxis(target, relative, parent, anchor = 0) {
			target.min = (anchor ? mixNumber$1(parent.min, parent.max, anchor) : parent.min) + relative.min;
			target.max = target.min + calcLength(relative);
		}
		function calcRelativeBox(target, relative, parent, anchor) {
			calcRelativeAxis(target.x, relative.x, parent.x, anchor?.x);
			calcRelativeAxis(target.y, relative.y, parent.y, anchor?.y);
		}
		function calcRelativeAxisPosition(target, layout, parent, anchor = 0) {
			const anchorPoint = anchor ? mixNumber$1(parent.min, parent.max, anchor) : parent.min;
			target.min = layout.min - anchorPoint;
			target.max = target.min + calcLength(layout);
		}
		function calcRelativePosition(target, layout, parent, anchor) {
			calcRelativeAxisPosition(target.x, layout.x, parent.x, anchor?.x);
			calcRelativeAxisPosition(target.y, layout.y, parent.y, anchor?.y);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/delta-remove.mjs
		/**
		* Remove a delta from a point. This is essentially the steps of applyPointDelta in reverse
		*/
		function removePointDelta(point, translate, scale, originPoint, boxScale) {
			point -= translate;
			point = scalePoint(point, 1 / scale, originPoint);
			if (boxScale !== void 0) point = scalePoint(point, 1 / boxScale, originPoint);
			return point;
		}
		/**
		* Remove a delta from an axis. This is essentially the steps of applyAxisDelta in reverse
		*/
		function removeAxisDelta(axis, translate = 0, scale = 1, origin = .5, boxScale, originAxis = axis, sourceAxis = axis) {
			if (percent.test(translate)) {
				translate = parseFloat(translate);
				translate = mixNumber$1(sourceAxis.min, sourceAxis.max, translate / 100) - sourceAxis.min;
			}
			if (typeof translate !== "number") return;
			let originPoint = mixNumber$1(originAxis.min, originAxis.max, origin);
			if (axis === originAxis) originPoint -= translate;
			axis.min = removePointDelta(axis.min, translate, scale, originPoint, boxScale);
			axis.max = removePointDelta(axis.max, translate, scale, originPoint, boxScale);
		}
		/**
		* Remove a transforms from an axis. This is essentially the steps of applyAxisTransforms in reverse
		* and acts as a bridge between motion values and removeAxisDelta
		*/
		function removeAxisTransforms(axis, transforms, [key, scaleKey, originKey], origin, sourceAxis) {
			removeAxisDelta(axis, transforms[key], transforms[scaleKey], transforms[originKey], transforms.scale, origin, sourceAxis);
		}
		/**
		* The names of the motion values we want to apply as translation, scale and origin.
		*/
		const xKeys = [
			"x",
			"scaleX",
			"originX"
		];
		const yKeys = [
			"y",
			"scaleY",
			"originY"
		];
		/**
		* Remove a transforms from an box. This is essentially the steps of applyAxisBox in reverse
		* and acts as a bridge between motion values and removeAxisDelta
		*/
		function removeBoxTransforms(box, transforms, originBox, sourceBox) {
			removeAxisTransforms(box.x, transforms, xKeys, originBox ? originBox.x : void 0, sourceBox ? sourceBox.x : void 0);
			removeAxisTransforms(box.y, transforms, yKeys, originBox ? originBox.y : void 0, sourceBox ? sourceBox.y : void 0);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/geometry/utils.mjs
		function isAxisDeltaZero(delta) {
			return delta.translate === 0 && delta.scale === 1;
		}
		function isDeltaZero(delta) {
			return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);
		}
		function axisEquals(a, b) {
			return a.min === b.min && a.max === b.max;
		}
		function boxEquals(a, b) {
			return axisEquals(a.x, b.x) && axisEquals(a.y, b.y);
		}
		function axisEqualsRounded(a, b) {
			return Math.round(a.min) === Math.round(b.min) && Math.round(a.max) === Math.round(b.max);
		}
		function boxEqualsRounded(a, b) {
			return axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y);
		}
		function aspectRatio(box) {
			return calcLength(box.x) / calcLength(box.y);
		}
		function axisDeltaEquals(a, b) {
			return a.translate === b.translate && a.scale === b.scale && a.originPoint === b.originPoint;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/utils/each-axis.mjs
		function eachAxis(callback) {
			return [callback("x"), callback("y")];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/styles/transform.mjs
		function buildProjectionTransform(delta, treeScale, latestTransform) {
			let transform = "";
			/**
			* The translations we use to calculate are always relative to the viewport coordinate space.
			* But when we apply scales, we also scale the coordinate space of an element and its children.
			* For instance if we have a treeScale (the culmination of all parent scales) of 0.5 and we need
			* to move an element 100 pixels, we actually need to move it 200 in within that scaled space.
			*/
			const xTranslate = delta.x.translate / treeScale.x;
			const yTranslate = delta.y.translate / treeScale.y;
			const zTranslate = latestTransform?.z || 0;
			if (xTranslate || yTranslate || zTranslate) transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `;
			/**
			* Apply scale correction for the tree transform.
			* This will apply scale to the screen-orientated axes.
			*/
			if (treeScale.x !== 1 || treeScale.y !== 1) transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `;
			if (latestTransform) {
				const { transformPerspective, rotate, pathRotation, rotateX, rotateY, skewX, skewY } = latestTransform;
				if (transformPerspective) transform = `perspective(${transformPerspective}px) ${transform}`;
				if (rotate) transform += `rotate(${rotate}deg) `;
				if (pathRotation) transform += `rotate(${pathRotation}deg) `;
				if (rotateX) transform += `rotateX(${rotateX}deg) `;
				if (rotateY) transform += `rotateY(${rotateY}deg) `;
				if (skewX) transform += `skewX(${skewX}deg) `;
				if (skewY) transform += `skewY(${skewY}deg) `;
			}
			/**
			* Apply scale to match the size of the element to the size we want it.
			* This will apply scale to the element-orientated axes.
			*/
			const elementScaleX = delta.x.scale * treeScale.x;
			const elementScaleY = delta.y.scale * treeScale.y;
			if (elementScaleX !== 1 || elementScaleY !== 1) transform += `scale(${elementScaleX}, ${elementScaleY})`;
			return transform || "none";
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/animation/mix-values.mjs
		const numBorders = cornerRadiusProps.length;
		const asNumber = (value) => typeof value === "string" ? parseFloat(value) : value;
		const isPx = (value) => typeof value === "number" || px.test(value);
		function mixValues(target, follow, lead, progress, shouldCrossfadeOpacity, isOnlyMember) {
			if (shouldCrossfadeOpacity) {
				target.opacity = mixNumber$1(0, lead.opacity ?? 1, easeCrossfadeIn(progress));
				target.opacityExit = mixNumber$1(follow.opacity ?? 1, 0, easeCrossfadeOut(progress));
			} else if (isOnlyMember) target.opacity = mixNumber$1(follow.opacity ?? 1, lead.opacity ?? 1, progress);
			/**
			* Mix border radius
			*/
			for (let i = 0; i < numBorders; i++) {
				const borderLabel = cornerRadiusProps[i];
				let followRadius = getRadius(follow, borderLabel);
				let leadRadius = getRadius(lead, borderLabel);
				if (followRadius === void 0 && leadRadius === void 0) continue;
				followRadius || (followRadius = 0);
				leadRadius || (leadRadius = 0);
				if (followRadius === 0 || leadRadius === 0 || isPx(followRadius) === isPx(leadRadius)) {
					target[borderLabel] = Math.max(mixNumber$1(asNumber(followRadius), asNumber(leadRadius), progress), 0);
					if (percent.test(leadRadius) || percent.test(followRadius)) target[borderLabel] += "%";
				} else target[borderLabel] = leadRadius;
			}
			/**
			* Mix rotation
			*/
			if (follow.rotate || lead.rotate) target.rotate = mixNumber$1(follow.rotate || 0, lead.rotate || 0, progress);
		}
		function getRadius(values, radiusName) {
			return values[radiusName] !== void 0 ? values[radiusName] : values.borderRadius;
		}
		const easeCrossfadeIn = /*@__PURE__*/ compress(0, .5, circOut);
		const easeCrossfadeOut = /*@__PURE__*/ compress(.5, .95, noop);
		function compress(min, max, easing) {
			return (p) => {
				if (p < min) return 0;
				if (p > max) return 1;
				return easing(/* @__PURE__ */ progress(min, max, p));
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/animation/animate/single-value.mjs
		function animateSingleValue(value, keyframes, options) {
			const motionValue$1 = isMotionValue(value) ? value : motionValue(value);
			motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
			return motionValue$1.animation;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/events/add-dom-event.mjs
		function addDomEvent(target, eventName, handler, options = { passive: true }) {
			target.addEventListener(eventName, handler, options);
			return () => target.removeEventListener(eventName, handler, options);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/utils/compare-by-depth.mjs
		const compareByDepth = (a, b) => a.depth - b.depth;
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/utils/flat-tree.mjs
		var FlatTree = class {
			constructor() {
				this.children = [];
				this.isDirty = false;
			}
			add(child) {
				addUniqueItem(this.children, child);
				this.isDirty = true;
			}
			remove(child) {
				removeItem(this.children, child);
				this.isDirty = true;
			}
			forEach(callback) {
				this.isDirty && this.children.sort(compareByDepth);
				this.isDirty = false;
				this.children.forEach(callback);
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/utils/delay.mjs
		/**
		* Timeout defined in ms
		*/
		function delay(callback, timeout) {
			const start = time.now();
			const checkElapsed = ({ timestamp }) => {
				const elapsed = timestamp - start;
				if (elapsed >= timeout) {
					cancelFrame(checkElapsed);
					callback(elapsed - timeout);
				}
			};
			frame.setup(checkElapsed, true);
			return () => cancelFrame(checkElapsed);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/value/utils/resolve-motion-value.mjs
		/**
		* If the provided value is a MotionValue, this returns the actual value, otherwise just the value itself
		*/
		function resolveMotionValue(value) {
			return isMotionValue(value) ? value.get() : value;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/shared/stack.mjs
		var NodeStack = class {
			constructor() {
				this.members = [];
			}
			add(node) {
				addUniqueItem(this.members, node);
				for (let i = this.members.length - 1; i >= 0; i--) {
					const member = this.members[i];
					if (member === node || member === this.lead || member === this.prevLead) continue;
					const inst = member.instance;
					if ((!inst || inst.isConnected === false) && !member.snapshot) {
						removeItem(this.members, member);
						member.unmount();
					}
				}
				node.scheduleRender();
			}
			remove(node) {
				removeItem(this.members, node);
				if (node === this.prevLead) this.prevLead = void 0;
				if (node === this.lead) {
					const prevLead = this.members[this.members.length - 1];
					if (prevLead) this.promote(prevLead);
				}
			}
			relegate(node) {
				for (let i = this.members.indexOf(node) - 1; i >= 0; i--) {
					const member = this.members[i];
					if (member.isPresent !== false && member.instance?.isConnected !== false) {
						this.promote(member);
						return true;
					}
				}
				return false;
			}
			promote(node, preserveFollowOpacity) {
				const prevLead = this.lead;
				if (node === prevLead) return;
				this.prevLead = prevLead;
				this.lead = node;
				node.show();
				if (prevLead) {
					prevLead.updateSnapshot();
					node.scheduleRender();
					const { layoutDependency: prevDep } = prevLead.options;
					const { layoutDependency: nextDep } = node.options;
					if (prevDep === void 0 || prevDep !== nextDep) {
						node.resumeFrom = prevLead;
						if (preserveFollowOpacity) prevLead.preserveOpacity = true;
						if (prevLead.snapshot) {
							node.snapshot = prevLead.snapshot;
							node.snapshot.latestValues = prevLead.animationValues || prevLead.latestValues;
						}
						if (node.root?.isUpdating) node.isLayoutDirty = true;
					}
					if (node.options.crossfade === false) prevLead.hide();
				}
			}
			exitAnimationComplete() {
				this.members.forEach((member) => {
					member.options.onExitComplete?.();
					member.resumingFrom?.options.onExitComplete?.();
				});
			}
			scheduleRender() {
				this.members.forEach((member) => member.instance && member.scheduleRender(false));
			}
			removeLeadSnapshot() {
				if (this.lead?.snapshot) this.lead.snapshot = void 0;
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/node/state.mjs
		/**
		* This should only ever be modified on the client otherwise it'll
		* persist through server requests. If we need instanced states we
		* could lazy-init via root.
		*/
		const globalProjectionState = {
			/**
			* Global flag as to whether the tree has animated since the last time
			* we resized the window
			*/
			hasAnimatedSinceResize: true,
			/**
			* We set this to true once, on the first update. Any nodes added to the tree beyond that
			* update will be given a `data-projection-id` attribute.
			*/
			hasEverUpdated: false
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/node/create-projection-node.mjs
		const metrics = {
			nodes: 0,
			calculatedTargetDeltas: 0,
			calculatedProjections: 0
		};
		const transformAxes = [
			"",
			"X",
			"Y",
			"Z"
		];
		/**
		* We use 1000 as the animation target as 0-1000 maps better to pixels than 0-1
		* which has a noticeable difference in spring animations
		*/
		const animationTarget = 1e3;
		let id$1 = 0;
		function resetDistortingTransform(key, visualElement, values, sharedAnimationValues) {
			const { latestValues } = visualElement;
			if (latestValues[key]) {
				values[key] = latestValues[key];
				visualElement.setStaticValue(key, 0);
				if (sharedAnimationValues) sharedAnimationValues[key] = 0;
			}
		}
		function cancelTreeOptimisedTransformAnimations(projectionNode) {
			projectionNode.hasCheckedOptimisedAppear = true;
			if (projectionNode.root === projectionNode) return;
			const { visualElement } = projectionNode.options;
			if (!visualElement) return;
			const appearId = getOptimisedAppearId(visualElement);
			if (window.MotionHasOptimisedAnimation(appearId, "transform")) {
				const { layout, layoutId } = projectionNode.options;
				window.MotionCancelOptimisedAnimation(appearId, "transform", frame, !(layout || layoutId));
			}
			const { parent } = projectionNode;
			if (parent && !parent.hasCheckedOptimisedAppear) cancelTreeOptimisedTransformAnimations(parent);
		}
		function createProjectionNode$1({ attachResizeListener, defaultParent, measureScroll, checkIsScrollRoot, resetTransform }) {
			return class ProjectionNode {
				constructor(latestValues = {}, parent = defaultParent?.()) {
					/**
					* A unique ID generated for every projection node.
					*/
					this.id = id$1++;
					/**
					* An id that represents a unique session instigated by startUpdate.
					*/
					this.animationId = 0;
					this.animationCommitId = 0;
					/**
					* A Set containing all this component's children. This is used to iterate
					* through the children.
					*
					* TODO: This could be faster to iterate as a flat array stored on the root node.
					*/
					this.children = /* @__PURE__ */ new Set();
					/**
					* Options for the node. We use this to configure what kind of layout animations
					* we should perform (if any).
					*/
					this.options = {};
					/**
					* We use this to detect when its safe to shut down part of a projection tree.
					* We have to keep projecting children for scale correction and relative projection
					* until all their parents stop performing layout animations.
					*/
					this.isTreeAnimating = false;
					this.isAnimationBlocked = false;
					/**
					* Flag to true if we think this layout has been changed. We can't always know this,
					* currently we set it to true every time a component renders, or if it has a layoutDependency
					* if that has changed between renders. Additionally, components can be grouped by LayoutGroup
					* and if one node is dirtied, they all are.
					*/
					this.isLayoutDirty = false;
					/**
					* Flag to true if we think the projection calculations for this node needs
					* recalculating as a result of an updated transform or layout animation.
					*/
					this.isProjectionDirty = false;
					/**
					* Flag to true if the layout *or* transform has changed. This then gets propagated
					* throughout the projection tree, forcing any element below to recalculate on the next frame.
					*/
					this.isSharedProjectionDirty = false;
					/**
					* Flag transform dirty. This gets propagated throughout the whole tree but is only
					* respected by shared nodes.
					*/
					this.isTransformDirty = false;
					/**
					* Block layout updates for instant layout transitions throughout the tree.
					*/
					this.updateManuallyBlocked = false;
					this.updateBlockedByResize = false;
					/**
					* Set to true between the start of the first `willUpdate` call and the end of the `didUpdate`
					* call.
					*/
					this.isUpdating = false;
					/**
					* If this is an SVG element we currently disable projection transforms
					*/
					this.isSVG = false;
					/**
					* Flag to true (during promotion) if a node doing an instant layout transition needs to reset
					* its projection styles.
					*/
					this.needsReset = false;
					/**
					* Flags whether this node should have its transform reset prior to measuring.
					*/
					this.shouldResetTransform = false;
					/**
					* Store whether this node has been checked for optimised appear animations. As
					* effects fire bottom-up, and we want to look up the tree for appear animations,
					* this makes sure we only check each path once, stopping at nodes that
					* have already been checked.
					*/
					this.hasCheckedOptimisedAppear = false;
					/**
					* An object representing the calculated contextual/accumulated/tree scale.
					* This will be used to scale calculcated projection transforms, as these are
					* calculated in screen-space but need to be scaled for elements to layoutly
					* make it to their calculated destinations.
					*
					* TODO: Lazy-init
					*/
					this.treeScale = {
						x: 1,
						y: 1
					};
					/**
					*
					*/
					this.eventHandlers = /* @__PURE__ */ new Map();
					this.hasTreeAnimated = false;
					this.layoutVersion = 0;
					this.updateScheduled = false;
					this.scheduleUpdate = () => this.update();
					this.projectionUpdateScheduled = false;
					this.checkUpdateFailed = () => {
						if (this.isUpdating) {
							this.isUpdating = false;
							this.clearAllSnapshots();
						}
					};
					/**
					* This is a multi-step process as shared nodes might be of different depths. Nodes
					* are sorted by depth order, so we need to resolve the entire tree before moving to
					* the next step.
					*/
					this.updateProjection = () => {
						this.projectionUpdateScheduled = false;
						/**
						* Reset debug counts. Manually resetting rather than creating a new
						* object each frame.
						*/
						if (statsBuffer.value) metrics.nodes = metrics.calculatedTargetDeltas = metrics.calculatedProjections = 0;
						this.nodes.forEach(propagateDirtyNodes);
						this.nodes.forEach(resolveTargetDelta);
						this.nodes.forEach(calcProjection);
						this.nodes.forEach(cleanDirtyNodes);
						if (statsBuffer.addProjectionMetrics) statsBuffer.addProjectionMetrics(metrics);
					};
					/**
					* Frame calculations
					*/
					this.resolvedRelativeTargetAt = 0;
					this.linkedParentVersion = 0;
					this.hasProjected = false;
					this.isVisible = true;
					this.animationProgress = 0;
					/**
					* Shared layout
					*/
					this.sharedNodes = /* @__PURE__ */ new Map();
					this.latestValues = latestValues;
					this.root = parent ? parent.root || parent : this;
					this.path = parent ? [...parent.path, parent] : [];
					this.parent = parent;
					this.depth = parent ? parent.depth + 1 : 0;
					for (let i = 0; i < this.path.length; i++) this.path[i].shouldResetTransform = true;
					if (this.root === this) this.nodes = new FlatTree();
				}
				addEventListener(name, handler) {
					if (!this.eventHandlers.has(name)) this.eventHandlers.set(name, new SubscriptionManager());
					return this.eventHandlers.get(name).add(handler);
				}
				notifyListeners(name, ...args) {
					const subscriptionManager = this.eventHandlers.get(name);
					subscriptionManager && subscriptionManager.notify(...args);
				}
				hasListeners(name) {
					return this.eventHandlers.has(name);
				}
				/**
				* Lifecycles
				*/
				mount(instance) {
					if (this.instance) return;
					this.isSVG = isSVGElement(instance) && !isSVGSVGElement(instance);
					this.instance = instance;
					const { layoutId, layout, visualElement } = this.options;
					if (visualElement && !visualElement.current) visualElement.mount(instance);
					this.root.nodes.add(this);
					this.parent && this.parent.children.add(this);
					if (this.root.hasTreeAnimated && (layout || layoutId)) this.isLayoutDirty = true;
					if (attachResizeListener) {
						let cancelDelay;
						let innerWidth = 0;
						const resizeUnblockUpdate = () => this.root.updateBlockedByResize = false;
						frame.read(() => {
							innerWidth = window.innerWidth;
						});
						attachResizeListener(instance, () => {
							const newInnerWidth = window.innerWidth;
							if (newInnerWidth === innerWidth) return;
							innerWidth = newInnerWidth;
							this.root.updateBlockedByResize = true;
							cancelDelay && cancelDelay();
							cancelDelay = delay(resizeUnblockUpdate, 250);
							if (globalProjectionState.hasAnimatedSinceResize) {
								globalProjectionState.hasAnimatedSinceResize = false;
								this.nodes.forEach(finishAnimation);
							}
						});
					}
					if (layoutId) this.root.registerSharedNode(layoutId, this);
					if (this.options.animate !== false && visualElement && (layoutId || layout)) this.addEventListener("didUpdate", ({ delta, hasLayoutChanged, hasRelativeLayoutChanged, layout: newLayout }) => {
						if (this.isTreeAnimationBlocked()) {
							this.target = void 0;
							this.relativeTarget = void 0;
							return;
						}
						const layoutTransition = this.options.transition || visualElement.getDefaultTransition() || defaultLayoutTransition;
						const { onLayoutAnimationStart, onLayoutAnimationComplete } = visualElement.getProps();
						/**
						* The target layout of the element might stay the same,
						* but its position relative to its parent has changed.
						*/
						const hasTargetChanged = !this.targetLayout || !boxEqualsRounded(this.targetLayout, newLayout);
						/**
						* If the layout hasn't seemed to have changed, it might be that the
						* element is visually in the same place in the document but its position
						* relative to its parent has indeed changed. So here we check for that.
						*/
						const hasOnlyRelativeTargetChanged = !hasLayoutChanged && hasRelativeLayoutChanged;
						if (this.options.layoutRoot || this.resumeFrom || hasOnlyRelativeTargetChanged || hasLayoutChanged && (hasTargetChanged || !this.currentAnimation)) {
							if (this.resumeFrom) {
								this.resumingFrom = this.resumeFrom;
								this.resumingFrom.resumingFrom = void 0;
							}
							const animationOptions = {
								...getValueTransition(layoutTransition, "layout"),
								onPlay: onLayoutAnimationStart,
								onComplete: onLayoutAnimationComplete
							};
							if (visualElement.shouldReduceMotion || this.options.layoutRoot) {
								animationOptions.delay = 0;
								animationOptions.type = false;
							}
							this.startAnimation(animationOptions);
							/**
							* Set animation origin after starting animation to avoid layout jump
							* caused by stopping previous layout animation
							*/
							this.setAnimationOrigin(delta, hasOnlyRelativeTargetChanged, animationOptions.path);
						} else {
							/**
							* If the layout hasn't changed and we have an animation that hasn't started yet,
							* finish it immediately. Otherwise it will be animating from a location
							* that was probably never committed to screen and look like a jumpy box.
							*/
							if (!hasLayoutChanged) finishAnimation(this);
							if (this.isLead() && this.options.onExitComplete) this.options.onExitComplete();
						}
						this.targetLayout = newLayout;
					});
				}
				unmount() {
					this.options.layoutId && this.willUpdate();
					this.root.nodes.remove(this);
					const stack = this.getStack();
					stack && stack.remove(this);
					this.parent && this.parent.children.delete(this);
					this.instance = void 0;
					this.eventHandlers.clear();
					cancelFrame(this.updateProjection);
				}
				blockUpdate() {
					this.updateManuallyBlocked = true;
				}
				unblockUpdate() {
					this.updateManuallyBlocked = false;
				}
				isUpdateBlocked() {
					return this.updateManuallyBlocked || this.updateBlockedByResize;
				}
				isTreeAnimationBlocked() {
					return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || false;
				}
				startUpdate() {
					if (this.isUpdateBlocked()) return;
					this.isUpdating = true;
					this.nodes && this.nodes.forEach(resetSkewAndRotation);
					this.animationId++;
				}
				getTransformTemplate() {
					const { visualElement } = this.options;
					return visualElement && visualElement.getProps().transformTemplate;
				}
				willUpdate(shouldNotifyListeners = true) {
					this.root.hasTreeAnimated = true;
					if (this.root.isUpdateBlocked()) {
						this.options.onExitComplete && this.options.onExitComplete();
						return;
					}
					/**
					* If we're running optimised appear animations then these must be
					* cancelled before measuring the DOM. This is so we can measure
					* the true layout of the element rather than the WAAPI animation
					* which will be unaffected by the resetSkewAndRotate step.
					*
					* Note: This is a DOM write. Worst case scenario is this is sandwiched
					* between other snapshot reads which will cause unnecessary style recalculations.
					* This has to happen here though, as we don't yet know which nodes will need
					* snapshots in startUpdate(), but we only want to cancel optimised animations
					* if a layout animation measurement is actually going to be affected by them.
					*/
					if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear) cancelTreeOptimisedTransformAnimations(this);
					!this.root.isUpdating && this.root.startUpdate();
					if (this.isLayoutDirty) return;
					this.isLayoutDirty = true;
					for (let i = 0; i < this.path.length; i++) {
						const node = this.path[i];
						node.shouldResetTransform = true;
						/**
						* Percentage translates resolve against layoutBox dimensions,
						* so ancestors with them must be re-measured after transform reset.
						*/
						if (typeof node.latestValues.x === "string" || typeof node.latestValues.y === "string") node.isLayoutDirty = true;
						node.updateScroll("snapshot");
						if (node.options.layoutRoot) node.willUpdate(false);
					}
					const { layoutId, layout } = this.options;
					if (layoutId === void 0 && !layout) return;
					const transformTemplate = this.getTransformTemplate();
					this.prevTransformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
					this.updateSnapshot();
					shouldNotifyListeners && this.notifyListeners("willUpdate");
				}
				update() {
					this.updateScheduled = false;
					if (this.isUpdateBlocked()) {
						const wasBlockedByResize = this.updateBlockedByResize;
						this.unblockUpdate();
						this.updateBlockedByResize = false;
						this.clearAllSnapshots();
						/**
						* When blocked by resize, still measure layouts so
						* callbacks like onLayoutMeasure fire (e.g. Reorder).
						* Skip notifyLayoutUpdate to prevent animations.
						*/
						if (wasBlockedByResize) this.nodes.forEach(forceLayoutMeasure);
						this.nodes.forEach(clearMeasurements);
						return;
					}
					/**
					* If this is a repeat of didUpdate then ignore the animation.
					*/
					if (this.animationId <= this.animationCommitId) {
						this.nodes.forEach(clearIsLayoutDirty);
						return;
					}
					this.animationCommitId = this.animationId;
					if (!this.isUpdating) this.nodes.forEach(clearIsLayoutDirty);
					else {
						this.isUpdating = false;
						/**
						* Ensure animation-blocked nodes (e.g. during drag)
						* get measured even when memoized (willUpdate skipped).
						*/
						this.nodes.forEach(ensureDraggedNodesSnapshotted);
						/**
						* Write
						*/
						this.nodes.forEach(resetTransformStyle);
						/**
						* Read ==================
						*/
						this.nodes.forEach(updateLayout);
						/**
						* Write
						*/
						this.nodes.forEach(notifyLayoutUpdate);
					}
					this.clearAllSnapshots();
					/**
					* Manually flush any pending updates. Ideally
					* we could leave this to the following requestAnimationFrame but this seems
					* to leave a flash of incorrectly styled content.
					*/
					const now = time.now();
					frameData.delta = clamp(0, 1e3 / 60, now - frameData.timestamp);
					frameData.timestamp = now;
					frameData.isProcessing = true;
					frameSteps.update.process(frameData);
					frameSteps.preRender.process(frameData);
					frameSteps.render.process(frameData);
					frameData.isProcessing = false;
				}
				didUpdate() {
					if (!this.updateScheduled) {
						this.updateScheduled = true;
						microtask.read(this.scheduleUpdate);
					}
				}
				clearAllSnapshots() {
					this.nodes.forEach(clearSnapshot);
					this.sharedNodes.forEach(removeLeadSnapshots);
				}
				scheduleUpdateProjection() {
					if (!this.projectionUpdateScheduled) {
						this.projectionUpdateScheduled = true;
						frame.preRender(this.updateProjection, false, true);
					}
				}
				scheduleCheckAfterUnmount() {
					/**
					* If the unmounting node is in a layoutGroup and did trigger a willUpdate,
					* we manually call didUpdate to give a chance to the siblings to animate.
					* Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
					*/
					frame.postRender(() => {
						if (this.isLayoutDirty) this.root.didUpdate();
						else this.root.checkUpdateFailed();
					});
				}
				/**
				* Update measurements
				*/
				updateSnapshot() {
					if (this.snapshot || !this.instance) return;
					this.snapshot = this.measure();
					if (this.snapshot && !calcLength(this.snapshot.measuredBox.x) && !calcLength(this.snapshot.measuredBox.y)) this.snapshot = void 0;
				}
				updateLayout() {
					if (!this.instance) return;
					this.updateScroll();
					if (!(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty) return;
					/**
					* When a node is mounted, it simply resumes from the prevLead's
					* snapshot instead of taking a new one, but the ancestors scroll
					* might have updated while the prevLead is unmounted. We need to
					* update the scroll again to make sure the layout we measure is
					* up to date.
					*/
					if (this.resumeFrom && !this.resumeFrom.instance) for (let i = 0; i < this.path.length; i++) this.path[i].updateScroll();
					const prevLayout = this.layout;
					this.layout = this.measure(false);
					this.layoutVersion++;
					if (!this.layoutCorrected) this.layoutCorrected = createBox();
					this.isLayoutDirty = false;
					this.projectionDelta = void 0;
					this.notifyListeners("measure", this.layout.layoutBox);
					const { visualElement } = this.options;
					visualElement && visualElement.notify("LayoutMeasure", this.layout.layoutBox, prevLayout ? prevLayout.layoutBox : void 0);
				}
				updateScroll(phase = "measure") {
					let needsMeasurement = Boolean(this.options.layoutScroll && this.instance);
					if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === phase) needsMeasurement = false;
					if (needsMeasurement && this.instance) {
						const isRoot = checkIsScrollRoot(this.instance);
						this.scroll = {
							animationId: this.root.animationId,
							phase,
							isRoot,
							offset: measureScroll(this.instance),
							wasRoot: this.scroll ? this.scroll.isRoot : isRoot
						};
					}
				}
				resetTransform() {
					if (!resetTransform) return;
					const isResetRequested = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout;
					const hasProjection = this.projectionDelta && !isDeltaZero(this.projectionDelta);
					const transformTemplate = this.getTransformTemplate();
					const transformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
					const transformTemplateHasChanged = transformTemplateValue !== this.prevTransformTemplateValue;
					if (isResetRequested && this.instance && (hasProjection || hasTransform(this.latestValues) || transformTemplateHasChanged)) {
						resetTransform(this.instance, transformTemplateValue);
						this.shouldResetTransform = false;
						this.scheduleRender();
					}
				}
				measure(removeTransform = true) {
					const pageBox = this.measurePageBox();
					let layoutBox = this.removeElementScroll(pageBox);
					/**
					* Measurements taken during the pre-render stage
					* still have transforms applied so we remove them
					* via calculation.
					*/
					if (removeTransform) layoutBox = this.removeTransform(layoutBox);
					roundBox(layoutBox);
					return {
						animationId: this.root.animationId,
						measuredBox: pageBox,
						layoutBox,
						latestValues: {},
						source: this.id
					};
				}
				measurePageBox() {
					const { visualElement } = this.options;
					if (!visualElement) return createBox();
					const box = visualElement.measureViewportBox();
					if (!(this.scroll?.wasRoot || this.path.some(checkNodeWasScrollRoot))) {
						const { scroll } = this.root;
						if (scroll) {
							translateAxis(box.x, scroll.offset.x);
							translateAxis(box.y, scroll.offset.y);
						}
					}
					return box;
				}
				removeElementScroll(box) {
					const boxWithoutScroll = createBox();
					copyBoxInto(boxWithoutScroll, box);
					if (this.scroll?.wasRoot) return boxWithoutScroll;
					/**
					* Performance TODO: Keep a cumulative scroll offset down the tree
					* rather than loop back up the path.
					*/
					for (let i = 0; i < this.path.length; i++) {
						const node = this.path[i];
						const { scroll, options } = node;
						if (node !== this.root && scroll && options.layoutScroll) {
							/**
							* If this is a new scroll root, we want to remove all previous scrolls
							* from the viewport box.
							*/
							if (scroll.wasRoot) copyBoxInto(boxWithoutScroll, box);
							translateAxis(boxWithoutScroll.x, scroll.offset.x);
							translateAxis(boxWithoutScroll.y, scroll.offset.y);
						}
					}
					return boxWithoutScroll;
				}
				applyTransform(box, transformOnly = false, output) {
					const withTransforms = output || createBox();
					copyBoxInto(withTransforms, box);
					for (let i = 0; i < this.path.length; i++) {
						const node = this.path[i];
						if (!transformOnly && node.options.layoutScroll && node.scroll && node !== node.root) {
							translateAxis(withTransforms.x, -node.scroll.offset.x);
							translateAxis(withTransforms.y, -node.scroll.offset.y);
						}
						if (!hasTransform(node.latestValues)) continue;
						transformBox(withTransforms, node.latestValues, node.layout?.layoutBox);
					}
					if (hasTransform(this.latestValues)) transformBox(withTransforms, this.latestValues, this.layout?.layoutBox);
					return withTransforms;
				}
				removeTransform(box) {
					const boxWithoutTransform = createBox();
					copyBoxInto(boxWithoutTransform, box);
					for (let i = 0; i < this.path.length; i++) {
						const node = this.path[i];
						if (!hasTransform(node.latestValues)) continue;
						let sourceBox;
						if (node.instance) {
							hasScale(node.latestValues) && node.updateSnapshot();
							sourceBox = createBox();
							copyBoxInto(sourceBox, node.measurePageBox());
						}
						removeBoxTransforms(boxWithoutTransform, node.latestValues, node.snapshot?.layoutBox, sourceBox);
					}
					if (hasTransform(this.latestValues)) removeBoxTransforms(boxWithoutTransform, this.latestValues);
					return boxWithoutTransform;
				}
				setTargetDelta(delta) {
					this.targetDelta = delta;
					this.root.scheduleUpdateProjection();
					this.isProjectionDirty = true;
				}
				setOptions(options) {
					this.options = {
						...this.options,
						...options,
						crossfade: options.crossfade !== void 0 ? options.crossfade : true
					};
				}
				clearMeasurements() {
					this.scroll = void 0;
					this.layout = void 0;
					this.snapshot = void 0;
					this.prevTransformTemplateValue = void 0;
					this.targetDelta = void 0;
					this.target = void 0;
					this.isLayoutDirty = false;
				}
				forceRelativeParentToResolveTarget() {
					if (!this.relativeParent) return;
					/**
					* If the parent target isn't up-to-date, force it to update.
					* This is an unfortunate de-optimisation as it means any updating relative
					* projection will cause all the relative parents to recalculate back
					* up the tree.
					*/
					if (this.relativeParent.resolvedRelativeTargetAt !== frameData.timestamp) this.relativeParent.resolveTargetDelta(true);
				}
				resolveTargetDelta(forceRecalculation = false) {
					/**
					* Once the dirty status of nodes has been spread through the tree, we also
					* need to check if we have a shared node of a different depth that has itself
					* been dirtied.
					*/
					const lead = this.getLead();
					this.isProjectionDirty || (this.isProjectionDirty = lead.isProjectionDirty);
					this.isTransformDirty || (this.isTransformDirty = lead.isTransformDirty);
					this.isSharedProjectionDirty || (this.isSharedProjectionDirty = lead.isSharedProjectionDirty);
					const isShared = Boolean(this.resumingFrom) || this !== lead;
					if (!(forceRecalculation || isShared && this.isSharedProjectionDirty || this.isProjectionDirty || this.parent?.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize)) return;
					const { layout, layoutId } = this.options;
					/**
					* If we have no layout, we can't perform projection, so early return
					*/
					if (!this.layout || !(layout || layoutId)) return;
					this.resolvedRelativeTargetAt = frameData.timestamp;
					const relativeParent = this.getClosestProjectingParent();
					if (relativeParent && this.linkedParentVersion !== relativeParent.layoutVersion && !relativeParent.options.layoutRoot) this.removeRelativeTarget();
					/**
					* If we don't have a targetDelta but do have a layout, we can attempt to resolve
					* a relativeParent. This will allow a component to perform scale correction
					* even if no animation has started.
					*/
					if (!this.targetDelta && !this.relativeTarget) {
						if (this.options.layoutAnchor !== false && relativeParent && relativeParent.layout) this.createRelativeTarget(relativeParent, this.layout.layoutBox, relativeParent.layout.layoutBox);
						else this.removeRelativeTarget();
					}
					/**
					* If we have no relative target or no target delta our target isn't valid
					* for this frame.
					*/
					if (!this.relativeTarget && !this.targetDelta) return;
					/**
					* Lazy-init target data structure
					*/
					if (!this.target) {
						this.target = createBox();
						this.targetWithTransforms = createBox();
					}
					/**
					* If we've got a relative box for this component, resolve it into a target relative to the parent.
					*/
					if (this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target) {
						this.forceRelativeParentToResolveTarget();
						calcRelativeBox(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0);
					} else if (this.targetDelta) {
						if (Boolean(this.resumingFrom)) this.applyTransform(this.layout.layoutBox, false, this.target);
						else copyBoxInto(this.target, this.layout.layoutBox);
						applyBoxDelta(this.target, this.targetDelta);
					} else
 /**
					* If no target, use own layout as target
					*/
					copyBoxInto(this.target, this.layout.layoutBox);
					/**
					* If we've been told to attempt to resolve a relative target, do so.
					*/
					if (this.attemptToResolveRelativeTarget) {
						this.attemptToResolveRelativeTarget = false;
						if (this.options.layoutAnchor !== false && relativeParent && Boolean(relativeParent.resumingFrom) === Boolean(this.resumingFrom) && !relativeParent.options.layoutScroll && relativeParent.target && this.animationProgress !== 1) this.createRelativeTarget(relativeParent, this.target, relativeParent.target);
						else this.relativeParent = this.relativeTarget = void 0;
					}
					/**
					* Increase debug counter for resolved target deltas
					*/
					if (statsBuffer.value) metrics.calculatedTargetDeltas++;
				}
				getClosestProjectingParent() {
					if (!this.parent || hasScale(this.parent.latestValues) || has2DTranslate(this.parent.latestValues)) return;
					if (this.parent.isProjecting()) return this.parent;
					else return this.parent.getClosestProjectingParent();
				}
				isProjecting() {
					return Boolean((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
				}
				createRelativeTarget(relativeParent, layout, parentLayout) {
					this.relativeParent = relativeParent;
					this.linkedParentVersion = relativeParent.layoutVersion;
					this.forceRelativeParentToResolveTarget();
					this.relativeTarget = createBox();
					this.relativeTargetOrigin = createBox();
					calcRelativePosition(this.relativeTargetOrigin, layout, parentLayout, this.options.layoutAnchor || void 0);
					copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
				}
				removeRelativeTarget() {
					this.relativeParent = this.relativeTarget = void 0;
				}
				calcProjection() {
					const lead = this.getLead();
					const isShared = Boolean(this.resumingFrom) || this !== lead;
					let canSkip = true;
					/**
					* If this is a normal layout animation and neither this node nor its nearest projecting
					* is dirty then we can't skip.
					*/
					if (this.isProjectionDirty || this.parent?.isProjectionDirty) canSkip = false;
					/**
					* If this is a shared layout animation and this node's shared projection is dirty then
					* we can't skip.
					*/
					if (isShared && (this.isSharedProjectionDirty || this.isTransformDirty)) canSkip = false;
					/**
					* If we have resolved the target this frame we must recalculate the
					* projection to ensure it visually represents the internal calculations.
					*/
					if (this.resolvedRelativeTargetAt === frameData.timestamp) canSkip = false;
					if (canSkip) return;
					const { layout, layoutId } = this.options;
					/**
					* If this section of the tree isn't animating we can
					* delete our target sources for the following frame.
					*/
					this.isTreeAnimating = Boolean(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation);
					if (!this.isTreeAnimating) this.targetDelta = this.relativeTarget = void 0;
					if (!this.layout || !(layout || layoutId)) return;
					/**
					* Reset the corrected box with the latest values from box, as we're then going
					* to perform mutative operations on it.
					*/
					copyBoxInto(this.layoutCorrected, this.layout.layoutBox);
					/**
					* Record previous tree scales before updating.
					*/
					const prevTreeScaleX = this.treeScale.x;
					const prevTreeScaleY = this.treeScale.y;
					/**
					* Apply all the parent deltas to this box to produce the corrected box. This
					* is the layout box, as it will appear on screen as a result of the transforms of its parents.
					*/
					applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, isShared);
					/**
					* If this layer needs to perform scale correction but doesn't have a target,
					* use the layout as the target.
					*/
					if (lead.layout && !lead.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1)) {
						lead.target = lead.layout.layoutBox;
						lead.targetWithTransforms = createBox();
					}
					const { target } = lead;
					if (!target) {
						/**
						* If we don't have a target to project into, but we were previously
						* projecting, we want to remove the stored transform and schedule
						* a render to ensure the elements reflect the removed transform.
						*/
						if (this.prevProjectionDelta) {
							this.createProjectionDeltas();
							this.scheduleRender();
						}
						return;
					}
					if (!this.projectionDelta || !this.prevProjectionDelta) this.createProjectionDeltas();
					else {
						copyAxisDeltaInto(this.prevProjectionDelta.x, this.projectionDelta.x);
						copyAxisDeltaInto(this.prevProjectionDelta.y, this.projectionDelta.y);
					}
					/**
					* Update the delta between the corrected box and the target box before user-set transforms were applied.
					* This will allow us to calculate the corrected borderRadius and boxShadow to compensate
					* for our layout reprojection, but still allow them to be scaled correctly by the user.
					* It might be that to simplify this we may want to accept that user-set scale is also corrected
					* and we wouldn't have to keep and calc both deltas, OR we could support a user setting
					* to allow people to choose whether these styles are corrected based on just the
					* layout reprojection or the final bounding box.
					*/
					calcBoxDelta(this.projectionDelta, this.layoutCorrected, target, this.latestValues);
					if (this.treeScale.x !== prevTreeScaleX || this.treeScale.y !== prevTreeScaleY || !axisDeltaEquals(this.projectionDelta.x, this.prevProjectionDelta.x) || !axisDeltaEquals(this.projectionDelta.y, this.prevProjectionDelta.y)) {
						this.hasProjected = true;
						this.scheduleRender();
						this.notifyListeners("projectionUpdate", target);
					}
					/**
					* Increase debug counter for recalculated projections
					*/
					if (statsBuffer.value) metrics.calculatedProjections++;
				}
				hide() {
					this.isVisible = false;
				}
				show() {
					this.isVisible = true;
				}
				scheduleRender(notifyAll = true) {
					this.options.visualElement?.scheduleRender();
					if (notifyAll) {
						const stack = this.getStack();
						stack && stack.scheduleRender();
					}
					if (this.resumingFrom && !this.resumingFrom.instance) this.resumingFrom = void 0;
				}
				createProjectionDeltas() {
					this.prevProjectionDelta = createDelta();
					this.projectionDelta = createDelta();
					this.projectionDeltaWithTransform = createDelta();
				}
				setAnimationOrigin(delta, hasOnlyRelativeTargetChanged = false, pathFn) {
					const snapshot = this.snapshot;
					const snapshotLatestValues = snapshot ? snapshot.latestValues : {};
					const mixedValues = { ...this.latestValues };
					const targetDelta = createDelta();
					if (!this.relativeParent || !this.relativeParent.options.layoutRoot) this.relativeTarget = this.relativeTargetOrigin = void 0;
					this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;
					const relativeLayout = createBox();
					const isSharedLayoutAnimation = (snapshot ? snapshot.source : void 0) !== (this.layout ? this.layout.source : void 0);
					const stack = this.getStack();
					const isOnlyMember = !stack || stack.members.length <= 1;
					const shouldCrossfadeOpacity = Boolean(isSharedLayoutAnimation && !isOnlyMember && this.options.crossfade === true && !this.path.some(hasOpacityCrossfade));
					this.animationProgress = 0;
					let prevRelativeTarget;
					const interpolate = pathFn?.interpolateProjection(delta);
					this.mixTargetDelta = (latest) => {
						const progress = latest / 1e3;
						const point = interpolate?.(progress);
						if (point) {
							targetDelta.x.translate = point.x;
							targetDelta.x.scale = mixNumber$1(delta.x.scale, 1, progress);
							targetDelta.x.origin = delta.x.origin;
							targetDelta.x.originPoint = delta.x.originPoint;
							targetDelta.y.translate = point.y;
							targetDelta.y.scale = mixNumber$1(delta.y.scale, 1, progress);
							targetDelta.y.origin = delta.y.origin;
							targetDelta.y.originPoint = delta.y.originPoint;
						} else {
							mixAxisDeltaLinear(targetDelta.x, delta.x, progress);
							mixAxisDeltaLinear(targetDelta.y, delta.y, progress);
						}
						this.setTargetDelta(targetDelta);
						if (this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout) {
							calcRelativePosition(relativeLayout, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0);
							mixBox(this.relativeTarget, this.relativeTargetOrigin, relativeLayout, progress);
							/**
							* If this is an unchanged relative target we can consider the
							* projection not dirty.
							*/
							if (prevRelativeTarget && boxEquals(this.relativeTarget, prevRelativeTarget)) this.isProjectionDirty = false;
							if (!prevRelativeTarget) prevRelativeTarget = createBox();
							copyBoxInto(prevRelativeTarget, this.relativeTarget);
						}
						if (isSharedLayoutAnimation) {
							this.animationValues = mixedValues;
							mixValues(mixedValues, snapshotLatestValues, this.latestValues, progress, shouldCrossfadeOpacity, isOnlyMember);
						}
						if (point && point.rotate !== void 0) {
							if (!this.animationValues) this.animationValues = mixedValues;
							this.animationValues.pathRotation = point.rotate;
						}
						this.root.scheduleUpdateProjection();
						this.scheduleRender();
						this.animationProgress = progress;
					};
					this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
				}
				startAnimation(options) {
					this.notifyListeners("animationStart");
					this.currentAnimation?.stop();
					this.resumingFrom?.currentAnimation?.stop();
					if (this.pendingAnimation) {
						cancelFrame(this.pendingAnimation);
						this.pendingAnimation = void 0;
					}
					/**
					* Start the animation in the next frame to have a frame with progress 0,
					* where the target is the same as when the animation started, so we can
					* calculate the relative positions correctly for instant transitions.
					*/
					this.pendingAnimation = frame.update(() => {
						globalProjectionState.hasAnimatedSinceResize = true;
						this.motionValue || (this.motionValue = motionValue(0));
						this.motionValue.jump(0, false);
						this.currentAnimation = animateSingleValue(this.motionValue, [0, 1e3], {
							...options,
							velocity: 0,
							isSync: true,
							onUpdate: (latest) => {
								this.mixTargetDelta(latest);
								options.onUpdate && options.onUpdate(latest);
							},
							onComplete: () => {
								options.onComplete && options.onComplete();
								this.completeAnimation();
							}
						});
						if (this.resumingFrom) this.resumingFrom.currentAnimation = this.currentAnimation;
						this.pendingAnimation = void 0;
					});
				}
				completeAnimation() {
					if (this.resumingFrom) {
						this.resumingFrom.currentAnimation = void 0;
						this.resumingFrom.preserveOpacity = void 0;
					}
					const stack = this.getStack();
					stack && stack.exitAnimationComplete();
					this.resumingFrom = this.currentAnimation = this.animationValues = void 0;
					this.notifyListeners("animationComplete");
				}
				finishAnimation() {
					if (this.currentAnimation) {
						this.mixTargetDelta && this.mixTargetDelta(animationTarget);
						this.currentAnimation.stop();
					}
					this.completeAnimation();
				}
				applyTransformsToTarget() {
					const lead = this.getLead();
					let { targetWithTransforms, target, layout, latestValues } = lead;
					if (!targetWithTransforms || !target || !layout) return;
					/**
					* If we're only animating position, and this element isn't the lead element,
					* then instead of projecting into the lead box we instead want to calculate
					* a new target that aligns the two boxes but maintains the layout shape.
					*/
					if (this !== lead && this.layout && layout && shouldAnimatePositionOnly(this.options.animationType, this.layout.layoutBox, layout.layoutBox)) {
						target = this.target || createBox();
						const xLength = calcLength(this.layout.layoutBox.x);
						target.x.min = lead.target.x.min;
						target.x.max = target.x.min + xLength;
						const yLength = calcLength(this.layout.layoutBox.y);
						target.y.min = lead.target.y.min;
						target.y.max = target.y.min + yLength;
					}
					copyBoxInto(targetWithTransforms, target);
					/**
					* Apply the latest user-set transforms to the targetBox to produce the targetBoxFinal.
					* This is the final box that we will then project into by calculating a transform delta and
					* applying it to the corrected box.
					*/
					transformBox(targetWithTransforms, latestValues);
					/**
					* Update the delta between the corrected box and the final target box, after
					* user-set transforms are applied to it. This will be used by the renderer to
					* create a transform style that will reproject the element from its layout layout
					* into the desired bounding box.
					*/
					calcBoxDelta(this.projectionDeltaWithTransform, this.layoutCorrected, targetWithTransforms, latestValues);
				}
				registerSharedNode(layoutId, node) {
					if (!this.sharedNodes.has(layoutId)) this.sharedNodes.set(layoutId, new NodeStack());
					this.sharedNodes.get(layoutId).add(node);
					const config = node.options.initialPromotionConfig;
					node.promote({
						transition: config ? config.transition : void 0,
						preserveFollowOpacity: config && config.shouldPreserveFollowOpacity ? config.shouldPreserveFollowOpacity(node) : void 0
					});
				}
				isLead() {
					const stack = this.getStack();
					return stack ? stack.lead === this : true;
				}
				getLead() {
					const { layoutId } = this.options;
					return layoutId ? this.getStack()?.lead || this : this;
				}
				getPrevLead() {
					const { layoutId } = this.options;
					return layoutId ? this.getStack()?.prevLead : void 0;
				}
				getStack() {
					const { layoutId } = this.options;
					if (layoutId) return this.root.sharedNodes.get(layoutId);
				}
				promote({ needsReset, transition, preserveFollowOpacity } = {}) {
					const stack = this.getStack();
					if (stack) stack.promote(this, preserveFollowOpacity);
					if (needsReset) {
						this.projectionDelta = void 0;
						this.needsReset = true;
					}
					if (transition) this.setOptions({ transition });
				}
				relegate() {
					const stack = this.getStack();
					if (stack) return stack.relegate(this);
					else return false;
				}
				resetSkewAndRotation() {
					const { visualElement } = this.options;
					if (!visualElement) return;
					let hasDistortingTransform = false;
					/**
					* An unrolled check for rotation values. Most elements don't have any rotation and
					* skipping the nested loop and new object creation is 50% faster.
					*/
					const { latestValues } = visualElement;
					if (latestValues.z || latestValues.rotate || latestValues.rotateX || latestValues.rotateY || latestValues.rotateZ || latestValues.skewX || latestValues.skewY) hasDistortingTransform = true;
					if (!hasDistortingTransform) return;
					const resetValues = {};
					if (latestValues.z) resetDistortingTransform("z", visualElement, resetValues, this.animationValues);
					for (let i = 0; i < transformAxes.length; i++) {
						resetDistortingTransform(`rotate${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
						resetDistortingTransform(`skew${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
					}
					visualElement.render();
					for (const key in resetValues) {
						visualElement.setStaticValue(key, resetValues[key]);
						if (this.animationValues) this.animationValues[key] = resetValues[key];
					}
					visualElement.scheduleRender();
				}
				applyProjectionStyles(targetStyle, styleProp) {
					if (!this.instance || this.isSVG) return;
					if (!this.isVisible) {
						targetStyle.visibility = "hidden";
						return;
					}
					const transformTemplate = this.getTransformTemplate();
					if (this.needsReset) {
						this.needsReset = false;
						targetStyle.visibility = "";
						targetStyle.opacity = "";
						targetStyle.pointerEvents = resolveMotionValue(styleProp?.pointerEvents) || "";
						targetStyle.transform = transformTemplate ? transformTemplate(this.latestValues, "") : "none";
						return;
					}
					const lead = this.getLead();
					if (!this.projectionDelta || !this.layout || !lead.target) {
						if (this.options.layoutId) {
							targetStyle.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1;
							targetStyle.pointerEvents = resolveMotionValue(styleProp?.pointerEvents) || "";
						}
						if (this.hasProjected && !hasTransform(this.latestValues)) {
							targetStyle.transform = transformTemplate ? transformTemplate({}, "") : "none";
							this.hasProjected = false;
						}
						return;
					}
					targetStyle.visibility = "";
					const valuesToRender = lead.animationValues || lead.latestValues;
					this.applyTransformsToTarget();
					let transform = buildProjectionTransform(this.projectionDeltaWithTransform, this.treeScale, valuesToRender);
					if (transformTemplate) transform = transformTemplate(valuesToRender, transform);
					targetStyle.transform = transform;
					const { x, y } = this.projectionDelta;
					targetStyle.transformOrigin = `${x.origin * 100}% ${y.origin * 100}% 0`;
					if (lead.animationValues)
 /**
					* If the lead component is animating, assign this either the entering/leaving
					* opacity
					*/
					targetStyle.opacity = lead === this ? valuesToRender.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : valuesToRender.opacityExit;
					else
 /**
					* Or we're not animating at all, set the lead component to its layout
					* opacity and other components to hidden.
					*/
					targetStyle.opacity = lead === this ? valuesToRender.opacity !== void 0 ? valuesToRender.opacity : "" : valuesToRender.opacityExit !== void 0 ? valuesToRender.opacityExit : 0;
					/**
					* Apply scale correction
					*/
					for (const key in scaleCorrectors) {
						if (valuesToRender[key] === void 0) continue;
						const { correct, applyTo, isCSSVariable } = scaleCorrectors[key];
						/**
						* Only apply scale correction to the value if we have an
						* active projection transform. Otherwise these values become
						* vulnerable to distortion if the element changes size without
						* a corresponding layout animation.
						*/
						const corrected = transform === "none" ? valuesToRender[key] : correct(valuesToRender[key], lead);
						if (applyTo) {
							const num = applyTo.length;
							for (let i = 0; i < num; i++) targetStyle[applyTo[i]] = corrected;
						} else if (isCSSVariable) this.options.visualElement.renderState.vars[key] = corrected;
						else targetStyle[key] = corrected;
					}
					/**
					* Disable pointer events on follow components. This is to ensure
					* that if a follow component covers a lead component it doesn't block
					* pointer events on the lead.
					*/
					if (this.options.layoutId) targetStyle.pointerEvents = lead === this ? resolveMotionValue(styleProp?.pointerEvents) || "" : "none";
				}
				clearSnapshot() {
					this.resumeFrom = this.snapshot = void 0;
				}
				resetTree() {
					this.root.nodes.forEach((node) => node.currentAnimation?.stop());
					this.root.nodes.forEach(clearMeasurements);
					this.root.sharedNodes.clear();
				}
			};
		}
		function updateLayout(node) {
			node.updateLayout();
		}
		function notifyLayoutUpdate(node) {
			const snapshot = node.resumeFrom?.snapshot || node.snapshot;
			if (node.isLead() && node.layout && snapshot && node.hasListeners("didUpdate")) {
				const { layoutBox: layout, measuredBox: measuredLayout } = node.layout;
				const { animationType } = node.options;
				const isShared = snapshot.source !== node.layout.source;
				if (animationType === "size") eachAxis((axis) => {
					const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
					const length = calcLength(axisSnapshot);
					axisSnapshot.min = layout[axis].min;
					axisSnapshot.max = axisSnapshot.min + length;
				});
				else if (animationType === "x" || animationType === "y") {
					const snapAxis = animationType === "x" ? "y" : "x";
					copyAxisInto(isShared ? snapshot.measuredBox[snapAxis] : snapshot.layoutBox[snapAxis], layout[snapAxis]);
				} else if (shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)) eachAxis((axis) => {
					const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
					const length = calcLength(layout[axis]);
					axisSnapshot.max = axisSnapshot.min + length;
					/**
					* Ensure relative target gets resized and rerendererd
					*/
					if (node.relativeTarget && !node.currentAnimation) {
						node.isProjectionDirty = true;
						node.relativeTarget[axis].max = node.relativeTarget[axis].min + length;
					}
				});
				const layoutDelta = createDelta();
				calcBoxDelta(layoutDelta, layout, snapshot.layoutBox);
				const visualDelta = createDelta();
				if (isShared) calcBoxDelta(visualDelta, node.applyTransform(measuredLayout, true), snapshot.measuredBox);
				else calcBoxDelta(visualDelta, layout, snapshot.layoutBox);
				const hasLayoutChanged = !isDeltaZero(layoutDelta);
				let hasRelativeLayoutChanged = false;
				if (!node.resumeFrom) {
					const relativeParent = node.getClosestProjectingParent();
					/**
					* If the relativeParent is itself resuming from a different element then
					* the relative snapshot is not relavent
					*/
					if (relativeParent && !relativeParent.resumeFrom) {
						const { snapshot: parentSnapshot, layout: parentLayout } = relativeParent;
						if (parentSnapshot && parentLayout) {
							const anchor = node.options.layoutAnchor || void 0;
							const relativeSnapshot = createBox();
							calcRelativePosition(relativeSnapshot, snapshot.layoutBox, parentSnapshot.layoutBox, anchor);
							const relativeLayout = createBox();
							calcRelativePosition(relativeLayout, layout, parentLayout.layoutBox, anchor);
							if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) hasRelativeLayoutChanged = true;
							if (relativeParent.options.layoutRoot) {
								node.relativeTarget = relativeLayout;
								node.relativeTargetOrigin = relativeSnapshot;
								node.relativeParent = relativeParent;
							}
						}
					}
				}
				node.notifyListeners("didUpdate", {
					layout,
					snapshot,
					delta: visualDelta,
					layoutDelta,
					hasLayoutChanged,
					hasRelativeLayoutChanged
				});
			} else if (node.isLead()) {
				const { onExitComplete } = node.options;
				onExitComplete && onExitComplete();
			}
			/**
			* Clearing transition
			* TODO: Investigate why this transition is being passed in as {type: false } from Framer
			* and why we need it at all
			*/
			node.options.transition = void 0;
		}
		function propagateDirtyNodes(node) {
			/**
			* Increase debug counter for nodes encountered this frame
			*/
			if (statsBuffer.value) metrics.nodes++;
			if (!node.parent) return;
			/**
			* If this node isn't projecting, propagate isProjectionDirty. It will have
			* no performance impact but it will allow the next child that *is* projecting
			* but *isn't* dirty to just check its parent to see if *any* ancestor needs
			* correcting.
			*/
			if (!node.isProjecting()) node.isProjectionDirty = node.parent.isProjectionDirty;
			/**
			* Propagate isSharedProjectionDirty and isTransformDirty
			* throughout the whole tree. A future revision can take another look at
			* this but for safety we still recalcualte shared nodes.
			*/
			node.isSharedProjectionDirty || (node.isSharedProjectionDirty = Boolean(node.isProjectionDirty || node.parent.isProjectionDirty || node.parent.isSharedProjectionDirty));
			node.isTransformDirty || (node.isTransformDirty = node.parent.isTransformDirty);
		}
		function cleanDirtyNodes(node) {
			node.isProjectionDirty = node.isSharedProjectionDirty = node.isTransformDirty = false;
		}
		function clearSnapshot(node) {
			node.clearSnapshot();
		}
		function clearMeasurements(node) {
			node.clearMeasurements();
		}
		function forceLayoutMeasure(node) {
			node.isLayoutDirty = true;
			node.updateLayout();
		}
		function clearIsLayoutDirty(node) {
			node.isLayoutDirty = false;
		}
		/**
		* When a node is animation-blocked (e.g. during drag) and its component
		* didn't re-render (memoized), willUpdate() is never called so there's
		* no snapshot. Use the previous layout as a snapshot and mark dirty so
		* resetTransform/updateLayout/notifyLayoutUpdate process it normally.
		*/
		function ensureDraggedNodesSnapshotted(node) {
			if (node.isAnimationBlocked && node.layout && !node.isLayoutDirty) {
				node.snapshot = node.layout;
				node.isLayoutDirty = true;
			}
		}
		function resetTransformStyle(node) {
			const { visualElement } = node.options;
			if (visualElement && visualElement.getProps().onBeforeLayoutMeasure) visualElement.notify("BeforeLayoutMeasure");
			node.resetTransform();
		}
		function finishAnimation(node) {
			node.finishAnimation();
			node.targetDelta = node.relativeTarget = node.target = void 0;
			node.isProjectionDirty = true;
		}
		function resolveTargetDelta(node) {
			node.resolveTargetDelta();
		}
		function calcProjection(node) {
			node.calcProjection();
		}
		function resetSkewAndRotation(node) {
			node.resetSkewAndRotation();
		}
		function removeLeadSnapshots(stack) {
			stack.removeLeadSnapshot();
		}
		function mixAxisDeltaLinear(output, delta, p) {
			output.translate = mixNumber$1(delta.translate, 0, p);
			output.scale = mixNumber$1(delta.scale, 1, p);
			output.origin = delta.origin;
			output.originPoint = delta.originPoint;
		}
		function mixAxis(output, from, to, p) {
			output.min = mixNumber$1(from.min, to.min, p);
			output.max = mixNumber$1(from.max, to.max, p);
		}
		function mixBox(output, from, to, p) {
			mixAxis(output.x, from.x, to.x, p);
			mixAxis(output.y, from.y, to.y, p);
		}
		function hasOpacityCrossfade(node) {
			return node.animationValues && node.animationValues.opacityExit !== void 0;
		}
		const defaultLayoutTransition = {
			duration: .45,
			ease: [
				.4,
				0,
				.1,
				1
			]
		};
		const userAgentContains = (string) => typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(string);
		/**
		* Measured bounding boxes must be rounded in Safari and
		* left untouched in Chrome, otherwise non-integer layouts within scaled-up elements
		* can appear to jump.
		*/
		const roundPoint = userAgentContains("applewebkit/") && !userAgentContains("chrome/") ? Math.round : noop;
		function roundAxis(axis) {
			axis.min = roundPoint(axis.min);
			axis.max = roundPoint(axis.max);
		}
		function roundBox(box) {
			roundAxis(box.x);
			roundAxis(box.y);
		}
		function shouldAnimatePositionOnly(animationType, snapshot, layout) {
			return animationType === "position" || animationType === "preserve-aspect" && !isNear(aspectRatio(snapshot), aspectRatio(layout), .2);
		}
		function checkNodeWasScrollRoot(node) {
			return node !== node.root && node.scroll?.wasRoot;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/node/DocumentProjectionNode.mjs
		const DocumentProjectionNode = createProjectionNode$1({
			attachResizeListener: (ref, notify) => addDomEvent(ref, "resize", notify),
			measureScroll: () => ({
				x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
				y: document.documentElement.scrollTop || document.body?.scrollTop || 0
			}),
			checkIsScrollRoot: () => true
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/motion-dom@12.43.0/node_modules/motion-dom/dist/es/projection/node/HTMLProjectionNode.mjs
		const rootProjectionNode = { current: void 0 };
		const HTMLProjectionNode = createProjectionNode$1({
			measureScroll: (instance) => ({
				x: instance.scrollLeft,
				y: instance.scrollTop
			}),
			defaultParent: () => {
				if (!rootProjectionNode.current) {
					const documentNode = new DocumentProjectionNode({});
					documentNode.mount(window);
					documentNode.setOptions({ layoutScroll: true });
					rootProjectionNode.current = documentNode;
				}
				return rootProjectionNode.current;
			},
			resetTransform: (instance, value) => {
				instance.style.transform = value !== void 0 ? value : "none";
			},
			checkIsScrollRoot: (instance) => Boolean(window.getComputedStyle(instance).position === "fixed")
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/MotionConfigContext.mjs
		/**
		* @public
		*/
		const MotionConfigContext = (0, react.createContext)({
			transformPagePoint: (p) => p,
			isStatic: false,
			reducedMotion: "never"
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/utils/use-composed-ref.mjs
		/**
		* Taken from https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/compose-refs.tsx
		*/
		/**
		* Set a given ref to a given value
		* This utility takes care of different types of refs: callback refs and RefObject(s)
		*/
		function setRef(ref, value) {
			if (typeof ref === "function") return ref(value);
			else if (ref !== null && ref !== void 0) ref.current = value;
		}
		/**
		* A utility to compose multiple refs together
		* Accepts callback refs and RefObject(s)
		*/
		function composeRefs(...refs) {
			return (node) => {
				let hasCleanup = false;
				const cleanups = refs.map((ref) => {
					const cleanup = setRef(ref, node);
					if (!hasCleanup && typeof cleanup === "function") hasCleanup = true;
					return cleanup;
				});
				if (hasCleanup) return () => {
					for (let i = 0; i < cleanups.length; i++) {
						const cleanup = cleanups[i];
						if (typeof cleanup === "function") cleanup();
						else setRef(refs[i], null);
					}
				};
			};
		}
		/**
		* A custom hook that composes multiple refs
		* Accepts callback refs and RefObject(s)
		*/
		function useComposedRefs(...refs) {
			return react.useCallback(composeRefs(...refs), refs);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/components/AnimatePresence/PopChild.mjs
		/**
		* Measurement functionality has to be within a separate component
		* to leverage snapshot lifecycle.
		*/
		var PopChildMeasure = class extends react.Component {
			getSnapshotBeforeUpdate(prevProps) {
				const element = this.props.childRef.current;
				if (isHTMLElement(element) && prevProps.isPresent && !this.props.isPresent && this.props.pop !== false) {
					const parent = element.offsetParent;
					const parentWidth = isHTMLElement(parent) ? parent.offsetWidth || 0 : 0;
					const parentHeight = isHTMLElement(parent) ? parent.offsetHeight || 0 : 0;
					const computedStyle = getComputedStyle(element);
					const size = this.props.sizeRef.current;
					size.height = parseFloat(computedStyle.height);
					size.width = parseFloat(computedStyle.width);
					size.top = element.offsetTop;
					size.left = element.offsetLeft;
					size.right = parentWidth - size.width - size.left;
					size.bottom = parentHeight - size.height - size.top;
					size.direction = computedStyle.direction;
				}
				return null;
			}
			/**
			* Required with getSnapshotBeforeUpdate to stop React complaining.
			*/
			componentDidUpdate() {}
			render() {
				return this.props.children;
			}
		};
		function PopChild({ children, isPresent, anchorX, anchorY, root, pop }) {
			const id = (0, react.useId)();
			const ref = (0, react.useRef)(null);
			const size = (0, react.useRef)({
				width: 0,
				height: 0,
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				direction: "ltr"
			});
			const { nonce } = (0, react.useContext)(MotionConfigContext);
			const composedRef = useComposedRefs(ref, pop !== false ? children.props?.ref ?? children?.ref : void 0);
			/**
			* We create and inject a style block so we can apply this explicit
			* sizing in a non-destructive manner by just deleting the style block.
			*
			* We can't apply size via render as the measurement happens
			* in getSnapshotBeforeUpdate (post-render), likewise if we apply the
			* styles directly on the DOM node, we might be overwriting
			* styles set via the style prop.
			*/
			(0, react.useInsertionEffect)(() => {
				const { width, height, top, left, right, bottom, direction } = size.current;
				if (isPresent || pop === false || !ref.current || !width || !height) return;
				const isRTL = direction === "rtl";
				const x = anchorX === "left" ? isRTL ? `right: ${right}` : `left: ${left}` : isRTL ? `left: ${left}` : `right: ${right}`;
				const y = anchorY === "bottom" ? `bottom: ${bottom}` : `top: ${top}`;
				ref.current.dataset.motionPopId = id;
				const style = document.createElement("style");
				if (nonce) style.nonce = nonce;
				const parent = root ?? document.head;
				parent.appendChild(style);
				if (style.sheet) style.sheet.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            ${x}px !important;
            ${y}px !important;
          }
        `);
				return () => {
					ref.current?.removeAttribute("data-motion-pop-id");
					if (parent.contains(style)) parent.removeChild(style);
				};
			}, [isPresent]);
			return (0, react_jsx_runtime.jsx)(PopChildMeasure, {
				isPresent,
				childRef: ref,
				sizeRef: size,
				pop,
				children: pop === false ? children : react.cloneElement(children, { ref: composedRef })
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/components/AnimatePresence/PresenceChild.mjs
		const PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, anchorX, anchorY, root }) => {
			const presenceChildren = useConstant(newChildrenMap);
			const id = (0, react.useId)();
			const isPresentRef = (0, react.useRef)(isPresent);
			const onExitCompleteRef = (0, react.useRef)(onExitComplete);
			useIsomorphicLayoutEffect(() => {
				isPresentRef.current = isPresent;
				onExitCompleteRef.current = onExitComplete;
			});
			let isReusedContext = true;
			let context = (0, react.useMemo)(() => {
				isReusedContext = false;
				return {
					id,
					initial,
					isPresent,
					custom,
					onExitComplete: (childId) => {
						presenceChildren.set(childId, true);
						for (const isComplete of presenceChildren.values()) if (!isComplete) return;
						onExitComplete && onExitComplete();
					},
					register: (childId) => {
						presenceChildren.set(childId, false);
						return () => {
							presenceChildren.delete(childId);
							!isPresentRef.current && !presenceChildren.size && onExitCompleteRef.current?.();
						};
					}
				};
			}, [
				isPresent,
				presenceChildren,
				onExitComplete
			]);
			/**
			* If the presence of a child affects the layout of the components around it,
			* we want to make a new context value to ensure they get re-rendered
			* so they can detect that layout change.
			*/
			if (presenceAffectsLayout && isReusedContext) context = { ...context };
			(0, react.useMemo)(() => {
				presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
			}, [isPresent]);
			/**
			* If there's no `motion` components to fire exit animations, we want to remove this
			* component immediately.
			*/
			react.useEffect(() => {
				!isPresent && !presenceChildren.size && onExitComplete && onExitComplete();
			}, [isPresent]);
			children = (0, react_jsx_runtime.jsx)(PopChild, {
				pop: mode === "popLayout",
				isPresent,
				anchorX,
				anchorY,
				root,
				children
			});
			return (0, react_jsx_runtime.jsx)(PresenceContext.Provider, {
				value: context,
				children
			});
		};
		function newChildrenMap() {
			return /* @__PURE__ */ new Map();
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/components/AnimatePresence/use-presence.mjs
		/**
		* When a component is the child of `AnimatePresence`, it can use `usePresence`
		* to access information about whether it's still present in the React tree.
		*
		* ```jsx
		* import { usePresence } from "framer-motion"
		*
		* export const Component = () => {
		*   const [isPresent, safeToRemove] = usePresence()
		*
		*   useEffect(() => {
		*     !isPresent && setTimeout(safeToRemove, 1000)
		*   }, [isPresent])
		*
		*   return <div />
		* }
		* ```
		*
		* If `isPresent` is `false`, it means that a component has been removed from the tree,
		* but `AnimatePresence` won't really remove it until `safeToRemove` has been called.
		*
		* @public
		*/
		function usePresence(subscribe = true) {
			const context = (0, react.useContext)(PresenceContext);
			if (context === null) return [true, null];
			const { isPresent, onExitComplete, register } = context;
			const id = (0, react.useId)();
			(0, react.useEffect)(() => {
				if (subscribe) return register(id);
			}, [subscribe]);
			const safeToRemove = (0, react.useCallback)(() => subscribe && onExitComplete && onExitComplete(id), [
				id,
				onExitComplete,
				subscribe
			]);
			return !isPresent && onExitComplete ? [false, safeToRemove] : [true];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/components/AnimatePresence/utils.mjs
		const getChildKey = (child) => child.key || "";
		function onlyElements(children) {
			const filtered = [];
			react.Children.forEach(children, (child) => {
				if ((0, react.isValidElement)(child)) filtered.push(child);
			});
			return filtered;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs
		/**
		* `AnimatePresence` enables the animation of components that have been removed from the tree.
		*
		* When adding/removing more than a single child, every child **must** be given a unique `key` prop.
		*
		* Any `motion` components that have an `exit` property defined will animate out when removed from
		* the tree.
		*
		* ```jsx
		* import { motion, AnimatePresence } from 'framer-motion'
		*
		* export const Items = ({ items }) => (
		*   <AnimatePresence>
		*     {items.map(item => (
		*       <motion.div
		*         key={item.id}
		*         initial={{ opacity: 0 }}
		*         animate={{ opacity: 1 }}
		*         exit={{ opacity: 0 }}
		*       />
		*     ))}
		*   </AnimatePresence>
		* )
		* ```
		*
		* You can sequence exit animations throughout a tree using variants.
		*
		* If a child contains multiple `motion` components with `exit` props, it will only unmount the child
		* once all `motion` components have finished animating out. Likewise, any components using
		* `usePresence` all need to call `safeToRemove`.
		*
		* @public
		*/
		const AnimatePresence = ({ children, custom, initial = true, onExitComplete, presenceAffectsLayout = true, mode = "sync", propagate = false, anchorX = "left", anchorY = "top", root }) => {
			const [isParentPresent, safeToRemove] = usePresence(propagate);
			/**
			* Filter any children that aren't ReactElements. We can only track components
			* between renders with a props.key.
			*/
			const presentChildren = (0, react.useMemo)(() => onlyElements(children), [children]);
			/**
			* Track the keys of the currently rendered children. This is used to
			* determine which children are exiting.
			*/
			const presentKeys = propagate && !isParentPresent ? [] : presentChildren.map(getChildKey);
			/**
			* If `initial={false}` we only want to pass this to components in the first render.
			*/
			const isInitialRender = (0, react.useRef)(true);
			/**
			* A ref containing the currently present children. When all exit animations
			* are complete, we use this to re-render the component with the latest children
			* *committed* rather than the latest children *rendered*.
			*/
			const pendingPresentChildren = (0, react.useRef)(presentChildren);
			/**
			* Track which exiting children have finished animating out.
			*/
			const exitComplete = useConstant(() => /* @__PURE__ */ new Map());
			/**
			* Track which components are currently processing exit to prevent duplicate processing.
			*/
			const exitingComponents = (0, react.useRef)(/* @__PURE__ */ new Set());
			/**
			* Save children to render as React state. To ensure this component is concurrent-safe,
			* we check for exiting children via an effect.
			*/
			const [diffedChildren, setDiffedChildren] = (0, react.useState)(presentChildren);
			const [renderedChildren, setRenderedChildren] = (0, react.useState)(presentChildren);
			useIsomorphicLayoutEffect(() => {
				isInitialRender.current = false;
				pendingPresentChildren.current = presentChildren;
				/**
				* Update complete status of exiting children.
				*/
				for (let i = 0; i < renderedChildren.length; i++) {
					const key = getChildKey(renderedChildren[i]);
					if (!presentKeys.includes(key)) {
						if (exitComplete.get(key) !== true) exitComplete.set(key, false);
					} else {
						exitComplete.delete(key);
						exitingComponents.current.delete(key);
					}
				}
			}, [
				renderedChildren,
				presentKeys.length,
				presentKeys.join("-")
			]);
			const exitingChildren = [];
			if (presentChildren !== diffedChildren) {
				let nextChildren = [...presentChildren];
				/**
				* Loop through all the currently rendered components and decide which
				* are exiting.
				*/
				for (let i = 0; i < renderedChildren.length; i++) {
					const child = renderedChildren[i];
					const key = getChildKey(child);
					if (!presentKeys.includes(key)) {
						nextChildren.splice(i, 0, child);
						exitingChildren.push(child);
					}
				}
				/**
				* If we're in "wait" mode, and we have exiting children, we want to
				* only render these until they've all exited.
				*/
				if (mode === "wait" && exitingChildren.length) nextChildren = exitingChildren;
				setRenderedChildren(onlyElements(nextChildren));
				setDiffedChildren(presentChildren);
				/**
				* Early return to ensure once we've set state with the latest diffed
				* children, we can immediately re-render.
				*/
				return null;
			}
			/**
			* If we've been provided a forceRender function by the LayoutGroupContext,
			* we can use it to force a re-render amongst all surrounding components once
			* all components have finished animating out.
			*/
			const { forceRender } = (0, react.useContext)(LayoutGroupContext);
			return (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: renderedChildren.map((child) => {
				const key = getChildKey(child);
				const isPresent = propagate && !isParentPresent ? false : presentChildren === renderedChildren || presentKeys.includes(key);
				const onExit = () => {
					if (exitingComponents.current.has(key)) return;
					if (exitComplete.has(key)) {
						exitingComponents.current.add(key);
						exitComplete.set(key, true);
					} else return;
					let isEveryExitComplete = true;
					exitComplete.forEach((isExitComplete) => {
						if (!isExitComplete) isEveryExitComplete = false;
					});
					if (isEveryExitComplete) {
						forceRender?.();
						setRenderedChildren(pendingPresentChildren.current);
						propagate && safeToRemove?.();
						onExitComplete && onExitComplete();
					}
				};
				return (0, react_jsx_runtime.jsx)(PresenceChild, {
					isPresent,
					initial: !isInitialRender.current || initial ? void 0 : false,
					custom,
					presenceAffectsLayout,
					mode,
					root,
					onExitComplete: isPresent ? void 0 : onExit,
					anchorX,
					anchorY,
					children: child
				}, key);
			}) });
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/LazyContext.mjs
		const LazyContext = (0, react.createContext)({ strict: false });
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/definitions.mjs
		const featureProps = {
			animation: [
				"animate",
				"variants",
				"whileHover",
				"whileTap",
				"exit",
				"whileInView",
				"whileFocus",
				"whileDrag"
			],
			exit: ["exit"],
			drag: ["drag", "dragControls"],
			focus: ["whileFocus"],
			hover: [
				"whileHover",
				"onHoverStart",
				"onHoverEnd"
			],
			tap: [
				"whileTap",
				"onTap",
				"onTapStart",
				"onTapCancel"
			],
			pan: [
				"onPan",
				"onPanStart",
				"onPanSessionStart",
				"onPanEnd"
			],
			inView: [
				"whileInView",
				"onViewportEnter",
				"onViewportLeave"
			],
			layout: ["layout", "layoutId"]
		};
		let isInitialized = false;
		/**
		* Initialize feature definitions with isEnabled checks.
		* This must be called before any motion components are rendered.
		*/
		function initFeatureDefinitions() {
			if (isInitialized) return;
			const initialFeatureDefinitions = {};
			for (const key in featureProps) initialFeatureDefinitions[key] = { isEnabled: (props) => featureProps[key].some((name) => !!props[name]) };
			setFeatureDefinitions(initialFeatureDefinitions);
			isInitialized = true;
		}
		/**
		* Get the current feature definitions, initializing if needed.
		*/
		function getInitializedFeatureDefinitions() {
			initFeatureDefinitions();
			return getFeatureDefinitions();
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/load-features.mjs
		function loadFeatures(features) {
			const featureDefinitions = getInitializedFeatureDefinitions();
			for (const key in features) featureDefinitions[key] = {
				...featureDefinitions[key],
				...features[key]
			};
			setFeatureDefinitions(featureDefinitions);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/utils/valid-prop.mjs
		/**
		* A list of all valid MotionProps.
		*
		* @privateRemarks
		* This doesn't throw if a `MotionProp` name is missing - it should.
		*/
		const validMotionProps = /* @__PURE__ */ new Set([
			"animate",
			"exit",
			"variants",
			"initial",
			"style",
			"values",
			"variants",
			"transition",
			"transformTemplate",
			"custom",
			"inherit",
			"onBeforeLayoutMeasure",
			"onAnimationStart",
			"onAnimationComplete",
			"onUpdate",
			"onDragStart",
			"onDrag",
			"onDragEnd",
			"onMeasureDragConstraints",
			"onDirectionLock",
			"onDragTransitionEnd",
			"_dragX",
			"_dragY",
			"onHoverStart",
			"onHoverEnd",
			"onViewportEnter",
			"onViewportLeave",
			"globalTapTarget",
			"propagate",
			"ignoreStrict",
			"viewport"
		]);
		/**
		* Check whether a prop name is a valid `MotionProp` key.
		*
		* @param key - Name of the property to check
		* @returns `true` is key is a valid `MotionProp`.
		*
		* @public
		*/
		function isValidMotionProp(key) {
			return key.startsWith("while") || key.startsWith("drag") && key !== "draggable" || key.startsWith("layout") || key.startsWith("onTap") || key.startsWith("onPan") || key.startsWith("onLayout") || validMotionProps.has(key);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/dom/utils/filter-props.mjs
		let shouldForward = (key) => !isValidMotionProp(key);
		function loadExternalIsValidProp(isValidProp) {
			if (typeof isValidProp !== "function") return;
			shouldForward = (key) => key.startsWith("on") ? !isValidMotionProp(key) : isValidProp(key);
		}
		/**
		* Emotion and Styled Components both allow users to pass through arbitrary props to their components
		* to dynamically generate CSS. They both use the `@emotion/is-prop-valid` package to determine which
		* of these should be passed to the underlying DOM node.
		*
		* However, when styling a Motion component `styled(motion.div)`, both packages pass through *all* props
		* as it's seen as an arbitrary component rather than a DOM node. Motion only allows arbitrary props
		* passed through the `custom` prop so it doesn't *need* the payload or computational overhead of
		* `@emotion/is-prop-valid`, however to fix this problem we need to use it.
		*
		* By making it an optionalDependency we can offer this functionality only in the situations where it's
		* actually required.
		*/
		try {
			loadExternalIsValidProp(require("@emotion/is-prop-valid").default);
		} catch {}
		function filterProps(props, isDom, forwardMotionProps) {
			const filteredProps = {};
			for (const key in props) {
				/**
				* values is considered a valid prop by Emotion, so if it's present
				* this will be rendered out to the DOM unless explicitly filtered.
				*
				* We check the type as it could be used with the `feColorMatrix`
				* element, which we support.
				*/
				if (key === "values" && typeof props.values === "object") continue;
				if (isMotionValue(props[key])) continue;
				if (shouldForward(key) || forwardMotionProps === true && isValidMotionProp(key) || !isDom && !isValidMotionProp(key) || props["draggable"] && key.startsWith("onDrag")) filteredProps[key] = props[key];
			}
			return filteredProps;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/MotionContext/index.mjs
		const MotionContext = /* @__PURE__ */ (0, react.createContext)({});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/MotionContext/utils.mjs
		function getCurrentTreeVariants(props, context) {
			if (isControllingVariants(props)) {
				const { initial, animate } = props;
				return {
					initial: initial === false || isVariantLabel(initial) ? initial : void 0,
					animate: isVariantLabel(animate) ? animate : void 0
				};
			}
			return props.inherit !== false ? context : {};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/MotionContext/create.mjs
		function useCreateMotionContext(props) {
			const { initial, animate } = getCurrentTreeVariants(props, (0, react.useContext)(MotionContext));
			return (0, react.useMemo)(() => ({
				initial,
				animate
			}), [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)]);
		}
		function variantLabelsAsDependency(prop) {
			return Array.isArray(prop) ? prop.join(" ") : prop;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/html/utils/create-render-state.mjs
		const createHtmlRenderState = () => ({
			style: {},
			transform: {},
			transformOrigin: {},
			vars: {}
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/html/use-props.mjs
		function copyRawValuesOnly(target, source, props) {
			for (const key in source) if (!isMotionValue(source[key]) && !isForcedMotionValue(key, props)) target[key] = source[key];
		}
		function useInitialMotionValues({ transformTemplate }, visualState) {
			return (0, react.useMemo)(() => {
				const state = createHtmlRenderState();
				buildHTMLStyles(state, visualState, transformTemplate);
				return Object.assign({}, state.vars, state.style);
			}, [visualState]);
		}
		function useStyle(props, visualState) {
			const styleProp = props.style || {};
			const style = {};
			/**
			* Copy non-Motion Values straight into style
			*/
			copyRawValuesOnly(style, styleProp, props);
			Object.assign(style, useInitialMotionValues(props, visualState));
			return style;
		}
		function useHTMLProps(props, visualState) {
			const htmlProps = {};
			const style = useStyle(props, visualState);
			if (props.drag && props.dragListener !== false) {
				htmlProps.draggable = false;
				style.userSelect = style.WebkitUserSelect = style.WebkitTouchCallout = "none";
				style.touchAction = props.drag === true ? "none" : `pan-${props.drag === "x" ? "y" : "x"}`;
			}
			if (props.tabIndex === void 0 && (props.onTap || props.onTapStart || props.whileTap)) htmlProps.tabIndex = 0;
			htmlProps.style = style;
			return htmlProps;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/svg/utils/create-render-state.mjs
		const createSvgRenderState = () => ({
			...createHtmlRenderState(),
			attrs: {}
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/svg/use-props.mjs
		function useSVGProps(props, visualState, _isStatic, Component) {
			const visualProps = (0, react.useMemo)(() => {
				const state = createSvgRenderState();
				buildSVGAttrs(state, visualState, isSVGTag(Component), props.transformTemplate, props.style);
				return {
					...state.attrs,
					style: { ...state.style }
				};
			}, [visualState]);
			if (props.style) {
				const rawStyles = {};
				copyRawValuesOnly(rawStyles, props.style, props);
				visualProps.style = {
					...rawStyles,
					...visualProps.style
				};
			}
			return visualProps;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/svg/lowercase-elements.mjs
		/**
		* We keep these listed separately as we use the lowercase tag names as part
		* of the runtime bundle to detect SVG components
		*/
		const lowercaseSVGElements = [
			"animate",
			"circle",
			"defs",
			"desc",
			"ellipse",
			"g",
			"image",
			"line",
			"filter",
			"marker",
			"mask",
			"metadata",
			"path",
			"pattern",
			"polygon",
			"polyline",
			"rect",
			"stop",
			"switch",
			"symbol",
			"svg",
			"text",
			"tspan",
			"use",
			"view"
		];
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/dom/utils/is-svg-component.mjs
		function isSVGComponent(Component) {
			if (typeof Component !== "string" || Component.includes("-")) return false;
			else if (lowercaseSVGElements.indexOf(Component) > -1 || /[A-Z]/u.test(Component)) return true;
			return false;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/dom/use-render.mjs
		function useRender(Component, props, ref, { latestValues }, isStatic, forwardMotionProps = false, isSVG) {
			const visualProps = (isSVG ?? isSVGComponent(Component) ? useSVGProps : useHTMLProps)(props, latestValues, isStatic, Component);
			const filteredProps = filterProps(props, typeof Component === "string", forwardMotionProps);
			const elementProps = Component !== react.Fragment ? {
				...filteredProps,
				...visualProps,
				ref
			} : {};
			/**
			* If component has been handed a motion value as its child,
			* memoise its initial value and render that. Subsequent updates
			* will be handled by the onChange handler
			*/
			const { children } = props;
			const renderedChildren = (0, react.useMemo)(() => isMotionValue(children) ? children.get() : children, [children]);
			return (0, react.createElement)(Component, {
				...elementProps,
				children: renderedChildren
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/utils/use-visual-state.mjs
		function makeState({ scrapeMotionValuesFromProps, createRenderState }, props, context, presenceContext) {
			return {
				latestValues: makeLatestValues(props, context, presenceContext, scrapeMotionValuesFromProps),
				renderState: createRenderState()
			};
		}
		function makeLatestValues(props, context, presenceContext, scrapeMotionValues) {
			const values = {};
			const motionValues = scrapeMotionValues(props, {});
			for (const key in motionValues) values[key] = resolveMotionValue(motionValues[key]);
			let { initial, animate } = props;
			const isControllingVariants$1 = isControllingVariants(props);
			const isVariantNode$1 = isVariantNode(props);
			if (context && isVariantNode$1 && !isControllingVariants$1 && props.inherit !== false) {
				if (initial === void 0) initial = context.initial;
				if (animate === void 0) animate = context.animate;
			}
			let isInitialAnimationBlocked = presenceContext ? presenceContext.initial === false : false;
			isInitialAnimationBlocked = isInitialAnimationBlocked || initial === false;
			const variantToSet = isInitialAnimationBlocked ? animate : initial;
			if (variantToSet && typeof variantToSet !== "boolean" && !isAnimationControls(variantToSet)) {
				const list = Array.isArray(variantToSet) ? variantToSet : [variantToSet];
				for (let i = 0; i < list.length; i++) {
					const resolved = resolveVariantFromProps(props, list[i]);
					if (resolved) {
						const { transitionEnd, transition, ...target } = resolved;
						for (const key in target) {
							let valueTarget = target[key];
							if (Array.isArray(valueTarget)) {
								/**
								* Take final keyframe if the initial animation is blocked because
								* we want to initialise at the end of that blocked animation.
								*/
								const index = isInitialAnimationBlocked ? valueTarget.length - 1 : 0;
								valueTarget = valueTarget[index];
							}
							if (valueTarget !== null) values[key] = valueTarget;
						}
						for (const key in transitionEnd) values[key] = transitionEnd[key];
					}
				}
			}
			return values;
		}
		const makeUseVisualState = (config) => (props, isStatic) => {
			const context = (0, react.useContext)(MotionContext);
			const presenceContext = (0, react.useContext)(PresenceContext);
			const make = () => makeState(config, props, context, presenceContext);
			return isStatic ? make() : useConstant(make);
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/html/use-html-visual-state.mjs
		const useHTMLVisualState = /*@__PURE__*/ makeUseVisualState({
			scrapeMotionValuesFromProps: scrapeMotionValuesFromProps$1,
			createRenderState: createHtmlRenderState
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/svg/use-svg-visual-state.mjs
		const useSVGVisualState = /*@__PURE__*/ makeUseVisualState({
			scrapeMotionValuesFromProps,
			createRenderState: createSvgRenderState
		});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/utils/symbol.mjs
		const motionComponentSymbol = Symbol.for("motionComponentSymbol");
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/utils/use-motion-ref.mjs
		/**
		* Creates a ref function that, when called, hydrates the provided
		* external ref and VisualElement.
		*/
		function useMotionRef(visualState, visualElement, externalRef) {
			/**
			* Store externalRef in a ref to avoid including it in the useCallback
			* dependency array. Including externalRef in dependencies causes issues
			* with libraries like Radix UI that create new callback refs on each render
			* when using asChild - this would cause the callback to be recreated,
			* triggering element remounts and breaking AnimatePresence exit animations.
			*/
			const externalRefContainer = (0, react.useRef)(externalRef);
			(0, react.useInsertionEffect)(() => {
				externalRefContainer.current = externalRef;
			});
			const refCleanup = (0, react.useRef)(null);
			return (0, react.useCallback)((instance) => {
				if (instance) visualState.onMount?.(instance);
				if (visualElement) instance ? visualElement.mount(instance) : visualElement.unmount();
				const ref = externalRefContainer.current;
				if (typeof ref === "function") {
					if (instance) {
						const cleanup = ref(instance);
						if (typeof cleanup === "function") refCleanup.current = cleanup;
					} else if (refCleanup.current) {
						refCleanup.current();
						refCleanup.current = null;
					} else ref(instance);
				} else if (ref) ref.current = instance;
			}, [visualElement]);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/context/SwitchLayoutGroupContext.mjs
		/**
		* Internal, exported only for usage in Framer
		*/
		const SwitchLayoutGroupContext = (0, react.createContext)({});
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/utils/is-ref-object.mjs
		function isRefObject(ref) {
			return ref && typeof ref === "object" && Object.prototype.hasOwnProperty.call(ref, "current");
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/utils/use-visual-element.mjs
		function useVisualElement(Component, visualState, props, createVisualElement, ProjectionNodeConstructor, isSVG) {
			const { visualElement: parent } = (0, react.useContext)(MotionContext);
			const lazyContext = (0, react.useContext)(LazyContext);
			const presenceContext = (0, react.useContext)(PresenceContext);
			const motionConfig = (0, react.useContext)(MotionConfigContext);
			const reducedMotionConfig = motionConfig.reducedMotion;
			const skipAnimations = motionConfig.skipAnimations;
			const visualElementRef = (0, react.useRef)(null);
			/**
			* Track whether the component has been through React's commit phase.
			* Used to detect when LazyMotion features load after the component has mounted.
			*/
			const hasMountedOnce = (0, react.useRef)(false);
			/**
			* If we haven't preloaded a renderer, check to see if we have one lazy-loaded
			*/
			createVisualElement = createVisualElement || lazyContext.renderer;
			if (!visualElementRef.current && createVisualElement) {
				visualElementRef.current = createVisualElement(Component, {
					visualState,
					parent,
					props,
					presenceContext,
					blockInitialAnimation: presenceContext ? presenceContext.initial === false : false,
					reducedMotionConfig,
					skipAnimations,
					isSVG
				});
				/**
				* If the component has already mounted before features loaded (e.g. via
				* LazyMotion with async feature loading), we need to force the initial
				* animation to run. Otherwise state changes that occurred before features
				* loaded will be lost and the element will snap to its final state.
				*/
				if (hasMountedOnce.current && visualElementRef.current) visualElementRef.current.manuallyAnimateOnMount = true;
			}
			const visualElement = visualElementRef.current;
			/**
			* Load Motion gesture and animation features. These are rendered as renderless
			* components so each feature can optionally make use of React lifecycle methods.
			*/
			const initialLayoutGroupConfig = (0, react.useContext)(SwitchLayoutGroupContext);
			if (visualElement && !visualElement.projection && ProjectionNodeConstructor && (visualElement.type === "html" || visualElement.type === "svg")) createProjectionNode(visualElementRef.current, props, ProjectionNodeConstructor, initialLayoutGroupConfig);
			const isMounted = (0, react.useRef)(false);
			(0, react.useInsertionEffect)(() => {
				/**
				* Check the component has already mounted before calling
				* `update` unnecessarily. This ensures we skip the initial update.
				*/
				if (visualElement && isMounted.current) visualElement.update(props, presenceContext);
			});
			/**
			* Cache this value as we want to know whether HandoffAppearAnimations
			* was present on initial render - it will be deleted after this.
			*/
			const optimisedAppearId = props[optimizedAppearDataAttribute];
			const wantsHandoff = (0, react.useRef)(Boolean(optimisedAppearId) && typeof window !== "undefined" && !window.MotionHandoffIsComplete?.(optimisedAppearId) && window.MotionHasOptimisedAnimation?.(optimisedAppearId));
			useIsomorphicLayoutEffect(() => {
				/**
				* Track that this component has mounted. This is used to detect when
				* LazyMotion features load after the component has already committed.
				*/
				hasMountedOnce.current = true;
				if (!visualElement) return;
				isMounted.current = true;
				window.MotionIsMounted = true;
				visualElement.updateFeatures();
				visualElement.scheduleRenderMicrotask();
				/**
				* Ideally this function would always run in a useEffect.
				*
				* However, if we have optimised appear animations to handoff from,
				* it needs to happen synchronously to ensure there's no flash of
				* incorrect styles in the event of a hydration error.
				*
				* So if we detect a situtation where optimised appear animations
				* are running, we use useLayoutEffect to trigger animations.
				*/
				if (wantsHandoff.current && visualElement.animationState) visualElement.animationState.animateChanges();
			});
			(0, react.useEffect)(() => {
				if (!visualElement) return;
				if (!wantsHandoff.current && visualElement.animationState) visualElement.animationState.animateChanges();
				if (wantsHandoff.current) {
					queueMicrotask(() => {
						window.MotionHandoffMarkAsComplete?.(optimisedAppearId);
					});
					wantsHandoff.current = false;
				}
				/**
				* Now we've finished triggering animations for this element we
				* can wipe the enteringChildren set for the next render.
				*/
				visualElement.enteringChildren = void 0;
			});
			return visualElement;
		}
		function createProjectionNode(visualElement, props, ProjectionNodeConstructor, initialPromotionConfig) {
			const { layoutId, layout, drag, dragConstraints, layoutScroll, layoutRoot, layoutAnchor, layoutCrossfade } = props;
			visualElement.projection = new ProjectionNodeConstructor(visualElement.latestValues, props["data-framer-portal-id"] ? void 0 : getClosestProjectingNode(visualElement.parent));
			visualElement.projection.setOptions({
				layoutId,
				layout,
				alwaysMeasureLayout: Boolean(drag) || dragConstraints && isRefObject(dragConstraints),
				visualElement,
				/**
				* TODO: Update options in an effect. This could be tricky as it'll be too late
				* to update by the time layout animations run.
				* We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
				* ensuring it gets called if there's no potential layout animations.
				*
				*/
				animationType: typeof layout === "string" ? layout : "both",
				initialPromotionConfig,
				crossfade: layoutCrossfade,
				layoutScroll,
				layoutRoot,
				layoutAnchor
			});
		}
		function getClosestProjectingNode(visualElement) {
			if (!visualElement) return void 0;
			return visualElement.options.allowProjection !== false ? visualElement.projection : getClosestProjectingNode(visualElement.parent);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/index.mjs
		/**
		* Create a `motion` component.
		*
		* This function accepts a Component argument, which can be either a string (ie "div"
		* for `motion.div`), or an actual React component.
		*
		* Alongside this is a config option which provides a way of rendering the provided
		* component "offline", or outside the React render cycle.
		*/
		function createMotionComponent(Component, { forwardMotionProps = false, type } = {}, preloadedFeatures, createVisualElement) {
			preloadedFeatures && loadFeatures(preloadedFeatures);
			/**
			* Determine whether to use SVG or HTML rendering based on:
			* 1. Explicit `type` option (highest priority)
			* 2. Auto-detection via `isSVGComponent`
			*/
			const isSVG = type ? type === "svg" : isSVGComponent(Component);
			const useVisualState = isSVG ? useSVGVisualState : useHTMLVisualState;
			function MotionDOMComponent(props, externalRef) {
				/**
				* If we need to measure the element we load this functionality in a
				* separate class component in order to gain access to getSnapshotBeforeUpdate.
				*/
				let MeasureLayout;
				const configAndProps = {
					...(0, react.useContext)(MotionConfigContext),
					...props,
					layoutId: useLayoutId(props)
				};
				const { isStatic } = configAndProps;
				const context = useCreateMotionContext(props);
				const visualState = useVisualState(props, isStatic);
				if (!isStatic && typeof window !== "undefined") {
					useStrictMode(configAndProps, preloadedFeatures);
					const layoutProjection = getProjectionFunctionality(configAndProps);
					MeasureLayout = layoutProjection.MeasureLayout;
					/**
					* Create a VisualElement for this component. A VisualElement provides a common
					* interface to renderer-specific APIs (ie DOM/Three.js etc) as well as
					* providing a way of rendering to these APIs outside of the React render loop
					* for more performant animations and interactions
					*/
					context.visualElement = useVisualElement(Component, visualState, configAndProps, createVisualElement, layoutProjection.ProjectionNode, isSVG);
				}
				/**
				* The mount order and hierarchy is specific to ensure our element ref
				* is hydrated by the time features fire their effects.
				*/
				return (0, react_jsx_runtime.jsxs)(MotionContext.Provider, {
					value: context,
					children: [MeasureLayout && context.visualElement ? (0, react_jsx_runtime.jsx)(MeasureLayout, {
						visualElement: context.visualElement,
						...configAndProps
					}) : null, useRender(Component, props, useMotionRef(visualState, context.visualElement, externalRef), visualState, isStatic, forwardMotionProps, isSVG)]
				});
			}
			MotionDOMComponent.displayName = `motion.${typeof Component === "string" ? Component : `create(${Component.displayName ?? Component.name ?? ""})`}`;
			const ForwardRefMotionComponent = (0, react.forwardRef)(MotionDOMComponent);
			ForwardRefMotionComponent[motionComponentSymbol] = Component;
			return ForwardRefMotionComponent;
		}
		function useLayoutId({ layoutId }) {
			const layoutGroupId = (0, react.useContext)(LayoutGroupContext).id;
			return layoutGroupId && layoutId !== void 0 ? layoutGroupId + "-" + layoutId : layoutId;
		}
		function useStrictMode(configAndProps, preloadedFeatures) {
			(0, react.useContext)(LazyContext).strict;
		}
		function getProjectionFunctionality(props) {
			const { drag, layout } = getInitializedFeatureDefinitions();
			if (!drag && !layout) return {};
			const combined = {
				...drag,
				...layout
			};
			return {
				MeasureLayout: drag?.isEnabled(props) || layout?.isEnabled(props) ? combined.MeasureLayout : void 0,
				ProjectionNode: combined.ProjectionNode
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/components/create-proxy.mjs
		function createMotionProxy(preloadedFeatures, createVisualElement) {
			if (typeof Proxy === "undefined") return createMotionComponent;
			/**
			* A cache of generated `motion` components, e.g `motion.div`, `motion.input` etc.
			* Rather than generating them anew every render.
			*/
			const componentCache = /* @__PURE__ */ new Map();
			const factory = (Component, options) => {
				return createMotionComponent(Component, options, preloadedFeatures, createVisualElement);
			};
			/**
			* Support for deprecated`motion(Component)` pattern
			*/
			const deprecatedFactoryFunction = (Component, options) => {
				return factory(Component, options);
			};
			return new Proxy(deprecatedFactoryFunction, { 
			/**
			* Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
			* The prop name is passed through as `key` and we can use that to generate a `motion`
			* DOM component with that name.
			*/
get: (_target, key) => {
				if (key === "create") return factory;
				/**
				* If this element doesn't exist in the component cache, create it and cache.
				*/
				if (!componentCache.has(key)) componentCache.set(key, createMotionComponent(key, void 0, preloadedFeatures, createVisualElement));
				return componentCache.get(key);
			} });
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/dom/create-visual-element.mjs
		const createDomVisualElement = (Component, options) => {
			return options.isSVG ?? isSVGComponent(Component) ? new SVGVisualElement(options) : new HTMLVisualElement(options, { allowProjection: Component !== react.Fragment });
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/animation/index.mjs
		var AnimationFeature = class extends Feature {
			/**
			* We dynamically generate the AnimationState manager as it contains a reference
			* to the underlying animation library. We only want to load that if we load this,
			* so people can optionally code split it out using the `m` component.
			*/
			constructor(node) {
				super(node);
				node.animationState || (node.animationState = createAnimationState(node));
			}
			updateAnimationControlsSubscription() {
				const { animate } = this.node.getProps();
				if (isAnimationControls(animate)) this.unmountControls = animate.subscribe(this.node);
			}
			/**
			* Subscribe any provided AnimationControls to the component's VisualElement
			*/
			mount() {
				this.updateAnimationControlsSubscription();
			}
			update() {
				const { animate } = this.node.getProps();
				const { animate: prevAnimate } = this.node.prevProps || {};
				if (animate !== prevAnimate) this.updateAnimationControlsSubscription();
			}
			unmount() {
				this.node.animationState.reset();
				this.unmountControls?.();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/animation/exit.mjs
		let id = 0;
		var ExitAnimationFeature = class extends Feature {
			constructor() {
				super(...arguments);
				this.id = id++;
				this.isExitComplete = false;
			}
			update() {
				if (!this.node.presenceContext) return;
				const { isPresent, onExitComplete } = this.node.presenceContext;
				const { isPresent: prevIsPresent } = this.node.prevPresenceContext || {};
				if (!this.node.animationState || isPresent === prevIsPresent) return;
				if (isPresent && prevIsPresent === false) {
					/**
					* When re-entering, if the exit animation already completed
					* (element is at rest), reset to initial values so the enter
					* animation replays from the correct position.
					*/
					if (this.isExitComplete) {
						const { initial, custom } = this.node.getProps();
						if (typeof initial === "string" || typeof initial === "object" && initial !== null && !Array.isArray(initial)) {
							const resolved = resolveVariant(this.node, initial, custom);
							if (resolved) {
								const { transition, transitionEnd, ...target } = resolved;
								for (const key in target) this.node.getValue(key)?.jump(target[key]);
							}
						}
						this.node.animationState.reset();
						this.node.animationState.animateChanges();
					} else this.node.animationState.setActive("exit", false);
					this.isExitComplete = false;
					return;
				}
				const exitAnimation = this.node.animationState.setActive("exit", !isPresent);
				if (onExitComplete && !isPresent) exitAnimation.then(() => {
					this.isExitComplete = true;
					onExitComplete(this.id);
				});
			}
			mount() {
				const { register, onExitComplete } = this.node.presenceContext || {};
				if (onExitComplete) onExitComplete(this.id);
				if (register) this.unmount = register(this.id);
			}
			unmount() {}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/animations.mjs
		const animations = {
			animation: { Feature: AnimationFeature },
			exit: { Feature: ExitAnimationFeature }
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/events/event-info.mjs
		function extractEventInfo(event) {
			return { point: {
				x: event.pageX,
				y: event.pageY
			} };
		}
		const addPointerInfo = (handler) => (event) => isPrimaryPointer(event) && handler(event, extractEventInfo(event));
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/events/add-pointer-event.mjs
		function addPointerEvent(target, eventName, handler, options) {
			return addDomEvent(target, eventName, addPointerInfo(handler), options);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/utils/get-context-window.mjs
		const getContextWindow = ({ current }) => {
			return current ? current.ownerDocument.defaultView : null;
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/utils/distance.mjs
		const distance = (a, b) => Math.abs(a - b);
		function distance2D(a, b) {
			const xDelta = distance(a.x, b.x);
			const yDelta = distance(a.y, b.y);
			return Math.sqrt(xDelta ** 2 + yDelta ** 2);
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/pan/PanSession.mjs
		const overflowStyles = /*#__PURE__*/ new Set(["auto", "scroll"]);
		/**
		* @internal
		*/
		var PanSession = class {
			constructor(event, handlers, { transformPagePoint, contextWindow = window, dragSnapToOrigin = false, distanceThreshold = 3, element } = {}) {
				/**
				* @internal
				*/
				this.startEvent = null;
				/**
				* @internal
				*/
				this.lastMoveEvent = null;
				/**
				* @internal
				*/
				this.lastMoveEventInfo = null;
				/**
				* Raw (untransformed) event info, re-transformed each frame
				* so transformPagePoint sees the current parent matrix.
				* @internal
				*/
				this.lastRawMoveEventInfo = null;
				/**
				* @internal
				*/
				this.handlers = {};
				/**
				* @internal
				*/
				this.contextWindow = window;
				/**
				* Scroll positions of scrollable ancestors and window.
				* @internal
				*/
				this.scrollPositions = /* @__PURE__ */ new Map();
				/**
				* Cleanup function for scroll listeners.
				* @internal
				*/
				this.removeScrollListeners = null;
				this.onElementScroll = (event) => {
					this.handleScroll(event.target);
				};
				this.onWindowScroll = () => {
					this.handleScroll(window);
				};
				this.updatePoint = () => {
					if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
					if (this.lastRawMoveEventInfo) this.lastMoveEventInfo = transformPoint(this.lastRawMoveEventInfo, this.transformPagePoint);
					const info = getPanInfo(this.lastMoveEventInfo, this.history);
					const isPanStarted = this.startEvent !== null;
					const isDistancePastThreshold = distance2D(info.offset, {
						x: 0,
						y: 0
					}) >= this.distanceThreshold;
					if (!isPanStarted && !isDistancePastThreshold) return;
					const { point } = info;
					const { timestamp } = frameData;
					this.history.push({
						...point,
						timestamp
					});
					const { onStart, onMove } = this.handlers;
					if (!isPanStarted) {
						onStart && onStart(this.lastMoveEvent, info);
						this.startEvent = this.lastMoveEvent;
					}
					onMove && onMove(this.lastMoveEvent, info);
				};
				this.handlePointerMove = (event, info) => {
					this.lastMoveEvent = event;
					this.lastRawMoveEventInfo = info;
					this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
					frame.update(this.updatePoint, true);
				};
				this.handlePointerUp = (event, info) => {
					this.end();
					const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;
					if (this.dragSnapToOrigin || !this.startEvent) resumeAnimation && resumeAnimation();
					if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
					const panInfo = getPanInfo(event.type === "pointercancel" ? this.lastMoveEventInfo : transformPoint(info, this.transformPagePoint), this.history);
					if (this.startEvent && onEnd) onEnd(event, panInfo);
					onSessionEnd && onSessionEnd(event, panInfo);
				};
				if (!isPrimaryPointer(event)) return;
				this.dragSnapToOrigin = dragSnapToOrigin;
				this.handlers = handlers;
				this.transformPagePoint = transformPagePoint;
				this.distanceThreshold = distanceThreshold;
				this.contextWindow = contextWindow || window;
				const initialInfo = transformPoint(extractEventInfo(event), this.transformPagePoint);
				const { point } = initialInfo;
				const { timestamp } = frameData;
				this.history = [{
					...point,
					timestamp
				}];
				const { onSessionStart } = handlers;
				onSessionStart && onSessionStart(event, getPanInfo(initialInfo, this.history));
				const eventOptions = {
					passive: true,
					capture: true
				};
				this.removeListeners = pipe(addPointerEvent(this.contextWindow, "pointermove", this.handlePointerMove, eventOptions), addPointerEvent(this.contextWindow, "pointerup", this.handlePointerUp, eventOptions), addPointerEvent(this.contextWindow, "pointercancel", this.handlePointerUp, eventOptions));
				if (element) this.startScrollTracking(element);
			}
			/**
			* Start tracking scroll on ancestors and window.
			*/
			startScrollTracking(element) {
				let current = element.parentElement;
				while (current) {
					const style = getComputedStyle(current);
					if (overflowStyles.has(style.overflowX) || overflowStyles.has(style.overflowY)) this.scrollPositions.set(current, {
						x: current.scrollLeft,
						y: current.scrollTop
					});
					current = current.parentElement;
				}
				this.scrollPositions.set(window, {
					x: window.scrollX,
					y: window.scrollY
				});
				window.addEventListener("scroll", this.onElementScroll, { capture: true });
				window.addEventListener("scroll", this.onWindowScroll);
				this.removeScrollListeners = () => {
					window.removeEventListener("scroll", this.onElementScroll, { capture: true });
					window.removeEventListener("scroll", this.onWindowScroll);
				};
			}
			/**
			* Handle scroll compensation during drag.
			*
			* For element scroll: adjusts history origin since pageX/pageY doesn't change.
			* For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
			*/
			handleScroll(target) {
				const initial = this.scrollPositions.get(target);
				if (!initial) return;
				const isWindow = target === window;
				const current = isWindow ? {
					x: window.scrollX,
					y: window.scrollY
				} : {
					x: target.scrollLeft,
					y: target.scrollTop
				};
				const delta = {
					x: current.x - initial.x,
					y: current.y - initial.y
				};
				if (delta.x === 0 && delta.y === 0) return;
				if (isWindow) {
					if (this.lastMoveEventInfo) {
						this.lastMoveEventInfo.point.x += delta.x;
						this.lastMoveEventInfo.point.y += delta.y;
					}
				} else if (this.history.length > 0) {
					this.history[0].x -= delta.x;
					this.history[0].y -= delta.y;
				}
				this.scrollPositions.set(target, current);
				frame.update(this.updatePoint, true);
			}
			updateHandlers(handlers) {
				this.handlers = handlers;
			}
			end() {
				this.removeListeners && this.removeListeners();
				this.removeScrollListeners && this.removeScrollListeners();
				this.scrollPositions.clear();
				cancelFrame(this.updatePoint);
			}
		};
		function transformPoint(info, transformPagePoint) {
			return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
		}
		function subtractPoint(a, b) {
			return {
				x: a.x - b.x,
				y: a.y - b.y
			};
		}
		function getPanInfo({ point }, history) {
			return {
				point,
				delta: subtractPoint(point, lastDevicePoint(history)),
				offset: subtractPoint(point, startDevicePoint(history)),
				velocity: getVelocity(history, .1)
			};
		}
		function startDevicePoint(history) {
			return history[0];
		}
		function lastDevicePoint(history) {
			return history[history.length - 1];
		}
		function getVelocity(history, timeDelta) {
			if (history.length < 2) return {
				x: 0,
				y: 0
			};
			let i = history.length - 1;
			let timestampedPoint = null;
			const lastPoint = lastDevicePoint(history);
			while (i >= 0) {
				timestampedPoint = history[i];
				if (lastPoint.timestamp - timestampedPoint.timestamp > /* @__PURE__ */ secondsToMilliseconds(timeDelta)) break;
				i--;
			}
			if (!timestampedPoint) return {
				x: 0,
				y: 0
			};
			/**
			* If the selected point is the pointer-down origin (history[0]),
			* there are better movement points available, and the time gap
			* is suspiciously large (>2x timeDelta), use the next point instead.
			* This prevents stale pointer-down points from diluting velocity
			* in hold-then-flick gestures.
			*/
			if (timestampedPoint === history[0] && history.length > 2 && lastPoint.timestamp - timestampedPoint.timestamp > /* @__PURE__ */ secondsToMilliseconds(timeDelta) * 2) timestampedPoint = history[1];
			const time = /* @__PURE__ */ millisecondsToSeconds(lastPoint.timestamp - timestampedPoint.timestamp);
			if (time === 0) return {
				x: 0,
				y: 0
			};
			const currentVelocity = {
				x: (lastPoint.x - timestampedPoint.x) / time,
				y: (lastPoint.y - timestampedPoint.y) / time
			};
			if (currentVelocity.x === Infinity) currentVelocity.x = 0;
			if (currentVelocity.y === Infinity) currentVelocity.y = 0;
			return currentVelocity;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/drag/utils/constraints.mjs
		/**
		* Apply constraints to a point. These constraints are both physical along an
		* axis, and an elastic factor that determines how much to constrain the point
		* by if it does lie outside the defined parameters.
		*/
		function applyConstraints(point, { min, max }, elastic) {
			if (min !== void 0 && point < min) point = elastic ? mixNumber$1(min, point, elastic.min) : Math.max(point, min);
			else if (max !== void 0 && point > max) point = elastic ? mixNumber$1(max, point, elastic.max) : Math.min(point, max);
			return point;
		}
		/**
		* Calculate constraints in terms of the viewport when defined relatively to the
		* measured axis. This is measured from the nearest edge, so a max constraint of 200
		* on an axis with a max value of 300 would return a constraint of 500 - axis length
		*/
		function calcRelativeAxisConstraints(axis, min, max) {
			return {
				min: min !== void 0 ? axis.min + min : void 0,
				max: max !== void 0 ? axis.max + max - (axis.max - axis.min) : void 0
			};
		}
		/**
		* Calculate constraints in terms of the viewport when
		* defined relatively to the measured bounding box.
		*/
		function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
			return {
				x: calcRelativeAxisConstraints(layoutBox.x, left, right),
				y: calcRelativeAxisConstraints(layoutBox.y, top, bottom)
			};
		}
		/**
		* Calculate viewport constraints when defined as another viewport-relative axis
		*/
		function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
			let min = constraintsAxis.min - layoutAxis.min;
			let max = constraintsAxis.max - layoutAxis.max;
			if (constraintsAxis.max - constraintsAxis.min < layoutAxis.max - layoutAxis.min) [min, max] = [max, min];
			return {
				min,
				max
			};
		}
		/**
		* Calculate viewport constraints when defined as another viewport-relative box
		*/
		function calcViewportConstraints(layoutBox, constraintsBox) {
			return {
				x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
				y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y)
			};
		}
		/**
		* Calculate a transform origin relative to the source axis, between 0-1, that results
		* in an asthetically pleasing scale/transform needed to project from source to target.
		*/
		function calcOrigin(source, target) {
			let origin = .5;
			const sourceLength = calcLength(source);
			const targetLength = calcLength(target);
			if (targetLength > sourceLength) origin = /* @__PURE__ */ progress(target.min, target.max - sourceLength, source.min);
			else if (sourceLength > targetLength) origin = /* @__PURE__ */ progress(source.min, source.max - targetLength, target.min);
			return clamp(0, 1, origin);
		}
		/**
		* Rebase the calculated viewport constraints relative to the layout.min point.
		*/
		function rebaseAxisConstraints(layout, constraints) {
			const relativeConstraints = {};
			if (constraints.min !== void 0) relativeConstraints.min = constraints.min - layout.min;
			if (constraints.max !== void 0) relativeConstraints.max = constraints.max - layout.min;
			return relativeConstraints;
		}
		const defaultElastic = .35;
		/**
		* Accepts a dragElastic prop and returns resolved elastic values for each axis.
		*/
		function resolveDragElastic(dragElastic = defaultElastic) {
			if (dragElastic === false) dragElastic = 0;
			else if (dragElastic === true) dragElastic = defaultElastic;
			return {
				x: resolveAxisElastic(dragElastic, "left", "right"),
				y: resolveAxisElastic(dragElastic, "top", "bottom")
			};
		}
		function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
			return {
				min: resolvePointElastic(dragElastic, minLabel),
				max: resolvePointElastic(dragElastic, maxLabel)
			};
		}
		function resolvePointElastic(dragElastic, label) {
			return typeof dragElastic === "number" ? dragElastic : dragElastic[label] || 0;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs
		const elementDragControls = /* @__PURE__ */ new WeakMap();
		var VisualElementDragControls = class {
			constructor(visualElement) {
				this.openDragLock = null;
				this.isDragging = false;
				this.currentDirection = null;
				this.originPoint = {
					x: 0,
					y: 0
				};
				/**
				* The permitted boundaries of travel, in pixels.
				*/
				this.constraints = false;
				this.hasMutatedConstraints = false;
				/**
				* The per-axis resolved elastic values.
				*/
				this.elastic = createBox();
				/**
				* The latest pointer event. Used as fallback when the `cancel` and `stop` functions are called without arguments.
				*/
				this.latestPointerEvent = null;
				/**
				* The latest pan info. Used as fallback when the `cancel` and `stop` functions are called without arguments.
				*/
				this.latestPanInfo = null;
				this.visualElement = visualElement;
			}
			start(originEvent, { snapToCursor = false, distanceThreshold } = {}) {
				/**
				* Don't start dragging if this component is exiting
				*/
				const { presenceContext } = this.visualElement;
				if (presenceContext && presenceContext.isPresent === false) return;
				const onSessionStart = (event) => {
					if (snapToCursor) this.snapToCursor(extractEventInfo(event).point);
					this.stopAnimation();
				};
				const onStart = (event, info) => {
					const { drag, dragPropagation, onDragStart } = this.getProps();
					if (drag && !dragPropagation) {
						if (this.openDragLock) this.openDragLock();
						this.openDragLock = setDragLock(drag);
						if (!this.openDragLock) return;
					}
					this.latestPointerEvent = event;
					this.latestPanInfo = info;
					this.isDragging = true;
					this.currentDirection = null;
					this.resolveConstraints();
					if (this.visualElement.projection) {
						this.visualElement.projection.isAnimationBlocked = true;
						this.visualElement.projection.target = void 0;
					}
					/**
					* Record gesture origin and pointer offset
					*/
					eachAxis((axis) => {
						let current = this.getAxisMotionValue(axis).get() || 0;
						/**
						* If the MotionValue is a percentage value convert to px
						*/
						if (percent.test(current)) {
							const { projection } = this.visualElement;
							if (projection && projection.layout) {
								const measuredAxis = projection.layout.layoutBox[axis];
								if (measuredAxis) current = calcLength(measuredAxis) * (parseFloat(current) / 100);
							}
						}
						this.originPoint[axis] = current;
					});
					if (onDragStart) frame.update(() => onDragStart(event, info), false, true);
					addValueToWillChange(this.visualElement, "transform");
					const { animationState } = this.visualElement;
					animationState && animationState.setActive("whileDrag", true);
				};
				const onMove = (event, info) => {
					this.latestPointerEvent = event;
					this.latestPanInfo = info;
					const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag } = this.getProps();
					if (!dragPropagation && !this.openDragLock) return;
					const { offset } = info;
					if (dragDirectionLock && this.currentDirection === null) {
						this.currentDirection = getCurrentDirection(offset);
						if (this.currentDirection !== null) onDirectionLock && onDirectionLock(this.currentDirection);
						return;
					}
					this.updateAxis("x", info.point, offset);
					this.updateAxis("y", info.point, offset);
					/**
					* Ideally we would leave the renderer to fire naturally at the end of
					* this frame but if the element is about to change layout as the result
					* of a re-render we want to ensure the browser can read the latest
					* bounding box to ensure the pointer and element don't fall out of sync.
					*/
					this.visualElement.render();
					/**
					* This must fire after the render call as it might trigger a state
					* change which itself might trigger a layout update.
					*/
					if (onDrag) frame.update(() => onDrag(event, info), false, true);
				};
				const onSessionEnd = (event, info) => {
					this.latestPointerEvent = event;
					this.latestPanInfo = info;
					this.stop(event, info);
					this.latestPointerEvent = null;
					this.latestPanInfo = null;
				};
				const resumeAnimation = () => {
					const { dragSnapToOrigin: snap } = this.getProps();
					if (snap || this.constraints) this.startAnimation({
						x: 0,
						y: 0
					});
				};
				const { dragSnapToOrigin } = this.getProps();
				this.panSession = new PanSession(originEvent, {
					onSessionStart,
					onStart,
					onMove,
					onSessionEnd,
					resumeAnimation
				}, {
					transformPagePoint: this.visualElement.getTransformPagePoint(),
					dragSnapToOrigin,
					distanceThreshold,
					contextWindow: getContextWindow(this.visualElement),
					element: this.visualElement.current
				});
			}
			/**
			* @internal
			*/
			stop(event, panInfo) {
				const finalEvent = event || this.latestPointerEvent;
				const finalPanInfo = panInfo || this.latestPanInfo;
				const isDragging = this.isDragging;
				this.cancel();
				if (!isDragging || !finalPanInfo || !finalEvent) return;
				const { velocity } = finalPanInfo;
				this.startAnimation(velocity);
				const { onDragEnd } = this.getProps();
				if (onDragEnd) frame.postRender(() => onDragEnd(finalEvent, finalPanInfo));
			}
			/**
			* @internal
			*/
			cancel() {
				this.isDragging = false;
				const { projection, animationState } = this.visualElement;
				if (projection) projection.isAnimationBlocked = false;
				this.endPanSession();
				const { dragPropagation } = this.getProps();
				if (!dragPropagation && this.openDragLock) {
					this.openDragLock();
					this.openDragLock = null;
				}
				animationState && animationState.setActive("whileDrag", false);
			}
			/**
			* Clean up the pan session without modifying other drag state.
			* This is used during unmount to ensure event listeners are removed
			* without affecting projection animations or drag locks.
			* @internal
			*/
			endPanSession() {
				this.panSession && this.panSession.end();
				this.panSession = void 0;
			}
			updateAxis(axis, _point, offset) {
				const { drag } = this.getProps();
				if (!offset || !shouldDrag(axis, drag, this.currentDirection)) return;
				const axisValue = this.getAxisMotionValue(axis);
				let next = this.originPoint[axis] + offset[axis];
				if (this.constraints && this.constraints[axis]) next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
				axisValue.set(next);
			}
			resolveConstraints() {
				const { dragConstraints, dragElastic } = this.getProps();
				const layout = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(false) : this.visualElement.projection?.layout;
				const prevConstraints = this.constraints;
				if (dragConstraints && isRefObject(dragConstraints)) {
					if (!this.constraints) this.constraints = this.resolveRefConstraints();
				} else if (dragConstraints && layout) this.constraints = calcRelativeConstraints(layout.layoutBox, dragConstraints);
				else this.constraints = false;
				this.elastic = resolveDragElastic(dragElastic);
				/**
				* If we're outputting to external MotionValues, we want to rebase the measured constraints
				* from viewport-relative to component-relative. This only applies to relative (non-ref)
				* constraints, as ref-based constraints from calcViewportConstraints are already in the
				* correct coordinate space for the motion value transform offset.
				*/
				if (prevConstraints !== this.constraints && !isRefObject(dragConstraints) && layout && this.constraints && !this.hasMutatedConstraints) eachAxis((axis) => {
					if (this.constraints !== false && this.getAxisMotionValue(axis)) this.constraints[axis] = rebaseAxisConstraints(layout.layoutBox[axis], this.constraints[axis]);
				});
			}
			resolveRefConstraints() {
				const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
				if (!constraints || !isRefObject(constraints)) return false;
				const constraintsElement = constraints.current;
				const { projection } = this.visualElement;
				if (!projection || !projection.layout) return false;
				/**
				* Refresh the root scroll offset so the constraint's viewport box
				* translates to correct page coordinates. The scroll captured at
				* drag mount can be stale if the document was scrolled afterwards —
				* e.g. via the browser restoring scroll on refresh, or an ancestor
				* layout effect running after this element's mount (#2829).
				*
				* Clear the cached scroll first so `updateScroll` bypasses its
				* per-animationId cache and re-reads the live value.
				*/
				if (projection.root) {
					projection.root.scroll = void 0;
					projection.root.updateScroll();
				}
				const constraintsBox = measurePageBox(constraintsElement, projection.root, this.visualElement.getTransformPagePoint());
				let measuredConstraints = calcViewportConstraints(projection.layout.layoutBox, constraintsBox);
				/**
				* If there's an onMeasureDragConstraints listener we call it and
				* if different constraints are returned, set constraints to that
				*/
				if (onMeasureDragConstraints) {
					const userConstraints = onMeasureDragConstraints(convertBoxToBoundingBox(measuredConstraints));
					this.hasMutatedConstraints = !!userConstraints;
					if (userConstraints) measuredConstraints = convertBoundingBoxToBox(userConstraints);
				}
				return measuredConstraints;
			}
			startAnimation(velocity) {
				const { drag, dragMomentum, dragElastic, dragTransition, dragSnapToOrigin, onDragTransitionEnd } = this.getProps();
				const constraints = this.constraints || {};
				const momentumAnimations = eachAxis((axis) => {
					if (!shouldDrag(axis, drag, this.currentDirection)) return;
					let transition = constraints && constraints[axis] || {};
					if (dragSnapToOrigin === true || dragSnapToOrigin === axis) transition = {
						min: 0,
						max: 0
					};
					/**
					* Overdamp the boundary spring if `dragElastic` is disabled. There's still a frame
					* of spring animations so we should look into adding a disable spring option to `inertia`.
					* We could do something here where we affect the `bounceStiffness` and `bounceDamping`
					* using the value of `dragElastic`.
					*/
					const bounceStiffness = dragElastic ? 200 : 1e6;
					const bounceDamping = dragElastic ? 40 : 1e7;
					const inertia = {
						type: "inertia",
						velocity: dragMomentum ? velocity[axis] : 0,
						bounceStiffness,
						bounceDamping,
						timeConstant: 750,
						restDelta: 1,
						restSpeed: 10,
						...dragTransition,
						...transition
					};
					return this.startAxisValueAnimation(axis, inertia);
				});
				return Promise.all(momentumAnimations).then(onDragTransitionEnd);
			}
			startAxisValueAnimation(axis, transition) {
				const axisValue = this.getAxisMotionValue(axis);
				addValueToWillChange(this.visualElement, axis);
				return axisValue.start(animateMotionValue(axis, axisValue, 0, transition, this.visualElement, false));
			}
			stopAnimation() {
				eachAxis((axis) => this.getAxisMotionValue(axis).stop());
			}
			/**
			* Drag works differently depending on which props are provided.
			*
			* - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
			* - Otherwise, we apply the delta to the x/y motion values.
			*/
			getAxisMotionValue(axis) {
				const dragKey = `_drag${axis.toUpperCase()}`;
				const externalMotionValue = this.visualElement.getProps()[dragKey];
				return externalMotionValue ? externalMotionValue : this.visualElement.getValue(axis, this.visualElement.latestValues[axis] ?? 0);
			}
			snapToCursor(point) {
				eachAxis((axis) => {
					const { drag } = this.getProps();
					if (!shouldDrag(axis, drag, this.currentDirection)) return;
					const { projection } = this.visualElement;
					const axisValue = this.getAxisMotionValue(axis);
					if (projection && projection.layout) {
						const { min, max } = projection.layout.layoutBox[axis];
						/**
						* The layout measurement includes the current transform value,
						* so we need to add it back to get the correct snap position.
						* This fixes an issue where elements with initial coordinates
						* would snap to the wrong position on the first drag.
						*/
						const current = axisValue.get() || 0;
						axisValue.set(point[axis] - mixNumber$1(min, max, .5) + current);
					}
				});
			}
			/**
			* When the viewport resizes we want to check if the measured constraints
			* have changed and, if so, reposition the element within those new constraints
			* relative to where it was before the resize.
			*/
			scalePositionWithinConstraints() {
				if (!this.visualElement.current) return;
				const { drag, dragConstraints } = this.getProps();
				const { projection } = this.visualElement;
				if (!isRefObject(dragConstraints) || !projection || !this.constraints) return;
				/**
				* Stop current animations as there can be visual glitching if we try to do
				* this mid-animation
				*/
				this.stopAnimation();
				/**
				* Record the relative position of the dragged element relative to the
				* constraints box and save as a progress value.
				*/
				const boxProgress = {
					x: 0,
					y: 0
				};
				eachAxis((axis) => {
					const axisValue = this.getAxisMotionValue(axis);
					if (axisValue && this.constraints !== false) {
						const latest = axisValue.get();
						boxProgress[axis] = calcOrigin({
							min: latest,
							max: latest
						}, this.constraints[axis]);
					}
				});
				/**
				* Update the layout of this element and resolve the latest drag constraints
				*/
				const { transformTemplate } = this.visualElement.getProps();
				this.visualElement.current.style.transform = transformTemplate ? transformTemplate({}, "") : "none";
				projection.root && projection.root.updateScroll();
				projection.updateLayout();
				/**
				* Reset constraints so resolveConstraints() will recalculate them
				* with the freshly measured layout rather than returning the cached value.
				*/
				this.constraints = false;
				this.resolveConstraints();
				/**
				* For each axis, calculate the current progress of the layout axis
				* within the new constraints.
				*/
				eachAxis((axis) => {
					if (!shouldDrag(axis, drag, null)) return;
					/**
					* Calculate a new transform based on the previous box progress
					*/
					const axisValue = this.getAxisMotionValue(axis);
					const { min, max } = this.constraints[axis];
					axisValue.set(mixNumber$1(min, max, boxProgress[axis]));
				});
				/**
				* Flush the updated transform to the DOM synchronously to prevent
				* a visual flash at the element's CSS layout position (0,0) when
				* the transform was stripped for measurement.
				*/
				this.visualElement.render();
			}
			addListeners() {
				if (!this.visualElement.current) return;
				elementDragControls.set(this.visualElement, this);
				const element = this.visualElement.current;
				/**
				* Attach a pointerdown event listener on this DOM element to initiate drag tracking.
				*/
				const stopPointerListener = addPointerEvent(element, "pointerdown", (event) => {
					const { drag, dragListener = true } = this.getProps();
					const target = event.target;
					/**
					* Only block drag if clicking on a text input child element
					* (input, textarea, select, contenteditable) where users might
					* want to select text or interact with the control.
					*
					* Buttons and links don't block drag since they don't have
					* click-and-move actions of their own.
					*/
					const isClickingTextInputChild = target !== element && isElementTextInput(target);
					if (drag && dragListener && !isClickingTextInputChild) this.start(event);
				});
				/**
				* If using ref-based constraints, observe both the draggable element
				* and the constraint container for size changes via ResizeObserver.
				* Setup is deferred because dragConstraints.current is null when
				* addListeners first runs (React hasn't committed the ref yet).
				*/
				let stopResizeObservers;
				const measureDragConstraints = () => {
					const { dragConstraints } = this.getProps();
					if (isRefObject(dragConstraints) && dragConstraints.current) {
						this.constraints = this.resolveRefConstraints();
						if (!stopResizeObservers) stopResizeObservers = startResizeObservers(element, dragConstraints.current, () => this.scalePositionWithinConstraints());
					}
				};
				const { projection } = this.visualElement;
				const stopMeasureLayoutListener = projection.addEventListener("measure", measureDragConstraints);
				if (projection && !projection.layout) {
					projection.root && projection.root.updateScroll();
					projection.updateLayout();
				}
				frame.read(measureDragConstraints);
				/**
				* Attach a window resize listener to scale the draggable target within its defined
				* constraints as the window resizes.
				*/
				const stopResizeListener = addDomEvent(window, "resize", () => this.scalePositionWithinConstraints());
				/**
				* If the element's layout changes, calculate the delta and apply that to
				* the drag gesture's origin point.
				*/
				const stopLayoutUpdateListener = projection.addEventListener("didUpdate", (({ delta, hasLayoutChanged }) => {
					if (this.isDragging && hasLayoutChanged) {
						eachAxis((axis) => {
							const motionValue = this.getAxisMotionValue(axis);
							if (!motionValue) return;
							this.originPoint[axis] += delta[axis].translate;
							motionValue.set(motionValue.get() + delta[axis].translate);
						});
						this.visualElement.render();
					}
				}));
				return () => {
					stopResizeListener();
					stopPointerListener();
					stopMeasureLayoutListener();
					stopLayoutUpdateListener && stopLayoutUpdateListener();
					stopResizeObservers && stopResizeObservers();
				};
			}
			getProps() {
				const props = this.visualElement.getProps();
				const { drag = false, dragDirectionLock = false, dragPropagation = false, dragConstraints = false, dragElastic = defaultElastic, dragMomentum = true } = props;
				return {
					...props,
					drag,
					dragDirectionLock,
					dragPropagation,
					dragConstraints,
					dragElastic,
					dragMomentum
				};
			}
		};
		function skipFirstCall(callback) {
			let isFirst = true;
			return () => {
				if (isFirst) {
					isFirst = false;
					return;
				}
				callback();
			};
		}
		function startResizeObservers(element, constraintsElement, onResize) {
			const stopElement = resize(element, skipFirstCall(onResize));
			const stopContainer = resize(constraintsElement, skipFirstCall(onResize));
			return () => {
				stopElement();
				stopContainer();
			};
		}
		function shouldDrag(direction, drag, currentDirection) {
			return (drag === true || drag === direction) && (currentDirection === null || currentDirection === direction);
		}
		/**
		* Based on an x/y offset determine the current drag direction. If both axis' offsets are lower
		* than the provided threshold, return `null`.
		*
		* @param offset - The x/y offset from origin.
		* @param lockThreshold - (Optional) - the minimum absolute offset before we can determine a drag direction.
		*/
		function getCurrentDirection(offset, lockThreshold = 10) {
			let direction = null;
			if (Math.abs(offset.y) > lockThreshold) direction = "y";
			else if (Math.abs(offset.x) > lockThreshold) direction = "x";
			return direction;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/drag/index.mjs
		var DragGesture = class extends Feature {
			constructor(node) {
				super(node);
				this.removeGroupControls = noop;
				this.removeListeners = noop;
				this.controls = new VisualElementDragControls(node);
			}
			mount() {
				const { dragControls } = this.node.getProps();
				if (dragControls) this.removeGroupControls = dragControls.subscribe(this.controls);
				this.removeListeners = this.controls.addListeners() || noop;
			}
			update() {
				const { dragControls } = this.node.getProps();
				const { dragControls: prevDragControls } = this.node.prevProps || {};
				if (dragControls !== prevDragControls) {
					this.removeGroupControls();
					if (dragControls) this.removeGroupControls = dragControls.subscribe(this.controls);
				}
			}
			unmount() {
				this.removeGroupControls();
				this.removeListeners();
				/**
				* In React 19, during list reorder reconciliation, components may
				* briefly unmount and remount while the drag is still active. If we're
				* actively dragging, we should NOT end the pan session - it will
				* continue tracking pointer events via its window-level listeners.
				*
				* The pan session will be properly cleaned up when:
				* 1. The drag ends naturally (pointerup/pointercancel)
				* 2. The component is truly removed from the DOM
				*/
				if (!this.controls.isDragging) this.controls.endPanSession();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/pan/index.mjs
		const asyncHandler = (handler) => (event, info) => {
			if (handler) frame.update(() => handler(event, info), false, true);
		};
		var PanGesture = class extends Feature {
			constructor() {
				super(...arguments);
				this.removePointerDownListener = noop;
			}
			onPointerDown(pointerDownEvent) {
				this.session = new PanSession(pointerDownEvent, this.createPanHandlers(), {
					transformPagePoint: this.node.getTransformPagePoint(),
					contextWindow: getContextWindow(this.node)
				});
			}
			createPanHandlers() {
				const { onPanSessionStart, onPanStart, onPan, onPanEnd } = this.node.getProps();
				return {
					onSessionStart: asyncHandler(onPanSessionStart),
					onStart: asyncHandler(onPanStart),
					onMove: asyncHandler(onPan),
					onEnd: (event, info) => {
						delete this.session;
						if (onPanEnd) frame.postRender(() => onPanEnd(event, info));
					}
				};
			}
			mount() {
				this.removePointerDownListener = addPointerEvent(this.node.current, "pointerdown", (event) => this.onPointerDown(event));
			}
			update() {
				this.session && this.session.updateHandlers(this.createPanHandlers());
			}
			unmount() {
				this.removePointerDownListener();
				this.session && this.session.end();
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/layout/MeasureLayout.mjs
		/**
		* Track whether we've taken any snapshots yet. If not,
		* we can safely skip notification of didUpdate.
		*
		* Difficult to capture in a test but to prevent flickering
		* we must set this to true either on update or unmount.
		* Running `next-env/layout-id` in Safari will show this behaviour if broken.
		*/
		let hasTakenAnySnapshot = false;
		var MeasureLayoutWithContext = class extends react.Component {
			/**
			* This only mounts projection nodes for components that
			* need measuring, we might want to do it for all components
			* in order to incorporate transforms
			*/
			componentDidMount() {
				const { visualElement, layoutGroup, switchLayoutGroup, layoutId } = this.props;
				const { projection } = visualElement;
				if (projection) {
					if (layoutGroup.group) layoutGroup.group.add(projection);
					if (switchLayoutGroup && switchLayoutGroup.register && layoutId) switchLayoutGroup.register(projection);
					if (hasTakenAnySnapshot) projection.root.didUpdate();
					projection.addEventListener("animationComplete", () => {
						this.safeToRemove();
					});
					projection.setOptions({
						...projection.options,
						layoutDependency: this.props.layoutDependency,
						onExitComplete: () => this.safeToRemove()
					});
				}
				globalProjectionState.hasEverUpdated = true;
			}
			getSnapshotBeforeUpdate(prevProps) {
				const { layoutDependency, visualElement, drag, isPresent } = this.props;
				const { projection } = visualElement;
				if (!projection) return null;
				/**
				* TODO: We use this data in relegate to determine whether to
				* promote a previous element. There's no guarantee its presence data
				* will have updated by this point - if a bug like this arises it will
				* have to be that we markForRelegation and then find a new lead some other way,
				* perhaps in didUpdate
				*/
				projection.isPresent = isPresent;
				if (prevProps.layoutDependency !== layoutDependency) projection.setOptions({
					...projection.options,
					layoutDependency
				});
				hasTakenAnySnapshot = true;
				if (drag || prevProps.layoutDependency !== layoutDependency || layoutDependency === void 0 || prevProps.isPresent !== isPresent) projection.willUpdate();
				else this.safeToRemove();
				if (prevProps.isPresent !== isPresent) {
					if (isPresent) projection.promote();
					else if (!projection.relegate())
 /**
					* If there's another stack member taking over from this one,
					* it's in charge of the exit animation and therefore should
					* be in charge of the safe to remove. Otherwise we call it here.
					*/
					frame.postRender(() => {
						const stack = projection.getStack();
						if (!stack || !stack.members.length) this.safeToRemove();
					});
				}
				return null;
			}
			componentDidUpdate() {
				const { visualElement, layoutAnchor } = this.props;
				const { projection } = visualElement;
				if (projection) {
					projection.options.layoutAnchor = layoutAnchor;
					projection.root.didUpdate();
					microtask.postRender(() => {
						if (!projection.currentAnimation && projection.isLead()) this.safeToRemove();
					});
				}
			}
			componentWillUnmount() {
				const { visualElement, layoutGroup, switchLayoutGroup: promoteContext } = this.props;
				const { projection } = visualElement;
				hasTakenAnySnapshot = true;
				if (projection) {
					projection.scheduleCheckAfterUnmount();
					if (layoutGroup && layoutGroup.group) layoutGroup.group.remove(projection);
					if (promoteContext && promoteContext.deregister) promoteContext.deregister(projection);
				}
			}
			safeToRemove() {
				const { safeToRemove } = this.props;
				safeToRemove && safeToRemove();
			}
			render() {
				return null;
			}
		};
		function MeasureLayout(props) {
			const [isPresent, safeToRemove] = usePresence();
			const layoutGroup = (0, react.useContext)(LayoutGroupContext);
			return (0, react_jsx_runtime.jsx)(MeasureLayoutWithContext, {
				...props,
				layoutGroup,
				switchLayoutGroup: (0, react.useContext)(SwitchLayoutGroupContext),
				isPresent,
				safeToRemove
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/drag.mjs
		const drag = {
			pan: { Feature: PanGesture },
			drag: {
				Feature: DragGesture,
				ProjectionNode: HTMLProjectionNode,
				MeasureLayout
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/hover.mjs
		function handleHoverEvent(node, event, lifecycle) {
			const { props } = node;
			if (node.animationState && props.whileHover) node.animationState.setActive("whileHover", lifecycle === "Start");
			const callback = props["onHover" + lifecycle];
			if (callback) frame.postRender(() => callback(event, extractEventInfo(event)));
		}
		var HoverGesture = class extends Feature {
			mount() {
				const { current } = this.node;
				if (!current) return;
				this.unmount = hover(current, (_element, startEvent) => {
					handleHoverEvent(this.node, startEvent, "Start");
					return (endEvent) => handleHoverEvent(this.node, endEvent, "End");
				});
			}
			unmount() {}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/focus.mjs
		var FocusGesture = class extends Feature {
			constructor() {
				super(...arguments);
				this.isActive = false;
			}
			onFocus() {
				let isFocusVisible = false;
				/**
				* If this element doesn't match focus-visible then don't
				* apply whileHover. But, if matches throws that focus-visible
				* is not a valid selector then in that browser outline styles will be applied
				* to the element by default and we want to match that behaviour with whileFocus.
				*/
				try {
					isFocusVisible = this.node.current.matches(":focus-visible");
				} catch (e) {
					isFocusVisible = true;
				}
				if (!isFocusVisible || !this.node.animationState) return;
				this.node.animationState.setActive("whileFocus", true);
				this.isActive = true;
			}
			onBlur() {
				if (!this.isActive || !this.node.animationState) return;
				this.node.animationState.setActive("whileFocus", false);
				this.isActive = false;
			}
			mount() {
				this.unmount = pipe(addDomEvent(this.node.current, "focus", () => this.onFocus()), addDomEvent(this.node.current, "blur", () => this.onBlur()));
			}
			unmount() {}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/gestures/press.mjs
		function handlePressEvent(node, event, lifecycle) {
			const { props } = node;
			if (node.current instanceof HTMLButtonElement && node.current.disabled) return;
			if (node.animationState && props.whileTap) node.animationState.setActive("whileTap", lifecycle === "Start");
			const callback = props["onTap" + (lifecycle === "End" ? "" : lifecycle)];
			if (callback) frame.postRender(() => callback(event, extractEventInfo(event)));
		}
		var PressGesture = class extends Feature {
			mount() {
				const { current } = this.node;
				if (!current) return;
				const { globalTapTarget, propagate } = this.node.props;
				this.unmount = press(current, (_element, startEvent) => {
					handlePressEvent(this.node, startEvent, "Start");
					return (endEvent, { success }) => handlePressEvent(this.node, endEvent, success ? "End" : "Cancel");
				}, {
					useGlobalTarget: globalTapTarget,
					stopPropagation: propagate?.tap === false
				});
			}
			unmount() {}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/viewport/observers.mjs
		/**
		* Map an IntersectionHandler callback to an element. We only ever make one handler for one
		* element, so even though these handlers might all be triggered by different
		* observers, we can keep them in the same map.
		*/
		const observerCallbacks = /* @__PURE__ */ new WeakMap();
		/**
		* Multiple observers can be created for multiple element/document roots. Each with
		* different settings. So here we store dictionaries of observers to each root,
		* using serialised settings (threshold/margin) as lookup keys.
		*/
		const observers = /* @__PURE__ */ new WeakMap();
		const fireObserverCallback = (entry) => {
			const callback = observerCallbacks.get(entry.target);
			callback && callback(entry);
		};
		const fireAllObserverCallbacks = (entries) => {
			entries.forEach(fireObserverCallback);
		};
		function initIntersectionObserver({ root, ...options }) {
			const lookupRoot = root || document;
			/**
			* If we don't have an observer lookup map for this root, create one.
			*/
			if (!observers.has(lookupRoot)) observers.set(lookupRoot, {});
			const rootObservers = observers.get(lookupRoot);
			const key = JSON.stringify(options);
			/**
			* If we don't have an observer for this combination of root and settings,
			* create one.
			*/
			if (!rootObservers[key]) rootObservers[key] = new IntersectionObserver(fireAllObserverCallbacks, {
				root,
				...options
			});
			return rootObservers[key];
		}
		function observeIntersection(element, options, callback) {
			const rootInteresectionObserver = initIntersectionObserver(options);
			observerCallbacks.set(element, callback);
			rootInteresectionObserver.observe(element);
			return () => {
				observerCallbacks.delete(element);
				rootInteresectionObserver.unobserve(element);
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/viewport/index.mjs
		const thresholdNames = {
			some: 0,
			all: 1
		};
		var InViewFeature = class extends Feature {
			constructor() {
				super(...arguments);
				this.hasEnteredView = false;
				this.isInView = false;
			}
			startObserver() {
				this.stopObserver?.();
				const { viewport = {} } = this.node.getProps();
				const { root, margin: rootMargin, amount = "some", once } = viewport;
				const options = {
					root: root ? root.current : void 0,
					rootMargin,
					threshold: typeof amount === "number" ? amount : thresholdNames[amount]
				};
				const onIntersectionUpdate = (entry) => {
					const { isIntersecting } = entry;
					/**
					* If there's been no change in the viewport state, early return.
					*/
					if (this.isInView === isIntersecting) return;
					this.isInView = isIntersecting;
					/**
					* Handle hasEnteredView. If this is only meant to run once, and
					* element isn't visible, early return. Otherwise set hasEnteredView to true.
					*/
					if (once && !isIntersecting && this.hasEnteredView) return;
					else if (isIntersecting) this.hasEnteredView = true;
					if (this.node.animationState) this.node.animationState.setActive("whileInView", isIntersecting);
					/**
					* Use the latest committed props rather than the ones in scope
					* when this observer is created
					*/
					const { onViewportEnter, onViewportLeave } = this.node.getProps();
					const callback = isIntersecting ? onViewportEnter : onViewportLeave;
					callback && callback(entry);
				};
				this.stopObserver = observeIntersection(this.node.current, options, onIntersectionUpdate);
			}
			mount() {
				this.startObserver();
			}
			update() {
				if (typeof IntersectionObserver === "undefined") return;
				const { props, prevProps } = this.node;
				if ([
					"amount",
					"margin",
					"root"
				].some(hasViewportOptionChanged(props, prevProps))) this.startObserver();
			}
			unmount() {
				this.stopObserver?.();
				this.hasEnteredView = false;
				this.isInView = false;
			}
		};
		function hasViewportOptionChanged({ viewport = {} }, { viewport: prevViewport = {} } = {}) {
			return (name) => viewport[name] !== prevViewport[name];
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/gestures.mjs
		const gestureAnimations = {
			inView: { Feature: InViewFeature },
			tap: { Feature: PressGesture },
			focus: { Feature: FocusGesture },
			hover: { Feature: HoverGesture }
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/motion/features/layout.mjs
		const layout = { layout: {
			ProjectionNode: HTMLProjectionNode,
			MeasureLayout
		} };
		//#endregion
		//#region ../../../node_modules/.pnpm/framer-motion@12.43.0_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs
		const motion = /*@__PURE__*/ createMotionProxy({
			...animations,
			...gestureAnimations,
			...drag,
			...layout
		}, createDomVisualElement);
		//#endregion
		//#region src/client/zoom.tsx
		/**
		* zoom.tsx — the shared-element zoom overlay, native port (2026-09-11).
		*
		* THE CONTRACT (read from the old tree at d13560be^, flowCardZoom.tsx —
		* the operator's signature interaction):
		* • the resting tile and the zoomed card SHARE a framer-motion layoutId
		*   (`stage-card-${id}`) — the card GROWS out of the tile's real screen
		*   rect ("a sponge filling with water") and SHRINKS back into it.
		*   ZOOM_SPRING both directions: stiffness 300, damping 30.
		* • NO MODAL POP. The morph is compositor-only (transform), zero reflow.
		* • While the morph plays (grow AND shrink) the box holds a pure
		*   SKELETON; the real detail swaps in when the morph settles
		*   (onLayoutAnimationComplete; 500ms fallback for engines with no
		*   layout).
		* • Close vectors: the Collapse (X) button, a backdrop click
		*   (target === currentTarget), and Escape — all direct onClose; the
		*   exit is the SAME layoutId morph reversed. AnimatePresence +
		*   usePresence hold the overlay while the shrink plays;
		*   onLayoutAnimationComplete → safeToRemove (500ms jsdom fallback).
		* • THE DSH PLACEMENT (the old file's own rule): no
		*   [data-workspace-content] root exists in the DSH tab → the portal
		*   lands on document.body and the overlay is FIXED inset-0 (the embed
		*   frame is auto-height; absolute would cover only part of the view).
		* • The overlay is the scroll container; the inner flex centers a card
		*   shorter than the area and scrolls one that is taller.
		*/
		/** The morph spring — "a sponge filling with water": fast start, soft
		* settle. Same spring both directions (open grows, exit shrinks). */
		const ZOOM_SPRING = {
			type: "spring",
			stiffness: 300,
			damping: 30
		};
		/** Shared-element key: the SAME string on the resting tile AND the
		* zoomed card makes framer morph one into the other. */
		const cardLayoutId = (id) => `stage-card-${id}`;
		/** How long the skeleton holds the box before the real detail swaps in
		* (the layout-complete callback is primary; this is the no-layout-
		* engine fallback). */
		const ZOOM_SKELETON_MS = 500;
		/** The close-unmount fallback for engines without layout (in a real
		* browser the exit morph's onLayoutAnimationComplete → safeToRemove). */
		const ZOOM_CLOSE_UNMOUNT_MS = 500;
		/** The zoomed card's bounded size — width caps at 760px, vh-bounded so
		* the ≈square card fits without page scroll (the old tree's number). */
		const ZOOM_DETAIL_MAX_PX = 760;
		/** The morph skeleton — an all-skeleton layout with no real content
		* (the shimmer sweep is the old tree's loading face). */
		function ZoomSkeleton() {
			return (0, react.createElement)("div", { className: card_module_css_default.zoomSkeleton }, (0, react.createElement)("div", { className: card_module_css_default.skLine + " " + card_module_css_default.skWide }), (0, react.createElement)("div", { className: card_module_css_default.skLine }), (0, react.createElement)("div", { className: card_module_css_default.skLine }), (0, react.createElement)("div", { className: card_module_css_default.skBlock }), (0, react.createElement)("div", { className: card_module_css_default.skLine }), (0, react.createElement)("div", { className: card_module_css_default.skRow }, (0, react.createElement)("div", { className: card_module_css_default.skLine + " " + card_module_css_default.skShort }), (0, react.createElement)("div", { className: card_module_css_default.skLine + " " + card_module_css_default.skShort })));
		}
		/** One overlay mount (keyed per stage — framer fixes shared-element
		* stack membership at mount, so every focus joins the CURRENT card's
		* stack and the exit re-legates into THAT card's tile). */
		function ZoomMount(props) {
			const { stage, detail, onClose, ...rest } = props;
			const [isPresent, safeToRemove] = usePresence();
			const [ready, setReady] = (0, react.useState)(false);
			const removed = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				const t = window.setTimeout(() => {
					setReady(true);
				}, ZOOM_SKELETON_MS);
				return () => {
					window.clearTimeout(t);
				};
			}, [stage.id]);
			const onSettled = (0, react.useCallback)(() => {
				setReady(true);
				if (!isPresent && !removed.current) {
					removed.current = true;
					safeToRemove();
				}
			}, [isPresent, safeToRemove]);
			(0, react.useEffect)(() => {
				if (!isPresent) {
					const t = window.setTimeout(() => {
						if (!removed.current) {
							removed.current = true;
							safeToRemove();
						}
					}, ZOOM_CLOSE_UNMOUNT_MS);
					return () => {
						window.clearTimeout(t);
					};
				}
			}, [isPresent, safeToRemove]);
			(0, react.useEffect)(() => {
				const onKey = (e) => {
					if (e.key === "Escape") onClose();
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [onClose]);
			return (0, react.createElement)("div", {
				className: card_module_css_default.zoomOverlay,
				onClick: (e) => {
					if (e.target === e.currentTarget) onClose();
				}
			}, (0, react.createElement)("div", { className: card_module_css_default.zoomScroll }, (0, react.createElement)("div", { className: card_module_css_default.zoomInner }, (0, react.createElement)(motion.div, {
				layoutId: cardLayoutId(stage.id),
				transition: ZOOM_SPRING,
				onLayoutAnimationComplete: onSettled,
				className: card_module_css_default.zoomCard,
				style: {
					width: `min(${ZOOM_DETAIL_MAX_PX}px, 88vh)`,
					maxWidth: "100%"
				}
			}, (0, react.createElement)("div", { className: card_module_css_default.zoomBar }, (0, react.createElement)("span", { className: card_module_css_default.zoomTitle }, "Stage " + String(stage.title ?? stage.card ?? stage.id)), (0, react.createElement)("button", {
				className: card_module_css_default.closeX,
				type: "button",
				"aria-label": "Collapse card",
				onClick: onClose
			}, "✕")), ready && isPresent ? (0, react.createElement)(props.detail, {
				stage,
				bench: rest.bench,
				running: rest.running,
				onRun: rest.onRun,
				onClose,
				onRemoved: rest.onRemoved,
				onRewired: rest.onRewired
			}) : (0, react.createElement)(ZoomSkeleton)))));
		}
		/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
		* tree's own DSH rule), AnimatePresence around the per-stage mount. */
		function CardZoomOverlay(props) {
			const mounted = typeof document !== "undefined";
			const tree = (0, react.createElement)(AnimatePresence, null, (0, react.createElement)(ZoomMount, {
				key: props.stage.id,
				...props
			}));
			return mounted ? (0, react_dom.createPortal)(tree, document.body) : tree;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@19.2.8/node_modules/@dnd-kit/utilities/dist/utilities.cjs.production.min.js
		var require_utilities_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e = require("react");
			const t = "undefined" != typeof window && void 0 !== window.document && void 0 !== window.document.createElement;
			function n(e) {
				const t = Object.prototype.toString.call(e);
				return "[object Window]" === t || "[object global]" === t;
			}
			function r(e) {
				return "nodeType" in e;
			}
			function o(e) {
				var t, o;
				return e ? n(e) ? e : r(e) && null != (t = null == (o = e.ownerDocument) ? void 0 : o.defaultView) ? t : window : window;
			}
			function u(e) {
				const { Document: t } = o(e);
				return e instanceof t;
			}
			function c(e) {
				return !n(e) && e instanceof o(e).HTMLElement;
			}
			function s(e) {
				return e instanceof o(e).SVGElement;
			}
			const i = t ? e.useLayoutEffect : e.useEffect;
			function a(t) {
				const n = e.useRef(t);
				return i(() => {
					n.current = t;
				}), e.useCallback((function() {
					for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) t[r] = arguments[r];
					return null == n.current ? void 0 : n.current(...t);
				}), []);
			}
			let l = {};
			function f(e) {
				return function(t) {
					for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
					return r.reduce((t, n) => {
						const r = Object.entries(n);
						for (const [n, o] of r) {
							const r = t[n];
							null != r && (t[n] = r + e * o);
						}
						return t;
					}, { ...t });
				};
			}
			const d = f(1);
			const p = f(-1);
			function x(e) {
				return "clientX" in e && "clientY" in e;
			}
			function m(e) {
				if (!e) return !1;
				const { TouchEvent: t } = o(e.target);
				return t && e instanceof t;
			}
			const h = Object.freeze({
				Translate: { toString(e) {
					if (!e) return;
					const { x: t, y: n } = e;
					return "translate3d(" + (t ? Math.round(t) : 0) + "px, " + (n ? Math.round(n) : 0) + "px, 0)";
				} },
				Scale: { toString(e) {
					if (!e) return;
					const { scaleX: t, scaleY: n } = e;
					return "scaleX(" + t + ") scaleY(" + n + ")";
				} },
				Transform: { toString(e) {
					if (e) return [h.Translate.toString(e), h.Scale.toString(e)].join(" ");
				} },
				Transition: { toString(e) {
					let { property: t, duration: n, easing: r } = e;
					return t + " " + n + "ms " + r;
				} }
			});
			const b = "a,frame,iframe,input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled),*[tabindex]";
			exports.CSS = h, exports.add = d, exports.canUseDOM = t, exports.findFirstFocusableNode = function(e) {
				return e.matches(b) ? e : e.querySelector(b);
			}, exports.getEventCoordinates = function(e) {
				if (m(e)) {
					if (e.touches && e.touches.length) {
						const { clientX: t, clientY: n } = e.touches[0];
						return {
							x: t,
							y: n
						};
					}
					if (e.changedTouches && e.changedTouches.length) {
						const { clientX: t, clientY: n } = e.changedTouches[0];
						return {
							x: t,
							y: n
						};
					}
				}
				return x(e) ? {
					x: e.clientX,
					y: e.clientY
				} : null;
			}, exports.getOwnerDocument = function(e) {
				return e ? n(e) ? e.document : r(e) ? u(e) ? e : c(e) || s(e) ? e.ownerDocument : document : document : document;
			}, exports.getWindow = o, exports.hasViewportRelativeCoordinates = x, exports.isDocument = u, exports.isHTMLElement = c, exports.isKeyboardEvent = function(e) {
				if (!e) return !1;
				const { KeyboardEvent: t } = o(e.target);
				return t && e instanceof t;
			}, exports.isNode = r, exports.isSVGElement = s, exports.isTouchEvent = m, exports.isWindow = n, exports.subtract = p, exports.useCombinedRefs = function() {
				for (var t = arguments.length, n = new Array(t), r = 0; r < t; r++) n[r] = arguments[r];
				return e.useMemo(() => (e) => {
					n.forEach((t) => t(e));
				}, n);
			}, exports.useEvent = a, exports.useInterval = function() {
				const t = e.useRef(null);
				return [e.useCallback((e, n) => {
					t.current = setInterval(e, n);
				}, []), e.useCallback(() => {
					null !== t.current && (clearInterval(t.current), t.current = null);
				}, [])];
			}, exports.useIsomorphicLayoutEffect = i, exports.useLatestValue = function(t, n) {
				void 0 === n && (n = [t]);
				const r = e.useRef(t);
				return i(() => {
					r.current !== t && (r.current = t);
				}, n), r;
			}, exports.useLazyMemo = function(t, n) {
				const r = e.useRef();
				return e.useMemo(() => {
					const e = t(r.current);
					return r.current = e, e;
				}, [...n]);
			}, exports.useNodeRef = function(t) {
				const n = a(t), r = e.useRef(null);
				return [r, e.useCallback((e) => {
					e !== r.current && n?.(e, r.current), r.current = e;
				}, [])];
			}, exports.usePrevious = function(t) {
				const n = e.useRef();
				return e.useEffect(() => {
					n.current = t;
				}, [t]), n.current;
			}, exports.useUniqueId = function(t, n) {
				return e.useMemo(() => {
					if (n) return n;
					const e = null == l[t] ? 0 : l[t] + 1;
					return l[t] = e, t + "-" + e;
				}, [t, n]);
			};
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+utilities@3.2.2_react@19.2.8/node_modules/@dnd-kit/utilities/dist/index.js
		var require_dist$3 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_utilities_cjs_production_min();
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@19.2.8/node_modules/@dnd-kit/accessibility/dist/accessibility.cjs.production.min.js
		var require_accessibility_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t$2 = require("react");
			var n = (e = t$2) && "object" == typeof e && "default" in e ? e.default : e;
			const i = { display: "none" };
			exports.HiddenText = function(e) {
				let { id: t, value: r } = e;
				return n.createElement("div", {
					id: t,
					style: i
				}, r);
			}, exports.LiveRegion = function(e) {
				let { id: t, announcement: i, ariaLiveType: r = "assertive" } = e;
				return n.createElement("div", {
					id: t,
					style: {
						position: "fixed",
						top: 0,
						left: 0,
						width: 1,
						height: 1,
						margin: -1,
						border: 0,
						padding: 0,
						overflow: "hidden",
						clip: "rect(0 0 0 0)",
						clipPath: "inset(100%)",
						whiteSpace: "nowrap"
					},
					role: "status",
					"aria-live": r,
					"aria-atomic": !0
				}, i);
			}, exports.useAnnouncement = function() {
				const [e, n] = t$2.useState("");
				return {
					announce: t$2.useCallback((e) => {
						null != e && n(e);
					}, []),
					announcement: e
				};
			};
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_react@19.2.8/node_modules/@dnd-kit/accessibility/dist/index.js
		var require_dist$2 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_accessibility_cjs_production_min();
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/@dnd-kit/core/dist/core.cjs.production.min.js
		var require_core_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t$1 = require("react");
			var n = (e = t$1) && "object" == typeof e && "default" in e ? e.default : e;
			var r = require("react-dom");
			var o = require_dist$3();
			var i = require_dist$2();
			const a = t$1.createContext(null);
			function s(e) {
				const n = t$1.useContext(a);
				t$1.useEffect(() => {
					if (!n) throw new Error("useDndMonitor must be used within a children of <DndContext>");
					return n(e);
				}, [e, n]);
			}
			const l = { draggable: "\n    To pick up a draggable item, press the space bar.\n    While dragging, use the arrow keys to move the item.\n    Press space again to drop the item in its new position, or press escape to cancel.\n  " };
			const c = {
				onDragStart(e) {
					let { active: t } = e;
					return "Picked up draggable item " + t.id + ".";
				},
				onDragOver(e) {
					let { active: t, over: n } = e;
					return n ? "Draggable item " + t.id + " was moved over droppable area " + n.id + "." : "Draggable item " + t.id + " is no longer over a droppable area.";
				},
				onDragEnd(e) {
					let { active: t, over: n } = e;
					return n ? "Draggable item " + t.id + " was dropped over droppable area " + n.id : "Draggable item " + t.id + " was dropped.";
				},
				onDragCancel(e) {
					let { active: t } = e;
					return "Dragging was cancelled. Draggable item " + t.id + " was dropped.";
				}
			};
			function d(e) {
				let { announcements: a = c, container: d, hiddenTextDescribedById: u, screenReaderInstructions: f = l } = e;
				const { announce: v, announcement: g } = i.useAnnouncement(), p = o.useUniqueId("DndLiveRegion"), [h, b] = t$1.useState(!1);
				if (t$1.useEffect(() => {
					b(!0);
				}, []), s(t$1.useMemo(() => ({
					onDragStart(e) {
						let { active: t } = e;
						v(a.onDragStart({ active: t }));
					},
					onDragMove(e) {
						let { active: t, over: n } = e;
						a.onDragMove && v(a.onDragMove({
							active: t,
							over: n
						}));
					},
					onDragOver(e) {
						let { active: t, over: n } = e;
						v(a.onDragOver({
							active: t,
							over: n
						}));
					},
					onDragEnd(e) {
						let { active: t, over: n } = e;
						v(a.onDragEnd({
							active: t,
							over: n
						}));
					},
					onDragCancel(e) {
						let { active: t, over: n } = e;
						v(a.onDragCancel({
							active: t,
							over: n
						}));
					}
				}), [v, a])), !h) return null;
				const m = n.createElement(n.Fragment, null, n.createElement(i.HiddenText, {
					id: u,
					value: f.draggable
				}), n.createElement(i.LiveRegion, {
					id: p,
					announcement: g
				}));
				return d ? r.createPortal(m, d) : m;
			}
			var u;
			function f() {}
			(function(e) {
				e.DragStart = "dragStart", e.DragMove = "dragMove", e.DragEnd = "dragEnd", e.DragCancel = "dragCancel", e.DragOver = "dragOver", e.RegisterDroppable = "registerDroppable", e.SetDroppableDisabled = "setDroppableDisabled", e.UnregisterDroppable = "unregisterDroppable";
			})(u || (u = {}));
			const v = Object.freeze({
				x: 0,
				y: 0
			});
			function g(e, t) {
				return Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2));
			}
			function p(e, t) {
				const n = o.getEventCoordinates(e);
				return n ? (n.x - t.left) / t.width * 100 + "% " + (n.y - t.top) / t.height * 100 + "%" : "0 0";
			}
			function h(e, t) {
				let { data: { value: n } } = e, { data: { value: r } } = t;
				return n - r;
			}
			function b(e, t) {
				let { data: { value: n } } = e, { data: { value: r } } = t;
				return r - n;
			}
			function m(e) {
				let { left: t, top: n, height: r, width: o } = e;
				return [
					{
						x: t,
						y: n
					},
					{
						x: t + o,
						y: n
					},
					{
						x: t,
						y: n + r
					},
					{
						x: t + o,
						y: n + r
					}
				];
			}
			function y(e, t) {
				if (!e || 0 === e.length) return null;
				const [n] = e;
				return t ? n[t] : n;
			}
			function x(e, t, n) {
				return void 0 === t && (t = e.left), void 0 === n && (n = e.top), {
					x: t + .5 * e.width,
					y: n + .5 * e.height
				};
			}
			function w(e, t) {
				const n = Math.max(t.top, e.top), r = Math.max(t.left, e.left), o = Math.min(t.left + t.width, e.left + e.width), i = Math.min(t.top + t.height, e.top + e.height);
				if (r < o && n < i) {
					const a = (o - r) * (i - n);
					return Number((a / (t.width * t.height + e.width * e.height - a)).toFixed(4));
				}
				return 0;
			}
			const C = (e) => {
				let { collisionRect: t, droppableRects: n, droppableContainers: r } = e;
				const o = [];
				for (const e of r) {
					const { id: r } = e, i = n.get(r);
					if (i) {
						const n = w(i, t);
						n > 0 && o.push({
							id: r,
							data: {
								droppableContainer: e,
								value: n
							}
						});
					}
				}
				return o.sort(b);
			};
			function E(e, t) {
				const { top: n, left: r, bottom: o, right: i } = t;
				return n <= e.y && e.y <= o && r <= e.x && e.x <= i;
			}
			function D(e, t) {
				return e && t ? {
					x: e.left - t.left,
					y: e.top - t.top
				} : v;
			}
			function R(e) {
				return function(t) {
					for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++) r[o - 1] = arguments[o];
					return r.reduce((t, n) => ({
						...t,
						top: t.top + e * n.y,
						bottom: t.bottom + e * n.y,
						left: t.left + e * n.x,
						right: t.right + e * n.x
					}), { ...t });
				};
			}
			const S = R(1);
			function M(e) {
				if (e.startsWith("matrix3d(")) {
					const t = e.slice(9, -1).split(/, /);
					return {
						x: +t[12],
						y: +t[13],
						scaleX: +t[0],
						scaleY: +t[5]
					};
				}
				if (e.startsWith("matrix(")) {
					const t = e.slice(7, -1).split(/, /);
					return {
						x: +t[4],
						y: +t[5],
						scaleX: +t[0],
						scaleY: +t[3]
					};
				}
				return null;
			}
			const N = { ignoreTransform: !1 };
			function O(e, t) {
				void 0 === t && (t = N);
				let n = e.getBoundingClientRect();
				if (t.ignoreTransform) {
					const { transform: t, transformOrigin: r } = o.getWindow(e).getComputedStyle(e);
					t && (n = function(e, t, n) {
						const r = M(t);
						if (!r) return e;
						const { scaleX: o, scaleY: i, x: a, y: s } = r, l = e.left - a - (1 - o) * parseFloat(n), c = e.top - s - (1 - i) * parseFloat(n.slice(n.indexOf(" ") + 1)), d = o ? e.width / o : e.width, u = i ? e.height / i : e.height;
						return {
							width: d,
							height: u,
							top: c,
							right: l + d,
							bottom: c + u,
							left: l
						};
					}(n, t, r));
				}
				const { top: r, left: i, width: a, height: s, bottom: l, right: c } = n;
				return {
					top: r,
					left: i,
					width: a,
					height: s,
					bottom: l,
					right: c
				};
			}
			function A(e) {
				return O(e, { ignoreTransform: !0 });
			}
			function L(e, t) {
				const n = [];
				return e ? function r(i) {
					if (null != t && n.length >= t) return n;
					if (!i) return n;
					if (o.isDocument(i) && null != i.scrollingElement && !n.includes(i.scrollingElement)) return n.push(i.scrollingElement), n;
					if (!o.isHTMLElement(i) || o.isSVGElement(i)) return n;
					if (n.includes(i)) return n;
					const a = o.getWindow(e).getComputedStyle(i);
					return i !== e && function(e, t) {
						void 0 === t && (t = o.getWindow(e).getComputedStyle(e));
						const n = /(auto|scroll|overlay)/;
						return [
							"overflow",
							"overflowX",
							"overflowY"
						].some((e) => {
							const r = t[e];
							return "string" == typeof r && n.test(r);
						});
					}(i, a) && n.push(i), function(e, t) {
						return void 0 === t && (t = o.getWindow(e).getComputedStyle(e)), "fixed" === t.position;
					}(i, a) ? n : r(i.parentNode);
				}(e) : n;
			}
			function k(e) {
				const [t] = L(e, 1);
				return null != t ? t : null;
			}
			function T(e) {
				return o.canUseDOM && e ? o.isWindow(e) ? e : o.isNode(e) ? o.isDocument(e) || e === o.getOwnerDocument(e).scrollingElement ? window : o.isHTMLElement(e) ? e : null : null : null;
			}
			function K(e) {
				return o.isWindow(e) ? e.scrollX : e.scrollLeft;
			}
			function P(e) {
				return o.isWindow(e) ? e.scrollY : e.scrollTop;
			}
			function I(e) {
				return {
					x: K(e),
					y: P(e)
				};
			}
			var B;
			function z(e) {
				return !(!o.canUseDOM || !e) && e === document.scrollingElement;
			}
			function F(e) {
				const t = {
					x: 0,
					y: 0
				}, n = z(e) ? {
					height: window.innerHeight,
					width: window.innerWidth
				} : {
					height: e.clientHeight,
					width: e.clientWidth
				}, r = {
					x: e.scrollWidth - n.width,
					y: e.scrollHeight - n.height
				};
				return {
					isTop: e.scrollTop <= t.y,
					isLeft: e.scrollLeft <= t.x,
					isBottom: e.scrollTop >= r.y,
					isRight: e.scrollLeft >= r.x,
					maxScroll: r,
					minScroll: t
				};
			}
			(function(e) {
				e[e.Forward = 1] = "Forward", e[e.Backward = -1] = "Backward";
			})(B || (B = {}));
			const W = {
				x: .2,
				y: .2
			};
			function U(e, t, n, r, o) {
				let { top: i, left: a, right: s, bottom: l } = n;
				void 0 === r && (r = 10), void 0 === o && (o = W);
				const { isTop: c, isBottom: d, isLeft: u, isRight: f } = F(e), v = {
					x: 0,
					y: 0
				}, g = {
					x: 0,
					y: 0
				}, p = t.height * o.y, h = t.width * o.x;
				return !c && i <= t.top + p ? (v.y = B.Backward, g.y = r * Math.abs((t.top + p - i) / p)) : !d && l >= t.bottom - p && (v.y = B.Forward, g.y = r * Math.abs((t.bottom - p - l) / p)), !f && s >= t.right - h ? (v.x = B.Forward, g.x = r * Math.abs((t.right - h - s) / h)) : !u && a <= t.left + h && (v.x = B.Backward, g.x = r * Math.abs((t.left + h - a) / h)), {
					direction: v,
					speed: g
				};
			}
			function j(e) {
				if (e === document.scrollingElement) {
					const { innerWidth: e, innerHeight: t } = window;
					return {
						top: 0,
						left: 0,
						right: e,
						bottom: t,
						width: e,
						height: t
					};
				}
				const { top: t, left: n, right: r, bottom: o } = e.getBoundingClientRect();
				return {
					top: t,
					left: n,
					right: r,
					bottom: o,
					width: e.clientWidth,
					height: e.clientHeight
				};
			}
			function q(e) {
				return e.reduce((e, t) => o.add(e, I(t)), v);
			}
			function H(e, t) {
				if (void 0 === t && (t = O), !e) return;
				const { top: n, left: r, bottom: o, right: i } = t(e);
				k(e) && (o <= 0 || i <= 0 || n >= window.innerHeight || r >= window.innerWidth) && e.scrollIntoView({
					block: "center",
					inline: "center"
				});
			}
			const X = [[
				"x",
				["left", "right"],
				function(e) {
					return e.reduce((e, t) => e + K(t), 0);
				}
			], [
				"y",
				["top", "bottom"],
				function(e) {
					return e.reduce((e, t) => e + P(t), 0);
				}
			]];
			var Y = class {
				constructor(e, t) {
					this.rect = void 0, this.width = void 0, this.height = void 0, this.top = void 0, this.bottom = void 0, this.right = void 0, this.left = void 0;
					const n = L(t), r = q(n);
					this.rect = { ...e }, this.width = e.width, this.height = e.height;
					for (const [e, t, o] of X) for (const i of t) Object.defineProperty(this, i, {
						get: () => {
							const t = o(n);
							return this.rect[i] + (r[e] - t);
						},
						enumerable: !0
					});
					Object.defineProperty(this, "rect", { enumerable: !1 });
				}
			};
			var V = class {
				constructor(e) {
					this.target = void 0, this.listeners = [], this.removeAll = () => {
						this.listeners.forEach((e) => {
							var t;
							return null == (t = this.target) ? void 0 : t.removeEventListener(...e);
						});
					}, this.target = e;
				}
				add(e, t, n) {
					var r;
					null == (r = this.target) || r.addEventListener(e, t, n), this.listeners.push([
						e,
						t,
						n
					]);
				}
			};
			function J(e, t) {
				const n = Math.abs(e.x), r = Math.abs(e.y);
				return "number" == typeof t ? Math.sqrt(n ** 2 + r ** 2) > t : "x" in t && "y" in t ? n > t.x && r > t.y : "x" in t ? n > t.x : "y" in t && r > t.y;
			}
			var _;
			var G;
			function Q(e) {
				e.preventDefault();
			}
			function Z(e) {
				e.stopPropagation();
			}
			(function(e) {
				e.Click = "click", e.DragStart = "dragstart", e.Keydown = "keydown", e.ContextMenu = "contextmenu", e.Resize = "resize", e.SelectionChange = "selectionchange", e.VisibilityChange = "visibilitychange";
			})(_ || (_ = {})), (G = exports.KeyboardCode || (exports.KeyboardCode = {})).Space = "Space", G.Down = "ArrowDown", G.Right = "ArrowRight", G.Left = "ArrowLeft", G.Up = "ArrowUp", G.Esc = "Escape", G.Enter = "Enter", G.Tab = "Tab";
			const $ = {
				start: [exports.KeyboardCode.Space, exports.KeyboardCode.Enter],
				cancel: [exports.KeyboardCode.Esc],
				end: [
					exports.KeyboardCode.Space,
					exports.KeyboardCode.Enter,
					exports.KeyboardCode.Tab
				]
			};
			const ee = (e, t) => {
				let { currentCoordinates: n } = t;
				switch (e.code) {
					case exports.KeyboardCode.Right: return {
						...n,
						x: n.x + 25
					};
					case exports.KeyboardCode.Left: return {
						...n,
						x: n.x - 25
					};
					case exports.KeyboardCode.Down: return {
						...n,
						y: n.y + 25
					};
					case exports.KeyboardCode.Up: return {
						...n,
						y: n.y - 25
					};
				}
			};
			var te = class {
				constructor(e) {
					this.props = void 0, this.autoScrollEnabled = !1, this.referenceCoordinates = void 0, this.listeners = void 0, this.windowListeners = void 0, this.props = e;
					const { event: { target: t } } = e;
					this.props = e, this.listeners = new V(o.getOwnerDocument(t)), this.windowListeners = new V(o.getWindow(t)), this.handleKeyDown = this.handleKeyDown.bind(this), this.handleCancel = this.handleCancel.bind(this), this.attach();
				}
				attach() {
					this.handleStart(), this.windowListeners.add(_.Resize, this.handleCancel), this.windowListeners.add(_.VisibilityChange, this.handleCancel), setTimeout(() => this.listeners.add(_.Keydown, this.handleKeyDown));
				}
				handleStart() {
					const { activeNode: e, onStart: t } = this.props, n = e.node.current;
					n && H(n), t(v);
				}
				handleKeyDown(e) {
					if (o.isKeyboardEvent(e)) {
						const { active: t, context: n, options: r } = this.props, { keyboardCodes: i = $, coordinateGetter: a = ee, scrollBehavior: s = "smooth" } = r, { code: l } = e;
						if (i.end.includes(l)) return void this.handleEnd(e);
						if (i.cancel.includes(l)) return void this.handleCancel(e);
						const { collisionRect: c } = n.current, d = c ? {
							x: c.left,
							y: c.top
						} : v;
						this.referenceCoordinates || (this.referenceCoordinates = d);
						const u = a(e, {
							active: t,
							context: n.current,
							currentCoordinates: d
						});
						if (u) {
							const t = o.subtract(u, d), r = {
								x: 0,
								y: 0
							}, { scrollableAncestors: i } = n.current;
							for (const n of i) {
								const o = e.code, { isTop: i, isRight: a, isLeft: l, isBottom: c, maxScroll: d, minScroll: f } = F(n), v = j(n), g = {
									x: Math.min(o === exports.KeyboardCode.Right ? v.right - v.width / 2 : v.right, Math.max(o === exports.KeyboardCode.Right ? v.left : v.left + v.width / 2, u.x)),
									y: Math.min(o === exports.KeyboardCode.Down ? v.bottom - v.height / 2 : v.bottom, Math.max(o === exports.KeyboardCode.Down ? v.top : v.top + v.height / 2, u.y))
								}, p = o === exports.KeyboardCode.Right && !a || o === exports.KeyboardCode.Left && !l, h = o === exports.KeyboardCode.Down && !c || o === exports.KeyboardCode.Up && !i;
								if (p && g.x !== u.x) {
									const e = n.scrollLeft + t.x, i = o === exports.KeyboardCode.Right && e <= d.x || o === exports.KeyboardCode.Left && e >= f.x;
									if (i && !t.y) return void n.scrollTo({
										left: e,
										behavior: s
									});
									r.x = i ? n.scrollLeft - e : o === exports.KeyboardCode.Right ? n.scrollLeft - d.x : n.scrollLeft - f.x, r.x && n.scrollBy({
										left: -r.x,
										behavior: s
									});
									break;
								}
								if (h && g.y !== u.y) {
									const e = n.scrollTop + t.y, i = o === exports.KeyboardCode.Down && e <= d.y || o === exports.KeyboardCode.Up && e >= f.y;
									if (i && !t.x) return void n.scrollTo({
										top: e,
										behavior: s
									});
									r.y = i ? n.scrollTop - e : o === exports.KeyboardCode.Down ? n.scrollTop - d.y : n.scrollTop - f.y, r.y && n.scrollBy({
										top: -r.y,
										behavior: s
									});
									break;
								}
							}
							this.handleMove(e, o.add(o.subtract(u, this.referenceCoordinates), r));
						}
					}
				}
				handleMove(e, t) {
					const { onMove: n } = this.props;
					e.preventDefault(), n(t);
				}
				handleEnd(e) {
					const { onEnd: t } = this.props;
					e.preventDefault(), this.detach(), t();
				}
				handleCancel(e) {
					const { onCancel: t } = this.props;
					e.preventDefault(), this.detach(), t();
				}
				detach() {
					this.listeners.removeAll(), this.windowListeners.removeAll();
				}
			};
			function ne(e) {
				return Boolean(e && "distance" in e);
			}
			function re(e) {
				return Boolean(e && "delay" in e);
			}
			te.activators = [{
				eventName: "onKeyDown",
				handler: (e, t, n) => {
					let { keyboardCodes: r = $, onActivation: o } = t, { active: i } = n;
					const { code: a } = e.nativeEvent;
					if (r.start.includes(a)) {
						const t = i.activatorNode.current;
						return !(t && e.target !== t || (e.preventDefault(), o?.({ event: e.nativeEvent }), 0));
					}
					return !1;
				}
			}];
			var oe = class {
				constructor(e, t, n) {
					var r;
					void 0 === n && (n = function(e) {
						const { EventTarget: t } = o.getWindow(e);
						return e instanceof t ? e : o.getOwnerDocument(e);
					}(e.event.target)), this.props = void 0, this.events = void 0, this.autoScrollEnabled = !0, this.document = void 0, this.activated = !1, this.initialCoordinates = void 0, this.timeoutId = null, this.listeners = void 0, this.documentListeners = void 0, this.windowListeners = void 0, this.props = e, this.events = t;
					const { event: i } = e, { target: a } = i;
					this.props = e, this.events = t, this.document = o.getOwnerDocument(a), this.documentListeners = new V(this.document), this.listeners = new V(n), this.windowListeners = new V(o.getWindow(a)), this.initialCoordinates = null != (r = o.getEventCoordinates(i)) ? r : v, this.handleStart = this.handleStart.bind(this), this.handleMove = this.handleMove.bind(this), this.handleEnd = this.handleEnd.bind(this), this.handleCancel = this.handleCancel.bind(this), this.handleKeydown = this.handleKeydown.bind(this), this.removeTextSelection = this.removeTextSelection.bind(this), this.attach();
				}
				attach() {
					const { events: e, props: { options: { activationConstraint: t, bypassActivationConstraint: n } } } = this;
					if (this.listeners.add(e.move.name, this.handleMove, { passive: !1 }), this.listeners.add(e.end.name, this.handleEnd), e.cancel && this.listeners.add(e.cancel.name, this.handleCancel), this.windowListeners.add(_.Resize, this.handleCancel), this.windowListeners.add(_.DragStart, Q), this.windowListeners.add(_.VisibilityChange, this.handleCancel), this.windowListeners.add(_.ContextMenu, Q), this.documentListeners.add(_.Keydown, this.handleKeydown), t) {
						if (null != n && n({
							event: this.props.event,
							activeNode: this.props.activeNode,
							options: this.props.options
						})) return this.handleStart();
						if (re(t)) return this.timeoutId = setTimeout(this.handleStart, t.delay), void this.handlePending(t);
						if (ne(t)) return void this.handlePending(t);
					}
					this.handleStart();
				}
				detach() {
					this.listeners.removeAll(), this.windowListeners.removeAll(), setTimeout(this.documentListeners.removeAll, 50), null !== this.timeoutId && (clearTimeout(this.timeoutId), this.timeoutId = null);
				}
				handlePending(e, t) {
					const { active: n, onPending: r } = this.props;
					r(n, e, this.initialCoordinates, t);
				}
				handleStart() {
					const { initialCoordinates: e } = this, { onStart: t } = this.props;
					e && (this.activated = !0, this.documentListeners.add(_.Click, Z, { capture: !0 }), this.removeTextSelection(), this.documentListeners.add(_.SelectionChange, this.removeTextSelection), t(e));
				}
				handleMove(e) {
					var t;
					const { activated: n, initialCoordinates: r, props: i } = this, { onMove: a, options: { activationConstraint: s } } = i;
					if (!r) return;
					const l = null != (t = o.getEventCoordinates(e)) ? t : v, c = o.subtract(r, l);
					if (!n && s) {
						if (ne(s)) {
							if (null != s.tolerance && J(c, s.tolerance)) return this.handleCancel();
							if (J(c, s.distance)) return this.handleStart();
						}
						return re(s) && J(c, s.tolerance) ? this.handleCancel() : void this.handlePending(s, c);
					}
					e.cancelable && e.preventDefault(), a(l);
				}
				handleEnd() {
					const { onAbort: e, onEnd: t } = this.props;
					this.detach(), this.activated || e(this.props.active), t();
				}
				handleCancel() {
					const { onAbort: e, onCancel: t } = this.props;
					this.detach(), this.activated || e(this.props.active), t();
				}
				handleKeydown(e) {
					e.code === exports.KeyboardCode.Esc && this.handleCancel();
				}
				removeTextSelection() {
					var e;
					null == (e = this.document.getSelection()) || e.removeAllRanges();
				}
			};
			const ie = {
				cancel: { name: "pointercancel" },
				move: { name: "pointermove" },
				end: { name: "pointerup" }
			};
			var ae = class extends oe {
				constructor(e) {
					const { event: t } = e, n = o.getOwnerDocument(t.target);
					super(e, ie, n);
				}
			};
			ae.activators = [{
				eventName: "onPointerDown",
				handler: (e, t) => {
					let { nativeEvent: n } = e, { onActivation: r } = t;
					return !(!n.isPrimary || 0 !== n.button || (r?.({ event: n }), 0));
				}
			}];
			const se = {
				move: { name: "mousemove" },
				end: { name: "mouseup" }
			};
			var le;
			(function(e) {
				e[e.RightClick = 2] = "RightClick";
			})(le || (le = {}));
			var ce = class extends oe {
				constructor(e) {
					super(e, se, o.getOwnerDocument(e.event.target));
				}
			};
			ce.activators = [{
				eventName: "onMouseDown",
				handler: (e, t) => {
					let { nativeEvent: n } = e, { onActivation: r } = t;
					return n.button !== le.RightClick && (r?.({ event: n }), !0);
				}
			}];
			const de = {
				cancel: { name: "touchcancel" },
				move: { name: "touchmove" },
				end: { name: "touchend" }
			};
			var ue = class extends oe {
				constructor(e) {
					super(e, de);
				}
				static setup() {
					return window.addEventListener(de.move.name, e, {
						capture: !1,
						passive: !1
					}), function() {
						window.removeEventListener(de.move.name, e);
					};
					function e() {}
				}
			};
			var fe;
			var ve;
			ue.activators = [{
				eventName: "onTouchStart",
				handler: (e, t) => {
					let { nativeEvent: n } = e, { onActivation: r } = t;
					const { touches: o } = n;
					return !(o.length > 1 || (r?.({ event: n }), 0));
				}
			}], (fe = exports.AutoScrollActivator || (exports.AutoScrollActivator = {}))[fe.Pointer = 0] = "Pointer", fe[fe.DraggableRect = 1] = "DraggableRect", (ve = exports.TraversalOrder || (exports.TraversalOrder = {}))[ve.TreeOrder = 0] = "TreeOrder", ve[ve.ReversedTreeOrder = 1] = "ReversedTreeOrder";
			const ge = {
				x: {
					[B.Backward]: !1,
					[B.Forward]: !1
				},
				y: {
					[B.Backward]: !1,
					[B.Forward]: !1
				}
			};
			var pe;
			(pe = exports.MeasuringStrategy || (exports.MeasuringStrategy = {}))[pe.Always = 0] = "Always", pe[pe.BeforeDragging = 1] = "BeforeDragging", pe[pe.WhileDragging = 2] = "WhileDragging", (exports.MeasuringFrequency || (exports.MeasuringFrequency = {})).Optimized = "optimized";
			const he = /* @__PURE__ */ new Map();
			function be(e, t) {
				return o.useLazyMemo((n) => e ? n || ("function" == typeof t ? t(e) : e) : null, [t, e]);
			}
			function me(e) {
				let { callback: n, disabled: r } = e;
				const i = o.useEvent(n), a = t$1.useMemo(() => {
					if (r || "undefined" == typeof window || void 0 === window.ResizeObserver) return;
					const { ResizeObserver: e } = window;
					return new e(i);
				}, [r]);
				return t$1.useEffect(() => () => null == a ? void 0 : a.disconnect(), [a]), a;
			}
			function ye(e) {
				return new Y(O(e), e);
			}
			function xe(e, n, r) {
				void 0 === n && (n = ye);
				const [i, a] = t$1.useState(null);
				function s() {
					a((t) => {
						if (!e) return null;
						var o;
						if (!1 === e.isConnected) return null != (o = null != t ? t : r) ? o : null;
						const i = n(e);
						return JSON.stringify(t) === JSON.stringify(i) ? t : i;
					});
				}
				const l = function(e) {
					let { callback: n, disabled: r } = e;
					const i = o.useEvent(n), a = t$1.useMemo(() => {
						if (r || "undefined" == typeof window || void 0 === window.MutationObserver) return;
						const { MutationObserver: e } = window;
						return new e(i);
					}, [i, r]);
					return t$1.useEffect(() => () => null == a ? void 0 : a.disconnect(), [a]), a;
				}({ callback(t) {
					if (e) for (const n of t) {
						const { type: t, target: r } = n;
						if ("childList" === t && r instanceof HTMLElement && r.contains(e)) {
							s();
							break;
						}
					}
				} }), c = me({ callback: s });
				return o.useIsomorphicLayoutEffect(() => {
					s(), e ? (c?.observe(e), l?.observe(document.body, {
						childList: !0,
						subtree: !0
					})) : (c?.disconnect(), l?.disconnect());
				}, [e]), i;
			}
			const we = [];
			function Ce(e, n) {
				void 0 === n && (n = []);
				const r = t$1.useRef(null);
				return t$1.useEffect(() => {
					r.current = null;
				}, n), t$1.useEffect(() => {
					const t = e !== v;
					t && !r.current && (r.current = e), !t && r.current && (r.current = null);
				}, [e]), r.current ? o.subtract(e, r.current) : v;
			}
			function Ee(e) {
				return t$1.useMemo(() => e ? function(e) {
					const t = e.innerWidth, n = e.innerHeight;
					return {
						top: 0,
						left: 0,
						right: t,
						bottom: n,
						width: t,
						height: n
					};
				}(e) : null, [e]);
			}
			const De = [];
			function Re(e) {
				if (!e) return null;
				if (e.children.length > 1) return e;
				const t = e.children[0];
				return o.isHTMLElement(t) ? t : e;
			}
			const Se = [{
				sensor: ae,
				options: {}
			}, {
				sensor: te,
				options: {}
			}];
			const Me = { current: {} };
			const Ne = {
				draggable: { measure: A },
				droppable: {
					measure: A,
					strategy: exports.MeasuringStrategy.WhileDragging,
					frequency: exports.MeasuringFrequency.Optimized
				},
				dragOverlay: { measure: O }
			};
			var Oe = class extends Map {
				get(e) {
					var t;
					return null != e && null != (t = super.get(e)) ? t : void 0;
				}
				toArray() {
					return Array.from(this.values());
				}
				getEnabled() {
					return this.toArray().filter((e) => {
						let { disabled: t } = e;
						return !t;
					});
				}
				getNodeFor(e) {
					var t, n;
					return null != (t = null == (n = this.get(e)) ? void 0 : n.node.current) ? t : void 0;
				}
			};
			const Ae = {
				activatorEvent: null,
				active: null,
				activeNode: null,
				activeNodeRect: null,
				collisions: null,
				containerNodeRect: null,
				draggableNodes: /* @__PURE__ */ new Map(),
				droppableRects: /* @__PURE__ */ new Map(),
				droppableContainers: new Oe(),
				over: null,
				dragOverlay: {
					nodeRef: { current: null },
					rect: null,
					setRef: f
				},
				scrollableAncestors: [],
				scrollableAncestorRects: [],
				measuringConfiguration: Ne,
				measureDroppableContainers: f,
				windowRect: null,
				measuringScheduled: !1
			};
			const Le = {
				activatorEvent: null,
				activators: [],
				active: null,
				activeNodeRect: null,
				ariaDescribedById: { draggable: "" },
				dispatch: f,
				draggableNodes: /* @__PURE__ */ new Map(),
				over: null,
				measureDroppableContainers: f
			};
			const ke = t$1.createContext(Le);
			const Te = t$1.createContext(Ae);
			function Ke() {
				return {
					draggable: {
						active: null,
						initialCoordinates: {
							x: 0,
							y: 0
						},
						nodes: /* @__PURE__ */ new Map(),
						translate: {
							x: 0,
							y: 0
						}
					},
					droppable: { containers: new Oe() }
				};
			}
			function Pe(e, t) {
				switch (t.type) {
					case u.DragStart: return {
						...e,
						draggable: {
							...e.draggable,
							initialCoordinates: t.initialCoordinates,
							active: t.active
						}
					};
					case u.DragMove: return null == e.draggable.active ? e : {
						...e,
						draggable: {
							...e.draggable,
							translate: {
								x: t.coordinates.x - e.draggable.initialCoordinates.x,
								y: t.coordinates.y - e.draggable.initialCoordinates.y
							}
						}
					};
					case u.DragEnd:
					case u.DragCancel: return {
						...e,
						draggable: {
							...e.draggable,
							active: null,
							initialCoordinates: {
								x: 0,
								y: 0
							},
							translate: {
								x: 0,
								y: 0
							}
						}
					};
					case u.RegisterDroppable: {
						const { element: n } = t, { id: r } = n, o = new Oe(e.droppable.containers);
						return o.set(r, n), {
							...e,
							droppable: {
								...e.droppable,
								containers: o
							}
						};
					}
					case u.SetDroppableDisabled: {
						const { id: n, key: r, disabled: o } = t, i = e.droppable.containers.get(n);
						if (!i || r !== i.key) return e;
						const a = new Oe(e.droppable.containers);
						return a.set(n, {
							...i,
							disabled: o
						}), {
							...e,
							droppable: {
								...e.droppable,
								containers: a
							}
						};
					}
					case u.UnregisterDroppable: {
						const { id: n, key: r } = t, o = e.droppable.containers.get(n);
						if (!o || r !== o.key) return e;
						const i = new Oe(e.droppable.containers);
						return i.delete(n), {
							...e,
							droppable: {
								...e.droppable,
								containers: i
							}
						};
					}
					default: return e;
				}
			}
			function Ie(e) {
				let { disabled: n } = e;
				const { active: r, activatorEvent: i, draggableNodes: a } = t$1.useContext(ke), s = o.usePrevious(i), l = o.usePrevious(null == r ? void 0 : r.id);
				return t$1.useEffect(() => {
					if (!n && !i && s && null != l) {
						if (!o.isKeyboardEvent(s)) return;
						if (document.activeElement === s.target) return;
						const e = a.get(l);
						if (!e) return;
						const { activatorNode: t, node: n } = e;
						if (!t.current && !n.current) return;
						requestAnimationFrame(() => {
							for (const e of [t.current, n.current]) {
								if (!e) continue;
								const t = o.findFirstFocusableNode(e);
								if (t) {
									t.focus();
									break;
								}
							}
						});
					}
				}, [
					i,
					n,
					a,
					l,
					s
				]), null;
			}
			function Be(e, t) {
				let { transform: n, ...r } = t;
				return null != e && e.length ? e.reduce((e, t) => t({
					transform: e,
					...r
				}), n) : n;
			}
			const ze = t$1.createContext({
				...v,
				scaleX: 1,
				scaleY: 1
			});
			var Fe;
			(function(e) {
				e[e.Uninitialized = 0] = "Uninitialized", e[e.Initializing = 1] = "Initializing", e[e.Initialized = 2] = "Initialized";
			})(Fe || (Fe = {}));
			const We = t$1.memo((function(e) {
				var i, s, l, c;
				let { id: f, accessibility: g, autoScroll: p = !0, children: h, sensors: b = Se, collisionDetection: m = C, measuring: x, modifiers: w, ...E } = e;
				const [M, N] = t$1.useReducer(Pe, void 0, Ke), [A, K] = function() {
					const [e] = t$1.useState(() => /* @__PURE__ */ new Set()), n = t$1.useCallback((t) => (e.add(t), () => e.delete(t)), [e]);
					return [t$1.useCallback((t) => {
						let { type: n, event: r } = t;
						e.forEach((e) => {
							var t;
							return null == (t = e[n]) ? void 0 : t.call(e, r);
						});
					}, [e]), n];
				}(), [P, F] = t$1.useState(Fe.Uninitialized), W = P === Fe.Initialized, { draggable: { active: j, nodes: H, translate: X }, droppable: { containers: V } } = M, J = null != j ? H.get(j) : null, _ = t$1.useRef({
					initial: null,
					translated: null
				}), G = t$1.useMemo(() => {
					var e;
					return null != j ? {
						id: j,
						data: null != (e = null == J ? void 0 : J.data) ? e : Me,
						rect: _
					} : null;
				}, [j, J]), Q = t$1.useRef(null), [Z, $] = t$1.useState(null), [ee, te] = t$1.useState(null), ne = o.useLatestValue(E, Object.values(E)), re = o.useUniqueId("DndDescribedBy", f), oe = t$1.useMemo(() => V.getEnabled(), [V]), ie = t$1.useMemo(() => ({
					draggable: {
						...Ne.draggable,
						...null == ae ? void 0 : ae.draggable
					},
					droppable: {
						...Ne.droppable,
						...null == ae ? void 0 : ae.droppable
					},
					dragOverlay: {
						...Ne.dragOverlay,
						...null == ae ? void 0 : ae.dragOverlay
					}
				}), [
					null == (ae = x) ? void 0 : ae.draggable,
					null == ae ? void 0 : ae.droppable,
					null == ae ? void 0 : ae.dragOverlay
				]);
				var ae;
				const { droppableRects: se, measureDroppableContainers: le, measuringScheduled: ce } = function(e, n) {
					let { dragging: r, dependencies: i, config: a } = n;
					const [s, l] = t$1.useState(null), { frequency: c, measure: d, strategy: u } = a, f = t$1.useRef(e), v = function() {
						switch (u) {
							case exports.MeasuringStrategy.Always: return !1;
							case exports.MeasuringStrategy.BeforeDragging: return r;
							default: return !r;
						}
					}(), g = o.useLatestValue(v), p = t$1.useCallback((function(e) {
						void 0 === e && (e = []), g.current || l((t) => null === t ? e : t.concat(e.filter((e) => !t.includes(e))));
					}), [g]), h = t$1.useRef(null), b = o.useLazyMemo((t) => {
						if (v && !r) return he;
						if (!t || t === he || f.current !== e || null != s) {
							const t = /* @__PURE__ */ new Map();
							for (let n of e) {
								if (!n) continue;
								if (s && s.length > 0 && !s.includes(n.id) && n.rect.current) {
									t.set(n.id, n.rect.current);
									continue;
								}
								const e = n.node.current, r = e ? new Y(d(e), e) : null;
								n.rect.current = r, r && t.set(n.id, r);
							}
							return t;
						}
						return t;
					}, [
						e,
						s,
						r,
						v,
						d
					]);
					return t$1.useEffect(() => {
						f.current = e;
					}, [e]), t$1.useEffect(() => {
						v || p();
					}, [r, v]), t$1.useEffect(() => {
						s && s.length > 0 && l(null);
					}, [JSON.stringify(s)]), t$1.useEffect(() => {
						v || "number" != typeof c || null !== h.current || (h.current = setTimeout(() => {
							p(), h.current = null;
						}, c));
					}, [
						c,
						v,
						p,
						...i
					]), {
						droppableRects: b,
						measureDroppableContainers: p,
						measuringScheduled: null != s
					};
				}(oe, {
					dragging: W,
					dependencies: [X.x, X.y],
					config: ie.droppable
				}), de = function(e, t) {
					const n = null != t ? e.get(t) : void 0, r = n ? n.node.current : null;
					return o.useLazyMemo((e) => {
						var n;
						return null == t ? null : null != (n = null != r ? r : e) ? n : null;
					}, [r, t]);
				}(H, j), ue = t$1.useMemo(() => ee ? o.getEventCoordinates(ee) : null, [ee]), fe = function() {
					const e = W && !(!1 === (null == Z ? void 0 : Z.autoScrollEnabled)) && !("object" == typeof p ? !1 === p.enabled : !1 === p);
					return "object" == typeof p ? {
						...p,
						enabled: e
					} : { enabled: e };
				}(), ve = function(e, t) {
					return be(e, t);
				}(de, ie.draggable.measure);
				(function(e) {
					let { activeNode: n, measure: r, initialRect: i, config: a = !0 } = e;
					const s = t$1.useRef(!1), { x: l, y: c } = "boolean" == typeof a ? {
						x: a,
						y: a
					} : a;
					o.useIsomorphicLayoutEffect(() => {
						if (!l && !c || !n) return void (s.current = !1);
						if (s.current || !i) return;
						const e = null == n ? void 0 : n.node.current;
						if (!e || !1 === e.isConnected) return;
						const t = D(r(e), i);
						if (l || (t.x = 0), c || (t.y = 0), s.current = !0, Math.abs(t.x) > 0 || Math.abs(t.y) > 0) {
							const n = k(e);
							n && n.scrollBy({
								top: t.y,
								left: t.x
							});
						}
					}, [
						n,
						l,
						c,
						i,
						r
					]);
				})({
					activeNode: null != j ? H.get(j) : null,
					config: fe.layoutShiftCompensation,
					initialRect: ve,
					measure: ie.draggable.measure
				});
				const pe = xe(de, ie.draggable.measure, ve), ye = xe(de ? de.parentElement : null), Oe = t$1.useRef({
					activatorEvent: null,
					active: null,
					activeNode: de,
					collisionRect: null,
					collisions: null,
					droppableRects: se,
					draggableNodes: H,
					draggingNode: null,
					draggingNodeRect: null,
					droppableContainers: V,
					over: null,
					scrollableAncestors: [],
					scrollAdjustedTranslate: null
				}), Ae = V.getNodeFor(null == (i = Oe.current.over) ? void 0 : i.id), Le = function(e) {
					let { measure: n } = e;
					const [r, i] = t$1.useState(null), a = me({ callback: t$1.useCallback((e) => {
						for (const { target: t } of e) if (o.isHTMLElement(t)) {
							i((e) => {
								const r = n(t);
								return e ? {
									...e,
									width: r.width,
									height: r.height
								} : r;
							});
							break;
						}
					}, [n]) }), s = t$1.useCallback((e) => {
						const t = Re(e);
						a?.disconnect(), t && a?.observe(t), i(t ? n(t) : null);
					}, [n, a]), [l, c] = o.useNodeRef(s);
					return t$1.useMemo(() => ({
						nodeRef: l,
						rect: r,
						setRef: c
					}), [
						r,
						l,
						c
					]);
				}({ measure: ie.dragOverlay.measure }), We = null != (s = Le.nodeRef.current) ? s : de, Ue = W ? null != (l = Le.rect) ? l : pe : null, je = Boolean(Le.nodeRef.current && Le.rect), qe = D(He = je ? null : pe, be(He));
				var He;
				const Xe = Ee(We ? o.getWindow(We) : null), Ye = function(e) {
					const n = t$1.useRef(e), r = o.useLazyMemo((t) => e ? t && t !== we && e && n.current && e.parentNode === n.current.parentNode ? t : L(e) : we, [e]);
					return t$1.useEffect(() => {
						n.current = e;
					}, [e]), r;
				}(W ? null != Ae ? Ae : de : null), Ve = function(e, n) {
					void 0 === n && (n = O);
					const [r] = e, i = Ee(r ? o.getWindow(r) : null), [a, s] = t$1.useState(De);
					function l() {
						s(() => e.length ? e.map((e) => z(e) ? i : new Y(n(e), e)) : De);
					}
					const c = me({ callback: l });
					return o.useIsomorphicLayoutEffect(() => {
						c?.disconnect(), l(), e.forEach((e) => null == c ? void 0 : c.observe(e));
					}, [e]), a;
				}(Ye), Je = Be(w, {
					transform: {
						x: X.x - qe.x,
						y: X.y - qe.y,
						scaleX: 1,
						scaleY: 1
					},
					activatorEvent: ee,
					active: G,
					activeNodeRect: pe,
					containerNodeRect: ye,
					draggingNodeRect: Ue,
					over: Oe.current.over,
					overlayNodeRect: Le.rect,
					scrollableAncestors: Ye,
					scrollableAncestorRects: Ve,
					windowRect: Xe
				}), _e = ue ? o.add(ue, X) : null, Ge = function(e) {
					const [n, r] = t$1.useState(null), i = t$1.useRef(e), a = t$1.useCallback((e) => {
						const t = T(e.target);
						t && r((e) => e ? (e.set(t, I(t)), new Map(e)) : null);
					}, []);
					return t$1.useEffect(() => {
						const t = i.current;
						if (e !== t) {
							n(t);
							const o = e.map((e) => {
								const t = T(e);
								return t ? (t.addEventListener("scroll", a, { passive: !0 }), [t, I(t)]) : null;
							}).filter((e) => null != e);
							r(o.length ? new Map(o) : null), i.current = e;
						}
						return () => {
							n(e), n(t);
						};
						function n(e) {
							e.forEach((e) => {
								T(e)?.removeEventListener("scroll", a);
							});
						}
					}, [a, e]), t$1.useMemo(() => e.length ? n ? Array.from(n.values()).reduce((e, t) => o.add(e, t), v) : q(e) : v, [e, n]);
				}(Ye), Qe = Ce(Ge), Ze = Ce(Ge, [pe]), $e = o.add(Je, Qe), et = Ue ? S(Ue, Je) : null, tt = G && et ? m({
					active: G,
					collisionRect: et,
					droppableRects: se,
					droppableContainers: oe,
					pointerCoordinates: _e
				}) : null, nt = y(tt, "id"), [rt, ot] = t$1.useState(null), it = function(e, t, n) {
					return {
						...e,
						scaleX: t && n ? t.width / n.width : 1,
						scaleY: t && n ? t.height / n.height : 1
					};
				}(je ? Je : o.add(Je, Ze), null != (c = null == rt ? void 0 : rt.rect) ? c : null, pe), at = t$1.useRef(null), st = t$1.useCallback((e, t) => {
					let { sensor: n, options: o } = t;
					if (null == Q.current) return;
					const i = H.get(Q.current);
					if (!i) return;
					const a = e.nativeEvent, s = new n({
						active: Q.current,
						activeNode: i,
						event: a,
						options: o,
						context: Oe,
						onAbort(e) {
							if (!H.get(e)) return;
							const { onDragAbort: t } = ne.current, n = { id: e };
							t?.(n), A({
								type: "onDragAbort",
								event: n
							});
						},
						onPending(e, t, n, r) {
							if (!H.get(e)) return;
							const { onDragPending: o } = ne.current, i = {
								id: e,
								constraint: t,
								initialCoordinates: n,
								offset: r
							};
							o?.(i), A({
								type: "onDragPending",
								event: i
							});
						},
						onStart(e) {
							const t = Q.current;
							if (null == t) return;
							const n = H.get(t);
							if (!n) return;
							const { onDragStart: o } = ne.current, i = {
								activatorEvent: a,
								active: {
									id: t,
									data: n.data,
									rect: _
								}
							};
							r.unstable_batchedUpdates(() => {
								o?.(i), F(Fe.Initializing), N({
									type: u.DragStart,
									initialCoordinates: e,
									active: t
								}), A({
									type: "onDragStart",
									event: i
								}), $(at.current), te(a);
							});
						},
						onMove(e) {
							N({
								type: u.DragMove,
								coordinates: e
							});
						},
						onEnd: l(u.DragEnd),
						onCancel: l(u.DragCancel)
					});
					function l(e) {
						return async function() {
							const { active: t, collisions: n, over: o, scrollAdjustedTranslate: i } = Oe.current;
							let s = null;
							if (t && i) {
								const { cancelDrop: r } = ne.current;
								s = {
									activatorEvent: a,
									active: t,
									collisions: n,
									delta: i,
									over: o
								}, e === u.DragEnd && "function" == typeof r && await Promise.resolve(r(s)) && (e = u.DragCancel);
							}
							Q.current = null, r.unstable_batchedUpdates(() => {
								N({ type: e }), F(Fe.Uninitialized), ot(null), $(null), te(null), at.current = null;
								const t = e === u.DragEnd ? "onDragEnd" : "onDragCancel";
								if (s) {
									const e = ne.current[t];
									e?.(s), A({
										type: t,
										event: s
									});
								}
							});
						};
					}
					at.current = s;
				}, [H]), lt = function(e, n) {
					return t$1.useMemo(() => e.reduce((e, t) => {
						const { sensor: r } = t;
						return [...e, ...r.activators.map((e) => ({
							eventName: e.eventName,
							handler: n(e.handler, t)
						}))];
					}, []), [e, n]);
				}(b, t$1.useCallback((e, t) => (n, r) => {
					const o = n.nativeEvent, i = H.get(r);
					null !== Q.current || !i || o.dndKit || o.defaultPrevented || !0 === e(n, t.options, { active: i }) && (o.dndKit = { capturedBy: t.sensor }, Q.current = r, st(n, t));
				}, [H, st]));
				(function(e) {
					t$1.useEffect(() => {
						if (!o.canUseDOM) return;
						const t = e.map((e) => {
							let { sensor: t } = e;
							return null == t.setup ? void 0 : t.setup();
						});
						return () => {
							for (const e of t) e?.();
						};
					}, e.map((e) => {
						let { sensor: t } = e;
						return t;
					}));
				})(b), o.useIsomorphicLayoutEffect(() => {
					pe && P === Fe.Initializing && F(Fe.Initialized);
				}, [pe, P]), t$1.useEffect(() => {
					const { onDragMove: e } = ne.current, { active: t, activatorEvent: n, collisions: o, over: i } = Oe.current;
					if (!t || !n) return;
					const a = {
						active: t,
						activatorEvent: n,
						collisions: o,
						delta: {
							x: $e.x,
							y: $e.y
						},
						over: i
					};
					r.unstable_batchedUpdates(() => {
						e?.(a), A({
							type: "onDragMove",
							event: a
						});
					});
				}, [$e.x, $e.y]), t$1.useEffect(() => {
					const { active: e, activatorEvent: t, collisions: n, droppableContainers: o, scrollAdjustedTranslate: i } = Oe.current;
					if (!e || null == Q.current || !t || !i) return;
					const { onDragOver: a } = ne.current, s = o.get(nt), l = s && s.rect.current ? {
						id: s.id,
						rect: s.rect.current,
						data: s.data,
						disabled: s.disabled
					} : null, c = {
						active: e,
						activatorEvent: t,
						collisions: n,
						delta: {
							x: i.x,
							y: i.y
						},
						over: l
					};
					r.unstable_batchedUpdates(() => {
						ot(l), a?.(c), A({
							type: "onDragOver",
							event: c
						});
					});
				}, [nt]), o.useIsomorphicLayoutEffect(() => {
					Oe.current = {
						activatorEvent: ee,
						active: G,
						activeNode: de,
						collisionRect: et,
						collisions: tt,
						droppableRects: se,
						draggableNodes: H,
						draggingNode: We,
						draggingNodeRect: Ue,
						droppableContainers: V,
						over: rt,
						scrollableAncestors: Ye,
						scrollAdjustedTranslate: $e
					}, _.current = {
						initial: Ue,
						translated: et
					};
				}, [
					G,
					de,
					tt,
					et,
					H,
					We,
					Ue,
					se,
					V,
					rt,
					Ye,
					$e
				]), function(e) {
					let { acceleration: n, activator: r = exports.AutoScrollActivator.Pointer, canScroll: i, draggingRect: a, enabled: s, interval: l = 5, order: c = exports.TraversalOrder.TreeOrder, pointerCoordinates: d, scrollableAncestors: u, scrollableAncestorRects: f, delta: v, threshold: g } = e;
					const p = function(e) {
						let { delta: t, disabled: n } = e;
						const r = o.usePrevious(t);
						return o.useLazyMemo((e) => {
							if (n || !r || !e) return ge;
							const o = Math.sign(t.x - r.x), i = Math.sign(t.y - r.y);
							return {
								x: {
									[B.Backward]: e.x[B.Backward] || -1 === o,
									[B.Forward]: e.x[B.Forward] || 1 === o
								},
								y: {
									[B.Backward]: e.y[B.Backward] || -1 === i,
									[B.Forward]: e.y[B.Forward] || 1 === i
								}
							};
						}, [
							n,
							t,
							r
						]);
					}({
						delta: v,
						disabled: !s
					}), [h, b] = o.useInterval(), m = t$1.useRef({
						x: 0,
						y: 0
					}), y = t$1.useRef({
						x: 0,
						y: 0
					}), x = t$1.useMemo(() => {
						switch (r) {
							case exports.AutoScrollActivator.Pointer: return d ? {
								top: d.y,
								bottom: d.y,
								left: d.x,
								right: d.x
							} : null;
							case exports.AutoScrollActivator.DraggableRect: return a;
						}
					}, [
						r,
						a,
						d
					]), w = t$1.useRef(null), C = t$1.useCallback(() => {
						const e = w.current;
						e && e.scrollBy(m.current.x * y.current.x, m.current.y * y.current.y);
					}, []), E = t$1.useMemo(() => c === exports.TraversalOrder.TreeOrder ? [...u].reverse() : u, [c, u]);
					t$1.useEffect(() => {
						if (s && u.length && x) {
							for (const e of E) {
								if (!1 === (null == i ? void 0 : i(e))) continue;
								const t = u.indexOf(e), r = f[t];
								if (!r) continue;
								const { direction: o, speed: a } = U(e, r, x, n, g);
								for (const e of ["x", "y"]) p[e][o[e]] || (a[e] = 0, o[e] = 0);
								if (a.x > 0 || a.y > 0) return b(), w.current = e, h(C, l), m.current = a, void (y.current = o);
							}
							m.current = {
								x: 0,
								y: 0
							}, y.current = {
								x: 0,
								y: 0
							}, b();
						} else b();
					}, [
						n,
						C,
						i,
						b,
						s,
						l,
						JSON.stringify(x),
						JSON.stringify(p),
						h,
						u,
						E,
						f,
						JSON.stringify(g)
					]);
				}({
					...fe,
					delta: X,
					draggingRect: et,
					pointerCoordinates: _e,
					scrollableAncestors: Ye,
					scrollableAncestorRects: Ve
				});
				const ct = t$1.useMemo(() => ({
					active: G,
					activeNode: de,
					activeNodeRect: pe,
					activatorEvent: ee,
					collisions: tt,
					containerNodeRect: ye,
					dragOverlay: Le,
					draggableNodes: H,
					droppableContainers: V,
					droppableRects: se,
					over: rt,
					measureDroppableContainers: le,
					scrollableAncestors: Ye,
					scrollableAncestorRects: Ve,
					measuringConfiguration: ie,
					measuringScheduled: ce,
					windowRect: Xe
				}), [
					G,
					de,
					pe,
					ee,
					tt,
					ye,
					Le,
					H,
					V,
					se,
					rt,
					le,
					Ye,
					Ve,
					ie,
					ce,
					Xe
				]), dt = t$1.useMemo(() => ({
					activatorEvent: ee,
					activators: lt,
					active: G,
					activeNodeRect: pe,
					ariaDescribedById: { draggable: re },
					dispatch: N,
					draggableNodes: H,
					over: rt,
					measureDroppableContainers: le
				}), [
					ee,
					lt,
					G,
					pe,
					N,
					re,
					H,
					rt,
					le
				]);
				return n.createElement(a.Provider, { value: K }, n.createElement(ke.Provider, { value: dt }, n.createElement(Te.Provider, { value: ct }, n.createElement(ze.Provider, { value: it }, h)), n.createElement(Ie, { disabled: !1 === (null == g ? void 0 : g.restoreFocus) })), n.createElement(d, {
					...g,
					hiddenTextDescribedById: re
				}));
			}));
			const Ue = t$1.createContext(null);
			const je = "button";
			function qe() {
				return t$1.useContext(Te);
			}
			const He = { timeout: 25 };
			function Xe(e) {
				let { animation: r, children: i } = e;
				const [a, s] = t$1.useState(null), [l, c] = t$1.useState(null), d = o.usePrevious(i);
				return i || a || !d || s(d), o.useIsomorphicLayoutEffect(() => {
					if (!l) return;
					const e = null == a ? void 0 : a.props.id;
					null != (null == a ? void 0 : a.key) && null != e ? Promise.resolve(r(e, l)).then(() => {
						s(null);
					}) : s(null);
				}, [
					r,
					a,
					l
				]), n.createElement(n.Fragment, null, i, a ? t$1.cloneElement(a, { ref: c }) : null);
			}
			const Ye = {
				x: 0,
				y: 0,
				scaleX: 1,
				scaleY: 1
			};
			function Ve(e) {
				let { children: t } = e;
				return n.createElement(ke.Provider, { value: Le }, n.createElement(ze.Provider, { value: Ye }, t));
			}
			const Je = {
				position: "fixed",
				touchAction: "none"
			};
			const _e = (e) => o.isKeyboardEvent(e) ? "transform 250ms ease" : void 0;
			const Ge = t$1.forwardRef((e, t) => {
				let { as: r, activatorEvent: i, adjustScale: a, children: s, className: l, rect: c, style: d, transform: u, transition: f = _e } = e;
				if (!c) return null;
				const v = a ? u : {
					...u,
					scaleX: 1,
					scaleY: 1
				}, g = {
					...Je,
					width: c.width,
					height: c.height,
					top: c.top,
					left: c.left,
					transform: o.CSS.Transform.toString(v),
					transformOrigin: a && i ? p(i, c) : void 0,
					transition: "function" == typeof f ? f(i) : f,
					...d
				};
				return n.createElement(r, {
					className: l,
					style: g,
					ref: t
				}, s);
			});
			const Qe = (e) => (t) => {
				let { active: n, dragOverlay: r } = t;
				const o = {}, { styles: i, className: a } = e;
				if (null != i && i.active) for (const [e, t] of Object.entries(i.active)) void 0 !== t && (o[e] = n.node.style.getPropertyValue(e), n.node.style.setProperty(e, t));
				if (null != i && i.dragOverlay) for (const [e, t] of Object.entries(i.dragOverlay)) void 0 !== t && r.node.style.setProperty(e, t);
				return null != a && a.active && n.node.classList.add(a.active), null != a && a.dragOverlay && r.node.classList.add(a.dragOverlay), function() {
					for (const [e, t] of Object.entries(o)) n.node.style.setProperty(e, t);
					null != a && a.active && n.node.classList.remove(a.active);
				};
			};
			const Ze = {
				duration: 250,
				easing: "ease",
				keyframes: (e) => {
					let { transform: { initial: t, final: n } } = e;
					return [{ transform: o.CSS.Transform.toString(t) }, { transform: o.CSS.Transform.toString(n) }];
				},
				sideEffects: Qe({ styles: { active: { opacity: "0" } } })
			};
			let $e = 0;
			function et(e) {
				return t$1.useMemo(() => {
					if (null != e) return $e++, $e;
				}, [e]);
			}
			const tt = n.memo((e) => {
				let { adjustScale: r = !1, children: i, dropAnimation: a, style: s, transition: l, modifiers: c, wrapperElement: d = "div", className: u, zIndex: f = 999 } = e;
				const { activatorEvent: v, active: g, activeNodeRect: p, containerNodeRect: h, draggableNodes: b, droppableContainers: m, dragOverlay: y, over: x, measuringConfiguration: w, scrollableAncestors: C, scrollableAncestorRects: E, windowRect: D } = qe(), R = t$1.useContext(ze), S = et(null == g ? void 0 : g.id), N = Be(c, {
					activatorEvent: v,
					active: g,
					activeNodeRect: p,
					containerNodeRect: h,
					draggingNodeRect: y.rect,
					over: x,
					overlayNodeRect: y.rect,
					scrollableAncestors: C,
					scrollableAncestorRects: E,
					transform: R,
					windowRect: D
				}), O = be(p), A = function(e) {
					let { config: t, draggableNodes: n, droppableContainers: r, measuringConfiguration: i } = e;
					return o.useEvent((e, a) => {
						if (null === t) return;
						const s = n.get(e);
						if (!s) return;
						const l = s.node.current;
						if (!l) return;
						const c = Re(a);
						if (!c) return;
						const { transform: d } = o.getWindow(a).getComputedStyle(a), u = M(d);
						if (!u) return;
						const f = "function" == typeof t ? t : function(e) {
							const { duration: t, easing: n, sideEffects: r, keyframes: o } = {
								...Ze,
								...e
							};
							return (e) => {
								let { active: i, dragOverlay: a, transform: s, ...l } = e;
								if (!t) return;
								const c = {
									x: s.x - (a.rect.left - i.rect.left),
									y: s.y - (a.rect.top - i.rect.top),
									scaleX: 1 !== s.scaleX ? i.rect.width * s.scaleX / a.rect.width : 1,
									scaleY: 1 !== s.scaleY ? i.rect.height * s.scaleY / a.rect.height : 1
								}, d = o({
									...l,
									active: i,
									dragOverlay: a,
									transform: {
										initial: s,
										final: c
									}
								}), [u] = d, f = d[d.length - 1];
								if (JSON.stringify(u) === JSON.stringify(f)) return;
								const v = null == r ? void 0 : r({
									active: i,
									dragOverlay: a,
									...l
								}), g = a.node.animate(d, {
									duration: t,
									easing: n,
									fill: "forwards"
								});
								return new Promise((e) => {
									g.onfinish = () => {
										v?.(), e();
									};
								});
							};
						}(t);
						return H(l, i.draggable.measure), f({
							active: {
								id: e,
								data: s.data,
								node: l,
								rect: i.draggable.measure(l)
							},
							draggableNodes: n,
							dragOverlay: {
								node: a,
								rect: i.dragOverlay.measure(c)
							},
							droppableContainers: r,
							measuringConfiguration: i,
							transform: u
						});
					});
				}({
					config: a,
					draggableNodes: b,
					droppableContainers: m,
					measuringConfiguration: w
				});
				return n.createElement(Ve, null, n.createElement(Xe, { animation: A }, g && S ? n.createElement(Ge, {
					key: S,
					id: g.id,
					ref: O ? y.setRef : void 0,
					as: d,
					activatorEvent: v,
					adjustScale: r,
					className: u,
					transition: l,
					rect: O,
					style: {
						zIndex: f,
						...s
					},
					transform: N
				}, i) : null));
			});
			exports.DndContext = We, exports.DragOverlay = tt, exports.KeyboardSensor = te, exports.MouseSensor = ce, exports.PointerSensor = ae, exports.TouchSensor = ue, exports.applyModifiers = Be, exports.closestCenter = (e) => {
				let { collisionRect: t, droppableRects: n, droppableContainers: r } = e;
				const o = x(t, t.left, t.top), i = [];
				for (const e of r) {
					const { id: t } = e, r = n.get(t);
					if (r) {
						const n = g(x(r), o);
						i.push({
							id: t,
							data: {
								droppableContainer: e,
								value: n
							}
						});
					}
				}
				return i.sort(h);
			}, exports.closestCorners = (e) => {
				let { collisionRect: t, droppableRects: n, droppableContainers: r } = e;
				const o = m(t), i = [];
				for (const e of r) {
					const { id: t } = e, r = n.get(t);
					if (r) {
						const n = m(r), a = o.reduce((e, t, r) => e + g(n[r], t), 0), s = Number((a / 4).toFixed(4));
						i.push({
							id: t,
							data: {
								droppableContainer: e,
								value: s
							}
						});
					}
				}
				return i.sort(h);
			}, exports.defaultAnnouncements = c, exports.defaultCoordinates = v, exports.defaultDropAnimation = Ze, exports.defaultDropAnimationSideEffects = Qe, exports.defaultKeyboardCoordinateGetter = ee, exports.defaultScreenReaderInstructions = l, exports.getClientRect = O, exports.getFirstCollision = y, exports.getScrollableAncestors = L, exports.pointerWithin = (e) => {
				let { droppableContainers: t, droppableRects: n, pointerCoordinates: r } = e;
				if (!r) return [];
				const o = [];
				for (const e of t) {
					const { id: t } = e, i = n.get(t);
					if (i && E(r, i)) {
						const n = m(i).reduce((e, t) => e + g(r, t), 0), a = Number((n / 4).toFixed(4));
						o.push({
							id: t,
							data: {
								droppableContainer: e,
								value: a
							}
						});
					}
				}
				return o.sort(h);
			}, exports.rectIntersection = C, exports.useDndContext = qe, exports.useDndMonitor = s, exports.useDraggable = function(e) {
				let { id: n, data: r, disabled: i = !1, attributes: a } = e;
				const s = o.useUniqueId("Draggable"), { activators: l, activatorEvent: c, active: d, activeNodeRect: u, ariaDescribedById: f, draggableNodes: v, over: g } = t$1.useContext(ke), { role: p = je, roleDescription: h = "draggable", tabIndex: b = 0 } = null != a ? a : {}, m = (null == d ? void 0 : d.id) === n, y = t$1.useContext(m ? ze : Ue), [x, w] = o.useNodeRef(), [C, E] = o.useNodeRef(), D = function(e, n) {
					return t$1.useMemo(() => e.reduce((e, t) => {
						let { eventName: r, handler: o } = t;
						return e[r] = (e) => {
							o(e, n);
						}, e;
					}, {}), [e, n]);
				}(l, n), R = o.useLatestValue(r);
				return o.useIsomorphicLayoutEffect(() => (v.set(n, {
					id: n,
					key: s,
					node: x,
					activatorNode: C,
					data: R
				}), () => {
					const e = v.get(n);
					e && e.key === s && v.delete(n);
				}), [v, n]), {
					active: d,
					activatorEvent: c,
					activeNodeRect: u,
					attributes: t$1.useMemo(() => ({
						role: p,
						tabIndex: b,
						"aria-disabled": i,
						"aria-pressed": !(!m || p !== je) || void 0,
						"aria-roledescription": h,
						"aria-describedby": f.draggable
					}), [
						i,
						p,
						b,
						m,
						h,
						f.draggable
					]),
					isDragging: m,
					listeners: i ? void 0 : D,
					node: x,
					over: g,
					setNodeRef: w,
					setActivatorNodeRef: E,
					transform: y
				};
			}, exports.useDroppable = function(e) {
				let { data: n, disabled: r = !1, id: i, resizeObserverConfig: a } = e;
				const s = o.useUniqueId("Droppable"), { active: l, dispatch: c, over: d, measureDroppableContainers: f } = t$1.useContext(ke), v = t$1.useRef({ disabled: r }), g = t$1.useRef(!1), p = t$1.useRef(null), h = t$1.useRef(null), { disabled: b, updateMeasurementsFor: m, timeout: y } = {
					...He,
					...a
				}, x = o.useLatestValue(null != m ? m : i), w = me({
					callback: t$1.useCallback(() => {
						g.current ? (null != h.current && clearTimeout(h.current), h.current = setTimeout(() => {
							f(Array.isArray(x.current) ? x.current : [x.current]), h.current = null;
						}, y)) : g.current = !0;
					}, [y]),
					disabled: b || !l
				}), C = t$1.useCallback((e, t) => {
					w && (t && (w.unobserve(t), g.current = !1), e && w.observe(e));
				}, [w]), [E, D] = o.useNodeRef(C), R = o.useLatestValue(n);
				return t$1.useEffect(() => {
					w && E.current && (w.disconnect(), g.current = !1, w.observe(E.current));
				}, [E, w]), t$1.useEffect(() => (c({
					type: u.RegisterDroppable,
					element: {
						id: i,
						key: s,
						disabled: r,
						node: E,
						rect: p,
						data: R
					}
				}), () => c({
					type: u.UnregisterDroppable,
					key: s,
					id: i
				})), [i]), t$1.useEffect(() => {
					r !== v.current.disabled && (c({
						type: u.SetDroppableDisabled,
						id: i,
						key: s,
						disabled: r
					}), v.current.disabled = r);
				}, [
					i,
					s,
					r,
					c
				]), {
					active: l,
					rect: p,
					isOver: (null == d ? void 0 : d.id) === i,
					node: E,
					over: d,
					setNodeRef: D
				};
			}, exports.useSensor = function(e, n) {
				return t$1.useMemo(() => ({
					sensor: e,
					options: null != n ? n : {}
				}), [e, n]);
			}, exports.useSensors = function() {
				for (var e = arguments.length, n = new Array(e), r = 0; r < e; r++) n[r] = arguments[r];
				return t$1.useMemo(() => [...n].filter((e) => null != e), [...n]);
			};
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+core@6.3.1_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/@dnd-kit/core/dist/index.js
		var require_dist$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_core_cjs_production_min();
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+sortable@10.0.0_@dnd-kit+core@6.3.1_react-dom@19.2.8_react@19.2.8__react@19.2.8__react@19.2.8/node_modules/@dnd-kit/sortable/dist/sortable.cjs.production.min.js
		var require_sortable_cjs_production_min = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: !0 });
			var e;
			var t = require("react");
			var r = (e = t) && "object" == typeof e && "default" in e ? e.default : e;
			var n = require_dist$1();
			var o = require_dist$3();
			function i(e, t, r) {
				const n = e.slice();
				return n.splice(r < 0 ? n.length + r : r, 0, n.splice(t, 1)[0]), n;
			}
			function a(e, t) {
				return e.reduce((e, r, n) => {
					const o = t.get(r);
					return o && (e[n] = o), e;
				}, Array(e.length));
			}
			function s(e) {
				return null !== e && e >= 0;
			}
			const d = {
				scaleX: 1,
				scaleY: 1
			};
			const l = (e) => {
				let { rects: t, activeIndex: r, overIndex: n, index: o } = e;
				const a = i(t, n, r), s = t[o], d = a[o];
				return d && s ? {
					x: d.left - s.left,
					y: d.top - s.top,
					scaleX: d.width / s.width,
					scaleY: d.height / s.height
				} : null;
			};
			const c = {
				scaleX: 1,
				scaleY: 1
			};
			const u = r.createContext({
				activeIndex: -1,
				containerId: "Sortable",
				disableTransforms: !1,
				items: [],
				overIndex: -1,
				useDragOverlay: !1,
				sortedRects: [],
				strategy: l,
				disabled: {
					draggable: !1,
					droppable: !1
				}
			});
			const f = (e) => {
				let { id: t, items: r, activeIndex: n, overIndex: o } = e;
				return i(r, n, o).indexOf(t);
			};
			const p = (e) => {
				let { containerId: t, isSorting: r, wasDragging: n, index: o, items: i, newIndex: a, previousItems: s, previousContainerId: d, transition: l } = e;
				return !(!l || !n || s !== i && o === a || !r && (a === o || t !== d));
			};
			const g = {
				duration: 200,
				easing: "ease"
			};
			const b = o.CSS.Transition.toString({
				property: "transform",
				duration: 0,
				easing: "linear"
			});
			const x = { roleDescription: "sortable" };
			function v(e) {
				if (!e) return !1;
				const t = e.data.current;
				return !!(t && "sortable" in t && "object" == typeof t.sortable && "containerId" in t.sortable && "items" in t.sortable && "index" in t.sortable);
			}
			const h = [
				n.KeyboardCode.Down,
				n.KeyboardCode.Right,
				n.KeyboardCode.Up,
				n.KeyboardCode.Left
			];
			function I(e, t) {
				return !(!v(e) || !v(t)) && e.data.current.sortable.containerId === t.data.current.sortable.containerId;
			}
			exports.SortableContext = function(e) {
				let { children: i, id: s, items: d, strategy: c = l, disabled: f = !1 } = e;
				const { active: p, dragOverlay: g, droppableRects: b, over: x, measureDroppableContainers: v } = n.useDndContext(), h = o.useUniqueId("Sortable", s), I = Boolean(null !== g.rect), y = t.useMemo(() => d.map((e) => "object" == typeof e && "id" in e ? e.id : e), [d]), m = null != p, w = p ? y.indexOf(p.id) : -1, C = x ? y.indexOf(x.id) : -1, R = t.useRef(y), S = !function(e, t) {
					if (e === t) return !0;
					if (e.length !== t.length) return !1;
					for (let r = 0; r < e.length; r++) if (e[r] !== t[r]) return !1;
					return !0;
				}(y, R.current), D = -1 !== C && -1 === w || S, O = function(e) {
					return "boolean" == typeof e ? {
						draggable: e,
						droppable: e
					} : e;
				}(f);
				o.useIsomorphicLayoutEffect(() => {
					S && m && v(y);
				}, [
					S,
					y,
					m,
					v
				]), t.useEffect(() => {
					R.current = y;
				}, [y]);
				const N = t.useMemo(() => ({
					activeIndex: w,
					containerId: h,
					disabled: O,
					disableTransforms: D,
					items: y,
					overIndex: C,
					useDragOverlay: I,
					sortedRects: a(y, b),
					strategy: c
				}), [
					w,
					h,
					O.draggable,
					O.droppable,
					D,
					y,
					C,
					b,
					I,
					c
				]);
				return r.createElement(u.Provider, { value: N }, i);
			}, exports.arrayMove = i, exports.arraySwap = function(e, t, r) {
				const n = e.slice();
				return n[t] = e[r], n[r] = e[t], n;
			}, exports.defaultAnimateLayoutChanges = p, exports.defaultNewIndexGetter = f, exports.hasSortableData = v, exports.horizontalListSortingStrategy = (e) => {
				var t;
				let { rects: r, activeNodeRect: n, activeIndex: o, overIndex: i, index: a } = e;
				const s = null != (t = r[o]) ? t : n;
				if (!s) return null;
				const l = function(e, t, r) {
					const n = e[t], o = e[t - 1], i = e[t + 1];
					return n && (o || i) ? r < t ? o ? n.left - (o.left + o.width) : i.left - (n.left + n.width) : i ? i.left - (n.left + n.width) : n.left - (o.left + o.width) : 0;
				}(r, a, o);
				if (a === o) {
					const e = r[i];
					return e ? {
						x: o < i ? e.left + e.width - (s.left + s.width) : e.left - s.left,
						y: 0,
						...d
					} : null;
				}
				return a > o && a <= i ? {
					x: -s.width - l,
					y: 0,
					...d
				} : a < o && a >= i ? {
					x: s.width + l,
					y: 0,
					...d
				} : {
					x: 0,
					y: 0,
					...d
				};
			}, exports.rectSortingStrategy = l, exports.rectSwappingStrategy = (e) => {
				let t, r, { activeIndex: n, index: o, rects: i, overIndex: a } = e;
				return o === n && (t = i[o], r = i[a]), o === a && (t = i[o], r = i[n]), r && t ? {
					x: r.left - t.left,
					y: r.top - t.top,
					scaleX: r.width / t.width,
					scaleY: r.height / t.height
				} : null;
			}, exports.sortableKeyboardCoordinates = (e, t) => {
				let { context: { active: r, collisionRect: i, droppableRects: a, droppableContainers: s, over: d, scrollableAncestors: l } } = t;
				if (h.includes(e.code)) {
					if (e.preventDefault(), !r || !i) return;
					const t = [];
					s.getEnabled().forEach((r) => {
						if (!r || null != r && r.disabled) return;
						const o = a.get(r.id);
						if (o) switch (e.code) {
							case n.KeyboardCode.Down:
								i.top < o.top && t.push(r);
								break;
							case n.KeyboardCode.Up:
								i.top > o.top && t.push(r);
								break;
							case n.KeyboardCode.Left:
								i.left > o.left && t.push(r);
								break;
							case n.KeyboardCode.Right: i.left < o.left && t.push(r);
						}
					});
					const f = n.closestCorners({
						active: r,
						collisionRect: i,
						droppableRects: a,
						droppableContainers: t,
						pointerCoordinates: null
					});
					let p = n.getFirstCollision(f, "id");
					if (p === (null == d ? void 0 : d.id) && f.length > 1 && (p = f[1].id), null != p) {
						const e = s.get(r.id), t = s.get(p), d = t ? a.get(t.id) : null, f = null == t ? void 0 : t.node.current;
						if (f && d && e && t) {
							const r = n.getScrollableAncestors(f).some((e, t) => l[t] !== e), a = I(e, t), s = (u = t, !(!v(c = e) || !v(u)) && !!I(c, u) && c.data.current.sortable.index < u.data.current.sortable.index), p = r || !a ? {
								x: 0,
								y: 0
							} : {
								x: s ? i.width - d.width : 0,
								y: s ? i.height - d.height : 0
							}, g = {
								x: d.left,
								y: d.top
							};
							return p.x && p.y ? g : o.subtract(g, p);
						}
					}
				}
				var c, u;
			}, exports.useSortable = function(e) {
				let { animateLayoutChanges: r = p, attributes: i, disabled: a, data: d, getNewIndex: l = f, id: c, strategy: v, resizeObserverConfig: h, transition: I = g } = e;
				const { items: y, containerId: m, activeIndex: w, disabled: C, disableTransforms: R, sortedRects: S, overIndex: D, useDragOverlay: O, strategy: N } = t.useContext(u), E = function(e, t) {
					var r, n;
					return "boolean" == typeof e ? {
						draggable: e,
						droppable: !1
					} : {
						draggable: null != (r = null == e ? void 0 : e.draggable) ? r : t.draggable,
						droppable: null != (n = null == e ? void 0 : e.droppable) ? n : t.droppable
					};
				}(a, C), K = y.indexOf(c), L = t.useMemo(() => ({
					sortable: {
						containerId: m,
						index: K,
						items: y
					},
					...d
				}), [
					m,
					d,
					K,
					y
				]), T = t.useMemo(() => y.slice(y.indexOf(c)), [y, c]), { rect: M, node: A, isOver: k, setNodeRef: X } = n.useDroppable({
					id: c,
					data: L,
					disabled: E.droppable,
					resizeObserverConfig: {
						updateMeasurementsFor: T,
						...h
					}
				}), { active: Y, activatorEvent: j, activeNodeRect: q, attributes: z, setNodeRef: U, listeners: B, isDragging: F, over: P, setActivatorNodeRef: _, transform: G } = n.useDraggable({
					id: c,
					data: L,
					attributes: {
						...x,
						...i
					},
					disabled: E.draggable
				}), H = o.useCombinedRefs(X, U), J = Boolean(Y), Q = J && !R && s(w) && s(D), V = !O && F, W = V && Q ? G : null, Z = Q ? null != W ? W : (null != v ? v : N)({
					rects: S,
					activeNodeRect: q,
					activeIndex: w,
					overIndex: D,
					index: K
				}) : null, $ = s(w) && s(D) ? l({
					id: c,
					items: y,
					activeIndex: w,
					overIndex: D
				}) : K, ee = null == Y ? void 0 : Y.id, te = t.useRef({
					activeId: ee,
					items: y,
					newIndex: $,
					containerId: m
				}), re = y !== te.current.items, ne = r({
					active: Y,
					containerId: m,
					isDragging: F,
					isSorting: J,
					id: c,
					index: K,
					items: y,
					newIndex: te.current.newIndex,
					previousItems: te.current.items,
					previousContainerId: te.current.containerId,
					transition: I,
					wasDragging: null != te.current.activeId
				}), oe = function(e) {
					let { disabled: r, index: i, node: a, rect: s } = e;
					const [d, l] = t.useState(null), c = t.useRef(i);
					return o.useIsomorphicLayoutEffect(() => {
						if (!r && i !== c.current && a.current) {
							const e = s.current;
							if (e) {
								const t = n.getClientRect(a.current, { ignoreTransform: !0 }), r = {
									x: e.left - t.left,
									y: e.top - t.top,
									scaleX: e.width / t.width,
									scaleY: e.height / t.height
								};
								(r.x || r.y) && l(r);
							}
						}
						i !== c.current && (c.current = i);
					}, [
						r,
						i,
						a,
						s
					]), t.useEffect(() => {
						d && l(null);
					}, [d]), d;
				}({
					disabled: !ne,
					index: K,
					node: A,
					rect: M
				});
				return t.useEffect(() => {
					J && te.current.newIndex !== $ && (te.current.newIndex = $), m !== te.current.containerId && (te.current.containerId = m), y !== te.current.items && (te.current.items = y);
				}, [
					J,
					$,
					m,
					y
				]), t.useEffect(() => {
					if (ee === te.current.activeId) return;
					if (null != ee && null == te.current.activeId) return void (te.current.activeId = ee);
					const e = setTimeout(() => {
						te.current.activeId = ee;
					}, 50);
					return () => clearTimeout(e);
				}, [ee]), {
					active: Y,
					activeIndex: w,
					attributes: z,
					data: L,
					rect: M,
					index: K,
					newIndex: $,
					items: y,
					isOver: k,
					isSorting: J,
					isDragging: F,
					listeners: B,
					node: A,
					overIndex: D,
					over: P,
					setNodeRef: H,
					setActivatorNodeRef: _,
					setDroppableNodeRef: X,
					setDraggableNodeRef: U,
					transform: null != oe ? oe : Z,
					transition: oe || re && te.current.newIndex === K ? b : V && !o.isKeyboardEvent(j) || !I ? void 0 : J || ne ? o.CSS.Transition.toString({
						...I,
						property: "transform"
					}) : void 0
				};
			}, exports.verticalListSortingStrategy = (e) => {
				var t;
				let { activeIndex: r, activeNodeRect: n, index: o, rects: i, overIndex: a } = e;
				const s = null != (t = i[r]) ? t : n;
				if (!s) return null;
				if (o === r) {
					const e = i[a];
					return e ? {
						x: 0,
						y: r < a ? e.top + e.height - (s.top + s.height) : e.top - s.top,
						...c
					} : null;
				}
				const d = function(e, t, r) {
					const n = e[t], o = e[t - 1], i = e[t + 1];
					return n ? r < t ? o ? n.top - (o.top + o.height) : i ? i.top - (n.top + n.height) : 0 : i ? i.top - (n.top + n.height) : o ? n.top - (o.top + o.height) : 0 : 0;
				}(i, o, r);
				return o > r && o <= a ? {
					x: 0,
					y: -s.height - d,
					...c
				} : o < r && o >= a ? {
					x: 0,
					y: s.height + d,
					...c
				} : {
					x: 0,
					y: 0,
					...c
				};
			};
		}));
		//#endregion
		//#region ../../../node_modules/.pnpm/@dnd-kit+sortable@10.0.0_@dnd-kit+core@6.3.1_react-dom@19.2.8_react@19.2.8__react@19.2.8__react@19.2.8/node_modules/@dnd-kit/sortable/dist/index.js
		var require_dist = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports = require_sortable_cjs_production_min();
		}));
		//#endregion
		//#region src/client/CardsTab.tsx
		/**
		* The Cards tab body — the bench's user plane (plan §5: "the user
		* browses visually in the tab").
		*
		* Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
		* CARD (the categories — each card's stages under its own header with
		* a count), each row opening a DSH Modal drilldown (id/card/engine/
		* params — the chat tile's drilldown pattern, primitives Modal), the
		* revision trail's head, and the Run gesture — which projects the
		* stages onto the flow_inline wire and starts them under the bench's
		* own draft_id, EXACTLY what melite_flow's bench verb does (one
		* truth, two planes; the model's plane is per-call reads, never this
		* component's frames).
		*
		* Run view (`dsh-resource://cards/run/<runId>`): live status + stage
		* rows + artifacts, riding the resource provider's frames — plus the
		* way back: "Back to bench" navigates home, and "Restore to bench"
		* turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
		* + per-stage bench/add-stage as the user, CAS-chained).
		*
		* ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
		* the shell's navigation address is the SHELL's (guide clicks arrive
		* as the tab id's own address, not a cards address). An address that
		* does not parse as a cards address serves the BENCH — the tab never
		* sits on a resource no provider claims.
		*
		* The body is dispatched by the keyed `sidebar.right.pane.tab` seat
		* under the type's id; the address arrives through the standard
		* `useTabInfo` hook, the value through the standard `useResource`
		* hook. Local prop typings (the package's local-spelling pattern —
		* see index.ts) keep this package off sibling runtime imports.
		*/
		var import_dist = require_dist$1();
		var import_dist$1 = require_dist();
		var import_dist$2 = require_dist$3();
		/** The flow_inline projection — the SAME wire shape melite_flow's bench
		*  verb sends (runner-owned keys strip; ids/engines/params stay). */
		function projectStage(s) {
			const row = {
				id: s.id,
				engine: s.engine ?? "comfyui"
			};
			if (s.params !== void 0 && Object.keys(s.params).length > 0) row["params"] = s.params;
			if (Array.isArray(s.inputs) && s.inputs.length > 0) row["inputs"] = s.inputs;
			if (Array.isArray(s.outputs) && s.outputs.length > 0) row["outputs"] = s.outputs;
			return row;
		}
		/** Correlation id for one client-request frame (crypto.randomUUID is
		*  the browser standard). */
		function nextRpcId() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== void 0) return cryptoApi.randomUUID();
			return "rpc-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
		}
		/** The Run gesture: start the bench as it stands, over the runs
		*  remote's wire door (same-origin POST /api/runs/start carrying the
		*  client-request frame — api-gateway.md; the gateway-era /v1/flows
		*  start died with the app, nothing serves it). Errors surface inline
		*  (the RemoteError branch's own refusal text — logged, never thrown
		*  past React). */
		async function runStages(draftId, rows) {
			const stages = rows.map(projectStage);
			if (stages.length === 0) return { refused: "nothing to run" };
			const rpcId = nextRpcId();
			try {
				const res = await fetch("/api/runs/start", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						type: "client-request",
						rpcId,
						method: "runs/start",
						payload: { args: { doc: {
							flow_inline: {
								id: draftId,
								stages
							},
							draft_id: draftId,
							test: false
						} } }
					})
				});
				if (!res.ok) return { refused: "run refused: HTTP " + String(res.status) };
				const body = await res.json().catch(() => null);
				if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) return { refused: "run refused: malformed response frame" };
				const result = Reflect.get(body, "result");
				if (typeof result !== "object" || result === null) return { refused: "run refused: malformed result" };
				if (Reflect.get(result, "ok") === true) {
					const runId = Reflect.get(Reflect.get(result, "value"), "run_id");
					if (typeof runId === "string" && runId !== "") return { runId };
					return { refused: "run refused: no run_id in the answer" };
				}
				const error = Reflect.get(result, "error");
				const message = typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "runs/start refused";
				return { refused: String(message) };
			} catch (e) {
				return { refused: e instanceof Error ? e.message : "run request failed" };
			}
		}
		/** THE CATEGORIES: bench stages grouped by card (first-appearance
		*  order — the agent's construction order survives; stages with no
		*  card gather under 'uncategorized', never dropped). */
		function groupStagesByCard(stages) {
			const groups = [];
			for (const s of stages) {
				const card = typeof s.card === "string" && s.card !== "" ? s.card : "uncategorized";
				const known = groups.find((g) => g.card === card);
				if (known === void 0) groups.push({
					card,
					rows: [s]
				});
				else known.rows.push(s);
			}
			return groups;
		}
		/** Run ALL — the header gesture (multi-stage benches are refused by
		*  the single-stage runs gateway until the estate queues flows; the
		*  refusal surfaces inline, never a fake success). */
		async function runTheBench(bench) {
			return await runStages(bench.draftId, bench.stages);
		}
		/** runs/stop — the cancel door (the registry seat's flag + interrupt).
		*  Same wire frame as every other verb. */
		async function stopRunWire(runId) {
			const rpcId = nextRpcId();
			const res = await fetch("/api/runs/stop", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					type: "client-request",
					rpcId,
					method: "runs/stop",
					payload: { args: { runId } }
				})
			});
			if (!res.ok) throw new Error("runs/stop: HTTP " + String(res.status));
			const body = await res.json().catch(() => null);
			if (typeof body !== "object" || body === null || Reflect.get(body, "type") !== "server-response" || Reflect.get(body, "rpcId") !== rpcId) throw new Error("runs/stop: malformed response frame");
			const result = Reflect.get(body, "result");
			if (typeof result !== "object" || result === null || Reflect.get(result, "ok") !== true) {
				const error = typeof result === "object" && result !== null ? Reflect.get(result, "error") : null;
				throw new Error(typeof error === "object" && error !== null && typeof Reflect.get(error, "message") === "string" ? Reflect.get(error, "message") : "runs/stop refused");
			}
		}
		/** Bench row run-status → the installed StateDot union (FlowCards'
		*  CardRowLine law: done|warning|ongoing|error — a stage that never
		*  ran shows NO dot, never a fake state). */
		const STAGE_DOT = {
			queued: "warning",
			pending: "warning",
			running: "ongoing",
			done: "done",
			failed: "error",
			ready: null
		};
		/** THE CARD ROW — the chat plane's CardRowLine grammar VERBATIM
		*  (f3026845, the 9-10 card system): [artifact thumb | kind Pill],
		*  bold title, service Pill, live StateDot, clipped prompt. ONE card
		*  system, both planes — the tab renders the SAME row the chat
		*  renders, from the same stylesheet (the .row/.thumb/.rowTitle/
		*  .prompt classes below are the flow block's own). */
		/** THE CARD TILE — the operator's CardTile law (flowCardTile.tsx)
		*  ported to the tab, DSH native: the visual card (INNER) is ONE flex
		*  column with exactly two flow children —
		*    1. the PREVIEW CELL — flex-1 min-h-0, aspect-square: it owns
		*       every pixel the caption strip doesn't need. Media fills it
		*       edge to edge (object-cover); no artifact yet → the KIND FACE
		*       (the kind initial, the glyph chain's face without the editor
		*       runtime). A portrait artifact can NOT drive the row height
		*       (SQUARE LAW, 2026-08-23).
		*    2. the CAPTION STRIP — shrink-0, natural height: the declared
		*       summary line (title · engine) + the live status dot.
		*  Image-anchored overlays (the status dot) live INSIDE the preview
		*  cell so their anchors ride the artifact's corner. Click = the
		*  drilldown (the second state, the shared CardDrill). */
		/** The OLD system's drag contract, VERBATIM (2026-08-08/08-22 era,
		*  recovered from d13560be^ packages/web-kit): capability tiles carry
		*  a fully-resolved card; asset tiles carry {url, type}. One drop
		*  target, two contracts, no ambiguity — the MIME pair is the law. */
		const CAPABILITY_DRAG_MIME = "application/tech-noir-capability";
		const ASSET_DRAG_MIME = "application/tech-noir-asset";
		/** Parse the capability MIME off a drop event. null = absent or
		*  malformed (falls through to the asset/file path) — old law. */
		function parseCapabilityDrop(raw) {
			if (raw === "") return null;
			try {
				const p = JSON.parse(raw);
				if (typeof p.service === "string" && typeof p.title === "string") return p;
				return null;
			} catch {
				return null;
			}
		}
		function parseAssetDrop(raw) {
			if (raw === "") return {};
			try {
				return JSON.parse(raw);
			} catch {
				return {};
			}
		}
		/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL) → the
		*  input-dir name input-prep's `source` field accepts. The door's own
		*  gates (type whitelist, one clean segment) are the law — the client
		*  only voices its refusals, never invents its own. */
		async function uploadInputFile(file) {
			const isImage = file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
			const isAudio = file.type.startsWith("audio/");
			if (!isImage && !isAudio) throw new Error("Input cards don’t accept " + (file.type !== "" ? file.type : "that file") + " — drop an image or audio file");
			if (!isImage) throw new Error("audio uploads have no door yet — the uploads door boards png / jpeg / webp only");
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
			return { name: path.split("/").pop() ?? file.name };
		}
		/** The sortable tile wrapper — the old grid's SortableCardWrap
		*  pattern: the li is the drag unit, transform/transition ride the
		*  wrapper, the shared-element layoutId stays INSIDE (the morph
		*  anchor is unbroken). */
		function SortableTile({ row, entered, onOpen, onWireDrop, onWireArm, wireSrc, grouping, selected, onToggleSelect, onAssetAttach }) {
			const { attributes, listeners, setNodeRef, transform, transition, isDragging } = (0, import_dist$1.useSortable)({ id: row.id });
			const dragProps = grouping ? {} : {
				...attributes,
				...listeners
			};
			const wiredFrom = typeof row.stage.inputs === "object" && row.stage.inputs !== null && "source" in row.stage.inputs;
			const wiring = wireSrc !== null;
			return (0, react.createElement)("li", {
				ref: setNodeRef,
				className: card_module_css_default.tile + (entered ? " " + card_module_css_default.tileEnter : "") + (isDragging ? " " + card_module_css_default.tileDragging : "") + (wiring ? " " + card_module_css_default.wiring : "") + (wireSrc === row.id ? " " + card_module_css_default.wiringSource : ""),
				style: {
					transform: import_dist$2.CSS.Translate.toString(transform),
					...transition !== null ? { transition } : {}
				},
				"data-stage-id": row.id,
				"data-stage-status": row.status,
				"data-wiring": wireSrc === row.id ? "source" : wiring ? "target" : null,
				"data-grouping": grouping ? "on" : null,
				"data-selected": grouping && selected ? "on" : null,
				onDragOver: (e) => {
					if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
						e.preventDefault();
						e.stopPropagation();
						e.dataTransfer.dropEffect = "copy";
					}
				},
				onDrop: (e) => {
					const asset = parseAssetDrop(e.dataTransfer.types.includes(ASSET_DRAG_MIME) ? e.dataTransfer.getData(ASSET_DRAG_MIME) : "");
					if ((asset.url ?? "") !== "") {
						e.preventDefault();
						e.stopPropagation();
						const t = asset.type ?? "";
						if (!t.startsWith("image/") && !t.startsWith("audio/")) return;
						onAssetAttach(row.id, asset.url);
						return;
					}
					const file = e.dataTransfer.files[0];
					if (file === void 0) return;
					if (file.type !== "image/png" && file.type !== "image/jpeg" && file.type !== "image/webp") return;
					e.preventDefault();
					e.stopPropagation();
					onAssetAttach(row.id, file);
				},
				...dragProps
			}, (0, react.createElement)(motion.div, {
				layoutId: cardLayoutId(row.id),
				className: card_module_css_default.tileShared,
				transition: ZOOM_SPRING
			}, (0, react.createElement)("button", {
				className: card_module_css_default.tileInner,
				type: "button",
				"data-status": row.status,
				onClick: () => {
					if (grouping) {
						onToggleSelect(row.id);
						return;
					}
					if (wireSrc === null) {
						onOpen(row);
						return;
					}
					if (wireSrc === row.id) {
						onWireArm(row.id);
						return;
					}
					onWireDrop(row.id, wireSrc);
				}
			}, grouping ? (0, react.createElement)("span", {
				className: card_module_css_default.checkCircle + (selected ? " " + card_module_css_default.checkOn : ""),
				"aria-hidden": "true"
			}, selected ? "✓" : "") : null, (0, react.createElement)("span", { className: card_module_css_default.tilePreview }, row.thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.tileImg,
				src: row.thumbUrl,
				alt: row.title,
				loading: "lazy"
			}) : (0, react.createElement)("span", {
				className: card_module_css_default.kindFace,
				"data-kind": row.kind
			}, (0, react.createElement)("span", { className: card_module_css_default.kindInitial }, row.kind.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.kindName }, row.kind)), row.dot !== null ? (0, react.createElement)("span", { className: card_module_css_default.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.dot })) : null), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, row.title, wiredFrom ? (0, react.createElement)("span", {
				className: card_module_css_default.wiredMark,
				title: "source wired"
			}, " ⛓") : null, row.sourceAttached ? (0, react.createElement)("span", {
				className: card_module_css_default.wiredMark,
				title: "source attached"
			}, " 📎") : null), (0, react.createElement)("span", { className: card_module_css_default.tileMeta }, row.service !== null ? row.service : null, row.upstream !== null ? (0, react.createElement)("span", {
				className: card_module_css_default.upstreamBadge,
				title: "source ⟵ " + row.upstream
			}, "⟵ " + row.upstream) : null, row.prompt !== null ? (0, react.createElement)("span", { className: card_module_css_default.tilePrompt }, row.prompt) : null), row.status !== "" && row.status !== "ready" ? (0, react.createElement)("span", {
				className: card_module_css_default.statusChip,
				"data-status": row.status
			}, row.status) : null), (0, react.createElement)("button", {
				className: card_module_css_default.wireBtn,
				type: "button",
				"aria-label": "Wire from this stage",
				title: "Wire from this stage",
				onClick: (e) => {
					e.stopPropagation();
					onWireArm(row.id);
				}
			}, "⛓"))));
		}
		function benchRow(stage, bench) {
			const isGroup = stage.card === "group";
			const children = isGroup && Array.isArray(stage.children) ? stage.children.length : 0;
			const title = isGroup ? "Group (" + String(children) + ")" : stage.title ?? stage.card ?? stage.id;
			const status = typeof stage.runStatus === "string" && stage.runStatus !== "" ? stage.runStatus : "ready";
			const params = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const promptRaw = typeof params["prompt"] === "string" ? params["prompt"] : "";
			const result = stage.result;
			const url = typeof result === "object" && result !== null && typeof Reflect.get(result, "url") === "string" ? Reflect.get(result, "url") : "";
			return {
				id: stage.id,
				kind: isGroup ? "group" : String(stage.card ?? "card"),
				title: String(title),
				service: typeof stage.engine === "string" && stage.engine !== "" ? stage.engine : null,
				status,
				dot: STAGE_DOT[status] ?? null,
				prompt: promptRaw !== "" ? promptRaw.slice(0, 96) : null,
				thumbUrl: /^(https?:\/\/|\/)/.test(url) ? url : null,
				upstream: (() => {
					const inputs = typeof stage.inputs === "object" && stage.inputs !== null ? stage.inputs : null;
					const edge = inputs !== null && typeof inputs["source"] === "object" && inputs["source"] !== null ? inputs["source"] : null;
					const from = edge !== null && typeof edge["stage"] === "string" ? edge["stage"] : "";
					if (from === "" || bench === void 0) return null;
					const upstreamRow = bench.stages.find((s) => s.id === from);
					return upstreamRow !== void 0 ? String(upstreamRow.card ?? upstreamRow.id) : null;
				})(),
				sourceAttached: typeof params["source"] === "string" && params["source"] !== "",
				stage
			};
		}
		/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
		*  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
		*  groups, defaults); the drill renders THAT, never a raw key/value
		*  dump. Params left, Run right; the patch carries only CHANGED keys
		*  (coerced once, at patch time — the editPatch law); then the run
		*  gesture (patch lands in the domain BEFORE the run reads it). */
		function StageDrill({ stage, bench, running, onRun, onClose, onRemoved, onRewired }) {
			String(stage.title ?? stage.card ?? stage.id);
			const held = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const [spec, setSpec] = (0, react.useState)(null);
			const [values, setValues] = (0, react.useState)({});
			const [error, setError] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const [removing, setRemoving] = (0, react.useState)(false);
			const inputs = typeof stage.inputs === "object" && stage.inputs !== null ? stage.inputs : {};
			const sourceEdge = typeof inputs["source"] === "object" && inputs["source"] !== null ? inputs["source"] : null;
			const wiredStage = sourceEdge !== null && typeof sourceEdge["stage"] === "string" ? sourceEdge["stage"] : "";
			const others = bench.stages.filter((s) => s.id !== stage.id);
			const setWire = async (fromId) => {
				setError(null);
				try {
					const fromStage = bench.stages.find((s) => s.id === fromId);
					const outputs = fromStage !== void 0 && Array.isArray(fromStage.outputs) ? fromStage.outputs : [];
					await rewireStageWire(fromId === "" ? {
						stage: stage.id,
						input: "source",
						expect_rev: bench.rev
					} : {
						stage: stage.id,
						input: "source",
						from: {
							stage: fromId,
							output: outputs[0] ?? "default"
						},
						expect_rev: bench.rev
					});
					onRewired();
				} catch (e) {
					setError(e instanceof Error ? e.message : "wire failed");
				}
			};
			(0, react.useEffect)(() => {
				let alive = true;
				const family = String(stage.card ?? "");
				if (family === "") {
					setLoaded(true);
					return;
				}
				fetchFormSpec(family).then((doc) => {
					if (!alive) return;
					setSpec(doc);
					setValues({
						...specDefaults(doc.fields),
						...held
					});
					setLoaded(true);
				}).catch((e) => {
					if (!alive) return;
					setError(e instanceof Error ? e.message : "form-spec unavailable");
					setLoaded(true);
				});
				return () => {
					alive = false;
				};
			}, [stage.id]);
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((m) => ({
					...m,
					[name]: v
				}));
			}, []);
			const run = async () => {
				setError(null);
				try {
					const patch = spec !== null ? specPatch(spec.fields, values, held) : {};
					if (Object.keys(patch).length > 0) await patchStageParams(bench.draftId, stage.id, patch);
					onRun();
				} catch (e) {
					setError(e instanceof Error ? e.message : "run failed");
				}
			};
			const remove = async () => {
				setError(null);
				setRemoving(true);
				try {
					await removeStageWire({
						stage: stage.id,
						expect_rev: bench.rev
					});
					onRemoved();
				} catch (e) {
					setError(e instanceof Error ? e.message : "remove failed");
					setRemoving(false);
				}
			};
			if (stage.card === "group") {
				const members = Array.isArray(stage.children) ? stage.children.filter((c) => typeof c === "object" && c !== null && typeof Reflect.get(c, "id") === "string") : [];
				const ungroup = async () => {
					setError(null);
					setRemoving(true);
					try {
						await ungroupStageWire({
							stage: stage.id,
							expect_rev: bench.rev
						});
						onRemoved();
					} catch (e) {
						setError(e instanceof Error ? e.message : "ungroup failed");
						setRemoving(false);
					}
				};
				return (0, react.createElement)("div", { className: card_module_css_default.zoomDetail }, (0, react.createElement)("p", { className: card_module_css_default.groupNote }, "A compound of " + String(members.length) + " stages. Ungroup restores them at this position."), (0, react.createElement)("ol", { className: card_module_css_default.memberList }, members.map((m, i) => (0, react.createElement)("li", {
					key: m.id,
					className: card_module_css_default.memberRow
				}, (0, react.createElement)("span", { className: card_module_css_default.memberIdx }, String(i + 1) + "."), (0, react.createElement)("span", { className: card_module_css_default.memberName }, String(m.title ?? m.card ?? m.id))))), (0, react.createElement)("div", { className: card_module_css_default.runRow }, error !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, error) : null, (0, react.createElement)("button", {
					className: card_module_css_default.back,
					type: "button",
					disabled: removing,
					onClick: () => {
						ungroup();
					}
				}, removing ? "ungrouping…" : "Ungroup")));
			}
			return (0, react.createElement)("div", { className: card_module_css_default.zoomDetail }, (0, react.createElement)("div", { className: card_module_css_default.wireRow }, (0, react.createElement)("span", { className: card_module_css_default.wireLabel }, "source input ⟵"), (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				value: wiredStage,
				"aria-label": "Wire source input from stage",
				onChange: (e) => {
					setWire(e.target.value);
				}
			}, (0, react.createElement)("option", {
				key: "",
				value: ""
			}, wiredStage !== "" ? "— clear wire —" : "— none —"), others.map((s) => (0, react.createElement)("option", {
				key: s.id,
				value: s.id
			}, String(s.title ?? s.card ?? s.id) + " → " + stage.id)))), (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, !loaded ? (0, react.createElement)("div", { className: card_module_css_default.load }, "form…") : spec !== null ? (0, react.createElement)(SpecForm, {
				fields: spec.fields,
				values,
				onEdit
			}) : (0, react.createElement)("pre", { className: card_module_css_default.mono }, JSON.stringify(held, null, 2))), (0, react.createElement)("div", { className: card_module_css_default.outputs }, (0, react.createElement)("div", { className: card_module_css_default.runRow }, error !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, error) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")), (0, react.createElement)("div", { className: card_module_css_default.runRow }, (0, react.createElement)("button", {
				className: card_module_css_default.back,
				type: "button",
				disabled: running || removing,
				onClick: () => {
					remove();
				}
			}, removing ? "removing…" : "Remove stage")))));
		}
		/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
		*  + tile → the picker (the catalog's action cards, search + genre
		*  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
		*  as the user (CAS-chained). ONE surface: action cards; models are not
		*  entries (the model select lives ON the card's form). */
		function AddCardDoor({ bench, onAdded, onClose }) {
			const [cards, setCards] = (0, react.useState)(null);
			const [catalogError, setCatalogError] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [picked, setPicked] = (0, react.useState)(null);
			const [spec, setSpec] = (0, react.useState)(null);
			const [values, setValues] = (0, react.useState)({});
			const [formError, setFormError] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let alive = true;
				fetchCardCatalog().then((list) => {
					if (alive) setCards(list);
				}).catch((e) => {
					if (alive) setCatalogError(e instanceof Error ? e.message : "catalog unavailable");
				});
				return () => {
					alive = false;
				};
			}, []);
			const pick = (card) => {
				setPicked(card);
				setSpec(null);
				setFormError(null);
				fetchFormSpec(card.families[0] ?? card.id).then((doc) => {
					setSpec(doc);
					setValues(specDefaults(doc.fields));
				}).catch((e) => setFormError(e instanceof Error ? e.message : "form-spec unavailable"));
			};
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((m) => ({
					...m,
					[name]: v
				}));
			}, []);
			const add = async () => {
				if (picked === null) return;
				setAdding(true);
				setFormError(null);
				try {
					const doc = {
						card: picked.id,
						author: "user",
						engine: spec?.engine ?? "comfyui",
						expect_rev: bench.rev
					};
					const params = spec !== null ? specPatch(spec.fields, values, specDefaults(spec.fields)) : {};
					if (Object.keys(params).length > 0) doc["params"] = {
						...specDefaults(spec?.fields ?? []),
						...values
					};
					await addStageWire(doc);
					setAdding(false);
					onAdded();
				} catch (e) {
					setFormError(e instanceof Error ? e.message : "add refused");
					setAdding(false);
				}
			};
			const filtered = (cards ?? []).filter((c) => {
				if (query === "") return true;
				const q = query.toLowerCase();
				return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q);
			});
			const genres = [];
			for (const c of filtered) {
				const g = c.genre !== "" ? c.genre : "other";
				const known = genres.find((x) => x[0] === g);
				if (known === void 0) genres.push([g, [c]]);
				else known[1].push(c);
			}
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: "Add a card",
				closeLabel: "Close picker",
				className: card_module_css_default.drill
			}, picked === null ? (0, react.createElement)("div", { className: card_module_css_default.picker }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: query,
				placeholder: "search cards…",
				onChange: (e) => setQuery(e.target.value),
				"aria-label": "Search cards"
			}), catalogError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, catalogError) : null, cards === null && catalogError === null ? (0, react.createElement)("div", { className: card_module_css_default.load }, "cards…") : null, genres.map(([g, list]) => (0, react.createElement)("section", {
				key: g,
				className: card_module_css_default.pickerGenre
			}, (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, g), list.map((c) => (0, react.createElement)("button", {
				key: c.id,
				type: "button",
				className: card_module_css_default.pickerCard,
				onClick: () => pick(c)
			}, (0, react.createElement)("span", { className: card_module_css_default.pickerCardLabel }, c.label), c.description !== "" ? (0, react.createElement)("span", { className: card_module_css_default.pickerCardDesc }, c.description) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, null, c.families[0] ?? c.id)))))) : (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.back,
				onClick: () => {
					setPicked(null);
					setSpec(null);
				}
			}, "← " + (cards?.length ?? 0) + " cards"), spec === null && formError === null ? (0, react.createElement)("div", { className: card_module_css_default.load }, "form…") : null, formError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, formError) : null, spec !== null ? (0, react.createElement)(SpecForm, {
				fields: spec.fields,
				values,
				onEdit
			}) : null), (0, react.createElement)("div", { className: card_module_css_default.outputs }, (0, react.createElement)("div", { className: card_module_css_default.runRow }, formError !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, formError) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: adding || spec === null,
				onClick: () => {
					add();
				}
			}, adding ? "adding…" : "Add card")))));
		}
		function BenchView({ bench, onRun, onRunStage, running }) {
			const [live, setLive] = (0, react.useState)(bench);
			(0, react.useEffect)(() => {
				setLive(bench);
			}, [bench.draftId, bench.rev]);
			const knownIds = (0, react.useRef)(new Set(bench.stages.map((s) => s.id)));
			const [entered, setEntered] = (0, react.useState)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				const fresh = [];
				for (const s of live.stages) if (!knownIds.current.has(s.id)) {
					knownIds.current.add(s.id);
					fresh.push(s.id);
				}
				if (fresh.length > 0) setEntered((prev) => {
					const next = new Set(prev);
					for (const id of fresh) next.add(id);
					return next;
				});
			}, [live.stages]);
			const [open, setOpen] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			const [reloadError, setReloadError] = (0, react.useState)(null);
			const onOpen = (0, react.useCallback)((stage) => setOpen(stage), []);
			const onClose = (0, react.useCallback)(() => setOpen(null), []);
			const onAddCard = (0, react.useCallback)(() => setAdding(true), []);
			const reload = (0, react.useCallback)((opts) => {
				setReloadError(null);
				fetchBench().then((next) => {
					setLive(next);
					if (opts?.keepOpen === true) setOpen((cur) => cur === null ? null : next.stages.find((s) => s.id === cur.id) ?? null);
					else setOpen(null);
				}).catch((e) => {
					setReloadError(e instanceof Error ? e.message : "bench reload failed");
				});
			}, []);
			const onAdded = (0, react.useCallback)(() => {
				setAdding(false);
				reload();
			}, [reload]);
			const sensors = (0, import_dist.useSensors)((0, import_dist.useSensor)(import_dist.PointerSensor, { activationConstraint: { distance: 6 } }));
			const onDragEnd = (0, react.useCallback)((e) => {
				const active = String(e.active.id);
				const over = e.over !== null ? String(e.over.id) : null;
				if (over === null || over === active || over === "add") return;
				const from = live.stages.findIndex((s) => s.id === active);
				const to = live.stages.findIndex((s) => s.id === over);
				if (from < 0 || to < 0) return;
				const next = live.stages.slice();
				const [moved] = next.splice(from, 1);
				next.splice(to, 0, moved);
				const beforeRev = live.rev;
				setLive((cur) => ({
					...cur,
					stages: next
				}));
				reorderStageWire({
					stage: active,
					to,
					expect_rev: beforeRev
				}).then((row) => {
					const rev = typeof row["rev"] === "number" ? row["rev"] : beforeRev + 1;
					setLive((cur) => ({
						...cur,
						rev
					}));
				}).catch((err) => {
					setReloadError(err instanceof Error ? err.message : "reorder failed");
					reload();
				});
			}, [live, reload]);
			const [wireSrc, setWireSrc] = (0, react.useState)(null);
			const onWireArm = (0, react.useCallback)((id) => {
				setWireSrc((cur) => cur === id ? null : id);
			}, []);
			const onWireDrop = (0, react.useCallback)((target, source) => {
				setWireSrc(null);
				const src = live.stages.find((s) => s.id === source);
				rewireStageWire({
					stage: target,
					input: "source",
					from: {
						stage: source,
						output: (src !== void 0 && Array.isArray(src.outputs) ? src.outputs : [])[0] ?? "default"
					},
					expect_rev: live.rev
				}).then(() => {
					reload();
				}).catch((err) => {
					setReloadError(err instanceof Error ? err.message : "wire failed");
				});
			}, [live, reload]);
			const [capOver, setCapOver] = (0, react.useState)(false);
			const dropInterested = (e) => e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME) || e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files");
			const onGridDragOver = (0, react.useCallback)((e) => {
				if (!dropInterested(e)) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "copy";
				setCapOver(true);
			}, []);
			const onGridDragLeave = (0, react.useCallback)((e) => {
				if (e.relatedTarget === null) setCapOver(false);
			}, []);
			const onGridDrop = (0, react.useCallback)((e) => {
				if (!dropInterested(e)) return;
				e.preventDefault();
				setCapOver(false);
				if (e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)) {
					const cap = parseCapabilityDrop(e.dataTransfer.getData(CAPABILITY_DRAG_MIME));
					if (cap === null) return;
					addStageWire({
						card: cap.service,
						...cap.params !== void 0 && Object.keys(cap.params).length > 0 ? { params: cap.params } : {},
						expect_rev: live.rev
					}).then(() => {
						reload();
					}).catch((err) => {
						setReloadError(err instanceof Error ? err.message : "add refused");
					});
					return;
				}
				if (e.dataTransfer.types.includes(ASSET_DRAG_MIME)) {
					const payload = parseAssetDrop(e.dataTransfer.getData(ASSET_DRAG_MIME));
					if ((payload.url ?? "") === "") return;
					const t = payload.type ?? "";
					if (!(t.startsWith("image/") || t.startsWith("audio/"))) {
						setReloadError(t !== "" ? "Input cards don’t accept " + t + " assets" : "That asset isn’t supported — drop an image or audio asset");
						return;
					}
					addStageWire({
						card: "input-prep",
						params: { source: payload.url },
						expect_rev: live.rev
					}).then(() => {
						reload();
					}).catch((err) => {
						setReloadError(err instanceof Error ? err.message : "add refused");
					});
					return;
				}
				if (e.dataTransfer.files.length > 0) {
					const file = e.dataTransfer.files[0];
					if (file === void 0) return;
					uploadInputFile(file).then(({ name }) => addStageWire({
						card: "input-prep",
						params: { source: name },
						expect_rev: live.rev
					})).then(() => {
						reload();
					}).catch((err) => {
						setReloadError(err instanceof Error ? err.message : "drop refused");
					});
				}
			}, [live, reload]);
			const [grouping, setGrouping] = (0, react.useState)(false);
			const [selectedIds, setSelectedIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const onToggleSelect = (0, react.useCallback)((id) => {
				setSelectedIds((prev) => {
					const next = new Set(prev);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			}, []);
			const exitGrouping = (0, react.useCallback)(() => {
				setGrouping(false);
				setSelectedIds(/* @__PURE__ */ new Set());
			}, []);
			(0, react.useEffect)(() => {
				if (!grouping) return;
				const onKey = (e) => {
					if (e.key !== "Escape") return;
					const t = e.target;
					if (t !== null && typeof t.closest === "function" && t.closest("input, textarea, select, [contenteditable]") !== null) return;
					exitGrouping();
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [grouping, exitGrouping]);
			(0, react.useEffect)(() => {
				if (selectedIds.size === 0) return;
				const present = new Set(live.stages.map((s) => s.id));
				const stale = [...selectedIds].filter((id) => !present.has(id));
				if (stale.length === 0) return;
				setSelectedIds((prev) => {
					const next = new Set(prev);
					for (const id of stale) next.delete(id);
					return next;
				});
			}, [live.stages, selectedIds]);
			const onGroup = (0, react.useCallback)(() => {
				const ordered = live.stages.map((s) => s.id).filter((id) => selectedIds.has(id));
				if (ordered.length < 2) return;
				groupStagesWire({
					stages: ordered,
					expect_rev: live.rev
				}).then(() => {
					exitGrouping();
					reload();
				}).catch((err) => {
					setReloadError(err instanceof Error ? err.message : "group refused");
				});
			}, [
				live,
				selectedIds,
				exitGrouping,
				reload
			]);
			const onAssetAttach = (0, react.useCallback)((target, source) => {
				(typeof source === "string" ? Promise.resolve(source) : uploadInputFile(source).then(({ name }) => name)).then((src) => patchStageParams(live.draftId, target, { source: src })).then(() => {
					reload({ keepOpen: true });
				}).catch((err) => {
					setReloadError(err instanceof Error ? err.message : "attach refused");
				});
			}, [live, reload]);
			const benchRev = live.rev;
			return (0, react.createElement)("section", {
				className: card_module_css_default.cardsBench,
				"data-cards-bench": benchRev
			}, (0, react.createElement)("header", { className: card_module_css_default.benchHead }, (0, react.createElement)("span", { className: card_module_css_default.revTag }, "rev " + benchRev), grouping ? (0, react.createElement)("span", { className: card_module_css_default.groupBar }, (0, react.createElement)("button", {
				className: card_module_css_default.runBtn,
				type: "button",
				disabled: selectedIds.size < 2,
				title: selectedIds.size < 2 ? "select 2+ tiles to group" : "collapse the selected stages into one compound",
				onClick: onGroup
			}, "Group " + String(selectedIds.size) + " cards"), (0, react.createElement)("button", {
				className: card_module_css_default.back,
				type: "button",
				onClick: exitGrouping
			}, "Cancel")) : (0, react.createElement)("span", { className: card_module_css_default.groupBar }, (0, react.createElement)("button", {
				className: card_module_css_default.back,
				type: "button",
				disabled: live.stages.length < 2,
				title: live.stages.length < 2 ? "grouping needs 2+ stages" : "enter the selection sub-view",
				onClick: () => {
					setGrouping(true);
				}
			}, "Group Cards"), (0, react.createElement)("button", {
				className: card_module_css_default.runBtn,
				type: "button",
				disabled: running || live.stages.length === 0,
				onClick: onRun
			}, "Run"))), reloadError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, reloadError) : null, live.stages.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.empty }, "The bench is empty — construct stages (the agent adds them; they land here).") : (0, react.createElement)(import_dist.DndContext, {
				sensors,
				collisionDetection: import_dist.closestCenter,
				onDragEnd
			}, (0, react.createElement)(import_dist$1.SortableContext, {
				items: live.stages.map((s) => s.id),
				strategy: import_dist$1.rectSortingStrategy,
				children: (0, react.createElement)("ol", {
					className: card_module_css_default.tileGrid + (capOver ? " " + card_module_css_default.capOver : ""),
					onDragOver: onGridDragOver,
					onDragLeave: onGridDragLeave,
					onDrop: onGridDrop,
					"data-drop-surface": "cards"
				}, live.stages.map((s) => {
					const row = benchRow(s, live);
					return (0, react.createElement)(SortableTile, {
						key: s.id,
						row,
						entered: entered.has(s.id),
						onOpen: (r) => onOpen(r.stage),
						onWireDrop,
						onWireArm,
						wireSrc,
						grouping,
						selected: selectedIds.has(s.id),
						onToggleSelect,
						onAssetAttach
					});
				}), (0, react.createElement)("li", { className: card_module_css_default.tile + " " + card_module_css_default.tileAdd }, (0, react.createElement)("button", {
					type: "button",
					className: card_module_css_default.tileInner,
					"aria-label": "Add a card",
					onClick: onAddCard
				}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview + " " + card_module_css_default.addFace }, "+"), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, "Add a card")))))
			})), live.log.length > 0 ? (0, react.createElement)("p", { className: card_module_css_default.logHead }, live.log.length + " log entr" + (live.log.length === 1 ? "y" : "ies")) : null, open !== null ? (0, react.createElement)(CardZoomOverlay, {
				stage: open,
				bench: live,
				running,
				onRun: () => {
					onRunStage(open);
				},
				onClose,
				onRemoved: () => {
					setOpen(null);
					reload();
				},
				onRewired: () => {
					reload({ keepOpen: true });
				},
				detail: StageDrill
			}) : null, adding ? (0, react.createElement)(AddCardDoor, {
				bench: live,
				onAdded,
				onClose: () => {
					setAdding(false);
				}
			}) : null);
		}
		function RunView({ run, onBack, onRestored, onStop }) {
			const [restoring, setRestoring] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(null);
			const [stopping, setStopping] = (0, react.useState)(false);
			const live = run.status === "queued" || run.status === "pending" || run.status === "running";
			const onCancel = () => {
				if (onStop === void 0) return;
				setStopping(true);
				onStop(run.runId);
			};
			const onRestore = (0, react.useCallback)(() => {
				setRestoring(true);
				setNote(null);
				restoreRunToBench(run).then((report) => {
					const extra = report.notes.length > 0 ? " (" + report.notes.join("; ") + ")" : "";
					const skipped = report.skipped > 0 ? ", " + String(report.skipped) + " skipped" : "";
					setNote("restored " + String(report.added) + " stage(s) to the bench" + skipped + extra);
					setRestoring(false);
					onRestored();
				}).catch((e) => {
					setNote(e instanceof Error ? e.message : String(e));
					setRestoring(false);
				});
			}, [run, onRestored]);
			return (0, react.createElement)("section", {
				className: card_module_css_default.runView,
				"data-run-status": run.status
			}, (0, react.createElement)("header", { className: card_module_css_default.runHead }, (0, react.createElement)("span", { className: card_module_css_default.runId }, run.runId), (0, react.createElement)("span", { className: card_module_css_default.runStatus }, run.status)), (0, react.createElement)("div", { className: card_module_css_default.runActions }, onBack !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default.back,
				type: "button",
				onClick: onBack
			}, "Back to bench") : null, live && onStop !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default.cancelBtn,
				type: "button",
				disabled: stopping,
				onClick: onCancel
			}, stopping ? "cancelling…" : "Cancel run") : null, (0, react.createElement)("button", {
				className: card_module_css_default.restore,
				type: "button",
				disabled: restoring || run.draftId === null,
				title: run.draftId === null ? "this run names no draft — nothing to restore" : "copy this run’s stages back onto the bench as your own",
				onClick: onRestore
			}, restoring ? "Restoring…" : "Restore to bench")), note !== null ? (0, react.createElement)("p", { className: card_module_css_default.restoreNote }, note) : null, run.stages.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.empty }, "No stage rows yet.") : (0, react.createElement)("ol", { className: card_module_css_default.tileGrid }, run.stages.map((s) => {
				const thumb = s.url !== void 0 ? mediaUrl(run.runId, s.url) : null;
				const dot = s.status === "done" ? "done" : s.status === "running" ? "ongoing" : s.status === "failed" ? "error" : s.status === "queued" || s.status === "pending" ? "warning" : null;
				const face = thumb !== null ? (0, react.createElement)("a", {
					href: thumb,
					target: "_blank",
					rel: "noreferrer",
					className: card_module_css_default.tileImgLink
				}, (0, react.createElement)("img", {
					className: card_module_css_default.tileImg,
					src: thumb,
					alt: s.id,
					loading: "lazy"
				})) : (0, react.createElement)("span", {
					className: card_module_css_default.kindFace,
					"data-kind": s.id
				}, (0, react.createElement)("span", { className: card_module_css_default.kindInitial }, s.id.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.kindName }, s.id));
				return (0, react.createElement)("li", {
					key: s.id,
					className: card_module_css_default.tile,
					"data-stage-status": s.status
				}, (0, react.createElement)("div", {
					className: card_module_css_default.tileInner,
					"data-status": s.status
				}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview }, face, dot !== null ? (0, react.createElement)("span", { className: card_module_css_default.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot })) : null), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, s.id), (0, react.createElement)("span", { className: card_module_css_default.tileMeta }, s.status))));
			})));
		}
		/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
		*  the shell's navigation address is the SHELL's (guide clicks arrive
		*  as the tab id's own address, not a cards address). An address that
		*  does not parse as a cards address serves the BENCH — the tab never
		*  sits on a resource no provider claims. */
		function resolveCardsAddress(rawAddress) {
			return parseCardsAddress(rawAddress) !== null ? rawAddress : CARDS_BENCH_ADDRESS;
		}
		/** The tab body component. */
		function CardsTab(props) {
			const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0;
			const address = resolveCardsAddress(info?.tab.navigation.address ?? info?.tab.contentId ?? "dsh-resource://cards/bench");
			const openResource = info?.tab.actions.openResource;
			const snapshot = typeof props.useResource === "function" ? props.useResource(address) : void 0;
			const [running, setRunning] = (0, react.useState)(false);
			const [localRun, setLocalRun] = (0, react.useState)(null);
			const [localRunError, setLocalRunError] = (0, react.useState)(null);
			const runStreamAbort = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				runStreamAbort.current?.abort();
			}, []);
			const onStarted = (0, react.useCallback)((runId) => {
				setRunning(false);
				if (openResource !== void 0) {
					openResource(cardsRunAddress(runId));
					return;
				}
				runStreamAbort.current?.abort();
				const ctrl = new AbortController();
				runStreamAbort.current = ctrl;
				setLocalRunError(null);
				(async () => {
					try {
						for await (const frame of openCardsResource(cardsRunAddress(runId), { signal: ctrl.signal })) {
							if (ctrl.signal.aborted) return;
							if (frame.ok) setLocalRun(frame.value);
							else {
								const err = typeof frame === "object" && frame !== null && "error" in frame ? frame.error : null;
								setLocalRunError(err instanceof Error ? err.message : "run stream failed");
								return;
							}
						}
					} catch (e) {
						if (!ctrl.signal.aborted) setLocalRunError(e instanceof Error ? e.message : "run stream failed");
					}
				})();
			}, [openResource]);
			const onRun = (0, react.useCallback)(() => {
				if (snapshot?.value?.kind !== "bench") return;
				setRunning(true);
				setLocalRunError(null);
				runTheBench(snapshot.value).then((res) => {
					if ("runId" in res) onStarted(res.runId);
					else {
						setRunning(false);
						setLocalRunError(res.refused);
					}
				});
			}, [snapshot, onStarted]);
			const onRunStage = (0, react.useCallback)((stage) => {
				if (snapshot?.value?.kind !== "bench") return;
				setRunning(true);
				setLocalRunError(null);
				runStages(snapshot.value.draftId, [stage]).then((res) => {
					if ("runId" in res) onStarted(res.runId);
					else {
						setRunning(false);
						setLocalRunError(res.refused);
					}
				});
			}, [snapshot, onStarted]);
			const onStop = (0, react.useCallback)((runId) => {
				stopRunWire(runId).catch((e) => {
					setLocalRunError(e instanceof Error ? e.message : "cancel failed");
				});
			}, []);
			const onBack = (0, react.useCallback)(() => {
				if (openResource !== void 0) openResource(CARDS_BENCH_ADDRESS);
			}, [openResource]);
			const onLocalBack = (0, react.useCallback)(() => {
				runStreamAbort.current?.abort();
				setLocalRun(null);
				setLocalRunError(null);
			}, []);
			if (localRun !== null) return (0, react.createElement)(RunView, {
				run: localRun,
				onBack: onLocalBack,
				onRestored: onLocalBack,
				onStop
			});
			if (snapshot === void 0) return (0, react.createElement)("p", { className: card_module_css_default.missing }, "cards resource hook unavailable");
			if (snapshot.status === "loading" || snapshot.status === "none") return (0, react.createElement)("p", { className: card_module_css_default.loading }, "loading " + address + "…");
			if (snapshot.status === "failed") return (0, react.createElement)("p", { className: card_module_css_default.failed }, snapshot.failure?.message ?? "cards resource failed");
			const value = snapshot.value;
			if (value === void 0) return (0, react.createElement)("p", { className: card_module_css_default.failed }, "cards resource gave no value");
			return value.kind === "bench" ? (0, react.createElement)(react.Fragment, null, localRunError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, localRunError) : null, (0, react.createElement)(BenchView, {
				bench: value,
				onRun,
				onRunStage,
				running
			})) : (0, react.createElement)(RunView, {
				run: value,
				onBack: openResource !== void 0 ? onBack : void 0,
				onRestored: onBack,
				onStop
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Every card tool that produces a draft — the card tile renders for ALL of them. */
		const CARD_TOOLS = [
			"melite_flow",
			"image_card",
			"tts_card",
			"video_card",
			"music_card",
			"sfx_card",
			"three_d_card",
			"motion_card",
			"body_card",
			"image_edit_card",
			"h3_timeline_card",
			"creature_flow",
			"humanoid_flow",
			"non_humanoid_flow",
			"prop_flow",
			"sprite_sheet"
		];
		/** @deprecated use CARD_TOOLS — kept for back-compat imports */
		const FLOW_START_TOOL = CARD_TOOLS[0];
		/** The tab type's identity (the key its body registers under). */
		const CARDS_TAB_ID = "@melite-plugin/dsh-card-view";
		/** Required services (fiber inject waiting — the registries must be up
		*  first: the native sidebar subsystem + the resource model). */
		const inject = [
			"slots",
			"sidebarRightTabs",
			"resources"
		];
		/**
		* Register both planes: the toolview keys for every card tool, and the
		* cards tab (type + body + resource provider).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (!claimCardViewApply()) return;
			ctx.effect(() => releaseCardViewApply, "melite-card-view: apply claim");
			for (const tool of CARD_TOOLS) try {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: tool
				}, FlowCards));
			} catch (error) {
				console.error(`[melite-card-view] toolview registration failed for ${tool}:`, error);
			}
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: CARDS_TAB_ID,
					kind: "cards",
					patterns: ["dsh-resource://cards/**"],
					title: (address) => {
						const resolved = resolveCardsAddress(address);
						return resolved === "dsh-resource://cards/bench" ? "Cards" : resolved.replace(/^dsh-resource:\/\/cards\//, "");
					},
					guide: [{
						order: 50,
						title: () => "Cards",
						description: () => "The working flow — the shared bench and its runs."
					}]
				}), "melite-card-view: cards tab type");
			} catch (error) {
				console.error("[melite-card-view] cards tab type registration failed:", error);
			}
			try {
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: CARDS_TAB_ID
				}, CardsTab));
			} catch (error) {
				console.error("[melite-card-view] cards tab body registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.resources.register({
					protocol: "cards",
					open: openCardsResource
				}), "melite-card-view: cards resource provider");
			} catch (error) {
				console.error("[melite-card-view] cards resource provider registration failed:", error);
			}
		}
		//#endregion
		exports.CARDS_BENCH_ADDRESS = CARDS_BENCH_ADDRESS;
		exports.CARD_TOOLS = CARD_TOOLS;
		exports.CardsTab = CardsTab;
		exports.FLOW_START_TOOL = FLOW_START_TOOL;
		exports.FlowCards = FlowCards;
		exports.apply = apply;
		exports.cardsRunAddress = cardsRunAddress;
		exports.groupStagesByCard = groupStagesByCard;
		exports.inject = inject;
		exports.mergeRunFrame = mergeRunFrame;
		exports.parseCardsAddress = parseCardsAddress;
		exports.parseCardsBlock = parseCardsBlock;
		exports.restoreRunToBench = restoreRunToBench;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
