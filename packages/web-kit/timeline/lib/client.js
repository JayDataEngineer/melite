window.__ModuleLoader__.load({
	id: "@melite-plugin/timeline",
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
		let _melite_card_base_client = require("@melite/card-base/client");
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region ../../../clsx/dist/clsx.mjs
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
		//#region src/timeline/viser-timeline/motionTimelineState.ts
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
		function buildMotionTimelineState(inp) {
			const T = Math.max(1, Math.floor(inp.frameCount));
			return {
				type: "TimelineMessage",
				enabled: true,
				fps: inp.fps,
				start_frame: 0,
				end_frame: T - 1,
				current_frame: Math.max(0, Math.min(T - 1, Math.round(inp.currentFrame))),
				prompts: inp.prompts,
				tracks: MOTION_TIMELINE_TRACKS,
				keyframes: inp.keyframes,
				intervals: inp.intervals,
				mode: "keyframe",
				constraints_enabled: true,
				default_text: "",
				default_duration: 30,
				min_prompt_duration: 1,
				max_prompt_duration: null,
				default_num_frames_zoom: Math.min(T, 96),
				max_frames_zoom: T
			};
		}
		/** UUID for locally-added keyframes/prompts/intervals. */
		function makeTimelineId() {
			const c = typeof crypto !== "undefined" ? crypto : void 0;
			if (c && "randomUUID" in c) return c.randomUUID();
			return "tl-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
		}
		//#endregion
		//#region src/timeline/MotionTimelineBarLayout.ts
		/**
		* MotionTimelineBarLayout — shared geometry + formatting atoms for
		* the motion timeline bar (split from MotionTimelineBar.tsx, pure move).
		*
		* Pure values only (no hooks, no JSX): row heights, the pinned gutter
		* width, zoom bounds, rgb/clamp/fmtTimecode. The bar re-exports this
		* surface, so the public import path never moves.
		*/
		const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
		const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
		/** Row heights (px): ruler, prompts, beats (Layer C), audio layers, keyframe lanes. */
		const RULER_H = 28;
		const PROMPTS_H = 36;
		const BEATS_H = 26;
		const AUDIO_H = 26;
		/** (2026-09-22, the D-M-E card law) the CARD lane height — audio clips
		* rendered as small call cards (the operator: "smaller versions of how
		* cards look"); opt-in per tenant, blocks stay 26. */
		const AUDIO_CARDS_H = 44;
		const LANE_H = 24;
		/** Label gutter width. (audit F5, 2026-09-02: 88 → 112 — the pinned
		* header row now carries the timecode positioning indicator beside the
		* zoom cluster, DaVinci-style; every gutter row shares the one const.) */
		const GUTTER_W = 112;
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
		//#endregion
		//#region src/timeline/MotionTimelineBarScale.ts
		/**
		* MotionTimelineBarScale — the bar's ABSOLUTE scale model (split from
		* MotionTimelineBar.tsx, pure move): measure-once pin, zoom,
		* playhead-anchored scroll, frame<->px. Bodies below are the bar's.
		*/
		/** Ruler ticks over the content (bar line 790): seconds coverage of
		*  the frames plus the trailing lead-out room. */
		function buildTicks(contentW, effPpf, totalFrames, fps) {
			const viewSec = totalFrames / Math.max(1, fps);
			const fullSec = contentW / Math.max(1, effPpf) / Math.max(1, fps);
			const stepSec = viewSec <= 4 ? .5 : Math.max(1, Math.ceil(viewSec / 16));
			const ticks = [];
			for (let s = 0; s <= fullSec + 1e-6; s += stepSec) ticks.push(Math.round(s * 10) / 10);
			return {
				ticks,
				stepSec
			};
		}
		/** The bar's zoom/scroll state + converters (bar line 400). */
		function useTimelineScale(opts) {
			const { scrollRef, frameIdx, totalFrames, fps, initialSeconds } = opts;
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
				} else setPpf(Math.min(40, next));
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
			return {
				boxW,
				ppf,
				setPpf,
				basePpf,
				setBasePpf,
				dragScale,
				setDragScale,
				anchorRef,
				T1,
				fitPpf,
				effPpf,
				contentW,
				frameToPx,
				frameAt,
				xToFrame,
				zoom,
				keepTailVisible
			};
		}
		//#endregion
		//#region src/timeline/MotionTimelineBarDrag.ts
		/**
		* MotionTimelineBarDrag — the bar's one global pointer session (split
		* from MotionTimelineBar.tsx, pure move): scrub + clip drag/resize +
		* keyframe drag, the pose-studio pattern (window listeners + live-ref
		* drag state). Bodies below are the bar's.
		*/
		/** The bar's pointer-session state + gesture entry points (bar line 369). */
		function useTimelineDragSession(opts) {
			const { T1, effPpf, ppf, dragScale, setPpf, setBasePpf, setDragScale, prompts, audioLayers, packed, xToFrame, keepTailVisible, onFrameChange, onScrubStart, onScrubEnd, onSelect, onKeyframeMove, onPromptMove, onPromptResize, onExtend, onAudioClipMove } = opts;
			const [dragId, setDragId] = (0, react.useState)(null);
			const dragRef = (0, react.useRef)(null);
			const suppressClickRef = (0, react.useRef)(false);
			const lastPromptRef = (0, react.useRef)(null);
			lastPromptRef.current = prompts.length ? prompts.reduce((a, b) => b.end_frame > a.end_frame ? b : a).uuid : null;
			const firstPromptRef = (0, react.useRef)(null);
			firstPromptRef.current = prompts.length ? prompts.reduce((a, b) => b.start_frame < a.start_frame ? b : a).uuid : null;
			const promptsRef = (0, react.useRef)(prompts);
			promptsRef.current = prompts;
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
					if (Math.abs(e.clientX - d.startX) > 5) d.moved = true;
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
			return {
				dragId,
				dragRef,
				suppressClickRef,
				lastPromptRef,
				firstPromptRef,
				promptsRef,
				startDrag,
				seek
			};
		}
		//#endregion
		//#region src/timeline/icons.tsx
		function base(name, className) {
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
		function ListMusic({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("list-music", className),
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
				...base("music", className),
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
		function ZoomIn({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("zoom-in", className),
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
		function Mic({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("mic", className),
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "12",
						x2: "12",
						y1: "19",
						y2: "22"
					})
				]
			});
		}
		function Zap({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base("zap", className),
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
			});
		}
		function ZoomOut({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base("zoom-out", className),
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
		//#region \0dsh-css:packages/web-kit/timeline/src/timeline/timeline.module.css.mjs
		const css = ".t2WLSa_root{user-select:none;display:flex}.t2WLSa_gutter{border-right:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;display:flex}.t2WLSa_zoomRow{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:center;align-items:center;gap:2px;display:flex}.t2WLSa_zoomBtn{width:20px;height:20px;color:var(--dsw-alias-label-secondary);font-size:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}.t2WLSa_zoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary)}.t2WLSa_zoomBtn svg{width:14px;height:14px}.t2WLSa_zoomPct{min-width:32px;height:auto;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}.t2WLSa_zoomPct:hover{color:var(--dsw-alias-brand-primary)}.t2WLSa_laneHead,.t2WLSa_laneHeadBeats{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_laneHead>svg,.t2WLSa_laneHeadBeats>svg{width:14px;height:14px;color:var(--dsw-alias-brand-primary);flex:none}.t2WLSa_laneHeadBeats>svg{color:var(--dsw-alias-brand-primary)}.t2WLSa_gutterLabel{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.t2WLSa_audioHead{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_audioHead>svg{width:12px;height:12px;color:var(--dsw-alias-state-business-primary);flex:none}.t2WLSa_gutterLabelDim{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.t2WLSa_detachBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;padding:0;display:inline-flex}.t2WLSa_detachBtn:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_detachBtn svg{width:10px;height:10px}.t2WLSa_uploadBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.t2WLSa_uploadBtn:hover{background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 14%, transparent);color:var(--dsw-alias-label-primary)}.t2WLSa_uploadBtn svg{width:10px;height:10px}.t2WLSa_laneRow{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_laneRow:last-child{border-bottom:0}.t2WLSa_laneDot{border-radius:9999px;flex:none;width:6px;height:6px}.t2WLSa_laneName{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;overflow:hidden}.t2WLSa_contentWrap{flex:1;min-width:0;position:relative}.t2WLSa_scroller{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;height:100%;overflow:auto hidden}.t2WLSa_scroller::-webkit-scrollbar{height:8px}.t2WLSa_scroller::-webkit-scrollbar-track{background:0 0}.t2WLSa_scroller::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}.t2WLSa_content{position:relative}.t2WLSa_ruler{border-bottom:1px solid var(--dsw-alias-border-l2);cursor:ew-resize;touch-action:none;position:relative}.t2WLSa_tick{position:absolute;top:0;bottom:0}.t2WLSa_tickLine{background:var(--dsw-alias-border-l2);width:1px;height:100%}.t2WLSa_tickLabel{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;position:absolute;top:2px;left:4px}.t2WLSa_timecode{z-index:10;font-variant-numeric:tabular-nums;height:100%;color:var(--dsw-alias-brand-primary);align-items:center;padding-left:6px;padding-right:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;display:flex;position:sticky;left:0}.t2WLSa_promptsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_canAdd{cursor:copy}.t2WLSa_emptyCenter{justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.t2WLSa_emptyHint{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_promptClip{touch-action:none;cursor:grab;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_promptClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_clipSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);border-width:0}.t2WLSa_clipSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_clipMoving{z-index:30;cursor:grabbing;border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 20px 25px -5px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent)}.t2WLSa_edgeL{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:0;bottom:0;left:0}.t2WLSa_edgeL:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeDead{cursor:default;opacity:.35}.t2WLSa_edgeDead:hover{background:0 0}.t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_promptClip:hover .t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_seamDot{z-index:35;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:0;transform:translate(-50%,-50%)}.t2WLSa_edgeR{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:16px;bottom:0;right:0}.t2WLSa_edgeR:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeWide{width:16px}.t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent)}.t2WLSa_clipEditor{background:color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);height:24px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);pointer-events:auto;border:none;border-radius:4px;align-items:center;padding:0 6px;display:inline-flex;position:absolute;top:50%;left:8px;right:8px;transform:translateY(-50%)}.t2WLSa_clipEditor input{width:100%;min-width:0;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;padding:0;font-size:11px;line-height:1.5}.t2WLSa_clipEditor input::placeholder{color:var(--dsw-alias-label-tertiary)}.t2WLSa_previewWrap{z-index:10;pointer-events:none;position:absolute;inset:0;overflow:hidden}.t2WLSa_previewVideo{object-fit:cover;opacity:.6;width:100%;height:100%;position:absolute;inset:0}.t2WLSa_scrim{background:linear-gradient(to top, color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent) 50%, color-mix(in srgb, var(--dsw-alias-bg-base) 10%, transparent));position:absolute;inset:0}.t2WLSa_clipTextCol{z-index:20;flex-direction:column;gap:2px;padding:0 12px 6px;display:flex;position:absolute;bottom:0;left:0;right:0}.t2WLSa_clipTextStack{z-index:10;pointer-events:none;flex-direction:column;justify-content:center;gap:2px;padding:0 12px;display:flex;position:absolute;inset:0}.t2WLSa_clipTitle{text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;overflow:hidden}.t2WLSa_clipEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_clipDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_knobDot{z-index:20;background:var(--dsw-alias-brand-primary);width:6px;height:6px;box-shadow:0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);pointer-events:none;border-radius:9999px;position:absolute;top:4px;right:6px}.t2WLSa_refAudioBadge{z-index:20;width:10px;height:10px;color:var(--dsw-alias-state-business-primary);pointer-events:none;position:absolute;top:12px;right:4px}.t2WLSa_refBadge{z-index:20;pointer-events:none;align-items:center;gap:1px;display:flex;position:absolute;top:22px;right:2px}.t2WLSa_refBadge svg{width:8px;height:8px;color:var(--dsw-alias-state-success-primary)}.t2WLSa_refCount{color:var(--dsw-alias-state-success-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;line-height:1}.t2WLSa_promptDelete{z-index:40;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:inline-flex;position:absolute;top:4px;right:4px}.t2WLSa_promptDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_promptClip:hover .t2WLSa_promptDelete{opacity:1}.t2WLSa_promptDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_beatsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_beatsAdd{cursor:crosshair}.t2WLSa_beatsEmpty{align-items:center;padding-left:12px;display:flex;position:absolute;inset:0}.t2WLSa_hintLine{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_beatClip{border:1px solid var(--dsw-alias-border-l2);cursor:pointer;border-radius:6px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_beatClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_beatSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}.t2WLSa_beatSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_beatLabel{color:var(--dsw-alias-label-secondary);pointer-events:none;align-items:center;padding:0 6px;font-size:10px;line-height:1.25;display:flex;position:absolute;inset:0}.t2WLSa_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.t2WLSa_beatEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_audioLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_audioClip{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);cursor:grab;touch-action:none;border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_audioClip:active{cursor:grabbing}.t2WLSa_audioCard{border-radius:6px;top:3px;bottom:3px}.t2WLSa_audioCardIcon{pointer-events:none;display:flex;position:absolute;top:50%;left:5px;transform:translateY(-50%)}.t2WLSa_audioCardIcon svg{width:13px;height:13px}.t2WLSa_audioCard .t2WLSa_audioClipLabel{flex-direction:column;justify-content:center;align-items:flex-start;gap:1px;font-size:10px;display:flex;left:23px;right:4px}.t2WLSa_audioCard .t2WLSa_audioTime{margin-left:0}.t2WLSa_gainFill{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;position:absolute;bottom:0;left:0;right:0}.t2WLSa_audioClipLabel{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));pointer-events:none;align-items:center;padding:0 4px;font-size:9px;line-height:1;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioName{text-overflow:ellipsis;white-space:nowrap;font-weight:500;overflow:hidden}.t2WLSa_audioTime{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--dsw-alias-label-tertiary));flex:none;margin-left:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.t2WLSa_audioClipDelete{background:color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);width:14px;height:14px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:0 0 0 4px;justify-content:center;align-items:center;padding:0;display:none;position:absolute;top:0;right:0}.t2WLSa_audioClipDelete:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_audioClip:hover .t2WLSa_audioClipDelete{display:flex}.t2WLSa_audioClipDelete svg{width:8px;height:8px}.t2WLSa_audioSlice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_sliceLabel{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-secondary));pointer-events:none;justify-content:center;align-items:center;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioDrop{border:1px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.t2WLSa_dropHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);padding:0 8px;font-size:9px;overflow:hidden}.t2WLSa_kfLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_kfLane:last-child{border-bottom:0}.t2WLSa_laneHint{color:var(--dsw-alias-label-tertiary);pointer-events:none;align-items:center;padding-left:12px;font-size:10px;display:flex;position:absolute;inset:0}.t2WLSa_kfWrap{position:absolute;top:0;bottom:0}.t2WLSa_kfBtn{cursor:grab;background:0 0;border:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:flex;position:absolute;top:50%;left:0;transform:translate(-50%,-50%)}.t2WLSa_kfBtn:active{cursor:grabbing;transform:translate(-50%)}.t2WLSa_kfDiamond{width:10px;height:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4);border:1px solid;display:block;transform:rotate(45deg)}.t2WLSa_kfMoving{transform:rotate(45deg)scale(1.25)}.t2WLSa_kfDelete{z-index:10;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:14px;height:14px;padding:0;display:inline-flex;position:absolute;top:0;left:6px}.t2WLSa_kfDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_kfWrap:hover .t2WLSa_kfDelete{opacity:1}.t2WLSa_kfDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_playhead{z-index:40;pointer-events:none;position:absolute;top:0;bottom:0}.t2WLSa_playheadCap{border:1px solid var(--dsw-alias-border-l4);border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:50%;transform:translate(-50%)}.t2WLSa_miniBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);width:20px;height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:13px;line-height:1;display:inline-flex}.t2WLSa_miniBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_miniFitBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.t2WLSa_miniFitBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_scrubBar{align-items:center;gap:8px;width:100%;display:flex}.t2WLSa_scrubToggle{cursor:pointer;background:0 0;border:none;flex:none;padding:4px 2px;font-size:11px;line-height:1}.t2WLSa_scrubTrack{cursor:pointer;touch-action:none;flex:1;min-width:0;height:18px;position:relative}.t2WLSa_scrubFill{background:var(--dsw-alias-interactive-bg-active);border-radius:2px;height:4px;position:absolute;top:7px;left:0}.t2WLSa_scrubHead{background:var(--dsw-alias-label-primary);border-radius:1px;width:2px;height:10px;margin-left:-1px;position:absolute;top:4px}.t2WLSa_scrubReadout{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;font-size:11px}";
		const tagId = "@melite-plugin/timeline/timeline.module.css@9598b92a";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/timeline";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var timeline_module_css_default = {
			"audioCard": "t2WLSa_audioCard",
			"audioCardIcon": "t2WLSa_audioCardIcon",
			"audioClip": "t2WLSa_audioClip",
			"audioClipDelete": "t2WLSa_audioClipDelete",
			"audioClipLabel": "t2WLSa_audioClipLabel",
			"audioDrop": "t2WLSa_audioDrop",
			"audioHead": "t2WLSa_audioHead",
			"audioLane": "t2WLSa_audioLane",
			"audioName": "t2WLSa_audioName",
			"audioSlice": "t2WLSa_audioSlice",
			"audioTime": "t2WLSa_audioTime",
			"beatClip": "t2WLSa_beatClip",
			"beatEmpty": "t2WLSa_beatEmpty",
			"beatLabel": "t2WLSa_beatLabel",
			"beatSelected": "t2WLSa_beatSelected",
			"beatsAdd": "t2WLSa_beatsAdd",
			"beatsEmpty": "t2WLSa_beatsEmpty",
			"beatsLane": "t2WLSa_beatsLane",
			"canAdd": "t2WLSa_canAdd",
			"clipDur": "t2WLSa_clipDur",
			"clipEditor": "t2WLSa_clipEditor",
			"clipEmpty": "t2WLSa_clipEmpty",
			"clipMoving": "t2WLSa_clipMoving",
			"clipSelected": "t2WLSa_clipSelected",
			"clipTextCol": "t2WLSa_clipTextCol",
			"clipTextStack": "t2WLSa_clipTextStack",
			"clipTitle": "t2WLSa_clipTitle",
			"content": "t2WLSa_content",
			"contentWrap": "t2WLSa_contentWrap",
			"detachBtn": "t2WLSa_detachBtn",
			"dropHint": "t2WLSa_dropHint",
			"edgeDead": "t2WLSa_edgeDead",
			"edgeL": "t2WLSa_edgeL",
			"edgeR": "t2WLSa_edgeR",
			"edgeWide": "t2WLSa_edgeWide",
			"emptyCenter": "t2WLSa_emptyCenter",
			"emptyHint": "t2WLSa_emptyHint",
			"gainFill": "t2WLSa_gainFill",
			"gripPill": "t2WLSa_gripPill",
			"gripPillBright": "t2WLSa_gripPillBright",
			"gripPillR": "t2WLSa_gripPillR",
			"gutter": "t2WLSa_gutter",
			"gutterLabel": "t2WLSa_gutterLabel",
			"gutterLabelDim": "t2WLSa_gutterLabelDim",
			"hintLine": "t2WLSa_hintLine",
			"kfBtn": "t2WLSa_kfBtn",
			"kfDelete": "t2WLSa_kfDelete",
			"kfDiamond": "t2WLSa_kfDiamond",
			"kfLane": "t2WLSa_kfLane",
			"kfMoving": "t2WLSa_kfMoving",
			"kfWrap": "t2WLSa_kfWrap",
			"knobDot": "t2WLSa_knobDot",
			"laneDot": "t2WLSa_laneDot",
			"laneHead": "t2WLSa_laneHead",
			"laneHeadBeats": "t2WLSa_laneHeadBeats",
			"laneHint": "t2WLSa_laneHint",
			"laneName": "t2WLSa_laneName",
			"laneRow": "t2WLSa_laneRow",
			"miniBtn": "t2WLSa_miniBtn",
			"miniFitBtn": "t2WLSa_miniFitBtn",
			"playhead": "t2WLSa_playhead",
			"playheadCap": "t2WLSa_playheadCap",
			"previewVideo": "t2WLSa_previewVideo",
			"previewWrap": "t2WLSa_previewWrap",
			"promptClip": "t2WLSa_promptClip",
			"promptDelete": "t2WLSa_promptDelete",
			"promptsLane": "t2WLSa_promptsLane",
			"refAudioBadge": "t2WLSa_refAudioBadge",
			"refBadge": "t2WLSa_refBadge",
			"refCount": "t2WLSa_refCount",
			"root": "t2WLSa_root",
			"ruler": "t2WLSa_ruler",
			"scrim": "t2WLSa_scrim",
			"scroller": "t2WLSa_scroller",
			"scrubBar": "t2WLSa_scrubBar",
			"scrubFill": "t2WLSa_scrubFill",
			"scrubHead": "t2WLSa_scrubHead",
			"scrubReadout": "t2WLSa_scrubReadout",
			"scrubToggle": "t2WLSa_scrubToggle",
			"scrubTrack": "t2WLSa_scrubTrack",
			"seamDot": "t2WLSa_seamDot",
			"sliceLabel": "t2WLSa_sliceLabel",
			"tick": "t2WLSa_tick",
			"tickLabel": "t2WLSa_tickLabel",
			"tickLine": "t2WLSa_tickLine",
			"timecode": "t2WLSa_timecode",
			"truncate": "t2WLSa_truncate",
			"uploadBtn": "t2WLSa_uploadBtn",
			"zoomBtn": "t2WLSa_zoomBtn",
			"zoomPct": "t2WLSa_zoomPct",
			"zoomRow": "t2WLSa_zoomRow"
		};
		//#endregion
		//#region src/timeline/MotionTimelineBarChrome.tsx
		/**
		* MotionTimelineBarChrome — the bar's pinned + ruler + playhead chrome
		* (split from MotionTimelineBar.tsx, pure move): the label gutter
		* (zoom cluster + lane heads), the scrollable content shell with the
		* click-away deselect, the ruler, the playhead. Lane bodies live in
		* MotionTimelineBarLanes.
		*/
		/** The pinned label gutter (bar line 820): the zoom cluster + lane
		*  heads. The Fit pin reads the live scale — the body is the bar's. */
		function TimelineGutter(props) {
			const { scale, scrollRef, frameIdx, promptsHeight, promptsLabel, beats, beatsLabel, beatsHeight, audioLayers, onAudioDetach, tracks, audioClipCards } = props;
			const { zoom, anchorRef, frameToPx, setPpf, setBasePpf, fitPpf, effPpf, basePpf } = scale;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: timeline_module_css_default.gutter,
				style: { width: 112 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.zoomRow,
						style: { height: 28 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Film, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
					audioLayers?.map((L) => {
						const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.audioHead,
							"data-audio-icon": L.icon ?? "music",
							style: {
								height: audioClipCards ? 44 : 26,
								...L.accent ? { color: L.accent } : {}
							},
							title: L.stem ? `${L.stem} — one bed under every cut; each window hears its own slice in time` : "drop an audio / music track — sliced to each window in time",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { "aria-hidden": true }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: timeline_module_css_default.gutterLabelDim,
									children: L.label
								}),
								L.onUpload && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									"data-audio-upload": L.id,
									"aria-label": `Add ${L.label} clip`,
									title: `Add a ${L.label} clip — from flow, from media, or from file`,
									className: timeline_module_css_default.uploadBtn,
									onClick: (e) => {
										L.onUpload?.(e.currentTarget);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Upload, { "aria-hidden": true })
								}),
								(L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => onAudioDetach(L.id),
									"aria-label": `Detach ${L.label}`,
									className: timeline_module_css_default.detachBtn,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
								})
							]
						}, L.id);
					}),
					tracks.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.laneRow,
						style: { height: 24 },
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
			}) });
		}
		/** The scrollable shell + click-away deselect (bar line 921). */
		function TimelineContent(props) {
			const { scrollRef, contentW, suppressClickRef, onSelect, children } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: timeline_module_css_default.contentWrap,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: scrollRef,
					"data-testid": "motion-timeline-scroll",
					className: timeline_module_css_default.scroller,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
						children
					})
				})
			}) });
		}
		/** The ruler: scrub surface, ticks, sticky timecode (bar line 947). */
		function TimelineRuler(props) {
			const { ticks, stepSec, fps, frameIdx, barBg, frameToPx, frameAt, seek, onPromptAdd } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
				tip: onPromptAdd ? "Click or drag to move the playhead — double-click to add a call at that frame" : "Click or drag to move the playhead",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-testid": "motion-timeline-ruler",
					className: timeline_module_css_default.ruler,
					style: { height: 28 },
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
			}) });
		}
		/** The playhead, spanning every row (bar line 1517). */
		function TimelinePlayhead(props) {
			const { frameIdx, frameToPx, playhead } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
			}) });
		}
		//#endregion
		//#region src/timeline/viser-timeline/styles.ts
		const DARK_THEME = {
			timeCursorColor: "#00E9EC",
			backgroundColor: "#111927",
			frameLabelColor: "#B0B4BA",
			frameTickColor: "#363A3F",
			promptBorderColor: "#0D1520",
			promptTextColor: "#FFFFFF",
			trackLabelColor: "#B0B4BA",
			trackSeparatorColor: "#363A3F",
			labelOverlayColor: "#111927",
			keyframeBorderColor: "#FFFFFF",
			intervalBorderColor: "#FFFFFF",
			headerShadowColor: "rgba(0, 0, 0, 0.2)",
			topBorderColor: "rgba(0, 0, 0, 0.3)"
		};
		const LIGHT_THEME = {
			timeCursorColor: "#2563EB",
			backgroundColor: "#F8F9FA",
			frameLabelColor: "#495057",
			frameTickColor: "#CED4DA",
			promptBorderColor: "#495057",
			promptTextColor: "#FFFFFF",
			trackLabelColor: "#495057",
			trackSeparatorColor: "#CED4DA",
			labelOverlayColor: "#F8F9FA",
			keyframeBorderColor: "#495057",
			intervalBorderColor: "#495057",
			headerShadowColor: "rgba(0, 0, 0, 0.08)",
			topBorderColor: "rgba(0, 0, 0, 0.05)"
		};
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
		const DEFAULT_PROMPT_COLOR = PROMPT_COLORS[0];
		const PROMPT_TEXT_SHADOW = "rgba(0, 0, 0, 0.5)";
		const HIGHLIGHT_COLOR = "#F4D03F";
		const HIGHLIGHT_BORDER_COLOR = "rgba(255, 255, 255, 0.9)";
		const HIGHLIGHT_SHADOW_COLOR = "rgba(0, 0, 0, 0.3)";
		const HIGHLIGHT_TEXT_COLOR = "#000000";
		const HIGHLIGHT_FONT = "bold 10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
		const HIGHLIGHT_TEXT_SHADOW_COLOR = "rgba(255, 255, 255, 0.6)";
		const HIGHLIGHT_BORDER_WIDTH = 1.5;
		//#endregion
		//#region src/timeline/MotionTimelineBarLanes.tsx
		/**
		* MotionTimelineBarLanes — the bar's lane bodies (split from
		* MotionTimelineBar.tsx, pure move): prompt clips, beats, audio
		* tracks, keyframe lanes. Chrome (gutter/ruler/playhead) lives in
		* MotionTimelineBarChrome.
		*/
		/** Draggable/resizable prompt clips (bar line 994). */
		function TimelinePromptsLane(props) {
			const { prompts, fps, promptsHeight, emptyPromptsHint, onPromptAdd, dragId, lastPromptRef, firstPromptRef, selectedId, previews, frameToPx, frameAt, startDrag, playhead, onPromptUpdate, onPromptDelete } = props;
			const [editingId, setEditingId] = (0, react.useState)(null);
			const [editText, setEditText] = (0, react.useState)("");
			const commitEdit = (id) => {
				setEditingId(null);
				const text = editText.trim();
				const p = prompts.find((x) => x.uuid === id);
				if (p && text !== p.text) onPromptUpdate(id, text);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Image, { "aria-hidden": true }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.refCount,
										children: p.refImages
									})]
								}),
								!isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
									})
								})
							]
						})
					}, p.uuid);
				})]
			}) });
		}
		/** Layer C prompt beats within the calls (bar line 1261). */
		function TimelineBeatsLane(props) {
			const { beats, beatsHeight, beatsHint, fps, selectedId, onSelect, onBeatAdd, xToFrame, frameToPx } = props;
			if (beats == null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
			}) });
		}
		/** Native audio tracks, same scroll + scale (bar line 1316). */
		function TimelineAudioLanes(props) {
			const { audioLayers, prompts, fps, frameToPx, xToFrame, startDrag, audioClipCards, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: audioLayers?.map((L) => {
				const clips = L.clips ?? [];
				const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
				const accent = L.accent;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-audio-layer": L.id,
					"data-wired": L.stem ? "true" : "false",
					"data-clips": clips.length ? "true" : "false",
					"data-lane-cards": audioClipCards ? "true" : "false",
					className: timeline_module_css_default.audioLane,
					style: {
						height: audioClipCards ? 44 : 26,
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
							const payload = JSON.parse(e.dataTransfer.getData(_melite_card_base_client.ASSET_DRAG_MIME) || "null");
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
							"data-card": audioClipCards ? "true" : void 0,
							title: `${c.name} · ${a}–${b}s${c.gain != null ? ` · gain ${c.gain.toFixed(2)}` : ""} — drag to move`,
							className: clsx(timeline_module_css_default.audioClip, audioClipCards && timeline_module_css_default.audioCard),
							style: {
								left: frameToPx(c.start_frame),
								width: `max(6px, ${frameToPx(Math.max(1, c.dur_frames))}px)`,
								...audioClipCards && accent ? {
									background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 32%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`,
									borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
									borderLeftColor: accent,
									borderLeftWidth: 3
								} : {}
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
								audioClipCards && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": true,
									className: timeline_module_css_default.audioCardIcon,
									style: accent ? { color: accent } : void 0,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {})
								}),
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
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
			}) });
		}
		/** Keyframe lanes: pin, drag, hover-X delete (bar line 1443). */
		function TimelineKeyframeLanes(props) {
			const { tracks, keyframes, laneHint, dragId, frameToPx, xToFrame, startDrag, onKeyframeAdd, onKeyframeDelete } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: tracks.map((track, ti) => {
				const kfs = keyframes.filter((k) => k.track_id === track.uuid);
				const color = rgb(track.color ?? [
					176,
					180,
					186
				]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-lane": track.uuid,
					className: timeline_module_css_default.kfLane,
					style: { height: 24 },
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
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
								})
							})]
						}, kf.uuid);
					})]
				}, track.uuid);
			}) });
		}
		//#endregion
		//#region src/timeline/MotionTimelineBar.tsx
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
		/** Playhead accent — the DSH brand token. */
		const PLAYHEAD = "var(--dsw-alias-brand-primary)";
		/** Unified background for the timeline bar and its sticky timecode chip. */
		const BAR_BG = "var(--dsw-alias-bg-layer-1)";
		function MotionTimelineBar({ prompts, keyframes, frameIdx, onFrameChange, onScrubStart, onScrubEnd, totalFrames, fps, initialSeconds, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, onExtend, tracks = MOTION_TIMELINE_TRACKS, promptsLabel = "Prompts", laneHint = "Double-click a lane to pin a pose constraint at the playhead", packed = false, emptyPromptsHint = "No prompt cards — the Add button carves one", promptsHeight = 36, beats, beatsLabel = "Beats", beatsHeight = 26, beatsHint = "double-click to add a beat — prompt segments join into the call's one prompt", onBeatAdd, onPromptAdd, previews, selectedId = null, onSelect, audioLayers, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioDetach, audioClipCards = false, className, style, theme }) {
			const barBg = theme?.barBg ?? BAR_BG;
			const playhead = theme?.playhead ?? PLAYHEAD;
			const scrollRef = (0, react.useRef)(null);
			const scale = useTimelineScale({
				scrollRef,
				frameIdx,
				totalFrames,
				fps,
				initialSeconds
			});
			const drag = useTimelineDragSession({
				T1: scale.T1,
				effPpf: scale.effPpf,
				ppf: scale.ppf,
				dragScale: scale.dragScale,
				setPpf: scale.setPpf,
				setBasePpf: scale.setBasePpf,
				setDragScale: scale.setDragScale,
				prompts,
				audioLayers,
				packed,
				xToFrame: scale.xToFrame,
				keepTailVisible: scale.keepTailVisible,
				onFrameChange,
				onScrubStart,
				onScrubEnd,
				onSelect,
				onKeyframeMove,
				onPromptMove,
				onPromptResize,
				onExtend,
				onAudioClipMove
			});
			const { ticks, stepSec } = buildTicks(scale.contentW, scale.effPpf, totalFrames, fps);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-testid": "motion-timeline-bar",
				className: clsx(timeline_module_css_default.root, className),
				style: {
					background: barBg,
					...style
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineGutter, {
					scale,
					scrollRef,
					frameIdx,
					promptsHeight,
					promptsLabel,
					beats,
					beatsLabel,
					beatsHeight,
					audioLayers,
					onAudioDetach,
					tracks,
					audioClipCards
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TimelineContent, {
					scrollRef,
					contentW: scale.contentW,
					suppressClickRef: drag.suppressClickRef,
					onSelect,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineRuler, {
							ticks,
							stepSec,
							fps,
							frameIdx,
							barBg,
							frameToPx: scale.frameToPx,
							frameAt: scale.frameAt,
							seek: drag.seek,
							onPromptAdd
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelinePromptsLane, {
							prompts,
							fps,
							promptsHeight,
							emptyPromptsHint,
							onPromptAdd,
							dragId: drag.dragId,
							selectedId,
							previews,
							lastPromptRef: drag.lastPromptRef,
							firstPromptRef: drag.firstPromptRef,
							frameToPx: scale.frameToPx,
							frameAt: scale.frameAt,
							startDrag: drag.startDrag,
							playhead,
							onPromptUpdate,
							onPromptDelete
						}),
						beats && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineBeatsLane, {
							beats,
							beatsHeight,
							beatsHint,
							fps,
							selectedId,
							onSelect,
							onBeatAdd,
							xToFrame: scale.xToFrame,
							frameToPx: scale.frameToPx
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineAudioLanes, {
							audioLayers,
							prompts,
							fps,
							audioClipCards,
							frameToPx: scale.frameToPx,
							xToFrame: scale.xToFrame,
							startDrag: drag.startDrag,
							onAudioDrop,
							onAudioDropAt,
							onAudioFileDrop,
							onAudioClipMove,
							onAudioClipDelete
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineKeyframeLanes, {
							tracks,
							keyframes,
							laneHint,
							dragId: drag.dragId,
							frameToPx: scale.frameToPx,
							xToFrame: scale.xToFrame,
							startDrag: drag.startDrag,
							onKeyframeAdd,
							onKeyframeDelete
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelinePlayhead, {
							frameIdx,
							frameToPx: scale.frameToPx,
							playhead
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/timeline/FilmPlayer.tsx
		/**
		* FilmPlayer — ONE film, ONE native player (the timeline genre's
		* shared video surface, moved from h3-timeline's kit 2026-09-17:
		* the operator's generic-tools stroke — "other cards, like H3
		* Timeline (timeline bar at the bottom, video preview, dynamic
		* parameters on the left), share code"). The timeline-genre card
		* now composes from shared rails: StudioShell + CardForm
		* (@melite/card-base), MotionTimelineBar (this package), and THIS
		* player — the imperative seam the bar's playhead drives
		* (seekTo/current/duration/play/pause/toggle) with the
		* time/duration/playing reports. Time reports keep both sources
		* (the element's timeupdate clock + a 4Hz poll while playing) so a
		* silent event path never freezes the bar.
		*/
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
					if (!el) return;
					const d = el.duration;
					el.currentTime = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(target, d) : target);
				});
			}, []);
			(0, react.useEffect)(() => () => {
				if (seekRafRef.current != null) cancelAnimationFrame(seekRafRef.current);
			}, []);
			(0, react.useImperativeHandle)(ref, () => ({
				seekTo,
				current: () => videoRef.current.currentTime,
				duration: () => {
					const d = videoRef.current.duration;
					return Number.isFinite(d) ? d : 0;
				},
				play: () => {
					videoRef.current?.play().catch(() => {});
				},
				pause: () => void videoRef.current?.pause(),
				toggle: () => {
					const el = videoRef.current;
					if (el.paused) el.play().catch(() => {});
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
					if (el.paused || el.ended) return;
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
		//#region src/timeline/TimelineScrubBar.tsx
		/**
		* TimelineScrubBar — the form card's OPTIONAL BOTTOM SEAM (the
		* generic-tools stroke, 2026-09-17: "form cards can have an
		* optional SEAM for a timeline that stretches along the bottom").
		*
		* A PURE scrub rail: playhead position from current/duration,
		* click + drag to seek, an optional play/pause toggle, and a
		* time/frame readout. The OWNER wires it to whatever player owns
		* the preview (the shared FilmPlayer's handle — seekTo/toggle/
		* current/duration); the bar never touches a media element itself.
		* Studios with full NLE needs ride MotionTimelineBar instead —
		* this is the FORM card's face, the same genre as the shell's
		* own "bottom: timeline scrub" slot law.
		*/
		const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
		function TimelineScrubBar({ current, duration, onSeek, onTogglePlay, playing, fps, "data-testid": tid }) {
			const trackRef = (0, react.useRef)(null);
			const [dragging, setDragging] = (0, react.useState)(false);
			const pct = duration > 0 ? clamp01(current / duration) : 0;
			/** pointer X → track fraction → seconds, clamped to the film */
			const seekAtPointer = (0, react.useCallback)((clientX) => {
				const track = trackRef.current;
				if (track === null || duration <= 0) return;
				const rect = track.getBoundingClientRect();
				if (rect.width <= 0) return;
				onSeek(clamp01((clientX - rect.left) / rect.width) * duration);
			}, [duration, onSeek]);
			const onPointerDown = (0, react.useCallback)((e) => {
				if (duration <= 0) return;
				e.currentTarget.setPointerCapture(e.pointerId);
				setDragging(true);
				seekAtPointer(e.clientX);
			}, [duration, seekAtPointer]);
			const onPointerMove = (0, react.useCallback)((e) => {
				if (!dragging) return;
				seekAtPointer(e.clientX);
			}, [dragging, seekAtPointer]);
			const endDrag = (0, react.useCallback)((e) => {
				if (!dragging) return;
				e.currentTarget.releasePointerCapture(e.pointerId);
				setDragging(false);
			}, [dragging]);
			const fmt = (sec) => {
				const s = Math.max(0, sec);
				const m = Math.floor(s / 60);
				return m > 0 ? m + ":" + String(Math.floor(s % 60)).padStart(2, "0") : s.toFixed(1) + "s";
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: timeline_module_css_default.scrubBar,
				"data-testid": tid ?? "timeline-scrub-bar",
				"data-dragging": dragging ? "true" : void 0,
				children: [
					onTogglePlay !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						size: "sm",
						className: timeline_module_css_default.scrubToggle,
						"aria-label": playing ? "Pause" : "Play",
						onClick: onTogglePlay,
						"data-testid": "timeline-scrub-toggle",
						children: playing ? "❚❚" : "▶"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: trackRef,
						className: timeline_module_css_default.scrubTrack,
						"data-testid": "timeline-scrub-track",
						role: "slider",
						"aria-label": "Timeline scrub",
						"aria-valuemin": 0,
						"aria-valuemax": Math.max(0, duration),
						"aria-valuenow": Math.max(0, current),
						"aria-valuetext": fmt(current) + " of " + fmt(duration),
						onPointerDown,
						onPointerMove,
						onPointerUp: endDrag,
						onPointerCancel: endDrag,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: timeline_module_css_default.scrubFill,
							style: { width: (pct * 100).toFixed(3) + "%" }
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: timeline_module_css_default.scrubHead,
							style: { left: (pct * 100).toFixed(3) + "%" }
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: timeline_module_css_default.scrubReadout,
						"data-testid": "timeline-scrub-readout",
						children: [
							fmt(current),
							" / ",
							fmt(duration),
							fps !== void 0 && fps > 0 ? " · frame " + String(Math.round(current * fps)) + "/" + String(Math.round(duration * fps)) : null
						]
					})
				]
			});
		}
		const ViewerContext = (0, react.createContext)({ useGui: (selector) => selector({ theme: { dark_mode: true } }) });
		//#endregion
		//#region src/timeline/viser-timeline/interactions.ts
		const initialInteractionState = {
			isDraggingCursor: false,
			draggedKeyframe: null,
			intervalDrag: null,
			draggedInterval: null,
			resizingInterval: null,
			resizingPrompt: null,
			draggingIntersection: null
		};
		function interactionReducer(state, action) {
			switch (action.type) {
				case "startCursorDrag": return {
					...initialInteractionState,
					isDraggingCursor: true
				};
				case "startKeyframeDrag": return {
					...initialInteractionState,
					draggedKeyframe: action.payload
				};
				case "startIntervalDrag": return {
					...initialInteractionState,
					intervalDrag: action.payload
				};
				case "updateIntervalDrag": return {
					...state,
					intervalDrag: action.payload
				};
				case "startIntervalMove": return {
					...initialInteractionState,
					draggedInterval: action.payload
				};
				case "startIntervalResize": return {
					...initialInteractionState,
					resizingInterval: action.payload
				};
				case "updateIntervalResize": return {
					...state,
					resizingInterval: action.payload
				};
				case "startPromptResize": return {
					...initialInteractionState,
					resizingPrompt: action.payload
				};
				case "updatePromptResize": return {
					...state,
					resizingPrompt: action.payload
				};
				case "startIntersectionDrag": return {
					...initialInteractionState,
					draggingIntersection: action.payload
				};
				case "stopAll": return initialInteractionState;
				default: return state;
			}
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-interaction-state.ts
		function useTimelineInteractionState(args) {
			const { timelineState, onPromptResize, onPromptMove } = args;
			const containerRef = (0, react.useRef)(null);
			const canvasRef = (0, react.useRef)(null);
			const backgroundCanvasRef = (0, react.useRef)(null);
			const [editingPrompt, setEditingPrompt] = (0, react.useState)(null);
			const editingPromptDivRef = (0, react.useRef)(null);
			const [interaction, dispatchInteraction] = (0, react.useReducer)(interactionReducer, initialInteractionState);
			const { isDraggingCursor, draggedKeyframe, intervalDrag, draggedInterval, resizingInterval, resizingPrompt, draggingIntersection } = interaction;
			const [draggedKeyframeFrame, setDraggedKeyframeFrame] = (0, react.useState)(null);
			const [draggedIntervalCurrentFrames, setDraggedIntervalCurrentFrames] = (0, react.useState)(null);
			const [resizingIntervalCurrentFrames, setResizingIntervalCurrentFrames] = (0, react.useState)(null);
			const [resizingPromptCurrentFrames, setResizingPromptCurrentFrames] = (0, react.useState)(null);
			const [hoverEdge, setHoverEdge] = (0, react.useState)(null);
			const [hoveredPromptForResize, setHoveredPromptForResize] = (0, react.useState)(null);
			const [hoveredIntervalForResize, setHoveredIntervalForResize] = (0, react.useState)(null);
			const [hoveredKeyframe, setHoveredKeyframe] = (0, react.useState)(null);
			const [hoveredSplitPreview, setHoveredSplitPreview] = (0, react.useState)(null);
			const [hoveredIntersection, setHoveredIntersection] = (0, react.useState)(null);
			const [hoveredPromptResize, setHoveredPromptResize] = (0, react.useState)(null);
			const [draggingIntersectionCurrentFrame, setDraggingIntersectionCurrentFrame] = (0, react.useState)(null);
			const [isHoveringHeader, setIsHoveringHeader] = (0, react.useState)(false);
			const [isHoveringLabelArea, setIsHoveringLabelArea] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				const onKeyUp = (e) => {
					if (e.key === "Shift") setHoveredSplitPreview(null);
				};
				const onBlur = () => setHoveredSplitPreview(null);
				window.addEventListener("keyup", onKeyUp);
				window.addEventListener("blur", onBlur);
				return () => {
					window.removeEventListener("keyup", onKeyUp);
					window.removeEventListener("blur", onBlur);
				};
			}, []);
			const timelineStateRef = (0, react.useRef)(null);
			const resizingPromptRef = (0, react.useRef)(null);
			const resizingPromptCurrentFramesRef = (0, react.useRef)(null);
			const draggingIntersectionRef = (0, react.useRef)(null);
			const onPromptResizeRef = (0, react.useRef)(null);
			const onPromptMoveRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				timelineStateRef.current = timelineState;
			}, [timelineState]);
			(0, react.useEffect)(() => {
				resizingPromptRef.current = resizingPrompt;
			}, [resizingPrompt]);
			(0, react.useEffect)(() => {
				resizingPromptCurrentFramesRef.current = resizingPromptCurrentFrames;
			}, [resizingPromptCurrentFrames]);
			(0, react.useEffect)(() => {
				draggingIntersectionRef.current = draggingIntersection;
			}, [draggingIntersection]);
			(0, react.useEffect)(() => {
				onPromptResizeRef.current = onPromptResize ?? null;
			}, [onPromptResize]);
			(0, react.useEffect)(() => {
				onPromptMoveRef.current = onPromptMove ?? null;
			}, [onPromptMove]);
			return {
				containerRef,
				canvasRef,
				backgroundCanvasRef,
				editingPrompt,
				setEditingPrompt,
				editingPromptDivRef,
				interaction,
				dispatchInteraction,
				isDraggingCursor,
				draggedKeyframe,
				intervalDrag,
				draggedInterval,
				resizingInterval,
				resizingPrompt,
				draggingIntersection,
				draggedKeyframeFrame,
				setDraggedKeyframeFrame,
				draggedIntervalCurrentFrames,
				setDraggedIntervalCurrentFrames,
				resizingIntervalCurrentFrames,
				setResizingIntervalCurrentFrames,
				resizingPromptCurrentFrames,
				setResizingPromptCurrentFrames,
				hoverEdge,
				setHoverEdge,
				hoveredPromptForResize,
				setHoveredPromptForResize,
				hoveredIntervalForResize,
				setHoveredIntervalForResize,
				hoveredKeyframe,
				setHoveredKeyframe,
				hoveredSplitPreview,
				setHoveredSplitPreview,
				hoveredIntersection,
				setHoveredIntersection,
				hoveredPromptResize,
				setHoveredPromptResize,
				draggingIntersectionCurrentFrame,
				setDraggingIntersectionCurrentFrame,
				isHoveringHeader,
				setIsHoveringHeader,
				isHoveringLabelArea,
				setIsHoveringLabelArea,
				timelineStateRef,
				resizingPromptRef,
				resizingPromptCurrentFramesRef,
				draggingIntersectionRef,
				onPromptResizeRef,
				onPromptMoveRef
			};
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-scales.ts
		const DEFAULT_KEYFRAME_COLOR = [
			219,
			148,
			86
		];
		const OUT_OF_RANGE_CONSTRAINT_COLOR = [
			140,
			140,
			140
		];
		const OUT_OF_RANGE_CONSTRAINT_OPACITY = .1;
		function getIntervalSegments(interval, promptRange, trackColor) {
			const baseOpacity = interval.opacity ?? 1;
			const outOfRangeOpacity = Math.min(baseOpacity, OUT_OF_RANGE_CONSTRAINT_OPACITY);
			if (!promptRange) return [{
				startFrame: interval.start_frame,
				endFrame: interval.end_frame,
				color: trackColor,
				opacity: baseOpacity
			}];
			const { startFrame, endFrame } = promptRange;
			if (interval.end_frame < startFrame || interval.start_frame > endFrame) return [{
				startFrame: interval.start_frame,
				endFrame: interval.end_frame,
				color: OUT_OF_RANGE_CONSTRAINT_COLOR,
				opacity: outOfRangeOpacity
			}];
			const segments = [];
			const inRangeStart = Math.max(interval.start_frame, startFrame);
			const inRangeEnd = Math.min(interval.end_frame, endFrame);
			if (interval.start_frame < inRangeStart) segments.push({
				startFrame: interval.start_frame,
				endFrame: inRangeStart - 1,
				color: OUT_OF_RANGE_CONSTRAINT_COLOR,
				opacity: outOfRangeOpacity
			});
			if (inRangeStart <= inRangeEnd) segments.push({
				startFrame: inRangeStart,
				endFrame: inRangeEnd,
				color: trackColor,
				opacity: baseOpacity
			});
			if (interval.end_frame > inRangeEnd) segments.push({
				startFrame: inRangeEnd + 1,
				endFrame: interval.end_frame,
				color: OUT_OF_RANGE_CONSTRAINT_COLOR,
				opacity: outOfRangeOpacity
			});
			return segments;
		}
		/**
		* Determine the "zoom envelope" end frame used for coordinate scaling.
		*
		* `end_frame` is often used to set an initial viewport, but `max_frames_zoom`
		* defines how far users should be able to zoom out (number of visible frames).
		*/
		function getZoomEnvelopeEndFrame(timelineState) {
			const { start_frame, end_frame, max_frames_zoom } = timelineState;
			const envelopeEndByZoom = start_frame + Math.max(0, Math.max(0, Math.floor(max_frames_zoom ?? 0)) - 1);
			return Math.max(end_frame, envelopeEndByZoom);
		}
		/**
		* Calculate common coordinate values used throughout timeline rendering
		*/
		function calculateTimelineCoordinates(width, timelineState, zoomLevel, panOffset) {
			const { start_frame } = timelineState;
			const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
			const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
			const viewStartFrame = start_frame + panOffset;
			const viewEndFrame = viewStartFrame + visibleFrames;
			const pixelRange = (width - 80 - 12) / visibleFrames;
			const timelineStartX = 92;
			const minFramePixels = 60;
			const frameDelta = Math.max(Math.floor(minFramePixels / pixelRange), 1);
			const framesBeforeTimeline = Math.ceil(timelineStartX / pixelRange);
			return {
				pixelRange,
				timelineStartX,
				viewStartFrame,
				viewEndFrame,
				visibleFrames,
				minFramePixels,
				frameDelta,
				framesBeforeTimeline,
				firstVisibleFrame: Math.max(0, viewStartFrame - framesBeforeTimeline),
				endFrame: envelopeEndFrame
			};
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-viewport.ts
		function useTimelineViewport(args) {
			const { timelineState, interaction } = args;
			const { canvasRef, containerRef, hoveredIntersection, setHoveredIntersection } = interaction;
			const [resizeRevision, setResizeRevision] = (0, react.useState)(0);
			const [canvasSize, setCanvasSize] = (0, react.useState)({
				width: 0,
				height: 0,
				dpr: 1
			});
			const [zoomLevel, setZoomLevel] = (0, react.useState)(1);
			const [panOffset, setPanOffset] = (0, react.useState)(0);
			const didInitZoomRef = (0, react.useRef)(false);
			const lastInitZoomConfigRef = (0, react.useRef)(null);
			const didUserAdjustViewRef = (0, react.useRef)(false);
			const lastZoomDefaultsRef = (0, react.useRef)(null);
			const zoomLevelRef = (0, react.useRef)(zoomLevel);
			const panOffsetRef = (0, react.useRef)(panOffset);
			const scrollbarTrackRef = (0, react.useRef)(null);
			const scrollbarDragRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				zoomLevelRef.current = zoomLevel;
			}, [zoomLevel]);
			(0, react.useEffect)(() => {
				panOffsetRef.current = panOffset;
			}, [panOffset]);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (!canvas) return;
				const preventScroll = (e) => {
					e.preventDefault();
				};
				canvas.addEventListener("wheel", preventScroll, { passive: false });
				return () => canvas.removeEventListener("wheel", preventScroll);
			}, []);
			(0, react.useEffect)(() => {
				if (!timelineState) return;
				const { start_frame, end_frame, default_num_frames_zoom, max_frames_zoom } = timelineState;
				const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
				const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
				const configKey = `${start_frame}|${end_frame}|${default_num_frames_zoom ?? ""}|${max_frames_zoom ?? ""}`;
				const configUnchanged = lastInitZoomConfigRef.current === configKey;
				const zoomDefaultsKey = `${default_num_frames_zoom ?? ""}|${max_frames_zoom ?? ""}`;
				const zoomDefaultsChanged = lastZoomDefaultsRef.current !== null && lastZoomDefaultsRef.current !== zoomDefaultsKey;
				if (didInitZoomRef.current && (didUserAdjustViewRef.current && !zoomDefaultsChanged || configUnchanged)) return;
				const newZoomLevel = Math.max(1, Math.min(Math.max(20, totalFrames), totalFrames / Math.max(1, Math.min(default_num_frames_zoom ?? 300, max_frames_zoom ?? 1e3, totalFrames))));
				setZoomLevel(newZoomLevel);
				setPanOffset(0);
				didInitZoomRef.current = true;
				lastInitZoomConfigRef.current = configKey;
				lastZoomDefaultsRef.current = zoomDefaultsKey;
			}, [
				timelineState?.start_frame,
				timelineState?.end_frame,
				timelineState?.default_num_frames_zoom,
				timelineState?.max_frames_zoom
			]);
			const scrollModeRef = (0, react.useRef)(null);
			const scrollTimeoutRef = (0, react.useRef)(null);
			const lastScrollTimeRef = (0, react.useRef)(0);
			const lastScrollDeltaRef = (0, react.useRef)(0);
			const scrollVelocityRef = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				if (!timelineState) return;
				if (hoveredIntersection) {
					const leftPromptExists = timelineState.prompts?.some((p) => p.uuid === hoveredIntersection.leftPromptId);
					const rightPromptExists = timelineState.prompts?.some((p) => p.uuid === hoveredIntersection.rightPromptId);
					if (!leftPromptExists || !rightPromptExists) setHoveredIntersection(null);
				}
			}, [timelineState?.prompts, hoveredIntersection]);
			const handleWheel = (0, react.useCallback)((e) => {
				if (!timelineState) return;
				const { start_frame } = timelineState;
				const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
				const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
				const now = Date.now();
				const timeDelta = now - lastScrollTimeRef.current;
				const scrollDelta = Math.abs(e.deltaY);
				const currentVelocity = timeDelta > 0 ? scrollDelta / timeDelta : 0;
				const lastVelocity = scrollVelocityRef.current;
				const isNewGesture = timeDelta > 200 || lastVelocity > 0 && currentVelocity > lastVelocity * 1.5;
				lastScrollTimeRef.current = now;
				lastScrollDeltaRef.current = scrollDelta;
				scrollVelocityRef.current = currentVelocity;
				let scrollMode;
				const desiredMode = e.shiftKey ? "zoom" : "pan";
				if (scrollModeRef.current === null || isNewGesture) {
					scrollMode = desiredMode;
					scrollModeRef.current = scrollMode;
				} else scrollMode = scrollModeRef.current;
				if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
				scrollTimeoutRef.current = setTimeout(() => {
					scrollModeRef.current = null;
					scrollVelocityRef.current = 0;
				}, 200);
				if (scrollMode === "pan") {
					e.preventDefault();
					didUserAdjustViewRef.current = true;
					const panSpeed = e.deltaY * .1;
					const newPanOffset = panOffset + panSpeed;
					setPanOffset(Math.max(0, newPanOffset));
				} else {
					e.preventDefault();
					didUserAdjustViewRef.current = true;
					const zoomDelta = -e.deltaY * .001;
					const newZoomLevel = Math.max(1, Math.min(Math.max(20, totalFrames), zoomLevel * (1 + zoomDelta)));
					const canvas = canvasRef.current;
					if (canvas) {
						const rect = canvas.getBoundingClientRect();
						const visibleFrames = totalFrames / zoomLevel;
						const viewStartFrame = start_frame + panOffset;
						const pixelRange = (rect.width - 80 - 12) / visibleFrames;
						const viewEndFrame = viewStartFrame + visibleFrames;
						let anchorFrame;
						let anchorRelativePosition;
						const currentFrame = timelineState.current_frame;
						if (currentFrame >= viewStartFrame && currentFrame <= viewEndFrame) {
							anchorFrame = currentFrame;
							anchorRelativePosition = (anchorFrame - viewStartFrame) / visibleFrames;
						} else {
							anchorFrame = (e.clientX - rect.left - 80 - 12) / pixelRange + viewStartFrame;
							anchorRelativePosition = (anchorFrame - viewStartFrame) / visibleFrames;
						}
						const newVisibleFrames = totalFrames / newZoomLevel;
						const newPanOffset = anchorFrame - anchorRelativePosition * newVisibleFrames - start_frame;
						setZoomLevel(newZoomLevel);
						setPanOffset(Math.max(0, newPanOffset));
					} else setZoomLevel(newZoomLevel);
				}
			}, [
				timelineState,
				zoomLevel,
				panOffset,
				canvasSize.width
			]);
			const onScrollbarThumbMouseDown = (0, react.useCallback)((e) => {
				if (!timelineState) return;
				e.preventDefault();
				e.stopPropagation();
				const envelopeEnd = getZoomEnvelopeEndFrame(timelineState);
				const total = Math.max(1, envelopeEnd - timelineState.start_frame + 1);
				const visible = total / zoomLevelRef.current;
				const maxPan = Math.max(0, total - visible);
				scrollbarDragRef.current = {
					startX: e.clientX,
					startPan: panOffsetRef.current
				};
				const onMove = (ev) => {
					const drag = scrollbarDragRef.current;
					const track = scrollbarTrackRef.current;
					if (!drag || !track) return;
					const trackRect = track.getBoundingClientRect();
					if (trackRect.width <= 0) return;
					const deltaFrames = (ev.clientX - drag.startX) / trackRect.width * total;
					const nextPan = Math.max(0, Math.min(maxPan, drag.startPan + deltaFrames));
					setPanOffset(nextPan);
				};
				const onUp = () => {
					scrollbarDragRef.current = null;
					window.removeEventListener("mousemove", onMove);
					window.removeEventListener("mouseup", onUp);
				};
				window.addEventListener("mousemove", onMove);
				window.addEventListener("mouseup", onUp);
			}, [timelineState]);
			const onScrollbarTrackMouseDown = (0, react.useCallback)((e) => {
				if (e.target !== e.currentTarget) return;
				if (!timelineState) return;
				const track = scrollbarTrackRef.current;
				if (!track) return;
				const envelopeEnd = getZoomEnvelopeEndFrame(timelineState);
				const total = Math.max(1, envelopeEnd - timelineState.start_frame + 1);
				const visible = total / zoomLevelRef.current;
				const maxPan = Math.max(0, total - visible);
				const trackRect = track.getBoundingClientRect();
				const targetCenterPan = (trackRect.width > 0 ? (e.clientX - trackRect.left) / trackRect.width : 0) * total - visible / 2;
				setPanOffset(Math.max(0, Math.min(maxPan, targetCenterPan)));
			}, [timelineState]);
			const zoomBy = (0, react.useCallback)((factor) => {
				if (!timelineState) return;
				const envelopeEnd = getZoomEnvelopeEndFrame(timelineState);
				const total = Math.max(1, envelopeEnd - timelineState.start_frame + 1);
				const maxZoom = Math.max(20, total);
				const curZoom = zoomLevelRef.current;
				const newZoom = Math.max(1, Math.min(maxZoom, curZoom * factor));
				if (newZoom === curZoom) return;
				const visibleBefore = total / curZoom;
				const centerFrame = timelineState.start_frame + panOffsetRef.current + visibleBefore / 2;
				const visibleAfter = total / newZoom;
				const newPan = Math.max(0, centerFrame - timelineState.start_frame - visibleAfter / 2);
				setZoomLevel(newZoom);
				setPanOffset(newPan);
				didUserAdjustViewRef.current = true;
			}, [timelineState]);
			const resetZoom = (0, react.useCallback)(() => {
				setZoomLevel(1);
				setPanOffset(0);
				didUserAdjustViewRef.current = true;
			}, []);
			(0, react.useEffect)(() => {
				if (!containerRef.current || !canvasRef.current) return;
				const container = containerRef.current;
				const canvas = canvasRef.current;
				const resizeCanvas = () => {
					if (!container || !canvas) return;
					const rect = container.getBoundingClientRect();
					const dpr = window.devicePixelRatio || 1;
					if (rect.width === 0 || rect.height === 0) return;
					canvas.width = rect.width * dpr;
					canvas.height = rect.height * dpr;
					canvas.style.width = `${rect.width}px`;
					canvas.style.height = `${rect.height}px`;
					setCanvasSize({
						width: rect.width,
						height: rect.height,
						dpr
					});
					setResizeRevision((prev) => prev + 1);
				};
				resizeCanvas();
				const resizeObserver = new ResizeObserver(resizeCanvas);
				resizeObserver.observe(container);
				window.addEventListener("resize", resizeCanvas);
				return () => {
					resizeObserver.disconnect();
					window.removeEventListener("resize", resizeCanvas);
					if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
				};
			}, [timelineState?.enabled]);
			return {
				resizeRevision,
				canvasSize,
				zoomLevel,
				setZoomLevel,
				panOffset,
				setPanOffset,
				zoomLevelRef,
				panOffsetRef,
				didUserAdjustViewRef,
				scrollbarTrackRef,
				handleWheel,
				onScrollbarThumbMouseDown,
				onScrollbarTrackMouseDown,
				zoomBy,
				resetZoom
			};
		}
		function useTimelineAutoPan(args) {
			const { interaction, viewport } = args;
			const { canvasRef, timelineStateRef, resizingPrompt, resizingPromptCurrentFrames, resizingPromptRef, resizingPromptCurrentFramesRef, draggingIntersection, draggingIntersectionRef, setResizingPromptCurrentFrames, setDraggingIntersectionCurrentFrame, onPromptResizeRef, onPromptMoveRef } = interaction;
			const { zoomLevelRef, panOffsetRef, setPanOffset, didUserAdjustViewRef } = viewport;
			const autoPanModeRef = (0, react.useRef)(null);
			const autoPanRafRef = (0, react.useRef)(null);
			const autoPanLastTsRef = (0, react.useRef)(null);
			const autoPanCanvasXRef = (0, react.useRef)(null);
			const stopAutoPan = (0, react.useCallback)(() => {
				if (autoPanRafRef.current !== null) {
					cancelAnimationFrame(autoPanRafRef.current);
					autoPanRafRef.current = null;
				}
				autoPanLastTsRef.current = null;
				autoPanModeRef.current = null;
			}, []);
			const getFrameFromXWithPan = (0, react.useCallback)((x, panOffsetOverride) => {
				const ts = timelineStateRef.current;
				const canvas = canvasRef.current;
				if (!ts || !canvas) return 0;
				const width = canvas.getBoundingClientRect().width;
				const { start_frame } = ts;
				const envelopeEndFrame = getZoomEnvelopeEndFrame(ts);
				const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevelRef.current;
				const viewStartFrame = start_frame + panOffsetOverride;
				const pixelRange = (width - 80 - 12) / visibleFrames;
				const adjustedX = x - 80 - 12;
				const frame = Math.round(adjustedX / pixelRange + viewStartFrame);
				return Math.max(start_frame, frame);
			}, []);
			const getPromptRightEdgeBounds = (0, react.useCallback)((ts, rp) => {
				const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
				const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;
				const fixedStart = rp.originalStartFrame;
				const fixedEnd = rp.originalEndFrame;
				const { prompts } = ts;
				let rightNeighborStart = Infinity;
				for (const p of prompts) {
					if (p.uuid === rp.uuid) continue;
					if (p.start_frame >= fixedEnd) rightNeighborStart = Math.min(rightNeighborStart, p.start_frame);
				}
				const minAllowedEnd = fixedStart + PROMPT_MIN_FRAMES;
				const maxEndFromMax = Number.isFinite(PROMPT_MAX_FRAMES) ? fixedStart + PROMPT_MAX_FRAMES : Infinity;
				return {
					minAllowedEnd,
					maxAllowedEnd: Math.min(maxEndFromMax, rightNeighborStart)
				};
			}, []);
			const applyResizingPromptAtFrame = (0, react.useCallback)((frame) => {
				const rp = resizingPromptRef.current;
				const ts = timelineStateRef.current;
				if (!rp || !ts) return;
				const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
				const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
				const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;
				const fixedStart = rp.originalStartFrame;
				const fixedEnd = rp.originalEndFrame;
				const { start_frame, prompts } = ts;
				let leftNeighborEnd = start_frame;
				let rightNeighborStart = Infinity;
				for (const p of prompts) {
					if (p.uuid === rp.uuid) continue;
					if (p.end_frame <= fixedStart) leftNeighborEnd = Math.max(leftNeighborEnd, p.end_frame);
					if (p.start_frame >= fixedEnd) rightNeighborStart = Math.min(rightNeighborStart, p.start_frame);
				}
				let validStartFrame = fixedStart;
				let validEndFrame = fixedEnd;
				if (rp.edge === "left") {
					const maxStartFromMin = fixedEnd - PROMPT_MIN_FRAMES;
					const minStartFromMax = Number.isFinite(PROMPT_MAX_FRAMES) ? fixedEnd - PROMPT_MAX_FRAMES : -Infinity;
					const minAllowedStart = Math.max(leftNeighborEnd, minStartFromMax);
					const maxAllowedStart = maxStartFromMin;
					if (maxAllowedStart < minAllowedStart) validStartFrame = minAllowedStart;
					else validStartFrame = clamp(frame, minAllowedStart, maxAllowedStart);
				} else {
					const minEndFromMin = fixedStart + PROMPT_MIN_FRAMES;
					const maxEndFromMax = Number.isFinite(PROMPT_MAX_FRAMES) ? fixedStart + PROMPT_MAX_FRAMES : Infinity;
					const minAllowedEnd = minEndFromMin;
					const maxAllowedEnd = Math.min(maxEndFromMax, rightNeighborStart);
					if (maxAllowedEnd < minAllowedEnd) validEndFrame = maxAllowedEnd;
					else validEndFrame = clamp(frame, minAllowedEnd, maxAllowedEnd);
				}
				setResizingPromptCurrentFrames({
					startFrame: validStartFrame,
					endFrame: validEndFrame
				});
				const cb = onPromptResizeRef.current;
				if (cb) cb(rp.uuid, validStartFrame, validEndFrame);
			}, []);
			const applyDraggingIntersectionAtFrame = (0, react.useCallback)((frame) => {
				const di = draggingIntersectionRef.current;
				const ts = timelineStateRef.current;
				if (!di || !ts) return;
				const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
				const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
				const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;
				const minFrameFromLeft = di.leftOriginalStart + PROMPT_MIN_FRAMES;
				const maxFrameFromLeft = di.leftOriginalStart + PROMPT_MAX_FRAMES;
				const deltaMin = ts.start_frame - di.rightChainMinStart;
				const minFrameFromChain = di.originalFrame + deltaMin;
				const constrainedFrame = clamp(frame, Math.max(minFrameFromLeft, minFrameFromChain), maxFrameFromLeft);
				const delta = constrainedFrame - di.originalFrame;
				setDraggingIntersectionCurrentFrame(constrainedFrame);
				onPromptResizeRef.current?.(di.leftPromptId, di.leftOriginalStart, constrainedFrame);
				const move = onPromptMoveRef.current;
				if (move) for (const p of di.rightChain) move(p.uuid, p.originalStart + delta, p.originalEnd + delta);
			}, []);
			const tickAutoPan = (0, react.useCallback)((tsNow) => {
				const mode = autoPanModeRef.current;
				const rp = resizingPromptRef.current;
				const di = draggingIntersectionRef.current;
				const ts = timelineStateRef.current;
				const canvas = canvasRef.current;
				const cursorX = autoPanCanvasXRef.current;
				const isResizeRightActive = !!rp && rp.edge === "right";
				if (!(mode === "resizeRightEdge" && isResizeRightActive || mode === "intersection" && !!di) || !ts || !canvas || cursorX === null) {
					stopAutoPan();
					return;
				}
				const width = canvas.getBoundingClientRect().width;
				const leftThreshold = 152;
				const rightOver = cursorX - (width - 60);
				const leftOver = leftThreshold - cursorX;
				const intensityRight = Math.max(0, Math.min(2, rightOver / 60));
				const intensityLeft = Math.max(0, Math.min(2, leftOver / 60));
				const signedIntensity = intensityRight > 0 ? intensityRight : intensityLeft > 0 ? -intensityLeft : 0;
				if (signedIntensity === 0) {
					stopAutoPan();
					return;
				}
				const last = autoPanLastTsRef.current ?? tsNow;
				const dtMs = Math.max(0, tsNow - last);
				autoPanLastTsRef.current = tsNow;
				const { start_frame } = ts;
				const envelopeEndFrame = getZoomEnvelopeEndFrame(ts);
				const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevelRef.current;
				const pixelRange = (width - 80 - 12) / visibleFrames;
				const framesPerPx = pixelRange > 0 ? 1 / pixelRange : 0;
				if (mode === "resizeRightEdge" && rp) {
					const { minAllowedEnd, maxAllowedEnd } = getPromptRightEdgeBounds(ts, rp);
					const currentEnd = resizingPromptCurrentFramesRef.current?.endFrame ?? rp.originalEndFrame;
					if (!Number.isFinite(minAllowedEnd) || !Number.isFinite(maxAllowedEnd) || maxAllowedEnd <= minAllowedEnd) {
						stopAutoPan();
						return;
					}
					if (signedIntensity > 0 && currentEnd >= maxAllowedEnd) {
						stopAutoPan();
						return;
					}
					if (signedIntensity < 0 && currentEnd <= minAllowedEnd) {
						stopAutoPan();
						return;
					}
				}
				if (mode === "intersection" && di) {
					const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
					const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;
					const minFrameFromLeft = di.leftOriginalStart + PROMPT_MIN_FRAMES;
					const maxFrameFromLeft = di.leftOriginalStart + PROMPT_MAX_FRAMES;
					const deltaMin = ts.start_frame - di.rightChainMinStart;
					const minFrameFromChain = di.originalFrame + deltaMin;
					const minFrame = Math.max(minFrameFromLeft, minFrameFromChain);
					const maxFrame = maxFrameFromLeft;
					const currentFrame = getFrameFromXWithPan(cursorX, panOffsetRef.current);
					const constrainedFrame = Math.max(minFrame, Math.min(maxFrame, currentFrame));
					if (signedIntensity > 0 && constrainedFrame >= maxFrame) {
						stopAutoPan();
						return;
					}
					if (signedIntensity < 0 && constrainedFrame <= minFrame) {
						stopAutoPan();
						return;
					}
				}
				const deltaFrames = 900 * Math.abs(signedIntensity) * (dtMs / 1e3) * framesPerPx * (signedIntensity > 0 ? 1 : -1);
				if (deltaFrames !== 0) {
					const prevPan = panOffsetRef.current;
					const nextPan = Math.max(0, prevPan + deltaFrames);
					if (nextPan === prevPan) {
						stopAutoPan();
						return;
					}
					didUserAdjustViewRef.current = true;
					panOffsetRef.current = nextPan;
					setPanOffset(nextPan);
					const frame = getFrameFromXWithPan(cursorX, nextPan);
					if (mode === "resizeRightEdge") applyResizingPromptAtFrame(frame);
					else if (mode === "intersection") applyDraggingIntersectionAtFrame(frame);
				}
				autoPanRafRef.current = requestAnimationFrame(tickAutoPan);
			}, [
				applyDraggingIntersectionAtFrame,
				applyResizingPromptAtFrame,
				getFrameFromXWithPan,
				getPromptRightEdgeBounds,
				stopAutoPan
			]);
			const startAutoPan = (0, react.useCallback)((mode) => {
				autoPanModeRef.current = mode;
				autoPanLastTsRef.current = null;
				if (autoPanRafRef.current !== null) return;
				autoPanRafRef.current = requestAnimationFrame(tickAutoPan);
			}, [tickAutoPan]);
			(0, react.useEffect)(() => {
				if (!(!!resizingPrompt && resizingPrompt.edge === "right") && !!!draggingIntersection) stopAutoPan();
				return () => stopAutoPan();
			}, [
				resizingPrompt,
				draggingIntersection,
				stopAutoPan
			]);
			return {
				stopAutoPan,
				startAutoPan,
				getFrameFromXWithPan,
				getPromptRightEdgeBounds,
				applyResizingPromptAtFrame,
				applyDraggingIntersectionAtFrame,
				autoPanCanvasXRef
			};
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-geometry.ts
		function useTimelineGeometry(args) {
			const { timelineState, canvasRef, zoomLevel, panOffset, prompts, promptsByStart, intervals, keyframes } = args;
			const getFrameFromX = (0, react.useCallback)((x) => {
				if (!timelineState || !canvasRef.current) return 0;
				const width = canvasRef.current.getBoundingClientRect().width;
				const { start_frame } = timelineState;
				const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
				const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
				const viewStartFrame = start_frame + panOffset;
				const pixelRange = (width - 80 - 12) / visibleFrames;
				const adjustedX = x - 80 - 12;
				const frame = Math.round(adjustedX / pixelRange + viewStartFrame);
				return Math.max(start_frame, frame);
			}, [
				timelineState,
				zoomLevel,
				panOffset
			]);
			const getTrackY = (0, react.useCallback)((trackIndex) => {
				if (!timelineState) return 28;
				let y = 28;
				y += 30;
				for (let i = 0; i < trackIndex; i++) y += 30 * (timelineState.tracks[i].height_scale || 1);
				return y;
			}, [
				timelineState,
				zoomLevel,
				panOffset
			]);
			const getTrackFromY = (0, react.useCallback)((y) => {
				if (!timelineState) return { type: "header" };
				if (y < 28) return { type: "header" };
				let currentY = 28;
				if (y >= currentY && y < currentY + 30) return { type: "prompt" };
				currentY += 30;
				for (let i = 0; i < timelineState.tracks.length; i++) {
					const trackHeight = 30 * (timelineState.tracks[i].height_scale || 1);
					if (y >= currentY && y < currentY + trackHeight) return {
						type: "track",
						trackIndex: i
					};
					currentY += trackHeight;
				}
				return { type: "header" };
			}, [
				timelineState,
				zoomLevel,
				panOffset
			]);
			return {
				getFrameFromX,
				getTrackY,
				getTrackFromY,
				findKeyframeAtPosition: (0, react.useCallback)((x, y) => {
					if (!timelineState || !canvasRef.current) return null;
					const width = canvasRef.current.getBoundingClientRect().width;
					const { start_frame, keyframes } = timelineState;
					const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
					const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
					const viewStartFrame = start_frame + panOffset;
					const pixelRange = (width - 80 - 12) / visibleFrames;
					const timelineStartX = 92;
					const trackInfo = getTrackFromY(y);
					if (trackInfo.type !== "track" || trackInfo.trackIndex === void 0) return null;
					const track = timelineState.tracks[trackInfo.trackIndex];
					const keyframeY = getTrackY(trackInfo.trackIndex) + 30 * (track.height_scale || 1) / 2;
					for (const kf of keyframes) {
						if (kf.locked) continue;
						if (kf.track_id === track.uuid) {
							const kfX = timelineStartX + (kf.frame - viewStartFrame) * pixelRange;
							if (Math.sqrt(Math.pow(x - kfX, 2) + Math.pow(y - keyframeY, 2)) <= 10) return kf;
						}
					}
					return null;
				}, [
					timelineState,
					getTrackFromY,
					getTrackY
				]),
				findIntervalAtPosition: (0, react.useCallback)((x, y) => {
					if (!timelineState || !canvasRef.current) return null;
					const width = canvasRef.current.getBoundingClientRect().width;
					const { start_frame } = timelineState;
					const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
					const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
					const viewStartFrame = start_frame + panOffset;
					const pixelRange = (width - 80 - 12) / visibleFrames;
					const timelineStartX = 92;
					const trackInfo = getTrackFromY(y);
					if (trackInfo.type !== "track" || trackInfo.trackIndex === void 0) return null;
					const track = timelineState.tracks[trackInfo.trackIndex];
					const trackY = getTrackY(trackInfo.trackIndex);
					const trackHeight = 30 * (track.height_scale || 1);
					for (let i = intervals.length - 1; i >= 0; i--) {
						const interval = intervals[i];
						if (interval.locked) continue;
						if (interval.track_id === track.uuid) {
							const intervalFrameWidth = interval.end_frame - interval.start_frame + 1;
							const frameStartX = timelineStartX + (interval.start_frame - viewStartFrame) * pixelRange;
							if (intervalFrameWidth === 1) {
								const centerY = trackY + trackHeight / 2;
								if (Math.sqrt(Math.pow(x - frameStartX, 2) + Math.pow(y - centerY, 2)) <= 6) return {
									interval,
									clickOffsetFrames: 0
								};
							} else {
								const intervalWidth = (interval.end_frame - interval.start_frame) * pixelRange + 12;
								const startX = frameStartX - 6;
								const endX = startX + intervalWidth;
								const intervalHeight = 12;
								const intervalY = trackY + (trackHeight - intervalHeight) / 2;
								if (x >= startX && x <= endX && y >= intervalY && y <= intervalY + intervalHeight) return {
									interval,
									clickOffsetFrames: getFrameFromX(x) - interval.start_frame
								};
							}
						}
					}
					return null;
				}, [
					timelineState,
					intervals,
					getTrackFromY,
					getTrackY,
					getFrameFromX
				]),
				findPromptAtPosition: (0, react.useCallback)((x, y) => {
					if (!timelineState || !canvasRef.current) return null;
					const width = canvasRef.current.getBoundingClientRect().width;
					const { start_frame } = timelineState;
					const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
					const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
					const viewStartFrame = start_frame + panOffset;
					const pixelRange = (width - 80 - 12) / visibleFrames;
					const timelineStartX = 92;
					if (prompts.length === 0) return null;
					if (y < 28 || y >= 58) return null;
					for (const prompt of prompts) {
						const startX = timelineStartX + (prompt.start_frame - viewStartFrame) * pixelRange;
						const endX = timelineStartX + (prompt.end_frame - viewStartFrame) * pixelRange;
						if (x >= startX && x <= endX && y >= 29 && y <= 57) return prompt;
					}
					return null;
				}, [
					timelineState,
					zoomLevel,
					panOffset
				]),
				findPromptEdge: (0, react.useCallback)((x, y) => {
					if (!timelineState || !canvasRef.current) return null;
					const width = canvasRef.current.getBoundingClientRect().width;
					const { start_frame } = timelineState;
					const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
					const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
					const viewStartFrame = start_frame + panOffset;
					const pixelRange = (width - 80 - 12) / visibleFrames;
					const timelineStartX = 92;
					const edgeThreshold = 10;
					if (prompts.length === 0) return null;
					if (y < 28 || y >= 58) return null;
					const promptY = 30;
					const candidates = [];
					for (const prompt of prompts) {
						const startX = timelineStartX + (prompt.start_frame - viewStartFrame) * pixelRange;
						const endX = timelineStartX + (prompt.end_frame - viewStartFrame) * pixelRange;
						if (y >= promptY && y <= 56) {
							if (Math.abs(x - startX) <= edgeThreshold) candidates.push({
								prompt,
								edge: "left",
								edgeX: startX,
								distance: Math.abs(x - startX)
							});
							if (Math.abs(x - endX) <= edgeThreshold) candidates.push({
								prompt,
								edge: "right",
								edgeX: endX,
								distance: Math.abs(x - endX)
							});
						}
					}
					if (candidates.length > 0) {
						candidates.sort((a, b) => a.distance - b.distance);
						const closest = candidates[0];
						const samePosition = candidates.filter((c) => Math.abs(c.edgeX - closest.edgeX) < 1);
						if (samePosition.length > 1) {
							if (x < closest.edgeX) {
								const rightEdge = samePosition.find((c) => c.edge === "right");
								if (rightEdge) return {
									prompt: rightEdge.prompt,
									edge: rightEdge.edge
								};
							} else {
								const leftEdge = samePosition.find((c) => c.edge === "left");
								if (leftEdge) return {
									prompt: leftEdge.prompt,
									edge: leftEdge.edge
								};
							}
						}
						return {
							prompt: closest.prompt,
							edge: closest.edge
						};
					}
					return null;
				}, [
					timelineState,
					zoomLevel,
					panOffset
				]),
				findPromptIntersection: (0, react.useCallback)((x, y) => {
					if (!timelineState || !canvasRef.current) return null;
					const width = canvasRef.current.getBoundingClientRect().width;
					const { start_frame } = timelineState;
					if (promptsByStart.length < 2) return null;
					const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
					const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
					const viewStartFrame = start_frame + panOffset;
					const pixelRange = (width - 80 - 12) / visibleFrames;
					const timelineStartX = 92;
					const intersectionThreshold = 10;
					if (getTrackFromY(y).type !== "prompt") return null;
					for (let i = 0; i < promptsByStart.length - 1; i++) {
						const leftPrompt = promptsByStart[i];
						const rightPrompt = promptsByStart[i + 1];
						if (leftPrompt.end_frame === rightPrompt.start_frame) {
							const intersectionFrame = leftPrompt.end_frame;
							const intersectionX = timelineStartX + (intersectionFrame - viewStartFrame) * pixelRange;
							if (Math.abs(x - intersectionX) <= intersectionThreshold) return {
								leftPrompt,
								rightPrompt,
								frame: intersectionFrame
							};
						}
					}
					return null;
				}, [
					timelineState,
					promptsByStart,
					zoomLevel,
					panOffset,
					getTrackFromY
				]),
				findIntervalEdge: (0, react.useCallback)((x, y) => {
					if (!timelineState || !canvasRef.current) return null;
					const width = canvasRef.current.getBoundingClientRect().width;
					const { start_frame } = timelineState;
					const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
					const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
					const viewStartFrame = start_frame + panOffset;
					const pixelRange = (width - 80 - 12) / visibleFrames;
					const timelineStartX = 92;
					const edgeThreshold = 8;
					const trackInfo = getTrackFromY(y);
					if (trackInfo.type !== "track" || trackInfo.trackIndex === void 0) return null;
					const track = timelineState.tracks[trackInfo.trackIndex];
					const trackY = getTrackY(trackInfo.trackIndex);
					const trackHeight = 30 * (track.height_scale || 1);
					for (let i = intervals.length - 1; i >= 0; i--) {
						const interval = intervals[i];
						if (interval.locked) continue;
						if (interval.track_id === track.uuid) {
							const intervalFrameWidth = interval.end_frame - interval.start_frame + 1;
							const frameStartX = timelineStartX + (interval.start_frame - viewStartFrame) * pixelRange;
							if (intervalFrameWidth === 1) {
								const centerY = trackY + trackHeight / 2;
								if (Math.sqrt(Math.pow(x - frameStartX, 2) + Math.pow(y - centerY, 2)) <= 14) {
									if (x < frameStartX) return {
										interval,
										edge: "left"
									};
									else return {
										interval,
										edge: "right"
									};
								}
							} else {
								const intervalWidth = (interval.end_frame - interval.start_frame) * pixelRange + 12;
								const startX = frameStartX - 6;
								const endX = startX + intervalWidth;
								const intervalHeight = 12;
								const intervalY = trackY + (trackHeight - intervalHeight) / 2;
								if (y >= intervalY && y <= intervalY + intervalHeight) {
									if (Math.abs(x - startX) <= edgeThreshold && x >= startX - edgeThreshold && x <= startX + edgeThreshold) return {
										interval,
										edge: "left"
									};
									if (Math.abs(x - endX) <= edgeThreshold && x >= endX - edgeThreshold && x <= endX + edgeThreshold) return {
										interval,
										edge: "right"
									};
								}
							}
						}
					}
					for (const kf of keyframes) {
						if (kf.locked) continue;
						if (kf.track_id === track.uuid) {
							const kfX = timelineStartX + (kf.frame - viewStartFrame) * pixelRange;
							const kfY = trackY + trackHeight / 2;
							if (Math.sqrt(Math.pow(x - kfX, 2) + Math.pow(y - kfY, 2)) <= 14) {
								const fakeInterval = {
									uuid: kf.uuid,
									track_id: kf.track_id,
									start_frame: kf.frame,
									end_frame: kf.frame,
									value: kf.value
								};
								if (x < kfX) return {
									interval: fakeInterval,
									edge: "left"
								};
								else return {
									interval: fakeInterval,
									edge: "right"
								};
							}
						}
					}
					return null;
				}, [
					timelineState,
					intervals,
					keyframes,
					getTrackFromY,
					getTrackY,
					getFrameFromX
				])
			};
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-mouse.ts
		function useTimelineMouseHandlers(args) {
			const { timelineState, canvasRef, containerRef, zoomLevel, panOffset, prompts, promptsByStart, promptsByEndDesc, interaction, autoPan, geometry, callbacks } = args;
			const { dispatchInteraction, isDraggingCursor, draggedKeyframe, intervalDrag, draggedInterval, resizingInterval, resizingPrompt, draggingIntersection, editingPrompt, editingPromptDivRef, setEditingPrompt, setDraggedKeyframeFrame, setDraggedIntervalCurrentFrames, setResizingIntervalCurrentFrames, setResizingPromptCurrentFrames, setHoverEdge, setHoveredPromptForResize, setHoveredIntervalForResize, setHoveredKeyframe, setHoveredSplitPreview, setHoveredIntersection, setHoveredPromptResize, setDraggingIntersectionCurrentFrame, setIsHoveringHeader, setIsHoveringLabelArea } = interaction;
			const { autoPanCanvasXRef, startAutoPan, stopAutoPan, applyResizingPromptAtFrame, applyDraggingIntersectionAtFrame } = autoPan;
			const { getFrameFromX, getTrackFromY, findKeyframeAtPosition, findIntervalAtPosition, findIntervalEdge, findPromptEdge, findPromptAtPosition, findPromptIntersection } = geometry;
			const { onFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onIntervalAdd, onIntervalMove, onIntervalDelete, onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete, onPromptAdd, onPromptSplit, onPromptMerge, getLatestState } = callbacks;
			return {
				handleMouseDown: (0, react.useCallback)((e) => {
					if (!timelineState || !canvasRef.current) return;
					const rect = canvasRef.current.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					const trackInfo = getTrackFromY(y);
					if (trackInfo.type === "header") {
						const frame = getFrameFromX(x);
						dispatchInteraction({ type: "startCursorDrag" });
						onFrameChange?.(frame);
						return;
					}
					if (timelineState.constraints_enabled === false) return;
					if (trackInfo.type === "prompt") {
						const isShiftClick = e.shiftKey;
						const clickedPrompt = findPromptAtPosition(x, y);
						const intersection = findPromptIntersection(x, y);
						if (editingPrompt && !clickedPrompt) {
							editingPromptDivRef.current?.blur();
							e.preventDefault();
							return;
						}
						if (intersection) {
							if (e.button === 2) {
								console.log(`[Timeline] Merging prompts at intersection frame ${intersection.frame}`);
								onPromptMerge?.(intersection.leftPrompt.uuid, intersection.rightPrompt.uuid);
								e.preventDefault();
								return;
							}
							if (e.button === 0) {
								console.log(`[Timeline] Starting intersection drag at frame ${intersection.frame}, left: ${intersection.leftPrompt.uuid}, right: ${intersection.rightPrompt.uuid}`);
								const rightIdx = promptsByStart.findIndex((p) => p.uuid === intersection.rightPrompt.uuid);
								const rightChain = rightIdx >= 0 ? promptsByStart.slice(rightIdx).map((p) => ({
									uuid: p.uuid,
									originalStart: p.start_frame,
									originalEnd: p.end_frame
								})) : [{
									uuid: intersection.rightPrompt.uuid,
									originalStart: intersection.rightPrompt.start_frame,
									originalEnd: intersection.rightPrompt.end_frame
								}];
								const rightChainMinStart = rightChain.reduce((acc, p) => Math.min(acc, p.originalStart), Infinity);
								const rightChainMaxEnd = rightChain.reduce((acc, p) => Math.max(acc, p.originalEnd), -Infinity);
								dispatchInteraction({
									type: "startIntersectionDrag",
									payload: {
										leftPromptId: intersection.leftPrompt.uuid,
										rightPromptId: intersection.rightPrompt.uuid,
										originalFrame: intersection.frame,
										leftOriginalStart: intersection.leftPrompt.start_frame,
										rightChain,
										rightChainMinStart,
										rightChainMaxEnd
									}
								});
								return;
							}
						}
						if (clickedPrompt && isShiftClick && e.button === 0 && !intersection) {
							const splitFrame = getFrameFromX(x);
							if (splitFrame > clickedPrompt.start_frame && splitFrame < clickedPrompt.end_frame) {
								console.log(`[Timeline] Splitting prompt ${clickedPrompt.uuid} at frame ${splitFrame}`);
								onPromptSplit?.(clickedPrompt.uuid, splitFrame);
								return;
							}
						}
						if (clickedPrompt && e.button === 2 && !intersection) {
							if (timelineState.prompts && timelineState.prompts.length <= 1) {
								console.log(`[Timeline] Cannot delete the last remaining prompt in splittext mode`);
								e.preventDefault();
								return;
							}
							onPromptDelete?.(clickedPrompt.uuid);
							e.preventDefault();
							return;
						}
						if (e.button === 0) {
							let promptEdge = null;
							const edge = findPromptEdge(x, y);
							if (edge) {
								const lastPrompt = promptsByEndDesc[0];
								if (edge.prompt.uuid === lastPrompt.uuid && edge.edge === "right") promptEdge = edge;
							}
							if (promptEdge) {
								const { prompt, edge } = promptEdge;
								dispatchInteraction({
									type: "startPromptResize",
									payload: {
										uuid: prompt.uuid,
										edge,
										originalStartFrame: prompt.start_frame,
										originalEndFrame: prompt.end_frame
									}
								});
								setResizingPromptCurrentFrames({
									startFrame: prompt.start_frame,
									endFrame: prompt.end_frame
								});
								return;
							}
							if (!isShiftClick && !intersection && !clickedPrompt) {
								const clickFrame = getFrameFromX(x);
								if (prompts.length > 0) {
									const lastPrompt = promptsByEndDesc[0];
									if (clickFrame >= lastPrompt.end_frame) {
										const defaultText = timelineState.default_text ?? "";
										const defaultDuration = timelineState.default_duration ?? 30;
										const minDur = timelineState.min_prompt_duration ?? 1;
										const maxDur = timelineState.max_prompt_duration ?? Infinity;
										const dur = Math.max(minDur, Math.min(maxDur, defaultDuration));
										const startFrame = lastPrompt.end_frame;
										const endFrame = startFrame + dur;
										onPromptAdd?.(startFrame, endFrame, defaultText);
										e.preventDefault();
										return;
									}
								}
							}
						}
					}
					if (trackInfo.type === "track" && trackInfo.trackIndex !== void 0) {
						const clickedInterval = findIntervalAtPosition(x, y);
						const clickedKeyframe = findKeyframeAtPosition(x, y);
						const isCtrlClick = e.ctrlKey || e.metaKey;
						const intervalEdge = isCtrlClick ? findIntervalEdge(x, y) : null;
						if (intervalEdge && isCtrlClick && e.button === 0) {
							const { interval, edge } = intervalEdge;
							const isKeyframe = !timelineState.intervals?.some((i) => i.uuid === interval.uuid);
							dispatchInteraction({
								type: "startIntervalResize",
								payload: {
									uuid: interval.uuid,
									trackId: interval.track_id,
									edge,
									originalStartFrame: interval.start_frame,
									originalEndFrame: interval.end_frame,
									isKeyframe
								}
							});
							setResizingIntervalCurrentFrames({
								startFrame: interval.start_frame,
								endFrame: interval.end_frame
							});
							return;
						}
						if (clickedKeyframe && !isCtrlClick) {
							if (e.button === 0) {
								dispatchInteraction({
									type: "startKeyframeDrag",
									payload: {
										uuid: clickedKeyframe.uuid,
										trackId: clickedKeyframe.track_id
									}
								});
								setDraggedKeyframeFrame(clickedKeyframe.frame);
							} else if (e.button === 2) {
								onKeyframeDelete?.(clickedKeyframe.uuid);
								e.preventDefault();
							}
						} else if (clickedInterval && !isCtrlClick) {
							if (e.button === 0) {
								const { interval, clickOffsetFrames } = clickedInterval;
								dispatchInteraction({
									type: "startIntervalMove",
									payload: {
										uuid: interval.uuid,
										trackId: interval.track_id,
										originalStartFrame: interval.start_frame,
										originalEndFrame: interval.end_frame,
										clickOffsetFrames
									}
								});
								setDraggedIntervalCurrentFrames({
									startFrame: interval.start_frame,
									endFrame: interval.end_frame
								});
							} else if (e.button === 2) {
								onIntervalDelete?.(clickedInterval.interval.uuid);
								e.preventDefault();
							}
						} else if (e.button === 0) {
							const frame = getFrameFromX(x);
							const track = timelineState.tracks[trackInfo.trackIndex];
							if (isCtrlClick) {
								console.log(`[Timeline] Starting interval at frame ${frame} on track ${track.name}`);
								dispatchInteraction({
									type: "startIntervalDrag",
									payload: {
										trackId: track.uuid,
										startFrame: frame,
										endFrame: frame
									}
								});
							} else {
								const tempUuid = onKeyframeAdd?.(track.uuid, frame);
								if (tempUuid && getLatestState) {
									console.log(`[Timeline] Starting drag for new keyframe ${tempUuid.slice(0, 8)} at frame ${frame}`);
									let attempts = 0;
									const pollInterval = setInterval(() => {
										attempts++;
										const latestState = getLatestState();
										const found = latestState?.keyframes.some((kf) => kf.uuid === tempUuid);
										console.log(`[Timeline] Poll attempt ${attempts}, found: ${found}, keyframes: ${latestState?.keyframes.length}`);
										if (found || attempts >= 10) {
											clearInterval(pollInterval);
											if (found) {
												dispatchInteraction({
													type: "startKeyframeDrag",
													payload: {
														uuid: tempUuid,
														trackId: track.uuid,
														initialFrame: frame
													}
												});
												setDraggedKeyframeFrame(frame);
											}
										}
									}, 5);
								}
							}
						}
					}
				}, [
					timelineState,
					promptsByStart,
					promptsByEndDesc,
					editingPrompt,
					getFrameFromX,
					getTrackFromY,
					findKeyframeAtPosition,
					findIntervalAtPosition,
					findIntervalEdge,
					findPromptEdge,
					findPromptAtPosition,
					findPromptIntersection,
					onFrameChange,
					onKeyframeAdd,
					onKeyframeDelete,
					onIntervalDelete,
					getLatestState
				]),
				handleMouseMove: (0, react.useCallback)((e) => {
					if (!timelineState || !canvasRef.current) return;
					const rect = canvasRef.current.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					const isCtrlKey = e.ctrlKey || e.metaKey;
					const isShiftKey = e.shiftKey;
					const trackInfo = getTrackFromY(y);
					setIsHoveringHeader(trackInfo.type === "header");
					setIsHoveringLabelArea(x < 80);
					if (timelineState.constraints_enabled === false) {
						setHoverEdge(null);
						setHoveredPromptForResize(null);
						setHoveredIntervalForResize(null);
						setHoveredKeyframe(null);
						setHoveredSplitPreview(null);
						setHoveredPromptResize(null);
						if (isDraggingCursor) {
							const frame = getFrameFromX(x);
							onFrameChange?.(frame);
						}
						return;
					}
					if (isShiftKey && trackInfo.type === "prompt") {
						const clickedPrompt = findPromptAtPosition(x, y);
						if (clickedPrompt) {
							const splitFrame = getFrameFromX(x);
							if (splitFrame > clickedPrompt.start_frame && splitFrame < clickedPrompt.end_frame) setHoveredSplitPreview({
								promptId: clickedPrompt.uuid,
								frame: splitFrame
							});
							else setHoveredSplitPreview(null);
						} else setHoveredSplitPreview(null);
					} else setHoveredSplitPreview(null);
					if (trackInfo.type === "prompt" && !isShiftKey) {
						const intersection = findPromptIntersection(x, y);
						if (intersection) setHoveredIntersection({
							leftPromptId: intersection.leftPrompt.uuid,
							rightPromptId: intersection.rightPrompt.uuid,
							frame: intersection.frame
						});
						else setHoveredIntersection(null);
					} else setHoveredIntersection(null);
					if (draggingIntersection) {
						autoPanCanvasXRef.current = x;
						const leftThreshold = 152;
						const rightThreshold = rect.width - 60;
						if (x <= leftThreshold || x >= rightThreshold) startAutoPan("intersection");
						else stopAutoPan();
						const currentFrame = getFrameFromX(x);
						applyDraggingIntersectionAtFrame(currentFrame);
						return;
					}
					if (!isDraggingCursor && !draggedInterval && !draggedKeyframe && !intervalDrag && !resizingInterval && !resizingPrompt) {
						if (trackInfo.type === "prompt" && !isShiftKey) {
							const edge = findPromptEdge(x, y);
							if (edge) {
								const lastPrompt = promptsByEndDesc[0];
								if (edge.prompt.uuid === lastPrompt.uuid && edge.edge === "right") {
									setHoverEdge("right");
									setHoveredPromptResize({
										promptId: lastPrompt.uuid,
										frame: lastPrompt.end_frame
									});
									setHoveredPromptForResize(null);
									setHoveredIntervalForResize(null);
									setHoveredKeyframe(null);
									return;
								}
							}
							setHoveredPromptResize(null);
						} else setHoveredPromptResize(null);
						if (isCtrlKey) {
							const intervalEdge = findIntervalEdge(x, y);
							if (intervalEdge) {
								setHoverEdge(intervalEdge.edge);
								setHoveredIntervalForResize({
									uuid: intervalEdge.interval.uuid,
									edge: intervalEdge.edge,
									startFrame: intervalEdge.interval.start_frame,
									endFrame: intervalEdge.interval.end_frame
								});
								setHoveredPromptForResize(null);
								setHoveredKeyframe(null);
							} else {
								const keyframe = findKeyframeAtPosition(x, y);
								if (keyframe) {
									setHoverEdge(null);
									setHoveredKeyframe({
										uuid: keyframe.uuid,
										frame: keyframe.frame
									});
									setHoveredPromptForResize(null);
									setHoveredIntervalForResize(null);
								} else {
									setHoverEdge(null);
									setHoveredPromptForResize(null);
									setHoveredIntervalForResize(null);
									setHoveredKeyframe(null);
								}
							}
						} else {
							setHoverEdge(null);
							setHoveredPromptForResize(null);
							setHoveredIntervalForResize(null);
							setHoveredKeyframe(null);
						}
					} else {
						setHoverEdge(null);
						setHoveredPromptForResize(null);
						setHoveredIntervalForResize(null);
						setHoveredKeyframe(null);
					}
					if (isDraggingCursor) {
						const frame = getFrameFromX(x);
						onFrameChange?.(frame);
						return;
					}
					if (resizingPrompt) {
						autoPanCanvasXRef.current = x;
						if (resizingPrompt.edge === "right") {
							const leftThreshold = 152;
							const rightThreshold = rect.width - 60;
							if (x <= leftThreshold || x >= rightThreshold) startAutoPan("resizeRightEdge");
							else stopAutoPan();
						} else stopAutoPan();
						const frame = getFrameFromX(x);
						applyResizingPromptAtFrame(frame);
						return;
					}
					if (resizingInterval) {
						const frame = getFrameFromX(x);
						let newStartFrame = resizingInterval.originalStartFrame;
						let newEndFrame = resizingInterval.originalEndFrame;
						if (resizingInterval.edge === "left") newStartFrame = frame;
						else newEndFrame = frame;
						const actualStartFrame = Math.min(newStartFrame, newEndFrame);
						const actualEndFrame = Math.max(newStartFrame, newEndFrame);
						const timelineStartFrame = timelineState.start_frame;
						const timelineEndFrame = timelineState.end_frame;
						const clampedStartFrame = Math.max(timelineStartFrame, actualStartFrame);
						const clampedEndFrame = Math.min(timelineEndFrame, actualEndFrame);
						setResizingIntervalCurrentFrames({
							startFrame: clampedStartFrame,
							endFrame: clampedEndFrame
						});
						if (resizingInterval.isKeyframe && clampedStartFrame !== clampedEndFrame) {
							if (!resizingInterval.convertedIntervalId) {
								console.log("[Timeline] Converting keyframe to interval");
								if (onKeyframeDelete) onKeyframeDelete(resizingInterval.uuid);
								if (onIntervalAdd) {
									const newIntervalId = onIntervalAdd(resizingInterval.trackId, clampedStartFrame, clampedEndFrame);
									dispatchInteraction({
										type: "updateIntervalResize",
										payload: {
											...resizingInterval,
											convertedIntervalId: newIntervalId || resizingInterval.uuid,
											isKeyframe: false
										}
									});
								}
							} else if (onIntervalMove) onIntervalMove(resizingInterval.convertedIntervalId, clampedStartFrame, clampedEndFrame);
						} else if (!resizingInterval.isKeyframe) {
							if (onIntervalMove) {
								const intervalId = resizingInterval.convertedIntervalId || resizingInterval.uuid;
								onIntervalMove(intervalId, clampedStartFrame, clampedEndFrame);
							}
						}
						return;
					}
					if (draggedInterval) {
						const newStartFrame = getFrameFromX(x) - draggedInterval.clickOffsetFrames;
						const intervalDuration = draggedInterval.originalEndFrame - draggedInterval.originalStartFrame;
						const newEndFrame = newStartFrame + intervalDuration;
						const timelineStartFrame = timelineState.start_frame;
						const timelineEndFrame = timelineState.end_frame;
						let clampedStartFrame = newStartFrame;
						let clampedEndFrame = newEndFrame;
						if (clampedStartFrame < timelineStartFrame) {
							clampedStartFrame = timelineStartFrame;
							clampedEndFrame = timelineStartFrame + intervalDuration;
						}
						if (clampedEndFrame > timelineEndFrame) {
							clampedEndFrame = timelineEndFrame;
							clampedStartFrame = timelineEndFrame - intervalDuration;
						}
						setDraggedIntervalCurrentFrames({
							startFrame: clampedStartFrame,
							endFrame: clampedEndFrame
						});
						if (onIntervalMove) onIntervalMove(draggedInterval.uuid, clampedStartFrame, clampedEndFrame);
						return;
					}
					if (intervalDrag) {
						const frame = getFrameFromX(x);
						dispatchInteraction({
							type: "updateIntervalDrag",
							payload: {
								...intervalDrag,
								endFrame: frame
							}
						});
						return;
					}
					if (draggedKeyframe) {
						const frame = getFrameFromX(x);
						setDraggedKeyframeFrame(frame);
						let keyframeId = draggedKeyframe.uuid;
						if (keyframeId.startsWith("temp-") && timelineState && draggedKeyframe.initialFrame !== void 0) {
							const realKeyframe = timelineState.keyframes.find((kf) => kf.track_id === draggedKeyframe.trackId && kf.frame === draggedKeyframe.initialFrame && !kf.locked);
							if (realKeyframe && realKeyframe.uuid !== keyframeId) {
								console.log(`[Timeline] Switching from temp ${keyframeId.slice(0, 8)} to real ${realKeyframe.uuid.slice(0, 8)}`);
								keyframeId = realKeyframe.uuid;
								dispatchInteraction({
									type: "startKeyframeDrag",
									payload: {
										uuid: realKeyframe.uuid,
										trackId: draggedKeyframe.trackId,
										initialFrame: draggedKeyframe.initialFrame
									}
								});
							}
						}
						if (onKeyframeMove) onKeyframeMove(keyframeId, frame);
					}
				}, [
					isDraggingCursor,
					draggedInterval,
					intervalDrag,
					draggedKeyframe,
					resizingInterval,
					resizingPrompt,
					draggingIntersection,
					promptsByEndDesc,
					timelineState,
					getFrameFromX,
					findIntervalEdge,
					findPromptEdge,
					findPromptAtPosition,
					findPromptIntersection,
					getTrackFromY,
					onFrameChange,
					onIntervalMove,
					onKeyframeMove,
					onKeyframeDelete,
					onIntervalAdd,
					onPromptResize,
					onPromptMove
				]),
				handleMouseUp: (0, react.useCallback)(() => {
					stopAutoPan();
					if (intervalDrag && onIntervalAdd) {
						const startFrame = Math.min(intervalDrag.startFrame, intervalDrag.endFrame);
						const endFrame = Math.max(intervalDrag.startFrame, intervalDrag.endFrame);
						console.log(`[Timeline] Creating interval from ${startFrame} to ${endFrame}`);
						onIntervalAdd(intervalDrag.trackId, startFrame, endFrame);
					}
					dispatchInteraction({ type: "stopAll" });
					setDraggedKeyframeFrame(null);
					setDraggedIntervalCurrentFrames(null);
					setResizingIntervalCurrentFrames(null);
					setResizingPromptCurrentFrames(null);
					setHoveredPromptResize(null);
					setHoverEdge(null);
					setDraggingIntersectionCurrentFrame(null);
				}, [
					intervalDrag,
					onIntervalAdd,
					stopAutoPan
				]),
				handleContextMenu: (0, react.useCallback)((e) => {
					e.preventDefault();
				}, []),
				handleDoubleClick: (0, react.useCallback)((e) => {
					if (!timelineState || !canvasRef.current || !containerRef.current) return;
					if (timelineState.constraints_enabled === false) return;
					const rect = canvasRef.current.getBoundingClientRect();
					const x = e.clientX - rect.left;
					const y = e.clientY - rect.top;
					const prompt = findPromptAtPosition(x, y);
					if (prompt) {
						const { start_frame } = timelineState;
						const width = rect.width;
						const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
						const visibleFrames = Math.max(1, envelopeEndFrame - start_frame + 1) / zoomLevel;
						const viewStartFrame = start_frame + panOffset;
						const pixelRange = (width - 80 - 12) / visibleFrames;
						const timelineStartX = 92;
						const startX = timelineStartX + (prompt.start_frame - viewStartFrame) * pixelRange;
						const promptWidth = timelineStartX + (prompt.end_frame - viewStartFrame) * pixelRange - startX;
						setEditingPrompt({
							uuid: prompt.uuid,
							text: prompt.text,
							x: startX,
							y: 30,
							width: promptWidth,
							height: 26
						});
					}
				}, [
					timelineState,
					findPromptAtPosition,
					zoomLevel,
					panOffset
				])
			};
		}
		//#endregion
		//#region src/timeline/viser-timeline/draw.ts
		function drawHighlightFrameBox(ctx, x, frame, boxY, boxWidth, boxHeight, boxRadius) {
			ctx.save();
			ctx.shadowColor = HIGHLIGHT_SHADOW_COLOR;
			ctx.shadowBlur = 5;
			ctx.shadowOffsetY = 2;
			ctx.fillStyle = HIGHLIGHT_COLOR;
			ctx.strokeStyle = HIGHLIGHT_BORDER_COLOR;
			ctx.lineWidth = HIGHLIGHT_BORDER_WIDTH;
			ctx.beginPath();
			if (ctx.roundRect) ctx.roundRect(x - boxWidth / 2, boxY, boxWidth, boxHeight, boxRadius);
			else ctx.rect(x - boxWidth / 2, boxY, boxWidth, boxHeight);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = HIGHLIGHT_TEXT_COLOR;
			ctx.font = HIGHLIGHT_FONT;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.shadowColor = HIGHLIGHT_TEXT_SHADOW_COLOR;
			ctx.shadowBlur = 2;
			ctx.fillText(String(Math.round(frame)), x, boxY + boxHeight / 2);
			ctx.shadowBlur = 0;
			ctx.restore();
		}
		function drawInterval(ctx, interval, coords, trackY, trackHeight, trackColor, theme, width, roundLeft = true, roundRight = true, drawFill = true, drawBorder = true) {
			const intervalFrameWidth = interval.end_frame - interval.start_frame + 1;
			const frameStartX = coords.timelineStartX + (interval.start_frame - coords.viewStartFrame) * coords.pixelRange;
			const isSingleFrame = intervalFrameWidth === 1;
			const intervalWidth = isSingleFrame ? 12 : (interval.end_frame - interval.start_frame) * coords.pixelRange + 12;
			const rectStartX = frameStartX - 6;
			const endX = rectStartX + intervalWidth;
			if (width !== void 0 && (endX < -100 || rectStartX > width + 100)) return;
			const intervalHeight = 12;
			const intervalY = trackY + (trackHeight - intervalHeight) / 2;
			const opacity = interval.opacity !== void 0 ? interval.opacity : 1;
			ctx.save();
			ctx.fillStyle = `rgba(${trackColor[0]}, ${trackColor[1]}, ${trackColor[2]}, ${opacity})`;
			ctx.strokeStyle = theme.intervalBorderColor;
			ctx.lineWidth = 1.5;
			const centerY = trackY + trackHeight / 2;
			const centerX = frameStartX;
			const shouldDrawCircle = isSingleFrame && roundLeft && roundRight;
			ctx.beginPath();
			if (shouldDrawCircle) ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
			else {
				const leftRadius = roundLeft ? 6 : 0;
				const rightRadius = roundRight ? 6 : 0;
				if (ctx.roundRect && leftRadius === rightRadius) ctx.roundRect(rectStartX, intervalY, intervalWidth, intervalHeight, leftRadius);
				else {
					const x = rectStartX;
					const y = intervalY;
					const w = intervalWidth;
					const h = intervalHeight;
					const rLeft = Math.max(0, Math.min(leftRadius, h / 2, w / 2));
					const rRight = Math.max(0, Math.min(rightRadius, h / 2, w / 2));
					ctx.moveTo(x + rLeft, y);
					ctx.lineTo(x + w - rRight, y);
					if (rRight > 0) ctx.arcTo(x + w, y, x + w, y + rRight, rRight);
					else ctx.lineTo(x + w, y);
					ctx.lineTo(x + w, y + h - rRight);
					if (rRight > 0) ctx.arcTo(x + w, y + h, x + w - rRight, y + h, rRight);
					else ctx.lineTo(x + w, y + h);
					ctx.lineTo(x + rLeft, y + h);
					if (rLeft > 0) ctx.arcTo(x, y + h, x, y + h - rLeft, rLeft);
					else ctx.lineTo(x, y + h);
					ctx.lineTo(x, y + rLeft);
					if (rLeft > 0) ctx.arcTo(x, y, x + rLeft, y, rLeft);
					else ctx.lineTo(x, y);
				}
			}
			if (drawFill) ctx.fill();
			if (drawBorder) ctx.stroke();
			ctx.restore();
		}
		function drawKeyframe(ctx, keyframe, coords, trackY, trackHeight, trackColor, theme, width) {
			const keyframeX = coords.timelineStartX + (keyframe.frame - coords.viewStartFrame) * coords.pixelRange;
			if (keyframeX < -100 || keyframeX > width + 100) return;
			const keyframeY = trackY + trackHeight / 2;
			const opacity = keyframe.opacity !== void 0 ? keyframe.opacity : 1;
			ctx.save();
			ctx.fillStyle = `rgba(${trackColor[0]}, ${trackColor[1]}, ${trackColor[2]}, ${opacity})`;
			ctx.strokeStyle = theme.keyframeBorderColor;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.arc(keyframeX, keyframeY, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.restore();
		}
		function drawFrameLabels(ctx, coords, width, height, drawTicks = false, theme) {
			ctx.fillStyle = theme.frameLabelColor;
			ctx.font = "10px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			if (drawTicks) {
				ctx.strokeStyle = theme.frameTickColor;
				ctx.lineWidth = 1;
			}
			for (let frame = Math.floor(coords.firstVisibleFrame / coords.frameDelta) * coords.frameDelta; frame <= coords.viewEndFrame; frame += coords.frameDelta) {
				const frameX = coords.timelineStartX + (frame - coords.viewStartFrame) * coords.pixelRange;
				if (frameX >= -50 && frameX <= width + 50) ctx.fillText(String(frame), frameX, 14);
				if (drawTicks) {
					ctx.beginPath();
					ctx.moveTo(frameX, 28);
					ctx.lineTo(frameX, height);
					ctx.stroke();
				}
			}
		}
		function drawEndFrameLine(ctx, coords, zoomLevel, width, height, theme) {
			if (zoomLevel <= 1.000001) return;
			const endFrameX = coords.timelineStartX + (coords.endFrame - coords.viewStartFrame) * coords.pixelRange;
			if (endFrameX >= coords.timelineStartX && endFrameX <= width) {
				ctx.save();
				ctx.strokeStyle = theme.frameTickColor;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(endFrameX, 28);
				ctx.lineTo(endFrameX, height);
				ctx.stroke();
				ctx.restore();
			}
		}
		function drawLabelOverlay(ctx, _coords, tracks, hasPrompts, _width, height, theme) {
			ctx.fillStyle = theme.backgroundColor;
			ctx.fillRect(0, 28, 80, height - 28);
			let currentTrackY = 28;
			if (hasPrompts) {
				ctx.fillStyle = theme.trackLabelColor;
				ctx.font = "12px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
				ctx.textAlign = "right";
				ctx.textBaseline = "middle";
				ctx.fillText("Prompts", 70, currentTrackY + 15);
				ctx.strokeStyle = theme.trackSeparatorColor;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(0, currentTrackY);
				ctx.lineTo(80, currentTrackY);
				ctx.stroke();
				currentTrackY += 30;
			}
			tracks.forEach((track) => {
				const trackHeight = 30 * (track.height_scale || 1);
				ctx.fillStyle = theme.trackLabelColor;
				ctx.font = "11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
				ctx.textAlign = "right";
				ctx.textBaseline = "middle";
				ctx.fillText(track.name, 70, currentTrackY + trackHeight / 2);
				ctx.strokeStyle = theme.trackSeparatorColor;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(0, currentTrackY);
				ctx.lineTo(80, currentTrackY);
				ctx.stroke();
				currentTrackY += trackHeight;
			});
			ctx.strokeStyle = theme.trackSeparatorColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(80, 28);
			ctx.lineTo(80, height);
			ctx.stroke();
			ctx.save();
			const shadowGradient = ctx.createLinearGradient(0, 28, 0, 36);
			shadowGradient.addColorStop(0, theme.headerShadowColor);
			shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
			ctx.fillStyle = shadowGradient;
			ctx.fillRect(0, 28, 80, 8);
			ctx.restore();
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-render-background.ts
		function useTimelineBackground(args) {
			const { timelineState, interaction, canvasSize, resizeRevision, zoomLevel, panOffset, prompts, promptRange, tracks, keyframes, intervals, theme, darkMode } = args;
			const { canvasRef, backgroundCanvasRef } = interaction;
			(0, react.useEffect)(() => {
				if (!timelineState || !canvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) {
					backgroundCanvasRef.current = null;
					return;
				}
				if (!backgroundCanvasRef.current) backgroundCanvasRef.current = document.createElement("canvas");
				const bgCanvas = backgroundCanvasRef.current;
				const canvas = canvasRef.current;
				const ctx = canvas.getContext("2d");
				const bgCtx = bgCanvas.getContext("2d");
				if (!ctx || !bgCtx) return;
				const { prompts, tracks, keyframes } = timelineState;
				const dpr = canvasSize.dpr;
				bgCanvas.width = canvas.width;
				bgCanvas.height = canvas.height;
				bgCtx.setTransform(1, 0, 0, 1, 0, 0);
				bgCtx.save();
				bgCtx.scale(dpr, dpr);
				const width = canvasSize.width;
				const height = canvasSize.height;
				const coords = calculateTimelineCoordinates(width, timelineState, zoomLevel, panOffset);
				bgCtx.fillStyle = theme.backgroundColor;
				bgCtx.fillRect(0, 0, width, height);
				let currentTrackY = 28;
				const trackOrder = [];
				if (prompts.length > 0) trackOrder.push({
					type: "prompt",
					index: 0,
					data: { name: "Prompts" }
				});
				tracks.forEach((track, index) => {
					trackOrder.push({
						type: "track",
						index,
						data: track
					});
				});
				drawEndFrameLine(bgCtx, coords, zoomLevel, width, height, theme);
				drawFrameLabels(bgCtx, coords, width, height, true, theme);
				bgCtx.save();
				const shadowGradient = bgCtx.createLinearGradient(0, 28, 0, 36);
				shadowGradient.addColorStop(0, theme.headerShadowColor);
				shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
				bgCtx.fillStyle = shadowGradient;
				bgCtx.fillRect(0, 28, width, 8);
				bgCtx.restore();
				const trackY = currentTrackY;
				bgCtx.strokeStyle = theme.trackSeparatorColor;
				bgCtx.lineWidth = 1;
				bgCtx.beginPath();
				bgCtx.moveTo(80, trackY);
				bgCtx.lineTo(width, trackY);
				bgCtx.stroke();
				const lastPromptStartFrame = prompts.length > 0 ? Math.max(...prompts.map((p) => p.start_frame)) : -1;
				prompts.forEach((prompt) => {
					const color = prompt.color || DEFAULT_PROMPT_COLOR;
					const startX = coords.timelineStartX + (prompt.start_frame - coords.viewStartFrame) * coords.pixelRange;
					const endX = coords.timelineStartX + (prompt.end_frame - coords.viewStartFrame) * coords.pixelRange;
					const promptWidth = endX - startX;
					if (endX < -100 || startX > width + 100) return;
					const promptHeight = 26;
					const promptY = trackY + 2;
					const borderRadius = 5;
					bgCtx.save();
					bgCtx.beginPath();
					if (bgCtx.roundRect) bgCtx.roundRect(startX, promptY, promptWidth, promptHeight, borderRadius);
					else bgCtx.rect(startX, promptY, promptWidth, promptHeight);
					bgCtx.clip();
					const gradient = bgCtx.createLinearGradient(0, promptY, 0, promptY + promptHeight);
					gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`);
					gradient.addColorStop(1, `rgba(${color[0] * .8}, ${color[1] * .8}, ${color[2] * .8}, 0.9)`);
					bgCtx.fillStyle = gradient;
					bgCtx.fill();
					bgCtx.strokeStyle = theme.promptBorderColor;
					bgCtx.lineWidth = 3;
					bgCtx.stroke();
					bgCtx.beginPath();
					if (bgCtx.roundRect) bgCtx.roundRect(startX + 1, promptY + 1, promptWidth - 2, 24, 4);
					else bgCtx.rect(startX + 1, promptY + 1, promptWidth - 2, 24);
					bgCtx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
					bgCtx.lineWidth = 1;
					bgCtx.stroke();
					bgCtx.restore();
					const fps = timelineState.fps ?? 30;
					const durationSeconds = (prompt.start_frame === lastPromptStartFrame ? prompt.end_frame - prompt.start_frame + 1 : prompt.end_frame - prompt.start_frame) / Math.max(1e-9, fps);
					const secondsText = `${Math.max(0, durationSeconds).toFixed(1)} s`;
					bgCtx.save();
					bgCtx.font = "11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
					const pillPadX = 6;
					const pillW = bgCtx.measureText(secondsText).width + 12;
					const pillH = 16;
					const visibleStartX = Math.max(startX, 80);
					const visibleWidth = Math.max(0, endX - visibleStartX);
					const pillX = visibleStartX + 6;
					const pillY = promptY + 5;
					const canDrawPill = visibleWidth > pillW + 24;
					const pillRightX = pillX + pillW + 8;
					if (canDrawPill) {
						bgCtx.fillStyle = "rgba(0, 0, 0, 0.28)";
						bgCtx.beginPath();
						if (bgCtx.roundRect) bgCtx.roundRect(pillX, pillY, pillW, pillH, 8);
						else bgCtx.rect(pillX, pillY, pillW, pillH);
						bgCtx.fill();
						bgCtx.fillStyle = theme.promptTextColor;
						bgCtx.textAlign = "left";
						bgCtx.textBaseline = "middle";
						bgCtx.shadowColor = PROMPT_TEXT_SHADOW;
						bgCtx.shadowBlur = 2;
						bgCtx.shadowOffsetX = 0;
						bgCtx.shadowOffsetY = 1;
						bgCtx.fillText(secondsText, pillX + pillPadX, pillY + pillH / 2);
					}
					bgCtx.restore();
					bgCtx.fillStyle = theme.promptTextColor;
					bgCtx.font = "12px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
					bgCtx.textAlign = "center";
					bgCtx.textBaseline = "middle";
					const textY = promptY + promptHeight / 2 + 1;
					const visiblePromptStartX = Math.max(startX, 80);
					const visiblePromptEndX = Math.min(endX, width);
					const visiblePromptWidth = Math.max(0, visiblePromptEndX - visiblePromptStartX);
					const textCenterX = visiblePromptStartX + visiblePromptWidth / 2;
					let textLeftLimitX = visiblePromptStartX + 10;
					const textRightLimitX = visiblePromptEndX - 10;
					if (canDrawPill) textLeftLimitX = Math.max(textLeftLimitX, pillRightX);
					const maxTextWidth = Math.max(0, 2 * Math.min(textCenterX - textLeftLimitX, textRightLimitX - textCenterX));
					let displayText = prompt.text || "(Empty)";
					if (bgCtx.measureText(displayText).width > maxTextWidth) {
						while (bgCtx.measureText(displayText + "...").width > maxTextWidth && displayText.length > 0) displayText = displayText.slice(0, -1);
						displayText += "...";
					}
					if (visiblePromptWidth > 30 && maxTextWidth > 0) {
						bgCtx.shadowColor = PROMPT_TEXT_SHADOW;
						bgCtx.shadowBlur = 3;
						bgCtx.shadowOffsetX = 0;
						bgCtx.shadowOffsetY = 1;
						bgCtx.fillText(displayText, textCenterX, textY);
						bgCtx.shadowColor = "transparent";
						bgCtx.shadowBlur = 0;
						bgCtx.shadowOffsetX = 0;
						bgCtx.shadowOffsetY = 0;
					}
				});
				currentTrackY += 30;
				tracks.forEach((track) => {
					const trackY = currentTrackY;
					const trackColor = track.color || DEFAULT_KEYFRAME_COLOR;
					const trackHeight = 30 * (track.height_scale || 1);
					bgCtx.strokeStyle = theme.trackSeparatorColor;
					bgCtx.lineWidth = 1;
					bgCtx.beginPath();
					bgCtx.moveTo(80, trackY);
					bgCtx.lineTo(width, trackY);
					bgCtx.stroke();
					intervals.filter((interval) => interval.track_id === track.uuid).forEach((interval) => {
						getIntervalSegments(interval, promptRange, trackColor).forEach((segment) => {
							const roundLeft = segment.startFrame === interval.start_frame;
							const roundRight = segment.endFrame === interval.end_frame;
							drawInterval(bgCtx, {
								...interval,
								start_frame: segment.startFrame,
								end_frame: segment.endFrame,
								opacity: segment.opacity
							}, coords, trackY, trackHeight, segment.color, theme, width, roundLeft, roundRight, true, false);
						});
						drawInterval(bgCtx, interval, coords, trackY, trackHeight, trackColor, theme, width, true, true, false, true);
					});
					keyframes.filter((kf) => kf.track_id === track.uuid).forEach((keyframe) => {
						const isOutOfRange = promptRange !== null && (keyframe.frame < promptRange.startFrame || keyframe.frame > promptRange.endFrame);
						const keyframeColor = isOutOfRange ? OUT_OF_RANGE_CONSTRAINT_COLOR : trackColor;
						const baseOpacity = keyframe.opacity ?? 1;
						const keyframeOpacity = isOutOfRange ? Math.min(baseOpacity, OUT_OF_RANGE_CONSTRAINT_OPACITY) : baseOpacity;
						drawKeyframe(bgCtx, {
							...keyframe,
							opacity: keyframeOpacity
						}, coords, trackY, trackHeight, keyframeColor, theme, width);
					});
					currentTrackY += trackHeight;
				});
				drawLabelOverlay(bgCtx, coords, tracks, prompts.length > 0, width, height, theme);
				bgCtx.strokeStyle = theme.topBorderColor;
				bgCtx.lineWidth = 1;
				bgCtx.beginPath();
				bgCtx.moveTo(0, 0);
				bgCtx.lineTo(width, 0);
				bgCtx.stroke();
				bgCtx.restore();
			}, [
				timelineState?.enabled,
				prompts,
				promptRange,
				tracks,
				keyframes,
				intervals,
				timelineState?.start_frame,
				timelineState?.end_frame,
				promptRange,
				canvasSize.width,
				canvasSize.height,
				canvasSize.dpr,
				resizeRevision,
				zoomLevel,
				panOffset,
				timelineState?.fps,
				darkMode
			]);
			const [backgroundRevision, setBackgroundRevision] = react.default.useState(0);
			react.default.useEffect(() => {
				setBackgroundRevision((prev) => prev + 1);
			}, [
				prompts,
				tracks,
				keyframes,
				intervals
			]);
			return { backgroundRevision };
		}
		//#endregion
		//#region src/timeline/viser-timeline/timeline-render-foreground.ts
		function useTimelineForeground(args) {
			const { timelineState, interaction, canvasSize, resizeRevision, backgroundRevision, zoomLevel, panOffset, prompts, promptRange, theme, darkMode } = args;
			const { canvasRef, backgroundCanvasRef, draggedKeyframeFrame, intervalDrag, draggedIntervalCurrentFrames, resizingIntervalCurrentFrames, resizingPromptCurrentFrames, resizingPrompt, hoveredPromptForResize, hoveredIntervalForResize, hoveredKeyframe, hoveredSplitPreview, hoveredIntersection, hoveredPromptResize, draggingIntersection, draggingIntersectionCurrentFrame } = interaction;
			(0, react.useEffect)(() => {
				if (!timelineState || !canvasRef.current || !backgroundCanvasRef.current || canvasSize.width === 0 || canvasSize.height === 0) return;
				const canvas = canvasRef.current;
				const bgCanvas = backgroundCanvasRef.current;
				const ctx = canvas.getContext("2d");
				if (!ctx) return;
				const { current_frame } = timelineState;
				const dpr = canvasSize.dpr;
				const width = canvasSize.width;
				const height = canvasSize.height;
				const coords = calculateTimelineCoordinates(width, timelineState, zoomLevel, panOffset);
				if (canvas.width !== bgCanvas.width || canvas.height !== bgCanvas.height) {
					canvas.width = bgCanvas.width;
					canvas.height = bgCanvas.height;
				}
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(bgCanvas, 0, 0);
				ctx.save();
				ctx.scale(dpr, dpr);
				const currentFrameX = coords.timelineStartX + (current_frame - coords.viewStartFrame) * coords.pixelRange;
				const { tracks } = timelineState;
				ctx.save();
				ctx.strokeStyle = theme.timeCursorColor;
				ctx.lineWidth = 2;
				ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
				ctx.shadowBlur = 4;
				ctx.beginPath();
				ctx.moveTo(currentFrameX, 0);
				ctx.lineTo(currentFrameX, height);
				ctx.stroke();
				ctx.restore();
				drawLabelOverlay(ctx, coords, tracks, prompts.length > 0, width, height, theme);
				const { timelineStartX, viewStartFrame, pixelRange } = coords;
				const BOX_WIDTH = 50;
				const BOX_HEIGHT = 30;
				const BOX_Y = 2;
				const BOX_RADIUS = 4;
				ctx.save();
				ctx.shadowColor = HIGHLIGHT_SHADOW_COLOR;
				ctx.shadowBlur = 5;
				ctx.shadowOffsetY = 2;
				ctx.fillStyle = theme.timeCursorColor;
				ctx.strokeStyle = HIGHLIGHT_BORDER_COLOR;
				ctx.lineWidth = HIGHLIGHT_BORDER_WIDTH;
				ctx.beginPath();
				if (ctx.roundRect) ctx.roundRect(currentFrameX - BOX_WIDTH / 2, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
				else ctx.rect(currentFrameX - BOX_WIDTH / 2, BOX_Y, BOX_WIDTH, BOX_HEIGHT);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = "#FFFFFF";
				ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
				ctx.shadowBlur = 2;
				ctx.fillText(String(Math.round(current_frame)), currentFrameX, 17);
				ctx.shadowBlur = 0;
				ctx.restore();
				if (draggedKeyframeFrame !== null) drawHighlightFrameBox(ctx, timelineStartX + (draggedKeyframeFrame - viewStartFrame) * pixelRange, draggedKeyframeFrame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
				if (intervalDrag) {
					const startFrameX = timelineStartX + (intervalDrag.startFrame - viewStartFrame) * pixelRange;
					const endFrameX = timelineStartX + (intervalDrag.endFrame - viewStartFrame) * pixelRange;
					[{
						frame: intervalDrag.startFrame,
						x: startFrameX
					}, {
						frame: intervalDrag.endFrame,
						x: endFrameX
					}].forEach(({ frame, x }) => {
						drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
					});
				}
				if (hoveredPromptForResize) {
					const startFrameX = timelineStartX + (hoveredPromptForResize.startFrame - viewStartFrame) * pixelRange;
					const endFrameX = timelineStartX + (hoveredPromptForResize.endFrame - viewStartFrame) * pixelRange;
					[{
						frame: hoveredPromptForResize.startFrame,
						x: startFrameX
					}, {
						frame: hoveredPromptForResize.endFrame,
						x: endFrameX
					}].forEach(({ frame, x }) => {
						drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
					});
				}
				if (draggedIntervalCurrentFrames) {
					const startFrameX = timelineStartX + (draggedIntervalCurrentFrames.startFrame - viewStartFrame) * pixelRange;
					const endFrameX = timelineStartX + (draggedIntervalCurrentFrames.endFrame - viewStartFrame) * pixelRange;
					[{
						frame: draggedIntervalCurrentFrames.startFrame,
						x: startFrameX
					}, {
						frame: draggedIntervalCurrentFrames.endFrame,
						x: endFrameX
					}].forEach(({ frame, x }) => {
						drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
					});
				}
				if (resizingIntervalCurrentFrames) {
					const startFrameX = timelineStartX + (resizingIntervalCurrentFrames.startFrame - viewStartFrame) * pixelRange;
					const endFrameX = timelineStartX + (resizingIntervalCurrentFrames.endFrame - viewStartFrame) * pixelRange;
					[{
						frame: resizingIntervalCurrentFrames.startFrame,
						x: startFrameX
					}, {
						frame: resizingIntervalCurrentFrames.endFrame,
						x: endFrameX
					}].forEach(({ frame, x }) => {
						drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
					});
				}
				if (resizingPromptCurrentFrames) {
					const startFrameX = timelineStartX + (resizingPromptCurrentFrames.startFrame - viewStartFrame) * pixelRange;
					const endFrameX = timelineStartX + (resizingPromptCurrentFrames.endFrame - viewStartFrame) * pixelRange;
					[{
						frame: resizingPromptCurrentFrames.startFrame,
						x: startFrameX
					}, {
						frame: resizingPromptCurrentFrames.endFrame,
						x: endFrameX
					}].forEach(({ frame, x }) => {
						drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
					});
				}
				if (hoveredIntervalForResize) {
					const startFrameX = timelineStartX + (hoveredIntervalForResize.startFrame - viewStartFrame) * pixelRange;
					const endFrameX = timelineStartX + (hoveredIntervalForResize.endFrame - viewStartFrame) * pixelRange;
					[{
						frame: hoveredIntervalForResize.startFrame,
						x: startFrameX
					}, {
						frame: hoveredIntervalForResize.endFrame,
						x: endFrameX
					}].forEach(({ frame, x }) => {
						drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
					});
				}
				if (hoveredKeyframe) drawHighlightFrameBox(ctx, timelineStartX + (hoveredKeyframe.frame - viewStartFrame) * pixelRange, hoveredKeyframe.frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
				if (intervalDrag) {
					const actualStartFrame = Math.min(intervalDrag.startFrame, intervalDrag.endFrame);
					const actualEndFrame = Math.max(intervalDrag.startFrame, intervalDrag.endFrame);
					const trackIndex = timelineState.tracks.findIndex((t) => t.uuid === intervalDrag.trackId);
					if (trackIndex !== -1) {
						const track = timelineState.tracks[trackIndex];
						const trackColor = track.color || DEFAULT_KEYFRAME_COLOR;
						const trackHeight = 30 * (track.height_scale || 1);
						let trackY = 28;
						trackY += 30;
						for (let i = 0; i < trackIndex; i++) trackY += 30 * (timelineState.tracks[i].height_scale || 1);
						const intervalPreview = {
							start_frame: actualStartFrame,
							end_frame: actualEndFrame
						};
						getIntervalSegments(intervalPreview, promptRange, trackColor).forEach((segment) => {
							const roundLeft = segment.startFrame === intervalPreview.start_frame;
							const roundRight = segment.endFrame === intervalPreview.end_frame;
							drawInterval(ctx, {
								...intervalPreview,
								start_frame: segment.startFrame,
								end_frame: segment.endFrame,
								opacity: segment.opacity
							}, coords, trackY, trackHeight, segment.color, theme, width, roundLeft, roundRight, true, false);
						});
						drawInterval(ctx, intervalPreview, coords, trackY, trackHeight, trackColor, theme, width, true, true, false, true);
					}
				}
				if (hoveredSplitPreview) {
					const splitX = timelineStartX + (hoveredSplitPreview.frame - viewStartFrame) * pixelRange;
					{
						const promptY = 30;
						ctx.save();
						ctx.strokeStyle = HIGHLIGHT_COLOR;
						ctx.lineWidth = 2;
						ctx.beginPath();
						ctx.moveTo(splitX, promptY);
						ctx.lineTo(splitX, 56);
						ctx.stroke();
						ctx.restore();
					}
					drawHighlightFrameBox(ctx, splitX, hoveredSplitPreview.frame, 2, 50, 30, 4);
				}
				const resizeHandleFrame = resizingPromptCurrentFrames ? resizingPrompt?.edge === "left" ? resizingPromptCurrentFrames.startFrame : resizingPromptCurrentFrames.endFrame : hoveredPromptResize?.frame ?? null;
				if (resizeHandleFrame !== null && resizeHandleFrame !== void 0) drawHighlightFrameBox(ctx, timelineStartX + (resizeHandleFrame - viewStartFrame) * pixelRange, resizeHandleFrame, 2, 50, 30, 4);
				if (draggingIntersection && draggingIntersectionCurrentFrame !== null) {
					const BOX_WIDTH = 50;
					const BOX_HEIGHT = 30;
					const BOX_Y = 2;
					const intersectionX = timelineStartX + (draggingIntersectionCurrentFrame - viewStartFrame) * pixelRange;
					drawHighlightFrameBox(ctx, timelineStartX + (draggingIntersection.leftOriginalStart - viewStartFrame) * pixelRange, draggingIntersection.leftOriginalStart, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
					drawHighlightFrameBox(ctx, intersectionX, draggingIntersectionCurrentFrame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
				}
				if (hoveredIntersection && !draggingIntersection) drawHighlightFrameBox(ctx, timelineStartX + (hoveredIntersection.frame - viewStartFrame) * pixelRange, hoveredIntersection.frame, 2, 50, 30, 4);
			}, [
				timelineState?.enabled,
				timelineState?.current_frame,
				timelineState?.start_frame,
				timelineState?.end_frame,
				canvasSize.width,
				canvasSize.height,
				canvasSize.dpr,
				resizeRevision,
				backgroundRevision,
				draggedKeyframeFrame,
				intervalDrag,
				draggedIntervalCurrentFrames,
				resizingIntervalCurrentFrames,
				resizingPromptCurrentFrames,
				hoveredPromptForResize,
				hoveredIntervalForResize,
				hoveredKeyframe,
				hoveredSplitPreview,
				hoveredIntersection,
				draggingIntersection,
				draggingIntersectionCurrentFrame,
				zoomLevel,
				panOffset,
				darkMode
			]);
		}
		function TimelineEditingOverlay(props) {
			const { editingPrompt, timelineState, theme, darkMode, editingPromptDivRef, onPromptUpdate, setEditingPrompt } = props;
			(0, react.useEffect)(() => {
				if (!editingPrompt) return;
				const el = editingPromptDivRef.current;
				if (!el) return;
				requestAnimationFrame(() => {
					try {
						el.focus();
						const sel = window.getSelection?.();
						if (!sel) return;
						const range = document.createRange();
						range.selectNodeContents(el);
						range.collapse(false);
						sel.removeAllRanges();
						sel.addRange(range);
					} catch {}
				});
			}, [editingPrompt?.uuid]);
			if (!editingPrompt) return null;
			const color = (timelineState?.prompts.find((p) => p.uuid === editingPrompt.uuid))?.color || DEFAULT_PROMPT_COLOR;
			const borderColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					inset: 0,
					zIndex: 9,
					background: "transparent"
				},
				onMouseDown: (e) => {
					const editor = editingPromptDivRef.current;
					if (editor && !editor.contains(e.target)) editor.blur();
					e.preventDefault();
					e.stopPropagation();
				},
				onDoubleClick: (e) => {
					e.preventDefault();
					e.stopPropagation();
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					position: "absolute",
					left: `${editingPrompt.x}px`,
					top: `${editingPrompt.y}px`,
					width: `${editingPrompt.width}px`,
					height: `${editingPrompt.height}px`,
					fontSize: "12px",
					fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxSizing: "border-box",
					border: "none",
					boxShadow: `inset 0 0 0 2px ${borderColor}`,
					borderRadius: "5px",
					outline: "none",
					backgroundColor: darkMode ? "rgba(13, 21, 32, 0.95)" : "rgba(13, 21, 32, 0.95)",
					color: theme.promptTextColor,
					padding: 0,
					zIndex: 10
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: editingPromptDivRef,
					contentEditable: true,
					suppressContentEditableWarning: true,
					onBlur: (e) => {
						const nextText = e.currentTarget.textContent ?? "";
						if (onPromptUpdate && nextText !== editingPrompt.text) {
							onPromptUpdate(editingPrompt.uuid, nextText);
							setTimeout(() => setEditingPrompt(null), 0);
						} else setEditingPrompt(null);
					},
					onKeyDown: (e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							e.currentTarget.blur();
						} else if (e.key === "Escape") {
							e.preventDefault();
							setEditingPrompt(null);
						}
					},
					style: {
						flex: 1,
						height: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						textAlign: "center",
						padding: "0 8px",
						whiteSpace: "nowrap",
						overflowX: "auto",
						overflowY: "hidden",
						outline: "none"
					},
					children: editingPrompt.text
				})
			}, editingPrompt.uuid)] });
		}
		function TimelineScrollbar(props) {
			const { timelineState, zoomLevel, panOffset, darkMode, scrollbarTrackRef, onScrollbarTrackMouseDown, onScrollbarThumbMouseDown, zoomBy, resetZoom } = props;
			const scrollEnvelopeEnd = getZoomEnvelopeEndFrame(timelineState);
			const scrollTotalFrames = Math.max(1, scrollEnvelopeEnd - timelineState.start_frame + 1);
			const scrollVisibleFrames = scrollTotalFrames / zoomLevel;
			const scrollMaxPan = Math.max(0, scrollTotalFrames - scrollVisibleFrames);
			const thumbWidthPct = Math.min(97, Math.max(8, scrollVisibleFrames / scrollTotalFrames * 100));
			const thumbLeftPct = scrollMaxPan > 0 ? panOffset / scrollMaxPan * (100 - thumbWidthPct) : (100 - thumbWidthPct) / 2;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 4,
					width: "100%",
					height: `14px`,
					padding: "0 2px",
					backgroundColor: darkMode ? "rgba(13,21,32,0.6)" : "rgba(0,0,0,0.04)",
					borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: scrollbarTrackRef,
						"data-testid": "timeline-scrollbar-track",
						onMouseDown: onScrollbarTrackMouseDown,
						style: {
							position: "relative",
							flex: 1,
							height: `10px`,
							backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
							cursor: "pointer",
							borderRadius: "4px"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-testid": "timeline-scrollbar-thumb",
							onMouseDown: onScrollbarThumbMouseDown,
							style: {
								position: "absolute",
								top: 0,
								bottom: 0,
								left: `${thumbLeftPct}%`,
								width: `${thumbWidthPct}%`,
								backgroundColor: darkMode ? "rgba(176, 180, 186, 0.9)" : "rgba(100, 105, 120, 0.75)",
								border: `1px solid ${darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
								borderRadius: "4px",
								cursor: "grab",
								boxShadow: darkMode ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
								transition: "background-color 0.15s"
							},
							onMouseEnter: (e) => {
								e.currentTarget.style.backgroundColor = darkMode ? "rgba(237, 238, 240, 0.95)" : "rgba(80, 85, 100, 0.9)";
							},
							onMouseLeave: (e) => {
								e.currentTarget.style.backgroundColor = darkMode ? "rgba(176, 180, 186, 0.9)" : "rgba(100, 105, 120, 0.75)";
							}
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: "Zoom out",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							"data-testid": "timeline-zoom-out",
							onClick: () => zoomBy(1 / 1.5),
							"aria-label": "Zoom out",
							className: timeline_module_css_default.miniBtn,
							style: { padding: 0 },
							children: "−"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: "Fit to window (reset zoom)",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							"data-testid": "timeline-zoom-fit",
							onClick: resetZoom,
							className: timeline_module_css_default.miniFitBtn,
							children: "fit"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: "Zoom in",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							"data-testid": "timeline-zoom-in",
							onClick: () => zoomBy(1.5),
							"aria-label": "Zoom in",
							className: timeline_module_css_default.miniBtn,
							style: { padding: 0 },
							children: "+"
						})
					})
				]
			}) });
		}
		//#endregion
		//#region src/timeline/viser-timeline/Timeline.tsx
		function Timeline({ timelineState, onFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onIntervalAdd, onIntervalMove, onIntervalDelete, onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete, onPromptAdd, onPromptSplit, onPromptMerge, getLatestState }) {
			const darkMode = (0, react.useContext)(ViewerContext)?.useGui((state) => state.theme.dark_mode) ?? true;
			const theme = darkMode ? DARK_THEME : LIGHT_THEME;
			const prompts = (0, react.useMemo)(() => timelineState?.prompts ?? [], [timelineState?.prompts]);
			const promptsByStart = (0, react.useMemo)(() => [...prompts].sort((a, b) => a.start_frame - b.start_frame), [prompts]);
			const promptsByEndDesc = (0, react.useMemo)(() => [...prompts].sort((a, b) => b.end_frame - a.end_frame), [prompts]);
			const promptRange = (0, react.useMemo)(() => {
				if (prompts.length === 0) return null;
				let minStart = prompts[0].start_frame;
				let maxEnd = prompts[0].end_frame;
				for (const prompt of prompts) {
					minStart = Math.min(minStart, prompt.start_frame);
					maxEnd = Math.max(maxEnd, prompt.end_frame);
				}
				return {
					startFrame: minStart,
					endFrame: maxEnd
				};
			}, [prompts]);
			const tracks = (0, react.useMemo)(() => timelineState?.tracks ?? [], [timelineState?.tracks]);
			const keyframes = (0, react.useMemo)(() => timelineState?.keyframes ?? [], [timelineState?.keyframes]);
			const intervals = (0, react.useMemo)(() => timelineState?.intervals ?? [], [timelineState?.intervals]);
			const interaction = useTimelineInteractionState({
				timelineState,
				onPromptResize,
				onPromptMove
			});
			const { containerRef, canvasRef, editingPrompt, setEditingPrompt, editingPromptDivRef, isDraggingCursor, draggedKeyframe, draggedInterval, resizingPrompt, resizingPromptCurrentFrames, hoverEdge, hoveredIntersection, draggingIntersection, isHoveringHeader, isHoveringLabelArea } = interaction;
			const viewport = useTimelineViewport({
				timelineState,
				interaction
			});
			const { zoomLevel, panOffset, canvasSize, resizeRevision, handleWheel, onScrollbarThumbMouseDown, onScrollbarTrackMouseDown, zoomBy, resetZoom, scrollbarTrackRef } = viewport;
			const { handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu, handleDoubleClick } = useTimelineMouseHandlers({
				timelineState,
				canvasRef,
				containerRef,
				zoomLevel,
				panOffset,
				prompts,
				promptsByStart,
				promptsByEndDesc,
				interaction,
				autoPan: useTimelineAutoPan({
					interaction,
					viewport
				}),
				geometry: useTimelineGeometry({
					timelineState,
					canvasRef,
					zoomLevel,
					panOffset,
					prompts,
					promptsByStart,
					intervals,
					keyframes
				}),
				callbacks: {
					onFrameChange,
					onKeyframeAdd,
					onKeyframeMove,
					onKeyframeDelete,
					onIntervalAdd,
					onIntervalMove,
					onIntervalDelete,
					onPromptUpdate,
					onPromptResize,
					onPromptMove,
					onPromptDelete,
					onPromptAdd,
					onPromptSplit,
					onPromptMerge,
					getLatestState
				}
			});
			const { backgroundRevision } = useTimelineBackground({
				timelineState,
				interaction,
				canvasSize,
				resizeRevision,
				zoomLevel,
				panOffset,
				prompts,
				promptRange,
				tracks,
				keyframes,
				intervals,
				theme,
				darkMode
			});
			useTimelineForeground({
				timelineState,
				interaction,
				canvasSize,
				resizeRevision,
				backgroundRevision,
				zoomLevel,
				panOffset,
				prompts,
				promptRange,
				theme,
				darkMode
			});
			if (!timelineState || !timelineState.enabled) return null;
			let tracksHeight = 0;
			tracksHeight += 30;
			for (const track of timelineState.tracks) tracksHeight += 30 * (track.height_scale || 1);
			const containerHeight = 28 + tracksHeight + 14;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					width: "100%"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: containerRef,
					style: {
						position: "relative",
						width: "100%",
						height: `${containerHeight}px`,
						margin: 0,
						padding: 0,
						borderTop: `2px solid ${darkMode ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.1)"}`,
						boxShadow: darkMode ? "0 -2px 8px 0 rgba(0,0,0,0.15)" : "0 -2px 8px 0 rgba(0,0,0,0.08)",
						backgroundColor: theme.backgroundColor
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							onMouseDown: handleMouseDown,
							onMouseMove: handleMouseMove,
							onMouseUp: handleMouseUp,
							onMouseLeave: handleMouseUp,
							onContextMenu: handleContextMenu,
							onDoubleClick: handleDoubleClick,
							onWheel: handleWheel,
							style: {
								width: "100%",
								height: `calc(100% - 14px)`,
								cursor: timelineState.constraints_enabled ? resizingPrompt || resizingPromptCurrentFrames ? "ew-resize" : isHoveringLabelArea ? "default" : hoveredIntersection || draggingIntersection ? "ew-resize" : hoverEdge ? "ew-resize" : isDraggingCursor || draggedKeyframe || draggedInterval ? "grabbing" : "pointer" : isHoveringHeader || isDraggingCursor ? isDraggingCursor ? "grabbing" : "pointer" : "default",
								display: "block"
							}
						}),
						timelineState.constraints_enabled === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: {
							position: "absolute",
							top: `28px`,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: "rgba(13, 21, 32, 0.6)",
							pointerEvents: "none",
							zIndex: 6
						} }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineEditingOverlay, {
							editingPrompt,
							timelineState,
							theme,
							darkMode,
							editingPromptDivRef,
							onPromptUpdate,
							setEditingPrompt
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineScrollbar, {
					timelineState,
					zoomLevel,
					panOffset,
					darkMode,
					scrollbarTrackRef,
					onScrollbarTrackMouseDown,
					onScrollbarThumbMouseDown,
					zoomBy,
					resetZoom
				})]
			});
		}
		//#endregion
		//#region ../catalog/src/clientStore.ts
		/**
		* clientStore — THE client store seat: a bound, zustand-shaped store over the
		* DSH platform snapshot store (`@deepseek-ai/dsh-client-store`, the
		* zustand/immer engine the web shell shares through its frozen module table —
		* see packages/web/shared/web-platform.ts).
		*
		* The engine owns observation, synchronous publication, and Immer-backed
		* updates. This module owns the binding every browser store in the repository
		* shares: the module-level lifetime (the document survives remounts and is
		* shared across tenants), the `getState`/`setState`/`subscribe`/
		* `getInitialState`/`destroy` statics module-level callers use, and the
		* selector hook.
		*
		* `setState` shallow-merges a patch into the record and replaces the record
		* whole when `replace` is true. A patch that leaves the record unchanged keeps
		* the current snapshot and notifies nobody.
		*/
		function createClientStore(init) {
			const engine = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(void 0);
			const stops = /* @__PURE__ */ new Set();
			let initialState;
			const getState = () => engine.getSnapshot();
			const setState = (partial, replace) => {
				const patch = typeof partial === "function" ? partial(getState()) : partial;
				if (replace === true) {
					engine.set(patch);
					return;
				}
				engine.update((draft) => {
					Object.assign(draft, patch);
				});
			};
			const subscribe = (listener) => {
				let previous = getState();
				const stop = engine.subscribe(() => {
					const next = getState();
					const before = previous;
					previous = next;
					listener(next, before);
				});
				stops.add(stop);
				return () => {
					stops.delete(stop);
					stop();
				};
			};
			const api = {
				setState,
				getState,
				getInitialState: () => initialState,
				subscribe,
				destroy: () => {
					for (const stop of stops) stop();
					stops.clear();
				}
			};
			const initial = typeof init === "function" ? init(setState, getState, api) : init;
			engine.set(initial);
			initialState = initial;
			function useStore(selector, equalityFn = Object.is) {
				const selectorRef = (0, react.useRef)(selector);
				selectorRef.current = selector;
				const equalityRef = (0, react.useRef)(equalityFn);
				equalityRef.current = equalityFn;
				const getSnapshot = (0, react.useMemo)(() => {
					let prev;
					let hasPrev = false;
					return () => {
						const sel = selectorRef.current;
						const next = sel ? sel(getState()) : getState();
						if (hasPrev && equalityRef.current(prev, next)) return prev;
						hasPrev = true;
						prev = next;
						return next;
					};
				}, []);
				return (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
			}
			/* v8 ignore stop */
			return Object.assign(useStore, api);
		}
		var init_clientStore = __esmMin((() => {}));
		//#endregion
		//#region src/store/createStore.ts
		init_clientStore();
		function create(initializer) {
			return createClientStore(initializer);
		}
		//#endregion
		//#region src/store/timelineStoreTypes.ts
		const DEFAULT_VIEWPORT = {
			scrollX: 0,
			pixelsPerSecond: 60,
			canvasWidth: 1200,
			canvasHeight: 400
		};
		const DEFAULT_PLAYBACK = {
			isPlaying: false,
			currentTime: 0,
			totalDuration: 5,
			loopRegion: false
		};
		const DEFAULT_DRAG = {
			isDragging: false,
			segmentId: null,
			mouseX: 0,
			mouseY: 0,
			originalOrder: 0,
			ghostOrder: 0
		};
		//#endregion
		//#region ../contracts/src/extraKeys.ts
		/** THE TYPED WRITE — declarations pass their literal through this
		*  so an unknown key or malformed value fails EVERY wall: tsc at
		*  the literal, this throw at runtime (spread arms), the boot
		*  validator on any served envelope, and the estate law suite on
		*  the wire. Never a silently dead write. */
		function bag(b) {
			const where = "extra bag";
			for (const key of Object.keys(b)) if (!EXTRA_KEY_SET.has(key)) throw new Error(where + " carries '" + key + "' — not in the contract's vocabulary (packages/web-kit/contracts/src/extraKeys.ts). A key outside the table has no reader spelling and would be a silent dead write. Add it to EXTRA_KEYS with its type and owners, or fix the spelling.");
			const str = (k) => {
				const v = b[k];
				if (v !== void 0 && typeof v !== "string") throw new Error(where + "." + k + " must be a string — got " + JSON.stringify(v));
			};
			const num = (k) => {
				const v = b[k];
				if (v !== void 0 && typeof v !== "number") throw new Error(where + "." + k + " must be a number — got " + JSON.stringify(v));
			};
			const bool = (k) => {
				const v = b[k];
				if (v !== void 0 && typeof v !== "boolean") throw new Error(where + "." + k + " must be a boolean — got " + JSON.stringify(v));
			};
			str("group");
			str("visible_when");
			str("tooltip");
			str("placeholder");
			str("optionsFrom");
			str("wtype");
			str("zone");
			str("media");
			bool("required");
			bool("hidden");
			bool("serveDefault");
			num("width");
			num("columns");
			num("max_stack");
			{
				const v = b["order"];
				if (v !== void 0 && v !== null && typeof v !== "number") throw new Error(where + ".order must be a number or null — got " + JSON.stringify(v));
			}
			{
				const v = b["families"];
				if (v !== void 0 && (!Array.isArray(v) || v.some((x) => typeof x !== "string"))) throw new Error(where + ".families must be a string[] — got " + JSON.stringify(v));
			}
			if (b.wtype !== void 0 && !WTYPE_SET.includes(b.wtype)) throw new Error(where + " carries wtype '" + b.wtype + "' — not in WTYPE_SET. The renderer has no arm for it (a foreign wtype silently renders as a plain text input). Add it to WTYPE_SET with its seat, or fix the spelling.");
			if (b.zone !== void 0 && !ZONE_SET.includes(b.zone)) throw new Error(where + " carries zone '" + b.zone + "' — not in ZONE_SET (" + ZONE_SET.join(", ") + ").");
			if (b.media !== void 0 && !MEDIA_SET.includes(b.media)) throw new Error(where + " carries media '" + b.media + "' — not in MEDIA_SET (" + MEDIA_SET.join(", ") + ").");
			if (b.options !== void 0) {
				const seen = /* @__PURE__ */ new Set();
				for (const row of b.options) {
					const value = typeof row === "string" ? row : row.value;
					const label = typeof row === "string" ? row : row.label;
					if (value === "") throw new Error(where + ".options carries an empty value");
					if (label === "") throw new Error(where + ".options row '" + value + "' carries an empty label");
					if (seen.has(value)) throw new Error(where + ".options carries duplicate value '" + value + "' — an ambiguous pick");
					seen.add(value);
				}
			}
			if (b.visible_when !== void 0 && b.visible_when !== "") for (const guard of b.visible_when.split("&")) {
				const g = guard.trim();
				const ne = g.indexOf("!=");
				const eq = ne >= 0 ? -1 : g.indexOf("=");
				if (ne < 0 && eq < 0) throw new Error(where + ".visible_when guard '" + g + "' carries no operator (= or !=)");
				const at = ne >= 0 ? ne : eq;
				const key = g.slice(0, at).trim();
				const rhs = g.slice(at + (ne >= 0 ? 2 : 1)).trim();
				if (key === "") throw new Error(where + ".visible_when guard '" + g + "' carries an empty key");
				if (rhs === "") throw new Error(where + ".visible_when guard '" + g + "' carries an empty value");
			}
			return b;
		}
		/** THE TYPED READ — one getter for every face. `extraOf(node)`
		*  narrows a serialized ref node's meta.extra to the bag type;
		*  faces read keys off the result, never off a bare record. */
		function extraOf(node) {
			const raw = node?.meta?.["extra"];
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
			const w = raw["wtype"];
			if (w !== void 0 && w !== "" && !WTYPE_SET.includes(w)) throw new Error("serialized extra carries wtype '" + String(w) + "' — not in WTYPE_SET. The renderer has no arm for it (add it with its seat, or fix the spelling).");
			return raw;
		}
		var EXTRA_KEYS, EXTRA_KEY_SET, WTYPE_SET, WTYPE_SEATS, MEDIA_SET, ZONE_SET, ROLE_SET;
		var init_extraKeys = __esmMin((() => {
			EXTRA_KEYS = [
				"order",
				"group",
				"zone",
				"wtype",
				"width",
				"columns",
				"visible_when",
				"required_when",
				"tooltip",
				"required",
				"hidden",
				"families",
				"max_stack",
				"media",
				"placeholder",
				"options",
				"optionsFrom",
				"serveDefault",
				"default"
			];
			EXTRA_KEY_SET = new Set(EXTRA_KEYS);
			WTYPE_SET = [
				"number",
				"select",
				"slider",
				"text",
				"textarea",
				"boolean",
				"image",
				"file",
				"mesh",
				"image_list",
				"mask",
				"loras",
				"ip_adapters",
				"controlnets"
			];
			WTYPE_SEATS = {
				number: "atom",
				select: "atom",
				slider: "atom",
				text: "atom",
				textarea: "atom",
				boolean: "atom",
				image: "atom",
				file: "atom",
				mesh: "atom",
				image_list: "rail",
				mask: "mod-face",
				loras: "mod-face",
				ip_adapters: "mod-face",
				controlnets: "mod-face"
			};
			MEDIA_SET = [
				"video",
				"audio",
				"mod"
			];
			ZONE_SET = [
				"inputs",
				"params",
				"mods"
			];
			ROLE_SET = ["path"];
		}));
		//#endregion
		//#region ../contracts/src/laneRelations.ts
		/** THE BLANK LAW (the estate's own): undefined, null, empty or
		*  whitespace string, empty array, empty object = NOT stated. A
		*  number (0 included), a boolean, a non-empty array (mod bag) or
		*  object = stated. Pure, shared by every word. */
		function laneBlank(v) {
			if (v === void 0 || v === null) return true;
			if (typeof v === "string") return v.trim() === "";
			if (Array.isArray(v)) return v.every((entry) => laneBlank(entry));
			if (typeof v === "object") {
				const proto = Object.getPrototypeOf(v);
				if (proto !== null && proto !== Object.prototype) return false;
				return Object.values(v).every((entry) => laneBlank(entry));
			}
			return false;
		}
		/** Judge the four words over one stated state. PURE: no I/O, no
		*  card code — the same call the bench door refuses with and the
		*  form renders inline. Every row fires only on the STATED side of
		*  the law (blank fields never violate requires/together; either_or
		*  stays unarmed until a member is stated — authoring-in-progress
		*  is never a write refusal). */
		function judgeLaneRelations(relations, values) {
			const out = [];
			const stated = (name) => Object.prototype.hasOwnProperty.call(values, name) && !laneBlank(values[name]);
			for (const rel of relations) {
				if (rel === null || typeof rel !== "object") continue;
				for (const row of rel.requires ?? []) {
					if (row === null || typeof row !== "object" || typeof row.field !== "string") continue;
					if (!stated(row.field)) continue;
					const missing = (row.needs ?? []).filter((n) => !stated(n));
					if (missing.length === 0) continue;
					out.push({
						field: row.field,
						message: "field '" + row.field + "' requires " + quote(missing) + " on this lane" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state " + quote(missing) + " too, or drop '" + row.field + "'")
					});
				}
				for (const row of rel.conflicts ?? []) {
					if (row === null || typeof row !== "object") continue;
					if (typeof row.a !== "string" || typeof row.b !== "string") continue;
					if (!stated(row.a) || !stated(row.b)) continue;
					out.push({
						field: row.a,
						message: "fields '" + row.a + "' + '" + row.b + "' conflict on this lane" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — drop one of them")
					});
				}
				for (const row of rel.together ?? []) {
					if (row === null || typeof row !== "object") continue;
					const members = Array.isArray(row.fields) ? row.fields : [];
					if (members.length === 0) continue;
					if (!members.some(stated)) continue;
					if (members.filter((m) => !stated(m)).length === 0) continue;
					out.push({
						field: members.find(stated),
						message: "fields " + quote(members) + " ride together on this lane (state all or none)" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state " + quote(members) + " together, or drop " + quote(members))
					});
				}
				for (const row of rel.either_or ?? []) {
					if (row === null || typeof row !== "object") continue;
					const groups = Array.isArray(row.groups) ? row.groups.filter((g) => Array.isArray(g)) : [];
					if (groups.length === 0) continue;
					const everyMember = groups.flat();
					if (!everyMember.some(stated)) continue;
					if (groups.filter((g) => g.every(stated)).length > 0) continue;
					out.push({
						field: everyMember.find(stated),
						message: "this lane takes one of " + groups.map((g) => "(" + quote(g) + ")").join(" or ") + " — the stated combination completes none of them" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state one complete source, or drop the stated half")
					});
				}
				for (const row of rel.at_most_one ?? []) {
					if (row === null || typeof row !== "object") continue;
					const fields = Array.isArray(row.fields) ? row.fields.filter((f) => typeof f === "string") : [];
					if (fields.length < 2) continue;
					const present = fields.filter(stated);
					if (present.length <= 1) continue;
					out.push({
						field: present[1],
						message: "this lane takes at most one of " + quote(fields) + " — the state carries " + present.length + " (" + quote(present) + ")" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — one slot, one value")
					});
				}
				for (const row of rel.required ?? []) {
					if (row === null || typeof row !== "object") continue;
					const fields = Array.isArray(row.fields) ? row.fields.filter((f) => typeof f === "string") : [];
					if (row.any_of === true) {
						if (fields.length === 0) continue;
						if (fields.some(stated)) continue;
						out.push({
							field: fields[0],
							message: "this lane requires one of " + quote(fields) + " — none is stated" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state one of them")
						});
						continue;
					}
					const missing = fields.filter((f) => !stated(f));
					if (missing.length === 0) continue;
					out.push({
						field: missing[0],
						message: "this lane requires " + quote(fields) + " — " + quote(missing) + " is not stated" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state it, or use a lane that does not need it")
					});
				}
			}
			const seen = /* @__PURE__ */ new Set();
			return out.filter((v) => {
				if (seen.has(v.message)) return false;
				seen.add(v.message);
				return true;
			});
		}
		/** The unstated-required sentence stem — the opening words of every
		*  violation this judge emits for a required word that is simply
		*  UNSTATED (the incomplete-draft class). Exported as the ONE
		*  spelling every seat tests: the write door's filter (drop the
		*  class at the add seat), the run seat's refusal code (the class
		*  rides card_compose_incomplete, never a run face), and the drafts
		*  domain's one-time heal of rows the old carry poisoned. A text
		*  CARRIES the class when the stem appears anywhere in it — the
		*  judge's own messages open with it, and persisted composites
		*  embed it after the door's prefix.
		* @param text the refusal sentence to classify
		* @returns true when the sentence is the unstated-required voice */
		function isUnstatedRequiredVoice(text) {
			return text.includes(UNSTATED_REQUIRED_STEM);
		}
		/** The heal's stricter twin: the text is the unstated-required class
		* AND NOTHING ELSE. A composite refusal (the judge joins multiple
		* violations with "; ") can carry the stem beside a stated-wrong
		* half — healing that row would erase a REAL failure. The drafts
		* domain's one-time heal runs on persisted rows and must fire only
		* on pure members of the class: every segment passes the stem test
		* or the row keeps its failed face.
		* @param text the persisted refusal sentence to classify
		* @returns true when every segment of the text is the
		*  unstated-required voice */
		function isPurelyUnstatedRequiredVoice(text) {
			if (!isUnstatedRequiredVoice(text)) return false;
			return text.split(/;\s*|\n/).filter((segment) => segment.trim() !== "").every((segment) => isUnstatedRequiredVoice(segment));
		}
		/** Judge the LANE SURFACE (the parameter-surface half of the same
		*  declaration): a STATED card-schema field outside the lane's
		*  declared surface fires nothing at compose — refuse it here, in
		*  the field's voice, a priori. `schemaFields` are the card's own
		*  field names (the walk the claim law already owns); fields the
		*  surface declares but the card does not carry are the claim
		*  law's refusal, never this one. A null surface (the family
		*  declares none) judges nothing — legacy families keep the card's
		*  union table until they declare. */
		function judgeLaneSurface(surface, schemaFields, values) {
			if (surface === null || surface === void 0) return [];
			const declared = new Set(surface);
			const out = [];
			for (const name of schemaFields) {
				if (declared.has(name)) continue;
				if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
				if (laneBlank(values[name])) continue;
				out.push({
					field: name,
					message: "field '" + name + "' fires nothing on this lane (the variant's declared surface is " + (surface.length > 0 ? surface.join(", ") : "empty") + ") — drop it or switch lane"
				});
			}
			return out;
		}
		/** THE LANE MIGRATION CARRY (operator 2026-10-12, the stuck-switch
		*  incident — live on :3088: a CustomVoice draft carrying `voice`,
		*  the variant switched to VoiceDesign, and the write REFUSED
		*  "field 'voice' fires nothing on this lane — drop it or switch
		*  lane" while the form HIDES the voice row on the new lane: the
		*  named cure is unclickable and the switch itself cannot land,
		*  wedging the studio between "the studio shows your edit; the
		*  bench does not").
		*
		*  THE LAW: a lane change is a MIGRATION, not a refusal. A stated
		*  member that the PRIOR lane's surface declared but the new lane's
		*  does not take is stale carry — it rides nothing at compose, so
		*  the write door DROPS it and lands the switch. The a priori
		*  refusal keeps its teeth exactly where they belong: a member
		*  stated on the CURRENT lane that no prior lane declared is
		*  authored state, refused in the field's voice as before. This is
		*  the same blank law judgeLaneSurface already runs — the stale set
		*  is precisely the refusal set ∩ the prior surface. The membership
		*  test rides the SURFACES (the DECL's own vocabulary), never the
		*  card schema walk: surfaces name members the card schema does not
		*  carry flat (voice_name is a mod rider — the schemaNames walk
		*  skipped it and the pair half-survived the first cut of this
		*  law).
		*
		*  @param prevSurface the prior (family × variant) lane's surface —
		*  the lane the state is leaving
		*  @param nextSurface the resolved lane's surface — the lane the
		*  write selects
		*  @param values the MERGED view the write door would judge
		*  @returns the stale member names to delete from the merged view
		*  (empty when the surfaces name no such members). */
		function laneStaleCarry(prevSurface, nextSurface, values) {
			if (prevSurface === null || prevSurface === void 0) return [];
			if (nextSurface === null || nextSurface === void 0) return [];
			const prev = new Set(prevSurface);
			const next = new Set(nextSurface);
			const out = [];
			for (const name of Object.keys(values)) {
				if (next.has(name)) continue;
				if (!prev.has(name)) continue;
				if (laneBlank(values[name])) continue;
				out.push(name);
			}
			return out;
		}
		/** The effective surface for one (family × variant) lane: the
		*  family base plus the variant's additions (the cascade law —
		*  later layers add, never subtract). Null family params = the
		*  family declares no surface (the legacy card-authored truth). */
		function laneSurfaceOf(familyParams, variantParams, cellParams) {
			if (familyParams === void 0 || familyParams === null) return null;
			if ((variantParams === void 0 || variantParams === null) && (cellParams === void 0 || cellParams === null)) return [...familyParams];
			return [.../* @__PURE__ */ new Set([
				...familyParams,
				...variantParams ?? [],
				...cellParams ?? []
			])];
		}
		function laneBoundsOf(familyBounds, variantBounds) {
			if (familyBounds === void 0 || familyBounds === null) return variantBounds === void 0 || variantBounds === null ? null : { ...variantBounds };
			if (variantBounds === void 0 || variantBounds === null) return { ...familyBounds };
			const merged = { ...familyBounds };
			for (const [name, row] of Object.entries(variantBounds)) merged[name] = {
				...familyBounds[name] ?? {},
				...row
			};
			return merged;
		}
		/** Judge the bounds over one stated state. PURE. Blank fields never
		*  violate (the blank law: unstated is the family default's
		*  business, not a refusal); non-numbers are the card schema's own
		*  refusal, never re-voiced here; a stated number outside its row
		*  refuses IN THE FIELD'S VOICE, cure included. */
		function judgeLaneBounds(bounds, values) {
			if (bounds === null) return [];
			const out = [];
			for (const [name, row] of Object.entries(bounds)) {
				if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
				const v = values[name];
				if (laneBlank(v) || typeof v !== "number" || !Number.isFinite(v)) continue;
				const floor = row.min;
				const ceiling = row.max;
				if (!(floor !== void 0 && v < floor) && !(ceiling !== void 0 && v > ceiling)) continue;
				const span = floor !== void 0 && ceiling !== void 0 ? floor + "–" + ceiling : floor !== void 0 ? "at least " + floor : "at most " + ceiling;
				out.push({
					field: name,
					message: "'" + name + "': " + v + " is outside this lane's range (" + span + ") — the model owns the floor and the ceiling (the declaration, not the form)"
				});
			}
			return out;
		}
		/** The variant rail's unknown-variant refusal body — the one
		*  spelling, composed by the door (cardsVariant) and the client
		*  mirror (card-base composeValidate) alike; the FRAME rides the
		*  caller (`card_compose phase N:` at the door, the phase-less
		*  `card_compose:` on the client).
		*
		* @param stated the variant the caller stated, verbatim.
		* @param model the model id the variant pool belongs to.
		* @param known the offered variant ids, door order.
		* @returns the refusal body, frame-free. */
		function unknownVariantVoice(stated, model, known) {
			return "unknown variant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " (known: " + known.join(", ") + ")";
		}
		/** The variant rail's unknown-quant refusal body — same contract as
		*  {@link unknownVariantVoice}: one spelling, frame at the caller.
		*
		* @param stated the quant the caller stated, verbatim.
		* @param model the model id the cells belong to.
		* @param variant the variant whose cells were searched.
		* @param known the variant's offered quants, door order; empty
		*  yields the declares-no-cells tail.
		* @returns the refusal body, frame-free. */
		function unknownQuantVoice(stated, model, variant, known) {
			return "unknown quant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " variant " + JSON.stringify(variant) + (known.length > 0 ? " (known: " + known.join(", ") + ")" : " (the variant declares no cells)");
		}
		/** THE ROUTE ENVELOPE GATE'S ONE JUDGE (the voice audit, 2026-10-11:
		*  six hand-mirrored spellings, two frames): a stated numeric
		*  steps/cfg outside the selected variant's closed envelope is the
		*  one refusal — the door (cardsVariant's envelopeRefusal) and the
		*  client mirror (card-base composeValidate clause 3) both ask this
		*  judge, never a divergent copy. The skips ride verbatim: a null
		*  envelope, an absent bound, a non-numeric or non-finite statement
		*  never refuse; a stated value inside the closed interval is
		*  caller agency. The married clause and the lane-read tail are the
		*  DOOR's own decorations — callers append what their seat knows.
		*
		* @param stated the caller's raw body — only numeric steps/cfg ride.
		* @param envelope the selected variant's declared envelope, null
		*  when the variant declares none; each bound is the closed
		*  [min, max] pair the DECL law writes.
		* @param variant the selected variant's id and route.
		* @returns the first offending knob with its composed voice, or
		*  null when every stated value sits inside. */
		function judgeSamplerEnvelope(stated, envelope, variant) {
			if (envelope === null) return null;
			for (const knob of ["steps", "cfg"]) {
				const bound = envelope[knob];
				if (bound === void 0) continue;
				const value = stated[knob];
				if (typeof value !== "number" || !Number.isFinite(value)) continue;
				const [lo, hi] = bound;
				if (value >= lo && value <= hi) continue;
				return {
					knob,
					stated: value,
					lo,
					hi,
					voice: "stated " + knob + " " + String(value) + " is OUTSIDE the route envelope for variant " + JSON.stringify(variant.id) + (variant.route !== void 0 && variant.route !== "" ? " (route " + variant.route + ")" : "") + " — the declared envelope is [" + String(lo) + ", " + String(hi) + "]"
				};
			}
			return null;
		}
		/** The envelope refusal's CURE — the sentence that tells the
		*  operator what to do about it. Both seats append it verbatim
		*  after the judge's voice (the door interleaves its marriage
		*  clause between); the cure is one spelling because it is the
		*  half the operator reads.
		*
		* @returns the cure sentence, unpunctuated at both ends. */
		function samplerEnvelopeCure() {
			return "The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.";
		}
		/** One family's declared lane surface + laws, verbatim. Absent
		*  members stay absent (the absent-equals-empty law: nothing is
		*  invented, and a family that declares nothing yields an empty
		*  base with no relations key). */
		function laneContractOf(decl) {
			const variants = {};
			for (const v of decl.variants ?? []) {
				const cells = {};
				for (const c of v.cells ?? []) if (c.params !== void 0) cells[c.quant] = { params: [...c.params] };
				if (v.params === void 0 && v.relations === void 0 && v.bounds === void 0 && v.sampler_envelope === void 0 && Object.keys(cells).length === 0) continue;
				variants[v.id] = {
					...v.params !== void 0 ? { params: [...v.params] } : {},
					...v.relations !== void 0 ? { relations: v.relations } : {},
					...v.bounds !== void 0 || v.sampler_envelope !== void 0 ? { bounds: envelopeBoundsOf(v.bounds, v.sampler_envelope) } : {},
					...v.sampler_envelope !== void 0 ? { sampler_envelope: v.sampler_envelope } : {},
					...Object.keys(cells).length > 0 ? { cells } : {}
				};
			}
			return {
				...decl.params !== void 0 ? { base: [...decl.params] } : {},
				...decl.relations !== void 0 ? { relations: decl.relations } : {},
				...decl.bounds !== void 0 ? { bounds: decl.bounds } : {},
				variants
			};
		}
		/** THE ROUTE ENVELOPE IS BOUNDS (2026-10-11, the operator's wall:
		* "the entire point of the schema rework was so this was impossible
		* by design"): a variant's sampler_envelope is the SAME closed
		* interval the bench's stamp gate refuses with (envelopeRefusal) —
		* project it into the variant's bounds rows so the form's inline
		* gate, the run gate, and the compose door judge ONE truth. The
		* envelope OWNS both endpoints for steps/cfg (the door is the
		* authority; a family bound that contradicts its own variant's
		* envelope is a DECL bug, and the door's voice wins). Before this,
		* a family that declared only envelopes (krea-2) served bounds
		* null — the form judged NOTHING while the door refused the write
		* 300ms after the press. */
		function envelopeBoundsOf(bounds, envelope) {
			const out = { ...bounds ?? {} };
			if (envelope === void 0) return out;
			if (Array.isArray(envelope.steps) && envelope.steps.length === 2) out.steps = {
				...out.steps ?? {},
				min: envelope.steps[0],
				max: envelope.steps[1]
			};
			if (Array.isArray(envelope.cfg) && envelope.cfg.length === 2) out.cfg = {
				...out.cfg ?? {},
				min: envelope.cfg[0],
				max: envelope.cfg[1]
			};
			return out;
		}
		/** THE CONTRACT MAP for a card's declared families: family id → its
		*  lane contract. Families that declare no params and no laws are
		*  omitted (legacy families judge nothing; serving an empty row
		*  would only cost the agent tokens). */
		function laneContractsFor(familyIds, declOf) {
			const out = {};
			for (const id of familyIds) {
				const decl = declOf(id);
				if (decl === void 0) continue;
				const contract = laneContractOf(decl);
				if ((contract.base ?? []).length === 0 && contract.relations === void 0 && contract.bounds === void 0 && Object.keys(contract.variants).length === 0) continue;
				out[id] = contract;
			}
			return out;
		}
		var RELATION_WORDS, quote, UNSTATED_REQUIRED_STEM;
		var init_laneRelations = __esmMin((() => {
			RELATION_WORDS = {
				requires: true,
				conflicts: true,
				together: true,
				either_or: true,
				at_most_one: true,
				required: true
			};
			quote = (fields) => fields.map((f) => "'" + f + "'").join(" + ");
			UNSTATED_REQUIRED_STEM = "this lane requires ";
		}));
		//#endregion
		//#region ../contracts/src/FlowTypes.ts
		var init_FlowTypes = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/benchResult.ts
		/** Validate a result row against the contract. Returns the defect
		* list — EMPTY means the row is lawful. Each defect names the law
		* and the offending keys, in the door's own voice. */
		function benchResultDefects(row) {
			if (typeof row !== "object" || row === null || Array.isArray(row)) return ["result: not an object"];
			const r = row;
			const defects = [];
			if (typeof r.run_id !== "string" || r.run_id === "") defects.push("run_id: missing or empty (every result names its run)");
			if (r.url !== void 0 && (typeof r.url !== "string" || r.url === "")) defects.push("url: present but not a non-empty string");
			if (r.artifacts !== void 0) {
				if (typeof r.artifacts !== "object" || r.artifacts === null || Array.isArray(r.artifacts)) defects.push("artifacts: not an object (the name→url map)");
				else {
					const seen = /* @__PURE__ */ new Map();
					for (const [k, v] of Object.entries(r.artifacts)) {
						if (typeof v !== "string" || v === "") {
							defects.push(`artifacts.${k}: not a non-empty string url`);
							continue;
						}
						const keys = seen.get(v) ?? [];
						keys.push(k);
						seen.set(v, keys);
					}
					for (const [url, keys] of seen) if (keys.length > 1) defects.push("one-file-one-key: " + url + " rides " + keys.length + " keys (" + keys.join(", ") + ") — a file under two keys renders twice");
				}
			}
			if (r.reports !== void 0) {
				if (typeof r.reports !== "object" || r.reports === null || Array.isArray(r.reports)) defects.push("reports: not an object (the name→verdict map)");
				else for (const [k, v] of Object.entries(r.reports)) {
					if (typeof v !== "object" || v === null || Array.isArray(v)) {
						defects.push(`reports.${k}: not an object (kind 'report' entry)`);
						continue;
					}
					const rep = v;
					if (rep["kind"] !== "report") defects.push(`reports.${k}: kind is not 'report' (the only entry kind)`);
					if (rep["status"] !== "pass" && rep["status"] !== "fail" && rep["status"] !== "warn") defects.push(`reports.${k}: status is not pass|fail|warn`);
					if (rep["title"] !== void 0 && (typeof rep["title"] !== "string" || rep["title"] === "")) defects.push(`reports.${k}.title: present but not a non-empty string`);
					if (rep["chips"] !== void 0) {
						if (!Array.isArray(rep["chips"])) defects.push(`reports.${k}.chips: not an array`);
						else rep["chips"].forEach((c, i) => {
							if (typeof c !== "string" || c === "") defects.push(`reports.${k}.chips[${String(i)}]: not a non-empty string`);
						});
					}
					if (rep["rows"] !== void 0) {
						if (typeof rep["rows"] !== "object" || rep["rows"] === null || Array.isArray(rep["rows"])) defects.push(`reports.${k}.rows: not an object (the key-value body)`);
						else for (const [rk, rv] of Object.entries(rep["rows"])) if (typeof rv !== "string" && typeof rv !== "number" && typeof rv !== "boolean") defects.push(`reports.${k}.rows.${rk}: not a string|number|boolean`);
					}
				}
			}
			if (r.assetUrls !== void 0) {
				if (!Array.isArray(r.assetUrls)) defects.push("assetUrls: not an array");
				else r.assetUrls.forEach((u, i) => {
					if (typeof u !== "string" || u === "") defects.push(`assetUrls[${String(i)}]: not a non-empty string url`);
				});
			}
			if (r.error !== void 0 && typeof r.error !== "string") defects.push("error: present but not a string");
			return defects;
		}
		/** THE DOWNLOAD FILENAME (the boundary audit's C5, promoted to the
		*  contract by A-M10): a source URL names a file by its PATHNAME's
		*  last segment, percent-decoded — never the query, never the
		*  fragment, never "". `split("/").pop()` kept both, so the manager
		*  downloaded under a clean name while the row inspected one with
		*  "f.safetensors?download=1" glued on, and the post-download check
		*  reported model-not-landed for a model that WAS on disk. A URL
		*  ending in "/" names no file: the result is "" and the caller's
		*  destination check refuses it by name. One derivation, contract-
		*  owned, so the wall can DRIVE it (a source-substring pin passed on
		*  dead code).
		*
		*  THE INPUT IS ABSOLUTE, ALWAYS: the sole caller hands it a cell
		*  artifact's `source_url`, which the DECL contract pins to
		*  `/^https?:\/\//` (models/families/contract.ts, CellArtifact), so
		*  `new URL()` never throws here and a relative spelling cannot
		*  reach this function (the re-audit, 2026-10-16). */
		function artifactFileName(sourceUrl) {
			const pathname = new URL(sourceUrl).pathname;
			if (pathname.endsWith("/")) return "";
			const last = pathname.split("/").filter((s) => s !== "").pop();
			try {
				return decodeURIComponent(last);
			} catch {
				return last;
			}
		}
		var init_benchResult = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/card.ts
		var init_card = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/character.ts
		var init_character = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/loraTypes.ts
		var init_loraTypes = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/mediaTypes.ts
		var init_mediaTypes = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/modifierFaces.ts
		var init_modifierFaces = __esmMin((() => {}));
		//#endregion
		//#region ../../../@deepseek-ai/dsh-util-values/lib/index.js
		/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
		/**
		* Mark an unreachable closed-union branch.
		* @param value - impossible value; an unhandled typed variant fails at the call site.
		* @param context - optional switch-site label included in the failure message.
		* @returns never; a runtime value that escaped its type always throws.
		*/
		function assertNever(value, context) {
			const rendered = JSON.stringify(value) ?? String(value);
			throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
		}
		var init_lib = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/modifierSubcards.ts
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
		* the catalog row seeds at compose. A finite `steps` rides verbatim —
		* the step-claiming distinction (service.ts, 007 L2) honors a row
		* that declares it; every other value drops to the catalog default. */
		function normalizeLoraEntry(entry) {
			const steps = typeof entry.steps === "number" && Number.isFinite(entry.steps) ? entry.steps : void 0;
			return {
				id: loraIdOf(entry),
				strength: typeof entry.strength === "number" ? entry.strength : 1,
				...steps !== void 0 ? { steps } : {}
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
		/** New LoRA entry from an adapter name — default strength 1.0 (the
		* LoRA stack's own default when the spec omits it). */
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
		/** The type-correct zero for a modifier field with no declared default.
		* The return union names the zeros every member yields; a 7th field
		* kind fails loud at compile through assertNever instead of returning
		* undefined through an `unknown` mask. */
		function defaultForType(type) {
			switch (type) {
				case "integer":
				case "float": return 0;
				case "boolean": return false;
				case "select": return "";
				case "image": return "";
				case "string": return "";
				default: return assertNever(type, "modifierSubcards.defaultForType");
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
			init_lib();
			NO_CN_SCHEMA = {
				type: "",
				label: ""
			};
			_cnIdCounter = 0;
		}));
		//#endregion
		//#region ../contracts/src/objectUrlCache.ts
		/** True iff `s` is a base64 data URL (large enough that streaming
		*  matters — the timeline package gates its blob handling on this).
		*  The object-URL cache this module once carried was deleted with the
		*  2026-10-21 dead-exports census: no production consumer converted
		*  through it — only the module's own spec. */
		function isDataUrl$1(s) {
			return typeof s === "string" && s.startsWith("data:") && s.length > 128;
		}
		var init_objectUrlCache = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/rootsManifest.ts
		/** §23 THE CROSS-ROOTS MANIFEST (2026-09-23): every run-resolving
		*  door (status/view/ledger/list — and, since the operator's law
		*  of the same night ("the agent maker and the user share
		*  EVERYTHING, THAT IS THE WHOLE POINT"), the ENGINE'S chained-
		*  input resolver too) searches the manifest IN ORDER — own root
		*  first (the fast path; own writes win), then the extras in
		*  their declared order. Extras are a CONFIG field (the J12
		*  conversion, 2026-10-19: the retired MELITE_STATE_ROOTS env
		*  seam was the only colon-spelling reader — roots are named in
		*  the queue/estate/engine config, never read from the process
		*  env). Dedup keeps the first occurrence (own root always
		*  leads). Pure for the walls.
		*
		*  HOSTED IN CONTRACTS (the one package every plane sees): the
		*  estate queue reads it for its run doors, the ComfyUI engine
		*  reads it when staging a chained input — the maker lane's runs
		*  resolve on the user's lane and back. One law, one spelling. */
		function rootsManifest(ownRoot, extras = []) {
			return [.../* @__PURE__ */ new Set([ownRoot, ...extras.filter((r) => r !== "")])];
		}
		/** The miss voice names every searched tree (the NAME-THE-ROOT
		*  law, extended across the manifest — a two-roots box stays
		*  debuggable on a miss, never a bare unknown). */
		function searchedVoice(roots) {
			return "(searched " + roots.join(", ") + ")";
		}
		/**
		* THE CROSS-ROOT ORDER, ONCE (the MCP/media audit's H4).
		*
		* Two readers resolve a run id across the manifest's roots and each
		* built its own list: the media list (own root first) and the gallery
		* artifact route (its own flow tree, then the manifest roots). With
		* a run id present in two trees they could disagree about which
		* bytes answer — the list serving one file while the artifact route
		* serves another for the SAME run id.
		*
		* This is the order both readers take: the caller's own tree first
		* (its own writes win), then the manifest roots in their declared
		* order, de-duplicated. `ownTree` is the caller's own CONFIGURED
		* tree and is a string at every seat — the gallery answers
		* `config.flowDir ?? DEFAULT_FLOW_DIR` — so the parameter declares no
		* null (the re-audit, 2026-10-16).
		*/
		function crossRootOrder(ownTree, roots) {
			const out = [];
			for (const tree of [ownTree, ...roots]) {
				if (tree === "") continue;
				if (!out.includes(tree)) out.push(tree);
			}
			return out;
		}
		var init_rootsManifest = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/stagePreview.ts
		var init_stagePreview = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/stageView.ts
		function recordOf(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function nonEmptyString(value) {
			return typeof value === "string" && value !== "" ? value : "";
		}
		function stringsOf(value) {
			return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry !== "") : [];
		}
		/** THE STATUS FOLD — the one owner of "what does this raw status word
		*  mean" (2026-10-13, the card-UI duplication audit: five seats folded
		*  the same words privately and disagreed — 'cached' rendered as `done`
		*  in one and a failure-looking `stopped` in another, and a stage the
		*  estate settles as 'completed' matched no branch at all in one of
		*  them). Every seat asks THIS. */
		function statusOf(value) {
			switch (value.toLowerCase()) {
				case "done":
				case "completed":
				case "succeeded":
				case "success": return "done";
				case "failed":
				case "error": return "error";
				case "stopped":
				case "interrupted":
				case "unknown": return "stopped";
				case "stopping": return "running";
				case "running":
				case "live": return "running";
				case "pending":
				case "queued":
				case "ready": return "queued";
				case "stale": return "stale";
				case "cached": return "cached";
				case "skipped": return "skipped";
				case "reused": return "reused";
				case "": return "pending";
				default: {
					const known = [...RUN_STATUS_WORDS].join(", ");
					throw new Error(`statusOf: unknown run-status word ${JSON.stringify(value)} — the vocabulary is RUN_STATUS_WORDS (${known}); add the word to the fold and the set together, never fold garbage to 'pending'`);
				}
			}
		}
		/** THE TERMINAL JUDGEMENT — the other half of the same question ("is
		*  this run finished?"), which five seats also spelled privately with
		*  DISAGREEMENT: one set treated `unknown` as terminal and `error` as
		*  live, the other the reverse, so a run in either word never stopped
		*  a poller on one plane. The estate's own vocabulary is the node
		*  truth (`RunStatus = queued|running|completed|failed|stopped|
		*  stopping`, estate-queue/src/runsTypes.ts); `error` and `unknown`
		*  additionally ride the wire (melite-run-wire documents `error` as
		*  the run record's own failure stamp; runStatusContract lists
		*  `unknown` as a schema value), so both belong on the terminal side
		*  here. */
		function isTerminalStatus(value) {
			return TERMINAL_RUN_STATUSES.has(value.toLowerCase());
		}
		function isLiveRunStatus(value) {
			return !isTerminalStatus(value) && LIVE_RUN_STATUSES.has(value.toLowerCase());
		}
		/** THE VIEW-SIDE READ (the shared seam, 2026-10-12): a projection
		*  answers "what should this row show", and a word outside the
		*  vocabulary has no answer to show — it is the no-information home,
		*  not a crash. `statusOf` above stays the strict classifier (it
		*  refuses, because a caller asking it for a classification deserves
		*  the truth); every view seat reads through THIS so the membership
		*  law lives once instead of per seat. Absence ('') folds the same
		*  way, which is why it needs no case of its own downstream. */
		function statusOrPendingOf(value) {
			return RUN_STATUS_WORDS.has(value.toLowerCase()) ? statusOf(value) : "pending";
		}
		function galleryOf(value) {
			if (!Array.isArray(value)) return void 0;
			const gallery = value.flatMap((entry) => {
				const row = recordOf(entry);
				const name = nonEmptyString(row["name"]);
				const url = nonEmptyString(row["url"]);
				return name !== "" && url !== "" ? [{
					name,
					url
				}] : [];
			});
			return gallery.length > 0 ? gallery : void 0;
		}
		function previewsOf(value) {
			if (!Array.isArray(value)) return void 0;
			const previews = value.flatMap((entry) => {
				const row = recordOf(entry);
				const label = nonEmptyString(row["label"]);
				const artifact = nonEmptyString(row["artifact"]);
				const url = row["url"] === null || typeof row["url"] === "string" ? row["url"] : null;
				return label !== "" && artifact !== "" ? [{
					label,
					url,
					artifact
				}] : [];
			});
			return previews.length > 0 ? previews : void 0;
		}
		function cardResultFromRecord(value) {
			const result = recordOf(value);
			const artifacts = {};
			for (const [name, url] of Object.entries(recordOf(result["artifacts"]))) {
				const clean = nonEmptyString(url);
				if (clean !== "") artifacts[name] = clean;
			}
			const assetUrls = stringsOf(result["assetUrls"]);
			const metadata = recordOf(result["metadata"]);
			if (Object.keys(artifacts).length === 0 && assetUrls.length === 0) return null;
			return {
				artifacts,
				assetUrls,
				metadata,
				...typeof result["durationSec"] === "number" ? { durationSec: result["durationSec"] } : {},
				...galleryOf(result["gallery"]) === void 0 ? {} : { gallery: galleryOf(result["gallery"]) },
				...previewsOf(result["motionPreviews"]) === void 0 ? {} : { motionPreviews: previewsOf(result["motionPreviews"]) }
			};
		}
		function inputBindingsOf(value) {
			const bindings = [];
			for (const [slot, raw] of Object.entries(recordOf(value))) {
				const ref = recordOf(raw);
				const stage = nonEmptyString(ref["stage"]);
				if (stage !== "") {
					const output = nonEmptyString(ref["output"]);
					bindings.push({
						slot,
						source: output === "" ? { stage } : {
							stage,
							output
						}
					});
				} else if (typeof ref["initial"] === "string") bindings.push({
					slot,
					source: { initial: true }
				});
			}
			return bindings;
		}
		function projectStageView(owner, options = {}) {
			const row = owner.row;
			const resolved = recordOf(row["resolved"]);
			const rowParams = recordOf(row["params"]);
			const params = owner.effective?.params ?? rowParams;
			const card = nonEmptyString(row["card"]) || owner.cardName;
			const kind = options.kind ?? (card || "stage");
			const service = options.service ?? (nonEmptyString(row["service"]) || kind);
			const model = nonEmptyString(owner.effective?.model) || nonEmptyString(resolved["model"]) || nonEmptyString(row["model"]) || nonEmptyString(params["model"]) || service;
			const inputSlots = (owner.effective?.inputSlots ?? []).filter((slot) => typeof slot === "string" && slot !== "");
			const inputBindings = inputBindingsOf(row["inputs"]);
			const inputs = inputBindings.flatMap((binding) => "stage" in binding.source ? [binding.source.stage] : []);
			const inputOutputs = inputBindings.map((binding) => "stage" in binding.source ? binding.source.output ?? null : null);
			const priorStageIds = owner.priorStageIds ?? owner.upstream.map((stage) => stage.id);
			const inputIndices = inputs.map((id) => priorStageIds.indexOf(id));
			const result = cardResultFromRecord(row["result"]);
			const harvested = options.result === void 0 ? result : options.result(row, result);
			const resultRecord = recordOf(row["result"]);
			const metadata = recordOf(harvested?.metadata);
			const error = nonEmptyString(row["error"]) || nonEmptyString(resultRecord["error"]) || nonEmptyString(metadata["error"]);
			const runId = owner.runId || nonEmptyString(row["runId"]) || nonEmptyString(resultRecord["runId"]) || nonEmptyString(resultRecord["run_id"]) || nonEmptyString(metadata["runId"]) || null;
			const tags = Array.isArray(row["tags"]) ? row["tags"].filter((tag) => tag === "ai_generated") : void 0;
			return {
				id: owner.stageId,
				title: nonEmptyString(row["title"]) || card || owner.stageId,
				kind,
				service,
				model,
				...options.genre === void 0 ? {} : { genre: options.genre },
				...tags === void 0 ? {} : { tags },
				params,
				...inputSlots.length === 0 ? {} : { inputSlots },
				...inputBindings.length === 0 ? {} : { inputBindings },
				inputs,
				...inputOutputs.length === 0 ? {} : { inputOutputs },
				inputIndices,
				result: harvested,
				...Array.isArray(row["history"]) ? { history: row["history"] } : {},
				status: statusOrPendingOf(owner.runStatus),
				...error === "" ? {} : { error },
				runId,
				...typeof row["saveToAssets"] === "boolean" ? { saveToAssets: row["saveToAssets"] } : {}
			};
		}
		function projectUpstreamStages(owner, options = {}) {
			return owner.upstream.map((upstream) => ({
				id: upstream.id,
				title: upstream.title,
				kind: options.kind ?? "image",
				service: options.service ?? "",
				genre: options.genre ?? "image",
				params: {},
				inputs: [],
				inputIndices: [],
				result: {
					artifacts: upstream.title === "" ? {} : { [upstream.title]: upstream.url },
					assetUrls: upstream.url === "" ? [] : [upstream.url],
					metadata: {}
				},
				status: "done"
			}));
		}
		var TERMINAL_RUN_STATUSES, LIVE_RUN_STATUSES, RUN_STATUS_WORDS;
		var init_stageView = __esmMin((() => {
			TERMINAL_RUN_STATUSES = /* @__PURE__ */ new Set([
				"completed",
				"failed",
				"stopped",
				"error",
				"unknown",
				"interrupted",
				"succeeded",
				"success"
			]);
			LIVE_RUN_STATUSES = /* @__PURE__ */ new Set([
				"running",
				"live",
				"stopping",
				"queued",
				"pending"
			]);
			RUN_STATUS_WORDS = /* @__PURE__ */ new Set([
				"done",
				"completed",
				"succeeded",
				"success",
				"failed",
				"error",
				"stopped",
				"interrupted",
				"unknown",
				"stopping",
				"running",
				"live",
				"pending",
				"queued",
				"ready",
				"stale",
				"cached",
				"skipped",
				"reused"
			]);
		}));
		//#endregion
		//#region ../contracts/src/studio.ts
		var init_studio = __esmMin((() => {}));
		//#endregion
		//#region ../contracts/src/timelineTypes.ts
		/** Coerce an unknown persisted/imported status into the SegmentStatus
		* union. Anything outside it (e.g. pre-refactor persisted "error") is
		* normalized to 'empty' — an out-of-union status silently breaks the
		* failed-state UI (the NLE clip check tests status === 'failed'). */
		function normalizeSegmentStatus(raw) {
			return typeof raw === "string" && SEGMENT_STATUSES.includes(raw) ? raw : "empty";
		}
		var SEGMENT_STATUSES, FLF_MODES, TRACK_COLORS, DEFAULT_SEGMENT_PARAMS, DEFAULT_LIPSYNC_FIELDS, EDITOR_ONLY_SEGMENT_KEYS;
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
				model: "h3",
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
			EDITOR_ONLY_SEGMENT_KEYS = /* @__PURE__ */ new Set([
				"frames",
				"fps",
				"resizeMethod",
				"motionVideoB64",
				"motionStrength",
				"motionTrimStart",
				"motionTrimEnd",
				"motionOffset",
				"resampleMode",
				"scaleBy",
				"upscaleMethod",
				"useTiledEncode",
				"tileSize",
				"tileOverlap",
				"imageAttentionStrength",
				"flfMode",
				"profile",
				"guideStrength",
				"guideCrf",
				"relayEpsilon",
				"teacacheEnabled",
				"teacacheThreshold",
				"progressiveEnabled",
				"progressiveLevels",
				"progressiveDelta",
				"progressiveMode",
				"retakePrompt",
				"retakeStartFrame",
				"retakeEndFrame",
				"loras",
				"model",
				"samplingSteps",
				"guideScale",
				"motionAmplitude"
			]);
		}));
		//#endregion
		//#region ../contracts/src/vocab.ts
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
		//#region ../contracts/src/benchStage.ts
		/** The run-media prefix a path addresses, or null when it addresses
		*  none (the caller leaves such a value verbatim — this is a rewrite,
		*  never a filter). */
		function runMediaPrefixOf(value) {
			if (value === "/melite-media/runs" || value.startsWith("/melite-media/runs/")) return RUN_MEDIA_PREFIX;
			if (value === "/v1/assets/runs" || value.startsWith("/v1/assets/runs/")) return LEGACY_RUN_MEDIA_PREFIX;
			return null;
		}
		/** THE ONE SPELLING: a run-media path in any spelling becomes the
		*  live one. Everything else — a local file, an https URL, a $spell,
		*  a run-relative name — rides verbatim. */
		function canonicalRunMediaUrl(value) {
			const prefix = runMediaPrefixOf(value);
			if (prefix === null || prefix === "/melite-media/runs") return value;
			return RUN_MEDIA_PREFIX + value.slice(prefix.length);
		}
		/** Rewrite every legacy run-media path inside a value (deep,
		*  value-preserving, total). */
		function healRunMediaPaths(value) {
			if (typeof value === "string") return canonicalRunMediaUrl(value);
			if (Array.isArray(value)) return value.map((x) => healRunMediaPaths(x));
			if (value !== null && typeof value === "object") {
				const out = {};
				for (const [k, v] of Object.entries(value)) out[k] = healRunMediaPaths(v);
				return out;
			}
			return value;
		}
		/** Strip a list of keys off a row (in place — the arm owns the row). */
		function stripKeys(row, keys) {
			for (const k of keys) delete row[k];
		}
		/** The engine a BENCH stage row declares — DERIVED when it does
		*  not say, because the bench IS the card bench: every row in it
		*  composes a card on the card plane, and a row that names another
		*  engine says so out loud (the blender/mcp rows the bench carries
		*  for previews). The run door's stricter rule — an mcp/flow stage
		*  must NAME its engine — belongs to the flow document, which is a
		*  different shape with its own gate; a bench row is not that.
		*
		*  This is the derivation that used to be written out by hand in
		*  three writers (the bench normalizer, the add-card door, the run
		*  door), which is how a GUI row and an agent row became different
		*  documents. */
		function stageEngineOf(row) {
			const own = row["engine"];
			if (typeof own === "string" && own !== "") return own;
			return CARD_PLANE_ENGINE;
		}
		/** The one normalization every writer runs. Idempotent
		*  (normalize(normalize(x)) === normalize(x)) and total (never
		*  throws): a row in, a stage row out, with every derived field
		*  derived, every run-memory field stripped, every run-media path
		*  healed, and the era's self-naming model removed.
		*
		*  `index` is the row's position — the id fallback names it, so an
		*  unaddressable row becomes addressable rather than vanishing.
		*  Run memory is NOT stripped here: that is the birth/restore arms'
		*  law (BIRTH_STRIP_KEYS), and the contract names the keys rather
		*  than guessing which arm is running.
		*/
		function normalizeBenchStage(row, index) {
			const out = row !== null && typeof row === "object" && !Array.isArray(row) ? { ...row } : {};
			if (typeof out["id"] !== "string") out["id"] = typeof index === "number" ? "s_" + String(index) : index;
			out["engine"] = stageEngineOf(out);
			const ins = out["inputs"];
			out["inputs"] = ins !== null && typeof ins === "object" && !Array.isArray(ins) ? healRunMediaPaths({ ...ins }) : {};
			const params = out["params"];
			const healed = healRunMediaPaths(params !== null && typeof params === "object" && !Array.isArray(params) ? params : {});
			const rowCard = out["card"];
			stripSelfNamedModel(rowCard, healed);
			out["params"] = healed;
			const outputs = out["outputs"];
			out["outputs"] = outputs !== null && typeof outputs === "object" && !Array.isArray(outputs) ? { ...outputs } : typeof rowCard === "string" && rowCard !== "" ? {} : { default: "image" };
			return out;
		}
		/** Normalize a bench's whole stage list — the writers' array arm.
		*  Group rows (a row with `children`) ride as they are beyond the
		*  derived fields: they carry no engine or params of their own. */
		function normalizeBenchStages(stages) {
			if (!Array.isArray(stages)) return [];
			const out = [];
			for (const [i, row] of stages.entries()) {
				const normalized = normalizeBenchStage(row, i);
				const children = normalized["children"];
				if (Array.isArray(children)) {
					delete normalized["engine"];
					const healedParams = normalized["params"];
					if (Object.keys(healedParams).length === 0) delete normalized["params"];
				}
				out.push(normalized);
			}
			return out;
		}
		/** Sanitize one candidate id onto a legal bench session key —
		* 'main' for anything the grammar refuses. THE ONE SPELLING of the
		* routing decision (the li-ay stroke, 2026-10-11): the decision
		* `SESSION_RE.test(id) ? id : 'main'` was spelled FOUR times — the
		* gallery client (bench-load.benchSessionOf), the cards tab
		* (cards-resource.benchSessionKey), and TWICE inline in the agent
		* tool — and the walls pinned each copy's grammar import while a
		* gutted routing body ('main' for everything) stayed green behind
		* the codec arms. The grammar moved to this floor for exactly this
		* reason; the DECISION over it moves beside it, and every seat
		* imports the same function. An address has one grammar and one
		* sanitize — not four. */
		function benchSessionOf(id) {
			return typeof id === "string" && SESSION_RE.test(id) ? id : "main";
		}
		/** The MINT — the inverse of benchSessionOf (2026-10-13, the card-UI
		*  duplication audit). The grammar moved to this floor and the DECISION
		*  beside it, but the mint stayed behind in six seats spelling
		*  `"bench-" + session` — one of which stripped the prefix and added
		*  it straight back. An address has one grammar, one sanitize, and now
		*  one mint. */
		function benchDraftIdOf(session) {
			return "bench-" + session;
		}
		/** The run-relative tail of an absolute artifact path, or undefined
		* when the path carries no run directory — e.g.
		* "/data/runs/output/run-4f2a1c-ab12/tts/line.flac" →
		* "run-4f2a1c-ab12/tts/line.flac". THE TAIL GRAMMAR IS RUN_ID_RE
		* (the li-ay stroke): the restore stamp's private tailOf accepted
		* ANY "run-…" segment ("run-ZZZ/x.png" previewed; run ids are minted
		* run-<hex>-<base62> and never look like that), so a path a run
		* directory could not own still minted a served artifact address.
		* One grammar for minting and one for taking the tail: the LAST
		* run-shaped segment wins (the estate nests nothing under a run
		* today; the last-wins order is the old behavior, kept). */
		function runTailOf(path) {
			const segments = path.split("/");
			let found;
			for (let i = 0; i < segments.length - 1; i++) {
				if (segments[i + 1] === "") continue;
				if (RUN_ID_RE.test(segments[i])) found = segments.slice(i).join("/");
			}
			return found;
		}
		/** THE SELF-NAMING STRIP, AS A DECISION (2026-10-11, the client-plane
		*  audit's F1). `normalizeBenchStage` applies this inline; the RESTORE
		*  arms in `packages/web/infer-gallery/src/client/bench-load.ts` used
		*  to re-implement it, and both copies drifted from the contract:
		*
		*  - one copy guarded `card !== ""` and the other did not, so a row
		*    with `card: ""` and `params: {model: ""}` kept its model under
		*    the contract and lost it under the client;
		*  - one copy compared the RAW `params.model` and the other the
		*    HEALED one;
		*  - the multi-stage arm did not call `normalizeBenchStage` at all,
		*    so it skipped the run-media path heal and the engine derivation
		*    the single-card arm got.
		*
		*  All three were invisible: making both copies strip unconditionally
		*  — the exact historical anny/h3-timeline defect — left
		*  bench-stage-contract, closure-gate and media-sidebar GREEN, because
		*  those walls pin the CONTRACT and the SET, and never drove the two
		*  client use-sites.
		*
		*  One spelling now: every site asks this, which takes the row's card
		*  and the params bag and strips in place. It is the contract's law,
		*  stated once, with the `card !== ""` guard included. */
		function stripSelfNamedModel(card, params) {
			if (typeof card !== "string" || card === "") return;
			if (typeof params !== "object" || params === null || Array.isArray(params)) return;
			const bag = params;
			if (bag["model"] !== card) return;
			if (SELF_NAMED_FAMILIES.has(card)) return;
			delete bag["model"];
		}
		var CARD_PLANE_ENGINE, RUN_MEDIA_PREFIX, LEGACY_RUN_MEDIA_PREFIX, BIRTH_STRIP_KEYS, RESTORE_STRIP_KEYS, LOAD_CARRY_KEYS, STAGE_PATCH_KEYS, WIRE_STAGE_KEYS, RESTORED_PROVENANCE_SPELLING, SESSION_RE, BENCH_DRAFT_RE, RUN_ID_RE, BENCH_DRAFT_PREFIX_RE, SELF_NAMED_FAMILIES;
		var init_benchStage = __esmMin((() => {
			CARD_PLANE_ENGINE = "comfyui";
			RUN_MEDIA_PREFIX = "/melite-media/runs";
			LEGACY_RUN_MEDIA_PREFIX = "/v1/assets/runs";
			BIRTH_STRIP_KEYS = [
				"history",
				"resultParams",
				"runStatus",
				"resolved"
			];
			RESTORE_STRIP_KEYS = [
				"result",
				"resultParams",
				"runStatus",
				"resolved",
				"history"
			];
			LOAD_CARRY_KEYS = [
				"result",
				"runStatus",
				"history",
				"resultParams"
			];
			STAGE_PATCH_KEYS = [
				"params",
				"result",
				"runStatus",
				"health",
				"inputs",
				"inputOutputs"
			];
			WIRE_STAGE_KEYS = [
				"card",
				"card_io",
				"description",
				"engine",
				"expected",
				"id",
				"inputs",
				"outputs",
				"params",
				"retries",
				"skip_when",
				"timeout_s"
			];
			RESTORED_PROVENANCE_SPELLING = "restored";
			SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
			BENCH_DRAFT_RE = /^bench-([A-Za-z0-9_-]{1,64})$/;
			RUN_ID_RE = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;
			BENCH_DRAFT_PREFIX_RE = /^bench-/;
			SELF_NAMED_FAMILIES = /* @__PURE__ */ new Set(["anny", "h3-timeline"]);
		}));
		//#endregion
		//#region ../contracts/src/index.ts
		var src_exports$1 = /* @__PURE__ */ __exportAll({
			BENCH_DRAFT_PREFIX_RE: () => BENCH_DRAFT_PREFIX_RE,
			BENCH_DRAFT_RE: () => BENCH_DRAFT_RE,
			BIRTH_STRIP_KEYS: () => BIRTH_STRIP_KEYS,
			CARD_PLANE_ENGINE: () => CARD_PLANE_ENGINE,
			DEFAULT_LIPSYNC_FIELDS: () => DEFAULT_LIPSYNC_FIELDS,
			DEFAULT_SEGMENT_PARAMS: () => DEFAULT_SEGMENT_PARAMS,
			EDITOR_ONLY_SEGMENT_KEYS: () => EDITOR_ONLY_SEGMENT_KEYS,
			EXTRA_KEYS: () => EXTRA_KEYS,
			EXTRA_KEY_SET: () => EXTRA_KEY_SET,
			FLF_MODES: () => FLF_MODES,
			LEGACY_RUN_MEDIA_PREFIX: () => LEGACY_RUN_MEDIA_PREFIX,
			LOAD_CARRY_KEYS: () => LOAD_CARRY_KEYS,
			MEDIA_SET: () => MEDIA_SET,
			NO_CN_SCHEMA: () => NO_CN_SCHEMA,
			PROVENANCE_VALUES: () => PROVENANCE_VALUES,
			Provenance: () => Provenance,
			RELATION_WORDS: () => RELATION_WORDS,
			RESTORED_PROVENANCE_SPELLING: () => RESTORED_PROVENANCE_SPELLING,
			RESTORE_STRIP_KEYS: () => RESTORE_STRIP_KEYS,
			ROLE_SET: () => ROLE_SET,
			RUN_ID_RE: () => RUN_ID_RE,
			RUN_MEDIA_PREFIX: () => RUN_MEDIA_PREFIX,
			RUN_STATUS_WORDS: () => RUN_STATUS_WORDS,
			SEGMENT_STATUSES: () => SEGMENT_STATUSES,
			SELF_NAMED_FAMILIES: () => SELF_NAMED_FAMILIES,
			SESSION_RE: () => SESSION_RE,
			STAGE_PATCH_KEYS: () => STAGE_PATCH_KEYS,
			TERMINAL_RUN_STATUSES: () => TERMINAL_RUN_STATUSES,
			TRACK_COLORS: () => TRACK_COLORS,
			WIRE_STAGE_KEYS: () => WIRE_STAGE_KEYS,
			WTYPE_SEATS: () => WTYPE_SEATS,
			WTYPE_SET: () => WTYPE_SET,
			ZONE_SET: () => ZONE_SET,
			applySubcardDrop: () => applySubcardDrop,
			artifactFileName: () => artifactFileName,
			bag: () => bag,
			benchDraftIdOf: () => benchDraftIdOf,
			benchResultDefects: () => benchResultDefects,
			benchSessionOf: () => benchSessionOf,
			canonicalRunMediaUrl: () => canonicalRunMediaUrl,
			cardResultFromRecord: () => cardResultFromRecord,
			cnEntriesOf: () => cnEntriesOf,
			crossRootOrder: () => crossRootOrder,
			extraOf: () => extraOf,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			isDataUrl: () => isDataUrl$1,
			isLiveRunStatus: () => isLiveRunStatus,
			isProvenance: () => isProvenance,
			isPurelyUnstatedRequiredVoice: () => isPurelyUnstatedRequiredVoice,
			isTerminalStatus: () => isTerminalStatus,
			isUnstatedRequiredVoice: () => isUnstatedRequiredVoice,
			judgeLaneBounds: () => judgeLaneBounds,
			judgeLaneRelations: () => judgeLaneRelations,
			judgeLaneSurface: () => judgeLaneSurface,
			judgeSamplerEnvelope: () => judgeSamplerEnvelope,
			kindForId: () => kindForId,
			kindSpecOf: () => kindSpecOf,
			laneBlank: () => laneBlank,
			laneBoundsOf: () => laneBoundsOf,
			laneContractOf: () => laneContractOf,
			laneContractsFor: () => laneContractsFor,
			laneStaleCarry: () => laneStaleCarry,
			laneSurfaceOf: () => laneSurfaceOf,
			loraAdaptersOf: () => loraAdaptersOf,
			loraIdOf: () => loraIdOf,
			loraLabel: () => loraLabel,
			loraStrengthBoundsOf: () => loraStrengthBoundsOf,
			modifiersFeatureOf: () => modifiersFeatureOf,
			moveItem: () => moveItem,
			newControlnetEntry: () => newControlnetEntry,
			newGenericEntry: () => newGenericEntry,
			newLoraEntry: () => newLoraEntry,
			normalizeBenchStage: () => normalizeBenchStage,
			normalizeBenchStages: () => normalizeBenchStages,
			normalizeLoraEntry: () => normalizeLoraEntry,
			normalizeSegmentStatus: () => normalizeSegmentStatus,
			projectStageView: () => projectStageView,
			projectUpstreamStages: () => projectUpstreamStages,
			rootsManifest: () => rootsManifest,
			runMediaPrefixOf: () => runMediaPrefixOf,
			runTailOf: () => runTailOf,
			samplerEnvelopeCure: () => samplerEnvelopeCure,
			searchedVoice: () => searchedVoice,
			stageEngineOf: () => stageEngineOf,
			statusOf: () => statusOf,
			statusOrPendingOf: () => statusOrPendingOf,
			stripKeys: () => stripKeys,
			stripSelfNamedModel: () => stripSelfNamedModel,
			subcardCount: () => subcardCount,
			subcardId: () => subcardId,
			subcardsFromParams: () => subcardsFromParams,
			unknownQuantVoice: () => unknownQuantVoice,
			unknownVariantVoice: () => unknownVariantVoice
		});
		var init_src$1 = __esmMin((() => {
			init_extraKeys();
			init_laneRelations();
			init_FlowTypes();
			init_benchResult();
			init_card();
			init_character();
			init_loraTypes();
			init_mediaTypes();
			init_modifierFaces();
			init_modifierSubcards();
			init_objectUrlCache();
			init_rootsManifest();
			init_stagePreview();
			init_stageView();
			init_studio();
			init_timelineTypes();
			init_vocab();
			init_benchStage();
		}));
		//#endregion
		//#region src/store/timelineIds.ts
		init_src$1();
		let _nextId = 1;
		function uid() {
			return `seg_${_nextId++}_${Date.now().toString(36)}`;
		}
		let _nextVariantId = 1;
		function variantUid() {
			return `var_${_nextVariantId++}_${Date.now().toString(36)}`;
		}
		const MAX_VARIANTS_PER_SEGMENT = 4;
		/**
		* Bump the `uid` counter past every loaded `seg_<n>_` id so fresh ids
		* never collide with restored ones. Called by `initialize`; the loop is
		* a verbatim move from the store root (the counter lives in this module).
		*/
		function syncUidCounter(allIds) {
			for (const id of allIds) {
				const numMatch = id.match(/^seg_(\d+)_/);
				if (numMatch) {
					const num = parseInt(numMatch[1], 10);
					if (num >= _nextId) _nextId = num + 1;
				}
			}
		}
		//#endregion
		//#region ../catalog/src/sleep.ts
		/**
		* sleep.ts — ONE delay for the package (the hand-roll audit's 7.9).
		*
		* Four clones across this package's own sources carried three
		* different contracts: an abortable sleep that rejects with an
		* `AbortError` (api.ts's retry backoff), a plain delay
		* (text-to-pose's poll), and two inline `new Promise(r =>
		* setTimeout(r, ms))` waits (FlowProtocol's poll ticks). They are one
		* function with an optional signal: a caller with no signal gets the
		* plain delay, a caller with one gets the abort that clears the timer.
		*
		* Why this is a local module and not the DSH timer seat: this package
		* is a browser client (no `Context`), and `ctx.timeout` is fiber-owned
		* by the Cordis plugin. The cross-package fold the row names is
		* unavailable to every one of these sites for that reason alone; what
		* IS available is one implementation per package, which is this.
		* @module @melite/catalog/sleep
		*/
		/**
		* Await `ms` milliseconds; an `AbortSignal` clears the timer and
		* rejects with a DOM `AbortError`, the spelling the retry path
		* already catches.
		* @param ms - delay in milliseconds.
		* @param signal - optional cancellation; an already-aborted signal rejects without waiting.
		* @returns resolves after the delay, rejects on abort.
		*/
		function sleep(ms, signal) {
			return new Promise((resolve, reject) => {
				if (signal?.aborted === true) {
					reject(new DOMException("Aborted", "AbortError"));
					return;
				}
				const timer = setTimeout(() => {
					signal?.removeEventListener("abort", onAbort);
					resolve();
				}, ms);
				const onAbort = () => {
					clearTimeout(timer);
					reject(new DOMException("Aborted", "AbortError"));
				};
				signal?.addEventListener("abort", onAbort, { once: true });
			});
		}
		var init_sleep = __esmMin((() => {}));
		//#endregion
		//#region ../catalog/src/api.ts
		/** The named escape for non-table URLs. Every use is deliberate and
		* greppable. */
		function externalUrl(u) {
			return u;
		}
		function shouldRetryStatus(status, method) {
			return GATEWAY_CODES.has(status) || SAFE_METHODS.has(method) && status >= 500 && status < 600;
		}
		function getBackendState() {
			return backendStore.getState().state;
		}
		/** Subscribe to backend liveness changes. Returns an unsubscribe fn. */
		function onBackendState(cb) {
			return backendStore.subscribe((next) => {
				cb(next.state);
			});
		}
		function setState(next) {
			if (next === backendStore.getState().state) return;
			backendStore.setState({ state: next });
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
				if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
						const bridge = () => ctrl.abort();
						callerSignal?.addEventListener("abort", bridge, { once: true });
						let res;
						try {
							res = await fetch(input, {
								...init,
								signal: ctrl.signal
							});
						} finally {
							callerSignal?.removeEventListener("abort", bridge);
						}
						if (shouldRetryStatus(res.status, method) && attempt < MAX_RETRIES && Date.now() < deadline) {
							if (backend) setState("degraded");
							await sleep(backoffMs(attempt), callerSignal);
							continue;
						}
						if (backend) {
							consecutiveFail = 0;
							setState("online");
						}
						return res;
					} catch (err) {
						if (err instanceof DOMException && err.name === "AbortError") throw err;
						lastErr = err;
						if (backend) {
							consecutiveFail++;
							setState(consecutiveFail >= OFFLINE_THRESHOLD ? "offline" : "degraded");
						}
						if (attempt < MAX_RETRIES && Date.now() < deadline) {
							const backSig = init.signal;
							await sleep(backoffMs(attempt), backSig);
						}
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
		var MAX_RETRIES, BASE_MS, CAP_MS, OFFLINE_THRESHOLD, TOTAL_BUDGET_MS, SAFE_METHODS, GATEWAY_CODES, backendStore, consecutiveFail, inflight;
		var init_api = __esmMin((() => {
			init_sleep();
			init_clientStore();
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
			backendStore = createClientStore({ state: "online" });
			consecutiveFail = 0;
			inflight = /* @__PURE__ */ new Map();
		}));
		//#endregion
		//#region ../catalog/src/contractToast.ts
		/**
		* Wire the toast pusher the contract stores report through.
		* @param toast - the row's addToast (browser), a test recorder, or
		*                null to unwire (face teardown / HMR reload).
		*/
		function setContractToastSink(toast) {
			sink = toast;
		}
		/**
		* Fire one contract toast through the wired sink.
		* @param type - toast severity.
		* @param message - the operator-facing text.
		* @param action - optional Retry-style button.
		* @throws when no sink is wired — an unwired verdict must surface,
		*          not vanish.
		*/
		function contractToast(type, message, action) {
			if (sink === null) throw new Error("contract toast sink unset — call setContractToastSink() from the owning client face before reporting");
			sink(type, message, action);
		}
		var sink;
		var init_contractToast = __esmMin((() => {
			sink = null;
		}));
		//#endregion
		//#region ../catalog/src/catalogContract.ts
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
				const hasRoute = isObj$1(resolved) && isNonEmptyString(resolved.family) && isNonEmptyString(resolved.model);
				if (!(Array.isArray(entry.families) && entry.families.length === 0) && !hasRoute && !isNonEmptyString(declaredFam)) missing.push("default_family or resolved route");
				if (!Array.isArray(entry.families)) missing.push("families");
				else if (entry.families.some((f) => !isNonEmptyString(f))) missing.push("families (non-string entries)");
				else if (entry.families.length === 0 && (isNonEmptyString(declaredFam) || hasRoute)) missing.push("families (routed but empty — the default points at no family)");
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
		//#region ../catalog/src/modelCatalog.ts
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
		/** Subscribe to catalog readiness. Called when the catalog transitions from
		* null → populated. Returns an unsubscribe fn. R-S10 (2026-10-22): the
		* guard honors the doc — background TTL refreshes (setState with a new
		* catalog) re-fire nothing; only the null → populated transition fires. */
		function onCatalogReady(fn) {
			return catalogStore.subscribe((next, prev) => {
				if (!prev.catalog && next.catalog) fn();
			});
		}
		/** True after the catalog has been successfully loaded at least once. */
		function isCatalogLoaded() {
			return catalogStore.getState().loaded;
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
			_cacheTime = Date.now();
			catalogStore.setState({
				catalog,
				loaded: true
			});
			return catalog;
		}
		async function loadCatalog(opts) {
			const cached = catalogStore.getState().catalog;
			if (cached && !opts?.force) {
				if (Date.now() - _cacheTime > _CACHE_TTL_MS && !_inflight$2) _inflight$2 = (async () => {
					try {
						_ingest(await apiJson("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
						else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore.getState().catalog;
				})().finally(() => {
					_inflight$2 = null;
				});
				return cached;
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
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog() {
			if (catalogStore.getState().loaded) return;
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
			return catalogStore.getState().catalog;
		}
		/** Seed the cache with pre-fetched data (test utility — production code uses
		* loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
		* a fake catalog without going to the network. */
		function primeCatalog(data) {
			catalogStore.setState({
				catalog: data,
				loaded: true
			});
		}
		/**
		* For route keys that are NOT top-level catalog entries (e.g. a quant-tier
		* sibling that only appears as a variant route on its parent), find the
		* parent model that owns the route via its ``variants:`` block.
		*/
		function parentModelForRoute(routeKey, cat) {
			for (const [key, spec] of Object.entries(cat.models)) if ((spec.variants ?? []).some((v) => v.route === routeKey)) return key;
		}
		function familyOf(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.family;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].family : void 0;
		}
		function studioOf(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.studio ?? void 0;
		}
		/**
		* The catalog-declared FORM for a route key (the model's ``form`` — the
		* same id _FORM_CONFIGS keys by on the backend). Resolves variants to
		* their parent model like familyOf. The tag routes the model's
		* editor surface (the FORM LAW: a model without a form cannot route
		* or render). The 2026-09-18 retirement: the retired per-form alias
		* tables are gone — forms no longer reshape slot keys.
		*/
		function formOf(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.form;
			if (own) return own;
			const parent = parentModelForRoute(routeKey, cat);
			return parent ? cat.models[parent].form : void 0;
		}
		function familyLabel(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey;
			return cat.families?.[fam]?.label ?? routeKey;
		}
		/**
		* The family-declared media genre for a route key. Resolves model routes
		* AND raw family ids (``detect``) — the catalog passthrough
		* emits ``genre:`` verbatim. Non-catalog services (trellis, kimodo, yaml
		* brick families) return undefined → callers fall back to their generic
		* badge. The schema-driven replacement for engine-name substring
		* classifiers.
		*/
		function familyGenre(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			return narrowGenre((fam ? cat.families?.[fam]?.genre : void 0) ?? cat.families?.[routeKey]?.genre);
		}
		/**
		* The source-media types a family declares it ingests (FamilyEntry.accepts,
		* a closed literal on the backend). Returns the declared list, or
		* [] when the family declares none / is unknown.
		*
		* THE READER TODAY, STATED HONESTLY (the accepts-consumer audit,
		* 2026-10-10): this gate is SERVED (catalogEmission puts the DECL's
		* accepts on the /v1/model-catalog families block) and READ here,
		* but the promised last-mile consumer — a canvas drop handler
		* spawning an input card only for accepted media types — does not
		* exist in this checkout (the drop surface targets card slots via
		* the shared ASSET_DRAG_MIME contract, never spawns). The DECL's
		* truth is not a lie; the old comment's consumer was. The wiring
		* is owed work on the ROADMAP (canvas drop-spawn), and this
		* reader is the gate it will call — never a free-coded
		* isImageFile prefix check. (authored 2026-08-09; corrected
		* 2026-10-10)
		*/
		function familyAccepts(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function familyTransformMatrix(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		* last_frame] for ltx) —
		* schema-driven input-wiring labels (no engine-name classifiers).
		*/
		/**
		* The compact card's declared size line (FamilyEntry.card_summary, a
		* validated block on the backend). Returns {width_param, height_param}
		* for generation families (rendered "WxH") OR {size_param, size_suffix} for
		* the Enhance / upscale families (rendered as a single value), or null when
		* the family declares no size line / is unknown. The CardTile reads whichever
		* is declared — no free-coded per-family dimension logic in the view.
		* (2026-08-09; size_param added 2026-08-10.)
		*/
		function familyCardSummary(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.card_summary ?? null;
		}
		function familyConditioning(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.video?.conditioning ?? void 0;
		}
		/**
		* The family's declared optional outputs (Option A — the optional-outputs
		* vocabulary). Empty/undefined when the family declares none (legacy
		* single-output compat). Consumers render one editor per entry, keyed by
		* ``genre`` — the input card no longer declares any (mask removed
		* 2026-08-14), so this is the vocabulary for OTHER families that do.
		*/
		function familyOptionalOutputs(familyId, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return cat.families?.[familyId]?.optional_outputs ?? [];
		}
		/**
		* The catalog-declared Canvas default model route — the model whose entry
		* carries ``canvas_default: true`` (krea-2). Replaces the hardcoded
		* CANVAS_DEFAULT_MODEL; returns undefined before the catalog loads (the
		* caller keeps its own pre-catalog bootstrap value).
		*/
		function canvasDefaultModel(cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return Object.entries(cat.models).find(([, m]) => m.canvas_default)?.[0];
		}
		/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
		function variantLabel(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function familiesForForm(formTag, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function familyPrimaryRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey;
			const declared = cat.families[fam]?.default_model;
			if (declared && cat.models[declared]?.family === fam) return declared;
			const members = Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
			return members.find((k) => k === fam) ?? members[0];
		}
		function modelLabel(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models[routeKey];
			if (!m) return routeKey;
			return m.label ?? cat.families[m.family]?.label ?? routeKey;
		}
		/** Description for a model route, or undefined. Callers provide their own
		* fallback string — this returns `undefined` so `??` works. Reads the
		* `description:` declared on the model's family in the catalog YAML. */
		function modelDescription(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.description ?? void 0;
		}
		function dropdownModels(formTag, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function variantSiblings(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return routeKey ? [routeKey] : [];
			return Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
		}
		/**
		* Models hidden from the dropdown because they're reachable only via a
		* variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
		*/
		function hiddenFromDropdown(cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return new Set(Object.entries(cat.models).filter(([, m]) => m.hide_from_dropdown).map(([k]) => k));
		}
		/**
		* The ``variants:`` list for a model — resolves through the parent if the
		* route key is a quant-tier sibling (e.g. z-image-q5 inherits z-image's
		* variants). Returns ``[]`` for models without variants.
		*/
		function variantsForRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function presetsForRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const own = cat.models[routeKey]?.presets;
			return own && typeof own === "object" && Object.keys(own).length > 0 ? own : void 0;
		}
		/**
		* Find the variant whose route matches ``routeKey`` — used to highlight the
		* active toggle when the form is hydrated from saved state.
		*/
		function activeVariantForRoute(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function routeCoordinates(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		* preserved). The vocabulary is closed to Variant/Quant (the
		* canonical variant-group law, 2026-08-09 — "Speed" was a duplicate name for
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
		function composeVariantRoute(currentRoute, clicked, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function axisCellExists(currentRoute, clicked, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
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
		function familyHasVariantAxis(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			const groups = fam ? cat.families?.[fam]?.variant_groups : void 0;
			return !!groups && "Variant" in groups;
		}
		var CARD_GENRES, catalogStore, _cacheTime, _CACHE_TTL_MS, _inflight$2, _bgRetryTimer;
		var init_modelCatalog = __esmMin((() => {
			init_api();
			init_catalogContract();
			init_catalogContractStore();
			init_clientStore();
			CARD_GENRES = [
				"image",
				"video",
				"audio",
				"3d",
				"motion",
				"other",
				"text"
			];
			catalogStore = createClientStore({
				catalog: null,
				loaded: false
			});
			_cacheTime = 0;
			_CACHE_TTL_MS = 3e4;
			_inflight$2 = null;
			_bgRetryTimer = null;
			/* v8 ignore next -- module warm-load runs only in browser builds
			* (Vite sets MODE to exactly "development"/"production"); under vitest
			* MODE is "test", and under a plain-Node import (the release probe)
			* import.meta.env is undefined — both arms never reach the load, so
			* no fetch fires and no retry timer keeps the process alive
			* (2026-09-12). */
			if ({}.env?.MODE === "development" || {}.env?.MODE === "production") ensureCatalog();
		}));
		//#endregion
		//#region ../catalog/src/catalogContractStore.ts
		/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
		*  outage that produced it, so the operator should also see WHEN it fired.
		*  24h local time, seconds resolution. */
		function _stamp() {
			return (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false });
		}
		/** Sink-safe toast for the STORE report paths (audit R-S4, 2026-10-22):
		*  `contractToast` stays loud for direct callers — an unwired sink must
		*  surface — but the outcome paths themselves must never throw through
		*  their result. At cold boot the module-warm ensureCatalog can race the
		*  entry face that wires the sink; an unwired reportOk used to throw
		*  BEFORE catalogStore.setState — a healthy load rejected and every
		*  retry re-failed. The toast is lost + logged here; the record stands.
		*/
		function _reportToast(type, message, action) {
			try {
				contractToast(type, message, action);
			} catch (err) {
				console.error("[catalogContract] toast not delivered (sink unwired):", message, err);
			}
		}
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		*  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		*  (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog() {
			Promise.resolve().then(() => (init_modelCatalog(), modelCatalog_exports)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch((err) => {
				console.error("[catalogContract] retryCatalog failed:", err);
			});
		}
		var IDLE, _lastToastedOutage, useCatalogContractStore;
		var init_catalogContractStore = __esmMin((() => {
			init_clientStore();
			init_contractToast();
			IDLE = {
				state: "idle",
				violations: [],
				error: null
			};
			_lastToastedOutage = null;
			useCatalogContractStore = createClientStore((set, get) => ({
				record: IDLE,
				reportOk: () => {
					const wasOutage = get().record.state === "error";
					_lastToastedOutage = null;
					set({ record: {
						state: "loaded",
						violations: [],
						error: null
					} });
					if (wasOutage) _reportToast("info", `Catalog back online (at ${_stamp()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp()}):`, violations);
					set({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					_reportToast("error", `Catalog contract violation — ${first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape"} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog
					});
				},
				reportError: (message) => {
					const clean = message.trim();
					console.error(`[catalogContract] catalog fetch failed (at ${_stamp()}):`, clean);
					set({ record: {
						state: "error",
						violations: [],
						error: clean
					} });
					if (clean === _lastToastedOutage) return;
					_lastToastedOutage = clean;
					_reportToast("error", `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog
					});
				},
				clear: () => {
					_lastToastedOutage = null;
					set({ record: IDLE });
				}
			}));
		}));
		//#endregion
		//#region ../catalog/src/runStatusContract.ts
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
		//#region ../catalog/src/runStatusContractStore.ts
		/** Re-poll the run — the toast's Retry action. Recovered → clear; still
		*  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		*  whole protocol layer; the store only needs it on click. */
		function repoll(runId) {
			if (repollInFlight.has(runId)) return;
			repollInFlight.add(runId);
			Promise.resolve().then(() => (init_FlowProtocol(), FlowProtocol_exports)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore.getState().clear()).catch((err) => {
				console.error("[runStatusContract] repoll failed:", runId, err);
			}).finally(() => {
				repollInFlight.delete(runId);
			});
		}
		function toastVerdict(v) {
			const toast = contractToast;
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
		var repollInFlight, useRunStatusContractStore;
		var init_runStatusContractStore = __esmMin((() => {
			init_clientStore();
			init_contractToast();
			repollInFlight = /* @__PURE__ */ new Set();
			useRunStatusContractStore = createClientStore((set) => ({
				verdict: null,
				reportViolation: (runId, violations) => {
					console.error("[runStatusContract] status channel violation:", runId, violations);
					const verdict = {
						kind: "violation",
						runId,
						violations
					};
					set({ verdict });
					toastVerdict(verdict);
				},
				reportError: (runId, message) => {
					console.error("[runStatusContract] status channel error:", runId, message);
					const verdict = {
						kind: "error",
						runId,
						message
					};
					set({ verdict });
					toastVerdict(verdict);
				},
				clear: () => set({ verdict: null })
			}));
		}));
		//#endregion
		//#region ../catalog/src/familyParamContract.ts
		var familyParamContract_exports = /* @__PURE__ */ __exportAll({
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema,
			coerceParamsToSchema: () => coerceParamsToSchema,
			getFamilySchema: () => getFamilySchema,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated,
			loadFamilySchemas: () => loadFamilySchemas,
			validateModifierEntries: () => validateModifierEntries,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema
		});
		/** Ingest gate (audit R-S7, 2026-10-22): a 200 body is a schema index
		*  only when every value carries a `properties` record — an error
		*  envelope or a proxy's JSON non-index must never reach _cache. This
		*  mirrors modelCatalog._ingest (validate before caching), which this
		*  loader mirrors in every other respect. */
		function isValidSchemaIndex(data) {
			if (typeof data !== "object" || data === null) return false;
			for (const v of Object.values(data)) if (typeof v !== "object" || v === null || typeof v.properties !== "object" || v.properties === null) return false;
			return true;
		}
		/**
		* Load ALL family param schemas in ONE fetch. Mirrors loadCatalog: module-
		* level cache, inflight dedup, idempotent. Call at boot (alongside
		* loadCatalog) so the validator never blocks on a fetch.
		*
		* Returns the cached index on subsequent calls (no refetch). Use
		* { force: true } to bypass the cache.
		*/
		async function loadFamilySchemas(opts) {
			if (_cache && !opts?.force) return _cache;
			if (_inflight$1) return _inflight$1;
			_inflight$1 = (async () => {
				try {
					const data = await apiJson("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache = data;
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
			if (!_cache) return null;
			return _cache[familyId] ?? null;
		}
		/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
		* family)? Distinguishes "transmission worked and the family is absent"
		* (a phantom family — throw) from the cache-cold/failed branch (defer). */
		function isFamilySchemaCachePopulated() {
			return !!_cache && Object.keys(_cache).length > 0;
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
		* validateModifierEntries (this file) is the owner: per declared kind with a
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
		var _cache, _inflight$1, WIRE_RELAXED_KEYS, EDITOR_MOD_ENTRY_KEYS;
		var init_familyParamContract = __esmMin((() => {
			init_api();
			_cache = null;
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
		//#region ../catalog/src/cardBirth.ts
		var cardBirth_exports = /* @__PURE__ */ __exportAll({
			composeCard: () => composeCard,
			ensureDraftId: () => ensureDraftId
		});
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs). */
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
		//#region ../catalog/src/FlowProtocol.ts
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
					await sleep(intervalMs, signal);
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
				try {
					opts?.onTick?.(data);
				} catch (err) {
					console.error("[flow-protocol] onTick callback failed (poll continues):", err);
				}
				await sleep(intervalMs, signal);
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
				const { normalizeLoraEntry } = await Promise.resolve().then(() => (init_src$1(), src_exports$1));
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
				try {
					opts?.onStart?.(runId);
				} catch (err) {
					console.error("[flow-protocol] onStart callback failed (run continues):", err);
				}
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
			init_sleep();
			NON_JSON_BODY_CAP = 2e3;
			_requiredEmptyResolver = null;
		}));
		//#endregion
		//#region ../catalog/src/tagMap.ts
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
		* store's own TagDocument validator; the server enforces the same rules
		* on PUT, but we don't trust the wire even from our own server
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
			retryTagSyncAfterFault();
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
		async function initTagSync() {
			if (serverSyncEnabled) return;
			if (typeof fetch === "undefined") return;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] initTagSync got ${res.status} (not offline) — pushes deferred, will retry on next mutation`);
					_retrySyncOnNextMutation = true;
					return;
				}
				const doc = validateDocument(await res.json());
				useTagMap.setState({
					tags: doc.tags,
					map: doc.map
				});
				serverSyncEnabled = true;
			} catch {}
		}
		/** R-S9: called from the mutation path — retries the server sync exactly
		*  once after a transient boot fault, so the session's pushes resume
		*  without waiting for a reload. Server-canonical wholesale replace is
		*  NOT taken here (local edits may be newer); the debounced PUT after
		*  the next mutation reconciles the server copy. */
		async function retryTagSyncAfterFault() {
			if (serverSyncEnabled || !_retrySyncOnNextMutation) return;
			_retrySyncOnNextMutation = false;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] retryTagSync still ${res.status} — pushes stay off this session`);
					return;
				}
				serverSyncEnabled = true;
				const { tags, map } = useTagMap.getState();
				scheduleSync({
					tags,
					map
				});
			} catch {}
		}
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf(key) {
			return useTagMap.getState().map[key] ?? [];
		}
		var TagColor, TAG_COLOR_VALUES, TAG_COLOR_META, STORAGE_KEY, SYNC_DEBOUNCE_MS, serverSyncEnabled, syncTimer, _retrySyncOnNextMutation, initial, tagMapActions, useTagMap;
		var init_tagMap = __esmMin((() => {
			init_clientStore();
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
			_retrySyncOnNextMutation = false;
			initial = loadPersisted();
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
			useTagMap = createClientStore((set, get) => ({
				...tagMapActions(set, get),
				tags: initial.tags,
				map: initial.map
			}));
		}));
		//#endregion
		//#region ../catalog/src/serviceForms.ts
		async function loadForms(opts) {
			if (Object.keys(formsStore.getState().cache).length > 0 && !opts?.force) return formsStore.getState().cache;
			if (_inflight) return _inflight;
			_inflight = (async () => {
				try {
					const res = await apiFetch("/v1/forms");
					if (!res.ok) {
						console.warn("[serviceForms] /v1/forms failed:", res.status);
						return formsStore.getState().cache;
					}
					const forms = (await res.json())?.forms;
					if (typeof forms !== "object" || forms === null || Array.isArray(forms)) {
						console.warn("[serviceForms] /v1/forms 200 with malformed body — keeping cache");
						return formsStore.getState().cache;
					}
					formsStore.setState({ cache: forms });
					return formsStore.getState().cache;
				} catch (e) {
					console.warn("[serviceForms] fetch error:", e);
					return formsStore.getState().cache;
				} finally {
					_inflight = null;
				}
			})();
			return _inflight;
		}
		function getCachedForms() {
			return formsStore.getState().cache;
		}
		function subscribeForms(fn) {
			return formsStore.subscribe(() => {
				fn();
			});
		}
		/**
		* Reverse-lookup: given a sidebar_key (the value the rest of the app calls
		* `selectedService`), return the form-tag it belongs to. This is THE
		* primitive that drives every render decision in GenerateFormBody.
		*/
		function formForSidebarKey(sidebarKey, forms = formsStore.getState().cache) {
			for (const [formTag, entry] of Object.entries(forms)) if (entry.sidebar_key === sidebarKey) return formTag;
		}
		/**
		* Check whether the given sidebar_key belongs to the given form-tag.
		* Internal — the convenience predicates below are the public API.
		*/
		function isForm(sidebarKey, formTag, forms = formsStore.getState().cache) {
			return forms[formTag]?.sidebar_key === sidebarKey;
		}
		/** True if the sidebar_key belongs to ANY of the given form-tags. */
		function isInAnyForm(sidebarKey, formTags, forms = formsStore.getState().cache) {
			return formTags.some((t) => isForm(sidebarKey, t, forms));
		}
		/**
		* True if the sidebar_key belongs to any audio-genre form-tag.
		* (form_tts, form_voice, form_voice_studio, form_music, form_sound)
		*/
		function isAudioForm(sidebarKey, forms = formsStore.getState().cache) {
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
		var formsStore, _inflight, isTtsForm, isVoiceForm, isVoiceStudioForm, isMusicForm, isGenerateForm, isEditForm;
		var init_serviceForms = __esmMin((() => {
			init_api();
			init_clientStore();
			formsStore = createClientStore({ cache: {} });
			_inflight = null;
			isTtsForm = (k) => isForm(k, "form_tts");
			isVoiceForm = (k) => isForm(k, "form_voice");
			isVoiceStudioForm = (k) => isForm(k, "form_voice_studio");
			isMusicForm = (k) => isForm(k, "form_music");
			isGenerateForm = (k) => isForm(k, "form_generate");
			isEditForm = (k) => isForm(k, "form_edit");
		}));
		//#endregion
		//#region ../catalog/src/waveform-peaks.ts
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
			if (peaks.length === 0) return Array.from({ length: targetWidth }, () => ({
				min: 0,
				max: 0
			}));
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
				const src = peaks[Math.min(peaks.length - 1, Math.floor(i * peaks.length / targetWidth))];
				out[i] = {
					min: src.min,
					max: src.max
				};
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
			} catch (e) {
				console.error("[waveform-peaks] decodeAudioPeaks failed — falling back to the placeholder:", e);
				return null;
			} finally {
				if (ctx) Promise.resolve(ctx.close()).catch((e) => {
					console.error("[waveform-peaks] AudioContext close failed:", e);
				});
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
		//#region ../catalog/src/enhance.ts
		/**
		* The card's model picker source (2026-09-06): the LIVE route list
		* off the proof route — never a restated copy. Null when this
		* editor is NOT under a DSH host (no picker renders).
		*/
		async function fetchEnhanceRoutes(signal) {
			let res;
			try {
				res = await apiFetch(externalUrl("/melite-tools/catalog"), {
					method: "GET",
					signal
				});
			} catch (e) {
				console.error("[enhance] fetchEnhanceRoutes fetch failed (picker hidden):", e);
				return null;
			}
			if (!res.ok) {
				console.error(`[enhance] fetchEnhanceRoutes non-ok ${res.status} (picker hidden)`);
				return null;
			}
			try {
				const data = await res.json();
				if (!Array.isArray(data.llmRoutes)) {
					console.error("[enhance] fetchEnhanceRoutes body carried no llmRoutes array (picker hidden)");
					return null;
				}
				const routes = data.llmRoutes.filter((r) => typeof r === "string" && r.length > 0);
				return routes.length > 0 ? routes : null;
			} catch (e) {
				console.error("[enhance] fetchEnhanceRoutes body parse failed (picker hidden):", e);
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
		async function enhanceViaHarness(systemPrompt, prompt, llm, signal) {
			let res;
			try {
				res = await apiFetch(externalUrl("/melite-tools/enhance"), {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					signal,
					body: JSON.stringify({
						system_prompt: systemPrompt,
						prompt,
						...llm !== void 0 && llm.length > 0 ? { llm } : {}
					})
				});
			} catch (e) {
				console.error("[enhance] enhance fetch failed (folding to the no-door verdict):", e);
				return null;
			}
			const text = await res.text();
			let data;
			try {
				data = JSON.parse(text);
			} catch {
				console.error(`[enhance] enhance answered non-JSON (status ${res.status}, body ${text.slice(0, 120)})`);
				if (!res.ok && isEmbedded()) {
					const err = /* @__PURE__ */ new Error(`Enhancement unavailable right now (the app host answered ${res.status} with a non-JSON body — likely transient; retry)`);
					err.name = "EnhanceTransientError";
					throw err;
				}
				return null;
			}
			if (typeof data.error === "string" && data.error.length > 0) throw new Error(`Enhancement failed (${res.status}): ${data.error.slice(0, 200)}`);
			if (!res.ok) {
				console.error(`[enhance] enhance answered JSON but not-ok ${res.status} with no error field`);
				if (isEmbedded()) {
					const err = /* @__PURE__ */ new Error(`Enhancement unavailable right now (the app host answered ${res.status}; likely transient — retry)`);
					err.name = "EnhanceTransientError";
					throw err;
				}
				return null;
			}
			const positive = String(data.positive ?? "").trim();
			const negative = String(data.negative ?? "").trim();
			if (!positive) {
				console.error(`[enhance] enhance answered ok but carried no positive prompt (via ${typeof data.via === "string" ? data.via : "?"})`);
				return null;
			}
			return {
				positive,
				negative,
				via: typeof data.via === "string" && data.via.length > 0 ? data.via : "?"
			};
		}
		async function enhancePrompt(systemPrompt, prompt, llm, signal) {
			const harnessed = await enhanceViaHarness(systemPrompt, prompt, llm, signal);
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
		async function agentEnhance(model, prompt, temperature, llm, signal) {
			const res = await apiFetch(externalUrl("/melite-tools/enhance"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal,
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
		//#region ../catalog/src/cardLlm.ts
		/** Read the preferred card LLM route ("provider/model"), if set. */
		function getCardLlm() {
			try {
				const v = window.localStorage.getItem(CARD_LLM_KEY);
				return typeof v === "string" && v.length > 0 ? v : null;
			} catch {
				return null;
			}
		}
		/** Set (or clear, with null) the preferred card LLM route. */
		function setCardLlm(route) {
			try {
				if (route === null || route.length === 0) window.localStorage.removeItem(CARD_LLM_KEY);
				else window.localStorage.setItem(CARD_LLM_KEY, route);
			} catch {}
		}
		/**
		* The `llm` argument shape the enhance wire takes: undefined when
		* unset (Auto — the server resolves its preference chain).
		*/
		function cardLlmArg() {
			return getCardLlm() ?? void 0;
		}
		var CARD_LLM_KEY;
		var init_cardLlm = __esmMin((() => {
			CARD_LLM_KEY = "melite:card-llm:v1";
		}));
		//#endregion
		//#region ../catalog/src/familyProvenance.ts
		/** Fold runs into per-family provenance. Only runs that CARRY an
		*  artifact count (the fold's done family: done, cached, reused —
		*  the estate settles success as "completed", which the old raw
		*  `!== "done"` compare never matched, so every real run's
		*  provenance read "never"). Running / interrupted / stopped runs
		*  haven't produced anything yet. Runs with no families field
		*  (pre-provenance sidecars) or a family-less brick contribute
		*  nothing (backward compatible by construction). */
		function familyProvenance(runs) {
			const out = {};
			for (const run of runs) {
				const folded = statusOrPendingOf(run.status ?? "");
				if (folded !== "done" && folded !== "cached" && folded !== "reused") continue;
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
		var init_familyProvenance = __esmMin((() => {
			init_stageView();
		}));
		//#endregion
		//#region ../catalog/src/index.ts
		var src_exports = /* @__PURE__ */ __exportAll({
			CARD_LLM_KEY: () => CARD_LLM_KEY,
			CatalogContractError: () => CatalogContractError,
			LOD_BUCKETS: () => LOD_BUCKETS,
			LOD_ORDER: () => LOD_ORDER,
			RUN_STATUSES: () => RUN_STATUSES,
			RunStatusContractError: () => RunStatusContractError,
			TAG_COLOR_META: () => TAG_COLOR_META,
			TAG_COLOR_VALUES: () => TAG_COLOR_VALUES,
			TagColor: () => TagColor,
			activeVariantForRoute: () => activeVariantForRoute,
			agentEnhance: () => agentEnhance,
			apiFetch: () => apiFetch,
			apiJson: () => apiJson,
			assertNoParamDrops: () => assertNoParamDrops,
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema,
			axisCellExists: () => axisCellExists,
			canvasDefaultModel: () => canvasDefaultModel,
			cardLlmArg: () => cardLlmArg,
			coerceParamsToSchema: () => coerceParamsToSchema,
			collectNamedArtifacts: () => collectNamedArtifacts,
			collectStageUrls: () => collectStageUrls,
			composeCard: () => composeCard,
			composeVariantRoute: () => composeVariantRoute,
			computeMinMaxPeaks: () => computeMinMaxPeaks,
			computeWaveformLODs: () => computeWaveformLODs,
			contractToast: () => contractToast,
			controlnetTypesOf: () => controlnetTypesOf,
			decodeAudioPeaks: () => decodeAudioPeaks,
			describeErrorBody: () => describeErrorBody,
			dropdownModels: () => dropdownModels,
			enhancePrompt: () => enhancePrompt,
			ensureCatalog: () => ensureCatalog,
			ensureDraftId: () => ensureDraftId,
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
			fetchEnhanceRoutes: () => fetchEnhanceRoutes,
			formForSidebarKey: () => formForSidebarKey,
			formOf: () => formOf,
			formSidebarItems: () => formSidebarItems,
			formatLastRun: () => formatLastRun,
			getBackendState: () => getBackendState,
			getCachedCatalog: () => getCachedCatalog,
			getCachedForms: () => getCachedForms,
			getCardLlm: () => getCardLlm,
			getFamilySchema: () => getFamilySchema,
			getPeaksForWidth: () => getPeaksForWidth,
			hasViolationsSignature: () => hasViolationsSignature,
			hiddenFromDropdown: () => hiddenFromDropdown,
			initTagSync: () => initTagSync,
			isAudioForm: () => isAudioForm,
			isCatalogLoaded: () => isCatalogLoaded,
			isEditForm: () => isEditForm,
			isEmbedded: () => isEmbedded,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated,
			isGenerateForm: () => isGenerateForm,
			isMusicForm: () => isMusicForm,
			isTagColor: () => isTagColor,
			isTtsForm: () => isTtsForm,
			isVoiceForm: () => isVoiceForm,
			isVoiceStudioForm: () => isVoiceStudioForm,
			loadCatalog: () => loadCatalog,
			loadFamilySchemas: () => loadFamilySchemas,
			loadForms: () => loadForms,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			narrowGenre: () => narrowGenre,
			onBackendState: () => onBackendState,
			onCatalogReady: () => onCatalogReady,
			parsePickerAria: () => parsePickerAria,
			pollFlowRun: () => pollFlowRun,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			readPickerModel: () => readPickerModel,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
			retryTagSyncAfterFault: () => retryTagSyncAfterFault,
			routeCoordinates: () => routeCoordinates,
			runCompiledGeneration: () => runCompiledGeneration,
			sanitizeRevivedResult: () => sanitizeRevivedResult,
			selectLOD: () => selectLOD,
			setCardLlm: () => setCardLlm,
			setContractToastSink: () => setContractToastSink,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver,
			studioOf: () => studioOf,
			subscribeForms: () => subscribeForms,
			tagsOf: () => tagsOf,
			useCatalogContractStore: () => useCatalogContractStore,
			useRunStatusContractStore: () => useRunStatusContractStore,
			useTagMap: () => useTagMap,
			validateCatalogContract: () => validateCatalogContract,
			validateModifierEntries: () => validateModifierEntries,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema,
			validateRunStatusContract: () => validateRunStatusContract,
			variantLabel: () => variantLabel,
			variantSiblings: () => variantSiblings,
			variantsForRoute: () => variantsForRoute
		});
		var init_src = __esmMin((() => {
			init_api();
			init_contractToast();
			init_catalogContract();
			init_catalogContractStore();
			init_modelCatalog();
			init_FlowProtocol();
			init_familyParamContract();
			init_tagMap();
			init_runStatusContractStore();
			init_runStatusContract();
			init_serviceForms();
			init_waveform_peaks();
			init_cardBirth();
			init_enhance();
			init_cardLlm();
			init_familyProvenance();
		}));
		//#endregion
		//#region src/store/timelineBlobs.ts
		init_src();
		/**
		* store/timelineBlobs — IndexedDB blob storage + blob-ref helpers (split
		* from timelineStore.ts; pure move, no logic changes).
		*/
		const TL_DB_NAME = "TechNoirTimelineDB";
		const TL_STORE = "blobs";
		let tlDbPromise = null;
		function getTLDB() {
			if (tlDbPromise) return tlDbPromise;
			tlDbPromise = new Promise((resolve, reject) => {
				const req = indexedDB.open(TL_DB_NAME, 1);
				req.onerror = () => {
					tlDbPromise = null;
					reject(req.error);
				};
				req.onsuccess = () => resolve(req.result);
				req.onupgradeneeded = (ev) => {
					const db = ev.target.result;
					if (!db.objectStoreNames.contains("blobs")) db.createObjectStore(TL_STORE);
				};
			});
			return tlDbPromise;
		}
		async function tlSave(key, value) {
			const tx = (await getTLDB()).transaction(TL_STORE, "readwrite");
			tx.objectStore(TL_STORE).put(value, key);
			await new Promise((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
			});
		}
		async function tlLoad(key) {
			try {
				const req = (await getTLDB()).transaction(TL_STORE, "readonly").objectStore(TL_STORE).get(key);
				return new Promise((res, rej) => {
					req.onsuccess = () => res(req.result || null);
					req.onerror = () => rej(req.error);
				});
			} catch (e) {
				console.error("[timeline] tlLoad failed (IndexedDB):", e);
				return null;
			}
		}
		async function _tlDelete(key) {
			const tx = (await getTLDB()).transaction(TL_STORE, "readwrite");
			tx.objectStore(TL_STORE).delete(key);
			await new Promise((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
			});
		}
		async function tlClearAll() {
			const tx = (await getTLDB()).transaction(TL_STORE, "readwrite");
			tx.objectStore(TL_STORE).clear();
			await new Promise((res, rej) => {
				tx.oncomplete = () => res();
				tx.onerror = () => rej(tx.error);
			});
		}
		const BLOB_FIELDS = [
			"videoUrl",
			"firstFrameB64",
			"lastFrameB64",
			"thumbnailUrl"
		];
		function isDataUrl(val) {
			return typeof val === "string" && val.startsWith("data:");
		}
		const BLOB_PREFIX = "TLB:";
		function blobKey(segId, field) {
			return `${BLOB_PREFIX}${segId}_${field}`;
		}
		function isBlobRef(val) {
			return typeof val === "string" && val.startsWith("TLB:");
		}
		//#endregion
		//#region src/store/timelinePersistence.ts
		async function persistTimeline(segments, audioCues, audioTracks, relayVideoUrl, relaySegmentIds, relayAssetId, globalConsistencyAnchor) {
			try {
				const blobSaves = [];
				const strippedSegments = segments.map((seg) => {
					const clone = {
						...seg,
						params: { ...seg.params }
					};
					for (const field of BLOB_FIELDS) {
						const val = clone[field];
						if (isDataUrl(val)) {
							const key = blobKey(seg.id, field);
							blobSaves.push(tlSave(key, val));
							clone[field] = key;
						}
					}
					if (isDataUrl(clone.controlVideoUrl)) {
						const key = blobKey(seg.id, "controlVideoUrl");
						blobSaves.push(tlSave(key, clone.controlVideoUrl));
						clone.controlVideoUrl = key;
					}
					if (Array.isArray(clone.variants) && clone.variants.length > 0) clone.variants = clone.variants.map((v) => {
						const vclone = { ...v };
						if (isDataUrl(vclone.videoUrl)) {
							const key = `${BLOB_PREFIX}var_${vclone.id}_videoUrl`;
							blobSaves.push(tlSave(key, vclone.videoUrl));
							vclone.videoUrl = key;
						}
						if (isDataUrl(vclone.thumbnailUrl)) {
							const key = `${BLOB_PREFIX}var_${vclone.id}_thumbnailUrl`;
							blobSaves.push(tlSave(key, vclone.thumbnailUrl));
							vclone.thumbnailUrl = key;
						}
						return vclone;
					});
					return clone;
				});
				const strippedCues = audioCues.map((cue) => {
					const clone = { ...cue };
					if (isDataUrl(clone.audioUrl)) {
						const key = `${BLOB_PREFIX}cue_${cue.id}_audioUrl`;
						blobSaves.push(tlSave(key, clone.audioUrl));
						clone.audioUrl = key;
					}
					if (isDataUrl(clone.audioB64)) {
						const key = `${BLOB_PREFIX}cue_${cue.id}_audioB64`;
						blobSaves.push(tlSave(key, clone.audioB64));
						clone.audioB64 = key;
					}
					return clone;
				});
				let relayBlobKey = null;
				if (isDataUrl(relayVideoUrl)) {
					relayBlobKey = `${BLOB_PREFIX}relay_video`;
					blobSaves.push(tlSave(relayBlobKey, relayVideoUrl));
				}
				let anchorBlobKey = null;
				let anchorMeta = null;
				if (globalConsistencyAnchor && isDataUrl(globalConsistencyAnchor.b64)) {
					anchorBlobKey = `${BLOB_PREFIX}anchor_global`;
					blobSaves.push(tlSave(anchorBlobKey, globalConsistencyAnchor.b64));
					anchorMeta = {
						assetId: globalConsistencyAnchor.assetId,
						b64: anchorBlobKey
					};
				} else anchorMeta = globalConsistencyAnchor;
				try {
					await Promise.all(blobSaves);
				} catch (err) {
					console.error("[Timeline] Failed to save blobs to IndexedDB — metadata NOT advanced (previous consistent state kept):", err);
					return;
				}
				const metadata = {
					segments: strippedSegments,
					audioCues: strippedCues,
					audioTracks,
					relayVideoUrl: relayBlobKey || relayVideoUrl,
					relaySegmentIds,
					relayAssetId,
					globalConsistencyAnchor: anchorMeta
				};
				localStorage.setItem("tech_noir_timeline", JSON.stringify(metadata));
				console.log("[Timeline] Persisted", segments.length, "segments,", audioCues.length, "cues,", blobSaves.length, "blobs");
			} catch (e) {
				console.error("[Timeline] Failed to persist:", e);
			}
		}
		async function loadPersistedTimeline() {
			try {
				const raw = localStorage.getItem("tech_noir_timeline");
				if (!raw) return null;
				const quarantine = (why, payload) => {
					console.warn(`[Timeline] Persisted payload not loadable (${why}) — quarantined under tech_noir_timeline.corrupt-<ts>; booting empty`);
					try {
						localStorage.setItem(`tech_noir_timeline.corrupt-${Date.now()}`, payload);
					} catch (e) {
						console.error("[Timeline] Quarantine write failed (payload lost):", e);
					}
				};
				const meta = JSON.parse(raw);
				if (!meta.segments || !Array.isArray(meta.segments)) {
					quarantine(meta.segments === void 0 ? "no segments array" : "segments not an array", raw);
					return null;
				}
				const segments = [];
				for (const seg of meta.segments) {
					const clone = {
						...seg,
						params: { ...seg.params }
					};
					clone.status = normalizeSegmentStatus(clone.status);
					for (const field of BLOB_FIELDS) {
						const val = clone[field];
						if (isBlobRef(val)) clone[field] = await tlLoad(val);
					}
					if (isBlobRef(clone.controlVideoUrl)) clone.controlVideoUrl = await tlLoad(clone.controlVideoUrl);
					if (Array.isArray(clone.variants) && clone.variants.length > 0) clone.variants = await Promise.all(clone.variants.map(async (v) => {
						const vclone = { ...v };
						if (isBlobRef(vclone.videoUrl)) vclone.videoUrl = await tlLoad(vclone.videoUrl);
						if (isBlobRef(vclone.thumbnailUrl)) vclone.thumbnailUrl = await tlLoad(vclone.thumbnailUrl);
						return vclone;
					}));
					for (const k of [
						"guidePhases",
						"epsilon",
						"denoisingStrength",
						"inputVideoStrength",
						"spatialUpscale",
						"perturbationSwitch",
						"perturbationLayers",
						"perturbationStartPerc",
						"perturbationEndPerc",
						"cameraPanX",
						"cameraPanY",
						"cameraZoom",
						"distilledMode",
						"distilledLoraStrength",
						"apgSwitch",
						"cfgStarSwitch",
						"nagScale",
						"nagTau",
						"nagAlpha",
						"altGuideScale",
						"altScale",
						"audioGuideScale",
						"audioCfgScale",
						"sampleSolver",
						"selfRefinerSetting",
						"selfRefinerPlan",
						"selfRefinerFUncertainty",
						"selfRefinerCertainPercentage",
						"videoPromptType",
						"maskingStrength",
						"maskingSource",
						"audioPromptType",
						"outpaintingEnabled",
						"slidingWindow",
						"slidingWindowSize",
						"slidingWindowOverlap",
						"enhancePrompt",
						"defaultProfile"
					]) delete clone.params[k];
					const D = DEFAULT_SEGMENT_PARAMS;
					if (typeof clone.params.profile !== "string") clone.params.profile = D.profile;
					if (typeof clone.params.motionAmplitude !== "number") clone.params.motionAmplitude = D.motionAmplitude;
					if (typeof clone.params.flfMode !== "boolean") clone.params.flfMode = D.flfMode;
					if (typeof clone.params.resizeMethod !== "string") clone.params.resizeMethod = D.resizeMethod;
					if (!Array.isArray(clone.params.loras)) clone.params.loras = D.loras;
					if (typeof clone.params.samplingSteps !== "number") clone.params.samplingSteps = D.samplingSteps;
					if (typeof clone.params.guideScale !== "number") clone.params.guideScale = D.guideScale;
					if (typeof clone.params.teacacheEnabled !== "boolean") clone.params.teacacheEnabled = D.teacacheEnabled;
					if (typeof clone.params.teacacheThreshold !== "number") clone.params.teacacheThreshold = D.teacacheThreshold;
					if (typeof clone.params.progressiveEnabled !== "boolean") clone.params.progressiveEnabled = D.progressiveEnabled;
					if (typeof clone.params.progressiveLevels !== "number") clone.params.progressiveLevels = D.progressiveLevels;
					if (typeof clone.params.progressiveDelta !== "number") clone.params.progressiveDelta = D.progressiveDelta;
					if (clone.params.progressiveMode !== "dct" && clone.params.progressiveMode !== "dct_rewind") clone.params.progressiveMode = D.progressiveMode;
					const _cat = getCachedCatalog();
					if (_cat && (typeof clone.params.model !== "string" || !_cat.models || !_cat.models[clone.params.model])) clone.params.model = D.model;
					if (typeof clone.lipSyncedVideoUrl !== "string" && clone.lipSyncedVideoUrl !== null) clone.lipSyncedVideoUrl = null;
					if (typeof clone.lipSyncPreferOriginal !== "boolean") clone.lipSyncPreferOriginal = false;
					if (!Array.isArray(clone.promptBeats)) clone.promptBeats = [];
					if (!Array.isArray(clone.keyframes)) clone.keyframes = [];
					if (typeof clone.params.relayEpsilon !== "number" || isNaN(clone.params.relayEpsilon)) clone.params.relayEpsilon = .01;
					if (typeof clone.params.guideStrength !== "number" || isNaN(clone.params.guideStrength)) clone.params.guideStrength = 1;
					if (typeof clone.params.guideCrf !== "number" || isNaN(clone.params.guideCrf)) clone.params.guideCrf = 0;
					segments.push(clone);
				}
				const audioCues = [];
				for (const cue of meta.audioCues || []) {
					const clone = { ...cue };
					if (isBlobRef(clone.audioUrl)) clone.audioUrl = await tlLoad(clone.audioUrl);
					if (isBlobRef(clone.audioB64)) clone.audioB64 = await tlLoad(clone.audioB64);
					audioCues.push(clone);
				}
				let relayVideoUrl = meta.relayVideoUrl || null;
				if (isBlobRef(relayVideoUrl)) relayVideoUrl = await tlLoad(relayVideoUrl);
				console.log("[Timeline] Loaded", segments.length, "segments,", audioCues.length, "cues from localStorage + IndexedDB");
				return {
					segments,
					audioCues,
					audioTracks: meta.audioTracks || [],
					relayVideoUrl,
					relaySegmentIds: meta.relaySegmentIds || [],
					relayAssetId: meta.relayAssetId || null,
					globalConsistencyAnchor: await (async () => {
						const a = meta.globalConsistencyAnchor;
						if (!a) return null;
						if (isBlobRef(a.b64)) {
							const b64 = await tlLoad(a.b64);
							return {
								assetId: a.assetId,
								b64
							};
						}
						return {
							assetId: a.assetId,
							b64: a.b64
						};
					})()
				};
			} catch (e) {
				console.error("[Timeline] Failed to load persisted state:", e);
				try {
					const raw2 = localStorage.getItem("tech_noir_timeline");
					if (raw2) localStorage.setItem(`tech_noir_timeline.corrupt-${Date.now()}`, raw2);
				} catch {}
				return null;
			}
		}
		let _persistTimer = null;
		let _pendingPersist = null;
		let _persistRunCount = 0;
		function _bumpPersistRunCount() {
			_persistRunCount++;
		}
		function schedulePersist(state) {
			_pendingPersist = [
				state.segments,
				state.audioCues,
				state.audioTracks,
				state.relayVideoUrl,
				state.relaySegmentIds,
				state.relayAssetId,
				state.globalConsistencyAnchor
			];
			if (_persistTimer !== null) clearTimeout(_persistTimer);
			_persistTimer = setTimeout(() => {
				_persistTimer = null;
				/* v8 ignore next -- _pendingPersist is always set when the timer is armed (2026-09-12) */
				if (_pendingPersist) {
					const args = _pendingPersist;
					_pendingPersist = null;
					persistTimeline(...args).then(() => _bumpPersistRunCount());
				}
			}, 300);
		}
		/** Flush any pending debounced persistence immediately. Returns the
		*  in-flight persistence promise (or a resolved promise if nothing pending). */
		function flushPersist() {
			if (_persistTimer !== null) {
				clearTimeout(_persistTimer);
				_persistTimer = null;
			}
			if (_pendingPersist) {
				const args = _pendingPersist;
				_pendingPersist = null;
				return persistTimeline(...args).then(() => _bumpPersistRunCount());
			}
			return Promise.resolve();
		}
		if (typeof window !== "undefined") window.addEventListener("beforeunload", () => {
			flushPersist();
		});
		//#endregion
		//#region src/store/timelineAudio.ts
		init_src$1();
		function createAudioSlice(set, get) {
			return {
				setTrackMuted: (trackId, muted) => {
					set((s) => ({ audioTracks: s.audioTracks.map((t) => t.id === trackId ? {
						...t,
						muted
					} : t) }));
					schedulePersist(get());
				},
				setTrackSolo: (trackId, solo) => {
					set((s) => ({ audioTracks: s.audioTracks.map((t) => t.id === trackId ? {
						...t,
						solo
					} : t) }));
					schedulePersist(get());
				},
				addAudioTrack: (label) => {
					const idx = get().audioTracks.length;
					const color = TRACK_COLORS[idx % TRACK_COLORS.length];
					const track = {
						id: uid(),
						label: label || `Audio ${idx + 1}`,
						color,
						height: 48
					};
					set((s) => ({ audioTracks: [...s.audioTracks, track] }));
					schedulePersist(get());
					return track;
				},
				removeAudioTrack: (id) => {
					set((s) => ({
						audioTracks: s.audioTracks.filter((t) => t.id !== id),
						audioCues: s.audioCues.filter((c) => c.track !== id),
						selectedAudioCueId: s.selectedAudioCueId && s.audioCues.find((c) => c.id === s.selectedAudioCueId)?.track === id ? null : s.selectedAudioCueId
					}));
					schedulePersist(get());
				},
				addAudioCue: (cue) => {
					const full = {
						...cue,
						id: uid()
					};
					set((s) => ({ audioCues: [...s.audioCues, full] }));
					schedulePersist(get());
					return full;
				},
				removeAudioCue: (id) => {
					set((s) => ({
						audioCues: s.audioCues.filter((c) => c.id !== id),
						selectedAudioCueId: s.selectedAudioCueId === id ? null : s.selectedAudioCueId
					}));
					schedulePersist(get());
				},
				updateAudioCue: (id, patch) => {
					if (!get().audioCues.some((c) => c.id === id)) return;
					set((s) => ({ audioCues: s.audioCues.map((c) => c.id === id ? {
						...c,
						...patch
					} : c) }));
					schedulePersist(get());
				},
				setRelayVideo: (url, segmentIds, assetId) => {
					set({
						relayVideoUrl: url,
						relaySegmentIds: segmentIds,
						relayAssetId: assetId
					});
					schedulePersist(get());
				},
				setGlobalConsistencyAnchor: (anchor) => {
					set({ globalConsistencyAnchor: anchor });
					schedulePersist(get());
				},
				getEffectiveConsistencyAnchor: (segId) => {
					const s = get();
					const seg = s.segments.find((x) => x.id === segId);
					if (seg?.consistencyAnchor) return seg.consistencyAnchor;
					return s.globalConsistencyAnchor;
				}
			};
		}
		//#endregion
		//#region src/store/timelineHistory.ts
		const _history = [];
		let _historyIdx = -1;
		function pushHistory(segments, audioCues) {
			_history.splice(_historyIdx + 1);
			_history.push({
				segments: segments.map((s) => ({
					...s,
					params: { ...s.params }
				})),
				audioCues: audioCues.map((c) => ({ ...c }))
			});
			if (_history.length > 50) _history.shift();
			_historyIdx = _history.length - 1;
		}
		/**
		* Undo/redo actions. They live here (with the stack they mutate) and are
		* composed into the store by timelineStore.ts. Bodies are verbatim moves.
		*/
		function createHistorySlice(set, get) {
			return {
				undo: () => {
					if (_historyIdx <= 0) return;
					_historyIdx--;
					const snap = _history[_historyIdx];
					/* v8 ignore next -- snap always defined inside the history bounds (2026-09-12) */
					if (snap) {
						set({
							segments: snap.segments,
							audioCues: snap.audioCues
						});
						schedulePersist(get());
					}
				},
				redo: () => {
					if (_historyIdx >= _history.length - 1) return;
					_historyIdx++;
					const snap = _history[_historyIdx];
					/* v8 ignore next -- snap always defined inside the history bounds (2026-09-12) */
					if (snap) {
						set({
							segments: snap.segments,
							audioCues: snap.audioCues
						});
						schedulePersist(get());
					}
				}
			};
		}
		//#endregion
		//#region src/store/timelineSegments.ts
		init_src$1();
		function createSegmentSlice(set, get) {
			return {
				initialize: async () => {
					if (get().initialized) return;
					const loaded = await loadPersistedTimeline();
					if (loaded) {
						syncUidCounter([
							...loaded.segments.map((s) => s.id),
							...loaded.audioCues.map((c) => c.id),
							...loaded.audioTracks.map((t) => t.id)
						]);
						const totalDuration = loaded.segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
						set({
							segments: loaded.segments,
							audioCues: loaded.audioCues,
							audioTracks: loaded.audioTracks,
							relayVideoUrl: loaded.relayVideoUrl,
							relaySegmentIds: loaded.relaySegmentIds,
							relayAssetId: loaded.relayAssetId,
							globalConsistencyAnchor: loaded.globalConsistencyAnchor,
							playback: {
								isPlaying: false,
								currentTime: 0,
								totalDuration,
								loopRegion: false
							},
							initialized: true
						});
						pushHistory(loaded.segments, loaded.audioCues);
					} else set({ initialized: true });
				},
				addSegment: (partial) => {
					const order = get().segments.length;
					const seg = {
						id: uid(),
						order,
						start: order * 5,
						duration: 5,
						prompt: "",
						negativePrompt: "",
						thumbnailUrl: null,
						videoUrl: null,
						firstFrameB64: null,
						lastFrameB64: null,
						params: { ...DEFAULT_SEGMENT_PARAMS },
						trimStart: 0,
						sourceStepId: null,
						status: "empty",
						error: null,
						controlVideoUrl: null,
						lipSyncedVideoUrl: null,
						lipSyncPreferOriginal: false,
						promptBeats: [],
						keyframes: [],
						...partial
					};
					set((s) => {
						const segments = [...s.segments, seg];
						const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
						pushHistory(segments, s.audioCues);
						return {
							segments,
							playback: {
								...s.playback,
								totalDuration
							}
						};
					});
					schedulePersist(get());
					return seg;
				},
				removeSegment: (id) => {
					set((s) => {
						if (s.segments.find((seg) => seg.id === id)?.locked) return {};
						const segments = s.segments.filter((seg) => seg.id !== id).map((seg, i) => ({
							...seg,
							order: i
						}));
						pushHistory(segments, s.audioCues);
						const relayActive = s.relaySegmentIds.includes(id);
						const nextSelectedIds = new Set(s.selectedSegmentIds);
						nextSelectedIds.delete(id);
						return {
							segments,
							selectedSegmentId: s.selectedSegmentId === id ? null : s.selectedSegmentId,
							selectedSegmentIds: nextSelectedIds,
							...relayActive ? {
								relayVideoUrl: null,
								relaySegmentIds: []
							} : {}
						};
					});
					schedulePersist(get());
				},
				updateSegment: (id, patch) => {
					set((s) => {
						const segments = s.segments.map((seg) => seg.id === id ? {
							...seg,
							...patch
						} : seg);
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
				},
				reorderSegments: (orderedIds) => {
					set((s) => {
						const map = new Map(s.segments.map((seg) => [seg.id, seg]));
						let cursor = 0;
						const segments = orderedIds.map((id, i) => {
							const seg = map.get(id);
							if (!seg) return null;
							const newSeg = {
								...seg,
								order: i,
								start: cursor
							};
							cursor += seg.duration;
							return newSeg;
						}).filter(Boolean);
						const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
						pushHistory(segments, s.audioCues);
						return {
							segments,
							playback: {
								...s.playback,
								totalDuration
							}
						};
					});
					schedulePersist(get());
				},
				toggleSegmentLock: (id) => {
					let newLock = false;
					set((s) => {
						const segments = s.segments.map((seg) => {
							if (seg.id !== id) return seg;
							newLock = !seg.locked;
							return {
								...seg,
								locked: newLock
							};
						});
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
					return newLock;
				},
				groupSelectedSegments: () => {
					const s = get();
					if (Array.from(s.selectedSegmentIds).length < 2) return null;
					const gid = `grp_${Date.now().toString(36)}`;
					set((s) => {
						const segments = s.segments.map((seg) => s.selectedSegmentIds.has(seg.id) ? {
							...seg,
							groupId: gid
						} : seg);
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
					return gid;
				},
				ungroupSegments: (groupId) => {
					set((s) => {
						const segments = s.segments.map((seg) => seg.groupId === groupId ? {
							...seg,
							groupId: null
						} : seg);
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
				},
				splitSegmentAtPlayhead: () => {
					const state = get();
					const playhead = state.playback.currentTime;
					const seg = state.segments.find((s) => playhead >= s.start && playhead < s.start + s.duration);
					if (!seg) return;
					const splitOffset = playhead - seg.start;
					const segFrames = seg.params.frames;
					const segFps = seg.params.fps;
					if (splitOffset < .1 || splitOffset > seg.duration - .1) return;
					const splitFrame = Math.round(splitOffset * segFps);
					const firstFrames = Math.max(1, splitFrame);
					const secondFrames = Math.max(1, segFrames - splitFrame);
					const partitionTimeBased = (items) => {
						return [items.filter((i) => i.time < splitOffset), items.filter((i) => i.time >= splitOffset).map((i) => ({
							...i,
							time: i.time - splitOffset
						}))];
					};
					const [beatsBefore, beatsAfter] = partitionTimeBased(seg.promptBeats ?? []);
					const [kfsBefore, kfsAfter] = partitionTimeBased(seg.keyframes ?? []);
					const firstHalf = {
						...seg,
						params: {
							...seg.params,
							frames: firstFrames
						},
						duration: firstFrames / segFps,
						promptBeats: beatsBefore,
						keyframes: kfsBefore,
						videoUrl: null,
						thumbnailUrl: null,
						status: "empty",
						error: null
					};
					const secondHalf = {
						...seg,
						id: uid(),
						order: seg.order + 1,
						start: seg.start + splitOffset,
						duration: secondFrames / segFps,
						params: {
							...seg.params,
							frames: secondFrames,
							seed: seg.params.seed + 1
						},
						promptBeats: beatsAfter,
						keyframes: kfsAfter,
						videoUrl: null,
						thumbnailUrl: null,
						assetId: void 0,
						status: "empty",
						error: null
					};
					set((s) => {
						const segments = [
							...s.segments.slice(0, seg.order),
							firstHalf,
							secondHalf,
							...s.segments.slice(seg.order + 1).map((seg, _i) => ({
								...seg,
								order: seg.order + 1
							}))
						];
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
				},
				rippleDelete: (id) => {
					set((s) => {
						const target = s.segments.find((seg) => seg.id === id);
						if (!target || target.locked) return {};
						const targetEnd = target.start + target.duration;
						const shift = target.duration;
						const next = s.segments.filter((seg) => seg.id !== id).map((seg) => {
							if (seg.start >= targetEnd) return {
								...seg,
								start: Math.max(0, seg.start - shift)
							};
							return seg;
						}).map((seg, i) => ({
							...seg,
							order: i
						}));
						pushHistory(next, s.audioCues);
						const nextSelectedIds = new Set(s.selectedSegmentIds);
						nextSelectedIds.delete(id);
						const relayActive = s.relaySegmentIds.includes(id);
						return {
							segments: next,
							selectedSegmentId: s.selectedSegmentId === id ? null : s.selectedSegmentId,
							selectedSegmentIds: nextSelectedIds,
							...relayActive ? {
								relayVideoUrl: null,
								relaySegmentIds: []
							} : {}
						};
					});
					schedulePersist(get());
				},
				rollEdit: (leftId, rightId, deltaSeconds) => {
					set((s) => {
						const left = s.segments.find((seg) => seg.id === leftId);
						const right = s.segments.find((seg) => seg.id === rightId);
						if (!left || !right || left.locked || right.locked) return {};
						const leftEnd = left.start + left.duration;
						if (Math.abs(leftEnd - right.start) > .001) return {};
						const minDuration = .5;
						const maxGrow = right.duration - minDuration;
						const maxShrink = left.duration - minDuration;
						const clampedDelta = Math.max(-maxShrink, Math.min(maxGrow, deltaSeconds));
						if (clampedDelta === 0) return {};
						const next = s.segments.map((seg) => {
							if (seg.id === leftId) return {
								...seg,
								duration: seg.duration + clampedDelta
							};
							if (seg.id === rightId) return {
								...seg,
								start: seg.start + clampedDelta,
								duration: seg.duration - clampedDelta
							};
							return seg;
						});
						pushHistory(next, s.audioCues);
						return { segments: next };
					});
					schedulePersist(get());
				},
				exportTimeline: () => {
					const state = get();
					const data = {
						version: 1,
						exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
						segments: state.segments,
						audioCues: state.audioCues,
						audioTracks: state.audioTracks
					};
					return JSON.stringify(data, null, 2);
				},
				importTimeline: (json) => {
					try {
						const data = JSON.parse(json);
						if (!data || !Array.isArray(data.segments)) return false;
						set((s) => {
							const segments = data.segments.map((seg, i) => ({
								...seg,
								order: i,
								status: normalizeSegmentStatus(seg.status)
							}));
							const audioCues = Array.isArray(data.audioCues) ? data.audioCues : [];
							const audioTracks = Array.isArray(data.audioTracks) && data.audioTracks.length > 0 ? data.audioTracks : s.audioTracks;
							const totalDuration = segments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
							pushHistory(segments, audioCues);
							return {
								segments,
								audioCues,
								audioTracks,
								selectedSegmentId: null,
								selectedSegmentIds: /* @__PURE__ */ new Set(),
								storyboardStatusFilter: null,
								inOutPoints: null,
								playback: {
									...s.playback,
									totalDuration,
									currentTime: 0,
									isPlaying: false
								}
							};
						});
						schedulePersist(get());
						return true;
					} catch (e) {
						console.error("[timeline] importTimeline failed:", e);
						return false;
					}
				},
				duplicateWithOffset: (sourceId, count) => {
					if (count <= 0) return [];
					const src = get().segments.find((s) => s.id === sourceId);
					if (!src) return [];
					const copies = [];
					for (let i = 1; i <= count; i++) copies.push({
						...src,
						id: uid(),
						params: {
							...src.params,
							seed: src.params.seed + i
						},
						videoUrl: null,
						lipSyncedVideoUrl: null,
						thumbnailUrl: null,
						assetId: void 0,
						status: "empty",
						error: null,
						variants: [],
						locked: false,
						groupId: null
					});
					set((s) => {
						const idx = s.segments.findIndex((seg) => seg.id === sourceId);
						/* v8 ignore next -- idx always >= 0: sync get-then-set, no interleave (2026-09-12) */
						if (idx < 0) return {};
						const before = s.segments.slice(0, idx + 1);
						const after = s.segments.slice(idx + 1);
						const totalInsertedDuration = copies.reduce((t, c) => t + c.duration, 0);
						const shiftedAfter = after.map((seg) => ({
							...seg,
							start: seg.start + totalInsertedDuration
						}));
						let cursor = src.start + src.duration;
						const orderedCopies = copies.map((c, i) => {
							const copy = {
								...c,
								order: idx + 1 + i,
								start: cursor
							};
							cursor += c.duration;
							return copy;
						});
						const finalSegments = [
							...before.map((seg, i) => ({
								...seg,
								order: i
							})),
							...orderedCopies,
							...shiftedAfter.map((seg, i) => ({
								...seg,
								order: before.length + orderedCopies.length + i
							}))
						];
						const totalDuration = finalSegments.reduce((t, seg) => Math.max(t, seg.start + seg.duration), 0);
						pushHistory(finalSegments, s.audioCues);
						return {
							segments: finalSegments,
							playback: {
								...s.playback,
								totalDuration
							}
						};
					});
					schedulePersist(get());
					const ids = new Set(copies.map((c) => c.id));
					return get().segments.filter((s) => ids.has(s.id)).sort((x, y) => x.order - y.order);
				}
			};
		}
		//#endregion
		//#region src/store/segmentClipboard.ts
		let _clipboard = null;
		/**
		* Snapshot the segment's params + prompt + negativePrompt into the
		* module-level clipboard. Returns the snapshot (a defensive copy of
		* the params object — later mutations to the source segment do NOT
		* leak into the clipboard). Public for unit tests.
		*/
		function copySegmentParams(seg) {
			const snapshot = {
				params: { ...seg.params },
				prompt: seg.prompt,
				negativePrompt: seg.negativePrompt,
				sourceId: seg.id,
				copiedAt: Date.now()
			};
			_clipboard = snapshot;
			return snapshot;
		}
		/**
		* Returns a FRESH patch derived from the clipboard — params + prompt +
		* negativePrompt, ready to spread into `updateSegment(id, patch)`.
		* Returns `null` when the clipboard is empty (nothing copied yet).
		*
		* The returned object is a new reference every call so callers can
		* safely mutate it (e.g. strip the prompt before applying) without
		* touching the canonical clipboard. The `params` field is also cloned
		* for the same reason.
		*/
		function pasteParamsInto(target) {
			if (!_clipboard) return null;
			return {
				params: { ..._clipboard.params },
				prompt: _clipboard.prompt,
				negativePrompt: _clipboard.negativePrompt
			};
		}
		/** Read-only accessor — returns the live clipboard reference (or null). */
		function getSegmentClipboard() {
			return _clipboard;
		}
		/** True when `copySegmentParams` has been called at least once. */
		function hasSegmentClipboard() {
			return _clipboard !== null;
		}
		/** Clear the clipboard. Mostly useful for tests. */
		function clearSegmentClipboard() {
			_clipboard = null;
		}
		//#endregion
		//#region src/store/timelineUi.ts
		function createUiSlice(set, get) {
			return {
				setViewport: (patch) => set((s) => ({ viewport: {
					...s.viewport,
					...patch
				} })),
				setStoryboardStatusFilter: (status) => set({ storyboardStatusFilter: status }),
				setTimeFormat: (fmt) => set({ timeFormat: fmt }),
				setPlayback: (patch) => set((s) => ({ playback: {
					...s.playback,
					...patch
				} })),
				setDrag: (patch) => set((s) => ({ drag: {
					...s.drag,
					...patch
				} })),
				setSelectedSegment: (id) => set({
					selectedSegmentId: id,
					selectedSegmentIds: new Set(id ? [id] : [])
				}),
				setSelectedAudioCue: (id) => set({ selectedAudioCueId: id }),
				copySelectedSegmentParams: () => {
					const { selectedSegmentId, segments } = get();
					if (!selectedSegmentId) return false;
					const seg = segments.find((s) => s.id === selectedSegmentId);
					if (!seg) return false;
					copySegmentParams(seg);
					return true;
				},
				pasteParamsToSegment: (id) => {
					const seg = get().segments.find((s) => s.id === id);
					if (!seg) return false;
					const patch = pasteParamsInto(seg);
					if (!patch) return false;
					get().updateSegment(id, patch);
					return true;
				},
				pasteParamsToSelected: () => {
					const id = get().selectedSegmentId;
					if (!id) return false;
					return get().pasteParamsToSegment(id);
				},
				selectSegmentRange: (id) => set((s) => {
					const segs = s.segments;
					const anchorId = s.selectedSegmentId;
					if (!anchorId || anchorId === id) return {
						selectedSegmentId: id,
						selectedSegmentIds: /* @__PURE__ */ new Set([id])
					};
					const anchorIdx = segs.findIndex((seg) => seg.id === anchorId);
					const targetIdx = segs.findIndex((seg) => seg.id === id);
					if (anchorIdx < 0 || targetIdx < 0) return {
						selectedSegmentId: id,
						selectedSegmentIds: /* @__PURE__ */ new Set([id])
					};
					const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
					const rangeIds = segs.slice(lo, hi + 1).map((seg) => seg.id);
					return {
						selectedSegmentId: anchorId,
						selectedSegmentIds: new Set(rangeIds)
					};
				}),
				toggleSegmentInSelection: (id) => set((s) => {
					const next = new Set(s.selectedSegmentIds);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					if (next.size === 0) return {
						selectedSegmentIds: next,
						selectedSegmentId: null
					};
					let primary = s.selectedSegmentId && next.has(s.selectedSegmentId) ? s.selectedSegmentId : id;
					if (!next.has(primary)) primary = [...next][0];
					return {
						selectedSegmentIds: next,
						selectedSegmentId: primary
					};
				}),
				clearMultiSelection: () => set((s) => ({ selectedSegmentIds: new Set(s.selectedSegmentId ? [s.selectedSegmentId] : []) })),
				selectAllSegments: () => set((s) => {
					return {
						selectedSegmentIds: new Set(s.segments.map((seg) => seg.id)),
						selectedSegmentId: s.segments[0]?.id ?? null
					};
				}),
				markInAtPlayhead: () => set((s) => {
					const t = s.playback.currentTime;
					const existing = s.inOutPoints;
					if (existing && existing.end <= t) return { inOutPoints: {
						start: t,
						end: t + 1
					} };
					return { inOutPoints: {
						start: t,
						end: existing ? Math.max(existing.end, t + .1) : t + 1
					} };
				}),
				markOutAtPlayhead: () => set((s) => {
					const t = s.playback.currentTime;
					const existing = s.inOutPoints;
					if (!existing) return { inOutPoints: {
						start: 0,
						end: t
					} };
					const start = t < existing.start ? 0 : existing.start;
					return { inOutPoints: {
						start,
						end: Math.max(t, start + .1)
					} };
				}),
				markSelectionFromPlayhead: () => set((s) => {
					const t = s.playback.currentTime;
					const hit = s.segments.filter((seg) => t >= seg.start && t < seg.start + seg.duration);
					if (hit.length === 0) return {};
					return { inOutPoints: {
						start: Math.min(...hit.map((seg) => seg.start)),
						end: Math.max(...hit.map((seg) => seg.start + seg.duration))
					} };
				}),
				setInOutPoints: (start, end) => set({ inOutPoints: {
					start: Math.min(start, end),
					end: Math.max(start, end)
				} }),
				clearInOutPoints: () => set({ inOutPoints: null }),
				addMarker: (time, label) => {
					const s = get();
					const t = typeof time === "number" ? Math.max(0, time) : s.playback.currentTime;
					const autoLabel = `Marker ${s.markers.length + 1}`;
					const marker = {
						id: uid(),
						time: t,
						label: label ?? autoLabel
					};
					set({ markers: [...s.markers, marker].sort((a, b) => a.time - b.time) });
					schedulePersist(get());
					return marker;
				},
				removeMarker: (id) => {
					set((s) => ({ markers: s.markers.filter((m) => m.id !== id) }));
					schedulePersist(get());
				},
				updateMarker: (id, patch) => {
					set((s) => ({ markers: s.markers.map((m) => m.id === id ? {
						...m,
						...patch
					} : m).sort((a, b) => a.time - b.time) }));
					schedulePersist(get());
				},
				clearMarkers: () => {
					set({ markers: [] });
					schedulePersist(get());
				},
				reset: () => {
					set({
						segments: [],
						audioCues: [],
						audioTracks: [],
						viewport: { ...DEFAULT_VIEWPORT },
						timeFormat: "seconds",
						playback: { ...DEFAULT_PLAYBACK },
						drag: { ...DEFAULT_DRAG },
						selectedSegmentId: null,
						selectedSegmentIds: /* @__PURE__ */ new Set(),
						storyboardStatusFilter: null,
						inOutPoints: null,
						markers: [],
						selectedAudioCueId: null,
						relayVideoUrl: null,
						relaySegmentIds: [],
						relayAssetId: null,
						globalConsistencyAnchor: null,
						initialized: false
					});
					localStorage.removeItem("tech_noir_timeline");
					tlClearAll().catch((e) => console.error("[Timeline] tlClearAll failed (IndexedDB):", e));
				}
			};
		}
		//#endregion
		//#region src/store/timelineVariants.ts
		init_src$1();
		function createVariantSlice(set, get) {
			return {
				addVariant: (segId, variant) => {
					if (!get().segments.some((seg) => seg.id === segId)) return null;
					const stored = {
						id: variant.id ?? variantUid(),
						seed: variant.seed,
						videoUrl: variant.videoUrl,
						assetId: variant.assetId,
						createdAt: variant.createdAt ?? Date.now(),
						thumbnailUrl: variant.thumbnailUrl ?? null,
						kind: variant.kind ?? "seed"
					};
					set((s) => {
						const target = s.segments.find((seg) => seg.id === segId);
						/* v8 ignore next -- target always exists: sync get-then-set, no interleave (2026-09-12) */
						if (!target) return {};
						const existing = Array.isArray(target.variants) ? [...target.variants] : [];
						existing.push(stored);
						while (existing.length > 4) existing.shift();
						const segments = s.segments.map((seg) => seg.id === segId ? {
							...seg,
							variants: existing
						} : seg);
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
					return stored;
				},
				removeVariant: (segId, variantId) => {
					set((s) => {
						const target = s.segments.find((seg) => seg.id === segId);
						if (!target || !Array.isArray(target.variants)) return {};
						const next = target.variants.filter((v) => v.id !== variantId);
						if (next.length === target.variants.length) return {};
						const segments = s.segments.map((seg) => seg.id === segId ? {
							...seg,
							variants: next
						} : seg);
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
				},
				promoteVariant: (segId, variantId) => {
					set((s) => {
						const target = s.segments.find((seg) => seg.id === segId);
						if (!target || !Array.isArray(target.variants)) return {};
						const promoted = target.variants.find((v) => v.id === variantId);
						if (!promoted) return {};
						const demotedEntry = target.videoUrl ? {
							id: variantUid(),
							seed: target.params?.seed ?? DEFAULT_SEGMENT_PARAMS.seed,
							videoUrl: target.videoUrl,
							assetId: target.assetId,
							createdAt: Date.now(),
							thumbnailUrl: target.thumbnailUrl ?? null,
							kind: "seed"
						} : null;
						const remaining = target.variants.filter((v) => v.id !== variantId);
						const nextVariants = demotedEntry ? [demotedEntry, ...remaining] : remaining;
						while (nextVariants.length > 4) nextVariants.pop();
						const segments = s.segments.map((seg) => {
							if (seg.id !== segId) return seg;
							return {
								...seg,
								videoUrl: promoted.videoUrl,
								assetId: promoted.assetId ?? seg.assetId,
								thumbnailUrl: promoted.thumbnailUrl ?? seg.thumbnailUrl,
								params: {
									...seg.params,
									seed: promoted.seed
								},
								variants: nextVariants,
								status: "ready"
							};
						});
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
				},
				setVariants: (segId, variants) => {
					set((s) => {
						if (!s.segments.find((seg) => seg.id === segId)) return {};
						const stored = variants.map((v) => ({
							id: v.id ?? variantUid(),
							seed: v.seed,
							videoUrl: v.videoUrl,
							assetId: v.assetId,
							createdAt: v.createdAt ?? Date.now(),
							thumbnailUrl: v.thumbnailUrl ?? null,
							kind: v.kind ?? "seed"
						}));
						while (stored.length > 4) stored.shift();
						const segments = s.segments.map((seg) => seg.id === segId ? {
							...seg,
							variants: stored
						} : seg);
						pushHistory(segments, s.audioCues);
						return { segments };
					});
					schedulePersist(get());
				}
			};
		}
		//#endregion
		//#region src/store/timelineStore.ts
		/**
		* timeline store — the storyboard document (segments, variants, audio
		* cues/tracks, playback, selection, markers) + debounced persistence.
		*
		* Split 2026-09-18: the state shape lives in ./timelineStoreTypes, id
		* minting in ./timelineIds, blob storage in ./timelineBlobs, persistence +
		* debounce in ./timelinePersistence, undo history in ./timelineHistory, and
		* the action groups in ./timelineSegments, ./timelineVariants, ./timelineAudio
		* and ./timelineUi. This module keeps the public surface and composes the
		* slices into `useTimelineStore`.
		*
		* PUBLIC API (other packages import from this store path): `useTimelineStore`,
		* `flushPersist`, `_persistRunCount`, `_tlDelete`, `MAX_VARIANTS_PER_SEGMENT`,
		* `VariantInput`. It never moves from here — only the internals moved out.
		*/
		const useTimelineStore = create((set, get) => ({
			segments: [],
			audioCues: [],
			audioTracks: [],
			viewport: { ...DEFAULT_VIEWPORT },
			timeFormat: "seconds",
			playback: { ...DEFAULT_PLAYBACK },
			drag: { ...DEFAULT_DRAG },
			selectedSegmentId: null,
			selectedSegmentIds: /* @__PURE__ */ new Set(),
			storyboardStatusFilter: null,
			inOutPoints: null,
			markers: [],
			selectedAudioCueId: null,
			relayVideoUrl: null,
			relaySegmentIds: [],
			relayAssetId: null,
			globalConsistencyAnchor: null,
			initialized: false,
			...createSegmentSlice(set, get),
			...createVariantSlice(set, get),
			...createAudioSlice(set, get),
			...createUiSlice(set, get),
			...createHistorySlice(set, get)
		}));
		//#endregion
		//#region src/store/index.ts
		/** The one-shot hydration promise (already running; await to join). */
		const timelineReady = useTimelineStore.getState().initialize();
		//#endregion
		//#region src/playback/useAudioPlayback.ts
		init_src();
		function useAudioPlayback() {
			const ctxRef = (0, react.useRef)(null);
			const sourcesRef = (0, react.useRef)(/* @__PURE__ */ new Map());
			const buffersRef = (0, react.useRef)(/* @__PURE__ */ new Map());
			const rafRef = (0, react.useRef)(0);
			const playGenRef = (0, react.useRef)(0);
			const audioCues = useTimelineStore((s) => s.audioCues);
			const audioTracks = useTimelineStore((s) => s.audioTracks);
			const setPlayback = useTimelineStore((s) => s.setPlayback);
			const getCtx = (0, react.useCallback)(() => {
				if (!ctxRef.current) ctxRef.current = new AudioContext();
				return ctxRef.current;
			}, []);
			(0, react.useEffect)(() => {
				const ctx = getCtx();
				let cancelled = false;
				const live = new Set(audioCues.map((c) => c.id));
				for (const id of buffersRef.current.keys()) if (!live.has(id)) buffersRef.current.delete(id);
				for (const cue of audioCues) {
					if (!cue.audioUrl || buffersRef.current.has(cue.id)) continue;
					fetch(cue.audioUrl).then((r) => r.arrayBuffer()).then((data) => ctx.decodeAudioData(data)).then((buffer) => {
						if (cancelled) return;
						buffersRef.current.set(cue.id, buffer);
						const channel = buffer.getChannelData(0);
						const peaks = downsample(channel, 200);
						const lod = computeWaveformLODs(channel);
						useTimelineStore.getState().updateAudioCue(cue.id, {
							waveformPeaks: peaks,
							waveformPeaksLOD: lod
						});
					}).catch((e) => {
						if (cancelled) return;
						console.error(`[useAudioPlayback] waveform fetch/decode failed for cue ${cue.id} (${cue.audioUrl}):`, e);
					});
				}
				return () => {
					cancelled = true;
				};
			}, [audioCues, getCtx]);
			const play = (0, react.useCallback)(() => {
				const ctx = getCtx();
				stopSources();
				cancelAnimationFrame(rafRef.current);
				const gen = ++playGenRef.current;
				const anySolo = audioTracks.some((t) => t.solo);
				const isAudible = (trackId) => {
					const t = audioTracks.find((tr) => tr.id === trackId);
					if (!t) return !anySolo;
					if (t.muted) return false;
					if (anySolo) return !!t.solo;
					return true;
				};
				for (const cue of audioCues) {
					const buffer = buffersRef.current.get(cue.id);
					if (!buffer) continue;
					if (!isAudible(cue.track)) continue;
					const offset = Math.max(0, useTimelineStore.getState().playback.currentTime - cue.start);
					if (offset >= cue.duration) continue;
					const source = ctx.createBufferSource();
					source.buffer = buffer;
					const gain = ctx.createGain();
					scheduleFadeAutomation(gain.gain, cue.volume, cue.duration, cue.fadeIn ?? 0, cue.fadeOut ?? 0, offset, ctx.currentTime);
					source.connect(gain);
					gain.connect(ctx.destination);
					source.start(0, offset);
					sourcesRef.current.set(cue.id, {
						source,
						gain
					});
				}
				const startTime = ctx.currentTime;
				const startOffset = useTimelineStore.getState().playback.currentTime;
				function tick() {
					if (playGenRef.current !== gen) return;
					const elapsed = ctx.currentTime - startTime;
					const newTime = startOffset + elapsed;
					if (newTime >= useTimelineStore.getState().playback.totalDuration) {
						setPlayback({
							isPlaying: false,
							currentTime: 0
						});
						stopSources();
						return;
					}
					setPlayback({ currentTime: newTime });
					rafRef.current = requestAnimationFrame(tick);
				}
				rafRef.current = requestAnimationFrame(tick);
				setPlayback({ isPlaying: true });
			}, [
				audioCues,
				audioTracks,
				setPlayback,
				getCtx
			]);
			const pause = (0, react.useCallback)(() => {
				stopSources();
				cancelAnimationFrame(rafRef.current);
				playGenRef.current++;
				setPlayback({ isPlaying: false });
			}, [setPlayback]);
			const seek = (0, react.useCallback)((time) => {
				const wasPlaying = useTimelineStore.getState().playback.isPlaying;
				if (wasPlaying) stopSources();
				cancelAnimationFrame(rafRef.current);
				playGenRef.current++;
				setPlayback({ currentTime: time });
				if (wasPlaying) play();
			}, [setPlayback, play]);
			function stopSources() {
				for (const [, { source }] of sourcesRef.current) try {
					source.stop();
				} catch {}
				sourcesRef.current.clear();
			}
			(0, react.useEffect)(() => {
				return () => {
					cancelAnimationFrame(rafRef.current);
					playGenRef.current++;
					stopSources();
					ctxRef.current?.close();
				};
			}, []);
			return {
				play,
				pause,
				seek
			};
		}
		function downsample(data, numPoints) {
			const blockSize = Math.floor(data.length / numPoints);
			const peaks = [];
			for (let i = 0; i < numPoints; i++) {
				let max = 0;
				const start = i * blockSize;
				for (let j = 0; j < blockSize; j++) {
					const abs = Math.abs(data[start + j] || 0);
					if (abs > max) max = abs;
				}
				peaks.push(max);
			}
			return peaks;
		}
		/**
		* E2.4: Schedule linear gain ramps on an {@link AudioParam} to mirror the
		* renderer's `afade=t=in|out` filter chain. Public for unit testing with a
		* mock AudioContext.
		*
		* Automation regions (in the cue's own clock, where 0 = cue start):
		*   - Fade-in:  [0, fadeIn]              gain: 0      → volume
		*   - Steady:   [fadeIn, dur - fadeOut]  gain: volume
		*   - Fade-out: [dur - fadeOut, dur]     gain: volume → 0
		*
		* When playback begins at `offset` into the cue, source-clock time 0 is
		* `offset` in the cue's clock. We translate each region accordingly and
		* skip any portion that is already in the past.
		*
		* Clamps `fadeIn`/`fadeOut` to `dur / 2` (matches `_build_audio_filter`
		* in `render_service.py`). With no fades, the param is left at `volume`.
		*/
		function scheduleFadeAutomation(param, volume, cueDuration, fadeInRaw, fadeOutRaw, offset, now) {
			param.setValueAtTime(volume, now);
			if (cueDuration <= 0) return;
			const fadeIn = Math.max(0, Math.min(fadeInRaw, cueDuration / 2));
			const fadeOut = Math.max(0, Math.min(fadeOutRaw, cueDuration / 2));
			if (fadeIn <= 0 && fadeOut <= 0) return;
			const fadeInEndSrc = fadeIn - offset;
			const fadeOutStartSrc = cueDuration - fadeOut - offset;
			const fadeOutEndSrc = cueDuration - offset;
			if (fadeIn > 0 && offset < fadeIn) {
				const gainNow = offset / fadeIn * volume;
				param.setValueAtTime(gainNow, now);
				param.linearRampToValueAtTime(volume, now + Math.max(0, fadeInEndSrc));
			}
			if (fadeOut > 0) {
				if (offset >= fadeOutStartSrc && offset < cueDuration) {
					const remaining = cueDuration - offset;
					const gainNow = remaining / fadeOut * volume;
					param.setValueAtTime(gainNow, now);
					param.linearRampToValueAtTime(0, now + Math.max(0, remaining));
				} else if (offset < fadeOutStartSrc) {
					param.setValueAtTime(volume, now + Math.max(0, fadeOutStartSrc));
					param.linearRampToValueAtTime(0, now + Math.max(0, fadeOutEndSrc));
				}
			}
		}
		//#endregion
		Object.defineProperty(exports, "ASSET_DRAG_MIME", {
			enumerable: true,
			get: function() {
				return _melite_card_base_client.ASSET_DRAG_MIME;
			}
		});
		exports.AUDIO_CARDS_H = AUDIO_CARDS_H;
		exports.AUDIO_H = AUDIO_H;
		exports.BEATS_H = BEATS_H;
		exports.DRAG_ARM_PX = DRAG_ARM_PX;
		Object.defineProperty(exports, "Film", {
			enumerable: true,
			get: function() {
				return _melite_card_base_client.Film;
			}
		});
		exports.FilmPlayer = FilmPlayer;
		exports.GUTTER_W = GUTTER_W;
		Object.defineProperty(exports, "Image", {
			enumerable: true,
			get: function() {
				return _melite_card_base_client.Image;
			}
		});
		exports.LANE_H = LANE_H;
		exports.MAX_PPF = MAX_PPF;
		exports.MAX_VARIANTS_PER_SEGMENT = MAX_VARIANTS_PER_SEGMENT;
		exports.MOTION_TIMELINE_TRACKS = MOTION_TIMELINE_TRACKS;
		exports.MotionTimelineBar = MotionTimelineBar;
		exports.PROMPTS_H = PROMPTS_H;
		exports.PROMPT_COLORS = PROMPT_COLORS;
		exports.RULER_H = RULER_H;
		exports.Timeline = Timeline;
		exports.TimelineAudioLanes = TimelineAudioLanes;
		exports.TimelineBeatsLane = TimelineBeatsLane;
		exports.TimelineContent = TimelineContent;
		exports.TimelineGutter = TimelineGutter;
		exports.TimelineKeyframeLanes = TimelineKeyframeLanes;
		exports.TimelinePlayhead = TimelinePlayhead;
		exports.TimelinePromptsLane = TimelinePromptsLane;
		exports.TimelineRuler = TimelineRuler;
		exports.TimelineScrubBar = TimelineScrubBar;
		Object.defineProperty(exports, "Tip", {
			enumerable: true,
			get: function() {
				return _melite_card_base_client.Tip;
			}
		});
		Object.defineProperty(exports, "Upload", {
			enumerable: true,
			get: function() {
				return _melite_card_base_client.Upload;
			}
		});
		exports.ZOOM_STEP = ZOOM_STEP;
		Object.defineProperty(exports, "_persistRunCount", {
			enumerable: true,
			get: function() {
				return _persistRunCount;
			}
		});
		exports._tlDelete = _tlDelete;
		exports.buildMotionTimelineState = buildMotionTimelineState;
		exports.buildTicks = buildTicks;
		exports.clamp = clamp;
		exports.clearSegmentClipboard = clearSegmentClipboard;
		exports.copySegmentParams = copySegmentParams;
		exports.flushPersist = flushPersist;
		exports.fmtTimecode = fmtTimecode;
		exports.getSegmentClipboard = getSegmentClipboard;
		exports.hasSegmentClipboard = hasSegmentClipboard;
		exports.makeTimelineId = makeTimelineId;
		exports.pasteParamsInto = pasteParamsInto;
		exports.rgb = rgb;
		exports.scheduleFadeAutomation = scheduleFadeAutomation;
		exports.timelineReady = timelineReady;
		exports.useAudioPlayback = useAudioPlayback;
		exports.useTimelineDragSession = useTimelineDragSession;
		exports.useTimelineScale = useTimelineScale;
		exports.useTimelineStore = useTimelineStore;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
