window.__ModuleLoader__.load({
	id: "@infer-media/dsh-gallery",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/apply-guard.ts
		/**
		* Apply guard: a duplicated client injection (module factory executed twice in
		* one page lifetime) would otherwise register a second sidebar entry and
		* overlay. First application wins; later calls become no-ops. The claim is
		* released when the owning fiber unloads, so a rebuilt bundle can claim again.
		*/
		let claimed = false;
		function claimGalleryApply() {
			if (claimed) return false;
			claimed = true;
			return true;
		}
		function releaseGalleryApply() {
			claimed = false;
		}
		//#endregion
		//#region src/client/store.ts
		function createGalleryStore() {
			let open = false;
			const listeners = /* @__PURE__ */ new Set();
			const emit = () => {
				for (const listener of listeners) listener();
			};
			return {
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				isOpen: () => open,
				toggle: () => {
					open = !open;
					emit();
				},
				open: () => {
					if (!open) {
						open = true;
						emit();
					}
				},
				close: () => {
					if (open) {
						open = false;
						emit();
					}
				}
			};
		}
		/** Singleton: both registered slot components import this one instance. */
		const galleryStore = createGalleryStore();
		//#endregion
		//#region src/client/runs-data.ts
		/**
		* Fetch the runs list through the same-origin proxy.
		* @param fetchImpl - injectable fetch (tests pass a pointed impl; production uses global).
		*/
		async function fetchRuns(fetchImpl = fetch) {
			let response;
			try {
				response = await fetchImpl("/infer-gallery/runs");
			} catch (error) {
				return {
					phase: "error",
					status: 0,
					body: String(error instanceof Error ? error.message : error)
				};
			}
			const body = await response.text();
			if (!response.ok) return {
				phase: "error",
				status: response.status,
				body
			};
			try {
				const payload = JSON.parse(body);
				return {
					phase: "ready",
					runs: Array.isArray(payload.runs) ? payload.runs : []
				};
			} catch {
				return {
					phase: "error",
					status: response.status,
					body
				};
			}
		}
		//#endregion
		//#region \0dsh-css:infer-gallery/src/client/gallery.module.css.mjs
		const css = ".iQ568W_entry{border:1px solid color-mix(in srgb, currentColor 20%, transparent);height:26px;color:inherit;opacity:.78;font:inherit;cursor:pointer;background:0 0;border-radius:7px;align-items:center;gap:6px;margin-right:6px;padding:0 10px;font-size:12px;display:inline-flex}.iQ568W_entry:hover{opacity:1}.iQ568W_entry[data-active]{opacity:1;border-color:color-mix(in srgb, currentColor 45%, transparent);background:color-mix(in srgb, currentColor 10%, transparent)}.iQ568W_entry:not([data-wide]){padding:0 7px}.iQ568W_entryIcon{flex:none;width:14px;height:14px;display:inline-flex}.iQ568W_entryIcon svg{width:100%;height:100%}.iQ568W_entryLabel{white-space:nowrap;line-height:1}.iQ568W_overlay{z-index:60;pointer-events:auto;background:#00000073;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.iQ568W_panel{border:1px solid color-mix(in srgb, CanvasText 18%, transparent);color:canvastext;background:canvas;border-radius:12px;flex-direction:column;width:min(940px,92vw);max-height:84vh;display:flex;overflow:hidden;box-shadow:0 18px 50px #00000059}.iQ568W_panelHead{border-bottom:1px solid color-mix(in srgb, CanvasText 12%, transparent);justify-content:space-between;align-items:center;gap:12px;padding:10px 16px;display:flex}.iQ568W_title{margin:0;font-size:14px;font-weight:600}.iQ568W_closeBtn{color:inherit;cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 6px;font-size:18px;line-height:1}.iQ568W_closeBtn:hover{background:color-mix(in srgb, CanvasText 10%, transparent)}.iQ568W_view{flex-direction:column;min-height:0;display:flex}.iQ568W_toolbar{opacity:.75;justify-content:space-between;align-items:center;padding:8px 16px;font-size:12px;display:flex}.iQ568W_refresh{border:1px solid color-mix(in srgb, currentColor 20%, transparent);color:inherit;font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:2px 10px;font-size:12px}.iQ568W_grid{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;padding:4px 16px 16px;display:grid;overflow-y:auto}.iQ568W_card{border:1px solid color-mix(in srgb, CanvasText 14%, transparent);background:color-mix(in srgb, CanvasText 4%, Canvas);color:inherit;font:inherit;text-align:left;border-radius:10px;flex-direction:column;gap:0;padding:0;display:flex;overflow:hidden}button.iQ568W_card{cursor:pointer}button.iQ568W_card:hover{border-color:color-mix(in srgb, CanvasText 38%, transparent)}.iQ568W_thumb{aspect-ratio:16/10;background:color-mix(in srgb, CanvasText 8%, transparent);width:100%;display:block;overflow:hidden}.iQ568W_thumbImg{object-fit:cover;width:100%;height:100%;display:block}.iQ568W_thumbPlaceholder{opacity:.55;justify-content:center;align-items:center;width:100%;height:100%;font-size:11px;display:flex}.iQ568W_cardBody{flex-direction:column;gap:6px;padding:8px 10px 10px;display:flex}.iQ568W_cardTop{align-items:center;gap:8px;min-width:0;display:flex}.iQ568W_status{text-transform:uppercase;letter-spacing:.04em;border:1px solid color-mix(in srgb, currentColor 25%, transparent);opacity:.85;border-radius:999px;flex:none;padding:2px 6px;font-size:10px}.iQ568W_status[data-status=completed]{color:#2e9e5b;opacity:1;border-color:#2e9e5b73}.iQ568W_status[data-status=failed]{color:#d05656;opacity:1;border-color:#d0565673}.iQ568W_status[data-status=running],.iQ568W_status[data-status=queued]{color:#c98a2b;opacity:1;border-color:#c98a2b73}.iQ568W_model{white-space:nowrap;text-overflow:ellipsis;min-width:0;font-size:12px;font-weight:600;overflow:hidden}.iQ568W_prompt{opacity:.8;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:2.9em;font-size:11px;line-height:1.45;display:-webkit-box;overflow:hidden}.iQ568W_cardMeta{opacity:.6;justify-content:space-between;align-items:center;gap:8px;font-size:10px;display:flex}.iQ568W_runId{white-space:nowrap;text-overflow:ellipsis;font-family:ui-monospace,monospace;overflow:hidden}.iQ568W_loading,.iQ568W_empty{opacity:.7;padding:24px 16px 32px;font-size:13px}.iQ568W_errorBox{border:1px solid #d0565673;border-radius:10px;margin:4px 16px 16px;padding:12px 14px;font-size:12px}.iQ568W_errorBody{white-space:pre-wrap;word-break:break-word;background:#d0565614;border-radius:6px;max-height:180px;margin:8px 0 0;padding:8px 10px;font-family:ui-monospace,monospace;font-size:11px;overflow:auto}";
		const tagId = "@infer-media/dsh-gallery/gallery.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@infer-media/dsh-gallery";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var gallery_module_css_default = {
			"card": "iQ568W_card",
			"cardBody": "iQ568W_cardBody",
			"cardMeta": "iQ568W_cardMeta",
			"cardTop": "iQ568W_cardTop",
			"closeBtn": "iQ568W_closeBtn",
			"empty": "iQ568W_empty",
			"entry": "iQ568W_entry",
			"entryIcon": "iQ568W_entryIcon",
			"entryLabel": "iQ568W_entryLabel",
			"errorBody": "iQ568W_errorBody",
			"errorBox": "iQ568W_errorBox",
			"grid": "iQ568W_grid",
			"loading": "iQ568W_loading",
			"model": "iQ568W_model",
			"overlay": "iQ568W_overlay",
			"panel": "iQ568W_panel",
			"panelHead": "iQ568W_panelHead",
			"prompt": "iQ568W_prompt",
			"refresh": "iQ568W_refresh",
			"runId": "iQ568W_runId",
			"status": "iQ568W_status",
			"thumb": "iQ568W_thumb",
			"thumbImg": "iQ568W_thumbImg",
			"thumbPlaceholder": "iQ568W_thumbPlaceholder",
			"title": "iQ568W_title",
			"toolbar": "iQ568W_toolbar",
			"view": "iQ568W_view"
		};
		//#endregion
		//#region src/client/RunCard.tsx
		/**
		* One generation run as a card: artifact thumbnail (proxied same-origin),
		* status pill, model/family line, prompt excerpt, and relative time. Cards
		* with an openable artifact are buttons that open it in a new tab; cards
		* without one render as plain tiles (nothing to open).
		*/
		/** The URL a card click opens: first image artifact, else the thumbnail. */
		function runOpenUrl(run) {
			const image = (run.artifacts ?? []).find((a) => a?.type === "image" && typeof a.url === "string" && a.url !== "");
			if (image?.url !== void 0) return image.url;
			if (typeof run.thumbnail === "string" && run.thumbnail !== "") return run.thumbnail;
		}
		/** Model/family label: params.model, else the families list, else the pipeline kind. */
		function runModel(run) {
			const model = run.params?.["model"];
			if (typeof model === "string" && model !== "") return model;
			const families = (run.families ?? []).filter((f) => typeof f === "string" && f !== "");
			if (families.length > 0) return families.join(", ");
			return run.pipeline ?? "unknown";
		}
		/** Compact relative/absolute time label from a unix-seconds created_at. */
		function formatRunTime(seconds) {
			if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "";
			const ms = seconds * 1e3;
			const minutes = Math.floor((Date.now() - ms) / 6e4);
			if (minutes < 1) return "just now";
			if (minutes < 60) return minutes + "m ago";
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return hours + "h ago";
			const d = new Date(ms);
			const pad = (n) => String(n).padStart(2, "0");
			return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
		}
		function RunCardInner({ run }) {
			const url = runOpenUrl(run);
			const status = typeof run.status === "string" && run.status !== "" ? run.status : "unknown";
			const body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: gallery_module_css_default.thumb,
				"data-empty": url === void 0 || void 0,
				children: url !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: gallery_module_css_default.thumbImg,
					src: url,
					alt: "",
					loading: "lazy"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: gallery_module_css_default.thumbPlaceholder,
					"aria-hidden": "true",
					children: "no artifact"
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: gallery_module_css_default.cardBody,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: gallery_module_css_default.cardTop,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: gallery_module_css_default.status,
							"data-status": status,
							children: status
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: gallery_module_css_default.model,
							children: runModel(run)
						})]
					}),
					run.prompt !== void 0 && run.prompt !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: gallery_module_css_default.prompt,
						title: run.prompt,
						children: run.prompt
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: gallery_module_css_default.cardMeta,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: gallery_module_css_default.time,
							children: formatRunTime(run.created_at)
						}), run.run_id !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: gallery_module_css_default.runId,
							title: run.run_id,
							children: run.run_id
						}) : null]
					})
				]
			})] });
			if (url === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: gallery_module_css_default.card,
				"data-openable": "false",
				"data-dsh-part": "run-card",
				children: body
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: gallery_module_css_default.card,
				"data-openable": "true",
				"data-dsh-part": "run-card",
				title: "Open artifact in a new tab",
				onClick: () => {
					window.open(url, "_blank", "noopener");
				},
				children: body
			});
		}
		/** Memoized: a card re-renders only when its own run record changes. */
		const RunCard = (0, react.memo)(RunCardInner);
		//#endregion
		//#region src/client/RunsView.tsx
		/**
		* Presentational runs view: grid of RunCards over a RunsState. Loading,
		* error (the proxy's actual error body, verbatim), and empty states render
		* inline — the view never throws.
		*/
		function RunsView({ state, onRefresh }) {
			const countLabel = state.phase === "ready" ? state.runs.length + " runs" : state.phase === "loading" ? "loading…" : "unavailable";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: gallery_module_css_default.view,
				"data-dsh-part": "runs-view",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: gallery_module_css_default.toolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: gallery_module_css_default.count,
							children: countLabel
						}), onRefresh !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: gallery_module_css_default.refresh,
							onClick: onRefresh,
							children: "refresh"
						}) : null]
					}),
					state.phase === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: gallery_module_css_default.loading,
						children: "Loading runs…"
					}) : null,
					state.phase === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: gallery_module_css_default.errorBox,
						"data-dsh-part": "runs-error",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
							"Gallery data unavailable (HTTP ",
							state.status,
							")"
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: gallery_module_css_default.errorBody,
							children: state.body
						})]
					}) : null,
					state.phase === "ready" && state.runs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: gallery_module_css_default.empty,
						children: "No runs yet — generate something in Melite first."
					}) : null,
					state.phase === "ready" && state.runs.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: gallery_module_css_default.grid,
						children: state.runs.map((run, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunCard, { run }, run.run_id ?? String(i)))
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/GalleryView.tsx
		/**
		* Gallery view: drives fetchRuns into RunsState and renders RunsView. The
		* refresh button re-runs the effect; unmount cancels late responses.
		*/
		function GalleryView() {
			const [state, setState] = (0, react.useState)({ phase: "loading" });
			const [tick, setTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				let cancelled = false;
				setState({ phase: "loading" });
				fetchRuns().then((next) => {
					if (!cancelled) setState(next);
				});
				return () => {
					cancelled = true;
				};
			}, [tick]);
			const refresh = (0, react.useCallback)(() => setTick((t) => t + 1), []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunsView, {
				state,
				onRefresh: refresh
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services (fiber inject waiting — the slot registry must be up first). */
		const inject = ["slots"];
		/**
		* Client apply: claims the single application slot and mounts nothing —
		* presence in the client bundle keeps the host-half proxy routes alive.
		* @param ctx - client root context.
		*/
		function apply(_ctx) {
			if (!claimGalleryApply()) return;
			_ctx.effect(() => releaseGalleryApply, "melite-gallery: apply claim");
		}
		//#endregion
		exports.GalleryView = GalleryView;
		exports.RunCard = RunCard;
		exports.RunsView = RunsView;
		exports.apply = apply;
		exports.fetchRuns = fetchRuns;
		exports.formatRunTime = formatRunTime;
		exports.galleryStore = galleryStore;
		exports.inject = inject;
		exports.runModel = runModel;
		exports.runOpenUrl = runOpenUrl;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map