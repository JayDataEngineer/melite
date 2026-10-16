window.__ModuleLoader__.load({
	id: "@melite/image-input-prep",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _melite_card_base_client = require("@melite/card-base/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../engines/comfyui-card-kit/lib/impact.js
		const IMPACT_DETECTOR_IDS = [
			"person",
			"face",
			"hand"
		];
		const IMPACT_DETECTORS = Object.freeze({
			person: Object.freeze({
				graphPath: "segm/person_yolov8m-seg.pt",
				provision: Object.freeze({
					name: "person_yolov8m-seg.pt",
					url: "https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt",
					folder: "ultralytics/segm",
					sha256: "c8ab26f517173b1fe8342d336a09f443eb61cb08dcbfc78d53fff4c2547ae81e",
					size_bytes: 54827683
				}),
				providerNode: "UltralyticsDetectorProvider",
				providerOutput: 1,
				detectorNode: "SegmDetectorSEGS",
				detectorInput: "segm_detector"
			}),
			face: Object.freeze({
				graphPath: "bbox/face_yolov8m.pt",
				provision: Object.freeze({
					name: "face_yolov8m.pt",
					url: "https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt",
					folder: "ultralytics/bbox",
					sha256: "717923c19b3f4bbf5250b728f1fa6b2cb72a33aed1d236ea9caf0e21ad943e5f",
					size_bytes: 52026019
				}),
				providerNode: "UltralyticsDetectorProvider",
				providerOutput: 0,
				detectorNode: "BboxDetectorSEGS",
				detectorInput: "bbox_detector"
			}),
			hand: Object.freeze({
				graphPath: "bbox/hand_yolov8s.pt",
				provision: Object.freeze({
					name: "hand_yolov8s.pt",
					url: "https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt",
					folder: "ultralytics/bbox",
					sha256: "70b540063fbc385736d8258970744a4afbc4cbf7932134bae3b24cdadeadec06",
					size_bytes: 22507643
				}),
				providerNode: "UltralyticsDetectorProvider",
				providerOutput: 0,
				detectorNode: "BboxDetectorSEGS",
				detectorInput: "bbox_detector"
			})
		});
		Object.freeze(IMPACT_DETECTOR_IDS.map((id) => IMPACT_DETECTORS[id].provision));
		Object.freeze(["comfyui-impact-pack", "comfyui-impact-subpack"]);
		function impactDetector(id) {
			const detector = IMPACT_DETECTORS[id];
			if (detector === void 0) throw new Error(`unknown Impact detector '${id}' — expected ${IMPACT_DETECTOR_IDS.join(", ")}`);
			return detector;
		}
		//#endregion
		//#region ../../engines/comfyui-card-kit/lib/lanes-3d.js
		const MESH_BAKE_SIZES = [
			["atlas_size", ["2048", "4096"]],
			["ao_size", ["512", "1024"]],
			["normal_size", ["1024", "2048"]]
		];
		MESH_BAKE_SIZES[0][1];
		MESH_BAKE_SIZES[1][1];
		MESH_BAKE_SIZES[2][1];
		//#endregion
		//#region ../../engines/comfyui-card-kit/lib/lanes-image-tools.js
		impactDetector("person");
		impactDetector("face");
		impactDetector("hand");
		[...Array.from({ length: 25 }, (_, i) => String(20 + i * 10))];
		//#endregion
		//#region ../../models/input/src/actions.ts
		/** The closed upscale-method set (the dropdown law, 2026-10-24):
		*  ComfyUI core ImageScale's own combo values, grounded in the live
		*  engine's object_info (not memory). The input-prep card's
		*  scale_method vocabulary serves THIS export — one truth, two
		*  consumers, so a card-authored copy cannot drift from what the
		*  engine accepts. */
		const SCALE_METHODS = [
			"nearest-exact",
			"bilinear",
			"area",
			"bicubic",
			"lanczos"
		];
		Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, [...SCALE_METHODS];
		//#endregion
		//#region \0dsh-css:packages/image/input-prep/src/ui/studio/prep.module.css.mjs
		const css = ".o0BhZq_studio{align-items:stretch;gap:14px;width:100%;min-height:260px;display:flex}.o0BhZq_previewPane{flex-direction:column;flex:auto;gap:6px;min-width:0;display:flex}.o0BhZq_paneNote{color:#ffffffa6;border:1px dashed #7f7f7f66;border-radius:8px;padding:18px 14px;font-size:12px;line-height:1.5}.o0BhZq_paneMeta{color:#ffffff80;font-size:11px}.o0BhZq_previewWrap{user-select:none;touch-action:none;align-self:flex-start;max-width:100%;display:inline-block;position:relative}.o0BhZq_previewImg{border-radius:8px;max-width:100%;max-height:52vh;display:block}.o0BhZq_previewOverlay{cursor:crosshair;border-radius:8px;position:absolute;inset:0}.o0BhZq_cropBox{cursor:move;border:1px solid #fff;position:absolute;box-shadow:0 0 0 100000px #00000080}.o0BhZq_cropBadge{color:#fff;white-space:nowrap;background:#0009;border-radius:4px;padding:1px 5px;font-size:10px;position:absolute;top:-20px;left:4px}.o0BhZq_previewHint{color:#ffffffbf;pointer-events:none;white-space:nowrap;background:#00000080;border-radius:4px;padding:2px 8px;font-size:11px;position:absolute;bottom:10px;left:50%;transform:translate(-50%)}.o0BhZq_handle,.o0BhZq_handle_nw,.o0BhZq_handle_ne,.o0BhZq_handle_se,.o0BhZq_handle_sw,.o0BhZq_handle_n,.o0BhZq_handle_e,.o0BhZq_handle_s,.o0BhZq_handle_w{background:#fff;border:1px solid #0006;border-radius:2px;width:12px;height:12px;position:absolute}.o0BhZq_handle_nw{cursor:nwse-resize;top:-7px;left:-7px}.o0BhZq_handle_ne{cursor:nesw-resize;top:-7px;right:-7px}.o0BhZq_handle_se{cursor:nwse-resize;bottom:-7px;right:-7px}.o0BhZq_handle_sw{cursor:nesw-resize;bottom:-7px;left:-7px}.o0BhZq_handle_n{cursor:ns-resize;margin-left:-6px;top:-7px;left:50%}.o0BhZq_handle_s{cursor:ns-resize;margin-left:-6px;bottom:-7px;left:50%}.o0BhZq_handle_w{cursor:ew-resize;margin-top:-6px;top:50%;left:-7px}.o0BhZq_handle_e{cursor:ew-resize;margin-top:-6px;top:50%;right:-7px}.o0BhZq_rail{background:#7f7f7f14;border:1px solid #7f7f7f40;border-radius:8px;flex-direction:column;flex:0 0 240px;gap:8px;padding:10px;display:flex}.o0BhZq_railTitle{letter-spacing:.04em;text-transform:uppercase;color:#fff9;font-size:11px;font-weight:600}.o0BhZq_railRow{flex-wrap:wrap;align-items:flex-end;gap:8px;display:flex}.o0BhZq_railHint{color:#ffffff80;font-size:11px;line-height:1.4}.o0BhZq_field{color:#ffffffb3;flex-direction:column;flex:1;gap:3px;min-width:0;font-size:11px;display:flex}.o0BhZq_field input,.o0BhZq_field select{color-scheme:light;box-sizing:border-box;color:#fff;background:#00000059;border:1px solid #7f7f7f66;border-radius:6px;width:100%;padding:5px 7px;font-size:12px}.o0BhZq_chip{color:#ffffffd9;cursor:pointer;background:#00000040;border:1px solid #7f7f7f66;border-radius:6px;padding:5px 10px;font-size:11px}.o0BhZq_chip:disabled{opacity:.45;cursor:default}";
		const tagId = "@melite/image-input-prep/prep.module.css@9d8c9a4";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/image-input-prep";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var prep_module_css_default = {
			"chip": "o0BhZq_chip",
			"cropBadge": "o0BhZq_cropBadge",
			"cropBox": "o0BhZq_cropBox",
			"field": "o0BhZq_field",
			"handle": "o0BhZq_handle",
			"handle_e": "o0BhZq_handle_e",
			"handle_n": "o0BhZq_handle_n",
			"handle_ne": "o0BhZq_handle_ne",
			"handle_nw": "o0BhZq_handle_nw",
			"handle_s": "o0BhZq_handle_s",
			"handle_se": "o0BhZq_handle_se",
			"handle_sw": "o0BhZq_handle_sw",
			"handle_w": "o0BhZq_handle_w",
			"paneMeta": "o0BhZq_paneMeta",
			"paneNote": "o0BhZq_paneNote",
			"previewHint": "o0BhZq_previewHint",
			"previewImg": "o0BhZq_previewImg",
			"previewOverlay": "o0BhZq_previewOverlay",
			"previewPane": "o0BhZq_previewPane",
			"previewWrap": "o0BhZq_previewWrap",
			"rail": "o0BhZq_rail",
			"railHint": "o0BhZq_railHint",
			"railRow": "o0BhZq_railRow",
			"railTitle": "o0BhZq_railTitle",
			"studio": "o0BhZq_studio"
		};
		//#endregion
		//#region src/ui/studio/CropPreview.tsx
		/**
		* CropPreview — the input-prep studio's preview pane (operator
		* 2026-11, defect 3: "where the 'preview' section is a place where
		* you have the image, you can drag a box around to crop"). A pure
		* React leaf: the image plus a draggable/resizable crop box. ALL
		* box math is in IMAGE pixels (what the card's crop_x/crop_y/
		* crop_width/crop_height params name); the DOM overlay maps through
		* its own getBoundingClientRect ratio, so the same box rides any
		* rendered size. The gesture grammar is the ANNY-law crop:
		*
		*   press on empty veil → draw a fresh box (drag out the corners)
		*   press inside the box → move it
		*   press an edge/corner handle → resize that edge
		*   click empty veil (no drag) → clear the crop
		*
		* Commits are ATOMIC: the live drag rides local state only; onChange
		* fires ONCE at pointerup (the studio's patch law — never a patch
		* storm per pointermove). A release with either side under MIN_DIM
		* (8px, the blank-image law's own floor — a crop side below 8px
		* upscales to a blank) drops the box rather than committing a box
		* the engine cannot honor.
		*/
		/** Clamp a point into the image bounds. */
		const clampPoint = (n, x, y) => ({
			x: Math.max(0, Math.min(n.width, x)),
			y: Math.max(0, Math.min(n.height, y))
		});
		/** The rect between two image-px points (normalized: width/height
		* are always >= 0 — a rightward-up drag and its mirror produce the
		* same box). */
		const rectBetween = (n, ax, ay, bx, by) => {
			const a = clampPoint(n, ax, ay);
			const b = clampPoint(n, bx, by);
			return {
				x: Math.round(Math.min(a.x, b.x)),
				y: Math.round(Math.min(a.y, b.y)),
				width: Math.round(Math.abs(b.x - a.x)),
				height: Math.round(Math.abs(b.y - a.y))
			};
		};
		/** Apply a handle drag to a base rect (the moving edge follows the
		* pointer; the opposite edge stays pinned). */
		const resizeRect = (n, base, handle, x, y) => {
			const p = clampPoint(n, x, y);
			let { x: bx, y: by, width: bw, height: bh } = base;
			if (handle.includes("w")) {
				const right = bx + bw;
				bx = Math.min(p.x, right);
				bw = right - bx;
			}
			if (handle.includes("e")) {
				const left = bx;
				bw = Math.max(p.x, left) - bx;
			}
			if (handle.includes("n")) {
				const bottom = by + bh;
				by = Math.min(p.y, bottom);
				bh = bottom - by;
			}
			if (handle.includes("s")) {
				const top = by;
				bh = Math.max(p.y, top) - by;
			}
			return {
				x: Math.round(bx),
				y: Math.round(by),
				width: Math.round(bw),
				height: Math.round(bh)
			};
		};
		/** Whether a committed rect is honorable (every side at least the
		* engine's own floor — the blank-image law's threshold). */
		const cropIsHonorable = (r) => r.width >= 8 && r.height >= 8;
		const HANDLES = [
			"nw",
			"ne",
			"se",
			"sw",
			"n",
			"e",
			"s",
			"w"
		];
		function CropPreview({ src, crop, onChange, onNatural }) {
			const [natural, setNatural] = (0, react.useState)(null);
			const [live, setLive] = (0, react.useState)(crop);
			const dragRef = (0, react.useRef)(null);
			const naturalRef = (0, react.useRef)(null);
			const liveRef = (0, react.useRef)(crop);
			const seatLive = (next) => {
				liveRef.current = next;
				setLive(next);
			};
			(0, react.useEffect)(() => {
				if (dragRef.current === null) {
					liveRef.current = crop;
					setLive(crop);
				}
			}, [crop]);
			const overlayRef = (0, react.useRef)(null);
			/** Image-px point for a pointer event, via the overlay's own box. */
			const toImage = (e) => {
				const el = overlayRef.current;
				const n = naturalRef.current;
				if (el === null || n === null) return {
					x: 0,
					y: 0
				};
				const r = el.getBoundingClientRect();
				const sx = r.width > 0 ? n.width / r.width : 0;
				const sy = r.height > 0 ? n.height / r.height : 0;
				return {
					x: (e.clientX - r.left) * sx,
					y: (e.clientY - r.top) * sy
				};
			};
			/** % geometry: image px → the overlay's percent (render-size
			* independent — the box tracks the image under any layout). */
			const pct = (r) => ({
				left: `${r.x / (natural?.width ?? 1) * 100}%`,
				top: `${r.y / (natural?.height ?? 1) * 100}%`,
				width: `${r.width / (natural?.width ?? 1) * 100}%`,
				height: `${r.height / (natural?.height ?? 1) * 100}%`
			});
			const onOverlayDown = (e) => {
				if (natural === null) return;
				const p = toImage(e);
				const box = live;
				if (box !== null && cropIsHonorable(box) && p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height) {
					dragRef.current = {
						kind: "move",
						handle: null,
						startX: p.x,
						startY: p.y,
						base: box
					};
					e.currentTarget.setPointerCapture?.(e.pointerId);
					e.preventDefault();
					return;
				}
				dragRef.current = {
					kind: "draw",
					handle: null,
					startX: p.x,
					startY: p.y,
					base: {
						x: p.x,
						y: p.y,
						width: 0,
						height: 0
					}
				};
				seatLive({
					x: Math.round(p.x),
					y: Math.round(p.y),
					width: 0,
					height: 0
				});
				e.currentTarget.setPointerCapture?.(e.pointerId);
				e.preventDefault();
			};
			const onOverlayMove = (e) => {
				const d = dragRef.current;
				if (d === null || natural === null) return;
				const p = toImage(e);
				if (d.kind === "draw") seatLive(rectBetween(naturalRef.current, d.startX, d.startY, p.x, p.y));
				else if (d.kind === "move") {
					const a = clampPoint(natural, d.startX, d.startY);
					const b = clampPoint(natural, p.x, p.y);
					seatLive({
						x: Math.round(Math.max(0, Math.min(natural.width - d.base.width, d.base.x + b.x - a.x))),
						y: Math.round(Math.max(0, Math.min(natural.height - d.base.height, d.base.y + b.y - a.y))),
						width: d.base.width,
						height: d.base.height
					});
				} else if (d.handle !== null) seatLive(resizeRect(natural, d.base, d.handle, p.x, p.y));
			};
			const onOverlayUp = () => {
				const d = dragRef.current;
				dragRef.current = null;
				if (d === null) return;
				const box = liveRef.current;
				if (box === null || !cropIsHonorable(box)) onChange(null);
				else onChange(box);
			};
			const onHandleDown = (e, handle) => {
				if (live === null) return;
				const p = toImage(e);
				dragRef.current = {
					kind: "resize",
					handle,
					startX: p.x,
					startY: p.y,
					base: live
				};
				e.currentTarget.setPointerCapture?.(e.pointerId);
				e.preventDefault();
				e.stopPropagation();
			};
			const box = live !== null && cropIsHonorable(live) ? live : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: prep_module_css_default.previewWrap,
				"data-testid": "prep-crop-preview",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src,
					alt: "crop source",
					className: prep_module_css_default.previewImg,
					onLoad: (e) => {
						const im = e.currentTarget;
						if (im.naturalWidth > 0 && im.naturalHeight > 0) {
							const n = {
								width: im.naturalWidth,
								height: im.naturalHeight
							};
							naturalRef.current = n;
							setNatural(n);
							onNatural?.(n);
						}
					},
					draggable: false
				}), natural !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: overlayRef,
					className: prep_module_css_default.previewOverlay,
					onPointerDown: onOverlayDown,
					onPointerMove: onOverlayMove,
					onPointerUp: onOverlayUp,
					"data-testid": "prep-crop-overlay",
					children: [box !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: prep_module_css_default.cropBox,
						style: pct(box),
						"data-testid": "prep-crop-box",
						children: [HANDLES.map((hd) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: prep_module_css_default[`handle_${hd}`] ?? prep_module_css_default.handle,
							"data-handle": hd,
							"data-testid": `prep-crop-handle-${hd}`,
							onPointerDown: (e) => {
								onHandleDown(e, hd);
							},
							onPointerMove: onOverlayMove,
							onPointerUp: onOverlayUp
						}, hd)), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: prep_module_css_default.cropBadge,
							children: [
								box.width,
								"×",
								box.height
							]
						})]
					}), box === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: prep_module_css_default.previewHint,
						children: "drag a box to crop — click to clear"
					})]
				})]
			});
		}
		//#endregion
		//#region src/ui/studio/component.tsx
		/**
		* InputPrepStudio — the input-prep card's own stage view (operator
		* 2026-11, defect 3: "turn the Image Prep into something like an
		* ANNY studio card — the preview is where you have the image, drag
		* a box to crop, then optional upscale/downscale parameters with a
		* model choice"). Registered on the `cards.stage.view` seam under
		* key 'input-prep' (src/client/index.ts).
		*
		* THE STATE LAW (the estate's own, DeclarativeStudio verbatim):
		* edits ride LOCAL user state seeded from the frozen bench row; the
		* run verb PATCHES FIRST then starts the run (bindRun — the frame's
		* pill never runs past unflushed crop state). The crop gesture is
		* the leaf's atomic commit (CropPreview fires onChange once per
		* release); this component translates between the four flat crop
		* params (the card's declared knobs — crop_x/y/width/height, -1 =
		* unset) and the leaf's CropRect, and owns the resample rail
		* (scale_width/scale_height/scale_method — the METHOD ROW IS THE
		* MODEL CHOICE: the five resample models the card's compose
		* actually drives into ImageScale; the diffusion upscaler is the
		* upscale-tools card's own stage, never a phantom row here).
		*/
		/** Read one numeric param (numbers only — anything else is unset). */
		const num = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
		/** The four crop params as one rect (null unless ALL four are
		* seated >= 0 — the card's own -1-unset grammar). */
		function cropOf(params) {
			const x = num(params["crop_x"]);
			const y = num(params["crop_y"]);
			const w = num(params["crop_width"]);
			const h = num(params["crop_height"]);
			if (x === null || y === null || w === null || h === null) return null;
			if (x < 0 || y < 0 || w < 0 || h < 0) return null;
			return {
				x,
				y,
				width: w,
				height: h
			};
		}
		/** Whether a source string is previewable in an <img> (data:,
		* blob:, http(s):, or a rooted path — the bench's own URL grammar;
		* a bare staged input-dir name is NOT browser-loadable and the
		* studio says so instead of rendering a broken frame). */
		const isPreviewable = (source) => source.startsWith("data:") || source.startsWith("blob:") || source.startsWith("http://") || source.startsWith("https://") || source.startsWith("/");
		function InputPrepStudio(props) {
			const { row, bindRun } = props;
			const params = typeof row["params"] === "object" && row["params"] !== null ? row["params"] : {};
			const source = typeof params["source"] === "string" ? params["source"] : "";
			const mediaType = params["media_type"] === "audio" ? "audio" : "image";
			const [user, setUser] = (0, react.useState)(params);
			(0, react.useEffect)(() => {
				setUser(params);
			}, [params]);
			const userRef = (0, react.useRef)(user);
			userRef.current = user;
			const [natural, setNatural] = (0, react.useState)(null);
			const previewable = source !== "" && isPreviewable(source) && mediaType === "image";
			const crop = cropOf(user);
			const scaleW = num(user["scale_width"]);
			const scaleH = num(user["scale_height"]);
			const method = typeof user["scale_method"] === "string" && SCALE_METHODS.includes(user["scale_method"]) ? user["scale_method"] : "lanczos";
			const edit = (patch) => {
				setUser((prev) => ({
					...prev,
					...patch
				}));
			};
			/** The leaf's atomic commit → the four flat params. */
			const onCropCommit = (next) => {
				edit(next === null ? {
					crop_x: -1,
					crop_y: -1,
					crop_width: -1,
					crop_height: -1
				} : {
					crop_x: next.x,
					crop_y: next.y,
					crop_width: next.width,
					crop_height: next.height
				});
			};
			/** PATCH FIRST, then run (the estate's run law — the frame's pill
			* calls this verb, never a bare onRun past unflushed state). */
			const runRef = (0, react.useRef)(props.onRun);
			runRef.current = props.onRun;
			(0, react.useEffect)(() => {
				bindRun?.(() => {
					const patch = { ...userRef.current };
					props.onPatch(patch);
					runRef.current();
				});
			}, [bindRun, props.onPatch]);
			/** The crop box (or the full frame when uncropped) — the base the
			* scale presets multiply. */
			const base = crop ?? (natural !== null ? {
				x: 0,
				y: 0,
				width: natural.width,
				height: natural.height
			} : null);
			const preset = (factor) => {
				if (base === null) return;
				edit({
					scale_width: Math.max(1, Math.round(base.width * factor)),
					scale_height: Math.max(1, Math.round(base.height * factor))
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: prep_module_css_default.studio,
				"data-testid": "prep-studio",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: prep_module_css_default.previewPane,
					children: [
						mediaType === "audio" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: prep_module_css_default.paneNote,
							"data-testid": "prep-audio-note",
							children: "audio restage — crop and scale are image-lane knobs (LoadAudio → SaveAudio composes without them)"
						}),
						mediaType === "image" && source === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: prep_module_css_default.paneNote,
							"data-testid": "prep-empty-note",
							children: "pick a source file first — the preview crops what the run stages"
						}),
						mediaType === "image" && source !== "" && !previewable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: prep_module_css_default.paneNote,
							"data-testid": "prep-staged-note",
							children: [
								"staged source \"",
								source,
								"\" — the engine holds this file; the drag-crop preview needs a browser-loadable image (upload or asset drop)"
							]
						}),
						previewable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CropPreview, {
							src: source,
							crop,
							onChange: onCropCommit,
							onNatural: setNatural
						}),
						previewable && natural !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: prep_module_css_default.paneMeta,
							"data-testid": "prep-natural",
							children: [
								"source ",
								natural.width,
								"×",
								natural.height,
								crop !== null ? ` — crop ${crop.width}×${crop.height} at ${crop.x},${crop.y}` : ""
							]
						})
					]
				}), mediaType === "image" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: prep_module_css_default.rail,
					"data-testid": "prep-rail",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: prep_module_css_default.railTitle,
							children: "Transform"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: prep_module_css_default.railRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: prep_module_css_default.chip,
								"data-testid": "prep-clear-crop",
								disabled: crop === null,
								onClick: () => {
									onCropCommit(null);
								},
								children: "clear crop"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: prep_module_css_default.railHint,
								children: "drag on the image to set the box"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: prep_module_css_default.railTitle,
							children: "Scale (optional)"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: prep_module_css_default.railRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: prep_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "width (px)" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									"data-testid": "prep-scale-scale_width",
									value: scaleW === null || scaleW < 0 ? "" : String(scaleW),
									placeholder: "unset",
									onChange: (e) => {
										const raw = e.target.value;
										edit({ scale_width: raw === "" ? -1 : Math.max(1, Math.round(Number(raw))) });
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: prep_module_css_default.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "height (px)" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									"data-testid": "prep-scale-scale_height",
									value: scaleH === null || scaleH < 0 ? "" : String(scaleH),
									placeholder: "unset",
									onChange: (e) => {
										const raw = e.target.value;
										edit({ scale_height: raw === "" ? -1 : Math.max(1, Math.round(Number(raw))) });
									}
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: prep_module_css_default.railRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: prep_module_css_default.chip,
									"data-testid": "prep-preset-2x",
									disabled: base === null,
									onClick: () => {
										preset(2);
									},
									children: "2×"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: prep_module_css_default.chip,
									"data-testid": "prep-preset-half",
									disabled: base === null,
									onClick: () => {
										preset(.5);
									},
									children: "½×"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: prep_module_css_default.chip,
									"data-testid": "prep-clear-scale",
									disabled: scaleW === null && scaleH === null,
									onClick: () => {
										edit({
											scale_width: -1,
											scale_height: -1
										});
									},
									children: "clear"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: prep_module_css_default.field,
							"data-testid": "prep-method-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "resample model" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								"data-testid": "prep-scale-method",
								value: method,
								onChange: (e) => {
									edit({ scale_method: e.target.value });
								},
								children: SCALE_METHODS.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: m,
									children: m
								}, m))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: prep_module_css_default.railHint,
							children: "diffusion upscale is the Upscale Image card's own stage — wire this output into it"
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Browser client face for the input-prep card's OWN studio
		* registration (2026-11, the composition-root law — same seam as
		* img-to-mesh/h3/motion): the client bundle (lib/client.js) is the
		* artifact the DSH module table materializes; the node half (the
		* card face) rides the tsc plane. The studio itself lives in
		* src/ui/studio/component.tsx (the ANNY-style crop card, operator
		* defect 3).
		*/
		/** The built-in registration (the ui-tool law, verbatim — the
		* module namespace IS the plugin: the loader consumes
		* name/inject/apply). */
		const name = "inputPrepStudio";
		const inject = ["slots"];
		//#endregion
		exports.apply = (0, _melite_card_base_client.defineStageViewRegistration)("input-prep", InputPrepStudio);
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
