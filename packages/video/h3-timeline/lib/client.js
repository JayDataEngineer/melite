window.__ModuleLoader__.load({
	id: "@melite/video-h3-timeline",
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
		var __esmMin = (fn, res, err) => () => {
			if (err) throw err[0];
			try {
				return fn && (res = fn(fn = 0)), res;
			} catch (e) {
				throw err = [e], e;
			}
		};
		var __exportAll = (all, no_symbols) => {
			let target = {};
			for (var name in all) __defProp(target, name, {
				get: all[name],
				enumerable: true
			});
			if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
			return target;
		};
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
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../web/card-base/src/studioRail.tsx
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
		/** The rail's tools-slot element, published by CardStudio. Null when the
		*  tenant is mounted outside a studio shell (inline fallback). */
		const StudioRailCtx = (0, react.createContext)(null);
		/** TENANT side: renders children into the studio rail when one exists,
		*  inline otherwise. Wrap the tenant's toolbar in this — nothing else. */
		function StudioRail({ children }) {
			const slot = (0, react.useContext)(StudioRailCtx);
			const [el, setEl] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (slot && slot !== el) setEl(slot);
			}, [slot]);
			if (el) return (0, react_dom.createPortal)(children, el);
			if (slot) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children });
		}
		//#endregion
		//#region ../../web/card-base/src/icons.tsx
		function Svg({ className, style, children, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
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
		function X$1({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12" })]
			});
		}
		function ChevronDown({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 9 6 6 6-6" })
			});
		}
		function ChevronLeft({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m15 18-6-6 6-6" })
			});
		}
		function Upload({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m17 8-5-5-5 5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 3v12" })
				]
			});
		}
		function AlertTriangle({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 9v4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17h.01" })
				]
			});
		}
		/** h3's name for the alert triangle — same drawing. */
		function TriangleAlert({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 9v4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 17h.01" })
				]
			});
		}
		function Clapperboard({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6.2 5.3 3.1 3.9" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12.4 3.4 3.1 4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" })
				]
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region ../../web/card-base/src/chrome.ts
		/**
		* Card chrome primitives — the ONE joiner + the ONE file reader
		* (founded 2026-09-12, debt extermination: anny/ideo cx, motion/h3
		* clsx-cn, and the four identical readAsDataURL copies collapsed
		* here). DOM-free, no CSS, no atoms — safe for node and browser.
		*
		* Per-seam subpath: `@melite/card-base/chrome`.
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
		/** Blob → data URL (FileReader promise). */
		function readAsDataURL$1(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("read failed"));
				reader.readAsDataURL(file);
			});
		}
		//#endregion
		//#region \0dsh-css:card-base/src/shell.module.css.mjs
		const css$3 = "._4etGFq_shell{grid-template-rows:minmax(0,1fr) auto;grid-template-columns:minmax(280px,330px) minmax(0,1fr);height:100%;min-height:0;display:grid}@media (width<=640px){._4etGFq_shell{grid-template-rows:none;grid-template-columns:1fr}._4etGFq_shell>:first-child{max-height:none;overflow-y:visible}}._4etGFq_shell>:first-child{scrollbar-gutter:stable;grid-area:1/1;min-height:0;padding-right:10px;overflow-y:auto}._4etGFq_shell>:nth-child(2){grid-area:1/2;min-height:0;overflow-y:auto}._4etGFq_shell>:nth-child(3){grid-area:2/1/auto/-1;min-height:168px;max-height:min(42%,380px);overflow-y:auto}._4etGFq_errorLine{flex-direction:column;grid-column:1/-1;gap:4px;display:flex}._4etGFq_errorRow{border:1px solid color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 10%, transparent);color:var(--dsw-alias-danger,#dc2626);overflow-wrap:break-word;white-space:pre-wrap;border-radius:4px;margin:0;padding:6px 8px;font-family:ui-monospace,monospace;font-size:9px;line-height:1.4}._4etGFq_errorIcon{vertical-align:-2px;width:12px;height:12px;margin-right:4px;display:inline}._4etGFq_railSection{border:1px solid var(--dsw-alias-border,#e2e4e9);border-radius:8px;padding:8px 12px}._4etGFq_railHead{justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;display:flex}._4etGFq_railTitle{text-transform:uppercase;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary,#8a93a0);margin:0;font-size:10px;font-weight:600}";
		const tagId$3 = "@melite/video-h3-timeline/shell.module.css@62658dc6";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var shell_module_css_default = {
			"errorIcon": "_4etGFq_errorIcon",
			"errorLine": "_4etGFq_errorLine",
			"errorRow": "_4etGFq_errorRow",
			"railHead": "_4etGFq_railHead",
			"railSection": "_4etGFq_railSection",
			"railTitle": "_4etGFq_railTitle",
			"shell": "_4etGFq_shell"
		};
		//#endregion
		//#region ../../web/card-base/src/shell.tsx
		/** The loud error line — shell-owned chrome. Same DOM the assembly
		*  body always rendered. */
		function StudioShellErrorLine({ errors }) {
			if (errors.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "alert",
				className: shell_module_css_default.errorLine,
				children: errors.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: shell_module_css_default.errorRow,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AlertTriangle, { className: shell_module_css_default.errorIcon }),
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
		*  are the same grain, forms simply leave the right/bottom slots empty. */
		function StudioShell({ params, preview, bottom, errors = [], className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cx(shell_module_css_default.shell, className),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioRail, { children: params }),
					preview,
					bottom,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioShellErrorLine, { errors })
				]
			});
		}
		/** The construction door: one obvious way to build a declaration,
		*  typed at the call site. Runtime-frozen. */
		function defineShellDeclaration(declaration) {
			return Object.freeze(declaration);
		}
		//#endregion
		//#region \0dsh-css:/home/user/Documents/programs/active/inference.cpp/packages/video/h3-timeline/src/ui/studio/studio.module.css.mjs
		const css$2 = ".lTRlka_hiddenInput{display:none}.lTRlka_mono{font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)}.lTRlka_alignR{text-align:right}.lTRlka_alignC{text-align:center}.lTRlka_tabular{font-variant-numeric:tabular-nums}.lTRlka_nowrap{white-space:nowrap}.lTRlka_tipAnchor{display:contents}.lTRlka_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.lTRlka_sz8{width:8px;height:8px}.lTRlka_sz10{width:10px;height:10px}.lTRlka_sz12{width:12px;height:12px}.lTRlka_sz20{width:20px;height:20px}.lTRlka_chev{flex:none;transition:transform .15s}details[open]>summary .lTRlka_chev{transform:rotate(180deg)}.lTRlka_w12{width:3rem}.lTRlka_w14{width:3.5rem}.lTRlka_w16{width:4rem}.lTRlka_w24{width:6rem}.lTRlka_w28{width:7rem}.lTRlka_w32{width:8rem}.lTRlka_w36{width:9rem}.lTRlka_w40{width:10rem}.lTRlka_w45{width:4.5rem}.lTRlka_wFull{width:100%}.lTRlka_ctlRow,.lTRlka_ctlRowSm{color:var(--dsw-alias-label-secondary);justify-content:space-between;align-items:center;gap:8px;display:flex}.lTRlka_ctlRow{font-size:10px}.lTRlka_ctlRowSm{font-size:9px}.lTRlka_ctlGap3{gap:12px}.lTRlka_sectionLabel{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.lTRlka_sectionLabelText{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.lTRlka_sectionLabelTail{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_ctlInput,.lTRlka_ctlSelect{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;border-radius:6px;outline:none;padding:2px 6px;font-size:10px}.lTRlka_ctlInput::placeholder{color:var(--dsw-alias-label-tertiary)}.lTRlka_ctlInput:focus,.lTRlka_ctlSelect:focus{border-color:var(--dsw-alias-brand-primary)}.lTRlka_ctlSelect{font-family:inherit}.lTRlka_ctlInputSm{padding:2px 4px;font-size:9px}.lTRlka_sliderWrap{align-items:center;gap:8px;display:flex}.lTRlka_slider{accent-color:var(--dsw-alias-brand-primary)}.lTRlka_sliderReadout{text-align:right;width:2.5rem;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);font-size:10px}.lTRlka_selMenu{min-width:0;display:inline-flex}.lTRlka_selMenuBox{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:2px 6px;font-size:10px}.lTRlka_selMenuBox:focus{border-color:var(--dsw-alias-brand-primary)}.lTRlka_selMenuBox:disabled{opacity:.5}.lTRlka_emptyPane,.lTRlka_emptyOverlay{text-align:center;flex-direction:column;justify-content:center;align-items:center;gap:6px;display:flex}.lTRlka_emptyPane{width:100%;height:100%;padding:24px 0}.lTRlka_emptyOverlay{pointer-events:none;padding:24px;position:absolute;inset:0}.lTRlka_emptyTitle{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;font-weight:500}.lTRlka_emptyHint{color:var(--dsw-alias-label-tertiary);max-width:25rem;margin:0;font-size:10px;line-height:1.6}.lTRlka_paneHeaderPreview{flex:none;align-items:baseline;gap:6px;padding-bottom:6px;display:flex}.lTRlka_paneHeaderStrip{border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);align-items:center;gap:8px;padding:4px 10px;display:flex}.lTRlka_paneTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}.lTRlka_paneMeta{color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_paneMetaNum{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_paneHint{color:var(--dsw-alias-label-tertiary);margin-left:auto;font-size:9px}.lTRlka_paneShell{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;flex:none;overflow:hidden}.lTRlka_shell{grid-template-rows:minmax(0,1fr) auto;grid-template-columns:minmax(280px,330px) minmax(0,1fr);height:100%;min-height:0;display:grid}.lTRlka_shell>:first-child{grid-area:1/1}.lTRlka_shell>:nth-child(2){grid-area:1/2;min-height:0;overflow-y:auto}.lTRlka_shell>:nth-child(3){grid-area:2/1/auto/-1;min-height:168px;max-height:min(42%,380px);overflow-y:auto}.lTRlka_shellErrors{flex-direction:column;gap:4px;margin-top:8px;display:flex}.lTRlka_shellError{border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);overflow-wrap:break-word;white-space:pre-wrap;color:var(--dsw-alias-state-error-primary);border-radius:6px;margin:0;padding:6px 8px;font-size:9px;line-height:1.5}.lTRlka_studioRoot{box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary);gap:8px;padding:12px}.lTRlka_railCol{flex-direction:column;gap:8px;height:100%;min-height:0;padding:10px 12px;display:flex;overflow-y:auto}.lTRlka_docBlock{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;padding-bottom:10px}.lTRlka_docLines{color:var(--dsw-alias-label-secondary);flex-direction:column;gap:4px;padding:0 4px;font-size:10px;line-height:1.625;display:flex}.lTRlka_warnRow{color:var(--dsw-alias-state-warn-primary);align-items:flex-start;gap:4px;display:flex}.lTRlka_warnIcon{flex:none;margin-top:2px}.lTRlka_runFold{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}.lTRlka_runSummary{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none;align-items:center;gap:6px;padding:6px 0;font-size:10px;font-weight:600;list-style:none;display:flex}.lTRlka_runSummary::-webkit-details-marker{display:none}.lTRlka_runSummaryNote{text-transform:none;letter-spacing:normal;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:400}.lTRlka_runBody{flex-direction:column;gap:8px;padding-bottom:10px;display:flex}.lTRlka_panel{flex:none}.lTRlka_rowsHead{align-items:baseline;gap:6px;padding-bottom:4px;display:flex}.lTRlka_rowsTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}.lTRlka_rowsHint{color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_focusHead{align-items:center;gap:8px;padding-bottom:6px;display:flex}.lTRlka_backBtn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;flex:none;align-items:center;gap:4px;padding:0 6px;font-size:10px;transition:color .15s,border-color .15s;display:flex}.lTRlka_backBtn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.lTRlka_focusTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);flex:none;font-size:10px;font-weight:600}.lTRlka_beatFlag{color:var(--dsw-alias-brand-primary);flex:none;font-size:9px}.lTRlka_compactList{flex-direction:column;gap:4px;display:flex}.lTRlka_focusList{flex-direction:column;gap:8px;display:flex}.lTRlka_callRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;border-radius:6px;align-items:center;gap:8px;width:100%;padding:6px 8px;transition:border-color .15s,background-color .15s;display:flex}.lTRlka_callRow:hover{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent)}.lTRlka_callIdx{text-transform:uppercase;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.lTRlka_excerpt{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:10px;overflow:hidden}.lTRlka_excerptFull{color:var(--dsw-alias-label-primary)}.lTRlka_excerptEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.lTRlka_beatCount{border:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);border-radius:6px;flex:none;padding:0 4px;font-size:8px}.lTRlka_knobBadge{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);text-transform:uppercase;color:var(--dsw-alias-brand-primary);border-radius:6px;flex:none;padding:0 4px;font-size:8px;font-weight:600}.lTRlka_callDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.lTRlka_kfPanel{border-top:1px solid var(--dsw-alias-border-l1);margin-top:8px;padding-top:6px}.lTRlka_kfHead{align-items:baseline;gap:6px;padding-bottom:4px;display:flex}.lTRlka_kfTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:600}.lTRlka_kfHint{color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_kfList{flex-direction:column;gap:4px;display:flex}.lTRlka_kfRow{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:8px;padding:4px 8px;display:flex}.lTRlka_kfKind{text-transform:uppercase;letter-spacing:.06em;border-radius:6px;padding:2px 6px;font-size:9px;font-weight:600}.lTRlka_kfTime{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.lTRlka_kfDel{width:20px;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;transition:background-color .15s,color .15s;display:flex}.lTRlka_kfDel:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.lTRlka_textIn{flex:1;min-width:0;display:inline-flex}.lTRlka_textIn>input,.lTRlka_guideIn>input,.lTRlka_srcIn>input,.lTRlka_prevNum>input,.lTRlka_kfIn>input{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:2px 6px;font-size:10px;line-height:1.5}.lTRlka_textIn>input:focus,.lTRlka_guideIn>input:focus,.lTRlka_srcIn>input:focus,.lTRlka_prevNum>input:focus,.lTRlka_kfIn>input:focus{border-color:var(--dsw-alias-brand-primary)}.lTRlka_textInEmpty>input,.lTRlka_guideInEmpty>input{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);color:var(--dsw-alias-state-warn-primary)}.lTRlka_textInEmpty>input::placeholder,.lTRlka_guideInEmpty>input::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.lTRlka_textInEmpty>input:focus,.lTRlka_guideInEmpty>input:focus{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 70%, transparent)}.lTRlka_kfIn{flex:1;min-width:0;display:inline-flex}.lTRlka_kfIn>input::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.lTRlka_callCard{padding:6px 2px;transition:background-color .15s}.lTRlka_callCardSel{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent);outline:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}.lTRlka_cardHead{align-items:center;gap:8px;padding-bottom:4px;display:flex}.lTRlka_cardId{text-transform:uppercase;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.lTRlka_cardSpan{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.lTRlka_knobTag{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);border-radius:6px;flex:none;padding:1px 4px;font-size:8px;font-weight:600}.lTRlka_delBtn{border:1px solid var(--dsw-alias-border-l2);text-transform:uppercase;letter-spacing:.06em;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-radius:6px;flex:none;align-items:center;gap:4px;margin-left:auto;padding:0 6px;font-size:9px;transition:border-color .15s,background-color .15s,color .15s;display:flex}.lTRlka_delBtn:hover{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 60%, transparent);background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.lTRlka_spanRow{align-items:center;gap:6px;padding:4px 0;display:flex}.lTRlka_spanLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_spanDash,.lTRlka_spanNote{color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_framesRow{align-items:stretch;gap:8px;display:flex}.lTRlka_refBadgeRow{align-items:center;gap:6px;display:flex}.lTRlka_refBadge{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);font-variant-numeric:tabular-nums;border-radius:6px;flex:none;padding:1px 4px;font-size:9px}.lTRlka_refBadgeOk{color:var(--dsw-alias-brand-primary)}.lTRlka_refBadgeOver{color:var(--dsw-alias-state-warn-primary)}.lTRlka_guidesRow{align-items:center;gap:8px;display:flex}.lTRlka_guideWrap{flex:none;position:relative}.lTRlka_guideDot{pointer-events:none;z-index:10;width:6px;height:6px;position:absolute;top:50%;left:6px;transform:translateY(-50%)rotate(45deg)}.lTRlka_guideIn{flex:none;width:7rem;display:inline-flex}.lTRlka_guideIn>input{padding-left:16px;padding-right:6px}.lTRlka_guideIn>input::placeholder{color:var(--dsw-alias-label-tertiary)}.lTRlka_guideInEmpty>input{border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}.lTRlka_guideInEmpty>input:focus{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}.lTRlka_callRefs{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:6px}.lTRlka_callRefsHead{justify-content:space-between;align-items:baseline;display:flex}.lTRlka_callRefsTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.lTRlka_callRefsNote{color:var(--dsw-alias-label-tertiary);font-size:8px}.lTRlka_callRefsBody{flex-direction:column;gap:4px;margin-top:4px;display:flex}.lTRlka_callRefsFoot{color:var(--dsw-alias-label-tertiary);font-size:8px}.lTRlka_knobFold{margin-top:4px}.lTRlka_knobSummary{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);cursor:pointer;user-select:none;align-items:center;gap:4px;font-size:9px;font-weight:600;list-style:none;display:flex}.lTRlka_knobSummary::-webkit-details-marker{display:none}.lTRlka_knobSummary:hover{color:var(--dsw-alias-label-secondary)}.lTRlka_knobCount{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);color:var(--dsw-alias-brand-primary);border-radius:6px;padding:0 4px;font-size:8px}.lTRlka_knobGrid{border-top:1px solid var(--dsw-alias-border-l1);grid-template-columns:1fr 1fr;gap:6px 16px;margin-top:4px;padding-top:6px;display:grid}.lTRlka_beatsWrap{flex-direction:column;gap:4px;display:flex}.lTRlka_beatsHead{align-items:center;gap:6px;display:flex}.lTRlka_beatsTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_beatsNote{color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_addSeg{border:1px solid var(--dsw-alias-border-l3);width:16px;height:16px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;flex:none;justify-content:center;align-items:center;margin-left:auto;font-size:10px;line-height:1;transition:border-color .15s,color .15s;display:flex}.lTRlka_addSeg:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.lTRlka_beatRow{border-radius:6px;align-items:center;gap:6px;transition:background-color .15s;display:flex}.lTRlka_beatRowSel{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);outline:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent)}.lTRlka_iconMini{width:16px;height:16px;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:9px;transition:background-color .15s,color .15s;display:flex}.lTRlka_iconMini:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)}.lTRlka_iconMini:disabled{opacity:.3}.lTRlka_iconMiniMut{color:var(--dsw-alias-label-tertiary)}.lTRlka_iconMiniMut:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.lTRlka_beatErr{color:var(--dsw-alias-state-error-primary);font-size:8px;line-height:1.25}.lTRlka_beatDash{color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_beatDel{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;transition:background-color .15s,color .15s;display:flex}.lTRlka_beatDel:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.lTRlka_textHead{justify-content:space-between;align-items:center;display:flex}.lTRlka_textLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px}.lTRlka_enhanceRow{align-items:center;gap:4px;display:flex}.lTRlka_enhanceBtn{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 4px;font-size:9px;font-weight:500;transition:background-color .15s}.lTRlka_enhanceBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)}.lTRlka_enhanceBtn:disabled{opacity:.3}.lTRlka_undoBtn{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 4px;font-size:9px;transition:background-color .15s,color .15s}.lTRlka_undoBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.lTRlka_promptBox{resize:vertical;border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);width:100%;height:auto;min-height:2.25rem;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:4px 8px;font-size:11px;line-height:1.5}.lTRlka_promptBox::placeholder{color:var(--dsw-alias-label-tertiary)}.lTRlka_promptBox:focus{border-color:var(--dsw-alias-brand-primary)}.lTRlka_promptBoxEmpty{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);color:var(--dsw-alias-state-warn-primary)}.lTRlka_promptBoxEmpty::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.lTRlka_promptBoxEmpty:focus{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 70%, transparent)}.lTRlka_addSegText{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0;font-size:9px;font-weight:500;transition:color .15s}.lTRlka_addSegText:hover{color:var(--dsw-alias-brand-primary)}.lTRlka_sub{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.lTRlka_subHead{align-items:baseline;gap:6px;display:flex}.lTRlka_subTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.lTRlka_subHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:8px;overflow:hidden}.lTRlka_subRow{align-items:center;gap:6px;display:flex}.lTRlka_linkBtn{background:var(--dsw-alias-bg-layer-1);width:16px;height:16px;color:var(--dsw-alias-brand-primary);cursor:pointer;border:none;border-radius:6px;justify-content:center;align-items:center;padding:0;display:flex}.lTRlka_linkBtn:hover{opacity:.8}.lTRlka_srcIn{flex:1;min-width:0;display:inline-flex}.lTRlka_srcIn>input{font-size:10px}.lTRlka_srcIn>input::placeholder{color:var(--dsw-alias-label-tertiary);font-family:sans-serif}.lTRlka_fileErr{color:var(--dsw-alias-state-error-primary);font-size:8px;line-height:1.25}.lTRlka_linkPanel{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);box-shadow:0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);border-radius:6px;padding:4px}.lTRlka_linkHead{justify-content:space-between;align-items:center;padding:0 4px 2px;display:flex}.lTRlka_linkTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:8px;font-weight:600}.lTRlka_linkClose{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;display:inline-flex}.lTRlka_linkClose:hover{color:var(--dsw-alias-label-primary)}.lTRlka_linkList{max-height:9rem;overflow-y:auto}.lTRlka_linkRow{text-align:left;cursor:pointer;background:0 0;border:none;border-radius:6px;align-items:center;gap:6px;width:100%;padding:2px 4px;transition:background-color .15s;display:flex}.lTRlka_linkRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.lTRlka_linkThumb{border:1px solid var(--dsw-alias-border-l2);object-fit:cover;border-radius:6px;flex:none;width:24px;height:24px}.lTRlka_linkNameWrap{flex:1;min-width:0}.lTRlka_linkName{text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-primary);font-size:9px;display:block;overflow:hidden}.lTRlka_linkSub{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:8px;display:block;overflow:hidden}.lTRlka_linkEmpty{color:var(--dsw-alias-label-tertiary);padding:4px;font-size:8px;line-height:1.5;display:block}.lTRlka_seamRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:4px;font-size:10px;line-height:1.25;display:flex}.lTRlka_seamLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);flex:none}.lTRlka_prevLabel{flex-wrap:wrap;align-items:center;gap:4px;font-size:10px;line-height:1.25;display:flex}.lTRlka_prevLabelOn{color:var(--dsw-alias-label-secondary)}.lTRlka_prevLabelOff{cursor:not-allowed;color:var(--dsw-alias-label-tertiary)}.lTRlka_prevNum{flex:none;width:3rem;display:inline-flex}.lTRlka_prevNum>input{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);text-align:center;width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:1px 4px;font-size:10px}.lTRlka_prevNum9>input{font-size:9px}.lTRlka_prevNum>input:focus{border-color:var(--dsw-alias-brand-primary)}.lTRlka_prevCarryNote{width:100%;color:color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, var(--dsw-alias-label-tertiary));font-size:8px}.lTRlka_prevNote{width:100%;color:var(--dsw-alias-label-tertiary);font-size:8px}.lTRlka_refRow{flex-direction:column;gap:2px;display:flex}.lTRlka_refHead{justify-content:space-between;align-items:baseline;display:flex}.lTRlka_refLabel{color:var(--dsw-alias-label-secondary);font-size:9px}.lTRlka_refCount{font-variant-numeric:tabular-nums;font-size:8px}.lTRlka_refCountOk{color:var(--dsw-alias-label-tertiary)}.lTRlka_refCountOver{color:var(--dsw-alias-state-warn-primary)}.lTRlka_chips{flex-wrap:wrap;gap:4px;display:flex}.lTRlka_chip{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);max-width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-primary);border-radius:6px;align-items:center;gap:4px;padding:1px 4px;font-size:9px;display:inline-flex}.lTRlka_chipX{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:2px;padding:1px;display:inline-flex}.lTRlka_chipX:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.lTRlka_pickRow{align-items:center;gap:4px;display:flex}.lTRlka_pickSel{flex:1;min-width:0}.lTRlka_pickSelBoxOk{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);min-width:0;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;flex:1;padding:2px 4px;font-size:9px}.lTRlka_pickSelBoxOk:focus{border-color:var(--dsw-alias-brand-primary)}.lTRlka_pickSelBoxEmpty{border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);min-width:0;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-tertiary);border-radius:6px;outline:none;flex:1;padding:2px 4px;font-size:9px}.lTRlka_uploadBtn{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;align-items:center;gap:4px;padding:2px 6px;font-size:9px;transition:border-color .15s,color .15s;display:inline-flex}.lTRlka_uploadBtn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}.lTRlka_group{flex-direction:column;gap:6px;display:flex}.lTRlka_groupTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.lTRlka_winSize{align-items:center;gap:4px;display:flex}.lTRlka_times{color:var(--dsw-alias-label-tertiary)}.lTRlka_clipsRow{align-items:center;gap:8px;display:flex}.lTRlka_clipsTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:10px;font-weight:600}.lTRlka_uploadAudio{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));cursor:pointer;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:500;transition:border-color .15s,background-color .15s}.lTRlka_uploadAudio:hover{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent)}.lTRlka_clipsNote{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;font-size:10px;overflow:hidden}.lTRlka_refsHead{justify-content:space-between;align-items:baseline;display:flex}.lTRlka_refsNote{color:var(--dsw-alias-label-tertiary);font-size:8px}.lTRlka_filmBox{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;flex-direction:column;flex:1;min-height:0;padding:8px 10px;display:flex}.lTRlka_histRow{flex-wrap:wrap;flex:none;align-items:center;gap:4px;padding-bottom:6px;display:flex}.lTRlka_histTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.lTRlka_histChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 6px;font-size:9px;text-decoration:none;transition:border-color .15s,color .15s}.lTRlka_histChip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.lTRlka_heroRow{flex:1;align-items:center;gap:8px;min-height:0;padding-bottom:4px;display:flex;overflow-x:auto}.lTRlka_finalCut{border:1px solid var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent);min-width:0;height:100%;box-shadow:0 0 18px -6px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);border-radius:6px;flex-direction:column;flex:1;gap:4px;padding:6px;display:flex}.lTRlka_player{background:color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);border-radius:6px;flex:1;width:100%;min-height:0}.lTRlka_cutBar{align-items:center;gap:4px;padding:0 2px;display:flex}.lTRlka_cutIcon{width:12px;height:12px;color:var(--dsw-alias-brand-primary);flex:none}.lTRlka_cutTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:500}.lTRlka_cutTime{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin-left:4px;font-size:9px}.lTRlka_cutOpen{color:var(--dsw-alias-brand-primary);text-underline-offset:2px;margin-left:auto;font-size:9px}.lTRlka_cutOpen:hover{text-decoration:underline}.lTRlka_winTile{border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;flex-direction:column;flex:none;gap:4px;width:9rem;height:100%;padding:6px;transition:border-color .15s;display:flex}.lTRlka_winTile:hover{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}.lTRlka_winVid{background:color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);object-fit:cover;border-radius:6px;flex:1;width:100%;min-height:0}.lTRlka_winName{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);padding:0 2px;font-size:9px;overflow:hidden}.lTRlka_emptyIcon{color:var(--dsw-alias-label-tertiary)}.lTRlka_emptyGlyph{width:20px;height:20px;color:var(--dsw-alias-label-tertiary)}";
		const tagId$2 = "@melite/video-h3-timeline/studio.module.css@f8a13834";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var studio_module_css_default = {
			"addSeg": "lTRlka_addSeg",
			"addSegText": "lTRlka_addSegText",
			"alignC": "lTRlka_alignC",
			"alignR": "lTRlka_alignR",
			"backBtn": "lTRlka_backBtn",
			"beatCount": "lTRlka_beatCount",
			"beatDash": "lTRlka_beatDash",
			"beatDel": "lTRlka_beatDel",
			"beatErr": "lTRlka_beatErr",
			"beatFlag": "lTRlka_beatFlag",
			"beatRow": "lTRlka_beatRow",
			"beatRowSel": "lTRlka_beatRowSel",
			"beatsHead": "lTRlka_beatsHead",
			"beatsNote": "lTRlka_beatsNote",
			"beatsTitle": "lTRlka_beatsTitle",
			"beatsWrap": "lTRlka_beatsWrap",
			"callCard": "lTRlka_callCard",
			"callCardSel": "lTRlka_callCardSel",
			"callDur": "lTRlka_callDur",
			"callIdx": "lTRlka_callIdx",
			"callRefs": "lTRlka_callRefs",
			"callRefsBody": "lTRlka_callRefsBody",
			"callRefsFoot": "lTRlka_callRefsFoot",
			"callRefsHead": "lTRlka_callRefsHead",
			"callRefsNote": "lTRlka_callRefsNote",
			"callRefsTitle": "lTRlka_callRefsTitle",
			"callRow": "lTRlka_callRow",
			"cardHead": "lTRlka_cardHead",
			"cardId": "lTRlka_cardId",
			"cardSpan": "lTRlka_cardSpan",
			"chev": "lTRlka_chev",
			"chip": "lTRlka_chip",
			"chipX": "lTRlka_chipX",
			"chips": "lTRlka_chips",
			"clipsNote": "lTRlka_clipsNote",
			"clipsRow": "lTRlka_clipsRow",
			"clipsTitle": "lTRlka_clipsTitle",
			"compactList": "lTRlka_compactList",
			"ctlGap3": "lTRlka_ctlGap3",
			"ctlInput": "lTRlka_ctlInput",
			"ctlInputSm": "lTRlka_ctlInputSm",
			"ctlRow": "lTRlka_ctlRow",
			"ctlRowSm": "lTRlka_ctlRowSm",
			"ctlSelect": "lTRlka_ctlSelect",
			"cutBar": "lTRlka_cutBar",
			"cutIcon": "lTRlka_cutIcon",
			"cutOpen": "lTRlka_cutOpen",
			"cutTime": "lTRlka_cutTime",
			"cutTitle": "lTRlka_cutTitle",
			"delBtn": "lTRlka_delBtn",
			"docBlock": "lTRlka_docBlock",
			"docLines": "lTRlka_docLines",
			"emptyGlyph": "lTRlka_emptyGlyph",
			"emptyHint": "lTRlka_emptyHint",
			"emptyIcon": "lTRlka_emptyIcon",
			"emptyOverlay": "lTRlka_emptyOverlay",
			"emptyPane": "lTRlka_emptyPane",
			"emptyTitle": "lTRlka_emptyTitle",
			"enhanceBtn": "lTRlka_enhanceBtn",
			"enhanceRow": "lTRlka_enhanceRow",
			"excerpt": "lTRlka_excerpt",
			"excerptEmpty": "lTRlka_excerptEmpty",
			"excerptFull": "lTRlka_excerptFull",
			"fileErr": "lTRlka_fileErr",
			"filmBox": "lTRlka_filmBox",
			"finalCut": "lTRlka_finalCut",
			"focusHead": "lTRlka_focusHead",
			"focusList": "lTRlka_focusList",
			"focusTitle": "lTRlka_focusTitle",
			"framesRow": "lTRlka_framesRow",
			"group": "lTRlka_group",
			"groupTitle": "lTRlka_groupTitle",
			"guideDot": "lTRlka_guideDot",
			"guideIn": "lTRlka_guideIn",
			"guideInEmpty": "lTRlka_guideInEmpty",
			"guideWrap": "lTRlka_guideWrap",
			"guidesRow": "lTRlka_guidesRow",
			"heroRow": "lTRlka_heroRow",
			"hiddenInput": "lTRlka_hiddenInput",
			"histChip": "lTRlka_histChip",
			"histRow": "lTRlka_histRow",
			"histTitle": "lTRlka_histTitle",
			"iconMini": "lTRlka_iconMini",
			"iconMiniMut": "lTRlka_iconMiniMut",
			"kfDel": "lTRlka_kfDel",
			"kfHead": "lTRlka_kfHead",
			"kfHint": "lTRlka_kfHint",
			"kfIn": "lTRlka_kfIn",
			"kfKind": "lTRlka_kfKind",
			"kfList": "lTRlka_kfList",
			"kfPanel": "lTRlka_kfPanel",
			"kfRow": "lTRlka_kfRow",
			"kfTime": "lTRlka_kfTime",
			"kfTitle": "lTRlka_kfTitle",
			"knobBadge": "lTRlka_knobBadge",
			"knobCount": "lTRlka_knobCount",
			"knobFold": "lTRlka_knobFold",
			"knobGrid": "lTRlka_knobGrid",
			"knobSummary": "lTRlka_knobSummary",
			"knobTag": "lTRlka_knobTag",
			"linkBtn": "lTRlka_linkBtn",
			"linkClose": "lTRlka_linkClose",
			"linkEmpty": "lTRlka_linkEmpty",
			"linkHead": "lTRlka_linkHead",
			"linkList": "lTRlka_linkList",
			"linkName": "lTRlka_linkName",
			"linkNameWrap": "lTRlka_linkNameWrap",
			"linkPanel": "lTRlka_linkPanel",
			"linkRow": "lTRlka_linkRow",
			"linkSub": "lTRlka_linkSub",
			"linkThumb": "lTRlka_linkThumb",
			"linkTitle": "lTRlka_linkTitle",
			"mono": "lTRlka_mono",
			"nowrap": "lTRlka_nowrap",
			"paneHeaderPreview": "lTRlka_paneHeaderPreview",
			"paneHeaderStrip": "lTRlka_paneHeaderStrip",
			"paneHint": "lTRlka_paneHint",
			"paneMeta": "lTRlka_paneMeta",
			"paneMetaNum": "lTRlka_paneMetaNum",
			"paneShell": "lTRlka_paneShell",
			"paneTitle": "lTRlka_paneTitle",
			"panel": "lTRlka_panel",
			"pickRow": "lTRlka_pickRow",
			"pickSel": "lTRlka_pickSel",
			"pickSelBoxEmpty": "lTRlka_pickSelBoxEmpty",
			"pickSelBoxOk": "lTRlka_pickSelBoxOk",
			"player": "lTRlka_player",
			"prevCarryNote": "lTRlka_prevCarryNote",
			"prevLabel": "lTRlka_prevLabel",
			"prevLabelOff": "lTRlka_prevLabelOff",
			"prevLabelOn": "lTRlka_prevLabelOn",
			"prevNote": "lTRlka_prevNote",
			"prevNum": "lTRlka_prevNum",
			"prevNum9": "lTRlka_prevNum9",
			"promptBox": "lTRlka_promptBox",
			"promptBoxEmpty": "lTRlka_promptBoxEmpty",
			"railCol": "lTRlka_railCol",
			"refBadge": "lTRlka_refBadge",
			"refBadgeOk": "lTRlka_refBadgeOk",
			"refBadgeOver": "lTRlka_refBadgeOver",
			"refBadgeRow": "lTRlka_refBadgeRow",
			"refCount": "lTRlka_refCount",
			"refCountOk": "lTRlka_refCountOk",
			"refCountOver": "lTRlka_refCountOver",
			"refHead": "lTRlka_refHead",
			"refLabel": "lTRlka_refLabel",
			"refRow": "lTRlka_refRow",
			"refsHead": "lTRlka_refsHead",
			"refsNote": "lTRlka_refsNote",
			"rowsHead": "lTRlka_rowsHead",
			"rowsHint": "lTRlka_rowsHint",
			"rowsTitle": "lTRlka_rowsTitle",
			"runBody": "lTRlka_runBody",
			"runFold": "lTRlka_runFold",
			"runSummary": "lTRlka_runSummary",
			"runSummaryNote": "lTRlka_runSummaryNote",
			"seamLabel": "lTRlka_seamLabel",
			"seamRow": "lTRlka_seamRow",
			"sectionLabel": "lTRlka_sectionLabel",
			"sectionLabelTail": "lTRlka_sectionLabelTail",
			"sectionLabelText": "lTRlka_sectionLabelText",
			"selMenu": "lTRlka_selMenu",
			"selMenuBox": "lTRlka_selMenuBox",
			"shell": "lTRlka_shell",
			"shellError": "lTRlka_shellError",
			"shellErrors": "lTRlka_shellErrors",
			"slider": "lTRlka_slider",
			"sliderReadout": "lTRlka_sliderReadout",
			"sliderWrap": "lTRlka_sliderWrap",
			"spanDash": "lTRlka_spanDash",
			"spanLabel": "lTRlka_spanLabel",
			"spanNote": "lTRlka_spanNote",
			"spanRow": "lTRlka_spanRow",
			"srcIn": "lTRlka_srcIn",
			"studioRoot": "lTRlka_studioRoot",
			"sub": "lTRlka_sub",
			"subHead": "lTRlka_subHead",
			"subHint": "lTRlka_subHint",
			"subRow": "lTRlka_subRow",
			"subTitle": "lTRlka_subTitle",
			"sz10": "lTRlka_sz10",
			"sz12": "lTRlka_sz12",
			"sz20": "lTRlka_sz20",
			"sz8": "lTRlka_sz8",
			"tabular": "lTRlka_tabular",
			"textHead": "lTRlka_textHead",
			"textIn": "lTRlka_textIn",
			"textInEmpty": "lTRlka_textInEmpty",
			"textLabel": "lTRlka_textLabel",
			"times": "lTRlka_times",
			"tipAnchor": "lTRlka_tipAnchor",
			"truncate": "lTRlka_truncate",
			"undoBtn": "lTRlka_undoBtn",
			"uploadAudio": "lTRlka_uploadAudio",
			"uploadBtn": "lTRlka_uploadBtn",
			"w12": "lTRlka_w12",
			"w14": "lTRlka_w14",
			"w16": "lTRlka_w16",
			"w24": "lTRlka_w24",
			"w28": "lTRlka_w28",
			"w32": "lTRlka_w32",
			"w36": "lTRlka_w36",
			"w40": "lTRlka_w40",
			"w45": "lTRlka_w45",
			"wFull": "lTRlka_wFull",
			"warnIcon": "lTRlka_warnIcon",
			"warnRow": "lTRlka_warnRow",
			"winName": "lTRlka_winName",
			"winSize": "lTRlka_winSize",
			"winTile": "lTRlka_winTile",
			"winVid": "lTRlka_winVid"
		};
		//#endregion
		//#region \0dsh-css:card-base/src/card.module.css.mjs
		const css$1 = ".FRpSCG_specForm :where(input,textarea,select,button){box-sizing:border-box}.FRpSCG_specForm{flex-direction:column;gap:12px;display:flex}.FRpSCG_specGroup{flex-direction:column;gap:8px;display:flex}.FRpSCG_modelAxes{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;display:grid}.FRpSCG_modelAxes .FRpSCG_specGroupTitle{grid-column:1/-1;margin-bottom:0}.FRpSCG_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.FRpSCG_specField{flex-direction:column;gap:6px;display:flex}.FRpSCG_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.FRpSCG_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.FRpSCG_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.FRpSCG_specSelect option{color:#0f1115;background:#fff}.FRpSCG_specSelect{color-scheme:light;background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.FRpSCG_specSliderRow{align-items:center;gap:8px;display:flex}.FRpSCG_specSlider{flex:1}.FRpSCG_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.FRpSCG_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.FRpSCG_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.FRpSCG_squareOff{opacity:.5;pointer-events:none}.FRpSCG_squareBox{border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.FRpSCG_squareOver{border-color:var(--dsw-alias-border-l3,#00000047);box-shadow:0 0 0 2px var(--dsw-alias-border-l1,#00000014)}.FRpSCG_squareThumb{object-fit:cover;width:100%;height:100%}.FRpSCG_squareGlyph{color:var(--dsw-alias-label-tertiary,#00000073)}.FRpSCG_squareX{background:var(--dsw-alias-bg-module,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.FRpSCG_squareLabel{color:var(--dsw-alias-label-primary,#0f1115);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.FRpSCG_squareMetric{color:var(--dsw-alias-label-tertiary,#00000073);font-size:10px;line-height:17px}.FRpSCG_squareFileInput{display:none}.FRpSCG_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.FRpSCG_modHead{align-items:baseline;gap:8px;display:flex}.FRpSCG_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.FRpSCG_modHint{opacity:.45;font-size:9px}.FRpSCG_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.FRpSCG_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.FRpSCG_modTile:active{cursor:grabbing}.FRpSCG_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.FRpSCG_modTileStrength{opacity:.55;font-size:9px}.FRpSCG_modAddSquare{border:1px dashed var(--dsw-alias-border-l3,#00000047);cursor:pointer;opacity:.7;height:64px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:8px;justify-content:center;align-items:center;width:64px;display:flex}.FRpSCG_modAddSquare:hover{background:var(--dsw-alias-interactive-bg-hover,#0000000d);border-color:var(--dsw-alias-border-l4,#0006);opacity:1}.FRpSCG_tileDragging{opacity:.5}.FRpSCG_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.FRpSCG_modLeafFields{gap:8px;display:grid}.FRpSCG_modLeafActions{gap:8px;display:flex}.FRpSCG_modField{flex-direction:column;gap:4px;font-size:11px;display:flex}.FRpSCG_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#8080800f);color:inherit;border-radius:6px;padding:6px 8px;font-size:12px}.FRpSCG_modLeafError{color:#e06c5f;margin:0;font-size:11px}.FRpSCG_pickList{flex-direction:column;gap:4px;max-height:60vh;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.FRpSCG_pickRow{display:block}.FRpSCG_pickBtn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:6px;align-items:center;gap:10px;width:100%;padding:6px;display:flex}.FRpSCG_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4)}.FRpSCG_pickThumb{object-fit:cover;border-radius:4px;flex:none;width:40px;height:40px}.FRpSCG_pickGlyph{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;width:40px;height:40px;font-size:15px;font-weight:600;display:inline-flex}.FRpSCG_pickLabel{text-overflow:ellipsis;white-space:nowrap;font-size:13px;overflow:hidden}.FRpSCG_pickEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.FRpSCG_sourceRow{flex-direction:column;display:flex}.FRpSCG_specSlotRow{flex-wrap:wrap;align-items:flex-start;gap:8px;display:flex}.FRpSCG_specSlotCell{flex-direction:column;gap:4px;display:flex}.FRpSCG_inputRail{gap:10px}";
		const tagId$1 = "@melite/video-h3-timeline/card.module.css@c9c5974a";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
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
		const ASSET_DRAG_MIME$1 = "application/tech-noir-asset";
		/** THE "is this a thumbnail" rule (SlotSquare's, kept verbatim):
		*  data: images, blob: fresh-upload mirrors, and http(s)/root-relative
		*  artifact URLs. Every slot-shaped value renders the same way. */
		function isImageUrl$1(value) {
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
			const thumb = typeof value === "string" && isImageUrl$1(value) ? value : null;
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
				}, isImageUrl$1(c.url) ? (0, react.createElement)("img", {
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
				value: shown !== null && isImageUrl$1(shown) ? shown : null,
				metric: typeof props.value === "string" && props.value !== "" && !isImageUrl$1(props.value) ? props.value : void 0,
				...host !== void 0 ? host.verbs : {}
			}));
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
					value: shown !== null && isImageUrl$1(shown) ? shown : null,
					metric: typeof value === "string" && value !== "" && !isImageUrl$1(value) ? value : void 0,
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
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: String(value ?? ""),
				placeholder: f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label
			});
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
		//#region src/ui/studio/kit.tsx
		/**
		* h3-timeline studio kit — the DSH-pure replacement for the
		* shared-chrome pieces the studio consumed.
		*
		* WHAT LIVES HERE (and why):
		*   • DSH atoms are imported DIRECTLY at the call sites (Button,
		*     Input, Switch, Tooltip from
		*     @deepseek-ai/dsh-client-ui-primitives) — never re-exported
		*     through here.
		*   • Everything DSH ships NO atom for is ported here as native
		*     elements + the studio's own CSS module (studio.module.css):
		*     ControlRow / SectionLabel / NumberControl / TextControl /
		*     SelectControl / TriControl / CheckControl (the two-state
		*     boolean — DSH's Switch, the catalog's two-state atom) /
		*     SliderControl / SelectMenu (native <select>: the custom
		*     popover's keyboard/click-outside contract comes free) /
		*     [SlotSquare DELETED 2026-09-13 — the source-row law: every
		*     studio input rides @melite/card-base's SourceRow (one grammar,
		*     no exceptions); the bespoke slot + its lucide trio died] /
		*     EmptyState / PaneHeader / PaneShell / StudioShell (the
		*     STANDALONE variant — rail renders inline, no StudioRail
		*     portal; kept local deliberately, not the card-base shell) /
		*     defineShellDeclaration (the narrow ViewportKind/BarKind seam
		*     table — h3's own vocabulary) / FilmPlayer (native <video
		*     controls> exposing the same FilmPlayerHandle) / Tip (DSH
		*     Tooltip over a layout-invisible anchor so React-18-ref-less
		*     DSH Buttons can carry bubbles without warnings).
		*   • Shared chrome (cn, readAsDataURL, glyphs) is imported from
		*     @melite/card-base — never re-declared here.
		*   • isImageUrl / ASSET_DRAG_MIME are the studio's own rules (the
		*     kit package itself is gone from this package).
		*/
		/** The w-* width vocabulary the width props name (call sites keep
		*  their historical strings; the map resolves them to real classes). */
		const WIDTHS = {
			"w-12": studio_module_css_default.w12,
			"w-14": studio_module_css_default.w14,
			"w-16": studio_module_css_default.w16,
			"w-24": studio_module_css_default.w24,
			"w-28": studio_module_css_default.w28,
			"w-32": studio_module_css_default.w32,
			"w-36": studio_module_css_default.w36,
			"w-40": studio_module_css_default.w40,
			"w-[4.5rem]": studio_module_css_default.w45,
			"w-full": studio_module_css_default.wFull
		};
		function widthClass(width) {
			return width === void 0 ? void 0 : WIDTHS[width];
		}
		/** THE "is this a thumbnail" rule for slot-shaped values. */
		function isImageUrl(value) {
			return /^data:image\//i.test(value) || /^blob:/i.test(value) || /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value);
		}
		function Tip$1({ tip, children }) {
			if (tip === void 0) return children;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: tip,
				side: "top",
				delayMs: 300,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.tipAnchor,
					children
				})
			});
		}
		function ControlRow({ label, hint, children, density = "md", className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: cn(density === "sm" ? studio_module_css_default.ctlRowSm : studio_module_css_default.ctlRow, className),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [label, hint != null ? hint : null] }), children]
			});
		}
		function SectionLabel({ children, tail, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cn(studio_module_css_default.sectionLabel, className),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.sectionLabelText,
					children
				}), tail != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.sectionLabelTail,
					children: tail
				}) : null]
			});
		}
		function NumberControl({ ariaLabel, value, onChange, min, max, step, placeholder = "inherit", align = "right", width = "w-24", disabled, title, testId, size = "md" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				type: "number",
				"aria-label": ariaLabel,
				min,
				max,
				step,
				disabled,
				title,
				"data-testid": testId,
				placeholder,
				value: typeof value === "number" ? value : "",
				onChange: (e) => {
					const n = Number(e.target.value);
					onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? void 0 : n);
				},
				className: cn(studio_module_css_default.ctlInput, size === "sm" && studio_module_css_default.ctlInputSm, widthClass(width), align === "right" ? studio_module_css_default.alignR : studio_module_css_default.alignC)
			});
		}
		function TextControl({ ariaLabel, value, onChange, placeholder = "inherit", width = "w-24", disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				type: "text",
				"aria-label": ariaLabel,
				disabled,
				placeholder,
				value: typeof value === "string" ? value : "",
				onChange: (e) => {
					const v = e.target.value.trim();
					onChange(v === "" ? void 0 : v);
				},
				className: cn(studio_module_css_default.ctlInput, studio_module_css_default.alignR, widthClass(width))
			});
		}
		function SelectControl({ ariaLabel, value, onChange, options, emptyLabel = "inherit", width = "w-full", disabled, title, testId, mono }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
				"aria-label": ariaLabel,
				disabled,
				title,
				"data-testid": testId,
				value: typeof value === "string" ? value : "",
				onChange: (e) => onChange(e.target.value === "" ? void 0 : e.target.value),
				className: cn(studio_module_css_default.ctlSelect, widthClass(width), mono && studio_module_css_default.mono),
				children: [emptyLabel !== false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
					value: "",
					children: emptyLabel
				}) : null, options.map((o) => {
					const opt = typeof o === "string" ? { value: o } : o;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: opt.value,
						children: opt.label ?? opt.value
					}, opt.value);
				})]
			});
		}
		function TriControl({ ariaLabel, value, onChange, width = "w-full", disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: cn(widthClass(width), "inline-block"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TriStateAtom, {
					label: ariaLabel,
					name: ariaLabel,
					value,
					disabled,
					onEdit: (_name, v) => {
						onChange(v === void 0 ? void 0 : v === true);
					}
				})
			});
		}
		function CheckControl({ ariaLabel, checked, onChange, disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
				label: ariaLabel,
				disabled,
				checked: checked === true,
				onChange
			});
		}
		function SliderControl({ ariaLabel, value, onChange, min, max, step, format, width = "w-24", disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: studio_module_css_default.sliderWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "range",
					"aria-label": ariaLabel,
					disabled,
					min,
					max,
					step,
					value,
					onChange: (e) => onChange(Number(e.target.value)),
					className: cn(widthClass(width), studio_module_css_default.slider)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.sliderReadout,
					children: format ? format(value) : value
				})]
			});
		}
		function SelectMenu({ value, options, onChange, className, buttonClassName, popoverClassName: _popoverClassName, disabled, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: cn(studio_module_css_default.selMenu, className),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					value,
					disabled,
					onChange: (e) => onChange(e.target.value),
					className: cn(studio_module_css_default.selMenuBox, buttonClassName),
					...rest,
					children: options.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: o.value,
						children: o.label
					}, o.value))
				})
			});
		}
		function EmptyState({ icon, title, hint, variant = "pane", className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "empty-state",
				"data-variant": variant,
				className: cn(variant === "overlay" ? studio_module_css_default.emptyOverlay : studio_module_css_default.emptyPane, className),
				children: [
					icon,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: studio_module_css_default.emptyTitle,
						children: title
					}),
					hint != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: studio_module_css_default.emptyHint,
						children: hint
					}) : null
				]
			});
		}
		function PaneHeader({ title, meta, hint, lead, variant = "strip", className }) {
			if (variant === "preview") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "pane-header",
				"data-variant": "preview",
				className: cn(studio_module_css_default.paneHeaderPreview, className),
				children: [
					lead,
					title != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.paneTitle,
						children: title
					}) : null,
					meta != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.paneMeta,
						children: meta
					}) : null,
					hint
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "pane-header",
				"data-variant": "strip",
				className: cn(studio_module_css_default.paneHeaderStrip, className),
				children: [
					lead,
					title != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.paneTitle,
						children: title
					}) : null,
					meta != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.paneMetaNum,
						children: meta
					}) : null,
					hint != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.paneHint,
						children: hint
					}) : null
				]
			});
		}
		function PaneShell({ children, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "pane-shell",
				className: cn(studio_module_css_default.paneShell, className),
				children
			});
		}
		const FilmPlayer = (0, react.forwardRef)(function FilmPlayer({ src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid }, ref) {
			const videoRef = (0, react.useRef)(null);
			const pendingSeekRef = (0, react.useRef)(null);
			const seekRafRef = (0, react.useRef)(null);
			const seekTo = (0, react.useCallback)((sec) => {
				pendingSeekRef.current = sec;
				if (seekRafRef.current != null) return;
				seekRafRef.current = requestAnimationFrame(() => {
					seekRafRef.current = null;
					const target = pendingSeekRef.current;
					pendingSeekRef.current = null;
					const el = videoRef.current;
					if (target == null || !el) return;
					const d = el.duration;
					el.currentTime = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(target, d) : target);
				});
			}, []);
			(0, react.useEffect)(() => () => {
				if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
			}, []);
			(0, react.useImperativeHandle)(ref, () => ({
				seekTo,
				current: () => videoRef.current?.currentTime ?? 0,
				duration: () => {
					const d = videoRef.current?.duration;
					return Number.isFinite(d) ? d ?? 0 : 0;
				},
				play: () => void videoRef.current?.play(),
				pause: () => void videoRef.current?.pause(),
				toggle: () => {
					const el = videoRef.current;
					if (!el) return;
					if (el.paused) el.play();
					else el.pause();
				}
			}), [seekTo]);
			const onTimeRef = (0, react.useRef)(onTime);
			onTimeRef.current = onTime;
			const handleTime = (0, react.useCallback)((t) => {
				onTimeRef.current?.(t);
			}, []);
			(0, react.useEffect)(() => {
				const id = window.setInterval(() => {
					const el = videoRef.current;
					if (!el || el.paused || el.ended) return;
					const t = el.currentTime;
					if (Number.isFinite(t) && t >= 0) onTimeRef.current?.(t);
				}, 250);
				return () => window.clearInterval(id);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
				ref: videoRef,
				className,
				"data-testid": tid,
				src,
				muted,
				loop,
				autoPlay,
				playsInline: true,
				preload: "metadata",
				controls: true,
				poster,
				onTimeUpdate: (e) => handleTime(e.currentTarget.currentTime),
				onPlay: () => onPlayingChange?.(true),
				onPause: () => onPlayingChange?.(false),
				onEnded: () => onEnded?.(),
				onLoadedMetadata: (e) => {
					const d = e.currentTarget.duration;
					if (Number.isFinite(d) && d > 0) onDuration?.(d);
				}
			});
		});
		//#endregion
		//#region src/ui/studio/StudioPreview.tsx
		/** Preview pane: final cut + window tiles + run history (lines 3928–4061).
		* Chrome rides the shared kit (2026-09-07): preview PaneHeader +
		* EmptyState (the aspirational TimelinePreview twin is deleted; this
		* pane is the one preview).
		*
		*  Behavior-neutral wiring (the ONLY edit in the whole split): the inline
		*  `onDuration={(sec) => setFilmDurSec(sec)}` is now the `onDuration` prop —
		*  the tenant passes the identical closure. The `running` prop is threaded
		*  explicitly (unlike the aspirational TimelinePreview sibling, which
		*  derives it from stage.status — that derivation can transiently disagree
		*  with the shell's live run flag, so this pane keeps the prop). */
		function StudioPreview({ stage, running, filmstrip, filmRef, filmMap, frameIdx, barTotal, fps, handleFilmTime, handlePlayingChange, onDuration }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "tl-filmstrip",
				className: studio_module_css_default.filmBox,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneHeader, {
						variant: "preview",
						title: "Preview",
						meta: running ? "— filling as the run lands…" : filmstrip.windows.length ? "— from the last run (unchanged windows reuse on re-run)" : "— run compiles the calls into windows; each renders once, seams chained"
					}),
					(() => {
						const hist = (stage.result?.metadata)?.history;
						if (!hist?.length) return null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-testid": "tl-run-history",
							className: studio_module_css_default.histRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.histTitle,
								children: [
									"Runs (",
									hist.length,
									")"
								]
							}), hist.slice(0, 8).map((h, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
								href: h.video,
								target: "_blank",
								rel: "noreferrer",
								title: h.runId + " · " + (h.status ?? "?") + " · " + (h.durationSec ?? "?") + "s" + (h.at ? " · " + (/* @__PURE__ */ new Date(h.at * 1e3)).toLocaleString() : ""),
								className: studio_module_css_default.histChip,
								children: [
									h.status === "completed" ? "✓" : "×",
									" ",
									(h.runId ?? "run").replace(/^run-/, "").slice(0, 8),
									" · ",
									h.durationSec ?? "?",
									"s"
								]
							}, h.runId ?? i))]
						});
					})(),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.heroRow,
						children: [
							filmstrip.final && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-testid": "tl-final-cut",
								className: studio_module_css_default.finalCut,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilmPlayer, {
									ref: filmRef,
									src: filmstrip.final,
									className: studio_module_css_default.player,
									"data-testid": "tl-film-player",
									onTime: handleFilmTime,
									onPlayingChange: handlePlayingChange,
									onDuration
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: studio_module_css_default.cutBar,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Clapperboard, {
											className: studio_module_css_default.cutIcon,
											"aria-hidden": true
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: studio_module_css_default.cutTitle,
											children: "Final cut"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: studio_module_css_default.cutTime,
											children: [
												(frameIdx / (filmMap?.fps ?? (fps || 24))).toFixed(2),
												"s · frame ",
												frameIdx,
												"/",
												barTotal
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
											href: filmstrip.final,
											target: "_blank",
											rel: "noreferrer",
											className: studio_module_css_default.cutOpen,
											children: "open"
										})
									]
								})]
							}),
							!filmstrip.final && filmstrip.windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-testid": "tl-window-tile",
								"data-window": w.name,
								title: w.name,
								className: studio_module_css_default.winTile,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
									src: w.url,
									muted: true,
									playsInline: true,
									preload: "metadata",
									controls: true,
									className: studio_module_css_default.winVid
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.winName,
									title: w.name,
									children: /_w(\d+)_/.exec(w.name)?.[1] != null ? `window ${/_w(\d+)_/.exec(w.name)[1]}` : w.name
								})]
							}, w.name)),
							!filmstrip.windows.length && !filmstrip.final && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, {
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Clapperboard, {
									className: studio_module_css_default.emptyGlyph,
									"aria-hidden": true
								}),
								title: "No render yet — author the calls below, then Run.",
								hint: "Each window renders once; unchanged windows reuse across retakes."
							})
						]
					})
				]
			}) });
		}
		//#endregion
		//#region ../../web-kit/timeline/timeline/icons.tsx
		function base$1(name, className) {
			return {
				xmlns: "http://www.w3.org/2000/svg",
				width: 24,
				height: 24,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true,
				className: [
					"lucide",
					`lucide-${name}`,
					className
				].filter(Boolean).join(" ")
			};
		}
		function Film({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("film", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						width: "18",
						height: "18",
						x: "3",
						y: "3",
						rx: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 3v18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 7.5h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12h18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 16.5h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3v18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 7.5h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 16.5h4" })
				]
			});
		}
		function Image$1({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("image", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						width: "18",
						height: "18",
						x: "3",
						y: "3",
						rx: "2",
						ry: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "9",
						r: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" })
				]
			});
		}
		function ListMusic({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("list-music", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 5H3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11 12H3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11 19H3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 16V5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "18",
						cy: "16",
						r: "3"
					})
				]
			});
		}
		function Music({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("music", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 18V5l12-2v13" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "6",
						cy: "18",
						r: "3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "18",
						cy: "16",
						r: "3"
					})
				]
			});
		}
		function X({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("x", className),
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12" })]
			});
		}
		function ZoomIn({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("zoom-in", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "11",
						cy: "11",
						r: "8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "21",
						x2: "16.65",
						y1: "21",
						y2: "16.65"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "11",
						x2: "11",
						y1: "8",
						y2: "14"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "8",
						x2: "14",
						y1: "11",
						y2: "11"
					})
				]
			});
		}
		function ZoomOut({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("zoom-out", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "11",
						cy: "11",
						r: "8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "21",
						x2: "16.65",
						y1: "21",
						y2: "16.65"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "8",
						x2: "14",
						y1: "11",
						y2: "11"
					})
				]
			});
		}
		//#endregion
		//#region ../../web-kit/timeline/timeline/viser-timeline/motionTimelineState.ts
		const MOTION_TIMELINE_TRACKS = [
			{
				uuid: "fullbody",
				name: "Full-Body",
				track_type: "keyframe",
				color: [
					219,
					148,
					86
				],
				height_scale: .5
			},
			{
				uuid: "root2d",
				name: "2D Root",
				track_type: "keyframe",
				color: [
					150,
					100,
					200
				],
				height_scale: .5
			},
			{
				uuid: "left-hand",
				name: "Left Hand",
				track_type: "keyframe",
				color: [
					100,
					200,
					150
				],
				height_scale: .5
			},
			{
				uuid: "right-hand",
				name: "Right Hand",
				track_type: "keyframe",
				color: [
					200,
					100,
					150
				],
				height_scale: .5
			},
			{
				uuid: "left-foot",
				name: "Left Foot",
				track_type: "keyframe",
				color: [
					219,
					148,
					86
				],
				height_scale: .5
			},
			{
				uuid: "right-foot",
				name: "Right Foot",
				track_type: "keyframe",
				color: [
					150,
					100,
					200
				],
				height_scale: .5
			}
		];
		//#endregion
		//#region ../../web-kit/timeline/timeline/viser-timeline/styles.ts
		const PROMPT_COLORS = [
			[
				0,
				233,
				236
			],
			[
				239,
				68,
				68
			],
			[
				249,
				115,
				22
			],
			[
				234,
				179,
				8
			],
			[
				34,
				197,
				94
			],
			[
				59,
				130,
				246
			],
			[
				168,
				85,
				247
			],
			[
				236,
				72,
				153
			]
		];
		PROMPT_COLORS[0];
		//#endregion
		//#region ../../web-kit/timeline/timeline/tip.tsx
		const toTooltipSide = (side) => side === "left" ? "right" : side;
		function Tip({ tip, shortcut, side = "top", delayDuration = 300, className: _className, withArrow: _withArrow, children }) {
			if (tip === void 0) return children;
			const label = shortcut ? `${tip} (${shortcut})` : tip;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label,
				side: toTooltipSide(side),
				delayMs: delayDuration,
				children
			});
		}
		//#endregion
		//#region \0dsh-css:/home/user/Documents/programs/active/inference.cpp/packages/web-kit/timeline/timeline/timeline.module.css.mjs
		const css = ".E4_1PW_root{user-select:none;display:flex}.E4_1PW_gutter{border-right:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;display:flex}.E4_1PW_zoomRow{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:center;align-items:center;gap:2px;display:flex}.E4_1PW_zoomBtn{width:20px;height:20px;color:var(--dsw-alias-label-secondary);font-size:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}.E4_1PW_zoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary)}.E4_1PW_zoomBtn svg{width:14px;height:14px}.E4_1PW_zoomPct{min-width:32px;height:auto;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}.E4_1PW_zoomPct:hover{color:var(--dsw-alias-brand-primary)}.E4_1PW_laneHead,.E4_1PW_laneHeadBeats{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);align-items:center;gap:6px;padding:0 8px;display:flex}.E4_1PW_laneHead>svg,.E4_1PW_laneHeadBeats>svg{width:14px;height:14px;color:var(--dsw-alias-brand-primary);flex:none}.E4_1PW_laneHeadBeats>svg{color:var(--dsw-alias-brand-primary)}.E4_1PW_gutterLabel{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.E4_1PW_audioHead{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.E4_1PW_audioHead>svg{width:12px;height:12px;color:var(--dsw-alias-state-business-primary);flex:none}.E4_1PW_gutterLabelDim{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.E4_1PW_detachBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;padding:0;display:inline-flex}.E4_1PW_detachBtn:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.E4_1PW_detachBtn svg{width:10px;height:10px}.E4_1PW_laneRow{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.E4_1PW_laneRow:last-child{border-bottom:0}.E4_1PW_laneDot{border-radius:9999px;flex:none;width:6px;height:6px}.E4_1PW_laneName{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;overflow:hidden}.E4_1PW_contentWrap{flex:1;min-width:0;position:relative}.E4_1PW_scroller{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;height:100%;overflow:auto hidden}.E4_1PW_scroller::-webkit-scrollbar{height:8px}.E4_1PW_scroller::-webkit-scrollbar-track{background:0 0}.E4_1PW_scroller::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}.E4_1PW_content{position:relative}.E4_1PW_ruler{border-bottom:1px solid var(--dsw-alias-border-l2);cursor:ew-resize;touch-action:none;position:relative}.E4_1PW_tick{position:absolute;top:0;bottom:0}.E4_1PW_tickLine{background:var(--dsw-alias-border-l2);width:1px;height:100%}.E4_1PW_tickLabel{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;position:absolute;top:2px;left:4px}.E4_1PW_timecode{z-index:10;font-variant-numeric:tabular-nums;height:100%;color:var(--dsw-alias-brand-primary);align-items:center;padding-left:6px;padding-right:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;display:flex;position:sticky;left:0}.E4_1PW_promptsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.E4_1PW_canAdd{cursor:copy}.E4_1PW_emptyCenter{justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.E4_1PW_emptyHint{color:var(--dsw-alias-label-tertiary);font-size:10px}.E4_1PW_promptClip{touch-action:none;cursor:grab;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;position:absolute;top:4px;bottom:4px;overflow:hidden}.E4_1PW_promptClip:hover{border-color:var(--dsw-alias-border-l4)}.E4_1PW_clipSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);border-width:0}.E4_1PW_clipSelected:hover{border-color:var(--dsw-alias-brand-primary)}.E4_1PW_clipMoving{z-index:30;cursor:grabbing;border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 20px 25px -5px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent)}.E4_1PW_edgeL{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:0;bottom:0;left:0}.E4_1PW_edgeL:hover{background:var(--dsw-alias-interactive-bg-hover)}.E4_1PW_edgeDead{cursor:default;opacity:.35}.E4_1PW_edgeDead:hover{background:0 0}.E4_1PW_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.E4_1PW_promptClip:hover .E4_1PW_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.E4_1PW_seamDot{z-index:35;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:0;transform:translate(-50%,-50%)}.E4_1PW_edgeR{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:16px;bottom:0;right:0}.E4_1PW_edgeR:hover{background:var(--dsw-alias-interactive-bg-hover)}.E4_1PW_edgeWide{width:16px}.E4_1PW_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.E4_1PW_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent)}.E4_1PW_promptClip:hover .E4_1PW_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.E4_1PW_promptClip:hover .E4_1PW_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent)}.E4_1PW_clipEditor{background:color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);height:24px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);pointer-events:auto;border:none;border-radius:4px;align-items:center;padding:0 6px;display:inline-flex;position:absolute;top:50%;left:8px;right:8px;transform:translateY(-50%)}.E4_1PW_clipEditor input{width:100%;min-width:0;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;padding:0;font-size:11px;line-height:1.5}.E4_1PW_clipEditor input::placeholder{color:var(--dsw-alias-label-tertiary)}.E4_1PW_previewWrap{z-index:10;pointer-events:none;position:absolute;inset:0;overflow:hidden}.E4_1PW_previewVideo{object-fit:cover;opacity:.6;width:100%;height:100%;position:absolute;inset:0}.E4_1PW_scrim{background:linear-gradient(to top, color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent) 50%, color-mix(in srgb, var(--dsw-alias-bg-base) 10%, transparent));position:absolute;inset:0}.E4_1PW_clipTextCol{z-index:20;flex-direction:column;gap:2px;padding:0 12px 6px;display:flex;position:absolute;bottom:0;left:0;right:0}.E4_1PW_clipTextStack{z-index:10;pointer-events:none;flex-direction:column;justify-content:center;gap:2px;padding:0 12px;display:flex;position:absolute;inset:0}.E4_1PW_clipTitle{text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;overflow:hidden}.E4_1PW_clipEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.E4_1PW_clipDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:10px}.E4_1PW_knobDot{z-index:20;background:var(--dsw-alias-brand-primary);width:6px;height:6px;box-shadow:0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);pointer-events:none;border-radius:9999px;position:absolute;top:4px;right:6px}.E4_1PW_refAudioBadge{z-index:20;width:10px;height:10px;color:var(--dsw-alias-state-business-primary);pointer-events:none;position:absolute;top:12px;right:4px}.E4_1PW_refBadge{z-index:20;pointer-events:none;align-items:center;gap:1px;display:flex;position:absolute;top:22px;right:2px}.E4_1PW_refBadge svg{width:8px;height:8px;color:var(--dsw-alias-state-success-primary)}.E4_1PW_refCount{color:var(--dsw-alias-state-success-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;line-height:1}.E4_1PW_promptDelete{z-index:40;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:inline-flex;position:absolute;top:4px;right:4px}.E4_1PW_promptDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.E4_1PW_promptClip:hover .E4_1PW_promptDelete{opacity:1}.E4_1PW_promptDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.E4_1PW_beatsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.E4_1PW_beatsAdd{cursor:crosshair}.E4_1PW_beatsEmpty{align-items:center;padding-left:12px;display:flex;position:absolute;inset:0}.E4_1PW_hintLine{color:var(--dsw-alias-label-tertiary);font-size:10px}.E4_1PW_beatClip{border:1px solid var(--dsw-alias-border-l2);cursor:pointer;border-radius:6px;position:absolute;top:4px;bottom:4px;overflow:hidden}.E4_1PW_beatClip:hover{border-color:var(--dsw-alias-border-l4)}.E4_1PW_beatSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}.E4_1PW_beatSelected:hover{border-color:var(--dsw-alias-brand-primary)}.E4_1PW_beatLabel{color:var(--dsw-alias-label-secondary);pointer-events:none;align-items:center;padding:0 6px;font-size:10px;line-height:1.25;display:flex;position:absolute;inset:0}.E4_1PW_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.E4_1PW_beatEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.E4_1PW_audioLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.E4_1PW_audioClip{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);cursor:grab;touch-action:none;border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.E4_1PW_audioClip:active{cursor:grabbing}.E4_1PW_gainFill{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;position:absolute;bottom:0;left:0;right:0}.E4_1PW_audioClipLabel{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));pointer-events:none;align-items:center;padding:0 4px;font-size:9px;line-height:1;display:flex;position:absolute;inset:0;overflow:hidden}.E4_1PW_audioName{text-overflow:ellipsis;white-space:nowrap;font-weight:500;overflow:hidden}.E4_1PW_audioTime{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--dsw-alias-label-tertiary));flex:none;margin-left:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.E4_1PW_audioClipDelete{background:color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);width:14px;height:14px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:0 0 0 4px;justify-content:center;align-items:center;padding:0;display:none;position:absolute;top:0;right:0}.E4_1PW_audioClipDelete:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.E4_1PW_audioClip:hover .E4_1PW_audioClipDelete{display:flex}.E4_1PW_audioClipDelete svg{width:8px;height:8px}.E4_1PW_audioSlice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.E4_1PW_sliceLabel{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-secondary));pointer-events:none;justify-content:center;align-items:center;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;display:flex;position:absolute;inset:0;overflow:hidden}.E4_1PW_audioDrop{border:1px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.E4_1PW_dropHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);padding:0 8px;font-size:9px;overflow:hidden}.E4_1PW_kfLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.E4_1PW_kfLane:last-child{border-bottom:0}.E4_1PW_laneHint{color:var(--dsw-alias-label-tertiary);pointer-events:none;align-items:center;padding-left:12px;font-size:10px;display:flex;position:absolute;inset:0}.E4_1PW_kfWrap{position:absolute;top:0;bottom:0}.E4_1PW_kfBtn{cursor:grab;background:0 0;border:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:flex;position:absolute;top:50%;left:0;transform:translate(-50%,-50%)}.E4_1PW_kfBtn:active{cursor:grabbing;transform:translate(-50%)}.E4_1PW_kfDiamond{width:10px;height:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4);border:1px solid;display:block;transform:rotate(45deg)}.E4_1PW_kfMoving{transform:rotate(45deg)scale(1.25)}.E4_1PW_kfDelete{z-index:10;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:14px;height:14px;padding:0;display:inline-flex;position:absolute;top:0;left:6px}.E4_1PW_kfDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.E4_1PW_kfWrap:hover .E4_1PW_kfDelete{opacity:1}.E4_1PW_kfDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.E4_1PW_playhead{z-index:40;pointer-events:none;position:absolute;top:0;bottom:0}.E4_1PW_playheadCap{border:1px solid var(--dsw-alias-border-l4);border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:50%;transform:translate(-50%)}.E4_1PW_miniBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);width:20px;height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:13px;line-height:1;display:inline-flex}.E4_1PW_miniBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.E4_1PW_miniFitBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.E4_1PW_miniFitBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}";
		const tagId = "@melite/video-h3-timeline/timeline.module.css@da553c2a";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var timeline_module_css_default = {
			"audioClip": "E4_1PW_audioClip",
			"audioClipDelete": "E4_1PW_audioClipDelete",
			"audioClipLabel": "E4_1PW_audioClipLabel",
			"audioDrop": "E4_1PW_audioDrop",
			"audioHead": "E4_1PW_audioHead",
			"audioLane": "E4_1PW_audioLane",
			"audioName": "E4_1PW_audioName",
			"audioSlice": "E4_1PW_audioSlice",
			"audioTime": "E4_1PW_audioTime",
			"beatClip": "E4_1PW_beatClip",
			"beatEmpty": "E4_1PW_beatEmpty",
			"beatLabel": "E4_1PW_beatLabel",
			"beatSelected": "E4_1PW_beatSelected",
			"beatsAdd": "E4_1PW_beatsAdd",
			"beatsEmpty": "E4_1PW_beatsEmpty",
			"beatsLane": "E4_1PW_beatsLane",
			"canAdd": "E4_1PW_canAdd",
			"clipDur": "E4_1PW_clipDur",
			"clipEditor": "E4_1PW_clipEditor",
			"clipEmpty": "E4_1PW_clipEmpty",
			"clipMoving": "E4_1PW_clipMoving",
			"clipSelected": "E4_1PW_clipSelected",
			"clipTextCol": "E4_1PW_clipTextCol",
			"clipTextStack": "E4_1PW_clipTextStack",
			"clipTitle": "E4_1PW_clipTitle",
			"content": "E4_1PW_content",
			"contentWrap": "E4_1PW_contentWrap",
			"detachBtn": "E4_1PW_detachBtn",
			"dropHint": "E4_1PW_dropHint",
			"edgeDead": "E4_1PW_edgeDead",
			"edgeL": "E4_1PW_edgeL",
			"edgeR": "E4_1PW_edgeR",
			"edgeWide": "E4_1PW_edgeWide",
			"emptyCenter": "E4_1PW_emptyCenter",
			"emptyHint": "E4_1PW_emptyHint",
			"gainFill": "E4_1PW_gainFill",
			"gripPill": "E4_1PW_gripPill",
			"gripPillBright": "E4_1PW_gripPillBright",
			"gripPillR": "E4_1PW_gripPillR",
			"gutter": "E4_1PW_gutter",
			"gutterLabel": "E4_1PW_gutterLabel",
			"gutterLabelDim": "E4_1PW_gutterLabelDim",
			"hintLine": "E4_1PW_hintLine",
			"kfBtn": "E4_1PW_kfBtn",
			"kfDelete": "E4_1PW_kfDelete",
			"kfDiamond": "E4_1PW_kfDiamond",
			"kfLane": "E4_1PW_kfLane",
			"kfMoving": "E4_1PW_kfMoving",
			"kfWrap": "E4_1PW_kfWrap",
			"knobDot": "E4_1PW_knobDot",
			"laneDot": "E4_1PW_laneDot",
			"laneHead": "E4_1PW_laneHead",
			"laneHeadBeats": "E4_1PW_laneHeadBeats",
			"laneHint": "E4_1PW_laneHint",
			"laneName": "E4_1PW_laneName",
			"laneRow": "E4_1PW_laneRow",
			"miniBtn": "E4_1PW_miniBtn",
			"miniFitBtn": "E4_1PW_miniFitBtn",
			"playhead": "E4_1PW_playhead",
			"playheadCap": "E4_1PW_playheadCap",
			"previewVideo": "E4_1PW_previewVideo",
			"previewWrap": "E4_1PW_previewWrap",
			"promptClip": "E4_1PW_promptClip",
			"promptDelete": "E4_1PW_promptDelete",
			"promptsLane": "E4_1PW_promptsLane",
			"refAudioBadge": "E4_1PW_refAudioBadge",
			"refBadge": "E4_1PW_refBadge",
			"refCount": "E4_1PW_refCount",
			"root": "E4_1PW_root",
			"ruler": "E4_1PW_ruler",
			"scrim": "E4_1PW_scrim",
			"scroller": "E4_1PW_scroller",
			"seamDot": "E4_1PW_seamDot",
			"sliceLabel": "E4_1PW_sliceLabel",
			"tick": "E4_1PW_tick",
			"tickLabel": "E4_1PW_tickLabel",
			"tickLine": "E4_1PW_tickLine",
			"timecode": "E4_1PW_timecode",
			"truncate": "E4_1PW_truncate",
			"zoomBtn": "E4_1PW_zoomBtn",
			"zoomPct": "E4_1PW_zoomPct",
			"zoomRow": "E4_1PW_zoomRow"
		};
		//#endregion
		//#region ../../web-kit/timeline/timeline/MotionTimelineBar.tsx
		/**
		* MotionTimelineBar — the motion card's bar, pose-studio display model.
		*
		* 2026-08-14 rethink: the vendored viser Timeline (canvas-drawn, Kimodo
		* demo parity) is replaced by the LEGACY POSE STUDIO's interaction model —
		* DOM clips you can SEE and GRAB: prompt cards drag (body = move, edges =
		* resize), double-click to edit inline, hover-X to delete; keyframe lanes
		* with draggable diamonds. The user's words: "I could click and drag prompt
		* in the motion studio, was useful."
		*
		* Zoom + horizontal scroll (pose-studio parity, round 2): the bar DEFAULTS
		* to fit (every frame on screen — no hidden content), but −/%/+ zooms in;
		* past fit the content scrolls horizontally (native thin scrollbar, wheel,
		* trackpad, shift-wheel) while the label gutter stays pinned. Zooming is
		* ANCHORED to the playhead — the frame under the playhead stays put, the
		* rest grows around it.
		*
		* Pull-the-tail (2026-08-14, the "stuck at 5 seconds" fix): the end is not
		* a wall. Dragging the LAST prompt card's right edge past the end EXTENDS
		* the timeline (onExtend → the parent grows its envelope + duration_sec),
		* with auto-scroll following the cursor — the DaVinci Resolve rule that
		* the sequence is as long as its content. Non-last cards clamp as before.
		*
		* What stayed: ALL the state + persistence beneath (tlPrompts /
		* tlKeyframes / constraintPayloads in MotionCardEditor, constraints.ts
		* serialize/hydrate, MOTION_TIMELINE_TRACKS lane colors from the Kimodo
		* demo). This is a view-layer swap only — every prop is one of the
		* callbacks the viser Timeline used to receive.
		*
		* Video-timeline re-tenanting round 2 (2026-08-16, "the bar needs to be
		* TALLER, show the videos, and have a beats row UNDER the calls"): the
		* row heights grew (ruler 28 / prompts 36 — the video studio passes 64),
		* call clips render their WINDOW PREVIEW inside the clip (first frame at
		* rest, plays on hover — NLE strip behavior), and a Layer C BEATS row
		* sits under the calls: prompt segments within a call, clickable (the
		* sidebar edits them), never cut-bearers. Clicking a call OR beat clip
		* selects it (`onSelect`) — the tenant's sidebar populates that item's
		* inputs/options; the selected clip gets a ring (calls brand cyan, beats
		* cyan-300). A click on the EMPTY timeline deselects (`onSelect(null)`)
		* — the sidebar shifts back to its global mode; a real drag never
		* deselects (the post-pointerup synthetic click is suppressed).
		*
		* Theme: the DSH tokens (bg --dsw-alias-bg-layer-1, playhead
		* --dsw-alias-brand-primary), the 2026-09-13 color law. The palette is
		* themeable per mount (the 2026-09-07 styling seam: className/style on
		* the root, theme.{barBg,playhead} for the accents) — defaults render
		* byte-identical, so no tenant changes.
		*/
		const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
		const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
		/** Row heights (px): ruler, prompts, beats (Layer C), audio layers, keyframe lanes. */
		const RULER_H = 28;
		const PROMPTS_H = 36;
		const BEATS_H = 26;
		const AUDIO_H = 26;
		const LANE_H = 24;
		/** Label gutter width. (audit F5, 2026-09-02: 88 → 112 — the pinned
		* header row now carries the timecode positioning indicator beside the
		* zoom cluster, DaVinci-style; every gutter row shares the one const.) */
		const GUTTER_W = 112;
		/** Playhead accent — the DSH brand token. */
		const PLAYHEAD = "var(--dsw-alias-brand-primary)";
		/** Unified background for the timeline bar and its sticky timecode chip. */
		const BAR_BG = "var(--dsw-alias-bg-layer-1)";
		/** Zoom bounds: multiplier steps + the px-per-frame ceiling. */
		const ZOOM_STEP = 1.6;
		/** mm:ss:ff at the bar's axis fps — the DaVinci position readout
		* (2026-09-01 audit F5: the bar had NO position indicator; the only
		* readout lived under the player with a different fps divisor). */
		const fmtTimecode = (frame, fps) => {
			const f = Math.max(0, Math.round(frame));
			const safeFps = Math.max(1, Math.round(fps));
			const ff = f % safeFps;
			const totalSec = Math.floor(f / safeFps);
			const ss = totalSec % 60;
			const mm = Math.floor(totalSec / 60);
			const p = (n) => String(n).padStart(2, "0");
			return `${p(mm)}:${p(ss)}:${p(ff)}`;
		};
		/** Pointer travel (px) before a gesture counts as a DRAG (audit F8: 2px
		* armed "moved" from jitter — a shaky click at high zoom rippled both
		* cuts a frame. 5px = click still selects, jitter stays a click). */
		const DRAG_ARM_PX = 5;
		const MAX_PPF = 40;
		function MotionTimelineBar({ prompts, keyframes, frameIdx, onFrameChange, onScrubStart, onScrubEnd, totalFrames, fps, initialSeconds, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, onExtend, tracks = MOTION_TIMELINE_TRACKS, promptsLabel = "Prompts", laneHint = "Double-click a lane to pin a pose constraint at the playhead", packed = false, emptyPromptsHint = "No prompt cards — the Add button carves one", promptsHeight = PROMPTS_H, beats, beatsLabel = "Beats", beatsHeight = BEATS_H, beatsHint = "double-click to add a beat — prompt segments join into the call's one prompt", onBeatAdd, onPromptAdd, previews, selectedId = null, onSelect, audioLayers, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioDetach, className, style, theme }) {
			const barBg = theme?.barBg ?? BAR_BG;
			const playhead = theme?.playhead ?? PLAYHEAD;
			const scrollRef = (0, react.useRef)(null);
			const dragRef = (0, react.useRef)(null);
			const suppressClickRef = (0, react.useRef)(false);
			const lastPromptRef = (0, react.useRef)(null);
			lastPromptRef.current = prompts.length ? prompts.reduce((a, b) => b.end_frame > a.end_frame ? b : a).uuid : null;
			const firstPromptRef = (0, react.useRef)(null);
			firstPromptRef.current = prompts.length ? prompts.reduce((a, b) => b.start_frame < a.start_frame ? b : a).uuid : null;
			const promptsRef = (0, react.useRef)(prompts);
			promptsRef.current = prompts;
			const [dragId, setDragId] = (0, react.useState)(null);
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [editText, setEditText] = (0, react.useState)("");
			const [boxW, setBoxW] = (0, react.useState)(0);
			const [ppf, setPpf] = (0, react.useState)(null);
			const [basePpf, setBasePpf] = (0, react.useState)(null);
			const [dragScale, setDragScale] = (0, react.useState)(null);
			const anchorRef = (0, react.useRef)(null);
			const measure = () => {
				const el = scrollRef.current;
				if (el && el.getBoundingClientRect().width > 0) setBoxW(el.getBoundingClientRect().width);
			};
			(0, react.useEffect)(() => {
				measure();
				let ro = null;
				if (typeof ResizeObserver !== "undefined" && scrollRef.current) {
					ro = new ResizeObserver(() => measure());
					ro.observe(scrollRef.current);
				}
				window.addEventListener("resize", measure);
				return () => {
					ro?.disconnect();
					window.removeEventListener("resize", measure);
				};
			}, []);
			const T1 = Math.max(0, Math.floor(totalFrames) - 1);
			const fitPpf = boxW > 0 && T1 > 0 ? boxW / T1 : 10;
			(0, react.useEffect)(() => {
				if (boxW > 0 && T1 > 0 && ppf == null) {
					let mount = Math.max(1, fitPpf);
					if (initialSeconds != null && initialSeconds > 0 && fps > 0) mount = Math.max(1, boxW / (initialSeconds * fps));
					setPpf(mount);
					setBasePpf(mount);
				}
			}, [boxW, T1]);
			const effPpf = dragScale ?? ppf ?? Math.max(1, fitPpf);
			const LEAD_OUT = Math.max(240, boxW * .35);
			const contentW = Math.max(boxW, T1 * effPpf + LEAD_OUT);
			const frameToPx = (f) => f * effPpf;
			const zoom = (factor) => {
				const el = scrollRef.current;
				if (el) anchorRef.current = {
					frame: frameIdx,
					off: frameToPx(frameIdx) - el.scrollLeft
				};
				const next = (ppf ?? Math.max(1, fitPpf)) * factor;
				if (next <= fitPpf * 1.0001) {
					setPpf(Math.max(1, fitPpf));
					setBasePpf(Math.max(1, fitPpf));
				} else setPpf(Math.min(MAX_PPF, next));
			};
			(0, react.useLayoutEffect)(() => {
				const el = scrollRef.current;
				const a = anchorRef.current;
				if (el && a) el.scrollLeft = Math.max(0, a.frame * effPpf - a.off);
				anchorRef.current = null;
			}, [effPpf]);
			const frameAt = (clientX) => {
				const el = scrollRef.current;
				if (!el) return null;
				const r = el.getBoundingClientRect();
				if (r.width <= 0 && boxW <= 0) return null;
				const x = clientX - r.left + el.scrollLeft;
				return Math.round(x / effPpf);
			};
			const xToFrame = (clientX) => {
				const f = frameAt(clientX);
				return f == null ? null : clamp(f, 0, T1);
			};
			const keepTailVisible = (endFrame) => {
				const el = scrollRef.current;
				if (!el) return;
				const r = el.getBoundingClientRect();
				if (r.width <= 0) return;
				const rightPx = endFrame * effPpf;
				if (rightPx > el.scrollLeft + r.width - 24) {
					const max = Math.max(0, el.scrollWidth - r.width);
					el.scrollLeft = Math.min(max, rightPx - r.width + 24);
				}
			};
			const startDrag = (e, d) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				e.preventDefault();
				dragRef.current = {
					...d,
					t1AtStart: T1
				};
				setDragScale(effPpf);
				if (d.kind !== "scrub") setDragId(d.id);
			};
			(0, react.useEffect)(() => {
				const endDrag = () => {
					const d = dragRef.current;
					dragRef.current = null;
					setDragId(null);
					setDragScale(null);
					if (d?.moved) suppressClickRef.current = true;
					const grewDoc = d ? T1 > (d.t1AtStart ?? T1) : false;
					if (d && grewDoc && ppf == null && dragScale != null) {
						setPpf(dragScale);
						setBasePpf(dragScale);
					}
					if (d && d.kind === "scrub") onScrubEnd?.();
					if (d && d.kind === "kf" && !d.moved) onFrameChange(d.frame);
					if (d && (d.kind === "prompt-move" || d.kind === "prompt-l" || d.kind === "prompt-r") && !d.moved) onSelect?.(d.id);
					if (d && d.kind === "audio-clip" && !d.moved) suppressClickRef.current = true;
				};
				const onMove = (e) => {
					const d = dragRef.current;
					if (!d) return;
					if (e.pointerType === "mouse" && e.buttons === 0) {
						endDrag();
						return;
					}
					if (d.kind === "scrub") {
						if (Math.abs(e.clientX - d.startX) > 2) d.moved = true;
						const f = xToFrame(e.clientX);
						if (f != null) onFrameChange(f);
						return;
					}
					const dxF = (e.clientX - d.startX) / effPpf;
					if (Math.abs(e.clientX - d.startX) > DRAG_ARM_PX) d.moved = true;
					if (d.kind === "kf") onKeyframeMove(d.id, clamp(Math.round(d.frame + dxF), 0, T1));
					else if (d.kind === "audio-clip") {
						const others = ((audioLayers?.find((x) => x.id === d.layerId))?.clips ?? []).filter((c) => c.id !== d.id);
						const prevEnd = others.filter((c) => c.start_frame < d.startF).reduce((m, c) => Math.max(m ?? 0, c.start_frame + c.dur_frames), null);
						const nextStart = others.filter((c) => c.start_frame > d.startF).reduce((m, c) => Math.min(m ?? T1, c.start_frame), null);
						let ns = clamp(Math.round(d.startF + dxF), 0, Math.max(0, T1 - d.durF));
						if (prevEnd != null) ns = Math.max(ns, prevEnd + 1);
						if (nextStart != null) ns = Math.min(ns, Math.max(0, nextStart - 1 - d.durF));
						onAudioClipMove?.(d.layerId, d.id, ns);
					} else {
						const neighborsOf = (id) => {
							const sorted = [...promptsRef.current].sort((a, b) => a.start_frame - b.start_frame);
							const i = sorted.findIndex((p) => p.uuid === id);
							if (i === -1) return {
								prevEnd: null,
								prevStart: null,
								nextStart: null,
								nextEnd: null
							};
							return {
								prevEnd: i > 0 ? sorted[i - 1].end_frame : null,
								prevStart: i > 0 ? sorted[i - 1].start_frame : null,
								nextStart: i < sorted.length - 1 ? sorted[i + 1].start_frame : null,
								nextEnd: i < sorted.length - 1 ? sorted[i + 1].end_frame : null
							};
						};
						if (d.kind === "prompt-move") {
							const live = promptsRef.current.find((x) => x.uuid === d.id);
							const endF = live?.end_frame ?? d.endF;
							const startF = live?.start_frame ?? d.startF;
							const dur = Math.max(1, endF - startF);
							const { prevEnd, prevStart, nextStart, nextEnd } = neighborsOf(d.id);
							let ns = Math.max(0, Math.round(d.startF + dxF));
							if (prevEnd != null) ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1);
							const ne = ns + dur;
							if (ne > T1 && d.id === lastPromptRef.current) {
								onExtend(ne + 1);
								onPromptMove(d.id, ns, ne);
								keepTailVisible(ne);
							} else {
								const maxNs = Math.max(0, T1 - dur);
								let c = clamp(ns, 0, maxNs);
								if (nextStart != null) c = Math.min(c, Math.max(0, packed ? (nextEnd ?? T1) - 1 - dur : nextStart - 1 - dur));
								onPromptMove(d.id, c, c + dur);
							}
						} else if (d.kind === "prompt-l") {
							const endF = promptsRef.current.find((x) => x.uuid === d.id)?.end_frame ?? d.endF;
							const { prevEnd, prevStart } = neighborsOf(d.id);
							let ns = clamp(Math.round(d.startF + dxF), 0, endF - 1);
							if (prevEnd != null) ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1);
							onPromptResize(d.id, ns, endF);
							onFrameChange(ns);
						} else {
							const startF = promptsRef.current.find((x) => x.uuid === d.id)?.start_frame ?? d.startF;
							const { nextStart, nextEnd } = neighborsOf(d.id);
							let ne = Math.round(d.endF + dxF);
							if (ne > T1 && d.id === lastPromptRef.current) onExtend(ne + 1);
							else {
								ne = clamp(ne, startF + 1, T1);
								if (nextStart != null) ne = Math.min(ne, Math.max(startF + 1, packed ? (nextEnd ?? T1) - 1 : nextStart - 1));
							}
							onPromptResize(d.id, startF, ne);
							onFrameChange(ne);
							if (d.id === lastPromptRef.current) keepTailVisible(ne);
						}
					}
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", endDrag);
				window.addEventListener("pointercancel", endDrag);
				return () => {
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", endDrag);
					window.removeEventListener("pointercancel", endDrag);
				};
			}, [
				T1,
				effPpf,
				onFrameChange,
				onKeyframeMove,
				onPromptMove,
				onPromptResize,
				onExtend
			]);
			const viewSec = totalFrames / Math.max(1, fps);
			const fullSec = contentW / Math.max(1, effPpf) / Math.max(1, fps);
			const stepSec = viewSec <= 4 ? .5 : Math.max(1, Math.ceil(viewSec / 16));
			const ticks = [];
			for (let s = 0; s <= fullSec + 1e-6; s += stepSec) ticks.push(Math.round(s * 10) / 10);
			const commitEdit = (id) => {
				setEditingId(null);
				const text = editText.trim();
				const p = prompts.find((x) => x.uuid === id);
				if (p && text !== p.text) onPromptUpdate(id, text);
			};
			const seek = (e) => {
				if (e.button !== 0) return;
				dragRef.current = {
					kind: "scrub",
					startX: e.clientX,
					moved: false
				};
				onScrubStart?.();
				const f = xToFrame(e.clientX);
				if (f != null) onFrameChange(f);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "motion-timeline-bar",
				className: clsx(timeline_module_css_default.root, className),
				style: {
					background: barBg,
					...style
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: timeline_module_css_default.gutter,
					style: { width: GUTTER_W },
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.zoomRow,
							style: { height: RULER_H },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
									tip: "Zoom out (back toward fit)",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => zoom(1 / ZOOM_STEP),
										"aria-label": "Zoom out",
										className: timeline_module_css_default.zoomBtn,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomOut, {})
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
									tip: "Fit the whole motion in view",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => {
											anchorRef.current = {
												frame: frameIdx,
												off: frameToPx(frameIdx) - (scrollRef.current?.scrollLeft ?? 0)
											};
											setPpf(Math.max(1, fitPpf));
											setBasePpf(Math.max(1, fitPpf));
										},
										className: timeline_module_css_default.zoomPct,
										children: [Math.round(effPpf / (basePpf ?? fitPpf) * 100), "%"]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
									tip: "Zoom in — more pixels per frame (the bar scrolls horizontally)",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => zoom(ZOOM_STEP),
										"aria-label": "Zoom in",
										className: timeline_module_css_default.zoomBtn,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomIn, {})
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.laneHead,
							style: { height: promptsHeight },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Film, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.gutterLabel,
								children: promptsLabel
							})]
						}),
						beats && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.laneHeadBeats,
							style: { height: beatsHeight },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListMusic, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.gutterLabel,
								children: beatsLabel
							})]
						}),
						audioLayers?.map((L) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.audioHead,
							style: { height: AUDIO_H },
							title: L.stem ? `${L.stem} — one bed under every cut; each window hears its own slice in time` : "drop an audio / music track — sliced to each window in time",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Music, { "aria-hidden": true }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_module_css_default.gutterLabelDim,
									children: L.label
								}),
								(L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => onAudioDetach(L.id),
									"aria-label": `Detach ${L.label}`,
									className: timeline_module_css_default.detachBtn,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, { "aria-hidden": true })
								})
							]
						}, L.id)),
						tracks.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.laneRow,
							style: { height: LANE_H },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.laneDot,
								style: { background: rgb(t.color ?? [
									176,
									180,
									186
								]) },
								"aria-hidden": true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.laneName,
								children: t.name
							})]
						}, t.uuid))
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: timeline_module_css_default.contentWrap,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: scrollRef,
						"data-testid": "motion-timeline-scroll",
						className: timeline_module_css_default.scroller,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-testid": "motion-timeline-content",
							className: timeline_module_css_default.content,
							style: {
								width: contentW,
								minWidth: "100%"
							},
							onClick: (e) => {
								if (suppressClickRef.current) {
									suppressClickRef.current = false;
									return;
								}
								if (e.target.closest("[data-prompt-clip],[data-beat-clip],[data-testid=\"motion-timeline-ruler\"]")) return;
								onSelect?.(null);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
									tip: onPromptAdd ? "Click or drag to move the playhead — double-click to add a call at that frame" : "Click or drag to move the playhead",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										"data-testid": "motion-timeline-ruler",
										className: timeline_module_css_default.ruler,
										style: { height: RULER_H },
										onPointerDown: seek,
										onDoubleClick: (e) => {
											if (!onPromptAdd) return;
											const f = frameAt(e.clientX);
											if (f != null) onPromptAdd(f);
										},
										children: [ticks.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: timeline_module_css_default.tick,
											style: { left: frameToPx(s * fps) },
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.tickLine }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: timeline_module_css_default.tickLabel,
												children: stepSec < 1 ? `${s.toFixed(1)}s` : `${s}s`
											})]
										}, s)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"data-testid": "motion-timeline-timecode",
											className: timeline_module_css_default.timecode,
											style: {
												background: barBg,
												boxShadow: "2px 0 6px -2px color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent)"
											},
											children: fmtTimecode(frameIdx, fps)
										})]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: clsx(timeline_module_css_default.promptsLane, onPromptAdd && timeline_module_css_default.canAdd),
									style: {
										height: promptsHeight,
										background: "var(--dsw-alias-bg-layer-1)"
									},
									onDoubleClick: (e) => {
										if (!onPromptAdd) return;
										if (e.target.closest("[data-prompt-clip]")) return;
										const f = frameAt(e.clientX);
										if (f != null) onPromptAdd(f);
									},
									children: [prompts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: timeline_module_css_default.emptyCenter,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: timeline_module_css_default.emptyHint,
											children: emptyPromptsHint
										})
									}), prompts.map((p, i) => {
										const color = rgb(PROMPT_COLORS[i % PROMPT_COLORS.length]);
										const isEditing = editingId === p.uuid;
										const isMoving = dragId === p.uuid;
										const isLast = p.uuid === lastPromptRef.current;
										const isFirst = p.uuid === firstPromptRef.current;
										const isSelected = selectedId === p.uuid;
										const previewUrl = previews?.[p.uuid];
										const wPx = frameToPx(Math.max(1, p.end_frame - p.start_frame));
										const clipTip = `${p.text || "(empty)"} — frames ${p.start_frame}–${p.end_frame} (${((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1)}s)\n\nDrag body: move · Drag edges: resize · Double-click: edit · Click: select`;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
											tip: clipTip,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												"data-prompt-clip": p.uuid,
												className: clsx(timeline_module_css_default.promptClip, isMoving ? timeline_module_css_default.clipMoving : isSelected ? timeline_module_css_default.clipSelected : void 0),
												style: {
													left: frameToPx(p.start_frame),
													width: `max(26px, ${wPx}px)`,
													background: `linear-gradient(135deg, ${color}33, ${color}14)`,
													borderLeft: `3px solid ${color}`,
													transition: isMoving ? "none" : "border-color .12s"
												},
												onMouseEnter: (e) => {
													const v = e.currentTarget.querySelector("video");
													if (v) v.play().catch(() => {});
												},
												onMouseLeave: (e) => {
													const v = e.currentTarget.querySelector("video");
													if (v) v.pause();
												},
												onPointerDown: (e) => !isEditing && startDrag(e, {
													kind: "prompt-move",
													id: p.uuid,
													startX: e.clientX,
													startF: p.start_frame,
													endF: p.end_frame,
													moved: false
												}),
												onDoubleClick: (e) => {
													e.stopPropagation();
													setEditText(p.text);
													setEditingId(p.uuid);
												},
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														"data-prompt-edge": "l",
														title: isFirst ? "First call — nothing before it to trim into" : void 0,
														className: clsx(timeline_module_css_default.edgeL, isFirst && timeline_module_css_default.edgeDead),
														onPointerDown: (e) => !isFirst && startDrag(e, {
															kind: "prompt-l",
															id: p.uuid,
															startX: e.clientX,
															startF: p.start_frame,
															endF: p.end_frame,
															moved: false
														}),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.gripPill })
													}),
													p.seam === "extend" && !isFirst && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: timeline_module_css_default.seamDot,
														style: {
															background: playhead,
															boxShadow: `0 0 4px ${playhead}`
														},
														title: "extend — latent tail carries across this seam"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
														tip: isLast ? "PULL to extend the motion — the timeline + duration grow as you drag" : "Drag to resize this card",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															"data-prompt-edge": "r",
															className: clsx(timeline_module_css_default.edgeR, isLast && timeline_module_css_default.edgeWide),
															onPointerDown: (e) => startDrag(e, {
																kind: "prompt-r",
																id: p.uuid,
																startX: e.clientX,
																startF: p.start_frame,
																endF: p.end_frame,
																moved: false
															}),
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: clsx(timeline_module_css_default.gripPillR, isLast && timeline_module_css_default.gripPillBright) })
														})
													}),
													isEditing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
														autoFocus: true,
														value: editText,
														onChange: (e) => setEditText(e.target.value),
														onBlur: () => commitEdit(p.uuid),
														onKeyDown: (e) => {
															if (e.key === "Enter") commitEdit(p.uuid);
															if (e.key === "Escape") setEditingId(null);
														},
														onPointerDown: (e) => e.stopPropagation(),
														onDoubleClick: (e) => e.stopPropagation(),
														placeholder: "Enter prompt…",
														className: timeline_module_css_default.clipEditor
													}) : previewUrl ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: timeline_module_css_default.previewWrap,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
																src: previewUrl,
																muted: true,
																loop: true,
																playsInline: true,
																preload: "metadata",
																className: timeline_module_css_default.previewVideo
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.scrim }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: timeline_module_css_default.clipTextCol,
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: timeline_module_css_default.clipTitle,
																	style: { color },
																	children: p.text || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: timeline_module_css_default.clipEmpty,
																		children: "(empty)"
																	})
																}), wPx > 72 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																	className: timeline_module_css_default.clipDur,
																	children: [((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1), "s"]
																})]
															})
														]
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: timeline_module_css_default.clipTextStack,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: timeline_module_css_default.clipTitle,
															style: { color },
															children: p.text || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: timeline_module_css_default.clipEmpty,
																children: "(empty)"
															})
														}), wPx > 64 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: timeline_module_css_default.clipDur,
															children: [((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1), "s"]
														})]
													}),
													p.override && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														title: "This call overrides run knobs (per-call)",
														className: timeline_module_css_default.knobDot
													}),
													p.audio && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Music, {
														"aria-hidden": true,
														className: timeline_module_css_default.refAudioBadge
													}),
													(p.refImages ?? 0) > 0 && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														"data-testid": "tl-ref-badge",
														className: timeline_module_css_default.refBadge,
														title: `${p.refImages} reference image${p.refImages === 1 ? "" : "s"} (guide + extras)`,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Image$1, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: timeline_module_css_default.refCount,
															children: p.refImages
														})]
													}),
													!isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
														tip: "Delete this prompt card",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
															variant: "ghost",
															size: "sm",
															onPointerDown: (e) => e.stopPropagation(),
															onClick: (e) => {
																e.stopPropagation();
																onPromptDelete(p.uuid);
															},
															"aria-label": "Delete this prompt card",
															className: timeline_module_css_default.promptDelete,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, {})
														})
													})
												]
											})
										}, p.uuid);
									})]
								}),
								beats && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-beats-row": true,
									className: clsx(timeline_module_css_default.beatsLane, onBeatAdd && timeline_module_css_default.beatsAdd),
									style: {
										height: beatsHeight,
										background: "var(--dsw-alias-bg-layer-1)"
									},
									onDoubleClick: (e) => {
										if (!onBeatAdd) return;
										const f = xToFrame(e.clientX);
										if (f != null) onBeatAdd(f);
									},
									children: [beats.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: timeline_module_css_default.beatsEmpty,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: timeline_module_css_default.hintLine,
											children: beatsHint
										})
									}), beats.map((b) => {
										const color = rgb(b.color ?? [
											176,
											180,
											186
										]);
										const isSelected = selectedId === b.id;
										const bW = frameToPx(Math.max(1, b.end_frame - b.start_frame));
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
											tip: `${b.text || "(empty)"} — frames ${b.start_frame}–${b.end_frame} (${((b.end_frame - b.start_frame) / Math.max(1, fps)).toFixed(1)}s)\n\nClick: edit in the call card`,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												"data-beat-clip": b.id,
												onClick: () => onSelect?.(b.id),
												className: clsx(timeline_module_css_default.beatClip, isSelected && timeline_module_css_default.beatSelected),
												style: {
													left: frameToPx(b.start_frame),
													width: `max(14px, ${bW}px)`,
													background: `linear-gradient(135deg, ${color}2e, ${color}12)`,
													borderLeft: `3px solid ${color}`
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: timeline_module_css_default.beatLabel,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: timeline_module_css_default.truncate,
														children: b.text || /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: timeline_module_css_default.beatEmpty,
															children: "(empty)"
														})
													})
												})
											})
										}, b.id);
									})]
								}),
								audioLayers?.map((L) => {
									const clips = L.clips ?? [];
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										"data-audio-layer": L.id,
										"data-wired": L.stem ? "true" : "false",
										"data-clips": clips.length ? "true" : "false",
										className: timeline_module_css_default.audioLane,
										style: {
											height: AUDIO_H,
											background: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)"
										},
										onDragOver: (e) => e.preventDefault(),
										onDrop: (e) => {
											e.preventDefault();
											const t = xToFrame(e.clientX);
											const f = t != null && Number.isFinite(t) ? t : 0;
											const file = e.dataTransfer.files?.[0];
											if (file) {
												onAudioFileDrop?.(L.id, file, f);
												return;
											}
											try {
												const payload = JSON.parse(e.dataTransfer.getData("application/tech-noir-asset") || "null");
												if (payload && typeof payload.url === "string") {
													if (onAudioDropAt) onAudioDropAt(L.id, payload.url, f);
													else onAudioDrop?.(L.id, payload.url);
												}
											} catch {}
										},
										children: clips.length ? clips.map((c) => {
											const a = (c.start_frame / Math.max(1, fps)).toFixed(1);
											const b = ((c.start_frame + c.dur_frames) / Math.max(1, fps)).toFixed(1);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												"data-audio-clip": c.id,
												title: `${c.name} · ${a}–${b}s${c.gain != null ? ` · gain ${c.gain.toFixed(2)}` : ""} — drag to move`,
												className: timeline_module_css_default.audioClip,
												style: {
													left: frameToPx(c.start_frame),
													width: `max(6px, ${frameToPx(Math.max(1, c.dur_frames))}px)`
												},
												onPointerDown: (e) => {
													if (!onAudioClipMove) return;
													startDrag(e, {
														kind: "audio-clip",
														layerId: L.id,
														id: c.id,
														startX: e.clientX,
														startF: c.start_frame,
														durF: c.dur_frames,
														moved: false
													});
												},
												children: [
													c.gain != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														"aria-hidden": true,
														className: timeline_module_css_default.gainFill,
														style: { height: `${Math.max(4, Math.min(100, c.gain * 50))}%` }
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: timeline_module_css_default.audioClipLabel,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: timeline_module_css_default.audioName,
															children: c.name
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: timeline_module_css_default.audioTime,
															children: [a, "s"]
														})]
													}),
													onAudioClipDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														"data-audio-clip-delete": c.id,
														"aria-label": `Delete ${c.name}`,
														onClick: (e) => {
															e.stopPropagation();
															onAudioClipDelete(L.id, c.id);
														},
														className: timeline_module_css_default.audioClipDelete,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, { "aria-hidden": true })
													})
												]
											}, c.id);
										}) : L.stem ? prompts.map((p, i) => {
											const a = (p.start_frame / Math.max(1, fps)).toFixed(1);
											const b = (p.end_frame / Math.max(1, fps)).toFixed(1);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												"data-audio-slice": i,
												title: `call #${i} · window hears bed ${a}–${b}s`,
												className: timeline_module_css_default.audioSlice,
												style: {
													left: frameToPx(p.start_frame),
													width: `max(4px, ${frameToPx(Math.max(1, p.end_frame - p.start_frame))}px)`
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: timeline_module_css_default.sliceLabel,
													children: [
														a,
														"–",
														b,
														"s"
													]
												})
											}, p.uuid);
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: timeline_module_css_default.audioDrop,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: timeline_module_css_default.dropHint,
												children: "drop or upload audio — clips land where you drop them, drag to move"
											})
										})
									}, L.id);
								}),
								tracks.map((track, ti) => {
									const kfs = keyframes.filter((k) => k.track_id === track.uuid);
									const color = rgb(track.color ?? [
										176,
										180,
										186
									]);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										"data-lane": track.uuid,
										className: timeline_module_css_default.kfLane,
										style: { height: LANE_H },
										onDoubleClick: (e) => {
											const f = xToFrame(e.clientX);
											if (f != null) onKeyframeAdd(track.uuid, f);
										},
										children: [keyframes.length === 0 && ti === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: timeline_module_css_default.laneHint,
											children: laneHint
										}), kfs.map((kf) => {
											const isMoving = dragId === kf.uuid;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: timeline_module_css_default.kfWrap,
												style: { left: frameToPx(kf.frame) },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
													tip: `${track.name} constraint @ frame ${kf.frame} — drag to move, click to jump, hover ✕ to delete`,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														"data-kf": kf.uuid,
														"aria-label": `${track.name} keyframe at frame ${kf.frame}`,
														onPointerDown: (e) => startDrag(e, {
															kind: "kf",
															id: kf.uuid,
															startX: e.clientX,
															frame: kf.frame,
															moved: false
														}),
														onDoubleClick: (e) => e.stopPropagation(),
														className: timeline_module_css_default.kfBtn,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: clsx(timeline_module_css_default.kfDiamond, isMoving && timeline_module_css_default.kfMoving),
															style: {
																background: color,
																borderColor: color
															}
														})
													})
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip, {
													tip: `Delete ${track.name} keyframe at frame ${kf.frame}`,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														onPointerDown: (e) => e.stopPropagation(),
														onClick: (e) => {
															e.stopPropagation();
															onKeyframeDelete(kf.uuid);
														},
														"aria-label": `Delete ${track.name} keyframe at frame ${kf.frame}`,
														className: timeline_module_css_default.kfDelete,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, {})
													})
												})]
											}, kf.uuid);
										})]
									}, track.uuid);
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									"data-testid": "motion-timeline-playhead",
									className: timeline_module_css_default.playhead,
									style: {
										left: frameToPx(frameIdx),
										width: 2,
										background: playhead,
										boxShadow: `0 0 6px color-mix(in srgb, ${playhead} 40%, transparent)`,
										transform: "translateX(-50%)"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.playheadCap,
										style: { background: playhead }
									})
								})
							]
						})
					})
				})]
			});
		}
		(0, react.createContext)({ useGui: (selector) => selector({ theme: { dark_mode: true } }) });
		//#endregion
		//#region src/ui/studio/docModel.ts
		/** The backend's CALL_KNOB_KEYS vocabulary — hydration accepts only
		* these (a foreign key is dropped with a warning, never re-sent).
		* (2026-09-02 parity fix) h3_attention is LAYER A ONLY — the compose
		* gate REFUSES it on calls by name ("a per-call h3_attention would
		* silently do nothing") — and legacy h3_sage_attention is not in the
		* card_knobs map at all; both are gone from the vocabulary so the UI
		* can never author a card the run door refuses. Legacy docs carrying
		* them hydrate-drop with a warning. */
		const CALL_KNOB_KEYS = /* @__PURE__ */ new Set([
			"sampling_steps",
			"steps",
			"denoise",
			"sampler",
			"scheduler",
			"shift_video",
			"shift_audio",
			"h3_sla_sparsity",
			"h3_sla_block_size",
			"h3_sla_min_seq_len",
			"h3_sla_dense_last_steps",
			"h3_sla_protect_audio",
			"h3_sla_stabilize_motion",
			"h3_sla_reference_protection",
			"h3_sla_dense_backend",
			"h3_sla_dense_steps",
			"h3_sla_disable_fp16_accum",
			"sharpen_enabled",
			"sharpen_method",
			"sharpen_strength",
			"sharpen_radius",
			"sharpen_threshold",
			"sharpen_iterations",
			"interpolate_enabled",
			"interpolate_model",
			"interpolate_multiplier"
		]);
		const KNOB_ORDER = [
			"sampling_steps",
			"denoise",
			"sampler",
			"scheduler",
			"shift_video",
			"shift_audio",
			"h3_sla_sparsity",
			"h3_sla_block_size",
			"h3_sla_min_seq_len",
			"h3_sla_dense_last_steps",
			"h3_sla_protect_audio",
			"h3_sla_stabilize_motion",
			"h3_sla_reference_protection",
			"h3_sla_dense_backend",
			"h3_sla_dense_steps",
			"h3_sla_disable_fp16_accum",
			"sharpen_enabled",
			"sharpen_method",
			"sharpen_strength",
			"sharpen_radius",
			"sharpen_threshold",
			"sharpen_iterations",
			"interpolate_enabled",
			"interpolate_model",
			"interpolate_multiplier"
		];
		const KNOB_LABELS = {
			sampling_steps: "Sampling steps",
			denoise: "Denoise",
			sampler: "Sampler",
			scheduler: "Scheduler",
			shift_video: "Video shift",
			shift_audio: "Audio shift",
			h3_sla_sparsity: "SLA sparsity",
			h3_sla_block_size: "SLA block size",
			h3_sla_min_seq_len: "SLA min seq len",
			h3_sla_dense_last_steps: "SLA dense last steps",
			h3_sla_protect_audio: "SLA protect audio",
			h3_sla_stabilize_motion: "SLA stabilize motion",
			h3_sla_reference_protection: "SLA ref protection",
			h3_sla_dense_backend: "SLA dense backend",
			h3_sla_dense_steps: "SLA dense steps",
			h3_sla_disable_fp16_accum: "SLA full-prec accum",
			sharpen_enabled: "Sharpen",
			sharpen_method: "Sharpen method",
			sharpen_strength: "Sharpen strength",
			sharpen_radius: "Sharpen radius",
			sharpen_threshold: "Sharpen noise gate",
			sharpen_iterations: "Sharpen iterations",
			interpolate_enabled: "Interpolate",
			interpolate_model: "Interp model",
			interpolate_multiplier: "Interp multiplier"
		};
		const SAMPLER_OPTIONS = [
			"euler",
			"euler_cfg_pp",
			"euler_ancestral",
			"dpmpp_2m",
			"dpmpp_2m_sde",
			"heun"
		];
		const SCHEDULER_OPTIONS = [
			"simple",
			"beta",
			"linear_quadratic",
			"normal",
			"sgm_uniform",
			"karras",
			"exponential",
			"kl_optimal",
			"ddim_uniform"
		];
		/**
		* Convert a legacy audio_stem artifact name into a positioned clip at
		* frame 0. The caller owns the async duration probe (Audio metadata)
		* for precise dur_frames — this gives a visible 4-second fallback that
		* corrects on probe completion. Exported so tests can exercise the pure
		* conversion logic without mounting the full component.
		*/
		function stemToClip(stemSrc, fps, id) {
			const name = stemSrc.includes("/") ? stemSrc.split("/").pop() : stemSrc;
			return {
				id: id ?? `aclip-stem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
				name,
				src: stemSrc,
				start_frame: 0,
				dur_frames: Math.round(4 * (fps || 24)),
				gain: 1
			};
		}
		const AUDIO_MODES = [
			"none",
			"native",
			"lipSync"
		];
		/** Speed LoRA choices — the mod.yaml SSOT for the h3 lane's speed
		*  adapters (packages/comfyui/models/video/h3/mods/loras/mod.yaml).
		*  The `value` is the ComfyUI LoRA filename (what LoraLoader.0.lora_name
		*  receives); the `label` is the human-readable name from mod.yaml.
		*  Empty = no speed LoRA (the lane default). */
		const SPEED_LORA_OPTIONS = [{
			value: "h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
			label: "H3 Turbo 8-step (LightX2V v1.0)"
		}, {
			value: "h3/minimax_h3_fl2v_turbo_4step_v1.1_768p_comfyui_bf16.safetensors",
			label: "H3 Turbo 4-step 768p (LightX2V v1.1)"
		}];
		/** H3 prompt style (Layer B ✨): rewrite ONE model call's prompt into
		* the cinematic MiniMax-H3 dialect. One call = ONE continuous shot
		* (cuts are CALL boundaries — never describe a cut inside a call);
		* concrete camera + subject + action + environment language, present
		* tense, duration-aware, no meta ("prompt", "video of") noise. */
		const H3_ENHANCE_SYSTEM = [
			"You rewrite video-generation prompts for the MiniMax H3 model.",
			"One prompt describes ONE continuous camera shot — never describe cuts, transitions, or editing inside a prompt.",
			"Style rules: present tense; concrete cinematic camera language (dolly, crane, handheld, static tripod, orbit); named subject with visible physical detail; specific action beats that fit the shot's duration; environment, lighting and atmosphere; film-stock or lens texture where it helps.",
			"Keep the original subject, intent, and any proper nouns exactly. Do not invent new characters or change the story.",
			"Length: 2-4 flowing sentences, dense but not padded. No lists, no headings, no meta-commentary.",
			"Output STRICT JSON exactly: {\"positive\": \"<the rewritten prompt>\", \"negative\": \"\"} — nothing else outside the JSON."
		].join(" ");
		/** The beat's guide kinds — the planner's KEYFRAME_KINDS, in the lane /
		* panel order. Colors: image = blue, clip = amber, audio = violet. */
		const GUIDE_KINDS = [
			"image",
			"clip",
			"audio"
		];
		/** The fresh-card document (mirrors the builder's _STARTER_CALLS — 168
		* frames @ 24 fps = 7 s, ONE window, no seam yet). Used only when params
		* carry no valid calls (never authored, or legacy malformed). */
		const STARTER_CALLS = [{
			text: "A single shot — describe the action, camera, and mood.",
			start_frame: 0,
			end_frame: 168
		}];
		/** The three guide lanes — the keyframe kinds of the planner
		* (video_plan.KEYFRAME_KINDS), in lane order. Colors sit apart from the
		* prompt cycle and from each other: image = blue, clip = amber, audio =
		* violet. */
		const VIDEO_TIMELINE_TRACKS = [
			{
				uuid: "image",
				name: "Image guide",
				track_type: "keyframe",
				color: [
					86,
					140,
					245
				],
				height_scale: .6
			},
			{
				uuid: "clip",
				name: "Clip guide",
				track_type: "keyframe",
				color: [
					219,
					148,
					86
				],
				height_scale: .6
			},
			{
				uuid: "audio",
				name: "Audio guide",
				track_type: "keyframe",
				color: [
					150,
					100,
					200
				],
				height_scale: .6
			}
		];
		const KIND_OF_TRACK = {
			image: "image",
			clip: "clip",
			audio: "audio"
		};
		//#endregion
		//#region src/ui/studio/StudioStripPane.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Pinned strip: the bar IS the document (monolith lines 4078–4162).
		*
		*  The chrome rides the shared kit (2026-09-07): PaneShell + the
		*  strip PaneHeader — the same box/header the motion bar carries
		*  (the aspirational TimelineFooter twin is deleted; this pane is
		*  the one strip). */
		function StudioStripPane({ calls, totalFrames, fps, seconds, barPrompts, barLanes, barBeats, barAudioClips, barTotal, frameIdx, callPreviews, selectedBarId, filmMap, handleBarFrame, handleScrubStart, handleScrubEnd, handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete, handleExtend, handleBeatAdd, addCallAt, handleTimelineSelect, layerA, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip, setLayerAKey, artifactIndex, docFromFilm, keyframes }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PaneShell, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PaneHeader, {
				title: "Timeline",
				meta: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					calls.length,
					" call",
					calls.length === 1 ? "" : "s",
					" · ",
					totalFrames,
					" fr · ",
					fps,
					" fps · ",
					seconds,
					"s"
				] }),
				hint: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: "one card = one model call · drag an edge = move the cut · double-click = edit · pull the tail = extend · cyan dot = knobs override · click a call or beat = edit it in the left panel · double-click the beats row = add a beat" })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionTimelineBar, {
				prompts: barPrompts,
				keyframes: barLanes,
				frameIdx,
				totalFrames: barTotal,
				fps: filmMap?.fps ?? fps,
				initialSeconds: 10,
				onFrameChange: handleBarFrame,
				onScrubStart: handleScrubStart,
				onScrubEnd: handleScrubEnd,
				onKeyframeAdd: (trackId, frame) => handleKeyframeAdd(trackId, docFromFilm(frame)),
				onKeyframeMove: (id, frame) => handleKeyframeMove(id, docFromFilm(frame)),
				onKeyframeDelete: handleKeyframeDelete,
				onPromptUpdate: handlePromptUpdate,
				onPromptMove: (id, s, e) => handlePromptMove(id, docFromFilm(s), docFromFilm(e)),
				onPromptResize: (id, s, e) => handlePromptResize(id, docFromFilm(s), docFromFilm(e)),
				onPromptDelete: handlePromptDelete,
				onExtend: (newTotal) => handleExtend(newTotal - barTotal + totalFrames),
				tracks: keyframes.length ? VIDEO_TIMELINE_TRACKS : [],
				packed: true,
				promptsLabel: "Calls",
				laneHint: "frame-exact legacy keyframes — guides attach to their call in the panel above",
				emptyPromptsHint: "No calls — double-click the timeline to add one",
				promptsHeight: 64,
				beats: barBeats,
				beatsLabel: "Beats",
				beatsHint: "no beats yet — DOUBLE-CLICK a call's span to add one (or + prompt segments in its card) · beats may cross a call boundary; the compiler slices them at cuts",
				onBeatAdd: (frame) => handleBeatAdd(docFromFilm(frame)),
				onPromptAdd: (frame) => addCallAt(docFromFilm(frame)),
				previews: callPreviews,
				selectedId: selectedBarId,
				onSelect: handleTimelineSelect,
				audioLayers: [{
					id: "music",
					label: "Music",
					stem: layerA.audio_stem ?? null,
					clips: barAudioClips
				}],
				onAudioDrop: (id, url) => {
					if (id !== "music") return;
					const name = artifactIndex.byUrl.get(url);
					if (name) addAudioClip(name, name, 0);
				},
				onAudioDropAt: (id, url, frame) => {
					if (id !== "music") return;
					const name = artifactIndex.byUrl.get(url);
					if (name) addAudioClip(name, name, docFromFilm(frame));
				},
				onAudioFileDrop: (id, file, frame) => {
					if (id !== "music") return;
					takeAudioFile(file, docFromFilm(frame));
				},
				onAudioClipMove: (id, clipId, frame) => {
					if (id === "music") moveAudioClip(clipId, docFromFilm(frame));
				},
				onAudioClipDelete: (id, clipId) => {
					if (id === "music") deleteAudioClip(clipId);
				},
				onAudioDetach: (id) => {
					if (id === "music") {
						setLayerAKey("audio_clips", void 0);
						setLayerAKey("audio_stem", void 0);
					}
				}
			})] });
		}
		//#endregion
		//#region src/ui/studio/RunRecipeEngine.tsx
		/** Layer A rail: Recipe + Engine folds (monolith lines 2687–2904). */
		function RunRecipeEngine({ stage, layerA, setLayerAKey, isRef2va }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.group,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.groupTitle,
						children: "Recipe"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Model route",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Model route",
							testId: "tl-route-select",
							value: isRef2va ? "h3-timeline-ref" : "h3-timeline",
							onChange: (v) => setLayerAKey("model", v ?? "h3-timeline"),
							title: isRef2va ? "Ref2VA — identity refs (per-call override windows)" : "FL2VA — first/last-frame conditioning",
							options: [{
								value: "h3-timeline",
								label: "FL2VA · first/last"
							}, {
								value: "h3-timeline-ref",
								label: "Ref2VA · identity refs"
							}],
							emptyLabel: false,
							width: "w-40"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Preset",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Preset",
							value: layerA.preset,
							onChange: (v) => setLayerAKey("preset", v ?? "draft_02mp"),
							options: ["draft_02mp", "final_hd"],
							emptyLabel: false,
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "FPS",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "FPS",
							value: layerA.fps,
							onChange: (v) => {
								if (v !== void 0 && v > 0) setLayerAKey("fps", v);
							},
							min: 1,
							max: 60,
							step: 1,
							placeholder: "",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Audio",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Audio mode",
							value: layerA.audio_mode,
							onChange: (v) => {
								if (v) setLayerAKey("audio_mode", v);
							},
							options: AUDIO_MODES,
							emptyLabel: false,
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Seam continuity",
						className: studio_module_css_default.ctlGap3,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckControl, {
							ariaLabel: "Seam continuity",
							checked: layerA.continuity,
							onChange: (v) => setLayerAKey("continuity", v)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Seed",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Seed",
							value: layerA.seed,
							onChange: (v) => {
								if (v !== void 0) setLayerAKey("seed", v);
							},
							min: 0,
							step: 1,
							placeholder: "",
							width: "w-32"
						})
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.group,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionLabel, {
						tail: `window ${String(stage.params?.width ?? "preset")}×${String(stage.params?.height ?? "preset")} · steps ${layerA.sampling_steps ?? "preset"}`,
						children: "Engine (H3)"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Video sigma shift",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SliderControl, {
							ariaLabel: "Video sigma shift",
							value: layerA.shift_video ?? 12,
							onChange: (v) => setLayerAKey("shift_video", v),
							min: .01,
							max: 100,
							step: .01
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Audio sigma shift",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SliderControl, {
							ariaLabel: "Audio sigma shift",
							value: layerA.shift_audio ?? 3,
							onChange: (v) => setLayerAKey("shift_audio", v),
							min: .01,
							max: 100,
							step: .01
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Sampler",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Sampler (run)",
							value: layerA.sampler,
							onChange: (v) => setLayerAKey("sampler", v),
							options: SAMPLER_OPTIONS,
							emptyLabel: "engine default (euler)",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Scheduler",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Scheduler (run)",
							value: layerA.scheduler,
							onChange: (v) => setLayerAKey("scheduler", v),
							options: SCHEDULER_OPTIONS,
							emptyLabel: "engine default (simple)",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Sampling steps",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Sampling steps (run)",
							value: layerA.sampling_steps,
							onChange: (v) => setLayerAKey("sampling_steps", v),
							min: 1,
							max: 100,
							step: 1,
							placeholder: "preset",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Denoise",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Denoise (run)",
							value: layerA.denoise,
							onChange: (v) => setLayerAKey("denoise", v),
							min: 0,
							max: 1,
							step: .05,
							placeholder: "1.0",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Window size",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: studio_module_css_default.winSize,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
									ariaLabel: "Window width (run)",
									value: layerA.width,
									onChange: (v) => setLayerAKey("width", v),
									min: 256,
									max: 1920,
									step: 32,
									placeholder: "preset W",
									width: "w-[4.5rem]"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.times,
									children: "×"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
									ariaLabel: "Window height (run)",
									value: layerA.height,
									onChange: (v) => setLayerAKey("height", v),
									min: 256,
									max: 1920,
									step: 32,
									placeholder: "preset H",
									width: "w-[4.5rem]"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Attention",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Attention (run)",
							value: layerA.h3_attention,
							onChange: (v) => setLayerAKey("h3_attention", v),
							options: [
								{
									value: "kitchen",
									label: "comfyui-kitchen"
								},
								{
									value: "sol",
									label: "SOL"
								},
								{
									value: "sage",
									label: "SAGE"
								},
								{
									value: "sla",
									label: "SLA (block-sparse)"
								}
							],
							emptyLabel: "engine default",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "FP16 accumulation",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckControl, {
							ariaLabel: "FP16 accumulation (run)",
							checked: layerA.h3_fp16_accumulation,
							onChange: (v) => setLayerAKey("h3_fp16_accumulation", v)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Torch compile",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckControl, {
							ariaLabel: "Torch compile (run)",
							checked: layerA.h3_torch_compile,
							onChange: (v) => setLayerAKey("h3_torch_compile", v)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "CFG",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "CFG (run)",
							value: layerA.cfg,
							onChange: (v) => setLayerAKey("cfg", v),
							min: 1,
							max: 10,
							step: .5,
							placeholder: "4.0",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Motion context frames",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Motion context frames (run)",
							value: layerA.h3_context_steps,
							onChange: (v) => setLayerAKey("h3_context_steps", v),
							min: 0,
							max: 8,
							step: 1,
							placeholder: "engine default",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Audio context steps",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Audio context steps (run)",
							value: layerA.h3_audio_context_steps,
							onChange: (v) => setLayerAKey("h3_audio_context_steps", v),
							min: 0,
							max: 200,
							step: 10,
							placeholder: "engine default",
							width: "w-32"
						})
					})
				]
			})] });
		}
		//#endregion
		//#region src/ui/studio/RunAdvancedPanels.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** The spec's name → LayerA's key (the h3_ prefix is the studio's
		* document spelling of the card's renderer vocabulary). */
		function layerKey(name) {
			return name.startsWith("sla_") ? "h3_" + name : name;
		}
		/** Layer A rail: SLA lab + Speed LoRA + Post-processing (lines 2905–3188).
		*
		* Hour 16, item 3: the compose-read knobs (the SLA family + the
		* sharpen leaves) RIDE THE SERVED SPEC now — /v1/form-spec?model=
		* h3-timeline declares them; SpecFieldRow renders each with the
		* declaration's shape (slider/select/number ranges). The section
		* layout and the conditional leaves stay studio logic (visible_when
		* is single-equality — "method ≠ rcas" is not expressible). The
		* Speed LoRA + RTX + CRF rows are document-local vocabulary (not
		* card params; the compose never reads them) and stay hand-rolled. */
		function RunAdvancedPanels({ layerA, setLayerAKey }) {
			const { spec } = useFormSpec("h3-timeline");
			const byName = new Map((spec?.fields ?? []).map((f) => [f.name, f]));
			const row = (name) => {
				const f = byName.get(name);
				if (f === void 0) return null;
				const key = layerKey(name);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SpecFieldRow, {
					f,
					value: layerA[key],
					onEdit: (k, v) => {
						setLayerAKey(layerKey(k), v);
					}
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				(layerA.h3_attention ?? "kitchen") === "sla" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.group,
					"data-testid": "tl-sla-panel",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.groupTitle,
							children: "SLA — block-sparse attention"
						}),
						row("sla_sparsity"),
						row("sla_block_size"),
						row("sla_min_seq_len"),
						row("sla_dense_last_steps"),
						row("sla_dense_steps"),
						row("sla_dense_backend"),
						row("sla_reference_protection"),
						row("sla_protect_audio"),
						row("sla_stabilize_motion"),
						row("sla_disable_fp16_accum")
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.group,
					"data-testid": "tl-lora-panel",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.groupTitle,
							children: "Speed LoRA"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Name",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
								ariaLabel: "Speed LoRA name (run)",
								value: layerA.lora_name,
								onChange: (v) => setLayerAKey("lora_name", v),
								options: SPEED_LORA_OPTIONS,
								emptyLabel: "none",
								width: "w-40"
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Strength",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
								ariaLabel: "Speed LoRA strength (run)",
								value: layerA.lora_strength,
								onChange: (v) => setLayerAKey("lora_strength", v),
								min: 0,
								max: 1.5,
								step: .05,
								placeholder: "0.8",
								width: "w-32"
							})
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.group,
					"data-testid": "tl-post-panel",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.groupTitle,
							children: "Post-processing"
						}),
						row("sharpen_enabled"),
						layerA.sharpen_enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							row("sharpen_method"),
							row("sharpen_strength"),
							(layerA.sharpen_method ?? "rcas") !== "rcas" && row("sharpen_radius"),
							layerA.sharpen_method === "adaptive_usm" && row("sharpen_threshold"),
							layerA.sharpen_method === "deconvolution" && row("sharpen_iterations")
						] }),
						row("interpolate_enabled"),
						layerA.interpolate_enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Model",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
								ariaLabel: "Interpolation model (run)",
								value: layerA.interpolate_model ?? "film_net_fp16.safetensors",
								onChange: (v) => setLayerAKey("interpolate_model", v === "rife47.pth" ? v : "film_net_fp16.safetensors"),
								options: [{
									value: "film_net_fp16.safetensors",
									label: "FILM"
								}, {
									value: "rife47.pth",
									label: "RIFE 4.7"
								}],
								emptyLabel: false,
								width: "w-32"
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Multiplier",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
								ariaLabel: "Interpolation multiplier (run)",
								value: String(layerA.interpolate_multiplier ?? 2),
								onChange: (v) => setLayerAKey("interpolate_multiplier", Number(v)),
								options: [{
									value: "2",
									label: "2x"
								}, {
									value: "4",
									label: "4x"
								}],
								emptyLabel: false,
								width: "w-32"
							})
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "RTX Super-Res",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckControl, {
								ariaLabel: "RTX Super-Resolution (run)",
								checked: layerA.rtx_vsr_enabled === true,
								onChange: (v) => setLayerAKey("rtx_vsr_enabled", v)
							})
						}),
						layerA.rtx_vsr_enabled === true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Scale",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
								ariaLabel: "RTX Super-Res scale (run)",
								value: String(layerA.rtx_vsr_multiplier ?? 2),
								onChange: (v) => setLayerAKey("rtx_vsr_multiplier", Number(v)),
								options: [
									{
										value: "2",
										label: "2x"
									},
									{
										value: "3",
										label: "3x"
									},
									{
										value: "4",
										label: "4x"
									}
								],
								emptyLabel: false,
								width: "w-32"
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Quality",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
								ariaLabel: "RTX Super-Res quality (run)",
								value: layerA.rtx_vsr_quality ?? "ULTRA",
								onChange: (v) => setLayerAKey("rtx_vsr_quality", v),
								options: [
									"ULTRA",
									"HIGH",
									"MEDIUM",
									"LOW"
								],
								emptyLabel: false,
								width: "w-32"
							})
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
							label: "Output CRF",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
								ariaLabel: "Output CRF (run)",
								value: layerA.crf,
								onChange: (v) => setLayerAKey("crf", v === void 0 ? void 0 : Math.round(v)),
								min: 8,
								max: 34,
								step: 1,
								placeholder: "19",
								width: "w-32"
							})
						})
					]
				})
			] });
		}
		//#endregion
		//#region src/ui/studio/refUtils.ts
		/** Genre of an artifact by name AND url — the ref buckets are
		* GENRE-TYPED (images → ref_image_*, videos → ref_video_*, audios →
		* ref_audio_*, video_audios → ref_video_audio_*): a picker that offers
		* "a.png" inside Ref videos is the freetext bug wearing a costume.
		* (2026-09-02 audit) extension-only was blind to THIS estate's own
		* artifact names — video_w1_main carries no extension and classed
		* "other", so the run's own films never appeared in ANY picker. Estate
		* name patterns + the URL's extension (served URLs carry real ones). */
		function refGenreOf(name, url) {
			const n = name.toLowerCase();
			if (/^video_w\d+_/.test(n)) {
				if (n.endsWith("_last_frame") || n.includes("_prev")) return "image";
				return "video";
			}
			const e = (`${n} ${url ? url.toLowerCase().split("?")[0] : ""}`.split(".").pop() ?? "").split(/[^a-z0-9]/)[0] ?? "";
			if ([
				"png",
				"jpg",
				"jpeg",
				"webp",
				"gif",
				"bmp",
				"avif"
			].includes(e)) return "image";
			if ([
				"mp4",
				"webm",
				"mov",
				"mkv",
				"avi",
				"m4v"
			].includes(e)) return "video";
			if ([
				"mp3",
				"wav",
				"flac",
				"ogg",
				"m4a",
				"aac",
				"opus"
			].includes(e)) return "audio";
			return "other";
		}
		/** Split a serialized ref list WITHOUT shredding data: URLs — the
		* wire format is a comma list, but an inline upload carries its OWN
		* comma (data:<mime>;base64,<payload>). Same state machine as the
		* backend's cc_split_ref_list: inside a data: token, the first comma
		* is the mime separator, later commas end the token. */
		function splitRefList(v) {
			if (!v) return [];
			const out = [];
			let i = 0;
			while (i < v.length) {
				while (i < v.length && (v[i] === "," || v[i] === " " || v[i] === "	")) i++;
				if (i >= v.length) break;
				const start = i;
				const isData = v.startsWith("data:", i);
				let mimeComma = false;
				while (i < v.length) {
					if (v[i] === ",") {
						if (isData && !mimeComma) {
							mimeComma = true;
							i++;
							continue;
						}
						break;
					}
					i++;
				}
				let end = i;
				while (end > start && (v[end - 1] === " " || v[end - 1] === "	")) end--;
				if (end > start) out.push(v.slice(start, end));
			}
			return out;
		}
		const REF_UPLOAD_SPEC = {
			image: {
				accept: "image/*",
				maxMb: 20,
				note: "≤20 MB"
			},
			video: {
				accept: "video/*",
				maxMb: 24,
				note: "≤24 MB"
			},
			audio: {
				accept: "audio/*",
				maxMb: 16,
				note: "≤16 MB"
			}
		};
		/** Chip hover note: a known upstream artifact names its card, an
		* unknown name is flagged (it would pass through unresolved). */
		function artifactThumbNote(name) {
			return `artifact: ${name}`;
		}
		//#endregion
		//#region src/ui/studio/RefPickerRow.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** One ref bucket row — the ARTIFACT SYSTEM, not freetext (operator
		* 2026-09-02: "REF IS FREETEXT? WE HAVE A SYSTEM TO HANDLE [REDACTED 2026-11-05] LIKE
		* THIS"). Sources, in estate order:
		*   • PICK — a genre-filtered select over the AVAILABLE artifacts:
		*     upstream cards PLUS the run's own outputs (window films, seams,
		*     the final cut — in a standalone timeline card those are the only
		*     sources; "no artifacts upstream" with a filmstrip full of clips
		*     on screen was the 2026-09-02 lazy-audit bug). A picked chip
		*     carries the artifact NAME, a live ctx reference the backend
		*     re-resolves each run.
		*   • UPLOAD — EVERY bucket (2026-09-02: "ONLY SOME HAVE UPLOAD
		*     BUTTON"): file → data: URL chip; the backend's ref staging
		*     base64-decodes data: sources into the input dir (same law as
		*     audio clips). Per-genre accept + cap.
		*   • REMOVE — the × on a chip.
		* The serialized shape is unchanged (comma string → arrays on save). */
		function RefPickerRow({ label, ariaLabel, testId, value, onChange, genre, cap, artifacts }) {
			const chips = splitRefList(value);
			const candidates = artifacts.filter((a) => refGenreOf(a.name, a.url) === genre && !chips.includes(a.name) && !chips.some((c) => c === a.name));
			const over = chips.length > cap;
			const setChips = (next) => onChange(next.length ? next.join(", ") : void 0);
			const up = REF_UPLOAD_SPEC[genre];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.refRow,
				"data-testid": testId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.refHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.refLabel,
							children: label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: cn(studio_module_css_default.refCount, over ? studio_module_css_default.refCountOver : studio_module_css_default.refCountOk),
							children: [
								chips.length,
								"/",
								cap,
								over ? " over cap" : ""
							]
						})]
					}),
					chips.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.chips,
						children: chips.map((chip, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							title: chip.startsWith("data:") ? "uploaded (inline)" : artifactThumbNote(chip),
							className: studio_module_css_default.chip,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.truncate,
								children: chip.startsWith("data:") ? `upload (${Math.round(chip.length / 1365)}kB)` : chip
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								"aria-label": `Remove ${label} ${chip.startsWith("data:") ? "upload" : chip}`,
								onClick: () => setChips(chips.filter((_, x) => x !== ci)),
								className: studio_module_css_default.chipX,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X$1, {
									className: studio_module_css_default.sz10,
									"aria-hidden": true
								})
							})]
						}, `${chip}-${ci}`))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.pickRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
							"aria-label": `Add ${ariaLabel}`,
							value: "",
							disabled: candidates.length === 0,
							options: [{
								value: "",
								label: candidates.length === 0 ? chips.length >= cap ? "at cap" : `no ${genre} artifacts yet` : `+ pick ${genre} artifact…`
							}, ...candidates.map((a) => ({
								value: a.name,
								label: a.name
							}))],
							onChange: (n) => {
								if (n) setChips([...chips, n]);
							},
							className: studio_module_css_default.pickSel,
							buttonClassName: candidates.length ? studio_module_css_default.pickSelBoxOk : studio_module_css_default.pickSelBoxEmpty
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: studio_module_css_default.uploadBtn,
							title: `Upload a ${genre} (${up.note}, rides inline as a data: URL)`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Upload, {
								className: studio_module_css_default.sz10,
								"aria-hidden": true
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "file",
								accept: up.accept,
								className: studio_module_css_default.hiddenInput,
								"aria-label": `Upload ${ariaLabel}`,
								onChange: async (e) => {
									const f = e.target.files?.[0];
									e.target.value = "";
									if (!f) return;
									if (f.size > up.maxMb * 1024 * 1024) return;
									try {
										setChips([...chips, await readAsDataURL$1(f)]);
									} catch {}
								}
							})]
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/RunRefsClips.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Layer A rail: run-level identity refs + audio-clips upload (3189–3315). */
		function RunRefsClips({ layerA, setLayerAKey, isRef2va, refArtifacts, takeAudioFile, audioUploadRef }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [isRef2va && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.group,
				"data-testid": "tl-refs-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.refsHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.groupTitle,
							children: "Identity refs (ref2va)"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.refsNote,
							children: "ride EVERY window · identity across seams"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefPickerRow, {
						label: "Ref images",
						ariaLabel: "ref images (run)",
						testId: "tl-ref-images-run",
						value: layerA.h3_ref_images,
						onChange: (v) => setLayerAKey("h3_ref_images", v),
						genre: "image",
						cap: 10,
						artifacts: refArtifacts
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefPickerRow, {
						label: "Ref videos",
						ariaLabel: "ref videos (run)",
						testId: "tl-ref-videos-run",
						value: layerA.h3_ref_videos,
						onChange: (v) => setLayerAKey("h3_ref_videos", v),
						genre: "video",
						cap: 3,
						artifacts: refArtifacts
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefPickerRow, {
						label: "Ref audios",
						ariaLabel: "ref audios (run)",
						testId: "tl-ref-audios-run",
						value: layerA.h3_ref_audios,
						onChange: (v) => setLayerAKey("h3_ref_audios", v),
						genre: "audio",
						cap: 3,
						artifacts: refArtifacts
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefPickerRow, {
						label: "Ref video audios",
						ariaLabel: "ref video audios (run)",
						testId: "tl-ref-video-audios-run",
						value: layerA.h3_ref_video_audios,
						onChange: (v) => setLayerAKey("h3_ref_video_audios", v),
						genre: "audio",
						cap: 3,
						artifacts: refArtifacts
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Ref size",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
							ariaLabel: "Ref image size (run)",
							width: "w-40",
							mono: true,
							value: typeof layerA.h3_ref_image_size === "string" ? layerA.h3_ref_image_size : void 0,
							onChange: (v) => {
								setLayerAKey("h3_ref_image_size", v);
							},
							options: ["match", "max"],
							emptyLabel: "match (V7 default)"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Audio trim start (s)",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Ref audio trim start (run)",
							value: layerA.h3_ref_audio_trim_start,
							onChange: (v) => setLayerAKey("h3_ref_audio_trim_start", v),
							min: 0,
							step: .5,
							placeholder: "0",
							width: "w-32"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
						label: "Audio trim length (s)",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							ariaLabel: "Ref audio trim duration (run)",
							value: layerA.h3_ref_audio_trim_duration,
							onChange: (v) => setLayerAKey("h3_ref_audio_trim_duration", v),
							min: .5,
							step: .5,
							placeholder: "full",
							width: "w-32"
						})
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.clipsRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsTitle,
						children: "Clips"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						type: "button",
						"data-testid": "tl-audio-upload",
						onClick: () => audioUploadRef.current?.click(),
						className: studio_module_css_default.uploadAudio,
						children: "⤴ Upload audio"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsNote,
						children: layerA.audio_clips?.length ? `${layerA.audio_clips.length} clip${layerA.audio_clips.length === 1 ? "" : "s"} on the Music row — drag to move, × to remove` : "none — upload or drop a file on the Music row"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: audioUploadRef,
						type: "file",
						accept: "audio/*",
						multiple: true,
						className: studio_module_css_default.hiddenInput,
						onChange: (e) => {
							Array.from(e.target.files ?? []).forEach((f) => takeAudioFile(f, 0));
							e.target.value = "";
						}
					})
				]
			})] });
		}
		//#endregion
		//#region src/ui/studio/BeatKnobControl.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** One per-call knob control (the "Call knobs" fold). Every control has
		* an explicit "inherit" empty state: unset → the key is absent from the
		* serialized call → the window inherits the Layer A value (REPLACE
		* semantics, §10.3: absent = inherit, present = override). */
		function BeatKnobControl({ callIndex, knob, value, onChange }) {
			const label = `Call ${callIndex} knob: ${knob}`;
			const opts = {
				sampler: SAMPLER_OPTIONS,
				scheduler: SCHEDULER_OPTIONS,
				h3_sla_block_size: ["64", "128"],
				h3_sla_reference_protection: [
					"Off",
					"Light",
					"True"
				],
				h3_sla_dense_backend: [
					"comfy_kitchen",
					"pytorch",
					"auto"
				],
				sharpen_method: [
					"rcas",
					"adaptive_usm",
					"high_pass",
					"deconvolution"
				],
				interpolate_model: ["film_net_fp32.pt"]
			}[knob];
			if (opts) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
				label: KNOB_LABELS[knob],
				density: "sm",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectControl, {
					ariaLabel: label,
					value: typeof value === "string" ? value : void 0,
					onChange: (v) => onChange(knob, v),
					options: opts
				})
			});
			if (knob === "h3_sla_dense_steps") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
				label: KNOB_LABELS[knob],
				density: "sm",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextControl, {
					ariaLabel: label,
					value: typeof value === "string" ? value : void 0,
					onChange: (v) => onChange(knob, v),
					placeholder: "inherit (0,1)"
				})
			});
			if (knob.startsWith("h3_")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
				label: KNOB_LABELS[knob],
				density: "sm",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TriControl, {
					ariaLabel: label,
					value: typeof value === "boolean" ? value : void 0,
					onChange: (v) => onChange(knob, v)
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ControlRow, {
				label: KNOB_LABELS[knob],
				density: "sm",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
					ariaLabel: label,
					value: typeof value === "number" ? value : void 0,
					onChange: (v) => onChange(knob, v),
					step: knob === "sampling_steps" ? 1 : .1,
					min: knob === "sampling_steps" ? 1 : .01
				})
			});
		}
		//#endregion
		//#region src/ui/studio/CallFrameSubcard.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** One frame-conditioning subcard — a FULL image input, at parity with
		* every other image slot (2026-08-24 upgrade: "first frame / last frame
		* are weak versions compared to other image input nodes — I can't link
		* back to previous outputs"). The affordances:
		*
		*   THE SOURCE ROW (2026-09-13, the operator's law: ONE generic input
		*   component, no exceptions — even the studio): the bespoke SlotSquare
		*   + typed source line + inline link panel are DEAD. This subcard
		*   rides @melite/card-base's SourceRow — the same plus square, the
		*   same three-entry menu (From flow / From media / From file):
		*     • From flow lists the upstream cards' IMAGE artifacts (links);
		*       the write maps URL→NAME (the drop-honesty law: an unmatched
		*       URL writes NOTHING — it would pass through unresolved).
		*     • From file keeps the studio's OWN file law (image-only, 20 MB
		*       cap, readAsDataURL → data: URL; _resolveSource decodes data:
		*       first-class) through the wire's onFile override.
		*     • From media lists the runs library through the same door; the
		*       URL→NAME honesty applies (foreign URLs refuse visibly).
		*   • the FIRST frame's exception — the prev-video continuation toggle
		*     ("use the last X seconds of the previous video", rule 3b). */
		function CallFrameSubcard({ label, hint, testId, callIndex, value, onChange, nameToUrl, urlToName, links, prevSec, onPrevSec, transition, onTransition, prevDisabled, prevNote }) {
			const [fileError, setFileError] = (0, react.useState)(null);
			const v = value?.trim() ?? "";
			v.startsWith("data:") || v && nameToUrl.get(v);
			/** File upload / OS drop → data: URL into the source. Image-only with
			* a size cap (the doc stores the payload inline — keep it sane); a
			* rejection is VISIBLE (the inline error line), never a silent drop. */
			const takeFile = async (file) => {
				if (!file.type.startsWith("image/")) {
					setFileError(`not an image (${file.type || "unknown type"})`);
					return;
				}
				if (file.size > 20971520) {
					setFileError("image too large (max 20 MB)");
					return;
				}
				try {
					const dataUrl = await readAsDataURL$1(file);
					setFileError(null);
					onChange(dataUrl);
				} catch {
					setFileError("could not read that file");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": testId,
				className: studio_module_css_default.sub,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.subHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.subTitle,
							children: label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cn(studio_module_css_default.truncate, studio_module_css_default.subHint),
							title: hint,
							children: hint
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SourceRow, {
						label,
						kind: "image",
						value: v === "" ? null : v.startsWith("data:") ? v : nameToUrl.get(v) ?? v,
						candidates: (links ?? []).map((a) => ({
							id: a.name,
							label: a.name,
							url: a.url
						})),
						onFile: (f) => {
							takeFile(f);
						},
						onEdit: (src) => {
							if (src === "") {
								onChange("");
								return;
							}
							if (src.startsWith("data:")) {
								onChange(src);
								return;
							}
							const name = urlToName.get(src);
							if (name !== void 0) {
								onChange(name);
								setFileError(null);
								return;
							}
							setFileError("that source is not in this timeline’s vocabulary");
						}
					}),
					fileError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": `${testId}-file-error`,
						className: studio_module_css_default.fileErr,
						children: fileError
					}),
					onPrevSec && onTransition && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.seamRow,
						title: "How this call joins the previous one: cut re-feeds the previous VIDEO tail as an opener clip; extend chains the previous LATENT — seamless motion, texture and audio phase carry across the seam",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.seamLabel,
							children: "seam"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
							value: transition === "extend" ? "extend" : "cut",
							"aria-label": "Call " + callIndex + " seam mode",
							options: [{
								value: "cut",
								label: "cut — prev video opener"
							}, {
								value: "extend",
								label: "extend — latent chain"
							}],
							onChange: (v) => onTransition(v === "extend" ? "extend" : "cut"),
							className: studio_module_css_default.wFull,
							buttonClassName: studio_module_css_default.mono
						})]
					}),
					onPrevSec && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: cn(studio_module_css_default.prevLabel, prevDisabled ? studio_module_css_default.prevLabelOff : studio_module_css_default.prevLabelOn),
						title: prevNote,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"data-testid": testId + "-prev-toggle",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									label: "Call " + callIndex + " continue from previous",
									disabled: prevDisabled,
									checked: prevSec != null,
									onChange: (v) => onPrevSec(v ? transition === "extend" ? 3 : 2 : null)
								})
							}),
							transition === "extend" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.nowrap,
									children: "chain the last"
								}),
								prevSec != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									type: "number",
									min: .5,
									step: .5,
									value: prevSec,
									"aria-label": "Call " + callIndex + " latent carry seconds",
									"data-testid": testId + "-prev-sec",
									onChange: (e) => {
										const n = Number(e.target.value);
										if (Number.isFinite(n) && n > 0) onPrevSec(n);
									},
									className: studio_module_css_default.prevNum
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.nowrap,
									children: "s of the previous latent"
								}),
								prevSec != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.prevCarryNote,
									children: "seamless carry — the motion-context node splices the previous window's latent tail; carried slots hold bit-exact while the rest denoises (windows stitch into one continuous clip)"
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.nowrap,
									children: "open from the last"
								}),
								prevSec != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									type: "number",
									min: .5,
									step: .5,
									value: prevSec,
									"aria-label": "Call " + callIndex + " previous video tail seconds",
									"data-testid": testId + "-prev-sec",
									onChange: (e) => {
										const n = Number(e.target.value);
										if (Number.isFinite(n) && n > 0) onPrevSec(n);
									},
									className: cn(studio_module_css_default.prevNum, studio_module_css_default.prevNum9)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.nowrap,
									children: "s of the previous video"
								}),
								prevSec != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.prevNote,
									children: "the tail carries the opening motion — the plan snaps it to the guide-clip packing rule"
								})
							] }),
							prevDisabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.prevNote,
								children: prevNote
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/CallCardPrompt.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** One call's prompt editor: text XOR beat segments + ✨ (lines 3468–3640). */
		function CallCardPrompt({ c, i, callSelected, segmentMode, selected, handlePromptUpdate, setBeatSegment, addBeatSegment, deleteBeatSegment, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, beatRowRefs }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: segmentMode ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.beatsWrap,
				"data-testid": "tl-call-beats",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.beatsHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.beatsTitle,
							children: "Prompt segments"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.beatsNote,
							children: "join into one prompt with time markers — they never cut"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => addBeatSegment(i),
							"aria-label": `Add segment to call ${i}`,
							className: studio_module_css_default.addSeg,
							children: "+"
						})
					]
				}), c.beats.map((seg, j) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-beat-segment": j,
					"data-selected": callSelected && selected?.beatIdx === j ? "true" : void 0,
					ref: (el) => {
						beatRowRefs.current[i] ??= [];
						beatRowRefs.current[i][j] = el;
					},
					className: cn(studio_module_css_default.beatRow, callSelected && selected?.beatIdx === j && studio_module_css_default.beatRowSel),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: seg.text,
							placeholder: `segment ${j + 1} — the action, camera, mood over these frames`,
							"aria-label": `Call ${i} segment ${j} text`,
							"data-testid": "tl-call-beat-text",
							onChange: (e) => setBeatSegment(i, j, { text: e.target.value }),
							className: cn(studio_module_css_default.textIn, !seg.text.trim() && studio_module_css_default.textInEmpty)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							title: "Rewrite this segment in H3 cinematic style",
							"aria-label": "Enhance call " + i + " segment " + j,
							"data-testid": "tl-beat-enhance",
							disabled: !seg.text.trim() || enhancing["call-" + i + "-beat-" + j] === true,
							onClick: () => void enhanceOne("call-" + i + "-beat-" + j, seg.text, (t) => setBeatSegment(i, j, { text: t })),
							className: studio_module_css_default.iconMini,
							children: enhancing["call-" + i + "-beat-" + j] === true ? "…" : "✨"
						}),
						enhanceUndo["call-" + i + "-beat-" + j] !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "button",
							title: "Restore the pre-enhancement text",
							"aria-label": "Undo enhance call " + i + " segment " + j,
							"data-testid": "tl-beat-enhance-undo",
							onClick: () => undoEnhance("call-" + i + "-beat-" + j, (t) => setBeatSegment(i, j, { text: t })),
							className: cn(studio_module_css_default.iconMini, studio_module_css_default.iconMiniMut),
							children: "↩"
						}),
						enhanceErr["call-" + i + "-beat-" + j] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.beatErr,
							"data-testid": "tl-beat-enhance-error",
							children: enhanceErr["call-" + i + "-beat-" + j]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							value: seg.start_frame,
							ariaLabel: `Call ${i} segment ${j} start frame`,
							onChange: (v) => {
								if (v !== void 0) setBeatSegment(i, j, { start_frame: Math.round(v) });
							},
							min: 0,
							step: 1,
							align: "center",
							width: "w-14",
							size: "sm",
							placeholder: ""
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.beatDash,
							children: "–"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
							value: seg.end_frame,
							ariaLabel: `Call ${i} segment ${j} end frame`,
							onChange: (v) => {
								if (v !== void 0) setBeatSegment(i, j, { end_frame: Math.round(v) });
							},
							min: 0,
							step: 1,
							align: "center",
							width: "w-14",
							size: "sm",
							placeholder: ""
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => deleteBeatSegment(i, j),
							"aria-label": `Delete call ${i} segment ${j}`,
							className: studio_module_css_default.beatDel,
							children: "×"
						})
					]
				}, j))]
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.beatsWrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.textHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.textLabel,
							children: "the prompt this call sends to H3"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: studio_module_css_default.enhanceRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								title: "Rewrite this call's prompt in H3 cinematic style",
								"aria-label": "Enhance call " + i + " prompt",
								"data-testid": "tl-call-enhance",
								disabled: !(c.text ?? "").trim() || enhancing["call-" + i] === true,
								onClick: () => void enhanceOne("call-" + i, c.text ?? "", (t) => handlePromptUpdate("call-" + i, t)),
								className: studio_module_css_default.enhanceBtn,
								children: enhancing["call-" + i] === true ? "enhancing…" : "✨ H3 style"
							}), enhanceUndo["call-" + i] !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "button",
								"aria-label": "Undo enhance call " + i + " prompt",
								"data-testid": "tl-call-enhance-undo",
								onClick: () => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t)),
								className: studio_module_css_default.undoBtn,
								children: "↩ undo"
							})]
						})]
					}),
					enhanceErr["call-" + i] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.beatErr,
						"data-testid": "tl-call-enhance-error",
						children: enhanceErr["call-" + i]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						value: c.text ?? "",
						placeholder: "describe the action, camera, and mood for this call — empty calls refuse the plan",
						"aria-label": `Call ${i} prompt`,
						"data-testid": "tl-call-prompt",
						rows: 2,
						onChange: (e) => handlePromptUpdate(`call-${i}`, e.target.value),
						className: cn(studio_module_css_default.promptBox, !(c.text ?? "").trim() && studio_module_css_default.promptBoxEmpty)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						onClick: () => addBeatSegment(i),
						"aria-label": `Add segment to call ${i}`,
						className: studio_module_css_default.addSegText,
						children: "+ prompt segments"
					})
				]
			}) });
		}
		//#endregion
		//#region src/ui/studio/CallCard.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** One focused model-call card (monolith lines 3418–3466 + 3641–3844;
		*  the prompt block lives in CallCardPrompt). */
		function CallCard({ c, i, deps }) {
			const { selected, fps, callCardRefs, beatRowRefs, artifactIndex, linkGroups, isRef2va, refArtifacts, handlePromptDelete, handlePromptUpdate, setBeatSegment, addBeatSegment, deleteBeatSegment, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, setCallSpan, setCallGuide, setCallPrevSec, setCallTransition, setCallRefs, setCallKnob } = deps;
			if (selected != null && i !== selected.callIdx) return null;
			const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
			const segmentMode = !!c.beats?.length;
			const callSelected = selected?.callIdx === i;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-call-card": i,
				"data-guides": GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).join(" ") || void 0,
				"data-knobs": activeKnobs || void 0,
				"data-selected": callSelected ? "true" : void 0,
				ref: (el) => {
					callCardRefs.current[i] = el;
				},
				className: cn(studio_module_css_default.callCard, callSelected && studio_module_css_default.callCardSel),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.cardHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.cardId,
								children: [
									"#",
									i,
									" · Model call ",
									i + 1
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.cardSpan,
								title: `frames ${c.start_frame}–${c.end_frame} (end exclusive)`,
								children: [
									"frames ",
									c.start_frame,
									"–",
									c.end_frame,
									" · ",
									((c.end_frame - c.start_frame) / fps).toFixed(1),
									"s"
								]
							}),
							activeKnobs > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.knobTag,
								children: [
									activeKnobs,
									" knob",
									activeKnobs === 1 ? "" : "s"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip$1, {
								tip: "Delete this call — its span merges into the neighbor",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									onClick: () => handlePromptDelete(`call-${i}`),
									"aria-label": `Delete call ${i}`,
									className: studio_module_css_default.delBtn,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(X$1, {
										className: studio_module_css_default.sz10,
										"aria-hidden": true
									}), " Delete"]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCardPrompt, {
						c,
						i,
						callSelected,
						segmentMode,
						selected,
						handlePromptUpdate,
						setBeatSegment,
						addBeatSegment,
						deleteBeatSegment,
						enhanceOne,
						undoEnhance,
						enhancing,
						enhanceErr,
						enhanceUndo,
						beatRowRefs
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.spanRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanLabel,
								children: "Span"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
								ariaLabel: `Call ${i} start frame`,
								value: c.start_frame,
								onChange: (v) => {
									if (v !== void 0) setCallSpan(i, "start", Math.round(v));
								},
								min: 0,
								step: 1,
								align: "center",
								width: "w-16",
								placeholder: ""
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanDash,
								children: "–"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
								ariaLabel: `Call ${i} end frame`,
								value: c.end_frame,
								onChange: (v) => {
									if (v !== void 0) setCallSpan(i, "end", Math.round(v));
								},
								min: 0,
								step: 1,
								align: "center",
								width: "w-16",
								placeholder: ""
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanNote,
								children: "end exclusive · edit ripples the cut into the neighbor"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.framesRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallFrameSubcard, {
							label: "First frame",
							hint: "the opening still — anchors frame 0 of the window",
							testId: "tl-first-frame",
							callIndex: i,
							value: c.image,
							onChange: (source) => setCallGuide(i, "image", source),
							nameToUrl: artifactIndex.byName,
							urlToName: artifactIndex.byUrl,
							links: linkGroups,
							prevSec: c.first_frame_prev_sec,
							onPrevSec: (sec) => setCallPrevSec(i, sec),
							transition: c.transition,
							onTransition: (t) => setCallTransition(i, t),
							prevDisabled: i === 0,
							prevNote: i === 0 ? "the first call has no previous video to continue from" : void 0
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallFrameSubcard, {
							label: "Last frame",
							hint: "the closing still — pinned at the call's final frame",
							testId: "tl-last-frame",
							callIndex: i,
							value: c.last_frame,
							onChange: (source) => setCallGuide(i, "last_frame", source),
							nameToUrl: artifactIndex.byName,
							urlToName: artifactIndex.byUrl,
							links: linkGroups
						})]
					}),
					(() => {
						const total = splitRefList(c.refs?.images).length + (!!(c.image ?? "").trim() ? 1 : 0);
						if (total === 0) return null;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.refBadgeRow,
							"data-testid": "tl-call-ref-images",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: cn(studio_module_css_default.refBadge, total > 10 ? studio_module_css_default.refBadgeOver : studio_module_css_default.refBadgeOk),
								title: total > 10 ? `${total} refs total — exceeds the 10-image cap` : `${total} ref image${total === 1 ? "" : "s"} (guide + extras) — managed in Identity refs below`,
								children: [
									"refs ",
									total,
									"/10"
								]
							})
						});
					})(),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.guidesRow,
						children: ["clip", "audio"].map((kind) => {
							const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === kind);
							const color = `rgb(${track.color?.[0] ?? 176}, ${track.color?.[1] ?? 180}, ${track.color?.[2] ?? 186})`;
							const src = c[kind] ?? "";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.guideWrap,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.guideDot,
									style: {
										background: src.trim() ? color : "transparent",
										border: `1px solid ${color}77`
									},
									"aria-hidden": true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									list: "tl-kf-sources",
									value: src,
									placeholder: kind,
									"aria-label": `Call ${i} ${kind} guide`,
									"data-testid": "tl-call-guide",
									onChange: (e) => setCallGuide(i, kind, e.target.value),
									className: cn(studio_module_css_default.guideIn, !src.trim() && studio_module_css_default.guideInEmpty)
								})]
							}, kind);
						})
					}),
					isRef2va && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.callRefs,
						"data-testid": "tl-call-refs",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: studio_module_css_default.callRefsHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.callRefsTitle,
								children: "Identity refs (this call)"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.callRefsNote,
								children: "replaces run refs · empty = inherit"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: studio_module_css_default.callRefsBody,
							children: [[[
								"images",
								"Ref images",
								"image",
								10
							]].map(([key, label, genre, cap]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefPickerRow, {
								label,
								ariaLabel: `call ${i} ${label}`,
								testId: "tl-call-ref-picker",
								value: c.refs?.[key],
								onChange: (v) => setCallRefs(i, key, v ?? ""),
								genre,
								cap,
								artifacts: refArtifacts
							}, key)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: studio_module_css_default.callRefsFoot,
								children: "per-call refs are the image bus — ref videos / audios ride at run level"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: studio_module_css_default.knobFold,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
							className: studio_module_css_default.knobSummary,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, {
									className: cn(studio_module_css_default.sz10, studio_module_css_default.chev),
									"aria-hidden": true
								}),
								"Call knobs",
								activeKnobs > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: studio_module_css_default.knobCount,
									children: activeKnobs
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.knobGrid,
							children: KNOB_ORDER.map((knob) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BeatKnobControl, {
								callIndex: i,
								knob,
								value: c.knobs?.[knob],
								onChange: (key, v) => setCallKnob(i, key, v)
							}, knob))
						})]
					})
				]
			}, i);
		}
		//#endregion
		//#region src/ui/studio/CallCardsPanel.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Layer B rail: compact call rows ⇄ focused call editor + legacy
		*  keyframes (monolith lines 3320–3416 + 3847–3924; per-call bodies
		*  render through CallCard). */
		function CallCardsPanel({ calls, selected, setSelected, fps, sourceOptions, keyframes, handleKeyframeMove, handleKeyframeDelete, setKeyframeSource, deps }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.panel,
				"data-testid": "tl-call-panel",
				children: [
					selected == null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.rowsHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.rowsTitle,
							children: "Model calls"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: studio_module_css_default.rowsHint,
							children: "click a row — or its clip in the bar — to edit that call here · a call's prompt is text, or beat segments within it · guides + knobs ride the call · the compiler cuts windows at call boundaries"
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.focusHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip$1, {
								tip: "Back to the run's global parameters — or click any empty spot in the timeline",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									onClick: () => setSelected(null),
									"aria-label": "Back to global parameters",
									"data-testid": "tl-back-to-global",
									className: studio_module_css_default.backBtn,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronLeft, {
										className: studio_module_css_default.sz12,
										"aria-hidden": true
									}), " Global"]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.focusTitle,
								children: [
									"#",
									selected.callIdx,
									" · Model call ",
									selected.callIdx + 1
								]
							}),
							selected.beatIdx != null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: studio_module_css_default.beatFlag,
								children: [
									"beat ",
									selected.beatIdx + 1,
									" selected"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("datalist", {
						id: "tl-kf-sources",
						children: sourceOptions.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: o.name,
							children: [
								o.title,
								" · ",
								o.name
							]
						}, `${o.title}:${o.name}`))
					}),
					selected == null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.compactList,
						children: calls.map((c, i) => {
							const segCount = c.beats?.length ?? 0;
							const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
							const excerpt = segCount ? c.beats.map((s) => s.text || "(empty)").join(" · ") : c.text ?? "";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								type: "button",
								"data-call-row": i,
								onClick: () => setSelected({ callIdx: i }),
								className: studio_module_css_default.callRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: studio_module_css_default.callIdx,
										children: ["#", i]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: cn(studio_module_css_default.excerpt, excerpt.trim() ? studio_module_css_default.excerptFull : studio_module_css_default.excerptEmpty),
										children: excerpt.trim() || "(empty — needs a prompt)"
									}),
									segCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: studio_module_css_default.beatCount,
										children: [
											segCount,
											" beat",
											segCount === 1 ? "" : "s"
										]
									}),
									activeKnobs > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: studio_module_css_default.knobBadge,
										children: activeKnobs
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: studio_module_css_default.callDur,
										children: [((c.end_frame - c.start_frame) / fps).toFixed(1), "s"]
									})
								]
							}, i);
						})
					}),
					selected != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.focusList,
						children: calls.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCard, {
							c,
							i,
							deps
						}, i))
					}),
					selected == null && keyframes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.kfPanel,
						"data-testid": "tl-keyframe-panel",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: studio_module_css_default.kfHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.kfTitle,
								children: "Frame-exact keyframes"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.kfHint,
								children: "legacy vocabulary — prefer a beat's guides; a hand image at a cut is that window's first frame"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.compactList,
							children: keyframes.map((k, i) => {
								const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === k.kind);
								const color = `rgb(${track.color?.[0] ?? 176}, ${track.color?.[1] ?? 180}, ${track.color?.[2] ?? 186})`;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-kf-row": i,
									"data-wired": k.source.trim() ? "true" : "false",
									className: studio_module_css_default.kfRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: studio_module_css_default.kfKind,
											style: {
												color,
												background: `${color}1f`,
												border: `1px solid ${color}55`
											},
											children: k.kind
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberControl, {
											value: k.frame,
											ariaLabel: `Keyframe ${i} frame`,
											onChange: (v) => {
												if (v !== void 0) handleKeyframeMove(`kf-${i}`, Math.round(v));
											},
											align: "center",
											width: "w-16",
											placeholder: ""
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											list: "tl-kf-sources",
											value: k.source,
											placeholder: sourceOptions.length ? "artifact name or filename…" : "uploaded filename…",
											"aria-label": `Keyframe ${i} source`,
											"data-testid": "tl-kf-source",
											onChange: (e) => setKeyframeSource(i, e.target.value),
											className: cn(studio_module_css_default.kfIn, !k.source.trim() && studio_module_css_default.textInEmpty)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: studio_module_css_default.kfTime,
											children: [(k.frame / fps).toFixed(2), "s"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tip$1, {
											tip: `Delete this ${k.kind} keyframe`,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												onClick: () => handleKeyframeDelete(`kf-${i}`),
												"aria-label": `Delete keyframe ${i}`,
												className: studio_module_css_default.kfDel,
												children: "×"
											})
										})
									]
								}, i);
							})
						})]
					})
				]
			}) });
		}
		//#endregion
		//#region src/ui/studio/docHydrate.ts
		function hydrateLayerA(raw) {
			const num = (k, d) => {
				const v = raw?.[k];
				const n = typeof v === "number" ? v : Number(v);
				return Number.isFinite(n) && n > 0 ? n : d;
			};
			const audio_mode = AUDIO_MODES.includes(raw?.audio_mode) ? raw.audio_mode : "none";
			return {
				preset: typeof raw?.preset === "string" && raw.preset ? raw.preset : "draft_02mp",
				fps: num("fps", 24),
				seed: num("seed", 42),
				audio_mode,
				continuity: raw?.continuity !== false,
				shift_video: raw?.shift_video != null ? Number(raw.shift_video) : void 0,
				shift_audio: raw?.shift_audio != null ? Number(raw.shift_audio) : void 0,
				sampler: typeof raw?.sampler === "string" && raw.sampler ? raw.sampler : void 0,
				scheduler: typeof raw?.scheduler === "string" && raw.scheduler ? raw.scheduler : void 0,
				sampling_steps: raw?.sampling_steps != null ? Number(raw.sampling_steps) : void 0,
				denoise: raw?.denoise != null ? Number(raw.denoise) : void 0,
				width: raw?.width != null ? Number(raw.width) : void 0,
				height: raw?.height != null ? Number(raw.height) : void 0,
				h3_attention: raw?.h3_attention === "kitchen" || raw?.h3_attention === "sol" || raw?.h3_attention === "sage" || raw?.h3_attention === "sla" ? raw.h3_attention : raw?.h3_sage_attention === true ? "sage" : void 0,
				h3_fp16_accumulation: raw?.h3_fp16_accumulation === true,
				h3_torch_compile: raw?.h3_torch_compile === true,
				cfg: raw?.cfg != null ? Number(raw.cfg) : void 0,
				h3_context_steps: raw?.h3_context_steps != null ? Number(raw.h3_context_steps) : void 0,
				h3_audio_context_steps: raw?.h3_audio_context_steps != null ? Number(raw.h3_audio_context_steps) : void 0,
				h3_sla_sparsity: raw?.h3_sla_sparsity != null ? Number(raw.h3_sla_sparsity) : void 0,
				h3_sla_block_size: raw?.h3_sla_block_size === "32" || raw?.h3_sla_block_size === "64" || raw?.h3_sla_block_size === "128" ? raw.h3_sla_block_size : void 0,
				h3_sla_min_seq_len: raw?.h3_sla_min_seq_len != null ? Number(raw.h3_sla_min_seq_len) : void 0,
				h3_sla_dense_last_steps: raw?.h3_sla_dense_last_steps != null ? Number(raw.h3_sla_dense_last_steps) : void 0,
				h3_sla_protect_audio: raw?.h3_sla_protect_audio !== false,
				h3_sla_stabilize_motion: raw?.h3_sla_stabilize_motion !== false,
				h3_sla_reference_protection: raw?.h3_sla_reference_protection === "Off" || raw?.h3_sla_reference_protection === "Light" || raw?.h3_sla_reference_protection === "Heavy Enforcement" ? raw.h3_sla_reference_protection : void 0,
				h3_sla_dense_backend: raw?.h3_sla_dense_backend === "comfy_kitchen" || raw?.h3_sla_dense_backend === "pytorch" || raw?.h3_sla_dense_backend === "auto" ? raw.h3_sla_dense_backend : void 0,
				h3_sla_dense_steps: typeof raw?.h3_sla_dense_steps === "string" && /^\s*[0-9]+(-[0-9]+)?(\s*,\s*[0-9]+(-[0-9]+)?)*\s*$/.test(raw.h3_sla_dense_steps) ? raw.h3_sla_dense_steps.trim() : void 0,
				h3_sla_disable_fp16_accum: raw?.h3_sla_disable_fp16_accum === true,
				sharpen_enabled: raw?.sharpen_enabled === true,
				sharpen_method: raw?.sharpen_method === "rcas" || raw?.sharpen_method === "adaptive_usm" || raw?.sharpen_method === "high_pass" || raw?.sharpen_method === "deconvolution" ? raw.sharpen_method : void 0,
				sharpen_strength: raw?.sharpen_strength != null ? Number(raw.sharpen_strength) : void 0,
				sharpen_radius: raw?.sharpen_radius != null ? Number(raw.sharpen_radius) : void 0,
				sharpen_threshold: raw?.sharpen_threshold != null ? Number(raw.sharpen_threshold) : void 0,
				sharpen_iterations: raw?.sharpen_iterations != null ? Number(raw.sharpen_iterations) : void 0,
				interpolate_enabled: raw?.interpolate_enabled === true,
				interpolate_model: raw?.interpolate_model === "film_net_fp16.safetensors" || raw?.interpolate_model === "rife47.pth" ? raw.interpolate_model : void 0,
				interpolate_multiplier: raw?.interpolate_multiplier != null ? Number(raw.interpolate_multiplier) : void 0,
				variant: typeof raw?.variant === "string" ? raw.variant : void 0,
				model: typeof raw?.model === "string" ? raw.model : void 0,
				h3_ref_images: typeof raw?.h3_ref_images === "string" && raw.h3_ref_images.trim() ? raw.h3_ref_images : void 0,
				h3_ref_videos: typeof raw?.h3_ref_videos === "string" && raw.h3_ref_videos.trim() ? raw.h3_ref_videos : void 0,
				h3_ref_audios: typeof raw?.h3_ref_audios === "string" && raw.h3_ref_audios.trim() ? raw.h3_ref_audios : void 0,
				h3_ref_video_audios: typeof raw?.h3_ref_video_audios === "string" && raw.h3_ref_video_audios.trim() ? raw.h3_ref_video_audios : void 0,
				h3_ref_image_size: typeof raw?.h3_ref_image_size === "string" && (raw.h3_ref_image_size === "match" || raw.h3_ref_image_size === "max") ? raw.h3_ref_image_size : void 0,
				h3_ref_audio_trim_start: raw?.h3_ref_audio_trim_start != null ? Number(raw.h3_ref_audio_trim_start) : void 0,
				h3_ref_audio_trim_duration: raw?.h3_ref_audio_trim_duration != null ? Number(raw.h3_ref_audio_trim_duration) : void 0,
				lora_name: typeof raw?.lora_name === "string" && raw.lora_name.trim() ? raw.lora_name : void 0,
				lora_strength: raw?.lora_strength != null ? Number(raw.lora_strength) : void 0,
				rtx_vsr_enabled: raw?.rtx_vsr_enabled === true,
				rtx_vsr_multiplier: raw?.rtx_vsr_multiplier != null ? Number(raw.rtx_vsr_multiplier) : void 0,
				rtx_vsr_quality: typeof raw?.rtx_vsr_quality === "string" ? raw.rtx_vsr_quality : void 0,
				crf: raw?.crf != null ? Number(raw.crf) : void 0,
				audio_stem: typeof raw?.audio_stem === "string" && raw.audio_stem.trim() ? raw.audio_stem : void 0,
				audio_clips: (() => {
					const parsed = Array.isArray(raw?.audio_clips) ? raw.audio_clips.filter((c) => !!c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string" && typeof c.src === "string" && c.src.trim() !== "" && Number.isFinite(c.start_frame) && Number.isFinite(c.dur_frames) && c.dur_frames > 0) : void 0;
					const stem = typeof raw?.audio_stem === "string" && raw.audio_stem.trim() ? raw.audio_stem.trim() : void 0;
					if (stem && (!parsed || parsed.length === 0)) return [stemToClip(stem, num("fps", 24))];
					return parsed?.length ? parsed : void 0;
				})()
			};
		}
		/** Layer A → the persisted doc shape: only non-undefined keys ride
		* (undefined = absent = the family/preset decides — the engine default
		* must never be pinned by a control that was never touched). */
		function serializeLayerA(a) {
			const out = {
				preset: a.preset,
				fps: a.fps,
				seed: a.seed,
				audio_mode: a.audio_mode,
				continuity: a.continuity,
				h3_fp16_accumulation: a.h3_fp16_accumulation,
				h3_torch_compile: a.h3_torch_compile,
				h3_sla_protect_audio: a.h3_sla_protect_audio,
				h3_sla_stabilize_motion: a.h3_sla_stabilize_motion,
				h3_sla_disable_fp16_accum: a.h3_sla_disable_fp16_accum,
				sharpen_enabled: a.sharpen_enabled,
				interpolate_enabled: a.interpolate_enabled
			};
			for (const k of [
				"shift_video",
				"shift_audio",
				"sampler",
				"scheduler",
				"sampling_steps",
				"denoise",
				"width",
				"height",
				"h3_attention",
				"audio_stem",
				"h3_sla_sparsity",
				"h3_sla_block_size",
				"h3_sla_min_seq_len",
				"h3_sla_dense_last_steps",
				"h3_sla_reference_protection",
				"h3_sla_dense_backend",
				"h3_sla_dense_steps",
				"sharpen_method",
				"sharpen_strength",
				"interpolate_model",
				"interpolate_multiplier",
				"h3_ref_images",
				"h3_ref_image_size",
				"model"
			]) if (a[k] !== void 0) out[k] = a[k];
			if (a.audio_clips?.length) out.audio_clips = a.audio_clips;
			if (a.lora_name?.trim()) {
				out.lora_name = a.lora_name.trim();
				if (a.lora_strength != null) out.lora_strength = a.lora_strength;
			}
			if (a.rtx_vsr_enabled === true) out.rtx_vsr_enabled = true;
			return out;
		}
		//#endregion
		//#region src/ui/studio/docCalls.ts
		function hydrateCalls(raw) {
			let callsRaw = raw.calls;
			if (typeof callsRaw === "string" && callsRaw.trimStart().startsWith("[")) try {
				const parsed = JSON.parse(callsRaw);
				if (Array.isArray(parsed)) callsRaw = parsed;
			} catch {}
			let beatsRaw = raw.beats;
			if (typeof beatsRaw === "string" && beatsRaw.trimStart().startsWith("[")) try {
				const parsed = JSON.parse(beatsRaw);
				if (Array.isArray(parsed)) beatsRaw = parsed;
			} catch {}
			const list = Array.isArray(callsRaw) && callsRaw.length > 0 ? callsRaw : Array.isArray(beatsRaw) && beatsRaw.length > 0 ? beatsRaw : null;
			if (!list) return STARTER_CALLS;
			const calls = [];
			for (const c of list) {
				if (typeof c !== "object" || c === null) continue;
				const r = c;
				const start = Number(r.start_frame);
				const end = Number(r.end_frame);
				if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
				const call = {
					text: "",
					start_frame: Math.round(start),
					end_frame: Math.round(end)
				};
				const rawSegs = r.beats;
				if (Array.isArray(rawSegs) && rawSegs.length > 0) {
					const segs = [];
					for (const s of rawSegs) {
						if (typeof s !== "object" || s === null) continue;
						const sr = s;
						const sText = typeof sr.text === "string" ? sr.text : "";
						const sStart = Number(sr.start_frame);
						const sEnd = Number(sr.end_frame);
						if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || sEnd <= sStart) continue;
						segs.push({
							text: sText,
							start_frame: Math.round(sStart),
							end_frame: Math.round(sEnd)
						});
					}
					if (segs.length) {
						const kept = segs.filter((s) => s.start_frame < call.end_frame && s.end_frame > call.start_frame);
						if (kept.length < segs.length) console.warn(`VideoTimelineStudio: call ${calls.length} carries beats wholly outside its span [${call.start_frame},${call.end_frame}) — dropping them (a segment must overlap its call; CROSSING a boundary is fine, orphaning is not)`);
						if (kept.length) {
							call.beats = kept;
							if (typeof r.text === "string" && r.text.trim()) console.warn("VideoTimelineStudio: call carries BOTH `text` and `beats` — rendering the segments; the compiler refuses both");
						}
					}
				}
				if (!call.beats && typeof r.text === "string") call.text = r.text;
				for (const kind of GUIDE_KINDS) {
					const src = r[kind];
					if (typeof src === "string" && src.trim()) call[kind] = src;
				}
				if (typeof r.last_frame === "string" && r.last_frame.trim()) call.last_frame = r.last_frame;
				const ps = r.first_frame_prev_sec;
				if (typeof ps === "number" && Number.isFinite(ps) && ps > 0) call.first_frame_prev_sec = ps;
				if (r.transition === "extend" || r.transition === "cut") call.transition = r.transition;
				if (r.refs !== null && typeof r.refs === "object" && !Array.isArray(r.refs)) {
					const rr = r.refs;
					const join = (v) => {
						if (Array.isArray(v)) {
							const arr = v.map(String).map((s) => s.trim()).filter(Boolean);
							return arr.length ? arr.join(", ") : void 0;
						}
						if (typeof v === "string" && v.trim()) return v.trim();
					};
					const refs = {};
					const im = join(rr.images), vi = join(rr.videos);
					const au = join(rr.audios), va = join(rr.video_audios);
					if (im) refs.images = im;
					if (vi) refs.videos = vi;
					if (au) refs.audios = au;
					if (va) refs.video_audios = va;
					if (Object.keys(refs).length) call.refs = refs;
				}
				if (r.knobs !== null && typeof r.knobs === "object") {
					const knobs = {};
					for (const [k, v] of Object.entries(r.knobs)) {
						if (!CALL_KNOB_KEYS.has(k)) {
							console.warn(`VideoTimelineStudio: dropping unknown call knob "${k}" (backend CALL_KNOB_KEYS vocabulary)`);
							continue;
						}
						if (v === null || v === void 0 || v === "") continue;
						if (k === "steps") {
							const n = Number(v);
							if (Number.isFinite(n)) knobs.sampling_steps = n;
						} else if (k === "sampling_steps" || k === "denoise" || k === "shift_video" || k === "shift_audio" || k === "cfg" || k === "h3_context_steps" || k === "h3_audio_context_steps" || k === "h3_sla_sparsity" || k === "h3_sla_min_seq_len" || k === "h3_sla_dense_last_steps" || k === "sharpen_strength" || k === "sharpen_radius" || k === "sharpen_threshold" || k === "sharpen_iterations" || k === "interpolate_multiplier") {
							const n = Number(v);
							if (Number.isFinite(n)) {
								if (k === "sampling_steps") knobs.sampling_steps = n;
								else if (k === "denoise") knobs.denoise = n;
								else if (k === "shift_video") knobs.shift_video = n;
								else if (k === "shift_audio") knobs.shift_audio = n;
								else if (k === "cfg") knobs.cfg = n;
								else if (k === "h3_context_steps") knobs.h3_context_steps = n;
								else if (k === "h3_audio_context_steps") knobs.h3_audio_context_steps = n;
								else if (k === "h3_sla_sparsity") knobs.h3_sla_sparsity = n;
								else if (k === "h3_sla_min_seq_len") knobs.h3_sla_min_seq_len = n;
								else if (k === "h3_sla_dense_last_steps") knobs.h3_sla_dense_last_steps = n;
								else if (k === "sharpen_strength") knobs.sharpen_strength = n;
								else if (k === "sharpen_radius") knobs.sharpen_radius = n;
								else if (k === "sharpen_threshold") knobs.sharpen_threshold = n;
								else if (k === "sharpen_iterations") knobs.sharpen_iterations = n;
								else if (k === "interpolate_multiplier") knobs.interpolate_multiplier = n;
							}
						} else if (k === "sampler" || k === "scheduler") {
							if (typeof v === "string" && v.trim()) knobs[k] = v;
						} else if (k === "h3_sla_block_size") {
							if (v === "64" || v === "128") knobs.h3_sla_block_size = v;
						} else if (k === "h3_sla_reference_protection") {
							if (v === "Off" || v === "Light" || v === "Heavy Enforcement") knobs.h3_sla_reference_protection = v;
						} else if (k === "h3_sla_dense_backend") {
							if (v === "comfy_kitchen" || v === "pytorch" || v === "auto") knobs.h3_sla_dense_backend = v;
						} else if (k === "h3_sla_dense_steps") {
							if (typeof v === "string" && /^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$/.test(v.trim())) knobs.h3_sla_dense_steps = v.trim();
						} else if (k === "sharpen_method") {
							if (v === "rcas" || v === "adaptive_usm" || v === "high_pass" || v === "deconvolution") knobs.sharpen_method = v;
						} else if (k === "interpolate_model") {
							if (v === "film_net_fp16.safetensors" || v === "rife47.pth") knobs.interpolate_model = v;
						} else if (k === "h3_fp16_accumulation" || k === "h3_torch_compile" || k === "h3_sla_protect_audio" || k === "h3_sla_stabilize_motion" || k === "h3_sla_disable_fp16_accum" || k === "sharpen_enabled" || k === "interpolate_enabled") {
							const b = typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : void 0;
							if (b !== void 0) {
								if (k === "h3_fp16_accumulation") knobs.h3_fp16_accumulation = b;
								else if (k === "h3_torch_compile") knobs.h3_torch_compile = b;
								else if (k === "h3_sla_protect_audio") knobs.h3_sla_protect_audio = b;
								else if (k === "h3_sla_stabilize_motion") knobs.h3_sla_stabilize_motion = b;
								else if (k === "h3_sla_disable_fp16_accum") knobs.h3_sla_disable_fp16_accum = b;
								else if (k === "sharpen_enabled") knobs.sharpen_enabled = b;
								else if (k === "interpolate_enabled") knobs.interpolate_enabled = b;
							}
						}
					}
					if (Object.keys(knobs).length) call.knobs = knobs;
				}
				calls.push(call);
			}
			if (calls.length === 0) return STARTER_CALLS;
			return calls.sort((a, b) => a.start_frame - b.start_frame);
		}
		function hydrateKeyframes(raw) {
			if (!Array.isArray(raw)) return [];
			const out = [];
			for (const k of raw) {
				if (typeof k !== "object" || k === null) continue;
				const r = k;
				const frame = Number(r.frame);
				const kind = KIND_OF_TRACK[String(r.kind)];
				if (!Number.isFinite(frame) || !kind) continue;
				out.push({
					frame: Math.round(frame),
					kind,
					source: typeof r.source === "string" ? r.source : ""
				});
			}
			return out;
		}
		const hasKnobs = (c) => !!c.knobs && Object.keys(c.knobs).length > 0;
		/** Document → bar prompts. end_frame inclusive; uuid is the call's index
		* (index-derived ids are stable for the life of a gesture — no gesture
		* spans a structural change, and every render re-derives consistently).
		* `override` = the call carries per-call knobs → the cyan dot (Layer C
		* shows where a call departs from the run's globals). A segment-mode
		* call's strip text is its segments joined — the narrative the call
		* renders (the bar's dblclick edit targets segment 0's text). */
		function callsToPrompts(calls, fps) {
			return calls.map((c, i) => ({
				uuid: `call-${i}`,
				text: `C${i + 1} · ${((c.end_frame - c.start_frame) / Math.max(1, fps)).toFixed(1)}s — ` + (c.beats?.length ? c.beats.map((s) => s.text).join(" · ") : c.text ?? ""),
				start_frame: c.start_frame,
				end_frame: c.end_frame - 1,
				color: null,
				override: hasKnobs(c),
				audio: !!(c.audio ?? "").trim(),
				refImages: (() => {
					return splitRefList(c.refs?.images).length + ((c.image ?? "").trim() ? 1 : 0);
				})(),
				seam: c.transition === "extend" ? "extend" : "cut"
			}));
		}
		/** Document keyframes → bar diamonds. Same index-derived uuid contract.
		* Legacy/frame-exact keyframes only — beat-attached guides are NOT lane
		* diamonds (2026-08-15): the beat is one entity and its guides live in
		* the beat panel; the lanes render only when the document actually
		* carries hand keyframes. */
		function keyframesToLanes(kfs) {
			return kfs.map((k, i) => ({
				uuid: `kf-${i}`,
				track_id: k.kind,
				frame: k.frame < 0 ? 0 : k.frame,
				value: null
			}));
		}
		/** Calls → the persisted document shape (the `calls` vocabulary, Layer
		* B): guide keys ride ONLY when non-blank (blank = none — the planner's
		* contract, kept here so the saved doc never carries "" noise); knobs
		* ride only when non-empty, and every knob value is written VERBATIM
		* (undefined was never stored — the setter deletes the key, so absent
		* IS inherit, never null). Layer C: a lone full-span segment collapses
		* back to `text` (lossless — the join of one segment is the segment
		* itself); multi-segment calls keep `beats` and drop the text key. */
		function serializeCalls(calls) {
			return calls.map((c) => {
				const out = {
					text: c.text ?? "",
					start_frame: c.start_frame,
					end_frame: c.end_frame
				};
				const segs = c.beats ?? [];
				if (segs.length === 1 && segs[0].start_frame === c.start_frame && segs[0].end_frame === c.end_frame) out.text = segs[0].text;
				else if (segs.length > 0) {
					out.beats = segs.map((s) => ({ ...s }));
					delete out.text;
				}
				for (const kind of GUIDE_KINDS) {
					const src = c[kind];
					if (src && src.trim()) out[kind] = src;
				}
				if (c.last_frame && c.last_frame.trim()) out.last_frame = c.last_frame;
				if (c.first_frame_prev_sec != null) out.first_frame_prev_sec = c.first_frame_prev_sec;
				if (c.transition === "extend" || c.transition === "cut") out.transition = c.transition;
				if (c.refs) {
					const join = (s) => {
						const chips = splitRefList(s);
						return chips.length ? chips.join(", ") : void 0;
					};
					const images = join(c.refs.images);
					if (images) out.refs = {
						...out.refs ?? {},
						images
					};
				}
				if (hasKnobs(c)) out.knobs = { ...c.knobs };
				return out;
			});
		}
		const callIndexOf = (id) => {
			const i = Number(id.replace(/^call-/, ""));
			return Number.isInteger(i) ? i : -1;
		};
		const kfIndexOf = (id) => {
			const i = Number(id.replace(/^kf-/, ""));
			return Number.isInteger(i) ? i : -1;
		};
		//#endregion
		//#region src/ui/studio/useDocState.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Document state (tenant §1). Verbatim lines 1536–1560. */
		function useDocState(stage) {
			const [calls, setCalls] = (0, react.useState)(() => hydrateCalls({
				calls: stage.params?.calls,
				beats: stage.params?.beats
			}));
			const [keyframes, setKeyframes] = (0, react.useState)(() => hydrateKeyframes(stage.params?.keyframes));
			const [layerA, setLayerA] = (0, react.useState)(() => hydrateLayerA(stage.params));
			const stageModel = typeof stage.model === "string" ? String(stage.model) : "";
			const routeKey = layerA.model ?? layerA.variant ?? stageModel;
			return {
				calls,
				setCalls,
				keyframes,
				setKeyframes,
				layerA,
				setLayerA,
				stageModel,
				routeKey,
				isRef2va: routeKey === "h3-timeline-ref" || routeKey.includes("ref2va"),
				lastCallsRef: (0, react.useRef)(JSON.stringify(calls)),
				lastKeyframesRef: (0, react.useRef)(JSON.stringify(keyframes)),
				lastLayerARef: (0, react.useRef)(JSON.stringify(serializeLayerA(layerA)))
			};
		}
		//#endregion
		//#region src/ui/studio/useViewSelection.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		function useViewSelection(calls, layerA) {
			const [frameIdx, setFrameIdx] = (0, react.useState)(0);
			const [selected, setSelected] = (0, react.useState)(null);
			const callCardRefs = (0, react.useRef)([]);
			const beatRowRefs = (0, react.useRef)([]);
			/** Bar clip id → the sidebar selection. `call-N` → that call's card;
			* `beat-i-j` → call i's segment j (Layer C). null = a click on the
			* empty timeline — the sidebar shifts back to global params (the
			* mode-switching rail: global ⇄ the selected item). */
			const handleTimelineSelect = (id) => {
				if (id === null) {
					setSelected(null);
					return;
				}
				const callMatch = /^call-(\d+)$/.exec(id);
				const beatMatch = /^beat-(\d+)-(\d+)$/.exec(id);
				let next = null;
				if (beatMatch) next = {
					callIdx: Number(beatMatch[1]),
					beatIdx: Number(beatMatch[2])
				};
				else if (callMatch) next = { callIdx: Number(callMatch[1]) };
				setSelected(next);
			};
			return {
				frameIdx,
				setFrameIdx,
				selected,
				setSelected,
				callCardRefs,
				beatRowRefs,
				handleTimelineSelect,
				fps: layerA.fps,
				totalFrames: calls.length ? calls[calls.length - 1].end_frame : 1
			};
		}
		//#endregion
		//#region src/ui/studio/useFilmSync.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Player↔bar playhead sync + rail readout stats (tenant §3). Verbatim lines 1592–1670. */
		function useFilmSync(args) {
			const { fps, totalFrames, keyframes, calls, setFrameIdx } = args;
			const filmRef = (0, react.useRef)(null);
			const isScrubbingRef = (0, react.useRef)(false);
			const wasPlayingRef = (0, react.useRef)(false);
			const handleScrubStart = (0, react.useCallback)(() => {
				isScrubbingRef.current = true;
				wasPlayingRef.current = filmRef.current ? !isPausedRef.current : false;
				if (wasPlayingRef.current) filmRef.current?.pause();
			}, []);
			const handleScrubEnd = (0, react.useCallback)(() => {
				isScrubbingRef.current = false;
				if (wasPlayingRef.current) {
					wasPlayingRef.current = false;
					filmRef.current?.play();
				}
			}, []);
			const filmFpsRef = (0, react.useRef)(null);
			const axisFps = (0, react.useCallback)(() => filmFpsRef.current ?? fps ?? 24, [fps]);
			const handleFilmTime = (0, react.useCallback)((sec) => {
				if (isScrubbingRef.current) return;
				const f = Math.round(sec * axisFps());
				setFrameIdx((prev) => prev === f ? prev : f);
			}, [axisFps]);
			const handleBarFrame = (0, react.useCallback)((f) => {
				setFrameIdx(f);
				filmRef.current?.seekTo(f / axisFps());
			}, [axisFps]);
			/** Playing state mirror — needed by handleScrubStart to know whether
			*  to resume on release (the handle has no isPaused getter; keep one
			*  frame of truth here from onPlayingChange). */
			const isPausedRef = (0, react.useRef)(true);
			const handlePlayingChange = (0, react.useCallback)((playing) => {
				isPausedRef.current = !playing;
				setFilmPlaying(playing);
			}, []);
			/** (Layer A NLE) film playing mirror — the mixer drives clip elements
			*  from this + frameIdx; the FilmPlayer's own track (dialogue + any
			*  window audio) plays from the player element itself. */
			const [filmPlaying, setFilmPlaying] = (0, react.useState)(false);
			return {
				filmRef,
				isScrubbingRef,
				wasPlayingRef,
				handleScrubStart,
				handleScrubEnd,
				filmFpsRef,
				axisFps,
				handleFilmTime,
				handleBarFrame,
				isPausedRef,
				handlePlayingChange,
				filmPlaying,
				seconds: (totalFrames / fps).toFixed(1),
				unwired: keyframes.filter((k) => !k.source.trim()).length,
				emptyText: calls.filter((c) => !(c.text ?? "").trim() && !(c.beats ?? []).some((s) => s.text.trim())).length,
				guideCount: calls.reduce((n, c) => n + GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).length, 0),
				knobOverrides: calls.filter(hasKnobs).length
			};
		}
		//#endregion
		//#region src/ui/studio/useDocEffects.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Playhead clamp, selection scroll/stale-guard, persist effects + the Layer A
		*  setter (tenant §4). Verbatim lines 1671–1729. */
		function useDocEffects(args) {
			const { totalFrames, setFrameIdx, selected, setSelected, calls, keyframes, layerA, setLayerA, onSave, callCardRefs, beatRowRefs, lastCallsRef, lastKeyframesRef, lastLayerARef } = args;
			(0, react.useEffect)(() => {
				setFrameIdx((f) => Math.min(f, Math.max(0, totalFrames - 1)));
			}, [totalFrames]);
			(0, react.useEffect)(() => {
				if (!selected) return;
				callCardRefs.current[selected.callIdx]?.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
				if (selected.beatIdx != null) beatRowRefs.current[selected.callIdx]?.[selected.beatIdx]?.scrollIntoView({
					block: "nearest",
					behavior: "smooth"
				});
			}, [selected]);
			(0, react.useEffect)(() => {
				if (!selected) return;
				if (selected.callIdx >= calls.length || selected.beatIdx != null && selected.beatIdx >= (calls[selected.callIdx]?.beats?.length ?? 0)) setSelected(null);
			}, [calls, selected]);
			(0, react.useEffect)(() => {
				const candidate = JSON.stringify(calls);
				if (candidate === lastCallsRef.current) return;
				lastCallsRef.current = candidate;
				onSave({ calls: serializeCalls(calls) });
			}, [calls]);
			(0, react.useEffect)(() => {
				const candidate = JSON.stringify(keyframes);
				if (candidate === lastKeyframesRef.current) return;
				lastKeyframesRef.current = candidate;
				onSave({ keyframes: keyframes.map((k) => ({ ...k })) });
			}, [keyframes]);
			(0, react.useEffect)(() => {
				const candidate = JSON.stringify(serializeLayerA(layerA));
				if (candidate === lastLayerARef.current) return;
				lastLayerARef.current = candidate;
				onSave(serializeLayerA(layerA));
			}, [layerA]);
			const setLayerAKey = (k, v) => setLayerA((prev) => prev[k] === v ? prev : {
				...prev,
				[k]: v
			});
			return { setLayerAKey };
		}
		//#endregion
		//#region src/ui/studio/useFilmAudio.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Davinci map, artifact index, positioned audio clips + the mixer
		*  (tenant §5). Verbatim lines 1731–1946. */
		function useFilmAudio(args) {
			const { stage, upstreams, layerA, setLayerA, setLayerAKey, fps, frameIdx, filmPlaying, filmFpsRef } = args;
			const filmMap = (0, react.useMemo)(() => {
				const m = (stage.result?.metadata)?.film;
				return m && Array.isArray(m.windows) && m.windows.length > 0 && m.totalFrames ? m : null;
			}, [stage.result]);
			filmFpsRef.current = filmMap?.fps ?? null;
			const filmFromDoc = (0, react.useCallback)((f) => {
				const ws = filmMap?.windows;
				if (!ws) return f;
				let w = ws[0];
				for (const c of ws) if (f >= c.docStart) w = c;
				else break;
				const scale = w.docSpan > 0 ? (w.len - w.trim) / w.docSpan : 1;
				if (f <= w.docStart + w.docSpan) return Math.round(w.start + w.trim + (f - w.docStart) * scale);
				return w.start + w.len;
			}, [filmMap]);
			const docFromFilm = (0, react.useCallback)((g) => {
				const ws = filmMap?.windows;
				if (!ws) return g;
				let w = ws[ws.length - 1];
				for (const c of ws) if (g < c.start + c.len) {
					w = c;
					break;
				}
				const scale = w.docSpan > 0 ? (w.len - w.trim) / w.docSpan : 1;
				const t = Math.max(0, g - w.start - w.trim);
				return Math.round(w.docStart + Math.min(t / scale, w.docSpan));
			}, [filmMap]);
			const artifactIndex = (0, react.useMemo)(() => {
				const byName = /* @__PURE__ */ new Map();
				const byUrl = /* @__PURE__ */ new Map();
				const ownArts = stage.result?.artifacts;
				if (ownArts) {
					for (const [name, url] of Object.entries(ownArts)) if (typeof url === "string" && url) {
						byName.set(name, url);
						byUrl.set(url, name);
					}
				}
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const [name, url] of Object.entries(arts)) if (typeof url === "string" && url) {
						byName.set(name, url);
						byUrl.set(url, name);
					}
				}
				return {
					byName,
					byUrl
				};
			}, [upstreams, stage.result]);
			/** The refs pickers' candidates: the full artifact index (own run
			* ∪ upstreams — see artifactIndex), genre-filtered per bucket inside
			* RefPickerRow (2026-09-02: own outputs included, not just upstream). */
			const refArtifacts = (0, react.useMemo)(() => [...artifactIndex.byName.entries()].map(([name, url]) => ({
				name,
				url
			})), [artifactIndex]);
			/** Resolve a clip's src to a PLAYABLE url: a data: URL is itself; an
			* artifact name maps through the index. Unresolvable → null (the
			* mixer skips it — never a bad fetch). */
			const audioSrcUrl = (0, react.useCallback)((src) => {
				if (src.startsWith("data:")) return src;
				return artifactIndex.byName.get(src) ?? null;
			}, [artifactIndex.byName]);
			/** Add a clip: probe its duration (Audio metadata), land it at the
			* frame. dur fallback 4s worth of frames — VISIBLE, then correctable
			* by the probe's completion. */
			const addAudioClip = (0, react.useCallback)((name, src, startFrame) => {
				const id = `aclip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
				const f = layerA.fps || 24;
				setLayerAKey("audio_clips", [...layerA.audio_clips ?? [], {
					id,
					name,
					src,
					start_frame: Math.max(0, Math.round(startFrame)),
					dur_frames: Math.round(4 * f)
				}]);
				const url = src.startsWith("data:") ? src : null;
				const probe = new Audio();
				probe.preload = "metadata";
				const done = () => {
					if (Number.isFinite(probe.duration) && probe.duration > 0) {
						const durF = Math.max(1, Math.round(probe.duration * f));
						setLayerA((prev) => ({
							...prev,
							audio_clips: (prev.audio_clips ?? []).map((c) => c.id === id ? {
								...c,
								dur_frames: durF
							} : c)
						}));
					}
				};
				probe.addEventListener("loadedmetadata", done, { once: true });
				probe.src = url ?? artifactIndex.byName.get(src) ?? "";
				if (!probe.src) probe.removeEventListener("loadedmetadata", done);
				return id;
			}, [
				layerA.audio_clips,
				layerA.fps,
				artifactIndex.byName,
				setLayerAKey
			]);
			const moveAudioClip = (0, react.useCallback)((clipId, docFrame) => {
				setLayerA((prev) => prev.audio_clips?.some((c) => c.id === clipId) ? {
					...prev,
					audio_clips: prev.audio_clips.map((c) => c.id === clipId ? {
						...c,
						start_frame: Math.max(0, Math.round(docFrame))
					} : c)
				} : prev);
			}, []);
			const deleteAudioClip = (0, react.useCallback)((clipId) => {
				setLayerA((prev) => ({
					...prev,
					audio_clips: (prev.audio_clips ?? []).filter((c) => c.id !== clipId)
				}));
			}, []);
			/** OS file → clip: audio only, 30 MB cap — a rejection is the file
			* input's accept + this guard (never a silent bad write). */
			const takeAudioFile = (0, react.useCallback)((file, startFrame) => {
				if (!file.type.startsWith("audio/")) return;
				if (file.size > 31457280) return;
				readAsDataURL$1(file).then((dataUrl) => {
					addAudioClip(file.name, dataUrl, startFrame);
				}).catch(() => {});
			}, [addAudioClip]);
			const clipElsRef = (0, react.useRef)(/* @__PURE__ */ new Map());
			const audioUploadRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const live = clipElsRef.current;
				const ids = new Set((layerA.audio_clips ?? []).map((c) => c.id));
				for (const [id, el] of live) if (!ids.has(id)) {
					el.pause();
					live.delete(id);
				}
				for (const c of layerA.audio_clips ?? []) if (!live.has(c.id)) live.set(c.id, new Audio());
			}, [layerA.audio_clips]);
			(0, react.useEffect)(() => {
				if (!layerA.audio_clips?.length) return;
				const fpsEff = filmMap?.fps ?? fps ?? 24;
				const t = frameIdx / fpsEff;
				for (const c of layerA.audio_clips) {
					const el = clipElsRef.current.get(c.id);
					const url = audioSrcUrl(c.src);
					if (!el || !url) continue;
					if (el.src !== url) el.src = url;
					el.volume = c.gain != null ? Math.max(0, Math.min(1, c.gain)) : 1;
					const startSec = (filmMap ? filmFromDoc(c.start_frame) : c.start_frame) / fpsEff;
					const mediaSec = c.dur_frames / (fps || 24);
					const local = t - startSec;
					if (filmPlaying && local >= 0 && local < mediaSec) {
						if (el.paused) {
							el.currentTime = local;
							el.play().catch(() => {});
						} else if (Math.abs(el.currentTime - local) > .12) el.currentTime = local;
					} else if (!el.paused) el.pause();
				}
			}, [
				frameIdx,
				filmPlaying,
				layerA.audio_clips,
				audioSrcUrl,
				filmMap,
				filmFromDoc,
				fps
			]);
			(0, react.useEffect)(() => () => {
				for (const [, el] of clipElsRef.current) el.pause();
				clipElsRef.current.clear();
			}, []);
			return {
				filmMap,
				filmFromDoc,
				docFromFilm,
				artifactIndex,
				refArtifacts,
				audioSrcUrl,
				addAudioClip,
				moveAudioClip,
				deleteAudioClip,
				takeAudioFile,
				clipElsRef,
				audioUploadRef
			};
		}
		//#endregion
		//#region src/ui/studio/usePromptMutations.ts
		/** Bar↔card prompt gestures (tenant §6). Verbatim lines 1948–2042. */
		function usePromptMutations(setCalls) {
			const handlePromptResize = (id, s, e) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					const next = [...prev];
					if (s !== cur.start_frame && i > 0) {
						next[i] = {
							...cur,
							start_frame: s
						};
						next[i - 1] = {
							...prev[i - 1],
							end_frame: s
						};
					} else if (e !== cur.end_frame - 1) {
						next[i] = {
							...cur,
							end_frame: e + 1
						};
						if (i < prev.length - 1) next[i + 1] = {
							...prev[i + 1],
							start_frame: e + 1
						};
					} else return prev;
					return next;
				});
			};
			const handlePromptMove = (id, s, e) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					if (s === cur.start_frame && e + 1 === cur.end_frame) return prev;
					const next = [...prev];
					next[i] = {
						...cur,
						start_frame: s,
						end_frame: e + 1
					};
					if (i > 0) next[i - 1] = {
						...next[i - 1],
						end_frame: s
					};
					if (i < prev.length - 1) next[i + 1] = {
						...next[i + 1],
						start_frame: e + 1
					};
					return next;
				});
			};
			const handlePromptDelete = (id) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if (prev.length === 1) return STARTER_CALLS.map((c) => ({ ...c }));
					const next = prev.filter((_, j) => j !== i);
					if (i > 0) next[i - 1] = {
						...next[i - 1],
						end_frame: prev[i].end_frame
					};
					else next[0] = {
						...next[0],
						start_frame: prev[0].start_frame
					};
					return next;
				});
			};
			const handlePromptUpdate = (id, text) => {
				const i = callIndexOf(id);
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					if (cur.beats?.length) {
						if (cur.beats[0].text === text) return prev;
						const next = [...prev];
						next[i] = {
							...cur,
							beats: cur.beats.map((s, j) => j === 0 ? {
								...s,
								text
							} : s)
						};
						return next;
					}
					if ((cur.text ?? "") === text) return prev;
					const next = [...prev];
					next[i] = {
						...cur,
						text
					};
					return next;
				});
			};
			return {
				handlePromptResize,
				handlePromptMove,
				handlePromptDelete,
				handlePromptUpdate
			};
		}
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
		var init_readFile = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/api.ts
		/** The named escape for non-table URLs. Every use is deliberate and
		* greppable. */
		function externalUrl(u) {
			return u;
		}
		function shouldRetryStatus(status, method) {
			return GATEWAY_CODES.has(status) || SAFE_METHODS.has(method) && status >= 500 && status < 600;
		}
		function getBackendState() {
			return state$1;
		}
		/** Subscribe to backend liveness changes. Returns an unsubscribe fn. */
		function onBackendState(cb) {
			listeners$1.add(cb);
			return () => {
				listeners$1.delete(cb);
			};
		}
		function setState$1(next) {
			if (next === state$1) return;
			state$1 = next;
			for (const cb of listeners$1) try {
				cb(next);
			} catch {}
		}
		/** True if `input` targets our own backend (same-origin or root-relative). */
		function isBackendUrl(input) {
			if (input.startsWith("/")) return true;
			try {
				return new URL(input, window.location.origin).origin === window.location.origin;
			} catch {
				return false;
			}
		}
		function sleep$1(ms, signal) {
			return new Promise((resolve, reject) => {
				const t = setTimeout(resolve, ms);
				signal?.addEventListener("abort", () => {
					clearTimeout(t);
					reject(new DOMException("Aborted", "AbortError"));
				}, { once: true });
			});
		}
		function backoffMs(attempt) {
			const exp = Math.min(CAP_MS, BASE_MS * 2 ** attempt);
			return Math.round(exp * (.5 + Math.random() * .5));
		}
		/**
		* Drop-in replacement for `fetch()` with retry, backoff, GET dedup, and a
		* global liveness signal. Throws only on persistent network failure (after
		* MAX_RETRIES) or caller AbortError. Returns the Response for any HTTP
		* status (including 4xx/5xx) so existing `if (!res.ok)` checks keep working.
		*/
		async function apiFetch(input, init = {}) {
			const method = (init.method ?? "GET").toUpperCase();
			const backend = isBackendUrl(input);
			const dedupKey = method === "GET" && backend ? input : null;
			if (dedupKey && inflight.has(dedupKey)) return inflight.get(dedupKey).then((r) => {
				if (r && typeof r.clone === "function") return r.clone();
				return r;
			});
			const run = async () => {
				const deadline = Date.now() + TOTAL_BUDGET_MS;
				let lastErr = null;
				for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
					if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
					try {
						const ctrl = new AbortController();
						const callerSignal = init.signal;
						callerSignal?.addEventListener("abort", () => ctrl.abort(), { once: true });
						const res = await fetch(input, {
							...init,
							signal: ctrl.signal
						});
						if (shouldRetryStatus(res.status, method) && attempt < MAX_RETRIES && Date.now() < deadline) {
							if (backend) setState$1("degraded");
							await sleep$1(backoffMs(attempt), callerSignal);
							continue;
						}
						if (backend) {
							consecutiveFail = 0;
							setState$1("online");
						}
						return res;
					} catch (err) {
						if (err instanceof DOMException && err.name === "AbortError") throw err;
						lastErr = err;
						if (backend) {
							consecutiveFail++;
							setState$1(consecutiveFail >= OFFLINE_THRESHOLD ? "offline" : "degraded");
						}
						if (attempt < MAX_RETRIES && Date.now() < deadline) await sleep$1(backoffMs(attempt));
					}
				}
				throw lastErr instanceof Error ? lastErr : /* @__PURE__ */ new Error("network request failed");
			};
			const p = run();
			if (dedupKey) {
				inflight.set(dedupKey, p);
				p.then(() => {
					inflight.delete(dedupKey);
				}, () => {
					inflight.delete(dedupKey);
				});
			}
			return p;
		}
		/**
		* Convenience for JSON endpoints. Throws an Error on non-2xx (message
		* includes status + body excerpt) so callers can use try/catch directly.
		*/
		async function apiJson(input, init) {
			const res = await apiFetch(input, init);
			if (!res.ok) {
				let body = "";
				try {
					body = await res.text();
				} catch (readErr) {
					throw new Error(`${input}: ${res.status} ${res.statusText} (body read failed: ${readErr instanceof Error ? readErr.message : String(readErr)})`);
				}
				throw new Error(`${input}: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
			}
			return res.json();
		}
		/** Fetch a same-origin artifact URL and re-encode it as a data URL
		*  (survived the unicananvas client purge 2026-08-21 — the ONE live
		*  export of that dead module; generic wire utility, so it lives with
		*  the transport). */
		async function urlToDataUrl(url, signal) {
			const res = await fetch(url, { signal });
			if (!res.ok) throw new Error(`Canvas artifact fetch failed: HTTP ${res.status} for ${url.slice(0, 200)}`);
			const blob = await res.blob();
			try {
				return await readAsDataURL(blob);
			} catch {
				throw new Error(`Failed to read ${url.slice(0, 200)} as data URL`);
			}
		}
		var MAX_RETRIES, BASE_MS, CAP_MS, OFFLINE_THRESHOLD, TOTAL_BUDGET_MS, SAFE_METHODS, GATEWAY_CODES, state$1, consecutiveFail, listeners$1, inflight;
		var init_api = __esmMin((() => {
			init_readFile();
			MAX_RETRIES = 4;
			BASE_MS = 400;
			CAP_MS = 4e3;
			OFFLINE_THRESHOLD = 3;
			TOTAL_BUDGET_MS = 15e3;
			SAFE_METHODS = /* @__PURE__ */ new Set(["GET", "HEAD"]);
			GATEWAY_CODES = /* @__PURE__ */ new Set([
				502,
				503,
				504
			]);
			state$1 = "online";
			consecutiveFail = 0;
			listeners$1 = /* @__PURE__ */ new Set();
			inflight = /* @__PURE__ */ new Map();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContract.ts
		function validateCatalogContract(catalog) {
			const violations = [];
			if (!isObj$1(catalog)) return {
				valid: false,
				violations: [{
					kind: "catalog",
					message: "Catalog is not an object — this is an error body, not a contract."
				}]
			};
			const families = catalog.families;
			if (!isObj$1(families)) violations.push({
				kind: "catalog",
				message: "Catalog has no `families` record — no family can be located."
			});
			const models = catalog.models;
			if (!isObj$1(models)) violations.push({
				kind: "catalog",
				message: "Catalog has no `models` record — no model can be located."
			});
			const capabilities = catalog.capabilities;
			if (capabilities !== void 0 && !isObj$1(capabilities)) violations.push({
				kind: "catalog",
				message: "`capabilities` is not a record keyed by id — capability routing is dead."
			});
			if (families === void 0 || models === void 0) return {
				valid: false,
				violations
			};
			if (isObj$1(families)) for (const [id, entry] of Object.entries(families)) {
				if (!isObj$1(entry)) {
					violations.push({
						kind: id,
						message: `Family ${id} is not an object.`
					});
					continue;
				}
				if (!isNonEmptyString(entry.label)) violations.push({
					kind: id,
					message: `Family ${id} declares no "label" — it would render as an empty picker entry.`
				});
				const modifiers = entry.modifiers;
				if (modifiers !== void 0 && modifiers !== null && !Array.isArray(modifiers)) violations.push({
					kind: id,
					message: `Family ${id} declares "modifiers" but it is not an array — modifier capability is unreadable.`
				});
				else if (Array.isArray(modifiers)) for (const raw of modifiers) {
					if (!isObj$1(raw) || typeof raw.kind !== "string") continue;
					if (raw.kind !== "controlnet" && raw.kind !== "lora") continue;
					const options = Array.isArray(raw.options) ? raw.options : [];
					if ((raw.cardinality ?? "list") === "list" && options.length === 0 && !raw.upload_dir) violations.push({
						kind: id,
						message: `Family ${id} modifier kind "${raw.kind}" carries ZERO options and no upload_dir — the dropdown would render empty (phantom capability).`
					});
				}
			}
			if (isObj$1(models)) for (const [id, entry] of Object.entries(models)) {
				if (!isObj$1(entry)) {
					violations.push({
						kind: id,
						message: `Model ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString(entry.family)) missing.push("family");
				if (!isNonEmptyString(entry.form)) missing.push("form");
				if (!isNonEmptyString(entry.label)) missing.push("label");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Model ${id} is missing required key(s) ${missing.join(", ")} — it cannot route or render.`
				});
			}
			if (isObj$1(capabilities)) for (const [id, entry] of Object.entries(capabilities)) {
				if (!isObj$1(entry)) {
					violations.push({
						kind: id,
						message: `Capability ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString(entry.label)) missing.push("label");
				const declaredFam = entry.default_family;
				if (declaredFam !== void 0 && !isNonEmptyString(declaredFam)) missing.push("default_family (present but not a string)");
				const resolved = entry.resolved;
				if (!(isObj$1(resolved) && isNonEmptyString(resolved.family) && isNonEmptyString(resolved.model)) && !isNonEmptyString(declaredFam)) missing.push("default_family or resolved route");
				if (!Array.isArray(entry.families) || entry.families.length === 0) missing.push("families");
				else if (entry.families.some((f) => !isNonEmptyString(f))) missing.push("families (non-string entries)");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Capability ${id} is missing required key(s) ${missing.join(", ")} — it cannot route.`
				});
			}
			return {
				valid: violations.length === 0,
				violations
			};
		}
		var CatalogContractError, isObj$1, isNonEmptyString;
		var init_catalogContract = __esmMin((() => {
			CatalogContractError = class extends Error {
				violations;
				constructor(violations) {
					super(`Catalog contract violation (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "CatalogContractError";
					this.violations = violations;
				}
			};
			isObj$1 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
			isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/toast.ts
		var nextId, listeners, state, notify$1, setState, useToastStore;
		var init_toast = __esmMin((() => {
			nextId = 0;
			listeners = /* @__PURE__ */ new Set();
			notify$1 = () => {
				for (const l of listeners) l();
			};
			setState = (patch) => {
				state = {
					...state,
					...patch
				};
				notify$1();
			};
			state = {
				toasts: [],
				addToast: (type, message, action) => {
					const duration = type === "error" ? 15e3 : 5e3;
					if (type === "error") console.error("[toast]", message, action ?? "");
					else console.info("[toast]", message);
					const id = nextId++;
					setState({ toasts: [...state.toasts, {
						id,
						type,
						message
					}] });
					setTimeout(() => {
						setState({ toasts: state.toasts.filter((t) => t.id !== id) });
					}, duration);
				},
				removeToast: (id) => setState({ toasts: state.toasts.filter((t) => t.id !== id) })
			};
			useToastStore = {
				getState: () => state,
				setState,
				subscribe: (l) => {
					listeners.add(l);
					return () => {
						listeners.delete(l);
					};
				}
			};
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/inputSlots.ts
		/** Is this key a canonical wire slot no form/model declares? (protected
		*  from the closed-vocabulary purge — the value is live wiring, not a
		*  stale form value.) */
		function isUndeclaredWireSlot(key) {
			return _undeclaredWireSlots.includes(key);
		}
		/** Feed the vocabulary from the catalog (modelCatalog.ts calls this on
		* every successful load). Replaces — not merges — the boot default: the
		* catalog's declaration is the truth. Test-only callers pass a fixture. */
		function setInputVocabulary(v) {
			if (Array.isArray(v.slots) && v.slots.length > 0) _slots = v.slots;
			if (Array.isArray(v.undeclared_slots)) _undeclaredWireSlots = v.undeclared_slots;
			if (v.aliases && typeof v.aliases === "object") _aliases = { ...v.aliases };
			if (v.form_aliases && typeof v.form_aliases === "object") _formAliases = Object.fromEntries(Object.entries(v.form_aliases).filter(([, m]) => m && typeof m === "object"));
			if (v.form_slots && typeof v.form_slots === "object") _formSlots = Object.fromEntries(Object.entries(v.form_slots).filter(([, s]) => Array.isArray(s)));
			if (v.model_slots && typeof v.model_slots === "object") _modelSlots = Object.fromEntries(Object.entries(v.model_slots).filter(([, s]) => Array.isArray(s)));
			if (v.slot_kinds && typeof v.slot_kinds === "object") _slotKinds = { ...v.slot_kinds };
		}
		/** The per-form alias table for a form (form_aliases[form] ?? global). */
		function formAliasesFor(form) {
			if (form && _formAliases[form]) return _formAliases[form];
			return _aliases;
		}
		/** The form's DECLARED slot list (form_slots[form]). undefined = UNKNOWN
		* form (global-slot fallback — be permissive). [] = the form declares a
		* CLOSED zero-slot vocabulary (text-only: form_generate, form_llm_text)
		* — stageSlots renders zero squares + normalizeSlotParams PURGES every
		* global-slot key. The empty-array-as-truthy semantics is the gate. */
		function formSlotsFor(form) {
			if (form && form in _formSlots) return _formSlots[form];
		}
		/** The MODEL's declared slot list (model_slots[service] — the catalog
		* route key). undefined = UNKNOWN model (fall back to the form, then the
		* global vocabulary — be permissive for non-catalog services). [] = the
		* model's schema declares a CLOSED zero-slot vocabulary (moss-tts — no
		* clone capability): stageSlots renders zero squares + normalizeSlotParams
		* PURGES every slot key. THE model's schema-derived vocabulary WINS over
		* the form's (2026-08-14 — a form-level list leaks slots onto models of
		* the form whose schema doesn't serve them). */
		function modelSlotsFor(service) {
			if (service && service in _modelSlots) return _modelSlots[service];
		}
		/** THE per-model slot list for a service: modelSlotsFor(service) ??
		* formSlotsFor(form) ?? undefined. Used by the card's declared-vocabulary
		* purge — the model's schema is the vocabulary, the form is the fallback
		* for non-catalog services, and unknown services stay permissive. */
		function cardSlotsFor(service, form) {
			return modelSlotsFor(service) ?? formSlotsFor(form);
		}
		/** The current canonical slot list, in declared order. */
		function inputSlots() {
			return _slots;
		}
		/** True if the params carry at least one input slot. */
		function hasInputSlots(params) {
			return _slots.some((k) => k in params);
		}
		/** The first input slot declared in the params, in vocabulary order.
		* CardTile's drop target uses this to decide which slot a dropped asset
		* fills (most cards have exactly one). null = the card carries no slot
		* (drop rejected). */
		function firstInputSlot(params) {
			return _slots.find((k) => k in params) ?? null;
		}
		/** THE slot-list source: the slot keys a stage's params declare, in
		* vocabulary order. Store (setSlotInput + collectUpstreamResults),
		* SlotGrid, and the CardTile strip all derive the per-slot array from
		* here — slot index i ↔ stageSlots(params)[i].
		*
		* **Form-aware** (2026-08-10): when the card's ``form`` is known and the
		* form DECLARES its slots (form_slots[form]), the filter list is the
		* form's slots, NOT the global _slots union. A revived pre-IMAGE1 edit
		* card whose params still carry ``input_image`` (loaded before the catalog
		* arrived → normalizeSlotParams couldn't purge it) would otherwise render
		* a phantom 4th square. The form's declared slots are the CLOSED
		* vocabulary — a stale global-slot key outside them is invisible here
		* even if it lingers in params. Callers without a form fall back to the
		* global _slots filter (unchanged).
		*
		* **Model-aware** (2026-08-14): when the card's ``service`` (catalog
		* model route) declares its slots (model_slots[service]), THE MODEL'S
		* list is the filter — never the form's. qwen3-tts-base → [voice_file,
		* reference_audio]; moss-tts → [] (zero squares — no clone capability).
		* A form-level list would leak voice_file onto moss-tts (the user catch).
		* Unknown services fall back to the form, then the global filter. */
		function stageSlots(params, form, service) {
			const declared = cardSlotsFor(service, form);
			if (declared) return declared.filter((k) => k in params);
			return _slots.filter((k) => k in params);
		}
		/** Re-normalize an inputs array to the fixed per-slot invariant:
		* length === slots.length, missing entries padded with "". Never
		* truncates — agent-written/loaded docs keep their length as written
		* (reads are index-safe: slots[i] undefined → skipped). */
		function padInputs(inputs, slots) {
			const padded = [...inputs];
			while (padded.length < slots.length) padded.push("");
			return padded;
		}
		/** Fold family input-param names onto the slot vocabulary (idempotent).
		*
		* Agent-written descriptors and revived run params can carry the FAMILY's
		* param names (input_artifact / image_artifact / glb_artifact — the
		* form_edit/form_upscale compile names) instead of the slot keys; the
		* backend resolves ONLY the slot keys (compile._resolve_input_value), so
		* an unnormalized card would render no square AND silently lose its input
		* on re-run. Every card materializer (addStage, the hydrates, and the
		* BACKEND build_flow — drafts.py folds before persisting, 2026-08-13)
		* runs this so the card speaks one vocabulary.
		*
		* Precedence: an explicit slot-key value wins over an alias; a real alias
		* value wins over a null slot placeholder (the picker's null-seed).
		*
		* ``form`` — when the card's form is known, the fold uses the form's
		* DECLARED alias table (form_aliases[form] ?? aliases): form_edit folds
		* input_artifact → image1 (NOT the global input_image — the 2026-08-09
		* IMAGE1 contract), while form_upscale keeps input_artifact → input_image.
		* The form's declared slot list (form_slots[form]) additionally PURGES
		* stale global-slot keys the form never declared — input_image can never
		* survive on an edit card (2026-08-10 purge policy).
		*
		* **Model-aware** (2026-08-14): when ``service`` is a catalog model whose
		* schema-derived list (model_slots[service]) exists, THE MODEL'S list is
		* the purge gate — never the form's. On moss-tts ([]) every slot key is
		* purged (voice_file can never survive a model swap onto it); on
		* qwen3-tts-base ([voice_file, reference_audio]) both squares' keys are
		* protected. Unknown services fall back to the form's gate.
		*/
		function normalizeSlotParams(params, form, service) {
			const aliases = formAliasesFor(form);
			const out = {};
			for (const [k, v] of Object.entries(params)) {
				const alias = aliases[k];
				if (alias === void 0 || alias === k) out[k] = v;
			}
			const declared = cardSlotsFor(service, form);
			for (const k of _slots) {
				if (!(k in params)) continue;
				if (declared && !declared.includes(k) && !isUndeclaredWireSlot(k)) {
					delete out[k];
					continue;
				}
				out[k] = params[k];
			}
			for (const [alias, slot] of Object.entries(aliases)) {
				if (alias === slot) continue;
				if (!(alias in params)) continue;
				const cur = out[slot];
				if (cur === void 0 || cur === null) out[slot] = params[alias];
			}
			return out;
		}
		/** Per-slot FileKind (from the catalog's input_vocabulary.slot_kinds).
		* Unknown slot → "any" (permissive — the guard never blocks on a missing
		* declaration, only on a DECLARED mismatch). */
		function slotKind(slotKey) {
			const k = _slotKinds[slotKey];
			if (k && typeof k === "string") return k;
			return "any";
		}
		function genreToKind(genre) {
			if (!genre) return "any";
			return GENRE_TO_KIND[genre] ?? "any";
		}
		/** May a producer of ``producer`` kind feed a consumer of ``consumer``
		* kind? Mirrors slot_kinds.kinds_compatible:
		*   • "any" on either side → compatible (permissive for unknowns).
		*   • Same kind → compatible.
		*   • image ↔ mask → compatible (a mask is an image).
		*   • Everything else → incompatible. */
		function kindsCompatible(producer, consumer) {
			if (producer === "any" || consumer === "any") return true;
			if (producer === consumer) return true;
			if (producer === "image" && consumer === "mask" || producer === "mask" && consumer === "image") return true;
			return false;
		}
		/** The slot-type guard: may an upstream stage whose family has ``genre``
		* feed ``slotKey``? This is the function setSlotInput calls. Returns
		* ``true`` when the wire is type-safe (or when either side is unknown —
		* permissive) and ``false`` when a DECLARED mismatch is detected. */
		function canWireSlot(genre, slotKey) {
			return kindsCompatible(genreToKind(genre), slotKind(slotKey));
		}
		var _slots, _aliases, _formAliases, _formSlots, _modelSlots, _slotKinds, _undeclaredWireSlots, GENRE_TO_KIND;
		var init_inputSlots = __esmMin((() => {
			_slots = [
				"input_image",
				"image1",
				"image2",
				"image3",
				"reference_image",
				"end_image",
				"first_frame",
				"last_frame",
				"lanpaint_mask",
				"input_mask",
				"source_image",
				"source_glb",
				"input_glb",
				"prev_motion_artifact",
				"preview_glb",
				"reference_audio",
				"voice_file"
			];
			_aliases = {};
			_formAliases = {};
			_formSlots = {};
			_modelSlots = {};
			_slotKinds = {};
			_undeclaredWireSlots = ["lanpaint_mask"];
			GENRE_TO_KIND = {
				image: "image",
				video: "video",
				audio: "audio",
				"3d": "glb",
				motion: "motion",
				other: "any",
				text: "text"
			};
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/modelCatalog.ts
		var modelCatalog_exports = /* @__PURE__ */ __exportAll({
			activeVariantForRoute: () => activeVariantForRoute,
			axisCellExists: () => axisCellExists,
			canvasDefaultModel: () => canvasDefaultModel,
			composeVariantRoute: () => composeVariantRoute,
			controlnetTypesOf: () => controlnetTypesOf,
			dropdownModels: () => dropdownModels,
			ensureCatalog: () => ensureCatalog,
			familiesForForm: () => familiesForForm,
			familyAccepts: () => familyAccepts,
			familyCardSummary: () => familyCardSummary,
			familyConditioning: () => familyConditioning,
			familyGenre: () => familyGenre,
			familyHasVariantAxis: () => familyHasVariantAxis,
			familyLabel: () => familyLabel,
			familyOf: () => familyOf,
			familyOptionalOutputs: () => familyOptionalOutputs,
			familyPrimaryRoute: () => familyPrimaryRoute,
			familyTransformMatrix: () => familyTransformMatrix,
			formOf: () => formOf,
			getCachedCatalog: () => getCachedCatalog,
			hiddenFromDropdown: () => hiddenFromDropdown,
			isCatalogLoaded: () => isCatalogLoaded,
			loadCatalog: () => loadCatalog,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			narrowGenre: () => narrowGenre,
			onCatalogReady: () => onCatalogReady,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			promptGuide: () => promptGuide,
			routeCoordinates: () => routeCoordinates,
			studioOf: () => studioOf,
			variantLabel: () => variantLabel,
			variantSiblings: () => variantSiblings,
			variantsForRoute: () => variantsForRoute
		});
		/** Narrow the wire's plain string genre (string | null — the backend
		* Literal does not survive the wire as a type) onto the view union.
		* Out-of-vocabulary values return undefined (callers fall back) — never a
		* silent cast: an unknown genre must NOT masquerade as a known one. */
		function narrowGenre(g) {
			return CARD_GENRES.find((genre) => genre === g);
		}
		/** CN type keys a family declares — derived from its ``modifiers:`` block
		* (kind=controlnet options; the ONLY source of truth, Phase A finalé).
		* ServicePicker advertises CN support per tile from this — the "weird
		* reason" most models show no CN subcards: only families that declare a
		* controlnet kind have CN support (DiT models without compatible CN
		* trainings correctly declare nothing). */
		function controlnetTypesOf(family) {
			return ((family?.modifiers ?? []).find((m) => m.kind === "controlnet")?.options ?? []).map((o) => ({
				type: o.value,
				label: o.label
			}));
		}
		function _notify() {
			for (const fn of _listeners$3) try {
				fn();
			} catch (e) {
				console.warn("[modelCatalog] listener error:", e);
			}
		}
		/** Subscribe to catalog readiness. Called when _cache transitions from
		* null → populated. Returns an unsubscribe fn. */
		function onCatalogReady(fn) {
			_listeners$3.add(fn);
			return () => {
				_listeners$3.delete(fn);
			};
		}
		/** True after the catalog has been successfully loaded at least once. */
		function isCatalogLoaded() {
			return _loaded;
		}
		/** Fetch the model catalog. THROWS on non-2xx (no silent empty `{}`).
		* The caller MUST surface the error. Returning a fake empty catalog here
		* is what hid every "model dropdown is empty" bug — the user saw nothing
		* and the console warning was invisible. Loud failure is honest. */
		/** The ONE ingest gate (2026-08-11): validate BEFORE caching.
		* A catalog that violates the contract is a BACKEND bug — reported to the
		* contract store, NEVER cached, and the caller gets a
		* CatalogContractError (ensureCatalog will not auto-retry it). */
		function _ingest(data) {
			const { valid, violations } = validateCatalogContract(data);
			if (!valid) throw new CatalogContractError(violations);
			useCatalogContractStore.getState().reportOk();
			const catalog = data;
			_feedInputVocabulary(catalog);
			_cache$2 = catalog;
			_cacheTime = Date.now();
			_loaded = true;
			_notify();
			return catalog;
		}
		async function loadCatalog(opts) {
			if (_cache$2 && !opts?.force) {
				if (Date.now() - _cacheTime > _CACHE_TTL_MS && !_inflight$2) _inflight$2 = (async () => {
					try {
						_ingest(await apiJson("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
						else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return _cache$2;
				})().finally(() => {
					_inflight$2 = null;
				});
				return _cache$2;
			}
			if (_inflight$2) return _inflight$2;
			_inflight$2 = (async () => {
				try {
					return _ingest(await apiJson("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
					else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			})().finally(() => {
				_inflight$2 = null;
			});
			return _inflight$2;
		}
		/** Fold the catalog's per-model schema-derived input_slots into the
		* model_slots vocabulary. The backend computes each model's slots from
		* its OWN families-filtered builder schema (editor_catalog
		* _model_input_slots — the model's schema is the vocabulary, NEVER the
		* form's: qwen3-tts-base → [voice_file, reference_audio], moss-tts → []
		* with no clone capability). This fold is the delivery path — input_slots
		* lives on the model entries, the vocabulary store keys by route. */
		function _foldModelSlots(models) {
			const out = {};
			if (!models) return out;
			for (const [route, m] of Object.entries(models)) if (Array.isArray(m?.input_slots)) out[route] = m.input_slots;
			return out;
		}
		/** Feed the catalog's declared input vocabulary into lib/inputSlots —
		* the backend (compile.input_vocabulary) is the SSOT, the frontend
		* module is a consumer. Runs on every successful load, including the
		* background TTL refresh (so YAML vocabulary edits propagate). */
		function _feedInputVocabulary(data) {
			if (data?.input_vocabulary) setInputVocabulary({
				...data.input_vocabulary,
				model_slots: _foldModelSlots(data.models)
			});
		}
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog() {
			if (_loaded) return;
			if (_inflight$2) return;
			loadCatalog().then(() => {
				if (_bgRetryTimer) {
					clearTimeout(_bgRetryTimer);
					_bgRetryTimer = null;
				}
			}).catch((e) => {
				if (e instanceof CatalogContractError) {
					console.error("[modelCatalog] catalog contract violation — not auto-retrying:", e.message);
					return;
				}
				console.warn("[modelCatalog] load failed, will retry in 3s:", e);
				if (_bgRetryTimer) clearTimeout(_bgRetryTimer);
				_bgRetryTimer = setTimeout(() => {
					_bgRetryTimer = null;
					ensureCatalog();
				}, 3e3);
			});
		}
		function getCachedCatalog() {
			return _cache$2;
		}
		/** Seed the cache with pre-fetched data (test utility — production code uses
		* loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
		* a fake catalog without going to the network. */
		function primeCatalog(data) {
			_feedInputVocabulary(data);
			_cache$2 = data;
			_loaded = true;
			_notify();
		}
		/**
		* For route keys that are NOT top-level catalog entries (e.g. a quant-tier
		* sibling that only appears as a variant route on its parent), find the
		* parent model that owns the route via its ``variants:`` block.
		*/
		function parentModelForRoute(routeKey, cat) {
			for (const [key, spec] of Object.entries(cat.models)) if ((spec.variants ?? []).some((v) => v.route === routeKey)) return key;
		}
		function familyOf(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.family;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].family : void 0;
		}
		function studioOf(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.studio ?? void 0;
		}
		/**
		* The catalog-declared FORM for a route key (the model's ``form`` — the
		* same id _FORM_CONFIGS keys by on the backend). Resolves variants to
		* their parent model like familyOf. This is the key the fold uses to pick
		* the per-form alias table (inputSlots.formAliasesFor): form_edit folds
		* input_artifact → image1, form_upscale → input_image (2026-08-09).
		*/
		function formOf(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.form;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].form : void 0;
		}
		function familyLabel(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey;
			return cat.families?.[fam]?.label ?? routeKey;
		}
		/**
		* The family-declared media genre for a route key. Resolves model routes
		* AND raw family ids (``wan-vace``, ``detect``) — the catalog passthrough
		* emits ``genre:`` verbatim. Non-catalog services (trellis, kimodo, yaml
		* brick families) return undefined → callers fall back to their generic
		* badge. The schema-driven replacement for engine-name substring
		* classifiers.
		*/
		function familyGenre(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			return narrowGenre((fam ? cat.families?.[fam]?.genre : void 0) ?? cat.families?.[routeKey]?.genre);
		}
		/**
		* The source-media types a family declares it ingests (FamilyEntry.accepts,
		* a closed pydantic Literal on the backend). Returns the declared list, or
		* [] when the family declares none / is unknown → the canvas drop handler
		* treats [] as "not a drop target" (no card spawned, no hard-fail on the
		* MIME itself — there simply is no input family to receive the drop). The
		* gate that replaces a free-coded isImageFile prefix check. (2026-08-09)
		*/
		function familyAccepts(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.accepts ?? [];
		}
		/**
		* The media-type→param applicability matrix for a family's gated source
		* params: {paramName → [media types it applies to]}. Returns {} when the
		* family declares no transforms / is unknown. The InputCardEditor gates
		* field renders on this (no trim control for an image — no time axis) and
		* applySource strips params whose declared types no longer include the new
		* source's type — both driven ENTIRELY by this declaration, no hardcoded
		* image/video/audio branches. ONE source (input_prep.yaml transforms:),
		* TWO consumers (this editor + backend _validate_params_for_media), zero
		* drift. (2026-08-09)
		*/
		function familyTransformMatrix(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			const transforms = cat.families?.[fam ?? routeKey]?.transforms;
			if (!transforms) return {};
			const out = {};
			for (const t of transforms) out[t.name] = t.applies_to;
			return out;
		}
		/**
		* The family's declared video conditioning slots ([first_frame,
		* last_frame] for ltx/wan-vace, [reference, pose, mask] for scail2) —
		* schema-driven input-wiring labels (no engine-name classifiers).
		*/
		/**
		* The compact card's declared size line (FamilyEntry.card_summary, a
		* pydantic-validated block on the backend). Returns {width_param, height_param}
		* for generation families (rendered "WxH") OR {size_param, size_suffix} for
		* the Enhance / upscale families (rendered as a single value), or null when
		* the family declares no size line / is unknown. The CardTile reads whichever
		* is declared — no free-coded per-family dimension logic in the view.
		* (2026-08-09; size_param added 2026-08-10.)
		*/
		function familyCardSummary(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.card_summary ?? null;
		}
		function familyConditioning(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.video?.conditioning ?? void 0;
		}
		/**
		* The family's declared optional outputs (Option A — the optional-outputs
		* vocabulary). Empty/undefined when the family declares none (legacy
		* single-output parity). Consumers render one editor per entry, keyed by
		* ``genre`` — the input card no longer declares any (mask removed
		* 2026-08-14), so this is the vocabulary for OTHER families that do.
		*/
		function familyOptionalOutputs(familyId, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			return cat.families?.[familyId]?.optional_outputs ?? [];
		}
		/**
		* The catalog-declared Canvas default model route — the model whose entry
		* carries ``canvas_default: true`` (krea-2). Replaces the hardcoded
		* CANVAS_DEFAULT_MODEL; returns undefined before the catalog loads (the
		* caller keeps its own pre-catalog bootstrap value).
		*/
		function canvasDefaultModel(cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			return Object.entries(cat.models).find(([, m]) => m.canvas_default)?.[0];
		}
		/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
		function variantLabel(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const m = cat.models?.[routeKey];
			return m?.variant_label ?? m?.label ?? routeKey;
		}
		/**
		* One entry per model family that has dropdown-visible members in the given
		* form. The primaryRoute is the catalog-declared `default_model` if present
		* (and visible), else the member whose key equals the family ID, else the
		* first visible member. Used to drive the family-level dropdown and the
		* empty-model seed. The default is FULLY catalog-declared — the frontend
		* never picks a default itself.
		*/
		function familiesForForm(formTag, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const visible = dropdownModels(formTag, cat);
			const seen = /* @__PURE__ */ new Set();
			const result = [];
			for (const key of visible) {
				const fam = cat.models[key]?.family ?? key;
				if (seen.has(fam)) continue;
				seen.add(fam);
				const members = visible.filter((k) => (cat.models[k]?.family ?? k) === fam);
				const declared = cat.families[fam]?.default_model;
				const primary = (declared && members.includes(declared) ? declared : void 0) ?? members.find((k) => k === fam) ?? members[0];
				result.push({
					familyId: fam,
					primaryRoute: primary,
					label: cat.families[fam]?.label ?? fam
				});
			}
			return result;
		}
		/**
		* Given a route key (including quant-tier variants like z-image-sd-q8),
		* return the family's primary route key — the one to use as the dropdown
		* value so the dropdown always shows the family even when a sub-variant is
		* selected.
		*/
		function familyPrimaryRoute(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey;
			const declared = cat.families[fam]?.default_model;
			if (declared && cat.models[declared]?.family === fam) return declared;
			const members = Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
			return members.find((k) => k === fam) ?? members[0];
		}
		function modelLabel(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const m = cat.models[routeKey];
			if (!m) return routeKey;
			return m.label ?? cat.families[m.family]?.label ?? routeKey;
		}
		/** Description for a model route, or undefined. Callers provide their own
		* fallback string — this returns `undefined` so `??` works. Reads the
		* `description:` declared on the model's family in the catalog YAML. */
		function modelDescription(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.description ?? void 0;
		}
		function promptGuide(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families[fam]?.prompt_guide ?? void 0;
		}
		function dropdownModels(formTag, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const out = [];
			for (const [key, spec] of Object.entries(cat.models)) {
				if (spec.hide_from_dropdown) continue;
				if (formTag) {
					if (spec.form !== formTag) continue;
				} else if (spec.edit_only) continue;
				out.push(key);
			}
			return out.sort();
		}
		function variantSiblings(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey ? [routeKey] : [];
			return Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
		}
		/**
		* Models hidden from the dropdown because they're reachable only via a
		* variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
		*/
		function hiddenFromDropdown(cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			return new Set(Object.entries(cat.models).filter(([, m]) => m.hide_from_dropdown).map(([k]) => k));
		}
		/**
		* The ``variants:`` list for a model — resolves through the parent if the
		* route key is a quant-tier sibling (e.g. z-image-q5 inherits z-image's
		* variants). Returns ``[]`` for models without variants.
		*/
		function variantsForRoute(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const own = cat.models[routeKey]?.variants;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].variants : [];
		}
		/**
		* The route's served recipe presets — the LOAD-TIME per-route merge
		* (2026-08-18, compose model): every route's ``presets`` dict is the
		* head base layer (presets/ on the model head) ⊕ the owning variant's
		* layer (variants/<vid>/presets/), both only_routes-filtered AT LOAD
		* (variant wins on id collision). Own-only read: the backend attaches
		* the merged dict to EVERY route, so a fallback chain (tree-head scan,
		* the retired family-block carve-out) would be a second precedence —
		* the exact two-sources drift the composer's contract forbids. The
		* card and the run door read the SAME per-route dict, so the
		* h3-timeline incident dies by construction. only_routes gating is
		* not re-derived here — the wire never carries a gated-out preset.
		*/
		function presetsForRoute(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const own = cat.models[routeKey]?.presets;
			return own && typeof own === "object" && Object.keys(own).length > 0 ? own : void 0;
		}
		/**
		* Find the variant whose route matches ``routeKey`` — used to highlight the
		* active toggle when the form is hydrated from saved state.
		*/
		function activeVariantForRoute(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const ownList = variantsForRoute(routeKey, cat);
			const own = ownList.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ?? ownList.find((v) => v.route === routeKey);
			if (own) return own;
			for (const spec of Object.values(cat.models)) {
				const list = spec.variants ?? [];
				const hit = list.find((v) => v.route === routeKey && (v.group ?? "Quant") === "Quant") ?? list.find((v) => v.route === routeKey);
				if (hit) return hit;
			}
		}
		/**
		* The matrix coordinates of a route within its family's variant grid —
		* the values that distinguish it from its siblings. Read from the model
		* spec's ``variant`` (Turbo / Raw / Distilled / Base …) and ``quant``
		* (fp8 / q8 / q5 …) fields, resolving the FP8 default's quant through
		* its variant entries (the default route omits ``quant:`` since it IS
		* the fp8 tier).
		*
		* This is the ONE model for how variant axes compose (2026-08-08): every
		* axis is a labeled toggle row declared in ``variant_groups``, and the
		* routes are the cells of the grid. Krea 2 = Variant (Turbo/Raw) × Quant
		* (FP8/Q8/Q5) → 6 routes. The composer below switches one axis while
		* preserving the others.
		*/
		function routeCoordinates(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const m = cat.models[routeKey];
			return {
				variant: m?.variant ?? void 0,
				quant: m?.quant ?? activeVariantForRoute(routeKey, cat)?.quant ?? void 0
			};
		}
		/**
		* Resolve the route that combines the clicked variant's axis with the
		* current route's OTHER axes. Scans the family's routes (including the
		* ``hide_from_dropdown`` quant siblings) for the coordinate match, so
		* clicking "Raw" while on Turbo+Q8 lands on Raw+Q8 — never Raw+FP8.
		*
		* Group → axis mapping: a ``Quant`` group switches the quant tier (base
		* variant preserved); a ``Variant`` group switches the base variant (quant
		* preserved). The vocabulary is closed to Variant/Quant (schema.py
		* CANONICAL_VARIANT_GROUPS, 2026-08-09 — "Speed" was a duplicate name for
		* the Variant axis). Patch-only entries (Lightning/Standard LoRA style)
		* with no ``route:`` never reach here — the caller handles those as draft
		* overlays.
		*
		* Falls back to the clicked entry's own ``route`` when no matrix sibling
		* matches (single-axis families, or a quant tier with no sibling for the
		* target variant). This is the ONE composition path — there is no longer
		* a separate sibling-picker (2026-08-08).
		*/
		/** The wanted matrix coordinates after one axis switch — the ONE
		* derivation shared by the composer and the existence check (a second
		* copy of this arithmetic would be the exact two-sources drift the
		* composer's contract forbids). A ``Quant`` click keeps the current
		* variant and takes the clicked quant; a ``Variant`` click keeps the
		* current quant and takes the clicked variant. */
		function axisWants(currentRoute, clicked, cat) {
			const cur = routeCoordinates(currentRoute, cat);
			const tgt = routeCoordinates(clicked.route, cat);
			const switchesQuant = clicked.group === "Quant";
			return {
				variant: switchesQuant ? cur.variant : tgt.variant ?? cur.variant,
				quant: switchesQuant ? clicked.quant ?? tgt.quant : cur.quant
			};
		}
		/** The ONE matrix-cell lookup: the route in ``fam`` whose coordinates are
		* exactly (variant, quant), or undefined when no such cell exists. */
		function matrixCell(fam, variant, quant, cat) {
			for (const [key, spec] of Object.entries(cat.models)) {
				if ((spec.family ?? key) !== fam) continue;
				const rc = routeCoordinates(key, cat);
				if (rc.variant === variant && rc.quant === quant) return key;
			}
		}
		function composeVariantRoute(currentRoute, clicked, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(currentRoute, cat);
			const clickedRoute = clicked.route;
			if (!fam || !clickedRoute) return clickedRoute ?? currentRoute;
			const wants = axisWants(currentRoute, clicked, cat);
			return matrixCell(fam, wants.variant, wants.quant, cat) ?? clickedRoute;
		}
		/**
		* Only-existing-combinations (2026-08-16 — "ONLY show models combinations
		* that exist"): does clicking `clicked` from `currentRoute` land on a
		* REAL catalog cell?
		*
		* Derives the SAME wanted coordinates as the composer (axisWants — one
		* derivation) and asks the matrix directly whether that cell exists
		* (matrixCell). This is NOT derivable from composeVariantRoute's return:
		* the composer falls back to ``clicked.route`` when the cell is missing,
		* so a phantom combo and a real one return the same string — the silent
		* sibling-axis switch the fallback causes is exactly the phantom
		* combination this check keeps OUT of the axis dropdowns.
		*
		* Patch-only variants (no ``route``) always compose — they layer onto
		* whatever cell is active, so they always exist. An unresolvable family
		* (catalog not loaded yet) also passes: without the matrix we cannot
		* positively know a cell is missing, and the served variants list is
		* itself catalog-derived — hiding is only correct on positive evidence.
		*/
		function axisCellExists(currentRoute, clicked, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			if (!clicked.route) return true;
			const fam = familyOf(currentRoute, cat);
			if (!fam) return true;
			const wants = axisWants(currentRoute, clicked, cat);
			return matrixCell(fam, wants.variant, wants.quant, cat) !== void 0;
		}
		/**
		* True when the family owns its version axis via a declared ``Variant``
		* group (Krea 2 Turbo/Raw, …). The legacy sibling-picker defers to the
		* matrix system in that case so the two never render duplicate rows
		* (2026-08-08 — one system, not two).
		*/
		function familyHasVariantAxis(routeKey, cat = _cache$2 ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null,
			input_vocabulary: null
		}) {
			const fam = familyOf(routeKey, cat);
			const groups = fam ? cat.families?.[fam]?.variant_groups : void 0;
			return !!groups && "Variant" in groups;
		}
		var CARD_GENRES, _cache$2, _cacheTime, _CACHE_TTL_MS, _inflight$2, _loaded, _bgRetryTimer, _listeners$3;
		var init_modelCatalog = __esmMin((() => {
			init_api();
			init_inputSlots();
			init_catalogContract();
			init_catalogContractStore();
			CARD_GENRES = [
				"image",
				"video",
				"audio",
				"3d",
				"motion",
				"other",
				"text"
			];
			_cache$2 = null;
			_cacheTime = 0;
			_CACHE_TTL_MS = 3e4;
			_inflight$2 = null;
			_loaded = false;
			_bgRetryTimer = null;
			_listeners$3 = /* @__PURE__ */ new Set();
			/* v8 ignore next -- module warm-load runs only in browser builds, where
			* MODE is "production"/"development"; under vitest MODE is always "test",
			* so the taken arm is unreachable here (2026-09-12). */
			if ({}.env?.MODE !== "test") ensureCatalog();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContractStore.ts
		/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
		* outage that produced it, so the operator should also see WHEN it fired.
		* 24h local time, seconds resolution. */
		function _stamp() {
			return (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false });
		}
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		* re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		* (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog() {
			Promise.resolve().then(() => (init_modelCatalog(), modelCatalog_exports)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch(() => {});
		}
		function _subscribe$1(listener) {
			_listeners$2.add(listener);
			return () => {
				_listeners$2.delete(listener);
			};
		}
		function _setState$1(patch, replace) {
			const p = typeof patch === "function" ? patch(_state$1) : patch;
			if (replace === true) _state$1 = p;
			else _state$1 = {
				..._state$1,
				...p
			};
			_listeners$2.forEach((l) => l());
		}
		function _getState$1() {
			return _state$1;
		}
		/* v8 ignore next -- React-tree wiring: invoking the hook needs a renderer
		* for useSyncExternalStore (dom-project territory, like the slots seam's
		* useVersion). The selector contract is pinned node-side through
		* getState/subscribe in catalog-contract-store.spec.ts. (2026-09-12) */
		function _useCatalogContractStoreHook(selector) {
			return (0, react.useSyncExternalStore)(_subscribe$1, selector ? () => selector(_getState$1()) : () => _getState$1());
		}
		var IDLE, _lastToastedOutage, _listeners$2, _state$1, _initialState$1, useCatalogContractStore;
		var init_catalogContractStore = __esmMin((() => {
			init_toast();
			IDLE = {
				state: "idle",
				violations: [],
				error: null
			};
			_lastToastedOutage = null;
			_listeners$2 = /* @__PURE__ */ new Set();
			_state$1 = {
				record: IDLE,
				reportOk: () => {
					const wasOutage = useCatalogContractStore.getState().record.state === "error";
					_lastToastedOutage = null;
					_setState$1({ record: {
						state: "loaded",
						violations: [],
						error: null
					} });
					if (wasOutage) useToastStore.getState().addToast("info", `Catalog back online (at ${_stamp()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp()}):`, violations);
					_setState$1({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					const msg = first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape";
					useToastStore.getState().addToast("error", `Catalog contract violation — ${msg} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog
					});
				},
				reportError: (message) => {
					const clean = message.trim();
					console.error(`[catalogContract] catalog fetch failed (at ${_stamp()}):`, clean);
					_setState$1({ record: {
						state: "error",
						violations: [],
						error: clean
					} });
					if (clean === _lastToastedOutage) return;
					_lastToastedOutage = clean;
					useToastStore.getState().addToast("error", `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog
					});
				},
				clear: () => {
					_lastToastedOutage = null;
					_setState$1({ record: IDLE });
				}
			};
			_initialState$1 = _state$1;
			useCatalogContractStore = Object.assign(_useCatalogContractStoreHook, {
				getState: _getState$1,
				setState: _setState$1,
				subscribe: _subscribe$1,
				getInitialState: () => _initialState$1,
				destroy: () => {}
			});
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/runStatusContract.ts
		/** Validate a status payload against the ONE status-channel contract.
		* Accepts a parsed body of ANY response (200 or non-ok) — the caller
		* decides what a violation means on its branch. */
		function validateRunStatusContract(payload) {
			const violations = [];
			if (!isObj(payload)) return {
				valid: false,
				violations: [{
					field: "body",
					kind: "shape",
					message: "Status payload is not an object — this is an error body, not a contract."
				}]
			};
			if (typeof payload.run_id !== "string" || !payload.run_id) violations.push({
				field: "run_id",
				kind: "missing",
				message: "Status payload has no run_id — it cannot identify the run."
			});
			if (typeof payload.status !== "string" || !RUN_STATUSES.has(payload.status)) violations.push({
				field: "status",
				kind: "invalid",
				message: `Run-level status ${JSON.stringify(payload.status)} is not in the backend vocabulary (${[...RUN_STATUSES].join(", ")}).`
			});
			if (!Array.isArray(payload.stages)) violations.push({
				field: "stages",
				kind: "missing",
				message: "Status payload has no stages array — stage progress cannot be located."
			});
			else payload.stages.forEach((stage, i) => {
				if (!isObj(stage)) {
					violations.push({
						field: `stages.${i}`,
						kind: "shape",
						message: `Stage ${i} is not an object.`
					});
					return;
				}
				const core = [
					["id", stage.id],
					["name", stage.name],
					["index", stage.index],
					["status", stage.status]
				];
				for (const [field, value] of core) if (field === "index" ? typeof value !== "number" : typeof value !== "string") violations.push({
					field: `stages.${i}.${field}`,
					kind: "missing",
					message: `Stage ${i} has no ${field} — the stage cannot be rendered.`
				});
			});
			return {
				valid: violations.length === 0,
				violations
			};
		}
		/** True when a non-ok body carries the backend's contract-violation
		* signature (flow_status 500s: {error, run_id, violations: [...]}). */
		function hasViolationsSignature(body) {
			return isObj(body) && Array.isArray(body.violations);
		}
		var _RUN_STATUS_VALUES, RUN_STATUSES, RunStatusContractError, isObj;
		var init_runStatusContract = __esmMin((() => {
			_RUN_STATUS_VALUES = [
				"pending",
				"running",
				"completed",
				"failed",
				"stopped",
				"interrupted",
				"unknown",
				"queued"
			];
			RUN_STATUSES = new Set(_RUN_STATUS_VALUES);
			RunStatusContractError = class extends Error {
				violations;
				constructor(runId, violations) {
					super(`Run status contract violation for ${runId} (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "RunStatusContractError";
					this.violations = violations;
				}
			};
			isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/runStatusContractStore.ts
		/** Re-poll the run — the toast's Retry action. Recovered → clear; still
		* bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		* whole protocol layer; the store only needs it on click. */
		function repoll(runId) {
			Promise.resolve().then(() => (init_FlowProtocol(), FlowProtocol_exports)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore.getState().clear()).catch(() => {});
		}
		function toastVerdict(v) {
			const toast = useToastStore.getState().addToast;
			if (v.kind === "violation") {
				const first = v.violations[0]?.message ?? "the status response did not match the expected shape";
				toast("error", `Run ${v.runId}: ${v.violations.length} contract issue(s) — ${first}. Retry to re-check, or re-run the card.`, {
					label: "Retry",
					onClick: () => repoll(v.runId)
				});
			} else toast("error", `Run ${v.runId}: status channel error — ${v.message}. Retry to re-check.`, {
				label: "Retry",
				onClick: () => repoll(v.runId)
			});
		}
		function _subscribe(listener) {
			_listeners$1.add(listener);
			return () => {
				_listeners$1.delete(listener);
			};
		}
		function _setState(patch, replace) {
			const p = typeof patch === "function" ? patch(_state) : patch;
			if (replace === true) _state = p;
			else _state = {
				..._state,
				...p
			};
			_listeners$1.forEach((l) => l());
		}
		function _getState() {
			return _state;
		}
		/* v8 ignore next -- React-tree wiring: invoking the hook needs a renderer
		* for useSyncExternalStore (dom-project territory, like the slots seam's
		* useVersion). The selector contract is pinned node-side through
		* getState/subscribe in run-status-contract-store.spec.ts. (2026-09-12) */
		function _useRunStatusContractStoreHook(selector) {
			return (0, react.useSyncExternalStore)(_subscribe, selector ? () => selector(_getState()) : () => _getState());
		}
		var _listeners$1, _state, _initialState, useRunStatusContractStore;
		var init_runStatusContractStore = __esmMin((() => {
			init_toast();
			_listeners$1 = /* @__PURE__ */ new Set();
			_state = {
				verdict: null,
				reportViolation: (runId, violations) => {
					console.error("[runStatusContract] status channel violation:", runId, violations);
					const verdict = {
						kind: "violation",
						runId,
						violations
					};
					_setState({ verdict });
					toastVerdict(verdict);
				},
				reportError: (runId, message) => {
					console.error("[runStatusContract] status channel error:", runId, message);
					const verdict = {
						kind: "error",
						runId,
						message
					};
					_setState({ verdict });
					toastVerdict(verdict);
				},
				clear: () => _setState({ verdict: null })
			};
			_initialState = _state;
			useRunStatusContractStore = Object.assign(_useRunStatusContractStoreHook, {
				getState: _getState,
				setState: _setState,
				subscribe: _subscribe,
				getInitialState: () => _initialState,
				destroy: () => {}
			});
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/card.ts
		var init_card = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/character.ts
		var init_character = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/studio.ts
		var init_studio = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/stageView.ts
		var init_stageView = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/stagePreview.ts
		var init_stagePreview = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/vocab.ts
		/** Is the value a valid Provenance? Gate untrusted JSON (a past run's
		* metadata, a drag payload) before rendering. */
		function isProvenance(v) {
			return typeof v === "string" && PROVENANCE_VALUES.includes(v);
		}
		var Provenance, PROVENANCE_VALUES;
		var init_vocab = __esmMin((() => {
			Provenance = {
				agent: "agent",
				user: "user",
				imported: "imported"
			};
			PROVENANCE_VALUES = Object.values(Provenance);
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/wire.ts
		var init_wire = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/regions.ts
		var init_regions = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/timelineTypes.ts
		/** Coerce an unknown persisted/imported status into the SegmentStatus
		* union. Anything outside it (e.g. pre-refactor persisted "error") is
		* normalized to 'empty' — an out-of-union status silently breaks the
		* failed-state UI (the NLE clip check tests status === 'failed'). */
		function normalizeSegmentStatus(raw) {
			return typeof raw === "string" && SEGMENT_STATUSES.includes(raw) ? raw : "empty";
		}
		var SEGMENT_STATUSES, FLF_MODES, TRACK_COLORS, DEFAULT_SEGMENT_PARAMS, DEFAULT_LIPSYNC_FIELDS;
		var init_timelineTypes = __esmMin((() => {
			SEGMENT_STATUSES = [
				"empty",
				"pending",
				"generating",
				"ready",
				"failed"
			];
			FLF_MODES = [{
				id: "off",
				label: "First frame only (standard I2V)"
			}, {
				id: "on",
				label: "First + Last frame (FLF2V)"
			}];
			TRACK_COLORS = [
				"#4ade80",
				"#facc15",
				"#fb923c",
				"#60a5fa",
				"#f472b6",
				"#a78bfa",
				"#34d399",
				"#fbbf24",
				"#f87171",
				"#38bdf8"
			];
			DEFAULT_SEGMENT_PARAMS = {
				seed: 42,
				width: 640,
				height: 480,
				frames: 33,
				fps: 16,
				resizeMethod: "crop",
				samplingSteps: 10,
				guideScale: 5,
				model: "wan-vace",
				profile: "fast",
				motionAmplitude: 1,
				flfMode: false,
				teacacheEnabled: false,
				teacacheThreshold: .01,
				progressiveEnabled: false,
				progressiveLevels: 2,
				progressiveDelta: .15,
				progressiveMode: "dct",
				relayEpsilon: .01,
				guideStrength: 1,
				guideCrf: 0,
				scaleBy: 1,
				upscaleMethod: "bicubic",
				useTiledEncode: false,
				tileSize: 256,
				tileOverlap: 64,
				imageAttentionStrength: 1,
				loras: [],
				motionVideoB64: null,
				motionStrength: .7,
				motionTrimStart: 0,
				motionTrimEnd: 0,
				motionOffset: 0,
				resampleMode: "nearest",
				retakePrompt: "",
				retakeStartFrame: 0,
				retakeEndFrame: -1
			};
			DEFAULT_LIPSYNC_FIELDS = {
				lipSyncedVideoUrl: null,
				lipSyncPreferOriginal: false
			};
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/loraTypes.ts
		var init_loraTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/browserStorage.ts
		/** Test hook — resets the cached connection + cache + install flag. */
		function _resetBrowserStorageForTests() {
			installed = false;
			cache$1 = /* @__PURE__ */ new Map();
			dbPromise = null;
		}
		function openDb() {
			if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
				if (typeof indexedDB === "undefined") {
					reject(/* @__PURE__ */ new Error("IndexedDB unavailable"));
					return;
				}
				const req = indexedDB.open(DB_NAME, DB_VERSION);
				req.onupgradeneeded = () => {
					const db = req.result;
					if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
				};
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			return dbPromise;
		}
		/** Full dump of the store as [key, value] pairs. */
		async function idbDump() {
			const req = (await openDb()).transaction(STORE, "readonly").objectStore(STORE).openCursor();
			return new Promise((resolve, reject) => {
				const out = [];
				req.onsuccess = () => {
					const cursor = req.result;
					if (!cursor) {
						resolve(out);
						return;
					}
					out.push([String(cursor.key), String(cursor.value)]);
					cursor.continue();
				};
				req.onerror = () => reject(req.error);
			});
		}
		async function idbPut(key, value) {
			const tx = (await openDb()).transaction(STORE, "readwrite");
			tx.objectStore(STORE).put(value, key);
			await new Promise((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
				tx.onabort = () => rej(tx.error);
			});
		}
		async function idbRemove(key) {
			const tx = (await openDb()).transaction(STORE, "readwrite");
			tx.objectStore(STORE).delete(key);
			await new Promise((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
				tx.onabort = () => rej(tx.error);
			});
		}
		async function idbClear() {
			const tx = (await openDb()).transaction(STORE, "readwrite");
			tx.objectStore(STORE).clear();
			await new Promise((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
				tx.onabort = () => rej(tx.error);
			});
		}
		function writeFailure(key, e) {
			console.error(`[storage] failed to persist '${key}' to IndexedDB:`, e);
		}
		/**
		* Seed the in-memory cache from IndexedDB, migrate any leftover native
		* localStorage into IDB, then install the facade as the global localStorage.
		* Called once from main.tsx BEFORE the app is (dynamically) imported, so
		* every module-eval-time read sees the persisted data. Never throws.
		*/
		async function initBrowserStorage() {
			if (installed) return;
			try {
				const entries = await idbDump();
				for (const [k, v] of entries) cache$1.set(k, v);
			} catch (e) {
				console.error("[storage] failed to load IndexedDB cache:", e);
			}
			try {
				const native = globalThis.localStorage;
				if (native && typeof native.length === "number") {
					const jobs = [];
					let anyMigrated = false;
					let failed = false;
					for (let i = 0; i < native.length; i++) {
						const k = native.key(i);
						if (!k) continue;
						const v = native.getItem(k);
						if (v == null || cache$1.has(k)) continue;
						anyMigrated = true;
						cache$1.set(k, v);
						jobs.push(idbPut(k, v).catch(() => {
							failed = true;
						}));
					}
					if (jobs.length > 0) await Promise.all(jobs);
					if (anyMigrated && !failed) try {
						native.clear();
					} catch {}
				}
			} catch (e) {
				console.error("[storage] failed to migrate native localStorage:", e);
			}
			try {
				Object.defineProperty(globalThis, "localStorage", {
					value: facade,
					configurable: true,
					writable: true
				});
				installed = true;
			} catch (e) {
				console.error("[storage] failed to install IndexedDB-backed localStorage:", e);
				installed = true;
			}
		}
		var DB_NAME, DB_VERSION, STORE, dbPromise, cache$1, installed, facade;
		var init_browserStorage = __esmMin((() => {
			DB_NAME = "melite:browser-storage:v1";
			DB_VERSION = 1;
			STORE = "kv";
			dbPromise = null;
			cache$1 = /* @__PURE__ */ new Map();
			installed = false;
			facade = {
				get length() {
					return cache$1.size;
				},
				key(index) {
					if (index < 0 || index >= cache$1.size) return null;
					let i = 0;
					for (const k of cache$1.keys()) {
						if (i === index) return k;
						i++;
					}
					return null;
				},
				getItem(key) {
					return cache$1.has(key) ? cache$1.get(key) : null;
				},
				setItem(key, value) {
					cache$1.set(key, String(value));
					idbPut(key, String(value)).catch((e) => writeFailure(key, e));
				},
				removeItem(key) {
					cache$1.delete(key);
					idbRemove(key).catch((e) => writeFailure(key, e));
				},
				clear() {
					cache$1.clear();
					idbClear().catch((e) => writeFailure("*", e));
				}
			};
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/objectUrlCache.ts
		/** True iff `s` is a base64 data URL (large enough to benefit from conversion). */
		function isDataUrl(s) {
			return typeof s === "string" && s.startsWith("data:") && s.length > 128;
		}
		/**
		* Convert a data URL (or pass through other URL forms) to a cached object URL.
		*
		* - `data:…` URLs → converted once, cached, returned.
		* - `blob:`, `http:`, `https:`, relative paths → returned as-is.
		* - `null` / `undefined` / empty → returned as-is (caller handles).
		*
		* The same input always yields the same output for the lifetime of the
		* module (until revokeObjectUrlFor or revokeAll is called).
		*/
		function dataUrlToObjectUrl(url) {
			if (url == null || url === "") return null;
			if (!isDataUrl(url)) return url;
			const cached = cache.get(url);
			if (cached) return cached;
			const obj = createObjectUrlFromDataUrl(url);
			cache.set(url, obj);
			return obj;
		}
		/** Revoke the object URL associated with `sourceUrl` (the original data URL). */
		function revokeObjectUrlFor(sourceUrl) {
			const obj = cache.get(sourceUrl);
			if (obj) {
				try {
					URL.revokeObjectURL(obj);
				} catch {}
				cache.delete(sourceUrl);
			}
		}
		/** Revoke every cached object URL. Intended for tests and explicit teardown. */
		function revokeAll() {
			for (const obj of cache.values()) try {
				URL.revokeObjectURL(obj);
			} catch {}
			cache.clear();
		}
		/** Test-only: how many object URLs are currently cached. */
		function _cachedCount() {
			return cache.size;
		}
		function createObjectUrlFromDataUrl(dataUrl) {
			const comma = dataUrl.indexOf(",");
			if (comma < 0) return dataUrl;
			const header = dataUrl.slice(0, comma);
			const payload = dataUrl.slice(comma + 1);
			const mime = header.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
			const isBase64 = header.includes(";base64");
			let bytes;
			if (isBase64) {
				let bin;
				try {
					bin = atob(payload);
				} catch {
					return dataUrl;
				}
				bytes = new Uint8Array(bin.length);
				for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			} else bytes = new TextEncoder().encode(decodeURIComponent(payload));
			return URL.createObjectURL(new Blob([bytes.slice()], { type: mime }));
		}
		var cache;
		var init_objectUrlCache = __esmMin((() => {
			cache = /* @__PURE__ */ new Map();
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/FlowTypes.ts
		var init_FlowTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/formSpec.ts
		/** The declared LANDING variant of a group (operator order,
		* 2026-09-06: "there should be default, and that is what we land
		* on"). The generated VariantGroup schema predates the key (the wire
		* row is dict-typed server-side), so this is the ONE typed read —
		* absent/empty means no declared landing. Served by the family's
		* VariantGroup.default, construction-validated to name a variant of
		* the group. */
		function variantGroupDefault(spec, groupId) {
			const d = (spec?.features?.variant_groups ?? {})[groupId]?.default;
			return typeof d === "string" && d.trim() !== "" ? d : null;
		}
		function notchesOf(spec) {
			return {
				size: spec?.size === "huge" ? "huge" : "default",
				layout: spec?.layout === "studio" ? "studio" : "form"
			};
		}
		/** Split `expr` on `op` at the top level (not inside quotes). Returns the
		*  trimmed parts; length 1 means the operator was not present. */
		function splitOnOperator(expr, op) {
			const parts = [];
			let depth = 0;
			let inStr = null;
			let start = 0;
			for (let i = 0; i < expr.length; i++) {
				const ch = expr[i];
				if (inStr) {
					if (ch === inStr && expr[i - 1] !== "\\") inStr = null;
					continue;
				}
				if (ch === "\"" || ch === "'") {
					inStr = ch;
					continue;
				}
				if (ch === "(") {
					depth++;
					continue;
				}
				if (ch === ")") {
					depth--;
					continue;
				}
				if (depth === 0 && expr.startsWith(op, i)) {
					parts.push(expr.slice(start, i).trim());
					start = i + op.length;
				}
			}
			parts.push(expr.slice(start).trim());
			return parts;
		}
		function evalAtom(trimmed, values) {
			const gteMatch = trimmed.match(/^(\w+)\s*>=\s*(.+)$/);
			if (gteMatch) return Number(values[gteMatch[1]]) >= Number(gteMatch[2].trim());
			const lteMatch = trimmed.match(/^(\w+)\s*<=\s*(.+)$/);
			if (lteMatch) return Number(values[lteMatch[1]]) <= Number(lteMatch[2].trim());
			const eqMatch = trimmed.match(/^(\w+)\s*==\s*(.+)$/);
			if (eqMatch) {
				const [, field, rawVal] = eqMatch;
				const expected = parseValue(rawVal.trim());
				const actual = values[field];
				if (expected === null) return actual == null;
				return actual === expected;
			}
			const neqMatch = trimmed.match(/^(\w+)\s*!=\s*(.+)$/);
			if (neqMatch) {
				const [, field, rawVal] = neqMatch;
				const expected = parseValue(rawVal.trim());
				const actual = values[field];
				if (expected === null) return actual != null;
				return actual !== expected;
			}
			const gtMatch = trimmed.match(/^(\w+)\s*>\s*(.+)$/);
			if (gtMatch) return Number(values[gtMatch[1]]) > Number(gtMatch[2].trim());
			const ltMatch = trimmed.match(/^(\w+)\s*<\s*(.+)$/);
			if (ltMatch) return Number(values[ltMatch[1]]) < Number(ltMatch[2].trim());
			if (/^\w+$/.test(trimmed)) return !!values[trimmed];
			return true;
		}
		function evalVisibleWhen(expr, values) {
			if (!expr) return true;
			let trimmed = expr.trim();
			if (!trimmed) return true;
			while (trimmed.startsWith("(") && trimmed.endsWith(")")) {
				let depth = 0;
				let wraps = true;
				for (let i = 0; i < trimmed.length; i++) {
					const ch = trimmed[i];
					if (ch === "(") depth++;
					else if (ch === ")") {
						depth--;
						if (depth === 0 && i < trimmed.length - 1) {
							wraps = false;
							break;
						}
					}
				}
				if (wraps && depth === 0) trimmed = trimmed.slice(1, -1).trim();
				else break;
			}
			const orParts = splitOnOperator(trimmed, "||");
			if (orParts.length > 1) return orParts.some((p) => evalVisibleWhen(p, values));
			const andParts = splitOnOperator(trimmed, "&&");
			if (andParts.length > 1) return andParts.every((p) => evalVisibleWhen(p, values));
			return evalAtom(trimmed, values);
		}
		/** True if `value` counts as "set" — mirrors backend `_is_present`.
		*  None, empty string, whitespace-only, and empty containers are absent.
		*  Numeric 0 and boolean false are PRESENT (a real value, not "unset"). */
		function isPresent(value) {
			if (value === null || value === void 0) return false;
			if (typeof value === "string") return value.trim().length > 0;
			if (Array.isArray(value)) return value.length > 0;
			if (typeof value === "object") return Object.keys(value).length > 0;
			return true;
		}
		/** The clause active under the discriminator's current value, or undefined
		*  when no clause applies (the discriminator is unset or maps to a mode
		*  with no clause and no default_clause). */
		function activeClause(contract, values) {
			const mode = values[contract.discriminator];
			const key = typeof mode === "string" ? mode : String(mode ?? "");
			return contract.clauses[key] ?? contract.default_clause ?? void 0;
		}
		/** The SUB-contract active under the parent discriminator's current value
		*  ("sub modes further down the line", 2026-08-08), or undefined when the
		*  parent value owns no child — e.g. mode=inpaint owns an inpaint_region
		*  child; mode=upscale owns none. */
		function activeChild(contract, values) {
			if (!contract.children) return void 0;
			const mode = values[contract.discriminator];
			const key = typeof mode === "string" ? mode : String(mode ?? "");
			return contract.children[key] ?? void 0;
		}
		/** The clause active under BOTH tiers: the parent clause (when the parent
		*  discriminator has one) AND the child clause (when the parent value owns
		*  a sub-contract). The union drives required/forbidden styling for the
		*  enhance card — e.g. input_mask is required only when
		*  mode=inpaint AND inpaint_region=free. */
		function activeClauseChain(contract, values) {
			const clauses = [];
			const parent = activeClause(contract, values);
			if (parent) clauses.push(parent);
			const child = activeChild(contract, values);
			if (child) {
				const childClause = activeClause(child, values);
				if (childClause) clauses.push(childClause);
			}
			return clauses;
		}
		/** Evaluate the contract against current values → every violation, across
		*  BOTH tiers. Mirrors run_contract's collect-all semantics (not just the
		*  first), including the child recursion — the child's violations carry
		*  its own discriminator in the message (e.g. inpaint_region="free"). */
		function validateContract(contract, values) {
			const mode = values[contract.discriminator];
			const disc = `${contract.discriminator}=${JSON.stringify(mode ?? "")}`;
			const out = [];
			const clause = activeClause(contract, values);
			if (clause) {
				for (const f of clause.requires ?? []) if (!isPresent(values[f])) out.push({
					field: f,
					message: `required when ${disc} (got empty).`
				});
				for (const f of clause.forbids ?? []) if (isPresent(values[f])) out.push({
					field: f,
					message: `not applicable when ${disc} — clear this field.`
				});
				const oneOf = clause.requires_one_of ?? [];
				if (oneOf.length >= 2 && !oneOf.some((f) => isPresent(values[f]))) out.push({
					field: oneOf.join("|"),
					message: `at least one of [${oneOf.join(", ")}] is required when ${disc}.`
				});
				const mutex = clause.mutually_exclusive ?? [];
				if (mutex.length >= 2) {
					const present = mutex.filter((f) => isPresent(values[f]));
					if (present.length > 1) out.push({
						field: present.join("|"),
						message: `[${present.join(", ")}] are mutually exclusive when ${disc} (set at most one).`
					});
				}
			}
			const child = activeChild(contract, values);
			if (child) out.push(...validateContract(child, values));
			return out;
		}
		/** True if `fieldName` is required under the current discriminator values
		*  (parent tier, or the child tier when the parent value owns a
		*  sub-contract). Drives the `*` indicator. */
		function fieldRequiredInMode(contract, fieldName, values) {
			if (!contract) return false;
			return activeClauseChain(contract, values).some((clause) => clause.requires?.includes(fieldName));
		}
		/** True if `fieldName` is forbidden under the current discriminator values
		*  (parent tier, or the child tier when the parent value owns a
		*  sub-contract). Drives the disabled / "n/a" styling so the user sees
		*  the field is inert in this mode. */
		function fieldForbiddenInMode(contract, fieldName, values) {
			if (!contract) return false;
			return activeClauseChain(contract, values).some((clause) => clause.forbids?.includes(fieldName));
		}
		function parseValue(raw) {
			if (raw === "null") return null;
			if (raw === "true") return true;
			if (raw === "false") return false;
			if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
			if (raw.startsWith("\"") && raw.endsWith("\"") || raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
			return raw;
		}
		var optionValue, optionLabel;
		var init_formSpec = __esmMin((() => {
			optionValue = (opt) => typeof opt === "string" ? opt : opt.value;
			optionLabel = (opt) => typeof opt === "string" ? opt : opt.label;
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/modifierSubcards.ts
		/** Stable drag id. Both entry kinds key by `id` (the lora entry's id IS
		* the adapter catalog id). `?? name` tolerates pre-2026-09-06 drafts so
		* old cards load; the next save rewrites them as id-keyed rows. */
		function subcardId(kind, entry) {
			return kind === "controlnet" ? entry.id ?? "" : `lora-${entry.id ?? entry.name ?? ""}`;
		}
		/** Normalize a wire lora row: id wins, the fossil `name` key migrates.
		* An empty id passes through — compose refuses it loudly; the tile still
		* renders so the operator can see and delete the broken entry. */
		function loraIdOf(entry) {
			return String(entry.id ?? entry.name ?? "").trim();
		}
		/** A fossil `{name, strength}` row (pre-2026-09-06 wire) becomes an
		* id-keyed row — ONE shape leaves every boundary (modal draft, bag
		* commit, run body). The fossil key is dropped, never re-emitted.
		* A row missing `strength` (never emitted by the pre-flip UI, but a
		* hand-edited draft may carry one) takes 1.0 — the same house default
		* the catalog row seeds at compose. */
		function normalizeLoraEntry(entry) {
			return {
				id: loraIdOf(entry),
				strength: typeof entry.strength === "number" ? entry.strength : 1
			};
		}
		/** Derive the subcard view from the param bag — a pure projection. */
		function subcardsFromParams(params) {
			const loras = params.loras ?? [];
			const cns = params.controlnets ?? [];
			return [...loras.map((l) => {
				const lid = loraIdOf(l);
				return {
					id: `lora-${lid}`,
					kind: "lora",
					label: loraLabel(lid),
					name: lid,
					enabled: true,
					strength: typeof l.strength === "number" ? l.strength : 1,
					strengthSet: typeof l.strength === "number"
				};
			}), ...cns.map((c) => ({
				id: subcardId("controlnet", c),
				kind: "controlnet",
				label: c.type,
				enabled: c.enabled,
				strength: c.strength,
				type: c.type,
				model: c.model,
				preprocessor: c.preprocessor,
				image_b64: c.image_b64,
				start_percent: c.start_percent,
				end_percent: c.end_percent
			}))];
		}
		/** Human label for a LoRA entry (file base name, extension stripped). */
		function loraLabel(name) {
			return name.split("/").pop().replace(/\.(safetensors|pt|ckpt)$/, "");
		}
		/** Total subcard count on a card — the collapsed-tile "+N" hint. */
		function subcardCount(params) {
			const loras = params.loras ?? [];
			const cns = params.controlnets ?? [];
			return loras.length + cns.length;
		}
		/** Pure array move — the ONLY way order changes (dragEnd → this). */
		function moveItem(arr, from, to) {
			if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
			const next = [...arr];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			return next;
		}
		/**
		* Resolve which declared kind a draggable subcard id belongs to. Walks each
		* LIST-kind's wire array (scalar kinds aren't draggable — no reorder
		* semantics on a single value). Returns the kind spec or null when the id
		* isn't a known subcard (e.g. a stale drag handle). Generic over arbitrary
		* kinds — the param_key comes from the spec, not a hardcoded kind→key map.
		*/
		function kindForId(params, id, kinds) {
			for (const kind of kinds) {
				if (kind.cardinality === "scalar") continue;
				if ((params[kind.param_key] ?? []).some((e) => subcardId(kind.kind, e) === id)) return kind;
			}
			return null;
		}
		/**
		* Apply a drag drop to the param bag. Cross-kind drops are no-ops (each kind
		* has its own wire array at ``params[kind.param_key]``; a LoRA cannot swap
		* places with a ControlNet, nor with a clip_skip). Returns the same params
		* object when nothing moved (stable identity → no re-render).
		*
		* The ``kinds`` list is the declared modifier vocabulary (from
		* modifiersFeatureOf) — the param_key lookup is data-driven, not a hardcoded
		* ``kind === "lora" ? "loras" : "controlnets"`` ternary. A novel kind's drag
		* works the day it's declared, with zero code change here.
		*/
		function applySubcardDrop(params, activeId, overId, kinds) {
			const spec = kindForId(params, activeId, kinds);
			if (!spec) return params;
			if (kindForId(params, overId, kinds)?.kind !== spec.kind) return params;
			const arr = params[spec.param_key];
			const next = moveItem(arr, arr.findIndex((e) => subcardId(spec.kind, e) === activeId), arr.findIndex((e) => subcardId(spec.kind, e) === overId));
			return next === arr ? params : {
				...params,
				[spec.param_key]: next
			};
		}
		function newCnId() {
			_cnIdCounter += 1;
			return `cn-${Date.now().toString(36)}-${_cnIdCounter}`;
		}
		/**
		* New ControlNet entry from a schema entry — honors the catalog's declared
		* defaults (model, preprocessor, default_strength) with ControlNetApplyAdvanced
		* defaults for the step range. Returns null when the stack is full (max_stack).
		* Takes the KIND SPEC (the one contract entry) — no parallel feature shape.
		*/
		function newControlnetEntry(entries, type, cnKind) {
			const maxStack = cnKind?.max_stack ?? 3;
			if (entries.length >= maxStack) return null;
			const schema = cnEntriesOf(cnKind).find((e) => e.type === type) ?? NO_CN_SCHEMA;
			const declaredDefault = (cnKind?.fields.find((f) => f.name === "strength"))?.default;
			const defaultStrength = typeof declaredDefault === "number" ? declaredDefault : .8;
			return {
				id: newCnId(),
				type,
				model: schema.model,
				preprocessor: schema.preprocessor,
				image_b64: "",
				strength: schema.default_strength ?? defaultStrength,
				start_percent: 0,
				end_percent: 1,
				enabled: true,
				source: "user"
			};
		}
		/** New LoRA entry from an adapter name — default strength 1.0 (apply_loras'
		* own default when the spec omits it). */
		function newLoraEntry(id, strength = 1) {
			return {
				id,
				strength
			};
		}
		/**
		* New generic entry for a NOVEL modifier kind (not lora / controlnet — those
		* keep their bespoke templates above). Renders from ``kind.fields``: the
		* selected option's ``defaults`` win over field-level ``default`` over the
		* raw type zero (0 / "" / false). Returns null when the list is full
		* (``max_stack``, cardinality=list only). Scalar kinds return a single dict
		* at ``params[kind.param_key]`` — no id, no stack check.
		*
		* This is the proof the user demanded: a YAML block declaring a new kind
		* (clip_skip, sampler_override, …) gets a working create-template with ZERO
		* code beyond the catalog edit + the one ``@register`` applier. The generic
		* grid row + generic modal editor render from the same ``kind.fields``.
		*/
		function newGenericEntry(kind, stackLength, optionValue) {
			if (kind.cardinality === "list") {
				if (stackLength >= (kind.max_stack ?? 5)) return null;
			}
			const option = kind.options?.find((o) => o.value === optionValue);
			const entry = {};
			for (const field of kind.fields) {
				const fromOption = option?.defaults?.[field.name];
				if (fromOption !== void 0) entry[field.name] = fromOption;
				else if (field.default !== void 0 && field.default !== null) entry[field.name] = field.default;
				else entry[field.name] = defaultForType(field.type);
			}
			if (kind.cardinality === "list") entry.id = newCnId();
			if (optionValue !== void 0 && !("value" in entry)) entry.value = optionValue;
			return entry;
		}
		/** The type-correct zero for a modifier field with no declared default. */
		function defaultForType(type) {
			switch (type) {
				case "integer":
				case "float": return 0;
				case "boolean": return false;
				case "select": return "";
				case "image": return "";
				case "string": return "";
			}
		}
		/** The lora kind's options as the legacy adapter list — the LoRA dropdown. */
		function loraAdaptersOf(kind) {
			if (!kind) return [];
			return (kind.options ?? []).map((o) => ({
				name: o.value,
				filename: o.model ?? o.value,
				label: o.label,
				category: o.metadata?.category ?? "LoRA",
				default_strength: o.defaults?.strength ?? 1,
				prompt_hint: o.metadata?.prompt_hint ?? null,
				installed: o.installed ?? true
			}));
		}
		/** The controlnet kind's options as the legacy schema-entry list — the CN dropdown. */
		function cnEntriesOf(kind) {
			if (!kind) return [];
			const strengthField = kind.fields.find((f) => f.name === "strength");
			return (kind.options ?? []).map((o) => ({
				type: o.value,
				label: o.label,
				tooltip: o.tooltip ?? void 0,
				model: o.model ?? void 0,
				default_strength: o.defaults?.strength ?? strengthField?.default ?? .8,
				preprocessor: o.metadata?.preprocessor ?? void 0,
				installed: o.installed ?? void 0
			}));
		}
		/** LoRA strength bounds — from the kind's strength field (one source). */
		function loraStrengthBoundsOf(kind) {
			const strengthField = kind?.fields.find((f) => f.name === "strength");
			return {
				min: strengthField?.min ?? -2,
				max: strengthField?.max ?? 5,
				step: strengthField?.step ?? .05
			};
		}
		/**
		* The generic arbitrary-kind list — the ONE key the frontend reads to decide
		* which modifier rows to render. Declared-only (Phase A finalé): the backend
		* emits ``features.modifiers`` from the catalog's ``modifiers:`` block and
		* nothing else — the legacy client-side projection is deleted (rule 4).
		* Returns ``[]`` when the family declares no modifier capability.
		*/
		function modifiersFeatureOf(formSpec) {
			const raw = formSpec?.features?.modifiers;
			return Array.isArray(raw) ? raw : [];
		}
		/** The family declares at least one modifier kind. The grid renders iff true. */
		function hasModifierCapability(formSpec) {
			return modifiersFeatureOf(formSpec).length > 0;
		}
		/** Find a kind's spec by its discriminator — convenience for the grid/modal. */
		function kindSpecOf(formSpec, kind) {
			return modifiersFeatureOf(formSpec).find((k) => k.kind === kind) ?? null;
		}
		var NO_CN_SCHEMA, _cnIdCounter;
		var init_modifierSubcards = __esmMin((() => {
			NO_CN_SCHEMA = {
				type: "",
				label: ""
			};
			_cnIdCounter = 0;
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/enhanceTypes.ts
		var init_enhanceTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/mediaTypes.ts
		var init_mediaTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/index.ts
		var src_exports$1 = /* @__PURE__ */ __exportAll({
			DEFAULT_LIPSYNC_FIELDS: () => DEFAULT_LIPSYNC_FIELDS,
			DEFAULT_SEGMENT_PARAMS: () => DEFAULT_SEGMENT_PARAMS,
			FLF_MODES: () => FLF_MODES,
			NO_CN_SCHEMA: () => NO_CN_SCHEMA,
			PROVENANCE_VALUES: () => PROVENANCE_VALUES,
			Provenance: () => Provenance,
			SEGMENT_STATUSES: () => SEGMENT_STATUSES,
			TRACK_COLORS: () => TRACK_COLORS,
			_cachedCount: () => _cachedCount,
			_resetBrowserStorageForTests: () => _resetBrowserStorageForTests,
			activeChild: () => activeChild,
			activeClause: () => activeClause,
			applySubcardDrop: () => applySubcardDrop,
			cnEntriesOf: () => cnEntriesOf,
			dataUrlToObjectUrl: () => dataUrlToObjectUrl,
			evalVisibleWhen: () => evalVisibleWhen,
			fieldForbiddenInMode: () => fieldForbiddenInMode,
			fieldRequiredInMode: () => fieldRequiredInMode,
			hasModifierCapability: () => hasModifierCapability,
			initBrowserStorage: () => initBrowserStorage,
			isDataUrl: () => isDataUrl,
			isPresent: () => isPresent,
			isProvenance: () => isProvenance,
			kindForId: () => kindForId,
			kindSpecOf: () => kindSpecOf,
			loraAdaptersOf: () => loraAdaptersOf,
			loraIdOf: () => loraIdOf,
			loraLabel: () => loraLabel,
			loraStrengthBoundsOf: () => loraStrengthBoundsOf,
			modifiersFeatureOf: () => modifiersFeatureOf,
			moveItem: () => moveItem,
			newControlnetEntry: () => newControlnetEntry,
			newGenericEntry: () => newGenericEntry,
			newLoraEntry: () => newLoraEntry,
			normalizeLoraEntry: () => normalizeLoraEntry,
			normalizeSegmentStatus: () => normalizeSegmentStatus,
			notchesOf: () => notchesOf,
			optionLabel: () => optionLabel,
			optionValue: () => optionValue,
			revokeAll: () => revokeAll,
			revokeObjectUrlFor: () => revokeObjectUrlFor,
			subcardCount: () => subcardCount,
			subcardId: () => subcardId,
			subcardsFromParams: () => subcardsFromParams,
			validateContract: () => validateContract,
			variantGroupDefault: () => variantGroupDefault
		});
		var init_src$2 = __esmMin((() => {
			init_card();
			init_character();
			init_studio();
			init_stageView();
			init_stagePreview();
			init_vocab();
			init_wire();
			init_regions();
			init_timelineTypes();
			init_loraTypes();
			init_browserStorage();
			init_objectUrlCache();
			init_FlowTypes();
			init_formSpec();
			init_modifierSubcards();
			init_enhanceTypes();
			init_mediaTypes();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/familyParamContract.ts
		var familyParamContract_exports = /* @__PURE__ */ __exportAll({
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema,
			coerceParamsToSchema: () => coerceParamsToSchema,
			getFamilySchema: () => getFamilySchema,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated,
			loadFamilySchemas: () => loadFamilySchemas,
			validateModifierEntries: () => validateModifierEntries,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema
		});
		/**
		* Load ALL family param schemas in ONE fetch. Mirrors loadCatalog: module-
		* level cache, inflight dedup, idempotent. Call at boot (alongside
		* loadCatalog) so the validator never blocks on a fetch.
		*
		* Returns the cached index on subsequent calls (no refetch). Use
		* { force: true } to bypass the cache.
		*/
		async function loadFamilySchemas(opts) {
			if (_cache$1 && !opts?.force) return _cache$1;
			if (_inflight$1) return _inflight$1;
			_inflight$1 = (async () => {
				try {
					const data = await apiJson("/v1/flows/families/param-schemas");
					_cache$1 = data;
					return data;
				} finally {
					_inflight$1 = null;
				}
			})();
			return _inflight$1;
		}
		/** Sync lookup — returns the cached schema for a family, or null if the
		* cache isn't loaded yet or the family is unknown. Pure, no fetch. */
		function getFamilySchema(familyId) {
			if (!_cache$1) return null;
			return _cache$1[familyId] ?? null;
		}
		/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
		* family)? Distinguishes "transmission worked and the family is absent"
		* (a phantom family — throw) from the cache-cold/failed branch (defer). */
		function isFamilySchemaCachePopulated() {
			return !!_cache$1 && Object.keys(_cache$1).length > 0;
		}
		function jsonTypeOf(val) {
			/* v8 ignore next -- defensive: both callers (coerceParamsToSchema,
			* validateParamsAgainstSchema) route val === null through the defaulted
			* null path BEFORE calling, so null never reaches here (2026-09-12) */
			if (val === null) return "null";
			if (Array.isArray(val)) return "array";
			const t = typeof val;
			if (t === "string") return "string";
			if (t === "boolean") return "boolean";
			if (t === "number") return Number.isInteger(val) ? "integer" : "number";
			return "object";
		}
		/**
		* Coerce a params dict to a family's schema types — the TYPED RUN BODY.
		* Canonical coercions ONLY (2026-09-05 compile-time incident: form state,
		* stale drafts and legacy editors carry strings for numbers/booleans and
		* "" for empty arrays — the class admits the canonical forms, so the
		* boundary normalizes them instead of refusing what the backend takes):
		*   - integer/number: numbers kept (integer rejects fractions); a trimmed
		*     canonical numeric string becomes Number; "" means UNSET (falls into
		*     the null path: default-or-omit — "" is NEVER 0); anything else is
		*     a violation (never NaN into the wire).
		*   - boolean: booleans kept; "true"/"false" become bool; else violation.
		*   - array: arrays kept; "" becomes [] (the unowned picker's empty
		*     serialization — the class coerces the same); a non-empty string is
		*     a violation (ambiguous — never a split-guess).
		*   - string/object: kept on exact type; anything else is a violation
		*     (never String()-collapse, never JSON.parse-guess).
		*   - null / UNSET-"": OMITTED when the field declares a default —
		*     absent rides the backend default (the class's own semantics:
		*     explicit null refuses on numerics, so the boundary must never
		*     POST a null the click gate waved through — 2026-09-06
		*     frontend-impossible incident). A null/UNSET with NO default is
		*     kept so the validator refuses it loudly. Untyped fields (the
		*     loras/mask tile bags) pass null through untouched — the class's
		*     own None-coercion owns them, and it runs on explicit values.
		*   - fields with NO declared type (the loras/mask tile bags {}): passed
		*     through untouched — the compose door owns them.
		* Returns the typed copy + violations against the TYPED values (empty =
		* the body is exactly what the class admits — the POST must send THIS
		* body, never the raw draft).
		*/
		function coerceParamsToSchema(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const typed = {};
			const props = schema.properties ?? {};
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field || !field.type) {
					typed[key] = val;
					continue;
				}
				const expected = field.type;
				if (val === null) {
					if ("default" in field) continue;
					typed[key] = val;
					continue;
				}
				const actual = jsonTypeOf(val);
				if (actual === expected) {
					typed[key] = val;
					continue;
				}
				if (expected === "number" && actual === "integer") {
					typed[key] = val;
					continue;
				}
				const coerced = coerceScalar(key, expected, val);
				if ("value" in coerced) {
					typed[key] = coerced.value;
					continue;
				}
				if (coerced.unset) {
					if (field && "default" in field) continue;
					typed[key] = null;
					continue;
				}
				out.push({
					path: `${prefix}${key}`,
					message: `'${key}': expected ${expected}, got ${actual}`
				});
				typed[key] = val;
			}
			return {
				params: typed,
				violations: out
			};
		}
		/** Canonical scalar coercion. ok = coerced value; unset = "" for a
		* non-string field (the value is UNSET — the caller routes it into the
		* null path); neither = refuse loudly. */
		function coerceScalar(_key, expected, val) {
			if (typeof val === "string") {
				const t = val.trim();
				if (t === "") {
					if (expected === "array") return {
						ok: true,
						value: []
					};
					return {
						ok: false,
						unset: true
					};
				}
				if (expected === "integer" || expected === "number") {
					const n = Number(t);
					if (!Number.isFinite(n)) return {
						ok: false,
						unset: false
					};
					if (expected === "integer" && !Number.isInteger(n)) return {
						ok: false,
						unset: false
					};
					return {
						ok: true,
						value: n
					};
				}
				if (expected === "boolean") {
					if (t === "true") return {
						ok: true,
						value: true
					};
					if (t === "false") return {
						ok: true,
						value: false
					};
					return {
						ok: false,
						unset: false
					};
				}
				return {
					ok: false,
					unset: false
				};
			}
			return {
				ok: false,
				unset: false
			};
		}
		/**
		* Validate a params dict against a family's param schema. Pure + synchronous.
		* Returns violations (empty = clean). A null for a field WITH a default is
		* treated as "use the default" (no violation) — coerce strips such nulls
		* to absent before this runs, and absent rides the backend default; the
		* tolerance here is defense-in-depth for direct callers (the boundary
		* must NEVER POST a null the class would refuse — explicit null 400s
		* on every numeric row, so coerce omits, it never forwards). A null for
		* a field WITHOUT a default IS a violation.
		*
		* WHAT IT CATCHES (the motion_constraints bug class):
		*   - TYPE mismatches: a str param sent an object/number/array.
		*   - EXTRA fields: unknown param names (additionalProperties: false).
		*   - null for NON-defaulted fields.
		*
		* WHAT IT LEAVES TO THE BACKEND (no false positives):
		*   - REQUIRED-field presence — the frontend doesn't know which keys are
		*     injected from flow.shared via the consumes axis (comfy_url, model).
		*     The backend's card phase-1 compose knows the consumes set, so it
		*     knows. The frontend defers required-checking to the hard wire gate.
		*/
		function validateParamsAgainstSchema(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const props = schema.properties ?? {};
			if (Object.keys(props).length === 0) return out;
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field) {
					if (schema.additionalProperties === false && !WIRE_RELAXED_KEYS.has(key)) out.push({
						path: `${prefix}${key}`,
						message: `unknown parameter '${key}' — not in the family signature`
					});
					continue;
				}
				if (val === null) {
					if (!("default" in field)) out.push({
						path: `${prefix}${key}`,
						message: `'${key}' is null but has no default — provide a value`
					});
					continue;
				}
				const expected = field.type;
				if (!expected) continue;
				const actual = jsonTypeOf(val);
				if (actual === expected) continue;
				if (expected === "number" && actual === "integer") continue;
				out.push({
					path: `${prefix}${key}`,
					message: `'${key}': expected ${expected}, got ${actual}`
				});
			}
			return out;
		}
		/**
		* Validate a stage's modifier entries against the family's declared kinds.
		* Mirrors backend validate_modifier_entries: per declared kind with a
		* param_key, params[param_key] must honor the cardinality (list kinds take
		* a list of entry dicts bounded by max_stack; scalar kinds take ONE value),
		* and each entry's keys/required/type/bounds/select-membership must match
		* the declared fields. Empty = clean; never throws. No kinds → no-op.
		*/
		function validateModifierEntries(kinds, params) {
			const out = [];
			if (!kinds) return out;
			for (const kind of kinds) {
				const key = kind.param_key;
				const value = params[key];
				if (value === void 0 || value === null) continue;
				const fields = kind.fields ?? [];
				if ((kind.cardinality ?? "list") === "scalar") {
					if (typeof value === "object") {
						out.push({
							path: key,
							message: `expected a single scalar value for '${kind.kind}' (cardinality='scalar'), got ${Array.isArray(value) ? "array" : "object"}`
						});
						continue;
					}
					if (fields.length > 0 && fields[0].name) checkModEntry(out, { [fields[0].name]: value }, fields, kind, key, kind.kind === "controlnet");
					continue;
				}
				if (!Array.isArray(value)) {
					out.push({
						path: key,
						message: `expected a list of entries for '${kind.kind}' (cardinality='list'), got ${typeof value}`
					});
					continue;
				}
				if (typeof kind.max_stack === "number" && value.length > kind.max_stack) out.push({
					path: key,
					message: `stack of ${value.length} exceeds the declared max_stack (${kind.max_stack}) for '${kind.kind}'`
				});
				const cnKind = kind.kind === "controlnet";
				for (let i = 0; i < value.length; i++) {
					const entry = value[i];
					const entryPath = `${key}[${i}]`;
					if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
						out.push({
							path: entryPath,
							message: `expected a dict entry, got ${Array.isArray(entry) ? "array" : typeof entry}`
						});
						continue;
					}
					checkModEntry(out, entry, fields, kind, entryPath, cnKind);
				}
			}
			return out;
		}
		function checkModEntry(out, entry, fields, kind, path, cnKind) {
			const declared = /* @__PURE__ */ new Map();
			for (const f of fields) if (f.name) declared.set(f.name, f);
			const allowed = /* @__PURE__ */ new Set([...declared.keys(), ...EDITOR_MOD_ENTRY_KEYS]);
			for (const entryKey of Object.keys(entry)) if (!allowed.has(entryKey)) out.push({
				path: `${path}.${entryKey}`,
				message: `unknown field '${entryKey}'. Declared fields: ${[...declared.keys()].sort().join(", ")}.`
			});
			const kindOptions = (kind.options ?? []).map((o) => o?.value).filter((v) => typeof v === "string");
			const hasUploadDir = Boolean(kind.upload_dir);
			for (const f of fields) {
				const name = f.name;
				const val = entry[name];
				if (!(name in entry && val !== null && val !== void 0)) {
					if (f.default === void 0 && f.type !== "image" && name !== "artifact") out.push({
						path: `${path}.${name}`,
						message: `missing required field '${name}'.`
					});
					continue;
				}
				if (f.type === "integer" || f.type === "float") {
					if (typeof val !== "number") {
						out.push({
							path: `${path}.${name}`,
							message: `expected a number, got ${typeof val}.`
						});
						continue;
					}
					if (f.type === "integer" && !Number.isInteger(val)) {
						out.push({
							path: `${path}.${name}`,
							message: `expected an integer, got ${typeof val}.`
						});
						continue;
					}
					if (typeof f.min === "number" && val < f.min) out.push({
						path: `${path}.${name}`,
						message: `value ${val} below the declared minimum ${f.min}.`
					});
					if (typeof f.max === "number" && val > f.max) out.push({
						path: `${path}.${name}`,
						message: `value ${val} above the declared maximum ${f.max}.`
					});
				} else if (f.type === "boolean") {
					if (typeof val !== "boolean") out.push({
						path: `${path}.${name}`,
						message: `expected a boolean, got ${typeof val}.`
					});
				} else if (f.type === "string") {
					if (typeof val !== "string") out.push({
						path: `${path}.${name}`,
						message: `expected a string, got ${typeof val}.`
					});
					else if (name === "id" && kindOptions.length > 0 && !hasUploadDir && !cnKind) {
						if (!kindOptions.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown adapter '${val}'. Declared: ${[...kindOptions].sort().join(", ")}.`
						});
					}
				} else if (f.type === "select") {
					if (typeof val !== "string") {
						out.push({
							path: `${path}.${name}`,
							message: `expected a string, got ${typeof val}.`
						});
						continue;
					}
					if (f.options && f.options.length > 0) {
						if (!f.options.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown option '${val}'. Allowed: ${[...f.options].sort().join(", ")}.`
						});
					} else if (kindOptions.length > 0 && !hasUploadDir && !cnKind) {
						if (!kindOptions.includes(val)) out.push({
							path: `${path}.${name}`,
							message: `unknown option '${val}'. Declared: ${[...kindOptions].sort().join(", ")}.`
						});
					}
				}
			}
		}
		/**
		* Pre-submit gate: resolve model → family → schema (from the ONE cache),
		* validate params, throw on any violation. Called before EVERY GPU-starting
		* fetch so the crash comes before the button press, not after a round-trip.
		*
		* Ensures the schema cache is loaded (loadFamilySchemas) on the first call,
		* then validates synchronously.
		*
		* NO SILENT DEFERS (2026-08-16): the old gate no-op'd when the model was
		* missing from the catalog or the family had no schema — silently
		* shipping UNKNOWN params to the backend and calling that "the backend's
		* backstop". That is the silent-drop class this contract exists to kill:
		*   - catalog LOADED + model missing → THROW. The picker is showing a
		*     model that DOES NOT EXIST (the original operator complaint) — the
		*     catalog is the source of truth and the model is not in it.
		*   - family resolved + no schema → THROW. The schema transmission is
		*     broken (bulk fetch dropped it); deferring would validate against
		*     NOTHING. (The workflow:* exemption died with the workflow lane —
		*     §12.2; a workflow is a plugin card with a REAL signature now.)
		* The ONE honest defer left: the catalog cache is still cold at boot
		* (nothing fetched yet — cannot resolve anything, backend gate decides).
		*/
		async function assertParamsMatchFamilySchema(model, params) {
			let family;
			let modifiers;
			let cat;
			try {
				const { getCachedCatalog } = await Promise.resolve().then(() => (init_src(), src_exports));
				cat = getCachedCatalog();
				family = cat?.models?.[model]?.family;
				modifiers = cat?.families?.[family ?? ""]?.modifiers;
			} catch {
				return params;
			}
			if (!cat) return params;
			if (!family) throw new Error(`Parameter validation failed — model '${model}' is not in the catalog. The picker showed a model that DOES NOT EXIST; the catalog is the source of truth and this key is not in it. (The backend wire gate would 400 the same request.)`);
			try {
				await loadFamilySchemas();
			} catch {
				return params;
			}
			const schema = getFamilySchema(family);
			if (!schema) {
				if (isFamilySchemaCachePopulated()) throw new Error(`Parameter validation failed — family '${family}' (model '${model}') has no param schema in the populated cache — the backend does not know this family. Refusing to validate against nothing.`);
				return params;
			}
			const coerced = coerceParamsToSchema(schema, params);
			const violations = [...coerced.violations];
			violations.push(...validateParamsAgainstSchema(schema, coerced.params));
			violations.push(...validateModifierEntries(modifiers, params));
			if (violations.length > 0) {
				const lines = violations.map((v) => `  - ${v.path}: ${v.message}`).join("\n");
				throw new Error(`Parameter validation failed — the params do not match the '${family}' family signature. Fix before running:\n${lines}\n\n(The backend's wire gate would reject this same request with 400.)`);
			}
			return coerced.params;
		}
		var _cache$1, _inflight$1, WIRE_RELAXED_KEYS, EDITOR_MOD_ENTRY_KEYS;
		var init_familyParamContract = __esmMin((() => {
			init_api();
			_cache$1 = null;
			_inflight$1 = null;
			WIRE_RELAXED_KEYS = /* @__PURE__ */ new Set([
				"sampling_steps",
				"guide_scale",
				"num_frames",
				"end_image",
				"image1",
				"image2",
				"image3",
				"input_image",
				"first_frame",
				"last_frame",
				"input_glb",
				"prev_motion_artifact",
				"lanpaint_mask",
				"source_glb",
				"outfit_glb",
				"hair_glb",
				"motion_npz",
				"loras",
				"controlnets",
				"modifiers",
				"service",
				"source",
				"preset",
				"reference_audio",
				"reference_text",
				"rigged_path",
				"npz_path",
				"export_glb",
				"export_fbx",
				"export_usd",
				"export_obj",
				"detect_mode",
				"model_name",
				"t5_name",
				"vae_name"
			]);
			EDITOR_MOD_ENTRY_KEYS = /* @__PURE__ */ new Set([
				"id",
				"value",
				"model",
				"preprocessor",
				"enabled",
				"source"
			]);
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/cardBirth.ts
		var cardBirth_exports = /* @__PURE__ */ __exportAll({
			composeCard: () => composeCard,
			ensureDraftId: () => ensureDraftId
		});
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see python/editor_runs.py drafts_save), so what the card shows is
		*  what the run consumed. Throws LOUDLY on any refusal — a refused
		*  compose never proceeds to a start (no silent cardless runs). */
		async function composeCard(body, signal) {
			const res = await fetch("/v1/flows/drafts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal
			});
			const text = await res.text();
			if (!res.ok) throw new Error(`card compose refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`);
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				throw new Error("card compose returned a non-JSON body");
			}
			const draftId = data.draftId;
			if (typeof draftId !== "string" || !draftId) throw new Error("card compose returned no draftId — refusing to start cardless");
			return draftId;
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*/
		async function ensureDraftId(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return declared;
			return composeCard(body, signal);
		}
		var init_cardBirth = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/FlowProtocol.ts
		var FlowProtocol_exports = /* @__PURE__ */ __exportAll({
			assertNoParamDrops: () => assertNoParamDrops,
			collectNamedArtifacts: () => collectNamedArtifacts,
			collectStageUrls: () => collectStageUrls,
			describeErrorBody: () => describeErrorBody,
			pollFlowRun: () => pollFlowRun,
			runCompiledGeneration: () => runCompiledGeneration,
			sanitizeRevivedResult: () => sanitizeRevivedResult,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver
		});
		/**
		* Extract the backend's error message from a non-2xx body for surfacing.
		*
		* Our backend always answers errors as `{"error": "..."}` — the string
		* carries REAL newlines once parsed (the wire JSON escapes them), which is
		* exactly what a multi-line flow doc parse error / validation report
		* looks like in the drilldown modal. When the body isn't JSON, or has no
		* string `error` field (proxy error page, unexpected shape), the raw text
		* is returned unchanged.
		*
		* 2026-08-10: the error path used to `slice(0, 200)` the body, which cut
		* "Validation failed: N violation(s)" reports mid-sentence — the full
		* error is now surfaced unmodified (user: "full errors in the modals").
		*/
		function describeErrorBody(text) {
			try {
				const parsed = JSON.parse(text);
				if (typeof parsed?.error === "string") return parsed.error;
			} catch {}
			return text;
		}
		/** Collect every artifact URL from a run status (stage.url + gallery).
		*  The FLAT list — preserves the legacy wire-by-position behavior (the
		*  primary output is always [0]). Use collectNamedArtifacts when the wire
		*  needs to address a specific named output (mask, detection, …). */
		function collectStageUrls(stages) {
			const urls = [];
			if (Array.isArray(stages)) for (const s of stages) {
				if (s.url) urls.push(s.url);
				if (Array.isArray(s.gallery)) {
					for (const g of s.gallery) if (g && typeof g.url === "string") urls.push(g.url);
				}
			}
			return urls;
		}
		/** Revived/stashed docs are untrusted (written by any client or session):
		*  artifacts + assetUrls must be STRING-only, or every consumer crashes
		*  (u.endsWith on undefined — motion card 2026-08-10). Filter instead of
		*  casting verbatim; callers still hard-error on structural doc junk.
		*  Missing numeric fields default so downstream guards (assetUrls.length)
		*  behave — never a null result while the result object is present. */
		function sanitizeRevivedResult(raw) {
			if (!raw || typeof raw !== "object") return null;
			const r = raw;
			const assetUrls = Array.isArray(r.assetUrls) ? r.assetUrls.filter((u) => typeof u === "string" && !!u) : [];
			const artifacts = {};
			if (r.artifacts && typeof r.artifacts === "object" && !Array.isArray(r.artifacts)) {
				for (const [k, v] of Object.entries(r.artifacts)) if (typeof v === "string" && v) artifacts[k] = v;
			}
			return {
				assetUrls,
				artifacts,
				metadata: r.metadata && typeof r.metadata === "object" ? r.metadata : {},
				completedAt: typeof r.completedAt === "number" ? r.completedAt : Date.now(),
				durationSec: typeof r.durationSec === "number" ? r.durationSec : 0
			};
		}
		/** Collect named artifacts from a run status → {name: URL}. The NAMED map
		*  — lets a downstream slot wire a SPECIFIC output (mask → lanpaint_mask)
		*  rather than only the primary (assetUrls[0]). Falls back to {} when the
		*  backend didn't send named_urls (legacy runs / single-output bricks). */
		function collectNamedArtifacts(stages) {
			const out = {};
			if (Array.isArray(stages)) {
				for (const s of stages) if (s.named_urls && typeof s.named_urls === "object") {
					for (const [name, url] of Object.entries(s.named_urls)) if (typeof url === "string" && url) out[name] = url;
				}
			}
			return out;
		}
		/**
		* Poll a flow run until terminal. Throws on error/timeout/abort.
		*
		* Terminal statuses: "completed"/"done" → success; "error"/"failed" →
		* throws with the run-level error message.
		*
		* `onTick(status)` fires after every successful poll — used by the store
		* to hydrate live KSampler step progress onto the running card BEFORE the
		* run goes terminal (so the per-card progress bar animates during the
		* run, 2026-08-08). Not fired on the terminal tick (the final status is
		* the return value).
		*/
		async function pollFlowRun(runId, signal, opts) {
			const maxWaitMs = opts?.maxWaitMs ?? 36e5;
			const intervalMs = opts?.intervalMs ?? 2e3;
			const started = performance.now();
			while (performance.now() - started < maxWaitMs) {
				if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
				const resp = await apiFetch(`/v1/flows/status/${runId}`, { signal });
				if (!resp.ok) {
					if (resp.status === 404) throw new Error(`Flow run ${runId} is gone — the server restarted mid-run. Re-run this card.`);
					let errorBody = null;
					try {
						errorBody = await resp.json();
					} catch {
						errorBody = null;
					}
					if (hasViolationsSignature(errorBody)) {
						const violations = errorBody.violations;
						useRunStatusContractStore.getState().reportViolation(runId, violations);
						throw new RunStatusContractError(runId, violations);
					}
					await new Promise((r) => setTimeout(r, intervalMs));
					continue;
				}
				const data = await resp.json();
				const { valid, violations } = validateRunStatusContract(data);
				if (!valid) {
					useRunStatusContractStore.getState().reportViolation(runId, violations);
					throw new RunStatusContractError(runId, violations);
				}
				if (data.status === "completed") return data;
				if (data.status === "failed") {
					const detail = data.error;
					throw new Error(`Flow run ${runId} failed${detail ? `: ${detail}` : ""}`);
				}
				opts?.onTick?.(data);
				await new Promise((r) => setTimeout(r, intervalMs));
			}
			throw new Error(`Flow run ${runId} timed out after ${Math.round(maxWaitMs / 6e4)} min`);
		}
		/** Register (or clear) the required-empty resolver. */
		function setRequiredEmptyResolver(fn) {
			_requiredEmptyResolver = fn;
		}
		/**
		* HARD VALIDATION: no silent parameter drops in the generate request body.
		*
		* JSON.stringify silently drops `undefined` values — `{a: 1, b: undefined}`
		* serializes to `{"a":1}` with ZERO error. This is the TypeScript version
		* of the Python `**kwargs` absorb pattern: a field that was set in the form
		* state, survived into the body object, but vanishes on the wire with no
		* error, no warning. The backend receives defaults and the user sees
		* degraded output they can't diagnose.
		*
		* This function is called before EVERY GPU-starting fetch (generate,
		* startChain — the run doors) —
		* it is the universal gate. It catches:
		*   - `undefined` values (silently dropped by JSON.stringify)
		*   - `NaN` / `Infinity` (serialized as `null` — a value mutation)
		*   - `function` / `symbol` / `bigint` values (dropped or thrown by JSON)
		*   - empty string for known-critical fields (prompt, model)
		*
		* SILENT PARAMETER DROPS ARE COMPLETELY UNACCEPTABLE ANYWHERE EVER.
		*
		* @param body the request body about to be JSON.stringify'd and POST'd
		* @throws Error listing every field that would be silently dropped or mutated
		*/
		function assertNoParamDrops(body) {
			const dropped = [];
			const mutated = [];
			for (const [key, val] of Object.entries(body)) if (val === void 0) dropped.push(key);
			else if (typeof val === "number" && !Number.isFinite(val)) mutated.push(`${key} (NaN/Infinity → JSON serializes as null)`);
			else if (typeof val === "function" || typeof val === "symbol") dropped.push(`${key} (${typeof val} value — JSON.stringify drops it)`);
			else if (typeof val === "bigint") mutated.push(`${key} (bigint → JSON.stringify throws)`);
			if (typeof body.model === "string" && _requiredEmptyResolver) {
				const fields = _requiredEmptyResolver(body.model, body);
				for (const field of fields ?? []) {
					const v = body[field];
					if (typeof v === "string" && v.trim() === "") throw new Error(`'${field}' is empty for '${body.model}' — the model's form declares it required (the engine has no conditioning signal without it). Type it before running. (Backend semantic validator would 400 this same run.)`);
				}
			}
			if (dropped.length > 0 || mutated.length > 0) {
				const parts = [dropped.length > 0 ? `DROPPED: [${dropped.join(", ")}]` : "", mutated.length > 0 ? `MUTATED: [${mutated.join(", ")}]` : ""].filter(Boolean);
				throw new Error(`SILENT PARAMETER DROP DETECTED in generate request body — ${parts.join("; ")}. JSON.stringify would silently lose or mutate these values on the wire. SILENT PARAMETER DROPS ARE UNACCEPTABLE. Fix the caller to omit or set these fields explicitly.`);
			}
		}
		/** Append the door's 400 violation envelope ({violations: [{field,
		* message}]}) as one line per violation — a bare headline would silently
		* DROP the dotted paths (the whole point of a refusal is seeing WHICH
		* param failed). ONE construction, both run doors (compile + start). */
		function violationLines(text) {
			try {
				const parsed = JSON.parse(text);
				if (Array.isArray(parsed.violations)) {
					const lines = parsed.violations.map((v) => `${String(v.field ?? "?")}: ${String(v.message ?? "")}`).filter((line) => !line.endsWith(": "));
					if (lines.length > 0) return `\n${lines.join("\n")}`;
				}
			} catch {}
			return "";
		}
		async function runCompiledGeneration(body, signal, opts) {
			if (Array.isArray(body.loras)) {
				const { normalizeLoraEntry } = await Promise.resolve().then(() => (init_src$2(), src_exports$1));
				body = {
					...body,
					loras: body.loras.map((e) => e && typeof e === "object" ? normalizeLoraEntry(e) : e)
				};
			}
			assertNoParamDrops(body);
			let typedBody = body;
			if (typeof body.model === "string") {
				const { assertParamsMatchFamilySchema } = await Promise.resolve().then(() => (init_familyParamContract(), familyParamContract_exports));
				const paramOnly = {};
				for (const [k, v] of Object.entries(body)) {
					if (k === "model") continue;
					paramOnly[k] = v;
				}
				typedBody = {
					...await assertParamsMatchFamilySchema(body.model, paramOnly),
					model: body.model
				};
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth(), cardBirth_exports));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
				const compileRes = await fetch("/v1/flows/validate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(typedBody),
					signal
				});
				if (!compileRes.ok) {
					const text = await compileRes.text();
					throw new Error(`card failed to compile: HTTP ${compileRes.status}${text ? `: ${describeErrorBody(text)}` : ""}${violationLines(text)}`);
				}
			}
			if (typeof typedBody.draft_id !== "string" || typedBody.draft_id === "") {
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth(), cardBirth_exports));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
			}
			const res = await fetch("/v1/flows/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(typedBody),
				signal
			});
			const text = await res.text();
			if (res.ok) {
				let data;
				try {
					data = JSON.parse(text);
				} catch {
					throw new Error(`generate failed: /v1/flows/start returned non-JSON body: ${text.slice(0, NON_JSON_BODY_CAP)}`);
				}
				const runId = data.run_id;
				if (typeof runId !== "string") throw new Error(`generate failed: /v1/flows/start returned no run_id: ${describeErrorBody(text)}`);
				opts?.onStart?.(runId);
				const status = await pollFlowRun(runId, signal, {
					intervalMs: opts?.intervalMs,
					onTick: opts?.onTick
				});
				return {
					kind: "started",
					runId,
					status,
					urls: collectStageUrls(status.stages)
				};
			}
			throw new Error(`generate failed: HTTP ${res.status}${text ? `: ${describeErrorBody(text)}` : ""}${violationLines(text)}`);
		}
		var NON_JSON_BODY_CAP, _requiredEmptyResolver;
		var init_FlowProtocol = __esmMin((() => {
			init_api();
			init_runStatusContract();
			init_runStatusContractStore();
			NON_JSON_BODY_CAP = 2e3;
			_requiredEmptyResolver = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/FlowEvents.ts
		/**
		* Open the events stream for one run. Returns immediately; frames land
		* in `onEvent`. Auto-reconnects with capped backoff until a terminal
		* `run` frame, an explicit close, or `signal` aborts.
		*/
		function streamFlowEvents(runId, onEvent, opts = {}) {
			let ws = null;
			let terminal = false;
			let closed = false;
			let attempt = 0;
			let timer = null;
			const cleanup = () => {
				if (timer) clearTimeout(timer);
				timer = null;
				if (ws) {
					ws.onmessage = null;
					ws.onclose = null;
					ws.onerror = null;
					try {
						ws.close();
					} catch {}
					ws = null;
				}
			};
			const finish = () => {
				terminal = true;
				cleanup();
			};
			const connect = () => {
				/* v8 ignore next -- defensive: close()/finish() always clear the pending reconnect timer, so connect() can never run after close or a terminal frame (2026-09-12) */
				if (closed || terminal) return;
				if (typeof WebSocket === "undefined") return;
				const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
				const host = typeof location !== "undefined" ? location.host : "";
				try {
					ws = new WebSocket(`${proto}://${host}/v1/flows/events?run_id=${encodeURIComponent(runId)}`);
				} catch {
					return;
				}
				ws.onmessage = (ev) => {
					if (closed || terminal) return;
					attempt = 0;
					let frame = null;
					try {
						frame = JSON.parse(String(ev.data));
					} catch {
						return;
					}
					if (!frame || typeof frame !== "object" || typeof frame.type !== "string") return;
					onEvent(frame);
					if (frame.type === "run" && TERMINAL.has(String(frame.status))) finish();
				};
				ws.onclose = () => {
					if (closed || terminal) return;
					const wait = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt++);
					timer = setTimeout(connect, wait);
				};
				ws.onerror = () => {};
			};
			connect();
			if (opts.signal) opts.signal.addEventListener("abort", () => {
				closed = true;
				cleanup();
			}, { once: true });
			return {
				close: () => {
					closed = true;
					cleanup();
				},
				done: () => terminal
			};
		}
		var TERMINAL, BACKOFF_BASE_MS, BACKOFF_CAP_MS;
		var init_FlowEvents = __esmMin((() => {
			TERMINAL = /* @__PURE__ */ new Set([
				"completed",
				"failed",
				"stopped",
				"unknown"
			]);
			BACKOFF_BASE_MS = 500;
			BACKOFF_CAP_MS = 5e3;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/tagMap.ts
		/** Is the value a valid TagColor? Gates untrusted JSON (localStorage,
		*  a future server payload) before it enters the store. */
		function isTagColor(v) {
			return typeof v === "string" && TAG_COLOR_VALUES.includes(v);
		}
		function slugify(name) {
			return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tag";
		}
		/** Generate a unique tag id from a name, appending -2, -3, … on collision. */
		function uniqueId(name, existing) {
			const base = slugify(name);
			if (!existing.has(base)) return base;
			let n = 2;
			while (existing.has(`${base}-${n}`)) n++;
			return `${base}-${n}`;
		}
		/** Cycle through the palette so consecutive new tags get distinct colors. */
		function nextColor(count) {
			return TAG_COLOR_VALUES[count % TAG_COLOR_VALUES.length];
		}
		/**
		* Boundary ratchet — gate untrusted JSON (localStorage OR a server payload)
		* before it enters the store. Drops any tag whose color isn't in the closed
		* enum, then rebuilds the forward index dropping orphan entries. This is the
		* front-end mirror of the pydantic TagDocument validator; the server enforces
		* the same rules on PUT, but we don't trust the wire even from our own server
		* — defense in depth.
		*/
		function validateDocument(parsed) {
			const empty = {
				tags: {},
				map: {}
			};
			if (!parsed) return empty;
			const tags = {};
			for (const [id, def] of Object.entries(parsed.tags ?? {})) if (def && typeof def.name === "string" && isTagColor(def.color)) tags[id] = {
				id,
				name: def.name,
				color: def.color
			};
			const knownIds = new Set(Object.keys(tags));
			const map = {};
			for (const [key, ids] of Object.entries(parsed.map ?? {})) if (Array.isArray(ids)) {
				const clean = ids.filter((id) => typeof id === "string" && knownIds.has(id));
				if (clean.length > 0) map[key] = clean;
			}
			return {
				tags,
				map
			};
		}
		function loadPersisted() {
			if (typeof localStorage === "undefined") return {
				tags: {},
				map: {}
			};
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (!raw) return {
					tags: {},
					map: {}
				};
				return validateDocument(JSON.parse(raw));
			} catch {
				return {
					tags: {},
					map: {}
				};
			}
		}
		/**
		* Write-through to localStorage (synchronous cache) + schedule a debounced
		* server PUT. Called from every mutation action. The localStorage write is
		* unconditional (offline fallback stays fresh); the server PUT is gated by
		* `serverSyncEnabled`. Failures are swallowed (the local state is still
		* valid; the next successful mutation retries).
		*/
		function scheduleSync(data) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify({
					tags: data.tags,
					map: data.map
				}));
			} catch {}
			if (!serverSyncEnabled || typeof fetch === "undefined") return;
			if (syncTimer) clearTimeout(syncTimer);
			syncTimer = setTimeout(() => {
				syncTimer = null;
				apiFetch("/v1/tags", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tags: data.tags,
						map: data.map
					})
				}).catch((e) => {
					console.warn("[tagMap] server sync failed:", e);
				});
			}, SYNC_DEBOUNCE_MS);
		}
		/**
		* Hydrate the store from the server (canonical) + enable server pushes.
		* Called once by the app shell on mount. The store already has the
		* localStorage cache (loaded synchronously at module init), so the UI renders
		* immediately; this replaces it with the server copy if one exists (the server
		* wins ties — it's the cross-device source of truth). After this call,
		* mutations push to the server via the debounced PUT.
		*
		* Silent on failure: if the server is unreachable, the store keeps the
		* localStorage cache and server pushes stay disabled (offline mode).
		*/
		async function initTagSync() {
			if (serverSyncEnabled) return;
			if (typeof fetch === "undefined") return;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) return;
				const doc = validateDocument(await res.json());
				useTagMap.setState({
					tags: doc.tags,
					map: doc.map
				});
				serverSyncEnabled = true;
			} catch {}
		}
		/* v8 ignore next -- React-tree wiring: invoking the hook needs a renderer
		* for useSyncExternalStore (dom-project territory, like the slots seam's
		* useVersion). The selector contract is pinned node-side through
		* getState/subscribe in tag-map.spec.ts. (2026-09-12) */
		function useTagMapHook() {
			return (0, react.useSyncExternalStore)((l) => {
				tagMapListeners.add(l);
				return () => {
					tagMapListeners.delete(l);
				};
			}, tagMapGetState);
		}
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf(key) {
			return useTagMap.getState().map[key] ?? [];
		}
		var TagColor, TAG_COLOR_VALUES, TAG_COLOR_META, STORAGE_KEY, SYNC_DEBOUNCE_MS, serverSyncEnabled, syncTimer, initial, tagMapListeners, tagMapState, notifyTagMap, tagMapSetState, tagMapGetState, useTagMap, tagMapActions;
		var init_tagMap = __esmMin((() => {
			init_api();
			TagColor = {
				brand: "brand",
				sky: "sky",
				violet: "violet",
				rose: "rose",
				emerald: "emerald",
				amber: "amber",
				cyan: "cyan"
			};
			TAG_COLOR_VALUES = Object.values(TagColor);
			TAG_COLOR_META = {
				brand: {
					dot: "bg-brand",
					pill: "border-brand/30 bg-brand/10 text-brand"
				},
				sky: {
					dot: "bg-sky-500",
					pill: "border-sky-500/30 bg-sky-500/10 text-sky-400"
				},
				violet: {
					dot: "bg-violet-500",
					pill: "border-violet-500/30 bg-violet-500/10 text-violet-400"
				},
				rose: {
					dot: "bg-rose-500",
					pill: "border-rose-500/30 bg-rose-500/10 text-rose-400"
				},
				emerald: {
					dot: "bg-emerald-500",
					pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
				},
				amber: {
					dot: "bg-amber-500",
					pill: "border-amber-500/30 bg-amber-500/10 text-amber-400"
				},
				cyan: {
					dot: "bg-cyan-500",
					pill: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
				}
			};
			STORAGE_KEY = "melite:tag-map:v1";
			SYNC_DEBOUNCE_MS = 500;
			serverSyncEnabled = false;
			syncTimer = null;
			initial = loadPersisted();
			tagMapListeners = /* @__PURE__ */ new Set();
			notifyTagMap = () => {
				for (const l of tagMapListeners) l();
			};
			tagMapSetState = (patch) => {
				const p = typeof patch === "function" ? patch(tagMapState) : patch;
				tagMapState = {
					...tagMapState,
					...p
				};
				notifyTagMap();
			};
			tagMapGetState = () => tagMapState;
			useTagMap = Object.assign(useTagMapHook, {
				getState: tagMapGetState,
				setState: tagMapSetState,
				subscribe: (l) => {
					tagMapListeners.add(l);
					return () => {
						tagMapListeners.delete(l);
					};
				}
			});
			tagMapActions = (set, get) => ({
				createTag: (name, color) => {
					const trimmed = name.trim();
					if (!trimmed) return "";
					const id = uniqueId(trimmed, new Set(Object.keys(get().tags)));
					const c = color ?? nextColor(Object.keys(get().tags).length);
					set((s) => {
						const tags = {
							...s.tags,
							[id]: {
								id,
								name: trimmed,
								color: c
							}
						};
						scheduleSync({
							tags,
							map: s.map
						});
						return { tags };
					});
					return id;
				},
				renameTag: (id, name) => {
					const trimmed = name.trim();
					if (!trimmed) return;
					set((s) => {
						const def = s.tags[id];
						if (!def) return s;
						const tags = {
							...s.tags,
							[id]: {
								...def,
								name: trimmed
							}
						};
						scheduleSync({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				recolorTag: (id, color) => {
					if (!isTagColor(color)) return;
					set((s) => {
						const def = s.tags[id];
						if (!def) return s;
						const tags = {
							...s.tags,
							[id]: {
								...def,
								color
							}
						};
						scheduleSync({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				deleteTag: (id) => {
					set((s) => {
						if (!s.tags[id]) return s;
						const tags = { ...s.tags };
						delete tags[id];
						const map = {};
						for (const [key, ids] of Object.entries(s.map)) {
							const filtered = ids.filter((t) => t !== id);
							if (filtered.length > 0) map[key] = filtered;
						}
						scheduleSync({
							tags,
							map
						});
						return {
							tags,
							map
						};
					});
				},
				setItemTags: (key, tagIds) => {
					const known = new Set(Object.keys(get().tags));
					const clean = [...new Set(tagIds)].filter((id) => known.has(id));
					set((s) => {
						const map = { ...s.map };
						if (clean.length > 0) map[key] = clean;
						else delete map[key];
						scheduleSync({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				addTagToItem: (key, tagId) => {
					if (!get().tags[tagId]) return;
					set((s) => {
						const current = s.map[key] ?? [];
						if (current.includes(tagId)) return s;
						const map = {
							...s.map,
							[key]: [...current, tagId]
						};
						scheduleSync({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				removeTagFromItem: (key, tagId) => {
					set((s) => {
						const current = s.map[key];
						if (!current || !current.includes(tagId)) return s;
						const next = current.filter((t) => t !== tagId);
						const map = { ...s.map };
						if (next.length > 0) map[key] = next;
						else delete map[key];
						scheduleSync({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				tagsOf: (key) => get().map[key] ?? [],
				hasTag: (key, tagId) => (get().map[key] ?? []).includes(tagId)
			});
			tagMapState = {
				...tagMapActions(tagMapSetState, tagMapGetState),
				tags: initial.tags,
				map: initial.map
			};
		}));
		//#endregion
		//#region ../../web-kit/formats/src/npz.ts
		var init_npz = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/somaSkin.ts
		var init_somaSkin = __esmMin((() => {
			init_src();
		}));
		//#endregion
		//#region ../../web-kit/formats/src/poseCodec.ts
		/** Encode a Uint8Array to a base64 string.
		*
		*  Processes the input in 32KB chunks because String.fromCharCode.apply has
		*  a ~65K argument limit on some engines (the historical V8 stack-arg limit).
		*  Uses Array.from() rather than the brittle `as unknown as number[]` cast. */
		function encodeBufferToB64(bytes) {
			let bin = "";
			const CHUNK = 32768;
			for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
			return btoa(bin);
		}
		var SOMA_VERTEX_COUNT, SOMA77_BONE_CONNECTIONS;
		var init_poseCodec = __esmMin((() => {
			SOMA_VERTEX_COUNT = 18056;
			SOMA77_BONE_CONNECTIONS = [
				[0, 1],
				[1, 2],
				[2, 3],
				[3, 4],
				[4, 5],
				[5, 6],
				[6, 7],
				[6, 8],
				[6, 9],
				[6, 10],
				[3, 11],
				[11, 12],
				[12, 13],
				[13, 14],
				[14, 15],
				[15, 16],
				[16, 17],
				[17, 18],
				[14, 19],
				[19, 20],
				[20, 21],
				[21, 22],
				[22, 23],
				[14, 24],
				[24, 25],
				[25, 26],
				[26, 27],
				[27, 28],
				[14, 29],
				[29, 30],
				[30, 31],
				[31, 32],
				[32, 33],
				[14, 34],
				[34, 35],
				[35, 36],
				[36, 37],
				[37, 38],
				[3, 39],
				[39, 40],
				[40, 41],
				[41, 42],
				[42, 43],
				[43, 44],
				[44, 45],
				[45, 46],
				[42, 47],
				[47, 48],
				[48, 49],
				[49, 50],
				[50, 51],
				[42, 52],
				[52, 53],
				[53, 54],
				[54, 55],
				[55, 56],
				[42, 57],
				[57, 58],
				[58, 59],
				[59, 60],
				[60, 61],
				[42, 62],
				[62, 63],
				[63, 64],
				[64, 65],
				[65, 66],
				[0, 67],
				[67, 68],
				[68, 69],
				[69, 70],
				[70, 71],
				[0, 72],
				[72, 73],
				[73, 74],
				[74, 75],
				[75, 76]
			];
		})), J;
		var init_motionNpz = __esmMin((() => {
			init_somaSkin();
			init_poseCodec();
			J = 77;
			(() => {
				const table = /* @__PURE__ */ new Uint32Array(256);
				for (let n = 0; n < 256; n++) {
					let c = n;
					for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
					table[n] = c >>> 0;
				}
				return table;
			})();
			(() => {
				const parent = new Array(J).fill(-1);
				for (const [p, c] of SOMA77_BONE_CONNECTIONS) parent[c] = p;
				const children = Array.from({ length: J }, () => []);
				for (let i = 0; i < J; i++) {
					const p = parent[i];
					if (p >= 0) children[p].push(i);
				}
				return children;
			})();
		}));
		var init_glbLoad = __esmMin((() => {
			({}).env?.BASE_URL;
		}));
		//#endregion
		//#region ../../web-kit/formats/src/glbSkin.ts
		var init_glbSkin = __esmMin((() => {
			init_glbLoad();
			init_somaSkin();
		}));
		//#endregion
		//#region ../../web-kit/formats/src/maskPrep.ts
		var init_maskPrep = __esmMin((() => {})), NEUTRAL_RACE;
		var init_bodyPresets = __esmMin((() => {
			NEUTRAL_RACE = [
				.5,
				.5,
				.5
			];
			[...NEUTRAL_RACE];
			[...NEUTRAL_RACE];
			[...NEUTRAL_RACE];
		}));
		//#endregion
		//#region ../../web-kit/formats/src/motionConstraints.ts
		var init_motionConstraints = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/openPoseCanvas.ts
		var init_openPoseCanvas = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/downloads.ts
		/**
		* Trigger a browser download from a base64-encoded payload.
		* Mirrors Kimodo demo's _download_bytes_to_browser (ui.py).
		*/
		function downloadBase64Payload(b64, filename, mimeType = "application/octet-stream") {
			let binStr;
			try {
				binStr = atob(b64);
			} catch {
				console.error("downloadBase64Payload: invalid base64 string");
				return;
			}
			const bytes = new Uint8Array(binStr.length);
			for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
			const blob = new Blob([bytes], { type: mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		}
		var init_downloads = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/b64.ts
		async function decodeB64ToBuffer(b64) {
			return (await apiFetch(externalUrl(`data:application/octet-stream;base64,${b64}`))).arrayBuffer();
		}
		var init_b64 = __esmMin((() => {
			init_api();
		})), KP;
		var init_poseTransforms = __esmMin((() => {
			init_src();
			KP = {
				NOSE: 0,
				NECK: 1,
				R_SHOULDER: 2,
				R_ELBOW: 3,
				R_WRIST: 4,
				L_SHOULDER: 5,
				L_ELBOW: 6,
				L_WRIST: 7,
				R_HIP: 8,
				R_KNEE: 9,
				R_ANKLE: 10,
				L_HIP: 11,
				L_KNEE: 12,
				L_ANKLE: 13,
				R_EYE: 14,
				L_EYE: 15,
				R_EAR: 16,
				L_EAR: 17
			};
			KP.NOSE, KP.NECK, KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST, KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST, KP.R_HIP, KP.R_KNEE, KP.R_ANKLE, KP.L_HIP, KP.L_KNEE, KP.L_ANKLE, KP.R_EYE, KP.L_EYE, KP.R_EAR, KP.L_EAR;
		}));
		//#endregion
		//#region ../../web-kit/formats/src/psdExport.ts
		var init_psdExport = __esmMin((() => {}));
		var init_pngMetaInfo = __esmMin((() => {
			new Uint8Array([
				137,
				80,
				78,
				71,
				13,
				10,
				26,
				10
			]);
			(() => {
				const t = /* @__PURE__ */ new Uint32Array(256);
				for (let i = 0; i < 256; i++) {
					let c = i;
					for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
					t[i] = c;
				}
				return t;
			})();
		}));
		var init_pngMeta = __esmMin((() => {
			new Uint8Array([
				137,
				80,
				78,
				71,
				13,
				10,
				26,
				10
			]);
			(() => {
				const t = /* @__PURE__ */ new Uint32Array(256);
				for (let n = 0; n < 256; n++) {
					let c = n;
					for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
					t[n] = c >>> 0;
				}
				return t;
			})();
		}));
		//#endregion
		//#region ../../web-kit/formats/src/captionSplitter.ts
		var init_captionSplitter = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/prompt-tags.json
		var prompt_tags_default = {
			_meta: {
				"version": 1,
				"description": "Curated prompt tag library for the editor autocomplete (E4.7). Tags are organized by category so the dropdown can group them. Each tag is a short phrase that reads naturally when appended to a prompt. The categories mirror the typical shot-authoring taxonomy: shot framing, camera movement, lighting, style, subject, mood, color grade.",
				"noteOnIaC": "This file is checked into source control so the tag library survives environment wipes — adding tags here is the only step needed to grow the library."
			},
			shot: [
				"extreme close-up",
				"close-up",
				"medium close-up",
				"medium shot",
				"medium wide shot",
				"wide shot",
				"extreme wide shot",
				"over-the-shoulder",
				"low angle",
				"high angle",
				"dutch angle",
				"aerial view",
				"birds eye view",
				"pov shot",
				"two shot"
			],
			camera: [
				"static shot",
				"locked-off",
				"dolly in",
				"dolly out",
				"tracking shot",
				"pan left",
				"pan right",
				"tilt up",
				"tilt down",
				"handheld",
				"steady cam",
				"crane shot",
				"drone shot",
				"whip pan",
				"zoom in",
				"zoom out",
				"orbital shot",
				"parallax"
			],
			lighting: [
				"golden hour",
				"blue hour",
				"magic hour",
				"soft light",
				"hard light",
				"backlit",
				"rim light",
				"volumetric light",
				"neon glow",
				"candlelight",
				"moonlight",
				"overcast",
				"high key",
				"low key",
				"chiaroscuro",
				"studio lighting",
				"natural light"
			],
			style: [
				"cinematic",
				"photorealistic",
				"hyperreal",
				"documentary",
				"film noir",
				"anime",
				"watercolor",
				"oil painting",
				"3d render",
				"vintage film",
				"8mm",
				"vhs",
				"cyberpunk",
				"vaporwave",
				"minimalist",
				"maximalist",
				"surreal",
				"dreamlike"
			],
			motion: [
				"slow motion",
				"fast motion",
				"time-lapse",
				"hyperlapse",
				"freeze frame",
				"match cut",
				"subtle motion",
				"dynamic motion",
				"fluid motion",
				"glitch transition"
			],
			mood: [
				"serene",
				"tense",
				"melancholic",
				"euphoric",
				"ominous",
				"playful",
				"mysterious",
				"romantic",
				"epic",
				"intimate",
				"lonely",
				"triumphant"
			],
			color: [
				"teal and orange",
				"desaturated",
				"high contrast",
				"warm tones",
				"cool tones",
				"monochrome",
				"sepia",
				"pastel palette",
				"vivid colors",
				"muted palette",
				"neon palette"
			],
			subject: [
				"lone figure",
				"crowd",
				"vehicle",
				"landscape",
				"interior",
				"cityscape",
				"nature",
				"abstract"
			]
		};
		//#endregion
		//#region ../../web-kit/formats/src/promptTags.ts
		/**
		* E4.7 — Prompt tag library + autocomplete helpers.
		*
		* The tag library lives in `src/data/prompt-tags.json` (checked into
		* source — the IaC piece that survives wipes). This module loads it,
		* flattens it into a searchable list, and exposes filtering helpers
		* the PromptAutocomplete component uses to render suggestions.
		*
		* Tags are short phrases (e.g. "golden hour", "dolly in", "teal and
		* orange") that read naturally when appended to a prompt. The current-
		* token extractor finds the substring being typed after the last comma
		* or semicolon, so suggestions apply to the phrase the user is mid-
		* type on, not the whole prompt.
		*/
		/**
		* Flatten the JSON tag map into a single list of { value, category }.
		* Computed once at module load (the JSON is static) and frozen so
		* callers can't mutate the canonical list.
		*/
		function flatten(json) {
			const out = [];
			for (const cat of TAG_CATEGORY_ORDER) {
				const arr = json[cat];
				if (!Array.isArray(arr)) continue;
				for (const value of arr) if (typeof value === "string" && value.length > 0) out.push({
					value,
					category: cat
				});
			}
			return out;
		}
		var TAG_CATEGORY_ORDER;
		var init_promptTags = __esmMin((() => {
			TAG_CATEGORY_ORDER = [
				"shot",
				"camera",
				"lighting",
				"style",
				"motion",
				"mood",
				"color",
				"subject"
			];
			Object.freeze(flatten(prompt_tags_default));
		}));
		//#endregion
		//#region ../../web-kit/formats/src/motionEnvelope.ts
		var init_motionEnvelope = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/extractVideoFrame.ts
		var init_extractVideoFrame = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/keyframeExtract.ts
		var init_keyframeExtract = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/handPose.ts
		var init_handPose = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/capabilityCards.ts
		var init_capabilityCards = __esmMin((() => {
			init_src();
		}));
		//#endregion
		//#region ../../web-kit/formats/src/cardMutations.ts
		var init_cardMutations = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/formZones.ts
		var init_formZones = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/specContract.ts
		var init_specContract = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/formats/src/index.ts
		var init_src$1 = __esmMin((() => {
			init_npz();
			init_somaSkin();
			init_motionNpz();
			init_glbSkin();
			init_maskPrep();
			init_bodyPresets();
			init_poseCodec();
			init_motionConstraints();
			init_openPoseCanvas();
			init_downloads();
			init_b64();
			init_poseTransforms();
			init_psdExport();
			init_pngMetaInfo();
			init_pngMeta();
			init_captionSplitter();
			init_promptTags();
			init_motionEnvelope();
			init_extractVideoFrame();
			init_keyframeExtract();
			init_handPose();
			init_capabilityCards();
			init_cardMutations();
			init_formZones();
			init_specContract();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/text-to-pose.ts
		/** Slice a single frame's vertices out of a multi-frame base64 vertex buffer.
		*
		*  Async because decoding the (potentially huge) multi-frame buffer is offloaded
		*  to the browser's native base64 decoder. Returns a base64 string containing
		*  just the one frame's float32 positions.
		*
		*  @param multiB64    base64-encoded buffer of shape (T, V, 3) float32
		*  @param frameIdx    which frame to slice (clamped to [0, T-1])
		*  @param vertexCount V — defaults to the SOMA-77 canonical count
		*  @returns base64-encoded single-frame buffer, or null on decode failure */
		async function sliceFrameAsB64(multiB64, frameIdx, vertexCount = SOMA_VERTEX_COUNT) {
			try {
				const stride = vertexCount * 3;
				const buf = await decodeB64ToBuffer(multiB64);
				const multi = new Float32Array(buf);
				const totalFrames = Math.floor(multi.length / stride);
				if (totalFrames < 1) return null;
				const idx = Math.max(0, Math.min(frameIdx, totalFrames - 1));
				const singleFlat = new Float32Array(stride);
				singleFlat.set(multi.subarray(idx * stride, (idx + 1) * stride));
				return encodeBufferToB64(new Uint8Array(singleFlat.buffer));
			} catch (e) {
				console.error("[text-to-pose] sliceFrameAsB64 failed:", e);
				return null;
			}
		}
		/**
		* Submit a text-to-pose generation request.
		* Returns immediately with a job_id — poll via pollJob() or waitForJob().
		*/
		async function submitTextToPose(req) {
			const res = await apiFetch("/poser/text-to-pose", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(req)
			});
			const text = await res.text();
			if (!res.ok) {
				let detail = text.slice(0, 300);
				try {
					detail = JSON.parse(text).error || detail;
				} catch {}
				throw new Error(`Submit failed: HTTP ${res.status} — ${detail}`);
			}
			try {
				return JSON.parse(text);
			} catch (e) {
				throw new Error(`Submit returned invalid JSON: ${text.slice(0, 200)}`);
			}
		}
		/**
		* Poll job status once. Returns the current status + result if completed.
		*/
		async function pollJob(jobId) {
			const res = await apiFetch(`/poser/text-to-pose/jobs/${jobId}`);
			if (res.status === 404) throw new Error(`Job ${jobId} not found`);
			const text = await res.text();
			if (!res.ok) throw new Error(`Poll failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
			try {
				return JSON.parse(text);
			} catch (e) {
				throw new Error(`Poll returned invalid JSON: ${text.slice(0, 200)}`);
			}
		}
		/**
		* Wait for a job to reach a terminal state (completed/failed/cancelled).
		* Polls every `intervalMs` until `timeoutMs`.
		*
		* Calls `onUpdate` on each poll if provided — useful for progress UI.
		*/
		async function waitForJob(jobId, opts = {}) {
			const interval = opts.intervalMs ?? 500;
			const timeout = opts.timeoutMs ?? 12e4;
			const deadline = Date.now() + timeout;
			while (Date.now() < deadline) {
				const status = await pollJob(jobId);
				opts.onUpdate?.(status);
				if (status.status === "completed" && status.result) return status.result;
				if (status.status === "failed") throw new Error(status.error || `Job failed (${status.error_class || "unknown"})`);
				if (status.status === "cancelled") throw new Error("Job was cancelled");
				await sleep(interval);
			}
			throw new Error(`Job ${jobId} timed out after ${timeout}ms`);
		}
		async function cancelJob(jobId) {
			const res = await apiFetch(`/poser/text-to-pose/jobs/${jobId}`, { method: "DELETE" });
			if (!res.ok && res.status !== 404) throw new Error(`Cancel failed: HTTP ${res.status}`);
		}
		/**
		* Submit a text-to-pose request and wait for the result.
		* This is the simplest call for UI components that just want the final motion.
		*/
		async function generatePose(req, opts) {
			const { job_id } = await submitTextToPose(req);
			return waitForJob(job_id, opts);
		}
		async function listPoseCache() {
			const res = await apiFetch("/poser/text-to-pose/cache");
			if (!res.ok) throw new Error(`Cache list failed: HTTP ${res.status}`);
			return res.json();
		}
		async function deletePoseCacheEntry(hash) {
			const res = await apiFetch(`/poser/text-to-pose/cache/${hash}`, { method: "DELETE" });
			if (!res.ok && res.status !== 404) throw new Error(`Cache delete failed: HTTP ${res.status}`);
		}
		async function clearPoseCache() {
			const res = await apiFetch("/poser/text-to-pose/cache/clear", { method: "POST" });
			if (!res.ok) throw new Error(`Cache clear failed: HTTP ${res.status}`);
			return (await res.json()).cleared;
		}
		async function listModels() {
			const res = await apiFetch("/poser/text-to-pose/models");
			if (!res.ok) throw new Error(`Models list failed: HTTP ${res.status}`);
			return res.json();
		}
		async function listRegistry() {
			const res = await apiFetch("/poser/text-to-pose/registry");
			if (!res.ok) throw new Error(`Registry fetch failed: HTTP ${res.status}`);
			return res.json();
		}
		async function listExamples(model) {
			const res = await apiFetch(`/poser/text-to-pose/examples${model ? `?model=${encodeURIComponent(model)}` : ""}`);
			if (!res.ok) throw new Error(`Examples list failed: HTTP ${res.status}`);
			return res.json();
		}
		async function loadExample(model, exampleId, loadGt = false) {
			const res = await apiFetch(`/poser/text-to-pose/examples/${model}/${exampleId}${loadGt ? `?load_gt=true` : ""}`);
			if (!res.ok) throw new Error(`Example load failed: HTTP ${res.status}`);
			return res.json();
		}
		async function exportBVH(framesSoma77, framesRotmat, fps) {
			const res = await apiFetch("/poser/text-to-pose/export/bvh", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					frames_soma77_3d: framesSoma77,
					frames_soma77_rotmat: framesRotmat,
					fps
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `BVH export failed: HTTP ${res.status}`);
			}
			return res.json();
		}
		/** Download a BVH file from SOMA-77 motion data. */
		async function downloadBVH(motion, standardTpose = false) {
			if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) throw new Error("Motion data missing SOMA-77 positions or rotations");
			const res = await apiFetch("/poser/text-to-pose/export/bvh", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					frames_soma77_3d: motion.frames_soma77_3d,
					frames_soma77_rotmat: motion.frames_soma77_rotmat,
					fps: motion.fps,
					standard_tpose: standardTpose
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `BVH export failed: HTTP ${res.status}`);
			}
			const { bvh } = await res.json();
			const blob = new Blob([bvh], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `pose_${motion.model}_${Date.now()}.bvh`;
			a.click();
			URL.revokeObjectURL(url);
		}
		/** Export motion as AMASS NPZ (SMPL-X compatible). */
		async function downloadAMASSNpz(motion) {
			if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) throw new Error("Motion data missing SOMA-77 positions or rotations");
			const res = await apiFetch("/poser/text-to-pose/export/amass", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					frames_soma77_3d: motion.frames_soma77_3d,
					frames_soma77_rotmat: motion.frames_soma77_rotmat,
					fps: motion.fps
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `AMASS export failed: HTTP ${res.status}`);
			}
			const { data_b64 } = await res.json();
			downloadBase64Payload(data_b64, `pose_amass_${Date.now()}.npz`, "application/octet-stream");
		}
		/** Export motion as G1 MuJoCo CSV. */
		async function downloadG1Csv(motion) {
			if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) throw new Error("Motion data missing SOMA-77 positions or rotations");
			const res = await apiFetch("/poser/text-to-pose/export/csv", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					frames_soma77_3d: motion.frames_soma77_3d,
					frames_soma77_rotmat: motion.frames_soma77_rotmat,
					fps: motion.fps
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `CSV export failed: HTTP ${res.status}`);
			}
			const { data_b64 } = await res.json();
			downloadBase64Payload(data_b64, `pose_g1_${Date.now()}.csv`, "text/csv");
		}
		/**
		* Export motion as a rigged FBX file (Mixamo-compatible joint names).
		*
		* The backend renders an FBX 7.4.0 ASCII skeleton with the full 77-joint
		* hierarchy and baked animation — importable by Blender, Maya, Unity, and
		* Unreal. Mixamo naming enables automatic retargeting onto Mixamo rigs.
		*/
		async function downloadFBX(motion, mixamo = true) {
			if (!motion.frames_soma77_3d || !motion.frames_soma77_rotmat) throw new Error("Motion data missing SOMA-77 positions or rotations");
			const res = await apiFetch("/poser/text-to-pose/export/fbx", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					frames_soma77_3d: motion.frames_soma77_3d,
					frames_soma77_rotmat: motion.frames_soma77_rotmat,
					fps: motion.fps,
					mixamo
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `FBX export failed: HTTP ${res.status}`);
			}
			const { fbx } = await res.json();
			const blob = new Blob([fbx], { type: "application/octet-stream" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `pose_${motion.model}_${Date.now()}.fbx`;
			a.click();
			URL.revokeObjectURL(url);
		}
		/**
		* Render a 2D pose video server-side via matplotlib + imageio.
		* Higher-quality and browser-independent than client-side MediaRecorder.
		*/
		async function renderServerVideo(motion, opts = {}) {
			const res = await apiFetch("/poser/text-to-pose/export/video", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					frames_flat: motion.frames_flat,
					fps: motion.fps,
					width: opts.width ?? 512,
					height: opts.height ?? 512,
					background: opts.background ?? "#0d2847"
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `Video render failed: HTTP ${res.status}`);
			}
			const { video_b64, mime } = await res.json();
			const bin = atob(video_b64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			return new Blob([bytes], { type: mime || "video/mp4" });
		}
		/** Render and download a server-side 2D pose video. */
		async function downloadServerVideo(motion, opts) {
			const blob = await renderServerVideo(motion, opts);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `pose_video_${Date.now()}.mp4`;
			a.click();
			URL.revokeObjectURL(url);
		}
		async function listConstraints() {
			const res = await apiFetch("/poser/text-to-pose/constraints");
			if (!res.ok) throw new Error(`Constraints list failed: HTTP ${res.status}`);
			return (await res.json()).entries ?? [];
		}
		async function saveConstraints(name, constraints) {
			const res = await apiFetch("/poser/text-to-pose/constraints/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					constraints
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `Save failed: HTTP ${res.status}`);
			}
		}
		async function loadConstraints(filename) {
			const res = await apiFetch(`/poser/text-to-pose/constraints/${filename}`);
			if (!res.ok) throw new Error(`Load failed: HTTP ${res.status}`);
			return (await res.json()).constraints;
		}
		async function deleteConstraints(filename) {
			const res = await apiFetch(`/poser/text-to-pose/constraints/${filename}`, { method: "DELETE" });
			if (!res.ok && res.status !== 404) throw new Error(`Delete failed: HTTP ${res.status}`);
		}
		async function listScenes() {
			const res = await apiFetch("/poser/text-to-pose/scenes");
			if (!res.ok) throw new Error(`Scenes list failed: HTTP ${res.status}`);
			return (await res.json()).entries ?? [];
		}
		async function saveScene(name, scene) {
			const res = await apiFetch("/poser/text-to-pose/scenes/save", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					scene
				})
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.error || `Save failed: HTTP ${res.status}`);
			}
		}
		async function loadScene(filename) {
			const res = await apiFetch(`/poser/text-to-pose/scenes/${filename}`);
			if (!res.ok) throw new Error(`Load failed: HTTP ${res.status}`);
			return (await res.json()).scene;
		}
		async function deleteScene(filename) {
			const res = await apiFetch(`/poser/text-to-pose/scenes/${filename}`, { method: "DELETE" });
			if (!res.ok && res.status !== 404) throw new Error(`Delete failed: HTTP ${res.status}`);
		}
		function sleep(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms));
		}
		/**
		* Pick a specific frame from a PoseMotion's flat keypoints.
		* Clamps to valid range.
		*/
		function pickFrame(motion, idx) {
			const clamped = Math.max(0, Math.min(idx, motion.frame_count - 1));
			return motion.frames_flat[clamped];
		}
		/**
		* Format cache size for display.
		*/
		function formatBytes(bytes) {
			if (bytes < 1024) return `${bytes} B`;
			if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
			return `${(bytes / 1048576).toFixed(1)} MB`;
		}
		/**
		* Fetch the 77-joint SOMA-71 rest-pose (bind-pose) positions for the
		* requested identity model. Used by Pose Studio's "Load Model" button to
		* enter Edit Mode WITHOUT generating a motion first — the user can grab
		* joints and pose the character manually.
		*
		* The endpoint accepts both GET (returns the neutral-default joints) and
		* POST (applies the supplied identity morphs first, returns joints that
		* match the shaped body). The POST path is the fully-dynamic one: Anny's
		* height/proportions sliders reshape BOTH the mesh AND the skeleton, so
		* the edit-mode wires always match the body the user sees. Without it the
		* skeleton would stay one fixed size (the static SOMA-77 reference) while
		* the mesh grew/shrank underneath it.
		*
		* Calls GET /poser/skin/bind_joints?identity_model=… when no identity spec
		* is supplied, POST /poser/skin/bind_joints with a JSON body otherwise.
		*/
		async function fetchBindJoints(identityModel = "anny", identityCoeffs, localChanges, customTargets) {
			if (!(identityCoeffs && identityCoeffs.length > 0 || localChanges && Object.keys(localChanges).length > 0 || customTargets && Object.keys(customTargets).length > 0)) {
				const res = await apiFetch(`/poser/skin/bind_joints?identity_model=${encodeURIComponent(identityModel)}`);
				if (!res.ok) {
					const txt = await res.text();
					throw new Error(`Failed to load bind joints: ${res.status} ${txt}`);
				}
				return res.json();
			}
			const body = { identity_model: identityModel };
			if (identityCoeffs && identityCoeffs.length > 0) body.identity_coeffs = identityCoeffs;
			if (localChanges && Object.keys(localChanges).length > 0) body.local_changes = localChanges;
			if (customTargets && Object.keys(customTargets).length > 0) body.custom_targets = customTargets;
			const res = await apiFetch("/poser/skin/bind_joints", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`Failed to load bind joints: ${res.status} ${txt}`);
			}
			return res.json();
		}
		/**
		* Preload (warm up) a model on the GPU so the first Generate is fast.
		*
		* NOTE: The old forge /admin/load endpoint was removed in the 3-container
		* architecture cleanup. The KimodoPoseService singleton inside ComfyUI
		* now loads lazily on first inference and stays resident, so explicit
		* preloading is unnecessary. This is kept as a no-op so the frontend's
		* "Load Model" button doesn't error.
		*/
		async function preloadForgeService(_service, _model) {
			return {
				status: "ok",
				service: _service
			};
		}
		/**
		* Re-skin the mesh for edited SOMA-77 joint positions.
		* Calls /poser/skin/deform_soma with binary response for speed.
		* Used during interactive pose editing — debounced by the caller.
		*
		* @param joints Float32Array of 77 x 3 joint positions
		* @param identityModel Which mesh to skin ("soma" | "mhr" | "anny"). Must
		*   match the mesh the viewer is rendering, otherwise the deformed vertices
		*   won't match the bind-mesh topology and the pose will look wrong.
		* @param jointsRot Optional Float32Array of 77 x 9 global rotation matrices
		*   (row-major 3x3 per joint). When provided, the backend skins directly with
		*   these exact rotations (most accurate). When omitted, the backend derives
		*   approximate rotations from bone directions.
		* @returns base64-encoded float32 deformed vertices (V x 3) for one frame
		*/
		async function deformSomaJoints(joints, identityModel = "anny", jointsRot, identityCoeffs, localChanges, customTargets, baseRotmats) {
			const frames = [];
			for (let j = 0; j < 77; j++) frames.push([
				joints[j * 3],
				joints[j * 3 + 1],
				joints[j * 3 + 2]
			]);
			const body = {
				frames_soma77_3d: [frames],
				identity_model: identityModel,
				binary: true
			};
			if (identityCoeffs && identityCoeffs.length > 0) body.identity_coeffs = identityCoeffs;
			if (localChanges && Object.keys(localChanges).length > 0) body.local_changes = localChanges;
			if (customTargets && Object.keys(customTargets).length > 0) body.custom_targets = customTargets;
			if (jointsRot && jointsRot.length === 693) body.frames_soma77_rotmat = [_packRotmats(jointsRot)];
			if (baseRotmats && baseRotmats.length === 693) body.frames_soma77_base_rotmat = [_packRotmats(baseRotmats)];
			const res = await apiFetch("/poser/skin/deform_soma", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`Re-skin failed: ${res.status} ${txt}`);
			}
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			return data.vertices_b64;
		}
		/**
		* Pack a flat (77×9,) Float32Array of row-major 3×3 rotation matrices into
		* the (77, 3, 3) nested-array shape the deform_soma endpoint expects.
		* Shared by the `frames_soma77_rotmat` and `frames_soma77_base_rotmat` fields.
		*/
		function _packRotmats(flat) {
			const rots = [];
			for (let j = 0; j < 77; j++) {
				const r = [];
				for (let row = 0; row < 3; row++) r.push([
					flat[j * 9 + row * 3],
					flat[j * 9 + row * 3 + 1],
					flat[j * 9 + row * 3 + 2]
				]);
				rots.push(r);
			}
			return rots;
		}
		var init_text_to_pose = __esmMin((() => {
			init_api();
			init_src$1();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/serviceForms.ts
		function notify() {
			for (const fn of _listeners) try {
				fn();
			} catch (e) {
				console.warn("[serviceForms] listener error:", e);
			}
		}
		async function loadForms(opts) {
			if (Object.keys(_cache).length > 0 && !opts?.force) return _cache;
			if (_inflight) return _inflight;
			_inflight = (async () => {
				try {
					const res = await apiFetch("/v1/forms");
					if (!res.ok) {
						console.warn("[serviceForms] /v1/forms failed:", res.status);
						return _cache;
					}
					_cache = (await res.json())?.forms ?? {};
					notify();
					return _cache;
				} catch (e) {
					console.warn("[serviceForms] fetch error:", e);
					return _cache;
				} finally {
					_inflight = null;
				}
			})();
			return _inflight;
		}
		function getCachedForms() {
			return _cache;
		}
		function subscribeForms(fn) {
			_listeners.add(fn);
			return () => {
				_listeners.delete(fn);
			};
		}
		/**
		* Reverse-lookup: given a sidebar_key (the value the rest of the app calls
		* `selectedService`), return the form-tag it belongs to. This is THE
		* primitive that drives every render decision in GenerateFormBody.
		*/
		function formForSidebarKey(sidebarKey, forms = _cache) {
			for (const [formTag, entry] of Object.entries(forms)) if (entry.sidebar_key === sidebarKey) return formTag;
		}
		/**
		* Check whether the given sidebar_key belongs to the given form-tag.
		* Internal — the convenience predicates below are the public API.
		*/
		function isForm(sidebarKey, formTag, forms = _cache) {
			return forms[formTag]?.sidebar_key === sidebarKey;
		}
		/** True if the sidebar_key belongs to ANY of the given form-tags. */
		function isInAnyForm(sidebarKey, formTags, forms = _cache) {
			return formTags.some((t) => isForm(sidebarKey, t, forms));
		}
		/**
		* True if the sidebar_key belongs to any audio-genre form-tag.
		* (form_tts, form_voice, form_voice_studio, form_music, form_sound)
		*/
		function isAudioForm(sidebarKey, forms = _cache) {
			return isInAnyForm(sidebarKey, [
				"form_tts",
				"form_voice",
				"form_voice_studio",
				"form_music",
				"form_sound"
			], forms);
		}
		/**
		* The ordered sidebar rows from a forms payload (§16 C-RAIL: /v1/forms is
		* rail-derived and carries `order`). Grouped by genre, sorted by
		* (order ?? Infinity, label) within the group — the entry's plugin-
		* declared order is the law; entries without one (legacy payloads) sort
		* last, label-alphabetical. Pure: the sidebar + tests share ONE item
		* builder, no drift between render and pin.
		*/
		function formSidebarItems(forms) {
			const out = {};
			for (const d of Object.values(forms)) {
				const genre = d.genre;
				const key = d.sidebar_key;
				if (!genre || !key) continue;
				const order = typeof d.order === "number" ? d.order : Infinity;
				(out[genre] ??= []).push({
					name: key,
					label: d.label || key,
					genre,
					order
				});
			}
			for (const items of Object.values(out)) items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
			return out;
		}
		var _cache, _inflight, _listeners, isTtsForm, isVoiceForm, isVoiceStudioForm, isMusicForm, isGenerateForm, isEditForm;
		var init_serviceForms = __esmMin((() => {
			init_api();
			_cache = {};
			_inflight = null;
			_listeners = /* @__PURE__ */ new Set();
			isTtsForm = (k) => isForm(k, "form_tts");
			isVoiceForm = (k) => isForm(k, "form_voice");
			isVoiceStudioForm = (k) => isForm(k, "form_voice_studio");
			isMusicForm = (k) => isForm(k, "form_music");
			isGenerateForm = (k) => isForm(k, "form_generate");
			isEditForm = (k) => isForm(k, "form_edit");
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/waveform-peaks.ts
		/** Compute min/max peaks for a single channel of PCM data.
		*  Exported for unit testing. */
		function computeMinMaxPeaks(data, numBuckets) {
			if (numBuckets <= 0 || data.length === 0) return [];
			const out = new Array(numBuckets);
			const blockSize = data.length / numBuckets;
			for (let i = 0; i < numBuckets; i++) {
				const start = Math.floor(i * blockSize);
				const end = Math.min(data.length, Math.floor((i + 1) * blockSize));
				let min = 0;
				let max = 0;
				for (let j = start; j < end; j++) {
					const v = data[j];
					if (v < min) min = v;
					if (v > max) max = v;
				}
				out[i] = {
					min,
					max
				};
			}
			return out;
		}
		/** Build all three LODs from raw PCM data. */
		function computeWaveformLODs(data) {
			return {
				low: computeMinMaxPeaks(data, LOD_BUCKETS.low),
				med: computeMinMaxPeaks(data, LOD_BUCKETS.med),
				high: computeMinMaxPeaks(data, LOD_BUCKETS.high)
			};
		}
		/** Pick the LOD whose bucket count best matches the available pixels.
		*  When pixelsAvailable is small, low; when huge, high. The threshold
		*  is the midpoint (geometric mean) between adjacent LODs. */
		function selectLOD(pixelsAvailable) {
			if (pixelsAvailable <= 0) return "low";
			if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.low * LOD_BUCKETS.med)) return "low";
			if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.med * LOD_BUCKETS.high)) return "med";
			return "high";
		}
		/** Resample a min/max peak array to a target output width by picking
		*  contiguous source buckets per output pixel (or aggregating when
		*  upscaling is needed). Returns a new array of length `targetWidth`. */
		function resampleForWidth(peaks, targetWidth) {
			if (targetWidth <= 0) return [];
			if (peaks.length === 0) return new Array(targetWidth).fill({
				min: 0,
				max: 0
			});
			const out = new Array(targetWidth);
			if (peaks.length >= targetWidth) {
				const ratio = peaks.length / targetWidth;
				for (let i = 0; i < targetWidth; i++) {
					const start = Math.floor(i * ratio);
					const end = Math.min(peaks.length, Math.floor((i + 1) * ratio));
					let min = 0;
					let max = 0;
					for (let j = start; j < end; j++) {
						if (peaks[j].min < min) min = peaks[j].min;
						if (peaks[j].max > max) max = peaks[j].max;
					}
					out[i] = {
						min,
						max
					};
				}
			} else for (let i = 0; i < targetWidth; i++) {
				const srcIdx = Math.min(peaks.length - 1, Math.floor(i * peaks.length / targetWidth));
				out[i] = peaks[srcIdx];
			}
			return out;
		}
		/** Convenience: pick the right LOD + resample to exactly `width` pixels. */
		function getPeaksForWidth(cache, width) {
			return resampleForWidth(cache[selectLOD(width)], width);
		}
		/** Decode an audio URL into legacy + LOD waveform peaks.
		*
		*  Returns null on any failure (fetch error, decode error, etc.).
		*  The caller should treat null as "use the sine-wave placeholder". */
		async function decodeAudioPeaks(url) {
			let ctx = null;
			try {
				ctx = new AudioContext();
				const buf = await (await fetch(url)).arrayBuffer();
				const audio = await ctx.decodeAudioData(buf);
				const raw = audio.getChannelData(0);
				const samplesPerPeak = Math.max(1, Math.floor(raw.length / 80));
				const legacyPeaks = [];
				for (let i = 0; i < 80; i++) {
					let max = 0;
					for (let j = 0; j < samplesPerPeak; j++) {
						const val = Math.abs(raw[i * samplesPerPeak + j] || 0);
						if (val > max) max = val;
					}
					legacyPeaks.push(max);
				}
				const lod = computeWaveformLODs(raw);
				return {
					duration: audio.duration,
					legacyPeaks,
					lod
				};
			} catch {
				return null;
			} finally {
				if (ctx) ctx.close();
			}
		}
		var LOD_BUCKETS, LOD_ORDER;
		var init_waveform_peaks = __esmMin((() => {
			LOD_BUCKETS = {
				low: 100,
				med: 500,
				high: 2e3
			};
			LOD_ORDER = [
				"low",
				"med",
				"high"
			];
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/comfyEvents.ts
		/**
		* Open a ComfyUI websocket and forward parsed events to `onEvent`.
		* `onStatus` fires with `true`/`false` on connect/disconnect.
		*/
		function connectComfyEvents(url, onEvent, onStatus) {
			if (typeof WebSocket === "undefined") return {
				connected: false,
				close() {}
			};
			let ws = null;
			let closed = false;
			let retry = null;
			let connected = false;
			const scheduleRetry = () => {
				if (closed) return;
				if (retry) clearTimeout(retry);
				retry = setTimeout(open, RETRY_MS);
			};
			function open() {
				/* v8 ignore next -- defensive: close() always clears the pending retry timer, so open() can never run after close (2026-09-12) */
				if (closed) return;
				try {
					ws = new WebSocket(url);
				} catch (err) {
					console.warn("[comfy-events] websocket open failed:", err);
					scheduleRetry();
					return;
				}
				ws.onopen = () => {
					connected = true;
					onStatus?.(true);
				};
				ws.onclose = () => {
					connected = false;
					onStatus?.(false);
					scheduleRetry();
				};
				ws.onerror = () => {
					try {
						ws?.close();
					} catch {}
				};
				ws.onmessage = (ev) => {
					if (typeof ev.data !== "string") return;
					try {
						const msg = JSON.parse(ev.data);
						onEvent({
							type: msg.type ?? "raw",
							data: msg.data ?? {},
							raw: ev.data
						});
					} catch {
						onEvent({
							type: "raw",
							data: {},
							raw: ev.data
						});
					}
				};
			}
			open();
			return {
				get connected() {
					return connected;
				},
				close() {
					closed = true;
					if (retry) clearTimeout(retry);
					try {
						ws?.close();
					} catch {}
				}
			};
		}
		var RETRY_MS;
		var init_comfyEvents = __esmMin((() => {
			RETRY_MS = 3e3;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/enhance.ts
		/**
		* The card's model picker source (2026-09-06): the LIVE route list
		* off the proof route — never a restated copy. Null when this
		* editor is NOT under a DSH host (no picker renders).
		*/
		async function fetchEnhanceRoutes() {
			let res;
			try {
				res = await apiFetch(externalUrl("/melite-tools/catalog"), { method: "GET" });
			} catch {
				return null;
			}
			if (!res.ok) return null;
			try {
				const data = await res.json();
				if (!Array.isArray(data.llmRoutes)) return null;
				const routes = data.llmRoutes.filter((r) => typeof r === "string" && r.length > 0);
				return routes.length > 0 ? routes : null;
			} catch {
				return null;
			}
		}
		/** Normalize a display/model name for matching: lowercase, keep
		* alphanumerics and dots ("GLM 4.7" / "glm-4.7" → "glm4.7"). */
		function normName(s) {
			return s.toLowerCase().replace(/[^a-z0-9.]/g, "");
		}
		/** Is this editor embedded under the DSH GUI (same-origin parent)?
		* Standalone → false (no picker exists; the host default serves). */
		function isEmbedded() {
			try {
				return window.parent !== window;
			} catch {
				return false;
			}
		}
		/**
		* Parse the picker trigger's aria-label (the LIVE-PROBED contract,
		* 2026-09-06: `Select model, current <NAME>, reasoning effort <E>`).
		* Returns the model display name, or null when the label doesn't
		* carry a current selection.
		*/
		function parsePickerAria(label) {
			const m = /select model,\s*current\s+(.+?)(?:,\s*reasoning|$)/i.exec(label);
			if (!m) return null;
			const name = m[1].trim();
			return name.length > 0 ? name : null;
		}
		/**
		* Read the GUI picker's CURRENT selection from the parent page
		* (2026-09-06, operator order: the button auto-follows the model I
		* have selected). The card iframe is same-origin with the DSH GUI.
		* Anchor (live-probed on the deployed build): the trigger button's
		* aria-label "Select model, current <NAME>, reasoning effort …" —
		* an accessible contract, not a CSS-module hash (the `*modelName*`
		* class probe found ZERO elements on the real page). Fallback: the
		* trigger's `*triggerLabel*` span text. Standalone/cross-origin →
		* null (host default serves).
		*/
		function readPickerModel() {
			try {
				const parent = window.parent;
				if (!parent || parent === window) return null;
				const doc = parent.document;
				if (!doc) return null;
				for (const btn of Array.from(doc.querySelectorAll("button[aria-label]"))) {
					const name = parsePickerAria(btn.getAttribute("aria-label") ?? "");
					if (name) return name;
				}
				const labels = Array.from(doc.querySelectorAll("[class*=\"triggerLabel\"]")).filter((el) => (el.textContent ?? "").trim().length > 0 && el.getClientRects().length > 0);
				const last = labels[labels.length - 1];
				return last ? last.textContent.trim() : null;
			} catch {
				return null;
			}
		}
		/**
		* Map the picker's display name onto one LIVE route
		* ("provider/model"). Exact normalized model equality first, then a
		* unique prefix ("Muse Spark" → muse-spark-1.3-contributor).
		* Ambiguous or unmatched → null (never a guess).
		*/
		function resolvePickerRoute(routes, pick) {
			const want = normName(pick);
			if (want.length === 0) return null;
			const models = routes.map((r) => {
				const i = r.indexOf("/");
				return {
					route: r,
					model: normName(i >= 0 ? r.slice(i + 1) : r)
				};
			});
			const exact = models.filter((m) => m.model === want);
			if (exact.length === 1) return exact[0].route;
			if (exact.length > 1) return null;
			const prefix = models.filter((m) => m.model.startsWith(want));
			if (prefix.length === 1) return prefix[0].route;
			return null;
		}
		/**
		* THE DeepSeek-harness door (2026-08-22): POST /melite-tools/enhance on the DSH
		* host — same origin from the chat embed — completes the enhancement with the
		* harness's OWN model (ctx.llm). NO keystore key involved, so inside the GUI
		* the Enhance button can never answer "no model". Returns null when this
		* editor is NOT running under the DSH host (standalone dev :5173 — the
		* route isn't there; Vite SPA-fallbacks answer HTML), letting the caller use
		* the keystore flow.
		*/
		async function enhanceViaHarness(systemPrompt, prompt, llm) {
			let res;
			try {
				res = await apiFetch(externalUrl("/melite-tools/enhance"), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						system_prompt: systemPrompt,
						prompt,
						...llm !== void 0 && llm.length > 0 ? { llm } : {}
					})
				});
			} catch {
				return null;
			}
			const text = await res.text();
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				return null;
			}
			if (typeof data.error === "string" && data.error.length > 0) throw new Error(`Enhancement failed (${res.status}): ${data.error.slice(0, 200)}`);
			if (!res.ok) return null;
			const positive = String(data.positive ?? "").trim();
			const negative = String(data.negative ?? "").trim();
			if (!positive) return null;
			return {
				positive,
				negative,
				via: typeof data.via === "string" && data.via.length > 0 ? data.via : "?"
			};
		}
		async function enhancePrompt(systemPrompt, prompt, llm) {
			const harnessed = await enhanceViaHarness(systemPrompt, prompt, llm);
			if (harnessed !== null) return harnessed;
			throw new Error("Prompt enhance runs inside the DeepSeek app (/melite-tools/enhance not answered here)");
		}
		/**
		* AGENT ENHANCE (2026-08-22) — the ✦ Agent Enhance button's wire.
		* POST /melite-tools/enhance {model, prompt} on the DSH host: the agent
		* system's orchestration core sweeps EVERY declared enhance field of the
		* model (each with its own recipe) over the harness model in one press and
		* returns results keyed by field name. NO keystore key involved. Requires
		* the DSH app — standalone editors get an honest error.
		*/
		async function agentEnhance(model, prompt, temperature, llm) {
			const res = await apiFetch(externalUrl("/melite-tools/enhance"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model,
					prompt,
					...temperature !== void 0 ? { temperature } : {},
					...llm !== void 0 && llm.length > 0 ? { llm } : {}
				})
			});
			if (!res.ok) {
				const body = await res.text();
				let msg = body.slice(0, 200);
				try {
					const parsed = JSON.parse(body);
					if (typeof parsed.error === "string") msg = parsed.error;
				} catch {
					msg = "Agent Enhance runs inside the DeepSeek app — use Enhance here.";
				}
				throw new Error(`Agent Enhance failed (${res.status}): ${msg}`);
			}
			const data = await res.json();
			const results = {};
			for (const [field, v] of Object.entries(data.results ?? {})) results[field] = {
				positive: String(v?.positive ?? "").trim(),
				negative: String(v?.negative ?? "").trim(),
				via: typeof v?.via === "string" && v.via.length > 0 ? v.via : "?"
			};
			return results;
		}
		var init_enhance = __esmMin((() => {
			init_api();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/familyProvenance.ts
		/** Fold runs into per-family provenance. Only status "done" runs count —
		*  running / interrupted / stopped runs haven't produced anything yet.
		*  Runs with no families field (pre-provenance sidecars) or a family-less
		*  brick contribute nothing (backward compatible by construction). */
		function familyProvenance(runs) {
			const out = {};
			for (const run of runs) {
				if (run.status !== "done") continue;
				const fams = run.families ?? [];
				if (fams.length === 0) continue;
				const at = typeof run.created_at === "number" ? run.created_at * 1e3 : 0;
				const seen = /* @__PURE__ */ new Set();
				for (const f of fams) {
					if (!f || seen.has(f)) continue;
					seen.add(f);
					const cur = out[f];
					if (cur) {
						cur.count += 1;
						if (at > cur.lastRunAt) cur.lastRunAt = at;
					} else out[f] = {
						count: 1,
						lastRunAt: at
					};
				}
			}
			return out;
		}
		/** Compact relative time for the tile title — "just now", "5m ago",
		*  "3h ago", "2d ago", then a short date. Pure; no i18n in scope. */
		function formatLastRun(at) {
			if (!at) return "never";
			const diff = Date.now() - at;
			if (diff < 6e4) return "just now";
			if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
			if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
			if (diff < 6048e5) return `${Math.floor(diff / 864e5)}d ago`;
			return new Date(at).toLocaleDateString();
		}
		var init_familyProvenance = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/uploadToEstate.ts
		function readUploadFile(file) {
			return readAsDataURL(file).catch(() => {
				throw new Error(`The browser could not read "${file.name}" at its source (the drag handed over a file the browser can't open — this happens when the file was moved/deleted, or the drag came from a recent-files list or another app). Drag it from its actual folder, or CLICK the square and browse — the picker path reads through the OS dialog and works.`);
			});
		}
		/** The rail: File → POST /v1/uploads → the estate path. */
		async function uploadToEstate(file) {
			if (!IMAGE_TYPES.has(file.type)) throw new UploadRefusedError(`${file.name}: only png / jpeg / webp upload (got ${file.type || "unknown type"})`);
			const data = await readUploadFile(file);
			let resp;
			try {
				resp = await fetch("/v1/uploads", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						filename: file.name,
						data
					})
				});
			} catch (e) {
				throw new Error(`Upload failed (network): ${e.message}`);
			}
			const text = await resp.text();
			let body = {};
			try {
				body = JSON.parse(text);
			} catch {}
			if (!resp.ok || !body.path) throw new Error(body.error ?? `Upload failed (HTTP ${resp.status})`);
			return body.path;
		}
		/**
		* estateInputUrl — slot value → a URL an <img> can load (2026-09-06,
		* operator order: "We need to have an image preview when the card is
		* drilled out for ANNY and IMAGE->3d").
		*
		* The uploads rail returns repo-relative `data/input/<name>` paths —
		* composable at every door, but no browser tag can load them, so a
		* drilled-out card showed NO preview of its own source photo after
		* reload (the fresh object-URL preview is session-local). The input
		* preview door (GET /v1/assets/inputs/<name>) serves those bytes
		* back; this maps the param to that URL.
		*
		* Already-servable shapes pass through untouched (data:/blob:/
		* http(s) URLs, and the estate's own /assets, /api, /v1/assets
		* prefixes — the same vocabulary the assembly viewer uses); anything
		* else (mount paths like /mnt/...) is NOT previewable → null (the
		* caller renders the explicit non-preview state, never a doomed
		* <img>).
		*/
		function estateInputUrl(value) {
			if (/^(data:|blob:|https?:)/i.test(value) || /^\/(assets|api|v1\/assets)\//.test(value)) return value;
			const m = /^data\/input\/([A-Za-z0-9_-]+\.(?:png|jpe?g|webp))$/i.exec(value);
			return m ? `/v1/assets/inputs/${m[1]}` : null;
		}
		var IMAGE_TYPES, UploadRefusedError;
		var init_uploadToEstate = __esmMin((() => {
			init_readFile();
			IMAGE_TYPES = /* @__PURE__ */ new Set([
				"image/png",
				"image/jpeg",
				"image/webp"
			]);
			UploadRefusedError = class extends Error {};
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/index.ts
		var src_exports = /* @__PURE__ */ __exportAll({
			CatalogContractError: () => CatalogContractError,
			LOD_BUCKETS: () => LOD_BUCKETS,
			LOD_ORDER: () => LOD_ORDER,
			RUN_STATUSES: () => RUN_STATUSES,
			RunStatusContractError: () => RunStatusContractError,
			TAG_COLOR_META: () => TAG_COLOR_META,
			TAG_COLOR_VALUES: () => TAG_COLOR_VALUES,
			TagColor: () => TagColor,
			UploadRefusedError: () => UploadRefusedError,
			activeVariantForRoute: () => activeVariantForRoute,
			agentEnhance: () => agentEnhance,
			apiFetch: () => apiFetch,
			apiJson: () => apiJson,
			assertNoParamDrops: () => assertNoParamDrops,
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema,
			axisCellExists: () => axisCellExists,
			canWireSlot: () => canWireSlot,
			cancelJob: () => cancelJob,
			canvasDefaultModel: () => canvasDefaultModel,
			cardSlotsFor: () => cardSlotsFor,
			clearPoseCache: () => clearPoseCache,
			coerceParamsToSchema: () => coerceParamsToSchema,
			collectNamedArtifacts: () => collectNamedArtifacts,
			collectStageUrls: () => collectStageUrls,
			composeCard: () => composeCard,
			composeVariantRoute: () => composeVariantRoute,
			computeMinMaxPeaks: () => computeMinMaxPeaks,
			computeWaveformLODs: () => computeWaveformLODs,
			connectComfyEvents: () => connectComfyEvents,
			controlnetTypesOf: () => controlnetTypesOf,
			decodeAudioPeaks: () => decodeAudioPeaks,
			deformSomaJoints: () => deformSomaJoints,
			deleteConstraints: () => deleteConstraints,
			deletePoseCacheEntry: () => deletePoseCacheEntry,
			deleteScene: () => deleteScene,
			describeErrorBody: () => describeErrorBody,
			downloadAMASSNpz: () => downloadAMASSNpz,
			downloadBVH: () => downloadBVH,
			downloadFBX: () => downloadFBX,
			downloadG1Csv: () => downloadG1Csv,
			downloadServerVideo: () => downloadServerVideo,
			dropdownModels: () => dropdownModels,
			enhancePrompt: () => enhancePrompt,
			ensureCatalog: () => ensureCatalog,
			ensureDraftId: () => ensureDraftId,
			estateInputUrl: () => estateInputUrl,
			exportBVH: () => exportBVH,
			externalUrl: () => externalUrl,
			familiesForForm: () => familiesForForm,
			familyAccepts: () => familyAccepts,
			familyCardSummary: () => familyCardSummary,
			familyConditioning: () => familyConditioning,
			familyGenre: () => familyGenre,
			familyHasVariantAxis: () => familyHasVariantAxis,
			familyLabel: () => familyLabel,
			familyOf: () => familyOf,
			familyOptionalOutputs: () => familyOptionalOutputs,
			familyPrimaryRoute: () => familyPrimaryRoute,
			familyProvenance: () => familyProvenance,
			familyTransformMatrix: () => familyTransformMatrix,
			fetchBindJoints: () => fetchBindJoints,
			fetchEnhanceRoutes: () => fetchEnhanceRoutes,
			firstInputSlot: () => firstInputSlot,
			formAliasesFor: () => formAliasesFor,
			formForSidebarKey: () => formForSidebarKey,
			formOf: () => formOf,
			formSidebarItems: () => formSidebarItems,
			formSlotsFor: () => formSlotsFor,
			formatBytes: () => formatBytes,
			formatLastRun: () => formatLastRun,
			generatePose: () => generatePose,
			genreToKind: () => genreToKind,
			getBackendState: () => getBackendState,
			getCachedCatalog: () => getCachedCatalog,
			getCachedForms: () => getCachedForms,
			getFamilySchema: () => getFamilySchema,
			getPeaksForWidth: () => getPeaksForWidth,
			hasInputSlots: () => hasInputSlots,
			hasViolationsSignature: () => hasViolationsSignature,
			hiddenFromDropdown: () => hiddenFromDropdown,
			initTagSync: () => initTagSync,
			inputSlots: () => inputSlots,
			isAudioForm: () => isAudioForm,
			isCatalogLoaded: () => isCatalogLoaded,
			isEditForm: () => isEditForm,
			isEmbedded: () => isEmbedded,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated,
			isGenerateForm: () => isGenerateForm,
			isMusicForm: () => isMusicForm,
			isTagColor: () => isTagColor,
			isTtsForm: () => isTtsForm,
			isUndeclaredWireSlot: () => isUndeclaredWireSlot,
			isVoiceForm: () => isVoiceForm,
			isVoiceStudioForm: () => isVoiceStudioForm,
			kindsCompatible: () => kindsCompatible,
			listConstraints: () => listConstraints,
			listExamples: () => listExamples,
			listModels: () => listModels,
			listPoseCache: () => listPoseCache,
			listRegistry: () => listRegistry,
			listScenes: () => listScenes,
			loadCatalog: () => loadCatalog,
			loadConstraints: () => loadConstraints,
			loadExample: () => loadExample,
			loadFamilySchemas: () => loadFamilySchemas,
			loadForms: () => loadForms,
			loadScene: () => loadScene,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			modelSlotsFor: () => modelSlotsFor,
			narrowGenre: () => narrowGenre,
			normalizeSlotParams: () => normalizeSlotParams,
			onBackendState: () => onBackendState,
			onCatalogReady: () => onCatalogReady,
			padInputs: () => padInputs,
			parsePickerAria: () => parsePickerAria,
			pickFrame: () => pickFrame,
			pollFlowRun: () => pollFlowRun,
			pollJob: () => pollJob,
			preloadForgeService: () => preloadForgeService,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			promptGuide: () => promptGuide,
			readPickerModel: () => readPickerModel,
			renderServerVideo: () => renderServerVideo,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
			routeCoordinates: () => routeCoordinates,
			runCompiledGeneration: () => runCompiledGeneration,
			sanitizeRevivedResult: () => sanitizeRevivedResult,
			saveConstraints: () => saveConstraints,
			saveScene: () => saveScene,
			selectLOD: () => selectLOD,
			setInputVocabulary: () => setInputVocabulary,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver,
			sliceFrameAsB64: () => sliceFrameAsB64,
			slotKind: () => slotKind,
			stageSlots: () => stageSlots,
			streamFlowEvents: () => streamFlowEvents,
			studioOf: () => studioOf,
			submitTextToPose: () => submitTextToPose,
			subscribeForms: () => subscribeForms,
			tagsOf: () => tagsOf,
			uploadToEstate: () => uploadToEstate,
			urlToDataUrl: () => urlToDataUrl,
			useCatalogContractStore: () => useCatalogContractStore,
			useRunStatusContractStore: () => useRunStatusContractStore,
			useTagMap: () => useTagMap,
			validateCatalogContract: () => validateCatalogContract,
			validateModifierEntries: () => validateModifierEntries,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema,
			validateRunStatusContract: () => validateRunStatusContract,
			variantLabel: () => variantLabel,
			variantSiblings: () => variantSiblings,
			variantsForRoute: () => variantsForRoute,
			waitForJob: () => waitForJob
		});
		var init_src = __esmMin((() => {
			init_api();
			init_catalogContract();
			init_catalogContractStore();
			init_inputSlots();
			init_modelCatalog();
			init_FlowProtocol();
			init_FlowEvents();
			init_familyParamContract();
			init_tagMap();
			init_runStatusContractStore();
			init_runStatusContract();
			init_text_to_pose();
			init_serviceForms();
			init_waveform_peaks();
			init_comfyEvents();
			init_cardBirth();
			init_enhance();
			init_familyProvenance();
			init_uploadToEstate();
		}));
		//#endregion
		//#region src/ui/studio/useEnhance.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Per-prompt H3-style enhancement (tenant §7). Verbatim lines 2044–2086. */
		function useEnhance() {
			const [enhancing, setEnhancing] = (0, react.useState)({});
			const [enhanceErr, setEnhanceErr] = (0, react.useState)({});
			const [enhanceUndo, setEnhanceUndo] = (0, react.useState)({});
			const setEnhancingKey = (k, v) => setEnhancing((m) => ({
				...m,
				[k]: v
			}));
			/** ✨ Enhance ONE prompt (call text or beat segment) into H3 style.
			* Zero-setup path first (the DSH harness model), keystore LLM second —
			* same enhancePrompt the host's ✨ buttons use. Never silent: errors
			* render inline; the previous text is kept for one-click undo. */
			const enhanceOne = async (key, text, apply) => {
				const cur = text.trim();
				if (!cur || enhancing[key]) return;
				setEnhancingKey(key, true);
				setEnhanceErr((m) => ({
					...m,
					[key]: null
				}));
				try {
					const { enhancePrompt } = await Promise.resolve().then(() => (init_src(), src_exports));
					const result = await enhancePrompt(H3_ENHANCE_SYSTEM, cur);
					if (!result?.positive) throw new Error("empty enhancement result");
					setEnhanceUndo((m) => ({
						...m,
						[key]: text
					}));
					apply(result.positive);
				} catch (e) {
					setEnhanceErr((m) => ({
						...m,
						[key]: e instanceof Error ? e.message.slice(0, 160) : String(e).slice(0, 160)
					}));
				} finally {
					setEnhancingKey(key, false);
				}
			};
			/** ↩ Undo — restores the pre-enhancement text for one row. */
			const undoEnhance = (key, apply) => {
				const prev = enhanceUndo[key];
				if (prev === void 0) return;
				apply(prev);
				setEnhanceUndo((m) => {
					const { [key]: _drop, ...rest } = m;
					return rest;
				});
			};
			return {
				enhancing,
				enhanceErr,
				enhanceUndo,
				enhanceOne,
				undoEnhance
			};
		}
		//#endregion
		//#region src/ui/studio/useCallMutations.ts
		/** Call-structure setters: extend/add/guide/span/knobs (tenant §8).
		*  Verbatim lines 2088–2260. */
		function useCallMutations(setCalls, fps) {
			/** Pull-the-tail: the bar grew the envelope — the last call's end
			* follows (exclusive count straight from the bar's onExtend). */
			const handleExtend = (newTotal) => {
				setCalls((prev) => {
					if (!prev.length) return prev;
					const last = prev.length - 1;
					const cur = prev[last];
					if (newTotal <= cur.end_frame) return prev;
					const next = [...prev];
					next[last] = {
						...cur,
						end_frame: Math.round(newTotal)
					};
					return next;
				});
			};
			/** Add call — TIMELINE-NATIVE (2026-08-16: "We don't need the add-call
			*  button. We can use the timeline to do this"): double-click the ruler
			*  or the calls row's empty area at a frame → split the call containing
			*  that frame there (both halves ≥1 frame), or append a fresh 2 s call
			*  when the frame sits on a boundary / past the end. The new call starts
			*  EMPTY: a call with no prompt is a TODO the plan names before any GPU
			*  work — never silent junk prompt. */
			const addCallAt = (frame) => {
				setCalls((prev) => {
					const i = prev.findIndex((c) => frame > c.start_frame && frame < c.end_frame);
					if (i >= 0) {
						const cur = prev[i];
						const next = [...prev];
						next[i] = {
							...cur,
							end_frame: frame
						};
						next.splice(i + 1, 0, {
							text: "",
							start_frame: frame,
							end_frame: cur.end_frame
						});
						return next;
					}
					const T = prev.length ? prev[prev.length - 1].end_frame : 0;
					return [...prev.map((c) => ({ ...c })), {
						text: "",
						start_frame: T,
						end_frame: T + Math.max(1, Math.round(fps * 2))
					}];
				});
			};
			/** Wire a call's guide source (the guide kinds + the last-frame
			* subcard — the closing still rides the identical blank-never rule).
			* Empty = none (the planner's contract: blank guide keys never
			* materialize — clearing the input detaches the guide; there is no
			* "wired-but-unwired" TODO state for calls, sources are typed, not
			* dropped-then-wired like lane keyframes). */
			const setCallGuide = (i, kind, source) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if ((kind === "last_frame" ? prev[i].last_frame ?? "" : prev[i][kind] ?? "") === source) return prev;
					const next = [...prev];
					const call = { ...prev[i] };
					if (kind === "last_frame") {
						if (source.trim()) call.last_frame = source;
						else delete call.last_frame;
					} else if (source.trim()) call[kind] = source;
					else delete call[kind];
					next[i] = call;
					return next;
				});
			};
			/** Toggle the call's prev-video opener (the compiler's rule 3b): the
			* last X seconds of the PREVIOUS window's rendered video carry the
			* call's opening motion. null deletes the key (absent = no opener —
			* the run's continuity toggle decides); the seconds input writes the
			* raw value VERBATIM (the compiler snaps it to the guide-clip packing
			* rule and refuses impossible tails — never a client-side silent
			* snap). Enabling defaults to 2 s. */
			/** Seam mode per call: 'extend' = seamless latent chain (prev-sec reads
			* as SECONDS OF LATENT carried from the previous window's tail via the
			* motion-context node); 'cut' = fresh window + prev-video opener clip. */
			const setCallTransition = (i, t) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = { ...prev[i] };
					if (call.transition === t) return prev;
					call.transition = t;
					if (call.first_frame_prev_sec != null) call.first_frame_prev_sec = t === "extend" ? 3 : 2;
					const next = [...prev];
					next[i] = call;
					return next;
				});
			};
			const setCallPrevSec = (i, sec) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = { ...prev[i] };
					if (sec == null || !Number.isFinite(sec) || sec <= 0) {
						if (call.first_frame_prev_sec === void 0) return prev;
						delete call.first_frame_prev_sec;
					} else {
						if (call.first_frame_prev_sec === sec) return prev;
						call.first_frame_prev_sec = sec;
					}
					const next = [...prev];
					next[i] = call;
					return next;
				});
			};
			/** Edit a call's identity refs (Ref2VA route): REPLACE the run-level
			* refs for THIS call's windows. Empty string = the key drops from the
			* serialized call (inherit the Layer A refs). */
			const setCallRefs = (i, key, value) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if ((prev[i].refs?.[key] ?? "") === value) return prev;
					const call = { ...prev[i] };
					const refs = { ...call.refs ?? {} };
					if (value.trim()) refs[key] = value.trim();
					else delete refs[key];
					if (Object.keys(refs).length) call.refs = refs;
					else delete call.refs;
					const next = [...prev];
					next[i] = call;
					return next;
				});
			};
			/** Edit a call's span from the card's number inputs. The cut ripples
			* into the neighbor (start → the previous call's end; end → the next
			* call's start; the LAST call's end grows/shrinks the envelope). */
			const setCallSpan = (i, which, frame) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					const next = [...prev];
					if (which === "start") {
						const min = i === 0 ? 0 : prev[i - 1].start_frame + 1;
						const f = Math.min(Math.max(frame, min), cur.end_frame - 1);
						if (f === cur.start_frame) return prev;
						next[i] = {
							...cur,
							start_frame: f
						};
						if (i > 0) next[i - 1] = {
							...next[i - 1],
							end_frame: f
						};
					} else {
						const f = Math.max(frame, cur.start_frame + 1);
						if (f === cur.end_frame) return prev;
						next[i] = {
							...cur,
							end_frame: f
						};
						if (i < prev.length - 1) next[i + 1] = {
							...next[i + 1],
							start_frame: f
						};
					}
					return next;
				});
			};
			/** Set (or clear — undefined) one per-call knob override. Clearing the
			* last knob removes the whole `knobs` dict: absent = inherit. */
			const setCallKnob = (i, key, value) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = { ...prev[i] };
					const knobs = { ...call.knobs ?? {} };
					if (value === void 0) delete knobs[key];
					else knobs[key] = value;
					if (Object.keys(knobs).length === 0) delete call.knobs;
					else call.knobs = { ...knobs };
					const next = [...prev];
					next[i] = call;
					return next;
				});
			};
			return {
				handleExtend,
				addCallAt,
				setCallGuide,
				setCallTransition,
				setCallPrevSec,
				setCallRefs,
				setCallSpan,
				setCallKnob
			};
		}
		//#endregion
		//#region src/ui/studio/useBeatMutations.ts
		/** Layer C segments + legacy keyframes (tenant §9). Verbatim lines 2262–2436
		*  and 2438–2472. */
		function useBeatMutations(calls, setCalls, setSelected, keyframes, setKeyframes) {
			/** Double-click the beats row at a frame → ADD a beat there (the row
			* is the entry point — 2026-08-16: "it looks blank and unaddable";
			* the buried rail "+" was the ONLY path). The CALL whose span owns
			* the frame is the authoring call: text-mode → its text heads
			* [start, F) and a new empty beat starts AT F (degenerate frames
			* promote only — never a 0-frame segment); segment-mode → the
			* segment covering F splits at F (its text stays in the head half);
			* a frame in a GAP or past the last segment appends an empty beat to
			* the next bound. New beats stay INSIDE their call — crossing is a
			* deliberate span edit (setBeatSegment), never an add. The new beat
			* AUTO-SELECTS (the sidebar shifts straight into its editor). */
			const handleBeatAdd = (frame) => {
				const i = calls.findIndex((c) => c.start_frame <= frame && frame < c.end_frame);
				if (i < 0) return;
				const call = calls[i];
				const segs = call.beats ? [...call.beats] : [];
				const next = [...calls];
				if (segs.length === 0) {
					const head = {
						text: call.text ?? "",
						start_frame: call.start_frame,
						end_frame: call.end_frame
					};
					if (frame > call.start_frame && frame < call.end_frame) {
						next[i] = {
							...call,
							text: void 0,
							beats: [{
								...head,
								end_frame: frame
							}, {
								text: "",
								start_frame: frame,
								end_frame: call.end_frame
							}]
						};
						setCalls(next);
						setSelected({
							callIdx: i,
							beatIdx: 1
						});
					} else {
						next[i] = {
							...call,
							text: void 0,
							beats: [head]
						};
						setCalls(next);
						setSelected({
							callIdx: i,
							beatIdx: 0
						});
					}
					return;
				}
				const k = segs.findIndex((s) => s.start_frame < frame && frame < s.end_frame);
				if (k >= 0) {
					const s = segs[k];
					next[i] = {
						...call,
						beats: [
							...segs.slice(0, k),
							{
								...s,
								end_frame: frame
							},
							{
								text: "",
								start_frame: frame,
								end_frame: s.end_frame
							},
							...segs.slice(k + 1)
						]
					};
					setCalls(next);
					setSelected({
						callIdx: i,
						beatIdx: k + 1
					});
					return;
				}
				const bound = segs.find((s) => s.start_frame >= frame)?.start_frame ?? call.end_frame;
				if (frame < bound) {
					next[i] = {
						...call,
						beats: [...segs, {
							text: "",
							start_frame: frame,
							end_frame: bound
						}]
					};
					setCalls(next);
					setSelected({
						callIdx: i,
						beatIdx: segs.length
					});
				}
			};
			/** Add a segment to call i. First click on a text-mode call promotes
			* its text into segment 0 (lossless — a lone full-span segment
			* serializes back to `text`; an EMPTY call promotes to one empty
			* segment — the amber TODO — the + is never a no-op). Later clicks:
			* room after the last segment → the new segment fills the gap (start
			* = last end, end = the call's end); no room → the last segment's
			* tail half splits into the new empty one (any ≥2-frame segment can
			* halve; a 1-frame segment is already minimal → no-op). The segments
			* never overlap a sibling; the free edges may cross a boundary
			* (setBeatSegment). */
			const addBeatSegment = (i) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = prev[i];
					const segs = call.beats ? [...call.beats] : [];
					const next = [...prev];
					if (segs.length === 0) {
						const promo = [{
							text: call.text ?? "",
							start_frame: call.start_frame,
							end_frame: call.end_frame
						}];
						next[i] = {
							...call,
							text: void 0,
							beats: promo
						};
						return next;
					}
					const last = segs[segs.length - 1];
					if (last.end_frame < call.end_frame) {
						next[i] = {
							...call,
							beats: [...segs, {
								text: "",
								start_frame: last.end_frame,
								end_frame: call.end_frame
							}]
						};
						return next;
					}
					const split = Math.min(last.end_frame - 1, last.start_frame + Math.max(1, Math.floor((last.end_frame - last.start_frame) / 2)));
					if (split <= last.start_frame) return prev;
					next[i] = {
						...call,
						beats: [
							...segs.slice(0, -1),
							{
								...last,
								end_frame: split
							},
							{
								text: "",
								start_frame: split,
								end_frame: last.end_frame
							}
						]
					};
					return next;
				});
			};
			/** Edit one segment (text or span). Spans follow the compiler's rules
			* (2026-08-16 crossing): a segment keeps ≥1 frame inside its OWN call
			* (ownership) and may CROSS a call boundary at its free edges — the
			* FIRST segment's start, the LAST segment's end. The user authors one
			* unbroken bar; the compiler slices it at the window cut with
			* re-based markers (never a manual slice). Never leaves the timeline,
			* never overlaps a sibling. */
			const setBeatSegment = (i, j, patch) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = prev[i];
					const segs = call.beats ?? [];
					if (j < 0 || j >= segs.length) return prev;
					const seg = segs[j];
					const nextSeg = {
						...seg,
						...patch
					};
					const timelineEnd = prev[prev.length - 1].end_frame;
					if (patch.start_frame !== void 0) {
						const min = j === 0 ? 0 : segs[j - 1].end_frame;
						nextSeg.start_frame = Math.min(Math.max(nextSeg.start_frame, min), seg.end_frame - 1);
						if (j === 0) nextSeg.start_frame = Math.min(nextSeg.start_frame, call.end_frame - 1);
					}
					if (patch.end_frame !== void 0) {
						const max = j === segs.length - 1 ? timelineEnd : segs[j + 1].start_frame;
						nextSeg.end_frame = Math.max(nextSeg.end_frame, seg.start_frame + 1);
						if (nextSeg.end_frame > max) nextSeg.end_frame = max;
						if (j === segs.length - 1) nextSeg.end_frame = Math.max(nextSeg.end_frame, call.start_frame + 1);
					}
					if (nextSeg.text === seg.text && nextSeg.start_frame === seg.start_frame && nextSeg.end_frame === seg.end_frame) return prev;
					const newSegs = segs.map((s, k) => k === j ? nextSeg : s);
					const next = [...prev];
					next[i] = {
						...call,
						beats: newSegs
					};
					return next;
				});
			};
			/** Delete one segment. Deleting the last one returns the call to text
			* mode (empty — the visible-TODO state, never a silent prompt). */
			const deleteBeatSegment = (i, j) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = prev[i];
					const segs = call.beats ?? [];
					if (j < 0 || j >= segs.length) return prev;
					const newSegs = segs.filter((_, k) => k !== j);
					const next = [...prev];
					next[i] = {
						...call,
						beats: newSegs.length ? newSegs : void 0,
						text: newSegs.length ? void 0 : call.text ?? ""
					};
					return next;
				});
			};
			const handleKeyframeAdd = (trackId, frame) => {
				const kind = KIND_OF_TRACK[trackId] ?? "image";
				const id = `kf-${keyframes.length}`;
				setKeyframes((prev) => [...prev, {
					frame,
					kind,
					source: ""
				}]);
				return id;
			};
			const handleKeyframeMove = (id, frame) => {
				const i = kfIndexOf(id);
				setKeyframes((prev) => {
					if (i < 0 || i >= prev.length || prev[i].frame === frame) return prev;
					const next = [...prev];
					next[i] = {
						...prev[i],
						frame
					};
					return next;
				});
			};
			const handleKeyframeDelete = (id) => {
				const i = kfIndexOf(id);
				setKeyframes((prev) => i < 0 || i >= prev.length ? prev : prev.filter((_, j) => j !== i));
			};
			const setKeyframeSource = (i, source) => {
				setKeyframes((prev) => {
					if (i < 0 || i >= prev.length || prev[i].source === source) return prev;
					const next = [...prev];
					next[i] = {
						...prev[i],
						source
					};
					return next;
				});
			};
			return {
				handleBeatAdd,
				addBeatSegment,
				setBeatSegment,
				deleteBeatSegment,
				handleKeyframeAdd,
				handleKeyframeMove,
				handleKeyframeDelete,
				setKeyframeSource
			};
		}
		//#endregion
		//#region src/ui/studio/useDerivedView.ts
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** Upstream vocabulary, filmstrip, bar-space memos (tenant §10).
		*  Verbatim lines 2474–2628. */
		function useDerivedView(args) {
			const { upstreams, stage, calls, layerA, keyframes, filmMap, filmFromDoc, selected, fps, totalFrames } = args;
			const sourceOptions = (0, react.useMemo)(() => {
				const opts = [];
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const name of Object.keys(arts)) opts.push({
						title: u.title,
						name
					});
				}
				return opts;
			}, [upstreams]);
			const linkGroups = (0, react.useMemo)(() => {
				const out = [];
				for (const u of upstreams ?? []) {
					const arts = u.result?.artifacts;
					if (!arts) continue;
					for (const [name, url] of Object.entries(arts)) if (typeof url === "string" && url && isImageUrl(url)) out.push({
						name,
						url,
						title: u.title
					});
				}
				return out;
			}, [upstreams]);
			const filmstrip = (0, react.useMemo)(() => {
				const res = stage.result;
				const arts = res?.artifacts ?? {};
				const urls = Array.isArray(res?.assetUrls) ? res.assetUrls : [];
				const windows = Object.keys(arts).filter((n) => /^video_w\d+_/.test(n) && !n.endsWith("_last_frame") && !n.includes("_seam") && !n.includes("_prev")).filter((n) => typeof arts[n] === "string" && arts[n] !== "").sort((a, b) => {
					return Number(/_w(\d+)_/.exec(a)?.[1] ?? 0) - Number(/_w(\d+)_/.exec(b)?.[1] ?? 0);
				}).map((name) => ({
					name,
					url: arts[name]
				}));
				if (urls.length > 1) {
					const have = new Set(windows.map((w) => w.url));
					for (let i = 1; i < urls.length; i++) {
						const u = urls[i];
						if (!u || have.has(u)) continue;
						have.add(u);
						const m = /window(\d+)_video/.exec(u);
						windows.push({
							name: m ? `video_w${m[1]}_main` : u.split("/").pop() ?? `clip-${i}`,
							url: u
						});
					}
				}
				return {
					windows,
					final: arts.video ?? urls[0] ?? null
				};
			}, [stage.result]);
			const prompts = (0, react.useMemo)(() => callsToPrompts(calls, layerA.fps || 24), [calls, layerA.fps]);
			const lanes = (0, react.useMemo)(() => keyframesToLanes(keyframes), [keyframes]);
			/** The film's OWN duration off the player (master-axis fallback): a
			*  run whose metadata carries no probed map still sizes the bar from
			*  the rendered film, never from the plan frames. */
			const [filmDurSec, setFilmDurSec] = (0, react.useState)(0);
			return {
				sourceOptions,
				linkGroups,
				filmstrip,
				prompts,
				lanes,
				filmDurSec,
				setFilmDurSec,
				barTotal: filmMap?.totalFrames ?? (filmDurSec > 0 ? Math.round(filmDurSec * (filmMap?.fps ?? fps ?? 24)) : totalFrames),
				barPrompts: (0, react.useMemo)(() => filmMap ? prompts.map((p) => ({
					...p,
					start_frame: filmFromDoc(p.start_frame),
					end_frame: filmFromDoc(p.end_frame)
				})) : prompts, [
					prompts,
					filmMap,
					filmFromDoc
				]),
				barLanes: (0, react.useMemo)(() => filmMap ? lanes.map((k) => ({
					...k,
					frame: filmFromDoc(k.frame)
				})) : lanes, [
					lanes,
					filmMap,
					filmFromDoc
				]),
				barBeats: (0, react.useMemo)(() => calls.flatMap((c, i) => (c.beats ?? []).map((s, j) => ({
					id: `beat-${i}-${j}`,
					callId: `call-${i}`,
					text: s.text,
					start_frame: filmFromDoc(s.start_frame),
					end_frame: filmFromDoc(s.end_frame - 1),
					color: PROMPT_COLORS[i % PROMPT_COLORS.length]
				}))), [calls, filmFromDoc]),
				barAudioClips: (0, react.useMemo)(() => (layerA.audio_clips ?? []).map((c) => {
					const g0 = filmFromDoc(c.start_frame);
					const g1 = filmFromDoc(c.start_frame + c.dur_frames);
					return {
						id: c.id,
						name: c.name,
						start_frame: g0,
						dur_frames: Math.max(1, g1 - g0),
						gain: c.gain
					};
				}), [layerA.audio_clips, filmFromDoc]),
				callPreviews: (0, react.useMemo)(() => Object.fromEntries(filmstrip.windows.slice(0, calls.length).map((w, i) => [`call-${i}`, w.url])), [filmstrip.windows, calls.length]),
				selectedBarId: selected ? selected.beatIdx != null ? `beat-${selected.callIdx}-${selected.beatIdx}` : `call-${selected.callIdx}` : null
			};
		}
		//#endregion
		//#region src/ui/studio/component.tsx
		function VideoTimelineStudio({ stage, running, onSave, upstreams }) {
			const doc = useDocState(stage);
			const { calls, keyframes, layerA } = doc;
			const view = useViewSelection(calls, layerA);
			const { selected, fps, totalFrames } = view;
			const film = useFilmSync({
				fps,
				totalFrames,
				keyframes,
				calls,
				setFrameIdx: view.setFrameIdx
			});
			const { seconds, unwired, emptyText, guideCount, knobOverrides } = film;
			const fx = useDocEffects({
				totalFrames,
				setFrameIdx: view.setFrameIdx,
				selected,
				setSelected: view.setSelected,
				calls,
				keyframes,
				layerA,
				setLayerA: doc.setLayerA,
				onSave,
				callCardRefs: view.callCardRefs,
				beatRowRefs: view.beatRowRefs,
				lastCallsRef: doc.lastCallsRef,
				lastKeyframesRef: doc.lastKeyframesRef,
				lastLayerARef: doc.lastLayerARef
			});
			const audio = useFilmAudio({
				stage,
				upstreams,
				layerA,
				setLayerA: doc.setLayerA,
				setLayerAKey: fx.setLayerAKey,
				fps,
				frameIdx: view.frameIdx,
				filmPlaying: film.filmPlaying,
				filmFpsRef: film.filmFpsRef
			});
			const pr = usePromptMutations(doc.setCalls);
			const enh = useEnhance();
			const mut = useCallMutations(doc.setCalls, fps);
			const beat = useBeatMutations(calls, doc.setCalls, view.setSelected, keyframes, doc.setKeyframes);
			const derived = useDerivedView({
				upstreams,
				stage,
				calls,
				layerA,
				keyframes,
				filmMap: audio.filmMap,
				filmFromDoc: audio.filmFromDoc,
				selected,
				fps,
				totalFrames
			});
			const handleDuration = (sec) => derived.setFilmDurSec(sec);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioShell, {
				className: cn(studio_module_css_default.studioRoot),
				params: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.railCol,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.docBlock,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.docLines,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										"data-testid": "tl-doc-readout",
										className: studio_module_css_default.tabular,
										children: [
											calls.length,
											" call",
											calls.length === 1 ? "" : "s",
											" · ",
											seconds,
											"s ·",
											" ",
											guideCount,
											" guide",
											guideCount === 1 ? "" : "s",
											knobOverrides > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
												" · ",
												knobOverrides,
												" call",
												knobOverrides === 1 ? "" : "s",
												" with knobs"
											] })
										]
									}),
									emptyText > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: studio_module_css_default.warnRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TriangleAlert, { className: cn(studio_module_css_default.warnIcon, studio_module_css_default.sz12) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
											emptyText,
											" call",
											emptyText === 1 ? " needs" : "s need",
											" a prompt — the plan refuses empty prompts before any GPU work."
										] })]
									}),
									unwired > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: studio_module_css_default.warnRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TriangleAlert, { className: cn(studio_module_css_default.warnIcon, studio_module_css_default.sz12) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
											unwired,
											" keyframe source",
											unwired === 1 ? "" : "s",
											" unwired — wire them below or the run door names them as TODOs."
										] })]
									})
								]
							})
						}),
						selected == null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCardsPanel, {
							calls,
							selected,
							setSelected: view.setSelected,
							fps,
							sourceOptions: derived.sourceOptions,
							keyframes,
							handleKeyframeMove: beat.handleKeyframeMove,
							handleKeyframeDelete: beat.handleKeyframeDelete,
							setKeyframeSource: beat.setKeyframeSource,
							deps: {
								selected,
								fps,
								callCardRefs: view.callCardRefs,
								beatRowRefs: view.beatRowRefs,
								artifactIndex: audio.artifactIndex,
								linkGroups: derived.linkGroups,
								isRef2va: doc.isRef2va,
								refArtifacts: audio.refArtifacts,
								handlePromptDelete: pr.handlePromptDelete,
								handlePromptUpdate: pr.handlePromptUpdate,
								setBeatSegment: beat.setBeatSegment,
								addBeatSegment: beat.addBeatSegment,
								deleteBeatSegment: beat.deleteBeatSegment,
								enhanceOne: enh.enhanceOne,
								undoEnhance: enh.undoEnhance,
								enhancing: enh.enhancing,
								enhanceErr: enh.enhanceErr,
								enhanceUndo: enh.enhanceUndo,
								setCallSpan: mut.setCallSpan,
								setCallGuide: mut.setCallGuide,
								setCallPrevSec: mut.setCallPrevSec,
								setCallTransition: mut.setCallTransition,
								setCallRefs: mut.setCallRefs,
								setCallKnob: mut.setCallKnob
							}
						}),
						selected == null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							"data-testid": "tl-run-panel",
							className: studio_module_css_default.runFold,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
								className: studio_module_css_default.runSummary,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, {
										className: cn(studio_module_css_default.sz12, studio_module_css_default.chev),
										"aria-hidden": true
									}),
									"Run parameters",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: studio_module_css_default.runSummaryNote,
										children: "Layer A — global · calls inherit"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.runBody,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunRecipeEngine, {
										stage,
										layerA,
										setLayerAKey: fx.setLayerAKey,
										isRef2va: doc.isRef2va
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunAdvancedPanels, {
										layerA,
										setLayerAKey: fx.setLayerAKey
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunRefsClips, {
										layerA,
										setLayerAKey: fx.setLayerAKey,
										isRef2va: doc.isRef2va,
										refArtifacts: audio.refArtifacts,
										takeAudioFile: audio.takeAudioFile,
										audioUploadRef: audio.audioUploadRef
									})
								]
							})]
						}),
						selected != null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCardsPanel, {
							calls,
							selected,
							setSelected: view.setSelected,
							fps,
							sourceOptions: derived.sourceOptions,
							keyframes,
							handleKeyframeMove: beat.handleKeyframeMove,
							handleKeyframeDelete: beat.handleKeyframeDelete,
							setKeyframeSource: beat.setKeyframeSource,
							deps: {
								selected,
								fps,
								callCardRefs: view.callCardRefs,
								beatRowRefs: view.beatRowRefs,
								artifactIndex: audio.artifactIndex,
								linkGroups: derived.linkGroups,
								isRef2va: doc.isRef2va,
								refArtifacts: audio.refArtifacts,
								handlePromptDelete: pr.handlePromptDelete,
								handlePromptUpdate: pr.handlePromptUpdate,
								setBeatSegment: beat.setBeatSegment,
								addBeatSegment: beat.addBeatSegment,
								deleteBeatSegment: beat.deleteBeatSegment,
								enhanceOne: enh.enhanceOne,
								undoEnhance: enh.undoEnhance,
								enhancing: enh.enhancing,
								enhanceErr: enh.enhanceErr,
								enhanceUndo: enh.enhanceUndo,
								setCallSpan: mut.setCallSpan,
								setCallGuide: mut.setCallGuide,
								setCallPrevSec: mut.setCallPrevSec,
								setCallTransition: mut.setCallTransition,
								setCallRefs: mut.setCallRefs,
								setCallKnob: mut.setCallKnob
							}
						})
					]
				}),
				preview: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioPreview, {
					stage,
					running,
					filmstrip: derived.filmstrip,
					filmRef: film.filmRef,
					filmMap: audio.filmMap,
					frameIdx: view.frameIdx,
					barTotal: derived.barTotal,
					fps,
					handleFilmTime: film.handleFilmTime,
					handlePlayingChange: film.handlePlayingChange,
					onDuration: handleDuration
				}),
				bottom: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioStripPane, {
					calls,
					totalFrames,
					fps,
					seconds,
					barPrompts: derived.barPrompts,
					barLanes: derived.barLanes,
					barBeats: derived.barBeats,
					barAudioClips: derived.barAudioClips,
					barTotal: derived.barTotal,
					frameIdx: view.frameIdx,
					callPreviews: derived.callPreviews,
					selectedBarId: derived.selectedBarId,
					filmMap: audio.filmMap,
					handleBarFrame: film.handleBarFrame,
					handleScrubStart: film.handleScrubStart,
					handleScrubEnd: film.handleScrubEnd,
					handleKeyframeAdd: beat.handleKeyframeAdd,
					handleKeyframeMove: beat.handleKeyframeMove,
					handleKeyframeDelete: beat.handleKeyframeDelete,
					handlePromptUpdate: pr.handlePromptUpdate,
					handlePromptMove: pr.handlePromptMove,
					handlePromptResize: pr.handlePromptResize,
					handlePromptDelete: pr.handlePromptDelete,
					handleExtend: mut.handleExtend,
					handleBeatAdd: beat.handleBeatAdd,
					addCallAt: mut.addCallAt,
					handleTimelineSelect: view.handleTimelineSelect,
					layerA,
					addAudioClip: audio.addAudioClip,
					takeAudioFile: audio.takeAudioFile,
					moveAudioClip: audio.moveAudioClip,
					deleteAudioClip: audio.deleteAudioClip,
					setLayerAKey: fx.setLayerAKey,
					artifactIndex: audio.artifactIndex,
					docFromFilm: audio.docFromFilm,
					keyframes
				})
			});
		}
		defineShellDeclaration({
			preview: { kind: "native" },
			bottom: { kind: "timeline" },
			params: { slots: [] }
		});
		//#endregion
		//#region src/client/index.ts
		/**
		* h3-timeline client entry — the card package's OWN cards.stage.view
		* surface (2026-09-12, the composition-root correction: a card's
		* studio registers from ITS package, never from the bench host —
		* adding a card never touches the host, the DSH plugin contract).
		*
		* THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM and
		* whatever renders its authoring surface is INJECTED): the h3-timeline
		* card's authoring surface is this package's own studio —
		* src/ui/studio/component.tsx (VideoTimelineStudio, the 26-file
		* three-layer NLE tenant the family serves as studio.tenant
		* "video/h3-timeline"). This module is the ADAPTER that mounts it on
		* the bench slot — never a second definition site: props translate
		* 1:1 onto the tenant contract {stage, running, onSave, upstreams?};
		* the document rides stage.params; writes ride onSave → onPatch
		* (patchStageParams' partial merge — the E4 write channel, observed ⊆
		* the family's declared writes); the run rides the host drill's own
		* Run row.
		*/
		/** The bench row → the tenant's CardStage. id/title/kind ride verbatim;
		* service names the family (the served claim's join key); params IS the
		* document (useDocState hydrates from it); result's artifact name→url
		* map feeds the refs pickers + the filmstrip (useFilmAudio's artifact
		* index: own run first, upstreams win collisions). */
		function toCardStage(props) {
			const row = props.row;
			const params = typeof row["params"] === "object" && row["params"] !== null ? row["params"] : {};
			const result = typeof row["result"] === "object" && row["result"] !== null ? row["result"] : {};
			const gallery = Array.isArray(result["gallery"]) ? result["gallery"] : [];
			const url = typeof result["url"] === "string" ? result["url"] : "";
			const arts = typeof result["artifacts"] === "object" && result["artifacts"] !== null ? result["artifacts"] : {};
			const assetUrls = Array.isArray(result["assetUrls"]) ? result["assetUrls"].filter((u) => typeof u === "string") : [];
			const metadata = typeof result["metadata"] === "object" && result["metadata"] !== null ? result["metadata"] : {};
			const artifacts = {};
			for (const [name, val] of Object.entries(arts)) if (typeof val === "string" && val !== "") artifacts[name] = val;
			if (artifacts["video"] === void 0 && assetUrls.length > 0) artifacts["video"] = assetUrls[0];
			for (const g of gallery) {
				const name = typeof g["name"] === "string" ? g["name"] : "";
				const gurl = typeof g["url"] === "string" ? g["url"] : "";
				if (name !== "" && gurl !== "") artifacts[name] = gurl;
			}
			if (url !== "") artifacts["video"] = url;
			const card = typeof row["card"] === "string" ? row["card"] : "";
			return {
				id: props.stageId,
				title: typeof row["title"] === "string" && row["title"] !== "" ? row["title"] : card !== "" ? card : props.stageId,
				kind: card !== "" ? card : "video",
				service: card !== "" ? card : "h3-timeline",
				genre: "video",
				params,
				inputs: [],
				inputIndices: [],
				result: {
					artifacts,
					assetUrls,
					metadata
				},
				status: props.runStatus === "done" ? "done" : props.runStatus === "failed" ? "error" : props.runStatus === "running" || props.runStatus === "queued" ? "running" : "ready"
			};
		}
		/** Upstream rows → read-only CardStages (the pickers' artifact index;
		* the wire picker's prior-stages filter — never a write channel). */
		function toUpstreams(props) {
			const upstream = props.upstream;
			if (upstream === void 0 || upstream.length === 0) return [];
			return upstream.map((u) => ({
				id: u.id,
				title: u.title,
				kind: "image",
				service: "",
				genre: "image",
				params: {},
				inputs: [],
				inputIndices: [],
				status: "done",
				result: {
					artifacts: { [u.title]: u.url },
					assetUrls: [u.url],
					metadata: {}
				}
			}));
		}
		/** The registration (the ui-tool law): the card package registers its
		* own shipped studio's view under its card key. */
		/** The built-in registration (the ui-tool law, verbatim — the
		* module namespace IS the plugin: the loader consumes name/inject/apply). */
		const name = "h3TimelineStudio";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("cards.stage.view", () => ctx.slots.register({
				name: "cards.stage.view",
				key: "h3-timeline"
			}, H3TimelineStudio));
		}
		/** The timeline surface — registered under key 'h3-timeline'. The
		* ADAPTER: the tenant mounted verbatim, one translate layer, zero
		* paraphrase. */
		function H3TimelineStudio(props) {
			const stage = toCardStage(props);
			return (0, react.createElement)("div", {
				"data-testid": "h3-studio-tenant",
				style: {
					height: "100%",
					minHeight: 0
				}
			}, (0, react.createElement)(VideoTimelineStudio, {
				stage,
				running: props.runStatus === "running",
				onSave: props.onPatch,
				upstreams: toUpstreams(props)
			}));
		}
		//#endregion
		exports.H3TimelineStudio = H3TimelineStudio;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
