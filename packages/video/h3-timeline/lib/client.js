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
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _melite_card_base_client = require("@melite/card-base/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region ../../web-kit/formats/src/readFile.ts
		/**
		* readFile — THE one read path for every slot-shaped attach, ported
		* native from the retired kit's SlotSquare (2026-09-12, the kit
		* retirement). A plain FileReader promise — no UI dependency owns a
		* file read.
		*/
		/** Read a File / Blob and resolve its data: URL. */
		function readAsDataURL$3(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = () => reject(reader.error ?? /* @__PURE__ */ new Error("read failed"));
				reader.readAsDataURL(file);
			});
		}
		var init_readFile = __esmMin((() => {}));
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
		/** Fetch a same-origin artifact URL and re-encode it as a data URL
		*  (survived the unicananvas client purge 2026-08-21 — the ONE live
		*  export of that dead module; generic wire utility, so it lives with
		*  the transport). */
		async function urlToDataUrl(url, signal) {
			const res = await fetch(url, { signal });
			if (!res.ok) throw new Error(`Canvas artifact fetch failed: HTTP ${res.status} for ${url.slice(0, 200)}`);
			const blob = await res.blob();
			try {
				return await readAsDataURL$3(blob);
			} catch {
				throw new Error(`Failed to read ${url.slice(0, 200)} as data URL`);
			}
		}
		var MAX_RETRIES, BASE_MS, CAP_MS, OFFLINE_THRESHOLD, TOTAL_BUDGET_MS, SAFE_METHODS, GATEWAY_CODES, backendStore, consecutiveFail, inflight;
		var init_api = __esmMin((() => {
			init_readFile();
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
						field: members.find(stated) ?? members[0],
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
						field: everyMember.find(stated) ?? everyMember[0],
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
		*  dead code). */
		function artifactFileName(sourceUrl) {
			let pathname = sourceUrl;
			try {
				pathname = new URL(sourceUrl).pathname;
			} catch {
				pathname = sourceUrl.split("#")[0]?.split("?")[0] ?? sourceUrl;
			}
			if (pathname.endsWith("/")) return "";
			const last = pathname.split("/").filter((s) => s !== "").pop() ?? "";
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
		* order, de-duplicated.
		*/
		function crossRootOrder(ownTree, roots) {
			const out = [];
			for (const tree of [ownTree ?? "", ...roots]) {
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
		function recordOf$2(value) {
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
				const row = recordOf$2(entry);
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
				const row = recordOf$2(entry);
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
			const result = recordOf$2(value);
			const artifacts = {};
			for (const [name, url] of Object.entries(recordOf$2(result["artifacts"]))) {
				const clean = nonEmptyString(url);
				if (clean !== "") artifacts[name] = clean;
			}
			const assetUrls = stringsOf(result["assetUrls"]);
			const metadata = recordOf$2(result["metadata"]);
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
			for (const [slot, raw] of Object.entries(recordOf$2(value))) {
				const ref = recordOf$2(raw);
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
			const resolved = recordOf$2(row["resolved"]);
			const rowParams = recordOf$2(row["params"]);
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
			const resultRecord = recordOf$2(row["result"]);
			const metadata = recordOf$2(harvested?.metadata);
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
		var init_src$2 = __esmMin((() => {
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
		/**
		* Pick a specific frame from a PoseMotion's flat keypoints.
		* Clamps to valid range.
		*/
		function pickFrame(motion, idx) {
			const clamped = Math.max(0, Math.min(idx, motion.frame_count - 1));
			return motion.frames_flat[clamped];
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
			init_sleep();
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
		//#region ../../web-kit/catalog/src/uploadToEstate.ts
		function readUploadFile(file) {
			return readAsDataURL$3(file).catch(() => {
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
			CARD_LLM_KEY: () => CARD_LLM_KEY,
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
			cancelJob: () => cancelJob,
			canvasDefaultModel: () => canvasDefaultModel,
			cardLlmArg: () => cardLlmArg,
			clearPoseCache: () => clearPoseCache,
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
			formForSidebarKey: () => formForSidebarKey,
			formOf: () => formOf,
			formSidebarItems: () => formSidebarItems,
			formatLastRun: () => formatLastRun,
			generatePose: () => generatePose,
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
			narrowGenre: () => narrowGenre,
			onBackendState: () => onBackendState,
			onCatalogReady: () => onCatalogReady,
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
			setCardLlm: () => setCardLlm,
			setContractToastSink: () => setContractToastSink,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver,
			sliceFrameAsB64: () => sliceFrameAsB64,
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
			init_contractToast();
			init_catalogContract();
			init_catalogContractStore();
			init_modelCatalog();
			init_FlowProtocol();
			init_familyParamContract();
			init_tagMap();
			init_runStatusContractStore();
			init_runStatusContract();
			init_text_to_pose();
			init_serviceForms();
			init_waveform_peaks();
			init_cardBirth();
			init_enhance();
			init_cardLlm();
			init_familyProvenance();
			init_uploadToEstate();
		}));
		//#endregion
		//#region \0dsh-css:packages/video/h3-timeline/src/ui/studio/studio.module.css.mjs
		init_src$2();
		const css$1 = ".ezL1Ba_tabular{font-variant-numeric:tabular-nums}.ezL1Ba_nowrap{white-space:nowrap}.ezL1Ba_sz10{width:10px;height:10px}.ezL1Ba_sz12{width:12px;height:12px}.ezL1Ba_chev{flex:none;transition:transform .15s}details[open]>summary .ezL1Ba_chev{transform:rotate(180deg)}.ezL1Ba_ctlInput::placeholder{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_ctlInput:focus,.ezL1Ba_ctlSelect:focus,.ezL1Ba_selMenuBox:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_selMenuBox:disabled{opacity:.5}.ezL1Ba_studioRoot.ezL1Ba_studioRoot>:first-child{grid-area:1/1;min-width:0;min-height:0}.ezL1Ba_studioRoot.ezL1Ba_studioRoot>:nth-child(2){flex-direction:column;grid-area:1/2;min-width:0;min-height:0;display:flex;overflow:hidden}.ezL1Ba_studioRoot.ezL1Ba_studioRoot>:nth-child(3){grid-area:2/1/auto/-1;min-width:0;min-height:0;max-height:none;overflow:visible}.ezL1Ba_studioRoot{box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary);gap:8px;padding:12px}.ezL1Ba_railCol{flex-direction:column;gap:8px;min-width:0;height:100%;min-height:0;padding:10px 12px;display:flex;overflow:clip auto}.ezL1Ba_docBlock{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;min-width:0;padding-bottom:10px}.ezL1Ba_railCol>*{min-width:0}.ezL1Ba_docLines{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex-direction:column;gap:4px;padding:0 4px;font-size:10px;line-height:1.625;display:flex}.ezL1Ba_warnRow{color:var(--dsw-alias-state-warn-primary);align-items:flex-start;gap:4px;display:flex}.ezL1Ba_warnIcon{flex:none;margin-top:2px}.ezL1Ba_runFold{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none}.ezL1Ba_runSummary{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);cursor:pointer;user-select:none;align-items:center;gap:6px;padding:6px 0;font-size:10px;font-weight:600;list-style:none;display:flex}.ezL1Ba_runSummary::-webkit-details-marker{display:none}.ezL1Ba_runSummaryNote{text-transform:none;letter-spacing:normal;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:400}.ezL1Ba_runBody{flex-direction:column;gap:8px;padding-bottom:10px;display:flex}.ezL1Ba_panel{flex:none}.ezL1Ba_rowsHead{align-items:baseline;gap:6px;padding-bottom:4px;display:flex}.ezL1Ba_rowsTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}.ezL1Ba_rowsHint{color:var(--dsw-alias-label-tertiary);font-size:9px}.ezL1Ba_focusHead{align-items:center;gap:8px;padding-bottom:6px;display:flex}.ezL1Ba_backBtn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:6px;flex:none;align-items:center;gap:4px;padding:0 6px;font-size:10px;transition:color .15s,border-color .15s;display:flex}.ezL1Ba_backBtn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.ezL1Ba_focusTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);flex:none;font-size:10px;font-weight:600}.ezL1Ba_beatFlag{color:var(--dsw-alias-brand-primary);flex:none;font-size:9px}.ezL1Ba_compactList{flex-direction:column;gap:4px;display:flex}.ezL1Ba_focusList{flex-direction:column;gap:8px;display:flex}.ezL1Ba_callRow{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:left;cursor:pointer;border-radius:6px;align-items:center;gap:8px;width:100%;padding:6px 8px;transition:border-color .15s,background-color .15s;display:flex}.ezL1Ba_callRow:hover{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent)}.ezL1Ba_callIdx{text-transform:uppercase;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.ezL1Ba_excerpt{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:10px;overflow:hidden}.ezL1Ba_excerptFull{color:var(--dsw-alias-label-primary)}.ezL1Ba_excerptEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.ezL1Ba_knobBadge{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);text-transform:uppercase;color:var(--dsw-alias-brand-primary);border-radius:6px;flex:none;padding:0 4px;font-size:8px;font-weight:600}.ezL1Ba_callDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.ezL1Ba_kfPanel{border-top:1px solid var(--dsw-alias-border-l1);margin-top:8px;padding-top:6px}.ezL1Ba_kfHead{align-items:baseline;gap:6px;padding-bottom:4px;display:flex}.ezL1Ba_kfTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:600}.ezL1Ba_kfHint{color:var(--dsw-alias-label-tertiary);font-size:9px}.ezL1Ba_kfRow{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;align-items:center;gap:8px;padding:4px 8px;display:flex}.ezL1Ba_kfKind{text-transform:uppercase;letter-spacing:.06em;border-radius:6px;padding:2px 6px;font-size:9px;font-weight:600}.ezL1Ba_kfTime{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.ezL1Ba_kfDel{width:20px;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex:none;justify-content:center;align-items:center;transition:background-color .15s,color .15s;display:flex}.ezL1Ba_kfDel:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_textIn>input,.ezL1Ba_srcIn>input,.ezL1Ba_prevNum>input,.ezL1Ba_kfIn>input{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:2px 6px;font-size:10px;line-height:1.5}.ezL1Ba_textIn>input:focus,.ezL1Ba_srcIn>input:focus,.ezL1Ba_prevNum>input:focus,.ezL1Ba_kfIn>input:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_textInEmpty>input,.ezL1Ba_guideInEmpty>input{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);color:var(--dsw-alias-state-warn-primary)}.ezL1Ba_textInEmpty>input::placeholder,.ezL1Ba_guideInEmpty>input::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.ezL1Ba_textInEmpty>input:focus,.ezL1Ba_guideInEmpty>input:focus{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 70%, transparent)}.ezL1Ba_kfIn{flex:1;min-width:0;display:inline-flex}.ezL1Ba_kfIn>input::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.ezL1Ba_callCard{padding:6px 2px;transition:color .15s}.ezL1Ba_callCardSel .ezL1Ba_cardId,.ezL1Ba_callCardSel .ezL1Ba_cardSpan{color:var(--dsw-alias-label-primary)}.ezL1Ba_cardHead{align-items:center;gap:8px;padding-bottom:4px;display:flex}.ezL1Ba_cardId{text-transform:uppercase;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px;font-weight:600}.ezL1Ba_cardSpan{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:9px;overflow:hidden}.ezL1Ba_knobTag{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);border-radius:6px;flex:none;padding:1px 4px;font-size:8px;font-weight:600}.ezL1Ba_delBtn{border:1px solid var(--dsw-alias-border-l2);text-transform:uppercase;letter-spacing:.06em;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-radius:6px;flex:none;align-items:center;gap:4px;margin-left:auto;padding:0 6px;font-size:9px;transition:border-color .15s,background-color .15s,color .15s;display:flex}.ezL1Ba_delBtn:hover{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 60%, transparent);background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_spanRow{align-items:center;gap:6px;padding:4px 0;display:flex}.ezL1Ba_spanRow>span{min-width:0}.ezL1Ba_spanRow input{width:100%;max-width:100%}.ezL1Ba_spanLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:9px}.ezL1Ba_spanDash,.ezL1Ba_spanNote{color:var(--dsw-alias-label-tertiary);font-size:9px}.ezL1Ba_guidesRow{align-items:center;gap:8px;display:flex}.ezL1Ba_guideWrap{flex:none;position:relative}.ezL1Ba_guideDot{pointer-events:none;z-index:10;width:6px;height:6px;position:absolute;top:50%;left:6px;transform:translateY(-50%)rotate(45deg)}.ezL1Ba_guideRaw{width:7rem;color:var(--dsw-alias-label-primary);background:0 0;border:1px solid #0000;border-radius:6px;outline:none;flex:none;padding:2px 6px 2px 16px;font-family:inherit;font-size:10px}.ezL1Ba_guideRaw::placeholder{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_guideRaw:hover{border-color:var(--dsw-alias-border-l2)}.ezL1Ba_guideRaw:focus{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-interactive-bg-hover)}.ezL1Ba_guideInEmpty,.ezL1Ba_guideInEmpty::placeholder{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_callRefs{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:6px;padding:6px}.ezL1Ba_refCountOver{color:var(--dsw-alias-state-warn-primary)}.ezL1Ba_callRefsBody{flex-direction:column;gap:4px;margin-top:4px;display:flex}.ezL1Ba_knobFold{margin-top:4px}.ezL1Ba_knobSummary{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);cursor:pointer;user-select:none;align-items:center;gap:4px;font-size:9px;font-weight:600;list-style:none;display:flex}.ezL1Ba_knobSummary::-webkit-details-marker{display:none}.ezL1Ba_knobSummary:hover{color:var(--dsw-alias-label-secondary)}.ezL1Ba_knobCount{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);color:var(--dsw-alias-brand-primary);border-radius:6px;padding:0 4px;font-size:8px}.ezL1Ba_knobGrid{border-top:1px solid var(--dsw-alias-border-l1);grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 16px;margin-top:4px;padding-top:6px;display:grid}.ezL1Ba_knobGrid>*,.ezL1Ba_knobGrid label>span{min-width:0}.ezL1Ba_knobGrid input,.ezL1Ba_knobGrid select{max-width:100%}.ezL1Ba_knobGrid select,.ezL1Ba_seamRow>select{color-scheme:light}.ezL1Ba_beatsWrap{flex-direction:column;gap:4px;display:flex}.ezL1Ba_beatsWrap>*{min-width:0}.ezL1Ba_railCol input,.ezL1Ba_railCol select,.ezL1Ba_railCol textarea{box-sizing:border-box}.ezL1Ba_iconMini:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)}.ezL1Ba_iconMini:disabled{opacity:.3}.ezL1Ba_iconMiniMut:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.ezL1Ba_beatErr{color:var(--dsw-alias-state-error-primary);font-size:8px;line-height:1.25}.ezL1Ba_beatDel:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_textHead{justify-content:space-between;align-items:center;display:flex}.ezL1Ba_textLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px}.ezL1Ba_enhanceRow{align-items:center;gap:4px;display:flex}.ezL1Ba_enhanceBtn{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 4px;font-size:9px;font-weight:500;transition:background-color .15s}.ezL1Ba_enhanceBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)}.ezL1Ba_enhanceBtn:disabled{opacity:.3}.ezL1Ba_undoBtn{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:2px 4px;font-size:9px;transition:background-color .15s,color .15s}.ezL1Ba_undoBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.ezL1Ba_promptBox{resize:vertical;border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);width:100%;height:auto;min-height:2.25rem;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:4px 8px;font-size:11px;line-height:1.5}.ezL1Ba_promptBox::placeholder{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_promptBox:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_promptBoxEmpty{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);color:var(--dsw-alias-state-warn-primary)}.ezL1Ba_promptBoxEmpty::placeholder{color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent)}.ezL1Ba_promptBoxEmpty:focus{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 70%, transparent)}.ezL1Ba_linkBtn:hover{opacity:.8}.ezL1Ba_srcIn>input{font-size:10px}.ezL1Ba_srcIn>input::placeholder{color:var(--dsw-alias-label-tertiary);font-family:sans-serif}.ezL1Ba_fileErr{color:var(--dsw-alias-state-error-primary);font-size:8px;line-height:1.25}.ezL1Ba_linkClose:hover{color:var(--dsw-alias-label-primary)}.ezL1Ba_linkRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.ezL1Ba_seamRow{color:var(--dsw-alias-label-secondary);align-items:center;gap:4px;font-size:10px;line-height:1.25;display:flex}.ezL1Ba_seamRow>select{min-width:0;max-width:100%}.ezL1Ba_seamLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);flex:none}.ezL1Ba_prevLabel{flex-wrap:wrap;align-items:center;gap:4px;font-size:10px;line-height:1.25;display:flex}.ezL1Ba_prevLabelOn{color:var(--dsw-alias-label-secondary)}.ezL1Ba_prevLabelOff{cursor:not-allowed;color:var(--dsw-alias-label-tertiary)}.ezL1Ba_prevNum{flex:none;width:3rem;display:inline-flex}.ezL1Ba_prevNum>input{border:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);text-align:center;width:100%;font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:1px 4px;font-size:10px}.ezL1Ba_prevNum9>input{font-size:9px}.ezL1Ba_prevNum>input:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_prevNote{width:100%;color:var(--dsw-alias-label-tertiary);font-size:8px}.ezL1Ba_refRow{flex-direction:column;gap:2px;display:flex}.ezL1Ba_chips{flex-wrap:wrap;gap:4px;display:flex}.ezL1Ba_declaredChip{border:1px dashed var(--dsw-alias-border-l2);min-width:0;max-width:100%;color:var(--dsw-alias-label-secondary);border-radius:6px;align-items:center;gap:4px;padding:2px 6px 2px 2px;font-size:9px;display:inline-flex}.ezL1Ba_declaredThumb{object-fit:cover;border-radius:4px;flex:none;width:24px;height:24px}.ezL1Ba_declaredName{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.ezL1Ba_declaredTag{text-transform:uppercase;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:8px}.ezL1Ba_redundantRow{border:1px dotted var(--dsw-alias-border-l2);min-width:0;max-width:100%;color:var(--dsw-alias-label-secondary);border-radius:6px;align-items:center;gap:4px;padding:2px 2px 2px 6px;font-size:9px;display:inline-flex}.ezL1Ba_redundantName{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.ezL1Ba_redundantX{cursor:pointer;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:4px;flex:none;padding:1px 5px;font-size:11px;line-height:1}.ezL1Ba_busAnchor{flex-direction:column;gap:2px;min-width:0;display:flex}.ezL1Ba_chipX:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.ezL1Ba_pickSelBoxOk:focus{border-color:var(--dsw-alias-brand-primary)}.ezL1Ba_uploadBtn:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}.ezL1Ba_group{flex-direction:column;gap:6px;display:flex}.ezL1Ba_groupTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.ezL1Ba_winSize{align-items:center;gap:4px;display:flex}.ezL1Ba_times{color:var(--dsw-alias-label-tertiary)}.ezL1Ba_clipsRow{align-items:center;gap:8px;display:flex}.ezL1Ba_clipsTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);flex:none;font-size:10px;font-weight:600}.ezL1Ba_clipsNote{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;font-size:10px;overflow:hidden}.ezL1Ba_clipsHint{color:var(--dsw-alias-label-tertiary);opacity:.85;font-size:10px}.ezL1Ba_filmBox{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;flex-direction:column;flex:1;min-height:0;padding:8px 10px;display:flex}.ezL1Ba_histRow{flex-wrap:wrap;flex:none;align-items:center;gap:4px;padding-bottom:6px;display:flex}.ezL1Ba_histTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.ezL1Ba_histChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);font-family:var(--dsw-alias-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 6px;font-size:9px;text-decoration:none;transition:border-color .15s,color .15s}.ezL1Ba_histChip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.ezL1Ba_heroRow{flex:1;align-items:center;gap:8px;min-height:0;padding-bottom:4px;display:flex;overflow-x:auto}.ezL1Ba_finalCut{box-sizing:border-box;border:1px solid var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent);min-width:0;height:100%;box-shadow:0 0 18px -6px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);border-radius:6px;flex-direction:column;flex:1;gap:4px;padding:6px;display:flex}.ezL1Ba_player{object-fit:contain;background:color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);border-radius:6px;flex:1;width:100%;height:100%;min-height:0}.ezL1Ba_cutBar{align-items:center;gap:4px;padding:0 2px;display:flex}.ezL1Ba_cutIcon{width:12px;height:12px;color:var(--dsw-alias-brand-primary);flex:none}.ezL1Ba_cutTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:500}.ezL1Ba_cutTime{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);margin-left:4px;font-size:9px}.ezL1Ba_cutOpen{color:var(--dsw-alias-brand-primary);text-underline-offset:2px;margin-left:auto;font-size:9px}.ezL1Ba_cutOpen:hover{text-decoration:underline}.ezL1Ba_winTile{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;flex-direction:column;flex:none;gap:4px;width:9rem;height:100%;padding:6px;transition:border-color .15s;display:flex}.ezL1Ba_winTile:hover{border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent)}.ezL1Ba_winVid{background:color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);object-fit:cover;border-radius:6px;flex:1;width:100%;min-height:0}.ezL1Ba_winName{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);padding:0 2px;font-size:9px;overflow:hidden}.ezL1Ba_emptyGlyph{width:20px;height:20px;color:var(--dsw-alias-label-tertiary)}.ezL1Ba_laneInspector{border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 25%, transparent);flex-direction:column;gap:4px;padding:6px 0 2px;display:flex}.ezL1Ba_laneRow{align-items:center;gap:6px;display:flex}.ezL1Ba_laneName{text-overflow:ellipsis;white-space:nowrap;max-width:160px;color:var(--dsw-alias-label-secondary);flex:none;font-size:10px;overflow:hidden}.ezL1Ba_laneSelect{border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 40%, transparent);color:var(--dsw-alias-label-primary);background:0 0;border-radius:4px;flex:none;padding:1px 4px;font-size:10px}.ezL1Ba_laneText{border:1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 40%, transparent);min-width:120px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:4px;flex:1;padding:2px 6px;font-size:10px}.ezL1Ba_laneDelete{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;flex:none;padding:0 4px;font-size:12px}.ezL1Ba_laneDelete:hover{color:var(--dsw-alias-state-danger-primary)}.ezL1Ba_blockerWrap{display:block}.ezL1Ba_laneBlocker{border:1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);color:var(--dsw-alias-label-primary);border-radius:8px;margin-bottom:6px;padding:6px 10px;font-size:11px;line-height:1.45}.ezL1Ba_gateFace{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;font-size:11px;line-height:1.45}";
		const tagId$1 = "@melite/video-h3-timeline/studio.module.css@bcd5147f";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var studio_module_css_default = {
			"backBtn": "ezL1Ba_backBtn",
			"beatDel": "ezL1Ba_beatDel",
			"beatErr": "ezL1Ba_beatErr",
			"beatFlag": "ezL1Ba_beatFlag",
			"beatsWrap": "ezL1Ba_beatsWrap",
			"blockerWrap": "ezL1Ba_blockerWrap",
			"busAnchor": "ezL1Ba_busAnchor",
			"callCard": "ezL1Ba_callCard",
			"callCardSel": "ezL1Ba_callCardSel",
			"callDur": "ezL1Ba_callDur",
			"callIdx": "ezL1Ba_callIdx",
			"callRefs": "ezL1Ba_callRefs",
			"callRefsBody": "ezL1Ba_callRefsBody",
			"callRow": "ezL1Ba_callRow",
			"cardHead": "ezL1Ba_cardHead",
			"cardId": "ezL1Ba_cardId",
			"cardSpan": "ezL1Ba_cardSpan",
			"chev": "ezL1Ba_chev",
			"chipX": "ezL1Ba_chipX",
			"chips": "ezL1Ba_chips",
			"clipsHint": "ezL1Ba_clipsHint",
			"clipsNote": "ezL1Ba_clipsNote",
			"clipsRow": "ezL1Ba_clipsRow",
			"clipsTitle": "ezL1Ba_clipsTitle",
			"compactList": "ezL1Ba_compactList",
			"ctlInput": "ezL1Ba_ctlInput",
			"ctlSelect": "ezL1Ba_ctlSelect",
			"cutBar": "ezL1Ba_cutBar",
			"cutIcon": "ezL1Ba_cutIcon",
			"cutOpen": "ezL1Ba_cutOpen",
			"cutTime": "ezL1Ba_cutTime",
			"cutTitle": "ezL1Ba_cutTitle",
			"declaredChip": "ezL1Ba_declaredChip",
			"declaredName": "ezL1Ba_declaredName",
			"declaredTag": "ezL1Ba_declaredTag",
			"declaredThumb": "ezL1Ba_declaredThumb",
			"delBtn": "ezL1Ba_delBtn",
			"docBlock": "ezL1Ba_docBlock",
			"docLines": "ezL1Ba_docLines",
			"emptyGlyph": "ezL1Ba_emptyGlyph",
			"enhanceBtn": "ezL1Ba_enhanceBtn",
			"enhanceRow": "ezL1Ba_enhanceRow",
			"excerpt": "ezL1Ba_excerpt",
			"excerptEmpty": "ezL1Ba_excerptEmpty",
			"excerptFull": "ezL1Ba_excerptFull",
			"fileErr": "ezL1Ba_fileErr",
			"filmBox": "ezL1Ba_filmBox",
			"finalCut": "ezL1Ba_finalCut",
			"focusHead": "ezL1Ba_focusHead",
			"focusList": "ezL1Ba_focusList",
			"focusTitle": "ezL1Ba_focusTitle",
			"gateFace": "ezL1Ba_gateFace",
			"group": "ezL1Ba_group",
			"groupTitle": "ezL1Ba_groupTitle",
			"guideDot": "ezL1Ba_guideDot",
			"guideInEmpty": "ezL1Ba_guideInEmpty",
			"guideRaw": "ezL1Ba_guideRaw",
			"guideWrap": "ezL1Ba_guideWrap",
			"guidesRow": "ezL1Ba_guidesRow",
			"heroRow": "ezL1Ba_heroRow",
			"histChip": "ezL1Ba_histChip",
			"histRow": "ezL1Ba_histRow",
			"histTitle": "ezL1Ba_histTitle",
			"iconMini": "ezL1Ba_iconMini",
			"iconMiniMut": "ezL1Ba_iconMiniMut",
			"kfDel": "ezL1Ba_kfDel",
			"kfHead": "ezL1Ba_kfHead",
			"kfHint": "ezL1Ba_kfHint",
			"kfIn": "ezL1Ba_kfIn",
			"kfKind": "ezL1Ba_kfKind",
			"kfPanel": "ezL1Ba_kfPanel",
			"kfRow": "ezL1Ba_kfRow",
			"kfTime": "ezL1Ba_kfTime",
			"kfTitle": "ezL1Ba_kfTitle",
			"knobBadge": "ezL1Ba_knobBadge",
			"knobCount": "ezL1Ba_knobCount",
			"knobFold": "ezL1Ba_knobFold",
			"knobGrid": "ezL1Ba_knobGrid",
			"knobSummary": "ezL1Ba_knobSummary",
			"knobTag": "ezL1Ba_knobTag",
			"laneBlocker": "ezL1Ba_laneBlocker",
			"laneDelete": "ezL1Ba_laneDelete",
			"laneInspector": "ezL1Ba_laneInspector",
			"laneName": "ezL1Ba_laneName",
			"laneRow": "ezL1Ba_laneRow",
			"laneSelect": "ezL1Ba_laneSelect",
			"laneText": "ezL1Ba_laneText",
			"linkBtn": "ezL1Ba_linkBtn",
			"linkClose": "ezL1Ba_linkClose",
			"linkRow": "ezL1Ba_linkRow",
			"nowrap": "ezL1Ba_nowrap",
			"panel": "ezL1Ba_panel",
			"pickSelBoxOk": "ezL1Ba_pickSelBoxOk",
			"player": "ezL1Ba_player",
			"prevLabel": "ezL1Ba_prevLabel",
			"prevLabelOff": "ezL1Ba_prevLabelOff",
			"prevLabelOn": "ezL1Ba_prevLabelOn",
			"prevNote": "ezL1Ba_prevNote",
			"prevNum": "ezL1Ba_prevNum",
			"prevNum9": "ezL1Ba_prevNum9",
			"promptBox": "ezL1Ba_promptBox",
			"promptBoxEmpty": "ezL1Ba_promptBoxEmpty",
			"railCol": "ezL1Ba_railCol",
			"redundantName": "ezL1Ba_redundantName",
			"redundantRow": "ezL1Ba_redundantRow",
			"redundantX": "ezL1Ba_redundantX",
			"refCountOver": "ezL1Ba_refCountOver",
			"refRow": "ezL1Ba_refRow",
			"rowsHead": "ezL1Ba_rowsHead",
			"rowsHint": "ezL1Ba_rowsHint",
			"rowsTitle": "ezL1Ba_rowsTitle",
			"runBody": "ezL1Ba_runBody",
			"runFold": "ezL1Ba_runFold",
			"runSummary": "ezL1Ba_runSummary",
			"runSummaryNote": "ezL1Ba_runSummaryNote",
			"seamLabel": "ezL1Ba_seamLabel",
			"seamRow": "ezL1Ba_seamRow",
			"selMenuBox": "ezL1Ba_selMenuBox",
			"spanDash": "ezL1Ba_spanDash",
			"spanLabel": "ezL1Ba_spanLabel",
			"spanNote": "ezL1Ba_spanNote",
			"spanRow": "ezL1Ba_spanRow",
			"srcIn": "ezL1Ba_srcIn",
			"studioRoot": "ezL1Ba_studioRoot",
			"sz10": "ezL1Ba_sz10",
			"sz12": "ezL1Ba_sz12",
			"tabular": "ezL1Ba_tabular",
			"textHead": "ezL1Ba_textHead",
			"textIn": "ezL1Ba_textIn",
			"textInEmpty": "ezL1Ba_textInEmpty",
			"textLabel": "ezL1Ba_textLabel",
			"times": "ezL1Ba_times",
			"undoBtn": "ezL1Ba_undoBtn",
			"uploadBtn": "ezL1Ba_uploadBtn",
			"warnIcon": "ezL1Ba_warnIcon",
			"warnRow": "ezL1Ba_warnRow",
			"winName": "ezL1Ba_winName",
			"winSize": "ezL1Ba_winSize",
			"winTile": "ezL1Ba_winTile",
			"winVid": "ezL1Ba_winVid"
		};
		const REF_CAPS = {
			images: 8,
			videos: 3,
			audios: 3
		};
		function transitionOverlap(transition) {
			return transition === "cut" ? 0 : 22;
		}
		function gridSnap(length) {
			const k = Math.round((length - 22) / 17);
			return Math.min(362, Math.max(22, 22 + 17 * k));
		}
		/** THE GRID PREDICATE, one owner: a length the engine can render is
		*  22+17k inside [22,362]. Every refusal door asks this question, so
		*  knob pins, single windows, cut windows, and carried windows cannot
		*  drift into different laws. */
		function isGridLength(length) {
			return Number.isInteger(length) && length >= 22 && length <= 362 && (length - 22) % 17 === 0;
		}
		function deliveredFrames(call, index) {
			const span = call.end_frame - call.start_frame;
			if (index === 0 || call.transition === "cut") return span;
			return Math.max(0, span - 22);
		}
		function splitRefList(value) {
			if (!value) return [];
			const out = [];
			let i = 0;
			while (i < value.length) {
				while (i < value.length && (value[i] === "," || value[i] === " " || value[i] === "	")) i++;
				if (i >= value.length) break;
				const start = i;
				const isData = value.startsWith("data:", i);
				let mimeComma = false;
				while (i < value.length) {
					if (value[i] === ",") {
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
				while (end > start && (value[end - 1] === " " || value[end - 1] === "	")) end--;
				out.push(value.slice(start, end));
			}
			return out;
		}
		function normalizeDeclaredRefs(value) {
			if (Array.isArray(value)) return value.filter((entry) => typeof entry === "string" && entry.trim() !== "");
			if (typeof value === "string") return splitRefList(value);
			return [];
		}
		function joinRefList(value) {
			if (Array.isArray(value)) {
				const entries = value.map(String).map((entry) => entry.trim()).filter(Boolean);
				return entries.length > 0 ? entries.join(", ") : void 0;
			}
			if (typeof value === "string" && value.trim()) return value.trim();
		}
		function mergeDeclaredRefs(declared, perCall) {
			return [...declared, ...perCall.filter((entry) => !declared.includes(entry))];
		}
		function refGenreOf(name, url) {
			const lowerName = name.toLowerCase();
			if (/^video_w\d+_/.test(lowerName)) {
				if (lowerName.endsWith("_last_frame") || lowerName.includes("_prev")) return "image";
				return "video";
			}
			const extension = `${lowerName} ${url ? url.toLowerCase().split("?")[0] : ""}`.split(".").pop().split(/[^a-z0-9]/)[0];
			if ([
				"png",
				"jpg",
				"jpeg",
				"webp",
				"gif",
				"bmp",
				"avif"
			].includes(extension)) return "image";
			if ([
				"mp4",
				"webm",
				"mov",
				"mkv",
				"avi",
				"m4v"
			].includes(extension)) return "video";
			if ([
				"mp3",
				"wav",
				"flac",
				"ogg",
				"m4a",
				"aac",
				"opus"
			].includes(extension)) return "audio";
			return "other";
		}
		const KNOB_ORDER = [
			"steps",
			"denoise",
			"sampler_name",
			"sched_name",
			"shift_video",
			"shift_audio",
			"sla_sparsity",
			"sla_block_size",
			"sla_min_seq_len",
			"sla_dense_last_steps",
			"sla_protect_audio",
			"sla_stabilize_motion",
			"sla_reference_protection",
			"sla_dense_backend",
			"sla_dense_steps",
			"sla_disable_fp16_accum",
			"sharpen_enabled",
			"sharpen_method",
			"sharpen_strength",
			"sharpen_radius",
			"sharpen_threshold",
			"sharpen_iterations",
			"interpolate_enabled",
			"interp_model",
			"interp_multiplier",
			"length"
		];
		const CALL_KNOB_KEYS = new Set(KNOB_ORDER);
		const LEGACY_KNOB_KEY = {
			sampling_steps: "steps",
			sampler: "sampler_name",
			scheduler: "sched_name",
			h3_sla_sparsity: "sla_sparsity",
			h3_sla_block_size: "sla_block_size",
			h3_sla_min_seq_len: "sla_min_seq_len",
			h3_sla_dense_last_steps: "sla_dense_last_steps",
			h3_sla_protect_audio: "sla_protect_audio",
			h3_sla_stabilize_motion: "sla_stabilize_motion",
			h3_sla_reference_protection: "sla_reference_protection",
			h3_sla_dense_backend: "sla_dense_backend",
			h3_sla_dense_steps: "sla_dense_steps",
			h3_sla_disable_fp16_accum: "sla_disable_fp16_accum",
			interpolate_model: "interp_model",
			interpolate_multiplier: "interp_multiplier"
		};
		function migrateCallKnobKey(key) {
			return LEGACY_KNOB_KEY[key] ?? key;
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
		//#region ../../web-kit/timeline/timeline/MotionTimelineBarLayout.ts
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
		//#endregion
		//#region ../../web-kit/timeline/timeline/MotionTimelineBarScale.ts
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
		//#region ../../web-kit/timeline/timeline/MotionTimelineBarDrag.ts
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
		//#region ../../web-kit/timeline/timeline/icons.tsx
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
		//#region \0dsh-css:packages/web-kit/timeline/timeline/timeline.module.css.mjs
		const css = ".sBOb7W_root{user-select:none;display:flex}.sBOb7W_gutter{border-right:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;display:flex}.sBOb7W_zoomRow{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:center;align-items:center;gap:2px;display:flex}.sBOb7W_zoomBtn{width:20px;height:20px;color:var(--dsw-alias-label-secondary);font-size:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}.sBOb7W_zoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary)}.sBOb7W_zoomBtn svg{width:14px;height:14px}.sBOb7W_zoomPct{min-width:32px;height:auto;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}.sBOb7W_zoomPct:hover{color:var(--dsw-alias-brand-primary)}.sBOb7W_laneHead,.sBOb7W_laneHeadBeats{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);align-items:center;gap:6px;padding:0 8px;display:flex}.sBOb7W_laneHead>svg,.sBOb7W_laneHeadBeats>svg{width:14px;height:14px;color:var(--dsw-alias-brand-primary);flex:none}.sBOb7W_laneHeadBeats>svg{color:var(--dsw-alias-brand-primary)}.sBOb7W_gutterLabel{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.sBOb7W_audioHead{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.sBOb7W_audioHead>svg{width:12px;height:12px;color:var(--dsw-alias-state-business-primary);flex:none}.sBOb7W_gutterLabelDim{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.sBOb7W_detachBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;padding:0;display:inline-flex}.sBOb7W_detachBtn:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.sBOb7W_detachBtn svg{width:10px;height:10px}.sBOb7W_uploadBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.sBOb7W_uploadBtn:hover{background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 14%, transparent);color:var(--dsw-alias-label-primary)}.sBOb7W_uploadBtn svg{width:10px;height:10px}.sBOb7W_laneRow{border-bottom:1px solid var(--dsw-alias-border-l1);align-items:center;gap:6px;padding:0 8px;display:flex}.sBOb7W_laneRow:last-child{border-bottom:0}.sBOb7W_laneDot{border-radius:9999px;flex:none;width:6px;height:6px}.sBOb7W_laneName{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;overflow:hidden}.sBOb7W_contentWrap{flex:1;min-width:0;position:relative}.sBOb7W_scroller{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;height:100%;overflow:auto hidden}.sBOb7W_scroller::-webkit-scrollbar{height:8px}.sBOb7W_scroller::-webkit-scrollbar-track{background:0 0}.sBOb7W_scroller::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}.sBOb7W_content{position:relative}.sBOb7W_ruler{border-bottom:1px solid var(--dsw-alias-border-l2);cursor:ew-resize;touch-action:none;position:relative}.sBOb7W_tick{position:absolute;top:0;bottom:0}.sBOb7W_tickLine{background:var(--dsw-alias-border-l2);width:1px;height:100%}.sBOb7W_tickLabel{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;position:absolute;top:2px;left:4px}.sBOb7W_timecode{z-index:10;font-variant-numeric:tabular-nums;height:100%;color:var(--dsw-alias-brand-primary);align-items:center;padding-left:6px;padding-right:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;display:flex;position:sticky;left:0}.sBOb7W_promptsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.sBOb7W_canAdd{cursor:copy}.sBOb7W_emptyCenter{justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.sBOb7W_emptyHint{color:var(--dsw-alias-label-tertiary);font-size:10px}.sBOb7W_promptClip{touch-action:none;cursor:grab;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;position:absolute;top:4px;bottom:4px;overflow:hidden}.sBOb7W_promptClip:hover{border-color:var(--dsw-alias-border-l4)}.sBOb7W_clipSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);border-width:0}.sBOb7W_clipSelected:hover{border-color:var(--dsw-alias-brand-primary)}.sBOb7W_clipMoving{z-index:30;cursor:grabbing;border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 20px 25px -5px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent)}.sBOb7W_edgeL{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:0;bottom:0;left:0}.sBOb7W_edgeL:hover{background:var(--dsw-alias-interactive-bg-hover)}.sBOb7W_edgeDead{cursor:default;opacity:.35}.sBOb7W_edgeDead:hover{background:0 0}.sBOb7W_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.sBOb7W_promptClip:hover .sBOb7W_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.sBOb7W_seamDot{z-index:35;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:0;transform:translate(-50%,-50%)}.sBOb7W_edgeR{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:16px;bottom:0;right:0}.sBOb7W_edgeR:hover{background:var(--dsw-alias-interactive-bg-hover)}.sBOb7W_edgeWide{width:16px}.sBOb7W_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.sBOb7W_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent)}.sBOb7W_promptClip:hover .sBOb7W_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.sBOb7W_promptClip:hover .sBOb7W_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent)}.sBOb7W_clipEditor{background:color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);height:24px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);pointer-events:auto;border:none;border-radius:4px;align-items:center;padding:0 6px;display:inline-flex;position:absolute;top:50%;left:8px;right:8px;transform:translateY(-50%)}.sBOb7W_clipEditor input{width:100%;min-width:0;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;padding:0;font-size:11px;line-height:1.5}.sBOb7W_clipEditor input::placeholder{color:var(--dsw-alias-label-tertiary)}.sBOb7W_previewWrap{z-index:10;pointer-events:none;position:absolute;inset:0;overflow:hidden}.sBOb7W_previewVideo{object-fit:cover;opacity:.6;width:100%;height:100%;position:absolute;inset:0}.sBOb7W_scrim{background:linear-gradient(to top, color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent) 50%, color-mix(in srgb, var(--dsw-alias-bg-base) 10%, transparent));position:absolute;inset:0}.sBOb7W_clipTextCol{z-index:20;flex-direction:column;gap:2px;padding:0 12px 6px;display:flex;position:absolute;bottom:0;left:0;right:0}.sBOb7W_clipTextStack{z-index:10;pointer-events:none;flex-direction:column;justify-content:center;gap:2px;padding:0 12px;display:flex;position:absolute;inset:0}.sBOb7W_clipTitle{text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;overflow:hidden}.sBOb7W_clipEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.sBOb7W_clipDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:10px}.sBOb7W_knobDot{z-index:20;background:var(--dsw-alias-brand-primary);width:6px;height:6px;box-shadow:0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);pointer-events:none;border-radius:9999px;position:absolute;top:4px;right:6px}.sBOb7W_refAudioBadge{z-index:20;width:10px;height:10px;color:var(--dsw-alias-state-business-primary);pointer-events:none;position:absolute;top:12px;right:4px}.sBOb7W_refBadge{z-index:20;pointer-events:none;align-items:center;gap:1px;display:flex;position:absolute;top:22px;right:2px}.sBOb7W_refBadge svg{width:8px;height:8px;color:var(--dsw-alias-state-success-primary)}.sBOb7W_refCount{color:var(--dsw-alias-state-success-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;line-height:1}.sBOb7W_promptDelete{z-index:40;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:inline-flex;position:absolute;top:4px;right:4px}.sBOb7W_promptDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.sBOb7W_promptClip:hover .sBOb7W_promptDelete{opacity:1}.sBOb7W_promptDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.sBOb7W_beatsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.sBOb7W_beatsAdd{cursor:crosshair}.sBOb7W_beatsEmpty{align-items:center;padding-left:12px;display:flex;position:absolute;inset:0}.sBOb7W_hintLine{color:var(--dsw-alias-label-tertiary);font-size:10px}.sBOb7W_beatClip{border:1px solid var(--dsw-alias-border-l2);cursor:pointer;border-radius:6px;position:absolute;top:4px;bottom:4px;overflow:hidden}.sBOb7W_beatClip:hover{border-color:var(--dsw-alias-border-l4)}.sBOb7W_beatSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}.sBOb7W_beatSelected:hover{border-color:var(--dsw-alias-brand-primary)}.sBOb7W_beatLabel{color:var(--dsw-alias-label-secondary);pointer-events:none;align-items:center;padding:0 6px;font-size:10px;line-height:1.25;display:flex;position:absolute;inset:0}.sBOb7W_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sBOb7W_beatEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.sBOb7W_audioLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.sBOb7W_audioClip{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);cursor:grab;touch-action:none;border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.sBOb7W_audioClip:active{cursor:grabbing}.sBOb7W_audioCard{border-radius:6px;top:3px;bottom:3px}.sBOb7W_audioCardIcon{pointer-events:none;display:flex;position:absolute;top:50%;left:5px;transform:translateY(-50%)}.sBOb7W_audioCardIcon svg{width:13px;height:13px}.sBOb7W_audioCard .sBOb7W_audioClipLabel{flex-direction:column;justify-content:center;align-items:flex-start;gap:1px;font-size:10px;display:flex;left:23px;right:4px}.sBOb7W_audioCard .sBOb7W_audioTime{margin-left:0}.sBOb7W_gainFill{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;position:absolute;bottom:0;left:0;right:0}.sBOb7W_audioClipLabel{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));pointer-events:none;align-items:center;padding:0 4px;font-size:9px;line-height:1;display:flex;position:absolute;inset:0;overflow:hidden}.sBOb7W_audioName{text-overflow:ellipsis;white-space:nowrap;font-weight:500;overflow:hidden}.sBOb7W_audioTime{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--dsw-alias-label-tertiary));flex:none;margin-left:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.sBOb7W_audioClipDelete{background:color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);width:14px;height:14px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:0 0 0 4px;justify-content:center;align-items:center;padding:0;display:none;position:absolute;top:0;right:0}.sBOb7W_audioClipDelete:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.sBOb7W_audioClip:hover .sBOb7W_audioClipDelete{display:flex}.sBOb7W_audioClipDelete svg{width:8px;height:8px}.sBOb7W_audioSlice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.sBOb7W_sliceLabel{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-secondary));pointer-events:none;justify-content:center;align-items:center;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;display:flex;position:absolute;inset:0;overflow:hidden}.sBOb7W_audioDrop{border:1px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.sBOb7W_dropHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);padding:0 8px;font-size:9px;overflow:hidden}.sBOb7W_kfLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.sBOb7W_kfLane:last-child{border-bottom:0}.sBOb7W_laneHint{color:var(--dsw-alias-label-tertiary);pointer-events:none;align-items:center;padding-left:12px;font-size:10px;display:flex;position:absolute;inset:0}.sBOb7W_kfWrap{position:absolute;top:0;bottom:0}.sBOb7W_kfBtn{cursor:grab;background:0 0;border:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:flex;position:absolute;top:50%;left:0;transform:translate(-50%,-50%)}.sBOb7W_kfBtn:active{cursor:grabbing;transform:translate(-50%)}.sBOb7W_kfDiamond{width:10px;height:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4);border:1px solid;display:block;transform:rotate(45deg)}.sBOb7W_kfMoving{transform:rotate(45deg)scale(1.25)}.sBOb7W_kfDelete{z-index:10;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:14px;height:14px;padding:0;display:inline-flex;position:absolute;top:0;left:6px}.sBOb7W_kfDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.sBOb7W_kfWrap:hover .sBOb7W_kfDelete{opacity:1}.sBOb7W_kfDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.sBOb7W_playhead{z-index:40;pointer-events:none;position:absolute;top:0;bottom:0}.sBOb7W_playheadCap{border:1px solid var(--dsw-alias-border-l4);border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:50%;transform:translate(-50%)}.sBOb7W_miniBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);width:20px;height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:13px;line-height:1;display:inline-flex}.sBOb7W_miniBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.sBOb7W_miniFitBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.sBOb7W_miniFitBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.sBOb7W_scrubBar{align-items:center;gap:8px;width:100%;display:flex}.sBOb7W_scrubToggle{cursor:pointer;background:0 0;border:none;flex:none;padding:4px 2px;font-size:11px;line-height:1}.sBOb7W_scrubTrack{cursor:pointer;touch-action:none;flex:1;min-width:0;height:18px;position:relative}.sBOb7W_scrubFill{background:var(--dsw-alias-interactive-bg-active);border-radius:2px;height:4px;position:absolute;top:7px;left:0}.sBOb7W_scrubHead{background:var(--dsw-alias-label-primary);border-radius:1px;width:2px;height:10px;margin-left:-1px;position:absolute;top:4px}.sBOb7W_scrubReadout{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;font-size:11px}";
		const tagId = "@melite/video-h3-timeline/timeline.module.css@a24e9e18";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/video-h3-timeline";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var timeline_module_css_default = {
			"audioCard": "sBOb7W_audioCard",
			"audioCardIcon": "sBOb7W_audioCardIcon",
			"audioClip": "sBOb7W_audioClip",
			"audioClipDelete": "sBOb7W_audioClipDelete",
			"audioClipLabel": "sBOb7W_audioClipLabel",
			"audioDrop": "sBOb7W_audioDrop",
			"audioHead": "sBOb7W_audioHead",
			"audioLane": "sBOb7W_audioLane",
			"audioName": "sBOb7W_audioName",
			"audioSlice": "sBOb7W_audioSlice",
			"audioTime": "sBOb7W_audioTime",
			"beatClip": "sBOb7W_beatClip",
			"beatEmpty": "sBOb7W_beatEmpty",
			"beatLabel": "sBOb7W_beatLabel",
			"beatSelected": "sBOb7W_beatSelected",
			"beatsAdd": "sBOb7W_beatsAdd",
			"beatsEmpty": "sBOb7W_beatsEmpty",
			"beatsLane": "sBOb7W_beatsLane",
			"canAdd": "sBOb7W_canAdd",
			"clipDur": "sBOb7W_clipDur",
			"clipEditor": "sBOb7W_clipEditor",
			"clipEmpty": "sBOb7W_clipEmpty",
			"clipMoving": "sBOb7W_clipMoving",
			"clipSelected": "sBOb7W_clipSelected",
			"clipTextCol": "sBOb7W_clipTextCol",
			"clipTextStack": "sBOb7W_clipTextStack",
			"clipTitle": "sBOb7W_clipTitle",
			"content": "sBOb7W_content",
			"contentWrap": "sBOb7W_contentWrap",
			"detachBtn": "sBOb7W_detachBtn",
			"dropHint": "sBOb7W_dropHint",
			"edgeDead": "sBOb7W_edgeDead",
			"edgeL": "sBOb7W_edgeL",
			"edgeR": "sBOb7W_edgeR",
			"edgeWide": "sBOb7W_edgeWide",
			"emptyCenter": "sBOb7W_emptyCenter",
			"emptyHint": "sBOb7W_emptyHint",
			"gainFill": "sBOb7W_gainFill",
			"gripPill": "sBOb7W_gripPill",
			"gripPillBright": "sBOb7W_gripPillBright",
			"gripPillR": "sBOb7W_gripPillR",
			"gutter": "sBOb7W_gutter",
			"gutterLabel": "sBOb7W_gutterLabel",
			"gutterLabelDim": "sBOb7W_gutterLabelDim",
			"hintLine": "sBOb7W_hintLine",
			"kfBtn": "sBOb7W_kfBtn",
			"kfDelete": "sBOb7W_kfDelete",
			"kfDiamond": "sBOb7W_kfDiamond",
			"kfLane": "sBOb7W_kfLane",
			"kfMoving": "sBOb7W_kfMoving",
			"kfWrap": "sBOb7W_kfWrap",
			"knobDot": "sBOb7W_knobDot",
			"laneDot": "sBOb7W_laneDot",
			"laneHead": "sBOb7W_laneHead",
			"laneHeadBeats": "sBOb7W_laneHeadBeats",
			"laneHint": "sBOb7W_laneHint",
			"laneName": "sBOb7W_laneName",
			"laneRow": "sBOb7W_laneRow",
			"miniBtn": "sBOb7W_miniBtn",
			"miniFitBtn": "sBOb7W_miniFitBtn",
			"playhead": "sBOb7W_playhead",
			"playheadCap": "sBOb7W_playheadCap",
			"previewVideo": "sBOb7W_previewVideo",
			"previewWrap": "sBOb7W_previewWrap",
			"promptClip": "sBOb7W_promptClip",
			"promptDelete": "sBOb7W_promptDelete",
			"promptsLane": "sBOb7W_promptsLane",
			"refAudioBadge": "sBOb7W_refAudioBadge",
			"refBadge": "sBOb7W_refBadge",
			"refCount": "sBOb7W_refCount",
			"root": "sBOb7W_root",
			"ruler": "sBOb7W_ruler",
			"scrim": "sBOb7W_scrim",
			"scroller": "sBOb7W_scroller",
			"scrubBar": "sBOb7W_scrubBar",
			"scrubFill": "sBOb7W_scrubFill",
			"scrubHead": "sBOb7W_scrubHead",
			"scrubReadout": "sBOb7W_scrubReadout",
			"scrubToggle": "sBOb7W_scrubToggle",
			"scrubTrack": "sBOb7W_scrubTrack",
			"seamDot": "sBOb7W_seamDot",
			"sliceLabel": "sBOb7W_sliceLabel",
			"tick": "sBOb7W_tick",
			"tickLabel": "sBOb7W_tickLabel",
			"tickLine": "sBOb7W_tickLine",
			"timecode": "sBOb7W_timecode",
			"truncate": "sBOb7W_truncate",
			"uploadBtn": "sBOb7W_uploadBtn",
			"zoomBtn": "sBOb7W_zoomBtn",
			"zoomPct": "sBOb7W_zoomPct",
			"zoomRow": "sBOb7W_zoomRow"
		};
		//#endregion
		//#region ../../web-kit/timeline/timeline/MotionTimelineBarChrome.tsx
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.X, { "aria-hidden": true })
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
		//#region ../../web-kit/timeline/timeline/MotionTimelineBarLanes.tsx
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
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.X, {})
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.X, { "aria-hidden": true })
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
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.X, {})
								})
							})]
						}, kf.uuid);
					})]
				}, track.uuid);
			}) });
		}
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
		//#region ../../web-kit/timeline/timeline/FilmPlayer.tsx
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
				play: () => void videoRef.current?.play(),
				pause: () => void videoRef.current?.pause(),
				toggle: () => {
					const el = videoRef.current;
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
		(0, react.createContext)({ useGui: (selector) => selector({ theme: { dark_mode: true } }) });
		//#endregion
		//#region src/ui/studio/StudioPreview.tsx
		init_stageView();
		function recordOf$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function historyRows$1(stage) {
			const sources = [];
			const metadataHistory = stage.result?.metadata?.history;
			if (Array.isArray(metadataHistory)) sources.push(metadataHistory);
			if (Array.isArray(stage.history)) sources.push(stage.history);
			const out = [];
			for (const raw of sources) for (const value of raw) {
				const entry = recordOf$1(value);
				const direct = typeof entry.video === "string" ? entry.video : "";
				const artifacts = recordOf$1(entry.artifacts);
				const assets = Array.isArray(entry.assetUrls) ? entry.assetUrls.filter((url) => typeof url === "string") : [];
				const rows = Object.entries(artifacts).filter((entry) => {
					const [name, url] = entry;
					return typeof url === "string" && url !== "" && refGenreOf(name, url) === "video";
				});
				const film = rows.find(([name, url]) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(name) || /h3_t4_film_\d+_\.mp4(?:$|[?#])/i.test(url));
				const named = rows[0]?.[1];
				const flat = assets.find((url) => refGenreOf("", url) === "video");
				const video = direct !== "" && refGenreOf("", direct) === "video" ? direct : film?.[1] ?? named ?? flat ?? "";
				if (video === "") continue;
				const runId = typeof entry.runId === "string" ? entry.runId : typeof entry.run_id === "string" ? entry.run_id : void 0;
				out.push({
					...runId !== void 0 ? { runId } : {},
					...typeof entry.status === "string" ? { status: entry.status } : {},
					...typeof entry.at === "number" ? { at: entry.at } : {},
					...typeof entry.durationSec === "number" ? { durationSec: entry.durationSec } : {},
					video
				});
			}
			const seen = /* @__PURE__ */ new Set();
			return out.filter((entry) => {
				const key = entry.runId ?? entry.video;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PaneHeader, {
						variant: "preview",
						title: "Preview",
						meta: running ? "— filling as the run lands…" : filmstrip.windows.length ? "— from the last run (unchanged windows reuse on re-run)" : "— run compiles the calls into windows; each renders once, seams chained"
					}),
					(() => {
						const hist = historyRows$1(stage);
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
							}), hist.slice(0, 8).map((h, i) => {
								const word = (h.status ?? "").toLowerCase();
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
									href: h.video,
									target: "_blank",
									rel: "noreferrer",
									title: h.runId + " · " + (h.status ?? "?") + " · " + (h.durationSec ?? "?") + "s" + (h.at ? " · " + (/* @__PURE__ */ new Date(h.at * 1e3)).toLocaleString() : ""),
									className: studio_module_css_default.histChip,
									children: [
										RUN_STATUS_WORDS.has(word) && statusOf(word) === "done" ? "✓" : "×",
										" ",
										(h.runId ?? "run").replace(/^run-/, "").slice(0, 8),
										" · ",
										h.durationSec ?? "?",
										"s"
									]
								}, h.runId ?? i);
							})]
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
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Clapperboard, {
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
							!filmstrip.windows.length && !filmstrip.final && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.EmptyState, {
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Clapperboard, {
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
		//#region src/ui/studio/docModel.ts
		init_timelineTypes();
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
				dur_frames: Math.round(4 * (typeof fps === "number" && fps > 0 ? fps : DEFAULT_SEGMENT_PARAMS.fps)),
				gain: 1
			};
		}
		/** The retired Layer A spellings → the card's wire names (hydration
		* migrates; serialization writes only the wire names). The lora knob
		* pair maps through the mod bag: a legacy lora_name resolves to a
		* catalog id when the filename matches, else drops with a warning
		* (it was decorative anyway — compose never read it). */
		const LEGACY_LAYERA_KEY = {
			...LEGACY_KNOB_KEY,
			rtx_vsr_enabled: "sr_switch",
			h3_ref_image_size: "ref_image_size"
		};
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
		/** The fresh-card document: ONE window 0→90 — the t4_open draft
		* budget . The canvas IS the film: the readout shows
		* 3.8 s and 3.8 s renders. A user authoring a longer window gets it
		* ungated (the operator's order 2026-09-17) — the span-vs-engine
		* receipts live in the ledger, not in any gate. Used only when
		* params carry no valid calls (never authored, or legacy malformed). */
		const STARTER_CALLS = [{
			text: "A single shot — describe the action, camera, and mood.",
			start_frame: 0,
			end_frame: 90
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
		const AUDIO_ROW_RE = /\.(mp3|wav|flac|ogg|m4a|aac|aif|aiff|opus|webm)(\?|$)/i;
		const LANE_OF = {
			"audio:dialogue": "dialogue",
			"audio:sfx": "sfx",
			"audio:music": "music"
		};
		/** THE DEP LAW (2026-09-22, the From-media freeze): the provider's
		*  modal effect keys on the loadMedia FUNCTION'S IDENTITY — an
		*  inline arrow in the component is a fresh identity every render,
		*  and the effect re-fires per render into an infinite load loop
		*  that freezes the card (the base's own comment: the 4GB OOM). The
		*  audio filter wrapper lives at MODULE SCOPE — one identity,
		*  forever; the effect fires once per modal opening. */
		const loadAudioMedia = async (_kind, signal) => {
			return (await (0, _melite_card_base_client.fetchMediaLibrary)("all", signal)).filter((r) => AUDIO_ROW_RE.test(r.url) || AUDIO_ROW_RE.test(r.name));
		};
		function StudioStripPane({ calls, totalFrames, fps, seconds, barPrompts, barLanes, barAudioClips, barTotal, frameIdx, callPreviews, selectedBarId, filmMap, handleBarFrame, handleScrubStart, handleScrubEnd, handleKeyframeAdd, handleKeyframeMove, handleKeyframeDelete, handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete, handleExtend, addCallAt, handleTimelineSelect, layerA, refAudiosBlocked, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip, updateAudioClip, setLayerAKey, artifactIndex, docFromFilm, keyframes }) {
			const pickLane = (0, react.useRef)("music");
			const laneField = (lane) => ({
				name: `audio:${lane}`,
				label: lane,
				type: "file"
			});
			const { square, wireMenu } = (0, _melite_card_base_client.useSquareProvider)((name, v) => {
				if (typeof v !== "string" || v === "") return;
				if (refAudiosBlocked) return;
				addAudioClip(artifactIndex.byUrl.get(v) ?? v, v, 0, LANE_OF[name]);
			}, {
				candidates: Array.from(artifactIndex.byUrl.entries()).filter(([url]) => AUDIO_ROW_RE.test(url)).map(([url, name2]) => ({
					id: url,
					label: name2,
					url
				})),
				loadMedia: loadAudioMedia,
				accept: "audio/*",
				onFile: (file) => {
					if (!refAudiosBlocked) takeAudioFile(file, 0, pickLane.current);
				}
			});
			const openLanePicker = (lane) => (anchor) => {
				pickLane.current = lane;
				square(laneField(lane))?.verbs.onPick?.(anchor);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_melite_card_base_client.PaneShell, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PaneHeader, {
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
				hint: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: "one card = one model call · drag an edge = move the cut · double-click = edit · pull the tail = extend · cyan dot = knobs override · click a call = edit it in the left panel" })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.blockerWrap,
				children: [
					refAudiosBlocked && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-testid": "tl-lane-blocker",
						className: studio_module_css_default.laneBlocker,
						children: "reference audio is wired on a call — the dialogue / music / SFX lanes are LOCKED (the clips and the audio inputs are mutually exclusive; clear the call's Ref audios to place clips)"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionTimelineBar, {
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
						onPromptAdd: (frame) => addCallAt(docFromFilm(frame)),
						previews: callPreviews,
						selectedId: selectedBarId,
						onSelect: handleTimelineSelect,
						audioClipCards: true,
						audioLayers: [
							{
								id: "dialogue",
								label: "Dialogue",
								icon: "mic",
								accent: "#22d3ee",
								onUpload: refAudiosBlocked ? void 0 : openLanePicker("dialogue"),
								clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "dialogue")
							},
							{
								id: "music",
								label: "Music",
								icon: "music",
								accent: "#a78bfa",
								stem: layerA.audio_stem ?? null,
								onUpload: refAudiosBlocked ? void 0 : openLanePicker("music"),
								clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "music")
							},
							{
								id: "sfx",
								label: "SFX",
								icon: "zap",
								accent: "#fb923c",
								onUpload: refAudiosBlocked ? void 0 : openLanePicker("sfx"),
								clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "sfx")
							}
						],
						onAudioDropAt: (id, url, frame) => {
							if (refAudiosBlocked) return;
							const name = artifactIndex.byUrl.get(url);
							if (name) addAudioClip(name, name, docFromFilm(frame), id);
						},
						onAudioFileDrop: (id, file, frame) => {
							if (refAudiosBlocked) return;
							takeAudioFile(file, docFromFilm(frame), id);
						},
						onAudioClipMove: (_id, clipId, frame) => {
							moveAudioClip(clipId, docFromFilm(frame));
						},
						onAudioClipDelete: (_id, clipId) => {
							deleteAudioClip(clipId);
						},
						onAudioDetach: (layerId) => {
							const laneCls = layerId === "music" ? "music" : layerId === "sfx" ? "sfx" : "dialogue";
							const kept = (layerA.audio_clips ?? []).filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) !== laneCls);
							setLayerAKey("audio_clips", kept.length ? kept : void 0);
							if (layerId === "music") setLayerAKey("audio_stem", void 0);
						}
					}),
					wireMenu
				]
			})] });
		}
		//#endregion
		//#region src/ui/studio/RunRecipeEngine.tsx
		/**
		* RunRecipeEngine — the Layer A rail.
		*
		* THE GENERIC SEAM LAW (operator, 2026-09-19: "h3 FORM SEAM = THE
		* GENERIC FORM SEAM — we added primitives to the default card UI
		* package to handle this"): the parameter surface IS CardForm —
		* the same component the bench drill seats. Groups, the sampling
		* 2-column grid (sampler + scheduler side by side, the kit's
		* columns/width facts), visible_when, the recipe pills on the
		* model axes, mod-owned exclusion — every layout law lands in
		* card-base ONCE and every card inherits it. The hand-rolled
		* SpecPanel sections and window SpecAtoms are DEAD (the anti-DRY
		* break: any law the generic seam learned, this surface silently
		* missed — the blank-steps and split-sampler crimes both lived
		* here).
		*
		* What stays STUDIO CHROME (never card params): the Model-route
		* pin (the sibling-family switch, a document concept) and the doc
		* FPS (a document-local clock fact, undeclared by design). THE
		* GEOMETRY READOUT IS DEAD (operator 2026-09-21: "WHY DO I STILL
		* SEE THIS READOUT SKIN? 1344×768 @ 24 doc-fps" — a read-only text
		* row outside the generic seam's grid grammar; the Width/Height
		* injects own geometry, one surface).
		*/
		/** Layer A rail: Recipe (clock) + Engine (H3 sampling) + geometry. */
		function RunRecipeEngine({ stage, layerA, setLayerAKey, setLayerA, refArtifacts }) {
			const { spec, edit } = (0, _melite_card_base_client.useResolvedForm)("h3-timeline", layerA, setLayerAKey, stage.params ?? void 0);
			const wire = {
				candidates: refArtifacts.map((a) => ({
					id: a.name,
					label: a.name,
					url: a.url
				})),
				loadMedia: _melite_card_base_client.fetchMediaLibrary
			};
			const [gateFace, setGateFace] = (0, react.useState)(null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				gateFace !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "alert",
					"data-gate-face": "1",
					className: studio_module_css_default.gateFace,
					children: gateFace
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.group,
					"data-testid": "tl-recipe-chrome",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.groupTitle,
						children: "Recipe"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ControlRow, {
						label: "FPS",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
							f: {
								name: "fps",
								label: "FPS",
								type: "number",
								min: 1,
								max: 60,
								step: 1
							},
							value: layerA.fps,
							placeholder: "",
							onEdit: (_, v) => {
								const n = typeof v === "string" && v.trim() !== "" ? Number(v) : void 0;
								if (n !== void 0 && n > 0) setLayerAKey("fps", n);
							}
						})
					})]
				}),
				spec !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.CardForm, {
					spec,
					user: layerA,
					base: stage.params ?? void 0,
					onSet: edit,
					onUnset: (n) => setLayerAKey(n, void 0),
					onPick: (patch) => {
						const candidate = (0, _melite_card_base_client.composeCandidateDoc)(stage.params ?? {}, layerA, patch);
						const violations = (0, _melite_card_base_client.composeValidate)(spec, candidate);
						if (violations.length > 0) {
							setGateFace("THE COMPOSE GATE REFUSED — " + violations[0].message + " — the write never left the studio. Fix the stated value, or pick a different route.");
							return;
						}
						setGateFace(null);
						setLayerA((prev) => {
							const next = { ...prev };
							for (const [k, v] of Object.entries(patch)) if ((0, _melite_card_base_client.axisUnset)(k, v, spec)) next[k] = void 0;
							else next[k] = v;
							return next;
						});
					},
					wire
				}) : null
			] });
		}
		//#endregion
		//#region src/ui/studio/RunRefsClips.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx.
		*
		* THE LAYER A/B LAW REWORK (2026-09-17): the RUN-LEVEL identity
		* refs panel is GONE — refs are PER-CALL (a call's SourceRow group
		* in CallCard); nothing at run level ever staged them. What remains
		* is the legitimate Layer A NLE concept: the positioned AUDIO CLIPS
		* bed (the Music row). THE DIALOGUE HALF (2026-09-21): a clip that
		* spans a window CONDITIONS that window (the model hears it — the
		* lip-sync lane, one of the 3 audio lanes; a full bus refuses loud
		* at compose), mixes over the final cut at film time (the audible
		* authority), and ducks the generated voice under the real clip.
		* Music-only clips (no window overlap) overlay clean, no lane.
		*/
		/** Layer A rail: the audio-clips upload door (3189–3315, refs cut) +
		* THE LANE INSPECTOR (2026-09-22): every clip's lane and words/event
		* text — the authored half of the D-M-E law (the text is what tells
		* the model WHAT the audio is; the pin is the other half). */
		function RunRefsClips({ layerA, updateAudioClip, deleteAudioClip }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.clipsRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsTitle,
						children: "Clips"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsNote,
						children: layerA.audio_clips?.length ? `${layerA.audio_clips.length} clip${layerA.audio_clips.length === 1 ? "" : "s"} on the audio lanes — drag to move, × to remove` : "none — add from a lane's ⤴ in the timeline, or drop a file on any lane"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.clipsHint,
						"data-testid": "tl-clips-lane-hint",
						children: "pinned windows own their audio: music clip ⇒ no bed there · dialogue/sfx clip ⇒ ref audios mute there — no accidental overlap"
					})
				]
			}), (layerA.audio_clips?.length ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.laneInspector,
				"data-testid": "tl-lane-inspector",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.clipsTitle,
					children: "Lanes — words & events"
				}), layerA.audio_clips.map((c) => {
					const cls = c.class ?? (c.text ? "dialogue" : "music");
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.laneRow,
						"data-testid": "tl-lane-row",
						"data-clip": c.name,
						"data-lane": cls,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.laneName,
								title: c.src,
								children: c.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: studio_module_css_default.laneSelect,
								"data-testid": "tl-lane-class",
								value: cls,
								onChange: (e) => updateAudioClip(c.id, { class: e.target.value }),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "dialogue",
										children: "Dialogue"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "music",
										children: "Music"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "sfx",
										children: "SFX"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: studio_module_css_default.laneText,
								"data-testid": "tl-lane-text",
								type: "text",
								placeholder: cls === "dialogue" ? "the exact spoken words (verbatim, unabridged — they move the mouth)" : cls === "sfx" ? "the event the soundscape times (e.g. a sudden explosion rocks the room)" : "music description (rides non_diegetic_music)",
								value: c.text ?? "",
								onChange: (e) => updateAudioClip(c.id, { text: e.target.value })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								className: studio_module_css_default.laneDelete,
								"data-testid": "tl-lane-delete",
								title: "remove the clip",
								onClick: () => deleteAudioClip(c.id),
								children: "×"
							})
						]
					}, c.id);
				})]
			})] });
		}
		//#endregion
		//#region src/ui/studio/CallFrameSubcard.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx.
		*
		* THE BUNDLE SPLIT (operator correction, 2026-09-18): the first
		* frame and the reference images are NOT alien categories — they
		* are slots on ONE image bus (first frame = slot 1, the anchor;
		* refs = slots 2-9). This file now exports the two PIECES the
		* unified Reference bundle panel seats:
		*   • FirstFrameSlot — the anchor's image square (the estate's
		*     SourceRow grammar, matching every other image input:
		*     From flow / From media / From file), writing `image`.
		*   • SeamControls — the call's seam law (how this call joins the
		*     previous one: cut re-feeds the previous VIDEO tail; extend
		*     chains the previous LATENT). Seam concepts, not bundle
		*     concepts — they ride under the bus, never inside a slot.
		*/
		/** The anchor slot — ONE image square in the bus grammar
		* (2026-08-24 affordance law: "first frame / last frame are weak
		* versions compared to other image input nodes — I can't link back
		* to previous outputs"):
		*   • From flow lists the upstream cards' IMAGE artifacts (links);
		*     the write maps URL→NAME (the drop-honesty law: an unmatched
		*     URL writes NOTHING — it would pass through unresolved).
		*   • From file keeps the studio's OWN file law (image-only, 20 MB
		*     cap, readAsDataURL → data: URL; _resolveSource decodes data:
		*     first-class) through the wire's onFile override.
		*   • From media lists the runs library through the same door; the
		*     URL→NAME honesty applies (foreign URLs refuse visibly). */
		function FirstFrameSlot({ testId, callIndex, value, onChange, nameToUrl, urlToName, links }) {
			const [fileError, setFileError] = (0, react.useState)(null);
			const v = value?.trim() ?? "";
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
					const dataUrl = await (0, _melite_card_base_client.readAsDataURL)(file);
					setFileError(null);
					onChange(dataUrl);
				} catch {
					setFileError("could not read that file");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-testid": testId,
				className: studio_module_css_default.busAnchor,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
					label: "first frame · slot 1",
					kind: "image",
					value: v === "" ? null : v.startsWith("data:") ? v : nameToUrl.get(v) ?? v,
					candidates: (links ?? []).map((a) => ({
						id: a.name,
						label: a.name,
						url: a.url
					})),
					loadMedia: _melite_card_base_client.fetchMediaLibrary,
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
				}), fileError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"data-testid": `${testId}-file-error`,
					className: studio_module_css_default.fileErr,
					children: fileError
				})]
			});
		}
		/** The call's seam law — carried vs cut (rule 3b). Renders under the
		*  image bus (the seam is the CALL'S join, not a bundle slot).
		*  (2026-09-20: the seam is AUTOMATIC — the drift-control continuation
		*  carries every non-cut join at the director's proven 22-frame
		*  overlap with the soft AV audio release; the seconds picker died
		*  with the MotionContext seam. The one authorable fact left is
		*  whether the join carries at all.) */
		function SeamControls({ callIndex, transition, onTransition }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: onTransition !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.seamRow,
				title: "How this call joins the previous one: carried continues the previous window's latent through drift control (schedule-matched carry, soft audio release — seamless across the seam); cut is an independent window, a true butt",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: studio_module_css_default.seamLabel,
					children: "seam"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
					f: {
						name: "seam_mode",
						label: "Call " + callIndex + " seam mode",
						type: "select",
						options: [{
							value: "extend",
							label: "carried — drift-control chain"
						}, {
							value: "cut",
							label: "cut — independent window"
						}]
					},
					value: transition === "cut" ? "cut" : "extend",
					onEdit: (_, v) => onTransition?.(v === "extend" ? "extend" : "cut")
				})]
			}) });
		}
		//#endregion
		//#region src/ui/studio/CallCardPrompt.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. (2026-09-15, the operator's cut: NO
		* prompt segments, NO prompt beats — text mode only, forever.)
		*/
		/** One call's prompt editor: ONE textarea + ✨ H3 style. */
		function CallCardPrompt({ c, i, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
								onClick: () => void enhanceOne("call-" + i, c.text, (t) => handlePromptUpdate("call-" + i, t)),
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
						className: (0, _melite_card_base_client.cn)(studio_module_css_default.promptBox, !(c.text ?? "").trim() && studio_module_css_default.promptBoxEmpty)
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/refUtils.ts
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
		/** Short display name for a declared URL (last path segment) — the
		* full URL rides the title. */
		function declaredShortName(url) {
			const path = url.split("?")[0];
			const tail = path.slice(path.lastIndexOf("/") + 1);
			return tail === "" ? url : tail;
		}
		//#endregion
		//#region src/ui/studio/CallCard.tsx
		/**
		* h3-timeline studio split (2026-09-06) — PURE MOVE from
		* ui/studio/component.tsx. No behavior change: headers/footers are new,
		* every logic line is verbatim from the monolith (source range noted).
		*/
		/** A CARD-LEVEL reference chip (2026-09-23, the operator: the
		*  agent-persisted card-level refs showed NOWHERE): display-only — the
		*  studio never writes the declared surface (the agent path owns it),
		*  so there is no edit door to lie about. The full URL rides the
		*  title; a dead URL shows its broken thumb honestly. */
		function DeclaredChip({ url, kind }) {
			const short = declaredShortName(url);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: studio_module_css_default.declaredChip,
				"data-testid": "tl-declared-ref",
				title: `card-level reference — rides every window's bus (edit via the card params, not this call)\n${url}`,
				children: [
					kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: url,
						alt: short,
						className: studio_module_css_default.declaredThumb
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.declaredName,
						children: short
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: studio_module_css_default.declaredTag,
						children: "card"
					})
				]
			});
		}
		/** A REDUNDANT per-call copy (H4, 2026-09-23 — no hole left): a
		*  per-call chip already riding card-level hides from the lane (the
		*  bus dedupes it) — but hiding is not stranding. This row names
		*  the copy and offers its × : stripping the per-call copy changes
		*  NOTHING on the bus (the value still rides card-level), so the
		*  door cannot lie. */
		function RedundantRow({ name, onStrip }) {
			const short = name.startsWith("data:") ? `upload (${name.length} chars)` : declaredShortName(name);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: studio_module_css_default.redundantRow,
				"data-testid": "tl-redundant-ref",
				title: `redundant per-call copy — already rides card-level, so the bus ignores this entry\n${name}\n× strips the copy (the bus is unchanged)`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: studio_module_css_default.redundantName,
					children: ["⟡ ", short]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: studio_module_css_default.redundantX,
					"data-testid": "tl-redundant-strip",
					onClick: onStrip,
					title: "strip the redundant per-call copy",
					children: "×"
				})]
			});
		}
		/** ONE ref bucket — the estate's SourceRow per chip (the operator's
		*  2026-09-13 law: SourceRow owns EVERY input slot): pick from the
		*  available artifacts, upload inline (data: URL chip), remove via
		*  clear. The wire form is the comma string (the card's wireList
		*  law — trimmed entries, empties absent). */
		function RefsBucket({ label, kind, accept, cap, value, artifacts, onChange, disabled, disabledHint, declared }) {
			const chips = splitRefList(value);
			const shown = chips.map((ch, idx) => ({
				ch,
				idx
			})).filter(({ ch }) => !declared.includes(ch));
			const bus = mergeDeclaredRefs(declared, chips);
			const over = bus.length > cap;
			const candidates = artifacts.filter((a) => refGenreOf(a.name, a.url) === kind && !chips.includes(a.name)).map((a) => ({
				id: a.name,
				label: a.name,
				url: a.url
			}));
			const setChips = (next) => onChange(next.length ? next.join(", ") : "");
			const redundant = chips.filter((ch) => declared.includes(ch));
			const up = REF_UPLOAD_SPEC[kind];
			const disabledTitle = disabledHint ?? "pinned window — this input stands down";
			const chipOf = (v) => {
				const byUrl = candidates.find((c) => c.url === v);
				return byUrl !== void 0 ? byUrl.id : v;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: studio_module_css_default.refRow,
				"data-testid": "tl-call-ref-bucket",
				"data-disabled": disabled ? "true" : void 0,
				title: disabled ? disabledTitle : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
					tail: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: over ? studio_module_css_default.refCountOver : disabled ? studio_module_css_default.refCountOver : void 0,
						title: disabled ? disabledTitle : over ? `${bus.length} claimed — the bus holds ${cap}` : `${bus.length} of ${cap}${declared.length ? ` (${declared.length} card-level)` : ""}`,
						children: [
							bus.length,
							"/",
							cap,
							over ? " over cap" : "",
							disabled ? " · pinned" : ""
						]
					}),
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.chips,
					style: disabled ? {
						opacity: .45,
						pointerEvents: "none"
					} : void 0,
					children: [
						declared.map((url) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeclaredChip, {
							url,
							kind
						}, `declared-${url}`)),
						shown.map(({ ch: chip, idx: ci }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
							label: chip.startsWith("data:") ? `upload ${ci + 1}` : chip,
							/* v8 ignore next -- RefsBucket mounts only as video/audio (its two call sites); the image lane is separate inline JSX (probe 2026-09-19) */
							kind: kind === "image" ? "image" : "file",
							accept,
							value: chip.startsWith("data:") ? null : chip,
							onEdit: (v) => {
								if (v === "") setChips(chips.filter((_, x) => x !== ci));
								else setChips(chips.map((x, idx) => idx === ci ? chipOf(v) : x));
							},
							candidates,
							onFile: async (f) => {
								try {
									const data = await (0, _melite_card_base_client.readAsDataURL)(f);
									setChips(chips.map((x, idx) => idx === ci ? data : x));
								} catch {}
							}
						}, `${chip}-${ci}`)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
							label: `+ ${label.toLowerCase()}`,
							/* v8 ignore next -- RefsBucket mounts only as video/audio (its two call sites); the image lane is separate inline JSX (probe 2026-09-19) */
							kind: kind === "image" ? "image" : "file",
							accept,
							value: null,
							onEdit: (v) => {
								if (v !== "") setChips([...chips, chipOf(v)]);
							},
							candidates,
							onFile: async (f) => {
								if (f.size > up.maxMb * 1024 * 1024) return;
								try {
									setChips([...chips, await (0, _melite_card_base_client.readAsDataURL)(f)]);
								} catch {}
							}
						}),
						redundant.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RedundantRow, {
							name,
							onStrip: () => setChips(chips.filter((ch) => ch !== name))
						}, `redundant-${name}`))
					]
				})]
			});
		}
		/** One focused model-call card (monolith lines 3418–3466 + 3641–3844;
		*  the prompt block lives in CallCardPrompt). */
		function CallCard({ c, i, deps }) {
			const { selected, fps, layerA, knobFields, callCardRefs, artifactIndex, linkGroups, refArtifacts, handlePromptDelete, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, setCallSpan, setCallGuide, setCallTransition, setCallRefs, setCallKnob, voicePinnedCalls, audioClipsPresent } = deps;
			if (selected != null && i !== selected.callIdx) return null;
			const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
			const callSelected = selected?.callIdx === i;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-call-card": i,
				"data-guides": GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).join(" ") || void 0,
				"data-knobs": activeKnobs || void 0,
				"data-selected": callSelected ? "true" : void 0,
				ref: (el) => {
					callCardRefs.current[i] = el;
				},
				className: (0, _melite_card_base_client.cn)(studio_module_css_default.callCard, callSelected && studio_module_css_default.callCardSel),
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
								title: `frames ${c.start_frame}–${c.end_frame} (end exclusive) — delivered ${deliveredFrames(c, i)}f after the seam's carry`,
								children: [
									"frames ",
									c.start_frame,
									"–",
									c.end_frame,
									" · span ",
									((c.end_frame - c.start_frame) / fps).toFixed(1),
									"s → delivered ",
									(deliveredFrames(c, i) / fps).toFixed(1),
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Delete this call — its span merges into the neighbor",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									onClick: () => handlePromptDelete(`call-${i}`),
									"aria-label": `Delete call ${i}`,
									className: studio_module_css_default.delBtn,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.X, {
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
						handlePromptUpdate,
						enhanceOne,
						undoEnhance,
						enhancing,
						enhanceErr,
						enhanceUndo
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.spanRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanLabel,
								children: "Span"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
								f: {
									name: `call_${i}_start_frame`,
									label: `Call ${i} start frame`,
									type: "number",
									min: 0,
									step: 1
								},
								value: c.start_frame,
								placeholder: "",
								onEdit: (_, v) => {
									const n = typeof v === "string" && v.trim() !== "" ? Number(v) : void 0;
									if (n !== void 0) setCallSpan(i, "start", Math.round(n));
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanDash,
								children: "–"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
								f: {
									name: `call_${i}_end_frame`,
									label: `Call ${i} end frame`,
									type: "number",
									min: 0,
									step: 1
								},
								value: c.end_frame,
								placeholder: "",
								onEdit: (_, v) => {
									const n = typeof v === "string" && v.trim() !== "" ? Number(v) : void 0;
									if (n !== void 0) setCallSpan(i, "end", Math.round(n));
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: studio_module_css_default.spanNote,
								children: "end exclusive · edit ripples the cut into the neighbor"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: studio_module_css_default.callRefs,
						"data-testid": "tl-call-refs",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: "Reference bundle (this call)" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: studio_module_css_default.callRefsBody,
							children: [
								(() => {
									const chips = splitRefList(c.refs?.images);
									const declared = normalizeDeclaredRefs(layerA?.ref_images);
									const bus = mergeDeclaredRefs(declared, chips);
									const shown = chips.map((ch, idx) => ({
										ch,
										idx
									})).filter(({ ch }) => !declared.includes(ch));
									const redundant = chips.filter((ch) => declared.includes(ch));
									const total = ((c.image ?? "").trim() !== "" ? 1 : 0) + bus.length;
									const over = total > 9;
									const candidates = refArtifacts.filter((a) => refGenreOf(a.name, a.url) === "image" && !chips.includes(a.name)).map((a) => ({
										id: a.name,
										label: a.name,
										url: a.url
									}));
									const setChips = (next) => setCallRefs(i, "images", next.length ? next.join(", ") : "");
									const up = REF_UPLOAD_SPEC.image;
									const chipOf = (v) => {
										const byUrl = candidates.find((cand) => cand.url === v);
										return byUrl !== void 0 ? byUrl.id : v;
									};
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: studio_module_css_default.refRow,
										"data-testid": "tl-call-ref-bucket",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
											tail: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: over ? studio_module_css_default.refCountOver : void 0,
												title: over ? `${total} image slots claimed — the bus holds 9 (1 anchor + ${REF_CAPS.images} refs); the compose slices the overflow` : `${total} of 9 image slots on the bus${declared.length ? ` (${declared.length} card-level)` : ""}`,
												"data-testid": "tl-call-ref-images",
												children: [
													total,
													"/",
													9,
													over ? " over bus" : ""
												]
											}),
											children: "Images — slot 1 anchors · slots 2–9 reference"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: studio_module_css_default.chips,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FirstFrameSlot, {
													testId: "tl-first-frame",
													callIndex: i,
													value: c.image,
													onChange: (source) => setCallGuide(i, "image", source),
													nameToUrl: artifactIndex.byName,
													urlToName: artifactIndex.byUrl,
													links: linkGroups
												}),
												declared.map((url) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DeclaredChip, {
													url,
													kind: "image"
												}, `declared-${url}`)),
												shown.map(({ ch: chip, idx: ci }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
													label: chip.startsWith("data:") ? `upload ${ci + 1}` : chip,
													kind: "image",
													value: chip.startsWith("data:") ? null : chip,
													onEdit: (v) => {
														if (v === "") setChips(chips.filter((_, x) => x !== ci));
														else setChips(chips.map((x, idx) => idx === ci ? chipOf(v) : x));
													},
													candidates,
													onFile: async (f) => {
														try {
															const data = await (0, _melite_card_base_client.readAsDataURL)(f);
															setChips(chips.map((x, idx) => idx === ci ? data : x));
														} catch {}
													}
												}, `${chip}-${ci}`)),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
													label: "+ ref image",
													kind: "image",
													value: null,
													onEdit: (v) => {
														if (v !== "") setChips([...chips, chipOf(v)]);
													},
													candidates,
													onFile: async (f) => {
														if (f.size > up.maxMb * 1024 * 1024) return;
														try {
															setChips([...chips, await (0, _melite_card_base_client.readAsDataURL)(f)]);
														} catch {}
													}
												}),
												redundant.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RedundantRow, {
													name,
													onStrip: () => setChips(chips.filter((ch) => ch !== name))
												}, `redundant-${name}`))
											]
										})]
									});
								})(),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefsBucket, {
									label: "Ref videos",
									kind: "video",
									accept: "video/*",
									cap: REF_CAPS.videos,
									value: c.refs?.videos,
									artifacts: refArtifacts,
									onChange: (v) => setCallRefs(i, "videos", v),
									declared: normalizeDeclaredRefs(layerA?.ref_videos)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefsBucket, {
									label: "Ref audios",
									kind: "audio",
									accept: "audio/*",
									cap: REF_CAPS.audios,
									value: c.refs?.audios,
									artifacts: refArtifacts,
									onChange: (v) => setCallRefs(i, "audios", v),
									declared: normalizeDeclaredRefs(layerA?.ref_audios),
									disabled: audioClipsPresent || (voicePinnedCalls?.has(i) ?? false),
									disabledHint: audioClipsPresent ? "THE BLOCKER: the timeline carries audio clips — the clips own the model's audio inputs; clear the D-M-E lanes to use reference audio" : "a dialogue/sfx clip pins this window — the pin owns its audio conditioning (remove the clip or move it to hear this input again)"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SeamControls, {
									callIndex: i,
									transition: c.transition,
									onTransition: (t) => setCallTransition(i, t)
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: studio_module_css_default.guidesRow,
						children: ["clip", "audio"].map((kind) => {
							const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === kind);
							const color = `rgb(${track.color[0]}, ${track.color[1]}, ${track.color[2]})`;
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
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									list: "tl-kf-sources",
									value: src,
									placeholder: kind,
									"aria-label": `Call ${i} ${kind} guide`,
									"data-testid": "tl-call-guide",
									onChange: (e) => setCallGuide(i, kind, e.target.value),
									className: (0, _melite_card_base_client.cn)(studio_module_css_default.guideRaw, !src.trim() && studio_module_css_default.guideInEmpty)
								})]
							}, kind);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: studio_module_css_default.knobFold,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
							className: studio_module_css_default.knobSummary,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ChevronDown, {
									className: (0, _melite_card_base_client.cn)(studio_module_css_default.sz10, studio_module_css_default.chev),
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
							children: KNOB_ORDER.map((knob) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.OverlayKnob, {
								name: knob,
								field: knobFields[knob],
								value: c.knobs?.[knob],
								base: layerA?.[knob],
								ariaLabel: `Call ${i} knob: ${knob}`,
								onEdit: (v) => setCallKnob(i, knob, v)
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Back to the run's global parameters — or click any empty spot in the timeline",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									onClick: () => setSelected(null),
									"aria-label": "Back to global parameters",
									"data-testid": "tl-back-to-global",
									className: studio_module_css_default.backBtn,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ChevronLeft, {
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
							const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
							const excerpt = c.text ?? "";
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
										className: (0, _melite_card_base_client.cn)(studio_module_css_default.excerpt, excerpt.trim() ? studio_module_css_default.excerptFull : studio_module_css_default.excerptEmpty),
										children: excerpt.trim() || "(empty — needs a prompt)"
									}),
									activeKnobs > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: studio_module_css_default.knobBadge,
										children: activeKnobs
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: studio_module_css_default.callDur,
										title: `span ${((c.end_frame - c.start_frame) / fps).toFixed(1)}s — delivered after the seam's carry`,
										children: [(deliveredFrames(c, i) / fps).toFixed(1), "s"]
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
								const color = `rgb(${track.color[0]}, ${track.color[1]}, ${track.color[2]})`;
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
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecAtom, {
											f: {
												name: `kf_${i}_frame`,
												label: `Keyframe ${i} frame`,
												type: "number"
											},
											value: k.frame,
											placeholder: "",
											onEdit: (_, v) => {
												const n = typeof v === "string" && v.trim() !== "" ? Number(v) : void 0;
												if (n !== void 0) handleKeyframeMove(`kf-${i}`, Math.round(n));
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											list: "tl-kf-sources",
											value: k.source,
											placeholder: sourceOptions.length ? "artifact name or filename…" : "uploaded filename…",
											"aria-label": `Keyframe ${i} source`,
											"data-testid": "tl-kf-source",
											onChange: (e) => setKeyframeSource(i, e.target.value),
											className: (0, _melite_card_base_client.cn)(studio_module_css_default.kfIn, !k.source.trim() && studio_module_css_default.textInEmpty)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: studio_module_css_default.kfTime,
											children: [(k.frame / fps).toFixed(2), "s"]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
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
		//#region ../../models/h3/src/filmMix.ts
		/** Parse raw audio_clips rows — the card's one law for what a clip
		*  IS: a src without a numeric start_frame refuses loud (never a
		*  silent misplacement); a row without src is junk and skips; the
		*  class auto law (text → dialogue, textless → music) rides here. */
		function parseFilmMixClips(rows) {
			const clips = [];
			const INT_STRING = /^[+-]?\d+$/;
			const wireInt = (x) => typeof x === "string" && INT_STRING.test(x.trim()) ? Number(x.trim()) : x;
			for (const c of rows) {
				if (c === null || typeof c !== "object") continue;
				const row = c;
				row["start_frame"] = wireInt(row["start_frame"]);
				row["dur_frames"] = wireInt(row["dur_frames"]);
				const src = typeof row.src === "string" ? row.src.trim() : "";
				if (src === "") {
					if (row.start_frame !== void 0 || row.dur_frames !== void 0 || typeof row.text === "string" && row.text.trim() !== "" || typeof row.class === "string" && row.class.trim() !== "" || typeof row.id === "string" && row.id.trim() !== "" || typeof row.name === "string" && row.name.trim() !== "") throw new Error("audio_clips: a positioned clip row has no src — the film mix cannot place a source-less row");
					continue;
				}
				if (typeof row.start_frame !== "number" || !Number.isFinite(row.start_frame)) throw new Error(`audio_clips: a clip with src but no numeric start_frame — the audio lanes own placement (re-add the clip)`);
				const dur = typeof row.dur_frames === "number" && Number.isFinite(row.dur_frames) && row.dur_frames > 0 ? row.dur_frames : 0;
				const text = typeof row.text === "string" ? row.text.trim() : "";
				const clsRaw = typeof row.class === "string" ? row.class.trim().toLowerCase() : "";
				if (clsRaw !== "" && clsRaw !== "dialogue" && clsRaw !== "sfx" && clsRaw !== "music") throw new Error(`audio_clips: unknown class "${clsRaw}" — dialogue | sfx | music (omit for auto: text → dialogue, else music)`);
				const cls = clsRaw !== "" ? clsRaw : text !== "" ? "dialogue" : "music";
				clips.push({
					src,
					start: row.start_frame,
					dur,
					text,
					cls
				});
			}
			return clips;
		}
		//#endregion
		//#region src/ui/studio/docHydrate.ts
		/** Card-level ref lists hydrate to arrays; absent/empty stays absent
		* (undefined = the compose sees no declared surface — same as today). */
		function optRefs(raw, k) {
			const list = normalizeDeclaredRefs(raw?.[k]);
			return list.length > 0 ? list : void 0;
		}
		function arrayValue(value, field) {
			if (Array.isArray(value)) return value;
			if (typeof value !== "string" || !value.trimStart().startsWith("[")) return [];
			try {
				const parsed = JSON.parse(value);
				if (!Array.isArray(parsed)) {
					console.error(`VideoTimelineStudio: params.${field} parses to a non-array — the audio timeline is corrupt; the film composes WITHOUT it. Fix or re-author the clips.`);
					return [];
				}
				return parsed;
			} catch {
				console.error(`VideoTimelineStudio: params.${field} is array-shaped but unparseable — the audio timeline is corrupt; the film composes WITHOUT it. Fix or re-author the clips.`);
				return [];
			}
		}
		function hydrateAudioClips(value) {
			const clips = [];
			for (const [index, raw] of arrayValue(value, "audio_clips").entries()) {
				if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
					console.warn(`VideoTimelineStudio: audio_clips[${index}] is not a clip row — dropped.`);
					continue;
				}
				const row = raw;
				let parsed;
				try {
					parsed = parseFilmMixClips([{ ...row }])[0];
				} catch (e) {
					console.warn(`VideoTimelineStudio: audio_clips[${index}] failed to hydrate (${String(e).slice(0, 120)}) — dropped; the film composes without this clip.`);
					continue;
				}
				if (parsed === void 0) continue;
				const id = typeof row.id === "string" && row.id.trim() !== "" ? row.id.trim() : `aclip-${index}`;
				const fallbackName = parsed.src.startsWith("data:") ? `clip-${index}` : parsed.src.split("/").pop();
				const name = typeof row.name === "string" && row.name.trim() !== "" ? row.name.trim() : fallbackName;
				const gain = typeof row.gain === "number" && Number.isFinite(row.gain) ? row.gain : void 0;
				clips.push({
					id,
					name,
					src: parsed.src,
					start_frame: parsed.start,
					dur_frames: parsed.dur,
					...gain !== void 0 ? { gain } : {},
					...typeof row.class === "string" && row.class.trim() !== "" ? { class: parsed.cls } : {},
					...parsed.text !== "" ? { text: parsed.text } : {}
				});
			}
			return clips.length > 0 ? clips : void 0;
		}
		/** The family's loras flavor catalog (id by filename) — the mod bag
		* resolves legacy lora knob picks; rows without a catalog match were
		* decorative (compose never read the knob pair) and drop. */
		const LORA_FILENAME_TO_ID = {
			"h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors": "h3_lightx2v_dareties",
			"h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors": "h3_lightx2v_turbo"
		};
		function migrateLayerARaw(raw) {
			if (raw === void 0) return raw;
			const out = {};
			for (const [k, v] of Object.entries(raw)) {
				const mapped = LEGACY_LAYERA_KEY[k] ?? k;
				out[mapped] = v;
			}
			const legacyName = typeof raw.lora_name === "string" ? raw.lora_name.trim() : "";
			if (legacyName !== "" && LORA_FILENAME_TO_ID[legacyName] !== void 0) {
				const bag = Array.isArray(out.loras) ? out.loras : [];
				bag.push({
					id: LORA_FILENAME_TO_ID[legacyName],
					strength: typeof raw.lora_strength === "number" ? raw.lora_strength : 1
				});
				out.loras = bag;
			}
			return out;
		}
		function hydrateLayerA(rawDoc) {
			const raw = migrateLayerARaw(rawDoc);
			const num = (k, d) => {
				const v = raw?.[k];
				const n = typeof v === "number" ? v : Number(v);
				return Number.isFinite(n) && n > 0 ? n : d;
			};
			const optNum = (k) => {
				const v = raw?.[k];
				if (v == null || v === "") return void 0;
				const n = Number(v);
				return Number.isFinite(n) ? n : void 0;
			};
			const optStr = (k) => typeof raw?.[k] === "string" && raw[k].trim() !== "" ? raw[k] : void 0;
			return {
				fps: num("fps", 24),
				seed: num("seed", 42),
				shift_video: optNum("shift_video"),
				shift_audio: optNum("shift_audio"),
				steps: optNum("steps"),
				denoise: optNum("denoise"),
				width: optNum("width"),
				height: optNum("height"),
				sampler_name: optStr("sampler_name"),
				sched_name: optStr("sched_name"),
				sla_enabled: raw?.sla_enabled !== false,
				sla_sparsity: optNum("sla_sparsity"),
				sla_block_size: raw?.sla_block_size === "32" || raw?.sla_block_size === "64" || raw?.sla_block_size === "128" ? raw.sla_block_size : void 0,
				sla_min_seq_len: optNum("sla_min_seq_len"),
				sla_dense_last_steps: optNum("sla_dense_last_steps"),
				sla_protect_audio: raw?.sla_protect_audio !== false,
				sla_stabilize_motion: raw?.sla_stabilize_motion !== false,
				sla_reference_protection: raw?.sla_reference_protection === "Off" || raw?.sla_reference_protection === "Light" || raw?.sla_reference_protection === "Heavy Enforcement" ? raw.sla_reference_protection : void 0,
				sla_dense_backend: raw?.sla_dense_backend === "comfy_kitchen" || raw?.sla_dense_backend === "pytorch" || raw?.sla_dense_backend === "auto" ? raw.sla_dense_backend : void 0,
				sla_dense_steps: typeof raw?.sla_dense_steps === "string" && /^\s*[0-9]+(-[0-9]+)?(\s*,\s*[0-9]+(-[0-9]+)?)*\s*$/.test(raw.sla_dense_steps) ? raw.sla_dense_steps.trim() : void 0,
				sla_disable_fp16_accum: raw?.sla_disable_fp16_accum === true,
				sharpen_enabled: raw?.sharpen_enabled === true,
				sharpen_method: raw?.sharpen_method === "rcas" || raw?.sharpen_method === "adaptive_usm" || raw?.sharpen_method === "high_pass" || raw?.sharpen_method === "deconvolution" ? raw.sharpen_method : void 0,
				sharpen_strength: optNum("sharpen_strength"),
				sharpen_radius: optNum("sharpen_radius"),
				sharpen_threshold: optNum("sharpen_threshold"),
				sharpen_iterations: optNum("sharpen_iterations"),
				interpolate_enabled: raw?.interpolate_enabled === true,
				interp_model: raw?.interp_model === "film_net_fp16.safetensors" || raw?.interp_model === "rife47.pth" ? raw.interp_model : void 0,
				interp_multiplier: optNum("interp_multiplier"),
				sr_switch: raw?.sr_switch === true,
				sr_model: raw?.sr_model === "seedvr2_ema_3b_fp16.safetensors" || raw?.sr_model === "seedvr2_ema_3b_fp8_e4m3fn.safetensors" ? raw.sr_model : void 0,
				sr_resolution: optNum("sr_resolution"),
				ref_image_size: raw?.ref_image_size === "match" || raw?.ref_image_size === "max" ? raw.ref_image_size : void 0,
				loras: Array.isArray(raw?.loras) ? raw.loras.filter((r) => !!r && typeof r.id === "string").map((r) => ({
					id: r.id,
					strength: typeof r.strength === "number" ? r.strength : void 0
				})) : void 0,
				variant: optStr("variant"),
				model: optStr("model"),
				audio_stem: optStr("audio_stem"),
				audio_clips: (() => {
					const parsed = hydrateAudioClips(raw?.audio_clips);
					const stem = optStr("audio_stem");
					if (stem !== void 0 && parsed === void 0) return [stemToClip(stem, num("fps", 24))];
					return parsed;
				})(),
				ref_images: optRefs(raw, "ref_images"),
				ref_videos: optRefs(raw, "ref_videos"),
				ref_audios: optRefs(raw, "ref_audios")
			};
		}
		/** Layer A → the persisted doc shape: ONLY card wire keys, ONLY
		* non-undefined (undefined = absent = the family default rides — the
		* engine default must never be pinned by a control never touched).
		* THE CONTRACT (pinned by the studio-contract wall test): every key
		* here ∈ the h3-timeline card's declared surface and READ by
		* compose. fps is document-local and never serializes. */
		function serializeLayerA(a) {
			const out = {
				seed: a.seed,
				sla_protect_audio: a.sla_protect_audio,
				sla_stabilize_motion: a.sla_stabilize_motion,
				sla_disable_fp16_accum: a.sla_disable_fp16_accum,
				sharpen_enabled: a.sharpen_enabled === true,
				interpolate_enabled: a.interpolate_enabled === true
			};
			for (const k of [
				"shift_video",
				"shift_audio",
				"steps",
				"denoise",
				"width",
				"height",
				"sampler_name",
				"sched_name",
				"sla_sparsity",
				"sla_block_size",
				"sla_min_seq_len",
				"sla_dense_last_steps",
				"sla_reference_protection",
				"sla_dense_backend",
				"sla_dense_steps",
				"sharpen_method",
				"sharpen_strength",
				"sharpen_radius",
				"sharpen_threshold",
				"sharpen_iterations",
				"interp_model",
				"interp_multiplier",
				"ref_image_size",
				"model",
				"audio_stem"
			]) {
				const v = a[k];
				if (v !== void 0 && v !== "") out[k] = v;
			}
			if (a.loras !== void 0 && a.loras.length > 0) out.loras = a.loras;
			if (a.sr_switch === true) {
				out.sr_switch = true;
				if (a.sr_model != null) out.sr_model = a.sr_model;
				if (a.sr_resolution != null) out.sr_resolution = a.sr_resolution;
			}
			if (a.sla_enabled === false) out.sla_enabled = false;
			if (a.audio_clips?.length) out.audio_clips = a.audio_clips;
			if (a.ref_images?.length) out.ref_images = a.ref_images;
			if (a.ref_videos?.length) out.ref_videos = a.ref_videos;
			if (a.ref_audios?.length) out.ref_audios = a.ref_audios;
			return out;
		}
		//#endregion
		//#region src/ui/studio/docCalls.ts
		/** An array-SHAPED string that will not parse (or parses to a
		* non-array) is a CORRUPT calls/beats document — the 2026-08-30 crime
		* class ("the persist effect wrote 1 call back, and the multi-call
		* plan was destroyed permanently"). The parseable case self-heals
		* (parse → the mount persist rewrites it as a real array); the
		* corrupt case must never fall to the starter SILENTLY. The studio
		* shows the starter as VIEW state, the corruption is named loudly
		* here, and useDocState's sentinel treats the field as PRESENT so no
		* mount-persist ever writes the starter back over the corrupt
		* source. Non-array-shaped strings ("not-json") are foreign values
		* the vocabulary has always tolerated — not this crime. */
		function corruptCallsField(raw) {
			for (const field of ["calls", "beats"]) {
				const v = raw[field];
				if (typeof v !== "string" || !v.trimStart().startsWith("[")) continue;
				try {
					if (Array.isArray(JSON.parse(v))) continue;
				} catch {}
				return field;
			}
			return null;
		}
		function hydrateCalls(raw) {
			const corrupt = corruptCallsField(raw);
			if (corrupt !== null) console.error(`VideoTimelineStudio: params.${corrupt} is array-shaped but unparseable — the document is corrupt. The starter is shown as view state ONLY; nothing persists over the corrupt source until you edit.`);
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
					const joined = [];
					for (const sg of rawSegs) if (typeof sg === "object" && sg !== null) {
						const t = sg.text;
						if (typeof t === "string" && t.trim()) joined.push(t.trim());
					}
					if (joined.length) {
						console.warn(`VideoTimelineStudio: call ${calls.length} carried prompt segments — their texts joined into the one prompt (segments were cut 2026-09-15; no words lost)`);
						call.text = joined.join(" ");
					}
				}
				if (!call.text.trim() && typeof r.text === "string") call.text = r.text;
				for (const kind of GUIDE_KINDS) {
					const src = r[kind];
					if (typeof src === "string" && src.trim()) call[kind] = src;
				}
				if (typeof r.last_frame === "string" && r.last_frame.trim()) console.warn(`VideoTimelineStudio: call ${calls.length} carried last_frame (${r.last_frame}) — dropped; the closing-still control was cut 2026-09-15 (the reference lane owns no last-frame input)`);
				if (r.transition === "extend" || r.transition === "cut") call.transition = r.transition;
				const refs = {};
				const rr = r.refs !== null && typeof r.refs === "object" && !Array.isArray(r.refs) ? r.refs : {};
				const im = joinRefList(rr.images ?? r.ref_images);
				const vi = joinRefList(rr.videos ?? r.ref_videos);
				const au = joinRefList(rr.audios ?? r.ref_audios);
				if (im) refs.images = im;
				if (vi) refs.videos = vi;
				if (au) refs.audios = au;
				if (Object.keys(refs).length) call.refs = refs;
				if (r.knobs !== null && typeof r.knobs === "object") {
					const knobs = {};
					for (const [rawK, v] of Object.entries(r.knobs)) {
						const k = migrateCallKnobKey(rawK);
						if (!CALL_KNOB_KEYS.has(k)) {
							console.warn(`VideoTimelineStudio: dropping unknown call knob "${rawK}" (the card's knob vocabulary)`);
							continue;
						}
						if (v === null || v === void 0 || v === "") continue;
						const target = knobs;
						if (k === "length" || k === "steps" || k === "denoise" || k === "shift_video" || k === "shift_audio" || k === "sla_sparsity" || k === "sla_min_seq_len" || k === "sla_dense_last_steps" || k === "sharpen_strength" || k === "sharpen_radius" || k === "sharpen_threshold" || k === "sharpen_iterations" || k === "interp_multiplier") {
							const n = Number(v);
							if (Number.isFinite(n)) target[k] = n;
						} else if (k === "sampler_name" || k === "sched_name") {
							if (typeof v === "string" && v.trim()) target[k] = v;
						} else if (k === "sla_block_size") {
							if (v === "32" || v === "64" || v === "128") target.sla_block_size = v;
						} else if (k === "sla_reference_protection") {
							if (v === "Off" || v === "Light" || v === "Heavy Enforcement") target.sla_reference_protection = v;
						} else if (k === "sla_dense_backend") {
							if (v === "comfy_kitchen" || v === "pytorch" || v === "auto") target.sla_dense_backend = v;
						} else if (k === "sla_dense_steps") {
							if (typeof v === "string" && /^[0-9]+(-[0-9]+)?(,[0-9]+(-[0-9]+)?)*$/.test(v.trim())) target.sla_dense_steps = v.trim();
						} else if (k === "sharpen_method") {
							if (v === "rcas" || v === "adaptive_usm" || v === "high_pass" || v === "deconvolution") target.sharpen_method = v;
						} else if (k === "interp_model") {
							if (v === "film_net_fp16.safetensors" || v === "rife47.pth") target.interp_model = v;
						} else {
							const b = typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : void 0;
							if (b !== void 0) target[k] = b;
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
		* shows where a call departs from the run's globals). */
		function callsToPrompts(calls, fps) {
			return calls.map((c, i) => ({
				uuid: `call-${i}`,
				text: `C${i + 1} · ${((c.end_frame - c.start_frame) / Math.max(1, fps)).toFixed(1)}s — ` + (c.text ?? ""),
				start_frame: c.start_frame,
				end_frame: c.end_frame - 1,
				color: null,
				override: hasKnobs(c),
				audio: !!(c.audio ?? "").trim(),
				refImages: (() => {
					return splitRefList(c.refs?.images).length + ((c.image ?? "").trim() ? 1 : 0);
				})(),
				seam: c.transition === "cut" ? "cut" : "extend"
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
		* IS inherit, never null). The prompt is ONE `text` — segments were
		* cut 2026-09-15 (hydration joins old beats' texts; the serializer
		* never writes beats). */
		function serializeCalls(calls) {
			return calls.map((c) => {
				const out = {
					text: c.text ?? "",
					start_frame: c.start_frame,
					end_frame: c.end_frame
				};
				for (const kind of GUIDE_KINDS) {
					const src = c[kind];
					if (src && src.trim()) out[kind] = src;
				}
				if (c.transition === "extend" || c.transition === "cut") out.transition = c.transition;
				if (c.refs) {
					const images = joinRefList(splitRefList(c.refs.images));
					const videos = joinRefList(splitRefList(c.refs.videos));
					const audios = joinRefList(splitRefList(c.refs.audios));
					if (images || videos || audios) out.refs = {
						...images ? { images } : {},
						...videos ? { videos } : {},
						...audios ? { audios } : {}
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
			const rawPresent = (Array.isArray(stage.params?.calls) && (stage.params?.calls).length > 0 ? stage.params?.calls : Array.isArray(stage.params?.beats) && (stage.params?.beats).length > 0 ? stage.params?.beats : null) !== null || corruptCallsField({
				calls: stage.params?.calls,
				beats: stage.params?.beats
			}) !== null;
			const lastCallsRef = (0, react.useRef)(rawPresent ? JSON.stringify(calls) : "");
			const [keyframes, setKeyframes] = (0, react.useState)(() => hydrateKeyframes(stage.params?.keyframes));
			const [layerA, setLayerA] = (0, react.useState)(() => hydrateLayerA(stage.params));
			const lastKeyframesRef = (0, react.useRef)(JSON.stringify(keyframes));
			const lastLayerARef = (0, react.useRef)(JSON.stringify(serializeLayerA(layerA)));
			const stateRef = (0, react.useRef)({
				calls,
				keyframes,
				layerA
			});
			stateRef.current = {
				calls,
				keyframes,
				layerA
			};
			const stageIdRef = (0, react.useRef)(stage.id);
			const paramsSignature = JSON.stringify(stage.params ?? {});
			(0, react.useEffect)(() => {
				const incomingCalls = hydrateCalls({
					calls: stage.params?.calls,
					beats: stage.params?.beats
				});
				const incomingKeyframes = hydrateKeyframes(stage.params?.keyframes);
				const incomingLayerA = hydrateLayerA(stage.params);
				const current = stateRef.current;
				const currentSignature = JSON.stringify({
					calls: serializeCalls(current.calls),
					keyframes: current.keyframes,
					layerA: serializeLayerA(current.layerA)
				});
				const incomingSignature = JSON.stringify({
					calls: serializeCalls(incomingCalls),
					keyframes: incomingKeyframes,
					layerA: serializeLayerA(incomingLayerA)
				});
				const stageChanged = stageIdRef.current !== stage.id;
				stageIdRef.current = stage.id;
				if (!stageChanged && currentSignature === incomingSignature) {
					const rawPresent = (Array.isArray(stage.params?.calls) && (stage.params?.calls).length > 0 ? stage.params?.calls : Array.isArray(stage.params?.beats) && (stage.params?.beats).length > 0 ? stage.params?.beats : null) !== null || corruptCallsField({
						calls: stage.params?.calls,
						beats: stage.params?.beats
					}) !== null;
					lastCallsRef.current = rawPresent ? JSON.stringify(incomingCalls) : "";
					lastKeyframesRef.current = JSON.stringify(incomingKeyframes);
					lastLayerARef.current = JSON.stringify(serializeLayerA(incomingLayerA));
					return;
				}
				lastCallsRef.current = JSON.stringify(current.calls);
				lastKeyframesRef.current = JSON.stringify(current.keyframes);
				lastLayerARef.current = JSON.stringify(serializeLayerA(current.layerA));
				setCalls(incomingCalls);
				setKeyframes(incomingKeyframes);
				setLayerA(incomingLayerA);
			}, [paramsSignature, stage.id]);
			return {
				calls,
				setCalls,
				keyframes,
				setKeyframes,
				layerA,
				setLayerA,
				lastCallsRef,
				lastKeyframesRef,
				lastLayerARef
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
			const axisFps = (0, react.useCallback)(() => filmFpsRef.current ?? fps, [fps]);
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
				emptyText: calls.filter((c) => !c.text.trim()).length,
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
				if (selected.callIdx >= calls.length) setSelected(null);
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
			const addAudioClip = (0, react.useCallback)((name, src, startFrame, cls) => {
				const id = `aclip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
				const f = layerA.fps;
				setLayerAKey("audio_clips", [...layerA.audio_clips ?? [], {
					id,
					name,
					src,
					start_frame: Math.max(0, Math.round(startFrame)),
					dur_frames: Math.round(4 * f),
					...cls ? { class: cls } : {}
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
			/** Patch a clip's lane/text (the inspector's pen): only the
			* authored fields move — placement/duration own their own doors. */
			const updateAudioClip = (0, react.useCallback)((clipId, patch) => {
				setLayerA((prev) => prev.audio_clips?.some((c) => c.id === clipId) ? {
					...prev,
					audio_clips: prev.audio_clips.map((c) => c.id === clipId ? {
						...c,
						...patch
					} : c)
				} : prev);
			}, []);
			/** OS file → clip: audio only, 30 MB cap — a rejection is the file
			* input's accept + this guard (never a silent bad write). */
			const takeAudioFile = (0, react.useCallback)((file, startFrame, cls) => {
				if (!file.type.startsWith("audio/")) return;
				if (file.size > 31457280) return;
				(0, _melite_card_base_client.readAsDataURL)(file).then((dataUrl) => {
					addAudioClip(file.name, dataUrl, startFrame, cls);
				}).catch(() => {});
			}, [addAudioClip]);
			const clipElsRef = (0, react.useRef)(/* @__PURE__ */ new Map());
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
				const fpsEff = filmMap?.fps ?? fps;
				const t = frameIdx / fpsEff;
				for (const c of layerA.audio_clips) {
					const el = clipElsRef.current.get(c.id);
					const url = audioSrcUrl(c.src);
					if (!el || !url) continue;
					if (el.src !== url) el.src = url;
					el.volume = c.gain != null ? Math.max(0, Math.min(1, c.gain)) : 1;
					const startSec = (filmMap ? filmFromDoc(c.start_frame) : c.start_frame) / fpsEff;
					const mediaSec = c.dur_frames / fps;
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
				updateAudioClip,
				takeAudioFile,
				clipElsRef
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
					if (cur.text === text) return prev;
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
			* same enhancePrompt the host's ✨ buttons use. The card LLM
			* preference (the ✦ rail's dropdown, @melite/catalog's store)
			* threads through: unset = Auto (the estate's preference chain,
			* muse-spark over glm-5v). Never silent: errors render inline; the
			* previous text is kept for one-click undo. */
			const enhanceOne = async (key, text, apply) => {
				const cur = text.trim();
				if (!cur || enhancing[key]) return;
				setEnhancingKey(key, true);
				setEnhanceErr((m) => ({
					...m,
					[key]: null
				}));
				try {
					const { enhancePrompt, cardLlmArg } = await Promise.resolve().then(() => (init_src(), src_exports));
					const result = await enhancePrompt(H3_ENHANCE_SYSTEM, cur, cardLlmArg());
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
		//#region src/ui/studio/docGrid.ts
		/**
		* docGrid.ts — THE AUTHORING GRID (studio side, 2026-09-25).
		*
		* WHY THIS FILE EXISTS: the card's admission gate became UNIFORM
		* (`assertSpanGrid` — every window shape refuses an off-grid authored
		* span instead of silently re-framing it). A refusal-only card would
		* break the authoring surface: the bar drag, the span number inputs
		* and the call splitter all move frames by hand, and every one of them
		* used to hand the engine whatever the operator's pixel resolved to.
		* So the authoring boundary snaps, VISIBLY, to the same law the card
		* refuses against — the number inputs and the bar show the snapped
		* frames, and the card never has to repair a doc this surface built.
		*
		* THE LAW (one owner, imported from the card's own contract — no
		* duplicated constants):
		*   - a window generates 22+17k frames in [22,362];
		*   - a CARRIED window (i>0, non-cut) generates span+22, so its
		*     authored span must be 17k;
		*   - a FIRST or CUT window generates its span verbatim, so its
		*     authored span must be 22+17k;
		*   - calls TILE: every call starts where the previous one ended.
		*
		* The seam toggle re-frames by exactly 22 frames (a carried span
		* loses 22, a cut span gains 22) because both shapes cannot be legal
		* for one span — arithmetic, not policy. The operator sees the new end
		* frame in the input; nothing is repaired behind their back.
		*/
		/** Is this window's seam a carried join? Index-aware, exactly the
		*  card's own `chainLike` law (filmMix's stanzaSecs reads the same). */
		function isCarriedShape(index, call) {
			return index > 0 && transitionOverlap(call.transition) > 0;
		}
		/** Is this authored LENGTH legal for the window's shape? */
		function isLegalCallLength(length, carried) {
			if (carried) return Number.isInteger(length) && length >= 17 && length + 22 <= 362 && length % 17 === 0;
			return isGridLength(length);
		}
		/** Nearest legal authored length for the window's shape. */
		function snapCallLength(length, carried) {
			if (carried) {
				const k = Math.max(1, Math.round(length / 17));
				return Math.min(340, 17 * k);
			}
			return gridSnap(Math.max(22, length));
		}
		/** The grid's step, re-exported so the authoring setters never grow a
		*  second copy of the number. Both length families advance by 17. */
		const GRID_STEP = 17;
		/** The grid's base — the shortest first/cut window. */
		const GRID_BASE = 22;
		/** The shortest legal authored length for this window's shape. */
		function shortestCallLength(index, call) {
			return isCarriedShape(index, call) ? 17 : 22;
		}
		/** The exclusive end this call would carry at the requested end: the
		*  length snaps, the start is the operator's. */
		function snapCallEnd(call, index, end) {
			return call.start_frame + snapCallLength(end - call.start_frame, isCarriedShape(index, call));
		}
		/** The splice frame for a split where BOTH halves must be legal — the
		*  gesture's frame when it already qualifies, else the nearest one that
		*  does. Never returns a frame that leaves an off-grid half. */
		function snapSplitFrame(start, end, leftCarried, rightCarried, gesture) {
			let best = gesture;
			let bestDistance = Number.POSITIVE_INFINITY;
			for (let frame = start + 1; frame < end; frame++) {
				if (!isLegalCallLength(frame - start, leftCarried)) continue;
				if (!isLegalCallLength(end - frame, rightCarried)) continue;
				const distance = Math.abs(frame - gesture);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = frame;
				}
			}
			return best;
		}
		/** The seam toggle's re-frame: the 22-frame carry moves from the
		*  generation head to (or from) the authored span. A first window has
		*  no carry either way, so its toggle never moves frames. */
		function reflowSeamSpan(call, index, next) {
			const wasCarried = isCarriedShape(index, call);
			const willCarried = isCarriedShape(index, { transition: next });
			if (wasCarried === willCarried) return call.end_frame;
			const length = call.end_frame - call.start_frame;
			return call.start_frame + (willCarried ? length - 22 : length + 22);
		}
		//#endregion
		//#region src/ui/studio/useCallMutations.ts
		/** Call-structure setters: extend/add/guide/span/knobs (tenant §8).
		*  Verbatim lines 2088–2260, plus the authoring grid (2026-09-25):
		*  every gesture that writes a frame lands on the card's own span law
		*  (docGrid.ts), so a studio-built doc never trips the card's uniform
		*  off-grid refusal. */
		function useCallMutations(setCalls, fps) {
			/** Pull-the-tail: the bar grew the envelope — the last call's end
			* follows (exclusive count straight from the bar's onExtend), snapped
			* to the window's legal length. */
			const handleExtend = (newTotal) => {
				setCalls((prev) => {
					if (!prev.length) return prev;
					const last = prev.length - 1;
					const cur = prev[last];
					if (newTotal <= cur.end_frame) return prev;
					const next = [...prev];
					next[last] = {
						...cur,
						end_frame: snapCallEnd(cur, last, Math.round(newTotal))
					};
					return next;
				});
			};
			/** Add call — TIMELINE-NATIVE (2026-08-16: "We don't need the add-call
			*  button. We can use the timeline to do this"): double-click the ruler
			*  or the calls row's empty area at a frame → split the call containing
			*  that frame there (both halves on the grid), or append a fresh call
			*  at the tail on the grid. The new call starts EMPTY: a call with no
			*  prompt is a TODO the plan names before any GPU work — never silent
			*  junk prompt. */
			const addCallAt = (frame) => {
				setCalls((prev) => {
					const i = prev.findIndex((c) => frame > c.start_frame && frame < c.end_frame);
					if (i >= 0) {
						const cur = prev[i];
						const next = [...prev];
						const split = snapSplitFrame(cur.start_frame, cur.end_frame, isCarriedShape(i, cur), isCarriedShape(i + 1, cur), Math.round(frame));
						next[i] = {
							...cur,
							end_frame: split
						};
						next.splice(i + 1, 0, {
							text: "",
							start_frame: split,
							end_frame: cur.end_frame
						});
						return next;
					}
					const T = prev.length ? prev[prev.length - 1].end_frame : 0;
					const shape = isCarriedShape(prev.length, { transition: "extend" });
					return [...prev.map((c) => ({ ...c })), {
						text: "",
						start_frame: T,
						end_frame: T + snapCallLength(Math.max(1, Math.round(fps * 2)), shape)
					}];
				});
			};
			/** Wire a call's guide source. Empty = none (the planner's
			* contract: blank guide keys never materialize — clearing the input
			* detaches the guide; sources are typed, not dropped-then-wired
			* like lane keyframes). The last-frame subcard was CUT 2026-09-15 —
			* the PlagueKind gen lane owns no last-frame input, so the control
			* wrote wire nothing reads. */
			const setCallGuide = (i, kind, source) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					if ((prev[i][kind] ?? "") === source) return prev;
					const next = [...prev];
					const call = { ...prev[i] };
					if (source.trim()) call[kind] = source;
					else delete call[kind];
					next[i] = call;
					return next;
				});
			};
			/** Seam mode per call (2026-09-20: the seam is AUTOMATIC —
			* 'extend' = the drift-control continuation carries the previous
			* window's latent at the director's proven 22-frame overlap with
			* the soft AV audio release; 'cut' = independent window, a true
			* butt. The seconds picker died with the MotionContext seam.)
			*
			* THE SEAM TOGGLE RE-FRAMES (2026-09-25, the uniform span gate): a
			* carried span is 17k and a cut span is 22+17k, so one span cannot
			* be legal in both states. Toggling moves the window's end by the
			* carry (22f) so the doc stays runnable — the operator's end frame
			* shows the new value; the neighbor's start follows as it always
			* did. A first window carries nothing either way and never moves. */
			const setCallTransition = (i, t) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const call = { ...prev[i] };
					if (call.transition === t) return prev;
					const end = reflowSeamSpan(call, i, t);
					if (end === call.end_frame) {
						call.transition = t;
						const next = [...prev];
						next[i] = call;
						return next;
					}
					const next = [...prev];
					next[i] = {
						...call,
						transition: t,
						end_frame: end
					};
					if (i < next.length - 1) next[i + 1] = {
						...next[i + 1],
						start_frame: end
					};
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
			* call's start; the LAST call's end grows/shrinks the envelope), and
			* the written frame lands on the window's legal length — the number
			* input shows the snapped frame, the card never re-frames it. */
			const setCallSpan = (i, which, frame) => {
				setCalls((prev) => {
					if (i < 0 || i >= prev.length) return prev;
					const cur = prev[i];
					const next = [...prev];
					if (which === "start" && i > 0) {
						const prevCall = prev[i - 1];
						const leftCarried = isCarriedShape(i - 1, prevCall);
						const rightCarried = isCarriedShape(i, cur);
						const gesture = Math.round(frame);
						let boundary = snapSplitFrame(prevCall.start_frame, cur.end_frame, leftCarried, rightCarried, gesture);
						if (boundary === prevCall.end_frame && gesture !== boundary) {
							const stepped = boundary + GRID_STEP * Math.sign(gesture - boundary);
							if (stepped > prevCall.start_frame && stepped < cur.end_frame && isLegalCallLength(stepped - prevCall.start_frame, leftCarried) && isLegalCallLength(cur.end_frame - stepped, rightCarried)) boundary = stepped;
						}
						if (boundary === prevCall.end_frame) return prev;
						next[i - 1] = {
							...prevCall,
							end_frame: boundary
						};
						next[i] = {
							...cur,
							start_frame: boundary
						};
					} else if (which === "start") {
						const gesture = Math.min(Math.max(Math.round(frame), 0), cur.end_frame - GRID_BASE);
						let start = cur.end_frame - snapCallLength(cur.end_frame - gesture, false);
						if (start === cur.start_frame) start += GRID_STEP * Math.sign(gesture - start);
						if (start === cur.start_frame) return prev;
						next[i] = {
							...cur,
							start_frame: start
						};
					} else {
						const gesture = Math.max(Math.round(frame), cur.start_frame + 1);
						let end = snapCallEnd(cur, i, gesture);
						if (end === cur.end_frame) {
							const stepped = end + GRID_STEP * Math.sign(gesture - end);
							if (stepped >= cur.start_frame + shortestCallLength(i, cur)) end = stepped;
						}
						if (end === cur.end_frame) return prev;
						next[i] = {
							...cur,
							end_frame: end
						};
						if (i < prev.length - 1) next[i + 1] = {
							...next[i + 1],
							start_frame: end
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
				setCallRefs,
				setCallSpan,
				setCallKnob
			};
		}
		//#endregion
		//#region src/ui/studio/useBeatMutations.ts
		/** Legacy keyframe gestures (tenant §9) — prompt segments cut 2026-09-15. */
		function useBeatMutations(keyframes, setKeyframes) {
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
					for (const [name, url] of Object.entries(arts)) if (typeof url === "string" && url && (0, _melite_card_base_client.isImageUrl)(url)) out.push({
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
				const windowIndexOf = (n) => {
					const legacy = /^video_w(\d+)_/.exec(n);
					if (legacy !== null) return Number(legacy[1]);
					const real = /^h3_t4_w(\d+)_\d+_\.mp4$/.exec(n);
					if (real !== null) return Number(real[1]);
					return null;
				};
				const windows = Object.keys(arts).filter((n) => windowIndexOf(n) !== null && !n.endsWith("_last_frame") && !n.includes("_seam") && !n.includes("_prev")).filter((n) => typeof arts[n] === "string" && arts[n] !== "").sort((a, b) => {
					return windowIndexOf(a) - windowIndexOf(b);
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
							name: m ? `video_w${m[1]}_main` : u.split("/").pop(),
							url: u
						});
					}
				}
				const filmName = Object.keys(arts).find((n) => /^h3_t4_film_\d+_\.mp4$/.test(n));
				const filmUrl = filmName !== void 0 && typeof arts[filmName] === "string" && arts[filmName] !== "" ? arts[filmName] : "";
				const namedVideo = Object.entries(arts).find(([name, url]) => typeof url === "string" && url !== "" && refGenreOf(name, url) === "video" && !/^h3_t4_w\d+_\d+_\.mp4$/i.test(name) && !/^video_w\d+_/.test(name))?.[1];
				const flatVideo = urls.find((url) => refGenreOf("", url) === "video" && !/(?:^|\/)h3_t4_w\d+_\d+_\.mp4$/i.test(url) && !/(?:^|\/)video_w\d+_/.test(url));
				return {
					windows,
					final: filmUrl !== "" ? filmUrl : typeof namedVideo === "string" ? namedVideo : flatVideo ?? null
				};
			}, [stage.result]);
			const prompts = (0, react.useMemo)(() => callsToPrompts(calls, layerA.fps), [calls, layerA.fps]);
			const lanes = (0, react.useMemo)(() => keyframesToLanes(keyframes), [keyframes]);
			/** The film's OWN duration off the player (master-axis fallback): a
			*  run whose metadata carries no probed map still sizes the bar from
			*  the rendered film, never from the plan frames. */
			const [filmDurSec, setFilmDurSec] = (0, react.useState)(0);
			const barTotal = filmMap?.totalFrames ?? (filmDurSec > 0 ? Math.round(filmDurSec * (filmMap?.fps ?? fps)) : totalFrames);
			const barPrompts = (0, react.useMemo)(() => filmMap ? prompts.map((p) => ({
				...p,
				start_frame: filmFromDoc(p.start_frame),
				end_frame: filmFromDoc(p.end_frame)
			})) : prompts, [
				prompts,
				filmMap,
				filmFromDoc
			]);
			const barLanes = (0, react.useMemo)(() => filmMap ? lanes.map((k) => ({
				...k,
				frame: filmFromDoc(k.frame)
			})) : lanes, [
				lanes,
				filmMap,
				filmFromDoc
			]);
			/** Every prompt segment flattened into the bar's BEATS row (under the
			* calls): id `beat-i-j`, end_frame translated to the bar's INCLUSIVE
			* vocabulary (the doc's end is exclusive), color = the call's prompt
			* color so a segment reads as belonging to its call. */
			/** (Layer A NLE) the Music row's clips in BAR space: both endpoints
			* through filmFromDoc (identity with no film map), width = the mapped
			* span — a clip crossing a trim boundary narrows like the calls do. */
			const barAudioClips = (0, react.useMemo)(() => (layerA.audio_clips ?? []).map((c) => {
				const g0 = filmFromDoc(c.start_frame);
				const g1 = filmFromDoc(c.start_frame + c.dur_frames);
				return {
					id: c.id,
					name: c.name,
					start_frame: g0,
					dur_frames: Math.max(1, g1 - g0),
					gain: c.gain,
					class: c.class,
					text: c.text
				};
			}), [layerA.audio_clips, filmFromDoc]);
			/** THE PIN MAP (2026-09-22, the door-guard UX arm): which calls'
			* spans carry a dialogue/sfx clip — those windows PIN, and the
			* pinned window's normal audio doors stand down (the CallCard
			* grays the Ref audios bucket; the compose owns the real wall —
			* this is the BEFORE-the-Run hint, doc-space overlap mirroring
			* the stamp law's doc-span arm). */
			const voicePinnedCalls = (0, react.useMemo)(() => {
				const set = /* @__PURE__ */ new Set();
				calls.forEach((call, i) => {
					const sf = call.start_frame, ef = call.end_frame;
					for (const c of layerA.audio_clips ?? []) {
						const cls = c.class ?? (c.text ? "dialogue" : "music");
						if (cls !== "dialogue" && cls !== "sfx") continue;
						if ((c.dur_frames ?? 0) <= 0) continue;
						if (c.start_frame < ef && c.start_frame + c.dur_frames > sf) {
							set.add(i);
							break;
						}
					}
				});
				return set;
			}, [calls, layerA.audio_clips]);
			/** THE BLOCKER (2026-09-22, the operator's lane-collision law):
			* the D-M-E clips and the normal audio inputs are MUTUALLY EXCLUSIVE
			* at authoring time — reference audio wired on ANY call locks the
			* lanes (no adds on ANY lane); ANY clip present locks the Ref audios
			* buckets on EVERY call. Doc-level, both directions, blunt on
			* purpose: the compose door guard stays only as the silent backstop
			* for docs that already carry both (it strips, never crashes). */
			const refAudiosPresent = (0, react.useMemo)(() => calls.some((c) => !!(c.refs?.audios ?? "").trim()), [calls]);
			const audioClipsPresent = (layerA.audio_clips?.length ?? 0) > 0;
			return {
				sourceOptions,
				linkGroups,
				filmstrip,
				prompts,
				lanes,
				filmDurSec,
				setFilmDurSec,
				barTotal,
				barPrompts,
				barLanes,
				barAudioClips,
				callPreviews: (0, react.useMemo)(() => Object.fromEntries(filmstrip.windows.slice(0, calls.length).map((w, i) => [`call-${i}`, w.url])), [filmstrip.windows, calls.length]),
				selectedBarId: selected ? selected.beatIdx != null ? `beat-${selected.callIdx}-${selected.beatIdx}` : `call-${selected.callIdx}` : null,
				voicePinnedCalls,
				refAudiosPresent,
				audioClipsPresent
			};
		}
		//#endregion
		//#region src/ui/studio/component.tsx
		function VideoTimelineStudio({ stage, running, onSave, upstreams }) {
			const doc = useDocState(stage);
			const { calls, keyframes, layerA } = doc;
			const { spec: knobSpec } = (0, _melite_card_base_client.useFormSpec)("h3-timeline");
			const knobFields = (0, react.useMemo)(() => {
				if (knobSpec === null || knobSpec === void 0) return {};
				const out = {};
				for (const f of (0, _melite_card_base_client.fieldsOf)(knobSpec)) out[f.name] = f;
				return out;
			}, [knobSpec]);
			const view = useViewSelection(calls, layerA);
			const { selected, fps, totalFrames } = view;
			const film = useFilmSync({
				fps,
				totalFrames,
				keyframes,
				calls,
				setFrameIdx: view.setFrameIdx
			});
			const { seconds, unwired, guideCount, knobOverrides } = film;
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
			const kf = useBeatMutations(keyframes, doc.setKeyframes);
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.StudioShell, {
				className: (0, _melite_card_base_client.cn)(studio_module_css_default.studioRoot),
				params: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: studio_module_css_default.railCol,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: studio_module_css_default.docBlock,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: studio_module_css_default.docLines,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
								}), unwired > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: studio_module_css_default.warnRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.TriangleAlert, { className: (0, _melite_card_base_client.cn)(studio_module_css_default.warnIcon, studio_module_css_default.sz12) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										unwired,
										" keyframe source",
										unwired === 1 ? "" : "s",
										" unwired — wire them below or the run door names them as TODOs."
									] })]
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CallCardsPanel, {
							calls,
							selected,
							setSelected: view.setSelected,
							fps,
							sourceOptions: derived.sourceOptions,
							keyframes,
							handleKeyframeMove: kf.handleKeyframeMove,
							handleKeyframeDelete: kf.handleKeyframeDelete,
							setKeyframeSource: kf.setKeyframeSource,
							deps: {
								selected,
								fps,
								layerA,
								knobFields,
								callCardRefs: view.callCardRefs,
								artifactIndex: audio.artifactIndex,
								linkGroups: derived.linkGroups,
								refArtifacts: audio.refArtifacts,
								handlePromptDelete: pr.handlePromptDelete,
								handlePromptUpdate: pr.handlePromptUpdate,
								enhanceOne: enh.enhanceOne,
								undoEnhance: enh.undoEnhance,
								enhancing: enh.enhancing,
								enhanceErr: enh.enhanceErr,
								enhanceUndo: enh.enhanceUndo,
								setCallSpan: mut.setCallSpan,
								setCallGuide: mut.setCallGuide,
								setCallTransition: mut.setCallTransition,
								setCallRefs: mut.setCallRefs,
								setCallKnob: mut.setCallKnob,
								voicePinnedCalls: derived.voicePinnedCalls,
								audioClipsPresent: derived.audioClipsPresent
							}
						}),
						selected == null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							"data-testid": "tl-run-panel",
							className: studio_module_css_default.runFold,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
								className: studio_module_css_default.runSummary,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ChevronDown, {
										className: (0, _melite_card_base_client.cn)(studio_module_css_default.sz12, studio_module_css_default.chev),
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunRecipeEngine, {
									stage,
									layerA,
									setLayerAKey: fx.setLayerAKey,
									setLayerA: doc.setLayerA,
									refArtifacts: audio.refArtifacts
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RunRefsClips, {
									layerA,
									updateAudioClip: audio.updateAudioClip,
									deleteAudioClip: audio.deleteAudioClip
								})]
							})]
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
					barAudioClips: derived.barAudioClips,
					barTotal: derived.barTotal,
					frameIdx: view.frameIdx,
					callPreviews: derived.callPreviews,
					selectedBarId: derived.selectedBarId,
					filmMap: audio.filmMap,
					handleBarFrame: film.handleBarFrame,
					handleScrubStart: film.handleScrubStart,
					handleScrubEnd: film.handleScrubEnd,
					handleKeyframeAdd: kf.handleKeyframeAdd,
					handleKeyframeMove: kf.handleKeyframeMove,
					handleKeyframeDelete: kf.handleKeyframeDelete,
					handlePromptUpdate: pr.handlePromptUpdate,
					handlePromptMove: pr.handlePromptMove,
					handlePromptResize: pr.handlePromptResize,
					handlePromptDelete: pr.handlePromptDelete,
					handleExtend: mut.handleExtend,
					addCallAt: mut.addCallAt,
					handleTimelineSelect: view.handleTimelineSelect,
					layerA,
					refAudiosBlocked: derived.refAudiosPresent,
					addAudioClip: audio.addAudioClip,
					takeAudioFile: audio.takeAudioFile,
					moveAudioClip: audio.moveAudioClip,
					deleteAudioClip: audio.deleteAudioClip,
					updateAudioClip: audio.updateAudioClip,
					setLayerAKey: fx.setLayerAKey,
					artifactIndex: audio.artifactIndex,
					docFromFilm: audio.docFromFilm,
					keyframes
				})
			});
		}
		(0, _melite_card_base_client.defineShellDeclaration)({
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
		init_src();
		init_stageView();
		setContractToastSink((type, message, action) => {
			_melite_card_base_client.useToastStore.getState().addToast(type, message, action);
		});
		function recordOf(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function isWindowName(name) {
			return /^h3_t4_w\d+_\d+_\.mp4$/i.test(name) || /^video_w\d+_/.test(name);
		}
		function videoUrlOf(artifacts, assetUrls, direct, allowWindow = false) {
			const rows = Object.entries(artifacts).filter((entry) => {
				const [name, url] = entry;
				return typeof url === "string" && url !== "" && refGenreOf(name, url) === "video";
			});
			const film = rows.find(([name, url]) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(name) || /h3_t4_film_\d+_\.mp4(?:$|[?#])/i.test(url));
			if (film !== void 0) return film[1];
			if (typeof direct === "string" && direct !== "" && refGenreOf("", direct) === "video") return direct;
			const named = rows.find(([name]) => allowWindow || !isWindowName(name));
			if (named !== void 0) return named[1];
			return assetUrls.find((url) => refGenreOf("", url) === "video") ?? "";
		}
		function historyRows(row, result, metadata) {
			const rows = [];
			const add = (value) => {
				const entry = recordOf(value);
				const video = videoUrlOf(recordOf(entry["artifacts"]), Array.isArray(entry["assetUrls"]) ? entry["assetUrls"].filter((url) => typeof url === "string") : [], typeof entry["url"] === "string" ? entry["url"] : "", true);
				if (video === "") return;
				const runId = typeof entry["runId"] === "string" ? entry["runId"] : typeof entry["run_id"] === "string" ? entry["run_id"] : void 0;
				const error = typeof entry["error"] === "string" ? entry["error"] : "";
				const status = typeof entry["status"] === "string" ? entry["status"] : error !== "" ? "failed" : void 0;
				const duration = typeof entry["durationSec"] === "number" ? entry["durationSec"] : void 0;
				const at = typeof entry["at"] === "number" ? entry["at"] : void 0;
				rows.push({
					...runId !== void 0 ? { runId } : {},
					...status !== void 0 ? { status } : {},
					...at !== void 0 ? { at } : {},
					...duration !== void 0 ? { durationSec: duration } : {},
					video
				});
			};
			const generic = Array.isArray(row["history"]) ? row["history"] : [];
			if (Array.isArray(row["history"])) add(result);
			for (const entry of generic) add(entry);
			const legacy = metadata["history"];
			if (Array.isArray(legacy)) for (const entry of legacy) {
				const normalized = recordOf(entry);
				const video = typeof normalized["video"] === "string" ? normalized["video"] : "";
				if (video === "") continue;
				rows.push({
					...typeof normalized["runId"] === "string" ? { runId: normalized["runId"] } : {},
					...typeof normalized["status"] === "string" ? { status: normalized["status"] } : {},
					...typeof normalized["at"] === "number" ? { at: normalized["at"] } : {},
					...typeof normalized["durationSec"] === "number" ? { durationSec: normalized["durationSec"] } : {},
					video
				});
			}
			const seen = /* @__PURE__ */ new Set();
			return rows.filter((entry) => {
				const key = entry.runId ?? entry.video;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			}).slice(0, 12);
		}
		function harvestResult(row, base) {
			const result = recordOf(row["result"]);
			const artifacts = { ...base?.artifacts ?? {} };
			const gallery = Array.isArray(result["gallery"]) ? result["gallery"] : [];
			for (const entry of gallery) {
				const item = recordOf(entry);
				const name = typeof item["name"] === "string" ? item["name"] : "";
				const url = typeof item["url"] === "string" ? item["url"] : "";
				if (name !== "" && url !== "") artifacts[name] = url;
			}
			const assetUrls = base?.assetUrls ?? [];
			const video = videoUrlOf(artifacts, assetUrls, result["url"]);
			if (video !== "") artifacts["video"] = video;
			else if (artifacts["video"] !== void 0 && refGenreOf("video", artifacts["video"]) !== "video") delete artifacts["video"];
			const rawMetadata = result["metadata"];
			const metadata = {
				...base?.metadata ?? {},
				...recordOf(rawMetadata)
			};
			const history = historyRows(row, result, metadata);
			if (history.length > 0) metadata["history"] = history;
			return {
				assetUrls,
				artifacts,
				metadata,
				...base?.durationSec === void 0 ? {} : { durationSec: base.durationSec },
				...base?.gallery === void 0 ? {} : { gallery: base.gallery },
				...base?.motionPreviews === void 0 ? {} : { motionPreviews: base.motionPreviews }
			};
		}
		/** The registration (the ui-tool law): the card package registers its
		* own shipped studio's view under its card key. */
		/** The built-in registration (the ui-tool law, verbatim — the
		* module namespace IS the plugin: the loader consumes name/inject/apply). */
		const name = "h3TimelineStudio";
		const inject = ["slots"];
		const apply = (0, _melite_card_base_client.defineStageViewRegistration)("h3-timeline", H3TimelineStudio);
		/** The timeline surface — registered under key 'h3-timeline'. The
		* ADAPTER: the tenant mounted verbatim, one translate layer, zero
		* paraphrase. */
		function H3TimelineStudio(props) {
			const stage = projectStageView(props, {
				genre: "video",
				result: harvestResult
			});
			return (0, react.createElement)("div", {
				"data-testid": "h3-studio-tenant",
				style: {
					height: "100%",
					minHeight: 0
				}
			}, (0, react.createElement)(VideoTimelineStudio, {
				stage,
				running: isLiveRunStatus(props.runStatus ?? ""),
				onSave: props.onPatch,
				upstreams: projectUpstreamStages(props)
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
