window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-view",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		require("@deepseek-ai/cordis");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		//#region src/client/surface.ts
		let open = null;
		/** Install the shell face (the client entry's apply; idempotent overwrite). */
		function setOpenCardsSurface(fn) {
			open = fn;
		}
		/**
		* Open a cards address in the shell's Cards tab. Returns false when no
		* shell face is installed — the caller falls back to its in-card view.
		*/
		function openCardsSurface(address) {
			if (open === null) return false;
			open(address);
			return true;
		}
		//#endregion
		//#region \0dsh-css:melite-card-view/src/client/card.module.css.mjs
		const css$1 = ".vYZV7a_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.vYZV7a_load{color:var(--dsw-alias-label-secondary,#9a9aa5);padding:2px 0}.vYZV7a_head{align-items:center;gap:8px;min-width:0;display:flex}.vYZV7a_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.vYZV7a_state{corner-shape:round;border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.vYZV7a_state[data-state=completed]{color:var(--dsw-alias-state-success-primary,#3fb96f)}.vYZV7a_state[data-state=running],.vYZV7a_state[data-state=queued],.vYZV7a_state[data-state=pending],.vYZV7a_state[data-state=starting],.vYZV7a_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary,#d9a53f)}.vYZV7a_state[data-state=failed],.vYZV7a_state[data-state=error],.vYZV7a_state[data-state=stopped],.vYZV7a_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary,#e05656)}.vYZV7a_prompt{color:var(--dsw-alias-text-secondary,#9a9aa5);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.vYZV7a_link:hover{text-decoration:underline}.vYZV7a_row{color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 6px;display:flex}.vYZV7a_row:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_row:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#4f7bd8);outline-offset:-1px}.vYZV7a_thumb{object-fit:cover;border-radius:4px;flex:none;width:34px;height:34px}.vYZV7a_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;font-weight:600;overflow:hidden}.vYZV7a_drill{width:92vw;max-width:min(860px,92vw)}.vYZV7a_split{grid-template-columns:minmax(240px,1fr) minmax(0,1.2fr);gap:14px;min-width:0;display:grid}@media (width<=640px){.vYZV7a_split{grid-template-columns:1fr}}.vYZV7a_params{flex-direction:column;gap:8px;min-width:0;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_field{flex-direction:column;gap:3px;min-width:0;display:flex}.vYZV7a_fieldKey{color:var(--dsw-alias-label-secondary,#9a9aa5);font-size:11px}.vYZV7a_outputs{flex-direction:column;align-items:center;gap:10px;min-width:0;display:flex}.vYZV7a_outputImg{object-fit:contain;border-radius:8px;max-width:100%;max-height:46vh}.vYZV7a_runRow{justify-content:flex-end;align-items:center;gap:10px;width:100%;display:flex}.vYZV7a_runError{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;font-size:11px}.vYZV7a_state[data-state=legacy]{color:var(--dsw-alias-label-secondary,#9a9aa5)}.vYZV7a_cardsBench{flex-direction:column;gap:8px;padding:12px 14px 18px;display:flex}.vYZV7a_benchHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.vYZV7a_revTag{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:11px}.vYZV7a_runBtn,.vYZV7a_back,.vYZV7a_restore{border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;cursor:pointer;font:inherit;background:0 0;border-radius:6px;padding:2px 10px;font-size:12px}.vYZV7a_runBtn:hover:not(:disabled),.vYZV7a_back:hover,.vYZV7a_restore:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_runBtn:disabled,.vYZV7a_restore:disabled{cursor:default;opacity:.45}.vYZV7a_category{flex-direction:column;gap:2px;display:flex}.vYZV7a_catTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.06em;text-transform:uppercase;margin:4px 0 2px;font-size:11px;font-weight:600}.vYZV7a_stages{flex-direction:column;gap:2px;margin:0;padding:0;list-style:none;display:flex}.vYZV7a_stage{list-style:none}.vYZV7a_stageTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:45%;font-weight:600;overflow:hidden}.vYZV7a_stageEngine{color:var(--dsw-alias-label-secondary,#61666b);flex:none;font-size:11px;line-height:17px}.vYZV7a_stageArtifact{color:var(--dsw-alias-state-business-primary,#4f7bd8);font-size:12px;text-decoration:none}.vYZV7a_stageArtifact:hover{text-decoration:underline}.vYZV7a_empty,.vYZV7a_loading,.vYZV7a_failed,.vYZV7a_missing,.vYZV7a_logHead,.vYZV7a_restoreNote{color:var(--dsw-alias-label-secondary,#61666b);margin:0;font-size:12px;font-style:italic}.vYZV7a_runView{flex-direction:column;gap:8px;display:flex}.vYZV7a_runHead{align-items:baseline;gap:8px;display:flex}.vYZV7a_runId{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;font-weight:600}.vYZV7a_runStatus{border:.5px solid var(--dsw-alias-border-l2,#0000001a);corner-shape:round;color:var(--dsw-alias-label-secondary,#61666b);border-radius:999px;padding:0 8px;font-size:11px}.vYZV7a_runActions{gap:8px;display:flex}.vYZV7a_stageDetail{grid-template-columns:auto 1fr;gap:2px 12px;margin:0;display:grid}.vYZV7a_stageDetail dt{color:var(--dsw-alias-label-secondary,#61666b);text-align:right;text-transform:uppercase;font-size:11px}.vYZV7a_stageDetail dd{min-width:0;margin:0}.vYZV7a_mono{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);font-size:12px;overflow-x:auto}.vYZV7a_tileGrid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.vYZV7a_tile{margin:0;padding:0;display:block}.vYZV7a_tileInner{border:.5px solid var(--dsw-alias-border-l2,#0000001a);cursor:pointer;transition:border-color var(--ds-transition-duration,.2s) var(--ds-ease-in-out,cubic-bezier(.4, 0, .2, 1)), background-color var(--ds-transition-duration,.2s) var(--ds-ease-in-out,cubic-bezier(.4, 0, .2, 1));font:inherit;text-align:left;background:0 0;border-radius:10px;flex-direction:column;align-items:stretch;width:100%;padding:0;display:flex;overflow:hidden}.vYZV7a_tileInner:hover{border-color:var(--dsw-alias-state-business-primary,#4f7bd8);background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_tilePreview{aspect-ratio:1;flex:1;width:100%;min-height:0;margin:0;display:block;position:relative}.vYZV7a_tileImg,.vYZV7a_tileImgLink{width:100%;height:100%;display:block}.vYZV7a_tileImg{object-fit:cover}.vYZV7a_kindFace{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-secondary,#61666b);flex-direction:column;justify-content:center;align-items:center;gap:4px;width:100%;height:100%;display:flex}.vYZV7a_kindInitial{font-size:28px;font-weight:700;line-height:1}.vYZV7a_kindName{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-overflow:ellipsis;white-space:nowrap;padding:0 6px;font-size:10px;overflow:hidden}.vYZV7a_tileDot{position:absolute;bottom:6px;right:6px}.vYZV7a_tileCaption{border-top:.5px solid var(--dsw-alias-border-l2,#0000001a);flex-direction:column;flex:none;gap:2px;padding:6px 8px;display:flex}.vYZV7a_tileTitle{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;line-height:20px;overflow:hidden}.vYZV7a_tileMeta{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);align-items:center;gap:6px;font-size:10px;line-height:17px;display:flex;overflow:hidden}.vYZV7a_tilePrompt{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.vYZV7a_tileAdd .vYZV7a_tileInner{border-style:dashed}.vYZV7a_addFace{color:var(--dsw-alias-label-secondary,#61666b);justify-content:center;align-items:center;font-size:34px;font-weight:300;display:flex}.vYZV7a_picker{flex-direction:column;gap:10px;max-height:60vh;display:flex;overflow-y:auto}.vYZV7a_pickerGenre{flex-direction:column;gap:4px;display:flex}.vYZV7a_pickerCard{border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border-radius:8px;align-items:baseline;gap:8px;width:100%;padding:8px 10px;display:flex}.vYZV7a_pickerCard:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border-color:var(--dsw-alias-state-business-primary,#4f7bd8)}.vYZV7a_pickerCardLabel{white-space:nowrap;font-size:13px;font-weight:600}.vYZV7a_pickerCardDesc{color:var(--dsw-alias-label-secondary,#61666b);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;overflow:hidden}.vYZV7a_specForm :where(input,textarea,select,button){box-sizing:border-box}.vYZV7a_specForm{flex-direction:column;gap:12px;display:flex}.vYZV7a_specGroup{flex-direction:column;gap:8px;display:flex}.vYZV7a_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.vYZV7a_specField{flex-direction:column;gap:6px;display:flex}.vYZV7a_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.vYZV7a_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.vYZV7a_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.vYZV7a_specSelect{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.vYZV7a_specSliderRow{align-items:center;gap:8px;display:flex}.vYZV7a_specSlider{flex:1}.vYZV7a_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.vYZV7a_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.vYZV7a_tileShared{display:block;position:relative}.vYZV7a_zoomOverlay{background:var(--dsw-alias-bg-mask,#090c12b8);z-index:80;flex-direction:column;display:flex;position:fixed;inset:0}.vYZV7a_zoomScroll{flex:1;min-height:0;overflow-y:auto}.vYZV7a_zoomInner{box-sizing:border-box;justify-content:center;align-items:center;width:100%;max-width:100%;min-height:100%;margin:0 auto;padding:24px;display:flex}.vYZV7a_tileDragOver{outline:2px dashed var(--dsw-alias-accent,#3b82f6);outline-offset:-2px}.vYZV7a_zoomCard{background:var(--dsw-alias-bg-module-platform,#f5f6f7);box-shadow:var(--dsw-elevation-panel,0 0 0 .5px #00000029, 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005);color:var(--dsw-alias-label-primary,#0f1115);border:0;border-radius:14px;flex-direction:column;min-height:320px;max-height:86vh;animation:.18s cubic-bezier(.2,.9,.3,1) vYZV7a_zoom-in;display:flex;overflow:hidden}@keyframes vYZV7a_zoom-in{0%{opacity:0;transform:scale(.92)}}.vYZV7a_zoomBar{border-bottom:.5px solid var(--dsw-alias-border-l2,#0000001a);flex:none;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;display:flex}.vYZV7a_zoomTitle{font-size:13px;font-weight:600;line-height:20px}.vYZV7a_closeX{color:inherit;cursor:pointer;background:0 0;border:none;border-radius:6px;padding:4px 8px;font-size:14px;line-height:1}.vYZV7a_closeX:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_zoomDetail{min-height:0;padding:14px;display:block;overflow-y:auto}.vYZV7a_zoomSkeleton{flex-direction:column;flex:1;gap:10px;min-height:0;padding:16px;display:flex}.vYZV7a_skLine{will-change:background-position;background:linear-gradient(90deg, transparent 40%, var(--dsw-alias-interactive-bg-hover,#2631480f) 50%, transparent 60%);background-color:var(--dsw-alias-interactive-bg-hover,#2631480f);background-size:200% 100%;border-radius:6px;height:12px;animation:1s linear infinite both vYZV7a_zoomShimmer}.vYZV7a_skWide{width:60%}.vYZV7a_skShort{flex:1;height:28px}.vYZV7a_skBlock{border-radius:10px;height:120px}.vYZV7a_skRow{gap:10px;display:flex}@keyframes vYZV7a_zoomShimmer{0%{background-position:150% 0}to{background-position:-100% 0}}@keyframes vYZV7a_tilePop{0%{opacity:0;transform:scale(.96)translateY(6px)}60%{opacity:1;transform:scale(1.015)translateY(0)}to{opacity:1;transform:scale(1)translateY(0)}}.vYZV7a_tileEnter{animation:.26s cubic-bezier(.2,.8,.3,1) both vYZV7a_tilePop}.vYZV7a_tileDragging{opacity:.55;z-index:2}.vYZV7a_wiredMark{color:var(--dsw-alias-state-business-primary,#4176e6);font-size:10px}.vYZV7a_capOver{background:var(--dsw-alias-interactive-bg-hover,#2631480f);outline:1px dashed var(--dsw-alias-state-business-primary,#4176e6);outline-offset:4px}.vYZV7a_cancelBtn{color:#b3261e;cursor:pointer;background:0 0;border:1px solid #b3261e;border-radius:8px;padding:5px 12px;font-size:12px}.vYZV7a_cancelBtn:disabled{cursor:default;opacity:.6}.vYZV7a_groupBar{align-items:center;gap:8px;display:flex}.vYZV7a_checkCircle{border:1.5px solid var(--dsw-alias-label-secondary,#61666b);corner-shape:round;color:#fff;z-index:3;border-radius:999px;justify-content:center;align-items:center;width:20px;height:20px;font-size:11px;display:flex;position:absolute;top:8px;left:8px}.vYZV7a_checkOn{background:var(--dsw-alias-state-business-primary,#4176e6);border-color:var(--dsw-alias-state-business-primary,#4176e6)}[data-selected=on]{outline:2px solid var(--dsw-alias-state-business-primary,#4176e6);outline-offset:2px}.vYZV7a_groupNote{color:var(--dsw-alias-label-secondary,#61666b);margin:0 0 10px;font-size:12px;line-height:20px}.vYZV7a_memberList{margin:0 0 12px;padding:0;list-style:none}.vYZV7a_memberRow{border-bottom:1px solid var(--dsw-alias-interactive-bg-hover,#2631480f);align-items:baseline;gap:8px;padding:6px 2px;display:flex}.vYZV7a_memberIdx{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,monospace);font-size:11px}.vYZV7a_memberName{font-size:13px}@media (prefers-reduced-motion:reduce){.vYZV7a_tileEnter,.vYZV7a_skLine,.vYZV7a_skBlock{animation-duration:.01ms;animation-iteration-count:1}}.vYZV7a_studioHead{align-items:center;gap:8px;line-height:20px;display:flex}.vYZV7a_studioBody{flex-direction:column;gap:12px;display:flex}.vYZV7a_studioGroup{flex-direction:column;gap:6px;display:flex}.vYZV7a_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.vYZV7a_squareBox{border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.vYZV7a_squareBox:hover{border-color:var(--dsw-alias-border-l3,#00000047)}.vYZV7a_squareOver{border-color:var(--dsw-alias-border-l3,#00000047);box-shadow:0 0 0 2px var(--dsw-alias-border-l1,#00000014)}.vYZV7a_squareThumb{object-fit:cover;width:100%;height:100%}.vYZV7a_squareGlyph{color:var(--dsw-alias-label-tertiary,#00000073)}.vYZV7a_squareX{background:var(--dsw-alias-bg-module,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.vYZV7a_squareX:hover{border-color:var(--dsw-alias-border-l3,#00000047)}.vYZV7a_squareLabel{color:var(--dsw-alias-label-primary,#0f1115);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.vYZV7a_squareMetric{color:var(--dsw-alias-label-tertiary,#00000073);font-size:10px;line-height:17px}.vYZV7a_squareOff{opacity:.5;pointer-events:none}.vYZV7a_squareFileInput{display:none}.vYZV7a_viewport{background:var(--dsw-alias-bg-canvas,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);border-radius:10px;min-height:320px;display:flex;position:relative;overflow:hidden}.vYZV7a_viewportEmpty{color:var(--dsw-alias-label-tertiary,#00000073);align-self:center;margin:auto;font-size:12px;line-height:20px}.vYZV7a_viewport canvas{display:block}.vYZV7a_viewportCanvas{width:100%;height:380px}.vYZV7a_studioSplit{grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:12px;display:grid}.vYZV7a_studioRail{flex-direction:column;gap:10px;min-width:0;display:flex}@media (width<=900px){.vYZV7a_studioSplit{grid-template-columns:1fr}}.vYZV7a_viewport:only-child{min-height:380px}.vYZV7a_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.vYZV7a_modHead{align-items:baseline;gap:8px;display:flex}.vYZV7a_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.vYZV7a_modHint{opacity:.45;font-size:9px}.vYZV7a_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.vYZV7a_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.vYZV7a_modTile:active{cursor:grabbing}.vYZV7a_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.vYZV7a_modTileStrength{opacity:.55;font-size:9px}.vYZV7a_modAdd{border:1px dashed var(--border,#80808059);min-width:64px;color:inherit;cursor:pointer;opacity:.6;background:0 0;border-radius:8px;justify-content:center;align-items:center;padding:6px 10px;font-size:11px;display:flex}.vYZV7a_modAdd:hover{opacity:1}.vYZV7a_modPickList{gap:2px;display:grid}.vYZV7a_modPickRow{width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:8px;padding:6px 8px;font-size:12px;display:flex}.vYZV7a_modPickRow:hover{background:#8080801f}.vYZV7a_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.vYZV7a_modField{opacity:.85;flex-direction:column;gap:4px;font-size:11px;display:flex}.vYZV7a_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);color:inherit;border-radius:6px;padding:6px 8px;font-size:12px}.vYZV7a_h3Studio{grid-template-rows:minmax(280px,1fr) auto auto;grid-template-columns:300px 1fr;gap:12px;min-height:460px;display:grid}.vYZV7a_h3Rail{flex-direction:column;grid-area:1/1/4;gap:10px;min-height:0;padding-right:2px;display:flex;overflow-y:auto}.vYZV7a_h3RailBody{flex-direction:column;gap:10px;display:flex}.vYZV7a_h3Readout{color:var(--dsw-alias-label-secondary,#61666b);font-variant-numeric:tabular-nums;font-size:11px}.vYZV7a_h3Warn{color:#b58a3a;border-left:2px solid #d8a03c;padding-left:8px;font-size:11px;line-height:1.5}.vYZV7a_h3Recipe{border:.5px solid var(--dsw-alias-border-l2,#0000001a);border-radius:8px;flex-direction:column;gap:6px;padding:10px;display:flex}.vYZV7a_h3RecipeRow{justify-content:space-between;align-items:center;gap:8px;font-size:12px;display:flex}.vYZV7a_h3RecipeRow span{color:var(--dsw-alias-label-secondary,#61666b)}.vYZV7a_h3RecipeRow input,.vYZV7a_h3RecipeRow select{background:var(--dsw-alias-interactive-bg,#fff);border:.5px solid var(--dsw-alias-border-l2,#0000001a);box-sizing:border-box;border-radius:6px;width:110px;padding:4px 8px;font-size:12px}.vYZV7a_h3CallList{flex-direction:column;gap:4px;display:flex}.vYZV7a_h3CallRow{border:.5px solid var(--dsw-alias-border-l2,#0000001a);cursor:pointer;text-align:left;background:0 0;border-radius:6px;align-items:center;gap:8px;width:100%;padding:5px 8px;font-size:11px;display:flex}.vYZV7a_h3CallRow:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f)}.vYZV7a_h3CallRowFrames{color:var(--dsw-alias-label-secondary,#61666b);font-variant-numeric:tabular-nums;flex:none}.vYZV7a_h3CallRowText{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.vYZV7a_h3Dot{background:#3aa0c8;border-radius:50%;flex:none;width:6px;height:6px}.vYZV7a_h3Extend{margin-top:4px}.vYZV7a_h3Back{gap:6px;display:flex}.vYZV7a_h3Field{flex-direction:column;gap:4px;display:flex}.vYZV7a_h3FieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.vYZV7a_h3Field textarea,.vYZV7a_h3Field input,.vYZV7a_h3Field select{background:var(--dsw-alias-interactive-bg,#fff);border:.5px solid var(--dsw-alias-border-l2,#0000001a);box-sizing:border-box;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:12px}.vYZV7a_h3SpanRow{gap:6px;display:flex}.vYZV7a_h3Preview{background:#0000000a;border-radius:10px;grid-area:1/2;justify-content:center;align-items:center;min-height:240px;display:flex;overflow:hidden}.vYZV7a_h3Video{max-width:100%;max-height:44vh}.vYZV7a_h3PreviewEmpty{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.vYZV7a_h3Bar{border:.5px solid var(--dsw-alias-border-l2,#0000001a);cursor:default;border-radius:8px;flex-direction:column;grid-area:2/1/auto/3;gap:3px;padding:8px 10px 10px 56px;display:flex}.vYZV7a_h3Ruler{color:var(--dsw-alias-label-secondary,#61666b);height:12px;font-size:9px;position:relative}.vYZV7a_h3Tick{border-left:.5px solid var(--dsw-alias-border-l2,#00000024);padding-left:3px;position:absolute;top:0}.vYZV7a_h3Calls{background:#00000008;border-radius:6px;height:44px;position:relative}.vYZV7a_h3Call{background:var(--dsw-alias-bg-module,#fff);cursor:pointer;border:.5px solid #00000024;border-radius:6px;align-items:center;gap:4px;padding:2px 6px;display:flex;position:absolute;top:3px;bottom:3px;overflow:hidden}.vYZV7a_h3Call:hover{border-color:#0000004d}.vYZV7a_h3CallSel{border:1.5px solid var(--dsw-alias-state-focus,#4a7dbe)}.vYZV7a_h3CallText{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:10px;overflow:hidden}.vYZV7a_h3BarEmpty{color:var(--dsw-alias-label-secondary,#61666b);font-size:10px;position:absolute;top:14px;left:8px}.vYZV7a_h3Lane{height:14px;display:flex;position:relative}.vYZV7a_h3LaneName{text-transform:uppercase;width:40px;font-size:9px;line-height:14px;position:absolute;left:-46px}.vYZV7a_h3Pin{border-radius:2px;width:6px;position:absolute;top:2px;bottom:2px}.vYZV7a_h3RunRow{grid-area:3/1/auto/3;align-items:center;gap:8px;display:flex}.vYZV7a_ideoStudio{grid-template-columns:minmax(280px,360px) 1fr;gap:14px;display:grid}.vYZV7a_ideoStudio :where(input,textarea,select,button){box-sizing:border-box}.vYZV7a_ideoRail{flex-direction:column;gap:10px;min-width:0;display:flex}.vYZV7a_ideoField{flex-direction:column;gap:5px;display:flex}.vYZV7a_ideoFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.vYZV7a_ideoField input,.vYZV7a_ideoField textarea,.vYZV7a_ideoField select{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-primary,#d8d9da);font:inherit;border-radius:6px;width:100%;padding:6px 8px;font-size:12px}.vYZV7a_ideoToolbar{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.vYZV7a_ideoAspect{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-primary,#d8d9da);border-radius:6px;padding:5px 6px;font-size:12px}.vYZV7a_ideoStatus{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.vYZV7a_ideoTabs{border-bottom:1px solid var(--dsw-alias-outline-primary,#33363b);gap:2px;display:flex}.vYZV7a_ideoTab{color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;background:0 0;border:none;border-bottom:2px solid #0000;padding:6px 10px;font-size:12px}.vYZV7a_ideoTabOn{border-bottom-color:var(--dsw-alias-accent-primary,#3aa0c8);color:var(--dsw-alias-label-primary,#d8d9da)}.vYZV7a_ideoInspector,.vYZV7a_ideoStylePanel,.vYZV7a_ideoJsonPanel{flex-direction:column;gap:10px;display:flex}.vYZV7a_ideoInspectorHead{justify-content:space-between;align-items:center;display:flex}.vYZV7a_ideoInspectorActions{gap:4px;display:flex}.vYZV7a_ideoTypeBadge,.vYZV7a_ideoRowBadge{text-transform:uppercase;border-radius:4px;padding:2px 6px;font-size:10px}.vYZV7a_ideoTypeBadge[data-ideo-type=obj],.vYZV7a_ideoRowBadge[data-ideo-type=obj]{color:#3aa0c8;background:#3da0c82e}.vYZV7a_ideoTypeBadge[data-ideo-type=text],.vYZV7a_ideoRowBadge[data-ideo-type=text]{color:#9664c8;background:#9664c82e}.vYZV7a_ideoTypeBadge[data-ideo-type=logo],.vYZV7a_ideoRowBadge[data-ideo-type=logo]{color:#db9456;background:#db94562e}.vYZV7a_ideoBboxRow{grid-template-columns:repeat(4,1fr);gap:8px;display:grid}.vYZV7a_ideoFontChips{flex-wrap:wrap;gap:4px;display:flex}.vYZV7a_ideoChip{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;border-radius:999px;padding:3px 8px;font-size:10px}.vYZV7a_ideoChipOn{border-color:var(--dsw-alias-accent-primary,#3aa0c8);color:var(--dsw-alias-accent-primary,#3aa0c8)}.vYZV7a_ideoSwatches{flex-wrap:wrap;align-items:center;gap:4px;display:flex}.vYZV7a_ideoSwatch{border:1px solid var(--dsw-alias-outline-primary,#33363b);cursor:pointer;border-radius:4px;width:22px;height:16px;display:inline-block}.vYZV7a_ideoSwatchAdd{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px dashed var(--dsw-alias-outline-primary,#33363b);color:var(--dsw-alias-label-secondary,#61666b);border-radius:4px;width:84px;padding:2px 6px;font-size:10px}.vYZV7a_ideoMiniSwatch{border-radius:2px;width:10px;height:8px;display:inline-block}.vYZV7a_ideoEmpty{color:var(--dsw-alias-label-secondary,#61666b);flex-direction:column;gap:8px;font-size:12px;display:flex}.vYZV7a_ideoList{flex-direction:column;gap:4px;display:flex}.vYZV7a_ideoRow{border:1px solid var(--dsw-alias-outline-primary,#33363b);cursor:pointer;border-radius:6px;align-items:center;gap:8px;padding:5px 8px;display:flex}.vYZV7a_ideoRowOn{border-color:var(--dsw-alias-accent-primary,#3aa0c8)}.vYZV7a_ideoRowText{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:12px;overflow:hidden}.vYZV7a_ideoRowBbox{color:var(--dsw-alias-label-secondary,#61666b);font-size:10px}.vYZV7a_ideoRowActions{gap:2px;display:flex}.vYZV7a_ideoRowActions button{color:var(--dsw-alias-label-secondary,#61666b);cursor:pointer;background:0 0;border:none;padding:2px 4px;font-size:11px}.vYZV7a_ideoRowActions button:hover{color:var(--dsw-alias-label-primary,#d8d9da)}.vYZV7a_ideoPre{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--dsw-alias-outline-primary,#33363b);white-space:pre-wrap;border-radius:6px;max-height:240px;margin:0;padding:8px;font-size:10px;overflow:auto}.vYZV7a_ideoWarn{color:var(--dsw-alias-state-critical,#c73a3a);font-size:11px}.vYZV7a_ideoCanvasWrap{flex-direction:column;gap:6px;min-width:0;display:flex}.vYZV7a_ideoCanvas{background:var(--dsw-alias-fill-secondary,#141416);border:1px solid var(--dsw-alias-outline-primary,#33363b);touch-action:none;user-select:none;border-radius:8px;width:100%;max-width:100%;margin:0 auto;position:relative;overflow:hidden}.vYZV7a_ideoCanvasDraw{cursor:crosshair}.vYZV7a_ideoCanvasBg{position:absolute;inset:0}.vYZV7a_ideoBgText{color:var(--dsw-alias-label-secondary,#61666b);opacity:.28;pointer-events:none;text-align:center;word-break:break-word;justify-content:center;align-items:center;padding:24px;font-size:14px;font-weight:600;display:flex;position:absolute;inset:0;overflow:hidden}.vYZV7a_ideoGridMinor{pointer-events:none;background-image:linear-gradient(90deg,#a0aabe0f 1px,#0000 1px),linear-gradient(#a0aabe0f 1px,#0000 1px);background-size:2.5% 2.5%;position:absolute;inset:0}.vYZV7a_ideoGridMajor{pointer-events:none;background-image:linear-gradient(90deg,#a0aabe29 1px,#0000 1px),linear-gradient(#a0aabe29 1px,#0000 1px);background-size:10% 10%;position:absolute;inset:0}.vYZV7a_ideoBox{position:absolute}.vYZV7a_ideoBox_obj{--ideo-accent:#3aa0c8}.vYZV7a_ideoBox_text{--ideo-accent:#9664c8}.vYZV7a_ideoBox_logo{--ideo-accent:#db9456}.vYZV7a_ideoHalo{border:2px solid var(--ideo-accent,#3aa0c8);opacity:.45;pointer-events:none;border-radius:3px;position:absolute;inset:-4px}.vYZV7a_ideoBoxMain{border:1.5px solid var(--ideo-accent,#3aa0c8);cursor:move;border-radius:4px;flex-direction:column;align-items:flex-start;gap:3px;width:100%;height:100%;padding:4px 6px;display:flex;overflow:hidden}.vYZV7a_ideoTag{background:var(--ideo-accent,#3aa0c8);color:#101114;text-transform:uppercase;border-radius:3px;width:fit-content;padding:1px 5px;font-size:9px;font-weight:700}.vYZV7a_ideoDesc{color:var(--dsw-alias-label-secondary,#9a9b9d);word-break:break-word;font-size:10px;line-height:1.3;overflow:hidden}.vYZV7a_ideoInlineText{background:var(--dsw-alias-fill-primary,#1c1c1e);border:1px solid var(--ideo-accent,#9664c8);color:var(--dsw-alias-label-primary,#d8d9da);border-radius:4px;width:100%;padding:4px 6px;font-size:11px}.vYZV7a_ideoHandle{background:var(--dsw-alias-label-primary,#d8d9da);border:1px solid var(--dsw-alias-fill-secondary,#141416);z-index:3;border-radius:2px;width:8px;height:8px;margin:-5px 0 0 -5px;position:absolute}.vYZV7a_ideoHandle_nw,.vYZV7a_ideoHandle_n,.vYZV7a_ideoHandle_w{cursor:nwse-resize}.vYZV7a_ideoHandle_se,.vYZV7a_ideoHandle_s,.vYZV7a_ideoHandle_e{cursor:nesw-resize}.vYZV7a_ideoHandle_ne,.vYZV7a_ideoHandle_sw{cursor:ns-resize}.vYZV7a_ideoDrawPreview{border:1.5px dashed var(--dsw-alias-accent-primary,#3aa0c8);pointer-events:none;z-index:4;border-radius:3px;position:absolute}.vYZV7a_ideoCoord{color:var(--dsw-alias-label-secondary,#61666b);text-align:center;font-size:10px}.vYZV7a_ideoRunRow{grid-column:1/3;gap:8px;display:flex}.vYZV7a_h3Preview{flex-direction:column;align-items:stretch;gap:8px;padding:10px}.vYZV7a_h3RunHistory{flex-wrap:wrap;align-items:center;gap:4px;display:flex}.vYZV7a_h3RunHistoryLabel{color:var(--dsw-alias-label-secondary,#61666b);text-transform:uppercase;letter-spacing:.04em;font-size:9px;font-weight:600}.vYZV7a_h3RunChip{border:1px solid var(--dsw-alias-border-l2,#0000001f);color:inherit;border-radius:999px;padding:2px 8px;font-size:10px;text-decoration:none}.vYZV7a_h3RunChip:hover{background:var(--dsw-alias-fill-hover,#0000000d)}.vYZV7a_h3FinalCut{flex-direction:column;flex:1;gap:6px;min-height:0;display:flex}.vYZV7a_h3Video{object-fit:contain;background:#000;border-radius:6px;flex:1;width:100%;min-height:0;max-height:44vh}.vYZV7a_h3FinalCutMeta{align-items:center;gap:10px;font-size:11px;display:flex}.vYZV7a_h3FinalCutLabel{font-weight:600}.vYZV7a_h3FinalCutStat{color:var(--dsw-alias-label-secondary,#61666b);font-variant-numeric:tabular-nums}.vYZV7a_h3FinalCutOpen{color:inherit;margin-left:auto;font-size:11px}.vYZV7a_h3PreviewWindows{flex-wrap:wrap;align-items:flex-start;gap:8px;display:flex}.vYZV7a_h3WindowTile{flex-direction:column;gap:2px;width:200px;display:flex}.vYZV7a_h3WindowVideo{object-fit:cover;background:#00000080;border-radius:6px;width:100%}.vYZV7a_h3WindowName{color:var(--dsw-alias-label-secondary,#61666b);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;font-size:9px;overflow:hidden}.vYZV7a_h3BarWrap{border:.5px solid var(--dsw-alias-border-l2,#0000001a);border-radius:10px;flex-direction:column;grid-column:1/3;display:flex;overflow:hidden}.vYZV7a_h3BarHeader{border-bottom:1px solid var(--dsw-alias-border-l2,#00000014);flex-wrap:wrap;align-items:baseline;gap:8px;padding:6px 10px;display:flex}.vYZV7a_h3BarTitle{font-size:11px;font-weight:700}.vYZV7a_h3BarMeta{color:var(--dsw-alias-label-secondary,#61666b);font-variant-numeric:tabular-nums;font-size:10px}.vYZV7a_h3BarHint{color:var(--dsw-alias-label-tertiary,#9a9ea3);margin-left:auto;font-size:9.5px}.vYZV7a_h3RunRow{grid-column:1/3;align-items:center;gap:8px;display:flex}.vYZV7a_h3RunNote{color:#b3410f;font-size:11px}.vYZV7a_h3Dot{background:#17b8be;border-radius:999px;flex-shrink:0;width:6px;height:6px;display:inline-block}";
		const tagId$1 = "@melite-plugin/dsh-card-view/card.module.css@aaeab955";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var card_module_css_default$1 = {
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
			"closeX": "vYZV7a_closeX",
			"drill": "vYZV7a_drill",
			"empty": "vYZV7a_empty",
			"failed": "vYZV7a_failed",
			"field": "vYZV7a_field",
			"fieldKey": "vYZV7a_fieldKey",
			"groupBar": "vYZV7a_groupBar",
			"groupNote": "vYZV7a_groupNote",
			"h3Back": "vYZV7a_h3Back",
			"h3Bar": "vYZV7a_h3Bar",
			"h3BarEmpty": "vYZV7a_h3BarEmpty",
			"h3BarHeader": "vYZV7a_h3BarHeader",
			"h3BarHint": "vYZV7a_h3BarHint",
			"h3BarMeta": "vYZV7a_h3BarMeta",
			"h3BarTitle": "vYZV7a_h3BarTitle",
			"h3BarWrap": "vYZV7a_h3BarWrap",
			"h3Call": "vYZV7a_h3Call",
			"h3CallList": "vYZV7a_h3CallList",
			"h3CallRow": "vYZV7a_h3CallRow",
			"h3CallRowFrames": "vYZV7a_h3CallRowFrames",
			"h3CallRowText": "vYZV7a_h3CallRowText",
			"h3CallSel": "vYZV7a_h3CallSel",
			"h3CallText": "vYZV7a_h3CallText",
			"h3Calls": "vYZV7a_h3Calls",
			"h3Dot": "vYZV7a_h3Dot",
			"h3Extend": "vYZV7a_h3Extend",
			"h3Field": "vYZV7a_h3Field",
			"h3FieldKey": "vYZV7a_h3FieldKey",
			"h3FinalCut": "vYZV7a_h3FinalCut",
			"h3FinalCutLabel": "vYZV7a_h3FinalCutLabel",
			"h3FinalCutMeta": "vYZV7a_h3FinalCutMeta",
			"h3FinalCutOpen": "vYZV7a_h3FinalCutOpen",
			"h3FinalCutStat": "vYZV7a_h3FinalCutStat",
			"h3Lane": "vYZV7a_h3Lane",
			"h3LaneName": "vYZV7a_h3LaneName",
			"h3Pin": "vYZV7a_h3Pin",
			"h3Preview": "vYZV7a_h3Preview",
			"h3PreviewEmpty": "vYZV7a_h3PreviewEmpty",
			"h3PreviewWindows": "vYZV7a_h3PreviewWindows",
			"h3Rail": "vYZV7a_h3Rail",
			"h3RailBody": "vYZV7a_h3RailBody",
			"h3Readout": "vYZV7a_h3Readout",
			"h3Recipe": "vYZV7a_h3Recipe",
			"h3RecipeRow": "vYZV7a_h3RecipeRow",
			"h3Ruler": "vYZV7a_h3Ruler",
			"h3RunChip": "vYZV7a_h3RunChip",
			"h3RunHistory": "vYZV7a_h3RunHistory",
			"h3RunHistoryLabel": "vYZV7a_h3RunHistoryLabel",
			"h3RunNote": "vYZV7a_h3RunNote",
			"h3RunRow": "vYZV7a_h3RunRow",
			"h3SpanRow": "vYZV7a_h3SpanRow",
			"h3Studio": "vYZV7a_h3Studio",
			"h3Tick": "vYZV7a_h3Tick",
			"h3Video": "vYZV7a_h3Video",
			"h3Warn": "vYZV7a_h3Warn",
			"h3WindowName": "vYZV7a_h3WindowName",
			"h3WindowTile": "vYZV7a_h3WindowTile",
			"h3WindowVideo": "vYZV7a_h3WindowVideo",
			"head": "vYZV7a_head",
			"ideoAspect": "vYZV7a_ideoAspect",
			"ideoBboxRow": "vYZV7a_ideoBboxRow",
			"ideoBgText": "vYZV7a_ideoBgText",
			"ideoBox": "vYZV7a_ideoBox",
			"ideoBoxMain": "vYZV7a_ideoBoxMain",
			"ideoBox_logo": "vYZV7a_ideoBox_logo",
			"ideoBox_obj": "vYZV7a_ideoBox_obj",
			"ideoBox_text": "vYZV7a_ideoBox_text",
			"ideoCanvas": "vYZV7a_ideoCanvas",
			"ideoCanvasBg": "vYZV7a_ideoCanvasBg",
			"ideoCanvasDraw": "vYZV7a_ideoCanvasDraw",
			"ideoCanvasWrap": "vYZV7a_ideoCanvasWrap",
			"ideoChip": "vYZV7a_ideoChip",
			"ideoChipOn": "vYZV7a_ideoChipOn",
			"ideoCoord": "vYZV7a_ideoCoord",
			"ideoDesc": "vYZV7a_ideoDesc",
			"ideoDrawPreview": "vYZV7a_ideoDrawPreview",
			"ideoEmpty": "vYZV7a_ideoEmpty",
			"ideoField": "vYZV7a_ideoField",
			"ideoFieldKey": "vYZV7a_ideoFieldKey",
			"ideoFontChips": "vYZV7a_ideoFontChips",
			"ideoGridMajor": "vYZV7a_ideoGridMajor",
			"ideoGridMinor": "vYZV7a_ideoGridMinor",
			"ideoHalo": "vYZV7a_ideoHalo",
			"ideoHandle": "vYZV7a_ideoHandle",
			"ideoHandle_e": "vYZV7a_ideoHandle_e",
			"ideoHandle_n": "vYZV7a_ideoHandle_n",
			"ideoHandle_ne": "vYZV7a_ideoHandle_ne",
			"ideoHandle_nw": "vYZV7a_ideoHandle_nw",
			"ideoHandle_s": "vYZV7a_ideoHandle_s",
			"ideoHandle_se": "vYZV7a_ideoHandle_se",
			"ideoHandle_sw": "vYZV7a_ideoHandle_sw",
			"ideoHandle_w": "vYZV7a_ideoHandle_w",
			"ideoInlineText": "vYZV7a_ideoInlineText",
			"ideoInspector": "vYZV7a_ideoInspector",
			"ideoInspectorActions": "vYZV7a_ideoInspectorActions",
			"ideoInspectorHead": "vYZV7a_ideoInspectorHead",
			"ideoJsonPanel": "vYZV7a_ideoJsonPanel",
			"ideoList": "vYZV7a_ideoList",
			"ideoMiniSwatch": "vYZV7a_ideoMiniSwatch",
			"ideoPre": "vYZV7a_ideoPre",
			"ideoRail": "vYZV7a_ideoRail",
			"ideoRow": "vYZV7a_ideoRow",
			"ideoRowActions": "vYZV7a_ideoRowActions",
			"ideoRowBadge": "vYZV7a_ideoRowBadge",
			"ideoRowBbox": "vYZV7a_ideoRowBbox",
			"ideoRowOn": "vYZV7a_ideoRowOn",
			"ideoRowText": "vYZV7a_ideoRowText",
			"ideoRunRow": "vYZV7a_ideoRunRow",
			"ideoStatus": "vYZV7a_ideoStatus",
			"ideoStudio": "vYZV7a_ideoStudio",
			"ideoStylePanel": "vYZV7a_ideoStylePanel",
			"ideoSwatch": "vYZV7a_ideoSwatch",
			"ideoSwatchAdd": "vYZV7a_ideoSwatchAdd",
			"ideoSwatches": "vYZV7a_ideoSwatches",
			"ideoTab": "vYZV7a_ideoTab",
			"ideoTabOn": "vYZV7a_ideoTabOn",
			"ideoTabs": "vYZV7a_ideoTabs",
			"ideoTag": "vYZV7a_ideoTag",
			"ideoToolbar": "vYZV7a_ideoToolbar",
			"ideoTypeBadge": "vYZV7a_ideoTypeBadge",
			"ideoWarn": "vYZV7a_ideoWarn",
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
			"modAdd": "vYZV7a_modAdd",
			"modField": "vYZV7a_modField",
			"modHead": "vYZV7a_modHead",
			"modHint": "vYZV7a_modHint",
			"modLeaf": "vYZV7a_modLeaf",
			"modPickList": "vYZV7a_modPickList",
			"modPickRow": "vYZV7a_modPickRow",
			"modRow": "vYZV7a_modRow",
			"modSection": "vYZV7a_modSection",
			"modSelect": "vYZV7a_modSelect",
			"modTile": "vYZV7a_modTile",
			"modTileLabel": "vYZV7a_modTileLabel",
			"modTileStrength": "vYZV7a_modTileStrength",
			"modTitle": "vYZV7a_modTitle",
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
			"squareBox": "vYZV7a_squareBox",
			"squareFileInput": "vYZV7a_squareFileInput",
			"squareGlyph": "vYZV7a_squareGlyph",
			"squareLabel": "vYZV7a_squareLabel",
			"squareMetric": "vYZV7a_squareMetric",
			"squareOff": "vYZV7a_squareOff",
			"squareOver": "vYZV7a_squareOver",
			"squareThumb": "vYZV7a_squareThumb",
			"squareWrap": "vYZV7a_squareWrap",
			"squareX": "vYZV7a_squareX",
			"stage": "vYZV7a_stage",
			"stageArtifact": "vYZV7a_stageArtifact",
			"stageDetail": "vYZV7a_stageDetail",
			"stageEngine": "vYZV7a_stageEngine",
			"stageTitle": "vYZV7a_stageTitle",
			"stages": "vYZV7a_stages",
			"state": "vYZV7a_state",
			"studioBody": "vYZV7a_studioBody",
			"studioGroup": "vYZV7a_studioGroup",
			"studioHead": "vYZV7a_studioHead",
			"studioRail": "vYZV7a_studioRail",
			"studioSplit": "vYZV7a_studioSplit",
			"thumb": "vYZV7a_thumb",
			"tile": "vYZV7a_tile",
			"tileAdd": "vYZV7a_tileAdd",
			"tileCaption": "vYZV7a_tileCaption",
			"tileDot": "vYZV7a_tileDot",
			"tileDragOver": "vYZV7a_tileDragOver",
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
			"viewport": "vYZV7a_viewport",
			"viewportCanvas": "vYZV7a_viewportCanvas",
			"viewportEmpty": "vYZV7a_viewportEmpty",
			"wiredMark": "vYZV7a_wiredMark",
			"zoom-in": "vYZV7a_zoom-in",
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
		//#region ../melite-run-wire/src/index.ts
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
		async function wireCall$2(method, args, opts) {
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
		/** The terminal statuses — the runs seat's own vocabulary (the settle
		*  path stamps 'completed' or 'failed'; runs/stop stamps 'stopped'). */
		function isTerminalRun(status) {
			return status === "completed" || status === "failed" || status === "stopped";
		}
		/** The ONE media-url rewrite (readRunStatus + the file-era list
		*  fallback share it): bare run-relative names ride the estate's
		*  media route (/melite-media/runs/<runId>/<rel>); urls that already
		*  carry a scheme or lead with / pass verbatim (never double-encoded). */
		function toRunMediaUrl(runId, url) {
			if (url === "") return "";
			if (!/^(https?:\/\/|\/)/.test(url)) return "/melite-media/runs/" + encodeURIComponent(runId) + "/" + url.split("/").map((seg) => encodeURIComponent(seg)).join("/");
			return url;
		}
		/** Normalize a runs/status doc: stage rows distilled, bare run-
		*  relative urls rewritten onto the estate's media route (absolute
		*  and leading-/ urls pass verbatim — the one rewrite, never two). */
		function readRunStatus(runId, doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			for (const stage of stages) if (typeof stage.url === "string" && stage.url !== "") stage.url = toRunMediaUrl(runId, stage.url);
			return {
				runId,
				status: typeof doc["status"] === "string" ? doc["status"] : "unknown",
				draftId: typeof doc["draft_id"] === "string" && doc["draft_id"] !== "" ? doc["draft_id"] : null,
				stages
			};
		}
		/** One runs/status read. */
		async function fetchRunStatus(runId, signal) {
			return readRunStatus(runId, await wireCall$2("runs/status", { runId }, { signal }));
		}
		/** The runs/list rows as loose records (the restore port's own
		*  shape — run_id, draft_id, created_at, status, artifacts). */
		async function listRunRows(signal) {
			const row = await wireCall$2("runs/list", { rawLimit: "500" }, { signal });
			return (Array.isArray(row["runs"]) ? row["runs"] : []).filter((r) => typeof r === "object" && r !== null);
		}
		/** The draft's newest run (runs/list adoption — the reload-proof
		*  bridge: the estate is the SSOT, never the client's memory).
		*  NOTE the list's C-parity ordering: media-bearing runs first, then
		*  newest-first — scan the wide tail, newest by created_at. (An older
		*  note blamed the hasDraft filter for dropping bench-draft runs;
		*  the actual nulling gate was the row gate refusing "model"
		*  artifact rows — fixed estate-side, pinned by runs-list.spec.ts.) */
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
		/** runs/stop — the cancel door (the registry seat's flag + interrupt).
		*  Refusals throw the estate's text. */
		async function stopRun(runId, signal) {
			await wireCall$2("runs/stop", { runId }, {
				signal,
				voice: "runs/stop"
			});
		}
		/** The shared start core — ONE envelope walk for both doors (the
		*  registry demands draft_id + an explicit test boolean; the flow
		*  body needs its id — the bench runs under its own draft_id). */
		async function startRun(doc, signal) {
			try {
				const runId = (await wireCall$2("runs/start", { doc }, {
					signal,
					voice: "run refused"
				}))["run_id"];
				if (typeof runId === "string" && runId !== "") return { runId };
				return { refused: "run refused: no run_id in the answer" };
			} catch (e) {
				return { refused: e instanceof Error ? e.message : "run request failed" };
			}
		}
		/** Start ONE card through the composing door (the bench drill's Run,
		*  a studio's Run — every single-card gesture rides this). */
		async function startCardRun(input, signal) {
			return await startRun({
				...input.params,
				model: input.model,
				draft_id: input.draftId,
				test: input.test ?? false
			}, signal);
		}
		/** The catalog's cards section (GET /v1/model-catalog — the
		*  discovery door, same-origin, bearer-free from the page): card id
		*  → its boarded families, first = the DEFAULT family (form-spec's
		*  card-id alias law parity: boarded[0]). The runs door resolves
		*  NEITHER card ids nor aliases — callers hand startCardRun the
		*  family from HERE. Cached per session (the catalog is static per
		*  boot; one door round trip, every consumer shares it). */
		async function fetchCardFamilies(signal) {
			if (cardFamiliesCache !== null) return cardFamiliesCache;
			const body = await (await fetch("/v1/model-catalog", { ...signal === void 0 ? {} : { signal } })).json().catch(() => null);
			const cards = typeof body === "object" && body !== null ? body["cards"] : void 0;
			const out = {};
			if (typeof cards === "object" && cards !== null) for (const [id, row] of Object.entries(cards)) {
				if (typeof row !== "object" || row === null) continue;
				const fams = row["families"];
				out[id] = Array.isArray(fams) ? fams.filter((x) => typeof x === "string") : [id];
			}
			cardFamiliesCache = out;
			return out;
		}
		let cardFamiliesCache = null;
		/** Resolve a card's DEFAULT family (boarded[0]); the card id itself
		*  when the catalog names none (mask-studio-style self-services). */
		async function defaultFamilyForCard(cardId, signal) {
			return (await fetchCardFamilies(signal))[cardId]?.[0] ?? cardId;
		}
		//#endregion
		//#region src/client/draft.ts
		/** One wire call — the run-wire package's ONE frame definition (the
		*  DRY law; this module's spelling died with it). The method rides
		*  as the transport voice so diagnostics name their door. */
		async function wireCall$1(method, args) {
			return await wireCall$2(method, args, { voice: method });
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
		/** Report a stage's RUN OUTCOME onto the bench row — the same
		*  shared-state door (runStatus + result keys of the fixed patch
		*  set). This is the chain's attribution half: the estate names
		*  runs by DRAFT only (every bench stage runs under the shared
		*  bench draft), so the tab — the one that knows WHICH stage ran —
		*  writes the outcome the wire edge later reads. result.url rides
		*  the media-route currency (renders in tiles AND stages verbatim
		*  as the next run's chained input). */
		async function patchStageOutcome(draftId, stageId, outcome) {
			const row = await wireCall$1("drafts/patch", {
				draftId,
				stageId,
				patch: outcome
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
					thumbUrl: typeof runStage?.url === "string" && runStage.url !== "" ? toRunMediaUrl(live?.run_id ?? "", runStage.url) : null
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
				className: card_module_css_default$1.drill
			}, (0, react.createElement)("div", { className: card_module_css_default$1.split }, (0, react.createElement)("div", { className: card_module_css_default$1.params }, fields.map((f) => (0, react.createElement)("label", {
				key: f.key,
				className: card_module_css_default$1.field
			}, (0, react.createElement)("span", { className: card_module_css_default$1.fieldKey }, f.key), fieldNode(f)))), (0, react.createElement)("div", { className: card_module_css_default$1.outputs }, thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default$1.outputImg,
				src: thumbUrl,
				alt: title
			}) : null, (0, react.createElement)("div", { className: card_module_css_default$1.runRow }, runError !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.runError }, runError) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")))));
		}
		//#endregion
		//#region ../card-base/src/wire.ts
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
		/** The draft-stage address — the conversation card's studio target
		*  (the old embed's law; both segments encode, either may carry the
		*  separators the bare grammar refuses). */
		function cardsDraftStageAddress(draftId, stageId) {
			return "dsh-resource://cards/draft/" + encodeURIComponent(draftId) + "/" + encodeURIComponent(stageId);
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
			if (rest.startsWith("draft/")) {
				const body = rest.slice(6);
				const slash = body.indexOf("/");
				if (slash > 0 && slash < body.length - 1) {
					const draftId = decodeURIComponent(body.slice(0, slash));
					const stageId = decodeURIComponent(body.slice(slash + 1));
					if (draftId !== "" && stageId !== "") return {
						draft: draftId,
						stage: stageId
					};
				}
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
		/** THE OUTCOME OBSERVER (the attribution half): poll the run to
		*  terminal on the run-wire cadence, then write runStatus + result
		*  onto the bench row through the shared-state door. Both run paths
		*  (in-tab stream and shell navigation) start this once per gesture;
		*  the patch is bookkeeping — a refusal is swallowed (the next run
		*  rewrites the row), an abort ends the watch. The result.url rides
		*  the status door's already-rewritten media route. */
		async function observeRunOutcome(draftId, stageId, runId, signal, onTouched) {
			try {
				const startStatus = await fetchRunStatus(runId, signal).then((r) => r.status).catch(() => "running");
				await patchStageOutcome(draftId, stageId, {
					runStatus: startStatus === "queued" || startStatus === "pending" ? "queued" : "running",
					result: { run_id: runId }
				});
				onTouched?.();
			} catch {}
			const sleep = (ms) => new Promise((resolve) => {
				const t = setTimeout(resolve, ms);
				signal?.addEventListener("abort", () => {
					clearTimeout(t);
					resolve();
				}, { once: true });
			});
			let lastLive = "running";
			while (signal?.aborted !== true) {
				let row;
				try {
					row = await fetchRunStatus(runId, signal);
				} catch {
					await sleep(1500);
					continue;
				}
				if (!isTerminalRun(row.status)) {
					const live = row.status === "queued" || row.status === "pending" ? "queued" : "running";
					if (live !== lastLive) {
						lastLive = live;
						try {
							await patchStageOutcome(draftId, stageId, { runStatus: live });
							onTouched?.();
						} catch {}
					}
					await sleep(1500);
					continue;
				}
				const stage = row.stages.find((s) => s.id === stageId) ?? (row.stages.length === 1 ? row.stages[0] : void 0);
				const url = stage !== void 0 && typeof stage.url === "string" && stage.url !== "" ? stage.url : "";
				const result = { run_id: runId };
				if (url !== "") result["url"] = url;
				const gallery = stage?.gallery ?? [];
				const artNames = [];
				for (const g of gallery) if (g.name !== "") artNames.push(g.name);
				if (artNames.length > 0) {
					const mediaUrls = artNames.map((n) => toRunMediaUrl(runId, n));
					const artifacts = {};
					if (url !== "") artifacts["video"] = url;
					for (let i = 0; i < artNames.length; i++) artifacts[artNames[i]] = mediaUrls[i];
					result["artifacts"] = artifacts;
					result["assetUrls"] = url !== "" ? [url, ...mediaUrls] : mediaUrls;
				}
				const terminal = row.status === "completed" ? "done" : row.status;
				try {
					await patchStageOutcome(draftId, stageId, {
						runStatus: terminal,
						result
					});
					onTouched?.();
				} catch {}
				if (terminal === "done" || terminal === "failed" || terminal === "stopped") return terminal;
				return null;
			}
			return null;
		}
		function readRun(runId, doc) {
			const row = readRunStatus(runId, doc);
			return {
				kind: "run",
				runId: row.runId,
				status: row.status,
				draftId: row.draftId,
				stages: row.stages,
				lastFrame: void 0
			};
		}
		/**
		* Normalize a `drafts/get` doc into the draft-stage value. The row
		* shape is the bench's own (DraftRecord stages carry id/card/params/
		* result extras verbatim); the defensive filter keeps rows with a
		* string id, mirroring readBench — the door's wire is untyped at this
		* seam and a malformed row must not break the whole view.
		*/
		function readDraft(draftId, stageId, doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			return {
				kind: "draft",
				draftId,
				stageId,
				intent: typeof doc["intent"] === "string" ? doc["intent"] : "",
				stages
			};
		}
		/** The frame is the run-wire package's ONE definition; this wrapper
		*  narrows the method set for the cards protocol's own verbs. */
		async function wireCall(nsMethod, args, signal) {
			return await wireCall$2(nsMethod, args, { signal });
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
			const draftTarget = target !== null && "draft" in target ? target : null;
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
					yield* pollBenchFrames(value, ctx.signal);
					return;
				}
				if (draftTarget !== null) {
					let value;
					try {
						value = readDraft(draftTarget.draft, draftTarget.stage, await wireCall("drafts/get", { draftId: draftTarget.draft }));
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
		/** THE BENCH TAIL (the provider's live half — pollRunFrames' law,
		*  applied to the shared doc): poll `bench/get` on a cadence and
		*  yield a value ONLY when the rev moved (no frame spam) until the
		*  holder aborts. A poll error is not a failure frame — the last ok
		*  value stays; the next poll may recover. The cadence (2500ms)
		*  balances agent-write visibility against doc-read chatter; a
		*  hidden document still receives frames (the shell decides whether
		*  the tab renders — the provider never guesses visibility). */
		async function* pollBenchFrames(hydrated, signal) {
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
			while (!signal.aborted) {
				if (await sleep(2500) === "abort" || signal.aborted) return;
				let row;
				try {
					row = await wireCall("bench/get", { sessionKey: "main" }, signal);
				} catch {
					continue;
				}
				const next = readBench(row);
				if (next.rev === value.rev) continue;
				value = next;
				yield {
					ok: true,
					value
				};
			}
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
		/** The chat-listed card row: kind tag, title, service, status dot, prompt.
		*  THE CLICK opens the AUTHORING SURFACE in the Cards tab (the old
		*  embed's law — timeline, video preview, per-gen splits, global
		*  audio) when the shell face is installed; without a shell (unit
		*  tests, headless harnesses) it falls back to the in-card drill. */
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
				className: card_module_css_default$1.row,
				onClick: onOpen,
				"data-stage": row.stageId,
				"data-status": row.status,
				children: [
					row.thumbUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: card_module_css_default$1.thumb,
						src: row.thumbUrl,
						alt: row.title,
						loading: "lazy"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.kind }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default$1.rowTitle,
						children: row.title
					}),
					row.service !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.service }),
					dot[row.status] !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot[row.status] }),
					row.prompt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default$1.prompt,
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
				className: card_module_css_default$1.card,
				"data-dsh-part": "melite-flow-card",
				"data-legacy": "1",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default$1.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: "melite" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default$1.model,
							children: parsed.model ?? "flow"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default$1.state,
							"data-state": "legacy",
							children: "cards · earlier draft"
						})
					]
				})
			});
			if (parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default$1.card,
				"data-dsh-part": "melite-flow-card",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: card_module_css_default$1.load,
					children: parsed.isError ? "draft failed" : "composing…"
				})
			});
			const rows = doc !== null ? cardRows(doc, live) : [];
			const openRow = rows.find((r) => r.stageId === openStage) ?? null;
			const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: card_module_css_default$1.card,
				"data-dsh-part": "melite-flow-card",
				"data-draft-id": parsed.draftId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: card_module_css_default$1.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default$1.badge,
								children: "melite"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default$1.model,
								children: doc?.intent ?? parsed.model ?? "flow"
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: card_module_css_default$1.state,
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
						className: card_module_css_default$1.load,
						children: "cards…"
					}),
					rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardRowLine, {
						row,
						onOpen: () => {
							if (parsed.draftId === null || !openCardsSurface(cardsDraftStageAddress(parsed.draftId, row.stageId))) setOpenStage(row.stageId);
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
		//#region ../card-base/src/spec.ts
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
		const css = ".FRpSCG_specForm :where(input,textarea,select,button){box-sizing:border-box}.FRpSCG_specForm{flex-direction:column;gap:12px;display:flex}.FRpSCG_specGroup{flex-direction:column;gap:8px;display:flex}.FRpSCG_modelAxes{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;display:grid}.FRpSCG_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.FRpSCG_specField{flex-direction:column;gap:6px;display:flex}.FRpSCG_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.FRpSCG_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.FRpSCG_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.FRpSCG_specSelect{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.FRpSCG_specSliderRow{align-items:center;gap:8px;display:flex}.FRpSCG_specSlider{flex:1}.FRpSCG_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.FRpSCG_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.FRpSCG_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.FRpSCG_squareOff{opacity:.5;pointer-events:none}.FRpSCG_squareBox{border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.FRpSCG_squareOver{border-color:var(--dsw-alias-border-l3,#00000047);box-shadow:0 0 0 2px var(--dsw-alias-border-l1,#00000014)}.FRpSCG_squareThumb{object-fit:cover;width:100%;height:100%}.FRpSCG_squareGlyph{color:var(--dsw-alias-label-tertiary,#00000073)}.FRpSCG_squareX{background:var(--dsw-alias-bg-module,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.FRpSCG_squareLabel{color:var(--dsw-alias-label-primary,#0f1115);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.FRpSCG_squareMetric{color:var(--dsw-alias-label-tertiary,#00000073);font-size:10px;line-height:17px}.FRpSCG_squareFileInput{display:none}.FRpSCG_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.FRpSCG_modHead{align-items:baseline;gap:8px;display:flex}.FRpSCG_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.FRpSCG_modHint{opacity:.45;font-size:9px}.FRpSCG_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.FRpSCG_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.FRpSCG_modTile:active{cursor:grabbing}.FRpSCG_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.FRpSCG_modTileStrength{opacity:.55;font-size:9px}.FRpSCG_modAdd{border:1px dashed var(--border,#80808059);min-width:64px;color:inherit;cursor:pointer;opacity:.6;background:0 0;border-radius:8px;justify-content:center;align-items:center;padding:6px 10px;font-size:11px;display:flex}.FRpSCG_modAdd:hover{opacity:1}.FRpSCG_tileDragging{opacity:.5}.FRpSCG_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.FRpSCG_modLeafFields{gap:8px;display:grid}.FRpSCG_modLeafActions{gap:8px;display:flex}.FRpSCG_modField{flex-direction:column;gap:4px;font-size:11px;display:flex}.FRpSCG_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#8080800f);color:inherit;border-radius:6px;padding:6px 8px;font-size:12px}.FRpSCG_modLeafError{color:#e06c5f;margin:0;font-size:11px}";
		const tagId = "@melite-plugin/dsh-card-view/card.module.css@1335c13b";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"modAdd": "FRpSCG_modAdd",
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
		//#region ../card-base/src/square.tsx
		/**
		* square.tsx — InputSquare, THE ONE square for any slot-shaped value
		* — the base's default input component. Ported from the old system's
		* SlotSquare law (packages/web-kit/ui/SlotSquare.tsx, 2026-08-08:
		* "the look for it will be reused for the sub-card system") onto the
		* DSH substrate: ui-primitives glyphs, module CSS under the
		* web-styling chrome laws, no lucide/cn/tip.
		*
		* THE OLD LAW, KEPT VERBATIM — a square thumbnail with label + badge
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
		const ASSET_DRAG_MIME$1 = "application/tech-noir-asset";
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
			const raw = e.dataTransfer.getData(ASSET_DRAG_MIME$1);
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
			}) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, { className: card_module_css_default.squareGlyph }), !empty && props.onClear !== void 0 ? (0, react.createElement)("button", {
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
		//#region ../card-base/src/form.tsx
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
			const fileRef = (0, react.useRef)(null);
			const onFile = (0, react.useCallback)(async (f, file) => {
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
			}, [onEdit]);
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
			return {
				square,
				wireMenu: pickAt === null ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: true,
					anchor: null,
					getAnchorRect: () => pickAt.rect,
					items: [
						...(wire.candidatesFor !== void 0 ? wire.candidatesFor(pickAt.field) : wire.candidates).map((c) => ({
							id: c.id,
							label: c.label
						})),
						{
							type: "separator",
							id: "sep"
						},
						{
							id: "__file__",
							label: "Upload a file…"
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
						if (id === "__file__") {
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
						const c = (wire.candidatesFor !== void 0 ? wire.candidatesFor(f) : wire.candidates).find((x) => x.id === id);
						if (c !== void 0 && c.url !== "") onEdit(f.name, c.url);
					},
					onClose: () => {
						setPickAt(null);
					},
					portal: true
				}, (0, react.createElement)("input", {
					ref: fileRef,
					type: "file",
					accept: "image/png,image/jpeg,image/webp",
					"aria-hidden": true,
					tabIndex: -1,
					style: { display: "none" },
					onChange: (e) => {
						const file = e.target.files?.[0];
						if (pickAt !== null && file !== void 0 && file !== null) onFile(pickAt.field, file);
						if (fileRef.current !== null) fileRef.current.value = "";
					}
				}))
			};
		}
		/** One spec atom — typed by the declaration, edited as a raw string
		*  while typing (decimal dots survive; coercion happens once at patch). */
		function SpecAtom({ f, value, onEdit, square }) {
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
			}) : null, groups.map((g) => (0, react.createElement)("section", {
				key: g.group ?? "",
				className: card_module_css_default.specGroup
			}, g.group !== null ? (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, g.group) : null, g.fields.map((f) => (0, react.createElement)("label", {
				key: f.name,
				className: card_module_css_default.specField
			}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null), (() => {
				const claim = atomOf(f);
				const sq = squareFor(f);
				if (claim !== void 0) return claim({
					f,
					value: values[f.name],
					onEdit,
					square: sq
				});
				return (0, react.createElement)(SpecAtom, {
					f,
					value: values[f.name],
					onEdit,
					square: sq
				});
			})(), f.tooltip !== void 0 && f.tooltip !== "" ? (0, react.createElement)("span", { className: card_module_css_default.specHint }, f.tooltip) : null)))), modKinds.length > 0 ? (0, react.createElement)(ModifiersSection, {
				kinds: modKinds,
				values,
				onEdit,
				...onPatch !== void 0 ? { onPatch } : {}
			}) : null, own.wireMenu);
		}
		//#endregion
		//#region ../card-base/src/mods.tsx
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
				className: card_module_css_default.modAdd,
				"data-subcard-add": "mod",
				onClick: (e) => {
					setPickAt({ rect: e.currentTarget.getBoundingClientRect() });
				}
			}, "+ Mod") : null), pickAt !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
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
		//#region src/client/add-stage.ts
		/**
		* add-stage.ts — the bench's mutation wire door callers (the tab's
		* add/remove/reorder/rewire/group/ungroup paths). Every verb is ONE
		* wireCall over the run-wire package's frame (the DRY law — the frame
		* lived here six times before the package existed); the remote's
		* signature is (sessionKey, doc) — the args frame carries BOTH named,
		* the doc carries the verb's own keys, and every doc rides expect_rev
		* (the CAS law: the caller chains the bench rev it rendered, so a
		* concurrent edit refuses instead of slicing wrong).
		*/
		/** The bench add-stage wire door caller (the tab's add-card path).
		*  The doc holds card/author/engine/params/expect_rev. */
		async function addStageWire(doc, signal) {
			return await wireCall$2("bench/add-stage", {
				sessionKey: "main",
				doc
			}, {
				signal,
				voice: "bench/add-stage"
			});
		}
		/** The bench remove-stage wire door caller (the drill's Remove path).
		*  The doc holds stage/expect_rev. */
		async function removeStageWire(doc, signal) {
			return await wireCall$2("bench/remove-stage", {
				sessionKey: "main",
				doc
			}, {
				signal,
				voice: "bench/remove-stage"
			});
		}
		/** The bench reorder wire door caller (the drag-reorder path). Doc:
		*  stage/to/expect_rev — `to` is the post-splice target index. */
		async function reorderStageWire(doc, signal) {
			return await wireCall$2("bench/reorder", {
				sessionKey: "main",
				doc
			}, {
				signal,
				voice: "bench/reorder"
			});
		}
		/** The bench group wire door caller (the Group Cards sub-view):
		*  stages = 2+ ids (bench order applied server-side). */
		async function groupStagesWire(doc, signal) {
			return await wireCall$2("bench/group", {
				sessionKey: "main",
				doc
			}, {
				signal,
				voice: "bench/group"
			});
		}
		/** The bench ungroup wire door caller: spill a compound's children. */
		async function ungroupStageWire(doc, signal) {
			return await wireCall$2("bench/ungroup", {
				sessionKey: "main",
				doc
			}, {
				signal,
				voice: "bench/ungroup"
			});
		}
		//#endregion
		//#region src/client/zoom.tsx
		/**
		* zoom.tsx — the zoom overlay, CSS-law port (2026-09-12).
		*
		* THE CONTRACT (the old tree's interaction, framer removed — DSH law:
		* DSH ships no framer; its own surfaces animate in CSS):
		* • the resting tile opens a FIXED inset-0 overlay (portal to body —
		*   the old file's own DSH placement rule; the embed frame is
		*   auto-height, absolute would cover only part of the view).
		* • The card enters compositor-only: a CSS scale+fade keyframe
		*   (zoomIn — transform/opacity, zero reflow, NO modal pop).
		* • While the settle holds the box shows a pure SKELETON; the real
		*   detail swaps in after ZOOM_SKELETON_MS.
		* • Close vectors: the Collapse (X) button, a backdrop click
		*   (target === currentTarget), and Escape — all direct onClose.
		* • The overlay is the scroll container; the inner flex centers a
		*   card shorter than the area and scrolls one that is taller.
		*/
		/** How long the skeleton holds the box before the real detail swaps in. */
		const ZOOM_SKELETON_MS = 500;
		/** The zoomed card's bounded size — width caps at 760px, vh-bounded so
		* the ≈square card fits without page scroll (the old tree's number). */
		const ZOOM_DETAIL_MAX_PX = 760;
		/** The envelope's huge class (surface.size='huge'): the studio wants
		*  room — the card grows (the DECLARATION is estate truth). */
		const ZOOM_HUGE_MAX_PX = 1160;
		/** The card's width law, pure (the envelope lift's decision): the
		*  estate's surface.size='huge' grows the card for studio room. The
		*  viewport cap measures WIDTH (94vw, room for the pane's own edge) —
		*  a vh cap on width was a category error that clipped the right
		*  half of the params column on short viewports (2026-09-12). */
		function zoomWidthFor(surfaceSize) {
			return `min(${surfaceSize === "huge" ? ZOOM_HUGE_MAX_PX : ZOOM_DETAIL_MAX_PX}px, 94vw)`;
		}
		/** The settle skeleton — an all-skeleton layout with no real content
		*  (the shimmer sweep is the old tree's loading face). */
		function ZoomSkeleton() {
			return (0, react.createElement)("div", { className: card_module_css_default$1.zoomSkeleton }, (0, react.createElement)("div", { className: card_module_css_default$1.skLine + " " + card_module_css_default$1.skWide }), (0, react.createElement)("div", { className: card_module_css_default$1.skLine }), (0, react.createElement)("div", { className: card_module_css_default$1.skLine }), (0, react.createElement)("div", { className: card_module_css_default$1.skBlock }), (0, react.createElement)("div", { className: card_module_css_default$1.skLine }), (0, react.createElement)("div", { className: card_module_css_default$1.skRow }, (0, react.createElement)("div", { className: card_module_css_default$1.skLine + " " + card_module_css_default$1.skShort }), (0, react.createElement)("div", { className: card_module_css_default$1.skLine + " " + card_module_css_default$1.skShort })));
		}
		/** One overlay mount (keyed per stage by the caller). */
		function ZoomMount(props) {
			const { stage, detail, onClose, ...rest } = props;
			const [ready, setReady] = (0, react.useState)(false);
			const [surfaceSize, setSurfaceSize] = (0, react.useState)(null);
			const onSurface = (size) => {
				setSurfaceSize(size === "" ? null : size);
			};
			(0, react.useEffect)(() => {
				const t = window.setTimeout(() => {
					setReady(true);
				}, ZOOM_SKELETON_MS);
				return () => {
					window.clearTimeout(t);
				};
			}, [stage.id]);
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
				className: card_module_css_default$1.zoomOverlay,
				onClick: (e) => {
					if (e.target === e.currentTarget) onClose();
				}
			}, (0, react.createElement)("div", { className: card_module_css_default$1.zoomScroll }, (0, react.createElement)("div", { className: card_module_css_default$1.zoomInner }, (0, react.createElement)("div", {
				className: card_module_css_default$1.zoomCard,
				style: {
					width: zoomWidthFor(surfaceSize),
					maxWidth: "100%"
				}
			}, (0, react.createElement)("div", { className: card_module_css_default$1.zoomBar }, (0, react.createElement)("span", { className: card_module_css_default$1.zoomTitle }, "Stage " + String(stage.title ?? stage.card ?? stage.id)), (0, react.createElement)("button", {
				className: card_module_css_default$1.closeX,
				type: "button",
				"aria-label": "Collapse card",
				onClick: onClose
			}, "✕")), ready ? (0, react.createElement)(props.detail, {
				stage,
				bench: rest.bench,
				running: rest.running,
				onRun: rest.onRun,
				onClose,
				onRemoved: rest.onRemoved,
				onPatchParams: rest.onPatchParams,
				renderStageView: rest.renderStageView,
				onSurface,
				runId: rest.runId
			}) : (0, react.createElement)(ZoomSkeleton)))));
		}
		/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
		* tree's own DSH rule), keyed per stage. */
		function CardZoomOverlay(props) {
			const mounted = typeof document !== "undefined";
			const tree = (0, react.createElement)(ZoomMount, {
				key: props.stage.id,
				...props
			});
			return mounted ? (0, react_dom.createPortal)(tree, document.body) : tree;
		}
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
		/** The /v1/forms edge-meta cache (card id → declared input/output
		*  kinds) — ONE fetch per browser session; the picker's kind
		*  matching (THE EDGE LAW) reads it. A failed fetch leaves null and
		*  the picker falls to the unfiltered list (never blocks a pick). */
		let formsEdgeMetaPromise = null;
		function loadFormsEdgeMeta() {
			formsEdgeMetaPromise ??= fetchFormsTable().then((rows) => {
				const out = {};
				for (const [id, row] of Object.entries(rows)) out[id] = {
					inputs: row.inputs,
					outputs: row.outputs
				};
				return out;
			}).catch((e) => {
				formsEdgeMetaPromise = null;
				throw e;
			});
			return formsEdgeMetaPromise;
		}
		/** Correlation id — the run-wire package's ONE definition (re-exported
		*  by cards-resource for the tab's legacy importers). */
		/** Run ONE card stage through the COMPOSING door (the run-wire
		*  package's startCardRun — the {model:} arm). The flow_inline door
		*  this gesture rode before cannot consume cards ("card= stages are
		*  unported on this gateway") and its executor demanded a pre-composed
		*  params.workflow nobody emitted — the Sep 11 bench runs' "node
		*  carries no inline workflow". The {model:} door composes the card's
		*  arms estate-side; `model` is the card's DEFAULT FAMILY from the
		*  catalog (the runs door resolves neither card ids nor aliases —
		*  defaultFamilyForCard carries the currency, session-cached).
		*  THE PARAM IS THE WIRE (the two-month law): whatever the stage's
		*  slot holds — an upload's estate path or a picked upstream output's
		*  media-route url — rides the start doc VERBATIM; the engine stages
		*  it under its runs-root arm. No client-side edge resolution exists.
		*  Exported for the tab seam's door-contract spec. */
		async function runCardStage(draftId, row) {
			const params = typeof row.params === "object" && row.params !== null && !Array.isArray(row.params) ? row.params : {};
			const card = typeof row.card === "string" && row.card !== "" ? row.card : "";
			if (card === "") return { refused: "this stage names no card — nothing to compose" };
			const heldModel = params["model"];
			const model = typeof heldModel === "string" && heldModel !== "" ? heldModel : await defaultFamilyForCard(card);
			let doc = params;
			try {
				const selects = (await fetchFormSpec(card)).fields.filter((f) => f.type === "select" && Array.isArray(f.options));
				if (selects.length > 0) {
					doc = { ...params };
					for (const f of selects) {
						const v = doc[f.name];
						if (typeof v === "number") {
							if (f.options.map((o) => typeof o === "string" ? o : o.value).includes(String(v))) doc[f.name] = String(v);
						}
					}
				}
			} catch {}
			return await startCardRun({
				model,
				params: doc,
				draftId
			});
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
		/** THE SEQUENTIAL PASS — Run ALL, the old system's composer law
		*  verbatim (flowExecuteSlice runAll, 2026-08-11): execute the
		*  stages IN ORDER, one run per card (the SAME single-stage door the
		*  drill's Run uses — a typed composer bench is never one graph
		*  run; the flow_inline door serves the chain/graph surface, not
		*  this one). Skip stages already done (the cache-hit skip). A
		*  failed or refused stage STOPS the pass — fail loud, never a
		*  doomed downstream run. The per-card observer patches each row as
		*  it goes (running → terminal), so the tiles flip one by one and
		*  the bench is never taken over. Exported for the door-contract
		*  spec. */
		async function runBenchSequential(bench, hooks = {}) {
			const ran = [];
			for (const stage of bench.stages) {
				if (hooks.signal?.aborted === true) return {
					ran,
					stoppedAt: null,
					refused: null
				};
				if (stage.runStatus === "done") continue;
				const res = await runCardStage(bench.draftId, stage);
				if ("refused" in res) return {
					ran,
					stoppedAt: stage.id,
					refused: res.refused
				};
				hooks.onCardStarted?.(res.runId, {
					draftId: bench.draftId,
					stageId: stage.id
				});
				if (await observeRunOutcome(bench.draftId, stage.id, res.runId, hooks.signal, hooks.onTouched) !== "done") return {
					ran: [...ran, stage.id],
					stoppedAt: stage.id,
					refused: null
				};
				ran.push(stage.id);
			}
			return {
				ran,
				stoppedAt: null,
				refused: null
			};
		}
		/** runs/stop — the cancel door (the registry seat's flag + interrupt);
		*  the run-wire package's verb. */
		/** Bench row run-status → the installed StateDot union (FlowCards'
		*  CardRowLine law: done|warning|ongoing|error — a stage that never
		*  ran shows NO dot, never a fake state). */
		const STAGE_DOT = {
			queued: "warning",
			pending: "warning",
			running: "ongoing",
			done: "done",
			failed: "error",
			stopped: "warning",
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
		/** The tile-reorder drag's MIME (native HTML5 sortable — DSH ships no
		*  drag library; the estate drags natively). Carries the source id. */
		const CARD_DRAG_MIME = "application/x-melite-card";
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
		/** The sortable tile wrapper — the old grid's SortableCardWrap
		*  pattern: the li is the drag unit, transform/transition ride the
		*  wrapper, the shared-element layoutId stays INSIDE (the morph
		*  anchor is unbroken). */
		/** runStatus text → the installed Tag tone union (the primitives
		*  catalog owns badge palettes; a copy is forbidden). */
		function statusTone(status) {
			if (status === "done" || status === "succeeded") return "success";
			if (status === "error" || status === "failed") return "danger";
			if (status === "running" || status === "queued" || status === "pending") return "info";
			if (status === "cancelled" || status === "timeout") return "warning";
			return "neutral";
		}
		function SortableTile({ row, entered, onOpen, grouping, selected, onToggleSelect, onAssetAttach, dragging, dragOver, onReorderStart, onReorderOver, onReorderDrop }) {
			const dragHandlers = grouping ? {} : {
				draggable: true,
				onDragStart: (e) => {
					e.dataTransfer.setData(CARD_DRAG_MIME, row.id);
					e.dataTransfer.effectAllowed = "move";
					onReorderStart(row.id);
				},
				onDragEnd: () => {
					onReorderStart(null);
				}
			};
			const wiredFrom = typeof row.stage.inputs === "object" && row.stage.inputs !== null && "source" in row.stage.inputs;
			return (0, react.createElement)("li", {
				className: card_module_css_default$1.tile + (entered ? " " + card_module_css_default$1.tileEnter : "") + (dragging ? " " + card_module_css_default$1.tileDragging : "") + (dragOver ? " " + card_module_css_default$1.tileDragOver : ""),
				"data-stage-id": row.id,
				"data-stage-status": row.status,
				"data-grouping": grouping ? "on" : null,
				"data-selected": grouping && selected ? "on" : null,
				onDragOver: (e) => {
					if (e.dataTransfer.types.includes(CARD_DRAG_MIME)) {
						e.preventDefault();
						e.stopPropagation();
						e.dataTransfer.dropEffect = "move";
						onReorderOver(row.id);
						return;
					}
					if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
						e.preventDefault();
						e.stopPropagation();
						e.dataTransfer.dropEffect = "copy";
					}
				},
				onDrop: (e) => {
					if (e.dataTransfer.types.includes(CARD_DRAG_MIME)) {
						e.preventDefault();
						e.stopPropagation();
						const active = e.dataTransfer.getData(CARD_DRAG_MIME);
						if (active !== "" && active !== row.id) onReorderDrop(active, row.id);
						return;
					}
					const asset = parseAssetDrop(e.dataTransfer.types.includes(ASSET_DRAG_MIME) ? e.dataTransfer.getData(ASSET_DRAG_MIME) : "");
					if ((asset.url ?? "") !== "") {
						e.preventDefault();
						e.stopPropagation();
						const t = asset.type ?? "";
						if (!t.startsWith("image/") && !t.startsWith("audio/")) return;
						onAssetAttach(row.id, asset.url, (asset.type ?? "").startsWith("audio/") ? "audio" : "image");
						return;
					}
					const file = e.dataTransfer.files[0];
					if (file === void 0) return;
					if (file.type !== "image/png" && file.type !== "image/jpeg" && file.type !== "image/webp") return;
					e.preventDefault();
					e.stopPropagation();
					onAssetAttach(row.id, file, "image");
				},
				...dragHandlers
			}, (0, react.createElement)("div", { className: card_module_css_default$1.tileShared }, (0, react.createElement)("button", {
				className: card_module_css_default$1.tileInner,
				type: "button",
				"data-status": row.status,
				onClick: () => {
					if (grouping) {
						onToggleSelect(row.id);
						return;
					}
					onOpen(row);
				}
			}, grouping ? (0, react.createElement)("span", {
				className: card_module_css_default$1.checkCircle + (selected ? " " + card_module_css_default$1.checkOn : ""),
				"aria-hidden": "true"
			}, selected ? "✓" : "") : null, (0, react.createElement)("span", { className: card_module_css_default$1.tilePreview }, row.thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default$1.tileImg,
				src: row.thumbUrl,
				alt: row.title,
				loading: "lazy"
			}) : (0, react.createElement)("span", {
				className: card_module_css_default$1.kindFace,
				"data-kind": row.kind
			}, (0, react.createElement)("span", { className: card_module_css_default$1.kindInitial }, row.kind.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default$1.kindName }, row.kind)), row.dot !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: row.dot })) : null), (0, react.createElement)("span", { className: card_module_css_default$1.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default$1.tileTitle }, row.title, wiredFrom ? (0, react.createElement)("span", {
				className: card_module_css_default$1.wiredMark,
				title: "source wired"
			}, " ⛓") : null, row.sourceAttached ? (0, react.createElement)("span", {
				className: card_module_css_default$1.wiredMark,
				title: "source attached"
			}, " 📎") : null), (0, react.createElement)("span", { className: card_module_css_default$1.tileMeta }, row.service !== null ? row.service : null, row.upstream !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tag, { tone: "quiet" }, "⟵ " + row.upstream) : null, row.prompt !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.tilePrompt }, row.prompt) : null), row.status !== "" && row.status !== "ready" ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tag, { tone: statusTone(row.status) }, row.status) : null))));
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
				sourceAttached: Object.values(params).some((v) => typeof v === "string" && (v.startsWith("data/input/") || v.startsWith("/melite-media/") || v.startsWith("/v1/assets/"))),
				stage
			};
		}
		/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
		*  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
		*  groups, defaults); the drill renders THAT, never a raw key/value
		*  dump. Params left, Run right; the patch carries only CHANGED keys
		*  (coerced once, at patch time — the editPatch law); then the run
		*  gesture (patch lands in the domain BEFORE the run reads it). */
		function StageDrill({ stage, bench, running, onRun, onClose, onRemoved, onPatchParams, renderStageView, onSurface, runId, canRemove }) {
			String(stage.title ?? stage.card ?? stage.id);
			const held = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const [spec, setSpec] = (0, react.useState)(null);
			const [values, setValues] = (0, react.useState)({});
			const [error, setError] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const reportSurface = onSurface ?? (() => {});
			const [removing, setRemoving] = (0, react.useState)(false);
			const others = bench.stages.filter((s) => s.id !== stage.id);
			const candidates = others.flatMap((s) => {
				const res = typeof s.result === "object" && s.result !== null ? s.result : null;
				const url = res !== null && typeof res["url"] === "string" && res["url"] !== "" ? res["url"] : "";
				return url === "" ? [] : [{
					id: s.id,
					label: String(s.title ?? s.card ?? s.id),
					url
				}];
			});
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
						...seedAxisValues(doc, held),
						...held
					});
					setLoaded(true);
					reportSurface(doc.size === "huge" ? "huge" : "");
				}).catch((e) => {
					if (!alive) return;
					setError(e instanceof Error ? e.message : "form-spec unavailable");
					setLoaded(true);
				});
				return () => {
					alive = false;
				};
			}, [stage.id]);
			const [edgeMeta, setEdgeMeta] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				loadFormsEdgeMeta().then((m) => {
					if (alive) setEdgeMeta(m);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, []);
			const candidatesFor = (0, react.useCallback)((f) => {
				if (spec === null || edgeMeta === null) return candidates;
				const edge = (spec.inputs ?? []).find((e) => e.name === f.name);
				if (edge === void 0) return candidates;
				const kind = edge.kind;
				return candidates.filter((c) => {
					const row = others.find((s) => s.id === c.id);
					const cardId = String(row?.card ?? "");
					const outs = edgeMeta[cardId]?.outputs;
					return outs !== void 0 && Object.values(outs).includes(kind);
				});
			}, [
				spec,
				edgeMeta,
				candidates,
				others
			]);
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((m) => ({
					...m,
					[name]: v
				}));
			}, []);
			const wire = {
				candidates,
				candidatesFor
			};
			const run = async () => {
				setError(null);
				try {
					const patch = spec !== null ? specPatch(spec.fields, values, held) : {};
					for (const k of [
						"model",
						"variant",
						"quant"
					]) if (values[k] !== void 0 && String(values[k] ?? "") !== String(held[k] ?? "")) patch[k] = values[k];
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
				return (0, react.createElement)("div", { className: card_module_css_default$1.zoomDetail }, (0, react.createElement)("p", { className: card_module_css_default$1.groupNote }, "A compound of " + String(members.length) + " stages. Ungroup restores them at this position."), (0, react.createElement)("ol", { className: card_module_css_default$1.memberList }, members.map((m, i) => (0, react.createElement)("li", {
					key: m.id,
					className: card_module_css_default$1.memberRow
				}, (0, react.createElement)("span", { className: card_module_css_default$1.memberIdx }, String(i + 1) + "."), (0, react.createElement)("span", { className: card_module_css_default$1.memberName }, String(m.title ?? m.card ?? m.id))))), (0, react.createElement)("div", { className: card_module_css_default$1.runRow }, error !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.runError }, error) : null, (0, react.createElement)("button", {
					className: card_module_css_default$1.back,
					type: "button",
					disabled: removing,
					onClick: () => {
						ungroup();
					}
				}, removing ? "ungrouping…" : "Ungroup")));
			}
			const genericDetail = () => (0, react.createElement)("div", { className: card_module_css_default$1.zoomDetail }, (0, react.createElement)("div", { className: card_module_css_default$1.split }, (0, react.createElement)("div", { className: card_module_css_default$1.params }, !loaded ? (0, react.createElement)("div", { className: card_module_css_default$1.load }, "form…") : spec !== null ? (0, react.createElement)(CardForm, {
				spec,
				fields: spec.fields,
				values,
				onEdit,
				wire,
				onPatch: onPatchParams
			}) : (0, react.createElement)("pre", { className: card_module_css_default$1.mono }, JSON.stringify(held, null, 2))), (0, react.createElement)("div", { className: card_module_css_default$1.outputs }, (0, react.createElement)("div", { className: card_module_css_default$1.runRow }, error !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.runError }, error) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")), (0, react.createElement)("div", { className: card_module_css_default$1.runRow }, canRemove === false ? null : (0, react.createElement)("button", {
				className: card_module_css_default$1.back,
				type: "button",
				disabled: running || removing,
				onClick: () => {
					remove();
				}
			}, removing ? "removing…" : "Remove stage")))));
			return renderStageView({
				stageId: stage.id,
				cardName: String(stage.card ?? ""),
				row: stage,
				runStatus: typeof stage.runStatus === "string" ? stage.runStatus : "",
				onPatch: onPatchParams,
				onRun,
				onStop: () => {},
				onRemove: () => {
					remove();
				},
				onSurface: reportSurface,
				upstream: candidates.map((c) => ({
					id: c.id,
					title: c.label,
					url: c.url
				})),
				runId: runId ?? null
			}, genericDetail());
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
					setValues({
						...specDefaults(doc.fields),
						...seedAxisValues(doc, {})
					});
				}).catch((e) => setFormError(e instanceof Error ? e.message : "form-spec unavailable"));
			};
			const onEdit = (0, react.useCallback)((name, v) => {
				setValues((m) => ({
					...m,
					[name]: v
				}));
			}, []);
			const wire = { candidates: bench.stages.flatMap((s) => {
				const res = typeof s.result === "object" && s.result !== null ? s.result : null;
				const url = res !== null && typeof res["url"] === "string" && res["url"] !== "" ? res["url"] : "";
				return url === "" ? [] : [{
					id: s.id,
					label: String(s.title ?? s.card ?? s.id),
					url
				}];
			}) };
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
				className: card_module_css_default$1.drill
			}, picked === null ? (0, react.createElement)("div", { className: card_module_css_default$1.picker }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: query,
				placeholder: "search cards…",
				onChange: (e) => setQuery(e.target.value),
				"aria-label": "Search cards"
			}), catalogError !== null ? (0, react.createElement)("p", { className: card_module_css_default$1.runError }, catalogError) : null, cards === null && catalogError === null ? (0, react.createElement)("div", { className: card_module_css_default$1.load }, "cards…") : null, genres.map(([g, list]) => (0, react.createElement)("section", {
				key: g,
				className: card_module_css_default$1.pickerGenre
			}, (0, react.createElement)("h4", { className: card_module_css_default$1.specGroupTitle }, g), list.map((c) => (0, react.createElement)("button", {
				key: c.id,
				type: "button",
				className: card_module_css_default$1.pickerCard,
				onClick: () => pick(c)
			}, (0, react.createElement)("span", { className: card_module_css_default$1.pickerCardLabel }, c.label), c.description !== "" ? (0, react.createElement)("span", { className: card_module_css_default$1.pickerCardDesc }, c.description) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, null, c.families[0] ?? c.id)))))) : (0, react.createElement)("div", { className: card_module_css_default$1.split }, (0, react.createElement)("div", { className: card_module_css_default$1.params }, (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default$1.back,
				onClick: () => {
					setPicked(null);
					setSpec(null);
				}
			}, "← " + (cards?.length ?? 0) + " cards"), spec === null && formError === null ? (0, react.createElement)("div", { className: card_module_css_default$1.load }, "form…") : null, formError !== null ? (0, react.createElement)("p", { className: card_module_css_default$1.runError }, formError) : null, spec !== null ? (0, react.createElement)(CardForm, {
				spec,
				fields: spec.fields,
				values,
				onEdit,
				wire
			}) : null), (0, react.createElement)("div", { className: card_module_css_default$1.outputs }, (0, react.createElement)("div", { className: card_module_css_default$1.runRow }, formError !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.runError }, formError) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: adding || spec === null,
				onClick: () => {
					add();
				}
			}, adding ? "adding…" : "Add card")))));
		}
		function BenchView({ bench, onRun, onRunStage, running, onPatchParams, renderStageView, runId, refreshTick }) {
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
			(0, react.useEffect)(() => {
				if (refreshTick !== void 0 && refreshTick > 0) reload({ keepOpen: true });
			}, [refreshTick]);
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
			const [dragId, setDragId] = (0, react.useState)(null);
			const [overId, setOverId] = (0, react.useState)(null);
			const onReorderStart = (0, react.useCallback)((id) => {
				setDragId(id);
				if (id === null) setOverId(null);
			}, []);
			const onReorderOver = (0, react.useCallback)((id) => {
				setOverId(id);
			}, []);
			const onReorderDrop = (0, react.useCallback)((active, over) => {
				setDragId(null);
				setOverId(null);
				if (over === active || over === "add") return;
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
			const onAssetAttach = (0, react.useCallback)((target, source, kind) => {
				const row = live.stages.find((s) => s.id === target);
				if (row === void 0) return;
				fetchFormSpec(String(row.card)).then((spec) => {
					const field = spec.fields.find((f) => f.type === kind);
					if (field === void 0) throw new Error("the " + String(row.card) + " card has no " + kind + " slot");
					return field.name;
				}).then((field) => typeof source === "string" ? Promise.resolve([field, source]) : uploadInputFile(source).then(({ name }) => [field, name])).then(([field, src]) => patchStageParams(live.draftId, target, { [field]: src })).then(() => {
					reload({ keepOpen: true });
				}).catch((err) => {
					setReloadError(err instanceof Error ? err.message : "attach refused");
				});
			}, [live, reload]);
			const benchRev = live.rev;
			return (0, react.createElement)("section", {
				className: card_module_css_default$1.cardsBench,
				"data-cards-bench": benchRev
			}, (0, react.createElement)("header", { className: card_module_css_default$1.benchHead }, (0, react.createElement)("span", { className: card_module_css_default$1.revTag }, "rev " + benchRev), grouping ? (0, react.createElement)("span", { className: card_module_css_default$1.groupBar }, (0, react.createElement)("button", {
				className: card_module_css_default$1.runBtn,
				type: "button",
				disabled: selectedIds.size < 2,
				title: selectedIds.size < 2 ? "select 2+ tiles to group" : "collapse the selected stages into one compound",
				onClick: onGroup
			}, "Group " + String(selectedIds.size) + " cards"), (0, react.createElement)("button", {
				className: card_module_css_default$1.back,
				type: "button",
				onClick: exitGrouping
			}, "Cancel")) : (0, react.createElement)("span", { className: card_module_css_default$1.groupBar }, (0, react.createElement)("button", {
				className: card_module_css_default$1.back,
				type: "button",
				disabled: live.stages.length < 2,
				title: live.stages.length < 2 ? "grouping needs 2+ stages" : "enter the selection sub-view",
				onClick: () => {
					setGrouping(true);
				}
			}, "Group Cards"), (0, react.createElement)("button", {
				className: card_module_css_default$1.runBtn,
				type: "button",
				disabled: running || live.stages.length === 0,
				onClick: onRun
			}, "Run"))), reloadError !== null ? (0, react.createElement)("p", { className: card_module_css_default$1.runError }, reloadError) : null, (0, react.createElement)("ol", {
				className: card_module_css_default$1.tileGrid + (capOver ? " " + card_module_css_default$1.capOver : ""),
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
					grouping,
					selected: selectedIds.has(s.id),
					onToggleSelect,
					onAssetAttach,
					dragging: dragId === s.id,
					dragOver: overId === s.id && dragId !== null && dragId !== s.id,
					onReorderStart,
					onReorderOver,
					onReorderDrop
				});
			}), (0, react.createElement)("li", { className: card_module_css_default$1.tile + " " + card_module_css_default$1.tileAdd }, (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default$1.tileInner,
				"aria-label": "Add a card",
				onClick: onAddCard
			}, (0, react.createElement)("span", { className: card_module_css_default$1.tilePreview + " " + card_module_css_default$1.addFace }, "+"), (0, react.createElement)("span", { className: card_module_css_default$1.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default$1.tileTitle }, "Add a card"))))), live.log.length > 0 ? (0, react.createElement)("p", { className: card_module_css_default$1.logHead }, live.log.length + " log entr" + (live.log.length === 1 ? "y" : "ies")) : null, open !== null ? (0, react.createElement)(CardZoomOverlay, {
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
				onPatchParams: (patch) => {
					onPatchParams(open, patch);
				},
				renderStageView,
				runId,
				detail: StageDrill
			}) : null, adding ? (0, react.createElement)(AddCardDoor, {
				bench: live,
				onAdded,
				onClose: () => {
					setAdding(false);
				}
			}) : null);
		}
		/**
		* THE DRAFT VIEW (the conversation card's target, 2026-09-12 — the
		* old embed's law restored): one flow draft's stage on the authoring
		* surface. The studio claims `cards.stage.view` exactly as the bench's
		* zoom does — same slot, same owner currency, same run/patch doors —
		* so the chat card opens the timeline/video/splits/audio surface, and
		* a card with no registered studio falls back to the generic zoom
		* card (params + Run), the bench's own fallback.
		*
		* Removal is NOT offered (the draft's shape belongs to its authoring
		* surface — the bench CAS door has no business here); the back affordance
		* returns to the shared bench, the tab's home address.
		*/
		function DraftView({ value, running, onRun, onBack, onPatchParams, renderStageView, runId }) {
			const found = value.stages.find((s) => s.id === value.stageId) ?? null;
			if (found === null) return (0, react.createElement)("div", { className: card_module_css_default$1.zoomDetail }, (0, react.createElement)("p", { className: card_module_css_default$1.groupNote }, "Stage " + value.stageId + " is no longer on draft " + value.draftId + "."), (0, react.createElement)("div", { className: card_module_css_default$1.runRow }, (0, react.createElement)("button", {
				className: card_module_css_default$1.back,
				type: "button",
				onClick: onBack
			}, "Back to the bench")));
			let stage = found;
			if ((stage["card"] === void 0 || stage["card"] === "") && value.intent !== "" && value.stages.length === 1) stage = {
				...found,
				card: value.intent
			};
			const bench = {
				kind: "bench",
				draftId: value.draftId,
				rev: -1,
				stages: value.stages,
				log: []
			};
			return (0, react.createElement)(StageDrill, {
				stage,
				bench,
				running,
				onRun,
				onClose: onBack,
				onRemoved: onBack,
				onPatchParams,
				renderStageView,
				runId,
				canRemove: false
			});
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
				className: card_module_css_default$1.runView,
				"data-run-status": run.status
			}, (0, react.createElement)("header", { className: card_module_css_default$1.runHead }, (0, react.createElement)("span", { className: card_module_css_default$1.runId }, run.runId), (0, react.createElement)("span", { className: card_module_css_default$1.runStatus }, run.status)), (0, react.createElement)("div", { className: card_module_css_default$1.runActions }, onBack !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default$1.back,
				type: "button",
				onClick: onBack
			}, "Back to bench") : null, live && onStop !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default$1.cancelBtn,
				type: "button",
				disabled: stopping,
				onClick: onCancel
			}, stopping ? "cancelling…" : "Cancel run") : null, (0, react.createElement)("button", {
				className: card_module_css_default$1.restore,
				type: "button",
				disabled: restoring || run.draftId === null,
				title: run.draftId === null ? "this run names no draft — nothing to restore" : "copy this run’s stages back onto the bench as your own",
				onClick: onRestore
			}, restoring ? "Restoring…" : "Restore to bench")), note !== null ? (0, react.createElement)("p", { className: card_module_css_default$1.restoreNote }, note) : null, (0, react.createElement)("ol", { className: card_module_css_default$1.tileGrid }, run.stages.map((s) => {
				const thumb = s.url !== void 0 ? toRunMediaUrl(run.runId, s.url) : null;
				const dot = s.status === "done" ? "done" : s.status === "running" ? "ongoing" : s.status === "failed" ? "error" : s.status === "queued" || s.status === "pending" ? "warning" : null;
				const face = thumb !== null ? (0, react.createElement)("a", {
					href: thumb,
					target: "_blank",
					rel: "noreferrer",
					className: card_module_css_default$1.tileImgLink
				}, (0, react.createElement)("img", {
					className: card_module_css_default$1.tileImg,
					src: thumb,
					alt: s.id,
					loading: "lazy"
				})) : (0, react.createElement)("span", {
					className: card_module_css_default$1.kindFace,
					"data-kind": s.id
				}, (0, react.createElement)("span", { className: card_module_css_default$1.kindInitial }, s.id.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default$1.kindName }, s.id));
				return (0, react.createElement)("li", {
					key: s.id,
					className: card_module_css_default$1.tile,
					"data-stage-status": s.status
				}, (0, react.createElement)("div", {
					className: card_module_css_default$1.tileInner,
					"data-status": s.status
				}, (0, react.createElement)("span", { className: card_module_css_default$1.tilePreview }, face, dot !== null ? (0, react.createElement)("span", { className: card_module_css_default$1.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot })) : null), (0, react.createElement)("span", { className: card_module_css_default$1.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default$1.tileTitle }, s.id), (0, react.createElement)("span", { className: card_module_css_default$1.tileMeta }, s.status))));
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
			const renderStageView = (owner, fallback) => {
				if (props.renderSlot === void 0) return fallback;
				return props.renderSlot("cards.stage.view", owner, {
					entryKey: owner.cardName,
					fallback
				}) ?? fallback;
			};
			const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0;
			const address = resolveCardsAddress(info?.tab.navigation.address ?? info?.tab.contentId ?? "dsh-resource://cards/bench");
			const openResource = info?.tab.actions.openResource;
			const snapshot = typeof props.useResource === "function" ? props.useResource(address) : void 0;
			const [running, setRunning] = (0, react.useState)(false);
			const [lastRunId, setLastRunId] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (lastRunId !== null) return;
				if (snapshot?.value?.kind !== "bench" && snapshot?.value?.kind !== "draft") return;
				const draftId = snapshot.value.draftId;
				if (draftId === "") return;
				let alive = true;
				fetchLatestRunForDraft(draftId).then((rid) => {
					if (alive && rid !== null) setLastRunId(rid);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, [lastRunId, snapshot?.value]);
			const [localRunError, setLocalRunError] = (0, react.useState)(null);
			const outcomeAbort = (0, react.useRef)(null);
			const [benchTick, setBenchTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => () => {
				outcomeAbort.current?.abort();
			}, []);
			const touchBench = (0, react.useCallback)(() => {
				setBenchTick((t) => t + 1);
			}, []);
			const onStarted = (0, react.useCallback)((runId, ran) => {
				setRunning(false);
				setLastRunId(runId);
				if (ran === void 0) return;
				if (outcomeAbort.current === null) outcomeAbort.current = new AbortController();
				observeRunOutcome(ran.draftId, ran.stageId, runId, outcomeAbort.current.signal, touchBench);
			}, [touchBench]);
			const runAllAbort = (0, react.useRef)(null);
			const onRun = (0, react.useCallback)(() => {
				if (snapshot?.value?.kind !== "bench") return;
				setRunning(true);
				setLocalRunError(null);
				runAllAbort.current?.abort();
				const ctrl = new AbortController();
				runAllAbort.current = ctrl;
				runBenchSequential(snapshot.value, {
					signal: ctrl.signal,
					onCardStarted: (runId) => {
						setLastRunId(runId);
					},
					onTouched: touchBench
				}).then((res) => {
					setRunning(false);
					if (res.refused !== null) setLocalRunError(res.refused);
				});
			}, [snapshot, touchBench]);
			const onRunStage = (0, react.useCallback)((stage) => {
				if (snapshot?.value?.kind !== "bench") return;
				setRunning(true);
				setLocalRunError(null);
				runCardStage(snapshot.value.draftId, stage).then((res) => {
					if ("runId" in res) onStarted(res.runId, {
						draftId: snapshot.value.draftId,
						stageId: stage.id
					});
					else {
						setRunning(false);
						setLocalRunError(res.refused);
					}
				});
			}, [snapshot, onStarted]);
			const onPatchParamsStage = (0, react.useCallback)((stage, patch) => {
				if (snapshot?.value?.kind !== "bench" && snapshot?.value?.kind !== "draft") return;
				patchStageParams(snapshot.value.draftId, stage.id, patch).then(() => {
					setLocalRunError(null);
				}).catch((e) => {
					setLocalRunError(e instanceof Error ? e.message : "patch failed");
				});
			}, [snapshot]);
			const onRunDraftStage = (0, react.useCallback)(() => {
				const value = snapshot?.value;
				if (value?.kind !== "draft") return;
				const target = value.stages.find((s) => s.id === value.stageId);
				if (target === void 0) return;
				setRunning(true);
				setLocalRunError(null);
				runCardStage(value.draftId, target).then((res) => {
					if ("runId" in res) onStarted(res.runId, {
						draftId: value.draftId,
						stageId: target.id
					});
					else {
						setRunning(false);
						setLocalRunError(res.refused);
					}
				});
			}, [snapshot, onStarted]);
			const onPatchParamsDraft = (0, react.useCallback)((patch) => {
				const value = snapshot?.value;
				if (value?.kind !== "draft") return;
				patchStageParams(value.draftId, value.stageId, patch).then(() => {
					setLocalRunError(null);
				}).catch((e) => {
					setLocalRunError(e instanceof Error ? e.message : "patch failed");
				});
			}, [snapshot]);
			const onStop = (0, react.useCallback)((runId) => {
				stopRun(runId).catch((e) => {
					setLocalRunError(e instanceof Error ? e.message : "cancel failed");
				});
			}, []);
			const onBack = (0, react.useCallback)(() => {
				if (openResource !== void 0) openResource(CARDS_BENCH_ADDRESS);
			}, [openResource]);
			if (snapshot === void 0) return (0, react.createElement)("p", { className: card_module_css_default$1.missing }, "cards resource hook unavailable");
			if (snapshot.status === "loading" || snapshot.status === "none") return (0, react.createElement)("p", { className: card_module_css_default$1.loading }, "loading " + address + "…");
			if (snapshot.status === "failed") return (0, react.createElement)("p", { className: card_module_css_default$1.failed }, snapshot.failure?.message ?? "cards resource failed");
			const value = snapshot.value;
			if (value === void 0) return (0, react.createElement)("p", { className: card_module_css_default$1.failed }, "cards resource gave no value");
			return value.kind === "bench" ? (0, react.createElement)(react.Fragment, null, localRunError !== null ? (0, react.createElement)("p", { className: card_module_css_default$1.runError }, localRunError) : null, (0, react.createElement)(BenchView, {
				bench: value,
				onRun,
				onRunStage,
				running,
				onPatchParams: onPatchParamsStage,
				renderStageView,
				runId: lastRunId,
				refreshTick: benchTick
			})) : value.kind === "draft" ? (0, react.createElement)(react.Fragment, null, localRunError !== null ? (0, react.createElement)("p", { className: card_module_css_default$1.runError }, localRunError) : null, (0, react.createElement)(DraftView, {
				value,
				running,
				onRun: onRunDraftStage,
				onBack: openResource !== void 0 ? onBack : (() => {}),
				onPatchParams: onPatchParamsDraft,
				renderStageView,
				runId: lastRunId
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
			"sprite_sheet",
			"h3_timeline"
		];
		/** @deprecated use CARD_TOOLS — kept for back-compat imports */
		const FLOW_START_TOOL = CARD_TOOLS[0];
		/** The tab type's identity (the key its body registers under). */
		const CARDS_TAB_ID = "@melite-plugin/dsh-card-view";
		/** Required services (fiber inject waiting — the registries must be up
		*  first: the native sidebar subsystem + the resource model + the
		*  sidebar's navigation face, which the conversation card's rows ride
		*  to open the Cards tab at a draft stage — the old embed's law). */
		const inject = [
			"slots",
			"sidebarRightTabs",
			"resources",
			"sidebarRight"
		];
		/**
		* Register both planes: the toolview keys for every card tool, and the
		* cards tab (type + body + resource provider).
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (!claimCardViewApply()) return;
			ctx.effect(() => releaseCardViewApply, "melite-card-view: apply claim");
			ctx.effect(() => {
				setOpenCardsSurface((address) => {
					ctx.sidebarRight.openResource(address);
				});
				return () => {
					setOpenCardsSurface(null);
				};
			}, "melite-card-view: cards surface face");
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
					key: CARDS_TAB_ID,
					children: { "cards.stage.view": {
						kind: "keyed",
						scope: "session"
					} }
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
