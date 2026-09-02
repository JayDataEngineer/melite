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
				console.warn("[ray-card-deck] apply called twice — second mount skipped");
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
		const css = ".al0K6a_overlay{z-index:60;background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent);justify-content:flex-end;align-items:stretch;animation:.16s ease-out al0K6a_dkfade;display:flex;position:fixed;inset:0}.al0K6a_canvasFrame{width:100%;height:100%;min-height:0;overflow:hidden}.al0K6a_canvasIframe{background:var(--dsw-alias-bg-base);border:0;width:100%;height:100%;display:block}.al0K6a_canvas{flex-direction:column;width:100%;height:100%;min-height:0;display:flex;overflow:hidden}.al0K6a_tabRail{border-bottom:1px solid var(--dsw-alias-border-l1);flex-direction:row;flex-shrink:0;gap:2px;padding:8px 12px;display:flex;overflow-x:auto}.al0K6a_tabMain{flex:1;grid-template-columns:1fr 340px;min-height:0;display:grid}.al0K6a_tabEmpty{padding:18px 16px;overflow-y:auto}.al0K6a_tabRuns{flex-direction:column;gap:8px;margin-top:10px;display:flex}@keyframes al0K6a_dkfade{0%{opacity:0}to{opacity:1}}.al0K6a_frame{background:var(--dsw-alias-bg-layer-2);width:min(980px,94vw);height:100vh;color:var(--dsw-alias-label-primary);border-left:1px solid var(--dsw-alias-border-l1);box-shadow:-18px 0 48px color-mix(in srgb, var(--dsw-alias-label-primary) 40%, transparent);flex-direction:column;display:flex}.al0K6a_head{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:12px;padding:14px 18px;display:flex}.al0K6a_title{letter-spacing:.02em;margin:0;font-size:14px;font-weight:650}.al0K6a_subtitle{opacity:.6;font-size:11px}.al0K6a_closeBtn{color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;margin-left:auto;padding:2px 8px;font-size:18px}.al0K6a_closeBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_body{flex:1;grid-template-columns:132px 1fr 340px;min-height:0;display:grid}.al0K6a_rail{border-right:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:2px;padding:10px 8px;display:flex;overflow-y:auto}.al0K6a_railBtn{color:inherit;text-align:left;cursor:pointer;text-transform:capitalize;background:0 0;border:0;border-radius:6px;justify-content:space-between;align-items:center;gap:6px;padding:6px 10px;font-size:12px;display:flex}.al0K6a_railBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_railBtn[data-active]{background:var(--dsw-specific-sidebar-nav-item-active);font-weight:600}.al0K6a_count{opacity:.55;font-size:10px}.al0K6a_grid{grid-template-columns:repeat(auto-fill,minmax(148px,1fr));align-content:start;gap:8px;padding:12px;display:grid;overflow-y:auto}.al0K6a_tile{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);cursor:pointer;color:inherit;text-align:left;border-radius:10px;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;display:flex}.al0K6a_tile:hover{border-color:var(--dsw-alias-border-l3);transform:translateY(-1px)}.al0K6a_tile[data-active]{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-specific-sidebar-nav-item-active)}.al0K6a_tileLabel{font-size:12.5px;font-weight:600}.al0K6a_tileGenre{text-transform:uppercase;letter-spacing:.06em;opacity:.55;font-size:9.5px}.al0K6a_tilePlugin{opacity:.4;font-family:ui-monospace,monospace;font-size:9px}.al0K6a_panel{border-left:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:10px;padding:14px;display:flex;overflow-y:auto}.al0K6a_panelHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.al0K6a_panelTitle{margin:0;font-size:13px;font-weight:650}.al0K6a_panelForm{opacity:.5;font-size:9.5px}.al0K6a_modelLine{opacity:.75;margin:0;font-size:11px}.al0K6a_modelLine code{font-size:10.5px}.al0K6a_formSection{flex-direction:column;gap:6px;display:flex}.al0K6a_sectionTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:6px 0 2px;font-size:10px}.al0K6a_fieldRow{flex-direction:column;gap:3px;display:flex}.al0K6a_fieldLabel{align-items:center;gap:5px;font-size:11px;font-weight:550;display:flex}.al0K6a_fieldHint{border:1px solid var(--dsw-alias-border-l2);opacity:.6;cursor:help;border-radius:50%;justify-content:center;align-items:center;width:13px;height:13px;font-size:8.5px;display:inline-flex}.al0K6a_req{color:var(--dsw-alias-state-error-primary);margin-left:2px}.al0K6a_typeBadge{opacity:.45;text-transform:none;font-family:ui-monospace,monospace;font-size:8.5px}.al0K6a_input,.al0K6a_textarea{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:inherit;box-sizing:border-box;border-radius:7px;width:100%;padding:6px 8px;font-family:inherit;font-size:12px}.al0K6a_textarea{resize:vertical;min-height:44px}.al0K6a_input:focus,.al0K6a_textarea:focus{outline:1px solid var(--dsw-alias-state-business-primary);border-color:#0000}.al0K6a_guide{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;font-size:11px}.al0K6a_guide summary{cursor:pointer;opacity:.7}.al0K6a_guideBody{white-space:pre-wrap;opacity:.8;max-height:180px;margin:6px 0 0;font-size:10.5px;overflow-y:auto}.al0K6a_runBtn{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-inverted);cursor:pointer;border:0;border-radius:8px;margin-top:8px;padding:9px 14px;font-size:12.5px;font-weight:650}.al0K6a_runBtn:disabled{opacity:.45;cursor:not-allowed}.al0K6a_runs{border-top:1px solid var(--dsw-alias-border-l1);max-height:34vh;padding:10px 14px;overflow-y:auto}.al0K6a_runsTitle{text-transform:uppercase;letter-spacing:.08em;opacity:.5;margin:0 0 8px;font-size:10px}.al0K6a_runsRow{grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:8px;display:grid}.al0K6a_runCard{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;flex-direction:column;gap:6px;padding:9px 11px;display:flex}.al0K6a_runCard[data-status=completed]{border-color:var(--dsw-alias-state-success-primary)}.al0K6a_runCard[data-status=failed],.al0K6a_runCard[data-status=error]{border-color:var(--dsw-alias-state-error-primary)}.al0K6a_runHead{align-items:center;gap:8px;display:flex}.al0K6a_runId{opacity:.65;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;font-size:10px;overflow:hidden}.al0K6a_statusPill{text-transform:uppercase;letter-spacing:.05em;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;margin-left:auto;padding:2px 7px;font-size:9.5px}.al0K6a_statusPill[data-st=completed]{color:var(--dsw-alias-state-success-primary)}.al0K6a_statusPill[data-st=failed],.al0K6a_statusPill[data-st=error],.al0K6a_statusPill[data-st=interrupted],.al0K6a_statusPill[data-st=stopped]{color:var(--dsw-alias-state-error-primary)}.al0K6a_runClose{color:inherit;opacity:.5;cursor:pointer;background:0 0;border:0;font-size:13px}.al0K6a_runClose:hover{opacity:1}.al0K6a_runGrid{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px;display:grid}.al0K6a_runGrid img{border-radius:6px;width:100%;display:block}.al0K6a_runPending{opacity:.6;margin:0;font-size:11px}.al0K6a_runOk{color:var(--dsw-alias-state-success-primary);margin:0;font-size:11px}.al0K6a_runError{white-space:pre-wrap;word-break:break-word;max-height:120px;color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent);border-radius:6px;margin:0;padding:6px 8px;font-size:10px;overflow-y:auto}.al0K6a_pending{opacity:.6;padding:12px;font-size:12px}.al0K6a_guideTitle{font:var(--ds-font-body-xs,12px/1.5 sans-serif);margin:0 0 4px;font-weight:600}.al0K6a_guideSection{font:var(--ds-font-body-xs,12px/1.5 sans-serif);margin:0 0 4px}.al0K6a_guideList{opacity:.75}.al0K6a_errBlock{padding:14px;font-size:12px}.al0K6a_errBlock pre{white-space:pre-wrap;opacity:.75;max-height:200px;font-size:10.5px;overflow-y:auto}.al0K6a_entry{width:100%;color:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:8px;padding:7px 10px;font-size:12px;display:flex}.al0K6a_entry:hover{background:var(--dsw-alias-interactive-bg-hover)}.al0K6a_entry[data-active]{background:var(--dsw-specific-sidebar-nav-item-active)}.al0K6a_entryIcon{opacity:.8;display:inline-flex}.al0K6a_entryLabel{text-overflow:ellipsis;font-size:11.5px;overflow:hidden}[data-dsh-frame][data-sidebar-collapsed] .al0K6a_entry{justify-content:center;padding:0}[data-dsh-frame][data-sidebar-collapsed] .al0K6a_entryLabel{display:none}.al0K6a_assetsFrame{background:0 0;border:0;width:100%;height:100%;display:block}";
		const tagId = "@melite-plugin/dsh-card-deck/deck.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-deck";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
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
				"data-plugin": "ray-card-deck-canvas",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frameRef,
					className: deck_module_css_default.canvasIframe,
					src: "/editor/",
					title: "Ray card canvas",
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
		const CONTAINER_SEL = "[data-ray-cards-deck-view]";
		/** The center column the container overlays (same selector as deck-fullbleed). */
		const COLUMN_SEL$1 = "[data-pane=\"conversation\"], [class*=\"centerCol\"]";
		/** Family row selectors this entry orders against (task-board + ssh). */
		const FAMILY_SELECTORS = [
			"[data-dsh-taskboard-entry]",
			"[data-dsh-ssh-entry]",
			"[data-ray-cards-entry]"
		];
		/** Cards icon — two stacked cards, the shell's 16px nav-icon look. */
		const ICON = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" aria-hidden=\"true\"><rect x=\"5.5\" y=\"2.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.3\"/><rect x=\"2.5\" y=\"5.5\" width=\"8\" height=\"8\" rx=\"1.5\" stroke=\"currentColor\" stroke-width=\"1.3\" fill=\"var(--dsw-alias-bg-base, #17171c)\"/></svg>";
		/** Deck open-state events (the active-bridge the entry core subscribes to). */
		const OPEN_EVENT = "ray-cards-deck-open-changed";
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
				rowAttribute: "data-ray-cards-entry",
				rowSelector: "[data-ray-cards-entry]",
				icon: ICON,
				css: {
					entry: deck_module_css_default["entry"] ?? "",
					entryIcon: deck_module_css_default["entryIcon"] ?? "",
					entryLabel: deck_module_css_default["entryLabel"] ?? ""
				},
				label: () => "Cards",
				tooltip: () => "Ray card deck",
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
		const ACTIVE_ATTR = "data-ray-deck-active";
		/** Family activation attributes — cleared when the deck opens. */
		const FAMILY_ACTIVE_ATTRS = ["data-dsh-taskboard-active", "data-dsh-ssh-active"];
		/** The family's cross-panel coordination event (verbatim protocol). */
		const PANEL_ACTIVATE_EVENT = "dsh-panel-activate";
		/** Our panel name on that event bus. */
		const PANEL_NAME = "ray-deck";
		/** The deck plugin node marker (host row of the canvas iframe). */
		const DECK_NODE_SEL = "[data-plugin=\"ray-card-deck-canvas\"]";
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
			const styleId = "ray-card-deck-fullbleed";
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
		*   Ray Media — the MEDIA ARCHIVE (what we made): an iframe of
		*     /editor/?rayAssets=media rendering the REAL SidebarBody (search,
		*     sort, upload, category groups, virtualized). Tiles drag the asset
		*     MIME (application/tech-noir-asset) — drop attaches to a card slot
		*     or spawns an Ops input card.
		*   Ray Cards — the CAPABILITY LIBRARY (what we can make): an iframe of
		*     /editor/?rayAssets=cards rendering the REAL LibrarySidebar
		*     (search, genre groups, provenance badges, studio tiles). Tiles
		*     drag the capability MIME (application/tech-noir-capability) —
		*     drop lands an action card.
		*   Ray ComfyUI (2026-08-25) — the ComfyUI MANAGEMENT surface: an iframe
		*     of /editor/?rayAssets=comfy rendering the REAL ComfyManagerRailPanel
		*     (backend endpoint door + Manager upkeep readout/actions) — the old
		*     standalone ComfyUI-Manager plugin, mirrored as a third tab.
		*   Ray Pipelines (2026-08-25) — the PIPELINE TEMPLATES: an iframe of
		*     /editor/?rayAssets=pipelines rendering the REAL PipelinesSection
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
				"data-ray-frame": marker
			});
		}
		/**
		* MediaPanel — the media archive tab + the FULLSCREEN preview overlay.
		* A tile click inside the frame posts ray-preview-open; the overlay is a
		* DEDICATED iframe (/editor/?rayPreview=<id>) portal'd to document.body —
		* OUTSIDE the animated panel, whose slide transform is the
		* containing-block trap that ate two earlier attempts (a fixed iframe
		* inside the panel parks off-screen; MOVING the live frame reloads it
		* and kills the dialog). The overlay page renders the REAL
		* AssetPreviewDialog alone; its own bg-black/90 backdrop dims the page.
		*
		* PERSISTENT FRAME + NAVIGATE (2026-08-25 "huge lag loading assets"):
		* remounting /editor/?rayPreview=<id> per click booted the WHOLE editor
		* app every time — seconds over a tailscale link. The iframe now mounts
		* ONCE on the first preview and STAYS ALIVE: later previews post
		* ray-preview-navigate {assetId} into it and the page swaps assets
		* in-place (its ready echo carries the asset id). Close only HIDES the
		* frame (opacity 0); reopen of an already-shown asset is instant.
		*
		* ATOMIC REVEAL (2026-08-25 "blinks black, then loads the rest in" +
		* "'Unsupported Media' before the video loads"): while a target asset is
		* not yet confirmed, the frame holds at opacity 0 — boot frames and media
		* loads happen off-screen; 'ray-preview-ready' (echoing the asset id)
		* flips opacity to 1 in one transition. Host failsafe 7s pairs the page's
		* own 5s: a dead iframe still fails VISIBLE.
		*/
		function MediaPanel() {
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
					if (d.type === "ray-preview-open" && typeof d.asset?.id === "string") {
						const id = d.asset.id;
						console.warn("[MediaPanel] open", id.split("/").pop());
						setFrame((f) => f ?? {
							src: "/editor/?rayPreview=" + encodeURIComponent(id),
							bootAssetId: id
						});
						setTarget(id);
					} else if (d.type === "ray-preview-close") {
						console.warn("[MediaPanel] close");
						setTarget(null);
					} else if (d.type === "ray-preview-ready") {
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
					type: "ray-preview-navigate",
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
				src: "/editor/?rayAssets=media",
				title: "Ray Media",
				marker: "media"
			}), frame !== null && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				ref: frameRef,
				src: frame.src,
				title: "Ray Media preview",
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
			src: "/editor/?rayAssets=cards",
			title: "Ray Cards",
			marker: "cards"
		});
		const ComfyPanel = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarFrame, {
			src: "/editor/?rayAssets=comfy",
			title: "Ray ComfyUI",
			marker: "comfy"
		});
		const PipelinesPanel = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SidebarFrame, {
			src: "/editor/?rayAssets=pipelines",
			title: "Ray Pipelines",
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
			}, "ray-card-deck: " + id + " tab");
		}
		/** Register ALL FOUR tabs on the better-sidebar registry. */
		function registerRayAssetsTab(ctx) {
			register(ctx, "ray-card-deck:media", "Ray Media", 60, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MediaIcon, { size: s }), MediaPanel);
			register(ctx, "ray-card-deck:cards", "Ray Cards", 61, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardsIcon, { size: s }), CardsPanel);
			register(ctx, "ray-card-deck:comfy", "Ray ComfyUI", 62, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComfyIcon, { size: s }), ComfyPanel);
			register(ctx, "ray-card-deck:pipelines", "Ray Pipelines", 63, (s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PipelinesIcon, { size: s }), PipelinesPanel);
			let tries = 0;
			const timer = window.setInterval(() => {
				tries++;
				if (tries > 240 || document.querySelector("[data-ray-frame='cards']")) {
					window.clearInterval(timer);
					return;
				}
				const panel = document.querySelector("[class*='nArs4W_panel']");
				if (document.querySelector("[data-ray-frame='cards']")) {
					window.clearInterval(timer);
					return;
				}
				if (panel === null || /panelHidden/.test(panel.className)) {
					const expandSidebar = [...document.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || b.getAttribute("title") || "").trim() === "Expand sidebar");
					expandSidebar && expandSidebar.click();
					return;
				}
				const item = [...document.querySelectorAll("[role=menuitem],[role=option]")].find((x) => /^Ray Cards$/.test((x.textContent || x.getAttribute("aria-label") || "").trim()));
				if (item) {
					item.click();
					window.setTimeout(() => {
						document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
					}, 120);
					return;
				}
				const plus = [...panel.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || b.getAttribute("title") || b.textContent || "").trim() === "New tab");
				plus && plus.click();
			}, 400);
		}
		//#endregion
		//#region src/client/index.ts
		/** 'betterSidebar': the public right-sidebar registry (dsh-better-sidebar,
		* mounted by the web profile's web-ui-all aggregate) — hosts the Ray
		* Assets tab. */
		const inject = ["slots", "betterSidebar"];
		function apply(ctx) {
			if (!claimDeckApply()) return;
			ctx.effect(() => releaseDeckApply, "ray-card-deck: apply claim");
			try {
				ctx.effect(() => mountCardsSidebarEntry(), "ray-card-deck: sidebar entry");
			} catch (error) {
				console.error("[ray-card-deck] sidebar entry mount failed:", error);
			}
			try {
				ctx.effect(() => mountDeckFullbleed(), "ray-card-deck: full-bleed");
			} catch (error) {
				console.error("[ray-card-deck] full-bleed mount failed:", error);
			}
			try {
				registerRayAssetsTab(ctx);
			} catch (error) {
				console.error("[ray-card-deck] assets tab registration failed:", error);
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map