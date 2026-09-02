window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-view",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		const css = ".vYZV7a_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.vYZV7a_load{color:var(--dsw-alias-label-secondary,#9a9aa5);padding:2px 0}.vYZV7a_head{align-items:center;gap:8px;min-width:0;display:flex}.vYZV7a_badge{background:var(--dsw-alias-fill-subtle,#23232b);letter-spacing:.08em;text-transform:uppercase;border-radius:4px;flex:none;padding:1px 6px;font-weight:600}.vYZV7a_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.vYZV7a_state{border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.vYZV7a_state[data-state=completed]{color:var(--dsw-alias-state-success-primary,#3fb96f)}.vYZV7a_state[data-state=running],.vYZV7a_state[data-state=queued],.vYZV7a_state[data-state=pending],.vYZV7a_state[data-state=starting],.vYZV7a_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary,#d9a53f)}.vYZV7a_state[data-state=failed],.vYZV7a_state[data-state=error],.vYZV7a_state[data-state=stopped],.vYZV7a_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary,#e05656)}.vYZV7a_prompt{color:var(--dsw-alias-text-secondary,#9a9aa5);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.vYZV7a_meta{color:var(--dsw-alias-text-tertiary,#77777f);align-items:center;gap:10px;min-width:0;display:flex}.vYZV7a_runId{text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;overflow:hidden}.vYZV7a_progress{flex:none}.vYZV7a_error{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;white-space:pre-wrap}.vYZV7a_links{flex-wrap:wrap;gap:6px;display:flex}.vYZV7a_link{color:var(--dsw-alias-state-business-primary,#5aa2e8);text-decoration:none}.vYZV7a_link:hover{text-decoration:underline}.vYZV7a_runBtn{background:var(--dsw-alias-state-business-primary,#4f7bd8);color:var(--dsw-alias-label-primary-foreground,#fff);cursor:pointer;border:1px solid #0000;border-radius:6px;flex:none;margin-left:auto;padding:5px 14px;font-size:12px;font-weight:600;line-height:1}.vYZV7a_runBtn:hover{background:var(--dsw-alias-button-info-hover,var(--dsw-alias-state-business-primary,#4f7bd8))}.vYZV7a_runBtn:disabled{cursor:default;opacity:.6}.vYZV7a_frame{background:0 0;border:none;width:100%;display:block}";
		const tagId = "@melite-plugin/dsh-card-view/card.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"badge": "vYZV7a_badge",
			"card": "vYZV7a_card",
			"error": "vYZV7a_error",
			"frame": "vYZV7a_frame",
			"head": "vYZV7a_head",
			"link": "vYZV7a_link",
			"links": "vYZV7a_links",
			"load": "vYZV7a_load",
			"meta": "vYZV7a_meta",
			"model": "vYZV7a_model",
			"progress": "vYZV7a_progress",
			"prompt": "vYZV7a_prompt",
			"runBtn": "vYZV7a_runBtn",
			"runId": "vYZV7a_runId",
			"state": "vYZV7a_state"
		};
		//#endregion
		//#region src/client/zoomPromotion.ts
		const ZOOM_OVERLAY_SELECTOR = "[data-card-zoom-overlay]";
		/** The editor's asset lightbox root (AssetPreviewDialog). A fullscreen
		* modal in EVERY surface that hosts it standalone -- inside a DSH embed
		* iframe it needs the frame promoted or the host chrome (the left
		* sidebar) stays lit beside the black. */
		const PREVIEW_DIALOG_SELECTOR = "[data-asset-preview-dialog]";
		const DEFAULT_SELECTORS = [ZOOM_OVERLAY_SELECTOR];
		const Z_INDEX = "2147483000";
		const BG = "var(--dsw-alias-bg-base, #17171c)";
		const FULLSCREEN_CLASS = "melite-zoom-fullscreen";
		const CLEARABLE = [
			"position",
			"inset",
			"width",
			"height",
			"zIndex",
			"background"
		];
		function createZoomPromotion(frame, deps) {
			let zoomOpen = false;
			let stopped = false;
			let timer;
			let observer = null;
			const selectors = deps.overlaySelectors ?? DEFAULT_SELECTORS;
			const fitEnabled = deps.fitHeight ?? true;
			const slabBackground = deps.background ?? BG;
			const overlayOpen = () => {
				const doc = frame.contentDocument;
				if (doc === null) return false;
				return selectors.some((sel) => doc.querySelector(sel) != null);
			};
			const fit = () => {
				if (stopped || !fitEnabled) return;
				const doc = frame.contentDocument;
				if (doc === null || doc.documentElement === null) return;
				const h = Math.max(doc.documentElement.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
				if (h > 0 && frame.style.position !== "fixed") frame.style.height = h + "px";
			};
			/** Idempotent apply -- returns whether the state actually flipped. */
			const applyZoom = (open) => {
				if (stopped || open === zoomOpen) return false;
				zoomOpen = open;
				if (open) {
					frame.classList.add(FULLSCREEN_CLASS);
					frame.style.position = "fixed";
					frame.style.inset = "0";
					frame.style.width = "100vw";
					frame.style.height = "100vh";
					frame.style.zIndex = Z_INDEX;
					frame.style.background = slabBackground;
				} else {
					frame.classList.remove(FULLSCREEN_CLASS);
					for (const k of CLEARABLE) frame.style[k] = "";
					fit();
				}
				return true;
			};
			const syncZoom = () => {
				if (stopped) return;
				applyZoom(overlayOpen());
			};
			const tick = () => {
				if (stopped) return;
				syncZoom();
				if (zoomOpen) return;
				fit();
			};
			const arm = () => {
				if (stopped) return;
				const doc = frame.contentDocument;
				if (doc === null) return;
				applyZoom(false);
				deps.onDocReady?.(doc);
				if (timer === void 0) timer = deps.setInterval(tick, deps.intervalMs);
				observer?.disconnect();
				observer = new deps.MutationObserverCtor(() => {
					if (stopped) return;
					syncZoom();
				});
				observer.observe(doc, {
					childList: true,
					subtree: true
				});
				tick();
			};
			return {
				attach() {
					frame.addEventListener("load", arm);
					if (frame.contentDocument?.readyState === "complete") arm();
				},
				detach() {
					stopped = true;
					frame.removeEventListener("load", arm);
					if (timer !== void 0) deps.clearInterval(timer);
					timer = void 0;
					observer?.disconnect();
					observer = null;
					frame.classList.remove(FULLSCREEN_CLASS);
					for (const k of CLEARABLE) frame.style[k] = "";
				},
				sync: syncZoom,
				tick,
				load: arm,
				isZoomOpen: () => zoomOpen
			};
		}
		//#endregion
		//#region ../melite-card-deck/src/client/embed-bridge.ts
		/**
		* embed-bridge -- the DSH<->canvas integration (ALL of it lives here, the
		* editor is untouched; 3rd-party seams carry the weight):
		*
		* (a) THEME -- DSH's ui-theme presenter projects --dsw-alias-* tokens as
		*     inline vars on the DSH <body>. The bridge copies them onto the
		*     canvas iframe's <html> custom properties (the editor's tailwind
		*     @theme-inline utilities all resolve through them), so the canvas
		*     re-skins with Skin Center -- live, polled.
		* (b) RAIL  -- the canvas's own left ActivityBar and its Agent lane are
		*     hidden in embed; the DSH details column (the layout extension)
		*     hosts the canvas controls instead (DetailsPanel).
		* (c) LLM   -- the editor's Agent-settings lane is dead surface here
		*     (the assistant IS DSH); hiding it removes the second-LLM
		*     appearance. No /v1/llm call is ever issued from the embed.
		*/
		/** editor token <- DSW alias token (computed values, flipped by Skin Center) */
		const THEME_MAP = [
			["--background", "--dsw-alias-bg-base"],
			["--foreground", "--dsw-alias-label-primary"],
			["--card", "--dsw-alias-bg-layer-2"],
			["--card-foreground", "--dsw-alias-label-primary"],
			["--popover", "--dsw-alias-bg-layer-3"],
			["--popover-foreground", "--dsw-alias-label-primary"],
			["--secondary", "--dsw-alias-bg-module-platform"],
			["--secondary-foreground", "--dsw-alias-label-primary"],
			["--muted", "--dsw-alias-bg-module-platform"],
			["--muted-foreground", "--dsw-alias-label-secondary"],
			["--accent", "--dsw-alias-interactive-bg-hover-solid"],
			["--accent-foreground", "--dsw-alias-label-primary"],
			["--border", "--dsw-alias-border-l2"],
			["--input", "--dsw-alias-border-l3"],
			["--destructive", "--dsw-alias-state-error-primary"],
			["--sidebar", "--dsw-specific-sidebar-fill"],
			["--sidebar-border", "--dsw-alias-border-l2"],
			["--brand", "--dsw-alias-state-business-primary"],
			["--brand-foreground", "--dsw-alias-label-primary-inverted"],
			["--primary", "--dsw-alias-state-business-primary"],
			["--primary-foreground", "--dsw-alias-label-primary-inverted"],
			["--ring", "--dsw-alias-state-business-primary"],
			["--sidebar-primary", "--dsw-alias-state-business-primary"],
			["--sidebar-primary-foreground", "--dsw-alias-label-primary-inverted"],
			["--sidebar-ring", "--dsw-alias-state-business-primary"],
			["--sidebar-accent", "--dsw-alias-interactive-bg-hover-solid"],
			["--sidebar-accent-foreground", "--dsw-alias-label-primary"],
			["--sidebar-foreground", "--dsw-alias-label-primary"],
			["--chart-1", "--dsw-alias-state-business-primary"],
			["--chart-2", "--dsw-alias-state-success-primary"],
			["--chart-3", "--dsw-alias-state-warn-primary"],
			["--chart-4", "--dsw-alias-state-business-primary"],
			["--chart-5", "--dsw-alias-state-error-primary"]
		];
		/** editor button labels whose lanes are DEAD in the DSH embed */
		const HIDDEN_LANES = ["Agent settings"];
		/** The tailwind default palette is a SECOND manual color source
		*  (bg-emerald-500 etc. resolve var(--color-emerald-500)). Under DSH it
		*  does not exist: every chromatic hue is re-pointed at a live alias,
		*  so no palette class can render outside the DSH theme. */
		const PALETTE_HUES = {
			emerald: "--dsw-alias-state-success-primary",
			green: "--dsw-alias-state-success-primary",
			lime: "--dsw-alias-state-success-primary",
			teal: "--dsw-alias-state-business-primary",
			cyan: "--dsw-alias-state-business-primary",
			sky: "--dsw-alias-state-business-primary",
			blue: "--dsw-alias-state-business-primary",
			indigo: "--dsw-alias-state-business-primary",
			violet: "--dsw-alias-state-business-primary",
			purple: "--dsw-alias-state-business-primary",
			fuchsia: "--dsw-alias-state-business-primary",
			pink: "--dsw-alias-state-business-primary",
			red: "--dsw-alias-state-error-primary",
			rose: "--dsw-alias-state-error-primary",
			orange: "--dsw-alias-state-warn-primary",
			amber: "--dsw-alias-state-warn-primary",
			yellow: "--dsw-alias-state-warn-primary"
		};
		const PALETTE_SHADES = [
			"50",
			"100",
			"200",
			"300",
			"400",
			"500",
			"600",
			"700",
			"800",
			"900",
			"950"
		];
		/** Start the bridge for one iframe. Idempotent per frame; poll follows
		*  Skin Center changes and canvas re-mounts until stopped. */
		function startEmbedBridge(frame) {
			let stopped = false;
			const tick = () => {
				if (stopped) return;
				const doc = frame.contentDocument;
				if (!doc || !doc.documentElement) return;
				closeRightPanelTabs();
				const parentStyle = window.getComputedStyle(document.body);
				const root = doc.documentElement;
				for (const pair of THEME_MAP) {
					const value = parentStyle.getPropertyValue(pair[1]).trim();
					if (value !== "") root.style.setProperty(pair[0], value);
				}
				for (const hue of Object.keys(PALETTE_HUES)) {
					const value = parentStyle.getPropertyValue(PALETTE_HUES[hue]).trim();
					if (value === "") continue;
					for (const shade of PALETTE_SHADES) root.style.setProperty("--color-" + hue + "-" + shade, value);
				}
				const dshDark = document.body.hasAttribute("data-ds-dark-theme");
				root.classList.toggle("dark", dshDark);
				root.style.setProperty("color-scheme", dshDark ? "dark" : "light");
				if (!doc.getElementById("dsw-bridge-style")) {
					const style = doc.createElement("style");
					style.id = "dsw-bridge-style";
					style.textContent = "*,*::before,*::after{text-shadow:none!important}";
					(doc.head ?? doc.documentElement).appendChild(style);
				}
				const buttonLabel = (btn) => (btn.getAttribute("aria-label") ?? btn.getAttribute("title") ?? btn.textContent ?? "").trim();
				for (const btn of Array.from(doc.querySelectorAll("button"))) {
					const label = buttonLabel(btn);
					if (HIDDEN_LANES.some((lane) => label.includes(lane))) btn.style.display = "none";
					if (label === "Library") {
						let col = btn.closest("div");
						while (col && col !== doc.body) {
							const cls = (col.className ?? "").toString();
							if (cls.includes("w-12") && cls.includes("flex-col")) {
								col.style.display = "none";
								break;
							}
							col = col.parentElement;
						}
					}
				}
				for (const el of Array.from(doc.querySelectorAll("[aria-label]"))) {
					const a = el.getAttribute("aria-label") ?? "";
					if (HIDDEN_LANES.some((lane) => a === lane)) el.style.display = "none";
				}
			};
			/** Close the canvas's right-panel default tabs -- the strip is the
			*  frame-within-frame right sidebar; closing the last tab closes the
			*  rail itself (RightPanelHost contract). Latched: once the strip is
			*  down, panes the user reopens are never re-closed. JS clicks work
			*  on hidden elements, so order vs. lane-hiding is irrelevant. */
			let rightPanelClosed = false;
			const closeRightPanelTabs = () => {
				if (rightPanelClosed) return;
				const doc2 = frame.contentDocument;
				if (!doc2) return;
				const strip = doc2.querySelector("[aria-label=\"Right sidebar panes\"]");
				if (!strip || strip.childElementCount === 0) return;
				for (const closeBtn of Array.from(doc2.querySelectorAll("button[aria-label]"))) {
					const a = closeBtn.getAttribute("aria-label") ?? "";
					if (a.startsWith("Close ") && a.endsWith(" tab")) closeBtn.click();
				}
				rightPanelClosed = true;
			};
			tick();
			const timer = window.setInterval(tick, 1200);
			frame.addEventListener("load", () => {
				tick();
				closeRightPanelTabs();
			});
			return { stop() {
				stopped = true;
				window.clearInterval(timer);
				frame.removeEventListener("load", tick);
			} };
		}
		//#endregion
		//#region src/client/PipelineCards.tsx
		/**
		* The build_pipeline toolview — THE ACTION CARDS, the real surface.
		*
		* Keyed into the shipped `tool.call.toolview` seat for the wire tool name
		* `build_pipeline`. NOT a form, NOT a summary row: an iframe mounting the
		* editor's AgentCardsEmbed (/editor/?meliteCards=<draftId>) — InlinePipelineCards,
		* the SAME PipelineTileGrid the Library canvas renders (ONE card design,
		* 1:1). The user reviews the tiles, edits in the zoom drilldown, and
		* presses Run ON THE CARD — the run door is executeStage inside the
		* embedded surface, a user gesture. The model composed the draft; it
		* cannot run anything.
		*
		* SEAMLESS IN CHAT (2026-08-22 operator verdict "window in window"):
		*   (a) THEME — startEmbedBridge (the card-deck plugin's ONE bridge, same
		*       source the Library canvas uses) copies DSH's --dsw-alias-* tokens
		*       into the frame. No custom colors anywhere; Skin Center re-skins
		*       both surfaces live.
		*   (b) AUTO-HEIGHT — the frame fits its content (polled), borderless,
		*       scrollbars off: the cards read as LISTED IN THE CHAT, Run all on
		*       top, not a boxed window.
		*   (c) FULLSCREEN DRILLDOWN — when the card zoom overlay mounts inside
		*       the frame ([data-card-zoom-overlay]), the frame itself is
		*       promoted to a fixed full-viewport overlay for its lifetime, so
		*       the drilldown is a REAL fullscreen modal, not a modal trapped in
		*       the tool output box.
		*/
		/** Same-origin editor mount (the deck's host half serves the built dist + proxies /v1). */
		const EDITOR_CARDS = "/editor/?meliteCards=";
		/** Height-fit poll: results loading, toasts, cards added — all change the
		* document height without resizing the frame. Cheap (one scrollHeight
		* read), same-origin. */
		const FIT_INTERVAL_MS = 500;
		/** Parse the build_pipeline call: the draft id (from the settled result's
		* rendered content) + the model (from the call args, header while loading). */
		function parseCardsBlock(block) {
			const settled = block.kind === "tool-result";
			const argsRaw = settled ? block.call?.argsRaw ?? "" : block.argsRaw ?? "";
			let model = null;
			if (argsRaw !== "") try {
				const args = JSON.parse(argsRaw);
				if (typeof args["model"] === "string" && args["model"] !== "") model = args["model"];
			} catch {}
			let draftId = null;
			if (settled && block.isError !== true && Array.isArray(block.content)) for (const part of block.content) {
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
			return {
				draftId,
				model,
				settled,
				isError: block.isError === true
			};
		}
		/** Wire the mounted frame: theme bridge + auto-height + fullscreen zoom. */
		function useSeamlessFrame(draftId) {
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const frame = frameRef.current;
				if (frame === null || draftId === null) return;
				let bridge = null;
				const promotion = createZoomPromotion(frame, {
					intervalMs: FIT_INTERVAL_MS,
					setInterval: (fn, ms) => window.setInterval(fn, ms),
					clearInterval: (id) => window.clearInterval(id),
					MutationObserverCtor: window.MutationObserver,
					overlaySelectors: [ZOOM_OVERLAY_SELECTOR, PREVIEW_DIALOG_SELECTOR],
					onDocReady: () => {
						bridge?.stop();
						bridge = startEmbedBridge(frame);
					}
				});
				promotion.attach();
				return () => {
					promotion.detach();
					bridge?.stop();
				};
			}, [draftId]);
			return frameRef;
		}
		/** One build_pipeline call as the REAL action cards (embedded editor surface). */
		function PipelineCards({ block }) {
			const parsed = (0, react.useMemo)(() => parseCardsBlock(block), [block]);
			const [frameUp, setFrameUp] = (0, react.useState)(false);
			const frameRef = useSeamlessFrame(parsed.draftId);
			if (parsed.settled && !parsed.isError && parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-pipeline-card",
				"data-legacy": "1",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.badge,
							children: "melite"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.model,
							children: parsed.model ?? "pipeline"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.state,
							"data-state": "legacy",
							children: "cards · earlier draft"
						})
					]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-pipeline-card",
				"data-draft-id": parsed.draftId ?? "",
				children: parsed.draftId !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [frameUp ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: card_module_css_default.load,
					children: "cards…"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frameRef,
					className: card_module_css_default.frame,
					src: EDITOR_CARDS + encodeURIComponent(parsed.draftId),
					title: "Melite action cards " + parsed.draftId,
					scrolling: "no",
					onLoad: () => {
						setFrameUp(true);
					}
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: card_module_css_default.load,
					children: parsed.isError ? "draft failed" : "composing…"
				})
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Every card tool that produces a draft — the card tile renders for ALL of them. */
		const CARD_TOOLS = [
			"build_pipeline",
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
			"refine_draft",
			"creature_flow",
			"humanoid_flow",
			"non_humanoid_flow",
			"prop_flow",
			"sprite_sheet"
		];
		/** @deprecated use CARD_TOOLS — kept for back-compat imports */
		const PIPELINE_START_TOOL = CARD_TOOLS[0];
		/** Required services (fiber inject waiting — the slot registry must be up first). */
		const inject = ["slots"];
		/**
		* Register the pipeline card for EVERY card tool so drafts always render
		* as interactive pipelines in the chat — regardless of which tool made them.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (!claimCardViewApply()) return;
			ctx.effect(() => releaseCardViewApply, "melite-card-view: apply claim");
			for (const tool of CARD_TOOLS) try {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: tool
				}, PipelineCards));
			} catch (error) {
				console.error(`[melite-card-view] toolview registration failed for ${tool}:`, error);
			}
		}
		//#endregion
		exports.CARD_TOOLS = CARD_TOOLS;
		exports.PIPELINE_START_TOOL = PIPELINE_START_TOOL;
		exports.PipelineCards = PipelineCards;
		exports.apply = apply;
		exports.inject = inject;
		exports.parseCardsBlock = parseCardsBlock;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map