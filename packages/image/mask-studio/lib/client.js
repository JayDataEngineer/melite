window.__ModuleLoader__.load({
	id: "@melite/image-mask-studio",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __defProp = Object.defineProperty;
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
		//#endregion
		let react = require("react");
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
		function X({ className, style, ...rest }) {
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
		function User({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "12",
					cy: "7",
					r: "4"
				})]
			});
		}
		function Link2({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 17H7A5 5 0 0 1 7 7h2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 7h2a5 5 0 1 1 0 10h-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 12h8" })
				]
			});
		}
		function Plus({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5v14" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 12h14" })]
			});
		}
		function Move({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5 9-3 3 3 3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9 5 3-3 3 3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m15 19-3 3-3-3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m19 9 3 3-3 3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 12h20" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 2v20" })
				]
			});
		}
		function Loader2({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })
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
		function Brush({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" })]
			});
		}
		function Eraser({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 21H7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5 11 9 9" })
				]
			});
		}
		function ScanFace({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 14s1.5 2 4 2 4-2 4-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 9h.01" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 9h.01" })
				]
			});
		}
		function Focus({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "3"
					})
				]
			});
		}
		function Expand({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m15 15 6 6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 15v6h-6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9 9-6-6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3 9V3h6" })
				]
			});
		}
		function BoxSelect({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 3H3v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 3H7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3h-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 3h-2v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 9v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 21h-2v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 21h-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 21H7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 21v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 15v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 9V7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 3h2" })
				]
			});
		}
		function Hourglass({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 22h14" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 2h14" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" })
				]
			});
		}
		function ImageUp({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						width: "18",
						height: "18",
						x: "3",
						y: "3",
						rx: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "9",
						r: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m14 17 2-2 2 2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 15v4" })
				]
			});
		}
		function Hand({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" })
				]
			});
		}
		function Square({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					width: "18",
					height: "18",
					x: "3",
					y: "3",
					rx: "2"
				})
			});
		}
		function Eye({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "12",
					cy: "12",
					r: "3"
				})]
			});
		}
		function Play({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 3 14 9-14 9V3z" })
			});
		}
		/** Mask's trash lid variant (straight handle bar). */
		function Trash2Alt({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 6h18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 11v6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 11v6" })
				]
			});
		}
		/** Mask's wand sparkle variant. */
		function WandSparkles({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.94 15.5a2 2 0 0 0-1.44-1.44L2 12l6.5-2.06a2 2 0 0 0 1.44-1.44L12 2l2.06 6.5a2 2 0 0 0 1.44 1.44L22 12l-6.5 2.06a2 2 0 0 0-1.44 1.44L12 22l-2.06-6.5z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 3v4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 5h-4" })
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
		/** Plain classnames joiner (no conflicting utilities to merge —
		*  plain join is exact). */
		function cx(...parts) {
			return parts.filter(Boolean).join(" ");
		}
		//#endregion
		//#region \0dsh-css:card-base/src/shell.module.css.mjs
		const css$2 = "._4etGFq_shell{grid-template-rows:minmax(0,1fr) auto;grid-template-columns:minmax(280px,330px) minmax(0,1fr);height:100%;min-height:0;display:grid}._4etGFq_shell>:first-child{grid-area:1/1}._4etGFq_shell>:nth-child(2){grid-area:1/2;min-height:0;overflow-y:auto}._4etGFq_shell>:nth-child(3){grid-area:2/1/auto/-1;min-height:168px;max-height:min(42%,380px);overflow-y:auto}._4etGFq_errorLine{flex-direction:column;grid-column:1/-1;gap:4px;display:flex}._4etGFq_errorRow{border:1px solid color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 10%, transparent);color:var(--dsw-alias-danger,#dc2626);overflow-wrap:break-word;white-space:pre-wrap;border-radius:4px;margin:0;padding:6px 8px;font-family:ui-monospace,monospace;font-size:9px;line-height:1.4}._4etGFq_errorIcon{vertical-align:-2px;width:12px;height:12px;margin-right:4px;display:inline}._4etGFq_railSection{border:1px solid var(--dsw-alias-border,#e2e4e9);border-radius:8px;padding:8px 12px}._4etGFq_railHead{justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;display:flex}._4etGFq_railTitle{text-transform:uppercase;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary,#8a93a0);margin:0;font-size:10px;font-weight:600}";
		const tagId$2 = "@melite/image-mask-studio/shell.module.css@8f875633";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-mask-studio";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
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
		//#region src/ui/studio/attach.ts
		const ASSET_DRAG_MIME$1 = "application/tech-noir-asset";
		/** THE "is this a thumbnail" rule for slot-shaped values — data: image
		* URLs, and http(s)/root-relative server asset URLs (the real artifact
		* shape: /v1/assets/runs/{rid}/{rel}). */
		function isImageUrl$1(value) {
			return /^data:image\//i.test(value) || /^blob:/i.test(value) || /^(?:https?:)?\/[^"'<>]*\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#]|$)/i.test(value);
		}
		/** Read a File / Blob and resolve its data: URL. THE one read path for
		* every slot-shaped attach (SlotGrid, InputCardEditor). */
		function readAsDataURL$1(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("read failed"));
				reader.readAsDataURL(file);
			});
		}
		//#endregion
		//#region \0dsh-css:/home/user/Documents/programs/active/inference.cpp/packages/image/mask-studio/src/ui/studio/mask.module.css.mjs
		const css$1 = "._1WysPG_sz10{flex:none;width:10px;height:10px}._1WysPG_sz12{flex:none;width:12px;height:12px}._1WysPG_sz14{flex:none;width:14px;height:14px}._1WysPG_sz16{flex:none;width:16px;height:16px}._1WysPG_sz28{flex:none;width:28px;height:28px}._1WysPG_violetInk{color:#a78bfa}._1WysPG_accentInk{color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_spin{animation:1s linear infinite _1WysPG_ms-spin}@keyframes _1WysPG_ms-spin{to{transform:rotate(360deg)}}._1WysPG_pulse{animation:2s cubic-bezier(.4,0,.6,1) infinite _1WysPG_ms-pulse}@keyframes _1WysPG_ms-pulse{0%,to{opacity:1}50%{opacity:.5}}._1WysPG_dockBtn{cursor:pointer;background:0 0;border:1px solid #0000;border-radius:6px;justify-content:center;align-items:center;width:28px;height:28px;padding:0;transition:color .15s,background-color .15s;display:flex}._1WysPG_dockBtnIdle{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 55%, transparent)}._1WysPG_dockBtnIdle:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 55%, transparent);color:var(--dsw-alias-label-primary,#0f1115)}._1WysPG_dockBtnActive{background:var(--dsw-alias-accent,#3b82f6);color:#fff}._1WysPG_dockBtnDisabled{cursor:not-allowed;opacity:.35}._1WysPG_toolDock{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 40%, transparent);border-radius:6px;flex-direction:column;flex:none;align-items:center;gap:2px;width:36px;padding:6px 0;display:flex}._1WysPG_dockDivider{background:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 14%, transparent);width:20px;height:1px;margin:2px 0}._1WysPG_canvasCol{flex-direction:column;flex:1;min-width:0;display:flex}._1WysPG_optionsBar{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 40%, transparent);border-radius:6px;flex:none;align-items:center;gap:12px;height:32px;padding:0 12px;display:flex}._1WysPG_sizeLabel{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);align-items:center;gap:6px;font-size:10px;display:flex}._1WysPG_capsLabel{text-transform:uppercase;letter-spacing:.05em}._1WysPG_rectHint{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);font-size:10px}._1WysPG_spacer{flex:1}._1WysPG_zoomRow{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);align-items:center;gap:4px;font-size:10px;display:flex}._1WysPG_zoomBtn{color:inherit;cursor:pointer;background:0 0;border:0;border-radius:4px;padding:2px 4px;font-size:10px;transition:background-color .15s}._1WysPG_zoomBtn:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 10%, transparent)}._1WysPG_zoomPct{text-align:center;font-variant-numeric:tabular-nums;width:32px}._1WysPG_zoomReset{cursor:pointer;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);background:0 0;border:0;border-radius:4px;padding:2px 4px;font-size:10px;transition:color .15s,background-color .15s}._1WysPG_zoomReset:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 10%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_clearBtn{cursor:pointer;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);background:0 0;border:0;border-radius:4px;align-items:center;gap:4px;padding:2px 6px;font-size:10px;font-weight:500;transition:color .15s,background-color .15s;display:flex}._1WysPG_clearBtn:hover{color:#f87171;background:#ef44441a}._1WysPG_brushSizeField{width:64px}._1WysPG_wiredBadge{cursor:pointer;z-index:10;color:var(--dsw-alias-accent,#3b82f6);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 80%, transparent);backdrop-filter:blur(4px);border:0;border-radius:4px;align-items:center;gap:4px;padding:4px 8px;font-size:10px;font-weight:500;display:flex}._1WysPG_wiredBadge:hover{background:var(--dsw-alias-bg-module-platform,#f5f6f7)}._1WysPG_instanceBadge{z-index:10;cursor:pointer;border:0;border-radius:4px;justify-content:center;align-items:center;min-width:18px;height:18px;padding:0 4px;font-size:10px;font-weight:700;transition:background-color .15s,color .15s;display:flex;position:absolute}._1WysPG_instanceOn{color:#000;background:#fbbf24}._1WysPG_instanceOff{color:#fde68acc;background:#0009}._1WysPG_instanceOff:hover{background:#000c}._1WysPG_prepPanel{z-index:10;background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 92%, transparent);backdrop-filter:blur(4px);border:1px solid #22d3ee66;border-radius:8px;width:240px;padding:10px;box-shadow:0 10px 15px -3px #0006}._1WysPG_prepHead{justify-content:space-between;align-items:center;margin-bottom:6px;display:flex}._1WysPG_prepTitle{text-transform:uppercase;letter-spacing:.05em;color:#22d3ee;align-items:center;gap:4px;font-size:10px;font-weight:600;display:flex}._1WysPG_prepPct{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);font-family:ui-monospace,monospace;font-size:10px}._1WysPG_prepLabel{display:block}._1WysPG_prepLabelStack{margin-top:4px;display:block}._1WysPG_prepCaption{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);font-size:10px}._1WysPG_prepRange{accent-color:#22d3ee;width:100%;margin-top:2px}._1WysPG_prepVal{font-variant-numeric:tabular-nums;color:#22d3ee;font-family:ui-monospace,monospace;font-size:10px}._1WysPG_prepNote{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 56%, transparent);margin:6px 0 0;font-size:9px;line-height:1.6}._1WysPG_selBar{z-index:10;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 18%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 90%, transparent);backdrop-filter:blur(4px);border-radius:8px;align-items:center;gap:6px;padding:6px 10px;display:flex;box-shadow:0 10px 15px -3px #0006}._1WysPG_selSize{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);margin-right:4px;font-size:10px}._1WysPG_scopeHint{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 56%, transparent);font-size:10px}._1WysPG_segmBtn{cursor:pointer;background:var(--dsw-alias-accent,#3b82f6);color:#fff;border:0;border-radius:6px;align-items:center;gap:4px;padding:4px 10px;font-size:11px;font-weight:600;transition:background-color .15s;display:flex}._1WysPG_segmBtn:hover{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 90%, #000)}._1WysPG_bboxBtn{cursor:pointer;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 18%, transparent);background:var(--dsw-alias-bg-module-platform,#f5f6f7);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 90%, transparent);border-radius:6px;align-items:center;gap:4px;padding:4px 10px;font-size:11px;font-weight:600;transition:background-color .15s,color .15s;display:flex}._1WysPG_bboxBtn:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_selClear{cursor:pointer;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);background:0 0;border:0;border-radius:4px;margin-left:2px;padding:4px;transition:color .15s,background-color .15s}._1WysPG_selClear:hover{color:#f87171;background:#ef44441a}._1WysPG_tuneSection{border-bottom:1px solid #ffffff12;padding:6px 2px}._1WysPG_tuneToggle{text-transform:uppercase;letter-spacing:.05em;cursor:pointer;width:100%;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);background:0 0;border:0;justify-content:space-between;align-items:center;padding:0;font-size:10px;font-weight:600;transition:color .15s;display:flex}._1WysPG_tuneToggle:hover{color:var(--dsw-alias-label-primary,#0f1115)}._1WysPG_tuneChev{transition:transform .15s}._1WysPG_tuneChevClosed{transform:rotate(-90deg)}._1WysPG_tuneBody{flex-direction:column;gap:8px;padding-top:6px;display:flex}._1WysPG_tuneHidden{display:none}._1WysPG_groupHead{justify-content:space-between;align-items:center;padding-bottom:4px;display:flex}._1WysPG_groupTitle{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);font-size:10px;font-weight:600}._1WysPG_groupNote{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 40%, transparent);font-size:9px}._1WysPG_scopeChip{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 20%, transparent);border-radius:4px;justify-content:space-between;align-items:center;margin-top:6px;padding:4px 6px;display:flex}._1WysPG_scopeChipLabel{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);align-items:center;gap:4px;font-size:10px;display:flex}._1WysPG_scopeVal{align-items:center;gap:4px;display:flex}._1WysPG_scopeValText{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 80%, transparent);font-size:10px}._1WysPG_scopeClear{cursor:pointer;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);background:0 0;border:0;border-radius:4px;padding:2px;transition:color .15s,background-color .15s}._1WysPG_scopeClear:hover{color:#f87171;background:#ef44441a}._1WysPG_refineTitle{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);padding-bottom:4px;font-size:10px;font-weight:600}._1WysPG_refineGrid{grid-template-columns:1fr 1fr;gap:6px;display:grid}._1WysPG_refineStack{flex-direction:column;gap:4px;display:flex}._1WysPG_refineNote{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);margin:0;font-size:9px;line-height:1.6}._1WysPG_sam3Section{border-bottom:1px solid #ffffff12;padding:8px 2px}._1WysPG_sam3Head{justify-content:space-between;align-items:center;display:flex}._1WysPG_sam3Title{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);align-items:center;gap:4px;font-size:10px;font-weight:600;display:flex}._1WysPG_rideAlong{text-transform:none;letter-spacing:normal;color:#c4b5fd;background:#a78bfa26;border-radius:4px;margin-left:4px;padding:1px 4px;font-size:8px;font-weight:500}._1WysPG_promptInput{width:100%;margin:6px 0}._1WysPG_promptInput input{box-sizing:border-box;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 16%, transparent);background:var(--dsw-alias-bg-module-platform,#f5f6f7);width:100%;height:auto;color:var(--dsw-alias-label-primary,#0f1115);border-radius:4px;outline:none;padding:4px 8px;font-size:11px}._1WysPG_promptInput input::placeholder{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 40%, transparent)}._1WysPG_promptInput input:focus{border-color:#a78bfa99}._1WysPG_promptInput input:disabled{opacity:.5}._1WysPG_sam3Note{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);margin:6px 0 0;font-size:9px;line-height:1.6}._1WysPG_emptyState{text-align:center;flex-direction:column;justify-content:center;align-items:center;gap:12px;padding:32px;display:flex}._1WysPG_emptyIcon{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 15%, transparent);border-radius:9999px;justify-content:center;align-items:center;width:56px;height:56px;display:flex}._1WysPG_emptyTitle{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 90%, transparent);font-size:14px;font-weight:500}._1WysPG_emptyTitleAccent{color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_emptySub{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 54%, transparent);margin-top:2px;font-size:11px}._1WysPG_waitingSub{max-width:20rem;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 54%, transparent);margin:4px auto 0;font-size:11px;line-height:1.6}._1WysPG_emptyRow{align-items:center;gap:8px;display:flex}._1WysPG_uploadBtn{cursor:pointer;background:var(--dsw-alias-accent,#3b82f6);color:#fff;border:0;border-radius:6px;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:500;transition:background-color .15s;display:flex}._1WysPG_uploadBtn:hover{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 90%, #000)}._1WysPG_wireBtn{cursor:pointer;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 18%, transparent);background:var(--dsw-alias-bg-module-platform,#f5f6f7);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 80%, transparent);border-radius:6px;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:500;transition:background-color .15s,color .15s;display:flex}._1WysPG_wireBtn:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_unwireBtn{cursor:pointer;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 18%, transparent);background:var(--dsw-alias-bg-module-platform,#f5f6f7);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 80%, transparent);border-radius:6px;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:500;transition:background-color .15s,color .15s;display:flex}._1WysPG_unwireBtn:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent);color:#f87171}._1WysPG_hiddenInput{display:none}._1WysPG_classChip{text-transform:capitalize;cursor:pointer;border-style:solid;border-width:1px;border-radius:4px;flex-direction:column;flex:1;align-items:center;gap:2px;padding:4px;font-size:10px;transition:color .15s,background-color .15s,border-color .15s;display:flex}._1WysPG_classPrimary{border-color:var(--dsw-alias-accent,#3b82f6);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 20%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_classExtra{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 5%, transparent);color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 90%, transparent)}._1WysPG_classOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_classOff:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 50%, transparent)}._1WysPG_chipTop{align-items:center;gap:4px;display:flex}._1WysPG_chipDot{background:var(--dsw-alias-accent,#3b82f6);border-radius:9999px;width:4px;height:4px}._1WysPG_rail{flex-direction:column;flex:none;width:240px;max-height:100%;padding-bottom:4px;display:flex;overflow-y:auto}._1WysPG_stageSection{border-bottom:1px solid #ffffff12;padding:8px 2px}._1WysPG_stageHead{justify-content:space-between;align-items:center;padding-bottom:6px;display:flex}._1WysPG_stageTitle{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);align-items:center;gap:4px;font-size:10px;font-weight:600;display:flex}._1WysPG_stagePlainTitle{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);padding-bottom:6px;font-size:10px;font-weight:600}._1WysPG_countRow{align-items:center;gap:6px;display:flex}._1WysPG_stepper{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 16%, transparent);border-radius:4px;align-items:center;display:flex;overflow:hidden}._1WysPG_stepBtn{cursor:pointer;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);background:0 0;border:0;padding:2px 6px;font-size:11px;transition:color .15s,background-color .15s}._1WysPG_stepBtn:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent);color:var(--dsw-alias-label-primary,#0f1115)}._1WysPG_stepVal{text-align:center;font-variant-numeric:tabular-nums;min-width:2ch;color:var(--dsw-alias-label-primary,#0f1115);font-size:11px;font-weight:600}._1WysPG_findBtn{cursor:pointer;color:#7dd3fc;background:#0ea5e926;border:0;border-radius:4px;align-items:center;gap:4px;margin-left:auto;padding:2px 8px;font-size:10px;font-weight:600;transition:background-color .15s;display:flex}._1WysPG_findBtn:hover:not(:disabled){background:#0ea5e940}._1WysPG_findBtn:disabled{cursor:not-allowed;opacity:.4}._1WysPG_stageNote{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);margin:0;padding-top:6px;font-size:9px;line-height:1.6}._1WysPG_pickRow{flex-wrap:wrap;gap:4px;display:flex}._1WysPG_pickBtn{cursor:pointer;background:0 0;border-style:solid;border-width:1px;border-radius:9999px;align-items:center;gap:2px;padding:1px 6px;font-size:9px;font-weight:500;transition:color .15s,background-color .15s,border-color .15s;display:inline-flex}._1WysPG_pickAllOn{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 15%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_pickAllOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_pickOneOn{color:#fcd34d;background:#fbbf2426;border-color:#fbbf2499}._1WysPG_pickOneOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_pickOneOff:hover,._1WysPG_pickAllOff:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent)}._1WysPG_typeBtn{text-transform:capitalize;cursor:pointer;background:0 0;border-style:solid;border-width:1px;border-radius:9999px;align-items:center;gap:4px;padding:4px 8px;font-size:10px;font-weight:500;transition:color .15s,background-color .15s,border-color .15s;display:inline-flex}._1WysPG_typeTextOn{color:#c4b5fd;background:#a78bfa26;border-color:#a78bfa99}._1WysPG_typeTextArmed{color:#c4b5fdb3;border-color:#a78bfa4d}._1WysPG_typeTextOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_typeTextOff:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 50%, transparent)}._1WysPG_typePaintOn{color:#f0abfc;background:#e879f926;border-color:#e879f999}._1WysPG_typePaintOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_typePaintOff:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 50%, transparent)}._1WysPG_typeBtn:disabled{cursor:not-allowed;opacity:.35}._1WysPG_geomRow{align-items:center;gap:4px;display:flex}._1WysPG_geomBtn{cursor:pointer;background:0 0;border-style:solid;border-width:1px;border-radius:4px;flex:1;padding:4px 6px;font-size:10px;font-weight:500;transition:color .15s,background-color .15s,border-color .15s}._1WysPG_geomSegmOn{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 15%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_geomSegmOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_geomBboxOn{color:#7dd3fc;background:#38bdf826;border-color:#38bdf899}._1WysPG_geomBboxOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_geomSegmOff:hover,._1WysPG_geomBboxOff:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 50%, transparent)}._1WysPG_addBtn{cursor:pointer;background:var(--dsw-alias-accent,#3b82f6);color:#fff;border:0;border-radius:4px;justify-content:center;align-items:center;gap:4px;width:100%;margin-top:6px;padding:4px 10px;font-size:11px;font-weight:600;transition:background-color .15s;display:flex}._1WysPG_addBtn:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 90%, #000)}._1WysPG_addBtn:disabled{cursor:not-allowed;opacity:.4}._1WysPG_paintParamsNote{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 54%, transparent);margin:0;font-size:9px;line-height:1.6}._1WysPG_brushHint{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 54%, transparent);border-bottom:1px solid #ffffff12;margin:0;padding:8px 2px;font-size:9px;line-height:1.6}._1WysPG_playDock{z-index:10;background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 95%, transparent);backdrop-filter:blur(4px);border-top:1px solid #ffffff12;margin-top:auto;padding:8px 2px;position:sticky;bottom:0}._1WysPG_playBtn{text-transform:uppercase;letter-spacing:.05em;cursor:pointer;background:var(--dsw-alias-accent,#3b82f6);color:#fff;border:0;border-radius:4px;justify-content:center;align-items:center;gap:6px;width:100%;padding:6px 12px;font-size:12px;font-weight:700;transition:background-color .15s;display:flex;box-shadow:0 10px 15px -3px #0006}._1WysPG_playBtn:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 90%, #000)}._1WysPG_playBtn:disabled{cursor:not-allowed;opacity:.4}._1WysPG_strip{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 30%, transparent);border-radius:6px;flex:none;padding:6px 8px}._1WysPG_stripHead{align-items:baseline;gap:4px;padding-bottom:4px;display:flex}._1WysPG_stripTitle{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);font-size:10px;font-weight:600}._1WysPG_stripSub{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 40%, transparent);font-size:9px}._1WysPG_filterTier{flex-wrap:wrap;align-items:center;gap:4px;padding-bottom:6px;display:flex}._1WysPG_filterChip{background:0 0;border-style:solid;border-width:1px;border-radius:9999px;align-items:center;gap:2px;padding:1px 6px;font-size:9px;font-weight:500;transition:color .15s,background-color .15s;display:inline-flex}button._1WysPG_filterChip{cursor:pointer}._1WysPG_chipDim{opacity:.4}._1WysPG_chipHover:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent)}._1WysPG_toneFullOn{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 15%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_toneFullOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent)}._1WysPG_toneScopeOn{color:#7dd3fc;background:#38bdf81a;border-color:#38bdf899}._1WysPG_toneScopeOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent)}._1WysPG_toneInstanceOn{color:#fcd34d;background:#fbbf2433;border-color:#fbbf24b3}._1WysPG_toneInstanceOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:#fde68a80}._1WysPG_toneCanvasOn{color:#f0abfc;background:#e879f91a;border-color:#e879f999}._1WysPG_toneCanvasOff{border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent)}._1WysPG_stripEmpty{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);margin:0;padding-bottom:4px;font-size:9px;line-height:1.6}._1WysPG_recipeRow{gap:6px;padding-bottom:2px;display:flex;overflow-x:auto}._1WysPG_recipeCard{border-width:1px;border-radius:4px;flex-direction:column;flex:none;align-items:center;gap:2px;width:92px;padding:6px;transition:color .15s,background-color .15s,border-color .15s;display:flex}._1WysPG_recipeFilled{border-style:solid;border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 18%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 40%, transparent)}._1WysPG_recipeEmptyCard{border-style:dashed;border-color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 20%, transparent);opacity:.6}._1WysPG_recipeFilter{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);font-size:8px;font-weight:500}._1WysPG_recipeSel{max-width:100%;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 80%, transparent);align-items:center;gap:2px;font-size:10px;display:flex}._1WysPG_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._1WysPG_recipeDetail{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);flex:none;font-size:9px;overflow:hidden}._1WysPG_recipeEmptyNote{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);font-size:9px}._1WysPG_viewportWrap{background:#0e0e1a;border-radius:6px;margin:auto;transition:box-shadow .15s,outline .15s;position:relative;overflow:hidden}._1WysPG_viewportHug{flex:none}._1WysPG_viewportFill{flex:1;justify-content:center;align-items:center;min-height:0;display:flex}._1WysPG_viewportDrop{outline:2px solid var(--dsw-alias-accent,#3b82f6);outline-offset:-2px}._1WysPG_viewportIdle{outline:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 14%, transparent);outline-offset:-1px}._1WysPG_loadingVeil{z-index:10;background:#0e0e1ab3;justify-content:center;align-items:center;display:flex;position:absolute;inset:0}._1WysPG_viewSkeleton{background:#8080a04d;border-radius:6px;width:64px;height:64px}._1WysPG_viewCanvas{user-select:none}._1WysPG_viewPanZoomed{cursor:grab}._1WysPG_viewPanFlat{cursor:default}._1WysPG_viewPaint{cursor:crosshair}._1WysPG_viewDragging{cursor:grabbing}._1WysPG_thumb{border:1px solid #0006;border-radius:2px;flex:none;width:72px;height:48px}._1WysPG_studioRoot{flex-direction:column;flex:1;gap:8px;min-height:0;padding:10px 12px;display:flex}._1WysPG_centerRow{flex:1;gap:8px;min-height:0;display:flex}._1WysPG_nfWrap{display:block}._1WysPG_nfLabelRow{justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;display:flex}._1WysPG_nfLabelText{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 52%, transparent);font-size:10px;font-weight:600}._1WysPG_nfBox{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 22%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 60%, transparent);border-radius:4px;align-items:center;transition:border-color .15s;display:flex}._1WysPG_nfBox:hover{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 40%, transparent)}._1WysPG_nfBox:focus-within{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent)}._1WysPG_nfInput{font-variant-numeric:tabular-nums;width:100%;color:var(--dsw-alias-label-primary,#0f1115);-moz-appearance:textfield;appearance:textfield;background:0 0;border:0;outline:none;padding:2px 6px;font-size:11px}._1WysPG_nfInput::-webkit-outer-spin-button,._1WysPG_nfInput::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}._1WysPG_verb{cursor:pointer;color:var(--dsw-alias-label-primary,#0f1115);border-style:solid;border-width:1px;border-radius:6px;align-items:center;gap:6px;padding:4px 8px;font-size:10px;font-weight:500;transition:background-color .15s;display:flex}._1WysPG_verb:disabled{cursor:not-allowed;opacity:.5}._1WysPG_verbBrand{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 10%, transparent)}._1WysPG_verbBrand:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 20%, transparent)}._1WysPG_verbViolet{background:#a78bfa1a;border-color:#a78bfa66}._1WysPG_verbViolet:hover:not(:disabled){background:#a78bfa33}._1WysPG_verbWide{color:#fff;background:#7c3aed;border-color:#0000;justify-content:center;width:100%;padding:4px 8px;font-size:11px;font-weight:600}._1WysPG_verbWide:hover:not(:disabled){background:#8b5cf6}._1WysPG_verbWide:disabled{opacity:.4}._1WysPG_verbNote{-webkit-line-clamp:2;width:100%;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 54%, transparent);-webkit-box-orient:vertical;margin:4px 0 0;font-size:9px;line-height:1.6;display:-webkit-box;overflow:hidden}._1WysPG_shellRoot{flex-direction:column;flex:1;min-height:100%;display:flex}._1WysPG_shellErrors{flex-direction:column;gap:4px;margin-top:8px;display:flex}._1WysPG_shellError{overflow-wrap:break-word;white-space:pre-wrap;color:#f87171;background:#f871711a;border:1px solid #f8717166;border-radius:4px;margin:0;padding:6px 8px;font-family:ui-monospace,monospace;font-size:9px;line-height:1.4}._1WysPG_wireDialog{width:min(448px,100vw - 32px);max-height:60vh;overflow-y:auto}._1WysPG_wireUnwire{text-align:left;cursor:pointer;border:0;border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent);color:#f87171;background:0 0;align-items:center;gap:8px;width:100%;padding:8px 12px;font-size:11px;display:flex}._1WysPG_wireUnwire:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 40%, transparent)}._1WysPG_wireList{margin:0;padding:0;list-style:none}._1WysPG_wireList>li+li{border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 12%, transparent)}._1WysPG_wireEmpty{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);padding:12px;font-size:11px}._1WysPG_wireOption{text-align:left;cursor:pointer;width:100%;color:var(--dsw-alias-label-primary,#0f1115);background:0 0;border:0;align-items:center;gap:8px;padding:8px 12px;display:flex}._1WysPG_wireOption:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 40%, transparent)}._1WysPG_wireSelected{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 8%, transparent)}._1WysPG_wireIdx{font-variant-numeric:tabular-nums;background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);width:20px;height:20px;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);border-radius:4px;flex:none;justify-content:center;align-items:center;font-size:9px;font-weight:700;display:flex}._1WysPG_wireThumb{object-fit:cover;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 20%, transparent);border-radius:4px;flex:none;width:32px;height:32px}._1WysPG_wireThumbFallback{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 20%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 40%, transparent);width:32px;height:32px;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);border-radius:4px;flex:none;justify-content:center;align-items:center;display:flex}._1WysPG_wireMeta{flex:1;min-width:0}._1WysPG_wireTitle{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary,#0f1115);font-size:11px;font-weight:500;overflow:hidden}._1WysPG_wireOut{color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 80%, transparent);margin-left:4px;font-family:ui-monospace,monospace;font-size:9px}._1WysPG_wireSub{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 48%, transparent);font-family:ui-monospace,monospace;font-size:9px;overflow:hidden}._1WysPG_wiredTag{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 15%, transparent);color:var(--dsw-alias-accent,#3b82f6);border-radius:4px;flex:none;padding:2px 6px;font-size:9px;font-weight:600}._1WysPG_anchor{position:absolute}._1WysPG_anchorTR{top:8px;right:8px}._1WysPG_anchorTL{top:8px;left:8px}._1WysPG_anchorBR{bottom:8px;right:8px}._1WysPG_anchorBL{bottom:8px;left:8px}._1WysPG_anchorBC{bottom:8px;left:50%;transform:translate(-50%)}._1WysPG_anchorBottom{bottom:10px;left:10px;right:10px}._1WysPG_anchorFill{inset:0}._1WysPG_anchorEdgeR{top:0;bottom:0;right:0}._1WysPG_anchorEdgeL{top:0;bottom:0;left:0}._1WysPG_overlayDock{z-index:10;opacity:.6;flex-direction:column;gap:4px;transition:opacity .15s;display:flex;position:absolute}._1WysPG_overlayDock:hover{opacity:1}._1WysPG_overlayTL{top:8px;left:8px}._1WysPG_overlayTR{top:8px;right:8px}._1WysPG_overlayBL{bottom:8px;left:8px}._1WysPG_overlayBR{bottom:8px;right:8px}._1WysPG_overlayChip{pointer-events:auto;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 90%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 80%, transparent);backdrop-filter:blur(4px);border-radius:4px;align-items:center;gap:4px;padding:4px 8px;font-size:10px;font-weight:500;transition:opacity .15s;display:flex}span._1WysPG_overlayChip{cursor:default}button._1WysPG_overlayChip{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 80%, transparent);cursor:pointer;border:1px solid #0000}button._1WysPG_overlayChip:hover{background:var(--dsw-alias-bg-module-platform,#f5f6f7)}._1WysPG_overlayToggleOn{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 50%, transparent);color:var(--dsw-alias-accent,#3b82f6)}._1WysPG_overlayToggleOff{color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent)}._1WysPG_overlayToggleOff:hover{color:var(--dsw-alias-label-primary,#0f1115)}._1WysPG_overlaySeg{pointer-events:auto;background:color-mix(in srgb, var(--dsw-alias-bg-module-platform,#f5f6f7) 80%, transparent);backdrop-filter:blur(4px);border-radius:4px;align-items:center;gap:2px;padding:2px;transition:opacity .15s;display:flex}._1WysPG_overlaySegOpt{cursor:pointer;color:color-mix(in srgb, var(--dsw-alias-label-primary,#0f1115) 60%, transparent);background:0 0;border:0;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:500;transition:color .15s,background-color .15s}._1WysPG_overlaySegOpt:hover{color:var(--dsw-alias-label-primary,#0f1115)}._1WysPG_overlaySegLit{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 20%, transparent);color:var(--dsw-alias-accent,#3b82f6)}";
		const tagId$1 = "@melite/image-mask-studio/mask.module.css@df1897a5";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-mask-studio";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var mask_module_css_default = {
			"accentInk": "_1WysPG_accentInk",
			"addBtn": "_1WysPG_addBtn",
			"anchor": "_1WysPG_anchor",
			"anchorBC": "_1WysPG_anchorBC",
			"anchorBL": "_1WysPG_anchorBL",
			"anchorBR": "_1WysPG_anchorBR",
			"anchorBottom": "_1WysPG_anchorBottom",
			"anchorEdgeL": "_1WysPG_anchorEdgeL",
			"anchorEdgeR": "_1WysPG_anchorEdgeR",
			"anchorFill": "_1WysPG_anchorFill",
			"anchorTL": "_1WysPG_anchorTL",
			"anchorTR": "_1WysPG_anchorTR",
			"bboxBtn": "_1WysPG_bboxBtn",
			"brushHint": "_1WysPG_brushHint",
			"brushSizeField": "_1WysPG_brushSizeField",
			"canvasCol": "_1WysPG_canvasCol",
			"capsLabel": "_1WysPG_capsLabel",
			"centerRow": "_1WysPG_centerRow",
			"chipDim": "_1WysPG_chipDim",
			"chipDot": "_1WysPG_chipDot",
			"chipHover": "_1WysPG_chipHover",
			"chipTop": "_1WysPG_chipTop",
			"classChip": "_1WysPG_classChip",
			"classExtra": "_1WysPG_classExtra",
			"classOff": "_1WysPG_classOff",
			"classPrimary": "_1WysPG_classPrimary",
			"clearBtn": "_1WysPG_clearBtn",
			"countRow": "_1WysPG_countRow",
			"dockBtn": "_1WysPG_dockBtn",
			"dockBtnActive": "_1WysPG_dockBtnActive",
			"dockBtnDisabled": "_1WysPG_dockBtnDisabled",
			"dockBtnIdle": "_1WysPG_dockBtnIdle",
			"dockDivider": "_1WysPG_dockDivider",
			"emptyIcon": "_1WysPG_emptyIcon",
			"emptyRow": "_1WysPG_emptyRow",
			"emptyState": "_1WysPG_emptyState",
			"emptySub": "_1WysPG_emptySub",
			"emptyTitle": "_1WysPG_emptyTitle",
			"emptyTitleAccent": "_1WysPG_emptyTitleAccent",
			"filterChip": "_1WysPG_filterChip",
			"filterTier": "_1WysPG_filterTier",
			"findBtn": "_1WysPG_findBtn",
			"geomBboxOff": "_1WysPG_geomBboxOff",
			"geomBboxOn": "_1WysPG_geomBboxOn",
			"geomBtn": "_1WysPG_geomBtn",
			"geomRow": "_1WysPG_geomRow",
			"geomSegmOff": "_1WysPG_geomSegmOff",
			"geomSegmOn": "_1WysPG_geomSegmOn",
			"groupHead": "_1WysPG_groupHead",
			"groupNote": "_1WysPG_groupNote",
			"groupTitle": "_1WysPG_groupTitle",
			"hiddenInput": "_1WysPG_hiddenInput",
			"instanceBadge": "_1WysPG_instanceBadge",
			"instanceOff": "_1WysPG_instanceOff",
			"instanceOn": "_1WysPG_instanceOn",
			"loadingVeil": "_1WysPG_loadingVeil",
			"ms-pulse": "_1WysPG_ms-pulse",
			"ms-spin": "_1WysPG_ms-spin",
			"nfBox": "_1WysPG_nfBox",
			"nfInput": "_1WysPG_nfInput",
			"nfLabelRow": "_1WysPG_nfLabelRow",
			"nfLabelText": "_1WysPG_nfLabelText",
			"nfWrap": "_1WysPG_nfWrap",
			"optionsBar": "_1WysPG_optionsBar",
			"overlayBL": "_1WysPG_overlayBL",
			"overlayBR": "_1WysPG_overlayBR",
			"overlayChip": "_1WysPG_overlayChip",
			"overlayDock": "_1WysPG_overlayDock",
			"overlaySeg": "_1WysPG_overlaySeg",
			"overlaySegLit": "_1WysPG_overlaySegLit",
			"overlaySegOpt": "_1WysPG_overlaySegOpt",
			"overlayTL": "_1WysPG_overlayTL",
			"overlayTR": "_1WysPG_overlayTR",
			"overlayToggleOff": "_1WysPG_overlayToggleOff",
			"overlayToggleOn": "_1WysPG_overlayToggleOn",
			"paintParamsNote": "_1WysPG_paintParamsNote",
			"pickAllOff": "_1WysPG_pickAllOff",
			"pickAllOn": "_1WysPG_pickAllOn",
			"pickBtn": "_1WysPG_pickBtn",
			"pickOneOff": "_1WysPG_pickOneOff",
			"pickOneOn": "_1WysPG_pickOneOn",
			"pickRow": "_1WysPG_pickRow",
			"playBtn": "_1WysPG_playBtn",
			"playDock": "_1WysPG_playDock",
			"prepCaption": "_1WysPG_prepCaption",
			"prepHead": "_1WysPG_prepHead",
			"prepLabel": "_1WysPG_prepLabel",
			"prepLabelStack": "_1WysPG_prepLabelStack",
			"prepNote": "_1WysPG_prepNote",
			"prepPanel": "_1WysPG_prepPanel",
			"prepPct": "_1WysPG_prepPct",
			"prepRange": "_1WysPG_prepRange",
			"prepTitle": "_1WysPG_prepTitle",
			"prepVal": "_1WysPG_prepVal",
			"promptInput": "_1WysPG_promptInput",
			"pulse": "_1WysPG_pulse",
			"rail": "_1WysPG_rail",
			"recipeCard": "_1WysPG_recipeCard",
			"recipeDetail": "_1WysPG_recipeDetail",
			"recipeEmptyCard": "_1WysPG_recipeEmptyCard",
			"recipeEmptyNote": "_1WysPG_recipeEmptyNote",
			"recipeFilled": "_1WysPG_recipeFilled",
			"recipeFilter": "_1WysPG_recipeFilter",
			"recipeRow": "_1WysPG_recipeRow",
			"recipeSel": "_1WysPG_recipeSel",
			"rectHint": "_1WysPG_rectHint",
			"refineGrid": "_1WysPG_refineGrid",
			"refineNote": "_1WysPG_refineNote",
			"refineStack": "_1WysPG_refineStack",
			"refineTitle": "_1WysPG_refineTitle",
			"rideAlong": "_1WysPG_rideAlong",
			"sam3Head": "_1WysPG_sam3Head",
			"sam3Note": "_1WysPG_sam3Note",
			"sam3Section": "_1WysPG_sam3Section",
			"sam3Title": "_1WysPG_sam3Title",
			"scopeChip": "_1WysPG_scopeChip",
			"scopeChipLabel": "_1WysPG_scopeChipLabel",
			"scopeClear": "_1WysPG_scopeClear",
			"scopeHint": "_1WysPG_scopeHint",
			"scopeVal": "_1WysPG_scopeVal",
			"scopeValText": "_1WysPG_scopeValText",
			"segmBtn": "_1WysPG_segmBtn",
			"selBar": "_1WysPG_selBar",
			"selClear": "_1WysPG_selClear",
			"selSize": "_1WysPG_selSize",
			"shellError": "_1WysPG_shellError",
			"shellErrors": "_1WysPG_shellErrors",
			"shellRoot": "_1WysPG_shellRoot",
			"sizeLabel": "_1WysPG_sizeLabel",
			"spacer": "_1WysPG_spacer",
			"spin": "_1WysPG_spin",
			"stageHead": "_1WysPG_stageHead",
			"stageNote": "_1WysPG_stageNote",
			"stagePlainTitle": "_1WysPG_stagePlainTitle",
			"stageSection": "_1WysPG_stageSection",
			"stageTitle": "_1WysPG_stageTitle",
			"stepBtn": "_1WysPG_stepBtn",
			"stepVal": "_1WysPG_stepVal",
			"stepper": "_1WysPG_stepper",
			"strip": "_1WysPG_strip",
			"stripEmpty": "_1WysPG_stripEmpty",
			"stripHead": "_1WysPG_stripHead",
			"stripSub": "_1WysPG_stripSub",
			"stripTitle": "_1WysPG_stripTitle",
			"studioRoot": "_1WysPG_studioRoot",
			"sz10": "_1WysPG_sz10",
			"sz12": "_1WysPG_sz12",
			"sz14": "_1WysPG_sz14",
			"sz16": "_1WysPG_sz16",
			"sz28": "_1WysPG_sz28",
			"thumb": "_1WysPG_thumb",
			"toneCanvasOff": "_1WysPG_toneCanvasOff",
			"toneCanvasOn": "_1WysPG_toneCanvasOn",
			"toneFullOff": "_1WysPG_toneFullOff",
			"toneFullOn": "_1WysPG_toneFullOn",
			"toneInstanceOff": "_1WysPG_toneInstanceOff",
			"toneInstanceOn": "_1WysPG_toneInstanceOn",
			"toneScopeOff": "_1WysPG_toneScopeOff",
			"toneScopeOn": "_1WysPG_toneScopeOn",
			"toolDock": "_1WysPG_toolDock",
			"truncate": "_1WysPG_truncate",
			"tuneBody": "_1WysPG_tuneBody",
			"tuneChev": "_1WysPG_tuneChev",
			"tuneChevClosed": "_1WysPG_tuneChevClosed",
			"tuneHidden": "_1WysPG_tuneHidden",
			"tuneSection": "_1WysPG_tuneSection",
			"tuneToggle": "_1WysPG_tuneToggle",
			"typeBtn": "_1WysPG_typeBtn",
			"typePaintOff": "_1WysPG_typePaintOff",
			"typePaintOn": "_1WysPG_typePaintOn",
			"typeTextArmed": "_1WysPG_typeTextArmed",
			"typeTextOff": "_1WysPG_typeTextOff",
			"typeTextOn": "_1WysPG_typeTextOn",
			"unwireBtn": "_1WysPG_unwireBtn",
			"uploadBtn": "_1WysPG_uploadBtn",
			"verb": "_1WysPG_verb",
			"verbBrand": "_1WysPG_verbBrand",
			"verbNote": "_1WysPG_verbNote",
			"verbViolet": "_1WysPG_verbViolet",
			"verbWide": "_1WysPG_verbWide",
			"viewCanvas": "_1WysPG_viewCanvas",
			"viewDragging": "_1WysPG_viewDragging",
			"viewPaint": "_1WysPG_viewPaint",
			"viewPanFlat": "_1WysPG_viewPanFlat",
			"viewPanZoomed": "_1WysPG_viewPanZoomed",
			"viewSkeleton": "_1WysPG_viewSkeleton",
			"viewportDrop": "_1WysPG_viewportDrop",
			"viewportFill": "_1WysPG_viewportFill",
			"viewportHug": "_1WysPG_viewportHug",
			"viewportIdle": "_1WysPG_viewportIdle",
			"viewportWrap": "_1WysPG_viewportWrap",
			"violetInk": "_1WysPG_violetInk",
			"waitingSub": "_1WysPG_waitingSub",
			"wireBtn": "_1WysPG_wireBtn",
			"wireDialog": "_1WysPG_wireDialog",
			"wireEmpty": "_1WysPG_wireEmpty",
			"wireIdx": "_1WysPG_wireIdx",
			"wireList": "_1WysPG_wireList",
			"wireMeta": "_1WysPG_wireMeta",
			"wireOption": "_1WysPG_wireOption",
			"wireOut": "_1WysPG_wireOut",
			"wireSelected": "_1WysPG_wireSelected",
			"wireSub": "_1WysPG_wireSub",
			"wireThumb": "_1WysPG_wireThumb",
			"wireThumbFallback": "_1WysPG_wireThumbFallback",
			"wireTitle": "_1WysPG_wireTitle",
			"wireUnwire": "_1WysPG_wireUnwire",
			"wiredBadge": "_1WysPG_wiredBadge",
			"wiredTag": "_1WysPG_wiredTag",
			"zoomBtn": "_1WysPG_zoomBtn",
			"zoomPct": "_1WysPG_zoomPct",
			"zoomReset": "_1WysPG_zoomReset",
			"zoomRow": "_1WysPG_zoomRow"
		};
		//#endregion
		//#region src/ui/studio/WirePickerModal.tsx
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: `Wire ${slot} from an earlier card`,
				closeLabel: "Close wire picker",
				className: mask_module_css_default.wireDialog,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-wire-modal": true,
					children: [currentId && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onUnwire,
						"data-wire-unwire": true,
						className: mask_module_css_default.wireUnwire,
						children: "Unwire — this slot will ask for a file or wire again"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: mask_module_css_default.wireList,
						children: [priorStages.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							className: mask_module_css_default.wireEmpty,
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
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => onPick(u.id, row.outputName),
									"data-wire-option": row.outputName ?? "primary",
									className: clsx(mask_module_css_default.wireOption, selected && mask_module_css_default.wireSelected),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: mask_module_css_default.wireIdx,
											children: String(i + 1).padStart(2, "0")
										}),
										row.thumb && isImageUrl$1(row.thumb) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
											src: row.thumb,
											alt: "",
											className: mask_module_css_default.wireThumb
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: mask_module_css_default.wireThumbFallback,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Link2, { className: mask_module_css_default.sz14 })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: mask_module_css_default.wireMeta,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: mask_module_css_default.wireTitle,
												children: [u.title, multi && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: mask_module_css_default.wireOut,
													children: ["· ", row.label]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: mask_module_css_default.wireSub,
												children: u.result ? row.thumb ?? "no artifacts" : "not run yet"
											})]
										}),
										selected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: mask_module_css_default.wiredTag,
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
		//#region src/ui/studio/constants.ts
		/** The slot this editor sources. Mask Studio consumes one image — slot 0,
		* the input_image vocabulary key. Hard-coded: the family declares exactly
		* one image slot, and the wire/attach state below all reads index 0. */
		const INPUT_SLOT = "input_image";
		const MAX_CANVAS_EDGE = 1024;
		/** Detector mask defs — label + overlay tint. Keys match the family's
		* optional_outputs (config/.../mask_studio.yaml) + BrickResult.artifacts.
		* The mask strip + canvas overlay iterate this. */
		const DETECTOR_DEFS = [
			{
				key: "mask_combined",
				label: "Combined",
				color: "#e5e7eb"
			},
			{
				key: "mask_face",
				label: "Face",
				color: "#ef4444"
			},
			{
				key: "mask_hands",
				label: "Hands",
				color: "#22c55e"
			},
			{
				key: "mask_body",
				label: "Body",
				color: "#3b82f6"
			}
		];
		const SAM3_COLOR = "#a78bfa";
		const PAINT_COLOR = "#d946ef";
		/** Fixed overlay alphas (view-only — the exported PNG is always the
		* full-opacity binary mask; the panel's per-layer opacity knobs are GONE,
		* ). */
		const DETECTOR_ALPHA = .5;
		const PAINT_ALPHA = .55;
		/** Prep-preview overlay alpha + tint. Cyan is deliberately NOT any
		* producer's color (white/red/green/blue/violet/magenta) — the effective
		* mask must read as its own layer, never as another producer's output. */
		const PREP_ALPHA = .38;
		/** Referentially-stable empty artifacts map (see the memo at the
		* `artifacts` derivation — a per-render `{}` literal loops the effects). */
		const EMPTY_ARTIFACTS = {};
		const WHEEL_ZOOM_FACTOR = 1.2;
		const WHEEL_PINCH_SENSITIVITY = .01;
		const clampZoom = (z) => Math.min(5, Math.max(1, z));
		/** Detect classes — the YOLO model selector (mask_studio.yaml detectors
		* block). A brick-side + rail-side vocabulary only: "none" is NOT a class
		* here (it is what Text/Brush write to turn the detect producer off —
		* DetectorEntry requires a model, so the YAML block can't carry it). */
		const DETECT_CLASSES = [
			{
				key: "face",
				label: "face",
				Icon: ScanFace
			},
			{
				key: "hands",
				label: "hands",
				Icon: Hand
			},
			{
				key: "body",
				label: "body",
				Icon: User
			}
		];
		/** Marquee styling — distinct from the paint magenta so a selection never
		* reads as paint authoring. Dashed on commit (persistent), solid while
		* dragging. */
		const SEL_STROKE = "#38bdf8";
		/** Instance overlay color (phase B, 2026-08-16) — amber, deliberately
		*  distinct from the marquee sky and every producer tint: the boxes are
		*  CANDIDATES, not masks. */
		const INSTANCE_COLOR = "#f59e0b";
		/** A recipe entry's FILTER line — the same grammar the flat bar uses
		*  (instanceLabel / scopeFilter / "Canvas"), derived from the entry. */
		function recipeFilterLabel(e) {
			const f = e.filter;
			if (!f || f.kind === void 0 || f.kind === "full") return "Full";
			if (f.kind === "scope") return "Scope";
			if (f.kind === "canvas") return "Canvas";
			if (f.kind === "instance") {
				const keep = f.keep;
				const idx = keep === "largest" ? [0] : Array.isArray(keep) ? keep.map(Number) : typeof keep === "string" ? keep.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)) : keep !== void 0 ? [Number(keep)] : [];
				return idx.length ? `BBox ${idx.map((i) => i + 1).join(",")}` : "BBox ?";
			}
			return "Full";
		}
		/** Output-card accents — the same colors the canvas overlays tint with,
		*  so a card reads as its mask's tint. */
		const CLASS_COLORS = {
			face: "#ef4444",
			hands: "#22c55e",
			body: "#3b82f6"
		};
		const CHIP_TONE = {
			full: {
				on: mask_module_css_default.toneFullOn,
				off: mask_module_css_default.toneFullOff
			},
			scope: {
				on: mask_module_css_default.toneScopeOn,
				off: mask_module_css_default.toneScopeOff
			},
			instance: {
				on: mask_module_css_default.toneInstanceOn,
				off: mask_module_css_default.toneInstanceOff
			},
			canvas: {
				on: mask_module_css_default.toneCanvasOn,
				off: mask_module_css_default.toneCanvasOff
			}
		};
		//#endregion
		//#region src/ui/studio/canvas-ops.ts
		/** Tint a mask: draw src, then source-in the fill so only opaque regions
		* keep the tint (transparent elsewhere). Returns a fresh canvas each call. */
		function makeTinted(src, color, w, h) {
			const c = document.createElement("canvas");
			c.width = w;
			c.height = h;
			const cx = c.getContext("2d");
			cx.drawImage(src, 0, 0, w, h);
			cx.globalCompositeOperation = "source-in";
			cx.fillStyle = color;
			cx.fillRect(0, 0, w, h);
			cx.globalCompositeOperation = "source-over";
			return c;
		}
		/** The produced-mask set — every artifact the run brought back, in display
		* order (combined first, then per-class detectors, then sam3). The strip +
		* canvas overlay both derive from this; nothing is user-togglable. */
		function producedMasks(artifacts) {
			const out = [];
			for (const d of DETECTOR_DEFS) {
				const url = artifacts[d.key];
				if (url) out.push({
					key: d.key,
					label: d.label,
					color: d.color,
					url
				});
			}
			const sam3Url = artifacts.mask_sam3;
			if (sam3Url) out.push({
				key: "mask_sam3",
				label: "SAM3",
				color: SAM3_COLOR,
				url: sam3Url
			});
			return out;
		}
		//#endregion
		//#region src/ui/studio/MaskThumb.tsx
		function MaskThumb({ url, color, imgCache, paintCanvas, paintVersion }) {
			const ref = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const c = ref.current;
				if (!c) return;
				const ctx = c.getContext("2d");
				if (!ctx) return;
				const W = c.width, H = c.height;
				ctx.clearRect(0, 0, W, H);
				const s = 6;
				for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
					ctx.fillStyle = (x / s + y / s) % 2 === 0 ? "#1a1a2e" : "#151523";
					ctx.fillRect(x, y, s, s);
				}
				let src = null;
				if (url) {
					const img = imgCache.get(url);
					if (img && img.complete && img.naturalWidth > 0) src = img;
				} else if (paintCanvas && paintVersion > 0) src = paintCanvas;
				if (src) {
					const tinted = makeTinted(src, color, W, H);
					ctx.drawImage(tinted, 0, 0);
				}
			}, [
				url,
				color,
				imgCache,
				paintCanvas,
				paintVersion
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
				ref,
				width: 72,
				height: 48,
				className: mask_module_css_default.thumb
			});
		}
		//#endregion
		//#region src/ui/studio/OutputStrip.tsx
		function OutputStrip({ entries, hasPaint, paintVersion, imgCache, paintCanvas, running, filters }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-output-strip": true,
				className: mask_module_css_default.strip,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.stripHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: mask_module_css_default.stripTitle,
							children: "Outputs"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: mask_module_css_default.stripSub,
							children: entries.length === 0 ? "— nothing armed yet" : running ? "— filling as the run lands…" : "— exported automatically"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-filter-tier": true,
						className: mask_module_css_default.filterTier,
						children: filters.map((f) => f.onTap ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: f.tip ?? f.label,
							side: "top",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								type: "button",
								"data-filter-chip": f.key,
								onClick: f.onTap,
								className: clsx(mask_module_css_default.filterChip, f.dim && mask_module_css_default.chipDim, f.active ? CHIP_TONE[f.tone].on : CHIP_TONE[f.tone].off, !f.active && mask_module_css_default.chipHover),
								children: [f.icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(f.icon, { className: mask_module_css_default.sz10 }), f.label]
							})
						}, f.key) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							"data-filter-chip": f.key,
							title: f.tip,
							className: clsx(mask_module_css_default.filterChip, f.active ? CHIP_TONE[f.tone].on : CHIP_TONE[f.tone].off, f.dim && mask_module_css_default.chipDim),
							children: [f.icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(f.icon, { className: mask_module_css_default.sz10 }), f.label]
						}, f.key))
					}),
					entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: mask_module_css_default.stripEmpty,
						children: "Nothing armed — pick a source in the rail and its recipe card appears here, filling when the run lands."
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.recipeRow,
						children: entries.map((e) => {
							const filled = e.live ? hasPaint : !!e.url;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-mask-row": e.key,
								"data-filled": filled ? "true" : "false",
								"data-filter": e.filter,
								"data-selection": e.selection,
								title: `${e.filter} · ${e.selection}${e.detail ? ` ${e.detail}` : ""}`,
								className: clsx(mask_module_css_default.recipeCard, filled ? mask_module_css_default.recipeFilled : clsx(mask_module_css_default.recipeEmptyCard, running && mask_module_css_default.pulse)),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: mask_module_css_default.recipeFilter,
										children: e.filter
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MaskThumb, {
										url: e.url,
										color: e.color,
										imgCache,
										paintCanvas: e.live ? paintCanvas : null,
										paintVersion: e.live ? paintVersion : 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: clsx(mask_module_css_default.recipeSel, mask_module_css_default.truncate),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: mask_module_css_default.truncate,
												children: e.selection
											}),
											e.detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: mask_module_css_default.recipeDetail,
												children: e.detail
											}),
											!filled && !e.detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: mask_module_css_default.recipeEmptyNote,
												children: "(empty)"
											})
										]
									})
								]
							}, e.key);
						})
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/ClassChip.tsx
		/** One class chip. States mirror the RUN-time truth (runDetect's OR rule):
		* on = export flag OR is-primary; primary (the dot) = detect_mode, the
		* class that owns mask_combined. data-detect-mode stays on the chip — the
		* card-studio E4 contract test gestures through it. */
		function ClassChip({ cls, label, Icon, state, onTap }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: state === "primary" ? `${label} owns the Combined mask — press again to set its params` : state === "extra" ? `${label} rides along — press to set its params` : `Press to set the ${label} params — ADD commits the card`,
				side: "top",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					type: "button",
					"data-detect-mode": cls,
					"data-class-state": state,
					onClick: onTap,
					className: clsx(mask_module_css_default.classChip, state === "primary" && mask_module_css_default.classPrimary, state === "extra" && mask_module_css_default.classExtra, state === "off" && mask_module_css_default.classOff),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: mask_module_css_default.chipTop,
						children: [state === "primary" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: mask_module_css_default.chipDot }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { className: mask_module_css_default.sz14 })]
					}), label]
				})
			});
		}
		//#endregion
		//#region src/ui/studio/VerbChip.tsx
		function VerbChip({ onClick, label, busy = false, icon, tone = "brand", wide = false, note, noteIsError = false, className, type, ref, ...rest }) {
			const chip = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref,
				type: type ?? "button",
				onClick,
				className: clsx(mask_module_css_default.verb, !wide && tone === "brand" && mask_module_css_default.verbBrand, !wide && tone === "violet" && mask_module_css_default.verbViolet, wide && mask_module_css_default.verbWide, className),
				...rest,
				children: [busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loader2, { className: mask_module_css_default.sz12 }) : icon ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WandSparkles, { className: mask_module_css_default.sz12 }), label]
			});
			if (!note) return chip;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [chip, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				role: noteIsError ? "alert" : "status",
				title: note,
				className: mask_module_css_default.verbNote,
				children: note
			})] });
		}
		//#endregion
		//#region src/ui/studio/Sam3PromptBox.tsx
		/** The Text (SAM3) prompt box. Rendered when Text is the SOURCE — or when
		* a non-empty sam3_prompt is RIDING ALONG beside a Person/Box run (the
		* brick runs both; the box says so and stays editable). The prompt is a
		* LOCAL DRAFT until Segment — same one-gesture contract as Segm/Bbox
		* (per-keystroke writes would re-hash paint_mask through _recomputeKeys
		* on every letter; the run persists ONCE). */
		function Sam3PromptBox({ params, onSegment, hasInput, detecting, rideAlong }) {
			const [draft, setDraft] = (0, react.useState)(params.sam3_prompt ?? "");
			(0, react.useEffect)(() => {
				setDraft(params.sam3_prompt ?? "");
			}, [params.sam3_prompt]);
			const canRun = hasInput && draft.trim().length > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: mask_module_css_default.sam3Section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.sam3Head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: mask_module_css_default.sam3Title,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WandSparkles, { className: clsx(mask_module_css_default.sz12, mask_module_css_default.violetInk) }),
								" Text mask",
								rideAlong && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: mask_module_css_default.rideAlong,
									children: "also running"
								})
							]
						}), detecting && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loader2, { className: clsx(mask_module_css_default.sz12, mask_module_css_default.accentInk, mask_module_css_default.spin) })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						type: "text",
						"data-sam3-input": true,
						value: draft,
						onChange: (e) => setDraft(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter" && canRun) onSegment(draft);
						},
						placeholder: "What to mask — e.g. shirt, jeans, hat",
						disabled: !hasInput,
						autoFocus: !rideAlong && draft === "",
						className: mask_module_css_default.promptInput
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: !hasInput ? "Add an image first" : draft.trim() ? "Segment by text prompt (scoped to the selection when one is committed)" : "Type what to mask",
						side: "top",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VerbChip, {
							wide: true,
							tone: "violet",
							"data-sam3-run": true,
							onClick: () => canRun && onSegment(draft),
							disabled: !canRun,
							label: "Segment"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: mask_module_css_default.sam3Note,
						children: "Open-vocabulary segmentation — exports as its own mask (and as the Combined mask when Person/Box are off)."
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:card-base/src/card.module.css.mjs
		const css = ".FRpSCG_specForm :where(input,textarea,select,button){box-sizing:border-box}.FRpSCG_specForm{flex-direction:column;gap:12px;display:flex}.FRpSCG_specGroup{flex-direction:column;gap:8px;display:flex}.FRpSCG_modelAxes{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;display:grid}.FRpSCG_specGroupTitle{color:var(--dsw-alias-label-secondary,#61666b);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.FRpSCG_specField{flex-direction:column;gap:6px;display:flex}.FRpSCG_specFieldKey{color:var(--dsw-alias-label-secondary,#61666b);font-size:12px}.FRpSCG_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.FRpSCG_specHint{color:var(--dsw-alias-label-secondary,#61666b);font-size:11px}.FRpSCG_specSelect{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.FRpSCG_specSliderRow{align-items:center;gap:8px;display:flex}.FRpSCG_specSlider{flex:1}.FRpSCG_specSliderValue{color:var(--dsw-alias-label-secondary,#61666b);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.FRpSCG_specTextarea{background:var(--dsw-alias-interactive-bg-hover,#2631480f);border:.5px solid var(--dsw-alias-border-l2,#0000001a);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.FRpSCG_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.FRpSCG_squareOff{opacity:.5;pointer-events:none}.FRpSCG_squareBox{border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.FRpSCG_squareOver{border-color:var(--dsw-alias-border-l3,#00000047);box-shadow:0 0 0 2px var(--dsw-alias-border-l1,#00000014)}.FRpSCG_squareThumb{object-fit:cover;width:100%;height:100%}.FRpSCG_squareGlyph{color:var(--dsw-alias-label-tertiary,#00000073)}.FRpSCG_squareX{background:var(--dsw-alias-bg-module,#fff);border:.5px solid var(--dsw-alias-border-l2,#00000024);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.FRpSCG_squareLabel{color:var(--dsw-alias-label-primary,#0f1115);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.FRpSCG_squareMetric{color:var(--dsw-alias-label-tertiary,#00000073);font-size:10px;line-height:17px}.FRpSCG_squareFileInput{display:none}.FRpSCG_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.FRpSCG_modHead{align-items:baseline;gap:8px;display:flex}.FRpSCG_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.FRpSCG_modHint{opacity:.45;font-size:9px}.FRpSCG_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.FRpSCG_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.FRpSCG_modTile:active{cursor:grabbing}.FRpSCG_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.FRpSCG_modTileStrength{opacity:.55;font-size:9px}.FRpSCG_modAddSquare{border:1px dashed var(--dsw-alias-border-l3,#00000047);cursor:pointer;opacity:.7;height:64px;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:8px;justify-content:center;align-items:center;width:64px;display:flex}.FRpSCG_modAddSquare:hover{background:var(--dsw-alias-interactive-bg-hover,#0000000d);border-color:var(--dsw-alias-border-l4,#0006);opacity:1}.FRpSCG_tileDragging{opacity:.5}.FRpSCG_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.FRpSCG_modLeafFields{gap:8px;display:grid}.FRpSCG_modLeafActions{gap:8px;display:flex}.FRpSCG_modField{flex-direction:column;gap:4px;font-size:11px;display:flex}.FRpSCG_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#8080800f);color:inherit;border-radius:6px;padding:6px 8px;font-size:12px}.FRpSCG_modLeafError{color:#e06c5f;margin:0;font-size:11px}.FRpSCG_pickList{flex-direction:column;gap:4px;max-height:60vh;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.FRpSCG_pickRow{display:block}.FRpSCG_pickBtn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:border-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease), background-color var(--ds-transition-duration,.12s) var(--ds-ease-in-out,ease);background:0 0;border-radius:6px;align-items:center;gap:10px;width:100%;padding:6px;display:flex}.FRpSCG_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4)}.FRpSCG_pickThumb{object-fit:cover;border-radius:4px;flex:none;width:40px;height:40px}.FRpSCG_pickGlyph{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;width:40px;height:40px;font-size:15px;font-weight:600;display:inline-flex}.FRpSCG_pickLabel{text-overflow:ellipsis;white-space:nowrap;font-size:13px;overflow:hidden}.FRpSCG_pickEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.FRpSCG_sourceRow{flex-direction:column;display:flex}.FRpSCG_specSlotRow{flex-wrap:wrap;align-items:flex-start;gap:8px;display:flex}.FRpSCG_specSlotCell{flex-direction:column;gap:4px;display:flex}.FRpSCG_specListBlock{flex-direction:column;gap:6px;display:flex}.FRpSCG_inputRail{gap:10px}";
		const tagId = "@melite/image-mask-studio/card.module.css@20d919d0";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-mask-studio";
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
		//#region src/ui/studio/TuneSection.tsx
		/** The tune keys, in rail order — the layout stays studio logic
		* (Shared vs Refine is a source fact, not a schema fact); the FIELDS
		* (type/min/max/step/label) come from the declaration. */
		const TUNE_KEYS = [
			"detection_threshold",
			"sam_threshold",
			"sam_dilation"
		];
		function tuneFields(spec) {
			if (spec === null) return [];
			const byName = new Map(spec.fields.map((f) => [f.name, f]));
			return TUNE_KEYS.flatMap((k) => {
				const f = byName.get(k);
				return f === void 0 ? [] : [f];
			});
		}
		function TuneSection({ params, source, scopeLabel, hasScope, onChange, onClearScope }) {
			const isDetect = source === "person" || source === "box";
			const [tuneOpen, setTuneOpen] = (0, react.useState)(false);
			const { spec } = useFormSpec("mask-studio");
			const fields = (0, react.useMemo)(() => spec === null ? [] : tuneFields(spec), [spec]);
			const byName = new Map(fields.map((f) => [f.name, f]));
			const row = (name) => {
				const f = byName.get(name);
				if (f === void 0) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SpecFieldRow, {
					f,
					value: params[name],
					onEdit: (key, v) => {
						onChange(key, v);
					}
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: mask_module_css_default.tuneSection,
				"data-tune-section": true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					type: "button",
					"data-tune-toggle": true,
					onClick: () => setTuneOpen((v) => !v),
					"aria-expanded": tuneOpen,
					className: mask_module_css_default.tuneToggle,
					children: ["Tune", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronDown, { className: clsx(mask_module_css_default.sz12, !tuneOpen && mask_module_css_default.tuneChevClosed, mask_module_css_default.tuneChev) })]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(mask_module_css_default.tuneBody, !tuneOpen && mask_module_css_default.tuneHidden),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: mask_module_css_default.groupHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: mask_module_css_default.groupTitle,
								children: "Shared"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: mask_module_css_default.groupNote,
								children: "person + text"
							})]
						}),
						row("detection_threshold"),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: "The marquee (R tool) scopes every producer — Person/Box crop to it, Text constrains to it. Clearing it returns to the full image.",
							side: "top",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-scope-chip": true,
								className: mask_module_css_default.scopeChip,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: mask_module_css_default.scopeChipLabel,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Focus, { className: mask_module_css_default.sz12 }), " Scope"]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: mask_module_css_default.scopeVal,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: mask_module_css_default.scopeValText,
										children: scopeLabel
									}), hasScope && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										type: "button",
										"data-clear-scope": true,
										onClick: onClearScope,
										"aria-label": "Clear scope",
										className: mask_module_css_default.scopeClear,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, { className: mask_module_css_default.sz12 })
									})]
								})]
							})
						})
					] }), isDetect && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.refineTitle,
						children: "Refine"
					}), source === "person" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.refineGrid,
						children: [row("sam_threshold"), row("sam_dilation")]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.refineStack,
						children: [row("sam_dilation"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: mask_module_css_default.refineNote,
							children: "Box mode skips SAM refinement — switch to Person for traced masks."
						})]
					})] })]
				})]
			});
		}
		//#endregion
		//#region src/ui/studio/MaskSourceControls.tsx
		/** THE RAIL — the whole mask param surface in source order. */
		function MaskSourceControls({ params, source, detectMode, exportFace, exportHands, exportBody, sam3Active, scopeLabel, hasScope, detecting, hasInput, boxes, bboxCount, instancesSelected, selectedAll, hasPaint, typeDraft, draftPrompt, stageGeometry, onBboxCount, onBboxRun, onInstancePick, onStageType, onPromptDraft, onGeometry, onAdd, onSegment, onPlay, onChange, onClearScope }) {
			const classOn = {
				face: exportFace,
				hands: exportHands,
				body: exportBody
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: mask_module_css_default.rail,
				"data-mask-source-rail": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: mask_module_css_default.stageSection,
						"data-stage-bbox": true,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: mask_module_css_default.stageHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: mask_module_css_default.stageTitle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoxSelect, { className: mask_module_css_default.sz12 }), " BBox"]
							}), detecting && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loader2, { className: clsx(mask_module_css_default.sz12, mask_module_css_default.accentInk, mask_module_css_default.spin) })]
						}), !boxes ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: mask_module_css_default.countRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: "How many subjects to keep — set BEFORE the run. 0 = all.",
								side: "top",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: mask_module_css_default.stepper,
									"data-bbox-count": true,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											type: "button",
											"data-bbox-dec": true,
											"aria-label": "Fewer boxes",
											onClick: () => onBboxCount(Math.max(0, bboxCount - 1)),
											className: mask_module_css_default.stepBtn,
											children: "−"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: mask_module_css_default.stepVal,
											children: bboxCount === 0 ? "all" : bboxCount
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											type: "button",
											"data-bbox-inc": true,
											"aria-label": "More boxes",
											onClick: () => onBboxCount(Math.min(12, bboxCount + 1)),
											className: mask_module_css_default.stepBtn,
											children: "+"
										})
									]
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: "Run BBox ISOLATED — find the boxes now; no masks yet",
								side: "top",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									"data-bbox-run": true,
									onClick: onBboxRun,
									disabled: !hasInput,
									className: mask_module_css_default.findBtn,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Play, { className: mask_module_css_default.sz10 }), " Find boxes"]
								})
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: mask_module_css_default.stageNote,
							children: "Stage 1 — find the subjects first (optional). The count caps how many BBoxes the next stages use."
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: mask_module_css_default.pickRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								type: "button",
								"data-bbox-all": true,
								onClick: () => onInstancePick(/* @__PURE__ */ new Set()),
								className: clsx(mask_module_css_default.pickBtn, selectedAll ? mask_module_css_default.pickAllOn : mask_module_css_default.pickAllOff),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Expand, { className: mask_module_css_default.sz10 }),
									" All ",
									boxes.length
								]
							}), boxes.map((b) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: `Keep exactly BBox ${b.index + 1} (${b.class}) — one tap`,
								side: "top",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									"data-bbox-pick": b.index,
									onClick: () => onInstancePick(/* @__PURE__ */ new Set([b.index])),
									className: clsx(mask_module_css_default.pickBtn, instancesSelected.has(b.index) ? mask_module_css_default.pickOneOn : mask_module_css_default.pickOneOff),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoxSelect, { className: mask_module_css_default.sz10 }),
										" ",
										b.index + 1
									]
								})
							}, b.index))]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: mask_module_css_default.stageNote,
							children: [boxes.length, " found — tap one to keep exactly it; stages below run scoped to the kept BBoxes."]
						})] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: mask_module_css_default.stageSection,
						"data-stage-type": true,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: mask_module_css_default.stagePlainTitle,
								children: "Mask type"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: mask_module_css_default.pickRow,
								children: [
									DETECT_CLASSES.map(({ key, label, Icon }) => {
										const on = classOn[key] || detectMode === key;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClassChip, {
											cls: key,
											label,
											Icon,
											state: detectMode === key ? "primary" : on ? "extra" : "off",
											onTap: () => onStageType(key)
										}, key);
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: "Text is a CLASS — SAM3 open-vocabulary (GPU)",
										side: "top",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											type: "button",
											"data-type": "text",
											"data-type-active": typeDraft === "text" ? "true" : "false",
											onClick: () => onStageType("text"),
											className: clsx(mask_module_css_default.typeBtn, typeDraft === "text" ? mask_module_css_default.typeTextOn : sam3Active ? mask_module_css_default.typeTextArmed : mask_module_css_default.typeTextOff),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WandSparkles, { className: mask_module_css_default.sz12 }), " text"]
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: hasPaint ? "Paint is a CLASS — the canvas strokes" : "Paint a stroke on the canvas first",
										side: "top",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											type: "button",
											"data-type": "paint",
											"data-type-active": typeDraft === "paint" ? "true" : "false",
											disabled: !hasPaint,
											onClick: () => onStageType("paint"),
											className: clsx(mask_module_css_default.typeBtn, typeDraft === "paint" ? mask_module_css_default.typePaintOn : mask_module_css_default.typePaintOff),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Brush, { className: mask_module_css_default.sz12 }), " paint"]
										})
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: mask_module_css_default.stageNote,
								children: "Stage 2 — what to make the mask from. Text and paint are classes here, not modes; a class + a BBox from stage 1 compose."
							})
						]
					}),
					typeDraft && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: mask_module_css_default.stageSection,
						"data-stage-params": true,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: mask_module_css_default.stagePlainTitle,
								children: typeDraft === "text" ? "Text params" : typeDraft === "paint" ? "Paint params" : `${typeDraft} params`
							}),
							typeDraft === "text" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								type: "text",
								"data-stage-prompt": true,
								value: draftPrompt,
								onChange: (e) => onPromptDraft(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") onAdd();
								},
								placeholder: "What to mask — e.g. shirt, jeans, hat",
								className: mask_module_css_default.promptInput
							}) : typeDraft === "paint" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: mask_module_css_default.paintParamsNote,
								children: "The strokes on the canvas are the params — paint, then ADD."
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: mask_module_css_default.geomRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									"data-stage-geometry": "segm",
									"data-geometry-active": stageGeometry === "segm" ? "true" : "false",
									onClick: () => onGeometry("segm"),
									className: clsx(mask_module_css_default.geomBtn, stageGeometry === "segm" ? mask_module_css_default.geomSegmOn : mask_module_css_default.geomSegmOff),
									children: "Traced (SAM)"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									"data-stage-geometry": "bbox",
									"data-geometry-active": stageGeometry === "bbox" ? "true" : "false",
									onClick: () => onGeometry("bbox"),
									className: clsx(mask_module_css_default.geomBtn, stageGeometry === "bbox" ? mask_module_css_default.geomBboxOn : mask_module_css_default.geomBboxOff),
									children: "Rectangles"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								type: "button",
								"data-stage-add": true,
								onClick: onAdd,
								disabled: typeDraft === "text" && !draftPrompt.trim(),
								className: mask_module_css_default.addBtn,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Plus, { className: mask_module_css_default.sz12 }),
									" Add ",
									typeDraft
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TuneSection, {
						params,
						source,
						scopeLabel,
						hasScope,
						onChange,
						onClearScope
					}),
					sam3Active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Sam3PromptBox, {
						params,
						onSegment,
						hasInput,
						detecting,
						rideAlong: true
					}),
					source === "brush" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: mask_module_css_default.brushHint,
						children: "Pick the brush (B) and paint on the canvas — strokes export as the Paint mask (and as Combined while Person/Box/Text are off)."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.playDock,
						"data-rail-play": true,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							type: "button",
							"data-rail-run": true,
							onClick: onPlay,
							disabled: !onPlay || detecting || !hasInput,
							className: mask_module_css_default.playBtn,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Play, { className: mask_module_css_default.sz14 }), " Play"]
						})
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/NumberField.tsx
		function NumberField({ value, onChange, min, max, step, label, tooltip, className, onCommit }) {
			const [text, setText] = (0, react.useState)(null);
			const clamp = (0, react.useCallback)((v) => {
				if (typeof min === "number" && v < min) return min;
				if (typeof max === "number" && v > max) return max;
				return v;
			}, [min, max]);
			const shown = text ?? (Number.isFinite(value) ? String(value) : "");
			const commit = (0, react.useCallback)(() => {
				if (text === null) return;
				setText(null);
				const n = Number(text);
				if (text !== "" && Number.isFinite(n)) {
					const v = clamp(n);
					onChange(v);
					onCommit?.(v);
				}
			}, [
				text,
				onChange,
				onCommit,
				clamp
			]);
			const labelNode = label ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: mask_module_css_default.nfLabelText,
				children: label
			}) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: clsx(mask_module_css_default.nfWrap, className),
				children: [labelNode && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: mask_module_css_default.nfLabelRow,
					children: tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: tooltip,
						side: "top",
						children: labelNode
					}) : labelNode
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: mask_module_css_default.nfBox,
					"data-numberfield": "",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "number",
						className: mask_module_css_default.nfInput,
						value: shown,
						min,
						max,
						step,
						onChange: (e) => {
							const n = Number(e.target.value);
							if (e.target.value !== "" && Number.isFinite(n)) {
								onChange(clamp(n));
								setText(null);
							} else setText(e.target.value);
						},
						onBlur: commit,
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								e.target.blur();
							} else if (e.key === "Escape") {
								e.preventDefault();
								setText(null);
								e.target.blur();
							}
						},
						onFocus: (e) => {
							setText(e.target.value);
						}
					})
				})]
			});
		}
		//#endregion
		//#region src/ui/studio/viewport.tsx
		const DOCK_GEOMETRY = {
			"top-right": mask_module_css_default.anchorTR,
			"top-left": mask_module_css_default.anchorTL,
			"bottom-right": mask_module_css_default.anchorBR,
			"bottom-left": mask_module_css_default.anchorBL,
			"bottom-center": mask_module_css_default.anchorBC,
			bottom: mask_module_css_default.anchorBottom,
			fill: mask_module_css_default.anchorFill,
			"edge-right": mask_module_css_default.anchorEdgeR,
			"edge-left": mask_module_css_default.anchorEdgeL
		};
		function ViewportAnchor({ dock = "top-right", className, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "viewport-anchor",
				"data-dock": dock,
				className: clsx(mask_module_css_default.anchor, DOCK_GEOMETRY[dock], className),
				...props
			});
		}
		const OVERLAY_DOCK_CLASS = {
			tl: mask_module_css_default.overlayTL,
			tr: mask_module_css_default.overlayTR,
			bl: mask_module_css_default.overlayBL,
			br: mask_module_css_default.overlayBR
		};
		function OverlayChip({ row }) {
			if (row.kind === "status") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: mask_module_css_default.overlayChip,
				children: [
					row.busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Loader2, { className: clsx(mask_module_css_default.sz12, mask_module_css_default.accentInk, mask_module_css_default.spin) }),
					row.icon,
					row.label
				]
			});
			if (row.kind === "toggle") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"aria-pressed": row.active ?? false,
				onClick: () => row.onAct?.(row.id),
				className: clsx(mask_module_css_default.overlayChip, row.active ? mask_module_css_default.overlayToggleOn : mask_module_css_default.overlayToggleOff),
				children: [row.icon, row.label]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: mask_module_css_default.overlaySeg,
				children: (row.options ?? []).map((opt) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-pressed": opt === row.value,
					onClick: () => row.onAct?.(opt),
					className: clsx(mask_module_css_default.overlaySegOpt, opt === row.value && mask_module_css_default.overlaySegLit),
					children: opt
				}, opt))
			});
		}
		/** The renderer: one absolutely-positioned stack per dock corner,
		* rows grouped (same group stacks in declaration order), the whole
		* dock GHOSTED until pointer-near. Empty docks render nothing. */
		function ViewportOverlays({ overlays }) {
			if (overlays.length === 0) return null;
			const docks = /* @__PURE__ */ new Map();
			for (const row of overlays) {
				const list = docks.get(row.dock) ?? [];
				list.push(row);
				docks.set(row.dock, list);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: [...docks.entries()].map(([dock, rows]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-overlay-dock": dock,
				className: clsx(mask_module_css_default.overlayDock, OVERLAY_DOCK_CLASS[dock]),
				children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverlayChip, { row }, row.id))
			}, dock)) });
		}
		function Skeleton({ className, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "skeleton",
				className: clsx(mask_module_css_default.viewSkeleton, mask_module_css_default.pulse, className),
				...props
			});
		}
		function PaintCanvas2D({ containerRef, viewCanvasRef, hasImage, viewSize, imageLoading, dropHighlight, onDrop, onDragOver, onDragLeave, zoom, pan, isZoomed, panDragging, panMode, onPointerDown, onPointerMove, onPointerUp, waiting, empty, children, overlays }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: containerRef,
				onDrop,
				onDragOver,
				onDragLeave,
				className: clsx(mask_module_css_default.viewportWrap, hasImage ? mask_module_css_default.viewportHug : mask_module_css_default.viewportFill, dropHighlight ? mask_module_css_default.viewportDrop : mask_module_css_default.viewportIdle),
				style: hasImage && viewSize ? {
					width: viewSize.w,
					height: viewSize.h
				} : void 0,
				children: [
					imageLoading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "status",
						"aria-busy": "true",
						"aria-label": "Loading image",
						className: mask_module_css_default.loadingVeil,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Skeleton, {})
					}),
					waiting ?? (hasImage ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
						ref: viewCanvasRef,
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerLeave: onPointerUp,
						className: clsx(mask_module_css_default.viewCanvas, panMode ? isZoomed ? mask_module_css_default.viewPanZoomed : mask_module_css_default.viewPanFlat : mask_module_css_default.viewPaint, panDragging && mask_module_css_default.viewDragging),
						style: viewSize ? {
							width: viewSize.w,
							height: viewSize.h,
							touchAction: "none",
							transform: isZoomed ? `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` : void 0,
							transition: panDragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
						} : { touchAction: "none" }
					}) : empty),
					children,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewportOverlays, { overlays: overlays ?? [] })
				]
			});
		}
		//#endregion
		//#region src/ui/studio/DockBtn.tsx
		function DockBtn({ active, onClick, title, children, disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: title,
				side: "top",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					type: "button",
					onClick: () => {
						if (!disabled) onClick();
					},
					"aria-label": title,
					"aria-disabled": disabled || void 0,
					className: clsx(mask_module_css_default.dockBtn, disabled && mask_module_css_default.dockBtnDisabled, active ? mask_module_css_default.dockBtnActive : mask_module_css_default.dockBtnIdle),
					children
				})
			});
		}
		//#endregion
		//#region src/ui/studio/EmptyStateImport.tsx
		function EmptyStateImport({ onPick, onDropAsset, onWire }) {
			const inputRef = (0, react.useRef)(null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: mask_module_css_default.emptyState,
				"data-empty-state": true,
				onDragOver: (e) => {
					if (e.dataTransfer.types.includes("application/tech-noir-asset") || e.dataTransfer.types.includes("Files")) e.preventDefault();
				},
				onDrop: (e) => {
					const asset = e.dataTransfer.getData(ASSET_DRAG_MIME$1);
					if (asset) try {
						const payload = JSON.parse(asset);
						if (payload.url) {
							e.preventDefault();
							e.stopPropagation();
							onDropAsset(payload.url);
							return;
						}
					} catch {}
					const file = e.dataTransfer.files?.[0];
					if (file && file.type.startsWith("image/")) {
						e.preventDefault();
						e.stopPropagation();
						onPick(file);
					}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.emptyIcon,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageUp, { className: clsx(mask_module_css_default.sz28, mask_module_css_default.accentInk) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.emptyTitle,
						children: "Drop an image to mask"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.emptySub,
						children: [
							"Drag & drop, paste, or upload — or drag in from assets",
							onWire ? ", or wire from a previous card" : "",
							"."
						]
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.emptyRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							type: "button",
							onClick: () => inputRef.current?.click(),
							className: mask_module_css_default.uploadBtn,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageUp, { className: mask_module_css_default.sz14 }), " Upload image"]
						}), onWire && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							type: "button",
							onClick: onWire,
							"data-empty-wire": true,
							className: mask_module_css_default.wireBtn,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Link2, { className: mask_module_css_default.sz14 }), " Wire from card"]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: inputRef,
						type: "file",
						accept: "image/png,image/jpeg,image/webp",
						className: mask_module_css_default.hiddenInput,
						onChange: (e) => {
							const f = e.target.files?.[0];
							if (f) onPick(f);
							e.target.value = "";
						}
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/WiredWaiting.tsx
		function WiredWaiting({ upstreamTitle, onUnwire }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: mask_module_css_default.emptyState,
				"data-wired-waiting": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.emptyIcon,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Hourglass, { className: clsx(mask_module_css_default.sz28, mask_module_css_default.accentInk) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: mask_module_css_default.emptyTitle,
						children: [
							"Waiting for ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: mask_module_css_default.emptyTitleAccent,
								children: upstreamTitle
							}),
							" to run"
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.waitingSub,
						children: "This input is wired to a previous card's output. It arrives once that card runs — masking unlocks then. Run the flow up to that stage, or unwire to attach a file now."
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						type: "button",
						onClick: onUnwire,
						"data-wired-unwire": true,
						className: mask_module_css_default.unwireBtn,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Link2, { className: mask_module_css_default.sz14 }), " Unwire"]
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/StudioCanvas.tsx
		function StudioCanvas({ tool, setTool, prepPreviewOn, setPrepPreviewOn, showsSize, brushSize, setBrushSize, selection, inputImage, zoom, setZoom, pan, setPan, isZoomed, resetZoom, hasPaint, clearPaint, colRef, canvasContainerRef, viewCanvasRef, wiredPending, onCanvasDrop, onCanvasDragOver, onCanvasDragLeave, viewSize, dropHighlight, imageLoading, wiredUpstreamTitle, onUnwire, onPointerDown, onPointerMove, onPointerUp, panDragging, isWired, canWire, setWireOpen, boxes, detectMode, recipeDetect, selectedInstances, toggleInstance, importImageFile, attachImage, detecting, prepGrow, setPrepGrow, prepFeather, setPrepFeather, prepCoveragePct, prepSourceLabel, runDetect, clearSelection }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: mask_module_css_default.toolDock,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBtn, {
						active: tool === "move",
						onClick: () => setTool("move"),
						title: "Move / Pan (V)",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Move, { className: mask_module_css_default.sz16 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBtn, {
						active: tool === "brush",
						onClick: () => setTool("brush"),
						title: "Paint mask (B)",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Brush, { className: mask_module_css_default.sz16 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBtn, {
						active: tool === "eraser",
						onClick: () => setTool("eraser"),
						title: "Erase paint (E)",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Eraser, { className: mask_module_css_default.sz16 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: mask_module_css_default.dockDivider }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBtn, {
						active: tool === "rect",
						onClick: () => setTool("rect"),
						title: "Select region (R) — drag a rectangle, then pick Segm or Bbox",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Square, { className: mask_module_css_default.sz16 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: mask_module_css_default.dockDivider }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DockBtn, {
						active: prepPreviewOn,
						onClick: () => setPrepPreviewOn((v) => !v),
						title: "Prep preview (view-only) — how grow/feather will shape the effective mask at the Inpaint card",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Eye, { className: mask_module_css_default.sz16 })
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: colRef,
				className: mask_module_css_default.canvasCol,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: mask_module_css_default.optionsBar,
					children: [
						showsSize ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: mask_module_css_default.sizeLabel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: mask_module_css_default.capsLabel,
								children: "Size"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberField, {
								value: brushSize,
								onChange: setBrushSize,
								min: 2,
								max: 120,
								step: 1,
								className: mask_module_css_default.brushSizeField,
								tooltip: "Brush diameter (px)"
							})]
						}) : tool === "rect" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: mask_module_css_default.rectHint,
							children: [
								"Drag to select a region, then pick ",
								selection ? "a different region" : "Segm or Bbox",
								" to detect inside it."
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: mask_module_css_default.spacer }),
						inputImage && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: mask_module_css_default.zoomRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									onClick: () => setZoom((z) => Math.min(5, z + 1)),
									className: mask_module_css_default.zoomBtn,
									title: "Zoom in (+)",
									children: "+"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: mask_module_css_default.zoomPct,
									children: [Math.round(zoom * 100), "%"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									onClick: () => {
										setZoom((z) => Math.max(1, z - 1));
										if (zoom <= 2) setPan({
											x: 0,
											y: 0
										});
									},
									className: mask_module_css_default.zoomBtn,
									title: "Zoom out (−)",
									children: "−"
								}),
								isZoomed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									onClick: resetZoom,
									className: mask_module_css_default.zoomReset,
									title: "Reset zoom (Esc)",
									children: "Reset"
								})
							]
						}),
						hasPaint && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: "Clear paint layer",
							side: "top",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								type: "button",
								onClick: clearPaint,
								className: mask_module_css_default.clearBtn,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Trash2Alt, { className: mask_module_css_default.sz12 }), " Clear"]
							})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PaintCanvas2D, {
					containerRef: canvasContainerRef,
					viewCanvasRef,
					hasImage: Boolean(inputImage),
					viewSize,
					imageLoading,
					dropHighlight,
					onDrop: wiredPending ? void 0 : onCanvasDrop,
					onDragOver: wiredPending ? void 0 : onCanvasDragOver,
					onDragLeave: wiredPending ? void 0 : onCanvasDragLeave,
					zoom,
					pan,
					isZoomed,
					panDragging,
					panMode: tool === "move",
					onPointerDown,
					onPointerMove,
					onPointerUp,
					waiting: wiredPending ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WiredWaiting, {
						upstreamTitle: wiredUpstreamTitle,
						onUnwire
					}) : void 0,
					empty: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyStateImport, {
						onPick: importImageFile,
						onDropAsset: attachImage,
						onWire: canWire ? () => setWireOpen(true) : void 0
					}),
					overlays: detecting ? [{
						id: "detect",
						kind: "status",
						dock: "tl",
						group: "run",
						label: "Detecting…",
						busy: true
					}] : [],
					children: [
						inputImage && !wiredPending && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [isWired && canWire && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewportAnchor, {
							dock: "top-right",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: `Wired from ${wiredUpstreamTitle} — click to change`,
								side: "top",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									onClick: () => setWireOpen(true),
									"data-wired-badge": true,
									className: mask_module_css_default.wiredBadge,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Link2, { className: mask_module_css_default.sz12 }),
										" ",
										wiredUpstreamTitle
									]
								})
							})
						}), viewSize && boxes && (detectMode !== "none" || recipeDetect) && boxes.map((b) => {
							const on = selectedInstances.has(b.index);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: on ? `BBox${b.index + 1} (${b.class}) — tap to drop it from the mask` : `BBox${b.index + 1} (${b.class}) — tap to keep only this instance`,
								side: "top",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									"data-instance-badge": b.index,
									style: {
										left: b.bbox[0] * viewSize.w,
										top: b.bbox[1] * viewSize.h
									},
									onClick: () => toggleInstance(b.index),
									className: clsx(mask_module_css_default.instanceBadge, on ? mask_module_css_default.instanceOn : mask_module_css_default.instanceOff),
									children: b.index + 1
								})
							}, b.index);
						})] }),
						prepPreviewOn && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ViewportAnchor, {
							"data-prep-preview": true,
							dock: "bottom-left",
							className: mask_module_css_default.prepPanel,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: mask_module_css_default.prepHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: mask_module_css_default.prepTitle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Eye, { className: mask_module_css_default.sz12 }), " Effective mask"]
									}), prepCoveragePct !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: mask_module_css_default.prepPct,
										children: [prepCoveragePct < .1 ? prepCoveragePct.toFixed(2) : prepCoveragePct.toFixed(1), "%"]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: mask_module_css_default.prepLabel,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: mask_module_css_default.prepCaption,
											children: "Grow / Shrink"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "range",
											min: -32,
											max: 32,
											step: 1,
											value: prepGrow,
											onChange: (e) => setPrepGrow(Number(e.target.value)),
											className: mask_module_css_default.prepRange
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: mask_module_css_default.prepVal,
											children: [prepGrow, "px"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: mask_module_css_default.prepLabelStack,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: mask_module_css_default.prepCaption,
											children: "Feather"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "range",
											min: 0,
											max: 32,
											step: 1,
											value: prepFeather,
											onChange: (e) => setPrepFeather(Number(e.target.value)),
											className: mask_module_css_default.prepRange
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: mask_module_css_default.prepVal,
											children: [prepFeather, "px"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: mask_module_css_default.prepNote,
									children: [
										"Source: ",
										prepSourceLabel || "…",
										". View-only — the Inpaint card applies grow/feather at run time; this studio writes raw masks."
									]
								})
							]
						}),
						selection && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ViewportAnchor, {
							"data-selection-bar": true,
							dock: "bottom-center",
							className: mask_module_css_default.selBar,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: mask_module_css_default.selSize,
									children: [
										Math.round(selection.w),
										"×",
										Math.round(selection.h),
										" px"
									]
								}),
								detectMode === "none" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"data-sam3-scope-hint": true,
									className: mask_module_css_default.scopeHint,
									children: "Detect off — the selection scopes a SAM3 prompt"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: "YOLO + SAM — precise object masks inside the selection",
									side: "top",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										type: "button",
										"data-detect-segm": true,
										onClick: () => runDetect("segm"),
										className: mask_module_css_default.segmBtn,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScanFace, { className: mask_module_css_default.sz12 }), " Segm"]
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: "YOLO only — fast bounding boxes inside the selection",
									side: "top",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										type: "button",
										"data-detect-bbox": true,
										onClick: () => runDetect("bbox"),
										className: mask_module_css_default.bboxBtn,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Square, { className: mask_module_css_default.sz12 }), " Bbox"]
									})
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: "Clear selection",
									side: "top",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										type: "button",
										onClick: clearSelection,
										"data-clear-selection": true,
										"aria-label": "Clear selection",
										className: mask_module_css_default.selClear,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(X, { className: mask_module_css_default.sz14 })
									})
								})
							]
						})
					]
				})]
			})] });
		}
		//#endregion
		//#region src/ui/studio/useStudioRefs.ts
		function useStudioRefs() {
			return {
				viewCanvasRef: (0, react.useRef)(null),
				canvasContainerRef: (0, react.useRef)(null),
				paintCanvasRef: (0, react.useRef)(null),
				imgCacheRef: (0, react.useRef)(/* @__PURE__ */ new Map()),
				tintCacheRef: (0, react.useRef)(/* @__PURE__ */ new Map()),
				drawingRef: (0, react.useRef)(false),
				lastPtRef: (0, react.useRef)(null),
				rectDragRef: (0, react.useRef)(null),
				selectionRef: (0, react.useRef)(null),
				imgSizeRef: (0, react.useRef)({
					w: 0,
					h: 0
				}),
				paintRestoredForRef: (0, react.useRef)(null),
				selectionClearedForRef: (0, react.useRef)(null),
				paintTintRef: (0, react.useRef)(null),
				rafRef: (0, react.useRef)(null),
				prepOverlayRef: (0, react.useRef)(null),
				colRef: (0, react.useRef)(null),
				availRef: (0, react.useRef)({
					w: 0,
					h: 0
				}),
				didPanDragRef: (0, react.useRef)(false),
				lastClassRef: (0, react.useRef)("body")
			};
		}
		//#endregion
		//#region src/ui/studio/useInstances.ts
		function useInstances({ params, artifacts, stage, onSave, onSaveProp, onRun }) {
			const recipeOutputs = (0, react.useMemo)(() => Array.isArray(params.outputs) && params.outputs.length ? params.outputs : null, [params.outputs]);
			/** True when the recipe arms the detect producer (the flat detect_mode
			*  may still say "none" — the recipe OVERRIDES it at the brick). */
			const recipeDetect = Boolean(recipeOutputs?.some((e) => e.selection?.kind === "detect"));
			const boxesUrl = artifacts.detect_boxes ?? null;
			const [boxes, setBoxes] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!boxesUrl || boxesUrl.startsWith("data:")) {
					setBoxes(null);
					return;
				}
				let cancelled = false;
				fetch(boxesUrl).then((r) => r.ok ? r.json() : null).then((d) => {
					if (!cancelled) setBoxes(d?.boxes?.length ? d.boxes : null);
				}).catch(() => {
					if (!cancelled) setBoxes(null);
				});
				return () => {
					cancelled = true;
				};
			}, [boxesUrl]);
			/** Which instances the current instance_filter selects — derived from
			*  params (agent-writable), never badge-local state. */
			const selectedInstances = (0, react.useMemo)(() => {
				const all = new Set((boxes ?? []).map((b) => b.index));
				if (all.size === 0) return all;
				if (recipeOutputs) {
					const f = recipeOutputs.find((e) => e.selection?.kind === "detect")?.filter;
					if (!f || f.kind !== "instance") return all;
					if (f.keep === "largest") return /* @__PURE__ */ new Set([0]);
					const raw = Array.isArray(f.keep) ? f.keep : typeof f.keep === "string" ? f.keep.split(",") : f.keep !== void 0 ? [f.keep] : [];
					return new Set(raw.map(Number).filter((n) => all.has(n)));
				}
				const v = params.instance_filter;
				if (Array.isArray(v)) return new Set(v.map(Number).filter((n) => all.has(n)));
				const s = typeof v === "string" ? v.trim().toLowerCase() : "";
				if (!s || s === "all") return all;
				if (s === "largest") return /* @__PURE__ */ new Set([0]);
				return new Set(s.split(",").map((p) => Number(p.trim())).filter((n) => all.has(n)));
			}, [
				boxes,
				params.instance_filter,
				recipeOutputs
			]);
			const filterActive = (boxes?.length ?? 0) > 0 && selectedInstances.size < boxes.length;
			/** The recipe FILTER line while a filter is active: "BBox 1" / "BBox 1,3". */
			const instanceLabel = filterActive ? `BBox ${Array.from(selectedInstances).sort((a, b) => a - b).map((i) => i + 1).join(",")}` : null;
			const applyPrimaryKeep = (keep) => {
				if (!boxes) return;
				const keepAll = keep.size === 0 || keep.size === boxes.length;
				if (recipeOutputs) {
					const first = recipeOutputs.findIndex((e) => e.selection?.kind === "detect");
					if (first < 0) return;
					const outputs = recipeOutputs.map((e, i) => {
						if (i !== first) return e;
						if (keepAll) {
							const rest = { ...e };
							delete rest.filter;
							return rest;
						}
						return {
							...e,
							filter: {
								kind: "instance",
								keep: Array.from(keep).sort((a, b) => a - b)
							}
						};
					});
					onSaveProp({
						...stage.params,
						outputs
					});
				} else {
					const value = keepAll ? "all" : Array.from(keep).sort((a, b) => a - b).join(",");
					onSave({
						...stage.params,
						instance_filter: value
					});
				}
				onRun?.();
			};
			/** Badge tap = TOGGLE (symmetric diff) — the canvas interaction. */
			const toggleInstance = (idx) => {
				if (!boxes) return;
				const next = new Set(selectedInstances);
				if (next.has(idx)) next.delete(idx);
				else next.add(idx);
				applyPrimaryKeep(next);
			};
			/** Chip tap = SWITCH — exactly this instance, one tap. The lone active
			*  chip taps back to all. This is the bar's "ability to switch"
			*  (BBox1 ↔ BBox2) — visible in the FILTER tier, no badge hunt. */
			const switchInstance = (idx) => {
				if (!boxes) return;
				if (selectedInstances.size === 1 && selectedInstances.has(idx)) {
					applyPrimaryKeep(/* @__PURE__ */ new Set());
					return;
				}
				applyPrimaryKeep(/* @__PURE__ */ new Set([idx]));
			};
			/** applyPrimaryKeep WITHOUT the auto re-run — the sidebar's stage-1
			* picks write the filter; the NEXT run (play / ADD / canvas gesture)
			* applies it. The bar chips keep the one-gesture re-run. */
			const applyPrimaryKeepSilent = (keep) => {
				if (!boxes) return;
				const keepAll = keep.size === 0 || keep.size === boxes.length;
				if (recipeOutputs) {
					const first = recipeOutputs.findIndex((e) => e.selection?.kind === "detect");
					if (first < 0) return;
					const outputs = recipeOutputs.map((e, i) => {
						if (i !== first) return e;
						if (keepAll) {
							const rest = { ...e };
							delete rest.filter;
							return rest;
						}
						return {
							...e,
							filter: {
								kind: "instance",
								keep: Array.from(keep).sort((a, b) => a - b)
							}
						};
					});
					onSaveProp({
						...stage.params,
						outputs
					});
				} else {
					const value = keepAll ? "all" : Array.from(keep).sort((a, b) => a - b).join(",");
					onSave({
						...stage.params,
						instance_filter: value
					});
				}
			};
			return {
				recipeOutputs,
				recipeDetect,
				boxesUrl,
				boxes,
				selectedInstances,
				filterActive,
				instanceLabel,
				applyPrimaryKeep,
				applyPrimaryKeepSilent,
				toggleInstance,
				switchInstance
			};
		}
		//#endregion
		//#region src/ui/studio/useImageLoader.ts
		function useImageLoader({ imgCacheRef, paintCanvasRef }) {
			return {
				loadImage: (0, react.useCallback)((url) => {
					const cache = imgCacheRef.current;
					const hit = cache.get(url);
					if (hit && hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
					return new Promise((resolve) => {
						const img = new Image();
						img.crossOrigin = "anonymous";
						img.onload = () => {
							cache.set(url, img);
							resolve(img);
						};
						img.onerror = () => resolve(null);
						img.src = url;
					});
				}, []),
				ensurePaintCanvas: (0, react.useCallback)((w, h) => {
					if (!paintCanvasRef.current) paintCanvasRef.current = document.createElement("canvas");
					const pc = paintCanvasRef.current;
					if (pc.width !== w || pc.height !== h) {
						if (pc.width && pc.height) {
							const tmp = document.createElement("canvas");
							tmp.width = pc.width;
							tmp.height = pc.height;
							tmp.getContext("2d").drawImage(pc, 0, 0);
							pc.width = w;
							pc.height = h;
							pc.getContext("2d").drawImage(tmp, 0, 0, w, h);
						} else {
							pc.width = w;
							pc.height = h;
						}
					}
					return pc;
				}, [])
			};
		}
		//#endregion
		//#region src/ui/studio/useCanvasView.ts
		function useCanvasView({ stage, inputImage, artifacts, masks, hasPaint, boxes, selectedInstances, setSelection, setHasPaint, setPaintVersion, onSave, refs }) {
			const { viewCanvasRef, canvasContainerRef, paintCanvasRef, imgCacheRef, tintCacheRef, rectDragRef, selectionRef, imgSizeRef, paintRestoredForRef, selectionClearedForRef, paintTintRef, rafRef, prepOverlayRef, colRef, availRef } = refs;
			const params = stage.params;
			const [zoom, setZoom] = (0, react.useState)(1);
			const [pan, setPan] = (0, react.useState)({
				x: 0,
				y: 0
			});
			const [panDragging, setPanDragging] = (0, react.useState)(null);
			const isZoomed = zoom > 1;
			const zoomRef = (0, react.useRef)(zoom);
			zoomRef.current = zoom;
			const panRef = (0, react.useRef)(pan);
			panRef.current = pan;
			const resetZoom = (0, react.useCallback)(() => {
				setZoom(1);
				setPan({
					x: 0,
					y: 0
				});
			}, []);
			/** Clamp pan so the zoomed canvas can never be scrolled past its edges. */
			const clampPanFor = (0, react.useCallback)((x, y, z) => {
				const el = canvasContainerRef.current;
				const cvs = viewCanvasRef.current;
				if (!el || !cvs) return {
					x,
					y
				};
				const cRect = el.getBoundingClientRect();
				const scaledW = cvs.offsetWidth * z;
				const scaledH = cvs.offsetHeight * z;
				const maxX = Math.max(0, (scaledW - cRect.width) / 2);
				const maxY = Math.max(0, (scaledH - cRect.height) / 2);
				return {
					x: Math.min(maxX, Math.max(-maxX, x)),
					y: Math.min(maxY, Math.max(-maxY, y))
				};
			}, []);
			/** Zoom keeping the screen-space point under (sx, sy) pinned. */
			const zoomToPoint = (0, react.useCallback)((target, sx, sy) => {
				const el = canvasContainerRef.current;
				if (!el) {
					setZoom(target);
					return;
				}
				const rect = el.getBoundingClientRect();
				const offX = sx - rect.left - rect.width / 2;
				const offY = sy - rect.top - rect.height / 2;
				const z0 = zoomRef.current, p0 = panRef.current;
				const q = {
					x: (offX - p0.x) / z0,
					y: (offY - p0.y) / z0
				};
				setZoom(target);
				setPan(clampPanFor(offX - q.x * target, offY - q.y * target, target));
			}, [clampPanFor]);
			const { loadImage, ensurePaintCanvas } = useImageLoader({
				imgCacheRef,
				paintCanvasRef
			});
			const [viewSize, setViewSize] = (0, react.useState)(null);
			const [imageLoading, setImageLoading] = (0, react.useState)(Boolean(inputImage));
			const redraw = (0, react.useCallback)(() => {
				const view = viewCanvasRef.current;
				if (!view) return;
				const ctx = view.getContext("2d");
				const { w, h } = imgSizeRef.current;
				if (!w || !h) return;
				if (view.width !== w || view.height !== h) {
					view.width = w;
					view.height = h;
				}
				ctx.clearRect(0, 0, w, h);
				const cache = imgCacheRef.current;
				const base = inputImage ? cache.get(inputImage) : null;
				if (!base || !base.complete || base.naturalWidth === 0) {
					ctx.fillStyle = "#0e0e1a";
					ctx.fillRect(0, 0, w, h);
					return;
				}
				ctx.drawImage(base, 0, 0, w, h);
				const tint = tintCacheRef.current;
				for (const m of masks) {
					const mask = cache.get(m.url);
					if (!mask || !mask.complete || mask.naturalWidth === 0) continue;
					const ck = `${m.url}::${m.color}::${w}x${h}`;
					let tinted = tint.get(ck);
					if (!tinted) {
						tinted = makeTinted(mask, m.color, w, h);
						tint.set(ck, tinted);
					}
					ctx.globalAlpha = DETECTOR_ALPHA;
					ctx.drawImage(tinted, 0, 0);
					ctx.globalAlpha = 1;
				}
				if (paintCanvasRef.current && hasPaint) {
					if (!paintTintRef.current) paintTintRef.current = document.createElement("canvas");
					const pt = paintTintRef.current;
					if (pt.width !== w || pt.height !== h) {
						pt.width = w;
						pt.height = h;
					}
					const ptx = pt.getContext("2d");
					ptx.clearRect(0, 0, w, h);
					ptx.drawImage(paintCanvasRef.current, 0, 0, w, h);
					ptx.globalCompositeOperation = "source-in";
					ptx.fillStyle = PAINT_COLOR;
					ptx.fillRect(0, 0, w, h);
					ptx.globalCompositeOperation = "source-over";
					ctx.globalAlpha = PAINT_ALPHA;
					ctx.drawImage(pt, 0, 0);
					ctx.globalAlpha = 1;
				}
				if (prepOverlayRef.current) {
					ctx.globalAlpha = PREP_ALPHA;
					ctx.drawImage(prepOverlayRef.current, 0, 0, w, h);
					ctx.globalAlpha = 1;
				}
				if (boxes && boxes.length > 0) for (const b of boxes) {
					const [nx, ny, nw, nh] = b.bbox;
					const bx = nx * w, by = ny * h, bw2 = nw * w, bh2 = nh * h;
					const on = selectedInstances.has(b.index);
					ctx.strokeStyle = INSTANCE_COLOR;
					if (on) {
						ctx.globalAlpha = .1;
						ctx.fillStyle = INSTANCE_COLOR;
						ctx.fillRect(bx, by, bw2, bh2);
						ctx.globalAlpha = .95;
						ctx.setLineDash([]);
						ctx.strokeRect(bx, by, bw2, bh2);
					} else {
						ctx.globalAlpha = .35;
						ctx.setLineDash([4, 3]);
						ctx.strokeRect(bx, by, bw2, bh2);
						ctx.setLineDash([]);
					}
					ctx.globalAlpha = 1;
				}
				const drag = rectDragRef.current;
				if (drag) {
					const rx = Math.min(drag.sx, drag.cx), ry = Math.min(drag.sy, drag.cy);
					const rw = Math.abs(drag.cx - drag.sx), rh = Math.abs(drag.cy - drag.sy);
					if (rw > 0 && rh > 0) {
						ctx.fillStyle = SEL_STROKE;
						ctx.globalAlpha = .18;
						ctx.fillRect(rx, ry, rw, rh);
						ctx.globalAlpha = 1;
						ctx.lineWidth = 1.5;
						ctx.strokeStyle = SEL_STROKE;
						ctx.strokeRect(rx, ry, rw, rh);
					}
				} else {
					const s = selectionRef.current;
					if (s) {
						ctx.fillStyle = SEL_STROKE;
						ctx.globalAlpha = .12;
						ctx.fillRect(s.x, s.y, s.w, s.h);
						ctx.globalAlpha = 1;
						ctx.lineWidth = 1.5;
						ctx.strokeStyle = SEL_STROKE;
						ctx.setLineDash([6, 4]);
						ctx.strokeRect(s.x, s.y, s.w, s.h);
						ctx.setLineDash([]);
					}
				}
			}, [
				masks,
				hasPaint,
				inputImage,
				boxes,
				selectedInstances
			]);
			/** Coalesced redraw — at most ONE paint per display frame. Pointer-move
			* events can outpace the refresh rate (120Hz pointers on a 60Hz panel),
			* and calling redraw() synchronously on every event meant 120 full-canvas
			* composites/sec. scheduleRedraw collapses the burst: the first move in
			* a frame schedules a rAF; subsequent moves in the SAME frame no-op (the
			* scheduled rAF will read the latest paint-canvas state anyway). The
			* stroke stays responsive — the paint canvas is stroked synchronously in
			* paintSegment; only the (heavier) composite is deferred to the frame. */
			const scheduleRedraw = (0, react.useCallback)(() => {
				if (rafRef.current != null) return;
				rafRef.current = requestAnimationFrame(() => {
					rafRef.current = null;
					redraw();
				});
			}, [redraw]);
			/** Synchronous redraw + cancel any pending coalesced one. Used at stroke
			* END (commit) so the persisted paint_mask matches the on-screen pixels. */
			const flushRedraw = (0, react.useCallback)(() => {
				if (rafRef.current != null) {
					cancelAnimationFrame(rafRef.current);
					rafRef.current = null;
				}
				redraw();
			}, [redraw]);
			/** Latest `redraw`, stable by reference. The load effect below must NOT
			* depend on `redraw` directly — `redraw` changes identity whenever
			* `layers` does (e.g. a rename), which re-ran the whole load flow
			* (imageLoading flicker + paint restore) on every layer tweak. Calling
			* through the ref keeps the effect keyed to REAL input changes only. */
			const redrawRef = (0, react.useRef)(redraw);
			redrawRef.current = redraw;
			const fitView = (0, react.useCallback)(() => {
				const { w: iw, h: ih } = imgSizeRef.current;
				const { w: aw, h: ah } = availRef.current;
				if (!iw || !ih || !aw || !ah) return;
				const s = Math.min(1, aw / iw, ah / ih);
				const dw = Math.max(1, Math.round(iw * s));
				const dh = Math.max(1, Math.round(ih * s));
				setViewSize((v) => v && v.w === dw && v.h === dh ? v : {
					w: dw,
					h: dh
				});
			}, []);
			(0, react.useEffect)(() => {
				const el = colRef.current;
				if (!el) return;
				const measure = () => {
					const r = el.getBoundingClientRect();
					availRef.current = {
						w: Math.max(0, r.width),
						h: Math.max(0, r.height - 46)
					};
					fitView();
				};
				measure();
				const ro = new ResizeObserver(measure);
				ro.observe(el);
				return () => ro.disconnect();
			}, [fitView]);
			(0, react.useEffect)(() => () => {
				if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			}, []);
			(0, react.useEffect)(() => {
				const el = canvasContainerRef.current;
				if (!el) return;
				const onWheel = (e) => {
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						const cur = zoomRef.current;
						const raw = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
						let factor = Math.abs(raw) >= 50 ? raw < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR : Math.exp(-raw * WHEEL_PINCH_SENSITIVITY);
						factor = Math.max(.5, Math.min(2, factor));
						const next = clampZoom(cur * factor);
						if (next !== cur) zoomToPoint(next, e.clientX, e.clientY);
						return;
					}
					if (zoomRef.current <= 1) return;
					e.preventDefault();
					const p = panRef.current;
					setPan(clampPanFor(p.x - e.deltaX, p.y - e.deltaY, zoomRef.current));
				};
				el.addEventListener("wheel", onWheel, { passive: false });
				return () => el.removeEventListener("wheel", onWheel);
			}, [zoomToPoint, clampPanFor]);
			(0, react.useEffect)(() => {
				resetZoom();
			}, [inputImage, resetZoom]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				if (inputImage && selectionClearedForRef.current !== inputImage) {
					selectionClearedForRef.current = inputImage;
					selectionRef.current = null;
					setSelection(null);
					if (stage.params.roi) onSave({
						...stage.params,
						roi: ""
					});
				}
				if (!inputImage) {
					imgSizeRef.current = {
						w: 800,
						h: 560
					};
					ensurePaintCanvas(800, 560);
					setViewSize(null);
					setImageLoading(false);
					redrawRef.current();
					return;
				}
				setImageLoading(true);
				loadImage(inputImage).then(async (img) => {
					if (cancelled) return;
					if (!img) {
						setImageLoading(false);
						return;
					}
					let w = img.naturalWidth, h = img.naturalHeight;
					const maxEdge = Math.max(w, h);
					if (maxEdge > 1024) {
						const s = MAX_CANVAS_EDGE / maxEdge;
						w = Math.round(w * s);
						h = Math.round(h * s);
					}
					imgSizeRef.current = {
						w,
						h
					};
					ensurePaintCanvas(w, h);
					const colEl = colRef.current;
					if (colEl) {
						const r = colEl.getBoundingClientRect();
						availRef.current = {
							w: Math.max(0, r.width),
							h: Math.max(0, r.height - 46)
						};
					}
					fitView();
					const pm = params.paint_mask;
					if (pm && paintRestoredForRef.current !== inputImage) {
						paintRestoredForRef.current = inputImage;
						const pimg = await loadImage(pm);
						if (!cancelled && pimg && paintCanvasRef.current) {
							const cx = paintCanvasRef.current.getContext("2d");
							cx.clearRect(0, 0, w, h);
							cx.drawImage(pimg, 0, 0, w, h);
							const px = cx.getImageData(0, 0, w, h);
							const [REDACTED 2026-11-05] = px.data;
							for (let i = 0; i < [REDACTED 2026-11-05].length; i += 4) [REDACTED 2026-11-05][i + 3] = [REDACTED 2026-11-05][i];
							cx.putImageData(px, 0, 0);
							setHasPaint(true);
							setPaintVersion((v) => v + 1);
						}
					}
					setImageLoading(false);
					redrawRef.current();
				});
				for (const d of DETECTOR_DEFS) {
					const u = artifacts[d.key];
					if (u) loadImage(u);
				}
				const sam3Url = artifacts.mask_sam3;
				if (sam3Url) loadImage(sam3Url);
				return () => {
					cancelled = true;
				};
			}, [
				inputImage,
				artifacts,
				loadImage,
				ensurePaintCanvas,
				fitView
			]);
			(0, react.useEffect)(() => {
				redraw();
			}, [redraw]);
			return {
				zoom,
				setZoom,
				pan,
				setPan,
				panDragging,
				setPanDragging,
				isZoomed,
				resetZoom,
				zoomToPoint,
				clampPanFor,
				viewSize,
				imageLoading,
				redraw,
				scheduleRedraw,
				flushRedraw,
				redrawRef,
				fitView
			};
		}
		//#endregion
		//#region src/ui/studio/usePaintTools.ts
		function usePaintTools({ stage, artifacts, inputImage, hasPaint, setHasPaint, setPaintVersion, setSelection, view, onSave, onRun, refs }) {
			const { viewCanvasRef, paintCanvasRef, drawingRef, lastPtRef, rectDragRef, selectionRef, imgSizeRef, didPanDragRef } = refs;
			const { isZoomed, pan, zoom, setPan, panDragging, setPanDragging, clampPanFor, zoomToPoint, resetZoom, scheduleRedraw, flushRedraw } = view;
			const [tool, setTool] = (0, react.useState)("move");
			const [brushSize, setBrushSize] = (0, react.useState)(28);
			const toCanvasPoint = (e) => {
				const view = viewCanvasRef.current;
				const rect = view.getBoundingClientRect();
				return {
					x: (e.clientX - rect.left) * (view.width / rect.width),
					y: (e.clientY - rect.top) * (view.height / rect.height)
				};
			};
			const paintSegment = (from, to) => {
				const pc = paintCanvasRef.current;
				if (!pc) return;
				const cx = pc.getContext("2d");
				cx.lineCap = "round";
				cx.lineJoin = "round";
				cx.lineWidth = brushSize;
				cx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
				cx.strokeStyle = "#ffffff";
				cx.beginPath();
				if (from) cx.moveTo(from.x, from.y);
				else cx.moveTo(to.x, to.y);
				cx.lineTo(to.x, to.y);
				cx.stroke();
				cx.globalAlpha = 1;
				cx.globalCompositeOperation = "source-over";
				if (!hasPaint) setHasPaint(true);
				scheduleRedraw();
			};
			const onPointerDown = (e) => {
				if (!inputImage) return;
				if (tool === "move") {
					if (!isZoomed) return;
					didPanDragRef.current = false;
					setPanDragging({
						x: e.clientX - pan.x,
						y: e.clientY - pan.y
					});
					e.preventDefault();
					e.target.setPointerCapture(e.pointerId);
					return;
				}
				e.preventDefault();
				e.target.setPointerCapture(e.pointerId);
				const pt = toCanvasPoint(e);
				if (tool === "rect") {
					selectionRef.current = null;
					setSelection(null);
					rectDragRef.current = {
						sx: pt.x,
						sy: pt.y,
						cx: pt.x,
						cy: pt.y
					};
					scheduleRedraw();
					return;
				}
				drawingRef.current = true;
				lastPtRef.current = pt;
				paintSegment(null, pt);
			};
			const onPointerMove = (e) => {
				if (panDragging) {
					didPanDragRef.current = true;
					setPan(clampPanFor(e.clientX - panDragging.x, e.clientY - panDragging.y, zoom));
					return;
				}
				if (rectDragRef.current) {
					const pt = toCanvasPoint(e);
					rectDragRef.current.cx = pt.x;
					rectDragRef.current.cy = pt.y;
					scheduleRedraw();
					return;
				}
				if (!drawingRef.current) return;
				const pt = toCanvasPoint(e);
				paintSegment(lastPtRef.current, pt);
				lastPtRef.current = pt;
			};
			const onPointerUp = (e) => {
				if (panDragging) {
					const wasDrag = didPanDragRef.current;
					setPanDragging(null);
					try {
						e.target.releasePointerCapture(e.pointerId);
					} catch {}
					if (!wasDrag) {
						if (isZoomed) resetZoom();
						else zoomToPoint(2, e.clientX, e.clientY);
					}
					return;
				}
				if (rectDragRef.current) {
					const pt = toCanvasPoint(e);
					rectDragRef.current.cx = pt.x;
					rectDragRef.current.cy = pt.y;
					try {
						e.target.releasePointerCapture(e.pointerId);
					} catch {}
					commitSelection();
					return;
				}
				if (!drawingRef.current) return;
				drawingRef.current = false;
				try {
					e.target.releasePointerCapture(e.pointerId);
				} catch {}
				commitPaint();
			};
			/** Serialize the paint canvas → white-on-black RGB → params.paint_mask.
			* flushRedraw first so the on-screen composite matches the persisted
			* payload (no pending coalesced redraw from the last move segment). */
			const commitPaint = (0, react.useCallback)(() => {
				flushRedraw();
				const pc = paintCanvasRef.current;
				if (!pc) return;
				const out = document.createElement("canvas");
				out.width = pc.width;
				out.height = pc.height;
				const cx = out.getContext("2d");
				cx.fillStyle = "#000000";
				cx.fillRect(0, 0, out.width, out.height);
				cx.drawImage(pc, 0, 0);
				setPaintVersion((v) => v + 1);
				onSave({
					...stage.params,
					paint_mask: out.toDataURL("image/png"),
					export_paint: true
				});
			}, [
				flushRedraw,
				onSave,
				stage.params
			]);
			/** Commit the rect drag → persistent selection marquee (clamped into
			* the canvas). NO param write — params move only when the user picks
			* Segm or Bbox (one gesture writes output_mode + roi + runs). A
			* degenerate drag (click without a drag) clears the selection. */
			const commitSelection = () => {
				const r = rectDragRef.current;
				rectDragRef.current = null;
				if (!r) {
					flushRedraw();
					return;
				}
				const { w: cw, h: ch } = imgSizeRef.current;
				const x = Math.min(r.sx, r.cx), y = Math.min(r.sy, r.cy);
				let w = Math.abs(r.cx - r.sx), h = Math.abs(r.cy - r.sy);
				if (w < 2 || h < 2) {
					selectionRef.current = null;
					setSelection(null);
					flushRedraw();
					return;
				}
				const x0 = Math.max(0, Math.min(x, cw - 2));
				const y0 = Math.max(0, Math.min(y, ch - 2));
				w = Math.min(w, cw - x0);
				h = Math.min(h, ch - y0);
				const rect = {
					x: x0,
					y: y0,
					w,
					h
				};
				selectionRef.current = rect;
				setSelection(rect);
				flushRedraw();
			};
			/** The selection's Segm/Bbox action: write output_mode + normalized roi
			* to the card, then RUN — detection is one gesture ("they are presented
			* buttons… for the yolo model to detect"). roi = "" with no selection →
			* full-image detect (the brick's _parse_roi treats "" as None).
			* Export is AUTO — no checkboxes: every mask the card can produce is
			* exported. "Available" = the artifact already came back in a run (a
			* detector layer exists) OR it is the currently armed detect mode (the
			* first run has no artifact yet — without the mode clause the very
			* first detection would export nothing and the artifact would never
			* appear, a chicken-and-egg the old checkbox UI papered over). */
			const runDetect = (mode) => {
				const sel = selectionRef.current;
				const { w: cw, h: ch } = imgSizeRef.current;
				const roi = sel && cw > 0 && ch > 0 ? [
					Number((sel.x / cw).toFixed(4)),
					Number((sel.y / ch).toFixed(4)),
					Number((sel.w / cw).toFixed(4)),
					Number((sel.h / ch).toFixed(4))
				] : "";
				const p = stage.params;
				const autoExports = {
					export_face: Boolean(artifacts.mask_face) || p.detect_mode === "face",
					export_hands: Boolean(artifacts.mask_hands) || p.detect_mode === "hands",
					export_body: Boolean(artifacts.mask_body) || p.detect_mode === "body",
					export_paint: hasPaint,
					export_boxes: true
				};
				onSave({
					...p,
					output_mode: mode,
					roi,
					...autoExports
				});
				onRun?.();
			};
			/** The SAM3 gesture (2026-08-10): persist the prompt + the marquee's
			* normalized roi (scoping), then RUN — one gesture, same as Segm/Bbox.
			* Export is AUTO — the prompt alone activates mask_sam3 (emit_when). */
			const runSam3 = (prompt) => {
				const trimmed = prompt.trim();
				if (!trimmed) return;
				const sel = selectionRef.current;
				const { w: cw, h: ch } = imgSizeRef.current;
				const roi = sel && cw > 0 && ch > 0 ? [
					Number((sel.x / cw).toFixed(4)),
					Number((sel.y / ch).toFixed(4)),
					Number((sel.w / cw).toFixed(4)),
					Number((sel.h / ch).toFixed(4))
				] : "";
				onSave({
					...stage.params,
					sam3_prompt: trimmed,
					roi
				});
				onRun?.();
			};
			/** Clear the marquee + the stale roi param — a later full-image run must
			* never be scoped by a ghost selection. */
			const clearSelection = () => {
				selectionRef.current = null;
				setSelection(null);
				onSave({
					...stage.params,
					roi: ""
				});
				flushRedraw();
			};
			const clearPaint = () => {
				const pc = paintCanvasRef.current;
				if (!pc) return;
				pc.getContext("2d").clearRect(0, 0, pc.width, pc.height);
				setHasPaint(false);
				setPaintVersion((v) => v + 1);
				onSave({
					...stage.params,
					paint_mask: "",
					export_paint: false
				});
				flushRedraw();
			};
			return {
				tool,
				setTool,
				brushSize,
				setBrushSize,
				onPointerDown,
				onPointerMove,
				onPointerUp,
				commitPaint,
				commitSelection,
				runDetect,
				runSam3,
				clearSelection,
				clearPaint
			};
		}
		//#endregion
		//#region src/ui/studio/useStageRail.ts
		function useStageRail({ stage, refs, onSave, onRun }) {
			const { selectionRef, imgSizeRef, lastClassRef } = refs;
			const [bboxCount, setBboxCount] = (0, react.useState)(0);
			/** Stage 1's count write — "I CAN SELECT THE NUMBER BEFOREHAND": the
			* stepper persists max_instances THE MOMENT it moves (0 = all), so the
			* cap rides the NEXT run however it's launched (stage-1 play, ADD,
			* canvas gesture). Not an onSave on every tap of the same value. */
			const setBboxCountCapped = (n) => {
				setBboxCount(n);
				const p = stage.params;
				if (p.max_instances === (n || void 0)) return;
				onSave({
					...p,
					max_instances: n
				});
			};
			/** Stage 1's isolated run — detect_mode keeps the last class (YOLO
			* needs one), output_mode=bbox, exports OFF, boxes ON: the run's ONLY
			* product is the manifest. Carries the chosen count (max_instances)
			* and stays FULL-IMAGE (roi "") — the manifest is the vocabulary. */
			const runBboxIsolated = () => {
				const p = stage.params;
				onSave({
					...p,
					detect_mode: p.detect_mode === "none" ? lastClassRef.current : p.detect_mode,
					output_mode: "bbox",
					export_face: false,
					export_hands: false,
					export_body: false,
					export_paint: false,
					export_boxes: true,
					max_instances: bboxCount,
					roi: ""
				});
				onRun?.();
			};
			/** Stage 2: open a type's param section (stage 3). Re-tapping the open
			* type closes it. */
			const [typeDraft, setTypeDraft] = (0, react.useState)(null);
			const [promptDraft, setPromptDraft] = (0, react.useState)("");
			const [stageGeom, setStageGeom] = (0, react.useState)(stage.params.output_mode === "bbox" ? "bbox" : "segm");
			const openStageType = (t) => {
				setTypeDraft((cur) => cur === t ? null : t);
			};
			/** STAGE 3's ADD — commit the drafted selection as a card under the
			* canvas (the flat params ARE the card; the recipe bar renders it).
			* Text commits its prompt; detect classes arm the export + primary;
			* paint arms export_paint. The stage-1 filter (if any) rides the
			* primary via instance_filter. A committed marquee SCOPES the add —
			* same normalized roi the canvas bar writes (the marquee is
			* canvas-surface; every authoring path carries it). */
			const commitStageAdd = () => {
				if (!typeDraft) return;
				const p = stage.params;
				const sel = selectionRef.current;
				const { w: cw, h: ch } = imgSizeRef.current;
				const roi = sel && cw > 0 && ch > 0 ? [
					Number((sel.x / cw).toFixed(4)),
					Number((sel.y / ch).toFixed(4)),
					Number((sel.w / cw).toFixed(4)),
					Number((sel.h / ch).toFixed(4))
				] : Array.isArray(p.roi) && p.roi.length === 4 ? p.roi : "";
				if (typeDraft === "text") {
					const trimmed = promptDraft.trim();
					if (!trimmed) return;
					onSave({
						...p,
						sam3_prompt: trimmed,
						roi
					});
				} else if (typeDraft === "paint") onSave({
					...p,
					export_paint: true,
					roi
				});
				else {
					const exKey = `export_${typeDraft}`;
					onSave({
						...p,
						[exKey]: true,
						detect_mode: typeDraft,
						output_mode: stageGeom,
						roi
					});
				}
				setTypeDraft(null);
			};
			return {
				bboxCount,
				setBboxCountCapped,
				runBboxIsolated,
				typeDraft,
				promptDraft,
				setPromptDraft,
				stageGeom,
				setStageGeom,
				openStageType,
				commitStageAdd
			};
		}
		//#endregion
		//#region ../../web-kit/formats/src/npz.ts
		var init_npz = __esmMin((() => {}));
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
			listeners$2.add(cb);
			return () => {
				listeners$2.delete(cb);
			};
		}
		function setState$1(next) {
			if (next === state$1) return;
			state$1 = next;
			for (const cb of listeners$2) try {
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
		var MAX_RETRIES, BASE_MS, CAP_MS, OFFLINE_THRESHOLD, TOTAL_BUDGET_MS, SAFE_METHODS, GATEWAY_CODES, state$1, consecutiveFail, listeners$2, inflight;
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
			listeners$2 = /* @__PURE__ */ new Set();
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
		var nextId$1, listeners$1, state, notify$1, setState, useToastStore$1;
		var init_toast = __esmMin((() => {
			nextId$1 = 0;
			listeners$1 = /* @__PURE__ */ new Set();
			notify$1 = () => {
				for (const l of listeners$1) l();
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
					const id = nextId$1++;
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
			useToastStore$1 = {
				getState: () => state,
				setState,
				subscribe: (l) => {
					listeners$1.add(l);
					return () => {
						listeners$1.delete(l);
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
					if (wasOutage) useToastStore$1.getState().addToast("info", `Catalog back online (at ${_stamp()}).`);
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
					useToastStore$1.getState().addToast("error", `Catalog contract violation — ${msg} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`, {
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
					useToastStore$1.getState().addToast("error", `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`, {
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
			const toast = useToastStore$1.getState().addToast;
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
				const { getCachedCatalog } = await Promise.resolve().then(() => (init_src$1(), src_exports));
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
			init_src();
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
		var init_src$1 = __esmMin((() => {
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
		//#region ../../web-kit/formats/src/somaSkin.ts
		var init_somaSkin = __esmMin((() => {
			init_src$1();
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
		function cloneMat(m) {
			return {
				w: m.w,
				h: m.h,
				data: new Float64Array(m.data)
			};
		}
		/** Half-width of the disk per row offset dy ∈ [-r, r]: floor(sqrt(r²-dy²)). */
		function diskRowHalfWidths(radius) {
			const r = radius | 0;
			const out = [];
			for (let dy = -r; dy <= r; dy++) out.push(Math.floor(Math.sqrt(r * r - dy * dy)));
			return out;
		}
		/** Horizontal sliding-window OR (half-width k) via prefix sums, O(h·w). */
		function horizDilateBool(b, w, h, k) {
			if (k <= 0) return b.slice();
			const pw = w + 2 * k;
			const padded = new Int32Array(h * pw);
			for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) padded[y * pw + k + x] = b[y * w + x];
			const out = new Uint8Array(h * w);
			for (let y = 0; y < h; y++) {
				let csum = 0;
				const cpre = new Int32Array(pw + 1);
				for (let t = 0; t < pw; t++) {
					csum += padded[y * pw + t];
					cpre[t + 1] = csum;
				}
				for (let x = 0; x < w; x++) out[y * w + x] = cpre[x + 2 * k + 1] - cpre[x] > 0 ? 1 : 0;
			}
			return out;
		}
		/** Exact disk dilation/erosion. Erode = ~dilate(~b); outside behaves as
		*  mask material for erosion (lenient edges — GrowMask parity). */
		function diskMorph(b, w, h, radius, erode) {
			const r = radius | 0;
			if (r <= 0) return b.slice();
			const src = new Uint8Array(b.length);
			if (erode) for (let i = 0; i < b.length; i++) src[i] = b[i] ? 0 : 1;
			else src.set(b);
			const acc = new Uint8Array(h * w);
			const hw = diskRowHalfWidths(r);
			for (let dy = -r; dy <= r; dy++) {
				const k = hw[dy + r];
				/* v8 ignore next -- k = floor(sqrt(r^2 - dy^2)) >= 0 by construction
				(diskRowHalfWidths), so this never fires; kept as armor (2026-09-12) */
				if (k < 0) continue;
				const row = horizDilateBool(src, w, h, k);
				if (dy === 0) {
					for (let i = 0; i < acc.length; i++) if (row[i]) acc[i] = 1;
				} else if (dy > 0) for (let y = dy; y < h; y++) {
					const ai = y * w, ri = (y - dy) * w;
					for (let x = 0; x < w; x++) if (row[ri + x]) acc[ai + x] = 1;
				}
				else for (let y = 0; y < h + dy; y++) {
					const ai = y * w, ri = (y - dy) * w;
					for (let x = 0; x < w; x++) if (row[ri + x]) acc[ai + x] = 1;
				}
			}
			if (!erode) return acc;
			const out = new Uint8Array(b.length);
			for (let i = 0; i < acc.length; i++) out[i] = acc[i] ? 0 : 1;
			return out;
		}
		/** Dilate/erode the ≥0.5 region by an exact disk. Eroding to empty
		*  THROWS (no silent fallback — mirror of the Python hard error). */
		function growMask(m, px) {
			px = px | 0;
			if (px === 0) return cloneMat(m);
			const b = new Uint8Array(m.w * m.h);
			for (let i = 0; i < b.length; i++) b[i] = m.data[i] >= .5 ? 1 : 0;
			let outB;
			if (px > 0) outB = diskMorph(b, m.w, m.h, px, false);
			else {
				outB = diskMorph(b, m.w, m.h, -px, true);
				let any2 = false;
				for (let i = 0; i < outB.length; i++) if (outB[i]) {
					any2 = true;
					break;
				}
				if (!any2) throw new Error(`maskPrep: grow(${px}) eroded the mask to NOTHING — the regenerate region vanished. Reduce the shrink (grow < 0) or paint a larger region. NO SILENT FALLBACK.`);
			}
			const data = new Float64Array(outB.length);
			for (let i = 0; i < outB.length; i++) data[i] = outB[i];
			return {
				w: m.w,
				h: m.h,
				data
			};
		}
		/** sigma = radius/2, truncated at ±ceil(3σ), renormalized. */
		function gaussianKernel(radius) {
			const sigma = radius / 2;
			const k = Math.max(1, Math.ceil(3 * sigma));
			const xs = [];
			for (let x = -k; x <= k; x++) xs.push(x);
			const g = new Float64Array(xs.length);
			let sum = 0;
			for (let i = 0; i < xs.length; i++) {
				const x = xs[i];
				g[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
				sum += g[i];
			}
			for (let i = 0; i < g.length; i++) g[i] = g[i] / sum;
			return g;
		}
		/** 1D convolution along an axis, replicate edges, fixed accumulation
		*  order (kernel index ascending) — the parity-critical loop. */
		function convAxisReplicate(m, kernel, axis) {
			const { w, h, data } = m;
			const k = kernel.length - 1 >> 1;
			const out = new Float64Array(w * h);
			if (axis === 1) for (let y = 0; y < h; y++) {
				const rowIn = new Float64Array(w + 2 * k);
				for (let t = 0; t < k; t++) rowIn[t] = data[y * w];
				for (let x = 0; x < w; x++) rowIn[k + x] = data[y * w + x];
				for (let t = 0; t < k; t++) rowIn[k + w + t] = data[y * w + w - 1];
				for (let x = 0; x < w; x++) {
					let acc = 0;
					for (let i = 0; i < kernel.length; i++) acc += kernel[i] * rowIn[i + x];
					out[y * w + x] = acc;
				}
			}
			else for (let x = 0; x < w; x++) {
				const colIn = new Float64Array(h + 2 * k);
				for (let t = 0; t < k; t++) colIn[t] = data[x];
				for (let y = 0; y < h; y++) colIn[k + y] = data[y * w + x];
				for (let t = 0; t < k; t++) colIn[k + h + t] = data[(h - 1) * w + x];
				for (let y = 0; y < h; y++) {
					let acc = 0;
					for (let i = 0; i < kernel.length; i++) acc += kernel[i] * colIn[i + y];
					out[y * w + x] = acc;
				}
			}
			return {
				w,
				h,
				data: out
			};
		}
		/** Gaussian feather (columns then rows — same axis order as Python). */
		function featherMask(m, radius) {
			radius = radius | 0;
			if (radius <= 0) return cloneMat(m);
			const kernel = gaussianKernel(radius);
			let out = convAxisReplicate(m, kernel, 1);
			out = convAxisReplicate(out, kernel, 0);
			return out;
		}
		function thresholdMask(m, t) {
			if (t <= 0) return cloneMat(m);
			const data = new Float64Array(m.data.length);
			for (let i = 0; i < data.length; i++) data[i] = m.data[i] >= t ? 1 : 0;
			return {
				w: m.w,
				h: m.h,
				data
			};
		}
		function invertMask(m) {
			const data = new Float64Array(m.data.length);
			for (let i = 0; i < data.length; i++) data[i] = 1 - m.data[i];
			return {
				w: m.w,
				h: m.h,
				data
			};
		}
		function coverage(m) {
			let s = 0;
			for (let i = 0; i < m.data.length; i++) s += m.data[i];
			return s / m.data.length;
		}
		/** FIXED chain: grow → feather → threshold → invert. */
		function applyPrep(m, prep) {
			let out = cloneMat(m);
			const applied = [];
			if (prep.grow) {
				out = growMask(out, prep.grow);
				applied.push(`grow(${prep.grow}px)`);
			}
			if (prep.feather) {
				out = featherMask(out, prep.feather);
				applied.push(`feather(${prep.feather}px)`);
			}
			if (prep.threshold > 0) {
				out = thresholdMask(out, prep.threshold);
				applied.push(`threshold(${prep.threshold})`);
			}
			if (prep.invert) {
				out = invertMask(out);
				applied.push("invert");
			}
			return {
				mask: out,
				report: { applied: applied.length ? applied : ["identity"] }
			};
		}
		/** Extract a mask from ImageData. channel: "alpha" (RGBA canvas carrier)
		*  or "red" (white-on-black studio carrier). Values → [0,1] float64. */
		function maskFromImageData(img, channel = "alpha") {
			const { width: w, height: h, data } = img;
			const out = new Float64Array(w * h);
			const stride = 4;
			const off = channel === "alpha" ? 3 : 0;
			for (let i = 0; i < w * h; i++) out[i] = data[i * stride + off] / 255;
			return {
				w,
				h,
				data: out
			};
		}
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
			init_src$1();
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
			init_src$1();
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
		var init_src = __esmMin((() => {
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
		//#region src/ui/studio/usePrepPreview.ts
		init_src();
		function usePrepPreview({ artifacts, hasPaint, paintVersion, refs, redrawRef }) {
			const { imgCacheRef, imgSizeRef, paintCanvasRef, prepOverlayRef } = refs;
			const [prepPreviewOn, setPrepPreviewOn] = (0, react.useState)(false);
			const [prepGrow, setPrepGrow] = (0, react.useState)(8);
			const [prepFeather, setPrepFeather] = (0, react.useState)(8);
			const [prepCoveragePct, setPrepCoveragePct] = (0, react.useState)(null);
			const [prepSourceLabel, setPrepSourceLabel] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				if (!prepPreviewOn) {
					const had = prepOverlayRef.current !== null;
					prepOverlayRef.current = null;
					setPrepCoveragePct(null);
					setPrepSourceLabel("");
					if (had) redrawRef.current?.();
					return;
				}
				const t = window.setTimeout(() => {
					const { w, h } = imgSizeRef.current;
					if (!w || !h) return;
					const runMaskUrl = artifacts.mask_combined ?? artifacts.mask_sam3 ?? null;
					const usePaint = !runMaskUrl;
					let src = null;
					if (usePaint) {
						if (!hasPaint || !paintCanvasRef.current) {
							prepOverlayRef.current = null;
							setPrepCoveragePct(null);
							setPrepSourceLabel("no raw mask yet — paint or run Detect/SAM3");
							redrawRef.current?.();
							return;
						}
						src = paintCanvasRef.current;
					} else {
						const img = imgCacheRef.current.get(runMaskUrl);
						if (!img || !img.complete || img.naturalWidth === 0) return;
						src = img;
					}
					const tmp = document.createElement("canvas");
					tmp.width = w;
					tmp.height = h;
					const tctx = tmp.getContext("2d", { willReadFrequently: true });
					if (!tctx) return;
					tctx.drawImage(src, 0, 0, w, h);
					const mat = maskFromImageData(tctx.getImageData(0, 0, w, h), usePaint ? "alpha" : "red");
					let out;
					try {
						out = applyPrep(mat, {
							grow: prepGrow,
							feather: prepFeather,
							threshold: 0,
							invert: false
						});
					} catch (e) {
						prepOverlayRef.current = null;
						setPrepCoveragePct(null);
						setPrepSourceLabel(e instanceof Error ? e.message : String(e));
						redrawRef.current?.();
						return;
					}
					if (!prepOverlayRef.current) prepOverlayRef.current = document.createElement("canvas");
					const oc = prepOverlayRef.current;
					if (oc.width !== w || oc.height !== h) {
						oc.width = w;
						oc.height = h;
					}
					const octx = oc.getContext("2d");
					if (!octx) return;
					const oimg = octx.createImageData(w, h);
					for (let i = 0; i < w * h; i++) {
						const v = out.mask.data[i];
						oimg.data[i * 4 + 0] = 34;
						oimg.data[i * 4 + 1] = 211;
						oimg.data[i * 4 + 2] = 238;
						oimg.data[i * 4 + 3] = Math.round(v * 255);
					}
					octx.putImageData(oimg, 0, 0);
					setPrepCoveragePct(coverage(out.mask) * 100);
					setPrepSourceLabel(usePaint ? "paint layer" : "last run (mask_combined)");
					redrawRef.current?.();
				}, 150);
				return () => window.clearTimeout(t);
			}, [
				prepPreviewOn,
				prepGrow,
				prepFeather,
				artifacts,
				hasPaint,
				paintVersion
			]);
			return {
				prepPreviewOn,
				setPrepPreviewOn,
				prepGrow,
				setPrepGrow,
				prepFeather,
				setPrepFeather,
				prepCoveragePct,
				prepSourceLabel
			};
		}
		//#endregion
		//#region src/ui/studio/toast.ts
		let nextId = 0;
		let toasts = [];
		const listeners = /* @__PURE__ */ new Set();
		function emit() {
			for (const fn of listeners) fn();
		}
		const useToastStore = {
			getState() {
				return {
					toasts,
					addToast: (type, message) => {
						if (type === "error") console.error(message);
						const id = nextId++;
						toasts = [...toasts, {
							id,
							type,
							message
						}];
						emit();
						setTimeout(() => {
							toasts = toasts.filter((t) => t.id !== id);
							emit();
						}, type === "error" ? 15e3 : 5e3);
					},
					removeToast: (id) => {
						toasts = toasts.filter((t) => t.id !== id);
						emit();
					}
				};
			},
			subscribe(fn) {
				listeners.add(fn);
				return () => {
					listeners.delete(fn);
				};
			}
		};
		//#endregion
		//#region src/ui/studio/useImageImport.ts
		function useImageImport({ stage, onSave, onWireSlot, upstreams }) {
			const [dropHighlight, setDropHighlight] = (0, react.useState)(false);
			const attachImage = (0, react.useCallback)((url) => {
				onSave({
					...stage.params,
					input_image: url
				});
				onWireSlot?.(INPUT_SLOT, null, null);
			}, [
				onSave,
				stage.params,
				onWireSlot
			]);
			const importImageFile = (0, react.useCallback)((file) => {
				if (!file.type.startsWith("image/")) {
					useToastStore.getState().addToast("error", "Drop an image file (PNG / JPEG / WebP).");
					return;
				}
				readAsDataURL$1(file).then(attachImage).catch((err) => useToastStore.getState().addToast("error", `Could not read image: ${err instanceof Error ? err.message : String(err)}`));
			}, [attachImage]);
			const onCanvasDrop = (e) => {
				const asset = e.dataTransfer.getData(ASSET_DRAG_MIME$1);
				if (asset) try {
					const payload = JSON.parse(asset);
					if (payload.url) {
						e.preventDefault();
						e.stopPropagation();
						setDropHighlight(false);
						attachImage(payload.url);
						return;
					}
				} catch {}
				const file = e.dataTransfer.files?.[0];
				if (!file || !file.type.startsWith("image/")) return;
				e.preventDefault();
				e.stopPropagation();
				setDropHighlight(false);
				importImageFile(file);
			};
			const onCanvasDragOver = (e) => {
				if (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes("application/tech-noir-asset")) {
					e.preventDefault();
					setDropHighlight(true);
				}
			};
			const onCanvasDragLeave = (e) => {
				if (e.relatedTarget === null) setDropHighlight(false);
			};
			const [wireOpen, setWireOpen] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!wireOpen) return;
				const onKey = (e) => {
					if (e.key === "Escape") setWireOpen(false);
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [wireOpen]);
			const stageIdx = upstreams.findIndex((s) => s.id === stage.id);
			const priorStages = upstreams.map((u, i) => ({
				u,
				i
			})).filter(({ u, i }) => u.id !== stage.id && (stageIdx < 0 || i < stageIdx)).map(({ u }) => u);
			const canWire = !!onWireSlot;
			(0, react.useEffect)(() => {
				const onPaste = (e) => {
					const file = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"))?.getAsFile();
					if (file) {
						e.preventDefault();
						importImageFile(file);
					}
				};
				window.addEventListener("paste", onPaste);
				return () => window.removeEventListener("paste", onPaste);
			}, [importImageFile]);
			return {
				attachImage,
				importImageFile,
				onCanvasDrop,
				onCanvasDragOver,
				onCanvasDragLeave,
				dropHighlight,
				wireOpen,
				setWireOpen,
				priorStages,
				canWire
			};
		}
		//#endregion
		//#region src/ui/studio/recipe.ts
		/** One recipe derivation — one entry per ARMED selection, FILTER over
		* SELECTION. Combined leads and names its winner (the brick's detect >
		* sam3 > paint priority, narrated). */
		function deriveRecipe({ params, artifacts, recipeOutputs, recipeDetect, detectMode, outputMode, sam3Prompt, sam3Active, textArmed, hasPaint, hasScope, instanceLabel, filterActive, boxes, selectedInstances, onPrimaryKeep, onClearSelection, onSwitchInstance }) {
			const cap = (s) => s[0].toUpperCase() + s.slice(1);
			const scopeFilter = hasScope ? "Scope" : "Full";
			const geometryDetail = outputMode === "bbox" ? "rect" : "traced";
			const sam3Armed = sam3Active || textArmed || Boolean(artifacts.mask_sam3);
			const paintArmed = hasPaint || Boolean(params.export_paint) || Boolean(artifacts.mask_paint);
			const armedClasses = DETECT_CLASSES.filter(({ key }) => Boolean(params[`export_${key}`]) || detectMode === key || Boolean(artifacts[`mask_${key}`]));
			const combinedWinner = detectMode !== "none" ? cap(DETECT_CLASSES.find((c) => c.key === detectMode)?.label ?? "body") : sam3Active ? "SAM3" : "Paint";
			const trimmedPrompt = sam3Prompt.trim();
			const promptDetail = trimmedPrompt ? trimmedPrompt.length > 14 ? `"${trimmedPrompt.slice(0, 13)}…"` : `"${trimmedPrompt}"` : void 0;
			const recipeCards = [];
			if (recipeOutputs) {
				let firstDetect = true;
				for (const e of recipeOutputs) {
					const filter = recipeFilterLabel(e);
					const sk = e.selection?.kind;
					if (sk === "detect") {
						const cls = DETECT_CLASSES.find((c) => c.key === e.selection?.class)?.key ?? "body";
						const mode = e.selection?.mode === "bbox" || e.selection?.mode === "segm" ? e.selection.mode : outputMode;
						if (firstDetect) {
							firstDetect = false;
							recipeCards.push({
								key: "mask_combined",
								filter,
								selection: "Combined",
								detail: `← ${cap(cls)}`,
								color: DETECTOR_DEFS[0].color,
								url: artifacts.mask_combined ?? null
							});
							continue;
						}
						recipeCards.push({
							key: `mask_${cls}`,
							filter,
							selection: cap(cls),
							detail: mode === "bbox" ? "rect" : "traced",
							color: CLASS_COLORS[cls],
							url: artifacts[`mask_${cls}`] ?? null
						});
					} else if (sk === "sam3") {
						const rp = (e.selection?.prompt ?? "").trim();
						recipeCards.push({
							key: "mask_sam3",
							filter,
							selection: "SAM3",
							detail: rp ? rp.length > 14 ? `"${rp.slice(0, 13)}…"` : `"${rp}"` : void 0,
							color: SAM3_COLOR,
							url: artifacts.mask_sam3 ?? null
						});
					} else if (sk === "paint") recipeCards.push({
						key: "mask_paint",
						filter,
						selection: "Paint",
						detail: "live",
						color: PAINT_COLOR,
						url: null,
						live: true
					});
				}
			} else {
				if (armedClasses.length > 0 || sam3Armed || paintArmed) recipeCards.push({
					key: "mask_combined",
					filter: instanceLabel ?? scopeFilter,
					selection: "Combined",
					detail: `← ${combinedWinner}`,
					color: DETECTOR_DEFS[0].color,
					url: artifacts.mask_combined ?? null
				});
				for (const { key, label } of armedClasses) recipeCards.push({
					key: `mask_${key}`,
					filter: instanceLabel ?? scopeFilter,
					selection: cap(label),
					detail: geometryDetail,
					color: CLASS_COLORS[key],
					url: artifacts[`mask_${key}`] ?? null
				});
				if (sam3Armed) recipeCards.push({
					key: "mask_sam3",
					filter: scopeFilter,
					selection: "SAM3",
					detail: promptDetail,
					color: SAM3_COLOR,
					url: artifacts.mask_sam3 ?? null
				});
				if (paintArmed) recipeCards.push({
					key: "mask_paint",
					filter: "Canvas",
					selection: "Paint",
					detail: "live",
					color: PAINT_COLOR,
					url: null,
					live: true
				});
			}
			const primaryFiltered = filterActive || Boolean(recipeOutputs?.some((e) => e.filter?.kind === "instance"));
			const scopeOn = recipeOutputs ? recipeOutputs.some((e) => e.filter?.kind === "scope") : hasScope;
			const paintOn = recipeOutputs ? recipeOutputs.some((e) => e.selection?.kind === "paint") : paintArmed;
			const detectArmed = detectMode !== "none" || recipeDetect;
			const filterChips = [{
				key: "full",
				label: "Full",
				tone: "full",
				icon: Expand,
				active: !scopeOn && !primaryFiltered,
				tip: "Whole image, every instance",
				onTap: primaryFiltered ? () => onPrimaryKeep(/* @__PURE__ */ new Set()) : void 0
			}];
			if (scopeOn) filterChips.push({
				key: "scope",
				label: "Scope",
				tone: "scope",
				icon: Focus,
				active: true,
				tip: "The marquee rectangle — click to clear",
				onTap: recipeOutputs ? void 0 : onClearSelection
			});
			if (paintOn) filterChips.push({
				key: "canvas",
				label: "Canvas",
				tone: "canvas",
				icon: Brush,
				active: true,
				tip: "The brush IS the geometry"
			});
			if (detectArmed) {
				if (boxes && boxes.length > 0) for (const b of boxes) filterChips.push({
					key: `bbox-${b.index}`,
					label: `BBox ${b.index + 1}`,
					tone: "instance",
					icon: BoxSelect,
					active: selectedInstances.has(b.index),
					tip: `Switch the Combined mask to instance ${b.index + 1} (${b.class})`,
					onTap: () => onSwitchInstance(b.index)
				});
				else filterChips.push({
					key: "bbox-none",
					label: "BBox —",
					tone: "instance",
					icon: BoxSelect,
					active: false,
					dim: true,
					tip: "Run Detect — every found instance lands here as a switchable BBox card"
				});
			}
			return {
				cards: recipeCards,
				chips: filterChips
			};
		}
		//#endregion
		//#region src/ui/studio/component.tsx
		function MaskStudioEditor({ stage, onSave: onSaveProp, upstreams = [], onWireSlot, onRun }) {
			const wiredId = stage.inputs[0];
			const wiredUpstream = wiredId ? upstreams.find((u) => u.id === wiredId) : void 0;
			const isWired = !!wiredUpstream;
			const wiredOutputName = stage.inputOutputs?.[0] ?? null;
			const wiredUrl = wiredUpstream?.result ? wiredOutputName && wiredUpstream.result.artifacts?.[wiredOutputName] ? wiredUpstream.result.artifacts[wiredOutputName] : wiredUpstream.result.assetUrls[0] : null;
			const wiredPending = isWired && !wiredUrl;
			const attachedImage = stage.params.input_image ?? "";
			const inputImage = isWired ? wiredUrl ?? "" : attachedImage;
			const artifacts = (0, react.useMemo)(() => stage.result?.artifacts ?? EMPTY_ARTIFACTS, [stage.result?.artifacts]);
			const params = stage.params;
			const onSave = (0, react.useCallback)((p) => onSaveProp({
				...p,
				outputs: []
			}), [onSaveProp]);
			const [selection, setSelection] = (0, react.useState)(null);
			const [hasPaint, setHasPaint] = (0, react.useState)(Boolean(params.paint_mask));
			const [paintVersion, setPaintVersion] = (0, react.useState)(0);
			const masks = (0, react.useMemo)(() => producedMasks(artifacts), [artifacts]);
			const refs = useStudioRefs();
			const instances = useInstances({
				params,
				artifacts,
				stage,
				onSave,
				onSaveProp,
				onRun
			});
			const canvas = useCanvasView({
				stage,
				inputImage,
				artifacts,
				masks,
				hasPaint,
				boxes: instances.boxes,
				selectedInstances: instances.selectedInstances,
				setSelection,
				setHasPaint,
				setPaintVersion,
				onSave,
				refs
			});
			const paint = usePaintTools({
				stage,
				artifacts,
				inputImage,
				hasPaint,
				setHasPaint,
				setPaintVersion,
				setSelection,
				view: {
					isZoomed: canvas.isZoomed,
					pan: canvas.pan,
					zoom: canvas.zoom,
					setPan: canvas.setPan,
					panDragging: canvas.panDragging,
					setPanDragging: canvas.setPanDragging,
					clampPanFor: canvas.clampPanFor,
					zoomToPoint: canvas.zoomToPoint,
					resetZoom: canvas.resetZoom,
					scheduleRedraw: canvas.scheduleRedraw,
					flushRedraw: canvas.flushRedraw
				},
				onSave,
				onRun,
				refs
			});
			const [textArmed] = (0, react.useState)(false);
			const detectMode = params.detect_mode ?? "body";
			const outputMode = params.output_mode ?? "segm";
			const sam3Prompt = params.sam3_prompt ?? "";
			const sam3Active = Boolean(sam3Prompt.trim());
			const source = detectMode !== "none" ? outputMode === "bbox" ? "box" : "person" : sam3Active || textArmed ? "text" : "brush";
			const roiParam = params.roi ?? "";
			const hasScope = Boolean(selection) || (Array.isArray(roiParam) ? roiParam.length > 0 : Boolean(roiParam));
			const scopeLabel = selection ? `Sel ${Math.round(selection.w)}×${Math.round(selection.h)}` : hasScope ? "Scoped (card)" : "Full image";
			(0, react.useEffect)(() => {
				if (detectMode === "face" || detectMode === "hands" || detectMode === "body") refs.lastClassRef.current = detectMode;
			}, [detectMode, refs.lastClassRef]);
			const rail = useStageRail({
				stage,
				refs,
				onSave,
				onRun
			});
			const prep = usePrepPreview({
				artifacts,
				hasPaint,
				paintVersion,
				refs,
				redrawRef: canvas.redrawRef
			});
			const im = useImageImport({
				stage,
				onSave,
				onWireSlot,
				upstreams
			});
			const updateParam = (key, value) => onSave({
				...stage.params,
				[key]: value
			});
			const detecting = stage.status === "running";
			const showsSize = paint.tool === "brush" || paint.tool === "eraser";
			const recipe = deriveRecipe({
				params,
				artifacts,
				recipeOutputs: instances.recipeOutputs,
				recipeDetect: instances.recipeDetect,
				detectMode,
				outputMode,
				sam3Prompt,
				sam3Active,
				textArmed,
				hasPaint,
				hasScope,
				instanceLabel: instances.instanceLabel,
				filterActive: instances.filterActive,
				boxes: instances.boxes,
				selectedInstances: instances.selectedInstances,
				onPrimaryKeep: instances.applyPrimaryKeep,
				onClearSelection: paint.clearSelection,
				onSwitchInstance: instances.switchInstance
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: mask_module_css_default.studioRoot,
				"data-mask-studio": true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioShell, {
					params: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MaskSourceControls, {
						params,
						source,
						detectMode,
						exportFace: Boolean(params.export_face),
						exportHands: Boolean(params.export_hands),
						exportBody: Boolean(params.export_body),
						sam3Active,
						scopeLabel,
						hasScope,
						detecting,
						hasInput: Boolean(inputImage),
						boxes: instances.boxes,
						bboxCount: rail.bboxCount,
						instancesSelected: instances.selectedInstances,
						selectedAll: !instances.filterActive,
						typeDraft: rail.typeDraft,
						draftPrompt: rail.promptDraft,
						stageGeometry: rail.stageGeom,
						hasPaint,
						onBboxCount: rail.setBboxCountCapped,
						onBboxRun: rail.runBboxIsolated,
						onInstancePick: instances.applyPrimaryKeepSilent,
						onStageType: rail.openStageType,
						onPromptDraft: rail.setPromptDraft,
						onGeometry: rail.setStageGeom,
						onAdd: rail.commitStageAdd,
						onSegment: paint.runSam3,
						onPlay: onRun,
						onChange: updateParam,
						onClearScope: paint.clearSelection
					}),
					preview: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: mask_module_css_default.centerRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioCanvas, {
							tool: paint.tool,
							setTool: paint.setTool,
							prepPreviewOn: prep.prepPreviewOn,
							setPrepPreviewOn: prep.setPrepPreviewOn,
							showsSize,
							brushSize: paint.brushSize,
							setBrushSize: paint.setBrushSize,
							selection,
							inputImage,
							zoom: canvas.zoom,
							setZoom: canvas.setZoom,
							pan: canvas.pan,
							setPan: canvas.setPan,
							isZoomed: canvas.isZoomed,
							resetZoom: canvas.resetZoom,
							hasPaint,
							clearPaint: paint.clearPaint,
							colRef: refs.colRef,
							canvasContainerRef: refs.canvasContainerRef,
							viewCanvasRef: refs.viewCanvasRef,
							wiredPending,
							onCanvasDrop: im.onCanvasDrop,
							onCanvasDragOver: im.onCanvasDragOver,
							onCanvasDragLeave: im.onCanvasDragLeave,
							viewSize: canvas.viewSize,
							dropHighlight: im.dropHighlight,
							imageLoading: canvas.imageLoading,
							wiredUpstreamTitle: wiredUpstream?.title ?? "",
							onUnwire: () => onWireSlot?.(INPUT_SLOT, null, null),
							onPointerDown: paint.onPointerDown,
							onPointerMove: paint.onPointerMove,
							onPointerUp: paint.onPointerUp,
							panDragging: canvas.panDragging,
							isWired,
							canWire: im.canWire,
							setWireOpen: im.setWireOpen,
							boxes: instances.boxes,
							detectMode,
							recipeDetect: instances.recipeDetect,
							selectedInstances: instances.selectedInstances,
							toggleInstance: instances.toggleInstance,
							importImageFile: im.importImageFile,
							attachImage: im.attachImage,
							detecting,
							prepGrow: prep.prepGrow,
							setPrepGrow: prep.setPrepGrow,
							prepFeather: prep.prepFeather,
							setPrepFeather: prep.setPrepFeather,
							prepCoveragePct: prep.prepCoveragePct,
							prepSourceLabel: prep.prepSourceLabel,
							runDetect: paint.runDetect,
							clearSelection: paint.clearSelection
						})
					}),
					bottom: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutputStrip, {
						entries: recipe.cards,
						hasPaint,
						paintVersion,
						imgCache: refs.imgCacheRef.current,
						paintCanvas: refs.paintCanvasRef.current,
						running: detecting,
						filters: recipe.chips
					})
				}), im.wireOpen && onWireSlot && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WirePickerModal, {
					slot: "input_image",
					priorStages: im.priorStages,
					currentId: wiredId,
					currentOutput: wiredOutputName,
					onPick: (upstreamId, outputName) => {
						onWireSlot("input_image", upstreamId, outputName ?? null);
						onSave({
							...stage.params,
							input_image: null
						});
						im.setWireOpen(false);
					},
					onUnwire: () => {
						onWireSlot("input_image", null, null);
						onSave({
							...stage.params,
							input_image: null
						});
						im.setWireOpen(false);
					},
					onClose: () => im.setWireOpen(false)
				})]
			});
		}
		defineShellDeclaration({
			preview: { kind: "paint2d" },
			bottom: { kind: "recipe" },
			params: { slots: [INPUT_SLOT] }
		});
		//#endregion
		//#region src/client/index.ts
		/**
		* mask-studio client entry — the card package's OWN cards.stage.view
		* surface (the composition-root correction's law, closed 2026-09-12
		* for mask-studio per the DSH extension examples: a UI-bearing package
		* ships BOTH faces — the node half stays source-loaded, the browser
		* half rides lib/client.js through the dsh.client declaration +
		* ./client export; the loader materializes it from the module
		* table). The studio was DEAD on the lane before this face existed
		* (component.tsx exported, nothing imported it).
		*
		* THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM
		* and whatever renders its authoring surface is INJECTED): the
		* mask-studio card's authoring surface is this package's own studio —
		* src/ui/studio/component.tsx (MaskStudioEditor, the segm/bbox
		* tenant). This module is the ADAPTER that mounts it on the bench
		* slot — never a second definition site: props translate onto the
		* tenant contract {stage, onSave, upstreams?, onRun}; the document
		* rides stage.params; writes ride onSave → onPatch (patchStageParams'
		* partial merge); the run rides the host drill's own Run row.
		*/
		/** The bench row → the tenant's CardStage. id/title/kind ride
		* verbatim; service names the card ('mask-studio' — the family's join
		* key); params IS the document; result's artifact name→url map feeds
		* the produced-mask reads. */
		function toCardStage(props) {
			const row = props.row;
			const params = typeof row["params"] === "object" && row["params"] !== null ? row["params"] : {};
			const result = typeof row["result"] === "object" && row["result"] !== null ? row["result"] : {};
			const artifacts = {};
			const arts = typeof result["artifacts"] === "object" && result["artifacts"] !== null ? result["artifacts"] : {};
			for (const [name, val] of Object.entries(arts)) if (typeof val === "string" && val !== "") artifacts[name] = val;
			const assetUrls = Array.isArray(result["assetUrls"]) ? result["assetUrls"].filter((u) => typeof u === "string") : [];
			const metadata = typeof result["metadata"] === "object" && result["metadata"] !== null ? result["metadata"] : {};
			const card = typeof row["card"] === "string" ? row["card"] : "";
			const title = typeof row["title"] === "string" && row["title"] !== "" ? row["title"] : card !== "" ? card : props.stageId;
			const runStatus = typeof row["runStatus"] === "string" ? row["runStatus"] : "";
			const cardResult = Object.keys(artifacts).length > 0 || assetUrls.length > 0 ? {
				artifacts,
				assetUrls,
				metadata
			} : null;
			return {
				id: props.stageId,
				title,
				kind: card !== "" ? card : "mask-studio",
				service: card !== "" ? card : "mask-studio",
				genre: "image",
				params,
				inputs: [],
				inputIndices: [],
				result: cardResult,
				status: runStatus === "done" ? "done" : runStatus === "failed" ? "error" : runStatus === "running" || runStatus === "queued" ? "running" : "ready"
			};
		}
		/** Upstream rows → read-only CardStages (the preview body's wire
		* picker restricts to indices BEFORE this card — never a write
		* channel). */
		function toUpstreams(props) {
			const upstream = props.upstream;
			if (upstream === void 0 || upstream.length === 0) return [];
			return upstream.map((u) => ({
				id: u.id,
				title: u.title,
				kind: "image",
				service: u.title,
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
		/** The built-in registration (the ui-tool law, verbatim — the module
		* namespace IS the plugin: the loader consumes name/inject/apply). */
		const name = "maskStudio";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("cards.stage.view", () => ctx.slots.register({
				name: "cards.stage.view",
				key: "mask-studio"
			}, MaskStudio));
		}
		/** The mask surface — registered under key 'mask-studio'. The ADAPTER:
		* the tenant mounted verbatim, one translate layer, zero paraphrase.
		* onWireSlot stays OMITTED (the tenant's own contract: omitting
		* hides the wire affordance — the bench slot has no wire door).
		* onRun rides the host drill's single-stage gateway (the tenant's
		* Segm/Bbox one-gesture detection writes output_mode + roi THEN runs). */
		function MaskStudio(props) {
			const stage = toCardStage(props);
			const upstreams = toUpstreams(props);
			return (0, react.createElement)(MaskStudioEditor, {
				stage,
				onSave: (params) => {
					props.onPatch(params);
				},
				upstreams,
				onRun: () => {
					props.onRun();
				}
			});
		}
		//#endregion
		exports.MaskStudio = MaskStudio;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
