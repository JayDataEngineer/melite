window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-deck",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/apply-guard.ts
		/**
		* apply-guard — single-mount claim (module singleton). A duplicated client
		* injection would mount a second sidebar entry + overlay; the claim makes
		* the second apply a logged no-op.
		*/
		let claimed = false;
		function claimDeckApply() {
			if (claimed) {
				console.warn("[melite-card-deck] apply called twice — second mount skipped");
				return false;
			}
			claimed = true;
			return true;
		}
		function releaseDeckApply() {
			claimed = false;
		}
		//#endregion
		//#region \0dsh-css:melite-card-deck/src/client/deck.module.css.mjs
		const css$1 = ".al0K6a_overlay{z-index:60;background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent);justify-content:flex-end;align-items:stretch;animation:.16s ease-out al0K6a_dkfade;display:flex;position:fixed;inset:0}.al0K6a_canvasFrame{width:100%;height:100%;min-height:0;overflow:hidden}.al0K6a_canvasIframe{background:var(--dsw-alias-bg-base);border:0;width:100%;height:100%;display:block}.al0K6a_canvas{flex-direction:column;width:100%;height:100%;min-height:0;display:flex;overflow:hidden}.al0K6a_tabRail{border-bottom:1px solid var(--dsw-alias-border-l1);flex-direction:row;flex-shrink:0;gap:2px;padding:8px 12px;display:flex;overflow-x:auto}.al0K6a_tabMain{flex:1;grid-template-columns:1fr 340px;min-height:0;display:grid}.al0K6a_tabEmpty{padding:18px 16px;overflow-y:auto}.al0K6a_tabRuns{flex-direction:column;gap:8px;margin-top:10px;display:flex}@keyframes al0K6a_dkfade{0%{opacity:0}to{opacity:1}}.al0K6a_frame{background:var(--dsw-alias-bg-layer-2);width:min(980px,94vw);height:100vh;color:var(--dsw-alias-label-primary);border-left:1px solid var(--dsw-alias-border-l1);box-shadow:-18px 0 48px color-mix(in srgb, var(--dsw-alias-label-primary) 40%, transparent);flex-direction:column;display:flex}.al0K6a_head{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:12px;padding:14px 18px;display:flex}.al0K6a_title{letter-spacing:.02em;margin:0;font-size:14px;font-weight:650}.al0K6a_subtitle{opacity:.6;font-size:11px}.al0K6a_closeBtn{color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;margin-left:auto;padding:2px 8px;font-size:18px}.al0K6a_closeBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_body{flex:1;grid-template-columns:132px 1fr 340px;min-height:0;display:grid}.al0K6a_rail{border-right:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:2px;padding:10px 8px;display:flex;overflow-y:auto}.al0K6a_railBtn{color:inherit;text-align:left;cursor:pointer;text-transform:capitalize;background:0 0;border:0;border-radius:6px;justify-content:space-between;align-items:center;gap:6px;padding:6px 10px;font-size:12px;display:flex}.al0K6a_railBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_railBtn[data-active]{background:var(--dsw-specific-sidebar-nav-item-active);font-weight:600}.al0K6a_count{opacity:.55;font-size:10px}.al0K6a_grid{grid-template-columns:repeat(auto-fill,minmax(148px,1fr));align-content:start;gap:8px;padding:12px;display:grid;overflow-y:auto}.al0K6a_tile{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);cursor:pointer;color:inherit;text-align:left;border-radius:10px;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;display:flex}.al0K6a_tile:hover{border-color:var(--dsw-alias-border-l3);transform:translateY(-1px)}.al0K6a_tile[data-active]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-specific-sidebar-nav-item-active)}.al0K6a_tileLabel{font-size:12.5px;font-weight:600}.al0K6a_tileGenre{text-transform:uppercase;letter-spacing:.06em;opacity:.55;font-size:9.5px}.al0K6a_tilePlugin{opacity:.4;font-family:ui-monospace,monospace;font-size:9px}.al0K6a_panel{border-left:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:10px;padding:14px;display:flex;overflow-y:auto}.al0K6a_panelHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.al0K6a_panelTitle{margin:0;font-size:13px;font-weight:650}.al0K6a_panelForm{opacity:.5;font-size:9.5px}.al0K6a_modelLine{opacity:.75;margin:0;font-size:11px}.al0K6a_modelLine code{font-size:10.5px}.al0K6a_formSection{flex-direction:column;gap:6px;display:flex}.al0K6a_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:6px 0 2px;font-size:10px}.al0K6a_fieldRow{flex-direction:column;gap:3px;display:flex}.al0K6a_fieldLabel{align-items:center;gap:5px;font-size:11px;font-weight:550;display:flex}.al0K6a_fieldHint{border:1px solid var(--dsw-alias-border-l2);opacity:.6;cursor:help;border-radius:50%;justify-content:center;align-items:center;width:13px;height:13px;font-size:8.5px;display:inline-flex}.al0K6a_req{color:var(--dsw-alias-state-error-primary);margin-left:2px}.al0K6a_typeBadge{opacity:.45;text-transform:none;font-family:ui-monospace,monospace;font-size:8.5px}.al0K6a_input,.al0K6a_textarea{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:inherit;box-sizing:border-box;border-radius:7px;width:100%;padding:6px 8px;font-family:inherit;font-size:12px}.al0K6a_textarea{resize:vertical;min-height:44px}.al0K6a_input:focus,.al0K6a_textarea:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.al0K6a_guide{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;font-size:11px}.al0K6a_guide summary{cursor:pointer;opacity:.7}.al0K6a_guideBody{white-space:pre-wrap;opacity:.8;max-height:180px;margin:6px 0 0;font-size:10.5px;overflow-y:auto}.al0K6a_runBtn{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-inverted);cursor:pointer;border:0;border-radius:8px;margin-top:8px;padding:9px 14px;font-size:12.5px;font-weight:650}.al0K6a_runBtn:disabled{opacity:.45;cursor:not-allowed}.al0K6a_runs{border-top:1px solid var(--dsw-alias-border-l1);max-height:34vh;padding:10px 14px;overflow-y:auto}.al0K6a_runsTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:0 0 8px;font-size:10px}.al0K6a_runsRow{grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:8px;display:grid}.al0K6a_runCard{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;flex-direction:column;gap:6px;padding:9px 11px;display:flex}.al0K6a_runCard[data-status=completed]{border-color:var(--dsw-alias-state-success-primary)}.al0K6a_runCard[data-status=failed],.al0K6a_runCard[data-status=error]{border-color:var(--dsw-alias-state-error-primary)}.al0K6a_runHead{align-items:center;gap:8px;display:flex}.al0K6a_runId{opacity:.65;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;font-size:10px;overflow:hidden}.al0K6a_statusPill{text-transform:uppercase;letter-spacing:.05em;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;margin-left:auto;padding:2px 7px;font-size:9.5px}.al0K6a_statusPill[data-st=completed]{color:var(--dsw-alias-state-success-primary)}.al0K6a_statusPill[data-st=failed],.al0K6a_statusPill[data-st=error],.al0K6a_statusPill[data-st=interrupted],.al0K6a_statusPill[data-st=stopped]{color:var(--dsw-alias-state-error-primary)}.al0K6a_runClose{color:inherit;opacity:.5;cursor:pointer;background:0 0;border:0;font-size:13px}.al0K6a_runClose:hover{opacity:1}.al0K6a_runGrid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px;display:grid}.al0K6a_runGrid img{border-radius:6px;width:100%;display:block}.al0K6a_runPending{opacity:.6;margin:0;font-size:11px}.al0K6a_runOk{color:var(--dsw-alias-state-success-primary);margin:0;font-size:11px}.al0K6a_runError{white-space:pre-wrap;word-break:break-word;max-height:120px;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent);border-radius:6px;margin:0;padding:6px 8px;font-size:10px;overflow-y:auto}.al0K6a_pending{opacity:.6;padding:12px;font-size:12px}.al0K6a_guideTitle{font:var(--ds-font-body-xs,12px/1.5 sans-serif);margin:0 0 4px;font-weight:600}.al0K6a_guideSection{font:var(--ds-font-body-xs,12px/1.5 sans-serif);margin:0 0 4px}.al0K6a_guideList{opacity:.75}.al0K6a_errBlock{padding:14px;font-size:12px}.al0K6a_errBlock pre{white-space:pre-wrap;opacity:.75;max-height:200px;font-size:10.5px;overflow-y:auto}.al0K6a_entry{width:100%;color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:8px;padding:7px 10px;font-size:12px;display:flex}.al0K6a_entry:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_entry[data-active]{background:var(--dsw-specific-sidebar-nav-item-active)}.al0K6a_entryIcon{opacity:.8;display:inline-flex}.al0K6a_entryLabel{text-overflow:ellipsis;font-size:11.5px;overflow:hidden}[data-dsh-frame][data-sidebar-collapsed] .al0K6a_entry{justify-content:center;padding:0}[data-dsh-frame][data-sidebar-collapsed] .al0K6a_entryLabel{display:none}.al0K6a_assetsFrame{background:0 0;border:0;width:100%;height:100%;display:block}";
		const tagId$1 = "@melite-plugin/dsh-card-deck/deck.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var deck_module_css_default = {
			"assetsFrame": "al0K6a_assetsFrame",
			"body": "al0K6a_body",
			"canvas": "al0K6a_canvas",
			"canvasFrame": "al0K6a_canvasFrame",
			"canvasIframe": "al0K6a_canvasIframe",
			"closeBtn": "al0K6a_closeBtn",
			"count": "al0K6a_count",
			"dkfade": "al0K6a_dkfade",
			"entry": "al0K6a_entry",
			"entryIcon": "al0K6a_entryIcon",
			"entryLabel": "al0K6a_entryLabel",
			"errBlock": "al0K6a_errBlock",
			"fieldHint": "al0K6a_fieldHint",
			"fieldLabel": "al0K6a_fieldLabel",
			"fieldRow": "al0K6a_fieldRow",
			"formSection": "al0K6a_formSection",
			"frame": "al0K6a_frame",
			"grid": "al0K6a_grid",
			"guide": "al0K6a_guide",
			"guideBody": "al0K6a_guideBody",
			"guideList": "al0K6a_guideList",
			"guideSection": "al0K6a_guideSection",
			"guideTitle": "al0K6a_guideTitle",
			"head": "al0K6a_head",
			"input": "al0K6a_input",
			"modelLine": "al0K6a_modelLine",
			"overlay": "al0K6a_overlay",
			"panel": "al0K6a_panel",
			"panelForm": "al0K6a_panelForm",
			"panelHead": "al0K6a_panelHead",
			"panelTitle": "al0K6a_panelTitle",
			"pending": "al0K6a_pending",
			"rail": "al0K6a_rail",
			"railBtn": "al0K6a_railBtn",
			"req": "al0K6a_req",
			"runBtn": "al0K6a_runBtn",
			"runCard": "al0K6a_runCard",
			"runClose": "al0K6a_runClose",
			"runError": "al0K6a_runError",
			"runGrid": "al0K6a_runGrid",
			"runHead": "al0K6a_runHead",
			"runId": "al0K6a_runId",
			"runOk": "al0K6a_runOk",
			"runPending": "al0K6a_runPending",
			"runs": "al0K6a_runs",
			"runsRow": "al0K6a_runsRow",
			"runsTitle": "al0K6a_runsTitle",
			"sectionTitle": "al0K6a_sectionTitle",
			"statusPill": "al0K6a_statusPill",
			"subtitle": "al0K6a_subtitle",
			"tabEmpty": "al0K6a_tabEmpty",
			"tabMain": "al0K6a_tabMain",
			"tabRail": "al0K6a_tabRail",
			"tabRuns": "al0K6a_tabRuns",
			"textarea": "al0K6a_textarea",
			"tile": "al0K6a_tile",
			"tileGenre": "al0K6a_tileGenre",
			"tileLabel": "al0K6a_tileLabel",
			"tilePlugin": "al0K6a_tilePlugin",
			"title": "al0K6a_title",
			"typeBadge": "al0K6a_typeBadge"
		};
		//#endregion
		//#region src/client/embed-bridge.ts
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
		//#region ../melite-card-view/src/client/zoomPromotion.ts
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
		//#region src/client/DeckCanvas.tsx
		/**
		* DeckCanvas -- the Cards TAB body: the REAL card-authoring canvas
		* (web/editor surfaces/library+pipeline), served at /editor/ by the host
		* half and mounted here. The embed-bridge re-skins it with DSH theme
		* tokens and strips its own chrome -- the canvas rides DSH's sidebar and
		* details column, it does not bring its own frame.
		*/
		function DeckCanvas() {
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const frame = frameRef.current;
				if (!frame) return;
				let handle = null;
				const arm = () => {
					handle?.stop();
					handle = startEmbedBridge(frame);
				};
				arm();
				const promotion = createZoomPromotion(frame, {
					intervalMs: 500,
					setInterval: (fn, ms) => window.setInterval(fn, ms),
					clearInterval: (id) => window.clearInterval(id),
					MutationObserverCtor: window.MutationObserver,
					overlaySelectors: [ZOOM_OVERLAY_SELECTOR, PREVIEW_DIALOG_SELECTOR],
					fitHeight: false,
					background: "#000"
				});
				promotion.attach();
				return () => {
					promotion.detach();
					handle?.stop();
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: deck_module_css_default.canvasFrame,
				"data-plugin": "melite-card-deck-canvas",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frameRef,
					className: deck_module_css_default.canvasIframe,
					src: "/editor/",
					title: "Melite card canvas",
					allow: "clipboard-read; clipboard-write"
				})
			});
		}
		//#endregion
		//#region src/client/sidebar-entry-core.ts
		/** Find the sidebar shell root element, or undefined while not yet mounted. */
		function sidebarRoot() {
			const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
			if (column === null) return void 0;
			return column.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column.firstElementChild;
		}
		/** The New Session button: nested in the logo row on current shells, a direct child on legacy shells. */
		function newSessionButton(root) {
			const nested = root.querySelector("button[class*=\"newSession\"]");
			if (nested !== null) return nested;
			for (const child of root.children) if (child.tagName === "BUTTON") return child;
		}
		/** Build the entry row (a detached button; insert once the shell is up). */
		function createEntry(options) {
			const entry = document.createElement("button");
			entry.type = "button";
			entry.setAttribute(options.rowAttribute, "");
			if (options.plugin !== void 0) {
				entry.setAttribute("data-dsh-plugin", options.plugin);
				entry.setAttribute("data-dsh-part", "sidebar-entry");
			}
			entry.className = options.css["entry"] ?? "";
			entry.setAttribute("aria-label", options.label());
			if (options.tooltip !== void 0) entry.setAttribute("title", options.tooltip());
			entry.innerHTML = "<span class=\"" + (options.css["entryIcon"] ?? "") + "\">" + options.icon + "</span><span class=\"" + (options.css["entryLabel"] ?? "") + "\">" + options.label() + "</span>";
			entry.addEventListener("click", options.onToggle);
			return entry;
		}
		/** Re-insert the entry after the New Session row (before the browser region). */
		function placeEntry(root, entry, options) {
			const button = newSessionButton(root);
			if (button === void 0) return false;
			if (entry.parentElement !== root) {
				const row = button.closest("[class*=\"logoRow\"]");
				const base = row !== null && row.parentElement === root ? row : button;
				const family = Array.from(root.children).filter((el) => el instanceof HTMLElement && el.matches(options.familySelectors.join(", ")));
				const anchor = options.position === "before" ? family.length > 0 ? family[0] : base.nextElementSibling : family.length > 0 ? family[family.length - 1].nextElementSibling : base.nextElementSibling;
				root.insertBefore(entry, anchor);
			}
			return true;
		}
		/**
		* Mount the sidebar entry, waiting for the shell to render and self-healing
		* on later React re-renders.
		* @param options - the row's attribute/icon/copy/action/ordering configuration.
		* @returns disposer removing the entry and its observers.
		*/
		function mountSidebarEntry(options) {
			if (typeof document !== "undefined" && document.querySelector(options.rowSelector) !== null) return () => {};
			const entry = createEntry(options);
			let root;
			let placed = false;
			const tryPlace = () => {
				if (root !== void 0 && !root.isConnected) {
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				if (placed) {
					if (document.body.contains(entry)) return;
					rootObserver.disconnect();
					root = void 0;
					placed = false;
				}
				root ??= sidebarRoot();
				if (root === void 0) return;
				placed = placeEntry(root, entry, options);
				if (placed) rootObserver.observe(root, {
					childList: true,
					subtree: true
				});
			};
			const waitObserver = new MutationObserver(() => {
				tryPlace();
			});
			waitObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const rootObserver = new MutationObserver(() => {
				if (root === void 0 || !root.isConnected) {
					placed = false;
					tryPlace();
					return;
				}
				if (!root.contains(entry)) placed = placeEntry(root, entry, options);
			});
			const unsubscribeActive = options.active === void 0 ? void 0 : (() => {
				const syncActive = () => {
					if (options.active.isOpen()) entry.dataset.active = "true";
					else delete entry.dataset.active;
				};
				const unsubscribe = options.active.subscribe(syncActive);
				syncActive();
				return unsubscribe;
			})();
			tryPlace();
			return () => {
				waitObserver.disconnect();
				rootObserver.disconnect();
				unsubscribeActive?.();
				entry.remove();
			};
		}
		//#endregion
		//#region src/client/deck-sidebar-entry.tsx
		/**
		* The Cards sidebar entry — the family pattern (Task Board / SSH): ONE row
		* in the left sidebar under New Session, ordered with the extension
		* family's rows, opening the card deck as a FULL TAKEOVER of the center
		* column. (Operator law 2026-08-22: card view is NOT a top tab — the top
		* strip is chat's; the entry point lives in the left sidebar, like Kan.)
		*
		* Mechanics: the row comes from the vendored sidebar-entry-core (self-healing
		* DOM injection — dsh's sidebar shell exposes no registrable nav slot).
		* Toggling mounts a taskboard-style container (absolute inset 0, z-60) as a
		* direct child of the center column and renders DeckCanvas into it via its
		* own React root. deck-fullbleed observes the deck node's presence in the
		* column and applies the takeover (html attr + column sibling-kill +
		* composer hide), so this module never touches styling itself.
		*/
		/** The mounted deck container (taskboard-style overlay child of the column). */
		const CONTAINER_SEL = "[data-melite-cards-deck-view]";
		/** The center column the container overlays (same selector as deck-fullbleed). */
		const COLUMN_SEL$1 = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
		/** Family row selectors this entry orders against (task-board + ssh). */
		const FAMILY_SELECTORS = [
			"[data-dsh-taskboard-entry]",
			"[data-dsh-ssh-entry]",
			"[data-melite-cards-entry]"
		];
		/** Cards icon — two stacked cards, the shell's 16px nav-icon look. */
		const ICON = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" aria-hidden=\"true\"><rect x=\"5.5\" y=\"2.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.3\"/><rect x=\"2.5\" y=\"5.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.3\" fill=\"var(--dsw-alias-bg-base, #17171c)\"/></svg>";
		/** Deck open-state events (the active-bridge the entry core subscribes to). */
		const OPEN_EVENT = "melite-cards-deck-open-changed";
		function isOpen() {
			return document.querySelector(CONTAINER_SEL) !== null;
		}
		/** Mount the deck container into the center column (idempotent). */
		function openDeck() {
			if (isOpen()) return;
			const column = document.querySelector(COLUMN_SEL$1);
			if (column === null) return;
			const container = document.createElement("div");
			container.setAttribute(CONTAINER_SEL.slice(1, -1), "");
			container.style.position = "absolute";
			container.style.inset = "0";
			container.style.zIndex = "60";
			container.style.display = "flex";
			container.style.flexDirection = "column";
			container.style.background = "var(--dsw-alias-bg-base, #17171c)";
			column.appendChild(container);
			(0, react_dom_client.createRoot)(container).render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeckCanvas, {}));
			container.dataset.root = "1";
			document.dispatchEvent(new CustomEvent(OPEN_EVENT));
		}
		/** Unmount and remove the deck container. */
		function closeDeck() {
			const container = document.querySelector(CONTAINER_SEL);
			if (container === null) return;
			container.remove();
			document.dispatchEvent(new CustomEvent(OPEN_EVENT));
		}
		/**
		* Mount the Cards sidebar entry (left sidebar, family block).
		* @returns disposer removing the row.
		*/
		function mountCardsSidebarEntry() {
			return mountSidebarEntry({
				rowAttribute: "data-melite-cards-entry",
				rowSelector: "[data-melite-cards-entry]",
				icon: ICON,
				css: {
					entry: deck_module_css_default["entry"] ?? "",
					entryIcon: deck_module_css_default["entryIcon"] ?? "",
					entryLabel: deck_module_css_default["entryLabel"] ?? ""
				},
				label: () => "Cards",
				tooltip: () => "Melite card deck",
				onToggle: () => {
					isOpen() ? closeDeck() : openDeck();
				},
				position: "before",
				familySelectors: FAMILY_SELECTORS,
				active: {
					subscribe: (listener) => {
						document.addEventListener(OPEN_EVENT, listener);
						return () => {
							document.removeEventListener(OPEN_EVENT, listener);
						};
					},
					isOpen
				}
			});
		}
		//#endregion
		//#region src/client/deck-fullbleed.ts
		/** The deck's activation attribute on <html> (our namespace). */
		const ACTIVE_ATTR = "data-melite-deck-active";
		/** Family activation attributes — cleared when the deck opens. */
		const FAMILY_ACTIVE_ATTRS = ["data-dsh-taskboard-active", "data-dsh-ssh-active"];
		/** The family's cross-panel coordination event (verbatim protocol). */
		const PANEL_ACTIVATE_EVENT = "dsh-panel-activate";
		/** Our panel name on that event bus. */
		const PANEL_NAME = "melite-deck";
		/** The deck plugin node marker (host row of the canvas iframe). */
		const DECK_NODE_SEL = "[data-plugin=\"melite-card-deck-canvas\"]";
		/** The center column (both shell generations, same selector pair as the family). */
		const COLUMN_SEL = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
		/** Structural overlay CSS. ZERO color literals — the theme law: the
		*  deck's own surfaces are themed by the editor canvas inside the
		*  iframe; this layer only positions. */
		const OVERLAY_CSS = [
			COLUMN_SEL + " { position: relative; }",
			"html[" + ACTIVE_ATTR + "]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane=\"conversation\"] > :not(:has(" + DECK_NODE_SEL + ")),",
			"html[" + ACTIVE_ATTR + "]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*=\"centerCol\"] > :not(:has(" + DECK_NODE_SEL + ")) {",
			"  display: none !important;",
			"}",
			"html[" + ACTIVE_ATTR + "]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-pane=\"conversation\"] [class*=\"composerStack\"],",
			"html[" + ACTIVE_ATTR + "]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [class*=\"centerCol\"] [class*=\"composerStack\"] {",
			"  display: none !important;",
			"}",
			"html[" + ACTIVE_ATTR + "]:not([data-dsh-taskboard-active]):not([data-dsh-ssh-active]) [data-dsh-better-sidebar] {",
			"  position: relative;",
			"  z-index: 70;",
			"}"
		].join("\n");
		/** Is the deck view currently the column's resident (exists + visible)? */
		function deckOwnsColumn() {
			const col = document.querySelector(COLUMN_SEL);
			if (!col) return false;
			const deck = col.querySelector(DECK_NODE_SEL);
			if (!deck) return false;
			const r = deck.getBoundingClientRect();
			return r.width > 40 && r.height > 40;
		}
		/** Apply the activation state: attribute + family coordination. */
		function setActive(on) {
			const el = document.documentElement;
			if (on === el.hasAttribute(ACTIVE_ATTR)) return;
			if (on) {
				for (const a of FAMILY_ACTIVE_ATTRS) el.removeAttribute(a);
				el.setAttribute(ACTIVE_ATTR, "");
				document.dispatchEvent(new CustomEvent(PANEL_ACTIVATE_EVENT, { detail: PANEL_NAME }));
			} else el.removeAttribute(ACTIVE_ATTR);
		}
		/** Mount the full-bleed layer: style + observers + event bus seat.
		*  @returns disposer removing everything this call installed. */
		function mountDeckFullbleed() {
			if (typeof document === "undefined") return () => {};
			const styleId = "melite-card-deck-fullbleed";
			if (!document.querySelector("style#" + styleId)) {
				const tag = document.createElement("style");
				tag.id = styleId;
				tag.textContent = OVERLAY_CSS;
				document.head.appendChild(tag);
			}
			let disposed = false;
			let settleTimer = null;
			/** Debounced re-read of the DOM truth -> attribute. */
			const settle = () => {
				if (disposed) return;
				if (settleTimer) clearTimeout(settleTimer);
				settleTimer = setTimeout(() => {
					if (!disposed) setActive(deckOwnsColumn());
				}, 80);
			};
			const columnObserver = new MutationObserver(settle);
			const bodyObserver = new MutationObserver(() => {
				const col = document.querySelector(COLUMN_SEL);
				if (col) columnObserver.observe(col, {
					childList: true,
					subtree: false,
					attributes: true,
					attributeFilter: [
						"style",
						"class",
						"hidden"
					]
				});
				settle();
			});
			bodyObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			const htmlObserver = new MutationObserver(settle);
			htmlObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: [...FAMILY_ACTIVE_ATTRS, ACTIVE_ATTR]
			});
			const col = document.querySelector(COLUMN_SEL);
			if (col) columnObserver.observe(col, {
				childList: true,
				subtree: false,
				attributes: true,
				attributeFilter: [
					"style",
					"class",
					"hidden"
				]
			});
			const onPanelActivate = (e) => {
				if (e.detail !== PANEL_NAME) setActive(false);
			};
			document.addEventListener(PANEL_ACTIVATE_EVENT, onPanelActivate);
			window.addEventListener("resize", settle);
			settle();
			return () => {
				disposed = true;
				if (settleTimer) clearTimeout(settleTimer);
				bodyObserver.disconnect();
				columnObserver.disconnect();
				htmlObserver.disconnect();
				document.removeEventListener(PANEL_ACTIVATE_EVENT, onPanelActivate);
				window.removeEventListener("resize", settle);
				setActive(false);
			};
		}
		//#endregion
		//#region src/client/assets-tab.tsx
		/**
		* assets-tab — RAY MEDIA + RAY CARDS in the DSH right sidebar
		* (dsh-better-sidebar). TWO tabs, because they were TWO things
		* (operator 2026-08-22: "media and the cards to make action cards were
		* different"):
		*
		*   Melite Media — the MEDIA ARCHIVE (what we made): an iframe of
		*     /editor/?meliteAssets=media rendering the REAL SidebarBody (search,
		*     sort, upload, category groups, virtualized). Tiles drag the asset
		*     MIME (application/tech-noir-asset) — drop attaches to a card slot
		*     or spawns an Ops input card.
		*   Melite Cards — the CAPABILITY LIBRARY (what we can make): an iframe of
		*     /editor/?meliteAssets=cards rendering the REAL LibrarySidebar
		*     (search, genre groups, provenance badges, studio tiles). Tiles
		*     drag the capability MIME (application/tech-noir-capability) —
		*     drop lands an action card.
		*   Melite ComfyUI (2026-08-25) — the ComfyUI MANAGEMENT surface: an iframe
		*     of /editor/?meliteAssets=comfy rendering the REAL ComfyManagerRailPanel
		*     (backend endpoint door + Manager upkeep readout/actions) — the old
		*     standalone ComfyUI-Manager plugin, mirrored as a third tab.
		*   Melite Pipelines (2026-08-25) — the PIPELINE TEMPLATES: an iframe of
		*     /editor/?meliteAssets=pipelines rendering the REAL PipelinesSection
		*     under its own search (PipelinesPane). Click loads a spec in-frame;
		*     the row DRAGS application/tech-noir-pipeline — dropping it on the
		*     deck canvas or chat cards lands the WHOLE spec as its action cards
		*     (the drag is what crosses frames; clicks cannot).
		*
		* THE REAL components, MOVED — no reimplementation. Native HTML5 drags
		* cross same-origin frames, so tiles drag from these panels onto the
		* Cards takeover canvas and the chat cards. Both registered on the
		* PUBLIC registry (ctx.betterSidebar.registerTab); DSH theming is LIVE
		* via the ONE embed-bridge each tab runs on its iframe.
		*/
		/** One tab body: an iframe host for one REAL sidebar + the theme bridge. */
		function SidebarFrame({ src, title, marker }) {
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (frameRef.current === null) return;
				const bridge = startEmbedBridge(frameRef.current);
				return () => {
					bridge.stop();
				};
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				ref: frameRef,
				src,
				title,
				className: deck_module_css_default.assetsFrame,
				"data-melite-frame": marker
			});
		}
		function MediaPanelLegacy() {
			/** The persistent overlay frame: built once from the FIRST preview. */
			const [frame, setFrame] = (0, react.useState)(null);
			/** The asset the user wants on screen right now (null = closed). */
			const [target, setTarget] = (0, react.useState)(null);
			/** The last asset the overlay page confirmed ready (echoed id). */
			const [readyId, setReadyId] = (0, react.useState)(null);
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const onMsg = (e) => {
					const d = e.data;
					if (d === null || typeof d !== "object") return;
					if (d.type === "melite-preview-open" && typeof d.asset?.id === "string") {
						const id = d.asset.id;
						console.warn("[MediaPanel] open", id.split("/").pop());
						setFrame((f) => f ?? {
							src: "/editor/?melitePreview=" + encodeURIComponent(id),
							bootAssetId: id
						});
						setTarget(id);
					} else if (d.type === "melite-preview-close") {
						console.warn("[MediaPanel] close");
						setTarget(null);
					} else if (d.type === "melite-preview-ready") {
						console.warn("[MediaPanel] ready echo", d.assetId);
						if (typeof d.assetId === "string") setReadyId(d.assetId);
					}
				};
				window.addEventListener("message", onMsg);
				return () => {
					window.removeEventListener("message", onMsg);
				};
			}, []);
			(0, react.useEffect)(() => {
				console.warn("[MediaPanel] nav-effect", JSON.stringify({
					target,
					readyId
				}));
				if (target === null || readyId === null || readyId === target) return;
				const win = frameRef.current?.contentWindow;
				console.warn("[MediaPanel] posting navigate to", win ? "live win" : "NO WIN");
				win?.postMessage({
					type: "melite-preview-navigate",
					assetId: target
				}, window.location.origin);
			}, [target, readyId]);
			(0, react.useEffect)(() => {
				if (target === null || readyId === target) return;
				const t = window.setTimeout(() => setReadyId(target), 7e3);
				return () => window.clearTimeout(t);
			}, [target, readyId]);
			const revealed = target !== null && readyId === target;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarFrame, {
				src: "/editor/?meliteAssets=media",
				title: "Melite Media",
				marker: "media"
			}), frame !== null && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				ref: frameRef,
				src: frame.src,
				title: "Melite Media preview",
				style: {
					position: "fixed",
					inset: "0",
					width: "100vw",
					height: "100vh",
					border: "0",
					zIndex: 2147483e3,
					background: "#000",
					opacity: revealed ? 1 : 0,
					transition: revealed ? "opacity 140ms ease-out" : "none",
					pointerEvents: revealed ? "auto" : "none"
				}
			}), document.body)] });
		}
		const CardsPanel = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarFrame, {
			src: "/editor/?meliteAssets=cards",
			title: "Melite Cards",
			marker: "cards"
		});
		const ComfyPanel = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarFrame, {
			src: "/editor/?meliteAssets=comfy",
			title: "Melite ComfyUI",
			marker: "comfy"
		});
		const PipelinesPanel = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarFrame, {
			src: "/editor/?meliteAssets=pipelines",
			title: "Melite Pipelines",
			marker: "pipelines"
		});
		/** The picture glyph — the media archive (what we made). */
		function MediaIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2",
						y: "3",
						width: "12",
						height: "10",
						rx: "1.5",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5.6",
						cy: "6.4",
						r: "1",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M2.6 11.4l3.2-3.2 2.4 2.4 2.2-2.2 3 3",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				]
			});
		}
		/** The stacked-cards glyph — the capability library (action cards). */
		function CardsIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "5.5",
					y: "2.5",
					width: "8",
					height: "8",
					rx: "1.5",
					stroke: "currentColor",
					strokeWidth: "1.3"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2.5",
					y: "5.5",
					width: "8",
					height: "8",
					rx: "1.5",
					stroke: "currentColor",
					strokeWidth: "1.3",
					fill: "var(--dsw-alias-bg-base, #17171c)"
				})]
			});
		}
		/** The server-rack glyph — ComfyUI management (the GPU backend + its upkeep). */
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
		/** The connected-nodes glyph — pipeline templates (one spec, N steps). */
		function PipelinesIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2",
						y: "2.5",
						width: "5",
						height: "4",
						rx: "1",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "9",
						y: "9.5",
						width: "5",
						height: "4",
						rx: "1",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.5 6.5v3a2 2 0 0 0 2 2H9",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					})
				]
			});
		}
		function register(ctx, id, title, order, icon, component) {
			ctx.effect(() => {
				const dispose = ctx.betterSidebar.registerTab({
					id,
					title: () => title,
					icon,
					order,
					single: true,
					component
				});
				return typeof dispose === "function" ? dispose : () => {};
			}, "melite-card-deck: " + id + " tab");
		}
		/** Register ALL FOUR tabs on the better-sidebar registry. */
		function registerRayAssetsTab(ctx) {
			register(ctx, "melite-card-deck:media", "Melite Media", 60, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MediaIcon, { size: s }), MediaPanelLegacy);
			register(ctx, "melite-card-deck:cards", "Melite Cards", 61, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardsIcon, { size: s }), CardsPanel);
			register(ctx, "melite-card-deck:comfy", "Melite ComfyUI", 62, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComfyIcon, { size: s }), ComfyPanel);
			register(ctx, "melite-card-deck:pipelines", "Melite Pipelines", 63, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PipelinesIcon, { size: s }), PipelinesPanel);
			let tries = 0;
			const timer = window.setInterval(() => {
				tries++;
				if (tries > 250 || document.querySelector("[data-melite-frame='cards']")) {
					window.clearInterval(timer);
					return;
				}
				ctx.betterSidebar.openTab?.({ type: "melite-card-deck:cards" });
			}, 700);
		}
		//#endregion
		//#region \0dsh-css:melite-card-deck/src/client/ideoField.module.css.mjs
		const css = ".aiHO3W_root{flex-direction:column;gap:8px;width:100%;display:flex}.aiHO3W_toolbar{flex-wrap:wrap;align-items:center;gap:6px;display:flex}.aiHO3W_toolBtn{border:1px solid var(--dsw-alias-border-l2);color:inherit;cursor:pointer;background:0 0;border-radius:7px;align-items:center;gap:5px;padding:4px 8px;font-family:inherit;font-size:11px;line-height:1.2;display:inline-flex}.aiHO3W_toolBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}.aiHO3W_toolBtn[data-on]{background:var(--dsw-specific-sidebar-nav-item-active);font-weight:600}.aiHO3W_toolBtn[data-danger]{color:var(--dsw-alias-state-error-primary)}.aiHO3W_toolBtn svg{display:block}.aiHO3W_divider{background:var(--dsw-alias-border-l2);width:1px;height:18px;margin:0 3px}.aiHO3W_spacer{margin-left:auto}.aiHO3W_aspectWrap{position:relative}.aiHO3W_aspectMenu{z-index:30;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:176px;box-shadow:0 10px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);border-radius:9px;padding:5px;position:absolute;top:calc(100% + 4px);left:0}.aiHO3W_aspectRow{width:100%;color:inherit;cursor:pointer;text-align:left;background:0 0;border:0;border-radius:6px;align-items:center;gap:7px;padding:5px 7px;font-size:11px;display:flex}.aiHO3W_aspectRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_aspectRow[data-active]{background:var(--dsw-specific-sidebar-nav-item-active)}.aiHO3W_aspectDims{opacity:.55;margin-left:auto;font-family:ui-monospace,monospace;font-size:9px}.aiHO3W_status{opacity:.75;min-height:13px;font-size:10px}.aiHO3W_status[data-kind=error]{color:var(--dsw-alias-state-error-primary);opacity:1}.aiHO3W_canvasShell{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:11px;flex-direction:column;align-items:center;padding:10px 10px 22px;display:flex;position:relative}.aiHO3W_canvasOuter{width:100%;position:relative}.aiHO3W_canvas{touch-action:none;-webkit-user-select:none;user-select:none;border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-label-primary) 7%, var(--dsw-alias-bg-base));border-radius:9px;outline:none;width:100%;position:relative;overflow:hidden}.aiHO3W_canvas:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary)}.aiHO3W_canvas[data-draw]{cursor:crosshair}.aiHO3W_canvas[data-png-over]{box-shadow:0 0 0 2px var(--dsw-alias-state-business-primary)}.aiHO3W_canvasBgLayer{position:absolute;inset:0}.aiHO3W_canvasHint{text-align:center;pointer-events:none;line-clamp:4;-webkit-line-clamp:4;color:color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent);justify-content:center;align-items:center;padding:24px;font-size:15px;font-weight:600;display:flex;position:absolute;inset:0;overflow:hidden}.aiHO3W_gridMinor,.aiHO3W_gridMajor{pointer-events:none;position:absolute;inset:0}.aiHO3W_gridMinor{background-image:linear-gradient(to right, color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent) 1px, transparent 1px);background-size:2.5% 2.5%}.aiHO3W_gridMajor{background-image:linear-gradient(to right, color-mix(in srgb, var(--dsw-alias-label-primary) 19%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--dsw-alias-label-primary) 19%, transparent) 1px, transparent 1px);background-size:10% 10%}.aiHO3W_box{position:absolute}.aiHO3W_halo{border:2px solid var(--accent);opacity:.45;pointer-events:none;border-radius:3px;position:absolute;inset:-4px}.aiHO3W_boxBody{border-style:solid;border-width:2px;border-radius:3px;transition:background 80ms;position:absolute;inset:0}.aiHO3W_box[data-type=obj]{--accent:var(--dsw-alias-state-business-primary)}.aiHO3W_box[data-type=text]{--accent:var(--dsw-alias-state-success-primary)}.aiHO3W_box[data-type=logo]{--accent:var(--dsw-alias-state-error-primary)}.aiHO3W_boxBody{border-color:color-mix(in srgb, var(--accent) 72%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent)}.aiHO3W_boxTag{pointer-events:none;letter-spacing:.08em;text-transform:uppercase;background:var(--accent);color:var(--dsw-alias-bg-base);border-radius:3px;align-items:center;gap:3px;padding:1px 5px;font-size:8px;font-weight:700;display:inline-flex;position:absolute;top:4px;left:4px}.aiHO3W_boxLabel{text-overflow:ellipsis;white-space:nowrap;pointer-events:none;max-width:calc(100% - 12px);color:color-mix(in srgb, var(--dsw-alias-label-primary) 85%, transparent);font-size:11px;font-weight:500;position:absolute;top:24px;left:6px;overflow:hidden}.aiHO3W_paletteStrip{pointer-events:none;opacity:.95;height:7px;display:flex;position:absolute;bottom:0;left:0;right:0;overflow:hidden}.aiHO3W_handle{background:var(--dsw-alias-bg-base);border:2px solid var(--accent);border-radius:3px;width:11px;height:11px;position:absolute}.aiHO3W_inlineEditor{z-index:20;resize:none;border:2px solid var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-bg-base) 92%, transparent);color:inherit;border-radius:3px;outline:none;padding:5px;font-size:11px;font-weight:500;position:absolute;inset:0}.aiHO3W_drawPreview{pointer-events:none;border:2px dashed var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);box-sizing:border-box;position:absolute}.aiHO3W_coordReadout{white-space:nowrap;pointer-events:none;opacity:.65;background:color-mix(in srgb, var(--dsw-alias-bg-base) 82%, transparent);border-radius:999px;padding:1px 7px;font-family:ui-monospace,monospace;font-size:9.5px;position:absolute;bottom:-22px;left:50%;transform:translate(-50%)}.aiHO3W_pngOverlay{z-index:20;pointer-events:none;background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent);color:var(--dsw-alias-state-business-primary);flex-direction:column;justify-content:center;align-items:center;gap:5px;font-size:11px;font-weight:600;display:flex;position:absolute;inset:0}.aiHO3W_helperLine{opacity:.6;pointer-events:none;align-items:center;gap:5px;font-size:9.5px;display:flex;position:absolute;bottom:6px;left:11px}.aiHO3W_panelBox{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:11px;overflow:hidden}.aiHO3W_tabRail{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:3px;padding:5px 8px 0;display:flex}.aiHO3W_tabBtn{color:inherit;cursor:pointer;background:0 0;border:0;border-bottom:2px solid #0000;align-items:center;gap:5px;padding:5px 9px;font-family:inherit;font-size:11px;font-weight:550;display:inline-flex}.aiHO3W_tabBtn:hover{color:inherit;opacity:.85}.aiHO3W_tabBtn[data-active]{border-bottom-color:var(--dsw-alias-state-business-primary)}.aiHO3W_tabCount{background:color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);border-radius:999px;margin-left:2px;padding:0 5px;font-family:ui-monospace,monospace;font-size:9px}.aiHO3W_tabBody{padding:11px}.aiHO3W_microLabel{letter-spacing:.14em;text-transform:uppercase;opacity:.62;align-items:center;gap:4px;font-size:9px;font-weight:650;display:inline-flex}.aiHO3W_stack{flex-direction:column;gap:5px;display:flex}.aiHO3W_rowGap{flex-direction:column;gap:9px;display:flex}.aiHO3W_input,.aiHO3W_textarea2{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);color:inherit;box-sizing:border-box;border-radius:7px;width:100%;padding:5px 8px;font-family:inherit;font-size:11.5px}.aiHO3W_textarea2{resize:vertical;min-height:44px}.aiHO3W_input:focus,.aiHO3W_textarea2:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.aiHO3W_monoInput{font-family:ui-monospace,monospace}.aiHO3W_miniBtn{border:1px solid var(--dsw-alias-border-l2);color:inherit;cursor:pointer;background:0 0;border-radius:6px;justify-content:center;align-items:center;gap:4px;padding:3px 8px;font-family:inherit;font-size:10.5px;display:inline-flex}.aiHO3W_miniBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_miniBtn:disabled{opacity:.4;cursor:default}.aiHO3W_chipRow{flex-wrap:wrap;gap:4px;display:flex}.aiHO3W_chip{border:1px solid var(--dsw-alias-border-l2);color:inherit;cursor:pointer;background:0 0;border-radius:5px;padding:2px 6px;font-family:inherit;font-size:8.5px}.aiHO3W_chip:hover{background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_segGroup{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px;display:grid}.aiHO3W_segBtn{color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;padding:5px 6px;font-family:inherit;font-size:10.5px;font-weight:550}.aiHO3W_segBtn[data-active]{background:var(--dsw-specific-sidebar-nav-item-active)}.aiHO3W_grid2{grid-template-columns:1fr 1fr;gap:9px;display:grid}.aiHO3W_grid4{grid-template-columns:repeat(4,1fr);gap:5px;display:grid}.aiHO3W_emptyList{border:1px dashed var(--dsw-alias-border-l2);text-align:center;opacity:.8;border-radius:9px;padding:16px;font-size:11px}.aiHO3W_listScroll{flex-direction:column;gap:4px;max-height:240px;display:flex;overflow-y:auto}.aiHO3W_listRow{cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;align-items:center;gap:7px;padding:4px 7px;font-size:11px;display:flex}.aiHO3W_listRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_listRow[data-sel]{border-color:var(--accent);background:color-mix(in srgb, var(--accent) 10%, transparent)}.aiHO3W_listRow[data-type=obj]{--accent:var(--dsw-alias-state-business-primary)}.aiHO3W_listRow[data-type=text]{--accent:var(--dsw-alias-state-success-primary)}.aiHO3W_listRow[data-type=logo]{--accent:var(--dsw-alias-state-error-primary)}.aiHO3W_listType{background:color-mix(in srgb, var(--accent) 16%, transparent);border-radius:4px;flex-shrink:0;justify-content:center;align-items:center;width:18px;height:18px;display:inline-flex}.aiHO3W_listMain{flex:1;min-width:0}.aiHO3W_listDesc{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.aiHO3W_listBbox{opacity:.55;font-family:ui-monospace,monospace;font-size:8.5px}.aiHO3W_listPalette{border:1px solid var(--dsw-alias-border-l2);border-radius:2px;flex-shrink:0;height:10px;display:flex;overflow:hidden}.aiHO3W_listActs{opacity:0;flex-shrink:0;transition:opacity 90ms;display:flex}.aiHO3W_listRow:hover .aiHO3W_listActs,.aiHO3W_listRow:focus-within .aiHO3W_listActs{opacity:1}.aiHO3W_iconBtn{color:inherit;opacity:.65;cursor:pointer;background:0 0;border:0;border-radius:4px;justify-content:center;align-items:center;width:20px;height:20px;padding:0;display:inline-flex}.aiHO3W_iconBtn:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_iconBtn[data-danger]{color:var(--dsw-alias-state-error-primary)}.aiHO3W_palWrap{display:inline-block;position:relative}.aiHO3W_palMenu{z-index:40;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:200px;box-shadow:0 10px 28px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);border-radius:9px;padding:8px;position:absolute;top:calc(100% + 4px);right:0}.aiHO3W_palRow{width:100%;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:7px;padding:4px 6px;font-size:11px;display:flex}.aiHO3W_palRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_swatch{border:1px solid var(--dsw-alias-border-l2);border-radius:6px;width:26px;height:26px;position:relative;overflow:visible}.aiHO3W_swatch input[type=color]{opacity:0;cursor:pointer;width:100%;height:100%;position:absolute;inset:0}.aiHO3W_swatchRemove{cursor:pointer;background:var(--dsw-alias-state-error-primary);width:14px;height:14px;color:var(--dsw-alias-bg-base);border:0;border-radius:999px;justify-content:center;align-items:center;display:none;position:absolute;top:-6px;right:-6px}.aiHO3W_swatchWrap:hover .aiHO3W_swatchRemove{display:inline-flex}.aiHO3W_jsonSeg{border:1px solid var(--dsw-alias-border-l2);border-radius:7px;gap:2px;padding:2px;display:inline-flex}.aiHO3W_jsonPre{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);white-space:pre-wrap;word-break:break-word;border-radius:8px;max-height:220px;margin:0;padding:8px;font-family:ui-monospace,monospace;font-size:10px;line-height:1.45;overflow:auto}.aiHO3W_jsonErr{color:var(--dsw-alias-state-error-primary)}.aiHO3W_dropZone{border:1px dashed var(--dsw-alias-border-l2);cursor:pointer;color:inherit;border-radius:8px;justify-content:center;align-items:center;gap:6px;padding:7px;font-size:10.5px;display:flex}.aiHO3W_dropZone:hover{background:var(--dsw-alias-interactive-bg-hover)}.aiHO3W_dropZone[data-over]{border-color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent)}.aiHO3W_fullscreen{z-index:2147483000;background:color-mix(in srgb, var(--dsw-alias-label-primary) 55%, var(--dsw-alias-bg-base));flex-direction:column;gap:10px;padding:16px;display:flex;position:fixed;inset:0}.aiHO3W_fsHead{color:var(--dsw-alias-label-primary-inverted,inherit);align-items:center;gap:8px;display:flex}.aiHO3W_fsTitle{align-items:center;gap:7px;margin:0;font-size:13px;font-weight:650;display:inline-flex}.aiHO3W_fsDims{opacity:.6;margin-left:auto;font-family:ui-monospace,monospace;font-size:10px}.aiHO3W_fsBody{flex-direction:column;flex:1;gap:12px;min-height:0;display:flex;overflow:auto}.aiHO3W_fsCanvasPane{flex:1;min-height:0;display:flex}.aiHO3W_fsSidePane{flex-shrink:0;width:100%}@media (width>=900px){.aiHO3W_fsBody{flex-direction:row;align-items:stretch}.aiHO3W_fsSidePane{width:320px;overflow-y:auto}}.aiHO3W_fsCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:11px;padding:11px}";
		const tagId = "@melite-plugin/dsh-card-deck/ideoField.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ideoField_module_css_default = {
			"aspectDims": "aiHO3W_aspectDims",
			"aspectMenu": "aiHO3W_aspectMenu",
			"aspectRow": "aiHO3W_aspectRow",
			"aspectWrap": "aiHO3W_aspectWrap",
			"box": "aiHO3W_box",
			"boxBody": "aiHO3W_boxBody",
			"boxLabel": "aiHO3W_boxLabel",
			"boxTag": "aiHO3W_boxTag",
			"canvas": "aiHO3W_canvas",
			"canvasBgLayer": "aiHO3W_canvasBgLayer",
			"canvasHint": "aiHO3W_canvasHint",
			"canvasOuter": "aiHO3W_canvasOuter",
			"canvasShell": "aiHO3W_canvasShell",
			"chip": "aiHO3W_chip",
			"chipRow": "aiHO3W_chipRow",
			"coordReadout": "aiHO3W_coordReadout",
			"divider": "aiHO3W_divider",
			"drawPreview": "aiHO3W_drawPreview",
			"dropZone": "aiHO3W_dropZone",
			"emptyList": "aiHO3W_emptyList",
			"fsBody": "aiHO3W_fsBody",
			"fsCanvasPane": "aiHO3W_fsCanvasPane",
			"fsCard": "aiHO3W_fsCard",
			"fsDims": "aiHO3W_fsDims",
			"fsHead": "aiHO3W_fsHead",
			"fsSidePane": "aiHO3W_fsSidePane",
			"fsTitle": "aiHO3W_fsTitle",
			"fullscreen": "aiHO3W_fullscreen",
			"grid2": "aiHO3W_grid2",
			"grid4": "aiHO3W_grid4",
			"gridMajor": "aiHO3W_gridMajor",
			"gridMinor": "aiHO3W_gridMinor",
			"halo": "aiHO3W_halo",
			"handle": "aiHO3W_handle",
			"helperLine": "aiHO3W_helperLine",
			"iconBtn": "aiHO3W_iconBtn",
			"inlineEditor": "aiHO3W_inlineEditor",
			"input": "aiHO3W_input",
			"jsonErr": "aiHO3W_jsonErr",
			"jsonPre": "aiHO3W_jsonPre",
			"jsonSeg": "aiHO3W_jsonSeg",
			"listActs": "aiHO3W_listActs",
			"listBbox": "aiHO3W_listBbox",
			"listDesc": "aiHO3W_listDesc",
			"listMain": "aiHO3W_listMain",
			"listPalette": "aiHO3W_listPalette",
			"listRow": "aiHO3W_listRow",
			"listScroll": "aiHO3W_listScroll",
			"listType": "aiHO3W_listType",
			"microLabel": "aiHO3W_microLabel",
			"miniBtn": "aiHO3W_miniBtn",
			"monoInput": "aiHO3W_monoInput",
			"palMenu": "aiHO3W_palMenu",
			"palRow": "aiHO3W_palRow",
			"palWrap": "aiHO3W_palWrap",
			"paletteStrip": "aiHO3W_paletteStrip",
			"panelBox": "aiHO3W_panelBox",
			"pngOverlay": "aiHO3W_pngOverlay",
			"root": "aiHO3W_root",
			"rowGap": "aiHO3W_rowGap",
			"segBtn": "aiHO3W_segBtn",
			"segGroup": "aiHO3W_segGroup",
			"spacer": "aiHO3W_spacer",
			"stack": "aiHO3W_stack",
			"status": "aiHO3W_status",
			"swatch": "aiHO3W_swatch",
			"swatchRemove": "aiHO3W_swatchRemove",
			"swatchWrap": "aiHO3W_swatchWrap",
			"tabBody": "aiHO3W_tabBody",
			"tabBtn": "aiHO3W_tabBtn",
			"tabCount": "aiHO3W_tabCount",
			"tabRail": "aiHO3W_tabRail",
			"textarea2": "aiHO3W_textarea2",
			"toolBtn": "aiHO3W_toolBtn",
			"toolbar": "aiHO3W_toolbar"
		};
		//#endregion
		//#region src/client/ideoField.ts
		const GRID_SIZE = 1e3;
		/** Aspect-ratio presets. Width/height must be multiples of 16 (Ideogram
		*  requirement). The old Tailwind build showed a lucide icon per row; this
		*  port renders a proportional rectangle glyph from w×h instead. */
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
		/** Curated starter palettes — surfaced in the palette editor for one-click fill. */
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
		/** Quick style presets to seed the Style tab. */
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
		/** Curated typography presets for text/logo elements. Each is a short
		*  descriptor injected into the element's `font` field — the model uses
		*  it to steer the rendered typography. */
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
			if (xmin > xmax) [xmin, xmax] = [xmax, xmin];
			if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
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
		function rectToBbox(x, y, w, h) {
			return [
				y,
				x,
				y + h,
				x + w
			];
		}
		function snap(v, enabled) {
			if (!enabled) return v;
			return Math.round(v / 25) * 25 + 0;
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
				if (e.type !== "obj" && e.type !== "text" && e.type !== "logo") return false;
				if (typeof e.desc !== "string" && typeof e.description !== "string") return false;
				if (e.bbox !== void 0 && !Array.isArray(e.bbox)) return false;
				return true;
			});
		}
		/** Parse a JSON string into the internal IdeoElement shape, filling in defaults.
		*  Returns null if the input is not valid. */
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
				const type = el.type === "text" ? "text" : el.type === "logo" ? "logo" : "obj";
				const rawBbox = el.bbox;
				let bbox = [
					200,
					200,
					500,
					500
				];
				if (Array.isArray(rawBbox) && rawBbox.length === 4 && rawBbox.every((v) => typeof v === "number")) bbox = clampBbox(rawBbox);
				else if (typeof el.x === "number" && typeof el.y === "number" && typeof el.w === "number" && typeof el.h === "number") bbox = clampBbox(rectToBbox(el.x * GRID_SIZE, el.y * GRID_SIZE, el.w * GRID_SIZE, el.h * GRID_SIZE));
				const paletteSrc = el.color_palette || el.palette || [];
				const color_palette = Array.isArray(paletteSrc) ? paletteSrc.map((c) => normalizeHex(String(c))).filter((c) => !!c).slice(0, 5) : [];
				const rawDesc = el.desc ?? el.description ?? "";
				const rawText = el.text ?? "";
				const rawFont = el.font ?? "";
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
		/** Serialize internal elements back to the wire JSON array (compact). */
		function serializeElements(elements) {
			const out = elements.map((el) => {
				const obj = {
					type: el.type,
					bbox: el.bbox,
					desc: el.desc
				};
				if (el.type === "text" || el.type === "logo") obj.text = el.text ?? "";
				if ((el.type === "text" || el.type === "logo") && el.font) obj.font = el.font;
				if (el.color_palette.length > 0) obj.color_palette = el.color_palette;
				return obj;
			});
			return JSON.stringify(out);
		}
		/** Extract the Ideogram caption JSON from a PNG's tEXt/zTXt chunks.
		*  Looks for the `prompt`/`parameters`/`caption`… chunks and tries to
		*  find a compositional_deconstruction block. Returns null if none found. */
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
							const decompressed = await new Response(stream).text();
							textChunks[payload.slice(0, nul)] = decompressed;
						}
					}
				} catch (e) {
					console.warn("[ideoField] zTXt chunk decompression failed, skipping:", e);
				}
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
					const obj = JSON.parse(trimmed);
					if (obj?.compositional_deconstruction?.elements) {
						const parsed = parseElementsJSON(JSON.stringify(obj.compositional_deconstruction.elements));
						if (parsed) return parsed;
					}
				} catch {}
				const jsonMatch = trimmed.match(/\{[\s\S]*"compositional_deconstruction"[\s\S]*\}/);
				if (jsonMatch) try {
					const obj = JSON.parse(jsonMatch[0]);
					if (obj?.compositional_deconstruction?.elements) {
						const parsed = parseElementsJSON(JSON.stringify(obj.compositional_deconstruction.elements));
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
		/** Flatten caption object → the editor's flat values record. */
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
		/** Assemble the editor's flat values → caption object for the wire. */
		function assembleCaption(v) {
			const styleType = String(v.style_type ?? "none");
			const out = {};
			const hld = String(v.high_level_description ?? "").trim();
			if (hld) out.high_level_description = hld;
			if (styleType !== "none") {
				const sd = {};
				const a = String(v.aesthetics ?? "").trim();
				const l = String(v.lighting ?? "").trim();
				const m = String(v.medium ?? "").trim();
				const sv = String(v.style_value ?? "").trim();
				if (a) sd.aesthetics = a;
				if (l) sd.lighting = l;
				if (m) sd.medium = m;
				if (styleType === "photo" && sv) sd.photo = sv;
				if (styleType === "art_style" && sv) sd.art_style = sv;
				const palette = sanitizeHexList(String(v.style_palette ?? ""));
				if (palette.length) sd.color_palette = palette;
				if (Object.keys(sd).length) out.style_description = sd;
			}
			const bg = String(v.background ?? "").trim();
			let elements = [];
			try {
				const parsed = JSON.parse(String(v.elements ?? "[]"));
				if (Array.isArray(parsed)) elements = parsed;
			} catch {}
			out.compositional_deconstruction = {
				background: bg || "(describe the scene background)",
				elements
			};
			return out;
		}
		/** Pretty caption preview (the JSON tab's Full caption view). */
		function buildCaptionPreview(caption) {
			return JSON.stringify(caption, null, 2);
		}
		/** Copy with execCommand fallback on insecure origins where
		*  navigator.clipboard is undefined (Tailscale/LAN, 2026-08-18 lesson). */
		async function copyText(text) {
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
					await navigator.clipboard.writeText(text);
					return true;
				}
			} catch {}
			try {
				const ta = document.createElement("textarea");
				ta.value = text;
				ta.style.position = "fixed";
				ta.style.opacity = "0";
				document.body.appendChild(ta);
				ta.select();
				const ok = document.execCommand("copy");
				ta.remove();
				return ok;
			} catch {
				return false;
			}
		}
		//#endregion
		//#region src/client/IdeoCanvasField.tsx
		/**
		* IdeoCanvasField — the ideogram_canvas FORM FIELD renderer for the deck.
		*
		* THE ADVANCED IDEOGRAM MODE, imported into the new card system. Ported
		* from git history:
		*   plugins/ideogram/cards/canvas/{component,IdeogramCanvas,IdeoPanels}.tsx
		*     (the spatial layout editor for Ideogram 4 compositional-deconstruction)
		*   web/editor/src/surfaces/generate/Slots.tsx IdeogramCanvasSlot
		*     (the caption ⇄ flat-values bridge, deleted with 44cd7e3b)
		*
		* Feature parity with the original surface:
		*   • drag-to-create / move / group-move / 8-handle resize on the 0–1000 grid
		*   • multi-select (ctrl/⌘-click), arrow nudge, ⌘D duplicate, ⌫ delete, Esc
		*   • live two-way sync with the raw elements JSON (canvas ⇄ JSON tab)
		*   • per-element inspector: text content, font presets, description, bbox, palette
		*   • style description editor + one-click style/palette/font presets
		*   • PNG metadata re-inflation (drop or pick a generated PNG)
		*   • aspect-ratio presets that sync the card's width/height fields
		*   • fullscreen canvas drilldown
		*
		* Deliberate adaptations (documented, not silent):
		*   • VALUE SEMANTICS — the field value IS params.prompt: the assembled
		*     caption JSON string (assembleCaption on every edit, flattenCaption on
		*     ingest). The family requires prompt non-empty; untouched fields stay
		*     "" so required-marking keeps working.
		*   • NO AI TAB — ideogramAI POSTs /v1/llm/ideogram-ai, which the deck host
		*     half stubs by design ("the assistant IS DSH"). The feature cannot run
		*     here; the JSON tab still exposes the caption for external tooling.
		*   • KEYBOARD SCOPE — shortcuts ride the card root (onKeyDown), not window:
		*     an embedded chat card must not hijack global Delete/arrows.
		*   • TOASTS → inline status line; lucide icons → inline SVGs; Tailwind →
		*     CSS module on --dsw-* tokens (deck law: no color literals).
		*/
		function numOr(v, d) {
			const n = Number(v);
			return Number.isFinite(n) ? n : d;
		}
		function Glyph({ d, size = 13 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d,
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		/** Proportional rectangle glyph for an aspect row. */
		function AspectGlyph({ w, h }) {
			const r = w / h;
			const bw = r >= 1 ? 14 : Math.max(4, Math.round(14 * r));
			const bh = r >= 1 ? Math.max(4, Math.round(14 / r)) : 14;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "15",
				height: "15",
				viewBox: "0 0 16 16",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: (16 - bw) / 2,
					y: (16 - bh) / 2,
					width: bw,
					height: bh,
					rx: "1.5",
					stroke: "currentColor",
					strokeWidth: "1.3",
					fill: "none"
				})
			});
		}
		const G_BOX = "M3 3h10v10H3z";
		const G_TYPE = "M3 4h10 M8 4v9";
		const G_LAYERS = "M8 2l6 3-6 3-6-3z M2 9l6 3 6-3";
		const G_GRID = "M3 3h10v10H3z M3 8h10 M8 3v10";
		const G_MAGNET = "M5 2v6a3 3 0 0 0 6 0V2 M5 2h2v4H5z M9 2h2v4H9z";
		const G_MAX = "M2 6V2h4 M10 2h4v4 M14 10v4h-4 M6 14H2v-4";
		const G_UPLOAD = "M8 11V3 M4.5 6L8 2.5 11.5 6 M3 13h10";
		const G_TRASH = "M3 5h10 M6 5V3h4v2 M5 5l1 9h4l1-9";
		const G_COPY = "M6 6h7v7H6z M10 6V3H3v7h3";
		const G_UP = "M4 10l4-4 4 4";
		const G_DOWN = "M4 6l4 4 4-4";
		const G_PLUS = "M8 3v10 M3 8h10";
		const G_X = "M4 4l8 8 M12 4l-8 8";
		const G_CHECK = "M3 9l3.5 3.5L13 5";
		const G_CLIP = "M6 3h4v2H6zM4 5h8v8H4z M6 8h4";
		const G_PAL = "M8 2a6 6 0 1 0 0 12c1.5 0 1-2 2-2.5S13 12 13.5 10C14.5 6 12 2 8 2z M5.5 6.5h.01 M8 5h.01 M10.5 6.5h.01";
		const G_CODE = "M6 4L2.5 8 6 12 M10 4l3.5 4L10 12";
		const G_IMG = "M2 3h12v10H2z M2 10l3.5-3 3 2.5L11 7l3 3";
		function IdeoCanvasField({ value, onChange, getValues, setSibling }) {
			const [dims, setDims] = (0, react.useState)(() => ({
				w: numOr(getValues().width, 1024),
				h: numOr(getValues().height, 1024)
			}));
			(0, react.useEffect)(() => {
				const t = window.setInterval(() => {
					const w = numOr(getValues().width, 1024);
					const h = numOr(getValues().height, 1024);
					setDims((d) => d.w === w && d.h === h ? d : {
						w,
						h
					});
				}, 1e3);
				return () => window.clearInterval(t);
			}, [getValues]);
			const [flat, setFlat] = (0, react.useState)(() => flattenCaption(value, numOr(getValues().width, 1024), numOr(getValues().height, 1024)));
			const flatRef = (0, react.useRef)(flat);
			(0, react.useEffect)(() => {
				flatRef.current = flat;
			}, [flat]);
			const emitFlat = (0, react.useCallback)((next) => {
				setFlat(next);
				flatRef.current = next;
				onChange(assembleCaption(next));
			}, [onChange]);
			const [elements, setElementsInternal] = (0, react.useState)(() => {
				return parseElementsJSON(String(flat.elements ?? "[]")) ?? [];
			});
			(0, react.useRef)(true);
			const elementsRef = (0, react.useRef)(elements);
			(0, react.useEffect)(() => {
				elementsRef.current = elements;
			}, [elements]);
			const commitElements = (0, react.useCallback)((updater) => {
				const next = updater(elementsRef.current);
				elementsRef.current = next;
				setElementsInternal(next);
				emitFlat({
					...flatRef.current,
					elements: serializeElements(next)
				});
			}, [emitFlat]);
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
			const [fullscreen, setFullscreen] = (0, react.useState)(false);
			const fullscreenRef = (0, react.useRef)(fullscreen);
			(0, react.useEffect)(() => {
				fullscreenRef.current = fullscreen;
			}, [fullscreen]);
			const [status, setStatus] = (0, react.useState)(null);
			const statusTimer = (0, react.useRef)(void 0);
			const say = (0, react.useCallback)((msg, kind = "info") => {
				setStatus({
					msg,
					kind
				});
				window.clearTimeout(statusTimer.current);
				statusTimer.current = window.setTimeout(() => setStatus(null), 4e3);
			}, []);
			(0, react.useEffect)(() => () => window.clearTimeout(statusTimer.current), []);
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
			}, [commitElements, setSelectedId]);
			const deleteIds = (0, react.useCallback)((ids) => {
				commitElements((prev) => prev.filter((el) => !ids.includes(el.id)));
				setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
			}, [commitElements]);
			const makeCopy = (0, react.useCallback)((src) => {
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
				return copy;
			}, []);
			const duplicateIds = (0, react.useCallback)((ids, focusFirst) => {
				let firstNewId = null;
				commitElements((prev) => {
					const copies = [];
					for (const src of prev) {
						if (!ids.includes(src.id)) continue;
						const copy = makeCopy(src);
						if (firstNewId === null) firstNewId = copy.id;
						copies.push(copy);
					}
					return [...prev, ...copies];
				});
				if (focusFirst && firstNewId !== null) setSelectedId(firstNewId);
			}, [
				commitElements,
				makeCopy,
				setSelectedId
			]);
			const reorder = (0, react.useCallback)((id, dir) => {
				commitElements((prev) => {
					const idx = prev.findIndex((e) => e.id === id);
					if (idx === -1) return prev;
					const next = prev.filter((_, i) => i !== idx);
					if (dir === "front") return [...next, prev[idx]];
					return [prev[idx], ...next];
				});
			}, [commitElements]);
			const clearAll = (0, react.useCallback)(() => {
				if (elements.length === 0) return;
				const msg = `Clear all ${elements.length} elements?`;
				if (!window.confirm(msg)) return;
				commitElements(() => []);
				setSelectedId(null);
			}, [
				elements.length,
				commitElements,
				setSelectedId
			]);
			const handleImportElements = (0, react.useCallback)((next, source) => {
				commitElements(() => next);
				setSelectedId(null);
				const n = next.length;
				say(`Loaded ${n} element${n === 1 ? "" : "s"} from ${source}`);
			}, [
				commitElements,
				setSelectedId,
				say
			]);
			const pngInputRef = (0, react.useRef)(null);
			const readPng = (0, react.useCallback)(async (file) => {
				if (!file.type.includes("png")) {
					say("Only PNG files can be re-inflated", "error");
					return false;
				}
				try {
					const parsed = await extractIdeogramCaptionFromPNG(file);
					if (!parsed || parsed.length === 0) {
						say("No Ideogram caption found in PNG metadata");
						return false;
					}
					handleImportElements(parsed, `PNG metadata (${file.name})`);
					return true;
				} catch (err) {
					say(err instanceof Error ? err.message : "Failed to read PNG", "error");
					return false;
				}
			}, [handleImportElements, say]);
			const handlePngPick = (0, react.useCallback)(async (e) => {
				const file = e.target.files?.[0];
				e.target.value = "";
				if (file) await readPng(file);
			}, [readPng]);
			const selected = (0, react.useMemo)(() => elements.find((e) => e.id === selectedId) ?? null, [elements, selectedId]);
			const background = String(flat.background ?? "");
			const ratio = dims.w / dims.h;
			const aspectId = (0, react.useMemo)(() => {
				const match = ASPECT_PRESETS.find((p) => p.w === dims.w && p.h === dims.h);
				if (match) return match.id;
				return [...ASPECT_PRESETS].sort((a, b) => Math.abs(a.w / a.h - ratio) - Math.abs(b.w / b.h - ratio))[0].id;
			}, [
				dims.w,
				dims.h,
				ratio
			]);
			const applyAspect = (0, react.useCallback)((w, h) => {
				setDims({
					w,
					h
				});
				setSibling("width", w);
				setSibling("height", h);
			}, [setSibling]);
			const captionPreview = (0, react.useMemo)(() => buildCaptionPreview(assembleCaption(flat)), [flat]);
			const onKeyDown = (0, react.useCallback)((e) => {
				const t = e.target;
				if (!!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
				if (e.key === "Escape") {
					if (fullscreenRef.current) {
						setFullscreen(false);
						return;
					}
					if (selectedIds.length > 0) setSelectedIds([]);
					return;
				}
				if (selectedIds.length === 0) return;
				const step = e.shiftKey ? 50 : 10;
				if (e.key === "Delete" || e.key === "Backspace") {
					e.preventDefault();
					deleteIds(selectedIds);
					return;
				}
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
					e.preventDefault();
					duplicateIds(selectedIds, false);
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
			}, [
				selectedIds,
				deleteIds,
				duplicateIds,
				commitElements
			]);
			(0, react.useEffect)(() => {
				if (selectedId !== null) setTab("elements");
			}, [selectedId]);
			const inspectorFor = (el) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ElementInspector, {
				element: el,
				onUpdate: (patch) => commitElements((prev) => prev.map((x) => x.id === el.id ? {
					...x,
					...patch
				} : x)),
				onDuplicate: () => duplicateIds([el.id], true),
				onDelete: () => deleteIds([el.id]),
				onBringToFront: () => reorder(el.id, "front"),
				onSendToBack: () => reorder(el.id, "back")
			});
			const listFor = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ElementList, {
				elements,
				selectedIds,
				onSelect: setSelectedId,
				onReorder: reorder,
				onDelete: (id) => deleteIds([id]),
				onDuplicate: (id) => duplicateIds([id], true),
				onAddObject: () => addElement("obj"),
				onAddText: () => addElement("text"),
				onAddLogo: () => addElement("logo")
			});
			const canvasNode = (maxHeight) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdeoCanvas, {
				elements,
				selectedIds,
				onSelect: setSelectedId,
				onToggleSelect: toggleSelected,
				onCommit: commitElements,
				showGrid,
				snapEnabled,
				background,
				width: dims.w,
				height: dims.h,
				maxHeight,
				onImportElements: handleImportElements,
				say
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.root,
				onKeyDown,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "Scene background. Required by Ideogram — sets the environment everything exists in.",
							children: "Background"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: ideoField_module_css_default.textarea2,
							rows: 2,
							value: background,
							placeholder: "A natural wood desk against a white wall.",
							onChange: (e) => emitFlat({
								...flatRef.current,
								background: e.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								onClick: () => addElement("obj"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_BOX }), " Object"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								onClick: () => addElement("text"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_TYPE }), " Text"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: ideoField_module_css_default.divider }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AspectPicker, {
								aspectId,
								onApply: applyAspect
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: ideoField_module_css_default.divider }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								"data-on": showGrid || void 0,
								title: "Toggle 1000-grid overlay",
								onClick: () => setShowGrid((v) => !v),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_GRID })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								"data-on": snapEnabled || void 0,
								title: `Snap to 25-unit grid`,
								onClick: () => setSnapEnabled((v) => !v),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_MAGNET })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: ideoField_module_css_default.spacer }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: pngInputRef,
								type: "file",
								accept: "image/png",
								style: { display: "none" },
								onChange: handlePngPick
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								title: "Re-inflate layout from a generated PNG metadata",
								onClick: () => pngInputRef.current?.click(),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_UPLOAD }), " Load PNG"]
							}),
							elements.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								"data-danger": true,
								title: "Remove every element",
								onClick: clearAll,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_TRASH }), " Clear"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.toolBtn,
								title: "Fullscreen canvas",
								onClick: () => setFullscreen(true),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_MAX })
							})
						]
					}),
					status !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ideoField_module_css_default.status,
						"data-kind": status.kind,
						children: status.msg
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.canvasShell,
						children: [canvasNode(420), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ideoField_module_css_default.helperLine,
							children: elements.length === 0 ? "Drag on the canvas to create a region, or use +Object / +Text" : `${elements.length} element${elements.length === 1 ? "" : "s"} · click to select · drag handles to resize · double-click text to edit`
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.panelBox,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ideoField_module_css_default.tabRail,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TabBtn, {
									active: tab === "elements",
									onClick: () => setTab("elements"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_LAYERS }),
									children: ["Elements", elements.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ideoField_module_css_default.tabCount,
										children: elements.length
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabBtn, {
									active: tab === "style",
									onClick: () => setTab("style"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_PAL }),
									children: "Style"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabBtn, {
									active: tab === "json",
									onClick: () => setTab("json"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_CODE }),
									children: "JSON"
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ideoField_module_css_default.tabBody,
							children: [
								tab === "elements" && (selectedIds.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MultiSelectPanel, {
									count: selectedIds.length,
									onDeleteAll: () => deleteIds(selectedIds),
									onDeselect: () => setSelectedIds([])
								}) : selected ? inspectorFor(selected) : listFor()),
								tab === "style" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StylePanel, {
									values: flat,
									setValues: (updater) => emitFlat(updater(flatRef.current))
								}),
								tab === "json" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JsonPanel, {
									caption: captionPreview,
									elements,
									onImportElements: handleImportElements,
									say
								})
							]
						})]
					}),
					fullscreen && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.fullscreen,
						role: "dialog",
						"aria-label": "Ideogram canvas fullscreen",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ideoField_module_css_default.fsHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
									className: ideoField_module_css_default.fsTitle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										d: G_IMG,
										size: 15
									}), " Ideogram 4 Canvas"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: ideoField_module_css_default.fsDims,
									children: [
										dims.w,
										"×",
										dims.h,
										" · ",
										aspectId
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ideoField_module_css_default.iconBtn,
									title: "Close (Esc)",
									onClick: () => setFullscreen(false),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										d: G_X,
										size: 15
									})
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ideoField_module_css_default.fsBody,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `${ideoField_module_css_default.canvasShell} ${ideoField_module_css_default.fsCanvasPane}`,
								children: canvasNode(720)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ideoField_module_css_default.fsSidePane,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: ideoField_module_css_default.fsCard,
									children: selected ? inspectorFor(selected) : listFor()
								})
							})]
						})]
					}), document.body)
				]
			});
		}
		function IdeoCanvas({ elements, selectedIds, onSelect, onToggleSelect, onCommit, showGrid, snapEnabled, background, width, height, maxHeight = 420, onImportElements, say }) {
			const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
			const containerRef = (0, react.useRef)(null);
			const [mode, setMode] = (0, react.useState)({ kind: "idle" });
			const [pngDragOver, setPngDragOver] = (0, react.useState)(false);
			const [editingTextId, setEditingTextId] = (0, react.useState)(null);
			const [inlineText, setInlineText] = (0, react.useState)("");
			const commitInlineText = (0, react.useCallback)(() => {
				const id = editingTextId;
				if (!id) return;
				const val = inlineText;
				onCommit((prev) => prev.map((el) => el.id === id ? {
					...el,
					text: val
				} : el));
				setEditingTextId(null);
			}, [
				editingTextId,
				inlineText,
				onCommit
			]);
			/** Client pointer coords → ideogram 0–1000 space via the bounding rect. */
			const toLocal = (0, react.useCallback)((clientX, clientY) => {
				const el = containerRef.current;
				if (!el) return {
					x: 0,
					y: 0
				};
				const r = el.getBoundingClientRect();
				return {
					x: clamp((clientX - r.left) / r.width * GRID_SIZE, 0, GRID_SIZE),
					y: clamp((clientY - r.top) / r.height * GRID_SIZE, 0, GRID_SIZE)
				};
			}, []);
			const canDropPng = !!onImportElements;
			const handleDragOver = (0, react.useCallback)((e) => {
				if (!canDropPng) return;
				if (!e.dataTransfer.types.includes("Files")) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "copy";
				if (!pngDragOver) setPngDragOver(true);
			}, [canDropPng, pngDragOver]);
			const handleDragLeave = (0, react.useCallback)((e) => {
				if (e.currentTarget === e.target) setPngDragOver(false);
			}, []);
			const handleDrop = (0, react.useCallback)(async (e) => {
				if (!canDropPng) return;
				const file = e.dataTransfer.files?.[0];
				setPngDragOver(false);
				if (!file) return;
				e.preventDefault();
				if (!file.type.includes("png")) {
					say("Only PNG files can be re-inflated", "error");
					return;
				}
				try {
					const parsed = await extractIdeogramCaptionFromPNG(file);
					if (!parsed || parsed.length === 0) {
						say("No Ideogram caption found in PNG metadata");
						return;
					}
					if (onImportElements) onImportElements(parsed, `PNG metadata (${file.name})`);
				} catch (err) {
					say(err instanceof Error ? err.message : "Failed to read PNG", "error");
				}
			}, [
				canDropPng,
				onImportElements,
				say
			]);
			const patchBbox = (0, react.useCallback)((id, next) => {
				onCommit((prev) => prev.map((el) => el.id === id ? {
					...el,
					bbox: clampBbox(next)
				} : el));
			}, [onCommit]);
			const capturePointer = (0, react.useCallback)((e) => {
				try {
					containerRef.current?.setPointerCapture(e.pointerId);
				} catch {}
			}, []);
			const handleCanvasPointerDown = (0, react.useCallback)((e) => {
				if (e.button !== 0) return;
				const target = e.target;
				if (!(target === containerRef.current || target.dataset.canvasBg === "1" || target.dataset.grid === "1")) return;
				const { x, y } = toLocal(e.clientX, e.clientY);
				onSelect(null);
				capturePointer(e);
				setMode({
					kind: "draw",
					startX: x,
					startY: y,
					curX: x,
					curY: y
				});
			}, [
				toLocal,
				onSelect,
				capturePointer
			]);
			const handleBoxPointerDown = (0, react.useCallback)((e, el) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				if ((e.ctrlKey || e.metaKey) && onToggleSelect) {
					onToggleSelect(el.id);
					return;
				}
				const groupDrag = selectedIds.includes(el.id) && selectedIds.length > 1;
				if (!groupDrag) onSelect(el.id);
				const subjects = (groupDrag ? selectedIds : [el.id]).map((id) => {
					const found = elements.find((x) => x.id === id);
					return found ? {
						id,
						origBbox: found.bbox
					} : null;
				}).filter((s) => !!s);
				const { x, y } = toLocal(e.clientX, e.clientY);
				capturePointer(e);
				setMode({
					kind: "move",
					startX: x,
					startY: y,
					subjects
				});
			}, [
				toLocal,
				onSelect,
				onToggleSelect,
				selectedIds,
				elements,
				capturePointer
			]);
			const handleHandlePointerDown = (0, react.useCallback)((e, el, handle) => {
				if (e.button !== 0) return;
				e.stopPropagation();
				const { x, y } = toLocal(e.clientX, e.clientY);
				capturePointer(e);
				setMode({
					kind: "resize",
					id: el.id,
					handle,
					startX: x,
					startY: y,
					origBbox: el.bbox
				});
			}, [toLocal, capturePointer]);
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
					onCommit((prev) => prev.map((el) => {
						const subj = mode.subjects.find((s) => s.id === el.id);
						if (!subj) return el;
						const [oymin, oxmin, oymax, oxmax] = subj.origBbox;
						const ow = oxmax - oxmin;
						const oh = oymax - oymin;
						const nxmin = clamp(oxmin + dx, 0, GRID_SIZE - ow);
						const nymin = clamp(oymin + dy, 0, GRID_SIZE - oh);
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
					const h = mode.handle;
					if (h.includes("w")) nxmin = clamp(nx, 0, nxmax - 30);
					if (h.includes("e")) nxmax = clamp(nx, nxmin + 30, GRID_SIZE);
					if (h.includes("n")) nymin = clamp(ny, 0, nymax - 30);
					if (h.includes("s")) nymax = clamp(ny, nymin + 30, GRID_SIZE);
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
				onCommit
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
					if (xmax - xmin >= 30 && ymax - ymin >= 30) {
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
						onCommit((prev) => [...prev, newEl]);
						onSelect(newEl.id);
					}
				}
				setMode({ kind: "idle" });
			}, [
				mode,
				onCommit,
				onSelect
			]);
			const cssMaxWidth = Math.round(maxHeight * (width / height));
			const drawMode = mode.kind === "draw";
			const HANDLE_DEFS = [
				{
					id: "nw",
					pos: {
						left: "0%",
						top: "0%"
					},
					cursor: "nwse-resize"
				},
				{
					id: "n",
					pos: {
						left: "50%",
						top: "0%"
					},
					cursor: "ns-resize"
				},
				{
					id: "ne",
					pos: {
						left: "100%",
						top: "0%"
					},
					cursor: "nesw-resize"
				},
				{
					id: "e",
					pos: {
						left: "100%",
						top: "50%"
					},
					cursor: "ew-resize"
				},
				{
					id: "se",
					pos: {
						left: "100%",
						top: "100%"
					},
					cursor: "nwse-resize"
				},
				{
					id: "s",
					pos: {
						left: "50%",
						top: "100%"
					},
					cursor: "ns-resize"
				},
				{
					id: "sw",
					pos: {
						left: "0%",
						top: "100%"
					},
					cursor: "nesw-resize"
				},
				{
					id: "w",
					pos: {
						left: "0%",
						top: "50%"
					},
					cursor: "ew-resize"
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.canvasOuter,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: containerRef,
					className: ideoField_module_css_default.canvas,
					"data-draw": drawMode || void 0,
					"data-png-over": pngDragOver || void 0,
					tabIndex: -1,
					style: {
						aspectRatio: `${width} / ${height}`,
						maxWidth: `min(100%, ${cssMaxWidth}px)`
					},
					onPointerDown: handleCanvasPointerDown,
					onPointerMove: handlePointerMove,
					onPointerUp: finishInteraction,
					onPointerCancel: finishInteraction,
					onKeyDown: void 0,
					onDragOver: canDropPng ? handleDragOver : void 0,
					onDragLeave: canDropPng ? handleDragLeave : void 0,
					onDrop: canDropPng ? handleDrop : void 0,
					children: [
						pngDragOver && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ideoField_module_css_default.pngOverlay,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
								d: G_IMG,
								size: 26
							}), " Drop PNG to restore layout"]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-canvas-bg": "1",
							className: ideoField_module_css_default.canvasBgLayer
						}),
						background !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ideoField_module_css_default.canvasHint,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: background })
						}),
						showGrid && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-grid": "1",
							className: ideoField_module_css_default.gridMinor
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-grid": "1",
							className: ideoField_module_css_default.gridMajor
						})] }),
						elements.map((el) => {
							const { x, y, w, h } = bboxToRect(el.bbox);
							const isSel = selectedIds.includes(el.id);
							const isText = el.type === "text";
							const isLogo = el.type === "logo";
							const label = isText || isLogo ? `“${el.text || el.type}”` : el.desc !== "" ? el.desc : "object";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.box,
								"data-type": el.type,
								style: {
									left: `${x / 10}%`,
									top: `${y / 10}%`,
									width: `${w / 10}%`,
									height: `${h / 10}%`
								},
								children: [
									isSel && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: ideoField_module_css_default.halo }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										onPointerDown: (e) => handleBoxPointerDown(e, el),
										onDoubleClick: isText || isLogo ? () => {
											setEditingTextId(el.id);
											setInlineText(el.text ?? "");
										} : void 0,
										className: ideoField_module_css_default.boxBody,
										title: label,
										style: { cursor: mode.kind === "move" && mode.subjects.some((s) => s.id === el.id) ? "grabbing" : "grab" }
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: ideoField_module_css_default.boxTag,
										children: isText ? "TXT" : isLogo ? "LOGO" : "OBJ"
									}),
									w > 60 && h > 80 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: ideoField_module_css_default.boxLabel,
										children: label
									}),
									el.color_palette.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: ideoField_module_css_default.paletteStrip,
										children: el.color_palette.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
											background: c,
											flex: 1
										} }, i))
									}),
									isSel && el.id === primaryId && editingTextId === null && HANDLE_DEFS.map((hdef) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										onPointerDown: (e) => handleHandlePointerDown(e, el, hdef.id),
										className: ideoField_module_css_default.handle,
										style: {
											...hdef.pos,
											transform: "translate(-50%, -50%)",
											cursor: hdef.cursor
										}
									}, hdef.id)),
									editingTextId === el.id && (isText || isLogo) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										autoFocus: true,
										value: inlineText,
										onChange: (e) => setInlineText(e.target.value),
										onBlur: commitInlineText,
										onPointerDown: (e) => e.stopPropagation(),
										onKeyDown: (e) => {
											if (e.key === "Enter" && !e.shiftKey) {
												e.preventDefault();
												e.stopPropagation();
												commitInlineText();
											} else if (e.key === "Escape") {
												e.preventDefault();
												e.stopPropagation();
												setEditingTextId(null);
											}
										},
										onDoubleClick: (e) => e.stopPropagation(),
										placeholder: isLogo ? "Logo text…" : "Text…",
										className: ideoField_module_css_default.inlineEditor
									})
								]
							}, el.id);
						}),
						mode.kind === "draw" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ideoField_module_css_default.drawPreview,
							style: {
								left: `${Math.min(mode.startX, mode.curX) / 10}%`,
								top: `${Math.min(mode.startY, mode.curY) / 10}%`,
								width: `${Math.abs(mode.curX - mode.startX) / 10}%`,
								height: `${Math.abs(mode.curY - mode.startY) / 10}%`
							}
						})
					]
				}), (mode.kind === "draw" || mode.kind === "move" || mode.kind === "resize") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ideoField_module_css_default.coordReadout,
					children: [
						mode.kind === "draw" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							"draw ",
							Math.round(Math.min(mode.startX, mode.curX)),
							",",
							Math.round(Math.min(mode.startY, mode.curY)),
							" → ",
							Math.round(Math.max(mode.startX, mode.curX)),
							",",
							Math.round(Math.max(mode.startY, mode.curY))
						] }),
						mode.kind === "move" && (() => {
							const sid = mode.subjects[0]?.id;
							const el = sid !== void 0 ? elements.find((e) => e.id === sid) : void 0;
							if (!el) return null;
							const n = mode.subjects.length;
							return `${n > 1 ? `${n} els · ` : ""}bbox = [${el.bbox.map((v) => Math.round(v)).join(", ")}]`;
						})(),
						mode.kind === "resize" && (() => {
							const el = elements.find((e) => e.id === mode.id);
							if (!el) return null;
							return `${mode.handle} → [${el.bbox.map((v) => Math.round(v)).join(", ")}]`;
						})()
					]
				})]
			});
		}
		function TabBtn({ active, onClick, icon, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick,
				className: ideoField_module_css_default.tabBtn,
				"data-active": active || void 0,
				children: [icon, children]
			});
		}
		/** Aspect-ratio dropdown — presets sync the card width/height fields. */
		function AspectPicker({ aspectId, onApply }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.aspectWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ideoField_module_css_default.toolBtn,
					title: "Aspect ratio (syncs width × height)",
					onClick: () => setOpen((v) => !v),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AspectGlyph, {
						w: 1024,
						h: 1024
					}), aspectId]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "fixed",
						inset: 0,
						zIndex: 29
					},
					onClick: () => setOpen(false)
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ideoField_module_css_default.aspectMenu,
					children: ASPECT_PRESETS.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: ideoField_module_css_default.aspectRow,
						"data-active": p.id === aspectId || void 0,
						onClick: () => {
							onApply(p.w, p.h);
							setOpen(false);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AspectGlyph, {
								w: p.w,
								h: p.h
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: p.id }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ideoField_module_css_default.aspectDims,
								children: [
									p.w,
									"×",
									p.h
								]
							})
						]
					}, p.id))
				})] })]
			});
		}
		function MultiSelectPanel({ count, onDeleteAll, onDeselect }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.rowGap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 7,
							fontSize: 12.5,
							fontWeight: 550
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_LAYERS }),
							" ",
							count,
							" elements selected"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: 0,
							fontSize: 10.5,
							opacity: .65
						},
						children: "Drag to move the group together. Use arrow keys to nudge. Ctrl/⌘-click toggles selection."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ideoField_module_css_default.miniBtn,
							onClick: onDeleteAll,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_TRASH }), " Delete all"]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ideoField_module_css_default.miniBtn,
							onClick: onDeselect,
							children: "Deselect"
						})]
					})
				]
			});
		}
		/** Editable color palette row — swatch picker + hex text + presets. */
		function ColorPaletteInput({ colors, onChange, max = 5 }) {
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const safe = colors.slice(0, max);
			const update = (i, v) => {
				const norm = normalizeHex(v);
				const next = [...safe];
				next[i] = norm ?? v;
				onChange(next);
			};
			const remove = (i) => onChange(safe.filter((_, idx) => idx !== i));
			const add = () => {
				if (safe.length >= max) return;
				onChange([...safe, "#CCCCCC"]);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ideoField_module_css_default.rowGap,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: 6
					},
					children: [
						safe.map((c, i) => {
							const norm = normalizeHex(c);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "swatchWrap",
								style: { position: "relative" },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ideoField_module_css_default.swatch,
									style: { background: norm ?? "transparent" },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "color",
										value: norm ?? "#000000",
										onChange: (e) => update(i, e.target.value.toUpperCase()),
										"aria-label": `Color ${i + 1}`
									}), norm === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											position: "absolute",
											inset: 0,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: 9,
											color: "var(--dsw-alias-state-error-primary)",
											pointerEvents: "none"
										},
										children: "?"
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ideoField_module_css_default.swatchRemove,
									"aria-label": "Remove color",
									onClick: () => remove(i),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										d: G_X,
										size: 8
									})
								})]
							}, i);
						}),
						safe.length < max && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ideoField_module_css_default.swatch,
							"aria-label": "Add color",
							style: {
								background: "transparent",
								borderStyle: "dashed",
								cursor: "pointer"
							},
							onClick: add,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									position: "absolute",
									inset: 0,
									display: "flex",
									alignItems: "center",
									justifyContent: "center"
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
									d: G_PLUS,
									size: 11
								})
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: `${ideoField_module_css_default.input} ${ideoField_module_css_default.monoInput}`,
							style: {
								flex: 1,
								minWidth: 110
							},
							value: safe.join(","),
							onChange: (e) => onChange(sanitizeHexList(e.target.value)),
							placeholder: "#RRGGBB,..."
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ideoField_module_css_default.palWrap,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								title: "Preset palettes",
								"aria-label": "Preset palettes",
								onClick: () => setPresetOpen((v) => !v),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
									d: G_PAL,
									size: 13
								})
							}), presetOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									position: "fixed",
									inset: 0,
									zIndex: 39
								},
								onClick: () => setPresetOpen(false)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.palMenu,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: ideoField_module_css_default.microLabel,
									style: { marginBottom: 5 },
									children: "Palettes"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: ideoField_module_css_default.stack,
									children: PALETTE_PRESETS.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: ideoField_module_css_default.palRow,
										onClick: () => {
											onChange(p.colors.slice(0, max));
											setPresetOpen(false);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: ideoField_module_css_default.listPalette,
											style: { border: 0 },
											children: p.colors.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
												background: c,
												width: 10,
												display: "block",
												height: "100%"
											} }, i))
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: p.name })]
									}, p.name))
								})]
							})] })]
						})
					]
				})
			});
		}
		/** Per-element inspector — text/font/desc/bbox/palette. */
		function ElementInspector({ element, onUpdate, onDuplicate, onDelete, onBringToFront, onSendToBack }) {
			const [ymin, xmin, ymax, xmax] = element.bbox;
			const setBbox = (next) => onUpdate({ bbox: clampBbox(next) });
			const hasText = element.type === "text" || element.type === "logo";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.rowGap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ideoField_module_css_default.listType,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
									d: hasText ? G_TYPE : G_BOX,
									size: 11
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 10,
									fontWeight: 700,
									letterSpacing: ".07em",
									textTransform: "uppercase",
									opacity: .75
								},
								children: element.type
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									marginLeft: "auto",
									display: "inline-flex",
									gap: 2
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ideoField_module_css_default.iconBtn,
										title: "Send to back",
										onClick: onSendToBack,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_DOWN })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ideoField_module_css_default.iconBtn,
										title: "Bring to front",
										onClick: onBringToFront,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_UP })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ideoField_module_css_default.iconBtn,
										title: "Duplicate (Ctrl/⌘D)",
										onClick: onDuplicate,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_COPY })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ideoField_module_css_default.iconBtn,
										"data-danger": true,
										title: "Delete (Del)",
										onClick: onDelete,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_TRASH })
									})
								]
							})
						]
					}),
					hasText && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "The literal text this element should render",
							children: "Text content"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: ideoField_module_css_default.input,
							value: element.text ?? "",
							placeholder: "COFFEE TIME",
							onChange: (e) => onUpdate({ text: e.target.value })
						})]
					}),
					hasText && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ideoField_module_css_default.microLabel,
								title: "Typography descriptor injected into the prompt to steer font style",
								children: "Font style"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: ideoField_module_css_default.input,
								value: element.font ?? "",
								placeholder: "bold geometric sans-serif, all caps",
								onChange: (e) => onUpdate({ font: e.target.value === "" ? void 0 : e.target.value })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ideoField_module_css_default.chipRow,
								children: FONT_PRESETS.slice(0, 6).map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ideoField_module_css_default.chip,
									title: preset,
									onClick: () => onUpdate({ font: preset }),
									children: preset.split(",")[0]
								}, preset))
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "Short visual description of what should appear in this region",
							children: hasText ? "Typography description" : "Object description"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: ideoField_module_css_default.textarea2,
							value: element.desc,
							rows: 2,
							placeholder: element.type === "text" ? "bold sans-serif typography, all caps, dark navy" : "a ceramic coffee mug, steam rising",
							onChange: (e) => onUpdate({ desc: e.target.value })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ideoField_module_css_default.microLabel,
								title: "Bounding box on the 0–1000 ideogram grid [ymin, xmin, ymax, xmax]",
								children: "Bounding box"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									fontSize: 9.5,
									fontFamily: "ui-monospace, monospace",
									opacity: .6
								},
								children: [
									Math.round(ymax - ymin),
									" × ",
									Math.round(xmax - xmin)
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ideoField_module_css_default.grid4,
							children: [
								[
									"ymin",
									ymin,
									0
								],
								[
									"xmin",
									xmin,
									1
								],
								[
									"ymax",
									ymax,
									2
								],
								[
									"xmax",
									xmax,
									3
								]
							].map(([lbl, val, idx]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.stack,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										textAlign: "center",
										fontSize: 9,
										fontFamily: "ui-monospace, monospace",
										textTransform: "uppercase",
										opacity: .55
									},
									children: lbl
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									min: 0,
									max: GRID_SIZE,
									value: Math.round(val),
									className: `${ideoField_module_css_default.input} ${ideoField_module_css_default.monoInput}`,
									style: { textAlign: "center" },
									onChange: (e) => {
										const n = clamp(Number(e.target.value === "" ? 0 : e.target.value), 0, GRID_SIZE);
										const next = [...element.bbox];
										next[idx] = n;
										let [a, b, c, d] = next;
										if (idx === 0 || idx === 2) {
											if (idx === 0 && n > c) c = n + 30;
											if (idx === 2 && n < a) a = n - 30;
										} else {
											if (idx === 1 && n > d) d = n + 30;
											if (idx === 3 && n < b) b = n - 30;
										}
										setBbox([
											a,
											b,
											c,
											d
										]);
									}
								})]
							}, lbl))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "Per-element color palette (up to 5 hex colors). Optional.",
							children: "Color palette"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ColorPaletteInput, {
							colors: element.color_palette,
							onChange: (next) => onUpdate({ color_palette: next })
						})]
					})
				]
			});
		}
		/** Layout stack list — top-first, hover actions. */
		function ElementList({ elements, selectedIds, onSelect, onReorder, onDelete, onDuplicate, onAddObject, onAddText, onAddLogo }) {
			if (elements.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.emptyList,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							opacity: .5,
							marginBottom: 6
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
							d: G_LAYERS,
							size: 18
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { fontWeight: 600 },
						children: "No elements yet"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: "4px auto 0",
							maxWidth: "34ch",
							fontSize: 10.5,
							opacity: .7
						},
						children: "Add an object, text, or logo element, or drag on the canvas to create a region."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							marginTop: 10,
							display: "flex",
							justifyContent: "center",
							gap: 5
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								onClick: onAddObject,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_BOX }), " Object"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								onClick: onAddText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_TYPE }), " Text"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								onClick: onAddLogo,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_LAYERS }), " Logo"]
							})
						]
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.stack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 3px 3px"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ideoField_module_css_default.microLabel,
						children: "Layout stack"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 9.5,
							opacity: .5
						},
						children: "top → bottom"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ideoField_module_css_default.listScroll,
					children: [...elements].reverse().map((el) => {
						const realIdx = elements.length - 1 - elements.indexOf(el);
						const isSel = selectedIds.includes(el.id);
						const preview = el.type === "text" || el.type === "logo" ? `“${el.text || el.type}”` : el.desc !== "" ? el.desc : `Object ${realIdx + 1}`;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							onClick: () => onSelect(el.id),
							className: ideoField_module_css_default.listRow,
							"data-type": el.type,
							"data-sel": isSel || void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.listType,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										d: el.type === "text" ? G_TYPE : el.type === "logo" ? G_LAYERS : G_BOX,
										size: 11
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ideoField_module_css_default.listMain,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: ideoField_module_css_default.listDesc,
										children: preview
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: ideoField_module_css_default.listBbox,
										children: [
											"bbox [",
											el.bbox.map((v) => Math.round(v)).join(", "),
											"]"
										]
									})]
								}),
								el.color_palette.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.listPalette,
									children: el.color_palette.slice(0, 4).map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										background: c,
										width: 6,
										display: "block",
										height: "100%"
									} }, i))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: ideoField_module_css_default.listActs,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ideoField_module_css_default.iconBtn,
											"aria-label": "Bring to front",
											title: "Bring to front",
											onClick: (e) => {
												e.stopPropagation();
												onReorder(el.id, "front");
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
												d: G_UP,
												size: 11
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ideoField_module_css_default.iconBtn,
											"aria-label": "Send to back",
											title: "Send to back",
											onClick: (e) => {
												e.stopPropagation();
												onReorder(el.id, "back");
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
												d: G_DOWN,
												size: 11
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ideoField_module_css_default.iconBtn,
											"aria-label": "Duplicate",
											title: "Duplicate",
											onClick: (e) => {
												e.stopPropagation();
												onDuplicate(el.id);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
												d: G_COPY,
												size: 11
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ideoField_module_css_default.iconBtn,
											"aria-label": "Delete",
											title: "Delete",
											"data-danger": true,
											onClick: (e) => {
												e.stopPropagation();
												onDelete(el.id);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
												d: G_TRASH,
												size: 11
											})
										})
									]
								})
							]
						}, el.id);
					})
				})]
			});
		}
		/** Style description editor — presets + flat style fields. */
		function StylePanel({ values, setValues }) {
			const styleType = values.style_type || "none";
			const set = (k, v) => setValues((prev) => ({
				...prev,
				[k]: v
			}));
			const palette = (0, react.useMemo)(() => sanitizeHexList(String(values.style_palette ?? "")), [values.style_palette]);
			const applyPreset = (idx) => {
				const p = STYLE_PRESETS[idx];
				setValues((prev) => ({
					...prev,
					style_type: p.style_type,
					aesthetics: p.aesthetics,
					lighting: p.lighting,
					medium: p.medium,
					style_value: p.style_value,
					style_palette: p.palette.join(",")
				}));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.rowGap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "Click a preset to seed the style fields. Edit afterwards as needed.",
							children: "Style presets"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ideoField_module_css_default.chipRow,
							children: STYLE_PRESETS.map((p, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								onClick: () => applyPreset(i),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.listPalette,
									style: {
										border: 0,
										height: 10
									},
									children: p.palette.map((c, ci) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										background: c,
										width: 6,
										display: "block",
										height: "100%"
									} }, ci))
								}), p.name]
							}, p.name))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "One-line overview of the whole image. Optional but recommended.",
							children: "High-level description"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: ideoField_module_css_default.input,
							value: String(values.high_level_description ?? ""),
							placeholder: "A cinematic shot of a workspace",
							onChange: (e) => set("high_level_description", e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "Toggle the style_description block on/off and pick photo vs art_style.",
							children: "Style mode"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ideoField_module_css_default.segGroup,
							children: [
								"none",
								"photo",
								"art_style"
							].map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.segBtn,
								"data-active": styleType === t || void 0,
								onClick: () => set("style_type", t),
								children: t === "none" ? "None" : t === "photo" ? "Photo" : "Art Style"
							}, t))
						})]
					}),
					styleType !== "none" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.grid2,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.stack,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.microLabel,
									children: "Aesthetics"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ideoField_module_css_default.input,
									value: String(values.aesthetics ?? ""),
									placeholder: "cinematic, vibrant…",
									onChange: (e) => set("aesthetics", e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.stack,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.microLabel,
									children: "Lighting"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ideoField_module_css_default.input,
									value: String(values.lighting ?? ""),
									placeholder: "golden hour, neon…",
									onChange: (e) => set("lighting", e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.stack,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.microLabel,
									children: "Medium"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ideoField_module_css_default.input,
									value: String(values.medium ?? ""),
									placeholder: "35mm film, oil on canvas…",
									onChange: (e) => set("medium", e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ideoField_module_css_default.stack,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ideoField_module_css_default.microLabel,
									title: styleType === "photo" ? "Photo treatment details" : "Art movement or named style",
									children: styleType === "photo" ? "Photo detail" : "Art style"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: ideoField_module_css_default.input,
									value: String(values.style_value ?? ""),
									placeholder: styleType === "photo" ? "Kodak Portra 400, grainy" : "Impressionist, Baroque",
									onChange: (e) => set("style_value", e.target.value)
								})]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ideoField_module_css_default.stack,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ideoField_module_css_default.microLabel,
							title: "Global style color palette (up to 8 hex colors). Optional.",
							children: "Style palette"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ColorPaletteInput, {
							colors: palette,
							onChange: (next) => set("style_palette", next.join(",")),
							max: 8
						})]
					})] })
				]
			});
		}
		/** JSON tab — full caption preview (read-only + copy) and a live two-way
		*  elements-JSON editor with debounced validation. */
		function JsonPanel({ caption, elements, onImportElements, say }) {
			const [subTab, setSubTab] = (0, react.useState)("caption");
			const [copied, setCopied] = (0, react.useState)(false);
			const [dragOver, setDragOver] = (0, react.useState)(false);
			const [rawElements, setRawElements] = (0, react.useState)("");
			const [parseError, setParseError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				setRawElements(JSON.stringify(elements, null, 2));
				setParseError(null);
			}, [elements]);
			(0, react.useEffect)(() => {
				if (rawElements.trim() === "") {
					setParseError(null);
					return;
				}
				const parsed = parseElementsJSON(rawElements);
				if (parsed !== null && JSON.stringify(parsed.map(({ id: _id, ...r }) => r)) === JSON.stringify(elements.map(({ id: _id2, ...r }) => r))) {
					setParseError(null);
					return;
				}
				const t = window.setTimeout(() => {
					if (parseElementsJSON(rawElements) === null) setParseError("Invalid JSON — must be an array of {type, desc, bbox}");
					else setParseError(null);
				}, 200);
				return () => window.clearTimeout(t);
			}, [rawElements, elements]);
			const handleCopy = async () => {
				if (!await copyText(subTab === "caption" ? caption : rawElements)) {
					say("Clipboard unavailable", "error");
					return;
				}
				setCopied(true);
				window.setTimeout(() => setCopied(false), 1200);
			};
			const handleApplyElements = () => {
				const parsed = parseElementsJSON(rawElements);
				if (parsed === null) {
					say("Cannot apply — JSON is invalid", "error");
					return;
				}
				onImportElements(parsed, "manual JSON");
			};
			const fileInputRef = (0, react.useRef)(null);
			const readPng = (0, react.useCallback)(async (file) => {
				if (!file.type.includes("png")) {
					say("Only PNG files can be re-inflated", "error");
					return;
				}
				try {
					const parsed = await extractIdeogramCaptionFromPNG(file);
					if (!parsed || parsed.length === 0) {
						say("No Ideogram caption found in PNG metadata");
						return;
					}
					onImportElements(parsed, `PNG metadata (${file.name})`);
				} catch (err) {
					say(err instanceof Error ? err.message : "Failed to read PNG", "error");
				}
			}, [onImportElements, say]);
			const handleDrop = async (e) => {
				e.preventDefault();
				setDragOver(false);
				const file = e.dataTransfer.files?.[0];
				if (file) await readPng(file);
			};
			const handleFilePick = async (e) => {
				const file = e.target.files?.[0];
				e.target.value = "";
				if (file) await readPng(file);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ideoField_module_css_default.stack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 5
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ideoField_module_css_default.jsonSeg,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.segBtn,
								"data-active": subTab === "caption" || void 0,
								onClick: () => setSubTab("caption"),
								style: { padding: "3px 9px" },
								children: "Full caption"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.segBtn,
								"data-active": subTab === "elements" || void 0,
								onClick: () => setSubTab("elements"),
								style: { padding: "3px 9px" },
								children: "Elements JSON"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								marginLeft: "auto",
								display: "inline-flex",
								gap: 4
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								onClick: handleCopy,
								children: [copied ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_CHECK }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { d: G_CLIP }), " Copy"]
							}), subTab === "elements" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ideoField_module_css_default.miniBtn,
								title: "Parse the textarea and apply to canvas",
								onClick: handleApplyElements,
								disabled: parseError !== null,
								children: "Apply"
							})]
						})]
					}),
					subTab === "caption" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: ideoField_module_css_default.jsonPre,
						children: caption
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: `${ideoField_module_css_default.textarea2} ${ideoField_module_css_default.monoInput}`,
						value: rawElements,
						onChange: (e) => setRawElements(e.target.value),
						spellCheck: false,
						rows: 10,
						placeholder: "[{\"type\":\"obj\",\"desc\":\"...\",\"bbox\":[...]}]",
						style: {
							minHeight: 160,
							fontSize: 10,
							lineHeight: 1.45,
							borderColor: parseError ? "var(--dsw-alias-state-error-primary)" : void 0
						}
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							fontSize: 9.5
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: parseError ? ideoField_module_css_default.jsonErr : void 0,
							style: parseError ? void 0 : { opacity: .6 },
							children: parseError ?? "Edit and click Apply to sync with canvas"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: { opacity: .5 },
							children: [
								elements.length,
								" element",
								elements.length === 1 ? "" : "s"
							]
						})]
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "button",
						tabIndex: 0,
						onDragOver: (e) => {
							if (!e.dataTransfer.types.includes("Files")) return;
							e.preventDefault();
							setDragOver(true);
						},
						onDragLeave: () => setDragOver(false),
						onDrop: handleDrop,
						onClick: () => fileInputRef.current?.click(),
						onKeyDown: (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								fileInputRef.current?.click();
							}
						},
						className: ideoField_module_css_default.dropZone,
						"data-over": dragOver || void 0,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: fileInputRef,
								type: "file",
								accept: "image/png",
								style: { display: "none" },
								onChange: handleFilePick
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
								d: G_IMG,
								size: 13
							}),
							dragOver ? "Drop PNG to restore layout" : "Drop or click to load a generated PNG"
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/FormCard.tsx
		/**
		* FormCard — the action-card form renderer.
		*
		* Renders one FormSpec (from /v1/form-spec) as the card body: sections,
		* the six simple field types (select | text | textarea | number | seed |
		* boolean), tooltips, required marks — plus the ideogram_canvas FIELD SLOT,
		* which mounts IdeoCanvasField: the advanced Ideogram spatial-layout editor
		* imported from git history (see ideoField.ts / IdeoCanvasField.tsx headers).
		* Owns NO network — the deck passes the spec in and reads values out via ref
		* for the Run button.
		*/
		const TEXT_TYPES = /* @__PURE__ */ new Set(["text", "textarea"]);
		/**
		* Structured guide from the wire: {title, sections:[{label, body, code, list_}]}.
		* Some specs ship a plain string guide instead — both render, neither reaches
		* React as a raw object (that crashes the slot: React #31, caught live
		* 2026-08-21 on krea-2).
		*/
		function GuideNode({ guide }) {
			if (typeof guide === "string") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: deck_module_css_default.guideBody,
				children: guide
			});
			if (!guide || typeof guide !== "object") return null;
			const g = guide;
			const sections = Array.isArray(g.sections) ? g.sections : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: deck_module_css_default.guideBody,
				children: [typeof g.title === "string" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: deck_module_css_default.guideTitle,
					children: g.title
				}) : null, sections.map((raw, i) => {
					const s = raw && typeof raw === "object" ? raw : {};
					const list = Array.isArray(s.list_) ? s.list_ : Array.isArray(s.list) ? s.list : [];
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: deck_module_css_default.guideSection,
						children: [
							typeof s.label === "string" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [s.label, ": "] }) : null,
							typeof s.body === "string" ? s.body : null,
							typeof s.code === "string" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: s.code }) : null,
							list.filter((x) => typeof x === "string").length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: deck_module_css_default.guideList,
								children: [
									" (",
									list.filter((x) => typeof x === "string").join(" · "),
									")"
								]
							}) : null
						]
					}, i);
				})]
			});
		}
		function FieldTooltip({ text }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: deck_module_css_default.fieldHint,
				title: text,
				"aria-label": text,
				children: "?"
			});
		}
		function FieldRow({ field, value, onChange }) {
			const label = field.label || field.name;
			const str = value === void 0 || value === null ? "" : String(value);
			const commonProps = {
				id: `f-${field.name}`,
				className: deck_module_css_default.input,
				onChange: void 0
			};
			switch (true) {
				case field.type === "boolean": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: deck_module_css_default.fieldRow,
					htmlFor: commonProps.id,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: deck_module_css_default.fieldLabel,
						children: [label, field.required ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: deck_module_css_default.req,
							children: "*"
						}) : null]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: commonProps.id,
						type: "checkbox",
						checked: value === true,
						onChange: (e) => onChange(e.target.checked)
					})]
				});
				case field.type === "select": {
					const opts = field.options ?? [];
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: deck_module_css_default.fieldRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: deck_module_css_default.fieldLabel,
							htmlFor: commonProps.id,
							children: [
								label,
								field.required ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: deck_module_css_default.req,
									children: "*"
								}) : null,
								field.tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldTooltip, { text: field.tooltip }) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							id: commonProps.id,
							className: deck_module_css_default.input,
							value: str,
							onChange: (e) => onChange(e.target.value),
							children: opts.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: o.value,
								children: o.label || o.value
							}, o.value))
						})]
					});
				}
				case field.type === "number": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: deck_module_css_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: deck_module_css_default.fieldLabel,
						htmlFor: commonProps.id,
						children: [
							label,
							field.required ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: deck_module_css_default.req,
								children: "*"
							}) : null,
							field.tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldTooltip, { text: field.tooltip }) : null
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: commonProps.id,
						className: deck_module_css_default.input,
						type: "number",
						value: str,
						step: field.step ?? void 0,
						onChange: (e) => onChange(e.target.value === "" ? "" : Number(e.target.value))
					})]
				});
				case field.type === "seed": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: deck_module_css_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: deck_module_css_default.fieldLabel,
						htmlFor: commonProps.id,
						children: [label, field.tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldTooltip, { text: field.tooltip }) : null]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: commonProps.id,
						className: deck_module_css_default.input,
						type: "number",
						value: str,
						onChange: (e) => onChange(e.target.value === "" ? "" : Number(e.target.value))
					})]
				});
				case TEXT_TYPES.has(field.type): return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: deck_module_css_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: deck_module_css_default.fieldLabel,
						htmlFor: commonProps.id,
						children: [
							label,
							field.required ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: deck_module_css_default.req,
								children: "*"
							}) : null,
							field.tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldTooltip, { text: field.tooltip }) : null
						]
					}), field.type === "textarea" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						id: commonProps.id,
						className: deck_module_css_default.textarea,
						rows: field.name === "prompt" || field.name === "negative_prompt" ? 4 : 2,
						value: str,
						onChange: (e) => onChange(e.target.value)
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: commonProps.id,
						className: deck_module_css_default.input,
						type: "text",
						value: str,
						onChange: (e) => onChange(e.target.value)
					})]
				});
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: deck_module_css_default.fieldRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: deck_module_css_default.fieldLabel,
						htmlFor: commonProps.id,
						children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: deck_module_css_default.typeBadge,
							children: field.type
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: commonProps.id,
						className: deck_module_css_default.input,
						type: "text",
						value: str,
						onChange: (e) => onChange(e.target.value)
					})]
				});
			}
		}
		function FormCard({ spec, handle }) {
			const values = (0, react.useRef)({});
			for (const f of spec.fields) if (!(f.name in values.current)) values.current[f.name] = f.default ?? "";
			(0, react.useImperativeHandle)(handle, () => ({
				values: () => {
					const out = {};
					for (const [k, v] of Object.entries(values.current)) {
						if (v === "" || v === null || v === void 0) continue;
						out[k] = v;
					}
					return out;
				},
				valid: () => spec.fields.every((f) => !f.required || String(values.current[f.name] ?? "") !== "")
			}), [spec]);
			const sections = /* @__PURE__ */ new Map();
			for (const f of spec.fields) {
				const key = f.section ?? "Parameters";
				if (!sections.has(key)) sections.set(key, []);
				sections.get(key).push(f);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: deck_module_css_default.formCard,
				"data-form": spec.form,
				children: [[...sections.entries()].map(([name, fields]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: deck_module_css_default.formSection,
					"data-section": name,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
						className: deck_module_css_default.sectionTitle,
						children: name
					}), fields.map((f) => f.type === "ideogram_canvas" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: deck_module_css_default.fieldRow,
						"data-field": f.name,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: deck_module_css_default.fieldLabel,
							children: [
								f.label || f.name,
								f.required ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: deck_module_css_default.req,
									children: "*"
								}) : null,
								f.tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldTooltip, { text: f.tooltip }) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IdeoCanvasField, {
							value: values.current[f.name],
							onChange: (v) => {
								values.current[f.name] = v;
							},
							getValues: () => ({ ...values.current }),
							setSibling: (name, v) => {
								values.current[name] = v;
							}
						})]
					}, f.name) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
						field: f,
						value: values.current[f.name],
						onChange: (v) => {
							values.current[f.name] = v;
						}
					}, f.name))]
				}, name)), spec.guide ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
					className: deck_module_css_default.guide,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "Prompt guide" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GuideNode, { guide: spec.guide })]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** 'betterSidebar': the public right-sidebar registry (dsh-better-sidebar,
		* mounted by the web profile's web-ui-all aggregate) — hosts the Melite
		* Assets tab. */
		const inject = ["slots", "betterSidebar"];
		function apply(ctx) {
			if (!claimDeckApply()) return;
			ctx.effect(() => releaseDeckApply, "melite-card-deck: apply claim");
			try {
				ctx.effect(() => mountCardsSidebarEntry(), "melite-card-deck: sidebar entry");
			} catch (error) {
				console.error("[melite-card-deck] sidebar entry mount failed:", error);
			}
			try {
				ctx.effect(() => mountDeckFullbleed(), "melite-card-deck: full-bleed");
			} catch (error) {
				console.error("[melite-card-deck] full-bleed mount failed:", error);
			}
			try {
				registerRayAssetsTab(ctx);
			} catch (error) {
				console.error("[melite-card-deck] assets tab registration failed:", error);
			}
		}
		//#endregion
		exports.FormCard = FormCard;
		exports.IdeoCanvasField = IdeoCanvasField;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map