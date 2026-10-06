window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-gallery",
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
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _melite_three_client_client = require("@melite/three-client/client");
		_melite_three_client_client = __toESM(_melite_three_client_client, 1);
		let _melite_card_base_client = require("@melite/card-base/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region ../../web-kit/contracts/src/applyGuard.ts
		function createApplyGuard(label, opts = {}) {
			let claimed = false;
			return {
				claim() {
					if (claimed) {
						if (opts.warnOnRefusal === true) console.warn(`[${label}] apply called twice — second mount skipped`);
						return false;
					}
					claimed = true;
					return true;
				},
				release() {
					claimed = false;
				}
			};
		}
		//#endregion
		//#region src/client/apply-guard.ts
		/**
		* apply-guard — THIS PLUGIN'S single-mount claim. The guard itself is
		* one implementation in @melite/contracts (createApplyGuard); this
		* module exists so the gallery's claim is its OWN module instance (a
		* shared boolean would make the gallery's apply refuse the deck's).
		*/
		const guard = createApplyGuard("melite-plugin/dsh-gallery");
		function claimGalleryApply() {
			return guard.claim();
		}
		function releaseGalleryApply() {
			guard.release();
		}
		//#endregion
		//#region \0dsh-css:packages/web/infer-gallery/src/client/overlay.module.css.mjs
		const css = ".P_5Nua_lightbox{width:min(1200px,96vw);max-width:96vw}.P_5Nua_wand{z-index:3;background:var(--dsw-alias-fill-subtle,#020617d1);color:var(--dsw-alias-state-warn-primary,#fde68a);letter-spacing:.4px;cursor:pointer;opacity:1;border-radius:6px;align-items:center;gap:4px;padding:4px 6px;font-family:inherit;font-size:9px;font-weight:700;display:flex;position:absolute;top:6px;right:6px}";
		const tagId = "@melite-plugin/dsh-gallery/overlay.module.css@d598eaf4";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-gallery";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var overlay_module_css_default = {
			"lightbox": "P_5Nua_lightbox",
			"wand": "P_5Nua_wand"
		};
		//#endregion
		//#region ../../web-kit/formats/src/glbLoad.ts
		/**
		* glbLoad — THE shared GLB loading kernel (2026-09-05 dedup order).
		*
		* One DRACO-configured GLTFLoader for the whole estate. Before this,
		* three independent copies of the same loader + shared-decoder dance
		* lived in the 3d plugin's viewers (Stage, AnimatedGLBViewer,
		* MeshPoster) — and glbSkin parsed with NO decoder at all (a
		* DRACO-compressed character GLB failed there while the same file
		* loaded fine one dialog over). The user's audit order was explicit:
		* the three 3d cards "should all render the same, and share most
		* render code."
		*
		* THE DECODER SHIPS LOCAL: the gstatic CDN path every copy hardcoded
		* (1.5.7) was both a hardcode and an offline SPOF. The decoder files
		* from three's own package (the exact pairing three@0.184 was tested
		* with) are copied into the editor's public tree
		* (public/draco/gltf/) and resolved through the vite BASE_URL —
		* correct in dev, in the built dist, and in the DSH embed that
		* serves dist under the same base. No network dependency.
		*
		* Consumers:
		*   • @melite-plugin/3d viewers (Stage, AnimatedGLBViewer, MeshPoster)
		*   • glbSkin (this package — character GLB → SomaSkin substrate)
		*   • anything else that needs the estate's ONE GLB parse policy
		*/
		let _draco = null;
		let _loader = null;
		/* v8 ignore next -- the shipped client bundles never carry BASE_URL
		* (the clientBundle preset defines import.meta.env as {MODE} only),
		* so the fallback IS the production path; under vitest the module
		* env always carries BASE_URL "/", making the right arm unreachable
		* here (modelCatalog.ts precedent, 2026-09-12). */
		const base = {}.env?.BASE_URL ?? "/";
		function dracoLoader() {
			if (!_draco) {
				_draco = new _melite_three_client_client.DRACOLoader();
				_draco.setDecoderPath(`${base}draco/gltf/`);
			}
			return _draco;
		}
		/** A GLTFLoader configured with the estate's shared DRACO decoder —
		*  for parse-based consumers (glbSkin parses pre-fetched bytes). */
		function makeGLTFLoader() {
			const loader = new _melite_three_client_client.GLTFLoader();
			loader.setDRACOLoader(dracoLoader());
			return loader;
		}
		/** Load a GLB/GLTF from a URL with the estate's shared DRACO-configured
		*  loader. One loader instance + one decoder worker pool for every
		*  consumer (the decoder worker is reused, never respawned per view). */
		function loadGLB(url) {
			if (!_loader) _loader = makeGLTFLoader();
			return new Promise((resolve, reject) => {
				_loader.load(url, resolve, void 0, reject);
			});
		}
		/**
		* Normalize a loaded scene to a known viewing size: center X/Z, scale
		* the largest dimension to `targetHeight`, feet on y=0. Mutates the
		* root IN PLACE (scale + position) and returns the computed box.
		*
		* The shared normalization every viewer applies — TRELLIS props,
		* SOMAX/Anny characters, and composite uploads arrive at wildly
		* different scales (cm, m, 100× unit boxes); this is the one place
		* that reconciles them, so the poster tile, the dialog viewer, and
		* the stage floor all frame the mesh identically.
		*/
		function fitObjectToHeight(root, targetHeight = 1.6) {
			const box = new _melite_three_client_client.Box3().setFromObject(root);
			const size = box.getSize(new _melite_three_client_client.Vector3());
			const center = box.getCenter(new _melite_three_client_client.Vector3());
			const maxDim = Math.max(size.x, size.y, size.z);
			const scale = maxDim > 0 ? targetHeight / maxDim : 1;
			root.scale.setScalar(scale);
			root.position.x = -center.x * scale;
			root.position.z = -center.z * scale;
			root.position.y = -box.min.y * scale;
			return box;
		}
		//#endregion
		//#region ../../web-kit/contracts/src/mediaKinds.ts
		/** The estate media-kind vocabulary (typed DATA — see header). */
		function mediaVocab() {
			return {
				image: [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif",
					"svg",
					"bmp",
					"avif"
				],
				audio: [
					"wav",
					"flac",
					"mp3",
					"ogg",
					"m4a",
					"aac",
					"qvoice"
				],
				video: [
					"mp4",
					"webm",
					"mkv",
					"mov",
					"m4v",
					"avi"
				],
				model: ["glb", "gltf"],
				galleryImage: [
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif"
				],
				galleryAudio: [
					"wav",
					"flac",
					"ogg",
					"mp3"
				],
				galleryVideo: [
					"mp4",
					"webm",
					"mov"
				],
				galleryModel: ["glb", "gltf"],
				maxListedImages: 3
			};
		}
		const KIND_BY_EXT = (() => {
			const table = {};
			const vocab = mediaVocab();
			[
				"video",
				"image",
				"audio",
				"model"
			].forEach((kind) => {
				for (const ext of vocab[kind]) if (table[ext] === void 0) table[ext] = kind;
			});
			return table;
		})();
		/** The media kind a filename carries, or undefined for non-media. */
		function mediaKindOf(name) {
			const dot = name.lastIndexOf(".");
			if (dot < 0 || dot === name.length - 1) return void 0;
			return KIND_BY_EXT[name.slice(dot + 1).toLowerCase()];
		}
		/** Is this a 3D-MODEL url or data-URI? THE ONE spelling
		*  (2026-10-13, the card-UI duplication audit: five seats carried
		*  their own model regex and they had already drifted — one matched
		*  a query or fragment, two matched only a bare extension, so the
		*  same ".glb?v=2" classified as a model in one seat and as nothing
		*  in another. A new extension in the vocabulary reaches every seat
		*  through THIS.) Query and fragment are stripped before the
		*  vocabulary answers, and the glTF data-URI forms are recognised
		*  because a data URI has no extension. */
		function isModelUrl(value) {
			if (/^data:model\/gltf(?:-binary|\+json)[;,]/i.test(value)) return true;
			const withoutQuery = value.split(/[?#]/, 1)[0];
			return mediaKindOf(withoutQuery) === "model";
		}
		//#endregion
		//#region src/client/artifact-ops.ts
		/**
		* artifact-ops — the modal's delete + rename wires (the media
		* sidebar's popup modal on media stuff).
		*
		* Both doors ride the gallery host's SAME-ORIGIN mutating routes
		* (POST /infer-gallery/artifact-delete {path},
		* POST /infer-gallery/artifact-rename {path, name}) — the read
		* artifact route stays read-only, so a prefetcher can never mutate
		* by URL. Failures surface as thrown Errors carrying the door's
		* `error` code, never silent.
		*/
		/** The artifact's FILE NAME behind an artifact URL — THE ONE LAW
		*  (the operator's 2026-09-26 report: a real .glb was refused as
		*  `"artifact" is not a .glb/.gltf artifact`, because the media route
		*  serves `/infer-gallery/artifact?path=<run>/<file>` and the caller
		*  read the ROUTE's last path segment). `?path=` first, the plain URL
		*  path second (a directly-served file has no query). */
		function artifactNameOf(url) {
			const path = artifactPathOfUrl(url) ?? url.split("?")[0];
			return path.slice(path.lastIndexOf("/") + 1);
		}
		/** The run-relative artifact path behind one same-origin artifact
		*  URL (`/infer-gallery/artifact?path=run-<id>/<file>`) — null when
		*  the URL rides no such path (foreign URLs, card previews). */
		function artifactPathOfUrl(url) {
			try {
				const target = new URL(url, "http://artifact-ops.invalid").searchParams.get("path");
				return target !== null && target !== "" ? target : null;
			} catch {
				return null;
			}
		}
		async function refusalOf$1(res, answer) {
			const err = answer?.["error"];
			return typeof err === "string" && err !== "" ? err : "HTTP " + String(res.status);
		}
		/** Unlink one run-relative artifact file. */
		async function deleteArtifact(path) {
			let res;
			try {
				res = await fetch("/infer-gallery/artifact-delete", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path })
				});
			} catch (e) {
				throw new Error("delete failed — " + (e instanceof Error ? e.message : String(e)));
			}
			if (!res.ok) {
				const answer = await res.json().catch(() => null);
				throw new Error("delete failed (" + await refusalOf$1(res, answer) + ")");
			}
		}
		/** Rename one artifact inside its own directory — resolves the new
		*  run-relative path + its same-origin URL (the preview re-points). */
		async function renameArtifact(path, name) {
			let res;
			try {
				res = await fetch("/infer-gallery/artifact-rename", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						path,
						name
					})
				});
			} catch (e) {
				throw new Error("rename failed — " + (e instanceof Error ? e.message : String(e)));
			}
			const answer = await res.json().catch(() => null);
			if (!res.ok) throw new Error("rename failed (" + await refusalOf$1(res, answer) + ")");
			const row = answer ?? {};
			if (typeof row.path !== "string" || typeof row.url !== "string") throw new Error("rename failed (bad_rename_answer)");
			return {
				path: row.path,
				url: row.url
			};
		}
		//#endregion
		//#region src/client/artifact-address.ts
		/**
		* artifact-address — the estate-artifact address codec, the one home of
		* the format (2026-09-10's cross-plugin contract, in-tree since the
		* mesh tab landed): `dsh-resource://estate-artifact/<b64url of the
		* same-origin artifact URL>`. Run artifacts live outside the DSH
		* workspace, so no document owner can read them; the native seam for
		* addressable non-workspace content is a resource address claimed by
		* this package's own tab type (the mesh seat). Both directions live
		* here because both seats ride this package — minting in MediaPanel,
		* decoding in the tab body.
		*/
		/** The address kind this package claims (see client index.ts). */
		const ARTIFACT_PREFIX = "dsh-resource://estate-artifact/";
		function b64uEncode(text) {
			const bytes = new TextEncoder().encode(text);
			let bin = "";
			for (const b of bytes) bin += String.fromCharCode(b);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		}
		function b64uDecode(seg) {
			const b64 = seg.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - seg.length % 4) % 4);
			const bin = atob(b64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
			return new TextDecoder().decode(bytes);
		}
		/** Mint one estate-artifact address from an artifact URL. */
		function estateArtifactAddress(url) {
			return ARTIFACT_PREFIX + b64uEncode(url);
		}
		/** The artifact URL behind one estate-artifact address — null when the
		*  address is not ours or its segment is malformed (a foreign or
		*  corrupt address never renders a tab body; the caller voices the
		*  refusal honestly). A valid non-empty segment cannot decode to an
		*  empty string (atob rejects padding-only inputs), so no length
		*  re-check follows the decode. */
		function artifactUrlOfAddress(address) {
			if (!address.startsWith("dsh-resource://estate-artifact/")) return null;
			const seg = address.slice(31);
			if (seg.length === 0) return null;
			try {
				return b64uDecode(seg);
			} catch {
				return null;
			}
		}
		//#endregion
		//#region src/client/ui.tokens.ts
		/**
		* Design tokens — every var(--dsw-alias-…) string in the media family
		* declared ONCE (audit F6). Numbered suffixes = same alias, different
		* fallback (opacity variants). Pinned by
		* tests/walls/ts/suites/media-sidebar.spec.ts (tokens single site).
		*/
		const bgBase1 = "var(--dsw-alias-bg-base, #000)";
		const bgBase2 = "var(--dsw-alias-bg-base, #0b0e14)";
		const bgBase3 = "var(--dsw-alias-bg-base, #422006)";
		const bgLayer1 = "var(--dsw-alias-bg-layer-1, #1e293b)";
		const bgLayer2 = "var(--dsw-alias-bg-layer-2, #0f172a)";
		const bgOverlay1 = "var(--dsw-alias-bg-overlay, rgba(127,29,29,0.35))";
		const borderL2 = "var(--dsw-alias-border-l2, rgba(148,163,184,0.25))";
		/** Caption-scrim weight of the same fill token (the full port's
		*  single-site fix: the old package restated this raw spelling inline
		*  in ui.tsx — one token, one site, three weights). */
		const fillSubtleCaption = "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92))";
		const labelPrimary1 = "var(--dsw-alias-label-primary, rgb(226,232,240))";
		const labelPrimary2 = "var(--dsw-alias-label-primary, rgba(226,232,240,0.85))";
		const labelSecondary2 = "var(--dsw-alias-label-secondary, rgba(148,163,184,0.9))";
		const stateBusinessPrimary = "var(--dsw-alias-state-business-primary, rgb(147,197,253))";
		const stateBusinessPrimaryBg2 = "var(--dsw-alias-state-business-primary-bg, rgba(59,130,246,0.28))";
		const stateWarnPrimary1 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.9))";
		const stateWarnPrimary2 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.92))";
		const textTertiary2 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))";
		const textTertiary3 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.8))";
		//#endregion
		//#region src/client/mesh-view.tsx
		/**
		* mesh-view — THE 3D VIEWPORT for the media plane (the operator's
		* 2026-09-26 order, paraphrased: 3d output is hooked into the media
		* doors, visually. A `.glb` artifact opens HERE, in the drilldown,
		* orbitable — not as a download link with a sidebar hand-off.
		*
		* WHY IT LIVES IN THE GALLERY (and not as another viewer): a 3D run's
		* artifact is a MEDIA artifact, and the media drilldown is the one face
		* every surface already shares (the gallery tiles AND the cards' stage
		* zoom both route through `MediaDrilldown`). The 3D case was the only
		* kind that did not render — it degraded to a link, so a mesh artifact
		* was reachable but never VIEWABLE in the product.
		*
		* SUBSTRATE LAW (verbatim from card-base/glb-stage.tsx): RAW three.js,
		* an imperative scene in an effect, NO @react-three — r3f's bundled
		* react-reconciler version-skews against the seeded React internals and
		* crashes at boot. And ONE substrate: this mounts the estate's shared
		* stage core (`@melite/card-base/client`, the same module every card
		* viewport mounts) and loads through the estate's ONE GLB parse policy
		* (`@melite/formats/glbLoad` — the single DRACO-configured GLTFLoader
		* and the single autoFit normalization). It is a VIEWER, not a second
		* loader: no GLTFLoader, no DRACOLoader, no autoFit copy here.
		*
		* THE HONEST-FAILURE LAW: a viewer that cannot show the mesh says so
		* in words. WebGL refusal (no context), a decode failure, and an
		* unsupported extension each render their own copy — the artifact stays
		* downloadable either way, because "we could not render it" must never
		* become "we lost it".
		*/
		/** Extensions the shared loader can parse. `.gltf` is accepted by the
		*  loader but a bare `.gltf` usually references sidecar buffers the
		*  artifact route does not serve next to it — so the copy below names
		*  the case rather than letting the fetch fail as a decode error. */
		function unsupportedCopy(url) {
			/* v8 ignore next 3 -- String#split always returns at least one
			* element ("" splits to [""]), so index 0 is a string and the ??
			* guarded an impossibility the type already forbids. */
			const path = artifactPathOfUrl(url) ?? url.split("?")[0] ?? "";
			if (path.toLowerCase().endsWith(".gltf")) return "3D view unavailable — this .gltf references external buffers the media route does not serve. Download it to open it in a 3D tool.";
			if (!isModelUrl(path))
 /* v8 ignore next 2 -- same: split never yields an empty array, so
			* pop() returns the last segment as a string. */
			return `3D view unavailable — "${path.split("/").pop() ?? url}" is not a .glb/.gltf artifact.`;
			return null;
		}
		/** Frame the camera on the loaded root: target the box centre, pull
		*  back by its bounding sphere. A fixed camera seat (the card stage's
		*  [2.2,1.6,2.6]) frames a 1.6m creature and crops a 40m prop; the
		*  drilldown shows every model's extents, so the framing is derived. */
		function frameCamera(stage, root) {
			const box = new _melite_three_client_client.Box3().setFromObject(root);
			if (box.isEmpty()) return;
			const center = box.getCenter(new _melite_three_client_client.Vector3());
			const radius = Math.max(box.getBoundingSphere(new _melite_three_client_client.Sphere()).radius, .001);
			stage.controls.target.copy(center);
			stage.camera.position.set(center.x + radius * 1.4, center.y + radius * .9, center.z + radius * 1.7);
			stage.camera.near = Math.max(radius / 1e3, 1e-4);
			stage.camera.far = radius * 100;
			stage.camera.updateProjectionMatrix();
			stage.controls.update();
		}
		/** Dispose a loaded glTF subtree (geometries + materials + textures).
		*  The modal mounts and unmounts on every artifact walk; without this
		*  each open leaks a 33MB mesh's GPU buffers. */
		function disposeRoot(root) {
			root.traverse((o) => {
				const mesh = o;
				if (mesh.geometry !== void 0 && typeof mesh.geometry.dispose === "function") mesh.geometry.dispose();
				const material = mesh.material;
				if (material === void 0) return;
				for (const m of Array.isArray(material) ? material : [material]) {
					for (const value of Object.values(m)) if (value !== null && typeof value === "object" && typeof value.isTexture === "boolean" && value.isTexture) value.dispose();
					m.dispose();
				}
			});
		}
		/** The 3D face. Renders a canvas, a loading line, or an honest
		*  failure line — never a blank box. */
		function MeshView({ url, file, height = "52vh" }) {
			const canvasRef = react.useRef(null);
			const [failure, setFailure] = react.useState(null);
			const [loading, setLoading] = react.useState(true);
			react.useEffect(() => {
				const unsupported = unsupportedCopy(url);
				if (unsupported !== null) {
					setFailure(unsupported);
					setLoading(false);
					return;
				}
				const canvas = canvasRef.current;
				/* v8 ignore next 2 -- React assigns refs BEFORE an effect runs, and
				* this effect only exists on the path that rendered the canvas, so
				* the ref is the element. */
				if (canvas === null) return;
				let stage = null;
				let root = null;
				let cancelled = false;
				let disposeEnv = null;
				stage = (0, _melite_card_base_client.mountStage3D)(canvas, {
					fov: 40,
					toneMapping: _melite_three_client_client.NoToneMapping,
					onContextFailure: (msg) => {
						if (!cancelled) setFailure(`3D view unavailable — WebGL refused the canvas (${msg}).`);
					}
				});
				if (stage === null) {
					setLoading(false);
					return;
				}
				stage.scene.add(new _melite_three_client_client.HemisphereLight(16777215, 9079434, 1.4));
				const key = new _melite_three_client_client.DirectionalLight(16777215, 2.2);
				key.position.set(3, 5, 2);
				stage.scene.add(key);
				try {
					const pmrem = new _melite_three_client_client.PMREMGenerator(stage.renderer);
					const envRT = pmrem.fromScene(new _melite_three_client_client.RoomEnvironment(), .04);
					stage.scene.environment = envRT.texture;
					stage.scene.environmentIntensity = .85;
					disposeEnv = () => {
						if (stage !== null) stage.scene.environment = null;
						envRT.dispose();
						pmrem.dispose();
					};
				} catch {
					disposeEnv = null;
				}
				loadGLB(url).then((gltf) => {
					if (cancelled) {
						disposeRoot(gltf.scene);
						return;
					}
					root = gltf.scene;
					fitObjectToHeight(gltf.scene, 1.6);
					stage?.scene.add(gltf.scene);
					if (stage !== null) frameCamera(stage, gltf.scene);
					setLoading(false);
				}, (e) => {
					if (cancelled) return;
					setLoading(false);
					setFailure(`3D view unavailable — ${file} failed to load (${e instanceof Error ? e.message : String(e)}).`);
				});
				return () => {
					cancelled = true;
					if (root !== null) {
						stage?.scene.remove(root);
						disposeRoot(root);
					}
					disposeEnv?.();
					stage?.dispose();
				};
			}, [url, file]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 6,
					alignItems: "center",
					width: "100%"
				},
				children: [
					failure === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						"data-testid": "mesh-view-canvas",
						"aria-label": `3D view of ${file}`,
						style: {
							width: "100%",
							height,
							maxHeight: "72vh",
							display: "block",
							borderRadius: 8,
							background: bgBase1,
							touchAction: "none"
						}
					}) : null,
					failure !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-testid": "mesh-view-failure",
						style: {
							width: "100%",
							minHeight: 120,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							textAlign: "center",
							padding: 16,
							borderRadius: 8,
							background: bgBase1,
							color: stateWarnPrimary1,
							fontSize: 13,
							lineHeight: 1.5
						},
						children: failure
					}) : null,
					failure === null && loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						"data-testid": "mesh-view-loading",
						style: {
							color: textTertiary3,
							fontSize: 12
						},
						children: [
							"loading ",
							file,
							"…"
						]
					}) : null
				]
			});
		}
		/** The estate-artifact tab body: the address IS the data (the b64url
		*  segment decodes to the artifact URL — see artifact-address.ts). A
		*  malformed segment is this package's own bug and voices itself as
		*  the mesh seat's honest-failure copy, never a blank pane. Absent
		*  hook (headless harnesses) renders the same honest refusal. */
		function ArtifactTabBody({ useTabInfo }) {
			const tabInfo = useTabInfo !== void 0 ? useTabInfo() : void 0;
			const url = tabInfo !== void 0 ? artifactUrlOfAddress(tabInfo.tab.navigation.address) : null;
			if (url === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-testid": "mesh-view-failure",
				style: {
					width: "100%",
					minHeight: 120,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					textAlign: "center",
					padding: 16,
					borderRadius: 8,
					background: bgBase1,
					color: stateWarnPrimary1,
					fontSize: 13,
					lineHeight: 1.5
				},
				children: "artifact address unreadable — the viewer cannot decode it"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MeshView, {
				url,
				file: artifactNameOf(url),
				height: "72vh"
			});
		}
		//#endregion
		//#region src/drilldown.tsx
		/**
		* drilldown.tsx — THE MEDIA DRILLDOWN, one component for every surface
		* (the operator's hour-24 order: "clicking the preview component should
		* mirror the media drilldown view 1:1"). Extracted VERBATIM from the
		* gallery's MediaPanel Overlay — the gallery's media tiles and the
		* cards' stage previews ride the SAME face: DSH's Modal (headless —
		* body portal, mask, Escape, aria-modal and focus handling are the
		* primitive's, never ours), the kind-switched full-size artifact, the
		* caption, the esc hint.
		*
		* The gallery's MediaItem EXTENDS MediaDrilldownItem; the cards map
		* their stage artifact onto it (mesh kind → 'model' — the media vocab
		* alignment, one spelling).
		*/
		/** 3D artifact view — THE MESH RENDERS HERE, IN THE MODAL (the
		*  operator's 2026-09-26 order: the 3D lane is hooked into the media
		*  plane with a real visual door). `MeshView` mounts the estate's shared
		*  stage core + the shared GLB loader, so a `.glb` is orbitable in the
		*  drilldown exactly as an image is visible in the drilldown — no
		*  sidebar round-trip required to see the artifact.
		*
		*  The two links under the canvas stay, and both are load-bearing:
		*  the sidebar hand-off (an estate-artifact RESOURCE address claimed by
		*  a viewer tab type — a bigger, docked orbit beside the run list) and
		*  the download (when WebGL or the decode refuses, or the viewer plugin
		*  is absent, the artifact must still be reachable). openArtifact is
		*  OPTIONAL: a surface with no sidebar door (the card zoom) hides that
		*  link and keeps the canvas + the download. */
		function ModelView({ item, openArtifact }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10,
					alignItems: "center",
					width: "100%"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MeshView, {
						url: item.url,
						file: item.file
					}),
					openArtifact !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						role: "button",
						tabIndex: 0,
						style: {
							color: stateBusinessPrimary,
							fontSize: 14,
							cursor: "pointer"
						},
						onClick: (e) => {
							e.stopPropagation();
							openArtifact(item);
						},
						onKeyDown: (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.stopPropagation();
								openArtifact(item);
							}
						},
						children: "open 3D view in sidebar"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
						href: item.url,
						download: item.file,
						style: {
							color: textTertiary3,
							fontSize: 13,
							cursor: "pointer"
						},
						onClick: (e) => {
							e.stopPropagation();
						},
						children: ["download ", item.file]
					})
				]
			});
		}
		/** THE MEDIA DRILLDOWN (the gallery Overlay, verbatim — one face).
		* THE WALK ARROWS (2026-09-20, the operator's catch: "where are my
		* side arrows when I open an image so scroll through to others"):
		* an OPTIONAL sibling walk — the caller passes the visible list;
		* arrows render only when there is more than one to walk. The
		* arrows paint their OWN chip (explicit bg + label tokens — the
		* white-✕ lesson: never inherit the page's text color on a
		* self-painted surface), walk WRAP-AROUND, and the keyboard
		* ArrowLeft/ArrowRight ride the same verbs. No siblings = exactly
		* the old face (both call sites unchanged until wired). */
		function MediaDrilldown({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }) {
			const walkable = siblings ?? [];
			const at = walkable.findIndex((s) => s.url === item.url);
			const seat = react.useRef(null);
			react.useEffect(() => {
				seat.current?.focus();
			}, []);
			const canWalk = onNavigate !== void 0 && walkable.length > 1 && at >= 0;
			const atHead = at === 0;
			const atTail = at === walkable.length - 1;
			const step = (delta) => {
				const next = at + delta;
				if (next < 0 || next >= walkable.length) return;
				onNavigate(walkable[next]);
			};
			const onKey = (e) => {
				if (!canWalk) return;
				if (e.key === "ArrowLeft") {
					e.stopPropagation();
					step(-1);
				}
				if (e.key === "ArrowRight") {
					e.stopPropagation();
					step(1);
				}
			};
			react.useEffect(() => {
				const nat = (e) => {
					onKey(e);
				};
				window.addEventListener("keydown", nat);
				return () => {
					window.removeEventListener("keydown", nat);
				};
			});
			const [mode, setMode] = react.useState("idle");
			const [draftName, setDraftName] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [opError, setOpError] = react.useState("");
			const inflight = react.useRef(false);
			react.useEffect(() => {
				setMode("idle");
				setDraftName("");
				setBusy(false);
				setOpError("");
				inflight.current = false;
			}, [item.url]);
			const canDelete = onDelete !== void 0;
			const canRename = onRename !== void 0;
			const showActions = canDelete || canRename;
			const startDelete = () => {
				setOpError("");
				setMode("confirmDelete");
			};
			const confirmDelete = () => {
				if (onDelete === void 0 || inflight.current) return;
				inflight.current = true;
				setBusy(true);
				setOpError("");
				onDelete(item).catch((e) => {
					setOpError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					inflight.current = false;
					setBusy(false);
					setMode("idle");
				});
			};
			const startRename = () => {
				setOpError("");
				setDraftName(item.file);
				setMode("renaming");
			};
			const confirmRename = () => {
				if (onRename === void 0 || inflight.current) return;
				const name = draftName.trim();
				if (name === "" || name === item.file) return;
				inflight.current = true;
				setBusy(true);
				setOpError("");
				onRename(item, name).catch((e) => {
					setOpError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					inflight.current = false;
					setBusy(false);
					setMode("idle");
				});
			};
			const actionBtn = (label, verb, opts) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": opts.aria,
				"data-testid": opts.testid,
				disabled: busy,
				onClick: (e) => {
					e.stopPropagation();
					verb();
				},
				style: {
					background: "none",
					border: `1px solid ${labelPrimary2}33`,
					borderRadius: 8,
					padding: "5px 12px",
					fontSize: 12,
					fontWeight: 600,
					cursor: busy ? "default" : "pointer",
					color: opts?.danger === true ? stateWarnPrimary1 : stateBusinessPrimary,
					opacity: busy ? .5 : 1
				},
				children: label
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: item.file || "media preview",
				headless: true,
				className: overlay_module_css_default.lightbox,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: seat,
					tabIndex: -1,
					style: {
						position: "relative",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 14,
						padding: 24,
						outline: "none"
					},
					onKeyDown: onKey,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-label": "Close preview",
							onClick: onClose,
							style: {
								position: "absolute",
								top: 8,
								right: 8,
								zIndex: 10,
								background: "none",
								border: "none",
								cursor: "pointer",
								fontSize: 20,
								lineHeight: 1,
								padding: "4px 6px",
								borderRadius: 6
							},
							children: "✕"
						}),
						canWalk ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-label": "Previous media",
							"data-testid": "drill-prev",
							onClick: () => {
								step(-1);
							},
							style: {
								position: "absolute",
								left: 10,
								top: "50%",
								transform: "translateY(-50%)",
								zIndex: 10,
								width: 40,
								height: 40,
								borderRadius: 999,
								cursor: "pointer",
								background: bgBase1,
								border: `1px solid ${labelPrimary2}33`,
								color: labelPrimary2,
								fontSize: 22,
								lineHeight: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								...atHead ? {
									opacity: .3,
									cursor: "default"
								} : {}
							},
							children: "‹"
						}) : null,
						canWalk ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-label": "Next media",
							"data-testid": "drill-next",
							disabled: atTail,
							onClick: () => {
								step(1);
							},
							style: {
								position: "absolute",
								right: 10,
								top: "50%",
								transform: "translateY(-50%)",
								zIndex: 10,
								width: 40,
								height: 40,
								borderRadius: 999,
								cursor: "pointer",
								background: bgBase1,
								border: `1px solid ${labelPrimary2}33`,
								color: labelPrimary2,
								fontSize: 22,
								lineHeight: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								...atTail ? {
									opacity: .3,
									cursor: "default"
								} : {}
							},
							children: "›"
						}) : null,
						item.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
							src: item.url,
							controls: true,
							autoPlay: true,
							playsInline: true,
							style: {
								width: "100%",
								maxHeight: "72vh",
								objectFit: "contain",
								borderRadius: 8,
								background: bgBase1
							}
						}) : item.kind === "audio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("audio", {
							src: item.url,
							controls: true,
							autoPlay: true,
							style: { width: "min(560px, 90vw)" }
						}) : item.kind === "model" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelView, {
							item,
							openArtifact
						}) : item.kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							src: item.url,
							alt: item.file,
							style: {
								width: "100%",
								maxHeight: "72vh",
								objectFit: "contain",
								borderRadius: 8
							}
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: labelPrimary2,
								fontSize: 13,
								maxWidth: "80vw",
								textAlign: "center",
								lineHeight: 1.5
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { fontWeight: 600 },
								children: item.head
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { opacity: .7 },
								children: [item.time, item.file].filter(Boolean).join(" · ")
							})]
						}),
						showActions ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								flexWrap: "wrap",
								justifyContent: "center"
							},
							onClick: (e) => {
								e.stopPropagation();
							},
							children: mode === "idle" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [canRename ? actionBtn("Rename", startRename, {
								testid: "drill-rename",
								aria: "Rename media file"
							}) : null, canDelete ? actionBtn("Delete", startDelete, {
								danger: true,
								testid: "drill-delete",
								aria: "Delete media file"
							}) : null] }) : mode === "confirmDelete" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										color: labelPrimary2,
										fontSize: 12
									},
									children: [
										"Delete ",
										item.file,
										"?"
									]
								}),
								actionBtn(busy ? "Deleting…" : "Confirm delete", confirmDelete, {
									danger: true,
									testid: "drill-delete-confirm",
									aria: "Confirm delete media file"
								}),
								actionBtn("Cancel", () => {
									setMode("idle");
									setOpError("");
								}, {
									testid: "drill-delete-cancel",
									aria: "Cancel delete"
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									"aria-label": "New file name",
									"data-testid": "drill-rename-input",
									value: draftName,
									disabled: busy,
									onChange: (e) => {
										setDraftName(e.target.value);
									},
									onKeyDown: (e) => {
										e.stopPropagation();
										if (e.key === "Enter") confirmRename();
										if (e.key === "Escape") {
											setMode("idle");
											setOpError("");
										}
									},
									style: {
										background: bgBase1,
										color: labelPrimary2,
										border: `1px solid ${labelPrimary2}33`,
										borderRadius: 8,
										padding: "5px 10px",
										fontSize: 12,
										width: "min(280px, 60vw)"
									}
								}),
								actionBtn(busy ? "Renaming…" : "Save", confirmRename, {
									testid: "drill-rename-save",
									aria: "Save new file name"
								}),
								actionBtn("Cancel", () => {
									setMode("idle");
									setOpError("");
								}, {
									testid: "drill-rename-cancel",
									aria: "Cancel rename"
								})
							] })
						}) : null,
						opError !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-testid": "drill-op-error",
							style: {
								color: stateWarnPrimary1,
								fontSize: 12
							},
							children: opError
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								color: textTertiary3,
								fontSize: 12
							},
							children: "Esc or click the mask to close"
						})
					]
				})
			});
		}
		//#endregion
		//#region ../../web-kit/contracts/src/benchStage.ts
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
		//#region ../../web-kit/contracts/src/benchSnapshot.ts
		function isRecord(v) {
			return typeof v === "object" && v !== null && !Array.isArray(v);
		}
		/** THE LOAD-CRITICAL ROW LAW (see the module doc). Returns the
		* row's problem, or null when the row loads. */
		function rowProblem(row, at) {
			if (!isRecord(row)) return `stages[${at}]: not an object`;
			const id = row["id"];
			if (typeof id !== "string" || id === "") return `stages[${at}]: id must be a non-empty string`;
			const params = row["params"];
			if (params !== void 0 && !isRecord(params)) return `stages[${at}]: params must be an object`;
			const inputs = row["inputs"];
			if (inputs !== void 0 && !isRecord(inputs)) return `stages[${at}]: inputs must be an object`;
			const engine = row["engine"];
			if (engine !== void 0 && typeof engine !== "string") return `stages[${at}]: engine must be a string`;
			const card = row["card"];
			if (card !== void 0 && typeof card !== "string") return `stages[${at}]: card must be a string`;
			const children = row["children"];
			if (children !== void 0 && !Array.isArray(children)) return `stages[${at}]: children must be an array`;
			return null;
		}
		/** Judge a stage list exactly as the loader consumes it. */
		function parseBenchSnapshotStages(value) {
			if (!Array.isArray(value)) return {
				ok: false,
				problems: ["stages: must be an array"]
			};
			const stages = [];
			const problems = [];
			for (let i = 0; i < value.length; i++) {
				const problem = rowProblem(value[i], i);
				if (problem !== null) problems.push(problem);
				else stages.push(value[i]);
			}
			if (problems.length > 0) return {
				ok: false,
				problems
			};
			return {
				ok: true,
				value: stages
			};
		}
		/** Judge a `bench_snapshot` body exactly as the loader consumes
		* it. A partial row set is NOT a pass — one bad row refuses the
		* whole snapshot (the loader posts the list whole; a silent
		* partial restore is the fabrication this contract exists to
		* kill). */
		function parseBenchSnapshot(value) {
			if (!isRecord(value)) return {
				ok: false,
				problems: ["bench_snapshot: not an object"]
			};
			const stages = parseBenchSnapshotStages(value["stages"]);
			if (!stages.ok) return {
				ok: false,
				problems: stages.problems.map((p) => `bench_snapshot.${p}`)
			};
			const intent = value["intent"];
			if (intent !== void 0 && typeof intent !== "string") return {
				ok: false,
				problems: ["bench_snapshot.intent: must be a string"]
			};
			const head = value["bench_head"];
			if (head !== void 0 && !isRecord(head)) return {
				ok: false,
				problems: ["bench_snapshot.bench_head: must be an object"]
			};
			return {
				ok: true,
				value: {
					stages: stages.value,
					intent: typeof intent === "string" ? intent : "",
					...head !== void 0 ? { bench_head: head } : {}
				}
			};
		}
		/** Judge a `card_snapshot` body exactly as the loader consumes it. */
		function parseCardSnapshot(value) {
			if (!isRecord(value)) return {
				ok: false,
				problems: ["card_snapshot: not an object"]
			};
			const card = value["card"];
			if (typeof card !== "string" || card === "") return {
				ok: false,
				problems: ["card_snapshot.card: must be a non-empty string"]
			};
			const params = value["params"];
			if (params !== void 0 && !isRecord(params)) return {
				ok: false,
				problems: ["card_snapshot.params: must be an object"]
			};
			return {
				ok: true,
				value: {
					card,
					params: isRecord(params) ? params : {}
				}
			};
		}
		//#endregion
		//#region src/client/bench-load.ts
		/**
		* bench-load — the restore gestures of the media plane (MediaPanel's
		* wand + its Flows face), 2026-09-10 (the bench rework's hunk 4: the
		* DECK_OPEN_WITH_DRAFT window seam retired with the deck takeover);
		* FULL PORT 2026-09-11 onto the gallery's routes + the CAS law.
		*
		* The gesture realizes "one shared state": a draft row click LOADS that
		* draft's stages onto THE BENCH (POST /v1/bench/ensure — the same load
		* wire melite_flow's bench verb rides; stages replace, the append-only
		* log records a load entry, undo restores) and then opens the cards
		* tab. The user refines on the bench — the same state the agent edits.
		*
		* THE CAS READ-MODIFY-WRITE (the door's own law, upgraded since the
		* original port): under persistent storage the shared bench SURVIVES
		* runs — a bare {stages} ensure on an existing bench refuses
		* bench/cas-conflict. Read the row first (GET /v1/bench/<session>); a
		* live bench's rev rides as expect_rev, a missing bench births (no
		* expect_rev — the only arm that may create).
		*
		* All wires are same-origin doors the host already serves; failures
		* surface as honest caller-side errors, never thrown past React.
		*/
		init_benchStage();
		/** One bench session key — 'main' only for unattributed seats
		*  (stroke 44: the bench belongs to the conversation; the gallery's
		*  load writes the ACTIVE session's bench, never a stranger's).
		*  THE ONE SPELLING (the li-ay stroke): the sanitize decision used
		*  to be this file's own function over the imported grammar; the
		*  decision now lives beside its grammar on the contract floor and
		*  every seat (this client, the cards tab, the agent tool) imports
		*  the same function. */
		/** The bench tab's address for one session (cross-plugin contract,
		* the estate-artifact pattern: client bundles cannot import across
		* plugins, so the form is restated with its definition site named —
		* cards-resource.ts's benchAddressOf). */
		function cardsBenchAddress(sessionId) {
			return "dsh-resource://cards/bench/" + benchSessionOf(sessionId);
		}
		/** The run tab's address (same contract; live runs open in the cards
		*  tab's run view — the wand restores through the bench address
		*  instead, so this twin stays for address-compat, pinned by the
		*  wall + the codec test). */
		function cardsRunAddress(runId) {
			return "dsh-resource://cards/run/" + encodeURIComponent(runId);
		}
		/** The run's own preview, stamped onto the restored stage (stroke
		*  45b, the operator's catch: the flow loaded but the card showed no
		*  image — a ran stage's result {run_id, url} IS the preview the
		*  cards tile renders; the media-sidebar audit 2026-09-22: the stamp
		*  was image-only, so every restored TTS / video / 3D card landed
		*  with NO preview). _flow.json.artifacts are absolute paths; the
		*  URL is the GALLERY'S OWN same-origin artifact route carrying the
		*  run-relative tail (the mask-recovery break's second half, live
		*  proof: /melite-media/* 502s 'estate-media/no-queue-seat' on a
		*  host without the queue seat, while /infer-gallery/artifact
		*  serves the same file 200 — the preview is a BROWSER <img>/<video>
		*  src, so it must ride the route that serves in THIS host; the
		*  engine-side PATH params keep /melite-media — different consumer,
		*  the engine's own lane). THE KIND UNION is the preview seam's own
		*  vocabulary, restated (client bundles cannot import across
		*  plugins — the parity site is named: melite-card-view's
		*  preview-kinds.ts previewKindFor). */
		function resultOfRun(flow, runId) {
			const arts = flow?.["artifacts"];
			if (!Array.isArray(arts)) return void 0;
			const isMedia = (a) => typeof a === "string" && mediaKindOf(a) !== void 0;
			const isVideo = (p) => mediaKindOf(p) === "video";
			const WINDOW_FILM = /_w\d+_\w+_?\.mp4$/i;
			const media = arts.filter(isMedia);
			if (media.length === 0) return void 0;
			const film = media.find((p) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(p) && !WINDOW_FILM.test(p));
			const video = media.find((p) => isVideo(p) && !WINDOW_FILM.test(p));
			const hero = film ?? video ?? media.find((p) => !WINDOW_FILM.test(p)) ?? media[0];
			const tailOf = runTailOf;
			const heroTail = tailOf(hero);
			if (heroTail === void 0) return void 0;
			const route = (tail) => "/infer-gallery/artifact?path=" + encodeURIComponent(tail);
			const artifacts = {};
			const assetUrls = [];
			for (const p of [hero, ...media.filter((m) => m !== hero)]) {
				const tail = tailOf(p);
				if (tail === void 0 || artifacts[tail] !== void 0) continue;
				artifacts[tail] = route(tail);
				assetUrls.push(route(tail));
			}
			return {
				run_id: runId,
				url: route(heroTail),
				artifacts,
				assetUrls
			};
		}
		/** The error message an !ok JSON response carries, else HTTP n. */
		async function refusalOf(res, answer) {
			const err = answer?.["error"];
			return typeof err === "string" && err !== "" ? err : "HTTP " + String(res.status);
		}
		/** Load one draft onto the bench and open the cards tab.
		*  @param draftId the drafts door's row id (never empty — callers gate).
		*  @param deps the open action + the error surface. */
		/** The shared load tail (stroke 45): stages onto THE conversation's
		*  bench (the CAS law — read rev, ensure with expect_rev, birth on
		*  miss) + open the cards tab on it. */
		async function loadStagesOntoBench(stages, intent, deps) {
			const BENCH_SESSION = benchSessionOf(deps.sessionId);
			try {
				let expectRev;
				const getRes = await fetch("/v1/bench/" + encodeURIComponent(BENCH_SESSION), { headers: { accept: "application/json" } });
				if (getRes.ok) {
					const rev = (await getRes.json().catch(() => null))?.["rev"];
					if (typeof rev === "number") expectRev = rev;
				}
				const ensureRes = await fetch("/v1/bench/ensure", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						session: BENCH_SESSION,
						author: "user",
						stages,
						intent,
						overwrite: true,
						...expectRev !== void 0 ? { expect_rev: expectRev } : {}
					})
				});
				const answer = await ensureRes.json().catch(() => null);
				if (!ensureRes.ok) {
					deps.onError("the bench refused the load (" + await refusalOf(ensureRes, answer) + ")");
					return;
				}
				deps.openResource(cardsBenchAddress(deps.sessionId));
			} catch (e) {
				deps.onError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
			}
		}
		/** Load one draft onto the bench and open the cards tab.
		*  @param draftId the drafts door's row id (never empty — callers gate).
		*  @param deps the open action + the error surface. */
		async function loadDraftOntoBench(draftId, deps) {
			try {
				const docRes = await fetch("/v1/flows/drafts/" + encodeURIComponent(draftId), { headers: { accept: "application/json" } });
				const doc = await docRes.json().catch(() => null);
				if (!docRes.ok || typeof doc !== "object" || doc === null) {
					deps.onError("could not read that card (" + await refusalOf(docRes, doc) + ")");
					return;
				}
				const stages = doc["stages"];
				const intent = doc["intent"];
				await loadStagesOntoBench(Array.isArray(stages) ? stages : [], typeof intent === "string" && intent !== "" ? intent : "restored draft", deps);
			} catch (e) {
				deps.onError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
			}
		}
		/** Load one RUN's card onto the bench and open the cards tab.
		*  WHY THE SIDECAR (2026-09-11, the wand proof): the cards tab's run
		*  view hydrates from `runs/status`, which reads the registry's LIVE
		*  runs only — every settled run answers `runs/unknown-run`, so a
		*  wand that merely opens `cards/run/<id>` lands on a failure frame
		*  for the whole archive. The gallery host's sidecar route names the
		*  producing draft for settled runs too, so the wand resolves the
		*  draft itself and rides the same bench-load every other gesture
		*  uses — the workflow is back on the bench before the cards tab
		*  opens, for live and settled runs alike.
		*  @param runId the runs door's row id (never empty — callers gate).
		*  @param deps the open action + the error surface. */
		async function loadRunOntoBench(runId, deps) {
			benchSessionOf(deps.sessionId);
			try {
				const sideRes = await fetch("/infer-gallery/flow?run_id=" + encodeURIComponent(runId), { headers: { accept: "application/json" } });
				const side = await sideRes.json().catch(() => null);
				if (!sideRes.ok || typeof side !== "object" || side === null) {
					deps.onError("that run keeps no readable sidecar (" + await refusalOf(sideRes, side) + ")");
					return;
				}
				const flow = side["flow"];
				const snap = typeof flow === "object" && flow !== null ? flow["card_snapshot"] : void 0;
				const benchSnap = typeof flow === "object" && flow !== null ? flow["bench_snapshot"] : void 0;
				if (typeof benchSnap === "object" && benchSnap !== null) {
					const parsedBench = parseBenchSnapshot(benchSnap);
					if (!parsedBench.ok) {
						deps.onError("this run keeps an unloadable bench snapshot (" + parsedBench.problems.join("; ") + ")");
						return;
					}
					const bs = parsedBench.value;
					const bsStages = bs.stages.map((st) => ({ ...st }));
					if (bsStages.length > 1) {
						const ranCard = typeof snap === "object" && snap !== null ? snap["card"] : void 0;
						const result = resultOfRun(flow, String(side["run_id"] ?? ""));
						for (const st of bsStages) {
							stripKeys(st, RESTORE_STRIP_KEYS);
							stripSelfNamedModel(st["card"], st["params"]);
							if (ranCard !== void 0 && st["card"] === ranCard && result !== void 0) st["result"] = result;
							st["provenance"] = RESTORED_PROVENANCE_SPELLING;
						}
						await loadStagesOntoBench(bsStages, (bs.intent !== "" ? bs.intent : "restored run").slice(0, 77), deps);
						return;
					}
				}
				if (typeof snap === "object" && snap !== null) {
					const parsedCard = parseCardSnapshot(snap);
					if (!parsedCard.ok) {
						deps.onError("this run keeps an unloadable card snapshot (" + parsedCard.problems.join("; ") + ")");
						return;
					}
					const card = parsedCard.value.card;
					const params = { ...parsedCard.value.params };
					delete params["draft_id"];
					delete params["test"];
					stripSelfNamedModel(card, params);
					const intentSrc = typeof params["prompt"] === "string" ? params["prompt"] : "restored run";
					const result = resultOfRun(flow, String(side["run_id"] ?? ""));
					const restoredCardRow = {
						...normalizeBenchStage({
							id: "s_0",
							card,
							params
						}, 0),
						provenance: RESTORED_PROVENANCE_SPELLING
					};
					if (result !== void 0) restoredCardRow["result"] = result;
					await loadStagesOntoBench([restoredCardRow], intentSrc.slice(0, 77), deps);
					return;
				}
				const request = side["request"];
				if (typeof request === "object" && request !== null && typeof request["model"] === "string") {
					const params = { ...request };
					delete params["draft_id"];
					delete params["test"];
					const result = resultOfRun(flow, String(side["run_id"] ?? ""));
					const restoredBareRow = {
						...normalizeBenchStage({
							id: "s_0",
							params
						}, 0),
						provenance: RESTORED_PROVENANCE_SPELLING
					};
					if (result !== void 0) restoredBareRow["result"] = result;
					await loadStagesOntoBench([restoredBareRow], "restored run", deps);
					return;
				}
				const flowDraft = typeof flow === "object" && flow !== null ? flow["draft_id"] : void 0;
				const topDraft = side["draft_id"];
				const draftId = typeof flowDraft === "string" && flowDraft !== "" ? flowDraft : typeof topDraft === "string" && topDraft !== "" ? topDraft : "";
				if (draftId.startsWith("bench-")) {
					deps.onError("that run was born on a living bench and keeps no snapshot — nothing to restore exactly");
					return;
				}
				if (draftId === "") {
					deps.onError("this run keeps no card record — nothing to restore");
					return;
				}
				await loadDraftOntoBench(draftId, deps);
			} catch (e) {
				deps.onError("bench load failed — " + (e instanceof Error ? e.message : String(e)));
			}
		}
		//#endregion
		//#region src/client/decode.ts
		const row = (v) => Array.isArray(v) ? v : [];
		function decodeRuns(json) {
			const d = json ?? {};
			const errors = row(d.errors);
			const runs = [];
			let dropped = 0;
			for (const raw of row(d.runs)) {
				const r = raw ?? {};
				if (typeof r.run_id !== "string" || r.run_id === "") {
					dropped += 1;
					continue;
				}
				runs.push(r);
			}
			if (dropped > 0) errors.push({
				gateway: "runs",
				message: "dropped " + String(dropped) + " rows without run_id (unkeyable)"
			});
			return {
				runs,
				errors
			};
		}
		function decodeDrafts(json) {
			const d = json ?? {};
			return {
				drafts: row(d.drafts),
				errors: row(d.errors)
			};
		}
		//#endregion
		//#region src/client/useFeed.ts
		/**
		* useFeed — the ONE fetch/load/never-stale engine for sidebar feeds
		* (audit F6: the runs and drafts feeds each carried a hand-copied
		* load + 15s-throttled visibility/focus refetch + error trio).
		*
		* decode validates at the door: it receives unknown JSON and returns the
		* typed feed; malformed shapes fall back to empty lists THERE, in one
		* place per feed, instead of Array.isArray sprinkles at render sites.
		*/
		/** Refetch when the page becomes visible / regains focus, throttled.
		* A new chat session does NOT reload the SPA — without this the panel
		* sits on hour-old data while fresh runs exist. */
		function useRefreshOnVisible(reload, throttleMs) {
			const ref = (0, react.useRef)(reload);
			ref.current = reload;
			(0, react.useEffect)(() => {
				let last = Date.now();
				const refresh = () => {
					if (Date.now() - last < throttleMs) return;
					last = Date.now();
					ref.current();
				};
				const onVis = () => {
					if (document.visibilityState === "visible") refresh();
				};
				document.addEventListener("visibilitychange", onVis);
				window.addEventListener("focus", refresh);
				return () => {
					document.removeEventListener("visibilitychange", onVis);
					window.removeEventListener("focus", refresh);
				};
			}, [throttleMs]);
		}
		function useFeed(url, decode, initial) {
			const [data, setData] = (0, react.useState)(initial);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)("");
			const load = (0, react.useCallback)(() => {
				setLoading(true);
				setError("");
				fetch(url).then(async (r) => {
					const json = await r.json();
					if (!r.ok) {
						const msg = json.error;
						throw new Error(typeof msg === "string" && msg !== "" ? msg : "HTTP " + String(r.status));
					}
					setData(decode(json));
				}).catch((e) => {
					setError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					setLoading(false);
				});
			}, [url, decode]);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			useRefreshOnVisible(load, 15e3);
			return {
				data,
				loading,
				error,
				reload: load,
				setData
			};
		}
		//#endregion
		//#region src/client/ui.tsx
		const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
		/** The stage every non-image tile/card sits on. */
		const gradientStage = `linear-gradient(160deg, ${bgLayer1} 0%, ${bgLayer2} 100%)`;
		/** Caption scrim over posters. */
		const gradientCaption = `linear-gradient(to top, ${fillSubtleCaption}, transparent)`;
		function PanelShell({ dataAttr, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				["data-" + dataAttr]: "1",
				style: {
					padding: 14,
					fontFamily: FONT,
					color: labelPrimary1,
					height: "100%",
					overflowY: "auto",
					boxSizing: "border-box"
				},
				children
			});
		}
		function Stat({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					fontSize: 11,
					color: labelSecondary2
				},
				children
			});
		}
		function SearchInput({ value, onChange, placeholder }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value,
				onChange: (e) => {
					onChange(e.target.value);
				},
				placeholder,
				style: { width: 170 }
			});
		}
		function RefreshButton({ loading, onClick }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick,
				disabled: loading,
				children: loading ? "loading…" : "refresh"
			});
		}
		function Empty({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: labelSecondary2,
					fontSize: 13,
					padding: 20
				},
				children
			});
		}
		function ErrorBanner({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: 14,
					borderRadius: 8,
					background: bgOverlay1,
					border: "1px solid var(--dsw-alias-state-error-primary, rgba(248,113,113,0.4))",
					fontSize: 13
				},
				children
			});
		}
		/** Per-gateway notes: transport failures, door drops and dedupe overlap
		* all ride the same errors channel — the message says which. */
		function GatewayErrors({ errors }) {
			if (errors.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: errors.map((e) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					fontSize: 11,
					color: stateWarnPrimary1,
					marginBottom: 4
				},
				children: [
					"gateway ",
					e.gateway,
					": ",
					e.message
				]
			}, e.gateway + e.message)) });
		}
		//#endregion
		//#region src/client/media-kinds.ts
		/**
		* Media kinds — the CLIENT plane's kind vocabulary, DERIVED from the
		* contract's mediaVocab() (the li-ay stroke, 2026-10-11).
		*
		* History: the deleted dsh-media package classified from its own
		* media-kinds.json; the 2026-09-11 full port carried a HAND COPY of
		* the vocabulary here ("parity-pinned" byte-equal by the wall — two
		* typed copies, zero drift, by assertion). The copy is dead: the
		* contract floor is importable from the browser (both planes build
		* on it), so the client DERIVES now — exts and gallery subsets come
		* from mediaVocab() itself, and only the UI LABELS are this file's
		* own (a label is presentation, not classification).
		*
		* The laws the data carries (from the original file's $comment,
		* preserved):
		*  - gallery = exts that LIST in the sidebar; exts = the full
		*    classifier. Gallery extras classify but do NOT list —
		*    deliberate, documented at the vocab, not scattered.
		*  - key order = classifier precedence (on a contradictory row the
		*    earlier kind wins: video beats image).
		*  - maxListedImages is the DOOR-tier cap (the estate serves it in
		*    the run row's truncated marker); the client's >20 frame-dump
		*    guard is the display-tier fallback, never the truncation law.
		*/
		/** The labels are the client's own; every EXTENSION LIST is the
		*  contract's vocabulary, verbatim, in the vocab's own order. */
		const LABELS = {
			video: "Video",
			image: "Images",
			audio: "Audio",
			model: "3D"
		};
		const GALLERY_KEY = {
			video: "galleryVideo",
			image: "galleryImage",
			audio: "galleryAudio",
			model: "galleryModel"
		};
		/** The client classifier's vocabulary (DERIVED — see header). */
		const MEDIA_KINDS = (() => {
			const vocab = mediaVocab();
			const kinds = {};
			for (const kind of [
				"video",
				"image",
				"audio",
				"model"
			]) kinds[kind] = {
				label: LABELS[kind],
				exts: vocab[kind],
				gallery: vocab[GALLERY_KEY[kind]]
			};
			return {
				kinds,
				policy: { maxListedImages: vocab.maxListedImages }
			};
		})();
		//#endregion
		//#region src/client/MediaPanel.tsx
		/**
		* MediaPanel — the native media archive tab (THE FULL PORT, 2026-09-11:
		* the deleted dsh-media package's panel, ported onto the gallery's own
		* host routes — every feature the migrations lost is here again).
		*
		* One grid over the gallery's runs route DIRECTLY (GET
		* /infer-gallery/runs, same-origin — the host rewrites run-relative
		* artifact names to its same-origin artifact route and serves the
		* 500-run window, the runs-window law). Everything renders with
		* NATIVE elements: <video controls autoPlay> in a fullscreen overlay,
		* <img>, <audio controls>. No iframe, no editor SPA dependency, no
		* asset-type resolver to fall through.
		*
		* Label law (operator-specified format):
		*   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
		* Runs with an empty prompt fall back to run name/flow.
		*/
		/** JSON key order = classifier precedence (video beats image on a contradictory row). */
		const KIND_ORDER = Object.keys(MEDIA_KINDS.kinds);
		const KIND_LABEL = Object.fromEntries(KIND_ORDER.map((k) => [k, MEDIA_KINDS.kinds[k].label]));
		const extRe = (exts) => new RegExp("\\.(" + exts.join("|") + ")(\\?|$)", "i");
		const KIND_RE = Object.fromEntries(KIND_ORDER.map((kind) => [kind, extRe(MEDIA_KINDS.kinds[kind].exts)]));
		/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
		const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i;
		/** Concatenated film = video WITHOUT a per-window suffix; window films
		*  carry it. THE REAL SPELLING (live proof, BRIEF4 2026-09-23):
		*  `<stem>_w<idx>_<seq>_.mp4` — the sequence rides a TRAILING
		*  UNDERSCORE before the extension; the old hash-then-dot pattern
		*  matched nothing, so windows classified as finals. */
		const WINDOW_FILM = /_w\d+_\w+_?\.mp4$/i;
		/** (D-C2, 2026-09-28: the `i` flag is not cosmetic — bench-load's
		* hero pick spelled the same law case-insensitively while this
		* listing filter did not, so an .MP4 window film classified as a
		* FINAL here while the hero skipped it. The media-sidebar wall's
		* one-spelling arm caught the drift; the two declarations are now
		* character-identical.) */
		/** Poster siblings rendered beside a film, keyed by artifact stem. */
		const POSTER_STEMS = [/^(.+)_last_frame\.png$/i, /^(.+)_poster\.png$/i];
		/** Classifier — kind ORDER comes from the SSOT's key order; the
		*  type field beats the URL, mime prefixes are the last resort. */
		function kindOf(a) {
			const t = a.type ?? "";
			const u = a.url ?? "";
			for (const kind of KIND_ORDER) if (t === kind) return kind;
			for (const kind of KIND_ORDER) if (KIND_RE[kind].test(u)) return kind;
			if (t.startsWith("video/")) return "video";
			if (t.startsWith("audio/") || t === "audio") return "audio";
			if (t.startsWith("image/")) return "image";
			return null;
		}
		/** params is UNTRUSTED wire data — only a structurally-validated
		* calls[0].text feeds tile labels (audit F8: the old raw cast trusted
		* any object shape). */
		function callsTextOf(params) {
			if (params == null || typeof params !== "object") return "";
			const calls = params.calls;
			if (!Array.isArray(calls) || calls.length === 0) return "";
			const text = calls[0]?.text;
			return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
		}
		/** The artifact's file name — THE ONE LAW (artifact-ops' resolver):
		*  an artifact-route URL's last path segment is the ROUTE's word, so
		*  reading the path named every artifact "artifact". */
		function baseName(u) {
			return artifactNameOf(u);
		}
		function timeLabel(sec) {
			if (typeof sec !== "number" || !Number.isFinite(sec) || sec <= 0) return "";
			try {
				return (/* @__PURE__ */ new Date(sec * 1e3)).toLocaleString(void 0, {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					hour12: false
				});
			} catch {
				return "";
			}
		}
		/** Flatten the runs feed into media tiles (poster map, frame-flood
		*  guard, dedup by url, label law, final-film-first sort tie-break). */
		function flatten(runs) {
			const items = [];
			const seen = /* @__PURE__ */ new Set();
			for (const run of runs) {
				const arts = Array.isArray(run.artifacts) ? run.artifacts : [];
				const posters = /* @__PURE__ */ new Map();
				for (const a of arts) {
					const n = a.name ?? baseName(a.url ?? "");
					const m = POSTER_STEMS.map((re) => n.match(re)).find((x) => x !== null);
					if (m !== void 0 && a.url) posters.set(m[1], a.url);
				}
				const dropFrames = arts.reduce((n, a) => kindOf(a) === "image" ? n + 1 : n, 0) > 20;
				for (const a of arts) {
					const kind = kindOf(a);
					const url = a.url ?? "";
					if (kind === null || url === "" || seen.has(url)) continue;
					seen.add(url);
					const file = a.name ?? baseName(url);
					if (dropFrames && kind === "image" && FRAME_DUMP.test(file)) continue;
					const stem = file.replace(/\.[^.]+$/, "");
					const prompt = String(run.prompt ?? "").replace(/\s+/g, " ").trim();
					const callsText = callsTextOf(run.params);
					const labelSrc = prompt !== "" ? prompt : (run.name ?? "") !== "" ? String(run.name) : callsText;
					const head = labelSrc !== "" ? "\"" + labelSrc.slice(0, 48) + (labelSrc.length > 48 ? "…" : "") + "\"" : String(run.flow ?? run.run_id ?? "");
					const isFinal = kind === "video" && !WINDOW_FILM.test(file);
					let poster = "";
					if (kind === "video") {
						poster = posters.get(stem) ?? (isFinal ? url : "");
						if (poster === "") poster = run.thumbnail ?? "";
					} else if (kind === "image") poster = url;
					items.push({
						id: url,
						kind,
						url,
						poster,
						head,
						final: isFinal,
						runId: String(run.run_id ?? ""),
						draftId: typeof run.draft_id === "string" ? run.draft_id : "",
						time: timeLabel(run.created_at),
						file,
						created: typeof run.created_at === "number" ? run.created_at : 0
					});
				}
			}
			items.sort((a, b) => b.created - a.created || Number(b.final) - Number(a.final));
			return items;
		}
		function Glyph({ kind, size = 26 }) {
			if (kind === "video") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2.5",
					y: "5",
					width: "13",
					height: "14",
					rx: "2.2",
					stroke: "currentColor",
					strokeWidth: "1.6"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M15.5 10.5 21 7.6v8.8l-5.5-2.9",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinejoin: "round"
				})]
			});
			if (kind === "audio") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10v4",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round"
				})
			});
			if (kind === "model") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinejoin: "round"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M12 12 20 7.4M12 12 4 7.4M12 12v9.2",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinejoin: "round"
				})]
			});
			if (kind === "image") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3.5",
						y: "4.5",
						width: "17",
						height: "15",
						rx: "2",
						stroke: "currentColor",
						strokeWidth: "1.6"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "m6 16 4.5-5.5 3 3.5L16 11l2.5 3",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "8.5",
						r: "1.3",
						fill: "currentColor"
					})
				]
			});
			return kind;
		}
		/** Tile badge rule — ONE place: a model tile always badges 3D,
		*  everything else badges nothing (the operator's order: the FINAL
		*  FILM tag is dead — a tile's preview IS its currency, never a
		*  status ribbon). */
		function badgeFor(item) {
			if (item.kind === "model") return {
				text: "3D",
				warn: false
			};
			return null;
		}
		/** The wand's face — a HISTORY glyph (the operator's order:
		*  no 'CARDS' text on the tile). The action is unchanged: restore
		*  this run's workflow onto the bench and open the cards tab. */
		function HistoryIcon({ size = 13 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.6 8.2A8 8 0 1 1 4 14",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M4.2 3.4v5h5",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M12 7.5V12l3.5 2",
						stroke: "currentColor",
						strokeWidth: "2",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				]
			});
		}
		function TileBadge({ item }) {
			const badge = badgeFor(item);
			if (badge === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					position: "absolute",
					left: 6,
					top: 6,
					background: badge.warn ? stateWarnPrimary2 : stateBusinessPrimaryBg2,
					color: badge.warn ? bgBase3 : stateBusinessPrimary,
					borderRadius: 5,
					padding: "2px 6px",
					fontSize: 9,
					fontWeight: 700,
					letterSpacing: .4
				},
				children: badge.text
			});
		}
		/** Image tiles sit on the base surface (no letterbox); everything else on
		*  the gradient stage — the shared token-backed gradient (ui.tsx), never
		*  a restated literal (the single-site token law). */
		function tileBgFor(kind) {
			if (kind === "image") return bgBase2;
			return gradientStage;
		}
		/**
		* The centered preview — DSH's Modal (headless), the FlowCards drilldown
		* ride verbatim: body portal, mask, Escape, aria-modal, and focus
		* handling are the primitive's, never ours. The 2026-09-10 operator
		* audit caught this as a handrolled portal (own keydown listener, own
		* fixed mask div, own z-index) — retired. Media sizing rides the
		* `.lightbox` class (overlay.module.css); inner flex + captions stay
		* as content styles. (THE LOST MODAL, restored with the full port —
		* the bare gallery opened a new browser tab instead.)
		*/
		function Overlay({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MediaDrilldown, {
				item,
				onClose,
				openArtifact: (drill) => {
					openArtifact(item);
				},
				siblings,
				onNavigate: (next) => {
					/* v8 ignore next 1 -- the walk item came FROM siblings; find-by-url always hits (probe 2026-09-20) */
					onNavigate(siblings.find((s) => s.url === next.url));
				},
				onDelete: (drill) => onDelete(item),
				onRename: (drill, name) => onRename(item, name)
			});
		}
		/** Sidebar tab glyph — exported for the (JSX-free) client entry. */
		function MediaTabIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "1.8",
						y: "3",
						width: "8.4",
						height: "10",
						rx: "1.4",
						stroke: "currentColor",
						strokeWidth: "1.3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M10.2 6.4 14 4.6v6.8l-3.8-1.8",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M3.6 5.4h1.6M3.6 8h1.6M3.6 10.6h1.6",
						stroke: "currentColor",
						strokeWidth: "1.1",
						strokeLinecap: "round"
					})
				]
			});
		}
		function MediaPanel({ useTabInfo, sessionId }) {
			const runsFeed = useFeed("/infer-gallery/runs", decodeRuns, {
				runs: [],
				errors: []
			});
			const draftsFeed = useFeed("/infer-gallery/drafts", decodeDrafts, {
				drafts: [],
				errors: []
			});
			const runs = runsFeed.data.runs;
			const gatewayErrors = runsFeed.data.errors;
			const drafts = draftsFeed.data.drafts;
			const loading = runsFeed.loading;
			const [uiError, setUiError] = (0, react.useState)("");
			const error = runsFeed.error !== "" ? runsFeed.error : uiError;
			const setError = setUiError;
			const [cat, setCat] = (0, react.useState)("all");
			const [search, setSearch] = (0, react.useState)("");
			const [preview, setPreview] = (0, react.useState)(null);
			const [tab, setTab] = (0, react.useState)("artifacts");
			const [sort, setSort] = (0, react.useState)("new");
			const tabInfo = useTabInfo !== void 0 ? useTabInfo() : void 0;
			/** Open one 3D artifact as the estate-artifact resource (ModelView). */
			const openArtifact = (item) => {
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setUiError("3D view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				open(estateArtifactAddress(item.url));
			};
			const load = runsFeed.reload;
			/** THE WAND (hunk 4, 2026-09-10; restore arm 2026-09-11;
			*  RUN-FIRST law, the media-sidebar audit 2026-09-22): "recover
			*  the cards that made this media" restores the run's workflow onto
			*  THE BENCH and opens the cards tab on it. NOT a bare run-address
			*  open: the run view hydrates from the registry's LIVE runs only,
			*  so settled runs land on `runs/unknown-run` — the wand resolves
			*  the run's OWN sidecar record first (stroke 45's law: the
			*  workflow that HAD that media — a live row draft serves whatever
			*  the draft holds NOW, which is wrong the moment the draft moved
			*  on). The row draft is the FALLBACK only: when the sidecar keeps
			*  no recoverable record but the draft still lives (a pruned run
			*  dir), the draft restores through the same bench CAS load. The
			*  window-global → DOM-claim → iframe relay it replaced
			*  (window.__meliteDeckOpenWithDraft) retired with the deck
			*  takeover. */
			const openCards = (item) => {
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setError("Media Flow view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				const deps = {
					openResource: open,
					onError: setError,
					sessionId
				};
				const canDraft = item.draftId !== "" && !item.draftId.startsWith("bench-");
				if (item.runId !== "") {
					const probed = [];
					let probeError = "";
					loadRunOntoBench(item.runId, {
						openResource: (address) => {
							probed.push(address);
						},
						onError: (message) => {
							probeError = message;
						},
						sessionId
					}).then(() => {
						if (probed.length > 0) {
							for (const address of probed) open(address);
							return;
						}
						if (canDraft) {
							loadDraftOntoBench(item.draftId, deps);
							return;
						}
						setError(probeError !== "" ? probeError : "this run keeps no card record — nothing to restore");
					});
					return;
				}
				if (canDraft) {
					loadDraftOntoBench(item.draftId, deps);
					return;
				}
				setError("this run keeps no card record — nothing to restore");
			};
			/** FLOW OPEN (hunk 4): a draft row loads onto THE BENCH (the shared
			*  state both authors edit) and opens the cards tab — bench-load.ts. */
			const openDraft = (draftId) => {
				if (draftId === "") return;
				const open = tabInfo?.tab.actions.openResource;
				if (open === void 0) {
					setError("Media Flow view unavailable — the sidebar tab service is not loaded.");
					return;
				}
				loadDraftOntoBench(draftId, {
					openResource: open,
					onError: setError,
					sessionId
				});
			};
			/** THE MODAL MUTATIONS (the mediasidebar's popup modal on media
			*  stuff): delete unlinks the artifact file then closes the modal
			*  and reloads the feed; rename re-points the open preview onto
			*  the door's answer and reloads behind it. Both throw LOUD for
			*  the drilldown's error face when the URL rides no gallery path
			*  or the door refuses. */
			const deleteItem = async (item) => {
				const target = artifactPathOfUrl(item.url);
				if (target === null) throw new Error("delete failed (not a gallery artifact — nothing to delete)");
				await deleteArtifact(target);
				setPreview(null);
				load();
			};
			const renameItem = async (item, name) => {
				const target = artifactPathOfUrl(item.url);
				if (target === null) throw new Error("rename failed (not a gallery artifact — nothing to rename)");
				const next = await renameArtifact(target, name);
				setPreview({
					...item,
					id: next.url,
					url: next.url,
					file: next.path.split("/").pop() ?? name
				});
				load();
			};
			const items = (0, react.useMemo)(() => flatten(runs), [runs]);
			const truncatedRuns = (0, react.useMemo)(() => runs.filter((r) => r.truncated !== void 0 && r.truncated.total > r.truncated.listed).length, [runs]);
			const counts = (0, react.useMemo)(() => {
				const c = {
					all: items.length,
					...Object.fromEntries(KIND_ORDER.map((k) => [k, 0]))
				};
				for (const it of items) c[it.kind] += 1;
				return c;
			}, [items]);
			const shown = (0, react.useMemo)(() => {
				const q = search.trim().toLowerCase();
				const out = items.filter((it) => {
					if (cat !== "all" && it.kind !== cat) return false;
					if (q === "") return true;
					return (it.head + " " + it.file + " " + it.time).toLowerCase().includes(q);
				});
				if (sort === "old") out.sort((a, b) => a.created - b.created);
				else if (sort === "name") out.sort((a, b) => a.file.localeCompare(b.file));
				return out;
			}, [
				items,
				cat,
				search,
				sort
			]);
			const chip = (c, label) => {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
					active: cat === c,
					onClick: () => {
						setCat(c);
					},
					children: [
						label,
						" ",
						counts[c]
					]
				}, c);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PanelShell, {
				dataAttr: "infer-media-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							flexWrap: "wrap",
							marginBottom: 10
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontWeight: 700,
									fontSize: 14
								},
								children: "Infer Media"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Stat, { children: [
								runs.length,
								" runs · ",
								items.length,
								" artifacts",
								gatewayErrors.length > 0 ? " · " + gatewayErrors.length + " gateway note" + (gatewayErrors.length > 1 ? "s" : "") : "",
								truncatedRuns > 0 ? " · " + truncatedRuns + " capped" : ""
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "flex",
									gap: 4
								},
								children: ["flows", "artifacts"].map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: tab === t,
									onClick: () => {
										setTab(t);
									},
									children: t === "flows" ? "Flows " + String(drafts.length) : "Artifacts " + String(items.length)
								}, t))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "flex",
									gap: 4
								},
								children: [
									["new", "Newest"],
									["old", "Oldest"],
									["name", "A–Z"]
								].map(([m, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: sort === m,
									onClick: () => {
										setSort(m);
									},
									children: label
								}, m))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchInput, {
								value: search,
								onChange: setSearch,
								placeholder: "search prompt, file…"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshButton, {
								loading,
								onClick: load
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 6,
							marginBottom: 12,
							flexWrap: "wrap"
						},
						children: [chip("all", "All"), KIND_ORDER.map((k) => chip(k, KIND_LABEL[k]))]
					}),
					tab === "flows" ? drafts.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "no composed cards yet — build one in a chat." }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-infer-media-drafts": "1",
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 6
						},
						children: drafts.map((d) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => {
								openDraft(d.draft_id ?? "");
							},
							"data-draft": d.draft_id,
							style: {
								display: "flex",
								alignItems: "center",
								gap: 10,
								textAlign: "left",
								border: "1px solid " + borderL2,
								borderRadius: 10,
								padding: "8px 12px",
								background: gradientStage,
								cursor: "pointer",
								color: labelPrimary1,
								fontFamily: "inherit"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 15,
										lineHeight: 0,
										color: stateWarnPrimary1
									},
									children: "▸"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										flex: 1,
										minWidth: 0,
										display: "flex",
										flexDirection: "column",
										gap: 2
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 13,
											fontWeight: 600,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: d.name || d.draft_id
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											fontSize: 10,
											fontFamily: "ui-monospace, monospace",
											color: labelSecondary2,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: [
											d.model || "card",
											" · ",
											d.draft_id
										]
									})]
								}),
								typeof d.source === "string" && d.source !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 9,
										color: textTertiary2,
										border: "1px solid " + borderL2,
										borderRadius: 6,
										padding: "2px 6px"
									},
									children: d.source.replace(/^https?:\/\//, "")
								}) : null
							]
						}, d.draft_id ?? Math.random()))
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GatewayErrors, { errors: gatewayErrors }),
					tab === "artifacts" && (error !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ErrorBanner, { children: ["failed to load runs: ", error] }) : loading && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "loading runs…" }) : shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Empty, { children: "no artifacts match." }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
							gap: 10
						},
						children: shown.map((it) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setPreview(it);
							},
							style: {
								position: "relative",
								aspectRatio: "16 / 9",
								borderRadius: 10,
								overflow: "hidden",
								border: "1px solid var(--dsw-alias-border-l2, rgba(148,163,184,0.25))",
								cursor: "pointer",
								padding: 0,
								background: tileBgFor(it.kind),
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))",
								textAlign: "left",
								fontFamily: "inherit"
							},
							children: [
								it.poster !== "" && it.kind !== "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									src: it.poster,
									alt: "",
									loading: "lazy",
									style: {
										position: "absolute",
										inset: 0,
										width: "100%",
										height: "100%",
										objectFit: "cover"
									}
								}) : it.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
									src: it.url,
									poster: it.poster !== "" && it.poster !== it.url ? it.poster : void 0,
									muted: true,
									playsInline: true,
									preload: "metadata",
									disablePictureInPicture: true,
									"aria-hidden": "true",
									tabIndex: -1,
									style: {
										position: "absolute",
										inset: 0,
										width: "100%",
										height: "100%",
										objectFit: "contain",
										pointerEvents: "none"
									}
								}) : null,
								it.kind === "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										position: "absolute",
										right: 6,
										bottom: 6,
										background: "var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))",
										borderRadius: 6,
										padding: 3,
										lineHeight: 0,
										color: "var(--dsw-alias-label-primary, #e2e8f0)"
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, {
										kind: "video",
										size: 14
									})
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TileBadge, { item: it }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: "Open as cards — this run, live in the cards tab",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "button",
										tabIndex: 0,
										className: overlay_module_css_default.wand,
										"aria-label": "Open as cards — this run",
										onClick: (e) => {
											e.stopPropagation();
											openCards(it);
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.stopPropagation();
												openCards(it);
											}
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HistoryIcon, {})
									})
								}),
								it.poster === "" && it.kind !== "video" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.55))" },
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { kind: it.kind })
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										position: "absolute",
										left: 0,
										right: 0,
										bottom: 0,
										padding: "16px 6px 4px",
										background: gradientCaption,
										fontSize: 10,
										lineHeight: 1.35,
										color: "var(--dsw-alias-label-primary, rgba(226,232,240,0.92))",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
										overflow: "hidden"
									},
									children: [it.head !== "" ? it.head + " — " : "", [it.time, it.file].filter(Boolean).join(" · ")]
								})
							]
						}, it.id))
					})),
					preview !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Overlay, {
						item: preview,
						onClose: () => {
							setPreview(null);
						},
						openArtifact,
						siblings: shown,
						onNavigate: (next) => {
							setPreview(next);
						},
						onDelete: deleteItem,
						onRename: renameItem
					}) : null
				]
			});
		}
		//#endregion
		//#region ../../web-kit/catalog/src/sleep.ts
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
		//#region ../../web-kit/catalog/src/clientStore.ts
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
						if (attempt < MAX_RETRIES && Date.now() < deadline) await sleep(backoffMs(attempt));
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
		//#region ../../web-kit/catalog/src/contractToast.ts
		/**
		* Wire the toast pusher the contract stores report through.
		* @param toast - the row's addToast (browser) or a test recorder.
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
		/** Subscribe to catalog readiness. Called when the catalog transitions from
		* null → populated. Returns an unsubscribe fn. */
		function onCatalogReady(fn) {
			return catalogStore.subscribe(() => {
				fn();
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
		function promptGuide(routeKey, cat = catalogStore.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf(routeKey, cat);
			if (!fam) return void 0;
			return cat.families[fam]?.prompt_guide ?? void 0;
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
			/* v8 ignore next -- module warm-load runs only in browser builds, where
			* MODE is "production"/"development"; under vitest MODE is always "test",
			* so the taken arm is unreachable here (2026-09-12). */
			if ({}.env?.MODE !== "test") ensureCatalog();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContractStore.ts
		/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
		*  outage that produced it, so the operator should also see WHEN it fired.
		*  24h local time, seconds resolution. */
		function _stamp() {
			return (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour12: false });
		}
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		*  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		*  (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog() {
			Promise.resolve().then(() => (init_modelCatalog(), modelCatalog_exports)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch(() => {});
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
					if (wasOutage) contractToast("info", `Catalog back online (at ${_stamp()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp()}):`, violations);
					set({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					contractToast("error", `Catalog contract violation — ${first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape"} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`, {
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
					contractToast("error", `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`, {
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
		*  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		*  whole protocol layer; the store only needs it on click. */
		function repoll(runId) {
			Promise.resolve().then(() => (init_FlowProtocol(), FlowProtocol_exports)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore.getState().clear()).catch(() => {});
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
		var useRunStatusContractStore;
		var init_runStatusContractStore = __esmMin((() => {
			init_clientStore();
			init_contractToast();
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
		//#region ../../web-kit/contracts/src/extraKeys.ts
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
			num("min");
			num("max");
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
				"min",
				"max",
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
			MEDIA_SET = ["video", "audio"];
			ZONE_SET = [
				"inputs",
				"params",
				"mods"
			];
			ROLE_SET = ["path"];
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/laneRelations.ts
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
		/** The effective surface for one (family × variant) lane: the
		*  family base plus the variant's additions (the cascade law —
		*  later layers add, never subtract). Null family params = the
		*  family declares no surface (the legacy card-authored truth). */
		function laneSurfaceOf(familyParams, variantParams) {
			if (familyParams === void 0 || familyParams === null) return null;
			if (variantParams === void 0 || variantParams === null) return [...familyParams];
			return [.../* @__PURE__ */ new Set([...familyParams, ...variantParams])];
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
				if (v.params === void 0 && v.relations === void 0 && v.bounds === void 0 && v.sampler_envelope === void 0) continue;
				variants[v.id] = {
					...v.params !== void 0 ? { params: [...v.params] } : {},
					...v.relations !== void 0 ? { relations: v.relations } : {},
					...v.bounds !== void 0 || v.sampler_envelope !== void 0 ? { bounds: envelopeBoundsOf(v.bounds, v.sampler_envelope) } : {},
					...v.sampler_envelope !== void 0 ? { sampler_envelope: v.sampler_envelope } : {}
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
		var RELATION_WORDS, quote;
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
		}));
		//#endregion
		//#region ../../web-kit/contracts/src/FlowTypes.ts
		var init_FlowTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/benchResult.ts
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
		//#region ../../web-kit/contracts/src/card.ts
		var init_card = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/character.ts
		var init_character = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/enhanceTypes.ts
		var init_enhanceTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/loraTypes.ts
		var init_loraTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/mediaTypes.ts
		var init_mediaTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/modifierFaces.ts
		var init_modifierFaces = __esmMin((() => {}));
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
		//#region ../../web-kit/contracts/src/regions.ts
		var init_regions = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/rootsManifest.ts
		/** §23 THE CROSS-ROOTS MANIFEST (2026-09-23): every run-resolving
		*  door (status/view/ledger/list — and, since the operator's law
		*  of the same night ("the agent maker and the user share
		*  EVERYTHING, THAT IS THE WHOLE POINT"), the ENGINE'S chained-
		*  input resolver too) searches the manifest IN ORDER — own root
		*  first (the fast path; own writes win), then the
		*  MELITE_STATE_ROOTS extras. The extras ride the same per-process
		*  env seam as MELITE_STATE_ROOT (the queue boot law refuses to
		*  guess from cwd — roots are named, never inferred):
		*  colon-separated, explicit per lane. Dedup keeps the first
		*  occurrence (own root always leads); blanks drop. Pure (env
		*  injectable) for the walls.
		*
		*  HOSTED IN CONTRACTS (the one package every plane sees): the
		*  estate queue reads it for its run doors, the ComfyUI engine
		*  reads it when staging a chained input — the maker lane's runs
		*  resolve on the user's lane and back. One law, one spelling. */
		function rootsManifest(ownRoot, env = process.env) {
			const extras = (env["MELITE_STATE_ROOTS"] ?? "").split(":").map((s) => s.trim()).filter((s) => s !== "");
			return [.../* @__PURE__ */ new Set([ownRoot, ...extras])];
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
		//#region ../../web-kit/contracts/src/stagePreview.ts
		var init_stagePreview = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/stageView.ts
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
		//#region ../../web-kit/contracts/src/studio.ts
		var init_studio = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/src/timelineTypes.ts
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
		//#region ../../web-kit/contracts/src/index.ts
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
			_cachedCount: () => _cachedCount,
			_resetBrowserStorageForTests: () => _resetBrowserStorageForTests,
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
			dataUrlToObjectUrl: () => dataUrlToObjectUrl,
			extraOf: () => extraOf,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			initBrowserStorage: () => initBrowserStorage,
			isDataUrl: () => isDataUrl,
			isLiveRunStatus: () => isLiveRunStatus,
			isProvenance: () => isProvenance,
			isTerminalStatus: () => isTerminalStatus,
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
			revokeAll: () => revokeAll,
			revokeObjectUrlFor: () => revokeObjectUrlFor,
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
			init_browserStorage();
			init_card();
			init_character();
			init_enhanceTypes();
			init_loraTypes();
			init_mediaTypes();
			init_modifierFaces();
			init_modifierSubcards();
			init_objectUrlCache();
			init_regions();
			init_rootsManifest();
			init_stagePreview();
			init_stageView();
			init_studio();
			init_timelineTypes();
			init_vocab();
			init_wire();
			init_benchStage();
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
			if (_cache && !opts?.force) return _cache;
			if (_inflight$1) return _inflight$1;
			_inflight$1 = (async () => {
				try {
					const data = await apiJson("/v1/flows/families/param-schemas");
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
					await sleep(intervalMs);
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
				await sleep(intervalMs);
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
			init_sleep();
			NON_JSON_BODY_CAP = 2e3;
			_requiredEmptyResolver = null;
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
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf(key) {
			return useTagMap.getState().map[key] ?? [];
		}
		var TagColor, TAG_COLOR_VALUES, TAG_COLOR_META, STORAGE_KEY, SYNC_DEBOUNCE_MS, serverSyncEnabled, syncTimer, initial, tagMapActions, useTagMap;
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
		//#region ../../web-kit/catalog/src/serviceForms.ts
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
					const data = await res.json();
					formsStore.setState({ cache: data?.forms ?? {} });
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
		//#region ../../web-kit/catalog/src/cardLlm.ts
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
		//#region ../../web-kit/catalog/src/familyProvenance.ts
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
		//#region ../../web-kit/catalog/src/index.ts
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
			promptGuide: () => promptGuide,
			readPickerModel: () => readPickerModel,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
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
		//#region src/client/index.ts
		init_src();
		setContractToastSink((type, message, action) => {
			_melite_card_base_client.useToastStore.getState().addToast(type, message, action);
		});
		/** The tab type's identity (the id its body registers under — the
		*  deleted package's contract spelling, restored). */
		const MEDIA_TAB_ID = "infer-media:media";
		/** The estate-artifact resource type's identity (its body registers under it). */
		const ESTATE_ARTIFACT_TAB_ID = "infer-media:estate-artifact";
		/** Required services (fiber inject waiting — the tab registry must be
		*  up first). */
		const inject = ["slots", "sidebarRightTabs"];
		/**
		* Client apply: claims the single application slot, then registers
		* the Media tab (type + body) exactly as the deleted client and the
		* shipped tabs do.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			if (!claimGalleryApply()) return;
			ctx.effect(() => releaseGalleryApply, "melite-gallery: apply claim");
			const tab = ctx;
			try {
				tab.effect(() => tab.sidebarRightTabs.register({
					id: MEDIA_TAB_ID,
					kind: "media",
					title: () => "Media",
					guide: [{
						id: "media-tab-guide",
						order: 51,
						title: () => "Media",
						description: () => "Every run's artifacts — the archive, with the lightbox, chips, search and the cards wand.",
						icon: MediaTabIcon
					}]
				}), "melite-gallery: media tab type");
			} catch (error) {
				console.error("[melite-gallery] media tab type registration failed:", error);
			}
			try {
				tab.slots.inject("sidebar.right.pane.tab", () => tab.slots.register({
					name: "sidebar.right.pane.tab",
					key: MEDIA_TAB_ID
				}, MediaPanel));
			} catch (error) {
				console.error("[melite-gallery] media tab body registration failed:", error);
			}
			try {
				tab.effect(() => tab.sidebarRightTabs.register({
					id: ESTATE_ARTIFACT_TAB_ID,
					kind: "estate-artifact",
					patterns: ["dsh-resource://estate-artifact/**"],
					priority: "builtin",
					title: (address) => {
						const url = artifactUrlOfAddress(address);
						return url !== null ? artifactNameOf(url) : "artifact";
					}
				}), "melite-gallery: estate-artifact tab type");
			} catch (error) {
				console.error("[melite-gallery] estate-artifact tab type registration failed:", error);
			}
			try {
				tab.slots.inject("sidebar.right.pane.tab", () => tab.slots.register({
					name: "sidebar.right.pane.tab",
					key: ESTATE_ARTIFACT_TAB_ID
				}, ArtifactTabBody));
			} catch (error) {
				console.error("[melite-gallery] estate-artifact tab body registration failed:", error);
			}
		}
		//#endregion
		exports.MEDIA_KINDS = MEDIA_KINDS;
		exports.MediaPanel = MediaPanel;
		exports.MediaTabIcon = MediaTabIcon;
		exports.apply = apply;
		exports.artifactPathOfUrl = artifactPathOfUrl;
		exports.callsTextOf = callsTextOf;
		exports.cardsBenchAddress = cardsBenchAddress;
		exports.cardsRunAddress = cardsRunAddress;
		exports.decodeDrafts = decodeDrafts;
		exports.decodeRuns = decodeRuns;
		exports.deleteArtifact = deleteArtifact;
		exports.flatten = flatten;
		exports.inject = inject;
		exports.kindOf = kindOf;
		exports.loadDraftOntoBench = loadDraftOntoBench;
		exports.loadRunOntoBench = loadRunOntoBench;
		exports.renameArtifact = renameArtifact;
		exports.useFeed = useFeed;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
